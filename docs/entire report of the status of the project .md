# BI Module — Complete Project Status Report

> **Scope:** Admin panel + Backend + Database  
> **Date:** June 28, 2026  
> **Version:** Phases 1–4 Complete, Phase 5–6 Planned

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Models](#2-database-models)
3. [Backend API Endpoints](#3-backend-api-endpoints)
4. [Admin Panel Pages](#4-admin-panel-pages)
5. [The Complete BI Flow](#5-the-complete-bi-flow)
6. [ETL Pipeline](#6-etl-pipeline)
7. [Warehouse Service](#7-warehouse-service)
8. [Dashboard Templates](#8-dashboard-templates)
9. [Metabase Strategy](#9-metabase-strategy)
10. [Notification System](#10-notification-system)
11. [Implementation Status](#11-implementation-status)
12. [Risk Assessment](#12-risk-assessment)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT PORTAL                                 │
│  (frontend/ — React + Recharts)                                        │
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │  Dashboard.tsx       │  │  BIDashboardViewer.tsx                  │  │
│  │  • Submit BI request │  │  • View published dashboards            │  │
│  │  • Upload CSVs       │  │  • Recharts visualizations (line,       │  │
│  │  • Track status      │  │    bar, pie, table, KPI)                │  │
│  │  • View notifications│  │  • BI notifications sidebar             │  │
│  └──────────┬───────────┘  └──────────────────┬──────────────────────┘  │
└─────────────┼──────────────────────────────────┼────────────────────────┘
              │  REST API                        │  REST API
              ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Express + Prisma)                    │
│                                                                         │
│  ┌────────────┐ ┌──────────┐ ┌─────────────┐ ┌──────────────────┐     │
│  │ bi-requests│ │bi-uploads│ │bi-dashboards │ │ bi-analysis      │     │
│  │ .js        │ │ .js      │ │ .js          │ │ .js              │     │
│  │            │ │          │ │              │ │                  │     │
│  │ CRUD +     │ │ Upload   │ │CRUD +        │ │ Analysis CRUD    │     │
│  │ payment/   │ │ ZIP +    │ │generate-from-│ │ + metrics +      │     │
│  │ approve/   │ │ ETL trig-│ │upload +      │ │ AI insights      │     │
│  │ reject/    │ │ ger      │ │status mgmt   │ │                  │     │
│  │ info       │ │          │ │              │ │                  │     │
│  └────────────┘ └──────────┘ └──────────────┘ └──────────────────┘     │
│  ┌────────────┐ ┌──────────┐ ┌──────────────────────────────────┐     │
│  │bi-reviews  │ │bi-notifi-│ │ bi-debug                         │     │
│  │ .js        │ │cations.js│ │ .js                              │     │
│  │            │ │          │ │                                  │     │
│  │ approve/   │ │ Read /   │ │ Health check + self-test +      │     │
│  │ reject     │ │ mark read│ │ retry failed uploads             │     │
│  └────────────┘ └──────────┘ └──────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
              │                             │
              ▼                             ▼
┌─────────────────────────┐  ┌─────────────────────────────────────────┐
│   PostgreSQL: pos_system│  │  Services Layer                         │
│                         │  │                                         │
│  ┌───────────────────┐  │  │  ┌──────────────────────────────┐      │
│  │ Operational DB    │  │  │  │ etl-pipeline.js              │      │
│  │ (orders, clients, │  │  │  │ • Extract ZIP → Parse CSVs  │      │
│  │  products, etc.)  │  │  │  │ • Validate schema           │      │
│  └───────────────────┘  │  │  │ • Load dimensions + facts   │      │
│                         │  │  │ • Auto-create analysis      │      │
│  ┌───────────────────┐  │  │  └──────────────────────────────┘      │
│  │ BI Warehouse      │  │  │  ┌──────────────────────────────┐      │
│  │ (dim + fact       │  │  │  │ warehouse-service.js         │      │
│  │  tables)          │  │  │  │ • Revenue, top products,     │      │
│  └───────────────────┘  │  │  │   peak hours, inventory, ... │      │
│                         │  │  └──────────────────────────────┘      │
│  ┌───────────────────┐  │  │  ┌──────────────────────────────┐      │
│  │ BI Requests       │  │  │  │ bi-dashboard-templates.js   │      │
│  │ BI Uploads        │  │  │  │ • 5 business type templates │      │
│  │ BI Dashboards     │  │  │  └──────────────────────────────┘      │
│  │ BI Notifications  │  │  │  ┌──────────────────────────────┐      │
│  │ BI Processing     │  │  │  │ bi-insight-generator.js      │      │
│  └───────────────────┘  │  │  │ • AI-powered insights from   │      │
│                         │  │  │   warehouse data             │      │
└─────────────────────────┘  │  └──────────────────────────────┘      │
                             └─────────────────────────────────────────┘
```

### Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Dashboard rendering | React + Recharts | Client-facing; multi-tenant isolation via code, no Enterprise license needed |
| Admin analytics | Metabase (optional, Phase 6) | Admin-only ad-hoc queries; no embedding, no client access |
| Template storage | JavaScript file | No DB migration needed; templates are code, not data |
| File upload | Multer (ZIP) | Standard Express middleware; 100 MB limit, SHA-256 dedup |
| ETL | Synchronous Node.js | Single-tenant scale; future: queue if performance bottlenecks appear |
| Notifications | Prisma-backed table | Simple, no external service; admin + client notification types |
| Status workflows | State machine in code | Valid transitions enforced per entity type |

---

## 2. Database Models

All BI models live in `backend/prisma/schema.prisma`, table prefix `bi_`.

### 2.1 BiRequest — Client BI Requests (Phase 1)

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `clientId` | String (FK → Client) | **Required**, onDelete: **Restrict** |
| `licenseId` | String? (FK → License) | onDelete: SetNull |
| `businessType` | String | restaurant, cafe, retail, pharmacy, salon |
| `businessName` | String? | Client business name |
| `message` | String | Free-text request message |
| `objectives` | Json? | Array of objectives |
| `kpis` | Json? | Array of KPI definitions |
| `dashboardRequirements` | String? | Free-text requirements |
| `dashboardType` | String? | Desired dashboard type |
| `userId` / `userEmail` | String? | Submitter identity |
| `status` | String (default: `PENDING_REVIEW`) | PENDING_REVIEW → APPROVED/REJECTED/REQUEST_INFO |
| `paymentStatus` | String (default: `PENDING`) | PENDING → VERIFIED/REJECTED |
| `paymentMethod` / `paymentNotes` | String? | Payment tracking |
| `adminNotes` / `specialistNotes` | String? | Internal notes |
| `files` | Json (default: `[]`) | Attached CSV metadata |
| `createdAt` / `updatedAt` | DateTime | Timestamps |
| **Relations** | Client, License, **uploads[]** | One BiRequest → many BiUploads |

**Indexes:** `clientId`, `licenseId`, `status`, `paymentStatus`

### 2.2 BiUpload — ZIP Upload & ETL Tracking (Phase 3)

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `clientId` | String? | Loose FK (no Prisma relation) |
| `requestId` | String? (FK → BiRequest) | **Phase 3** linkage, onDelete: SetNull |
| `businessType` | String? | Inferred from ZIP metadata |
| `biSchemaVersion` | String? | Schema version for ETL compatibility |
| `fileHash` | String? (unique) | SHA-256 for duplicate detection |
| `fileName` / `fileSize` / `filePath` | Various | File metadata |
| `status` | String (default: `UPLOADED`) | UPLOADED → VALIDATING → PROCESSING → COMPLETED / FAILED |
| `totalFiles` / `totalRows` | Int | Processing statistics |
| `errorMessage` | String? | Failure reason |
| `createdAt` / `updatedAt` | DateTime | Timestamps (updatedAt nullable) |
| **Relations** | BiRequest (parent), BiUploadFile[], BiProcessingJob?, BiDashboard[], BiAnalysisRequest[] | |

### 2.3 BiUploadFile — Individual Files Inside ZIP

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `uploadId` | String? (FK → BiUpload) | onDelete: Cascade |
| `fileName` | String? | CSV file name |
| `rowCount` / `fileSize` | Int | File stats |
| `status` | String (default: `PENDING`) | Processing status |
| `errorMessage` | String? | Per-file error |

### 2.4 BiProcessingJob — ETL Job Record

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `uploadId` | String? (FK → BiUpload, unique) | One job per upload |
| `status` | String (default: `QUEUED`) | QUEUED → PROCESSING → COMPLETED / FAILED |
| `startedAt` / `completedAt` | DateTime? | Timing |
| `recordsLoaded` | Int (default: 0) | Total rows loaded |
| `errorMessage` | String? | Failure reason |
| **Relations** | BiUpload (parent), BiProcessingLog[] | |

### 2.5 BiProcessingLog — ETL Step Logs

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `jobId` | String? (FK → BiProcessingJob) | onDelete: Cascade |
| `level` | String (default: `INFO`) | INFO / WARN / ERROR |
| `step` | String | Pipeline step name |
| `message` | String | Log message |
| `details` | Json? | Additional data |

### 2.6 BiDashboard — Published/Custom Dashboards (Phase 2, 4)

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `clientId` | String (FK → Client) | Required, onDelete: Cascade |
| `licenseId` | String? (FK → License) | Optional |
| `uploadId` | String? (FK → BiUpload) | Source upload (Phase 4) |
| `businessType` | String | Rendered template type |
| `name` / `description` | String | Dashboard identity |
| `status` | String (default: `DRAFT`) | DRAFT → IN_PROGRESS → READY_FOR_REVIEW → PUBLISHED → ARCHIVED |
| `dashboardType` | String (default: `custom`) | Type classification |
| `dashboardConfig` | Json? | Template sections + config |
| `createdBy` | String? | Admin who created it |
| `assignedAt` | DateTime? | When published |
| **Relations** | Client, License, BiUpload (parent), BiNotification[] | |

### 2.7 BiNotification — BI Notifications

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `clientId` | String? (FK → Client) | Null = admin-only notification |
| `dashboardId` | String? (FK → BiDashboard) | Linked dashboard |
| `title` / `message` | String | Content |
| `type` | String (default: `DASHBOARD_READY`) | Notification type (see section 10) |
| `isRead` | Boolean (default: false) | Read status |
| `createdAt` | DateTime | Timestamp |

### 2.8 BiAnalysisRequest — Analysis Records (Phase 3)

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `clientId` | String (FK → Client) | Required, onDelete: Cascade |
| `licenseId` | String? (FK → License) | Optional |
| `uploadId` | String? (FK → BiUpload) | Source upload |
| `businessType` | String | For template matching |
| `status` | String (default: `PENDING`) | PENDING → UNDER_ANALYSIS → COMPLETED / REJECTED |
| `assignedTo` | String? | Analyst assignment |
| `notes` | String? | Analyst notes |
| `analysisSummary` | Json? | Summary data |
| `insights` | Json? | AI-generated insights |
| `completedAt` | DateTime? | When analysis completed |

### 2.9 Warehouse Star Schema

**Dimensions:**
- `dim_clients` — tenantId (unique), name, businessType
- `dim_products` — tenantId, productId, name, category, family, barcode
- `dim_suppliers` — tenantId, supplierId, name, contact, phone, email
- `dim_time` — date (unique), year, quarter, month, day, dayOfWeek, isWeekend

**Facts:**
- `fact_sales` — tenantId, exportId, dimClientId, dimProductId, dimTimeId, total, tax, discount, paymentMethod
- `fact_inventory` — tenantId, exportId, dimProductId, dimTimeId, stock, price, timesSold
- `fact_appointments` — tenantId, exportId, dimTimeId, customerName, serviceId, duration, status
- `fact_kitchen_orders` — tenantId, exportId, dimTimeId, tableNumber, items, priority, status

---

## 3. Backend API Endpoints

### 3.1 `bi-requests.js` — BI Request Management

| Method | Path | Phase | Purpose |
|--------|------|-------|---------|
| `POST` | `/api/bi-requests` | 1 | Create BI request (CSV upload, max 10 files, 10MB each) |
| `GET` | `/api/bi-requests` | 1 | List requests (filter, search, paginate, sort) |
| `GET` | `/api/bi-requests/:id` | 1 | Get single request |
| `PATCH` | `/api/bi-requests/:id/status` | 1 | Update status (legacy, supports payment fields) |
| `PATCH` | `/api/bi-requests/:id/payment` | 2 | Verify or reject payment |
| `PATCH` | `/api/bi-requests/:id/approve` | 2 | Approve request (requires VERIFIED payment) |
| `PATCH` | `/api/bi-requests/:id/reject` | 2 | Reject request |
| `PATCH` | `/api/bi-requests/:id/request-info` | 2 | Request more info from client |

### 3.2 `bi-uploads.js` — ZIP Upload & ETL

| Method | Path | Phase | Purpose |
|--------|------|-------|---------|
| `POST` | `/api/bi-uploads` | 3 | Upload ZIP (optional `requestId`, SHA-256 dedup) |
| `GET` | `/api/bi-uploads` | 3 | List uploads (filter, paginate, includes processingJob + biRequest + dashboards) |
| `GET` | `/api/bi-uploads/clients/list` | 3 | List unique client IDs |
| `GET` | `/api/bi-uploads/:id` | 3 | Upload detail (includes files, processingJob, logs, biRequest, dashboards) |
| `GET` | `/api/bi-uploads/:id/logs` | 3 | Processing logs for an upload |
| `GET` | `/api/bi-uploads/:id/summary` | 3 | Warehouse summary from upload's client |
| `DELETE` | `/api/bi-uploads/:id` | 3 | Delete upload permanently (cascade to disk + DB) |
| `POST` | `/api/bi-uploads/:id/cancel` | 3 | Cancel pending/processing upload |
| `POST` | `/api/bi-uploads/:id/start-etl` | 3 | **Manual** ETL trigger (validates APPROVED + linked request, returns 202) |

### 3.3 `bi-dashboards.js` — Dashboard CRUD & Generation

| Method | Path | Phase | Purpose |
|--------|------|-------|---------|
| `GET` | `/api/bi/dashboards` | 2 | List dashboards (filter, paginate) |
| `GET` | `/api/bi/dashboards/templates` | 2 | List available templates |
| `GET` | `/api/bi/dashboards/:id` | 2 | Get single dashboard |
| `POST` | `/api/bi/dashboards` | 2 | Create dashboard (legacy, requires COMPLETED analysis) |
| `POST` | `/api/bi/dashboards/generate-from-upload` | 4 | **Generate dashboard from completed upload** (validates COMPLETED + APPROVED request + no duplicate) |
| `PATCH` | `/api/bi/dashboards/:id` | 2 | Update dashboard (status transitions enforced) |
| `DELETE` | `/api/bi/dashboards/:id` | 2 | Delete dashboard |
| `GET` | `/api/bi/dashboard/:dashboardId/data` | 2 | Get warehouse metrics data (requires READY_FOR_REVIEW or PUBLISHED) |

### 3.4 `bi-reviews.js` — Dashboard Review Queue

| Method | Path | Phase | Purpose |
|--------|------|-------|---------|
| `GET` | `/api/bi/reviews` | 2 | List dashboards pending review |
| `PATCH` | `/api/bi/reviews/:id/approve` | 2 | Approve → PUBLISHED (+ notification) |
| `PATCH` | `/api/bi/reviews/:id/reject` | 2 | Reject → back to DRAFT |

### 3.5 `bi-analysis.js` — Analysis Workflow

| Method | Path | Phase | Purpose |
|--------|------|-------|---------|
| `GET` | `/api/bi/analysis` | 3 | List analysis requests |
| `GET` | `/api/bi/analysis/:id` | 3 | Get single analysis |
| `GET` | `/api/bi/analysis/:id/metrics` | 3 | Warehouse metrics for analysis |
| `PATCH` | `/api/bi/analysis/:id` | 3 | Update status/notes |
| `POST` | `/api/bi/analysis/:id/generate-insights` | 3 | Generate AI insights |

### 3.6 `bi-notifications.js` — Notification Read Management

| Method | Path | Phase | Purpose |
|--------|------|-------|---------|
| `GET` | `/api/bi/notifications` | 2 | List notifications |
| `PATCH` | `/api/bi/notifications/:id/read` | 2 | Mark single as read |
| `POST` | `/api/bi/notifications/read-all` | 2 | Mark all as read (requires `clientId`) |
| `GET` | `/api/bi/notifications/unread-count` | 2 | Count unread |

### 3.7 `bi-debug.js` — Debug & Testing

| Method | Path | Phase | Purpose |
|--------|------|-------|---------|
| `POST` | `/api/bi/debug/retry/:uploadId` | 3 | Re-process failed upload |
| `GET` | `/api/bi/debug/health` | 3 | Full pipeline health check |
| `POST` | `/api/bi/debug/self-test` | 3 | End-to-end ETL synthetic test |

---

## 4. Admin Panel Pages

### 4.1 BIRequests.jsx — Demandes BI (Request Management)

**Path:** `admin/src/pages/BIRequests.jsx`  
**Phase:** 1 + 2

**Purpose:** Central hub for managing incoming BI dashboard requests from clients.

**Layout:** Paginated table/card view with search, filter (by status), and sort controls.

**Actions available to admin:**
| Action | Condition | Effect |
|--------|-----------|--------|
| Verify Payment | `paymentStatus === 'PENDING'` | Sets `paymentStatus = 'VERIFIED'` + notification |
| Reject Payment | `paymentStatus === 'PENDING'` | Sets `paymentStatus = 'REJECTED'` + also rejects request + notification |
| Approve Request | `paymentStatus === 'VERIFIED'` AND status not terminal | Sets `status = 'APPROVED'` + notification |
| Reject Request | Status not terminal | Sets `status = 'REJECTED'` + notification |
| Request Info | `status === 'PENDING_REVIEW'` | Sets `status = 'REQUEST_INFO'` + notification |
| Save Notes | Always | Saves specialist + admin notes |

**State machine enforced:**
```
PENDING_REVIEW ──→ REQUEST_INFO (request more info)
      │
      ├──→ APPROVED (requires VERIFIED payment first)
      │
      └──→ REJECTED
      
Payment: PENDING ──→ VERIFIED (payment ok)
                    └──→ REJECTED (payment rejected + request auto-rejected)
```

**Endpoint calls:** `GET /bi-requests`, `PATCH /bi-requests/:id/status`, `PATCH /bi-requests/:id/payment`, `PATCH /bi-requests/:id/approve`, `PATCH /bi-requests/:id/reject`, `PATCH /bi-requests/:id/request-info`

### 4.2 BiUploadPortal.jsx — Portail BI (Upload Management)

**Path:** `admin/src/pages/BiUploadPortal.jsx`  
**Phase:** 3 + 4

**Purpose:** Upload ZIP exports from client POS systems, monitor ETL processing, and generate dashboards from completed uploads.

**Layout:** Filter bar (client, status, search), paginated table of uploads, detail modal opened on click.

**Actions available to admin:**
| Action | Condition | Effect |
|--------|-----------|--------|
| Upload ZIP | Always | Upload file with optional `requestId` + `clientId` |
| View Details | Always | Opens modal with full upload info |
| Cancel Upload | Status is UPLOADED/VALIDATING/PROCESSING | Marks FAILED, deletes ZIP |
| Delete Upload | Always | Permanent delete (cascade: logs, job, files, disk) |
| **Start ETL** | Upload linked to APPROVED request + not already processing/completed | Triggers ETL pipeline (returns 202) |
| **Generate Dashboard** | Upload COMPLETED + linked to APPROVED request + no dashboard exists | Creates DRAFT dashboard from template (Phase 4) |

**ETL visibility rules:**
- Start ETL button: shown when request is APPROVED, upload not already PROCESSING or COMPLETED
- Generate Dashboard button: shown when upload is COMPLETED, request is APPROVED, no dashboard exists

**Endpoint calls:** `GET /bi-uploads`, `GET /bi-uploads/:id`, `GET /bi-uploads/:id/logs`, `POST /bi-uploads`, `POST /bi-uploads/:id/start-etl`, `POST /bi-uploads/:id/cancel`, `DELETE /bi-uploads/:id`, `POST /bi/dashboards/generate-from-upload`

### 4.3 AdminBIDashboardManager.jsx — Gestionnaire de Dashboards

**Path:** `admin/src/pages/AdminBIDashboardManager.jsx`  
**Phase:** 2 (legacy, predates generate-from-upload)

**Purpose:** Legacy dashboard management page. Lists completed uploads and all dashboards. Admin can create dashboards manually (via the old `POST /bi/dashboards` endpoint) and manage status lifecycle.

**Note:** This page predates the `generate-from-upload` endpoint (Phase 4). The new workflow uses `BiUploadPortal.jsx` instead. This page still works for manual dashboard creation but is being superseded.

**Actions:**
| Action | Condition | Effect |
|--------|-----------|--------|
| Create Dashboard | Upload is COMPLETED | Opens modal, creates DRAFT dashboard with template |
| Start | DRAFT status | Sets IN_PROGRESS |
| Submit for Review | DRAFT or IN_PROGRESS | Sets READY_FOR_REVIEW |
| Preview | PUBLISHED status | Opens viewer in new tab |
| Delete | Always | Deletes dashboard |

**Endpoint calls:** `GET /bi-uploads`, `GET /bi/dashboards`, `POST /bi/dashboards`, `PATCH /bi/dashboards/:id`, `DELETE /bi/dashboards/:id`

### 4.4 AdminBIReview.jsx — Révision des Dashboards

**Path:** `admin/src/pages/AdminBIReview.jsx`  
**Phase:** 2

**Purpose:** Final review gate before dashboards go live to clients.

**Layout:** Card list of dashboards in READY_FOR_REVIEW or PUBLISHED status, with filter by status.

**Actions:**
| Action | Condition | Effect |
|--------|-----------|--------|
| Approve | READY_FOR_REVIEW | Sets PUBLISHED, creates DASHBOARD_READY notification to client |
| Reject | READY_FOR_REVIEW | Sends back to DRAFT |
| Preview | PUBLISHED | Opens dashboard in new tab |

### 4.5 AdminBIAnalystWorkspace.jsx — Espace Analyste BI

**Path:** `admin/src/pages/AdminBIAnalystWorkspace.jsx`  
**Phase:** 3

**Purpose:** Central workspace for BI analysts to manage analysis requests created by the ETL pipeline after successful completion.

**Layout:** Table with status filter, action buttons per row.

**Actions:**
| Action | Condition | Effect |
|--------|-----------|--------|
| View | Always | Navigate to analysis detail page |
| Start | PENDING | Sets UNDER_ANALYSIS, assigns to analyst |
| Complete | UNDER_ANALYSIS | Auto-generates AI insights, sets COMPLETED |
| Reject | PENDING or UNDER_ANALYSIS | Sets REJECTED with reason |
| Reopen | COMPLETED or REJECTED | Resets to PENDING |

### 4.6 AdminBIAnalysisDetail.jsx — Détail d'Analyse BI

**Path:** `admin/src/pages/AdminBIAnalysisDetail.jsx`  
**Phase:** 3

**Purpose:** Full detail view for a single analysis request, with warehouse metrics charts, AI insights, and status/notes management.

**Layout:** Cards displaying metrics (revenue line chart, top products bar chart, peak hours, inventory, appointments), insights cards, and a notes/status panel.

**Actions:**
| Action | Effect |
|--------|--------|
| Generate Insights | Calls AI generator, displays results |
| Start / Complete / Reject / Reopen | Status management |
| Save Notes | Persists analyst notes |

---

## 5. The Complete BI Flow

This section traces the journey from a client wanting a BI dashboard to them viewing it.

### Step 1: Client Submits BI Request

```
CLIENT PORTAL                  BACKEND                      DATABASE
────────────                   ───────                      ────────

Dashboard.tsx
  └─ Fill form (objectives,
     KPIs, requirements)
  └─ Upload CSV files
  └─ POST /api/bi-requests
                              bi-requests.js
                                └─ Validate licenseId
                                └─ Save CSV to disk
                                └─ Prisma: create BiRequest
                                   status = PENDING_REVIEW
                                   paymentStatus = PENDING
                                                          bi_requests
                                                          + CSV files on disk
```

### Step 2: Admin Reviews & Processes Request

```
ADMIN PANEL                    BACKEND                      DATABASE
───────────                    ───────                      ────────

BIRequests.jsx
  └─ View request details
  └─ Verify payment method
  └─ Click "Verify Payment"
                              PATCH /bi-requests/:id/payment
                                └─ Validate PENDING
                                └─ Set paymentStatus = VERIFIED
                                └─ Create PAYMENT_VERIFIED notification
                                                          bi_requests
                                                          bi_notifications

  └─ Click "Approve"
                              PATCH /bi-requests/:id/approve
                                └─ Validate VERIFIED payment
                                └─ Set status = APPROVED
                                └─ Create REQUEST_APPROVED notification
                                                          bi_requests (status=APPROVED)
                                                          bi_notifications
```

### Step 3: Client Uploads POS Data

```
ADMIN PANEL                    BACKEND                      DATABASE
───────────                    ───────                      ────────

BiUploadPortal.jsx
  └─ Click "Importer ZIP BI"
  └─ Enter clientId
  └─ Enter requestId (optional)
  └─ Select ZIP file
                              POST /api/bi-uploads
                                └─ Validate clientId
                                └─ Validate requestId (if provided,
                                   must exist + be APPROVED)
                                └─ SHA-256 duplicate check
                                └─ Save ZIP to disk
                                └─ Create BiUpload (status=UPLOADED)
                                                          bi_uploads
                                                          ZIP on disk
```

### Step 4: Admin Triggers ETL (Manual)

```
ADMIN PANEL                    BACKEND                      DATABASE
───────────                    ───────                      ────────

BiUploadPortal.jsx
  └─ Open upload detail
  └─ Click "Lancer ETL"
                              POST /bi-uploads/:id/start-etl
                                └─ Validate upload exists
                                └─ Validate requestId present
                                └─ Validate request is APPROVED
                                └─ Validate not already processing
                                └─ Set status = VALIDATING
                                └─ Upsert processing job (QUEUED)
                                └─ Fire etlPipeline.run() in BG
                                └─ Return 202
                                                          bi_uploads (VALIDATING)
                                                          bi_processing_jobs (QUEUED)
                                                          
ETL PIPELINE (background)
  └─ Extract ZIP → temp dir
  └─ Read metadata.json
  └─ Validate schema version
  └─ Validate CSV datasets
  └─ DB Transaction:
      ├─ Update job → PROCESSING
      ├─ Load dimensions (DimTime, DimClient,
      │    DimProduct, DimSupplier)
      ├─ Load facts (FactSale, FactInventory,
      │    FactAppointment, FactKitchenOrder)
      ├─ Mark job → COMPLETED
      ├─ Mark upload → COMPLETED
      └─ Auto-create BiAnalysisRequest (PENDING)
                                                          bi_uploads (COMPLETED)
                                                          bi_processing_jobs (COMPLETED)
                                                          dim_*, fact_* tables
                                                          bi_analysis_requests (PENDING)
```

### Step 5: Admin Generates Dashboard (Manual)

```
ADMIN PANEL                    BACKEND                      DATABASE
───────────                    ───────                      ────────

BiUploadPortal.jsx
  └─ View completed upload
  └─ Click "Générer Dashboard"
                              POST /bi/dashboards/generate-from-upload
                                └─ Validate upload is COMPLETED
                                └─ Validate linked request is APPROVED
                                └─ Validate no duplicate dashboard
                                └─ Load template from 
                                   bi-dashboard-templates.js
                                └─ Create BiDashboard (DRAFT)
                                └─ Create DASHBOARD_GENERATED
                                   admin notification
                                └─ Return 201
                                                          bi_dashboards (DRAFT)
                                                          bi_notifications
```

### Step 6: Admin Customizes Dashboard

```
ADMIN PANEL                    BACKEND                      DATABASE
───────────                    ───────                      ────────

AdminBIDashboardManager.jsx
  └─ View dashboard in list
  └─ Start (DRAFT → IN_PROGRESS)
                              PATCH /bi/dashboards/:id
                                └─ Validate transition: DRAFT→IN_PROGRESS
                                └─ Update status
                                                          bi_dashboards (IN_PROGRESS)
  └─ Customize config
     (dashboardConfig)
                              PATCH /bi/dashboards/:id
                                └─ Update dashboardConfig
                                                          bi_dashboards (config updated)
  └─ Submit for review
     (IN_PROGRESS → READY_FOR_REVIEW)
                              PATCH /bi/dashboards/:id
                                └─ Validate transition
                                                          bi_dashboards (READY_FOR_REVIEW)
```

### Step 7: Admin Reviews & Publishes

```
ADMIN PANEL                    BACKEND                      DATABASE
───────────                    ───────                      ────────

AdminBIReview.jsx
  └─ View dashboard ready
  └─ Preview data
                              GET /bi/dashboard/:id/data
                                └─ Validate READY_FOR_REVIEW or PUBLISHED
                                └─ Fetch warehouse metrics
                                                          fact_*, dim_* tables
  └─ Click "Approve"
                              PATCH /bi/reviews/:id/approve
                                └─ Validate READY_FOR_REVIEW
                                └─ Set status = PUBLISHED
                                └─ Set assignedAt = now
                                └─ Create DASHBOARD_READY
                                   client notification
                                                          bi_dashboards (PUBLISHED)
                                                          bi_notifications (client)
```

### Step 8: Client Views Dashboard

```
CLIENT PORTAL                  BACKEND                      DATABASE
────────────                   ───────                      ────────

BIDashboardViewer.tsx
  └─ Navigate to dashboard list
                              GET /bi/dashboards?clientId=X&status=PUBLISHED
                                └─ Filter by clientId + PUBLISHED
                                                          bi_dashboards (PUBLISHED)
  └─ Click on dashboard
                              GET /bi/dashboards/:id
                                └─ Fetch dashboard config
                                                          bi_dashboards (config)
                              GET /bi/dashboards/:id/data
                                └─ Fetch warehouse metrics
                                                          fact_*, dim_* tables
  └─ View Recharts:
     KPIs, line charts,
     bar charts, pie charts,
     tables, notifications
                                                           
  └─ See notification
                              GET /bi/notifications?clientId=X
                                                          bi_notifications
```

### Complete Flow Diagram

```
CLIENT              ADMIN                BACKEND                DATABASE
  │                    │                    │                      │
  ├─ Submit BI Request─┤                    │                      │
  │                    ├─ Review Request────┤                      │
  │                    ├─ Verify Payment────┤                      │
  │                    ├─ Approve Request───┤                      │
  │◄─ Notified ────────┤                    │                      │
  │                    │                    │                      │
  ├─ Provide POS data──┤                    │                      │
  │  (ZIP export)      │                    │                      │
  │                    ├─ Upload ZIP────────┤                      │
  │                    ├─ Start ETL (manual)┤                      │
  │                    │                    ├─ Extract + Validate──┤
  │                    │                    ├─ Load Dimensions─────┤
  │                    │                    ├─ Load Facts──────────┤
  │                    │                    ├─ Complete ───────────┤
  │                    ├─ Generate Dashboard─┤                      │
  │                    │  (manual)          ├─ Create DRAFT ───────┤
  │                    ├─ Customize ────────┤                      │
  │                    ├─ Submit for Review─┤                      │
  │                    ├─ Approve/Publish───┤                      │
  │◄─ Notified ────────┤                    │                      │
  ├─ View Dashboard────┤                    │                      │
  │                    │                    │                      │
```

---

## 6. ETL Pipeline

**File:** `backend/services/etl-pipeline.js`  
**Class:** `EtlPipeline`  
**Method:** `run(uploadId, zipPath)`

### Pipeline Steps

| # | Step | What Happens |
|---|------|-------------|
| 1 | `init` | Logs start, records time |
| 2 | `extract` | Unzips to temp dir (native `unzip` → fallback `adm-zip`) |
| 3 | `metadata` | Reads `metadata.json` (clientId, businessType, biSchemaVersion, enabledModules) |
| 4 | `schema-check` | Validates `biSchemaVersion` matches server's `BI_SCHEMA_VERSION` |
| 5 | `validate` | Checks CSV headers, column types, required datasets existence, duplicate rows |
| 6 | `transaction` (Prisma) |
| 6a | | Upserts BiProcessingJob → PROCESSING |
| 6b | | Loads dimensions: DimTime, DimClient, DimProduct, DimSupplier |
| 6c | | Loads facts: FactSale, FactInventory, FactAppointment, FactKitchenOrder |
| 6d | | Marks BiProcessingJob → COMPLETED |
| 6e | | Marks BiUpload → COMPLETED |
| 6f | | Creates BiAnalysisRequest → PENDING (non-fatal) |
| 7 | Return | `{ success, recordsLoaded, elapsed }` |

### Error Handling
- Any failure aborts the pipeline immediately
- Upload + job marked FAILED with step-specific error message
- Temp directory always cleaned up in `finally` block
- BiAnalysisRequest creation failure is non-fatal (logged as warning)

### Status Transitions

```
BiUpload:  (any) ──→ VALIDATING ──→ PROCESSING ──→ COMPLETED
                         │                              │
                         └──→ FAILED                    │
                                                        │
BiProcessingJob:  QUEUED ──→ PROCESSING ──→ COMPLETED   │
                               │              │         │
                               └──→ FAILED     │         │
                                               │         │
BiAnalysisRequest:                PENDING ◄─────┘─────────┘
                                  (auto-created on success)
```

---

## 7. Warehouse Service

**File:** `backend/services/warehouse-service.js`

### Query Methods

| Method | Returns | Used By |
|--------|---------|---------|
| `getRevenueByDay(tenantId, days, timezone)` | Array of `{ date, revenue }` | Dashboard data, analysis metrics |
| `getTopProducts(tenantId, limit)` | Array of `{ productName, timesSold, stock, price }` | Dashboard data, analysis metrics |
| `getInventoryTurnover(tenantId)` | Array of `{ productName, turnover, timesSold, stock }` | Retail/pharmacy dashboards |
| `getTableTurnover(tenantId)` | Array of `{ tableNumber, orderCount }` | Restaurant/cafe dashboards |
| `getKitchenPerformance(tenantId, days)` | `{ total, byStatus, byPriority }` | Restaurant/cafe dashboards |
| `getAppointmentSummary(tenantId)` | `{ total, byStatus }` | Salon/pharmacy dashboards |
| `getSupplierPerformance(tenantId)` | Array of supplier info | Retail/pharmacy dashboards |
| `getPeakHours(tenantId, timezone)` | Array of `{ hour, count }` | Restaurant/cafe dashboards |
| `getAverageTicket(tenantId, days)` | `{ average, count, total }` | All business types |
| `getDashboardSummary(tenantId, businessType, timezone)` | **Composite** — calls sub-methods based on business type | Dashboard data endpoint, upload summary endpoint, analysis metrics |

### Business-Type-Aware Summary

The `getDashboardSummary` method returns a composite payload:

```json
{
  "revenue": [...],           // ALL types
  "topProducts": [...],       // ALL types
  "peakHours": [...],         // restaurant, cafe only
  "tableTurnover": [...],     // restaurant, cafe only
  "kitchenPerformance": {...},// restaurant, cafe only
  "averageTicket": {...},     // restaurant, cafe only
  "inventoryTurnover": [...], // retail, pharmacy only
  "supplierPerformance": [...],// retail, pharmacy only
  "appointmentSummary": {...} // pharmacy, salon only
}
```

---

## 8. Dashboard Templates

**File:** `backend/services/bi-dashboard-templates.js`

5 business type templates, each defining sections with chart types:

| Business | Sections | Chart Types |
|----------|----------|-------------|
| **restaurant** | 7 | KPI, line (revenue), bar (peak hours, top products, table turnover), pie (kitchen orders), KPI (average ticket) |
| **cafe** | 6 | KPI, line, bar (peak hours, top products, table turnover), KPI |
| **retail** | 5 | KPI, line, bar (top products, inventory turnover), table (suppliers) |
| **pharmacy** | 6 | KPI, line, bar (top products, inventory turnover), pie (appointments), table (suppliers) |
| **salon** | 4 | KPI, line, bar (top products), pie (appointments) |

Templates are stored as JavaScript objects, **not** in the database. The `getTemplate(businessType)` function returns the matching template (falls back to `restaurant`).

---

## 9. Metabase Strategy

### Current Status: Installed but Unconfigured

| Component | Status |
|-----------|--------|
| Metabase JAR | `D:\Carthapos\metabase\metabase.jar` v0.52.4 (405 MB) |
| Running | Yes, on port 3000 |
| Own database | PostgreSQL `metabase` (separate from `pos_system`) |
| Connected to `pos_system` | **No** — not configured as data source |
| Admin user created | **No** — setup wizard not completed |
| Dashboards created | **No** — zero Metabase dashboards |
| API integration in code | **No** — zero lines of Metabase API code |

### Architecture Decision

```
┌─────────────────────────────────────────────────────────────────┐
│                      METABASE STRATEGY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ Metabase = ADMIN-ONLY analytics tool                        │
│  ✅ Admin uses Metabase for ad-hoc warehouse queries            │
│  ✅ Admin builds reports/dashboards manually in Metabase UI     │
│                                                                  │
│  ❌ NO embedding in client portal (requires Enterprise license) │
│  ❌ NO iframes in React app                                      │
│  ❌ NO JWT signed embedding (unsupported in OSS)                │
│  ❌ NO client access to Metabase (blocked by design)            │
│  ❌ NO Metabase API calls from backend code                      │
│                                                                  │
│  CLIENT DASHBOARDS = REACT + RECHARTS (custom-built)            │
│  ADMIN ANALYTICS = METABASE (manual, optional)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Planned Phase 6 Tasks
1. Create read-only PostgreSQL user for Metabase (`GRANT SELECT`)
2. Add `pos_system` database as data source in Metabase UI
3. Create documentation at `docs/bi/metabase-setup.md`
4. Optionally create `/api/bi/debug/metabase-check` endpoint

---

## 10. Notification System

**Table:** `bi_notifications`  
**Types used across the system:**

| Type | Created By | Recipient | Purpose |
|------|-----------|-----------|---------|
| `PAYMENT_VERIFIED` | bi-requests.js | Client | Payment has been verified for their BI request |
| `PAYMENT_REJECTED` | bi-requests.js | Client | Payment has been rejected |
| `REQUEST_APPROVED` | bi-requests.js | Client | BI request approved, can proceed with data prep |
| `REQUEST_REJECTED` | bi-requests.js | Client | BI request rejected |
| `REQUEST_INFO` | bi-requests.js | Client | Additional information needed |
| `DASHBOARD_GENERATED` | bi-dashboards.js | **Admin** (no clientId) | Dashboard draft is ready for customization |
| `DASHBOARD_READY` | bi-reviews.js or bi-dashboards.js | Client | Dashboard has been published and is available |

**Notification flow:**
- Admin actions trigger notifications via `prisma.biNotification.create()` directly in route handlers
- Notifications with `clientId = null` are admin-only
- Clients view notifications in `BIDashboardViewer.tsx` sidebar
- Unread count available via `GET /bi/notifications/unread-count`

---

## 11. Implementation Status

### Phase 1 — BiRequest PostgreSQL Migration ✅

| Component | Status | Details |
|-----------|--------|---------|
| Prisma model `BiRequest` | ✅ | 22 fields, relations to Client & License |
| API endpoints (4) | ✅ | POST, GET list, GET detail, PATCH status |
| Frontend Dashboard.tsx | ✅ | Updated types, form fields, status colors |
| Admin BIRequests.jsx | ✅ | Status options, payment badge, admin notes |
| Migration | ✅ | `20260621000000_add_bi_requests` |
| JSON fallback | ✅ | `bi-requests.json` preserved for safety |

### Phase 2 — Payment & Approval Workflow ✅

| Component | Status | Details |
|-----------|--------|---------|
| Payment endpoint | ✅ | VERIFY/REJECT with method + notes |
| Approve endpoint | ✅ | Requires VERIFIED payment |
| Reject endpoint | ✅ | Terminal status protection |
| Request-info endpoint | ✅ | Status = REQUEST_INFO |
| Admin UI buttons | ✅ | Payment panel, approve/reject/info |
| Notifications | ✅ | 5 notification types for each transition |

### Phase 3 — Upload↔Request Linkage + Manual ETL ✅

| Component | Status | Details |
|-----------|--------|---------|
| `requestId` on BiUpload | ✅ | Nullable FK to BiRequest, onDelete: SetNull |
| POST accepts `requestId` | ✅ | Validates request exists + APPROVED |
| Manual ETL endpoint | ✅ | `POST /bi-uploads/:id/start-etl` — returns 202 |
| ETL fires in background | ✅ | Fire-and-forget with error logging |
| Dashboard detection | ✅ | GET list + detail include `dashboards` |
| Admin UI — request linkage | ✅ | Table column + detail card with request info |
| Admin UI — Start ETL button | ✅ | Visible for APPROVED + not processing |
| Admin UI — requestId prompt | ✅ | Optional during upload |
| Migration | ✅ | `20260621010000_add_request_linkage` |

### Phase 4 — Admin-Controlled Dashboard Generation ✅

| Component | Status | Details |
|-----------|--------|---------|
| `POST /api/bi/dashboards/generate-from-upload` | ✅ | Validates COMPLETED, APPROVED, no duplicate |
| Template loading | ✅ | From `bi-dashboard-templates.js` |
| Dashboard created as DRAFT | ✅ | Never auto-published |
| Admin notification | ✅ | `DASHBOARD_GENERATED` (admin-only, no clientId) |
| Upload includes dashboard info | ✅ | GET list + detail show linked dashboard |
| Admin UI — Generate button | ✅ | Shown when COMPLETED + APPROVED + no dashboard |
| Admin UI — Dashboard card | ✅ | Shows status, name, ID in detail modal |
| **Zero auto-generation** | ✅ | Verified: no etl-pipeline dashboard creation |

### Phase 5 — Planned

| Item | Status |
|------|--------|
| ETL refinement (queue, retry, schema evolution) | Not started |
| Dashboard customization UI (drag-drop sections, chart picker) | Not started |
| Frontend BIDashboardViewer route | ✅ Already wired in App.tsx (lines 119–128) |

### Phase 6 — Planned

| Item | Status |
|------|--------|
| JWT auth enablement for BI routes | Not started |
| Metabase admin setup (read-only user + data source) | Installed but unconfigured |
| `bi-requests.json` archival | Not started |
| Role-based access (admin vs analyst vs client) | Not started |

### Never Planned

| Item | Reason |
|------|--------|
| `BiDashboardTemplate` Prisma model | Templates stay in JS |
| `BiAnalysisRequest` deletion | Keep for history |
| Metabase client embedding | OSS lacks row-level security |
| Auto-publish on ETL complete | Admin-controlled by design |
| Auto-generate on ETL complete | Admin-controlled by design |

---

## 12. Risk Assessment

### Current Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ETL performance at scale | Medium | High | Current: synchronous Node.js. Future: background queue (Bull/Bee) |
| `bi-requests.json` still active | Medium | Low | Dual-write path. Archive after CRUD testing. |
| No clientId relation on BiUpload | Low | Low | `clientId` is raw String, no FK enforcement |
| No `@updatedAt` on BiUpload/BiProcessingJob | Low | Low | `updatedAt` is nullable `DateTime?` without `@updatedAt` |
| Metabase unconfigured | Medium | Low | Currently unused. Phase 6 task. |

### Resolved Risks

| Risk | Resolution |
|------|-----------|
| Missing BIDashboardViewer route | ✅ Route already wired at `App.tsx:119-128` under `/dashboard/bi-dashboard/:dashboardId` |

### Design Safeguards

| Safeguard | Where |
|-----------|-------|
| No auto-ETL on upload | `bi-uploads.js` POST does not call ETL |
| No auto-dashboard on ETL complete | `etl-pipeline.js` does not create dashboards |
| Status transitions enforced | `bi-dashboards.js` state machine |
| Payment required before approval | `bi-requests.js` approve validation |
| Duplicate file detection | SHA-256 on upload |
| Tenant isolation | All warehouse queries filter by `tenantId` |
| Cascade deletes | Foreign keys with Cascade/SetNull |
| Request-upload linkage validation | Upload requires APPROVED request |

---

## Appendix A: File Inventory

### Backend Routes (7 files)

| File | Lines | Endpoints |
|------|-------|-----------|
| `backend/routes/bi-requests.js` | ~517 | 8 |
| `backend/routes/bi-uploads.js` | ~503 | 9 |
| `backend/routes/bi-dashboards.js` | ~298 | 8 |
| `backend/routes/bi-reviews.js` | ~96 | 3 |
| `backend/routes/bi-analysis.js` | ~129 | 5 |
| `backend/routes/bi-notifications.js` | ~80 | 4 |
| `backend/routes/bi-debug.js` | ~337 | 3 |

### Backend Services (4 files)

| File | Purpose |
|------|---------|
| `backend/services/etl-pipeline.js` | ZIP extraction, CSV validation, dimension/fact loading |
| `backend/services/warehouse-service.js` | Read-only warehouse queries for dashboard data |
| `backend/services/bi-dashboard-templates.js` | 5 business type templates with section definitions |
| `backend/services/bi-insight-generator.js` | AI-powered insight generation from warehouse metrics |

### Admin Pages (6 BI pages)

| File | Purpose | Key Actions |
|------|---------|-------------|
| `BIRequests.jsx` | BI request management | Payment verify/reject, approve/reject, request info |
| `BiUploadPortal.jsx` | Upload + ETL + dashboard generation | Upload ZIP, Start ETL, Generate Dashboard |
| `AdminBIDashboardManager.jsx` | Legacy dashboard management | Create, customize, submit for review |
| `AdminBIReview.jsx` | Review queue | Approve/reject dashboards for publication |
| `AdminBIAnalystWorkspace.jsx` | Analysis request list | Start, complete, reject, reopen |
| `AdminBIAnalysisDetail.jsx` | Analysis detail + insights | View metrics, generate insights, save notes |

### Frontend Pages (2 client-facing BI pages)

| File | Purpose |
|------|---------|
| `frontend/src/pages/dashboard/Dashboard.tsx` | Submit BI requests, track status, download CSVs |
| `frontend/src/pages/dashboard/BIDashboardViewer.tsx` | View published dashboards (Recharts) |

### Database Migrations

| Migration | Purpose |
|-----------|---------|
| `20260611180000_create_bi_views` | 10 SQL views for Metabase compatibility |
| `20260621000000_add_bi_requests` | BiRequest + BiDashboard + BiNotification + BiAnalysisRequest models |
| `20260621010000_add_request_linkage` | Add `requestId` to BiUpload |

---

## Appendix B: Status Transition Diagrams

### BiRequest
```
                  ┌─────────┐
                  │PENDING  │
                  │_REVIEW  │
                  └────┬────┘
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
         ┌────────┐┌──────┐┌───────────┐
         │REQUEST ││APPROV││ REJECTED  │
         │_INFO   ││ED   ││           │
         └────────┘└──────┘└───────────┘
              │
              └──→ PENDING_REVIEW (if client re-submits)
```

### BiDashboard
```
DRAFT ──→ IN_PROGRESS ──→ READY_FOR_REVIEW ──→ PUBLISHED ──→ ARCHIVED
  ↑                            │                    │
  └────────────────────────────┘                    │
  (if rejected)                                     │
  ↑ ←───────────────────────────────────────────────┘
```

### BiUpload
```
UPLOADED ──→ VALIDATING ──→ PROCESSING ──→ COMPLETED
   │             │               │
   └───────┬─────┴───────┬───────┘
           ▼             ▼
         FAILED        FAILED
         (cancel)      (error)
```

### BiAnalysisRequest
```
PENDING ──→ UNDER_ANALYSIS ──→ COMPLETED
   │              │               │
   └──────┬───────┴───────┬───────┘
          ▼               ▼
        REJECTED        REJECTED
          │               │
          └───────┬───────┘
                  ▼
               PENDING (reopen)
```

---

## Appendix C: Notification Types

| Type | Triggered By | Has clientId? | Recipient |
|------|-------------|---------------|-----------|
| `PAYMENT_VERIFIED` | Admin verifies payment | ✅ Yes | Client |
| `PAYMENT_REJECTED` | Admin rejects payment | ✅ Yes | Client |
| `REQUEST_APPROVED` | Admin approves request | ✅ Yes | Client |
| `REQUEST_REJECTED` | Admin rejects request | ✅ Yes | Client |
| `REQUEST_INFO` | Admin requests info | ✅ Yes | Client |
| `DASHBOARD_GENERATED` | Admin generates dashboard | ❌ No | Admin only |
| `DASHBOARD_READY` | Admin publishes dashboard | ✅ Yes | Client |

---

*End of report — Phases 1–4 complete, Phase 5–6 planned. Updated June 28, 2026.*
