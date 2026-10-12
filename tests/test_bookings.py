"""Booking pilot API integration tests: real cookie auth, salon isolation and UTC slots."""
import os
import tempfile
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import uuid

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("BF_DATA_DIR", tempfile.mkdtemp(prefix="barberflow-bookings-test-"))
os.environ.setdefault("APP_ENV", "development")
from app.main import app, RATE_WINDOWS, RATE_LOCK


@pytest.fixture(autouse=True)
def reset_throttle():
    with RATE_LOCK:
        RATE_WINDOWS.clear()


def register(client, salon):
    r = client.post("/api/auth/register", json={
        "email": f"pilot-{uuid.uuid4()}@example.org",
        "password": "LongUniquePassword123!",
        "name": "Pilot Owner",
        "salon_name": salon
    })
    assert r.status_code == 200, r.text
    return r.json()["user"]


def service(client, duration=30):
    r = client.post("/api/bookings/services", json={
        "name": "Haircut", "duration_minutes": duration, "price_cents": 2500})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def appointment():
    zone = ZoneInfo("Europe/Brussels")
    date = datetime.now(zone) + timedelta(days=3)
    while date.weekday() not in {1,2,3,4,5}:
        date += timedelta(days=1)
    return date.replace(hour=11, minute=0, second=0, microsecond=0)


def request_payload(sid, dt):
    return {
        "service_id": sid, "starts_at": dt.isoformat(),
        "customer_name": "Mary Client", "customer_email": "mary@example.org",
        "privacy_accepted": True
    }


def test_bookings_private_owner_and_public_request():
    with TestClient(app) as a, TestClient(app) as b:
        salon_a = register(a, "Clip Studio A")["salon_id"]
        register(b, "Clip Studio B")
        sid = service(a)
        assert b.get("/api/bookings/services").json()["services"] == []
        assert a.get("/api/bookings/link").json()["booking_page"].endswith(salon_a)
        assert a.get("/api/public/salons/"+salon_a).json()["booking_mode"] == "request_only"
        dt = appointment()
        slots = b.get(f"/api/public/salons/{salon_a}/slots", params={
            "day": dt.date().isoformat(), "service_id": sid})
        assert slots.status_code == 200, slots.text
        assert any(i["label"] == "11:00" for i in slots.json()["slots"])
        request = b.post(f"/api/public/salons/{salon_a}/requests", json=request_payload(sid,dt))
        assert request.status_code == 201, request.text
        bid = request.json()["id"]
        assert request.json()["state"] == "pending"
        assert b.get("/api/bookings").json()["bookings"] == []
        assert a.get("/api/bookings").json()["bookings"][0]["customer_email"] == "mary@example.org"
        assert b.patch(f"/api/bookings/{bid}", json={"state": "confirmed"}).status_code == 404
        assert a.patch(f"/api/bookings/{bid}", json={"state": "confirmed"}).json()["notifications_sent"] is False
        assert b.post(f"/api/public/salons/{salon_a}/requests", json=request_payload(sid,dt)).status_code == 409


def test_conflict_pending_requests_and_manual_confirmation():
    with TestClient(app) as c:
        salon=register(c, "Overlap Pilot")["salon_id"]
        s=service(c, 60)
        dt=appointment()
        first=c.post(f"/api/public/salons/{salon}/requests", json=request_payload(s,dt))
        second=request_payload(s,dt+timedelta(minutes=30))
        second["customer_email"]="other@example.org"
        other=c.post(f"/api/public/salons/{salon}/requests",json=second)
        assert first.status_code==201 and other.status_code==201
        id1=first.json()["id"];id2=other.json()["id"]
        assert c.patch(f"/api/bookings/{id1}",json={"state":"confirmed"}).status_code==200
        assert c.patch(f"/api/bookings/{id2}",json={"state":"confirmed"}).status_code==409
        assert c.patch(f"/api/bookings/{id1}",json={"state":"cancelled"}).status_code==200
        assert c.patch(f"/api/bookings/{id2}",json={"state":"confirmed"}).status_code==200


def test_consent_timezone_and_account_export():
    with TestClient(app) as c:
        salon=register(c, "Privacy Pilot")["salon_id"];sid=service(c)
        dt=appointment()
        no_consent=request_payload(sid,dt);no_consent["privacy_accepted"]=False
        assert c.post(f"/api/public/salons/{salon}/requests",json=no_consent).status_code==400
        no_zone=request_payload(sid,dt);no_zone["starts_at"]=dt.replace(tzinfo=None).isoformat()
        assert c.post(f"/api/public/salons/{salon}/requests",json=no_zone).status_code==400
        payload=request_payload(sid,dt)
        assert c.post(f"/api/public/salons/{salon}/requests",json=payload).status_code==201
        exported=c.get("/api/account/export")
        assert exported.status_code==200,exported.text
        assert exported.json()["booking_requests"][0]["customer_name"]=="Mary Client"
        removed=c.post("/api/account/delete",json={"password":"LongUniquePassword123!"})
        assert removed.status_code==200,removed.text
        assert c.get("/api/public/salons/"+salon).status_code==404


def test_pilot_rejects_duplicate_requests_and_outside_hours():
    with TestClient(app) as client:
        salon=register(client, "Boundary Shop")["salon_id"]
        svc=service(client, duration=60)
        dt=appointment()
        payload=request_payload(svc,dt)
        first=client.post(f"/api/public/salons/{salon}/requests",json=payload)
        assert first.status_code==201,first.text
        second=client.post(f"/api/public/salons/{salon}/requests",json=payload)
        assert second.status_code==409,second.text
        late=request_payload(svc,dt.replace(hour=17,minute=30))
        late["customer_email"]="late@example.org"
        assert client.post(f"/api/public/salons/{salon}/requests",json=late).status_code==400
        services=client.get("/api/bookings/services").json()["services"]
        assert len(services)==1
        deactivated=client.patch(f"/api/bookings/services/{svc}",json={"active":False})
        assert deactivated.status_code==200
        new_request=request_payload(svc,dt.replace(hour=12))
        new_request["customer_email"]="different@example.org"
        assert client.post(f"/api/public/salons/{salon}/requests",json=new_request).status_code==404


def test_public_registration_is_disabled_by_default_in_production(monkeypatch):
    import importlib
    module=importlib.import_module("app.main")
    monkeypatch.setattr(module,"ENV","production")
    monkeypatch.delenv("BF_ALLOW_OPEN_SIGNUP",raising=False)
    with TestClient(app) as client:
        result=client.post("/api/auth/register",json={
            "email":f"restricted-{uuid.uuid4()}@example.com",
            "password":"LongUniquePassword123!",
            "name":"Beta Owner", "salon_name":"Private Pilot"})
        assert result.status_code==403,result.text
        assert "private beta" in result.json()["detail"]
    monkeypatch.setenv("BF_ALLOW_OPEN_SIGNUP","true")
    with TestClient(app) as client:
        result=client.post("/api/auth/register",json={
            "email":f"allowed-{uuid.uuid4()}@example.com",
            "password":"LongUniquePassword123!",
            "name":"Beta Owner", "salon_name":"Private Pilot"})
        assert result.status_code==200,result.text
