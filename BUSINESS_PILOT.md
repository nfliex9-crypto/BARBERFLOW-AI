# BarberFlow Business Pilot (Belgium)

## Verified software scope
- Existing Studio beta: account-isolated video uploads, FFmpeg vertical MP4 rendering, ready-to-download clips, branded caption drafts and MANUAL posting calendar.
- New bookings pilot: service list, public booking request page, fixed Tuesday–Saturday 09:00–18:00 Brussels hours, customer contact collection, manual owner confirmation, overlap protection, tenant isolation, account export and deletion.
- NOT integrated: SMS/email/WhatsApp delivery, AI receptionist, Google Calendar, automated Meta/TikTok publishing, payment processing. Do not market these as working.

## URLs (on the eventual hosted domain)
- Owner: /static/bookings.html (log in first on /).
- Client link: /static/book.html?salon=SALON_UUID (copy from owner screen).
- Video Studio: /.
- Requests start as pending. Marking a booking confirmed does NOT notify anyone. Manually contact customer.

## Offers to test — not proven market prices; exclude VAT
| Pilot package | Setup | Monthly | Deliverable |
| --- | ---: | ---: | --- |
| Booking Request Pilot | €79 | €69 | Booking page, configure 5 services, manual confirmations |
| Video Studio Service | €0 | €199 | 8 edited 15–30 second reels per month, client-provided footage, caption drafts, manually planned publishing |
| Combined | €99 | €249 | Both services, one revision round per clip, realistic human review |

Prices do not include automatic social posting, AI messages or automated billing. Quote final terms and response-time SLAs only after measuring hands-on editing hours.

## First 30-day sales experiment
1. Select one Belgian city and interview 20 barbers and 10 beauty salons; discover current booking/content workflows and willingness to pay.
2. Show a consented Reel before/after and the public request-only booking page.
3. Close 3 paid pilot customers and track labour per 8 videos, setup hours, subscriptions, churn, payment collection, conversion, support, refund requests.
4. Check if prospects react better to 'more bookings and content' than AI-first branding; do not interpret compliments as confirmed sales.
5. Require written footage permissions, legal music rights, clear privacy notice and a retention/deletion policy before client deployment.

## Release blockers
- Production HTTPS, strong SECRET_KEY, persistent storage, backup & restore tests, abuse protection, actual legal/GDPR readiness.
- Scheduling pilot uses hardcoded Tue-Sat 9–18 and lacks holidays, breaks, staff calendars, rescheduling, external calendar sync, messages and payment deposits.
- FFmpeg renders need an always-on worker with storage; Vercel serverless alone cannot handle reliable long media processing.

## Developer verification
Install requirements + pytest/httpx; run Python compileall, JavaScript node syntax checks, then pytest -q. No claim of live deployment is made.