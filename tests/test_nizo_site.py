"""NIZO first-party branded site and explicit customer-booking approval tests."""
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from app.main import app


def test_nizo_preview_owner_onboarding_and_real_booking(monkeypatch):
    monkeypatch.setenv("BF_NIZO_SETUP_CODE","nizo-2026-private-test-setup-code-very-long")
    with TestClient(app) as client, TestClient(app) as visitor:
        response=visitor.get("/nizo")
        assert response.status_code==200,response.text
        assert "BARBER NIZO" in response.text
        assert visitor.get("/nizo/setup").status_code==200
        assert visitor.get("/nizo/privacy").status_code==200
        assert visitor.get("/static/nizo.js").status_code==200
        before=visitor.get("/api/nizo/site")
        assert before.status_code==200,before.text
        assert not before.json()["configured"]
        assert not before.json()["booking_enabled"]
        public_hours=before.json()["hours"]
        assert len(public_hours)==7
        assert public_hours[0]=={"weekday":0,"enabled":0,"opens":"10:00","closes":"19:00"}
        assert all(day["enabled"]==1 and day["opens"]=="10:00" and day["closes"]=="19:00"
                   for day in public_hours[1:6])
        assert public_hours[6]=={"weekday":6,"enabled":1,"opens":"10:00","closes":"17:00"}
        assert before.json()["salon_id"] is None
        assert visitor.post("/api/nizo/publish",json={
            "business_permission":True,"services_checked":True,
            "opening_hours_checked":True,"privacy_notice_checked":True,"enable":True
        }).status_code==401
        denied=client.post("/api/nizo/setup",json={
            "setup_code":"a"*32,"email":"fake.owner@example.invalid",
            "password":"StrongDemoPassword12345!","owner_name":"Demo Owner"
        })
        assert denied.status_code==403,denied.text
        setup=client.post("/api/nizo/setup",json={
            "setup_code":"nizo-2026-private-test-setup-code-very-long",
            "email":"nizo-owner-integration@example.invalid",
            "password":"StrongDemoPassword12345!","owner_name":"Test Operator"
        })
        assert setup.status_code==201,setup.text
        assert setup.json()["created"]
        not_yet=visitor.get("/api/nizo/site").json()
        assert not not_yet["published"]
        assert not not_yet["booking_enabled"]
        assert not_yet["salon_id"] is None
        assert len(not_yet["services"])==3
        first_service=not_yet["services"][0]
        changed=client.put("/api/bookings/services/"+first_service["id"],json={
            "name":"Herenknipbeurt — eigenaar bevestigd",
            "duration_minutes":45,"price_cents":2800
        })
        assert changed.status_code==200,changed.text
        assert visitor.get("/api/nizo/site").json()["services"][0]["price_cents"]==2800
        hidden_salon=client.get("/api/auth/me").json()["user"]["salon_id"]
        hidden_service=not_yet["services"][0]["id"]
        assert visitor.get(f"/api/public/salons/{hidden_salon}/slots",params={
            "service_id":hidden_service,"day":"2026-12-16"
        }).status_code==403
        assert all(s["price_cents"]==0 for s in not_yet["services"])
        assert client.get("/api/nizo/admin").status_code==200
        hours=client.get("/api/bookings/hours").json()["hours"]
        assert hours[0]["enabled"]==0
        assert hours[1]["opens"]=="10:00" and hours[1]["closes"]=="19:00"
        assert hours[6]["enabled"]==1 and hours[6]["closes"]=="17:00"
        failed=client.post("/api/nizo/publish",json={
            "business_permission":True,"services_checked":False,
            "opening_hours_checked":True,"privacy_notice_checked":True,"enable":True
        })
        assert failed.status_code==400
        approved=client.post("/api/nizo/publish",json={
            "business_permission":True,"services_checked":True,
            "opening_hours_checked":True,"privacy_notice_checked":True,"enable":True
        })
        assert approved.status_code==200,approved.text
        after=visitor.get("/api/nizo/site").json()
        assert after["published"] and after["booking_enabled"]
        salon_id=after["salon_id"]
        assert salon_id
        date=datetime.now(ZoneInfo("Europe/Brussels"))+timedelta(days=4)
        while date.weekday()!=2:
            date+=timedelta(days=1)
        when=date.replace(hour=11,minute=0,second=0,microsecond=0)
        service=after["services"][0]["id"]
        slots=visitor.get(f"/api/public/salons/{salon_id}/slots",params={
            "service_id":service,"day":when.date().isoformat()
        })
        assert slots.status_code==200,slots.text
        assert any(x["label"]=="11:00" for x in slots.json()["slots"])
        booked=visitor.post(f"/api/public/salons/{salon_id}/requests",json={
            "service_id":service,"starts_at":when.isoformat(),
            "customer_name":"Testing Customer","customer_email":"customer@example.invalid",
            "privacy_accepted":True
        })
        assert booked.status_code==201,booked.text
        assert booked.json()["state"]=="pending"
        assert client.get("/api/bookings/metrics").json()["requests_total"]==1
        assert client.patch("/api/bookings/"+booked.json()["id"],json={"state":"confirmed"}).status_code==200
        cannot_rewrite=client.put("/api/bookings/services/"+first_service["id"],json={
            "name":"Changed after booking","duration_minutes":30,"price_cents":2000
        })
        assert cannot_rewrite.status_code==409,cannot_rewrite.text
        hidden=client.post("/api/nizo/publish",json={
            "business_permission":False,"services_checked":False,
            "opening_hours_checked":False,"privacy_notice_checked":False,"enable":False
        })
        assert hidden.status_code==200
        assert not visitor.get("/api/nizo/site").json()["booking_enabled"]
        assert visitor.get(f"/api/public/salons/{salon_id}/slots",params={
            "service_id":service,"day":when.date().isoformat()
        }).status_code==403
        assert client.post("/api/nizo/setup",json={
            "setup_code":"nizo-2026-private-test-setup-code-very-long",
            "email":"second-owner@example.invalid",
            "password":"NewDemoPassword12345678!","owner_name":"Other Person"
        }).status_code==409


def test_nizo_setup_fails_when_no_secret_configured(monkeypatch):
    monkeypatch.delenv("BF_NIZO_SETUP_CODE",raising=False)
    with TestClient(app) as c:
        resp=c.post("/api/nizo/setup",json={
            "setup_code":"not-accepted-example-secret-very-long",
            "email":"other@example.invalid","password":"NewDemoPassword12345678!",
            "owner_name":"Other Owner"
        })
        assert resp.status_code==403


def test_dedicated_public_root_and_owner_workspace(monkeypatch):
    monkeypatch.setenv("BF_PUBLIC_SITE","nizo")
    with TestClient(app) as client:
        landing=client.get("/")
        assert landing.status_code==200
        assert "BARBER NIZO" in landing.text
        assert "/static/nizo.js" in landing.text
        studio=client.get("/app")
        assert studio.status_code==200
        assert "BarberFlow Studio" in studio.text
    monkeypatch.delenv("BF_PUBLIC_SITE",raising=False)
    with TestClient(app) as client:
        assert "/static/app.js" in client.get("/").text


def test_nizo_social_links_and_opening_hours_in_rendered_preview():
    with TestClient(app) as client:
        response=client.get("/nizo")
        assert response.status_code==200
        assert "TIKTOK ↗" in response.text
        assert "INSTAGRAM ↗" in response.text
        assert "Dinsdag</span><span>10:00 – 19:00" in response.text
        assert "Zondag</span><span>10:00 – 17:00" in response.text
        assert "Maandag</span><span>Gesloten" in response.text
        js=client.get("/static/nizo.js")
        assert js.status_code==200
        assert "const NIZO_HOURS" in js.text
        assert "renderHours()" in js.text
