# BarberFlow — Open-Source Barber Video Studio (v0.2 Beta)

**A real, local-first video editor for barbers, with Arabic/English dashboard. No paid video API.**

This repository contains a working FastAPI SaaS prototype with individual salon accounts, protected media, multipart uploads, FFmpeg edits, subtitles/labels, optional royalty-cleared music, project history, ready-to-download MP4 files, and activity/processing metrics. Smart Cut selects candidate footage using local timing and sharpness/exposure heuristics; **it is NOT yet a visual AI that understands a haircut or guarantees a perfect before/after**.

## Features available now

- Account registration / password sign-in, salted `scrypt` password hashes, signed HTTP-only session cookies
- Salon isolation at all project & video API routes (other salon users cannot view your media)
- Desktop/mobile dashboard, Arabic/English, 3 templates: Cinematic, Clean Studio, Bold Energy
- Upload 1 long source video **or** up to 12 separately recorded clips (MP4, MOV, M4V, WEBM, MKV)
- Local smart highlight selection, 9:16 FFmpeg MP4 export, logo/name label, optional uploaded soundtrack
- Project preview & MP4 download, suggested caption, activity feed and actual render stats
- Retry failed jobs, delete projects/media, adjust salon name
- 15/24/30/45-second output choice, clip ordering and branded ending
- Authentic persistent content planning and `.ics` calendar export **without falsely claiming automatic posting**
- Account metadata export and irreversible self-service deletion, IP-scoped login throttling and salon job/storage limits
- SQLite persistence and Docker run support

**Not yet implemented:** direct Instagram/TikTok/YouTube posting, OAuth, payments, cloud storage, generative visual AI editing, formal consent registry, multi-server worker queues, production-grade monitoring/backups and distributed rate limits. Those pages explicitly disclose unconnected features; they do not fake posting or analytics.

## Quick start (100% free locally)

Requirements: **Python 3.12+**, **FFmpeg/ffprobe** installed on PATH, and local storage. Run:

```bash
cd barberflow-ai
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open [http://localhost:8000](http://localhost:8000), create an account, upload a video, and wait for Ready. Output: real `.mp4` inside `media/salons/<salon>/<project>/final.mp4` and authenticated download link. Rendering duration depends on CPU, codecs and source resolution.

For **online hosting**, read [RELEASE.md](RELEASE.md) first. A persistent disk and always-on FFmpeg container are required.

## Docker

```bash
# First generate a secure secret (store it in your secret manager):
python -c "import secrets; print(secrets.token_urlsafe(48))"
# Set APP_SECRET in your local environment; don't commit it.
export APP_SECRET="<secret you generated>"
docker compose up --build -d
```

Open http://localhost:8000. `compose.yaml` mounts `./media` for persistence. **Put it behind HTTPS with reverse proxy before opening it publicly.** Avoid running the container as a privileged host account, monitor resource use and restrict uploads.

## Settings

| Environment variable | Default | Description |
|---|---|---|
| `APP_ENV` | `development` | In `production`, requires strong `SECRET_KEY`; cookies marked Secure |
| `SECRET_KEY` | transient in development | Unique HMAC secret (min 32 chars) |
| `BF_DATA_DIR` | `./media` | Writable persistent folder containing uploaded videos and SQLite |
| `BF_OUTPUT_WIDTH` | `1080` | Video export width |
| `BF_OUTPUT_HEIGHT` | `1920` | Video export height |
| `BF_MAX_UPLOAD_MB` | `250` | Per-video upload size cap |
| `BF_MAX_INPUT_MINUTES` | `45` | Total footage cap per project |
| `BF_WORKERS` | `2` | Background render worker threads on one node |

Set dimensions to 720 × 1280 for cheaper CPU usage. Very short videos are edited into shorter outputs; no extra footage is fabricated.

## Tests

```bash
pip install pytest httpx
pytest -q
node --check app/static/app.js  # if Node is available
```

Tests exercise real FFmpeg output, MP4 signatures, thumbnail creation, registration/sign-in, cross-salon access denial, retry constraints, rejected files and deletion. The test suite sets 360×640 to run quickly while retaining the same video filter chain.

## Architecture

```text
Browser (responsive HTML/CSS/JS in AR and EN)
        |
        v
FastAPI (auth, tenancy, upload, media download, status)
        |             |
        v             v
 SQLite WAL        media/salons/{tenant}/{project}
        |             |
        +--- worker --+---> ffprobe / OpenCV quality heuristic
                              |
                              v
                         FFmpeg render --> MP4 + JPG poster
```

No artificial follower/like metrics, invented posts, or simulated renders. Render queues are **in-process threads** on a single machine; interrupted jobs are marked failed and can be retried. Deploying to Vercel's serverless tier alone is **not sufficient for reliable long-running video processing**. For a commercial multi-server version, move files to object storage, jobs to Redis-backed workers, sessions/accounts to managed PostgreSQL, add backups, automated retention, consent evidence and secure social OAuth.

## Development roadmap

1. Real-world barbershop footage validation and before/after manual marking control.
2. Optional locally hosted multimodal model with semantic phases: before, cut, line-up, reveal; do not label it “AI” until verified.
3. Non-destructive timeline editor, reframe controls, music licensing library, caption localization, template preview.
4. S3/R2 upload with presigned URLs, PostgreSQL, Redis queue, durable distributed workers and data retention policies.
5. Per-salon integration with official social publishing providers/OAuth, audit logs and retries (subject to API permissions).
6. SaaS billing, rate limiting, compliance, GDPR consent policy, password reset, backups, monitoring and production load tests.

## License

MIT. Brand/identity and example creative assets are placeholders; verify availability of the product name before a commercial launch.


## Business pilot (booking requests + video editing)

On the [business-pilot-v1](https://github.com/nfliex9-crypto/BARBERFLOW-AI/tree/business-pilot-v1) development branch, salon owners can also open **/static/bookings.html** after signing in, create services, and copy a link to the public **/static/book.html?salon=...** request form. Bookings remain pending until owner confirmation. Confirming a request does **not** send an email or SMS. Default pilot hours are Tuesday–Saturday 09:00–18:00 in Europe/Brussels.

See [BUSINESS_PILOT.md](BUSINESS_PILOT.md) for pricing experiments, sales validation, safety gaps and setup. Existing FFmpeg studio remains available from **/**. This is a **development pilot**, not a production booking service or operational AI receptionist.


## Business Engine v2 — development preview

On branch [business-engine-v2](https://github.com/nfliex9-crypto/BARBERFLOW-AI/tree/business-engine-v2), the separate booking module adds editable weekly schedules, breaks, closed dates, and a public **English/French/Dutch** request page. Its opt-in TLS SMTP notification outbox requires a separately running worker and sender credentials. The main video editing Studio continues to render FFmpeg video files. Open **/static/bookings.html** from a logged-in salon account.

Read [BUSINESS_ENGINE_V2.md](BUSINESS_ENGINE_V2.md) for actual API details, Windows setup, SMTP Docker profile and known pilot limitations. **Do not confuse an SMTP-queued status with proof of email delivery or customer confirmation.**
