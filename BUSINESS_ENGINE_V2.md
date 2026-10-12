# BarberFlow Business Engine v2 — implementation and deployment notes

Development branch: `business-engine-v2`. Base branch: `business-pilot-v1`. Neither `Bot` nor unrelated user projects were edited.

## Implemented and testable
- 7-day per-salon opening hours, independent open/close times and enabled flags.
- Optional lunch break on each weekday, date closures/holidays, public availability filtered on the server.
- Revalidation on booking submission **and** confirmation; transactional SQLite conflicts for confirmed appointments.
- State transitions: pending to confirmed/declined/cancelled; confirmed to cancelled only. No automatic rescheduling of existing confirmed customers after a calendar edit.
- Per-salon admin controls, public request form, HTTPS-ready application with account isolation.
- SMTP email outbox for owner request notifications and customer confirmation/decline/cancellation. SMTP delivery is OPT-IN. Messages remain in SQLite if worker is not running; worker retries failures up to 5 times.
- Worker heartbeat and queue status displayed to salon owner; 'smtp_accepted' means accepted by SMTP, NOT delivered into recipient inbox.
- Newly added backend integration tests of schedule/closures, account data privacy, delayed mail and invalid transitions; real FFmpeg tests remain part of CI.

## Readiness and known gaps
- The code is a **private beta**. No live public deployment or customer delivery has been verified.
- No WhatsApp, SMS, AI receptionist, TikTok/Instagram API publishing, billing or staff calendar yet.
- One-chair scheduling assumption: every confirmed booking blocks the salon's entire calendar. Add staff/resources before multi-chair production use.
- Opening hours are Europe/Brussels, start increments 30 minutes; service durations 15–180 minutes. DST at the clock-change hours is outside normal daytime opening hours, but add wider DST regression coverage before 24/7 salon support.
- Owner email and customer email are stored in SQLite; privacy policies, retention windows, GDPR processing terms, recovery/deletion checks and verified email addresses are necessary before any real users.
- Notification worker claims are durable and rate-limited, but a worker crash after SMTP acceptance and before recording it can rarely cause duplicate mail; design sends must be idempotent at the provider layer for stronger assurances.
- A cancelled appointment supersedes only *pending* confirmation emails, not messages already in flight or accepted by SMTP.
- Adding a holiday or updating opening hours does not cancel pre-existing confirmed bookings. Contact customers manually.
- A valid SMTP configuration by itself does not prove there is a running worker. Check dashboard heartbeat and logs.

## Local Windows walkthrough
Install Docker Desktop (recommended) or Python 3.12+ and FFmpeg on PATH. Use PowerShell:
~~~powershell
git clone https://github.com/nfliex9-crypto/BARBERFLOW-AI.git
cd BARBERFLOW-AI
git switch business-engine-v2
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt pytest httpx
$env:APP_ENV='development'
$env:BF_DATA_DIR='./media'
uvicorn app.main:app --host 127.0.0.1 --port 8000
~~~
Visit http://127.0.0.1:8000, register a TEST salon, and then open http://127.0.0.1:8000/static/bookings.html. Create a service, set hours, add a blocked date, copy the client booking link, submit a test request, and confirm it in owner dashboard.

## SMTP opt-in, no false delivery status
- Choose a legitimate TLS SMTP service and authorized sender; obtain its credentials yourself. NEVER commit credentials.
- Configure `BF_SMTP_ENABLED=true`, `BF_SMTP_HOST`, `BF_SMTP_FROM`, `BF_SMTP_PORT` and if needed `BF_SMTP_USER` and `BF_SMTP_PASSWORD` in deployment private environment.
- Run the API and its separate mail worker using the SAME persistent `BF_DATA_DIR`; for local compose, set `APP_SECRET` and SMTP values in a private `.env`, then:
~~~bash
docker compose --profile email up --build -d
~~~
- To disable actual outbound messages leave `BF_SMTP_ENABLED=false` and do not start the optional worker. Owners must contact customers manually.
- Run just the worker on a local machine with the same app environment: `python -m app.notifications`. It reads pending messages from SQLite and uses encrypted SMTP.
- Check `GET /api/bookings/mail-status` while authenticated: queue count, worker heartbeat, and accepted-by-SMTP messages.
- Restart worker, reload dashboard and confirm no messages are marked delivered simply because confirmation was clicked.

## API reference
| Endpoint | Auth | Role |
|---|---|---|
| `GET /api/bookings/hours` | salon owner | list weekly working hours |
| `PUT /api/bookings/hours/{weekday}` | salon owner | replace one day, weekday=0 Monday |
| `GET /api/bookings/closures` | salon owner | list blocked dates |
| `POST /api/bookings/closures` | salon owner | block one date |
| `DELETE /api/bookings/closures/{YYYY-MM-DD}` | salon owner | reopen |
| `GET /api/public/salons/{id}/slots` | public | available times for selected service/day |
| `POST /api/public/salons/{id}/requests` | public, throttled | request appointment only |
| `PATCH /api/bookings/{id}` | salon owner | confirm, decline, cancel |
| `GET /api/bookings/mail-status` | salon owner | queue summary and worker heartbeat |

### Examples
`PUT /api/bookings/hours/4`: `{\"enabled\":true,\"opens\":\"09:00\",\"closes\":\"17:00\",\"break_start\":\"12:00\",\"break_end\":\"13:00\"}`
`POST /api/bookings/closures`: `{\"day\":\"2026-12-25\",\"reason\":\"Christmas holiday\"}`

## CI / tests
~~~bash
python -m pip install -r requirements.txt pytest httpx
python -m compileall -q app
node --check app/static/app.js
node --check app/static/book.js
node --check app/static/bookings.js
pytest -q
~~~
CI tests include actual FFmpeg output, so the Ubuntu runner must have FFmpeg installed. CI alone does not validate SMTP delivery to real recipient inboxes.

## Next build milestones
1. Production hosting proof, encrypted offsite backups and restore; add end-to-end browser smoke tests.
2. Verified domain email sender, approved notification templates and GDPR operational paperwork.
3. Multi-staff/holiday scheduling and calendar external sync.
4. Video human review, clip preview and optional PySceneDetect / faster-whisper A/B tests.
5. Licensed platform OAuth publishing with explicit salon approval, usage metering and Belgian subscriptions.
6. After 3 paying salons and measured editing cost per reel, replace in-process video threads with durable workers/object storage.

## Upstream GitHub/n8n policy
Refer to `GITHUB_N8N_AUDIT_2026.md` on the base branch. n8n templates are integration references only; no workflow was represented as production-connected. The client-facing app remains our own service and no proprietary/strong-copyleft code was imported wholesale.