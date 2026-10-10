# BARBERFLOW AI 0.2 — release & online deployment

## Release status

The FastAPI + FFmpeg server **really** renders videos and stores files locally (verified with pytest and FFmpeg). It is not a distributed, production-hardened SaaS. Social publishing is **not** connected: `/api/calendar` is an authenticated, persistent content planner and `/api/calendar.ics` exports reminders for manual posting. No fabricated published events or metrics.

## Hosting architecture

One continuously running Docker container and one **persistent mounted volume** at `/data` are required. All SQLite users, projects, and uploads live there. Do not deploy this exact stack to an ephemeral serverless filesystem, including Vercel Functions. A single Railway service with a volume, a VM, or an ARM Always Free VM can host a small beta.

### Railway (managed, minimal setup)

1. Create a **new, independent GitHub repository**, e.g. `barberflow-ai`. Do **not** upload `.env`, `/media/`, or secrets. Use only the files in this release.
2. In Railway, **New Project → Deploy from GitHub**; select the new repository. The `Dockerfile` builds a Python 3.12, FFmpeg, and OpenCV image.
3. Add a **persistent Railway Volume** mounted at `/data`, before inviting users.
4. Add variables (through Railway's protected UI):

   - `APP_ENV=production`
   - `SECRET_KEY`: fresh unique random secret, **at least 32 characters**. Generate privately on your own device: `python -c 'import secrets;print(secrets.token_urlsafe(48))'`.
   - `BF_DATA_DIR=/data`
   - `BF_OUTPUT_WIDTH=720`
   - `BF_OUTPUT_HEIGHT=1280`
   - `BF_WORKERS=1`
   - `BF_MAX_UPLOAD_MB=100`
   - `BF_MAX_SALON_STORAGE_MB=1000`
   - `BF_MAX_ACTIVE_PER_SALON=1`

5. Generate a Railway public domain, then check `https://your-domain/api/ready` gives `{"ready": true, ...}`.
6. Create a test salon (using no real customer footage), render a video, download and inspect the MP4, restart the deployment, and confirm that the project and video remain available after restart.
7. Restrict trial registrations and put a WAF/rate limiting and mail verification layer in front before an open commercial launch.

**Capacity warning:** Railway Free has a small monthly credit, 0.5 GB RAM and limited storage. FFmpeg/OpenCV renders may exceed it. A reliable video processing service may require a paid tier or a self-managed machine. Creating a project in Railway doesn't make video processing free forever.

### Always Free VM (self-managed alternative)

Oracle Cloud publishes an Always Free ARM allowance, subject to region capacity and other conditions. This route requires an Oracle account, SSH configuration, managed VM maintenance, and a reachable HTTPS domain. After provisioning an eligible ARM VM, install Docker Compose and deploy the `compose.yaml` service with a durable disk; terminate TLS with Caddy or another reverse proxy. **Do not publicly expose the app over HTTP**, and test offsite backups before accepting actual client videos.

### Environment and protections

- The Docker image runs a single Uvicorn process; changing to multiple replicas without PostgreSQL/object storage and a durable queue is unsafe.
- Account session cookies are HttpOnly, Secure in production, and SameSite=Lax. Mutating requests enforce same-origin when an Origin header is present.
- Authentication is rate-limited **per IP in process**; use an edge WAF/Redis limiter for multi-instance scale.
- Per-salon project, storage and active-processing quotas protect shared resources but cannot replace infrastructure-level CPU/memory quotas.
- Users can export account metadata and erase their account/files from Settings; on-disk backup copies need separate retention and deletion rules.
- Backup `/data` offsite at least daily, run restore tests, and monitor disk space, database integrity, errors and CPU.
- The data directory contains customer face/video material and must be encrypted and access-restricted. Provide a lawful basis and customer consent, retention/deletion policy, DPA and GDPR records before selling in the EU.
- Any music added must be licensed for commercial and social distribution.

### Acceptance checklist

- [x] Real MP4 rendering with FFmpeg, test fixtures and downloadable video
- [x] Separate salon authorization, no cross-salon preview access
- [x] Calendar records, ICS export, manual posting state
- [x] Length choice (15/24/30/45), ordered clip uploads and branded reveal
- [x] Login rate limit, storage/processing quotas, account export/delete
- [x] App health and readiness check
- [ ] Production host/domain + live HTTP smoke test
- [ ] Persisted data + restart test on host
- [ ] Approved Instagram, TikTok, YouTube OAuth and publish API workflows
- [ ] Multi-worker durable queue, remote object storage, email verification/password reset
- [ ] End-to-end GDPR operational compliance, backups and disaster recovery

## Tests

```bash
pip install -r requirements.txt pytest httpx
pytest -q
node --check app/static/app.js
```
