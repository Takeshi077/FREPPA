# FREE Deployment Guide — Render + TiDB Cloud

Deploy FREPPA at **$0** using:
- **[Render](https://render.com)** — free Node.js web service (Docker), no credit card
- **[TiDB Cloud](https://tidbcloud.com)** — free MySQL-compatible serverless database, no credit card

Trade-offs: Render's free tier spins the app down after 15 min of no traffic (it wakes up automatically, ~30s cold start). The free DB has 5 GB storage.

---

## Step 1 — Create the TiDB Cloud database (free)

1. Sign up at https://tidbcloud.com (email signup, no credit card).
2. Click **Create Cluster** → choose **Serverless Tier** (always free) → pick any region → **Create**.
3. While it starts, go to **SQL Editor / Create Password** and create a **root password** (save it).
4. Once the cluster is **Up**, click **Connect** → you get:
   - **Host**, e.g. `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
   - **Port**: `4000`
   - **User**: something like `3xKpxxxxxxxx.root`
5. Click **Create Database**, name it `freppa_school`.

## Step 2 — Initialize the database (schema + demo data)

From this folder, create a temporary file `.env.remote` (do NOT commit it) or just set the vars, then run:

```
$env:DB_HOST="<YOUR_TIDB_HOST>"; $env:DB_PORT="4000"; $env:DB_USER="<YOUR_TIDB_USER>"; $env:DB_PASSWORD="<YOUR_TIDB_PASSWORD>"; $env:DB_NAME="freppa_school"; $env:DB_SSL="true"
cd backend
npm run init-db
```

When it finishes you'll see the demo logins (all passwords: `password123`):
| Role    | Email                       |
|---------|-----------------------------|
| Admin   | admin@freppa.edu            |
| Teacher | emily.brown@freppa.edu      |
| Student | student1@freppa.edu         |
| Parent  | parent1@freppa.edu          |

> Works for any MySQL host — just omit the `DB_SSL=true` for a plain local DB.

## Step 3 — Push to GitHub

Render needs a GitHub repo. The repo already has `Dockerfile`, `render.yaml`, `.dockerignore`.

1. Commit the staged changes (`.env` and `backend/node_modules` were removed from tracking — they must not be uploaded):
   ```
   git add -A
   git commit -m "Add Render/TiDB deployment setup; untrack .env and node_modules"
   ```
2. Push to GitHub, then connect your repo to Render:
   - https://dashboard.render.com → **New +** → **Blueprint**
   - Pick the repo. Render reads `render.yaml` and creates a service named `freppa` (free plan / Docker).
3. Render will ask you to fill the **secrets** it listed:
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — from Step 1
   - `JWT_SECRET` — a long random string
   - `SMTP_*`, `CONTACT_EMAIL` — optional (contact form only)
   - `DB_PORT` = `4000`, `DB_SSL` = `true` are already set.

## Step 4 — Deploy

Click **Apply**. Render builds the Docker image (downloads Chromium for PDF report cards) and deploys to `<service-name>.onrender.com`.

- Site: `https://freppa.onrender.com`
- Health check: `https://freppa.onrender.com/api/health`

---

## Notes

- **Cold starts**: free instances sleep after 15 min idle. First request takes ~30s. Add a [UptimeRobot](https://uptimerobot.com) ping to keep it awake if you want.
- **PDF report cards** need Chromium — included in the Docker image.
- **Uploaded files** live in RAM/disk and reset on redeploy (multer temp files only).
- **Local dev is unaffected**: your `.env` still points to your local MySQL, and `backend/config/db.js` still supports `DATABASE_URL` (Railway-style).

## Troubleshooting

- `DB connection failed` in logs → check host/port/user/password/name, confirm `DB_SSL=true`.
- Build failure on `ui` → network issues installing Chromium; just retry the deploy.
- To re-run the schema (wipes nothing if not run before), execute Step 2 again.