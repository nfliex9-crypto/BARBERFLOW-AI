# BARBER NIZO · Gent — website source

## What's included
A complete static, mobile-first website using the **five images supplied by the project contact**: correct neon BARBER NIZO sign, authentic customer/gallery photographs, pricing examples, current Monday–Saturday 10:00–20:00 hours (Sunday closed), contact buttons, Instagram/TikTok profile links and an animated scissors booking transition with small hair-like particles.

## Run locally
Open `index.html` in a browser or serve the folder:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`. The photo assets are in `assets/` (WebP optimized). No third-party animation or tracking library is required; native IntersectionObserver, Canvas 2D, requestAnimationFrame and scroll-snap power interactions.

## IMPORTANT — safe preview limitations
- **The online booking backend is not connected.** Booking transition takes visitors to a section with a working phone link. It never claims a confirmed slot or pretends to save a booking.
- **The €25 / €15 / €35 / €20 values are illustrative suggestions, NOT official BARBER NIZO prices.** Confirm these prices with the owner before removing the visible disclaimer.
- Social links: Instagram uses the owner-provided `@barber_nizoo` handle; the TikTok link is the opaque Google redirect the project contact supplied. Replace with canonical profile URL once confirmed.
- The website is marked `noindex, nofollow` pending owner approval, rights clearance for customer photos, and legal/privacy review.
- Contact: Phoenixstraat 81, 9000 Gent; phone 0471 82 16 30.
- Hours: Mon–Sat 10:00–20:00, Sun closed, following the latest direct instruction.

## Features and accessibility
- Hero section with the provided shop images.
- LED-style vector logo, with the exact wording BARBER NIZO.
- 4 priced service cards and 5-photo horizontally scrollable gallery.
- Booking CTA with scissors travelling across the screen, cut line and tiny hair particles in Canvas, then smooth-scroll/focus on the booking section.
- Animation disabled gracefully for `prefers-reduced-motion` users.
- Responsive mobile navigation, active reduced-motion protections, keyboard focus, semantic sections and descriptive image alt text.
- Native scroll reveal, light parallax, sticky progress bar, and gallery arrow buttons.

## Going live
Upload this folder to a compliant hosting provider (for example via Vercel Deploy Files or with GitHub linked to Vercel Pro if used commercially). A static deployment is only a **website/phone-booking preview**, not a functioning booking service. Persistent API/storage and confirmed service schedules remain separate prerequisites.
