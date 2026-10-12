from fastapi.testclient import TestClient
from test_bookings import app, appointment, register, request_payload, service
from app.main import connect


def test_confirm_then_cancel_invalidates_pending_confirmation(monkeypatch):
    monkeypatch.setenv("BF_SMTP_ENABLED", "true")
    monkeypatch.setenv("BF_SMTP_HOST", "smtp.example.invalid")
    monkeypatch.setenv("BF_SMTP_FROM", "mailer@example.invalid")
    with TestClient(app) as client:
        salon = register(client, "Testing Cancellation")["salon_id"]
        sid = service(client)
        response = client.post(
            f"/api/public/salons/{salon}/requests",
            json=request_payload(sid, appointment()),
        )
        assert response.status_code == 201, response.text
        booking_id = response.json()["id"]
        confirmed = client.patch(f"/api/bookings/{booking_id}", json={"state": "confirmed"})
        assert confirmed.status_code == 200
        rejected = client.patch(f"/api/bookings/{booking_id}", json={"state": "declined"})
        assert rejected.status_code == 409
        cancelled = client.patch(f"/api/bookings/{booking_id}", json={"state": "cancelled"})
        assert cancelled.status_code == 200
        with connect() as db:
            states = db.execute(
                "SELECT kind,state FROM bf_mail_outbox WHERE booking_id=?", (booking_id,)
            ).fetchall()
            result = {row["kind"]: row["state"] for row in states}
        assert result["confirmed"] == "superseded"
        assert result["cancelled"] == "pending"
