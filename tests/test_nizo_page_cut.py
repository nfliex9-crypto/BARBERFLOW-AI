"""Regression tests for the real split-page scissors interaction.

The actual booking screenshot must be cut into two real DOM clones, not merely
a moving colored line. Check booking accessibility and reduced-motion fallback.
Browser choreography should also receive human mobile QA before production.
"""
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / "nizo_site_v5"


def test_booking_cut_installed_and_old_effect_removed():
    html = (SITE / "index.html").read_text(encoding="utf-8")
    app = (SITE / "app.js").read_text(encoding="utf-8")
    transition = (SITE / "page-cut.js").read_text(encoding="utf-8")
    assert '<script defer src="page-cut.js"></script>' in html
    assert 'id="scissor-overlay"' in html
    assert 'id="scissor-icon"' in html
    assert 'class="cut-blade-a"' in html and 'class="cut-blade-b"' in html
    assert "const overlay=$('scissor-overlay')" not in app
    assert "window.__nizoSplitCutInstalled" in transition
    assert "a[href=\"#booking\"]" in transition


def test_cut_has_two_real_pieces_with_independent_motion():
    animation = (SITE / "page-cut.js").read_text(encoding="utf-8")
    css = (SITE / "styles.css").read_text(encoding="utf-8")
    assert "cloneNode(true)" in animation
    assert "getBoundingClientRect()" in animation
    assert "makeHalf('top')" in animation
    assert "makeHalf('bottom')" in animation
    assert "top.style.transform" in animation
    assert "bottom.style.transform" in animation
    assert "bookingTarget();" in animation
    assert "clip-path:polygon" in css
    assert ".nizo-page-top" in css
    assert ".nizo-page-bottom" in css
    assert "nizo-cut-snapshot" in css
    assert "reduced-motion" in animation and "reduced-motion" in css
    assert "hair-canvas" in animation
    assert "aria-hidden" in animation or "aria-hidden" in (SITE / "index.html").read_text(encoding="utf-8")


def test_owner_authorization_wording_updated_but_booking_not_faked():
    html = (SITE / "index.html").read_text(encoding="utf-8")
    assert "Confirmation required before live bookings" not in html
    assert "Online afspraakaanvragen mogelijk" in html
    assert "tel:+32471821630" in html
    assert 'id="appointment-form"' in html
    assert 'booking-ui.js' in html
    assert 'id="booking-confirmation"' in html
    assert "assets/nizo-1.webp" in html
    for number in range(1, 6):
        assert (SITE / "assets" / f"nizo-{number}.webp").is_file()
