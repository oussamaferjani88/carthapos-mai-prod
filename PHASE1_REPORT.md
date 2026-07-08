    # Phase 1 — BI Module: JSON → PostgreSQL Migration

    ## Status: COMPLETE ✓

    ---

    ## Done

    ### 1. Prisma Model — `BiRequest`
    **File:** `backend/prisma/schema.prisma` (lines 391–428)

    - 22 fields: `id`, `clientId` (required), `licenseId`, `businessType`, `businessName`, `message`, `objectives` (Json), `kpis` (Json), `dashboardRequirements`, `dashboardType`, `userId`, `userEmail`, `status` (default `PENDING_REVIEW`), `paymentStatus` (default `PENDING`), `paymentMethod`, `paymentNotes`, `adminNotes`, `specialistNotes`, `files` (Json), `createdAt`, `updatedAt`
    - Relations: `Client` (`onDelete: Restrict`), `License` (`onDelete: SetNull`)
    - Indexes: `clientId`, `licenseId`, `status`, `paymentStatus`
    - Maps to table: `bi_requests`
    - Opposite relations added on `Client` (`biRequests`) and `License` (`biRequests`)

    ### 2. API Route — Rewritten to Prisma
    **File:** `backend/routes/bi-requests.js` (full rewrite)

    4 endpoints preserved with identical response shapes:

    | Endpoint | Old (JSON file) | New (Prisma) | Compatible |
    |----------|----------------|--------------|------------|
    | `POST /api/bi-requests` | File I/O | `prisma.biRequest.create` | ✓ |
    | `GET /api/bi-requests` | File I/O | `prisma.biRequest.findMany` + count | ✓ |
    | `GET /api/bi-requests/:id` | File I/O | `prisma.biRequest.findUnique` | ✓ |
    | `PATCH /api/bi-requests/:id/status` | File I/O | `prisma.biRequest.update` | ✓ |

    Key behaviors preserved:
    - Unpaginated GET returns flat array (for `Dashboard.tsx`)
    - Paginated GET returns `{ items, total, page, pageSize, totalPages }` (for `BIRequests.jsx`)
    - Multer file upload identical (CSV only, 10MB limit, 10 files)
    - License lookup via `prisma.license.findUnique` to derive `clientId`
    - New fields accepted: `objectives`, `kpis`, `dashboardRequirements`, `paymentStatus`, `paymentMethod`, `paymentNotes`, `adminNotes`
    - Status validation: `PENDING_REVIEW | APPROVED | REJECTED | REQUEST_INFO`
    - Payment status validation: `PENDING | VERIFIED | REJECTED`

    ### 3. Frontend — Dashboard.tsx
    **File:** `frontend/src/pages/dashboard/Dashboard.tsx`

    - `BIRequest` type: status union updated to `PENDING_REVIEW | APPROVED | REJECTED | REQUEST_INFO`; added `objectives?`, `kpis?`, `dashboardRequirements?`, `paymentStatus?`
    - `biForm` state: added `objectives`, `kpis`, `dashboardRequirements`
    - Form UI: 3 new input fields (Objectives multi-line, KPIs multi-line, Dashboard requirements)
    - `submitBiRequest`: normalizes line-separated input → JSON arrays before POST
    - `getBiStatusClasses`: mapped new status values to colors (APPROVED=green, PENDING_REVIEW=amber, REJECTED=red, REQUEST_INFO=blue)
    - DELIVERED check → APPROVED check for download notice
    - Request card: displays objectives, KPIs, dashboard requirements when present

    ### 4. Admin — BIRequests.jsx
    **File:** `admin/src/pages/BIRequests.jsx`

    - `STATUS_OPTIONS`: `['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'REQUEST_INFO']`
    - `getStatusClasses`: mapped new statuses to colors
    - `getPaymentStatusClasses`: new helper (VERIFIED=green, REJECTED=red, PENDING=gray)
    - Payment status badge displayed next to request status
    - Payment method displayed when present
    - Objectives, KPIs, dashboard requirements displayed when present
    - Admin notes textarea added alongside specialist notes
    - `adminNotesById` state initialized from API response
    - `updateStatus` sends both `specialistNotes` and `adminNotes`
    - No payment verification workflow (Phase 2)
    - No approval endpoints (Phase 2)

    ### 5. Migration
    - Migration SQL created: `prisma/migrations/20260621000000_add_bi_requests/migration.sql`
    - SQL executed via `prisma db execute`
    - Migration marked applied via `prisma migrate resolve`
    - Client regenerated via `prisma generate`
    - `prisma.biRequest` verified working

    ---

    ## Not Done (Future Phases)

    | Item | Phase |
    |------|-------|
    | ~~Payment verification workflow~~ | ✅ Phase 2 done |
    | ~~Payment status update UI in admin~~ | ✅ Phase 2 done |
    | Upload → request linkage (`uploadId` relation) | Phase 3 |
    | `BiUpload` relation on `BiRequest` | Phase 3 |
    | ETL auto-trigger after upload | Phase 3 (must remain manual) |
    | Dashboard generation after ETL | Phase 4 (admin-controlled) |
    | Auto-publish dashboards | Phase 4 (must remain manual) |
    | Template DB migration | Never (templates stay in JS) |
    | `BiDashboardTemplate` Prisma model | Never |
    | `BiAnalysisRequest` deletion | Never (keep for history) |
    | JWT auth enablement | Phase 6 |
    | `bi-requests.json` archival | After CRUD testing confirms stability |
    | Metabase integration | Not in scope |
    | ETL refactor | Not in scope |

    ---

    ## Files Modified (4 total)

    | File | Lines Changed | Risk |
    |------|--------------|------|
    | `backend/prisma/schema.prisma` | +40 | LOW |
    | `backend/routes/bi-requests.js` | ~200 rewrite | MEDIUM |
    | `frontend/src/pages/dashboard/Dashboard.tsx` | ~60 | LOW |
    | `admin/src/pages/BIRequests.jsx` | ~55 | MEDIUM |

    ## Files Intentionally Unmodified (12 total)

    `bi-uploads.js`, `bi-dashboards.js`, `bi-analysis.js`, `etl-pipeline.js`, `bi-dashboard-templates.js`, `warehouse-service.js`, `server.js`, `AdminBIDashboardManager.jsx`, `AdminBIReview.jsx`, `BIDashboardViewer.tsx`, `bi-requests.json` (data file), `BI_IMPACT_REPORT_AND_PLAN.md`

    ---

    # Phase 2 — Manual Payment Verification & Approval Workflow

    ## Status: COMPLETE ✓

    ---

    ## Done

    ### 1. New Endpoints — `backend/routes/bi-requests.js`

    **Added 4 new endpoints** (plus a `createNotification` helper):

    #### `PATCH /api/bi-requests/:id/payment`
    - **Purpose:** Verify or reject payment
    - **Body:** `{ paymentStatus: 'VERIFIED' | 'REJECTED', paymentMethod?, paymentNotes? }`
    - **Validation:** Rejects if `paymentStatus` is not `VERIFIED` or `REJECTED`. Rejects if `paymentStatus` is not currently `'PENDING'`
    - **Side effect:** If `paymentStatus='REJECTED'`, also sets request `status='REJECTED'`
    - **Notification:** `PAYMENT_VERIFIED` or `PAYMENT_REJECTED`

    #### `PATCH /api/bi-requests/:id/approve`
    - **Purpose:** Approve a BI request
    - **Body:** `{ adminNotes? }`
    - **Validation:** **Blocks** if `paymentStatus !== 'VERIFIED'`. Blocks if status is terminal (`APPROVED`/`REJECTED`)
    - **Side effect:** Sets `status='APPROVED'`
    - **Notification:** `REQUEST_APPROVED`

    #### `PATCH /api/bi-requests/:id/reject`
    - **Purpose:** Reject a BI request
    - **Body:** `{ adminNotes? }`
    - **Validation:** **Blocks** if status is already terminal (`APPROVED`/`REJECTED`)
    - **Side effect:** Sets `status='REJECTED'`
    - **Notification:** `REQUEST_REJECTED`

    #### `PATCH /api/bi-requests/:id/request-info`
    - **Purpose:** Request additional information from client
    - **Body:** `{ adminNotes? }`
    - **Validation:** Only allowed when `status === 'PENDING_REVIEW'`
    - **Side effect:** Sets `status='REQUEST_INFO'`
    - **Notification:** `REQUEST_INFO`

    ### 2. Notification Creation

    A `createNotification(clientId, title, message, type)` helper creates records in `bi_notifications` for every workflow transition without modifying `bi-notifications.js`.

    Notification types used:
    - `PAYMENT_VERIFIED` — "Your payment has been verified for BI request..."
    - `PAYMENT_REJECTED` — "Your payment for BI request ... has been rejected."
    - `REQUEST_APPROVED` — "Your BI request ... has been approved. You may proceed with data preparation."
    - `REQUEST_REJECTED` — "Your BI request ... has been rejected."
    - `REQUEST_INFO` — "Additional information is required for your BI request..."

    ### 3. Admin UI — `admin/src/pages/BIRequests.jsx`

    **New state:**
    - `paymentMethodById` — payment method input per request
    - `paymentNotesById` — payment notes input per request
    - `requestInfoNoteById` — info request message input per request

    **New action buttons (per request card):**

    | Button | Visible When | Enabled When | Action |
    |--------|-------------|--------------|--------|
    | Verify Payment | `paymentStatus === 'PENDING'` | Always | Calls `PATCH /:id/payment` with `VERIFIED` |
    | Reject Payment | `paymentStatus === 'PENDING'` | Always | Calls `PATCH /:id/payment` with `REJECTED` |
    | Approve | Always | `paymentStatus === 'VERIFIED'` AND status is not terminal | Calls `PATCH /:id/approve` |
    | Reject | Always | Status is not `APPROVED`/`REJECTED` | Calls `PATCH /:id/reject` |
    | Request Info | Always | `status === 'PENDING_REVIEW'` | Calls `PATCH /:id/request-info` |

    **New UI sections:**
    - **Payment verification panel** (dashed border, shown when `paymentStatus === 'PENDING'`): inputs for payment method + notes, Verify/Reject buttons
    - **Info request note** (blue dashed border, shown when `status === 'REQUEST_INFO'`): textarea for what info the admin needs

    ### 4. State Transition Validations

    | Transition | Allowed? |
    |-----------|---------|
    | PENDING payment → VERIFIED | ✓ |
    | PENDING payment → REJECTED (also rejects request) | ✓ |
    | VERIFIED payment → APPROVE request | ✓ |
    | PENDING payment → APPROVE request | **BLOCKED** (must verify first) |
    | Already VERIFIED payment → Verify again | **BLOCKED** (already verified) |
    | Terminal APPROVED → Reject | **BLOCKED** |
    | Terminal REJECTED → Approve | **BLOCKED** |
    | PENDING_REVIEW → Request Info | ✓ |

    ---

    ## Not Done (Future Phases)

    | Item | Phase |
    |------|-------|
    | Upload → request linkage (`uploadId` relation) | Phase 3 |
    | `BiUpload` relation on `BiRequest` | Phase 3 |
    | ETL auto-trigger after upload | Phase 3 (must remain manual) |
    | Dashboard generation after ETL | Phase 4 (admin-controlled) |
    | Auto-publish dashboards | Phase 4 (must remain manual) |
    | Template DB migration | Never (templates stay in JS) |
    | `BiDashboardTemplate` Prisma model | Never |
    | `BiAnalysisRequest` deletion | Never (keep for history) |
    | JWT auth enablement | Phase 6 |
    | `bi-requests.json` archival | After CRUD testing confirms stability |
    | Metabase integration | Not in scope |
    | ETL refactor | Not in scope |

    ---

    ---

    # Phase 3 — Upload↔Request Linkage & Manual ETL Trigger

    ## Status: COMPLETE ✓

    ---

    ## Done

    ### 1. Prisma Schema — `requestId` on BiUpload + relation

    **File:** `backend/prisma/schema.prisma`

    **BiUpload** (line ~442):
    - Added `requestId String? @map("requestid")`
    - Added `biRequest BiRequest? @relation(fields: [requestId], references: [id], onDelete: SetNull)`

    **BiRequest** (line ~437):
    - Added `uploads BiUpload[]`

    **Migration:** `prisma/migrations/20260621010000_add_request_linkage/migration.sql`
    - `ALTER TABLE bi_uploads ADD COLUMN requestid TEXT`
    - `CREATE INDEX bi_uploads_requestid_idx ON bi_uploads(requestid)`
    - Executed via `prisma db execute`, marked applied via `prisma migrate resolve`, client regenerated via `prisma generate`

    ### 2. Upload Endpoint — Accept optional `requestId`

    **File:** `backend/routes/bi-uploads.js`

    **POST `/api/bi-uploads`** (line 53):
    - Reads `requestId` from `req.body`
    - If provided, validates the linked BiRequest exists and has `status === 'APPROVED'`
    - Returns 400 with descriptive message if not found or not approved
    - Stores `requestId` on the upload record

    **GET `/api/bi-uploads`** (line ~185):
    - Now includes `biRequest: { select: id, status, businessName, dashboardType }`

    **GET `/api/bi-uploads/:id`** (line ~235):
    - Now includes `biRequest: { select: id, status, businessName, dashboardType, message, businessType }`

    ### 3. Manual ETL Trigger Endpoint

    **File:** `backend/routes/bi-uploads.js` (lines 419–492)

    **POST `/api/bi-uploads/:id/start-etl`** — new endpoint:
    - **Validation:**
    - Upload must exist (404 if not)
    - Upload must have a `requestId` (400 if not linked)
    - Linked request must exist (400 if orphaned)
    - Linked request must have `status === 'APPROVED'` (400 otherwise)
    - Upload must not already be `VALIDATING`/`PROCESSING` (400 if already running)
    - Upload must not already be `COMPLETED` (400 if already done)
    - **On success:**
    1. Sets upload `status = 'VALIDATING'`, clears `errorMessage`
    2. Upserts processing job with `status: 'QUEUED'`, resets `recordsLoaded: 0`, `completedAt: null`
    3. Calls `etlPipeline.run(upload.id, upload.filePath)` in background (fire-and-forget with `.then()`/`.catch()`)
    4. Returns `202 Accepted` immediately

    ### 4. Admin UI — Request linkage + Start ETL button

    **File:** `admin/src/pages/BiUploadPortal.jsx`

    **Upload list table:**
    - New "Requête" column after "Type"
    - Shows first 8 chars of linked request ID with purple badge + `Link2` icon
    - Shows `—` when no request linked

    **Upload detail modal:**
    - New "Requête liée" card showing: ID, business name, status badge, dashboard type
    - "Lancer ETL" button (full-width, with `Play` icon) — visible only when:
    - Upload has a linked request with `status === 'APPROVED'`
    - Upload status is NOT already `VALIDATING`, `PROCESSING`, or `COMPLETED`
    - Confirmation dialog before starting
    - Loading state during start
    - On success: toast + auto-refresh detail view

    **Upload flow:**
    - Optional `ID requête BI` prompt added after business type prompt
    - If provided, sends `requestId` in multipart form data

    ### 5. State Transition Validations

    | Transition | Allowed? |
    |-----------|---------|
    | Upload with no requestId | ✓ (no linkage) |
    | Upload with requestId of non-existent request | **BLOCKED** (400) |
    | Upload with requestId of non-APPROVED request | **BLOCKED** (400) |
    | Start ETL on unlinked upload | **BLOCKED** (400) |
    | Start ETL on upload with non-APPROVED request | **BLOCKED** (400) |
    | Start ETL while VALIDATING/PROCESSING | **BLOCKED** (400) |
    | Start ETL after COMPLETED | **BLOCKED** (400) |
    | Start ETL on upload linked to APPROVED request | ✓ (returns 202) |

    ---

---

# Phase 4 — Admin-Controlled Dashboard Generation

## Status: COMPLETE ✓

---

## Done

### 1. Generate Dashboard Endpoint — `POST /api/bi/dashboards/generate-from-upload`

**File:** `backend/routes/bi-dashboards.js` (lines 61–144)

**Behavior:**
1. Loads upload by `uploadId`
2. Validates upload `status === 'COMPLETED'` (returns 400 otherwise)
3. Validates upload has linked `BiRequest` (returns 400 otherwise)
4. Validates linked request `status === 'APPROVED'` (returns 400 otherwise)
5. Checks no dashboard already exists for this upload (returns 409 if duplicate)
6. Loads matching template from `bi-dashboard-templates.js` via `getTemplate(businessType)`
7. Creates `BiDashboard` record with:
   - `clientId` from upload
   - `uploadId` from upload
   - `status: 'DRAFT'`
   - `dashboardConfig` from template
8. Creates admin notification (`type: 'DASHBOARD_GENERATED'`) — no `clientId`, admin-only
9. Returns `201` with dashboard data

**Validation rules:**

| Condition | Response |
|-----------|----------|
| Missing `uploadId` | 400 — `uploadId is required` |
| Upload not found | 404 — `Upload not found` |
| Upload status != COMPLETED | 400 — `Upload status is "X". Only COMPLETED uploads can generate dashboards.` |
| Upload has no linked request | 400 — `Upload is not linked to any BI request.` |
| Linked request status != APPROVED | 400 — `Linked BI request has status "X". Only APPROVED requests can generate dashboards.` |
| Dashboard already exists for this upload | 409 — `A dashboard has already been generated for this upload.` |

### 2. Dashboard Detection — GET Upload Endpoints

**File:** `backend/routes/bi-uploads.js`

**GET `/api/bi-uploads`** (list):
- Added `dashboards: { select: { id, status, name }, take: 1 }` to include

**GET `/api/bi-uploads/:id`** (detail):
- Added `dashboards: { select: { id, status, name }, orderBy: { createdAt: 'desc' }, take: 1 }` to include

### 3. Admin UI — Generate Dashboard Button

**File:** `admin/src/pages/BiUploadPortal.jsx` (lines 597–633, 701–731)

**Dashboard card in detail modal** (after Processing Job card):
- If dashboard exists: shows status badge, name, ID
- If no dashboard exists: shows "Aucun dashboard généré pour cet upload."
- "Générer Dashboard" button — visible only when:
  - `upload.status === 'COMPLETED'`
  - `upload.biRequest?.status === 'APPROVED'`
  - No dashboard already exists
- Confirmation dialog before generating
- Loading state during generation
- On success: toast + auto-refresh detail view

**`GenerateDashboardButton` component** (lines 701–731):
- Calls `POST /api/bi/dashboards/generate-from-upload` with `{ uploadId }`
- Shows error toast on failure
- On success: "Dashboard généré avec succès. Disponible en brouillon pour personnalisation."

### 4. Admin Notification — `DASHBOARD_GENERATED`

**Created in** `bi-dashboards.js:132–139`:
```javascript
await prisma.biNotification.create({
  data: {
    type: 'DASHBOARD_GENERATED',
    title: 'Dashboard Draft Ready',
    message: `Dashboard "..." has been generated from upload "..." and is ready for customization.`,
  },
});
```

No `clientId` — admin-only notification.

---

## Verification: No Auto-Generation

| Check | Result |
|-------|--------|
| `etl-pipeline.js` references `dashboard` | None (0 matches) |
| `bi-uploads.js` auto-creates dashboard on ETL complete | No |
| `bi-dashboards.js` has any auto-trigger | No (only POST from admin) |
| `BiDashboard` created anywhere besides `bi-dashboards.js` | No |
| `GET /data` endpoint guarded by status check | Yes — requires `READY_FOR_REVIEW` or `PUBLISHED` |

---

## API Endpoints (Phase 4 adds 1)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/bi/dashboards/generate-from-upload` | Admin-triggered dashboard generation from completed upload |

## Not Done (Future Phases)

| Item | Phase |
|------|-------|
| Auto-publish dashboards | Phase 4 (must remain manual) |
| Dashboard customization UI improvements | Phase 5 |
| Template DB migration | Never (templates stay in JS) |
| `BiDashboardTemplate` Prisma model | Never |
| `BiAnalysisRequest` deletion | Never (keep for history) |
| JWT auth enablement | Phase 6 |
| `bi-requests.json` archival | After CRUD testing confirms stability |
| Metabase integration | Not in scope |
| ETL refactor | Not in scope |

---

## Files Modified (7 total — Phase 1–4)

| File | Phase | Lines Changed | Risk |
|------|-------|--------------|------|
| `backend/prisma/schema.prisma` | 1 + 3 | +42 | LOW |
| `backend/routes/bi-requests.js` | 1 + 2 | ~200 + ~120 | MEDIUM |
| `backend/routes/bi-uploads.js` | 3 + 4 | ~25 (POST) + ~70 (ETL) + ~10 (dashboards includes) | MEDIUM |
| `backend/routes/bi-dashboards.js` | 4 | ~80 (generate-from-upload) + ~5 (import) | MEDIUM |
| `frontend/src/pages/dashboard/Dashboard.tsx` | 1 | ~60 | LOW |
| `admin/src/pages/BIRequests.jsx` | 1 + 2 | ~55 + ~80 | MEDIUM |
| `admin/src/pages/BiUploadPortal.jsx` | 3 + 4 | ~35 (table/modal) + ~45 (ETL/Generate buttons) | LOW |

## Files Intentionally Unmodified (11 total)

`bi-analysis.js`, `etl-pipeline.js`, `bi-dashboard-templates.js`, `warehouse-service.js`, `server.js`, `AdminBIDashboardManager.jsx`, `AdminBIReview.jsx`, `BIDashboardViewer.tsx`, `bi-requests.json` (data file), `BI_IMPACT_REPORT_AND_PLAN.md`
