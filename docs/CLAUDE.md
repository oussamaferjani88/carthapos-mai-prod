# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

CarthaPos is a system for generating **customized, license-locked Electron POS (point-of-sale) desktop apps** for clients (restaurants, cafés, retail, pharmacies, etc.), plus the admin backend that manages clients/licenses/modules and a Metabase-backed BI/analytics layer bolted on top of the POS data.

Four independently-deployed projects live in this monorepo:

| Dir | What it is | Stack |
|---|---|---|
| `backend/` | Single API server for everything: client/license CRUD, POS generation orchestration, USB license verification, and the BI/analytics/ETL subsystem | Node/Express + Prisma + PostgreSQL |
| `admin/` | Internal staff panel — create clients, configure & generate POS builds, manage licenses/users/BI dashboards | React + Vite + Radix/shadcn (pnpm) |
| `pos-template/` | The **blueprint** Electron app that gets copied per-client and customized (theme, modules, license) to produce a generated POS | Electron + React + SQLite (pnpm) |
| `frontend/` | Public marketing site (Lovable-generated) — landing page / register / login. Unrelated to the POS generation flow | React + Vite + TS (bun/npm) |

`scripts/` holds standalone CLI tooling (license generation/verification, an older manual `build-pos.js`). `generated-pos/` is the gitignored scratch output of a POS build for one client; it is never committed.

Render deployment topology (see [render.yaml](render.yaml)): `carthapos-backend` (Docker), `carthapos-frontend` (static), `carthapos-admin` (static), one shared Postgres (`carthapos-db`).

## Commands

Root `Makefile` wraps the common per-project commands (run from repo root):

```bash
make install         # npm/pnpm install in backend, admin, pos-template, scripts
make dev-backend      # backend: nodemon server.js  (port 3001)
make dev-admin        # admin: vite dev              (port 5173)
make dev-pos           # pos-template: vite + electron together (electron-dev)
make build-admin       # admin production build
make build-pos-template
make setup-db          # prisma migrate dev + db seed (backend)
make generate-license  # writes examples/license-template.json
make test-license      # generate → verify a test license end-to-end
```

Per-project (when you need something the Makefile doesn't cover), from inside `backend/`, `admin/`, `frontend/`, or `pos-template/`:

```bash
npm run dev        # or pnpm run dev — backend uses npm, admin/frontend/pos-template use pnpm
npm run build
npm run lint        # eslint — admin, frontend, pos-template only; backend has no lint script
```

Backend-specific (`backend/`):
```bash
npx prisma generate                                   # regen client from prisma/schema.prisma
npx prisma generate --schema=prisma-warehouse/schema.prisma   # separate BI warehouse schema
npx prisma migrate dev --name <name>
npx prisma studio
node scripts/create-admin.js          # bootstrap an admin User
node scripts/seed-permissions.js      # seed Permission rows from utils/permissionCatalog.js
npm run start:v2 / dev:v2             # server-v2.js — the newer layered-architecture server (see Architecture)
```

Generating a POS app manually via CLI (bypassing the admin UI):
```bash
cd scripts
node generate-license.js template ../examples/license-template.json
node build-pos.js <config.json> <output-dir>
```
In practice, generation normally happens through the admin UI → `backend/routes/pos.js` → `backend/utils/generators/*`, not this script (see Architecture below).

**Tests:** `jest.config.js` at the repo root defines a Jest setup (`tests/unit/*.test.js`, 80% coverage thresholds, `tests/setup.js`). There is currently no root `node_modules` and no `jest` binary installed anywhere in the repo — running tests requires installing Jest (and `babel-jest`) first; don't assume `npm test` works out of the box. Existing unit tests cover POS generator pieces: `BuildSystemManager`, `FilePatcher`, `PackageConfigManager`, `TailwindConfigManager`, `Logger`.

## Architecture

### POS generation pipeline (the core product flow)

1. Admin configures a client + theme + module selection in `admin/` (`admin/src/pages/pos/POSGeneratorPage.jsx`, orchestrated by `admin/src/hooks/usePOSGenerator.js`).
2. Admin calls `POST /api/pos/generate` → `backend/routes/pos.js` → `backend/utils/pos-generator.js` → `backend/utils/generators/index.js`, which runs, in order: `AssetManager` (copy `pos-template/` → `generated-pos/pos-<name>-<key>/`), `ProjectBuilder`, `DependencyManager` (npm install), `ThemeCustomizer` (apply colors/branding), `FilePatcher` (write `public/app-config.json` with license key etc.), `BuildSystemManager` (currently disabled locally — Wine issues on Render).
3. The actual Windows `.exe` build happens on GitHub Actions (`.github/workflows/build-pos.yml`, `workflow_dispatch`), triggered from the backend via `backend/utils/githubActionsService.js`. The built installer artifact is downloaded back and served to the admin.
4. License files are separately generated/encrypted (AES + HMAC-SHA256 signature + SHA-256 checksum — see `scripts/generate-license.js` and `backend/src/services/license/`) and paired with USB-based verification at runtime inside the generated POS (`pos-template/src/electron/license/`, `backend/routes/usb.js`).

`generated-pos/` and `pos-template/dist|release` are build scratch space — gitignored, don't hand-edit generated output; change `pos-template/` (the blueprint) or the generator scripts instead.

### Backend: two coexisting architectures

`backend/server.js` (run by `npm start`/`npm run dev`, the actual entry point despite being called "legacy" in `backend/ARCHITECTURE.md`) mounts routes from **both** the flat legacy tree (`backend/routes/*.js`, `backend/middleware/*.js`, `backend/utils/*.js`) and the newer layered tree under `backend/src/` (`controllers/` → `services/` → `repositories/` → Prisma, with `validators/` using Joi) — e.g. `licenseRoutes` is already pulled from `src/routes/licenses.js`, not the old `routes/licenses.js` (which has been removed). `backend/server-v2.js` is a parallel, fully-layered server exposing the same endpoints under `/api/v1/*`; it is not the one deployed by default. When adding a new backend feature, prefer the `src/{controllers,services,repositories,validators,routes}/` pattern described in `backend/ARCHITECTURE.md` over adding to the flat `routes/`/`utils/` tree, but check whether the feature already has flat-tree code to extend consistently.

### Auth

JWT-based, `backend/middleware/auth.js`. Token comes from either an `Authorization: Bearer` header or an HttpOnly session cookie (`pos_admin`, set via `setAuthCookie`/`clearAuthCookie`). `verifyToken` (hard-require), `optionalAuth` (attach `req.user` if present, never block — used on all `/api/bi/*` routes), `adminAuth`/`requireRole` (role gate, `ADMIN_ROLES = ['SUPER_ADMIN','ADMIN']`). Whether `/api/*` is globally protected is controlled by `AUTH_REQUIRED` env var (defaults **off** — dev behavior unchanged until the client portal ships full JWT login); `/api/users` and `/api/auth` are always public (login lives there). CORS is credentials-aware with an explicit origin allowlist (`CORS_ORIGINS` env) plus any `localhost`/`127.0.0.1` origin.

### Permissions

Two parallel permission definitions that must be kept in sync when adding a permission: `admin/src/utils/permissions.js` (`PERMISSIONS` constants + `PermissionManager`, also defines `ADMIN_ROUTE_PERMISSIONS` used for client-side route gating) and `backend/utils/permissionCatalog.js` + `backend/middleware/permissions.js` (server-side enforcement) + the `Permission`/`UserPermission` Prisma models (seeded via `scripts/seed-permissions.js`).

### Database

One Prisma schema (`backend/prisma/schema.prisma`, ~30 models) backs everything in one Postgres instance: admin/SaaS-side models (`Client`, `License`, `LicenseModule`, `LicenseConfiguration`, `Module`, `User`, `Permission`), generated-POS-runtime models (`Product`, `Order`, `OrderItem`, `Customer`, `Table`, `GiftCard`, `LoyaltyTransaction`, `Appointment`), and the BI subsystem (`BiDashboard`, `BiDashboardTemplate`, `BiRequest`, `BiUpload`, `BiProcessingJob`, `BiNotification`, etc.). There is a **second, separate** Prisma schema at `backend/prisma-warehouse/schema.prisma` for the BI data warehouse (generate it explicitly with `db:generate:warehouse`) — don't confuse the two when touching BI code.

### BI / analytics subsystem

A large fraction of `backend/routes/bi-*.js` and `backend/services/*` (`etl-pipeline.js`, `warehouse-service.js`, `data-preparation-service.js`, `bi-model-registry.js`, `bi-schema-registry.js`, `metabase-client.js`) implements an ETL + data-warehouse + Metabase-embedding layer on top of POS sales data, separate from the core license/POS-generation flow. `metabase/` at the repo root holds Metabase config/assets for this. Treat it as its own subsystem when navigating — it doesn't touch `pos-template/` or license generation.

### Package managers differ per project

`backend/` and `scripts/` use npm. `admin/`, `frontend/`, and `pos-template/` use pnpm (see `packageManager` field in their `package.json`s and the Makefile); `frontend/` also has a stray `bun.lockb`. Don't mix lockfiles across a project.

## Working in this repo

- The repo root and `docs/` are littered with hundreds of one-off `*_AUDIT.txt`, `*_REPORT.md`, `FIX_*.md` etc. files from prior work sessions. These are historical/point-in-time notes, not maintained documentation — verify against actual code before trusting anything they claim about current behavior.
- `pos-template/` is a *template*: changes there affect every future POS generation, not a single client. `generated-pos/*` is per-client output and disposable.
- The repo also contains an unrelated academic thesis/report (`docs/`, `figures_description_ch*.txt`, the LaTeX template dir, `hr_report_text.txt`, the HR-system PDF) — not part of the CarthaPos application; ignore unless the task explicitly concerns it.
