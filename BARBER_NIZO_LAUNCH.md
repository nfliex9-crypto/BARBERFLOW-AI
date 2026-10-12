# BARBER NIZO — Implementation and first customer rollout

**Business:** BARBER NIZO · Phoenixstraat 81, 9000 Gent · +32 471 82 16 30 · Instagram: @barber_nizoo.

**Development branch:** `nizo-gent-site-v1` · **source:** screenshot supplied by commissioning developer and public place listing. Do not re-use business imagery without permission.

## What works in code

- Polished mobile/desktop branded website with NL/FR/EN copy and local CSS/JS/SVG assets.
- Real click-to-call button, maps/search link, Instagram link, services/prices from authenticated owner account.
- Public slot query and appointment request flow backed by the existing FastAPI/SQLite engine, with timezone, breaks, closures, manual confirmations, collision prevention and admin dashboard.
- Service edit endpoint with restrictions for services having existing bookings. Prices start at EUR 0 (displayed as "price on request") until owner verifies price.
- One-time owner onboarding at `/nizo/setup` using a private `BF_NIZO_SETUP_CODE` >= 32 characters, then owner credentials. No public signup in production.
- Owner approval gate: public appointment requests disabled unless the verified admin publishes the site after reviewing services, hours and privacy text; direct API requests are blocked when preview/unpublished.
- `BF_PUBLIC_SITE=nizo` changes dedicated deployment root `/` to NIZO website; `/app` remains the separate authenticated BarberFlow Studio; `/static/bookings.html` is admin booking management.
- Optional real SMTP outbox worker after configuring an authorized provider. Sending is **not** proven until connected to a real provider, and SMTP acceptance does not guarantee delivery.

## Online static design preview

[BARBER NIZO preview](https://barber-nizo-gent-preview.vercel.app/) was deployed as a **static** Vercel preview. It contains the branded frontend only, uses a safe click-to-call fallback and **cannot accept online appointment requests**. Vercel reported READY with a verified domain; actual external browser access should be tested by the salon owner.

The Vercel Hobby plan is non-commercial. It is for development preview only. For any commercial/business launch, use Vercel Pro or a host whose terms expressly allow commercial use.

Railway project provisioning from the connected workspace failed with: `Free plan resource provision limit exceeded`. No independent always-on booking server was created and the earlier Railway projects were left unchanged. Do not claim this site is production-ready.

## Local test with Windows

```powershell
git clone https://github.com/nfliex9-crypto/BARBERFLOW-AI.git
cd BARBERFLOW-AI
git switch nizo-gent-site-v1
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt pytest httpx
$env:APP_ENV="development"
$env:BF_PUBLIC_SITE="nizo"
$env:BF_NIZO_SETUP_CODE="<generated-private-32-character-plus-setup-secret>"
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` for the NIZO site. Visit `/nizo/setup` to create the **real owner account with permission**. Then check services/prices, opening hours, closed dates, and privacy/legal requirements from `/static/bookings.html`; publish through `/nizo/setup`. `/app` is the editing studio. Do not share the onboarding code or use real customer data on an insecure localhost tunnel.

## Go-live blockers

1. A compliant persistent backend host with HTTPS, offsite backups/restore checks and operational monitoring (Railway account is at its free-plan resource limit).
2. Owner confirmation of exact services, treatment durations/prices, opening hours, breaks, holidays and branding rights. Existing hours are illustrative, *not verified*. Site images currently are CSS illustrations, not copied Google Maps photos.
3. Final GDPR-compliant privacy information, retention periods, DPA, legitimate basis, access/deletion workflow, secure customer contact verification and permission for real-world publication.
4. Configure SMTP worker and sender domain, verify delivery end-to-end with real test mail before promising automatic confirmations.
5. Multi-chair/staff capacity if needed; single-salon calendar currently only supports one resource at a time.
6. User-acceptance test on phone, negative cases and stress/restore test, plus a legal commercial hosting plan.
7. Change management: Vercel static preview is an inline snapshot, **not** Git-synced. Backend deployment will be a separate service.

## Final QA evidence

GitHub Actions PR checks compile Python and JavaScript, exercise FastAPI with HTTP requests and actually render MP4 using FFmpeg. Vercel deployment build ready is **not** evidence of a running backend. Keep these statuses separate.

**Do not market it as an official live booking site until all relevant checks and owner authorizations are complete.**
