# BARBER NIZO — pricing + motion v4

## Pricing shown in the public development preview
Prices were **not found as officially published prices of BARBER NIZO**. The following are market-informed **example proposals**, displayed with a prominent "VOORSTELPRIJZEN — Geen officiële prijslijst" note (translated in EN/FR). Do not represent them as confirmed prices, quotes or a binding offer.

| Example only | Proposed price | Assumed duration |
|---|---:|---:|
| Herenknipbeurt | €25 | 30 min |
| Baard bijwerken | €15 | 30 min |
| Knippen + baard | €35 | 45 min |
| Haarstyling | €20 | 30 min |

The above examples are not persisted to salon booking prices. The NIZO backend continues to initialize new salon services with `price_cents=0`, meaning "price on request" until the owner edits their services in `/static/bookings.html`. Once a salon backend exists, actual configured service prices, names and durations replace the illustrative examples in the frontend. A `price_cents=0` service is still marked "on request". Owner-approved booking must be tested end-to-end on persistent hosting before launch.

## UI improvements

- Price tags on four cards (clearly marked as proposed) and interactive service/price/duration selector.
- Mobile fixed booking CTA, active nav tracking, requestAnimationFrame scroll progress, modest hero-logo parallax.
- IntersectionObserver reveal animations and a horizontal, touch-swipeable gallery with accessible previous/next controls.
- Respects `prefers-reduced-motion`; no paid front-end library or tracking scripts required.
- Site is still a **static hosted preview** on Vercel; booking requests fall back to phone contact when no backend exists.
- Illustrated gallery shots are not confirmed as photos from BARBER NIZO and must not be misrepresented.

## QA / owners

1. Open the preview on phone and desktop; check pricing tags, touch gallery, nav highlight, contact and language switch.
2. Verify four **actual** prices and durations with the owner and replace the suggestions; ideally collect a signed screenshot/list from the salon.
3. Configure hosted backend, durable database, owner-approved services/schedules/consent, and real notification delivery.
4. After owner approval, remove the *indicative-price* disclaimer, and publish the authenticated rates from the NIZO API.
5. Confirm location and social accounts, GDPR retention policy, and licensed imagery.

The changes are on `nizo-pricing-motion-v4`, separate from any trading repository, and must pass CI prior to merging.
