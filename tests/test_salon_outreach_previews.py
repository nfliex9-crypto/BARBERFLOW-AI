"""Three independent salon pitch websites must not be mistaken for official bookings."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "salon_previews"
SITES = {
  "bar-bier": {"name": "Bar-bier", "phone": "+32 9 223 45 93", "address": "Sint-Margrietstraat 18"},
  "fero": {"name": "Barbershop Fero", "phone": "0484 77 53 12", "address": "Muidepoort 112/A"},
  "momo": {"name": "Barbershop M&amp;M — MOMO", "phone": "+32 497 57 06 64", "address": "Bevrijdingslaan 52"},
}

def test_three_different_branding_concepts_with_real_contact():
    for slug, details in SITES.items():
        page = (ROOT / slug / "index.html").read_text(encoding="utf-8")
        assert "<!doctype html>" in page.lower()
        assert details["address"] in page
        assert details["phone"] in page
        assert 'name="robots" content="noindex,nofollow,noarchive"' in page
        assert 'class="hero"' in page
        assert 'class="booking-box' in page
        assert '/assets/site.js' in page
        assert '/assets/salon.css' in page
        assert 'window.SALON_PROPOSAL=' in page
        assert 'geen boeking opgeslagen' in page
        assert 'GEEN OFFICIËLE WEBSITE' in page
        assert 'Geen account, geen persoonsgegevens, geen betaling' in page
        assert 'tel:' in page
        assert "illustratief" in page.lower()

def test_each_salons_palette_is_custom():
    css = (ROOT / "assets" / "salon.css").read_text(encoding="utf-8")
    assert ".theme-fero" in css and ".theme-momo" in css and ".theme-barbier" in css
    assert "@media(max-width:520px)" in css
    assert "prefers-reduced-motion" in css
    assert "display:grid" in css
    assert "outline:3px solid var(--accent)" in css

def test_no_live_booking_endpoints_or_false_successes():
    js = (ROOT / "assets" / "site.js").read_text(encoding="utf-8")
    for forbidden in ("localStorage","sessionStorage","/api/booking","fetch(","new WebSocket","betaling voltooid","Boeking bevestigd"):
        assert forbidden not in js
    assert "tel:" in js
    assert "niet geselecteerd" in js
    assert "date.value" in js
    assert "aria-pressed" in js

def test_fero_prices_are_real_but_other_salon_prices_not_invented():
    fero=(ROOT / "fero" / "index.html").read_text(encoding="utf-8")
    assert "€18" in fero and "€20" in fero and "€35" in fero
    for slug in ("bar-bier","momo"):
        html=(ROOT / slug / "index.html").read_text(encoding="utf-8")
        assert "Prijs te bevestigen" in html
        assert "€25" not in html

def test_marketing_hub_is_transparent():
    home=(ROOT / "index.html").read_text(encoding="utf-8")
    for slug in SITES:
        assert f'href="/{slug}/"' in home
    assert "geen geverifieerde originele bedrijfslogo" in home
    assert "Echte boekingen" in home
