# CARTHAPOS — FULL PRODUCT READINESS AUDIT
### Client Workflow + BI Workflow

**Date:** 2026-08-05
**Type:** Strict READ-ONLY audit. No code was modified.
**Scope:** Complete SaaS journey — account creation → login → POS generation → daily use → BI export → upload → admin review → ETL → dashboard generation → delivery to client.

---

## 0. Executive Summary

CarthaPOS is **not production-ready** as a SaaS platform today. It is best described as a **working ETL/BI engine surrounded by non-functional SaaS plumbing**.

- The **BI Import / ETL / warehouse / wizard** is the most mature part of the product: real endpoints, real data pipeline (schema v2.2.0, preparation, corrections, reconciliation, warehouse loading), a 10-step wizard, and working analytics. This part is genuinely production-grade in design.
- The **account layer is a mock**. Registration and login in the client portal are simulated client-side with `setTimeout` and fake `user-<timestamp>` ids — no backend calls. Password reset, email verification, and real sessions do not exist.
- **Authentication is disabled server-wide.** `backend/server.js:88` has `app.use('/api', verifyToken)` commented out (`// COMMENTED OUT FOR DEVELOPMENT - UNCOMMENT BEFORE PRODUCTION`). Every endpoint — including file download and POS build — is publicly reachable. Tenant isolation relies on unverified `X-User-Id` headers.
- **Dashboard delivery has no reachable path.** Dashboards are created as `DRAFT` with an implicit `clientId`. Publishing endpoints exist but **no admin UI route reaches them** (`AdminBIReview`, `AdminBIAnalystWorkspace`, `AdminBIAnalysisDetail` are not mounted in `admin/src/App.jsx`). No dashboard export/download exists. The client viewer requires `PUBLISHED` + a Metabase public embed, which cannot be produced today.
- **Notifications exist only for the client** (`BiNotification`), and nothing notifies admins of new requests.
- **License enforcement is nominal.** License files are client-generated with `SIG=BYPASSED-FOR-WEB-DEPLOYMENT` (`admin/src/hooks/usePOSGenerator.js:160-167`); the POS validates presence only; expiration is not enforced server-side.

**Bottom line:** ~6 of the 20 workflow steps are fully implemented; 11 are partial; 3 are missing entirely. The critical blocker is the **identity + delivery** layer, not the ETL.

---

## 1. Architecture Overview

```
┌───────────────────┐    ┌───────────────────────┐    ┌──────────────────────┐
│  client portal    │    │  admin web app        │    │  generated POS       │
│  frontend/ (Vite  │    │  admin/ (Vite React)  │    │  pos-template →      │
│  + React + TS)    │    │  French UI, lazy      │    │  Electron+Vite+React │
│  marketing +      │    │  routes               │    │  SQLite (per tenant) │
│  /dashboard area  │    └──────────┬────────────┘    └──────────┬──────────┘
└─────────┬─────────┘               │                            │
          │                         │                            │
          ▼                         ▼                            │
┌──────────────────────────────────────────────────────┐         │
│                 backend/ (Express, node server.js)   │         │
│  routes/*  ·  services/ (etl-pipeline, warehouse,    │         │
│  analytics-cache) · middleware/auth.js (DISABLED)    │         │
│  prisma/schema.prisma (PostgreSQL)                   │◄────────┘
│  uploads/bi-zips · uploads/bi-previews               │  local BI export
│  analytics-cache/<uploadId>.json                     │  (POS → ZIP, local)
└──────────────────────────┬───────────────────────────┘
                           │
              ┌────────────┴─────────────┐
              ▼                          ▼
     PostgreSQL: pos_system        PostgreSQL: metabase
     (app + BI warehouse)          (Metabase app DB)
                                    metabase/start-metabase.bat
```

**Components:**

| Component | Tech | Status |
|---|---|---|
| `frontend/` | Vite + React + TS (public client portal) | Partially functional; auth is mocked |
| `admin/` | Vite + React (admin app, French) | Functional; auth disabled; several pages unrouted |
| `backend/` | Express + Prisma + PostgreSQL | Functional; auth disabled; mixed mock/real routes |
| `pos-template/` | Electron + Vite + React + SQLite | Real POS app; per-tenant SQLite; local BI export |
| `metabase/` | Metabase CE v0.52.4 JAR + PG | Installed; `start-metabase.bat`; embed flow built but gated |
| `generated-pos/` | Output of POS generator | Artifacts per license |

Two backend entrypoints exist and diverge: `server.js` (default `npm start`) and `server-v2.js` (cleaner: validators, rate limiters, Swagger, but only mounts `bi-requests`). Security fixes in `server-v2` do **not** protect the default runtime.

---

## 2. Complete Workflow Analysis

Legend: ✅ Fully implemented · 🟡 Partially implemented · 🔴 Missing

| # | Step | Status | Why |
|---|---|---|---|
| 1 | **Create Account** | 🔴 | `Register.tsx` collects fullName/email/password/business/reseller docs but the API call is commented out (`Register.tsx:154,181-191`); it only simulates a 1.5s wait and navigates. No `/api/auth/register` endpoint exists anywhere. |
| 2 | **Login** | 🔴 | Client portal `Login.tsx:52-77` is mocked: it fabricates `user-<Date.now()>` and writes `localStorage`, no JWT, no server call. The real `POST /api/users/login` exists but (a) is only reachable on the disabled-auth server, (b) returns a 7-day JWT with no refresh/revocation, (c) the client portal never calls it. |
| 3 | **Generate POS** | 🟡 | Works end-to-end (`POST /api/pos/generate`, `generators/index.js` pipeline: copy → config → module filter → theme → build). Self-service, no admin needed. But: unauthenticated, `outputPath` is client-supplied, no job queue/history, avg ~10 min, CI build path skips per-license customization. |
| 4 | **Customize POS** | 🟡 | Theme/module customization runs in local builds. Local build requires a Windows server with `LOCAL_BUILD=true`; GitHub Actions build (`build-pos.yml`) only writes a minimal `app-config.json` and skips ModuleFilter/ThemeCustomizer. |
| 5 | **Download / Install POS** | 🟡 | `GET /api/pos/download` works but is **arbitrary file disclosure** (`?path=` + `fs.statSync`), unauthenticated, no download/install tracking. No install workflow, no versioning, no update channel. |
| 6 | **Daily POS Usage** | 🟡 | The Electron POS runs with a local SQLite DB, per-tenant file, real modules. License validation is a presence check (`ipc-license-handlers.cjs:11-15`), web fallback fabricates a valid license, and generated `.key` files carry `SIG=BYPASSED-FOR-WEB-DEPLOYMENT`. Expiration not enforced server-side. |
| 7 | **Export BI ZIP** | ✅ | `ipc-bi-export-handler.cjs` exports CSV datasets (registry-driven) + `metadata.json` v2 into `Documents/CarthaPOS/BI_Exports/bi_export_*.zip`. Fully local, validated, measured. |
| 8 | **Upload ZIP (Client Portal)** | 🟡 | `POST /api/bi-uploads` works (multer, 100MB, .zip, SHA-256 dedup). **But the client sends no `requestId`** (`BiExportDeploy.tsx:99-102`), so upload sits at `PENDING_PAYMENT_VERIFICATION` and `start-etl` refuses it (`bi-uploads.js:481-498`). Only an admin `admin-approve` can unblock it. No auto-ETL on upload. |
| 9 | **BI Request Created** | 🟡 | `POST /api/bi-requests` works (CSV attachments, status `PENDING_REVIEW`). **No notification is sent to admins**; admin must poll. |
| 10 | **Admin Reviews Request** | 🟡 | Backend complete (`PATCH /:id/payment|approve|reject|request-info`). Admin `BIRequests.jsx` page works (verify payment, approve, reject). **But the separate review/analysis UI (`AdminBIReview`, `AdminBIAnalystWorkspace`) is not routed** in `App.jsx`. |
| 11 | **Admin Downloads ZIP** | 🔴 | There is **no download endpoint** for upload ZIPs anywhere in the BI routes. Admin can only see file size/name and open CSV attachments on requests. |
| 12 | **Admin Imports ZIP into BI Wizard** | ✅ | `BiUploadPortal` (Historique BI) + `BiWizard` (10 steps). Upload → validate → prepare → preview → correct → load works. |
| 13 | **Validation** | ✅ | `POST /:id/validate` → `extractAndValidate()` → validation report, `VALIDATED`. |
| 14 | **Preparation** | ✅ | `POST /:id/prepare` → `prepareWarehouse()` in-memory (cleaned datasets, dims/facts, reconciliation tolerances 0.01/0.005). |
| 15 | **Corrections** | ✅ | `POST /:id/correct` mutates rows, persists replayable `preview.corrections`, resolves ERROR issues. |
| 16 | **Warehouse Loading** | ✅ | `POST /:id/confirm-load` → `loadIntoWarehouse()` transaction (120s), dims/facts, snapshot replacement, orphan checks, `COMPLETED`. |
| 17 | **Metabase Dashboard Generation** | 🟡 | `POST /bi/dashboards/generate-from-upload` creates a `DRAFT` `BiDashboard` (from template name/desc). **No Metabase dashboard is actually created** — `BiDashboard` has no `metabaseDashboardId` column; the badge is always empty; template registration UI is missing. Embed needs a manually built Metabase dashboard + public UUID + `METABASE_EMBED_ENABLED=true`. |
| 18 | **Dashboard Export** | 🔴 | No export/download endpoint (no PDF, no XLSX, no file). |
| 19 | **Dashboard Assigned To Client** | 🔴 | No explicit assignment. `clientId` is set at creation; `assignedAt` = publish timestamp. Publishing requires `PATCH /bi/dashboards/:id` → `PUBLISHED`, **which no admin UI calls**. Review pages that could publish are unrouted. |
| 20 | **Client Opens BI Dashboard** | 🟡 | `BIDashboardViewer` exists and lists `GET /bi/dashboards?status=PUBLISHED`. But requires a `PUBLISHED` dashboard (unreachable today) + a Metabase public embed (manual setup). Also queries `clientId=<user.id>` which is a fake `user-<timestamp>` for non-admin portal users — real clients can't authenticate at all. |

**Verbatim workflow verdict:**

```
Visitor → Create Account          🔴 (mocked, no endpoint)
       → Login                    🔴 (mocked client-side; real login exists but unused/unauth)
       → Generate POS             🟡 (works self-service, no auth/queue)
       → Customize POS            🟡 (local builds only; CI skips customization)
       → Download / Install POS   🟡 (works, insecure, untracked)
       → Daily POS Usage          🟡 (weak license enforcement)
       → Export BI ZIP            ✅
       → Upload ZIP               🟡 (stalls without requestId/admin-approve)
       → BI Request Created       🟡 (no admin notification)
       → Admin Reviews Request    🟡 (backend ok; review UI unrouted)
       → Admin Downloads ZIP      🔴 (no endpoint)
       → Admin Imports ZIP        ✅
       → Validation               ✅
       → Preparation              ✅
       → Corrections              ✅
       → Warehouse Loading        ✅
       → Metabase Dashboard Gen   🟡 (DRAFT only; no real MB dashboard)
       → Dashboard Export         🔴 (no endpoint)
       → Dashboard Assigned       🔴 (no publish path from UI)
       → Client Opens Dashboard   🟡 (viewer exists; blocked by auth + publish)
```

---

## 3. Backend Audit

### 3.1 Global
- **Auth middleware is disabled**: `server.js:88` (`// app.use('/api', verifyToken)`). All route files mount bare. No BI route imports `verifyToken`/`requireRole`. `middleware/auth.js` is well-built (JWT 7d, `requireRole`, error codes) but **not wired in**.
- **No rate limiting** on the default server (`server.js`). Limiters exist only in `server-v2.js` / `src/`.
- **CORS** `origin: '*'` + `credentials: true` (`server.js:50-55`), allows `X-User-Id`/`X-User-Email`.
- `/uploads` served statically without auth (`server.js:68`).

### 3.2 Identity & clients
| Endpoint | Auth | Status | Notes |
|---|---|---|---|
| `POST /api/users` | bypassed | 🟡 | Admin-only user creation; **not public registration** |
| `POST /api/users/login` | public | 🟡 | Works (username/email), no rate limit, 7-day JWT, no refresh/revoke |
| `GET/PUT/DELETE /api/users/:id` | bypassed | 🔴 | No input validation; `PUT` allows setting `role: ADMIN` |
| `GET/POST/PUT/DELETE /api/clients` | **none at all** | 🔴 | Full tenant CRUD open to the world; `GET /api/clients` dumps all clients+licenses+config |
| Register / forgot-password / reset-password / verify-email / `/me` / logout | — | 🔴 | **None exist** |

### 3.3 Licenses & POS
| Endpoint | Auth | Status | Notes |
|---|---|---|---|
| `POST /api/licenses` | none | 🔴 | Self-service license creation, `isActive:true` always, auto-creates client `{userId}-{ts}` from unverified header |
| `POST /api/licenses/admin-create` | none | 🔴 | Public "admin" create, no payment check |
| `PUT/DELETE /api/licenses/:id` | none | 🔴 | Anyone can activate/deactivate/delete any license |
| `POST /:id/generate-file` | none | 🟡 | Produces encrypted `.key`; frontend bypasses it with mock |
| `POST /:id/module-upgrade-purchase` | none | 🔴 | Self-declared `paidAmount`; records to JSON file, not DB |
| `POST /api/pos/generate` | none | 🟡 | Full generator; client-supplied `outputPath` |
| `POST /api/pos/build` | none | 🔴 | Runs `npm ci` + `electron-builder` in attacker-supplied dir |
| `GET /api/pos/download?path=` | none | 🔴 | **Arbitrary file disclosure** |
| `POST /api/usb/write-license` | none | 🔴 | Writes attacker content to attacker path |

### 3.4 BI intake & ETL
| Endpoint | Auth | Status | Notes |
|---|---|---|---|
| `POST /api/bi-requests` | none | 🟡 | Creates request + CSV attachments; **no admin notification** |
| `PATCH /bi-requests/:id/payment|approve|reject|request-info` | none | 🟡 | Backend complete; creates client notifications |
| `POST /api/bi-uploads` | none | 🟡 | ZIP upload; requires `clientId`; dedup; **no requestId from client → stalls** |
| `POST /:id/start-etl` | none | 🟡 | Requires linked `APPROVED` request; background 202 |
| `POST /:id/admin-approve` | none | 🟡 | Admin workaround that synthesizes APPROVED+VERIFIED request |
| `POST /:id/validate · prepare · correct · confirm-load` | none | ✅ | Wizard pipeline, all working |
| `GET /:id/raw-preview · transformation-preview · dimensional-model · report` | none | ✅ | Working |
| `GET /:id/summary` | none | 🟢 dead | Helper never called by UI |
| `DELETE /:id` | none | 🟡 | Cascade delete |

### 3.5 Dashboard & delivery
| Endpoint | Auth | Status | Notes |
|---|---|---|---|
| `POST /bi/dashboards/generate-from-upload` | none | 🟡 | Creates DRAFT for upload.clientId; 409 if exists |
| `POST /bi/dashboards` (manual) | none | 🟡 | Manual DRAFT |
| `PATCH /bi/dashboards/:id` | none | 🟡 | Status machine DRAFT→…→PUBLISHED; **no UI calls it** |
| `PATCH /bi/reviews/:id/approve|reject` | none | 🔴 | Exists, **unrouted UI** |
| `GET /:id/metabase-link` | none | 🔴 | Always returns `linked:false` (no `metabaseDashboardId` column) |
| `GET /:id/embed` | none | 🟡 | Works only with template embedType≠none + public UUID + `METABASE_EMBED_ENABLED=true` |
| Dashboard export/download | — | 🔴 | **Missing entirely** |
| `GET/PATCH /api/bi/notifications*` | none | 🟡 | Client-scoped only |

### 3.6 Other (mock/sector routes)
`barcode.js`, `suppliers.js`, `menu-management.js`, `quick-service.js`, `payment-advanced.js`, `gift-cards.js`, `prescriptions.js`, `production.js` are **in-memory mocks** — no persistence, several route-shadowing bugs (`/stats`, `/recipes` unreachable), PII in fixtures. `takeaway.js`, `loyalty.js` use real Prisma but no tenant scoping. `seed-api.js` `/run-seed` always 500s.

---

## 4. Frontend Audit

### 4.1 Client portal (`frontend/`)
Routes: `/` `/features` `/docs` `/blog` `/contact` `/login` `/register` `/verification-pending` `/dashboard` `/dashboard/generator` `/dashboard/bi-export` `/dashboard/bi-dashboard(/:id)` `/pos-generator`.

| Page | Status | Notes |
|---|---|---|
| Register | 🔴 | Mock submit; docs collected but never sent; redirects to `/dashboard` which then bounces to `/login` (no stored user) |
| Login | 🔴 | Mock; fake `user-<timestamp>` id; "Forgot password" link → unrouted `/forgot-password` |
| Dashboard (hub) | 🟡 | Real: list licenses, regenerate, download (insecure URL), module upgrade quote/purchase (manual payment), BI request dialog (CSV attachments), payment history. Errors mostly `console.error` only, no user feedback. |
| Generator (`/dashboard/generator`) | 🟡 | Iframes the admin app `/pos-generator?mode=user&userId=...`; requires admin app running; fallback button to onrender URL |
| POSGeneratorPage (`/pos-generator`) | 🟡 | Full 5-step wizard; broken USB hooks (`useUSBDrives` calls non-existent methods); `direct-convert`/`quick-test` use relative paths with no Vite proxy |
| BiExportDeploy (`/dashboard/bi-export`) | 🟡 | ZIP upload works; **no requestId sent**; raw `alert()` errors; hard-coded French |
| BIDashboardViewer + EmbeddedDashboardContainer | 🟡 | Works for PUBLISHED + embedded dashboards; notifications sidebar; but queries `clientId=<fake user id>` |
| Marketing pages | 🟡 | Mostly static; contact form has no submit; docs search inert; many dead footer links |

**No `AuthContext` exists** — pages read `localStorage`/`sessionStorage` directly. Language: i18n (en/fr) but dashboard/BI/generator hard-coded French.

### 4.2 Admin app (`admin/`)
Routes (admin mode): `/` `/clients` `/licenses` `/modules` `/pos-generator` `/pos-preview` `/bi-requests` `/bi-upload-portal` `/bi-wizard` `/bi-dashboard/:dashboardId` `/analytics` `/usb-manager` `/user-management`. User mode: only `/pos-generator`.

| Page | Status | Notes |
|---|---|---|
| Login / ProtectedRoute | 🔴 | JWT interceptor commented out (`App.jsx:26-30`, `lib/api.js:13-16`); app runs with no login; `Login.jsx` orphan |
| Clients | 🟡 | CRUD ok; read-only license link; no search/pagination/detail |
| Licenses | 🔴 | **Read-only** list + `.key` download; no create/edit/activate/revoke in UI |
| Modules | 🟡 | CRUD |
| POS Generator | 🟡 | Works; **mock license file** `SIG=BYPASSED-FOR-WEB-DEPLOYMENT` |
| BI Requests | 🟡 | Verify payment/approve/reject/request-info all present; mixed EN/FR text |
| BiUploadPortal | ✅ | ETL launch, admin-approve, generate dashboard, cancel/delete, logs — complete |
| BiWizard (10 steps) | ✅ | Upload → validate → preview → prepare → before/after → model → corrections → load → dashboard → report |
| AdminDashboardViewer | 🟡 | View only; `metabaseDashboardId` always empty; hard-coded MB URL localhost:3000 |
| AdminBIReview / AnalystWorkspace / AnalysisDetail | 🔴 | **Not routed** — no publish/review path |
| Dashboard, Settings, Diagnostics | 🔴 | Mock data (`Math.random()`, hardcoded 2024-01-15 audit log) |
| UserManagementAdvanced | 🟡 | POS staff CRUD (CASHIER/MANAGER/…); **not client accounts**; no client link |

---

## 5. Database Audit

36 models, 8 enums, PostgreSQL (`backend/prisma/schema.prisma`).

### 5.1 Coverage of the workflow
| Workflow need | Models | Verdict |
|---|---|---|
| Register / login / session | `User` (username, email, password, role, accountType, verificationStatus, affiliate fields) | 🔴 No registration token/password-reset/session tables; `UserRole` enum has no CLIENT/PLATFORM role; same table for POS staff + SaaS admins |
| Client ↔ user | none | 🔴 **`Client` has no `userId`; `User` has no `clientId`** — no relation at all. Users never own clients |
| POS generation | `License.buildStatus/buildProjectPath/...`, `UserPosConfiguration` | 🔴 No `generatedPos`/`buildJob`/`buildHistory` models; no queue, retries, artifact registry; `UserPosConfiguration` has no `@@map` (PascalCase table), no cuid default, `updatedAt` not `@updatedAt` |
| POS download/update | none | 🔴 No model |
| License | `License`, `LicenseModule`, `LicenseConfiguration`, `Module` | 🟡 Solid; `isActivated/activatedAt` present but never set; `bindingType/buildStatus` are strings not enums; no `clientId` index |
| BI request | `BiRequest` (status, paymentStatus, files) | 🟡 Good; `userId`/`userEmail` denormalized no FK |
| BI upload | `BiUpload` + `BiUploadFile` + `BiProcessingJob` + `BiProcessingLog` | 🟡 **`BiUpload.clientId` has NO relation/FK to `Client`**; job is 1-per-upload (`uploadId @unique`) → no re-runs |
| Admin review | none | 🔴 No `BiReview` model; `BiAnalysisRequest.assignedTo` is a string |
| Dashboard | `BiDashboard` (clientId required, status, dashboardType, dashboardConfig, assignedAt) | 🟡 No `metabaseDashboardId` column (embed works only via template); no explicit assignment model/history; zero indexes |
| Notifications | `BiNotification` (clientId, dashboardId, type, isRead) | 🔴 Client-scoped only; no admin-targeted notifications |
| Tenant concept | none on core SaaS tables | 🔴 No `Tenant`, no `tenantId` on `Client/License/User/Bi*`; only warehouse dim/fact tables carry a denormalized `tenantId` |

### 5.2 Known structural problems
- **Missing FKs**: `BiUpload.clientId` (plain string, no relation), `BiRequest.userId`, `BiAnalysisRequest.assignedTo`, `BiDashboard.createdBy`, `License.createdBy`.
- **Missing indexes**: `License.clientId`, `BiDashboard.*` (none), `BiNotification.*`, `BiUpload.*`, `BiUploadFile.uploadId`, `BiProcessingLog.jobId`, `Order.*`, `LoyaltyTransaction.customerId`, `Referral.*`.
- **Strings instead of enums**: `License.buildStatus/bindingType`, `BiDashboard.status/dashboardType`, `BiNotification.type`, all `Bi*` status fields, `Appointment.status`.
- **Timestamps**: `BiUpload.updatedAt`, `BiProcessingJob.updatedAt`, `UserPosConfiguration.updatedAt` not auto-maintained.
- Warehouse tenant indexes exist only in out-of-band migrations → **schema drift risk**.

---

## 6. Missing Features (Prioritized)

### 🔴 CRITICAL (block production)
1. **Real registration endpoint** (`POST /api/auth/register`): create User → create Client → verification workflow.
2. **Real login + session** in client portal (JWT, refresh/revocation, route guards, `AuthContext`); enable `verifyToken` globally.
3. **Client↔User binding** in the schema (FK) and all tenant scoping via the JWT, not headers.
4. **Dashboard publish path**: route `AdminBIReview`/analyst pages OR add Publish button; enable `PATCH /bi/dashboards/:id` / `bi/reviews/:id/approve` from UI.
5. **Real Metabase dashboard creation + linking** (or remove `metabaseDashboardId` references and rely on embed-by-template); register templates via UI.
6. **Remove mock license** (`SIG=BYPASSED-FOR-WEB-DEPLOYMENT`) and restore real `generate-file`.
7. **Secure the filesystem endpoints**: confine `GET /api/pos/download`, `POST /api/pos/build`, `POST /api/usb/write-license`, `/uploads` static, `POST /api/pos/generate` `outputPath`.
8. **Client ZIP upload must send `requestId`** (link to an approved request) or allow client payment verification — otherwise ETL is unreachable without admin-approve.
9. **Admin notifications** for new requests/uploads (new model or extend `BiNotification` with `recipientRole`).

### 🟠 HIGH
10. Password reset + email verification (schema fields exist, no endpoints).
11. Dashboard export/download endpoint (PDF/XLSX) + client download button.
12. Dashboard assignment model or explicit assign endpoint + UI.
13. Admin ZIP download endpoint for uploads.
14. License management UI in admin (create/activate/revoke/assign) — currently read-only.
15. Real payment verification for module upgrades + BI payment (replace self-declared `paidAmount`).
16. Rate limiting on auth + all routes; move `server-v2` protections into the default server.
17. Self-service onboarding: after registration, direct user into POS generator with proper client identity.

### 🟡 MEDIUM
18. POS build queue/history models + progress persistence (currently denormalized on License).
19. POS auto-update channel (electron-updater) + versioning.
20. CI build path must run ModuleFilter/ThemeCustomizer (per-license customization in GitHub builds).
21. Admin analytics pages wired to live warehouse data (remove `Math.random()` dashboard).
22. Unified notification center (bell) for client + admin.
23. Empty/loading/error-state consistency; replace `alert()`/`confirm()` with toasts/dialogs.
24. Route the orphaned settings pages or remove them; fix dead links (`/bi-dashboard/new`, footer links).

### 🟢 LOW
25. i18n consistency (FR-only BI pages vs EN elsewhere; unaccented toasts).
26. Route-shadowing fixes in mock sector routes; remove or persist mock data.
27. `BiProcessingJob` re-run support; `BiUpload.clientId` FK; index pass.
28. Schema enums for all status fields; `@@map` for `UserPosConfiguration`.
29. First-run Metabase setup automation + doc (`docs/bi/metabase-setup.md`).

---

## 7. UI Improvements

1. Register/Login: real forms wired to API, loading + server error states, email verification screen.
2. Client hub: toast on all mutations (regenerate, purchase, submit request) instead of `console.error`.
3. Admin Licenses page: add create/edit/activate/revoke/assign-client actions.
4. Dashboard delivery: "Publish to client" button + assignment dialog + PUBLISHED badge in BI Requests/history.
5. Client: notification bell on the layout (not only dashboard-detail sidebar); upload wizard that also creates a linked BI request (single flow).
6. Fix USB generator hooks + Vite proxy for `direct-convert`/`quick-test`.
7. Confirmation dialogs for purchase/regenerate/delete; consistent Dialog component everywhere.
8. Remove fabricated `metabaseDashboardId` badges; show embed status truthfully.
9. Unify language (FR) across admin; fix unaccented toasts.
10. Kill dead routes/links; route or remove orphaned pages (Settings, AdminBI*, Login).

---

## 8. Backend Improvements

1. Re-enable global `verifyToken`; require roles on admin routes; drop the bypass middleware in `users.js`.
2. Add `POST /api/auth/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `GET /api/users/me`, `POST /auth/logout`.
3. Derive tenant from `req.user` (JWT) → resolve client; stop trusting `X-User-Id`.
4. Implement real payment verification hooks (webhook/stripe) for licenses, upgrades, and BI requests.
5. Add upload download endpoint (admin) and dashboard export endpoint (client).
6. Persist module-upgrade transactions in the DB (not a JSON file).
7. Confine `pos/download` to `generated-pos/` and require a valid license token; remove arbitrary `path`.
8. Add ETL auto-trigger on upload when a linked APPROVED request exists; else return a clear "link a request" error.
9. Add admin notifications on request creation/upload and on ETL completion; extend `BiNotification`.
10. Ship `server-v2` (validators/rate-limit/Swagger) as the default entrypoint.

---

## 9. Security Improvements

1. **CRITICAL**: enable authentication; remove hardcoded JWT/AES/HMAC fallback secrets (`auth.js:4`, `utils/license.js:33,58`); set strong secrets in `.env`.
2. **CRITICAL**: fix arbitrary file download (`pos/download`), arbitrary command execution (`pos/build`), arbitrary file write (`usb/write-license`), and static `/uploads`.
3. Remove privilege escalation: forbid `PUT /api/users/:id` role→ADMIN except by super-admin.
4. Remove PII in mock fixtures (prescriptions social security); stop logging full license objects.
5. Add rate limiting (login brute force), CSRF hardening, and tighten CORS to the two frontends.
6. Enforce license activation + expiration server-side; validate machine binding on download/usage.
7. Mark `SIG=BYPASSED-FOR-WEB-DEPLOYMENT` as unacceptable for production; generate signed license files.
8. Add input validation middleware on all mutating routes (IDs, enums, sizes).
9. Secure the metabase credentials in `start-metabase.bat` (currently plaintext password).
10. Fix uncaughtException handler to exit (avoid running in corrupt state) in production.

---

## 10. Recommended Implementation Order

**Phase 0 — Stabilize security (blocker):**
1. Enable global auth + rate limiting + real secrets.
2. Remove/confine filesystem-exposing endpoints.
3. Remove mock license signing.

**Phase 1 — Identity (blocker):**
4. Registration + login + session + password reset + email verification.
5. Client↔User FK; tenant scoping from JWT.

**Phase 2 — Intake & delivery (blocker):**
6. Client upload links requestId; auto-ETL trigger.
7. Admin notification on request/upload.
8. Dashboard publish path in admin UI (route review pages).
9. Dashboard export + client download.
10. Assignment model + UI.

**Phase 3 — Productization (high):**
11. License management UI; real payments.
12. POS build queue/history + update channel; CI customization.
13. Admin analytics on live data.

**Phase 4 — Polish (medium/low):**
14. UI/UX pass (toasts, dialogs, i18n, dead links).
15. DB index/FK/enum pass; re-run support; schema drift reconciliation.
16. Metabase setup automation + documentation.

---

## 11. Final Answer

> **What remains to be implemented before CarthaPOS can be considered a production-ready SaaS platform with complete BI workflow?**

In short: **the entire identity, intake, and delivery layer** — the ETL core is ready.

Concretely, five things must become real before production:

1. **Accounts**: a working register→verify→login→session loop with real credentials, a `Client`↔`User` relationship, and global server-side authentication (today registration/login are mocked and every API is public).
2. **A trusted, per-client tenant boundary**: identity derived from the authenticated JWT instead of unverified `X-User-Id` headers, so clients can only see and mutate their own licenses, uploads, and dashboards.
3. **A complete upload→ETL intake**: the client ZIP upload must be linked to an approved BI request (or a client-side payment path) so ETL actually starts without an admin backdoor (`admin-approve`), plus admin notifications when work arrives.
4. **A real dashboard delivery path**: generate a real (Metabase) dashboard, publish it via a reachable admin UI, assign it to the client, and let the authenticated client download/export and view it. Today a generated dashboard can never leave the `DRAFT` state through the UI, and no export exists.
5. **Real money and real licensing**: replace self-declared payments and the `SIG=BYPASSED-FOR-WEB-DEPLOYMENT` license files with verified payments and server-enforced activation/expiry.

Until Phases 0–2 (Sections 10) are delivered, CarthaPOS remains a **powerful BI/ETL engine plus a mock SaaS shell** — not a production-ready multi-tenant SaaS.
