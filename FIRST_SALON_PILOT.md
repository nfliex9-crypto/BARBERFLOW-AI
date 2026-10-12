# First Salon Pilot — Local demo before approaching a business

This branch is a preparation for the first salon visit. **The Google short URL has not been resolved** from our available tools; no real salon identity, photos, logo, address, opening hours, staff count, booking prices or customer data have been confirmed. It is therefore a **clearly labelled fictitious demo**, not an official website of the linked business.

## Getting started on Windows

1. Install Python 3.12, FFmpeg (both `ffmpeg` and `ffprobe` available in PATH), and Git.
2. Open PowerShell in a working directory and run:

```powershell
git clone https://github.com/nfliex9-crypto/BARBERFLOW-AI.git
cd BARBERFLOW-AI
git switch first-salon-pilot-v1
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m scripts.seed_pilot --salon "Brussels Sample Barbershop"
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

3. Open the printed `Login URL`, sign in with the printed **single-use display** credentials, and choose Bookings from the Studio sidebar. Open the printed public booking link separately in another browser window/private mode.
4. You can change the client's booking page language using `&lang=fr`, `&lang=nl` or `&lang=en`. Open a sample slot on a working day, enter **synthetic** contact info like `test@example.invalid`, and submit. Go back to owner Dashboard and verify the request is `pending`, then confirm it, checking collision protection.
5. Test days off, lunch breaks and booking metrics. Demo prices (haircut €25, haircut+beard €35 and trim €15) are **invented examples**, not prices of the linked barbershop.

## What this script does, and does not do

- Creates a local test owner and salon whose public name starts `DEMO ·`.
- Adds three **sample** services and creates no fabricated bookings or financial activity.
- Uses an email address ending in `@example.invalid`, a randomly generated password printed one time, and the existing salted password hashing.
- Refuses to run in `APP_ENV=production`.
- Does **not** contact Google Maps, a real salon, SMTP, Meta, WhatsApp or customers.
- Does **not** expose a public hosted demo URL by itself. It prepares local test data only.

## Required details to build a branded pilot for the actual salon

- Salon's precise name, city and street from Google Maps or an uploaded screenshot (needed because the `share.google` link was inaccessible).
- Existing booking method and service prices (verified by owner or from public listed prices), preferred language(s), and typical opening hours.
- Owner approval before using the business logo/photos, contacting real clients, or putting a page online representing the salon.
- A written authorization and a secure deployment plan before handling real bookings and customer data.

## Quality gate

```powershell
python -m pytest -q
```

This exercises existing real MP4 rendering tests, booking controls, tenant isolation, no-fake-revenue metrics and the seeded demo workflow. It does **not** prove mail inbox delivery or publication to third-party social networks.
