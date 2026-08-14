# BI Workflow Integration — Session Report

**Date:** 2026-08-05
**Scope:** Finalize + verify the Client↔Admin BI Workflow Integration (approved plan `BI_WORKFLOW_INTEGRATION_PLAN.md`, v3 + refinements 1–15).

---

## 1. Objective & constraints

Connect the existing stable BI modules (upload → ETL → warehouse → dashboard → publish → notify) through a request-driven workflow, without ever modifying the engine files:

- `backend/services/*`
- `admin/src/pages/wizard/*`
- `pos-template/` BI export files

Verified byte-for-byte unchanged (file-mtime check, this session).

## 2. This session's work (2026-08-05, late session)

Three bugs were found during end-to-end verification and fixed, the full flow was proven green over HTTP, test data was cleaned up, and the dashboard-template registry was seeded.

### 2.1 Fix — multipart request creation (`backend/routes/bi-requests.js`)

**Problem:** The `POST /api/bi-requests` create route applied two multer middlewares in sequence (`zipUpload` then `csvUpload`). Any multipart request carrying the ZIP in the `file` field with extra form fields died with `{"error":"Invalid upload: Unexpected end of form"}` — the first multer consumed the stream and the second tried to parse the already-truncated body. The wizard's submit path was therefore broken.

**Fix:** Replaced the double-multer with a single combined `workflowUpload` instance:
- `file` / `files` field → `uploads/bi-zips` (`.zip` only)
- `csvFiles` field → `uploads/bi-requests` (`.csv` only, legacy dialog)
- `limits: 100MB, files: 11`

### 2.2 Fix — generate guard (`backend/routes/bi-dashboards.js`)

**Problem:** The `generate-from-upload` pre-condition required the linked request to be `APPROVED`, but ETL completion transitions the request to `DATA_REVIEW`. The atomic guard below it already expected `DATA_REVIEW → GENERATING_DASHBOARD` (refinement #14). So generation was impossible for request-linked uploads.

**Fix:** Pre-condition now requires `DATA_REVIEW` (post-ETL) for request-linked uploads; wizard uploads without a request remain unblocked.

### 2.3 Fix — client notification scoping (`backend/routes/bi-notifications.js`)

**Problem:** The client inbox (`GET /`, `GET /unread-count`, `POST /read-all`) only used `clientId`/`role` from query/body. Requests that relied on the `X-User-Id` header returned **all** clients' notifications (a cross-client leak), and the header-only `unread-count` call failed with `400`.

**Fix:** All three routes now resolve identity via `resolveClientId(req)` (JWT → `Client.userId`, then `X-User-Id` header, then body/query `userId`) and scope to the resolved client. The admin bell routes (`/admin`, `/admin/unread-count`) are unchanged.

### 2.4 Fix — code/tooling

- `package.json`: added `"seed:bi-templates": "node scripts/seed-bi-templates.js"`.
- New `backend/scripts/seed-bi-templates.js` — idempotent (upsert on `businessType`) template seeder.

## 3. End-to-end verification (HTTP, live server)

All flows exercised against the running backend on `localhost:3001`.

### 3.1 Green path — full request lifecycle

| Step | Action | Result |
|---|---|---|
| 1 | `POST /api/bi-requests` (multipart ZIP + fields) | `PENDING_REVIEW`, `currentStep=1`, `progress=10`, upload `UPLOADED` |
| 2 | Background schema validation (~8 s) | upload `VALIDATED` (201 rows) — refinement #7 |
| 3 | `PATCH /:id/approve` | `APPROVED` |
| 4 | `POST /api/bi-uploads/:id/start-etl` | `PROCESSING_ETL` → ETL `COMPLETED` (181 rows) |
| 5 | Request state after ETL | `DATA_REVIEW`, `currentStep=4`, `progress=55` |
| 6 | `POST /api/bi/dashboards/generate-from-upload` | dashboard `DRAFT v1`, request `READY_FOR_REVIEW` (`step=6`, `progress=85`) |
| 7 | `POST /api/bi/dashboards/:id/publish` | dashboard `PUBLISHED`, assignment `ACTIVE` |
| 8 | Request final state | `COMPLETED`, `currentStep=7`, `progress=100` |

Full event trail (refinement #15):

```
REQUEST_CREATED > ZIP_UPLOADED > ZIP_VALIDATED > REQUEST_APPROVED >
ETL_STARTED > ETL_COMPLETED > DASHBOARD_GENERATED > DASHBOARD_PUBLISHED > REQUEST_COMPLETED
```

### 3.2 Correct rejection paths

- **Invalid data:** ZIP whose `table_number` was `"T1"` (string) → ETL `FAILED` with type-validation errors; request stays `APPROVED` for retry; `generate-from-upload` correctly blocked (400) — engine unchanged.
- **Duplicate execution (refinement #14):** second `cancel` on a cancelled request → `409 STATE_CONFLICT` (`{"error":"STATE_CONFLICT", ...}`). Double-click on generate/publish/ETL is guarded by `updateMany` + `count===1` atomic transitions.

### 3.3 Client-facing endpoints

- Scoped request list (`X-User-Id` header) → returns only the caller's requests.
- Published dashboards list (`?clientId=<resolved>&status=PUBLISHED`) → paginated `{data.items}`.
- Notifications list / `unread-count` / `read-all` → scoped to the resolved client via header.

### 3.4 Cancel flow

`create → PENDING_REVIEW → cancel → CANCELLED`; second cancel → `409 STATE_CONFLICT`.

## 4. Template registry seeding

- Registry was empty → wizard fell back to the empty-template state.
- Seeded 7 active templates: `restaurant`, `cafe`, `bakery`, `retail`, `pharmacy`, `salon`, `hotel` (idempotent upsert; `metabaseDashboardId` are placeholders 1001–1007, to be updated via `PATCH /api/bi/dashboard-templates/:id` once real Metabase dashboards exist).
- Verified: `GET /api/bi/dashboard-templates?active=true` returns all 7.
- Command: `npm run seed:bi-templates` (in `backend/`).

## 5. Cleanup

All smoke-test artifacts removed from the DB and filesystem:

- Requests: `SmokeTest Co`, `ZipTest Co`, `CancelTest Co`, `Test BI Co` and their events, uploads, dashboards, assignments, notifications.
- Generated `uploads/bi-zips/*` copies from tests (kept only the two pre-existing reference ZIPs).

## 6. Protected files verification

Files modified in the last two hours (this session) match exactly the intended set:

- `backend/routes/{bi-requests,bi-dashboards,bi-notifications,bi-uploads,auth}.js`
- `backend/utils/{identity,bi-status,bi-workflow}.js`, `backend/server.js`, `backend/prisma/schema.prisma`, `backend/package.json`
- `frontend/src/{App.tsx, components/DashboardLayout.tsx, pages/dashboard/Dashboard.tsx, lib/bi-client.ts, pages/dashboard/{BiWorkspace,MyDashboards,RequestDetail,RequestWizard}.tsx}`
- `admin/src/{App.jsx, components/layout/Layout.jsx, pages/{BIRequests,AdminRequestDetail,BiWizard}.jsx}`

`backend/services/*`, `admin/src/pages/wizard/*`, and `pos-template/` BI files were **not** touched this session (all their diffs are pre-existing from earlier sessions).

## 7. Deliverables

| Phase | Status | Notes |
|---|---|---|
| Approved plan + refinements 1–15 | ✅ | `BI_WORKFLOW_INTEGRATION_PLAN.md` (v3) |
| Schema (Phase 1) | ✅ | migration `20260805000000_bi_workflow_integration` applied via `migrate deploy`; Prisma client regenerated |
| Backend | ✅ | identity, status, workflow utils; routes auth / bi-requests / bi-uploads / bi-dashboards / bi-notifications; `AUTH_REQUIRED` gate |
| Client frontend | ✅ | `bi-client.ts`, RequestWizard, RequestDetail, MyDashboards, BiWorkspace; nav "My BI"; builds clean |
| Admin | ✅ | AdminRequestDetail command center, BIRequests, AdminBell, BiWizard resume; builds clean |
| E2E verification | ✅ | Full green lifecycle + rejection paths + duplicate-execution protection |
| Template registry | ✅ | seeded 7 templates |
| Test cleanup | ✅ | DB + filesystem clean |

## 8. Known follow-ups (outside session scope)

- Replace placeholder `metabaseDashboardId` (1001–1007) with real Metabase dashboard ids when available.
- `BIDashboardViewer` (pre-existing viewer) queries `clientId=${user.id}` directly rather than via `resolveClientId`; legacy behavior, unchanged.
- `AUTH_REQUIRED` env gate default OFF — dev behavior unchanged (by design).
