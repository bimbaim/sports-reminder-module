# Scheduler Setup Guide

This document explains how to configure scheduled execution of the
`/api/cron/sync-matches` endpoint on any hosting platform.

---

## How It Works

The endpoint is a plain HTTP `GET` route. Any scheduler that can make an HTTP
request on a schedule can trigger it — no platform-specific code is required.

**Endpoint:**
```
GET https://<your-domain>/api/cron/sync-matches
```

**Required header (when `CRON_SECRET` is configured):**
```
x-cron-secret: <your-secret>
```

---

## Security — CRON_SECRET

Add the following variable to your deployment environment:

```env
CRON_SECRET=replace_with_secure_random_string
```

Generate a strong secret:
```bash
# Linux / macOS / WSL
openssl rand -hex 32

# Node.js (any platform)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Local development:** If `CRON_SECRET` is not set, the endpoint runs
> without protection and logs a warning. This is intentional so you can test
> locally without any extra setup.

---

## Generic Scheduler — curl

Use this template for any scheduler that supports shell commands:

```bash
curl -X GET \
  https://<your-domain>/api/cron/sync-matches \
  -H "x-cron-secret: YOUR_SECRET" \
  --fail \
  --silent \
  --show-error
```

Expected success response (`HTTP 200`):
```json
{ "success": true, "message": "Processed N notifications for M subscribers." }
```

Expected unauthorized response (`HTTP 401`):
```json
{ "error": "Unauthorized" }
```

---

## Railway

Railway does not have a native HTTP cron feature but can run a scheduled
command inside a service or a separate cron service.

**Option A — Cron Service (recommended)**

1. Add a new **service** in your Railway project.
2. Set the **start command** to:
   ```bash
   curl -X GET "$APP_URL/api/cron/sync-matches" \
     -H "x-cron-secret: $CRON_SECRET" \
     --fail
   ```
3. Set the **restart policy** to `on-schedule` and choose your interval (e.g. every hour).
4. Set the environment variables `APP_URL` and `CRON_SECRET` in the Railway
   service settings.

**Option B — Cron plugin / Nixpacks cron**

Add a `crontab` file to your repo:
```cron
0 * * * * curl -X GET "$APP_URL/api/cron/sync-matches" -H "x-cron-secret: $CRON_SECRET" --fail
```

Reference it in your `railway.json` or Nixpacks configuration.

---

## EasyCron

1. Log in to [EasyCron](https://www.easycron.com).
2. Click **Add Cron Job**.
3. **URL:** `https://<your-domain>/api/cron/sync-matches`
4. **Method:** `GET`
5. **HTTP Headers:**
   ```
   x-cron-secret: YOUR_SECRET
   ```
6. Set your schedule (e.g. `0 8 * * *` for 08:00 UTC daily).
7. Save and verify the test run returns `200 OK`.

---

## GitHub Actions

Create `.github/workflows/sync-matches.yml`:

```yaml
name: Sync Matches

on:
  schedule:
    # Runs every day at 08:00 UTC
    - cron: "0 8 * * *"
  workflow_dispatch: # allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger sync-matches endpoint
        run: |
          curl -X GET "${{ vars.APP_URL }}/api/cron/sync-matches" \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            --fail \
            --silent \
            --show-error
```

**Required GitHub configuration:**
| Type | Name | Value |
|------|------|-------|
| Variable (`vars`) | `APP_URL` | `https://your-domain.com` |
| Secret (`secrets`) | `CRON_SECRET` | Your secret string |

Set these under **Settings → Secrets and variables → Actions**.

---

## Linux Crontab (VPS / Docker)

SSH into your server and run `crontab -e`, then add:

```cron
# Every day at 08:00 UTC
0 8 * * * curl -X GET "https://<your-domain>/api/cron/sync-matches" -H "x-cron-secret: YOUR_SECRET" --fail --silent >> /var/log/sync-matches.log 2>&1
```

Or store the secret in a local env file and source it:

```cron
0 8 * * * /bin/bash -c 'source /etc/sports-reminder/cron.env && curl -X GET "$APP_URL/api/cron/sync-matches" -H "x-cron-secret: $CRON_SECRET" --fail --silent'
```

---

## Docker Scheduled Jobs

**docker-compose.yml** — using `ofelia` (Docker job scheduler):

```yaml
services:
  ofelia:
    image: mcuadros/ofelia:latest
    command: daemon --docker
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - app

  app:
    image: your-sports-reminder-image
    labels:
      ofelia.enabled: "true"
      ofelia.job-exec.sync-matches.schedule: "@every 1h"
      ofelia.job-exec.sync-matches.command: >
        curl -X GET "http://localhost:3000/api/cron/sync-matches"
        -H "x-cron-secret: ${CRON_SECRET}"
        --fail --silent
    environment:
      - CRON_SECRET=${CRON_SECRET}
```

---

## UptimeRobot

UptimeRobot can act as a lightweight HTTP cron by polling on a schedule.

1. Create a new **HTTP(s)** monitor.
2. **URL:** `https://<your-domain>/api/cron/sync-matches`
3. **Monitoring interval:** choose your desired frequency (minimum 5 minutes on
   the free plan).
4. **Custom HTTP Headers:**
   ```
   x-cron-secret: YOUR_SECRET
   ```
5. Set **Expected HTTP status code** to `200`.
6. Optionally enable alert contacts for failure notifications.

> **Note:** UptimeRobot free tier polls every 5 minutes minimum. For hourly or
> daily schedules you should use GitHub Actions, EasyCron, or a VPS cron
> instead, as UptimeRobot will hit the endpoint too frequently.

---

## Future Queue Workers

If you later introduce a queue system (e.g. pg-boss, Inngest, Trigger.dev),
the route can be replaced by a background job that calls the same business
logic. The authentication guard (`CRON_SECRET`) can be reused as a shared
secret between the job runner and the application, or removed entirely if the
job runner is internal.

No code changes are required in the rest of the application — keep the HTTP
endpoint as a fallback trigger for simplicity.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `401 Unauthorized` | Wrong or missing `x-cron-secret` header | Double-check the header name and value match `CRON_SECRET` exactly |
| `302 Redirect` to `/` | Middleware is intercepting the request | Ensure you are running the latest `proxy.ts` which whitelists `/api/cron` |
| `500 Internal Server Error` | Supabase or WhatsApp config missing | Check server logs and verify all `SPORTS_REMINDER_*` env vars are set |
| Warning in logs: "Scheduler protection disabled" | `CRON_SECRET` env var not set | Set `CRON_SECRET` in your deployment environment |
