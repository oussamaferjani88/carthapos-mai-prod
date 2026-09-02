# CarthaPos — Render Deployment Guide (Demo)

This guide walks you through deploying the full CarthaPos stack on **Render**:

- **3 Postgres databases** (app / warehouse / Metabase)
- **Backend API** (Docker) — license management, POS generation, BI, Metabase proxy
- **Admin panel** (Static)
- **Public website** (Static)
- **Metabase** (Docker) — BI dashboards

The deployment is configured in `render.yaml` for **Blueprint** (one-click), but you can also follow the manual steps below. The manual steps are recommended so you can fill in the secrets one by one.

---

## 0. Prerequisites

Before you start, have ready:

| Item | Where to get it |
|---|---|
| GitHub repository with the CarthaPos code | Push the repo that contains `render.yaml`, `backend/Dockerfile`, `metabase/Dockerfile` |
| License **private key** | Contents of `backend/config/license-private.pem` (a single-line PEM, base64) |
| License **public key** | From your `backend/.env` — the value of `LICENSE_PUBLIC_KEY` (PEM inline) |
| A **GitHub token** with `repo` + `workflow` scopes | GitHub → Settings → Developer settings → Personal access tokens |
| GitHub **owner + repo** | e.g. `yourname/carthapos` |

> **Security note:** `backend/config/license-private.pem` is gitignored and will NOT be pushed. You must paste it into Render manually. Same for `backend/.env`.

---

## 1. Push to GitHub

```bash
cd D:/Carthapos
git add -A
git commit -m "Prepare for Render deployment"
git remote add origin https://github.com/<your-user>/<your-repo>.git   # if not already added
git push -u origin main
```

> The 406MB `metabase.jar` is gitignored and **downloaded by the Docker build**, so you don't push it.

---

## 2. Create the 3 Databases (Render)

In Render dashboard → **New → PostgreSQL**:

### Database 1 — App
- **Name:** `carthapos-db`
- **Database:** `pos_system`
- **Plan:** Starter (free is fine for a demo)
- **User / password:** leave auto-generated (or set your own)

### Database 2 — Warehouse (BI)
- **Name:** `carthapos-warehouse-db`
- **Database:** `pos_system_warehouse`
- **Plan:** Starter

### Database 3 — Metabase's own DB
- **Name:** `carthapos-metabase-db`
- **Database:** `metabase`
- **Plan:** Starter

Keep all three. Note — later you'll need each database's **Internal Connection String** (click into each database, copy the value labeled *Internal Database URL*). The internal URL is used by services on the same network.

---

## 3. Create the Backend Service (Docker)

Render dashboard → **New → Web Service** → **Build and deploy from a Git repository** → select your repo.

Set:

- **Name:** `carthapos-backend`
- **Runtime:** Docker
- **Root Directory:** (leave as repo root `.` — the Dockerfile path below points into `backend/`)
- **Dockerfile Path:** `backend/Dockerfile`
- **Plan:** Starter
- **Health Check Path:** `/api/health`
- **Environment:**
  - `NODE_ENV` = `production`
  - `PORT` = `10000`
  - `DATABASE_URL` = (Internal connection string of **carthapos-db**)
  - `WAREHOUSE_DATABASE_URL` = (Internal connection string of **carthapos-warehouse-db**)
  - `LICENSE_PRIVATE_KEY` = (paste the contents of `license-private.pem`)
  - `LICENSE_PUBLIC_KEY` = (paste the contents of `LICENSE_PUBLIC_KEY` from your `.env`)
  - `JWT_SECRET` = (any long random string)
  - `ENCRYPTION_KEY` = (any long random string)
  - `AUTH_REQUIRED` = `false`
  - `CORS_ORIGINS` = `https://carthapos-admin.onrender.com,https://carthapos.onrender.com`
  - `FRONTEND_URL` = `https://carthapos.onrender.com`
  - `ADMIN_URL` = `https://carthapos-admin.onrender.com`
  - `METABASE_BASE_URL` = `https://carthapos-metabase.onrender.com`
  - `METABASE_PUBLIC_URL` = `https://carthapos-metabase.onrender.com`
  - `METABASE_EMBED_ENABLED` = `true`
  - `METABASE_USER` = (pick a username, e.g. `admin` — this becomes the Metabase admin)
  - `METABASE_PASSWORD` = (pick a password)
  - `GITHUB_TOKEN` = (your GitHub PAT)
  - `GITHUB_OWNER` = (your GitHub username)
  - `GITHUB_REPO` = (your repo name)
  - `GENERATED_POS_PATH` = `/app/generated-pos`
  - `NODE_OPTIONS` = `--max-old-space-size=450`

> **Important:** The URL names (`carthapos-admin.onrender.com`, etc.) are the *defaults*. If Render assigns you a different subdomain, update `CORS_ORIGINS`, `FRONTEND_URL`, `ADMIN_URL`, `METABASE_BASE_URL`, `METABASE_PUBLIC_URL` to match your *actual* URLs. CORS must include the exact admin and frontend origins or the UI will be blocked.

**Deploy.** The build will:
1. `npm install` backend deps
2. `npm install` pos-template production deps
3. run `npx prisma generate` (app schema)
4. run `npx prisma generate --schema=prisma-warehouse/schema.prisma` (warehouse)
5. On start: `prisma migrate deploy` (app DB) → `prisma db push --schema=prisma-warehouse/schema.prisma` (warehouse DB) → `node server.js`

Once green, open `https://carthapos-backend.onrender.com/api/health` → should return `{"status":"OK",...}`.

---

## 4. Create the Public Website (Static)

Render → **New → Static Site** → select repo.

- **Name:** `carthapos-frontend`
- **Root Directory:** `frontend`
- **Build Command:** `npm i -g pnpm && pnpm install && pnpm run build`
- **Publish Directory:** `dist`
- **Environment variable:**
  - `VITE_API_URL` = `https://carthapos-backend.onrender.com/api`

> Since it's a SPA, enable **"Automatically deploy on push"** to `main`. For client-side routing, add a `_redirects` or rewrites rule if needed (Render Static Sites serve `index.html` at `/`).

---

## 5. Create the Admin Panel (Static)

Render → **New → Static Site** → select repo.

- **Name:** `carthapos-admin`
- **Root Directory:** `admin`
- **Build Command:** `npm i -g pnpm && pnpm install && pnpm run build`
- **Publish Directory:** `dist`
- **Environment variable:**
  - `VITE_API_URL` = `https://carthapos-backend.onrender.com/api`

---

## 6. Create Metabase (Docker)

Render → **New → Web Service** → select repo.

- **Name:** `carthapos-metabase`
- **Runtime:** Docker
- **Root Directory:** (repo root `.`)
- **Dockerfile Path:** `metabase/Dockerfile`
- **Plan:** Starter
- **Environment:**
  - `MB_DB_TYPE` = `postgres`
  - `MB_DB_DBNAME` = `metabase`
  - `MB_DB_HOST` = (host of **carthapos-metabase-db**)
  - `MB_DB_PORT` = (port of **carthapos-metabase-db**, usually 5432)
  - `MB_DB_USER` = (user of **carthapos-metabase-db**)
  - `MB_DB_PASS` = (password of **carthapos-metabase-db**)
  - `MB_PORT` = `3000`
  - `MB_EMBEDDING_SECRET` = (optional; only needed if you use signed embedding instead of public links)

The Dockerfile downloads `metabase.jar` (v52 OSS) at build time.

> **Health:** Metabase's own health endpoint is `/api/health`, but its root `/` is the app. Leave the health check empty/`/` if needed.

---

## 7. Post-deploy setup in Metabase

1. Open `https://carthapos-metabase.onrender.com`
2. Complete the **first-run setup** (admin email, name, password). Use the same `METABASE_USER`/`METABASE_PASSWORD` you set on the backend so the backend API can log in.
3. **Add a database:**
   - Click the gear (top-right) → **Admin settings → Databases → Add a database**
   - Choose **PostgreSQL**
   - **Name:** `POS Warehouse` (must match what the backend expects)
   - **Host / Port / Database name / User / Password:** from **carthapos-warehouse-db** (the warehouse DB)
   - Save — Metabase will sync the `dim_*` / `fact_*` tables.

> **Why:** Your BI dashboards query the warehouse DB. Metabase must be connected to `pos_system_warehouse` to render any charts.

---

## 8. Rebuild your BI template in the hosted Metabase

The free OSS Metabase does not support content export/import, so you recreate the restaurant **master** dashboard once:

1. In Metabase, build your **"Restaurant Executive Dashboard Template"** (the 18 cards: revenue, orders, avg order value, customers, sales trend, by hour/day/category/payment, top products, product mix, inventory value, kitchen load).
2. Note the dashboard's **ID** (from the URL: `/dashboard/<ID>-restaurant-...`).
3. In the **CarthaPos admin** → **BI dashboard templates**, edit the **restaurant** template and set its **Metabase dashboard ID** to the new dashboard ID.

> The per-client **deep-copy** (`{clientName}_{businessType}_{businessName}` collection, tenant-filtered cards) is handled automatically by the backend when you provision/generate a dashboard for a client on the deployed instance. You only ever rebuild the **master** once.

---

## 9. Verify end-to-end

- [ ] `https://carthapos-backend.onrender.com/api/health` → `OK`
- [ ] `https://carthapos.onrender.com` → public site loads
- [ ] `https://carthapos-admin.onrender.com` → admin login loads
- [ ] Metabase → can see `pos_system_warehouse` tables and your dashboard renders with data
- [ ] Admin → create a license → generate POS (source) → the GitHub Actions workflow kicks off and produces the `.exe` installer artifact
- [ ] Admin → BI → provision a client dashboard → Metabase creates `{client}_...` collection with tenant-filtered copy

---

## Secrets checklist (paste into Render, never in git)

| Env var | Value |
|---|---|
| `LICENSE_PRIVATE_KEY` | contents of `backend/config/license-private.pem` |
| `LICENSE_PUBLIC_KEY` | `LICENSE_PUBLIC_KEY` from `backend/.env` |
| `METABASE_USER` + `METABASE_PASSWORD` | the Metabase admin login you'll create |
| `GITHUB_TOKEN` | PAT with `repo` + `workflow` |
| `GITHUB_OWNER` / `GITHUB_REPO` | your GitHub username / repo |

---

## Troubleshooting

- **Backend fails to start** → check the license keys are set (`LICENSE_PRIVATE_KEY` / `LICENSE_PUBLIC_KEY`). They are required once you start generating/validating licenses.
- **CORS / blocked requests in admin** → `CORS_ORIGINS` must exactly match your `https://...onrender.com` admin + frontend URLs.
- **Metabase shows no data** → the warehouse DB is not connected, or the ETL hasn't run. Connect `pos_system_warehouse` in Metabase, then run an ETL upload from the admin.
- **Metabase dashboard blank** → the master dashboard ID on the `BiDashboardTemplate` is wrong, or the templated cards reference tables/fields not in the hosted Metabase (re-recreate the master on the hosted instance).
- **POST /api/pos/generate fails** → `GITHUB_TOKEN` needs `workflow` scope, and the repo must have `.github/workflows/build-pos.yml`.
