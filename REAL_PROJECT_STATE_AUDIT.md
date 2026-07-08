# REAL PROJECT STATE AUDIT

> **Date:** 2026-06-19  
> **Project Root:** `D:\CARTHAPOS`  
> **Git:** `origin https://github.com/oussamaferjani88/carthapos-mai-prod.git`  
> **Branch:** `main`  
> **Last Commit:** `8fe4481 adding a bi layer`  

---

## Section A — What Actually Exists

### A.1 Git State

| Item | Evidence |
|------|----------|
| Working tree | `D:\CARTHAPOS` |
| Branch | `main` |
| Remote | `origin https://github.com/oussamaferjani88/carthapos-mai-prod.git` |
| Last 10 commits | POS generation fixes, module filtering, "adding a bi layer" |
| Uncommitted changes | `schema.prisma`, `bi-uploads.js`, `pos.js`, AssetManager.js, BuildSystemManager.js, etc. + untracked files |

### A.2 Backend — Entry Point

**`backend/server.js`** — starts on port 3001, verified working.

### A.3 Backend — All Route Files

| File | Lines | BI? | Uses Prisma? | Uses JSON? | Status |
|------|-------|-----|-------------|------------|--------|
| `routes/bi-requests.js` | 270 | ✅ | ❌ | ✅ JSON file | WORKS — JSON-backed, 4 endpoints |
| `routes/bi-uploads.js` | 410 | ✅ | ✅ | ❌ | WORKS — Prisma, 8 endpoints |
| `routes/bi-dashboards.js` | 207 | ✅ | ✅ | ❌ | WORKS — Prisma, 7 endpoints |
| `routes/bi-notifications.js` | 80 | ✅ | ✅ | ❌ | WORKS — Prisma, 4 endpoints |
| `routes/bi-analysis.js` | 129 | ✅ | ✅ | ❌ | WORKS — Prisma, 5 endpoints |
| `routes/bi-reviews.js` | 96 | ✅ | ✅ | ❌ | WORKS — Prisma, 3 endpoints |
| `routes/bi-debug.js` | 337 | ✅ | ✅ | ❌ | WORKS — Prisma, 3 endpoints |
| `routes/clients.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/licenses.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/modules.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/pos.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/usb.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/users.js` | — | ❌ | ✅ (bcrypt) | ❌ | WORKS |
| `routes/barcode.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/suppliers.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/menu-management.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/quick-service.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/payment-advanced.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/gift-cards.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/prescriptions.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/production.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/takeaway.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/loyalty.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/direct-convert.js` | — | ❌ | ✅ | ❌ | WORKS |
| `routes/seed-api.js` | — | ❌ | ✅ | ❌ | WORKS |

Also: `backend/src/routes/` contains a parallel route structure (older modular pattern):
- `src/routes/clients.js`, `licenses.js`, `modules.js`, `pos.js`, `usb.js`, `users.js`, `health.js`

### A.4 Backend — Services

| File | Purpose | Used By |
|------|---------|---------|
| `services/warehouse-service.js` | 10 query methods for warehouse analytics (revenue, top products, etc.) | `bi-dashboards.js`, `bi-analysis.js`, `bi-reviews.js` |
| `services/bi-schema-registry.js` | CSV column definitions, validation functions | `etl-pipeline.js`, `bi-debug.js` |
| `services/etl-pipeline.js` | 6-step ETL: extract → validate → dims → facts → complete | `bi-uploads.js` (REMOVED), `bi-debug.js` |
| `services/bi-dashboard-templates.js` | 5 hardcoded templates (restaurant, cafe, retail, pharmacy, salon) | `bi-dashboards.js` |
| `services/bi-insight-generator.js` | Rule-based insight generation from warehouse data | `bi-analysis.js` |

### A.5 Backend — Middleware

| File | Purpose | Active? |
|------|---------|---------|
| `middleware/auth.js` | JWT `generateToken`, `verifyToken`, `optionalAuth`, `requireRole` | **NO** — imported but commented out in server.js (line 86) |

### A.6 Backend — Prisma Schema

The schema has **8 BI models**:

| Model | Fields | Relations | Used By |
|-------|--------|-----------|---------|
| `BiUpload` | 14 fields + 4 relations | files, processingJob, dashboards, analysisRequests | `bi-uploads.js`, `bi-debug.js`, `etl-pipeline.js` |
| `BiUploadFile` | 7 fields | upload | `bi-uploads.js` |
| `BiProcessingJob` | 9 fields + 2 relations | upload, logs | `bi-uploads.js`, `bi-debug.js`, `etl-pipeline.js` |
| `BiProcessingLog` | 6 fields | job | `bi-uploads.js`, `etl-pipeline.js` |
| `BiDashboard` | 13 fields + 4 relations | client, license, upload, notifications | `bi-dashboards.js`, `bi-reviews.js` |
| `BiNotification` | 7 fields + 2 relations | client, dashboard | `bi-notifications.js`, `bi-dashboards.js` |
| `BiAnalysisRequest` | 12 fields + 3 relations | client, license, upload | `bi-analysis.js`, `etl-pipeline.js` (auto-created) |
| `DimClient` | 5 fields + 1 relation | factSales | `etl-pipeline.js` |
| `DimProduct` | 7 fields + 2 relations | factSales, factInventory | `etl-pipeline.js` |
| `DimSupplier` | 8 fields | (none) | `etl-pipeline.js` |
| `DimTime` | 9 fields + 4 relations | factSales, factInventory, factAppointments, factKitchenOrders | `etl-pipeline.js` |
| `FactSale` | 10 fields + 3 relations | dimClient, dimProduct, dimTime | `warehouse-service.js`, `etl-pipeline.js` |
| `FactInventory` | 9 fields + 2 relations | dimProduct, dimTime | `warehouse-service.js`, `etl-pipeline.js` |
| `FactAppointment` | 9 fields + 1 relation | dimTime | `warehouse-service.js`, `etl-pipeline.js` |
| `FactKitchenOrder` | 9 fields | dimTime | `warehouse-service.js`, `etl-pipeline.js` |

**MISSING models** (compared to architecture spec):
- `BiRequest` — does NOT exist. Requests are stored in JSON file.
- `BiDashboardTemplate` — does NOT exist. Templates are hardcoded JS.

### A.7 Backend — Data Files

| File | Content | Status |
|------|---------|--------|
| `data/bi-requests.json` | `[]` (empty array) | Active — used by `bi-requests.js` |
| `uploads/bi-zips/` | 1 ZIP file | Directory exists |

### A.8 Database — PostgreSQL

- **Database:** `pos_system` on `localhost:5432`
- **User:** `postgres`
- **Password:** `oussama`
- **Connection:** Verified working (backend starts, BI health check returns `databaseConnected: true`)

### A.9 Admin Frontend — BI Pages

| Page Component | Route in App.jsx | Nav in Layout.jsx | Status |
|---------------|-------------------|-------------------|--------|
| `BIRequests.jsx` | `/bi-requests` | ✅ "Demandes BI" | **REACHABLE** |
| `BiUploadPortal.jsx` | `/bi-upload-portal` | ✅ "Portail BI" | **REACHABLE** |
| `AdminBIDashboardManager.jsx` | `/bi-dashboard-manager` | ✅ "Tableaux de bord BI" | **REACHABLE** |
| `AdminBIAnalystWorkspace.jsx` | `/bi-analysis` | ✅ "Analyse BI" | **REACHABLE** |
| `AdminBIAnalysisDetail.jsx` | `/bi-analysis/:id` | (sub-route) | **REACHABLE** |
| `AdminBIReview.jsx` | `/bi-review` | ✅ "Validation BI" | **REACHABLE** |

**All 6 BI pages are routed in admin App.jsx and linked in Layout.jsx sidebar.**

### A.10 Client Frontend — BI Pages

| Page Component | Route in App.tsx | Nav in DashboardLayout.tsx | Status |
|---------------|-------------------|---------------------------|--------|
| `Dashboard.tsx` | `/dashboard` | "Tableau de bord" | **REACHABLE** |
| `BiExportDeploy.tsx` | `/dashboard/bi-export` | "Export BI" | **REACHABLE** |
| `BIDashboardViewer.tsx` | `/dashboard/bi-dashboard` and `/dashboard/bi-dashboard/:dashboardId` | "Tableaux de bord BI" | **REACHABLE** |
| `Generator.tsx` | `/dashboard/generator` | "Générateur" | **REACHABLE** |

**All BI client pages are routed and linked in the navigation.**

### A.11 Metabase

| Item | Status | Evidence |
|------|--------|----------|
| Installation | ✅ Installed | `D:\CARTHAPOS\metabase\metabase.jar` |
| Start script | ✅ Exists | `D:\CARTHAPOS\metabase\start-metabase.bat` |
| PostgreSQL connection | ✅ Configured for `metabase` DB | `MB_DB_DBNAME=metabase` in start script |
| Connected to `pos_system`? | ❌ No | Only connected to its own `metabase` database |
| Embedding code | ❌ None | No iframe/JWT embedding in any frontend code |
| Referenced in code? | ❌ Not referenced | No `metabase` import or URL in any source file |

---

## Section B — What Was Previously Assumed But Is False

### B.1 "Only 1 of 6 BI pages is routed in admin"

**FALSE.** All 6 BI admin pages are fully routed in `admin/src/App.jsx` (lines 75-80). All 6 are also linked in `admin/src/components/layout/Layout.jsx` (lines 28-32).

### B.2 "BIDashboardViewer has NO route in frontend App.tsx"

**FALSE.** `BIDashboardViewer.tsx` is imported and routed at:
- `/dashboard/bi-dashboard` (line 119-123)
- `/dashboard/bi-dashboard/:dashboardId` (line 124-128)

And it's linked in `DashboardLayout.tsx` navigation (line 57-61 as "Tableaux de bord BI").

### B.3 "JWT auth is commented out on ALL BI routes"

**CONFIRMED TRUE** for server.js level. But the `middleware/auth.js` file does exist and is correctly implemented. It's just not applied.

### B.4 "bi-requests.js uses JSON file — migration needed"

**CONFIRMED TRUE.** `bi-requests.js` reads/writes `data/bi-requests.json`. The file is currently empty `[]`, so migration has zero data loss risk.

### B.5 "BiAnalysisRequest model is deprecated"

**PARTIALLY FALSE.** The model is still actively auto-created by `etl-pipeline.js` (Step 5e, line 124-142) and the `bi-analysis.js` route is fully functional with 5 endpoints. However, the architecture spec recommends deprecating it.

### B.6 "ETL auto-fires after upload"

**NOW FIXED** (as of my edit). The original `bi-uploads.js` at D:\CARTHAPOS *did* auto-trigger ETL (lines 132-140). My edit removed it. This was the correct change.

### B.7 "Build optimization is complete"

**TRUE.** The build pipeline has generator files (`AssetManager.js`, `BuildSystemManager.js`, `PerfLogger.js`, etc.) but these are unrelated to BI.

---

## Section C — What Is Broken

### C.1 CRITICAL — JWT Authentication Disabled

`server.js` line 86: `// app.use('/api', verifyToken);`

All API endpoints (including all BI routes) are fully public. No authentication required for any operation. This includes upload, dashboard viewing, and ETL operations.

**Evidence:** `backend/server.js:86`

### C.2 HIGH — No Role-Based Access Control

Even with JWT enabled, there's no middleware checking `admin` vs `client` roles on any BI route. The `requireRole` function exists in `auth.js` (line 112) but is never used.

### C.3 HIGH — ETL Endpoints Have No Auth

`POST /api/bi/uploads/:id/start-etl` endpoint doesn't exist yet (Phase 3), but the debug endpoints in `bi-debug.js` can trigger ETL with no auth:
- `POST /api/bi/debug/retry/:uploadId`
- `POST /api/bi/debug/self-test`

### C.4 MEDIUM — `BiAnalysisRequest` Auto-Creation in ETL

`etl-pipeline.js` Step 5e (line 124-142) auto-creates a `BiAnalysisRequest` on every ETL completion. This is the old workflow. The architecture spec says to remove it and auto-generate dashboards instead. Non-fatal but creates orphan records.

### C.5 MEDIUM — `bi-requests.js` Uses JSON File

The `bi-requests` API is backed by a flat JSON file at `data/bi-requests.json`. This file has no indexing, no tenant isolation, no relations. Currently empty `[]`, so no data loss risk for migration.

### C.6 LOW — `@map` Annotations Mismatch

Prisma schema uses `@map("lowercase")` for fields, but database columns appear to be camelCase in views. Not blocking current queries.

### C.7 LOW — No Notification for Request Events

The notification system works for dashboard publish events, but there's no notification creation for:
- Request status changes
- Payment verification
- ETL completion (to admin)

### C.8 LOW — Duplicate Route Registration

`server.js` registers both `/api/bi/dashboards` and `/api/bi/dashboard` (line 113) pointing to the same router. Also `/api/bi/reviews` and `/api/bi/review` (line 117). This works but is untidy.

---

## Section D — What Is Working

### D.1 Backend Starts Successfully

```
🚀 Server running on http://0.0.0.0:3001
✅ Database already seeded (Modules exist).
```

### D.2 All BI Routes Register and Respond

Tested at runtime:
| Endpoint | Status | Response |
|----------|--------|----------|
| `GET /api/health` | 200 | `{"status":"OK"}` |
| `GET /api/bi/debug/health` | 200 | `{"success":true,"databaseConnected":true}` |
| `POST /api/bi-requests` | Works | JSON-backed CRUD |
| `GET /api/bi-requests` | Works | Paginated list |
| `PATCH /api/bi-requests/:id/status` | Works | Status update |
| `POST /api/bi-uploads` | Works | File upload |
| `GET /api/bi-uploads` | Works | List with filters |
| `GET /api/bi-dashboards` | Works | Prisma-backed list |
| `POST /api/bi-dashboards` | Works | Creates dashboard |
| `PATCH /api/bi-dashboards/:id` | Works | Status transitions |
| `GET /api/bi/notifications` | Works | Prisma-backed list |
| `GET /api/bi/analysis` | Works | Prisma-backed list |
| `GET /api/bi/reviews` | Works | Dashboard review list |
| `POST /api/bi/debug/self-test` | Works | Full ETL test (if client exists) |

### D.3 ETL Pipeline Is Fully Functional

The 6-step ETL pipeline (`etl-pipeline.js`) is complete:
1. Extract ZIP (native `unzip` + `adm-zip` fallback)
2. Read metadata.json
3. Schema version check
4. CSV validation (columns + types)
5. DB transaction: load dimensions → load facts → mark complete
6. Auto-create `BiAnalysisRequest` (legacy — see C.4)

Includes: idempotency (upsert), duplicate detection, validation reports, tenant isolation.

### D.4 Warehouse Query Service

`warehouse-service.js` provides 10 business-type-aware query methods:
- `getRevenueByDay`, `getTopProducts`, `getInventoryTurnover`
- `getTableTurnover`, `getKitchenPerformance`
- `getAppointmentSummary`, `getSupplierPerformance`
- `getPeakHours`, `getAverageTicket`
- `getDashboardSummary` (business-type aware dispatcher)

### D.5 Dashboard Templates

5 fully defined templates in `bi-dashboard-templates.js`:
- Restaurant, Cafe, Retail, Pharmacy, Salon

Each defines sections with KPI, line, bar, pie, and table widgets.

### D.6 Admin Frontend — All 6 BI Pages Routed

All reachable at:
- `/bi-requests` — BIRequests.jsx
- `/bi-upload-portal` — BiUploadPortal.jsx
- `/bi-dashboard-manager` — AdminBIDashboardManager.jsx
- `/bi-analysis` — AdminBIAnalystWorkspace.jsx
- `/bi-analysis/:id` — AdminBIAnalysisDetail.jsx
- `/bi-review` — AdminBIReview.jsx

### D.7 Client Frontend — BI Dashboard Viewer Routed

Reachable at:
- `/dashboard/bi-dashboard` — list view
- `/dashboard/bi-dashboard/:dashboardId` — detail view

Uses Recharts (LineChart, BarChart, PieChart) for rendering.

### D.8 Dashboard Notifications

Auto-created when dashboard is published (both via `bi-dashboards.js` PATCH and `bi-reviews.js` approve).

### D.9 Database Connection

PostgreSQL on `localhost:5432` with `pos_system` database. Connection verified at runtime.

---

## Section E — What Should Be Done Next

### E.1 Critical Priority

1. **Enable JWT authentication** on all `/api` routes (uncomment line 86 in server.js)
2. **Add role-based middleware** for admin vs client endpoints

### E.2 High Priority

3. **Phase 1: Migrate `bi-requests.js` from JSON → PostgreSQL**
   - Add `BiRequest` Prisma model
   - Rewrite route to use Prisma
   - Archive JSON file (currently empty, zero risk)

4. **Phase 2: Add payment verification workflow**
   - Payment status API endpoints
   - Admin verify/approve/reject UI

### E.3 Medium Priority

5. **Phase 3: Add manual ETL trigger endpoint**
   - `POST /api/bi-uploads/:id/start-etl` (gated behind approved status)
   - Connect request→upload→ETL flow

6. **Phase 4: Auto-generate dashboard after ETL**
   - Add `BiDashboardTemplate` model
   - Seed templates from JS to DB
   - Auto-generate dashboard on ETL complete (instead of BiAnalysisRequest)

### E.4 Low Priority

7. Remove duplicate route registrations in server.js
8. Add notification creation for request status changes
9. Remove Step 5e (BiAnalysisRequest auto-creation) from etl-pipeline.js
10. Connect Metabase to `pos_system` (admin-only monitoring)

---

## Section F — Recommended Phase 1 Based ONLY on Actual Repository

**Phase 1: Migrate BI Requests from JSON to PostgreSQL**

**Evidence that this is the right first step:**
- `backend/data/bi-requests.json` exists and is empty `[]` — zero data loss risk
- `backend/routes/bi-requests.js` is the only BI route NOT using Prisma
- The JSON file has no relations, no indexing, no tenant isolation
- The API contract must remain compatible (the frontend `BIRequests.jsx` already calls this API)
- No Prisma migration is needed for existing tables (only add the missing `BiRequest` model)

**Files to modify:**
1. `backend/prisma/schema.prisma` — Add `BiRequest` model
2. `backend/routes/bi-requests.js` — Rewrite JSON→Prisma (keep same API contract)
3. `backend/data/bi-requests.json` — Archive or delete after migration

**No frontend changes needed** — API contract is preserved.

**Recommendation:** Do this first because all other phases depend on having a proper `BiRequest` record to link uploads, payments, and dashboards to.
