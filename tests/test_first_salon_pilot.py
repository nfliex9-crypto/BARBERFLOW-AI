"""End-to-end local first-salon preview — no external requests or real clients."""
from fastapi.testclient import TestClient
import pytest

from app.main import app
from scripts.seed_pilot import create_pilot


def test_seeded_demo_is_explicitly_fake_and_usable():
    account = create_pilot("Brussels Sample Salon")
    assert account["salon"].startswith("DEMO · ")
    assert account["all_prices_are_samples"] is True
    assert account["services"] == 3
    assert account["email"].endswith("@example.invalid")

    with TestClient(app) as owner, TestClient(app) as guest:
        signed = owner.post("/api/auth/login", json={
            "email": account["email"], "password": account["password"]
        })
        assert signed.status_code == 200, signed.text
        link = owner.get("/api/bookings/link")
        assert link.status_code == 200, link.text
        assert link.json()["booking_page"].endswith(account["salon_id"])
        services = owner.get("/api/bookings/services").json()["services"]
        assert len(services) == 3
        assert all("sample price" in item["name"] for item in services)

        public = guest.get("/api/public/salons/" + account["salon_id"])
        assert public.status_code == 200, public.text
        assert public.json()["name"].startswith("DEMO · ")
        assert len(public.json()["services"]) == 3
        assert guest.get("/api/bookings").status_code == 401
        metrics = owner.get("/api/bookings/metrics").json()
        assert metrics["requests_total"] == 0
        assert metrics["confirmed_service_list_price_cents"] == 0


def test_reject_invalid_or_production_demo(monkeypatch):
    from app import main as application
    with pytest.raises(ValueError):
        create_pilot("")
    with pytest.raises(ValueError):
        create_pilot("a"*100)
    monkeypatch.setattr(application, "ENV", "production")
    with pytest.raises(RuntimeError, match="production"):
        create_pilot("Sample Salon")
