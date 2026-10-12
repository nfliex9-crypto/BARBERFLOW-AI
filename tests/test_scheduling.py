"""Regression tests for the salon-specific calendar engine."""
from datetime import timedelta

from fastapi.testclient import TestClient

from test_bookings import app, appointment, register, request_payload, service


def test_independent_schedules_and_breaks():
    with TestClient(app) as a, TestClient(app) as b:
        sid_a = register(a, "Morning Salon")["salon_id"]
        sid_b = register(b, "Late Salon")["salon_id"]
        svc_a, svc_b = service(a), service(b)
        day = appointment()
        weekday = day.weekday()
        before = a.get(f"/api/public/salons/{sid_a}/slots",
                       params={"service_id":svc_a, "day":day.date().isoformat()}).json()["slots"]
        assert any(x["label"] == "11:00" for x in before)
        schedule={"enabled":True,"opens":"10:00","closes":"16:00",
                  "break_start":"12:00","break_end":"13:00"}
        assert a.put(f"/api/bookings/hours/{weekday}",json=schedule).status_code == 200
        updated = a.get(f"/api/public/salons/{sid_a}/slots",
                        params={"service_id":svc_a,"day":day.date().isoformat()})
        assert updated.status_code==200,updated.text
        labels={x["label"] for x in updated.json()["slots"]}
        assert "10:00" in labels and "11:30" in labels and "13:00" in labels
        assert "09:00" not in labels and "12:00" not in labels and "12:30" not in labels
        other=b.get(f"/api/public/salons/{sid_b}/slots",
                    params={"service_id":svc_b, "day":day.date().isoformat()}).json()["slots"]
        assert any(x["label"] == "09:00" for x in other)
        assert a.get(f"/api/public/salons/{sid_a}").json()["schedule"][weekday]["break_start"]=="12:00"


def test_closure_blocks_requests_and_cannot_confirm_pending():
    with TestClient(app) as c:
        sid=register(c, "Holiday Shop")["salon_id"]
        svc=service(c)
        dt=appointment()
        data=request_payload(svc,dt)
        pending=c.post(f"/api/public/salons/{sid}/requests",json=data)
        assert pending.status_code==201,pending.text
        bid=pending.json()["id"]
        result=c.post("/api/bookings/closures",json={"day":dt.date().isoformat(),"reason":"Staff training"})
        assert result.status_code==201,result.text
        assert c.get(f"/api/public/salons/{sid}/slots",params={
            "service_id":svc,"day":dt.date().isoformat()}).json()["slots"]==[]
        newdata=request_payload(svc,dt.replace(hour=13))
        newdata["customer_email"]="second@example.net"
        assert c.post(f"/api/public/salons/{sid}/requests",json=newdata).status_code==400
        reject=c.patch(f"/api/bookings/{bid}",json={"state":"confirmed"})
        assert reject.status_code==400,reject.text
        assert c.delete("/api/bookings/closures/"+dt.date().isoformat()).status_code==200
        assert c.patch(f"/api/bookings/{bid}",json={"state":"confirmed"}).status_code==200


def test_schedule_validation_and_authentication():
    with TestClient(app) as c:
        assert c.get("/api/bookings/hours").status_code==401
        register(c,"Validations Shop")
        assert len(c.get("/api/bookings/hours").json()["hours"])==7
        assert c.put("/api/bookings/hours/7",json={
            "enabled":True,"opens":"09:00","closes":"18:00"}).status_code==400
        invalids=[
            {"enabled":True,"opens":"09:15","closes":"18:00"},
            {"enabled":True,"opens":"10:00","closes":"09:00"},
            {"enabled":True,"opens":"09:00","closes":"18:00","break_start":"12:00"},
            {"enabled":True,"opens":"09:00","closes":"18:00","break_start":"12:00","break_end":"19:00"}
        ]
        for invalid in invalids:
            r=c.put("/api/bookings/hours/2",json=invalid)
            assert r.status_code in (400,422),r.text
        assert c.post("/api/bookings/closures",json={
            "day":(appointment()+timedelta(days=800)).date().isoformat(),
            "reason":"far future"}).status_code==400
