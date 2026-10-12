# BarberFlow — technical, GitHub and n8n due diligence
Reviewed: 2026-10-12. Branch: `business-pilot-v1`; base: `Bot`. Scope: currently tracked application, tests, deployment files and selected external sources. **Do not treat CI success as a production certification.**

## Verified repo inventory
- FastAPI `app/main.py`: users/tenants, media upload, SQLite, login/session, renders, privacy export/delete, content planning and health routes.
- `app/engine.py`: OpenCV quality heuristics and FFmpeg deterministic MP4/JPG output. Not a semantic haircut AI and not frame-perfect editing.
- `app/bookings.py`: booking request CRUD and timeslots for one salon schedule (Tue–Sat 09:00–18:00 Brussels), owner confirms manually, no external calendar sync.
- `app/static`: Arabic/English editing UI; English-only request/booking management screens for now. Bookings can be opened from Studio sidebar.
- `tests`: unit/integration checks for cross-salon authorization, real rendering, booking conflicts, privacy/account removal and closed signup.
- `.github/workflows/test.yml`: Python compileall, Node syntax checks, pytest with FFmpeg; verified passing on 2026-10-12.
- `Dockerfile`, `compose.yaml`, `deploy/oracle/*`, `railway.json`: runnable design but no verified production domain, restore drill or live social OAuth.

## Corrections made in review
1. Exposed the bookings owner page in the Studio navigation; fixed link style.
2. Prevented stale asynchronous timeslot responses from overriding the currently selected service/day.
3. Closed open account registration in production by default; requires explicitly setting `BF_ALLOW_OPEN_SIGNUP=true` for manual beta onboarding. This is not secure per-customer invite-code verification.
4. Added tests for booking duplicates, out-of-hours requests, disabled services, and closed production registration.

## Blocker matrix for sellable SaaS
| Severity | Finding | Work needed |
|---|---|---|
| P0 | No verified production environment for BarberFlow | HTTPS, mounted durable volume, actual domain, backups and restore drill, edge WAF, deployment smoke and restart tests |
| P0 | Booking confirmation is only admin state; customer not notified | Reliable transactional email/SMS sending with retry/idempotency and delivery logs. Never mark as sent on an attempted request |
| P0 | Fixed pilot schedule, no staff/breaks/holidays/Google sync | Configurable calendars, atomic conflict controls, availability generation and timezone/DST regression tests |
| P0 | GDPR operational policies/consents incomplete | Review data roles, privacy notice, DPA, retention, access/export/deletion, image/voice permissions and security procedures |
| P1 | Signup open by default previously | Added production-off signup toggle; add individual invitation tokens, email verification, password recovery before public rollout |
| P1 | Renders execute as threads in API process with SQLite/local files | Background durable job queue, remote storage, retry/idempotency and monitoring for multi-node SaaS |
| P1 | Social publishing only manual calendar | Official approved OAuth per platform, per-client credentials, approvals, API receipts, retries; no fake publishing metrics |
| P1 | No SaaS billing/subscriptions/permissions | Belgian compliant invoicing, payment provider, pricing plan enforcement, subscriptions and failed-payment handling |
| P1 | Externally exposed uploads/media | Scan/validate media files, enforce aggregate quotas at proxy/storage layer, lifecycle retention and ffmpeg CPU controls |
| P1 | Test coverage lacks UI end-to-end/browser/load testing | Playwright mobile browser flows, 24h soak, DST/business hours/breaks concurrency and performance |
| P2 | Studio does not semantically identify haircut before/after | Optional PySceneDetect plus human markers/annotations, measure samples before adding ML |
| P2 | Only English customer booking page | Dutch/French localisation, accessibility, i18n currency/time formatting, operator translations |

## Upstream GitHub shortlist (evaluation, not imported code)
| Rank | Source | License observed | Recommended role | Decision |
|---|---|---|---|---|
| 1 | https://github.com/fullcalendar/fullcalendar | MIT | Interactive multi-staff calendar display | Adopt later, after real availability backend |
| 2 | https://github.com/Breakthrough/PySceneDetect | BSD-3-Clause | Offline shot boundary detection for reels | A/B-test on genuine haircut clips; no immediate integration |
| 3 | https://github.com/SYSTRAN/faster-whisper | MIT | Optional subtitles and local speech transcription | Add after testing memory/CPU and video throughput |
| 4 | https://github.com/python-arq/arq | MIT | Async Redis-backed job queues | Adopt with Redis when production hosting/resources are budgeted |
| 5 | https://github.com/WyattBlue/auto-editor | Unlicense | Reference for silence/motion trimming | Only use algorithms after measuring real quality; no wholesale adoption |
| 6 | https://github.com/alextselegidis/easyappointments | GPL-3.0 | Benchmark for real appointment workflow | Learn from behavior, don't copy GPL code into proprietary product without complying |
| 7 | https://github.com/n8n-io/n8n | Sustainable Use License + enterprise terms | Internal agency automation/notifications | Optional operator-only automation, no tenant-facing editor under free license |
| 8 | https://github.com/Zie619/n8n-workflows | MIT repository label | Workflow ideas/templates | Inspect each item, credentials and copyright before import |

## Official n8n workflows inspected (do not copy into product blind)
- https://n8n.io/workflows/4926-automate-salon-appointment-management-with-whatsapp-gpt-and-google-calendar/ — salon booking reference, but multiple paid/hosted dependencies and significant setup.
- https://n8n.io/workflows/16680-book-and-confirm-clinic-appointments-with-whatsapp-google-calendar-and-gmail — appointment webhook/notification design; adapt event schema and salon separation.
- https://n8n.io/workflows/9786-schedule-and-auto-post-videos-to-instagram-linkedin-and-tiktok-with-google-sheets — scheduling example, requires third-party UploadPost and valid social permissions; not free just because template says 'Use for free'.
- https://n8n.io/workflows/11638-bulk-auto-publish-videos-to-social-networks-with-ai-copy-and-client-approval — demonstrates explicit human approval, but still uses third-party publishing.
- https://n8n.io/workflows/19324-book-and-manage-whatsapp-appointments-with-openai-and-google-calendar — useful idempotency/fallback pattern; paid template.

## n8n integration contract for our agency pilot
- BarberFlow's database remains canonical for booking state and video project status. n8n should NEVER independently confirm a slot from unverified WhatsApp input.
- After confirmed booking state, emit only a signed event to a private automation bridge/outbox; event contains event ID, tenant ID, booking ID and timestamp. n8n fetches personal details only via a scoped authorized API if legally needed.
- Use unique event keys, delivery attempt audit trail and retry/backoff; do not send PII in webhook URLs, executions logs or third-party Google Sheets by default.
- Keep n8n operator-only, with clients receiving outputs but no workflow configuration access. n8n's own license FAQ says clients configuring workflows, even via custom UI/API/AI, needs an enterprise/commercial license.
- Before selling embedded SaaS behavior, get written licensing confirmation at license@n8n.io. Do not claim fully autonomous WhatsApp, appointment or social workflows until connected and tested end-to-end.

## Commercial rollout (one Belgian city, validate before building features)
Week 1: collect 10 permissioned demo clips and interview 10 salons, show a booking request link and 1 usable Reel.
Week 2: 20 more targeted salons, test one-value proposition: 8 reels/mo vs booking-requests-plus-reels; measure signed paying clients and effort per reel.
Weeks 3–4: obtain 3 paid pilots with explicit scope, refund terms and manual delivery; check performance before automation upgrades.
Target pricing hypotheses before VAT: booking request pilot setup €79/month €69; video service €199/month for 8 reels; combined setup €99/month €249. Require validation, no guarantees.

## Release and proof checklist
- [x] GitHub separate branch; PR opened in draft. Main/Bot production branch left unchanged.
- [x] Source code backed by real FFmpeg rendering and tests; CI checked.
- [x] Closed-signup default and booking UI race fix.
- [ ] Dedicated BarberFlow service online with HTTPS, storage, secret and backup/restore proof.
- [ ] Live smoke test: signup via temporary gate, owner creates service, guest submits request, manual confirmation, customer contacted.
- [ ] Fully functional private calendar and message delivery, not just owner confirmation state.
- [ ] Permissioned real barber clips, video quality assessment, social approvals/API provisioning.
- [ ] Localized legal/privacy documents, data processing agreements, retention and client controls.
- [ ] Monitoring, payment provider and first paying customer reference.

**Audit is code/source review plus automated tests, not a penetration test, legal signoff, or verified production deployment.**