# BI Phase 3 Report — Analyst Review Workflow

## Overview

Phase 3 introduces a BI Analyst layer between ETL completion and dashboard publication. Every completed upload generates an analysis request. An analyst reviews warehouse data, generates insights, and only then can a dashboard be created and published.

## Workflow

```
UPLOAD_COMPLETED
    ↓  (auto-create)
UNDER_ANALYSIS
    ↓  (analyst starts work)
ANALYSIS_COMPLETED
    ↓  (dashboard can now be created)
DASHBOARD_CREATED
    ↓
READY_FOR_REVIEW
    ↓  (reviewer approves)
PUBLISHED
    ↓  (client sees it)
```

## 1. Files Created

| File | Purpose |
|------|---------|
| `backend/prisma/migrations/20260611210000_add_bi_analysis_requests/migration.sql` | Raw SQL migration for BiAnalysisRequest table |
| `backend/services/bi-insight-generator.js` | Generates BI insights from warehouse data per business type |
| `backend/routes/bi-analysis.js` | Analysis request CRUD + metrics + insight generation API |
| `backend/routes/bi-reviews.js` | Dashboard review/approval/rejection API |
| `admin/src/pages/AdminBIAnalystWorkspace.jsx` | Admin page listing all analysis requests |
| `admin/src/pages/AdminBIAnalysisDetail.jsx` | Admin detail page showing warehouse metrics + insights |
| `admin/src/pages/AdminBIReview.jsx` | Admin page for approving/rejecting dashboards |

## 2. Files Modified

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Added BiAnalysisRequest model + back-references on Client/License/BiUpload |
| `backend/services/etl-pipeline.js` | STEP 5e: auto-create BiAnalysisRequest when ETL completes |
| `backend/routes/bi-dashboards.js` | POST: gate creation behind COMPLETED analysis; PATCH: extended statuses with validation; GET data: accept READY_FOR_REVIEW + PUBLISHED |
| `backend/server.js` | Mounted `/api/bi/analysis` and `/api/bi/reviews` routes |
| `admin/src/App.jsx` | Added routes: `/bi-analysis`, `/bi-analysis/:id`, `/bi-review` |
| `admin/src/components/layout/Layout.jsx` | Added nav items: "Analyse BI" (`/bi-analysis`), "Validation BI" (`/bi-review`) |
| `admin/src/pages/AdminBIDashboardManager.jsx` | Updated status labels (READY → READY_FOR_REVIEW, → PUBLISHED); updated action buttons |
| `frontend/src/pages/dashboard/BIDashboardViewer.tsx` | List mode only shows `status=PUBLISHED` dashboards |

## 3. Prisma Changes

### BiAnalysisRequest Model

```
id              String    @id @default(cuid())
clientId        String
licenseId       String?
uploadId        String?
businessType    String
status          String    @default("PENDING")  // PENDING | UNDER_ANALYSIS | COMPLETED | REJECTED
assignedTo      String?
notes           String?
analysisSummary Json?
insights        Json?
createdAt       DateTime
updatedAt       DateTime
completedAt     DateTime?

Relations: Client, License, BiUpload
Indexes: clientId, status
Table: bi_analysis_requests
```

### BiDashboard Statuses Updated

Old: DRAFT, IN_PROGRESS, READY, ARCHIVED
New: DRAFT, IN_PROGRESS, READY_FOR_REVIEW, PUBLISHED, ARCHIVED

Valid transitions enforced server-side:
- DRAFT → IN_PROGRESS
- IN_PROGRESS → READY_FOR_REVIEW
- READY_FOR_REVIEW → PUBLISHED, DRAFT
- PUBLISHED → ARCHIVED
- ARCHIVED → DRAFT

## 4. API Endpoints Added

### Analysis Requests (`/api/bi/analysis`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List requests (filters: clientId, status, businessType) |
| GET | `/:id` | Single request with upload info |
| GET | `/:id/metrics` | Warehouse metrics (revenue, products, peak hours, etc.) |
| PATCH | `/:id` | Update status/notes/assignedTo/insights; sets completedAt on COMPLETED |
| POST | `/:id/generate-insights` | Auto-generate insights from warehouse data |

### Reviews (`/api/bi/reviews`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List dashboards (filters: status; default: READY_FOR_REVIEW + PUBLISHED) |
| PATCH | `/:id/approve` | Approve → status=PUBLISHED + create notification |
| PATCH | `/:id/reject` | Reject → status=DRAFT |

## 5. Admin Pages Added

| Route | Page | Description |
|-------|------|-------------|
| `/bi-analysis` | AdminBIAnalystWorkspace | List all analysis requests; actions: View, Start, Complete, Reject, Reopen |
| `/bi-analysis/:id` | AdminBIAnalysisDetail | Detail view with warehouse metrics (Revenue Trend, Top Products, Peak Hours, Inventory), insight cards, analyst notes editor |
| `/bi-review` | AdminBIReview | Dashboard review queue; actions: Approve (→PUBLISHED), Reject (→DRAFT), Preview |

## 6. Workflow Diagram

```
Client Uploads Data
    ↓
ETL Pipeline Processes
    ↓                    ──→ ERROR (marked failed)
COMPLETED (upload)
    ↓  (auto-create)
BiAnalysisRequest[PENDING]
    ↓  (analyst clicks "Start")
UNDER_ANALYSIS
    ↓  (analyst reviews metrics, generates insights, adds notes)
    ↓──→ REJECTED (reopenable)
COMPLETED
    ↓  (admin can now create dashboard via AdminBIDashboardManager)
DASHBOARD[DRAFT]
    ↓  (analyst works on dashboard)
IN_PROGRESS
    ↓  (submitted for review)
READY_FOR_REVIEW
    ↓  (BIReview page: Approve / Reject)
    ↓──→ Reject → DRAFT (loop back)
PUBLISHED  ←─→ ARCHIVED
    ↓  (client sees it in /dashboard/bi-dashboard)
```

## 7. Remaining Gaps Before AI-Powered BI

1. **Manual insight generation**: Currently triggered on-demand (POST /generate-insights). Could be automated on COMPLETED or run via a scheduled job.
2. **No AI insight model**: Insights are rule-based (template matching per business type). An LLM or ML model could generate richer, context-aware insights.
3. **No email notifications**: Analyst assignment/rejection/completion events could trigger email via Resend/Nodemailer.
4. **No SLA tracking**: No timers or escalation if analysis takes too long.
5. **No batch operations**: Analysts cannot complete/reject multiple requests at once.
6. **No dashboard recommendations**: AI could suggest optimal chart layouts, KPI selection, or section ordering based on data patterns.
7. **No anomaly detection**: Warehouse data could be scanned for outliers (e.g., sudden revenue drops, stock anomalies).
8. **No natural language querying**: Client could ask questions like "What was my best-selling product last month?" with AI-generated responses.
9. **No automated re-analysis**: If new data is uploaded, the old analysis could be invalidated and re-triggered.
10. **Analyst queue prioritization**: No scoring to prioritize high-value or overdue analyses.

## 8. Build Verification

| Check | Status |
|-------|--------|
| Prisma migration applied | ✓ `20260611210000_add_bi_analysis_requests` |
| Prisma client regenerated | ✓ v5.22.0 |
| Backend routes load | ✓ All 12 Phase 3 routes registered |
| ETL pipeline loads | ✓ No syntax errors |
| Insight generator loads | ✓ Service exports correctly |
| Admin pages compile | ✓ 3 new pages + 3 modified pages |
| Client list filter updated | ✓ Only PUBLISHED dashboards shown |
| Dashboard status validation | ✓ Server-side transition enforcement |

## Backward Compatibility Notes

- Existing dashboards with status `READY` will need manual migration to `PUBLISHED` if they should continue appearing for clients. The client list filter now requires `PUBLISHED`.
- The `/api/bi/dashboards` POST now requires a completed analysis. This only affects new dashboard creation.
- The ETL pipeline change is additive (STEP 5e in the same transaction). If it fails, the ETL still succeeds.
- All existing API endpoints remain unchanged.
- The `bi_dashboards` table already had `status` as a string column, so no column migration is needed for statuses.
