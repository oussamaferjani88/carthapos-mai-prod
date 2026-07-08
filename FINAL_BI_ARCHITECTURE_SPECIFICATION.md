# FINAL BI ARCHITECTURE SPECIFICATION

> **Project:** CarthaPOS — BI Module  
> **Status:** Pre-Implementation — Architecture Approved  
> **Date:** 2026-06-19  
> **Version:** 1.0.0  

---

## Table of Contents

1. [Current State Inventory](#1-current-state-inventory)
2. [Unified BI Workflow](#2-unified-bi-workflow)
3. [Client Side Design](#3-client-side-design)
4. [Admin Side Design](#4-admin-side-design)
5. [Database Architecture](#5-database-architecture)
6. [API Architecture](#6-api-architecture)
7. [Dashboard Generation Strategy](#7-dashboard-generation-strategy)
8. [Metabase Strategy](#8-metabase-strategy)
9. [Notifications](#9-notifications)
10. [Security Review](#10-security-review)
11. [Final Implementation Roadmap](#11-final-implementation-roadmap)

---

## 1. Current State Inventory

### 1.1 BI Pages — Admin Frontend

| Page | File | Route | Status | Recommendation |
|------|------|-------|--------|----------------|
| **Demandes BI** | `admin/src/pages/BIRequests.jsx` | `/bi-requests` | ✅ Routed, works | **KEEP** — Rename to "BI Requests" |
| **Upload Portal** | `admin/src/pages/BiUploadPortal.jsx` | `/bi-upload-portal` | ❌ In WORK only, not copied | **KEEP** — Copy to REPO in Phase 3 |
| **Dashboard Manager** | `admin/src/pages/AdminBIDashboardManager.jsx` | `/bi-dashboard-manager` | ❌ Not routed (file exists) | **KEEP** — Route in Phase 4 |
| **Analyst Workspace** | `admin/src/pages/AdminBIAnalystWorkspace.jsx` | `/bi-analysis` | ❌ Not routed (file exists) | **MERGE** — Combine with Dashboard Manager |
| **Analysis Detail** | `admin/src/pages/AdminBIAnalysisDetail.jsx` | `/bi-analysis/:id` | ❌ Not routed (file exists) | **MERGE** — Fold metrics into Dashboard Manager |
| **Validation/Review** | `admin/src/pages/AdminBIReview.jsx` | `/bi-review` | ❌ Not routed (file exists) | **KEEP** — Rename to "Dashboard Validation" |

### 1.2 BI Pages — Client Frontend

| Page | File | Route | Status | Recommendation |
|------|------|-------|--------|----------------|
| **Dashboard (with BI form)** | `frontend/src/pages/dashboard/Dashboard.tsx` | `/dashboard` | ✅ Routed, works | **KEEP** — BI request form embedded in dialog |
| **Dashboard Viewer** | `frontend/src/pages/dashboard/BIDashboardViewer.tsx` | (none) | ❌ Not routed (file exists) | **KEEP** — Route in Phase 5 |

### 1.3 BI Routes — Backend

| File | Endpoints | Status | Recommendation |
|------|-----------|--------|----------------|
| `bi-requests.js` | `POST /, GET /, GET /:id, PATCH /:id/status` | ✅ Works (JSON file) | **REWRITE** — JSON→PostgreSQL (Phase 1) |
| `bi-uploads.js` (copied from WORK) | `POST /, GET /, GET /:id, GET /:id/logs, GET /:id/summary, DELETE /:id, POST /:id/cancel, GET /clients/list` | ✅ Works (Prisma) | **KEEP** — Add `POST /:id/start-etl` (Phase 3) |
| `bi-dashboards.js` | `GET /, GET /templates, GET /:id, POST /, PATCH /:id, DELETE /:id, GET /:dashboardId/data` | ✅ Works (Prisma) | **KEEP** — Add auto-generate (Phase 4) |
| `bi-reviews.js` | `GET /, PATCH /:id/approve, PATCH /:id/reject` | ✅ Works (Prisma) | **KEEP** — Already matches target workflow |
| `bi-analysis.js` | `GET /, GET /:id, GET /:id/metrics, PATCH /:id, POST /:id/generate-insights` | ✅ Works (Prisma) | **DEPRECATE** — Fold into Dashboard Manager |
| `bi-notifications.js` | `GET /, PATCH /:id/read, POST /read-all, GET /unread-count` | ✅ Works (Prisma) | **KEEP** |
| `bi-debug.js` (copied from WORK) | `GET /health, POST /retry/:id, POST /self-test` | ✅ Works (Prisma) | **KEEP** — Dev-only, not for production |

### 1.4 BI Services — Backend

| Service | Status | Recommendation |
|---------|--------|----------------|
| `warehouse-service.js` | ✅ Copied, works (Prisma) | **KEEP** — 10 tenant-isolated query methods |
| `bi-schema-registry.js` | ✅ Copied, works (pure JS) | **KEEP** — CSV schema validation |
| `bi-dashboard-templates.js` | ✅ Works (pure JS, 5 templates) | **KEEP** — Phase 4 migrate to DB |
| `bi-insight-generator.js` | ✅ Works (Prisma) | **KEEP** — Rule-based insight generation |
| `etl-pipeline.js` | ✅ Works (Prisma) | **KEEP** — 6-step ETL pipeline |

### 1.5 BI Database Tables (Prisma)

| Table | Status | Recommendation |
|-------|--------|----------------|
| `bi_uploads` | ✅ Exists | **MODIFY** — Add `licenseId` column |
| `bi_upload_files` | ✅ Exists | **KEEP** |
| `bi_processing_jobs` | ✅ Exists | **KEEP** |
| `bi_processing_logs` | ✅ Exists | **KEEP** |
| `bi_dashboards` | ✅ Exists | **MODIFY** — Add `templateId` column |
| `bi_notifications` | ✅ Exists | **KEEP** |
| `bi_analysis_requests` | ✅ Exists | **DEPRECATE** — Functionality absorbed by dashboard flow |
| (missing) `bi_requests` | ❌ JSON file | **CREATE** — Phase 1 |
| (missing) `bi_dashboard_templates` | ❌ Hardcoded JS | **CREATE** — Phase 4 |

### 1.6 ETL Components

| Component | File | Status | Recommendation |
|-----------|------|--------|----------------|
| 6-step pipeline | `etl-pipeline.js` | ✅ Works | **KEEP** — Add manual trigger wrapper |
| ZIP extraction | _extractZipSync | ✅ Uses native unzip, fallback adm-zip | **KEEP** |
| Metadata parsing | _readMetadata | ✅ Reads metadata.json | **KEEP** |
| Schema validation | _validateDatasets | ✅ Uses BiSchemaRegistry | **KEEP** |
| Dimension loading | _loadDimensions | ✅ Upserts dim_clients/products/suppliers/time | **KEEP** |
| Fact loading | _loadFacts | ✅ Upserts fact_sales/inventory/appointments/kitchen_orders | **KEEP** |
| Job tracking | _log + upsert job | ✅ Creates processing logs | **KEEP** |
| Analysis auto-create | Step 5e | Creates BiAnalysisRequest | **REMOVE** — Auto-generate dashboard instead |

### 1.7 Metabase Integration Points

| Point | Location | Status | Recommendation |
|-------|----------|--------|----------------|
| Metabase JAR | `D:\Carthapos\metabase\metabase.jar` | ✅ Installed, running on port 3000 | **KEEP** — Admin-only |
| Database connection | N/A | ❌ Connected to own `metabase` DB, not `pos_system` | **RECONFIGURE** |
| Embedded dashboards | N/A | ❌ No embedding code anywhere | **NOT NEEDED** — Use React |
| SQL views | `v_sales`, `v_revenue_daily`, etc. | ✅ Created in `pos_system` | **KEEP** — For Metabase admin queries |

---

## 2. Unified BI Workflow

### 2.1 Complete Lifecycle

```
REQUEST_CREATED
    │  (Client submits BI request via POS Dashboard)
    ▼
PENDING_PAYMENT_VERIFICATION
    │  (Client uploads ZIP file)
    │  (Status set on bi_upload, linked to bi_request)
    ▼
PAYMENT_VERIFIED
    │  (Admin manually marks payment as verified)
    ▼
APPROVED
    │  (Admin approves the request)
    ▼
ETL_PENDING
    │  (Admin clicks "Start ETL")
    ▼
ETL_RUNNING
    │  (Pipeline: extract → validate → transform → load)
    ▼
ETL_COMPLETED
    │  (Warehouse tables populated)
    ▼
DASHBOARD_GENERATED
    │  (System auto-generates dashboard from business-type template)
    ▼
READY_FOR_REVIEW
    │  (Admin customizes dashboard layout, KPIs, charts)
    ▼
PUBLISHED
    │  (Admin publishes — notification sent to client)
    ▼
CLIENT_VIEWING
    │  (Client logs in, views dashboard in POS)
```

### 2.2 Transitions

| # | From | To | Trigger | Who | API Endpoint |
|---|------|----|---------|-----|--------------|
| 1 | — | `REQUEST_CREATED` | Client submits form | Client | `POST /api/bi-requests` |
| 2 | `REQUEST_CREATED` | `PENDING_PAYMENT_VERIFICATION` | Client uploads ZIP | Client | `POST /api/bi-uploads` (linked to request) |
| 3 | `PENDING_PAYMENT_VERIFICATION` | `PAYMENT_VERIFIED` | Admin marks payment verified | Admin | `PATCH /api/bi-requests/:id/payment` |
| 4 | `PAYMENT_VERIFIED` | `APPROVED` | Admin clicks approve | Admin | `PATCH /api/bi-requests/:id/approve` |
| 5 | `PAYMENT_VERIFIED` | `REJECTED` | Admin clicks reject | Admin | `PATCH /api/bi-requests/:id/reject` |
| 6 | `APPROVED` | `ETL_PENDING` | System sets status to pending | System | (auto after approve) |
| 7 | `ETL_PENDING` | `ETL_RUNNING` | Admin clicks Start ETL | Admin | `POST /api/bi-uploads/:id/start-etl` |
| 8 | `ETL_RUNNING` | `ETL_COMPLETED` | ETL pipeline completes | System | (etl-pipeline.js) |
| 9 | `ETL_RUNNING` | `ETL_FAILED` | ETL pipeline errors | System | (etl-pipeline.js error handler) |
| 10 | `ETL_COMPLETED` | `DASHBOARD_GENERATED` | System auto-generates dashboard | System | `POST /api/bi/dashboards/auto-generate` |
| 11 | `DASHBOARD_GENERATED` | `READY_FOR_REVIEW` | Admin saves customizations | Admin | `PATCH /api/bi/dashboards/:id` |
| 12 | `READY_FOR_REVIEW` | `PUBLISHED` | Admin publishes | Admin | `PATCH /api/bi/dashboards/:id` (status=PUBLISHED) |
| 13 | — | `CLIENT_VIEWING` | Client views dashboard | Client | `GET /api/bi/dashboards/:id/data` |

### 2.3 Status Codes — Consolidated

| Entity | Status Values |
|--------|---------------|
| **bi_requests** | `PENDING_REVIEW` → `PAYMENT_VERIFIED` → `APPROVED` / `REJECTED` |
| **bi_uploads** | `PENDING_PAYMENT_VERIFICATION` → (linked to request) |
| **bi_processing_jobs** | `QUEUED` → `RUNNING` → `COMPLETED` / `FAILED` |
| **bi_dashboards** | `GENERATED` → `READY_FOR_REVIEW` → `PUBLISHED` / `ARCHIVED` |

---

## 3. Client Side Design

### 3.1 Pages

#### 3.1.1 BI Requests Page
| Property | Value |
|----------|-------|
| **Route** | `/dashboard/bi-requests` |
| **Purpose** | List all client's BI requests with status tracking |
| **Permissions** | Authenticated client, tenant-scoped |
| **Main actions** | View request status, track payment, view published dashboards |

#### 3.1.2 New BI Request (Dialog)
| Property | Value |
|----------|-------|
| **Route** | `/dashboard` (dialog inside main dashboard) |
| **Purpose** | Submit a new BI dashboard request |
| **Permissions** | Authenticated client |
| **Form fields** | Business type (select), business description, objectives (multi-select), ZIP file upload |
| **Main actions** | Submit request, upload ZIP, track request status |

#### 3.1.3 Request Tracking Page
| Property | Value |
|----------|-------|
| **Route** | `/dashboard/bi-requests/:id` |
| **Purpose** | View detailed status of a specific BI request |
| **Permissions** | Authenticated client, own requests only |
| **Main actions** | View status timeline, view uploaded files, view admin notes |

#### 3.1.4 Dashboard Viewer
| Property | Value |
|----------|-------|
| **Route** | `/dashboard/bi-dashboard` (list) / `/dashboard/bi-dashboard/:id` (detail) |
| **Purpose** | View published BI dashboards with charts and KPIs |
| **Permissions** | Authenticated client, own dashboards only |
| **Main actions** | View KPIs, view charts, filter data, export (future) |

#### 3.1.5 Notifications Panel
| Property | Value |
|----------|-------|
| **Route** | `/dashboard` (navbar bell icon) |
| **Purpose** | View in-app notifications for BI events |
| **Permissions** | Authenticated client |
| **Main actions** | Mark read, mark all read, navigate to dashboard |

### 3.2 Client Navigation

```
Dashboard Layout
├── Dashboard Home          /dashboard
├── My BI Dashboards        /dashboard/bi-dashboard          ← NEW
├── BI Requests             /dashboard/bi-requests           ← NEW
├── Generator               /dashboard/generator
└── Settings                /dashboard/settings
```

### 3.3 Exclusions

Clients MUST NOT have access to:
- Metabase (no link, no iframe, no API)
- ETL monitoring (no upload portal, no processing logs)
- Dashboard editing (view-only mode)
- Other clients' data (tenant isolation enforced)

---

## 4. Admin Side Design

### 4.1 Pages

#### 4.1.1 BI Requests (Demandes BI → BI Requests)
| Property | Value |
|----------|-------|
| **Route** | `/admin/bi-requests` |
| **Purpose** | View all client BI requests, approve/reject, manage payment verification |
| **Permissions** | Admin only |
| **Main actions** | View request + files, verify payment, approve/reject request, view request details |

#### 4.1.2 Upload Portal (Portail BI → Upload & Monitor)
| Property | Value |
|----------|-------|
| **Route** | `/admin/bi-upload-portal` |
| **Purpose** | Upload client ZIP files, link to approved requests, start ETL |
| **Permissions** | Admin only |
| **Main actions** | Upload ZIP, select client/request, start ETL, monitor progress, view logs |

#### 4.1.3 Dashboard Builder (Tableau de Bord BI → Dashboard Builder)
| Property | Value |
|----------|-------|
| **Route** | `/admin/bi-dashboard-builder` |
| **Purpose** | View auto-generated dashboards, customize layout/KPIs/charts, submit for review |
| **Permissions** | Admin only |
| **Main actions** | View generated dashboard, add/remove widgets, rename, change layout, submit for review |

#### 4.1.4 Dashboard Validation (Validation BI → Review & Publish)
| Property | Value |
|----------|-------|
| **Route** | `/admin/bi-review` |
| **Purpose** | Review dashboards submitted for publication, approve or reject |
| **Permissions** | Admin only |
| **Main actions** | Preview dashboard, approve (→ PUBLISHED), reject (→ DRAFT) |

#### 4.1.5 BI Analytics (Analyse BI → Analytics)
| Property | Value |
|----------|-------|
| **Route** | `/admin/bi-analytics` |
| **Purpose** | View warehouse metrics and insights across all clients |
| **Permissions** | Admin only |
| **Main actions** | View revenue trends, top products, peak hours, inventory analytics |

#### 4.1.6 Dashboard Templates
| Property | Value |
|----------|-------|
| **Route** | `/admin/bi-templates` |
| **Purpose** | Manage dashboard templates (create, edit, activate/deactivate) |
| **Permissions** | Super admin only |
| **Main actions** | View templates, edit template config, activate/deactivate |

### 4.2 Admin Navigation

```
Admin Layout
├── BI Requests             /admin/bi-requests
├── Upload & Monitor        /admin/bi-upload-portal
├── Dashboard Builder       /admin/bi-dashboard-builder
├── Review & Publish        /admin/bi-review
├── Analytics               /admin/bi-analytics
└── Templates               /admin/bi-templates
```

---

## 5. Database Architecture

### 5.1 Current Models — Review

| Model | Status | Justification |
|-------|--------|---------------|
| `BiUpload` | ✅ **KEEP** | Core upload tracking. Add `licenseId`. |
| `BiUploadFile` | ✅ **KEEP** | Individual file records inside ZIP. |
| `BiProcessingJob` | ✅ **KEEP** | ETL job execution tracking. |
| `BiProcessingLog` | ✅ **KEEP** | Step-by-step ETL logs. |
| `BiDashboard` | ✅ **KEEP** | Dashboard definitions. Add `templateId`. |
| `BiNotification` | ✅ **KEEP** | Client notifications. Add `requestId`. |
| `BiAnalysisRequest` | ❌ **DEPRECATE** | Absorbed by dashboard auto-generation flow. Keep table for historical data, stop creating new records. |
| (missing) `BiRequest` | ➕ **CREATE** | DB-backed request tracking (replaces JSON file). |
| (missing) `BiDashboardTemplate` | ➕ **CREATE** | DB-backed templates (replaces hardcoded JS). |

### 5.2 Final Prisma Schema

```prisma
// ──────────────────────────────────────────────
// BI Request (NEW — replaces JSON file)
// ──────────────────────────────────────────────

model BiRequest {
  id              String   @id @default(cuid())
  clientId        String   @map("clientid")
  licenseId       String?  @map("licenseid")
  uploadId        String?  @map("uploadid")
  businessType    String   @map("businesstype")
  businessName    String?  @map("businessname")
  message         String?
  objectives      Json?    // array of objective strings
  status          String   @default("PENDING_REVIEW")
  paymentStatus   String   @default("PENDING")
  adminNotes      String?  @map("adminnotes")
  createdAt       DateTime @map("createdat") @default(now())
  updatedAt       DateTime @map("updatedat") @updatedAt

  client  Client    @relation(fields: [clientId], references: [id])
  license License?  @relation(fields: [licenseId], references: [id])
  upload  BiUpload? @relation(fields: [uploadId], references: [id])

  @@index([clientId])
  @@index([status])
  @@index([paymentStatus])
  @@map("bi_requests")
}

// ──────────────────────────────────────────────
// BI Dashboard Template (NEW — replaces JS)
// ──────────────────────────────────────────────

model BiDashboardTemplate {
  id           String   @id @default(cuid())
  businessType String   @map("businesstype") @unique
  name         String
  description  String?
  config       Json     // sections array (from bi-dashboard-templates.js)
  isActive     Boolean  @map("isactive") @default(true)
  createdAt    DateTime @map("createdat") @default(now())
  updatedAt    DateTime @map("updatedat") @updatedAt

  dashboards   BiDashboard[]

  @@map("bi_dashboard_templates")
}

// ──────────────────────────────────────────────
// BI Upload (MODIFY — add licenseId)
// ──────────────────────────────────────────────

model BiUpload {
  id              String   @id @default(cuid())
  clientId        String @map("clientid")
  licenseId       String?  @map("licenseid")      // ← ADD
  businessType    String @map("businesstype")
  biSchemaVersion String? @map("bischemaversion")
  fileHash        String?  @map("filehash") @unique
  fileName        String @map("filename")
  fileSize        Int @map("filesize")
  filePath        String @map("filepath")
  status          String   @default("PENDING_PAYMENT_VERIFICATION")
  totalFiles      Int      @map("totalfiles") @default(0)
  totalRows       Int      @map("totalrows") @default(0)
  errorMessage    String? @map("errormessage")
  createdAt       DateTime @map("createdat") @default(now())
  updatedAt       DateTime @map("updatedat") @updatedAt

  // Relations
  license         License?          @relation(fields: [licenseId], references: [id])  // ← ADD
  files           BiUploadFile[]
  processingJob   BiProcessingJob?
  dashboards      BiDashboard[]
  analysisRequests BiAnalysisRequest[]

  @@map("bi_uploads")
}

// ──────────────────────────────────────────────
// BI Dashboard (MODIFY — add templateId)
// ──────────────────────────────────────────────

model BiDashboard {
  id              String    @id @default(cuid())
  clientId        String @map("clientid")
  licenseId       String? @map("licenseid")
  uploadId        String? @map("uploadid")
  templateId      String?  @map("templateid")     // ← ADD
  businessType    String @map("businesstype")
  name            String
  description     String?
  status          String    @default("GENERATED")  // ← Change default from DRAFT
  dashboardType   String    @map("dashboardtype") @default("custom")
  dashboardConfig Json? @map("dashboardconfig")
  createdBy       String? @map("createdby")
  assignedAt      DateTime? @map("assignedat")
  createdAt       DateTime  @map("createdat") @default(now())
  updatedAt       DateTime  @map("updatedat") @updatedAt

  // Relations
  client  Client              @relation(fields: [clientId], references: [id], onDelete: Cascade)
  license License?            @relation(fields: [licenseId], references: [id])
  upload  BiUpload?           @relation(fields: [uploadId], references: [id])
  template BiDashboardTemplate? @relation(fields: [templateId], references: [id])  // ← ADD
  notifications BiNotification[]

  @@map("bi_dashboards")
}

// ──────────────────────────────────────────────
// BI Notification (MODIFY — add requestId)
// ──────────────────────────────────────────────

model BiNotification {
  id          String   @id @default(cuid())
  clientId    String? @map("clientid")
  requestId   String?  @map("requestid")       // ← ADD
  dashboardId String? @map("dashboardid")
  title       String
  message     String
  type        String   @default("DASHBOARD_READY")
  isRead      Boolean  @map("isread") @default(false)
  createdAt   DateTime @map("createdat") @default(now())

  client    Client?      @relation(fields: [clientId], references: [id], onDelete: Cascade)
  request   BiRequest?   @relation(fields: [requestId], references: [id], onDelete: SetNull)   // ← ADD
  dashboard BiDashboard? @relation(fields: [dashboardId], references: [id], onDelete: SetNull)

  @@map("bi_notifications")
}
```

### 5.3 Entity Relationship Diagram (Text)

```
bi_requests (1) ─── (0..1) bi_uploads (1) ─── (0..1) bi_processing_jobs (1) ─── (0..*) bi_processing_logs
     │                      │
     │                      └── (0..*) bi_upload_files
     │
     └── (0..*) bi_notifications
     │
     └── (0..*) bi_dashboards (0..*) ─── (1) bi_dashboard_templates
     │                      │
     │                      └── (0..*) bi_notifications
     │
     (1) clients (multi-tenant owner)
```

### 5.4 Status Values — Final

| Table | Field | Allowed Values |
|-------|-------|----------------|
| `bi_requests` | `status` | `PENDING_REVIEW` → `PAYMENT_VERIFIED` → `APPROVED` / `REJECTED` |
| `bi_requests` | `paymentStatus` | `PENDING` → `VERIFIED` / `REJECTED` |
| `bi_uploads` | `status` | `PENDING_PAYMENT_VERIFICATION` (default) |
| `bi_processing_jobs` | `status` | `QUEUED` → `RUNNING` → `COMPLETED` / `FAILED` |
| `bi_dashboards` | `status` | `GENERATED` → `READY_FOR_REVIEW` → `PUBLISHED` / `ARCHIVED` |

---

## 6. API Architecture

### 6.1 BI Requests Module

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `POST` | `/api/bi-requests` | Create BI request | Client (JWT) |
| `GET` | `/api/bi-requests` | List requests (filtered) | Client or Admin (JWT) |
| `GET` | `/api/bi-requests/:id` | Get request detail | Client or Admin (JWT) |
| `PATCH` | `/api/bi-requests/:id/payment` | Mark payment verified/rejected | Admin (JWT) |
| `PATCH` | `/api/bi-requests/:id/approve` | Approve request → ready for ETL | Admin (JWT) |
| `PATCH` | `/api/bi-requests/:id/reject` | Reject request | Admin (JWT) |

### 6.2 Uploads Module

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `POST` | `/api/bi-uploads` | Upload ZIP file | Client or Admin (JWT) |
| `GET` | `/api/bi-uploads` | List uploads (filtered) | Admin (JWT) |
| `GET` | `/api/bi-uploads/:id` | Get upload detail + job status | Admin (JWT) |
| `GET` | `/api/bi-uploads/:id/logs` | Get ETL processing logs | Admin (JWT) |
| `GET` | `/api/bi-uploads/:id/summary` | Get dashboard-ready metrics | Admin (JWT) |
| `POST` | `/api/bi-uploads/:id/start-etl` | **Manually start ETL** | Admin (JWT) |
| `POST` | `/api/bi-uploads/:id/cancel` | Cancel pending upload | Admin (JWT) |
| `DELETE` | `/api/bi-uploads/:id` | Delete upload + cleanup | Admin (JWT) |

### 6.3 Dashboard Module

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/bi/dashboards` | List dashboards (filtered) | Client or Admin (JWT) |
| `GET` | `/api/bi/dashboards/templates` | List available templates | Admin (JWT) |
| `GET` | `/api/bi/dashboards/:id` | Get dashboard detail | Client or Admin (JWT) |
| `POST` | `/api/bi/dashboards` | Create dashboard manually | Admin (JWT) |
| `POST` | `/api/bi/dashboards/auto-generate` | **Auto-generate from template** | Admin (JWT) |
| `PATCH` | `/api/bi/dashboards/:id` | Update dashboard (customize) | Admin (JWT) |
| `PATCH` | `/api/bi/dashboards/:id/publish` | Publish dashboard | Admin (JWT) |
| `DELETE` | `/api/bi/dashboards/:id` | Delete dashboard | Admin (JWT) |
| `GET` | `/api/bi/dashboards/:id/data` | Get dashboard metrics (charts) | Client or Admin (JWT) |

### 6.4 Notifications Module

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/bi/notifications` | List notifications | Client (JWT) |
| `PATCH` | `/api/bi/notifications/:id/read` | Mark notification read | Client (JWT) |
| `POST` | `/api/bi/notifications/read-all` | Mark all read | Client (JWT) |
| `GET` | `/api/bi/notifications/unread-count` | Get unread count | Client (JWT) |

### 6.5 Analytics Module (Admin)

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/bi/analytics/revenue` | Revenue data for charts | Admin (JWT) |
| `GET` | `/api/bi/analytics/products` | Product performance | Admin (JWT) |
| `GET` | `/api/bi/analytics/insights` | Generated insights by client | Admin (JWT) |

### 6.6 Module: Admin Actions

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/bi/admin/summary` | Dashboard of all BI stats | Admin (JWT) |

---

## 7. Dashboard Generation Strategy

### 7.1 Hybrid Approach

```
80% AUTOMATIC → Templates define KPI layout, chart types, widget positions
20% MANUAL    → Admin reorders, renames, adds/removes widgets, changes colors
```

### 7.2 Template Selection Logic

```
ETL COMPLETED
    │
    ▼
Read business_type from bi_upload
    │
    ▼
Look up bi_dashboard_templates WHERE businessType = business_type
    │
    ├── Found     → Apply template
    ├── Not found → Fall back to "restaurant" template
    │
    ▼
Create BiDashboard with:
    - status = "GENERATED"
    - dashboardConfig = template.config + populated metrics
    - templateId = matched template.id
```

### 7.3 Template Examples

#### Restaurant Template
```
┌─────────────────────────────────────────────────────────────┐
│  KPI: Revenue     KPI: Orders    KPI: Avg Ticket            │
│  KPI: Top Waiter  KPI: Tables    KPI: Peak Hour             │
├─────────────────────────────────────────────────────────────┤
│  Line Chart: Revenue Trend (30 days)                        │
├─────────────────────────────────────────────────────────────┤
│  Bar Chart: Top Products by Sales                           │
├─────────────────────────────────────────────────────────────┤
│  Bar Chart: Peak Hours (orders by hour)                     │
├─────────────────────────────────────────────────────────────┤
│  Pie Chart: Kitchen Performance (by status)                 │
├─────────────────────────────────────────────────────────────┤
│  Table: Table Turnover (table number × order count)         │
└─────────────────────────────────────────────────────────────┘
```

#### Retail Template
```
┌─────────────────────────────────────────────────────────────┐
│  KPI: Revenue     KPI: Margin    KPI: Inventory Turnover    │
├─────────────────────────────────────────────────────────────┤
│  Line Chart: Revenue Trend (30 days)                        │
├─────────────────────────────────────────────────────────────┤
│  Bar Chart: Top Products by Sales                           │
├─────────────────────────────────────────────────────────────┤
│  Table: Inventory Turnover (product × turnover rate)        │
├─────────────────────────────────────────────────────────────┤
│  Table: Supplier Performance (name × contact)               │
└─────────────────────────────────────────────────────────────┘
```

#### Pharmacy Template
```
┌─────────────────────────────────────────────────────────────┐
│  KPI: Revenue     KPI: Expiring    KPI: Top Medicine        │
├─────────────────────────────────────────────────────────────┤
│  Line Chart: Revenue Trend (30 days)                        │
├─────────────────────────────────────────────────────────────┤
│  Bar Chart: Top Products by Sales                           │
├─────────────────────────────────────────────────────────────┤
│  Table: Inventory Turnover (product × turnover)             │
├─────────────────────────────────────────────────────────────┤
│  Table: Appointment Summary (total × by status)             │
└─────────────────────────────────────────────────────────────┘
```

### 7.4 Widget Types Supported

| Widget Type | Data Source | Render Component |
|-------------|-------------|------------------|
| `kpi` | Single metric | Card with value + label |
| `line` | Time-series array | `ResponsiveContainer` + `LineChart` |
| `bar` | Key-value pairs | `ResponsiveContainer` + `BarChart` |
| `pie` | Label-value pairs | `ResponsiveContainer` + `PieChart` |
| `table` | Array of objects | HTML table with headers |

### 7.5 Widget Config Format (stored in dashboardConfig JSON)

```json
{
  "sections": [
    {
      "id": "kpi-summary",
      "title": "KPI Summary",
      "span": 12,
      "charts": [
        { "type": "kpi", "label": "Revenue", "metric": "revenue", "format": "currency" },
        { "type": "kpi", "label": "Orders", "metric": "orderCount", "format": "number" },
        { "type": "kpi", "label": "Average Ticket", "metric": "averageTicket", "format": "currency" }
      ]
    },
    {
      "id": "revenue-trend",
      "title": "Revenue Trend",
      "span": 6,
      "charts": [
        { "type": "line", "metric": "revenueByDay", "xKey": "date", "yKey": "revenue", "label": "Revenue" }
      ]
    },
    {
      "id": "top-products",
      "title": "Top Products",
      "span": 6,
      "charts": [
        { "type": "bar", "metric": "topProducts", "xKey": "productName", "yKey": "timesSold", "label": "Sales" }
      ]
    }
  ]
}
```

### 7.6 Admin Customization Options

| Action | Effect |
|--------|--------|
| Add widget | Insert new section from available widgets list |
| Remove widget | Delete section from config |
| Rename widget | Edit section title |
| Reorder | Drag-and-drop sections |
| Change chart type | Switch between line/bar/pie/table |
| Change metric | Select different data source for widget |
| Add notes | Insert text block into dashboard |
| Preview | View dashboard as client would see it |

---

## 8. Metabase Strategy

### 8.1 Role

```
METABASE = ADMIN-ONLY ANALYTICS TOOL
         (Not for client use)
```

### 8.2 What Admin Uses Metabase For

| Use Case | Description |
|----------|-------------|
| **Verify ETL success** | Check row counts in warehouse tables after ETL |
| **Ad-hoc queries** | Run SQL queries against the warehouse |
| **Data quality checks** | Identify missing data, anomalies |
| **Custom reports** | Build admin-only reports not shown to clients |
| **Troubleshooting** | Investigate ETL failures, data mismatches |

### 8.3 What Clients Use Instead

| Need | Solution |
|------|----------|
| View KPIs | React/Recharts dashboard (BIDashboardViewer.tsx) |
| View charts | React/Recharts (custom components) |
| Filter data | React state + API query params |
| Export | Future: PDF/Excel export from React |

### 8.4 Configuration Required

| Step | Action |
|------|--------|
| 1 | Create read-only PostgreSQL user for Metabase |
| 2 | Add `pos_system` database as data source in Metabase UI |
| 3 | Admin builds dashboards manually in Metabase |
| 4 | Document setup in `docs/bi/metabase-setup.md` |

### 8.5 What Is NOT Needed

- ❌ Metabase embedding (no iframes, no JWT tokens)
- ❌ Metabase API integration (no code to call Metabase)
- ❌ Metabase client access (blocked by design)
- ❌ Metabase Enterprise license (not needed for admin-only)

---

## 9. Notifications

### 9.1 Notification Types

| Type | Trigger | Recipient | Message |
|------|---------|-----------|---------|
| `PAYMENT_VERIFIED` | Admin marks payment verified | Client | "Your payment has been verified. We're processing your request." |
| `REQUEST_APPROVED` | Admin approves request | Client | "Your BI request has been approved." |
| `REQUEST_REJECTED` | Admin rejects request | Client | "Your BI request has been reviewed. Contact support for details." |
| `ETL_COMPLETED` | ETL finishes successfully | Admin | "ETL completed for [client name]. Dashboard ready for review." |
| `DASHBOARD_READY` | Dashboard published | Client | "Your BI dashboard is ready! View it now." |
| `DASHBOARD_UPDATED` | Admin updates published dashboard | Client | "Your dashboard has been updated with new data." |

### 9.2 Storage

```prisma
model BiNotification {
  id          String   @id @default(cuid())
  clientId    String?  @map("clientid")
  requestId   String?  @map("requestid")
  dashboardId String?  @map("dashboardid")
  title       String
  message     String
  type        String   @default("DASHBOARD_READY")
  isRead      Boolean  @map("isread") @default(false)
  createdAt   DateTime @map("createdat") @default(now())

  client    Client?      @relation(fields: [clientId], references: [id], onDelete: Cascade)
  request   BiRequest?   @relation(fields: [requestId], references: [id], onDelete: SetNull)
  dashboard BiDashboard? @relation(fields: [dashboardId], references: [id], onDelete: SetNull)

  @@map("bi_notifications")
}
```

### 9.3 Automatic Creation Points

| Point in Workflow | Notification Type |
|-------------------|-------------------|
| After `PATCH /api/bi-requests/:id/payment` → VERIFIED | `PAYMENT_VERIFIED` → client |
| After `PATCH /api/bi-requests/:id/approve` | `REQUEST_APPROVED` → client |
| After `PATCH /api/bi-requests/:id/reject` | `REQUEST_REJECTED` → client |
| After ETL completes | `ETL_COMPLETED` → admin |
| After `PATCH /api/bi/dashboards/:id` → PUBLISHED | `DASHBOARD_READY` → client |

---

## 10. Security Review

### 10.1 Current State

| Concern | Status | Risk |
|---------|--------|------|
| JWT authentication | ❌ Commented out in `server.js` line 86 | **CRITICAL** — All endpoints public |
| Tenant isolation (API) | ✅ Implemented via `clientId`/`tenantId` in query params | MEDIUM — Relies on honest requests |
| Tenant isolation (DB) | ✅ All warehouse records include `tenantId` | LOW |
| Upload file validation | ✅ File type (ZIP only), size limit (100MB), SHA-256 dedup | LOW |
| ETL execution | ⚠️ No auth on POST /api/bi-uploads/:id/start-etl (no JWT) | HIGH |
| Dashboard access | ⚠️ No auth on dashboard data endpoints (no JWT) | HIGH |

### 10.2 Required Changes

| Priority | Change | Location |
|----------|--------|----------|
| **CRITICAL** | Enable JWT middleware for all `/api` routes | `server.js` line 86 |
| **HIGH** | Apply `verifyToken` to all BI routes | Each route file |
| **HIGH** | Add role check (`admin` vs `client`) for admin-only endpoints | Middleware |
| **MEDIUM** | Validate `clientId` matches JWT token for client requests | Each route handler |
| **MEDIUM** | Rate-limit upload endpoints to prevent abuse | Express rate-limit middleware |
| **LOW** | Harden file upload path traversal | Multer config |

### 10.3 Permission Matrix

| Endpoint Group | Client | Admin | Unauthenticated |
|----------------|--------|-------|-----------------|
| `POST /api/bi-requests` | ✅ Own requests | ❌ | ❌ |
| `GET /api/bi-requests` | ✅ Own only | ✅ All | ❌ |
| `PATCH /api/bi-requests/:id/payment` | ❌ | ✅ | ❌ |
| `PATCH /api/bi-requests/:id/approve` | ❌ | ✅ | ❌ |
| `POST /api/bi-uploads` | ✅ Own client | ✅ Any client | ❌ |
| `POST /api/bi-uploads/:id/start-etl` | ❌ | ✅ | ❌ |
| `GET /api/bi/dashboards` | ✅ Own published | ✅ All | ❌ |
| `GET /api/bi/dashboards/:id/data` | ✅ Own published | ✅ Any | ❌ |
| `PATCH /api/bi/dashboards/:id` (customize) | ❌ | ✅ | ❌ |
| `PATCH /api/bi/dashboards/:id/publish` | ❌ | ✅ | ❌ |

### 10.4 Tenant Isolation Strategy

```
CLIENT REQUEST:
  JWT token contains clientId
  API extracts clientId from token (NOT from request body)
  All queries filter by this clientId
  
ADMIN REQUEST:
  JWT token contains admin role
  API allows admin to specify any clientId
  All queries still filter by specified clientId (no cross-tenant leak)
```

### 10.5 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| JWT still disabled at deployment | HIGH | CRITICAL | Add linter rule to fail CI if JWT is commented |
| Client can view another client's dashboard | MEDIUM | HIGH | Always filter by JWT `clientId`, never trust query params for identity |
| Admin uploads ZIP for wrong client | MEDIUM | MEDIUM | Validate clientId against database before upload |
| ETL triggered on unapproved request | LOW | MEDIUM | Gate `start-etl` behind request approval check |

---

## 11. Final Implementation Roadmap

### Phase 1: BI Requests in PostgreSQL

| Aspect | Detail |
|--------|--------|
| **Objectives** | Migrate BI requests from JSON file to PostgreSQL. Convert `bi-requests.js` route to Prisma. |
| **Duration** | ~2-3 days |
| **Risk** | MEDIUM (API contract must remain compatible) |

**Files affected:**
- `backend/prisma/schema.prisma` — Add `BiRequest` model
- `backend/routes/bi-requests.js` — Rewrite JSON→Prisma
- `backend/data/bi-requests.json` — Archive (currently empty)
- `admin/src/pages/BIRequests.jsx` — Minor: update imports if needed

**Database changes:**
- Create `bi_requests` table (see Section 5.2)
- Prisma migration: `npx prisma migrate dev --name add_bi_requests`
- Migration script: copy JSON data → DB (currently empty, no-op)

**Backend changes:**
- Rewrite all CRUD operations to use `prisma.biRequest`
- Keep exact same request/response format as current JSON API
- Add `prisma.biRequest.findMany()` with filters (status, clientId, etc.)

**Frontend changes:**
- None expected (API contract preserved)

---

### Phase 2: Payment Verification + Approval Workflow

| Aspect | Detail |
|--------|--------|
| **Objectives** | Add payment verification and request approval UI/API. |
| **Duration** | ~2-3 days |
| **Risk** | LOW |

**Files affected:**
- `backend/routes/bi-requests.js` — Add payment + approve/reject endpoints
- `backend/prisma/schema.prisma` — Add `paymentStatus` field to `BiRequest`, add `licenseId` to `BiUpload`
- `admin/src/pages/BIRequests.jsx` — Add payment status badge, verify/approve/reject buttons

**Database changes:**
- `BiRequest.paymentStatus` — PENDING / VERIFIED / REJECTED
- `BiUpload.licenseId` — New nullable FK to License
- Prisma migration

**Backend changes:**
- `PATCH /api/bi-requests/:id/payment` — Update payment status
- `PATCH /api/bi-requests/:id/approve` — Set status to APPROVED + auto-notification
- `PATCH /api/bi-requests/:id/reject` — Set status to REJECTED + auto-notification

**Frontend changes:**
- `BIRequests.jsx` — Add payment status column, verify/approve/reject action buttons
- Add notification auto-creation on approve/reject

---

### Phase 3: Manual ETL Trigger + Upload Portal

| Aspect | Detail |
|--------|--------|
| **Objectives** | Copy BiUploadPortal from WORK, add Start ETL button, connect request→upload→ETL flow. |
| **Duration** | ~3-4 days |
| **Risk** | MEDIUM (ETL pipeline must work end-to-end) |

**Files affected:**
- `backend/routes/bi-uploads.js` — Add `POST /:id/start-etl`
- `admin/src/pages/BiUploadPortal.jsx` — Copy from WORK, add "Start ETL" button
- `admin/src/App.jsx` — Route `/bi-upload-portal`
- `admin/src/components/layout/Layout.jsx` — Nav item "Upload & Monitor"
- `backend/services/etl-pipeline.js` — Remove auto-creation of BiAnalysisRequest (Step 5e)

**Database changes:**
- None (all tables exist)

**Backend changes:**
- `POST /api/bi-uploads/:id/start-etl`:
  - Gate: status is `PENDING_PAYMENT_VERIFICATION` AND linked request status is `APPROVED`
  - Update processing job to QUEUED → RUNNING
  - Call `etlPipeline.run(uploadId, filePath)` (awaited, not fire-and-forget)
  - On success: update upload status, auto-trigger dashboard generation
  - On failure: update status to FAILED, return error

**Frontend changes:**
- Copy `BiUploadPortal.jsx` from WORK
- Add "Start ETL" button (only enabled when linked request is APPROVED)
- Show ETL progress (processing job status + logs)

---

### Phase 4: Dashboard Generation + Admin Customization

| Aspect | Detail |
|--------|--------|
| **Objectives** | Auto-generate dashboard from template after ETL. Route all admin BI pages. |
| **Duration** | ~3-4 days |
| **Risk** | MEDIUM |

**Files affected:**
- `backend/prisma/schema.prisma` — Add `BiDashboardTemplate` model, add `templateId` to `BiDashboard`
- `backend/routes/bi-dashboards.js` — Add `POST /auto-generate`
- `backend/services/bi-dashboard-templates.js` — Migration script to seed DB
- `admin/src/pages/AdminBIDashboardManager.jsx` — Route + customize
- `admin/src/pages/AdminBIReview.jsx` — Route
- `admin/src/App.jsx` — Route all 4 remaining BI pages
- `admin/src/components/layout/Layout.jsx` — Nav items for all BI sections

**Database changes:**
- Create `bi_dashboard_templates` table
- Add `templateId` to `bi_dashboards`
- Seed script: migrate from `bi-dashboard-templates.js` to DB
- Prisma migration

**Backend changes:**
- `POST /api/bi/dashboards/auto-generate`:
  - Accept `uploadId` or `requestId`
  - Look up business type
  - Find matching template in `bi_dashboard_templates`
  - Create `BiDashboard` with template config + status `GENERATED`
  - Return dashboard ID

**Frontend changes:**
- Route `AdminBIDashboardManager` at `/admin/bi-dashboard-builder`
- Route `AdminBIReview` at `/admin/bi-review`
- Route `AdminBIAnalystWorkspace` at `/admin/bi-analytics`
- Add nav items to `Layout.jsx`

---

### Phase 5: Client Dashboard Viewer + Notifications

| Aspect | Detail |
|--------|--------|
| **Objectives** | Route BIDashboardViewer, add notification bell, complete client experience. |
| **Duration** | ~2-3 days |
| **Risk** | LOW |

**Files affected:**
- `frontend/src/App.tsx` — Route BIDashboardViewer
- `frontend/src/components/DashboardLayout.tsx` — Add nav item + notification bell
- `frontend/src/pages/dashboard/BIDashboardViewer.tsx` — Minor UI polish

**Database changes:**
- Add `requestId` to `bi_notifications` (optional, for notification→request linking)

**Backend changes:**
- None (all endpoints exist)

**Frontend changes:**
- Route `/dashboard/bi-dashboard` → BIDashboardViewer (list)
- Route `/dashboard/bi-dashboard/:dashboardId` → BIDashboardViewer (detail)
- Add "My BI Dashboards" nav item to DashboardLayout.tsx
- Add notification bell with unread badge to DashboardLayout.tsx header
- Click bell → dropdown with recent notifications → click to mark read / navigate

---

### Phase 6: Metabase Administration (Optional)

| Aspect | Detail |
|--------|--------|
| **Objectives** | Connect Metabase to pos_system, document admin workflow. |
| **Duration** | ~1 day |
| **Risk** | LOW |

**Tasks:**
- Create read-only PostgreSQL user for Metabase
- Add `pos_system` as data source in Metabase UI
- Create `docs/bi/metabase-setup.md` documentation
- Admin builds monitoring dashboards manually

---

## Appendix A: File Inventory — Complete

```
backend/
├── prisma/
│   └── schema.prisma                  ← All BI models defined here
├── routes/
│   ├── bi-requests.js                 ← P1: Rewrite JSON→DB
│   ├── bi-uploads.js                  ← P0: Copied, needs start-etl
│   ├── bi-dashboards.js               ← P4: Add auto-generate
│   ├── bi-reviews.js                  ← Already works
│   ├── bi-analysis.js                 ← Deprecate in P4
│   ├── bi-notifications.js            ← Already works
│   └── bi-debug.js                    ← Dev tool (copied P0)
├── services/
│   ├── warehouse-service.js           ← Copied P0, works
│   ├── bi-schema-registry.js          ← Copied P0, works
│   ├── bi-dashboard-templates.js      ← P4: Seed to DB
│   ├── bi-insight-generator.js        ← Already works
│   └── etl-pipeline.js                ← P3: Remove step 5e
├── data/
│   └── bi-requests.json               ← P1: Migrate, then archive

admin/src/
├── App.jsx                            ← P3-4: Add BI routes
├── components/layout/
│   └── Layout.jsx                     ← P3-4: Add BI nav items
└── pages/
    ├── BIRequests.jsx                 ← P2: Add payment+approve UI
    ├── BiUploadPortal.jsx             ← P3: Copy from WORK
    ├── AdminBIDashboardManager.jsx    ← P4: Route + customize
    ├── AdminBIReview.jsx              ← P4: Route
    ├── AdminBIAnalystWorkspace.jsx    ← P4: Route (or merge)
    └── AdminBIAnalysisDetail.jsx      ← P4: Route (or merge)

frontend/src/
├── App.tsx                            ← P5: Route BIDashboardViewer
├── components/
│   └── DashboardLayout.tsx            ← P5: Add nav + notification bell
└── pages/dashboard/
    ├── Dashboard.tsx                  ← Already works
    └── BIDashboardViewer.tsx          ← P5: Route
```

## Appendix B: Risk Register — Final

| ID | Risk | P | I | Phase | Mitigation |
|----|------|---|---|-------|------------|
| R1 | JWT auth disabled — all endpoints public | 100% | CR | P5 | Enable before production |
| R2 | bi-requests API contract change breaks frontend | 60% | HI | P1 | Keep same response format; test with frontend |
| R3 | ETL fails due to ZIP format incompatibility | 30% | HI | P3 | Add debug mode (BI_DEBUG=true); self-test endpoint |
| R4 | Dashboard template migration (JS→DB) loses data | 10% | HI | P4 | Keep JS file as fallback; test seed first |
| R5 | Client accesses another client's dashboard | 20% | HI | P5 | Enforce tenantId from JWT, not query params |
| R6 | Admin panel pages still not routed after Phase 4 | 100% | MED | P4 | Track in checklist; verify each route |
| R7 | Large ZIP upload timeout | 20% | MED | P3 | Increase multer + server timeout; add chunked upload plan |
| R8 | Metabase accidentally exposed to clients | 5% | HI | P6 | Network-level isolation; no links in app |

---

*End of Architecture Specification — Version 1.0.0*
