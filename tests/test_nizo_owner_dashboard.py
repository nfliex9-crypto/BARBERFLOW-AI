"""NIZO v8 owner workflow regression checks.

Frontend must not expose personal data without an authenticated API response.
Public service config is owned by the salon's database, not hard-coded prices.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "nizo_site_v5"


def source(name):
    return (ROOT / name).read_text(encoding="utf-8")


def test_owner_dashboard_has_all_real_views_and_accessible_controls():
    html = source("owner.html")
    js = source("owner.js")
    for view in ("overview", "appointments", "services", "closures", "settings"):
        assert f'id="view-{view}"' in html
        assert f'data-view="{view}"' in html
    for element in (
        "login-form", "owner-auth-feedback", "dashboard-panel",
        "booking-entries", "owner-metrics",
        "owner-days", "owner-from", "owner-to", "owner-status",
        "owner-query", "owner-service-grid", "owner-closed-list",
        "owner-truncated-warning", "close-day-form", "owner-logout",
    ):
        assert f'id="{element}"' in html or element in js
    for route in ("overview", "list", "settings", "service", "close-day", "open-day", "update"):
        assert f'call("{route}"' in js
    assert "textContent" in js
    assert ".innerHTML" not in js
    assert "localStorage" not in js
    assert "sessionStorage" not in js
    assert (ROOT / "owner-dashboard.css").exists()


def test_owner_actions_are_server_authenticated_and_validated():
    api = source("api/nizo-admin.js")
    assert 'if(!isAdmin(req))return json(res,401' in api
    assert "HttpOnly; Secure; SameSite=Strict" in api
    for action in ("overview", "list", "settings", "service", "close-day", "open-day", "update"):
        assert f'action==="{action}"' in api
    assert api.index('if(!isAdmin(req))') < api.index('action==="overview"')
    assert 'nizo_closed_dates' in api
    assert "COUNT(*) FILTER" in api
    assert "ORDER BY day ASC,start_min ASC LIMIT 501" in api


def test_booking_reacts_to_owner_service_prices_and_time_off():
    api = source("api/booking.js")
    frontend = source("booking-ui.js")
    helpers = source("api/_lib.js")
    assert "getSalonServices(sql)" in api
    assert "findSalonService(sql" in api
    assert "isClosedDate(sql,date)" in api
    assert "minutes:details.minutes" in api
    assert "minute+details.minutes" in api
    assert "price_confirmed" in helpers
    assert "nizo_closed_dates" in helpers
    assert "syncPublicPrices()" in frontend
    assert ".service-card[data-service]" in frontend
    assert "s.price_confirmed" in frontend
    assert ".price-note" in frontend
    page = source("index.html")
    for service in ("haircut", "beard", "combo", "styling"):
        assert f'data-service="{service}"' in page


def test_no_fake_customer_data_and_no_owner_emoji():
    html = source("owner.html")
    script = source("owner.js")
    for symbol in ("✦", "◎", "☎", "♪", "✓"):
        assert symbol not in html
        assert symbol not in script
    assert "No booking requests yet." not in html
    assert "/api/nizo-admin" in script
    assert 'aria-live="polite"' in html
