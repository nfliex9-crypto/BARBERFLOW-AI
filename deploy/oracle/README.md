# BARBERFLOW AI — Oracle Always Free deployment

**Status:** prepared for deployment, **not** an online service yet. Oracle account creation, VM provisioning, DNS, and SSH must be completed by the account owner. Never share card information, SSH private keys, or passwords.

## 1. Provision a free Oracle VM

1. Register at https://signup.oraclecloud.com/. Oracle generally requires a phone and payment card for identity verification, but there is no charge unless you upgrade/use paid services. Do **not** select Pay As You Go.
2. Choose the **home region** carefully: Always Free instances must run there, and Arm capacity is not guaranteed.
3. Create an Ubuntu 24.04 **Arm64** Compute instance using **VM.Standard.A1.Flex**. The 2026 Always Free allowance is **2 OCPUs and 12GB RAM total** (Oracle reduced the older 4 OCPU / 24GB limit). Choose only the shape explicitly marked **Always Free eligible**.
4. Set up an SSH key pair and retain its private key locally. Configure a public IPv4 IP, a network security group or security list allowing inbound **TCP 80 and 443** to the VM. Limit inbound **TCP 22** to your own address if possible. Never open port 8000.
5. Ensure the boot/block volume is marked free-eligible and has space for original and output video files.
6. Note that Oracle may reclaim idle Always Free instances. There is no guaranteed VM capacity or business-grade uptime on Free Tier.

Official free-tier documentation:
https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

## 2. DNS and HTTPS

Set an **A DNS record** for a hostname you control, pointing at the instance public IP; a free DNS name from a provider such as DuckDNS may work if available. Caddy obtains/renews public TLS certificates only if the domain resolves and both HTTP/HTTPS reach the VM. Wait for DNS propagation before running the smoke test.

## 3. Install and start

SSH into the VM with your own SSH key. Once connected:

```bash
sudo apt-get update && sudo apt-get install -y git
git clone --branch Bot https://github.com/nfliex9-crypto/BARBERFLOW-AI.git
cd BARBERFLOW-AI
sudo bash deploy/oracle/install-docker-ubuntu.sh
cd deploy/oracle
sudo BARBERFLOW_DOMAIN=barber.yourdomain.com bash bootstrap.sh
```

Change `barber.yourdomain.com` to **your actual hostname**. On first run, `bootstrap.sh` generates a random 48-byte-class secret saved to `deploy/oracle/.env` with file permissions 0600, builds the FFmpeg Docker container, starts a persistent Caddy HTTPS proxy, and creates permanent Docker named volumes. **Never commit or disclose .env.**

Check from your device:

```bash
curl -fsS https://barber.yourdomain.com/api/ready
```

And on the VM, in `deploy/oracle`:

```bash
sudo docker compose --env-file .env -f compose.yaml ps
sudo docker compose --env-file .env -f compose.yaml logs --tail=80 app caddy
```

## 4. Validate real editing

Create a *test* salon account over HTTPS, upload a **short sample clip**, render an MP4, download it, and confirm the file plays. Restart via `sudo docker compose --env-file .env -f compose.yaml restart`, log back in, and verify all projects/videos still exist. This single-instance beta uses 720×1280 output, 1 FFmpeg worker, up to 150 MB per file, 20 min total footage and a 2 GB media quota per salon to limit free-server load.

### Updating the deployed app

From the repository root, inspect updates and run `git pull --ff-only origin Bot`; then from `deploy/oracle` run `sudo docker compose --env-file .env -f compose.yaml up --build -d`. Do not deploy random unreviewed code with secrets.

### Backups and data safety

All SQLite data, accounts and footage live in Docker's `barberflow_salon_media` persistent named volume. The Caddy certificates live in `barberflow_caddy_data`. **Never run `docker compose down -v`** or delete these volumes. Schedule consistent offline snapshots and encrypted **offsite** backups, test restoration, and establish GDPR retention/erasure controls before collecting customer videos. Backups are **not yet automated**.

### Before opening public paid access

The current app is a **beta**, not a fully secured multi-customer commercial SaaS. There is currently no social account OAuth/posting, email verification/password reset, durable distributed worker queue, offsite backup automation, or complete customer-consent registry. Keep the audience small and use non-sensitive footage until these are implemented and verified. If you make the GitHub repo Private later, configure read access on the VM appropriately.

Docker installation guidance: https://docs.docker.com/engine/install/ubuntu/
Caddy HTTPS guidance: https://caddyserver.com/docs/automatic-https
