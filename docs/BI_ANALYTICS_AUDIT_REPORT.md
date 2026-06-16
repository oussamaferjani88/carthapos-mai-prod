# BI / Analytics Pipeline — Audit Report

**Date:** 2026-06-06
**Scope:** POS Export Layer → Upload System → ETL Pipeline → Analytics Warehouse → Dashboard

---

## A. POS Export Layer

### Source Files
- `pos-template/src/electron/bi/BiSchemaContract.cjs` — Canonical schema definitions, version `1.0.0`
- `pos-template/src/electron/bi/BiDataMapper.cjs` — Maps raw SQLite rows to normalized BI objects
- `pos-template/src/electron/bi/BiValidator.cjs` — Pre-export validation (required fields, empty datasets, type consistency)
- `pos-template/src/electron/handlers/ipc-bi-export-handler.cjs` — IPC handler orchestrating export

### Architecture
The POS app exports via IPC (`bi:export` channel). The handler:
1. Loads `app-config.json` to get `clientId`, `businessType`, `enabledModules`
2. Collects data from local SQLite via raw queries
3. Maps rows through `BiDataMapper`
4. Validates via `BiValidator`
5. Generates CSVs using `BiSchemaContract.getColumnNames()` for canonical column ordering
6. Packages as ZIP with `metadata.json` containing `bi_schema_version: "1.0.0"`

### Findings

| Check | Status |
|-------|--------|
| Schema contract versioned (`1.0.0`) | ✅ |
| Required fields validated before export | ✅ |
| Optional datasets skipped if module not enabled | ✅ |
| Metadata includes `client_id`, `business_type`, `bi_schema_version` | ✅ |
| ZIP written to `Documents/CarthaPOS/BI_Exports/` | ✅ |
| CSV quoting handles commas, quotes, newlines | ✅ |
| Compression (deflate) applied when beneficial | ✅ |

### Issues
1. **No type coercion/validation at export** — `BiValidator` checks required fields exist and datasets aren't empty, but does not validate types (e.g., "total" could be a string). Type validation only happens downstream in the registry.
2. **clientId fallback** — `_getClientId()` falls back to `'unknown-client'` if config lacks clientId. An "unknown-client" export would pass validation and create garbage data in the warehouse.
3. **No export encryption** — ZIP contains raw business data with no encryption. This data may be stored on disk or transferred to the backend.

---

## B. Upload System

### Source Files
- `backend/routes/bi-uploads.js` — Multer-based file upload, CRUD endpoints
- `backend/prisma/schema.prisma` — Models: `BiUpload`, `BiUploadFile`, `BiProcessingJob`, `BiProcessingLog`

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/bi-uploads` | Upload ZIP (multipart, max 100MB) |
| GET | `/api/bi-uploads` | List uploads (filterable by clientId, status; paginated) |
| GET | `/api/bi-uploads/:id` | Upload detail + processing job + logs |
| GET | `/api/bi-uploads/:id/logs` | Raw ETL processing logs |
| GET | `/api/bi-uploads/:id/summary` | Dashboard-ready summary (via WarehouseService) |
| GET | `/api/bi-uploads/clients/list` | Distinct client list for filter dropdowns |

### Findings

| Check | Status |
|-------|--------|
| File type restricted to `.zip` | ✅ |
| File size limited to 100MB | ✅ |
| Tenant binding via `clientId` in request body | ✅ |
| ETL triggered asynchronously (non-blocking) | ✅ |
| `BiUpload.status` tracks lifecycle (UPLOADED→COMPLETED/FAILED) | ✅ |
| `BiProcessingJob` tracks ETL status separately | ✅ |
| Logs visible via REST endpoint | ✅ |
| Pagination + filtering on list endpoint | ✅ |

### Issues
1. **No authentication/authorization on upload endpoints** — The REST API does not check JWT or API keys. Any client can upload to any `clientId`, creating a cross-tenant data poisoning vector.
2. **clientId is user-supplied** — The endpoint accepts `clientId` from the POST body without cross-referencing against a valid `License` or `Client` record. A typo'd clientId creates orphan data.
3. **No upload-to-license binding** — The frontend portal (`BiExportDeploy.tsx`) tries to auto-detect `clientId` by querying `/api/licenses?userId=X`, but this relies on a weak relationship. The admin portal (`BiUploadPortal.jsx`) prompts via `window.prompt()`, which is a UX anti-pattern and has no validation.
4. **Multer stores files to disk without cleanup guarantee** — If ETL fails after the upload record is committed but the async pipeline is still running, orphaned ZIP files accumulate in `uploads/bi-zips/`.
5. **No checksum/ integrity verification** — Uploaded ZIP files are not checksummed; corruption is only caught if the ZIP is unreadable.

---

## C. ETL Pipeline

### Source File
- `backend/services/etl-pipeline.js` — Full ETL orchestration

### Flow
```
run(uploadId, zipPath)
  → _extractZip() → unzip to temp dir
  → _readMetadata() → parse metadata.json
  → _validateDatasets() → validate CSVs against BiSchemaRegistry
  → _loadDimensions() → upsert DimClient, DimProduct, DimSupplier, DimTime
  → _loadFacts() → insert FactSale, FactInventory, FactAppointment, FactKitchenOrder
  → mark BiProcessingJob COMPLETED + BiUpload COMPLETED
```

### Findings

| Check | Status |
|-------|--------|
| Extract unzips to temp dir with cleanup in `finally` | ✅ |
| `metadata.json` required — fails fast if missing | ✅ |
| CSV column validation against schema registry | ✅ |
| Required datasets enforced (`sales`, `products`, `customers`, `inventory`) | ✅ |
| Optional datasets gracefully skipped | ✅ |
| Schema version mismatch is logged but not enforced | ⚠️ |
| Dimension tables use `upsert` for idempotency | ✅ |
| Fact tables use `create` (no upsert) | ⚠️ |
| Partial failure handled — job marked FAILED with error message | ✅ |
| Each step logged via `BiProcessingLog` | ✅ |
| Temp directory cleaned up in `finally` block | ✅ |

### Issues
1. **No schema version enforcement** — If the POS export side upgrades to schema `2.0.0`, the ETL pipeline logs the mismatch but continues processing. This would silently create malformed data.
2. **Fact tables not idempotent** — Facts use `prisma.factSale.create()` instead of upsert. Re-running the same upload would duplicate fact records.
3. **No deduplication on re-upload** — If a client uploads the same ZIP twice (or a partial re-upload), the pipeline creates duplicate facts and upserts duplicate dims.
4. **DimTime uses `date` as unique key** — `_dateToInt()` uses UTC date integer (YYYYMMDD). If timestamps span midnight in local timezone, the date might be wrong by one day.
5. **No transactional boundary** — If `_loadDimensions` succeeds but `_loadFacts` fails partway through, dim records are committed while fact records are partially committed. No rollback exists.
6. **No retry mechanism** — If the pipeline fails (e.g., disk full, network blip), the only option is a manual re-upload.
7. **BiUploadFile model never populated** — The `BiUploadFile` table is defined in the schema but `_extractZip` never populates `bi_upload_files` rows. The files table remains empty for all uploads.

---

## D. Analytics Warehouse

### Source Files
- `backend/prisma/schema.prisma` — Models: `DimClient`, `DimProduct`, `DimSupplier`, `DimTime`, `FactSale`, `FactInventory`, `FactAppointment`, `FactKitchenOrder`
- `backend/prisma/migrations/20260604191039_add_bi_warehouse/migration.sql`

### Schema

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `dim_clients` | Tenant dimension | `tenantId`, `name`, `businessType` |
| `dim_products` | Product dimension (upsert key: `prod_{tenantId}_{productId}`) | `tenantId`, `productId`, `name`, `category` |
| `dim_suppliers` | Supplier dimension (upsert key: `supp_{tenantId}_{supplierId}`) | `tenantId`, `supplierId`, `name` |
| `dim_time` | Date dimension (key: YYYYMMDD int) | `date`, `year`, `quarter`, `month`, `day`, `dayOfWeek`, `isWeekend` |
| `fact_sales` | Sale facts | `tenantId`, `total`, `tax`, `dimTimeId` |
| `fact_inventory` | Inventory snapshot facts | `tenantId`, `productName`, `stock`, `timesSold` |
| `fact_appointments` | Appointment facts | `tenantId`, `customerName`, `status` |
| `fact_kitchen_orders` | Kitchen order facts | `tenantId`, `tableNumber`, `status`, `priority` |

### Findings

| Check | Status |
|-------|--------|
| All warehouse tables use `tenantId` for isolation | ✅ |
| Dimension tables have upsert keys scoped to tenant | ✅ |
| Fact tables reference dim tables via foreign keys | ✅ |
| Star schema design (dims + facts) | ✅ |
| `dim_time.date` has unique constraint | ✅ |
| All FK relationships defined in Prisma | ✅ |

### Issues
1. **`DimTime.id` uses integer `YYYYMMDD` format** — This is fragile. If year > 9999, it breaks. Also, the format is concatenated without separators, so `2026-01-02` and `2026-01-20` become `20260102` and `20260120` which is ambiguous when read as integers.
2. **`FactInventory` has no FK to `DimProduct.productId`** — It stores `productName` as a string instead of linking to the product dimension. This means product renames in the POS cause data inconsistency.
3. **No indexes on `tenantId`** — The migration creates no non-PK indexes on `tenantId` in any warehouse table. As data grows, cross-tenant queries and per-tenant queries will perform poorly.
4. **`DimClient` creates a new row per export** — The ETL uses `dimClient.create()` rather than upsert, so every upload creates a duplicate client record.
5. **`Fact*` tables accumulate without archive strategy** — There's no partitioning, retention policy, or archival mechanism for old warehouse data.

---

## E. Multi-Tenant Isolation

### Analysis
- Every warehouse fact and dimension table has a `tenantId` string column.
- All warehouse queries in `warehouse-service.js` filter by `tenantId`.
- The `clientId` from the POS export metadata becomes the `tenantId`.
- The `License` model has a `clientId` FK to `Client`.

### Issues
1. **No referential integrity on `tenantId`** — `tenantId` is a plain string with no FK constraint to the `Clients` table. Orphan tenants can exist.
2. **No admin override for cross-tenant queries** — The `warehouse-service.js` always filters by `tenantId` with no escape hatch for admin-level cross-tenant analytics.
3. **Tenant value is user-supplied at upload time** — See (B.2). A malicious upload could use another client's `clientId` to inject data, or use a fake `clientId` to create phantom tenants.
4. **No tenant metadata in fact tables beyond `tenantId`** — The `DimClient` table stores `businessType` which could drive business-type-aware queries, but fact tables don't duplicate this field. Cross-tenant queries require a join to `DimClient`.

---

## F. Business Logic / KPIs

### Source File
- `backend/services/warehouse-service.js`

### Implemented KPIs

| KPI | Method | Business Types | Correctness |
|-----|--------|----------------|-------------|
| Revenue by day | `getRevenueByDay(tenantId, days)` | All | ✅ |
| Top products by times sold | `getTopProducts(tenantId, limit)` | All | ✅ |
| Inventory turnover | `getInventoryTurnover(tenantId)` | pharmacy, retail | ✅ — `timesSold / stock` |
| Table turnover | `getTableTurnover(tenantId)` | restaurant, cafe | ✅ — orders per table |
| Kitchen performance | `getKitchenPerformance(tenantId, days)` | restaurant, cafe | ✅ — byStatus + byPriority |
| Appointment summary | `getAppointmentSummary(tenantId)` | pharmacy | ✅ — total + byStatus |
| Supplier performance | `getSupplierPerformance(tenantId)` | pharmacy, retail | ⚠️ — returns contact info only, no actual performance metric |
| Peak hours | `getPeakHours(tenantId)` | restaurant, cafe | ✅ — sales count by UTC hour |
| Average ticket | `getAverageTicket(tenantId, days)` | restaurant, cafe | ✅ — total / count |
| Dashboard summary | `getDashboardSummary(tenantId, businessType)` | All | ✅ — business-type aware dispatch |

### Issues
1. **Supplier performance is a misnomer** — `getSupplierPerformance()` returns name, contact, and phone. This is supplier directory data, not a performance metric. No actual supplier KPIs (e.g., delivery time, defect rate) are computed.
2. **Peak hours uses UTC** — `getPeakHours` uses `new Date(s.createdAt).getUTCHours()`. If a business operates in Europe/Paris (UTC+2), peak hours will be shifted by 2 hours. The business's timezone is available in `LicenseConfiguration.timezone` but not used here.
3. **No date range filter on `getTopProducts`** — Returns all-time top products instead of allowing a time window.
4. **No `getRevenueByDay` N-day limit** — The `days` parameter defaults to 30 days, but if a tenant has no sales in the window, returns empty array without metadata.
5. **`getInventoryTurnover` includes all facts, not averaged over time** — `timesSold` is cumulative across all exports, not scoped to a time period. A product sold 100 times with stock=10 shows turnover of 10x, but this conflates lifetime sales with current stock.

---

## G. Dashboard Readiness

### Source Files
- `admin/src/pages/BiUploadPortal.jsx` — Admin BI upload portal (React + shadcn/ui)
- `frontend/src/pages/dashboard/BiExportDeploy.tsx` — Client BI export deploy portal (React + Tailwind)
- `frontend/src/pages/dashboard/Dashboard.tsx` — Client portal dashboard
- `admin/src/pages/Dashboard.jsx` — Admin dashboard (Recharts)

### Findings

| Check | Status |
|-------|--------|
| Admin portal can upload ZIP + track ETL status | ✅ |
| Client portal can upload ZIP + track ETL status | ✅ |
| Detail modals show processing logs | ✅ |
| Auto-refresh while processing (10s admin, 8s client) | ✅ |
| Upload history with pagination | ✅ |
| Filter by clientId and status | ✅ |
| Dashboard summary endpoint (`/api/bi-uploads/:id/summary`) | ✅ |
| Recharts charts in admin dashboard (Line, Bar, Pie, Area) | ✅ |

### Issues
1. **No Metabase/embedded BI tool** — The dashboard uses raw Recharts charts powered by the warehouse service. There is no integration with Metabase, Power BI, or Tableau. The system is "Metabase-ready" only in the sense that the warehouse schema is relational — no actual Metabase connector, API, or embedded dashboard exists.
2. **Frontend portal lacks chart visualization** — `BiExportDeploy.tsx` shows upload history and ETL logs but does NOT render any charts or summaries. Users must switch to the admin panel to see analytics.
3. **Admin dashboard charts are metadata-only** — The admin dashboard (Dashboard.jsx) shows client/license/module counts but does NOT display warehouse analytics (revenue, top products, etc.). The BI analytics are only accessible via the `/summary` API endpoint.
4. **No summary endpoint integration in UI** — `BiUploadPortal.jsx` has a detail modal but does not call `/api/bi-uploads/:id/summary` to render charts. The summary endpoint exists but no UI consumes it.
5. **No CSRF protection on upload forms** — Both admin and client portals lack CSRF tokens. Since authentication is already missing (B.1), this compounds the risk.

---

## Summary of Findings

### Critical
1. **No authentication on BI upload endpoints** — Any client can upload to any `tenantId`.
2. **clientId is user-supplied, validated nowhere** — Cross-tenant data injection possible.
3. **Fact tables not idempotent** — Re-uploads create duplicate records.

### High
4. **No indexes on `tenantId`** — Performance degrades as data grows.
5. `DimClient` creates duplicate rows per upload (no upsert).
6. `BiUploadFile` model never populated — dead code / missing feature.
7. Schema version mismatch is logged but not enforced.
8. No transactional ETL — partial failures leave inconsistent state.

### Medium
9. POS export `clientId` fallback to `'unknown-client'`.
10. Peak hours uses UTC instead of business timezone.
11. Supplier "performance" returns directory data, not actual KPIs.
12. `getTopProducts` lacks date range filter.
13. No checksum/integrity verification on uploaded files.
14. ZIP files accumulate on disk — no cleanup for orphaned uploads.
15. No encryption on exported POS data (at rest or in transit beyond HTTPS).

### Low
16. `DimTime.id` format is fragile (YYYYMMDD integer).
17. `FactInventory.productName` denormalized — no FK to `DimProduct`.
18. Client portal (`BiExportDeploy.tsx`) shows uploads but no charts.
19. Admin dashboard does not render warehouse analytics.
20. Summary endpoint exists but no UI consumes it.
21. `window.prompt()` in admin portal for clientId — poor UX.

---

## Recommendations

### Immediate (Security)
1. Add JWT/API-key authentication to all `/api/bi-uploads*` endpoints.
2. Validate `clientId` against the `Clients` table at upload time.
3. Add `tenantId` indexes to all warehouse tables.

### Short-term (Data Integrity)
4. Change fact table `create` to `upsert` (deduplicate by `exportId` + natural key).
5. Make `DimClient` upsert instead of create.
6. Wrap each ETL run in a Prisma transaction.
7. Enforce schema version match (reject upload if version differs).

### Medium-term (Feature Completeness)
8. Populate `BiUploadFile` records during extraction.
9. Add date range parameter to `getTopProducts`.
10. Implement real supplier KPIs (delivery time, order accuracy).
11. Fix peak hours to use `LicenseConfiguration.timezone`.
12. Integrate summary endpoint into both admin and client UI as charts.

### Long-term (Architecture)
13. Add data retention/archival strategy for warehouse tables.
14. Consider embedding a proper BI tool (Metabase, Redash) for ad-hoc queries.
15. Add ZIP checksum/hash verification on upload + ETL.

---

*End of Report*
