# BI Admin Module — Complete Audit & Migration Report

> **Project**: Carthapos Admin Portal  
> **Scope**: Full-stack BI module audit (frontend + backend + ETL + database)  
> **Target**: Convert current upload/import flow into an ETL Management Console with 7-step wizard  

---

## Table of Contents

1. [Current Frontend Pages](#1-current-frontend-pages)  
2. [Current React Components](#2-current-react-components)  
3. [Current API Routes](#3-current-api-routes)  
4. [Current ETL Flow](#4-current-etl-flow)  
5. [Current Upload Flow](#5-current-upload-flow)  
6. [Current Processing Flow](#6-current-processing-flow)  
7. [Current Warehouse Loading Flow](#7-current-warehouse-loading-flow)  
8. [Current Database Models](#8-current-database-models)  
9. [Current Services](#9-current-services)  
10. [Current IPC/API Interactions](#10-current-ipcapi-interactions)  
11. [Problems with Current Architecture](#11-problems-with-current-architecture)  
12. [Target Architecture](#12-target-architecture)  
13. [Frontend Changes](#13-frontend-changes)  
14. [Backend Changes](#14-backend-changes)  
15. [Database Changes](#15-database-changes)  
16. [API Changes](#16-api-changes)  
17. [ETL Changes](#17-etl-changes)  
18. [Files to Modify](#18-files-to-modify)  
19. [Files to Remove](#19-files-to-remove)  
20. [Files to Create](#20-files-to-create)  
21. [Implementation Order](#21-implementation-order)  
22. [Estimated Complexity](#22-estimated-complexity)  

---

## 1. Current Frontend Pages

### 1.1 `BiUploadPortal.jsx` — `/bi-upload-portal`
| Attribute | Value |
|-----------|-------|
| **Purpose** | Upload BI ZIP files, trigger ETL, monitor processing progress |
| **Current behavior** | Single-page with upload form + history table + detail modal. Sub-components: `DetailModal`, `GenerateDashboardButton`, `StartEtlButton`, `AdminQuickApproveButton`. Auto-refreshes every 10s for active uploads. Upload uses XHR with progress bar. |
| **Verdict** | **REPLACE** |
| **Why** | The single-page + modal pattern cannot support the 7-step wizard flow. Needs to become the main entry point for the wizard with dedicated step components. The inline sub-components should become separate wizard steps. |

### 1.2 `BIRequests.jsx` — `/bi-requests`
| Attribute | Value |
|-----------|-------|
| **Purpose** | Manage incoming BI dashboard requests from clients with payment verification, approve/reject workflow |
| **Current behavior** | Paginated list with search, filter, sort. Each card shows request details, payment status, specialist notes. Supports: verify payment, reject payment, approve, reject, request-info. PATCH endpoints for each action. |
| **Verdict** | **MODIFY** |
| **Why** | The request workflow remains useful (clients still submit requests), but the flow changes: instead of approve→upload→ETL→analysis→dashboard, the new flow is upload→validate→preview→ETL→corrections→load. The request concept becomes optional — the admin can directly upload without a pre-existing request. |

### 1.3 `AdminBIAnalystWorkspace.jsx` — `/bi-analysis`
| Attribute | Value |
|-----------|-------|
| **Purpose** | BI analyst workspace to review completed uploads, start analysis, complete/reject |
| **Current behavior** | Lists analysis requests with PENDING/UNDER_ANALYSIS/COMPLETED/REJECTED states. Analyst can start, complete (auto-generates insights), reject, or reopen. |
| **Verdict** | **REPLACE** |
| **Why** | The analysis workspace concept is replaced by the Manual Corrections + Warehouse Preview steps. The analyst role is superseded by the admin directly managing corrections. The auto-generated insights will be shown in the Success Report step instead. |

### 1.4 `AdminBIAnalysisDetail.jsx` — `/bi-analysis/:id`
| Attribute | Value |
|-----------|-------|
| **Purpose** | Detailed view of a single analysis with warehouse metrics (Recharts), AI insights, analyst notes |
| **Current behavior** | Shows revenue charts (LineChart), top products (BarChart), peak hours, inventory table. AI insights generated on demand via POST generate-insights. Analyst notes textarea. |
| **Verdict** | **REPLACE** |
| **Why** | The charts/metrics/insights will be shown in the Warehouse Preview step (Step 4) and Success Report (Step 7). The analyst notes are replaced by the Manual Corrections step. |

### 1.5 `AdminBIReview.jsx` — `/bi-review`
| Attribute | Value |
|-----------|-------|
| **Purpose** | Dashboard review queue — approve or reject dashboards before publishing |
| **Current behavior** | Lists dashboards with READY_FOR_REVIEW status. Approve → PUBLISHED, Reject → DRAFT. Shows Preview button to view dashboard. |
| **Verdict** | **KEEP** |
| **Why** | The review/publish workflow is still valid after the warehouse loading step. Dashboards are generated after successful load, and they still need review before publishing. |

### 1.6 `AdminDashboardViewer.jsx` — `/bi-dashboard/:dashboardId`
| Attribute | Value |
|-----------|-------|
| **Purpose** | View a single published dashboard's metadata and Metabase link |
| **Current behavior** | Shows dashboard name, status, description, Metabase link, client info, timestamps |
| **Verdict** | **KEEP** |
| **Why** | Still needed for viewing published dashboards. No changes required. |

---

## 2. Current React Components

### 2.1 Layout components

| Component | Purpose | Verdict | Why |
|-----------|---------|---------|-----|
| `Layout.jsx` (sidebar) | Navigation with BI links | **KEEP** | Sidebar nav items for BI remain; may need to rename/restructure links |

### 2.2 Wizard sub-components (embedded in `BiUploadPortal.jsx`)

| Component | Purpose | Verdict | Why |
|-----------|---------|---------|-----|
| `DetailModal` | Show upload details, ETL progress, logs | **REPLACE** | Inline modal becomes Step 2-3 of wizard |
| `GenerateDashboardButton` | POST to generate dashboard from upload | **KEEP** (move) | Becomes part of Step 7 (Success Report) |
| `StartEtlButton` | POST to trigger ETL | **REPLACE** | Becomes Step 3 (Start ETL) of wizard |
| `AdminQuickApproveButton` | Quick admin approval for walk-in clients | **REMOVE** | No longer needed — the wizard replaces this concept |

### 2.3 Other reusable components

| Component | Purpose | Verdict | Why |
|-----------|---------|---------|-----|
| `MetricCard` (inline in AdminBIAnalysisDetail) | Display single metric | **KEEP** (move) | Reusable in Warehouse Preview and Success Report steps |

---

## 3. Current API Routes

### 3.1 `bi-uploads.js` (10 endpoints)
| Endpoint | Verdict | Why |
|----------|---------|-----|
| POST `/` (upload ZIP) | **MODIFY** | Upload is Step 1; validation/preview should be separate endpoints |
| GET `/` (list uploads) | **KEEP** | Still needed for upload history |
| GET `/:id` (upload detail) | **KEEP** | Still needed |
| GET `/:id/logs` (ETL logs) | **KEEP** | Still needed for Step 7 |
| GET `/:id/summary` (dashboard summary) | **REPLACE** | Warehouse preview needs richer data (tables, columns, rows, sample) |
| DELETE `/:id` (delete upload) | **KEEP** | Still needed |
| POST `/:id/cancel` (cancel) | **KEEP** | Still needed |
| GET `/clients/list` (client list) | **KEEP** | Still needed |
| POST `/:id/start-etl` (trigger ETL) | **REPLACE** | ETL needs phased execution: validate → preview → confirm → run |
| POST `/:id/admin-approve` (quick approve) | **REMOVE** | No longer needed — replaced by wizard flow |

### 3.2 `bi-analysis.js` (5 endpoints)
| Endpoint | Verdict | Why |
|----------|---------|-----|
| GET `/` (list analysis) | **REPLACE** | Replace with corrections/preview management |
| GET `/:id` (single analysis) | **REPLACE** | Replace with corrections/preview detail |
| GET `/:id/metrics` (warehouse metrics) | **REPLACE** | Becomes warehouse preview endpoint |
| PATCH `/:id` (update) | **REPLACE** | Becomes corrections save endpoint |
| POST `/:id/generate-insights` (AI) | **MOVE** | Becomes part of Success Report |

### 3.3 `bi-dashboards.js` (8 endpoints)
| Endpoint | Verdict | Why |
|----------|---------|-----|
| GET `/` (list) | **KEEP** | Still needed |
| POST `/` (create) | **KEEP** | Still needed |
| POST `/generate-from-upload` | **KEEP** | Still needed after warehouse load |
| GET `/:id` (detail) | **KEEP** | Still needed |
| PATCH `/:id` (update) | **KEEP** | Still needed |
| DELETE `/:id` (delete) | **KEEP** | Still needed |
| GET `/:id/metabase-link` | **KEEP** | Still needed |
| GET `/:id/embed` (embed info) | **KEEP** | Still needed |

### 3.4 `bi-dashboard-templates.js` (5 endpoints)
| All endpoints | **KEEP** | Template registry is still needed |

### 3.5 `bi-debug.js` (3 endpoints)
| All endpoints | **KEEP** (move) | Move to a more structured debug/health module |

### 3.6 `bi-notifications.js` (4 endpoints)
| All endpoints | **KEEP** | Notification system is still needed |

### 3.7 `bi-requests.js` (8 endpoints)
| All endpoints | **KEEP** (modify) | The request workflow simplifies but endpoints remain |

### 3.8 `bi-reviews.js` (3 endpoints)
| All endpoints | **KEEP** | Dashboard review workflow is unchanged |

---

## 4. Current ETL Flow

The ETL pipeline (`etl-pipeline.js`) is a monolithic `run()` method:

```
run(uploadId, zipPath)
  |
  ├── _extractZipSync(zipPath)          → Extract ZIP to temp dir
  ├── _inspectZip(extractDir)            → Debug log discovered files
  ├── _readMetadata(extractDir)          → Parse metadata.json
  ├── Client ID override                  → Use upload record's clientId
  ├── Schema version check               → Compare vs BiSchemaRegistry.BI_SCHEMA_VERSION
  ├── _validateDatasets(...)             → Read CSVs, validate headers/types
  ├── _printValidationReport(...)        → Debug print
  │
  └── prisma.$transaction({              → ATOMIC transaction
        ├── _loadDimensions(...)          → DimTime, DimClient, DimProduct, DimSupplier
        ├── _loadFacts(...)               → FactSale, FactInventory, FactAppointment, FactKitchenOrder
        ├── Mark BiProcessingJob COMPLETED
        ├── Mark BiUpload COMPLETED
        └── Create BiAnalysisRequest (PENDING)
      })
```

| Phase | Current | Target | Verdict |
|-------|---------|--------|---------|
| Extract ZIP | Single `_extractZipSync()` | **KEEP** | Works, but should be an explicit Step 2 action |
| Read metadata | Part of `run()` | **KEEP** | Needed for preview |
| Schema version check | Part of `run()` | **KEEP** | Prevent incompatible imports |
| Validate datasets | `_validateDatasets()` → {valid, errors[]} | **MODIFY** | Need richer validation: missing values, duplicates, type errors, warnings. Return validation report that drives Step 2 UI |
| Clean | **NONE** | **NEW** | New phase: remove invalid rows, fix data formats, handle nulls |
| Normalize | **NONE** | **NEW** | New phase: standardize categories, merge duplicates, normalize names |
| Transform | **NONE** | **NEW** | New phase: compute derived fields, aggregate, prepare for dimensions/facts |
| Build Dimensions | `_loadDimensions()` | **MODIFY** | Separate from load; allow preview before committing |
| Build Facts | `_loadFacts()` | **MODIFY** | Separate from load; allow preview before committing |
| Preview Warehouse | **NONE** | **NEW** | Show dimension/fact tables with rows, relationships, samples |
| Manual Corrections | **NONE** | **NEW** | Edit data before final load |
| Confirm Load | **NONE** | **NEW** | Confirmation step before INSERT/UPSERT/MERGE |
| Load Warehouse | Part of transaction | **MODIFY** | Move from automatic to manual trigger |
| ETL Logs | `_log()` writes to DB | **KEEP** | Still needed |
| Auto-create Analysis | At end of `run()` | **REMOVE** | No longer needed — replaced by Success Report |

**Overall ETL verdict**: **MODIFY** — Split monolithic `run()` into phased pipeline with explicit steps that can be previewed and confirmed independently.

---

## 5. Current Upload Flow

```
Admin opens BiUploadPortal.jsx
  |
  ├── Clicks "Importer un ZIP BI"
  ├── Selects .zip file
  ├── Enters clientId / businessType / requestId (optional)
  ├── POST /api/bi-uploads (multipart, with progress bar)
  │     ├── Multer saves to uploads/bi-zips/
  │     ├── SHA-256 hash computed
  │     ├── Duplicate check
  │     ├── Creates biUpload record (PENDING_PAYMENT_VERIFICATION)
  │     └── Returns upload metadata
  │
  ├── (For walk-in clients) Clicks "Admin Quick Approve"
  │     └── POST /api/bi-uploads/:id/admin-approve
  │           ├── Creates biRequest (APPROVED, payment VERIFIED)
  │           └── Links upload to request
  │
  ├── Clicks "Start ETL"
  │     └── POST /api/bi-uploads/:id/start-etl
  │           ├── Validates upload has APPROVED biRequest
  │           ├── Sets upload status to VALIDATING
  │           ├── Creates biProcessingJob (QUEUED)
  │           └── Fires etlPipeline.run() async (not awaited)
  │
  └── Detail modal shows ETL progress (auto-refresh 5s)
        ├── GET /api/bi-uploads/:id (poll for status)
        ├── GET /api/bi-uploads/:id/logs (poll for logs)
        └── When COMPLETED: "Generate Dashboard" button appears
              └── POST /api/bi/dashboards/generate-from-upload
```

**Target upload flow**:

```
Step 1: Upload ZIP
  └── POST /api/bi-uploads (multipart)
        └── Returns upload metadata + detected datasets

Step 2: Validate & Preview Package
  ├── GET /api/bi-uploads/:id/validation (validation report)
  └── GET /api/bi-uploads/:id/datasets (list of CSV files with row/column info)

Step 3: Preview Tables (per dataset)
  └── GET /api/bi-uploads/:id/datasets/:key/preview (paginated sample data)

Step 4: Start ETL (phased)
  ├── POST /api/bi-uploads/:id/etl/extract
  ├── GET  /api/bi-uploads/:id/etl/status (live phase updates)
  ├── POST /api/bi-uploads/:id/etl/validate
  ├── POST /api/bi-uploads/:id/etl/clean
  ├── POST /api/bi-uploads/:id/etl/normalize
  ├── POST /api/bi-uploads/:id/etl/transform
  ├── POST /api/bi-uploads/:id/etl/build-dimensions
  └── POST /api/bi-uploads/:id/etl/build-facts

Step 5: Preview Warehouse
  ├── GET /api/bi-warehouse/:clientId/dimensions (list dimension tables)
  ├── GET /api/bi-warehouse/:clientId/facts (list fact tables)
  └── GET /api/bi-warehouse/:clientId/:table/preview (paginated, filterable)

Step 6: Manual Corrections
  ├── GET /api/bi-warehouse/:clientId/:table/rows (paginated rows for editing)
  ├── PATCH /api/bi-warehouse/:clientId/:table/rows/:id (edit row)
  ├── POST /api/bi-warehouse/:clientId/:table/validate (re-run validation)
  └── DELETE /api/bi-warehouse/:clientId/:table/rows/:id (remove invalid row)

Step 7: Load Warehouse
  ├── POST /api/bi-warehouse/:clientId/load (execute INSERT/UPSERT/MERGE)
  └── GET /api/bi-warehouse/:clientId/load-result (rows loaded, updated, ignored)

Step 8: Success Report
  └── GET /api/bi-uploads/:id/report (full execution report)
```

---

## 6. Current Processing Flow

```
biUpload created (status: UPLOADED)
  |
  v
Admin starts ETL → status: VALIDATING
  |
  v
ETL pipeline runs → biProcessingJob: QUEUED → PROCESSING
  |
  v
On success → biUpload: COMPLETED, biProcessingJob: COMPLETED
  → BiAnalysisRequest auto-created (PENDING)
  |
  v
On failure → biUpload: FAILED, biProcessingJob: FAILED
  → Error message on upload record
```

**Target processing flow**:

```
biUpload created (status: UPLOADED)
  |
  v
Step 2: Validate → status: VALIDATED | FAILED
  (admin can preview datasets)
  |
  v
Step 4: ETL phases (status: EXTRACTING → VALIDATING → CLEANING → NORMALIZING → TRANSFORMING → BUILDING_DIMS → BUILDING_FACTS)
  |
  v
ETL complete → status: ETL_COMPLETED
  (warehouse tables populated, admin previews)
  |
  v
Step 6: Manual Corrections → admin edits data
  (status: CORRECTING, re-validates after edits)
  |
  v
Step 7: Load → status: LOADING → LOADED | LOAD_FAILED
  (INSERT/UPSERT/MERGE into warehouse)
  |
  v
Step 8: Report → status: COMPLETED
```

---

## 7. Current Warehouse Loading Flow

The warehouse loading is embedded within the ETL transaction:

```
prisma.$transaction({
  1. Find/Create BiProcessingJob (PROCESSING)
  2. _loadDimensions():
       - DimTime: create date entries for each sale date
       - DimClient: upsert by tenantId
       - DimProduct: upsert by (tenantId, productId)
       - DimSupplier: upsert by (tenantId, supplierId)
  3. _loadFacts():
       - FactSale: create with FK to DimClient, DimProduct, DimTime
       - FactInventory: create with FK to DimProduct, DimTime
       - FactAppointment: create with FK to DimTime
       - FactKitchenOrder: create with FK to DimTime
  4. Mark job COMPLETED
  5. Mark upload COMPLETED
  6. Auto-create BiAnalysisRequest
})
```

| Aspect | Current | Target |
|--------|---------|--------|
| **When** | Immediately during ETL | After admin confirms in Step 7 |
| **What** | Full dimension + fact load | Same, but with corrections applied |
| **How** | prisma.$transaction | Same transactional approach |
| **Rollback** | Not explicit | Add explicit rollback capability |
| **Preview** | None | Full preview before load |
| **Idempotency** | P2002 catch (skip duplicates) | UPSERT/MERGE with conflict handling |
| **Corrections** | None | Manual edits before final load |

**Verdict**: **MODIFY** — Split warehouse load into two phases:
1. **Staging load**: ETL populates staging tables (not final warehouse)
2. **Production load**: On admin confirmation, UPSERT from staging to warehouse

---

## 8. Current Database Models

### 8.1 BI Process Models (Phase 1)

| Model | Verdict | Why |
|-------|---------|-----|
| `BiRequest` | **KEEP** | Request workflow remains useful |
| `BiUpload` | **MODIFY** | Add new statuses for 7-step wizard (VALIDATED, ETL_COMPLETED, CORRECTING, LOADED) |
| `BiUploadFile` | **KEEP** | Track files within ZIP |
| `BiProcessingJob` | **MODIFY** | Track individual ETL phases instead of monolithic status |
| `BiProcessingLog` | **KEEP** | ETL audit trail |

### 8.2 BI Dashboard Models (Phase 2)

| Model | Verdict | Why |
|-------|---------|-----|
| `BiDashboard` | **KEEP** | Dashboard definitions unchanged |
| `BiDashboardTemplate` | **KEEP** | Template registry unchanged |
| `BiNotification` | **KEEP** | Notification system unchanged |

### 8.3 BI Analysis Models (Phase 3)

| Model | Verdict | Why |
|-------|---------|-----|
| `BiAnalysisRequest` | **REPLACE** | Replace with `BiCorrectionSession` — tracks manual corrections per upload |

### 8.4 Warehouse Tables (Star Schema)

| Model | Verdict | Why |
|-------|---------|-----|
| `DimClient` | **KEEP** | Core dimension |
| `DimProduct` | **KEEP** | Core dimension |
| `DimSupplier` | **KEEP** | Core dimension |
| `DimTime` | **KEEP** | Core dimension |
| `FactSale` | **KEEP** | Core fact |
| `FactInventory` | **KEEP** | Core fact |
| `FactAppointment` | **KEEP** | Core fact |
| `FactKitchenOrder` | **KEEP** | Core fact |

---

## 9. Current Services

### 9.1 `etl-pipeline.js`
| Aspect | Current | Target |
|--------|---------|--------|
| Structure | Monolithic `run()` method | Phased pipeline with individual steps |
| Phases | extract → validate → load | extract → validate → clean → normalize → transform → build_dims → build_facts |
| Transaction | Single atomic transaction | Per-phase with staging tables |
| Idempotency | P2002 catch | UPSERT/MERGE with full conflict resolution |
| Preview | None | Pre-load preview of dimensions + facts |
| Corrections | None | Editable correction workflow |
| **Verdict** | **MODIFY** — Major restructure |

### 9.2 `warehouse-service.js`
| Aspect | Current | Target |
|--------|---------|--------|
| Purpose | Read-only analytics queries | Read-only + correction endpoints |
| Isolation | tenantId filter | Same + correction tracking |
| Query types | Aggregated (revenue, top products, etc.) | Same + raw table browsing (paginated, filterable, searchable) |
| **Verdict** | **MODIFY** — Add preview/correction endpoints |

### 9.3 `bi-schema-registry.js`
| Aspect | Current | Target |
|--------|---------|--------|
| Schema version | `1.0.0` | Update to match POS `BiSchemaContract.cjs` v2.2.0 |
| Datasets | 9 (sales, products, customers, inventory, tables, kitchen_orders, suppliers, services, appointments) | 22 (match POS v2.2.0) |
| Validation | Column presence + type checking | Same + value constraints, uniqueness, referential integrity |
| **Verdict** | **MODIFY** — Sync schema with POS v2.2.0 |

### 9.4 `bi-insight-generator.js`
| Aspect | Current | Target |
|--------|---------|--------|
| Purpose | Generate AI insights from warehouse data | Same, but shown in Success Report step |
| Business types | restaurant, cafe, retail, pharmacy, salon | Same (expand if needed) |
| **Verdict** | **KEEP** — Move call to after warehouse load completes |

---

## 10. Current IPC/API Interactions

### 10.1 Admin Portal (`admin/`)
| Layer | Mechanism |
|-------|-----------|
| HTTP client | Axios (via `lib/api.js`) |
| Auth | `userId` from localStorage in request interceptor |
| Base URL | `VITE_API_URL` env var (default `http://localhost:3001/api`) |
| BI-specific | `biUploadsApi` convenience export with `getAll`, `getById`, `getLogs`, `getSummary`, `getClients`, `upload` |
| Error handling | Per-component try/catch with console.error |
| File upload | FormData with multer, onUploadProgress callback |
| Polling | setInterval(5-10s) for active upload monitoring |

### 10.2 Client Portal (`frontend/`)
| Layer | Mechanism |
|-------|-----------|
| HTTP client | Raw `fetch()` (not Axios) |
| Auth | Token from localStorage |
| Base URL | `VITE_API_URL` env var |
| File upload | XHR with `upload.onprogress` |
| Polling | setInterval(8s) for active upload monitoring |

### 10.3 Backend (`backend/`)
| Layer | Mechanism |
|-------|-----------|
| Framework | Express.js |
| Auth | JWT `verifyToken` — **DISABLED** (commented out) |
| Logging | morgan (combined/dev) |
| File upload | Multer (disk storage, 100MB limit) |
| Database | Prisma ORM (PostgreSQL) |
| ZIP extraction | `unzip` binary → fallback `adm-zip` |
| Server timeout | Custom 20-minute middleware |

**Verdict**: 
- Admin API client: **KEEP** — Axios is fine; add new endpoints for wizard steps
- Client portal: **MODIFY** — Standardize on Axios or create shared API client
- Backend auth: **MODIFY** — MUST enable JWT auth before production
- Backend file handling: **KEEP** — Multer works for upload

---

## 11. Problems with Current Architecture

### Critical
| # | Problem | Impact |
|---|---------|--------|
| P1 | **No authentication** on any BI endpoint | Anyone with API URL can access, upload, modify data |
| P2 | **Monolithic ETL** — no phased execution, no preview, no rollback | Admin cannot validate data before loading; errors are discovered only after warehouse is populated |
| P3 | **No manual corrections** — analysis workflow separated from corrections | Admin cannot fix bad data before warehouse load |
| P4 | **Schema version mismatch risk** — backend `bi-schema-registry.js` v1.0.0 vs POS `BiSchemaContract.cjs` v2.2.0 | Backend rejects or misinterprets POS v2.2.0 exports |

### Major
| # | Problem | Impact |
|---|---------|--------|
| P5 | **No package preview** — ETL runs immediately without showing datasets | Admin cannot verify which datasets are in the ZIP before processing |
| P6 | **No warehouse preview** — data loaded without admin confirmation | Errors require manual DB cleanup or re-upload |
| P7 | **No staging area** — ETL loads directly into warehouse | Cannot preview/correct before production tables are populated |
| P8 | **Auto-created BiAnalysisRequest** — unused artifact after ETL | Database clutter, no clear purpose |
| P9 | **Client portal uses raw fetch** — inconsistent with admin's Axios | Duplicate code, different error handling patterns |

### Minor
| # | Problem | Impact |
|---|---------|--------|
| P10 | **AdminQuickApprove** — creates synthetic biRequest for walk-ins | Workaround for missing direct upload flow |
| P11 | **Polling-based status** — 5-10s intervals for ETL progress | Inefficient, should use Server-Sent Events or WebSockets |
| P12 | **Insufficient ETL phase granularity** — only QUEUED/PROCESSING/COMPLETED/FAILED | Admin cannot see which sub-phase (cleaning, normalizing, etc.) is active |
| P13 | **No deduplication strategy** — P2002 catch skips duplicates silently | Data loss risk — admin not notified of skipped rows |
| P14 | **server.js and server-v2.js** — two server entry points | Confusion about which is active; maintenance burden |

---

## 12. Target Architecture

```
BI PORTAL (ETL Management Console)
═══════════════════════════════════

Step 1: Upload BI ZIP
  │
  ├── File picker (.zip)
  ├── Client selector
  ├── Upload progress
  └── Initial dataset detection
       │
       v
Step 2: Validate & Preview Package
  │
  ├── File manifest (filenames, sizes)
  ├── Metadata display (business type, client, export date, schema version)
  ├── Dataset overview (rows, columns, detected)
  ├── Validation status per dataset (✅ valid / ❌ errors / ⚠️ warnings)
  ├── Missing values summary
  ├── Duplicate rows summary
  └── "Proceed to ETL" button
       │
       v
Step 3: ETL Pipeline (Live Phases)

  ┌──────────────────────────────────────┐
  │  Extracting...    [████████░░]  80%  │
  │  Reading CSV...   [████████░░]  80%  │
  │  Parsing...       [████████░░]  80%  │
  │  Cleaning...      [████░░░░░░]  40%  │
  │  Normalizing...   [░░░░░░░░░░]   0%  │
  │  Transforming...  [░░░░░░░░░░]   0%  │
  │  Building Dims... [░░░░░░░░░░]   0%  │
  │  Building Facts.. [░░░░░░░░░░]   0%  │
  │  Preparing WH...  [░░░░░░░░░░]   0%  │
  └──────────────────────────────────────┘
       │
       v
Step 4: Warehouse Preview
  │
  ├── Dimension tables tab
  │     ├── DimClient (rows, columns, sample data)
  │     ├── DimProduct (rows, columns, sample data)
  │     ├── DimSupplier (rows, columns, sample data)
  │     └── DimTime (rows, columns, sample data)
  │
  ├── Fact tables tab
  │     ├── FactSale (rows, columns, sample data)
  │     ├── FactInventory (rows, columns, sample data)
  │     ├── FactAppointment (rows, columns, sample data)
  │     └── FactKitchenOrder (rows, columns, sample data)
  │
  ├── Schema diagram (relationships, foreign keys)
  ├── Search, filter, pagination on all tables
  └── "Proceed to Corrections" button
       │
       v
Step 5: Manual Corrections
  │
  ├── Per-table editable data grid
  ├── Fix: customer name, product category, VAT, supplier
  ├── Merge duplicates
  ├── Delete invalid rows
  ├── Mark ignored rows
  ├── Re-run validation after edits
  └── "Proceed to Load" button
       │
       v
Step 6: Load Warehouse
  │
  ├── Confirmation dialog
  ├── Execute INSERT / UPSERT / MERGE
  ├── Progress bar
  └── Error handling with rollback option
       │
       v
Step 7: Success Report
  │
  ├── Rows Loaded
  ├── Rows Updated
  ├── Rows Ignored
  ├── Warnings
  ├── Errors
  ├── Execution Time
  ├── Warehouse Statistics
  ├── AI-generated Insights
  └── "Generate Dashboard" button
```

### Frontend Architecture

```
pages/
  BiWizard.jsx              ← NEW — Main wizard container (replaces BiUploadPortal.jsx)
  ├── steps/
  │   ├── Step1Upload.jsx       ← NEW
  │   ├── Step2ValidatePreview.jsx  ← NEW
  │   ├── Step3EtlPipeline.jsx  ← NEW
  │   ├── Step4WarehousePreview.jsx  ← NEW
  │   ├── Step5ManualCorrections.jsx  ← NEW
  │   ├── Step6LoadWarehouse.jsx  ← NEW
  │   └── Step7SuccessReport.jsx  ← NEW
  │
  ├── AdminBIReview.jsx         ← KEEP (unchanged)
  └── AdminDashboardViewer.jsx  ← KEEP (unchanged)

  BiRequests.jsx                ← MODIFY (adapt to new flow)
```

### Backend Architecture

```
routes/
  bi-uploads.js                 ← MODIFY (add validation, preview, ETL phase endpoints)
  bi-warehouse.js               ← NEW (warehouse preview, corrections, load)
  bi-analysis.js                ← REMOVE (replaced by corrections workflow)
  bi-dashboards.js              ← KEEP
  bi-dashboard-templates.js     ← KEEP
  bi-debug.js                   ← KEEP (move)
  bi-notifications.js           ← KEEP
  bi-requests.js                ← KEEP (simplify)
  bi-reviews.js                 ← KEEP

services/
  etl-pipeline.js               ← MODIFY (phased pipeline)
  warehouse-service.js          ← MODIFY (add preview/correction methods)
  bi-schema-registry.js         ← MODIFY (sync to v2.2.0)
  bi-insight-generator.js       ← KEEP
  bi-corrections-service.js     ← NEW (correction session management)
```

---

## 13. Frontend Changes

### New files to create
| File | Purpose |
|------|---------|
| `src/pages/BiWizard.jsx` | Main wizard container with step state management |
| `src/pages/steps/Step1Upload.jsx` | Upload ZIP file with client selection, progress bar |
| `src/pages/steps/Step2ValidatePreview.jsx` | Package validation report, dataset list, metadata display |
| `src/pages/steps/Step3EtlPipeline.jsx` | Live ETL phase display with progress bars |
| `src/pages/steps/Step4WarehousePreview.jsx` | Table browser with search, filter, pagination, schema diagram |
| `src/pages/steps/Step5ManualCorrections.jsx` | Editable data grid with validation re-run |
| `src/pages/steps/Step6LoadWarehouse.jsx` | Confirmation dialog, execution progress, rollback |
| `src/pages/steps/Step7SuccessReport.jsx` | Execution report, warehouse statistics, insights, generate dashboard |
| `src/lib/warehouseApi.js` | API client for warehouse preview/correction endpoints |

### Existing files to modify
| File | Change |
|------|--------|
| `src/App.jsx` | Add `/bi-wizard` route; update existing BI routes |
| `src/components/layout/Layout.jsx` | Update sidebar navigation; rename links |
| `src/lib/api.js` | Add warehouse API methods |

### Existing files to keep (no changes)
| File | Reason |
|------|--------|
| `src/pages/AdminBIReview.jsx` | Dashboard review workflow unchanged |
| `src/pages/AdminDashboardViewer.jsx` | Dashboard viewer unchanged |
| `src/pages/BIRequests.jsx` | Minor modifications only |

### Existing files to remove
| File | Reason |
|------|--------|
| `src/pages/BiUploadPortal.jsx` | Replaced by BiWizard |
| `src/pages/AdminBIAnalystWorkspace.jsx` | Replaced by manual corrections + warehouse preview |
| `src/pages/AdminBIAnalysisDetail.jsx` | Replaced by warehouse preview + success report |

---

## 14. Backend Changes

### New files to create
| File | Purpose |
|------|---------|
| `routes/bi-warehouse.js` | Endpoints for warehouse preview, corrections, load |
| `services/bi-corrections-service.js` | Correction session management, validation re-run |

### Existing files to modify
| File | Change |
|------|--------|
| `routes/bi-uploads.js` | Add: validation report, dataset preview, ETL phase endpoints. Remove: admin-approve, start-etl (replace with phased endpoints) |
| `services/etl-pipeline.js` | Rewrite from monolithic `run()` to phased pipeline with individual step methods |
| `services/warehouse-service.js` | Add: table preview (paginated, filtered), row edit, row delete, staging load |
| `services/bi-schema-registry.js` | Sync schemas to match POS v2.2.0 (22 datasets instead of 9) |
| `server.js` | Add `/api/bi/warehouse` route mount; enable JWT auth |

### Existing files to keep (no changes)
| File | Reason |
|------|--------|
| `routes/bi-dashboards.js` | Dashboard management unchanged |
| `routes/bi-dashboard-templates.js` | Template registry unchanged |
| `routes/bi-debug.js` | Debug utilities unchanged |
| `routes/bi-notifications.js` | Notification system unchanged |
| `routes/bi-reviews.js` | Review workflow unchanged |
| `services/bi-insight-generator.js` | Insight generator unchanged (call moved to Success Report) |

### Existing files to remove
| File | Reason |
|------|--------|
| `routes/bi-analysis.js` | Replaced by bi-warehouse.js corrections + bi-corrections-service.js |

---

## 15. Database Changes

### Schema changes
| Change | Type | Details |
|--------|------|---------|
| Add `BiUpload.status` values | ENUM extension | Add: `VALIDATED`, `ETL_COMPLETED`, `CORRECTING`, `LOADED`, `LOAD_FAILED` |
| Add `BiProcessingJob.phases` | JSON column | Track per-phase status with timestamps |
| Add `BiCorrectionSession` | NEW MODEL | Replaces `BiAnalysisRequest`. Fields: `id`, `uploadId`, `status`, `corrections[]`, `createdAt`, `updatedAt` |
| Add staging tables | NEW MODELS | `StgSale`, `StgInventory`, `StgProduct`, `StgCustomer`, etc. Mirror warehouse structure for pre-load preview |
| `BiAnalysisRequest` | DROP | Replace with `BiCorrectionSession` |

### Staging model design
```
StgSale              StgInventory         StgProduct
├── id (PK)          ├── id (PK)          ├── id (PK)
├── uploadId (FK)    ├── uploadId (FK)    ├── uploadId (FK)
├── saleId           ├── productId        ├── productId
├── total            ├── productName      ├── name
├── tax              ├── stock            ├── category
├── discount         ├── price            ├── family
├── paymentMethod    ├── timesSold        ├── price
├── createdAt        ├── createdAt        ├── createdAt
├── _correction*     ├── _correction*     ├── _correction*
└── _ignored*        └── _ignored*        └── _ignored*
```
`*_correction`: JSON column storing manual edit metadata  
`*_ignored`: boolean flag to exclude from final load

---

## 16. API Changes

### New endpoints
| Method | Path | Step | Purpose |
|--------|------|------|---------|
| GET | `/api/bi-uploads/:id/validation` | 2 | Return validation report (errors, warnings, missing values, duplicates) |
| GET | `/api/bi-uploads/:id/datasets` | 2 | List datasets with row/column counts |
| GET | `/api/bi-uploads/:id/datasets/:key/preview` | 2 | Paginated sample data for a dataset |
| POST | `/api/bi-uploads/:id/etl/extract` | 3 | Start extraction phase |
| POST | `/api/bi-uploads/:id/etl/validate` | 3 | Start validation phase |
| POST | `/api/bi-uploads/:id/etl/clean` | 3 | Start cleaning phase |
| POST | `/api/bi-uploads/:id/etl/normalize` | 3 | Start normalization phase |
| POST | `/api/bi-uploads/:id/etl/transform` | 3 | Start transformation phase |
| POST | `/api/bi-uploads/:id/etl/build-dimensions` | 3 | Start dimension building |
| POST | `/api/bi-uploads/:id/etl/build-facts` | 3 | Start fact building |
| GET | `/api/bi-uploads/:id/etl/status` | 3 | Get current ETL phase status |
| GET | `/api/bi-warehouse/:clientId/dimensions` | 4 | List dimension tables |
| GET | `/api/bi-warehouse/:clientId/facts` | 4 | List fact tables |
| GET | `/api/bi-warehouse/:clientId/:table/preview` | 4 | Paginated table preview with search/filter |
| GET | `/api/bi-warehouse/:clientId/:table/schema` | 4 | Table schema (columns, types, FKs) |
| GET | `/api/bi-warehouse/:clientId/relationships` | 4 | Dimension-fact relationship diagram data |
| GET | `/api/bi-corrections/:uploadId` | 5 | Get correction session |
| GET | `/api/bi-corrections/:uploadId/:table/rows` | 5 | Paginated rows for correction |
| PATCH | `/api/bi-corrections/:uploadId/:table/rows/:id` | 5 | Edit a specific row |
| DELETE | `/api/bi-corrections/:uploadId/:table/rows/:id` | 5 | Delete/ignore a row |
| POST | `/api/bi-corrections/:uploadId/:table/merge-duplicates` | 5 | Merge duplicate rows |
| POST | `/api/bi-corrections/:uploadId/re-validate` | 5 | Re-run validation after corrections |
| POST | `/api/bi-warehouse/:clientId/load` | 6 | Execute warehouse load from staging |
| GET | `/api/bi-warehouse/:clientId/load/status` | 6 | Load execution status |
| POST | `/api/bi-warehouse/:clientId/load/rollback` | 6 | Rollback failed load |
| GET | `/api/bi-uploads/:id/report` | 7 | Full execution report |
| GET | `/api/bi-warehouse/:clientId/statistics` | 7 | Warehouse statistics (rows per table, etc.) |

### Modified endpoints
| Method | Path | Change |
|--------|------|--------|
| POST | `/api/bi-uploads` | Add: auto-detect datasets from ZIP metadata. Return: detected datasets list. |
| GET | `/api/bi-uploads` | Add: filter by ETL status values |
| GET | `/api/bi-uploads/:id/summary` | **REPLACE**: Now returns full warehouse preview data instead of dashboard summary |

### Removed endpoints
| Method | Path | Reason |
|--------|------|--------|
| POST | `/api/bi-uploads/:id/admin-approve` | Replaced by direct wizard flow |
| POST | `/api/bi-uploads/:id/start-etl` | Replaced by phased ETL endpoints |
| All | `/api/bi/analysis/*` | Replaced by corrections + warehouse endpoints |

---

## 17. ETL Changes

### Current monolithic pipeline
```
EtlPipeline.run(uploadId, zipPath)
  → Extract → Validate → Load Dimensions → Load Facts → Complete
```

### Target phased pipeline
```
EtlPipeline
  .extract(uploadId, zipPath)      → Extract ZIP, read metadata, discover datasets
  .validate(uploadId)               → Validate schemas, detect duplicates/missing
  .clean(uploadId)                  → Remove invalid rows, fix formats, handle nulls
  .normalize(uploadId)              → Standardize categories, merge duplicates, normalize names
  .transform(uploadId)              → Compute derived fields, prepare for dims/facts
  .buildDimensions(uploadId)        → Populate DimTime, DimClient, DimProduct, DimSupplier (staging)
  .buildFacts(uploadId)             → Populate FactSale, FactInventory, FactAppointment, FactKitchenOrder (staging)
```

### Key architectural changes
| Aspect | Current | Target |
|--------|---------|--------|
| Execution model | Monolithic `run()` | Per-phase methods callable independently |
| Rollback | None (transaction fails → all fails) | Per-phase rollback capability |
| Staging | Loads directly into warehouse | Loads into staging tables first |
| Preview | After load (too late) | Before load (in staging) |
| Corrections | None | Edit staging data before production load |
| Status granularity | QUEUED/PROCESSING/COMPLETED/FAILED | Per-phase status: IDLE/RUNNING/COMPLETED/FAILED |
| Progress reporting | None (binary: done/not done) | Rich phase-level progress (0-100%) |
| Idempotency | P2002 catch (silent skip) | Explicit UPSERT/MERGE with conflict reporting |

### New staging service

The staging service manages pre-load data:
- Creates staging tables from CSV data
- Applies corrections (edits, deletes, merges)
- Re-runs validation after corrections
- Executes production load (INSERT/UPSERT/MERGE into warehouse)
- Supports rollback via transaction savepoints

---

## 18. Files to Modify

### Frontend (admin/)
| # | File | Change Type | Complexity |
|---|------|-------------|------------|
| 1 | `src/App.jsx` | Add wizard routes, update existing | Low |
| 2 | `src/components/layout/Layout.jsx` | Update sidebar navigation | Low |
| 3 | `src/lib/api.js` | Add warehouse API methods | Medium |

### Backend (backend/)
| # | File | Change Type | Complexity |
|---|------|-------------|------------|
| 4 | `routes/bi-uploads.js` | Add validation/preview/ETL phase endpoints; remove admin-approve | High |
| 5 | `services/etl-pipeline.js` | Rewrite to phased pipeline | **Very High** |
| 6 | `services/warehouse-service.js` | Add table preview, corrections, staging load | High |
| 7 | `services/bi-schema-registry.js` | Sync to v2.2.0 (22 datasets) | Medium |
| 8 | `server.js` | Add warehouse route mount; enable JWT | Low |

### Database
| # | Change | Complexity |
|---|--------|------------|
| 9 | Prisma schema: add `BiCorrectionSession` model | Medium |
| 10 | Prisma schema: add staging table models | High |
| 11 | Prisma schema: extend `BiUpload.status` enum | Low |
| 12 | Prisma schema: add `BiProcessingJob.phases` JSON | Low |
| 13 | Prisma schema: drop `BiAnalysisRequest` | Low |
| 14 | Migration script for new models | Medium |

---

## 19. Files to Remove

| # | File | Reason |
|---|------|--------|
| 1 | `admin/src/pages/BiUploadPortal.jsx` | Replaced by BiWizard + steps |
| 2 | `admin/src/pages/AdminBIAnalystWorkspace.jsx` | Replaced by corrections workflow |
| 3 | `admin/src/pages/AdminBIAnalysisDetail.jsx` | Replaced by warehouse preview + success report |
| 4 | `backend/routes/bi-analysis.js` | Replaced by bi-warehouse.js |

---

## 20. Files to Create

| # | File | Purpose | Complexity |
|---|------|---------|------------|
| 1 | `admin/src/pages/BiWizard.jsx` | Main wizard container | High |
| 2 | `admin/src/pages/steps/Step1Upload.jsx` | Upload step | Medium |
| 3 | `admin/src/pages/steps/Step2ValidatePreview.jsx` | Validation/preview step | High |
| 4 | `admin/src/pages/steps/Step3EtlPipeline.jsx` | ETL live phases step | High |
| 5 | `admin/src/pages/steps/Step4WarehousePreview.jsx` | Warehouse preview step | **Very High** |
| 6 | `admin/src/pages/steps/Step5ManualCorrections.jsx` | Corrections step | **Very High** |
| 7 | `admin/src/pages/steps/Step6LoadWarehouse.jsx` | Load step | Medium |
| 8 | `admin/src/pages/steps/Step7SuccessReport.jsx` | Success report step | Medium |
| 9 | `admin/src/lib/warehouseApi.js` | Warehouse API client | Medium |
| 10 | `backend/routes/bi-warehouse.js` | Warehouse preview/correction endpoints | High |
| 11 | `backend/services/bi-corrections-service.js` | Correction session management | High |

---

## 21. Implementation Order

### Phase 1 — Schema & ETL Foundation (Days 1-3)
1. **Update Prisma schema**: add staging models, `BiCorrectionSession`, extend enums, drop `BiAnalysisRequest`
2. **Run migration**: generate and apply Prisma migration
3. **Sync `bi-schema-registry.js`** to POS v2.2.0 (22 datasets with full column definitions)
4. **Rewrite `etl-pipeline.js`**: separate monolithic `run()` into phased methods
5. **Create `bi-corrections-service.js`**: correction session CRUD + validation re-run

### Phase 2 — Backend API (Days 4-6)
6. **Modify `routes/bi-uploads.js`**: add validation/preview/ETL phase endpoints
7. **Create `routes/bi-warehouse.js`**: warehouse preview, corrections, load endpoints
8. **Modify `warehouse-service.js`**: add staging preview, corrections, production load
9. **Update `server.js`**: mount new routes, enable JWT auth

### Phase 3 — Frontend Wizard (Days 7-11)
10. **Create `BiWizard.jsx`**: wizard container with step navigation and state management
11. **Create `Step1Upload.jsx`**: file upload with client selection, dataset detection
12. **Create `Step2ValidatePreview.jsx`**: validation report, metadata display
13. **Create `Step3EtlPipeline.jsx`**: live phase display with progress bars
14. **Create `Step4WarehousePreview.jsx`**: table browser with search/filter/pagination
15. **Create `Step5ManualCorrections.jsx`**: editable data grid with validation
16. **Create `Step6LoadWarehouse.jsx`**: confirmation dialog with progress
17. **Create `Step7SuccessReport.jsx`**: execution report with insights
18. **Create `warehouseApi.js`**: API client library

### Phase 4 — Integration & Cleanup (Days 12-14)
19. **Update `App.jsx`**: add wizard routes, update navigation
20. **Update `Layout.jsx`**: sidebar navigation changes
21. **Remove deprecated files**: BiUploadPortal, AdminBIAnalystWorkspace, AdminBIAnalysisDetail, bi-analysis.js
22. **Enable JWT auth**: test all endpoints with authentication
23. **End-to-end testing**: full wizard flow with test ZIP files
24. **Performance testing**: large ZIP files, concurrent uploads

---

## 22. Estimated Complexity

| Area | Files | Complexity | Estimated Effort |
|------|-------|------------|------------------|
| Database schema | 5 model changes | Medium | 1 day |
| Backend ETL | 1 rewrite + 1 new service | **Very High** | 3-4 days |
| Backend API | 2 modify + 1 new route | High | 2-3 days |
| Frontend wizard | 9 new files | **Very High** | 5-7 days |
| Frontend cleanup | 3 remove + 3 modify | Low | 0.5 day |
| Auth enablement | 1 file | Low | 0.5 day |
| Testing | All of the above | High | 2-3 days |

**Total estimated effort**: 14-18 developer days  

**Risk factors**:
- ETL rewrite has the highest risk due to complexity of staged vs direct loading
- Manual corrections data grid is the most complex frontend component
- Schema version sync may reveal breaking changes if POS v2.2.0 has incompatible column changes
- JWT auth enablement may require additional work if token validation is incomplete

---

## Summary Verdict Table

| Component | Verdict | New files | Modified files | Removed files |
|-----------|---------|-----------|----------------|---------------|
| Admin frontend pages | 2 KEEP, 1 MODIFY, 3 REPLACE | 9 | 3 | 3 |
| Admin React components | 2 KEEP, 1 REMOVE | 0 | 0 | 0 (inline) |
| Backend API routes | 5 KEEP, 1 MODIFY, 1 REMOVE, 1 NEW | 1 | 1 | 1 |
| Backend services | 1 KEEP, 3 MODIFY, 1 NEW | 1 | 3 | 0 |
| Database models | 8 KEEP, 2 MODIFY, 1 REPLACE, 8+ NEW staging | migration | schema.prisma | BiAnalysisRequest |
| ETL pipeline | MODIFY | 0 | 1 | 0 |
| API interactions | KEEP (Axios) | 1 | 1 | 0 |
| Authentication | MODIFY (enable) | 0 | 1 | 0 |

**Legend**: KEEP = no changes needed; MODIFY = edit existing; REPLACE = remove and recreate; REMOVE = delete; NEW = create
