"""Private-beta outbox tests; never contact an actual SMTP service."""
from fastapi.testclient import TestClient
from test_bookings import app, appointment, register, request_payload, service
from app.main import connect
from app.notifications import run_once


def configure(monkeypatch):
    monkeypatch.setenv("BF_SMTP_ENABLED","true")
    monkeypatch.setenv("BF_SMTP_HOST","smtp.invalid.example")
    monkeypatch.setenv("BF_SMTP_FROM","robot@example.org")


def test_outbox_disabled_without_explicit_configuration(monkeypatch):
    monkeypatch.delenv("BF_SMTP_ENABLED",raising=False)
    with TestClient(app) as c:
        salon=register(c, "No Mail Salon")["salon_id"]
        svc=service(c)
        booking=c.post(f"/api/public/salons/{salon}/requests",json=request_payload(svc,appointment()))
        assert booking.status_code==201,booking.text
        assert booking.json()["owner_notification_queued"] is False
        with connect() as con:
            count=con.execute("SELECT count(*) FROM bf_mail_outbox WHERE salon_id=?", (salon,)).fetchone()[0]
        assert count==0
        assert run_once(connect)["status"]=="disabled"


def test_booking_notification_queue_smtp_acceptance_and_tenant_isolation(monkeypatch):
    configure(monkeypatch)
    with TestClient(app) as a, TestClient(app) as b:
        salon_a=register(a, "Outbox A")["salon_id"]
        salon_b=register(b, "Outbox B")["salon_id"]
        svc=service(a)
        result=a.post(f"/api/public/salons/{salon_a}/requests",json=request_payload(svc,appointment()))
        assert result.status_code==201,result.text
        assert result.json()["owner_notification_queued"] is True
        bid=result.json()["id"]
        assert b.get("/api/bookings/mail-status").json()["states"]==[]
        status=a.patch(f"/api/bookings/{bid}",json={"state":"confirmed"})
        assert status.status_code==200,status.text
        assert status.json()["notification_queued"] is True
        assert status.json()["notifications_sent"] is False
        assert a.get("/api/bookings/mail-status").status_code==200
        sent=[]
        for _ in range(3):
            entry=run_once(connect,send=lambda message: sent.append(message))
            if entry["status"]=="idle":
                break
            assert entry["status"]=="smtp_accepted",entry
        assert len(sent)==2
        assert {s["kind"] for s in sent}=={"new_request","confirmed"}
        with connect() as con:
            accepted=con.execute("SELECT count(*) FROM bf_mail_outbox WHERE salon_id=? AND state='smtp_accepted'",(salon_a,)).fetchone()[0]
        assert accepted==2
        assert b.get("/api/bookings/mail-status").json()["states"]==[]
        assert a.get("/api/account/export").json()["email_events"]
        assert a.post("/api/account/delete",json={"password":"LongUniquePassword123!"}).status_code==200
        with connect() as con:
            remaining=con.execute("SELECT count(*) FROM bf_mail_outbox WHERE salon_id=?", (salon_a,)).fetchone()[0]
        assert remaining==0


def test_failed_delivery_retries_without_claiming_sent(monkeypatch):
    configure(monkeypatch)
    with TestClient(app) as c:
        salon=register(c, "Retry Lab")["salon_id"]
        svc=service(c)
        r=c.post(f"/api/public/salons/{salon}/requests",json=request_payload(svc,appointment()))
        assert r.status_code==201,r.text
        def failure(_msg):
            raise ConnectionError("testing an unreachable SMTP provider")
        first=run_once(connect,send=failure)
        assert first["status"]=="failed_attempt" and first["attempt"]==1
        with connect() as con:
            row=con.execute("SELECT id,state,attempts,error_type FROM bf_mail_outbox WHERE salon_id=?",(salon,)).fetchone()
            assert row["state"]=="pending" and row["attempts"]==1
            assert row["error_type"]=="ConnectionError"
            con.execute("UPDATE bf_mail_outbox SET next_attempt_at='2000-01-01T00:00:00Z' WHERE id=?", (row["id"],))
        second=run_once(connect,send=lambda _msg: None)
        assert second["status"]=="smtp_accepted"
