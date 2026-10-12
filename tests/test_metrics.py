"""Metrics must come from real persisted booking records and respect tenancy."""
from fastapi.testclient import TestClient
from test_bookings import app, appointment, register, request_payload, service


def test_booking_kpis_reflect_real_data_and_tenant_scoping():
    with TestClient(app) as a, TestClient(app) as b:
        salon=register(a, "Metric Salon")["salon_id"]
        register(b, "Other Metric Salon")
        sid=service(a)
        empty=a.get("/api/bookings/metrics")
        assert empty.status_code==200
        assert empty.json()["requests_total"]==0
        assert b.get("/api/bookings/metrics").json()["requests_total"]==0
        created=a.post(f"/api/public/salons/{salon}/requests",json=request_payload(sid,appointment()))
        assert created.status_code==201,created.text
        before=a.get("/api/bookings/metrics").json()
        assert before["requests_total"]==1 and before["pending"]==1
        assert before["confirmed_service_list_price_cents"]==0
        confirmed=a.patch("/api/bookings/"+created.json()["id"],json={"state":"confirmed"})
        assert confirmed.status_code==200,confirmed.text
        metrics=a.get("/api/bookings/metrics").json()
        assert metrics["confirmed"]==1 and metrics["pending"]==0
        assert metrics["upcoming_confirmed"]==1
        assert metrics["confirmed_service_list_price_cents"]==2500
        assert "not collected revenue" in metrics["warning"]
        assert b.get("/api/bookings/metrics").json()["confirmed"]==0
