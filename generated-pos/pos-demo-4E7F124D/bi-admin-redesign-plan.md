# BI Admin Panel Redesign — Implementation Plan (PFE Scope)

> **Principle**: Reuse everything possible. Only modify what the wizard requires.

---

## 1. Files to Modify

### 1.1 `backend/services/etl-pipeline.js` — ADD 3 public methods, KEEP existing `run()`

The private methods already exist (`_extractZipSync`, `_readMetadata`, `_validateDatasets`, `_loadDimensions`, `_loadFacts`). Add thin public wrappers:

| New method | Reuses | Purpose |
|-----------|--------|---------|
| `extractAndValidate(uploadId, zipPath)` | `_extractZipSync` + `_readMetadata` + `_validateDatasets` | Returns `{ metadata, validation, datasets }` without writing to DB |
| `loadIntoWarehouse(uploadId, datasets, metadata)` | `_loadDimensions` + `_loadFacts` (extracted from transaction) | The DB-loading part, callable separately |
| `prepareWarehouse(uploadId, datasets, metadata)` | Existing dim/fact builders | In-memory build of dimension + fact objects for preview (no DB writes) |

`run()` stays unchanged — it chains extract → validate → load as before.

### 1.2 `backend/services/bi-schema-registry.js` — UPDATE schema version

Change `BI_SCHEMA_VERSION` from `'1.0.0'` to `'2.0.0'` to match the POS export format. Update column definitions if needed (check POS `BiSchemaContract.cjs` for any v2 changes in column names/types).

### 1.3 `backend/routes/bi-uploads.js` — ADD 5 endpoints, KEEP existing 10

| New endpoint | Purpose | Implementation |
|-------------|---------|---------------|
| `POST /:id/validate` | Extract ZIP + validate CSVs | Calls `etlPipeline.extractAndValidate()`. Stores temp dir path + metadata on upload record (add `tempDirPath` field or store in a sidecar JSON file). Updates status to `VALIDATED`. Returns validation report. |
| `GET /:id/validation-report` | Return validation results | Reads previously stored validation report. Returns datasets, row counts, errors, warnings, duplicates. |
| `POST /:id/run-etl` | Run ETL with phase tracking | Calls `etlPipeline.run()` but with progress logging. POST returns immediately with 202. Client polls `GET /:id` for status changes + `GET /:id/logs` for phase progress. |
| `GET /:id/warehouse-preview` | Preview generated warehouse tables | Queries existing dim/fact tables filtered by `exportId = uploadId`. Returns row counts + sample data per table. |
| `POST /:id/confirm-load` | Confirm + complete the upload | Changes upload status to `COMPLETED` (if currently `ETL_COMPLETED` or similar). Enables dashboard generation. |

These are the ONLY API changes. All other wizard reads use existing endpoints:
- `GET /:id` → upload detail + processing job status + files
- `GET /:id/logs` → ETL phase logs
- `GET /:id/summary` → warehouse metrics (already exists)
- `POST /:id/cancel` → cancel processing
- `GET /clients/list` → client dropdown

### 1.4 `admin/src/lib/api.js` — ADD 5 convenience methods

Add to `biUploadsApi`:
```js
validate: (id) => api.post(`/bi-uploads/${id}/validate`),
getValidationReport: (id) => api.get(`/bi-uploads/${id}/validation-report`),
runEtl: (id) => api.post(`/bi-uploads/${id}/run-etl`),
getWarehousePreview: (id) => api.get(`/bi-uploads/${id}/warehouse-preview`),
confirmLoad: (id) => api.post(`/bi-uploads/${id}/confirm-load`),
```

### 1.5 `admin/src/App.jsx` — ADD 1 route

```jsx
<Route path="/bi-wizard" element={<BiWizard />} />
```

The existing `/bi-upload-portal` route stays as the upload history view (table).  
The wizard is a separate URL: `/bi-wizard/:uploadId` (steps for an existing upload) or `/bi-wizard` (start with upload).

### 1.6 `admin/src/components/layout/Layout.jsx` — UPDATE navigation

Change existing "Portail BI" to two links:
- "Import BI" → `/bi-wizard`
- "Historique BI" → `/bi-upload-portal`

### 1.7 `admin/src/pages/BiUploadPortal.jsx` — MINOR changes

- Keep the upload history table (it's working and valuable)
- Add a "Nouvel Import" button that navigates to `/bi-wizard`
- The upload form + detail modal can remain for viewing history
- The `StartEtlButton` / `GenerateDashboardButton` sub-components stay

---

## 2. Files to Create

### 2.1 `admin/src/pages/BiWizard.jsx` — Wizard container

A single-page wizard with step state management. Contains all 7 steps rendered conditionally based on current step index. Progress indicator at top (Step 1 of 7, etc.).

State: `{ currentStep, uploadId, validationReport, etlStatus, warehouseData }`

### 2.2 `admin/src/pages/wizard/Step1Upload.jsx`

- Drag-and-drop ZIP upload (use existing `biUploadsApi.upload()`)
- Client selector dropdown (use existing `biUploadsApi.getClients()`)
- Upload progress bar
- On success: store `uploadId`, show metadata preview (from POST response), advance to Step 2

### 2.3 `admin/src/pages/wizard/Step2Validation.jsx`

- On mount: calls `POST /bi-uploads/:id/validate` then `GET /bi-uploads/:id/validation-report`
- Displays:
  - Schema version badge
  - Datasets table: name, rows, status (✔/⚠/✗), duplicate count
  - Warnings list
  - Errors list (with details)
- Buttons: "Retry" (re-validate), "Proceed to ETL"

### 2.4 `admin/src/pages/wizard/Step3EtlProgress.jsx`

- On mount: calls `POST /bi-uploads/:id/run-etl`
- Polls `GET /bi-uploads/:id` + `GET /bi-uploads/:id/logs` every 3s
- Shows phase progress bars:
  - Extract (from logs: step="extract")
  - Validate (from logs: step="validate")
  - Clean (from logs: step="clean")
  - Transform (from logs: step="transform")
  - Prepare Warehouse (from logs: step="load" or "transaction")
- Auto-advances when status becomes `COMPLETED`

### 2.5 `admin/src/pages/wizard/Step4WarehousePreview.jsx`

- On mount: calls `GET /bi-uploads/:id/warehouse-preview`
- Tabbed view:
  - **Dimensions tab**: DimTime, DimClient, DimProduct, DimSupplier
  - **Facts tab**: FactSales, FactInventory, FactKitchenOrders
- Each table shows: column names, row count, paginated sample data (first 20 rows)
- Simple read-only table display (reuse existing Card/Table components)
- Button: "Proceed to Corrections"

### 2.6 `admin/src/pages/wizard/Step5Corrections.jsx`

- Same tabbed table view as Step 4
- Each row is editable inline (simple `<input>` fields)
- Ability to mark rows as "ignored" (checkbox)
- "Re-validate" button that re-checks corrected data
- "Reset" button to revert all changes for a table
- Button: "Proceed to Load"

Implementation: corrections are sent as JSON patches to the upload record or stored in a `corrections` JSON field on the upload. When "Load Warehouse" runs, corrections are applied.

### 2.7 `admin/src/pages/wizard/Step6LoadConfirm.jsx`

- Summary card: what will be loaded (dimensions count, facts count, rows)
- Warning if any corrections applied
- Confirmation checkbox: "I confirm this data is correct"
- "Load Warehouse" button → calls `POST /bi-uploads/:id/confirm-load`
- Progress display during load
- Auto-advance on success

### 2.8 `admin/src/pages/wizard/Step7SuccessReport.jsx`

- On mount: calls `POST /bi/dashboards/generate-from-upload`
- Displays:
  - Rows processed / loaded / ignored
  - Execution time
  - Warnings / Errors count
  - Generated dimensions + row counts
  - Generated facts + row counts
- "Generate Dashboard" button → calls existing `POST /bi/dashboards/generate-from-upload`
- "View Dashboard" button → navigates to `/bi-dashboard/:id`
- "Back to Uploads" → navigates to `/bi-upload-portal`

### 2.9 `admin/src/lib/warehouseApi.js` (optional)

Minimal API helper for warehouse preview + corrections:
```js
export const warehouseApi = {
  preview: (uploadId) => api.get(`/bi-uploads/${uploadId}/warehouse-preview`),
  correct: (uploadId, table, rowId, data) => api.patch(`/bi-uploads/${uploadId}/corrections/${table}/${rowId}`, data),
  confirm: (uploadId) => api.post(`/bi-uploads/${uploadId}/confirm-load`),
};
```

Alternatively, fold these into `biUploadsApi` in `api.js`.

---

## 3. Files to Remove

| File | Reason |
|------|--------|
| (none) | Existing files are kept. `BiUploadPortal.jsx` is modified but not removed. `AdminBIAnalystWorkspace.jsx` and `AdminBIAnalysisDetail.jsx` are left as-is (they can coexist with the new wizard). |

The old pages are not removed — they can still be accessed from the sidebar or via direct URL. Only the wizard is added.

---

## 4. API Changes Summary

| Method | Endpoint | Status | Reuses |
|--------|----------|--------|--------|
| POST | `/api/bi-uploads/:id/validate` | **NEW** | `etlPipeline._extractZipSync` + `_readMetadata` + `_validateDatasets` |
| GET | `/api/bi-uploads/:id/validation-report` | **NEW** | Reads stored validation data |
| POST | `/api/bi-uploads/:id/run-etl` | **NEW** | `etlPipeline.run()` (existing) |
| GET | `/api/bi-uploads/:id/warehouse-preview` | **NEW** | Queries existing dim/fact tables by exportId |
| POST | `/api/bi-uploads/:id/confirm-load` | **NEW** | Updates upload status + generates dashboard |
| POST | `/api/bi-uploads` | **EXISTING** | Unchanged |
| GET | `/api/bi-uploads` | **EXISTING** | Unchanged |
| GET | `/api/bi-uploads/:id` | **EXISTING** | Unchanged |
| GET | `/api/bi-uploads/:id/logs` | **EXISTING** | Unchanged |
| GET | `/api/bi-uploads/:id/summary` | **EXISTING** | Unchanged |
| GET | `/api/bi-uploads/clients/list` | **EXISTING** | Unchanged |
| DELETE | `/api/bi-uploads/:id` | **EXISTING** | Unchanged |
| POST | `/api/bi-uploads/:id/cancel` | **EXISTING** | Unchanged |
| POST | `/api/bi/dashboards/generate-from-upload` | **EXISTING** | Unchanged |

No existing endpoints are modified. Only 5 new endpoints are added.

---

## 5. Frontend Changes Summary

| File | Change |
|------|--------|
| `src/pages/BiWizard.jsx` | **CREATE** — Wizard container with step state |
| `src/pages/wizard/Step1Upload.jsx` | **CREATE** — Drag-drop upload |
| `src/pages/wizard/Step2Validation.jsx` | **CREATE** — Validation report display |
| `src/pages/wizard/Step3EtlProgress.jsx` | **CREATE** — Live ETL progress |
| `src/pages/wizard/Step4WarehousePreview.jsx` | **CREATE** — Table preview |
| `src/pages/wizard/Step5Corrections.jsx` | **CREATE** — Editable tables |
| `src/pages/wizard/Step6LoadConfirm.jsx` | **CREATE** — Load confirmation |
| `src/pages/wizard/Step7SuccessReport.jsx` | **CREATE** — Final report + dashboard |
| `src/pages/BiUploadPortal.jsx` | **MODIFY** — Add "Nouvel Import" button → wizard |
| `src/App.jsx` | **MODIFY** — Add `/bi-wizard` route |
| `src/components/layout/Layout.jsx` | **MODIFY** — Add "Import BI" sidebar link |
| `src/lib/api.js` | **MODIFY** — Add 5 new API methods |

---

## 6. Backend Changes Summary

| File | Change |
|------|--------|
| `services/etl-pipeline.js` | **MODIFY** — Add 3 public methods (`extractAndValidate`, `loadIntoWarehouse`, `prepareWarehouse`). KEEP `run()`. |
| `services/bi-schema-registry.js` | **MODIFY** — Bump schema version to `2.0.0` |
| `routes/bi-uploads.js` | **MODIFY** — Add 5 new endpoints. KEEP all existing. |

---

## 7. Execution Order

### Phase A — Backend foundation (Day 1)
```
1. etl-pipeline.js: add extractAndValidate() → wraps existing private methods
2. etl-pipeline.js: add loadIntoWarehouse() → extracts DB transaction from run()
3. etl-pipeline.js: add prepareWarehouse() → builds dim/fact objects in memory
4. bi-uploads.js: add POST /:id/validate endpoint
5. bi-uploads.js: add GET /:id/validation-report endpoint
```

### Phase B — ETL + preview (Day 2)
```
6. bi-uploads.js: add POST /:id/run-etl (reuses existing run() with phase logging)
7. etl-pipeline.js: add phase-level logging (log step names to BiProcessingLog)
8. bi-uploads.js: add GET /:id/warehouse-preview endpoint
9. bi-uploads.js: add POST /:id/confirm-load endpoint
10. bi-schema-registry.js: bump schema version
```

### Phase C — Frontend wizard (Days 3-5)
```
11. Create Step1Upload.jsx (drag-drop, client select, progress)
12. Create Step2Validation.jsx (validation report display)
13. Create Step3EtlProgress.jsx (live progress bars with polling)
14. Create Step4WarehousePreview.jsx (tabbed table preview)
15. Create Step5Corrections.jsx (editable table rows)
16. Create Step6LoadConfirm.jsx (confirmation + load trigger)
17. Create Step7SuccessReport.jsx (final report + dashboard button)
18. Create BiWizard.jsx (wizard container with step navigation)
```

### Phase D — Integration (Day 6)
```
19. Modify api.js: add 5 API methods
20. Modify Layout.jsx: add sidebar link
21. Modify App.jsx: add wizard route
22. Modify BiUploadPortal.jsx: add "Nouvel Import" button
```

---

## 8. What Is NOT Changed

| Area | Status | Reason |
|------|--------|--------|
| `etl-pipeline.js` `run()` | **KEPT** | Still works; wizard uses it via `run-etl` |
| `etl-pipeline.js` private methods | **KEPT** | Wrapped but not modified |
| ZIP upload logic (`POST /api/bi-uploads`) | **UNCHANGED** | Still works |
| All existing `bi-uploads.js` endpoints (10) | **UNCHANGED** | Companion endpoints added, none modified |
| `bi-dashboards.js`, `bi-requests.js`, `bi-reviews.js`, etc. | **UNCHANGED** | No changes needed |
| `warehouse-service.js` | **UNCHANGED** | Warehouse preview queries existing tables |
| `bi-insight-generator.js` | **UNCHANGED** | Still called on dashboard generation |
| Prisma schema / DB models | **UNCHANGED** | No new models; uploads get new status values only |
| `BiUploadPortal.jsx` | **MODIFIED** (minor) | Existing page kept as history view |
| `AdminBIAnalystWorkspace.jsx` | **KEPT** | Not removed — can coexist |
| `AdminBIAnalysisDetail.jsx` | **KEPT** | Not removed — can coexist |
| `BiRequests.jsx` | **KEPT** | Not modified |
| `AdminBIReview.jsx` | **KEPT** | Not modified |

---

## 9. Status Value Changes

Add to existing `BiUpload.status` (Prisma enum or string field — check current):
- `VALIDATED` — after extract + validate step
- `ETL_RUNNING` — when ETL is in progress
- `ETL_COMPLETED` — when ETL finished (warehouse populated)
- `CORRECTING` — admin editing data
- `LOAD_CONFIRMED` — admin confirmed the load
- `DASHBOARD_GENERATED` — after dashboard creation

If the status field is a Prisma enum, extend it via migration. If it's a free-text string, no schema change needed.

---

## 10. Estimated Effort

| Phase | Days | Dependencies |
|-------|------|-------------|
| A — Backend foundation | 1 | None |
| B — ETL + preview | 1 | Phase A |
| C — Frontend wizard | 3 | Phase B |
| D — Integration | 1 | Phase C |
| **Total** | **6 days** | |

This is significantly smaller than the audit report's estimate (14-18 days) because:
- No staging tables
- No new Prisma models
- No new correction engine
- No database redesign
- No removal of working code
- Existing endpoints reused
- Old pages kept as-is
