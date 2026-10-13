from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/"nizo_site_v5"
def read(name): return (ROOT/name).read_text(encoding="utf-8")
def test_brand_icons_are_svg_not_emoji():
    html=read("index.html")
    owner=read("owner.html")
    app=read("app.js")
    js=read("booking-ui.js")
    sprite=read("assets/nizo-icons.svg")
    for icon in ("instagram","tiktok","phone","pin","calendar","check","arrow-up-right"):
        assert f'id="{icon}"' in sprite
    assert "assets/nizo-icons.svg#" in html
    assert "assets/nizo-icons.svg#" in owner
    for markup in (html,owner,app,js):
        for glyph in ("✦","●","▦","✓","⌖","☎","◎","♪","↗","↻","←","→","↑","↓"):
            assert glyph not in markup, f"Unexpected glyph: {glyph}"
    assert 'class="confirm-icon"' in html
    assert "Afspraakaanvragen mogelijk" in html

def test_saved_booking_returns_private_status_link_and_post_api():
    html=read("index.html")
    script=read("booking-ui.js")
    api=read("api/booking.js")
    status=read("status.js")
    assert 'id="booking-status-link"' in html
    assert "URLSearchParams({id:data.id,token:data.token})" in script
    assert "status.html#" in script
    assert 'req.method==="POST"&&action==="status"' in api
    assert 'req.method==="GET"&&action==="status"' not in api
    assert 'method:"POST"' in status
    assert "hashToken(token)" in api
    assert (ROOT/"status.html").exists()
