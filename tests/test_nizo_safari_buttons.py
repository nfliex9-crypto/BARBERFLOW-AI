"""BARBER NIZO iOS Safari regression: inline SVG and bounded CTA controls."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1] / "nizo_site_v5"

def read(name):
    return (ROOT / name).read_text(encoding="utf-8")

def test_all_public_and_private_icons_are_self_contained_inline_svg():
    for name in ("index.html","owner.html","status.html"):
        html = read(name)
        assert "nizo-icons.svg#" not in html
        icons = re.findall(r'<svg class="nizo-icon"[^>]*>(.*?)</svg>',html,re.S)
        assert len(icons)>=3,(name,len(icons))
        for icon in icons:
            assert "<use " not in icon
            assert "<path " in icon or "<rect " in icon
        assert html.count('viewBox="0 0 24 24"') >= len(icons)
        assert html.count('width="20" height="20"') >= len(icons)
        assert html.count('stroke="currentColor"') >= len(icons)
        assert html.count('fill="none"') >= len(icons)

def test_mobile_buttons_have_strict_dimensions_and_no_duplicate_sticky_cta():
    css=read("styles.css")
    app=read("app.js")
    for required in ("svg.nizo-icon","width:20px!important","height:20px!important",
                     "max-width:20px!important","min-height:58px","max-height:70px",
                     ".hero-actions>.btn",".mobile-book.is-visible",
                     "max-height:52px",".nav-cta{display:none}"):
        assert required in css,required
    for required in ("stickyBooking","IntersectionObserver",
                     "sections.hero","sections.booking","is-visible"):
        assert required in app,required

def test_owner_actions_and_date_fields_cannot_overflow_on_iphone():
    css=read("owner-dashboard.css")
    html=read("owner.html")
    for token in (".owner-closure-form input",".owner-closure-form .owner-big-cta",
                  ".owner-body svg.nizo-icon","max-height:18px!important",
                  "grid-template-columns:minmax(0,1fr)",
                  "min-width:0!important",".owner-clock{display:none}"):
        assert token in css,token
    assert 'id="close-day-date"' in html
    assert 'id="close-day-reason"' in html
    assert 'type="submit">BLOKKEER DATUM' in html
    assert 'viewBox="0 0 24 24"' in html
