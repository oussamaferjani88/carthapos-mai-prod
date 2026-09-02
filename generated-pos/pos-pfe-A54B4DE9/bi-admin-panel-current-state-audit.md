# BI ADMIN PANEL — CURRENT STATE AUDIT

**Date:** 2026-07-29
**Scope:** Complete technical audit of the current BI module
**Constraint:** Analysis only — no code modifications

---

## PART 1 — BI MODULE OVERVIEW

### 1.1 Overall Architecture

The BI module is an **export-oriented, registry-driven** system. It has no admin panel, no data warehouse, no ETL pipeline, and no upload mechanism. Its sole function is to generate structured CSV exports packaged as ZIP archives for consumption by an external BI/ETL system.

```
┌─────────────────────────────────────────────────────────────────┐
│                    BI MODULE ARCHITECTURE                        │
│                                                                   │
│  Renderer (React)            Main Process (Electron)              │
│  ┌─────────────────┐        ┌──────────────────────────────────┐ │
│  │  Reports.jsx     │  IPC   │  ipc-bi-export-handler.cjs      │ │
│  │  └─BiExportModal │──────▶│  └─runExport()                   │ │
│  │                  │        │      ├─BiDatasetRegistry         │ │
│  │  Dashboard.jsx   │        │      ├─BiDataMapper              │ │
│  │  └─electronAPI   │  IPC   │      ├─BiSchemaContract          │ │
│  │  .report*()      │──────▶│      ├─BiValidator                │ │
│  │                  │        │      └─_createZip()              │ │
│  └─────────────────┘        └──────────────────────────────────┘ │
│                                                                   │
│  Database: SQLite (OLTP only — no warehouse tables)               │
│  └─ queries run directly against: sales, products, customers,    │
│     kitchen_orders, shifts, audit_logs, z_reports, etc.          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Main Purpose

Generate a structured, validated ZIP archive of CSV files containing all business data for ingestion into an external Business Intelligence system. The system exports 22 datasets (as of schema v2.2.0) covering sales, products, customers, inventory, kitchen, cash management, and audit data.

There is **no reverse flow** — no data is imported, no warehouse is populated, no ETL runs inside the application.

### 1.3 Current Workflow

1. User opens Reports page (`/reports`)
2. User clicks "Export BI" button
3. BiExportModal opens
4. User confirms export
5. Backend resolves datasets based on business type + enabled modules
6. Backend queries OLTP database directly for each dataset
7. Each row is mapped through a BI schema mapper
8. All datasets are validated (schema, types, referential integrity)
9. CSV files are generated with UTF-8 BOM
10. Metadata JSON is generated
11. All files are packaged into a ZIP archive (manually — no library)
12. ZIP is saved to `Documents/CarthaPOS/BI_Exports/`
13. User is shown the result with file path, size, and row counts

### 1.4 Main Components

| Component | Location | Role |
|-----------|----------|------|
| BiExportModal.jsx | Renderer | UI modal for triggering exports |
| ipc-bi-export-handler.cjs | Main Process | Export orchestration, IPC handler |
| BiDatasetRegistry.cjs | Main Process | 22 dataset definitions with SQL queries |
| BiSchemaContract.cjs | Main Process | Canonical column schemas, CSV headers |
| BiDataMapper.cjs | Main Process | 22 dataset-specific row transformers |
| BiValidator.cjs | Main Process | Schema validation, type checking, orphan detection |
| preload.cjs | Bridge | `exportBiData()` IPC bridge |

### 1.5 Frontend Structure

No dedicated BI admin page exists. BI functionality is embedded in:

- **Reports.jsx** (`/reports`) — Contains the "Export BI" button and hosts BiExportModal
- **BiExportModal.jsx** (`src/components/`) — Reusable export dialog with 4 states
- **Dashboard.jsx** (`/`) — KPI dashboard with electronAPI.query() for SQL aggregations
- **reports-handlers.cjs** (backend) — Powers all report/analytics API calls

### 1.6 Backend Structure

```
src/electron/bi/
├── BiDatasetRegistry.cjs     541 lines — 22 dataset SQL definitions
├── BiSchemaContract.cjs      457 lines — Schema contracts, versions
├── BiDataMapper.cjs          538 lines — 22 row-transform mappers
├── BiValidator.cjs           281 lines — Validation engine

src/electron/handlers/
└── ipc-bi-export-handler.cjs 455 lines — Export orchestrator, ZIP builder
```

### 1.7 Data Flow

```
Trigger: User clicks "Export BI" in BiExportModal
    │
    ▼
IPC: window.electronAPI.exportBiData()
    │  ipcRenderer.invoke('bi:export')
    ▼
Resolution: BiDatasetRegistry.resolveExportDatasets(businessType, modules)
    │  Returns array of dataset keys (e.g., ['sales', 'products', ...])
    ▼
Collection: For each dataset key:
    │  1. Get SQL from registry entry
    │  2. db.all(sql) → raw rows
    │  3. BiDataMapper.getMapper(mapperName)(rows) → mapped rows
    ▼
Validation: BiValidator.validateAll(datasets, exportedKeys)
    │  Checks: schema conformance, required columns, types,
    │  null values, unexpected columns, orphaned FKs
    ▼
CSV Generation: _biRowsToCsv(datasetKey, rows)
    │  BOM + header + data rows
    ▼
ZIP Packaging: _createZip(files, outputPath)
    │  Manual ZIP construction (deflate, CRC-32, local headers, central dir, EOCD)
    ▼
Return: { filePath, fileName, fileSize, metadata, stats, validation, exportDuration }
```

---

## PART 2 — ADMIN PANEL UI AUDIT

There is **no dedicated BI Admin Panel**. BI functionality is distributed across three pages:

### 2.1 Reports Page

| Property | Value |
|----------|-------|
| **File** | `src/pages/Reports.jsx` |
| **Route** | `/reports` |
| **Size** | 1,886 lines |
| **Purpose** | Reports hub with 5 tabs + BI export button |

**Components used:**
- Card, CardContent, CardDescription, CardHeader, CardTitle
- Select, SelectContent, SelectItem, SelectTrigger, SelectValue
- Button, Badge, Input, Label
- Table, TableHeader, TableBody, TableHead, TableRow, TableCell
- Tabs, TabsContent, TabsList, TabsTrigger
- Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
- Skeleton
- BiExportModal (imported)

**Charts:** Recharts (BarChart, LineChart, PieChart, AreaChart, ComposedChart)

**Tabs:**
1. **Tableau de Bord** — KPIs (revenue, orders, avg ticket, profit) + composed chart + category pie + payment pie + top products + cashier performance
2. **Analyses** — Revenue trends area chart + hourly heatmap bar chart + customer stats cards (total, new, loyalty rate, top spenders)
3. **Transactions** — Searchable, sortable, paginated sale table with expandable row details + detail dialog
4. **Caisses** — Searchable, sortable, paginated shift table with expandable details + payment method breakdown per shift
5. **Rapports X/Z** — X Report section + Z Report history table + Z Close dialog + Z Report detail dialog

**BI Export:** Button at the bottom of the page opens BiExportModal.

**API endpoints called:**
- `window.electronAPI.reportDashboard(periodOpts)`
- `window.electronAPI.reportSalesByPeriod(periodOpts)`
- `window.electronAPI.reportCategories(periodOpts)`
- `window.electronAPI.reportTopProducts({periodOpts, limit})`
- `window.electronAPI.reportPaymentMethods(periodOpts)`
- `window.electronAPI.reportCashiers(periodOpts)`
- `window.electronAPI.reportRevenueTrends(periodOpts)`
- `window.electronAPI.reportHourlyHeatmap(periodOpts)`
- `window.electronAPI.reportCustomers(periodOpts)`
- `window.electronAPI.reportTransactions({...})`
- `window.electronAPI.reportCashShifts({...})`
- `window.electronAPI.generateXReport({...})`
- `window.electronAPI.getZReportHistory({page, perPage})`
- `window.electronAPI.generateZReport({closing_amount})`

### 2.2 BiExportModal Component

| Property | Value |
|----------|-------|
| **File** | `src/components/BiExportModal.jsx` |
| **Size** | 229 lines |
| **Purpose** | Modal for triggering and tracking BI exports |

**States:**
1. `idle` — initial view with file list + privacy notice + "Generate Export" button
2. `exporting` — progress bar at indeterminate or percentage
3. `done` — success card with filename, size, row count, files breakdown, "View File" button, "New Export" button
4. `error` — error message card with retry option

**Progress indicators:** Progress bar component (shadcn/ui)

**Statistics shown:** Row counts per file, total rows, file size

**Actions available:**
- Generate Export (button)
- View File (opens file explorer)
- New Export (resets to idle)
- Close (dialog X)

**API calls:**
- `window.electronAPI.exportBiData()`
- `window.electronAPI.invoke('shell:showItemInFolder', filePath)`

### 2.3 Dashboard Page

| Property | Value |
|----------|-------|
| **File** | `src/pages/Dashboard.jsx` |
| **Route** | `/` |
| **Size** | 601 lines |
| **Purpose** | Main KPI dashboard |

**Components used:**
- Recharts (BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer)

**KPIs displayed:**
- Today's revenue, orders count, average ticket, profit, customers, low stock count
- Revenue bar chart with period selector (today/week/month/year)
- Best sellers top 5
- Inventory summary (total products, stock value, low stock, out of stock)
- Cash drawer status (active shift info)
- Recent transactions (last 5)

**API calls:**
- `window.electronAPI.query(sql, params)` — raw SQL for aggregations

---

## PART 3 — USER NAVIGATION FLOW

### 3.1 BI Export Flow

```
Dashboard (/)                     ← Default landing page
    │
    ├── View KPIs, charts
    │
    └── Navigate to Reports (/reports)
            │
            ├── View dashboard KPIs (tab 1)
            ├── View analytics (tab 2)
            ├── Search transactions (tab 3)
            ├── View cash shifts (tab 4)
            ├── View X/Z reports (tab 5)
            │
            └── Click "Export BI" button
                    │
                    ▼
                BiExportModal opens
                    │
                    ├── View dataset list (sales.csv, products.csv, ...)
                    │
                    ├── Read privacy notice
                    │
                    └── Click "Generate Export"
                            │
                            ▼
                        Progress bar animates
                            │
                            ├── Success → View file details
                            │              ├── Click "View File" → opens Windows Explorer
                            │              └── Click "New Export" → back to idle
                            │
                            └── Error → View error message
                                         └── Retry or close
```

### 3.2 Admin User Flow

```
Settings (/settings)
    │
    ├── General settings
    ├── Kitchen departments
    ├── Receipt designer
    ├── Backup (export/restore)
    ├── Appearance
    └── System

User Management (/user-admin, /user-management)   ← Admin only
    │
    ├── Users tab (CRUD)
    ├── Permissions tab (module-level per user)
    └── Audit tab (audit log)

Inventory (/inventory)
    │
    ├── Products table with stock levels
    ├── Stock movements history
    └── Suppliers management
```

**There is no "BI Dashboard" or "Admin Panel" navigation item.** The `POSNavbar.jsx` links are: Dashboard, POS, Products, Customers, Tables, Kitchen, Inventory, Reports, Users, Settings, Hardware.

---

## PART 4 — FRONTEND COMPONENT INVENTORY

### 4.1 BiExportModal.jsx

| Property | Value |
|----------|-------|
| **Location** | `src/components/BiExportModal.jsx` |
| **Lines** | 229 |
| **Parent** | Reports.jsx (imported and rendered) |
| **Purpose** | Modal dialog for BI export generation |
| **Props** | `{ open: boolean, onOpenChange: function }` |
| **State** | `step` (idle/confirming/exporting/done/error), `progress` (0-100), `result`, `error` |
| **API Calls** | `window.electronAPI.exportBiData()`, `window.electronAPI.invoke('shell:showItemInFolder')` |
| **Dependencies** | shadcn/ui (dialog, button, progress, badge, card), lucide-react |

### 4.2 Reports.jsx

| Property | Value |
|----------|-------|
| **Location** | `src/pages/Reports.jsx` |
| **Lines** | 1,886 |
| **Parent** | App.jsx route (`/reports`) |
| **Purpose** | Reports and analytics hub with 5 tabs |
| **Props** | None |
| **State** | `activeTab`, `selectedPeriod`, `customStart`, `customEnd`, `dashboard`, `salesByPeriod`, `categories`, `topProducts`, `paymentMethods`, `cashiers`, `revenueTrends`, `hourlyHeatmap`, `customerStats`, `txData`, `txSearch`, `txPaymentFilter`, `txSortBy`, `txSortDir`, `txPage`, `selectedTx`, `txDetailOpen`, `shiftData`, `shiftSearch`, `shiftStatusFilter`, `shiftSortBy`, `shiftSortDir`, `shiftPage`, `expandedShift`, `zReportHistory`, `xReportData`, `zCloseDialogOpen`, `zCloseSummary`, `zCloseClosingAmount`, `selectedZReport`, `zDetailOpen`, `loading*`, `error*` |
| **API Calls** | 14 report endpoints (see Part 2) |
| **Dependencies** | shadcn/ui (card, select, button, badge, input, label, table, tabs, dialog, skeleton), recharts, lucide-react, BiExportModal, POSConfiguration, useAppConfig, currency utils |

### 4.3 Dashboard.jsx

| Property | Value |
|----------|-------|
| **Location** | `src/pages/Dashboard.jsx` |
| **Lines** | 601 |
| **Parent** | App.jsx route (`/`) |
| **Purpose** | Main KPI dashboard landing page |
| **Props** | None |
| **State** | `stats`, `recentTransactions`, `chartData`, `chartPeriod`, `bestSellers`, `inventorySummary`, `cashDrawer`, `activeShift`, `loading`, `currentTime`, `lastRefresh` |
| **API Calls** | `window.electronAPI.query()` — raw SQL for today's stats, monthly revenue, product counts, low stock, stock value, best sellers, active shifts |
| **Dependencies** | recharts, lucide-react, POSConfiguration, useAppConfig, environment utils |

### 4.4 UserManagementAdvanced.jsx

| Property | Value |
|----------|-------|
| **Location** | `src/components/UserManagementAdvanced.jsx` |
| **Lines** | 782 |
| **Parent** | UserAdmin.jsx |
| **Purpose** | Admin user/role/permission CRUD + audit log viewer |
| **Props** | `{ config }` — POS configuration |
| **State** | `users`, `search`, `page`, `dialogOpen`, `editingUser`, `userForm`, `confirmDelete`, `selectedUser`, `modulePermissions`, `auditLogs`, `auditSearch`, `auditPage`, `activeTab` |
| **API Calls** | `getUsers()`, `createUser()`, `updateUser()`, `deleteUser()`, `getUserModules()`, `updateUserModules()`, `getAuditLogs()` |
| **Dependencies** | shadcn/ui (card, button, input, label, select, badge, dialog, scroll-area, switch, tabs), lucide-react, useAppConfig |

### 4.5 AdminOnlyRoute.jsx

| Property | Value |
|----------|-------|
| **Location** | `src/components/AdminOnlyRoute.jsx` |
| **Lines** | 28 |
| **Parent** | App.jsx (wraps routes) |
| **Purpose** | Route guard restricting access to admin role |
| **Props** | `{ children }` |
| **State** | None (reads from AuthContext) |
| **API Calls** | None |
| **Dependencies** | react-router-dom (Navigate), AuthContext |

### 4.6 POSNavbar.jsx

| Property | Value |
|----------|-------|
| **Location** | `src/components/POSNavbar.jsx` |
| **Lines** | 385 |
| **Parent** | POSContent.jsx |
| **Purpose** | Application navigation sidebar with 9 BI-related links |
| **Props** | None (reads from AuthContext, useAppConfig) |

---

## PART 5 — BACKEND AUDIT

### 5.1 BI Backend Files

#### 5.1.1 BiDatasetRegistry.cjs

| Property | Value |
|----------|-------|
| **Location** | `src/electron/bi/BiDatasetRegistry.cjs` |
| **Lines** | 541 |
| **Responsibility** | Central registry of all 22 exportable datasets |
| **Exports** | `DATASETS` (Map), `CORE_DATASETS` (array), `BUSINESS_TYPE_DATASETS` (object), `resolveExportDatasets()`, `getRegistryEntry()`, `getAllRegistryEntries()`, `getBusinessTypePreset()`, `getRegistrySize()` |

Each dataset entry contains: `key`, `sql`, `module`, `businessTypes`, `category`, `description`, `required`, `mapper`.

#### 5.1.2 BiSchemaContract.cjs

| Property | Value |
|----------|-------|
| **Location** | `src/electron/bi/BiSchemaContract.cjs` |
| **Lines** | 457 |
| **Responsibility** | Canonical column schemas for every export dataset |
| **Version** | 2.2.0 |
| **Exports** | `BI_SCHEMA_VERSION`, `EXPORT_VERSION`, `GENERATOR_VERSION`, `SCHEMAS`, `getColumnNames()`, `getSchema()`, `getCsvHeader()`, `validateSchema()`, `getAllDatasetKeys()` |

22 schema definitions with column name, type, required flag, and description.

#### 5.1.3 BiDataMapper.cjs

| Property | Value |
|----------|-------|
| **Location** | `src/electron/bi/BiDataMapper.cjs` |
| **Lines** | 538 |
| **Responsibility** | Row transformation from raw DB to BI canonical schema |
| **Exports** | `mapRow()` (generic), `mapRows()` (generic), `getMapper()`, `MAPPER_DISPATCH`, plus 22 dataset-specific mappers (`mapSaleRow` through `mapVatRateRows`) |

#### 5.1.4 BiValidator.cjs

| Property | Value |
|----------|-------|
| **Location** | `src/electron/bi/BiValidator.cjs` |
| **Lines** | 281 |
| **Responsibility** | Pre-export validation: schema conformance, type checks, orphan detection, fact/dimension classification |
| **Exports** | `validateDataset()`, `validateReferentialIntegrity()`, `classifyDatasets()`, `validateAll()`, `FACT_DATASETS`, `DIMENSION_DATASETS`, `LABELS` |

**Referential integrity checks:**
1. sale_items.sale_id → sales.sale_id
2. sale_items.product_id → products.product_id
3. sales.customer_id → customers.customer_id
4. products.supplier → suppliers.name
5. sales.table_id → tables.table_id
6. table_reservations.table_id → tables.table_id
7. appointments.service_id → services.service_id

#### 5.1.5 ipc-bi-export-handler.cjs

| Property | Value |
|----------|-------|
| **Location** | `src/electron/handlers/ipc-bi-export-handler.cjs` |
| **Lines** | 455 |
| **Responsibility** | Full export pipeline orchestrator + ZIP builder |
| **Class** | `IPCBiExportHandler` |
| **IPC Channel** | `bi:export` |
| **Key Methods** | `runExport()`, `_collectDataset()`, `_buildMetadataV2()`, `_biRowsToCsv()`, `_createZip()`, `_crc32()` |
| **Registration** | `registerBiExportHandlers(databaseManager)` factory function |

**Critical finding:** `registerBiExportHandlers()` is **NOT wired into any main process entry point**. A search for `require` references to this file returned zero results. The BI export IPC handler may not be registered at application startup.

### 5.2 Report Handlers (ipc-reports-handlers.cjs)

| Property | Value |
|----------|-------|
| **Location** | `src/electron/handlers/ipc-reports-handlers.cjs` |
| **Lines** | 831 |
| **Responsibility** | All report/analytics IPC handlers (dashboard, sales, categories, products, payment methods, cashiers, revenue trends, hourly heatmap, customers, transactions, cash shifts, X report, Z report) |

All report endpoints query the OLTP database directly with aggregation SQL queries.

### 5.3 Supporting Backend Files

| File | Role |
|------|------|
| `ElectronDatabaseManager.cjs` | Database initialization, migrations, schema creation, query execution |
| `ElectronAuthManager.cjs` | User authentication, audit logging, user CRUD |
| `LoggerService.cjs` | Application logging |
| `DatabaseQueryOptimizer.cjs` | Query optimization (may be referenced by report handlers) |

---

## PART 6 — CURRENT UPLOAD PROCESS

**There is no upload process.** The BI module is export-only. No ZIP files or CSV files are uploaded into the application. There is no data ingestion pipeline, no file upload endpoint, and no import functionality related to BI.

The only upload-like features in the application are:
- **Settings Import** (`ipc-app-handlers.cjs` line 353): Imports JSON settings backup
- **Backup Restore** (`ipc-hardware-handlers.cjs` line 362): Restores JSON backup

Neither of these is related to BI data.

---

## PART 7 — CURRENT ETL PROCESS

**There is no ETL process.** The term "ETL" appears only in comments:

- `BiDataMapper.cjs` (comment): "downstream ETL never change"
- `BiSchemaContract.cjs` (comment): "type hint for ETL consumption"
- `ipc-bi-export-handler.cjs` (comment): "BI/ETL ingestion"

The BI module produces CSV files intended for ingestion into an external ETL system. The actual ETL happens outside the application.

### 7.1 What exists instead: The Export Pipeline

#### Extraction
- SQL queries from BiDatasetRegistry are executed against the live OLTP database
- No staging tables, no snapshots, no change tracking
- No incremental extraction — full table scans every time

#### Transformation
- BiDataMapper transforms raw DB rows to canonical BI objects
- Column renaming, null coalescing, computed fields (e.g., `line_total`)
- Audit log filtering of old/new_value for non-analytical action types
- No cleaning, no type coercion beyond mapper defaults

#### Validation
- BiValidator checks schema conformance, required columns, types, orphaned FKs
- Validation is post-hoc (after data collection, before CSV generation)
- Errors are fatal; warnings are informational

#### Loading
- CSV files are written to disk
- Metadata JSON is generated alongside CSVs
- Everything is packaged into a ZIP
- No data is loaded into any warehouse

---

## PART 8 — DATA WAREHOUSE

**There is no data warehouse.** No warehouse tables exist in the SQLite database. All BI queries run directly against OLTP tables. The exported CSVs serve as the "warehouse" that external systems ingest.

### 8.1 Dimension-Like Data (exported as dimension datasets)

| Dimension | Source Table | Transformations |
|-----------|-------------|-----------------|
| Products | `products` | Adds strftime normalization for created_at/updated_at |
| Customers | `customers` | Adds strftime normalization |
| Suppliers | `suppliers` | Adds strftime normalization |
| Product Families | `product_families` | Adds strftime normalization |
| Tables | `restaurant_tables` | Adds strftime normalization |
| Kitchen Departments | `kitchen_departments` | Adds strftime normalization |
| Services | `services` | Adds strftime normalization |
| Table Reservations | `table_reservations` | Adds strftime normalization |
| VAT Rates | `vat_rates` | Adds strftime normalization |

### 8.2 Fact-Like Data (exported as fact datasets)

| Fact | Source Table | Dependencies | Strategy |
|------|-------------|-------------|----------|
| Sales | `sales` + `customers` + `users` | customers, products | LEFT JOIN denormalization |
| Sale Items | `sale_items` + `sales` + `products` | sales, products | JOIN + computed line_total |
| Kitchen Orders | `kitchen_orders` | (none) | Direct query |
| Kitchen Order Items | `kitchen_orders` (json_each items) | kitchen_orders | JSON array unnesting |
| Stock Movements | `stock_movements` | (none) | Direct query |
| Shifts | `shifts` | (none) | Direct query |
| Cash Drawer Events | `cash_drawer_events` | (none) | Direct query |
| Z Reports | `z_reports` | (none) | Direct query |
| Appointments | `appointments` + `services` | services | LEFT JOIN |
| Inventory | `products` + aggregated `sale_items` | products | Subquery aggregation |
| Audit Logs | `audit_logs` | (none) | Direct query + mapper filtering |

### 8.3 FK Resolution Strategy

Foreign key resolution is handled in the SQL queries via LEFT JOINs (for denormalized names like customer_name, product_name) and in the validator via cross-dataset reference checks. The exported CSVs contain denormalized values, so the external ETL system does not need to resolve FKs.

---

## PART 9 — DATABASE AUDIT

### 9.1 BI-Related Tables

All 26 tables in the database are BI-related — they serve as the source data for BI exports.

#### Core Transaction Tables

| Table | Purpose | Writes | Reads (BI) | BI Dataset |
|-------|---------|--------|------------|------------|
| `sales` | Sale transactions | POS handlers | Dashboard, Reports, BI export | sales, sale_items |
| `sale_items` | Line items per sale | POS handlers | Dashboard, Reports, BI export | sale_items |
| `products` | Product catalog | Inventory handlers | Dashboard, BI export | products, inventory |
| `customers` | Customer profiles | Customer handlers | Dashboard, Reports, BI export | customers |
| `users` | User accounts | Auth manager | Reports (cashier), BI export | (denormalized in sales) |

#### Cash Management Tables

| Table | Purpose | Writes | Reads (BI) | BI Dataset |
|-------|---------|--------|------------|------------|
| `shifts` | Cash register shifts | Cash register handlers | Reports, BI export | shifts |
| `cash_drawer_events` | Cash drawer journal | Cash register handlers | BI export | cash_drawer_events |
| `z_reports` | End-of-day reports | Reports handler | Reports, BI export | z_reports |

#### Restaurant/Kitchen Tables

| Table | Purpose | Writes | Reads (BI) | BI Dataset |
|-------|---------|--------|------------|------------|
| `kitchen_orders` | Kitchen order lifecycle | Kitchen handlers | Kitchen, BI export | kitchen_orders, kitchen_order_items |
| `kitchen_departments` | Kitchen stations | Database handlers | BI export | kitchen_departments |
| `restaurant_tables` | Table layout | Table handlers | BI export | tables |
| `table_reservations` | Reservations | Reservation handlers | BI export | table_reservations |

#### Service/Appointment Tables

| Table | Purpose | Writes | Reads (BI) | BI Dataset |
|-------|---------|--------|------------|------------|
| `services` | Service catalog | Service handlers | BI export | services |
| `appointments` | Scheduled appointments | Appointment handlers | BI export | appointments |

#### Inventory/Supply Tables

| Table | Purpose | Writes | Reads (BI) | BI Dataset |
|-------|---------|--------|------------|------------|
| `stock_movements` | Stock movement audit | Stock handlers | BI export | stock_movements |
| `suppliers` | Supplier contacts | Supplier handlers | BI export | suppliers |

#### Audit/Logging Tables

| Table | Purpose | Writes | Reads (BI) | BI Dataset |
|-------|---------|--------|------------|------------|
| `audit_logs` | Full audit trail | All handlers | User admin, BI export | audit_logs |
| `user_sessions` | Session tracking | Auth manager | (admin) | — |
| `recent_logins` | Login history | Auth manager | (admin) | — |

#### Reference/Configuration Tables

| Table | Purpose | Writes | Reads (BI) | BI Dataset |
|-------|---------|--------|------------|------------|
| `product_families` | Product groups | Database handlers | BI export | product_families |
| `vat_rates` | VAT rate definitions | Database handlers | BI export | vat_rates |
| `settings` | System configuration | App handlers | — | — |
| `user_modules` | Module permissions | Auth manager | — | — |
| `security_settings` | Security configuration | Auth manager | — | — |
| `printer_configs` | Printer configuration | Hardware handlers | — | — |
| `department_printer_routes` | Printer routing | Hardware handlers | — | — |

### 9.2 Database Characteristics

| Property | Value |
|----------|-------|
| **Engine** | SQLite with WAL mode |
| **Synchronous** | FULL |
| **Busy timeout** | 5000ms |
| **FK enforcement** | Defined but depends on PRAGMA foreign_keys setting |
| **Total tables** | 26 |
| **Total indexes** | 58 |
| **Migrations** | 41 ALTER TABLE + 2 table recreations + 1 CHECK migration + 1 backfill |
| **BI schema version** | 2.2.0 (application constant, not stored in DB) |
| **Warehouse tables** | None |
| **ETL tables** | None |
| **Staging tables** | None |

---

## PART 10 — API INVENTORY

### 10.1 BI Export API

| Method | Route | Purpose | Request | Response | Caller | Service |
|--------|-------|---------|---------|----------|--------|---------|
| IPC | `bi:export` | Generate full BI export ZIP | `{ businessType?, ... }` | `{ success, filePath, fileName, fileSize, metadata, stats, validation, exportDuration }` | BiExportModal | IPCBiExportHandler.runExport() |

### 10.2 Report/Analytics APIs

All are IPC handlers registered in `ipc-reports-handlers.cjs`.

| Handler Name | Purpose | Parameters | Called By |
|-------------|---------|------------|-----------|
| `report:dashboard` | KPI data for dashboard | `{ period, start, end }` | Reports.jsx (tab 1) |
| `report:sales-by-period` | Sales time series | `{ period, start, end }` | Reports.jsx (tab 1) |
| `report:categories` | Category breakdown | `{ period, start, end }` | Reports.jsx (tab 1) |
| `report:top-products` | Top selling products | `{ period, start, end, limit }` | Reports.jsx (tab 1) |
| `report:payment-methods` | Payment method split | `{ period, start, end }` | Reports.jsx (tab 1) |
| `report:cashiers` | Cashier performance | `{ period, start, end }` | Reports.jsx (tab 1) |
| `report:revenue-trends` | Revenue trends over time | `{ period, start, end }` | Reports.jsx (tab 2) |
| `report:hourly-heatmap` | Hourly sales heatmap | `{ period, start, end }` | Reports.jsx (tab 2) |
| `report:customers` | Customer statistics | `{ period, start, end }` | Reports.jsx (tab 2) |
| `report:transactions` | Paginated transaction list | `{ page, perPage, search, paymentMethod, sortBy, sortDir, startDate, endDate }` | Reports.jsx (tab 3) |
| `report:cash-shifts` | Paginated shift list | `{ page, perPage, search, status, sortBy, sortDir, startDate, endDate }` | Reports.jsx (tab 4) |
| `report:x-report` | Generate X report | `{ shift_id }` | Reports.jsx (tab 5) |
| `report:z-report` | Generate Z report | `{ shift_id, closing_amount }` | Reports.jsx (tab 5) |
| `report:z-report-history` | Z report archive | `{ page, perPage, start, end, user_id }` | Reports.jsx (tab 5) |

### 10.3 Dashboard Raw SQL API

| Handler Name | Purpose | Parameters | Called By |
|-------------|---------|------------|-----------|
| `query` | Execute raw SQL | `{ sql, params }` | Dashboard.jsx |

### 10.4 Inventory/Warehouse APIs

All registered in `ipc-stock-handlers.cjs`, `ipc-database-handlers.cjs`.

| Handler Name | Purpose | Called By |
|-------------|---------|-----------|
| `get-products` | List all products | Inventory.jsx |
| `get-families` | List product families | Inventory.jsx |
| `get-suppliers` | List suppliers | Inventory.jsx |
| `get-vat-rates` | List VAT rates | Inventory.jsx |
| `get-stock-movements` | List stock movements | Inventory.jsx |
| `get-stock-summary` | Stock summary stats | Inventory.jsx |
| `adjust-stock` | Adjust product stock | Inventory.jsx |
| `add-stock-movement` | Record stock movement | Inventory.jsx |
| `update-product` | Update product | Inventory.jsx |
| `delete-product` | Delete product | Inventory.jsx |
| `get-product-movements` | Movements for a product | Inventory.jsx |
| `update-supplier` | Update supplier | Inventory.jsx |
| `add-supplier` | Add supplier | Inventory.jsx |
| `delete-supplier` | Delete supplier | Inventory.jsx |

### 10.5 Admin/User APIs

All registered in `ElectronAuthManager.cjs`.

| Handler Name | Purpose | Called By |
|-------------|---------|-----------|
| `get-users` | List users | UserManagementAdvanced |
| `create-user` | Create user | UserManagementAdvanced |
| `update-user` | Update user | UserManagementAdvanced |
| `delete-user` | Delete user | UserManagementAdvanced |
| `get-user-modules` | Get user permissions | UserManagementAdvanced |
| `update-user-modules` | Update user permissions | UserManagementAdvanced |
| `get-audit-logs` | List audit log entries | UserManagementAdvanced |
| `export-settings` | Export system settings | Settings.jsx |

---

## PART 11 — FILE INVENTORY

### 11.1 BI Core Files

| File | Lines | Role |
|------|-------|------|
| `src/electron/bi/BiDatasetRegistry.cjs` | 541 | Dataset registry with SQL queries |
| `src/electron/bi/BiSchemaContract.cjs` | 457 | Schema contracts and versioning |
| `src/electron/bi/BiDataMapper.cjs` | 538 | Row transformation mappers |
| `src/electron/bi/BiValidator.cjs` | 281 | Validation engine |

### 11.2 BI Export Handler

| File | Lines | Role |
|------|-------|------|
| `src/electron/handlers/ipc-bi-export-handler.cjs` | 455 | Export orchestrator, ZIP builder |

### 11.3 BI Frontend

| File | Lines | Role |
|------|-------|------|
| `src/components/BiExportModal.jsx` | 229 | Export UI modal |
| `src/pages/Reports.jsx` | 1,886 | Reports hub with export trigger |
| `src/pages/Dashboard.jsx` | 601 | KPI dashboard |

### 11.4 Report Handlers (Backend for Analytics)

| File | Lines | Role |
|------|-------|------|
| `src/electron/handlers/ipc-reports-handlers.cjs` | 831 | All analytics/report IPC handlers |

### 11.5 IPC Bridge

| File | Lines | Role |
|------|-------|------|
| `public/preload.cjs` | 360 | `exportBiData` bridge (line 144, 194) |

### 11.6 Supporting Files (Backend)

| File | Lines | Role |
|------|-------|------|
| `src/electron/ElectronDatabaseManager.cjs` | 2,250 | Database schema, migrations, queries |
| `src/electron/ElectronAuthManager.cjs` | ~1,200 | User auth, audit logging |
| `src/electron/services/LoggerService.cjs` | ~50 | Application logging |

### 11.7 Inventory/Warehouse Frontend

| File | Lines | Role |
|------|-------|------|
| `src/pages/Inventory.jsx` | 1,034 | Stock management, movements, suppliers |

### 11.8 Admin Frontend

| File | Lines | Role |
|------|-------|------|
| `src/components/UserManagementAdvanced.jsx` | 782 | User CRUD, permissions, audit log viewer |
| `src/pages/UserAdmin.jsx` | 25 | Admin page wrapper |
| `src/components/AdminOnlyRoute.jsx` | 28 | Admin route guard |
| `src/pages/Settings.jsx` | 763 | System settings with backup/export |
| `src/pages/HardwareSettings.jsx` | ~963 | Hardware diagnostics dashboard |

### 11.9 Navigation and Routing

| File | Lines | Role |
|------|-------|------|
| `src/components/POSNavbar.jsx` | 385 | Navigation sidebar |
| `src/App.jsx` | 368 | Route definitions |

---

## PART 12 — CURRENT LIMITATIONS

### 12.1 Architectural Limitations

| # | Limitation | Impact |
|---|-----------|--------|
| L1 | **No data warehouse** — BI exports query live OLTP tables directly | Query performance degrades as data grows; full table scans every export; no historical snapshots |
| L2 | **No incremental extraction** — always full exports | Export time grows linearly with data size; no delta/incremental support |
| L3 | **No ETL pipeline inside the app** — CSVs are raw extracts with minimal transformation | External ETL system must handle all cleaning, type coercion, and business logic |
| L4 | **No upload/import mechanism** — data only flows out | Cannot receive data from external systems; no batch import capability |
| L5 | **No BI admin panel** — no centralized management UI | Users must navigate to Reports page; no export scheduling, no export history viewer, no configurable datasets |

### 12.2 Export-Specific Limitations

| # | Limitation | Impact |
|---|-----------|--------|
| L6 | **registerBiExportHandlers() is NOT called** anywhere in the main process entry point | The bi:export IPC handler may not be registered at runtime; export may fail silently |
| L7 | **Manual ZIP construction** — no external library | Non-standard ZIP format edge cases; no streaming; all files held in memory before writing |
| L8 | **No export scheduling** — manual only | User must be present to trigger each export |
| L9 | **No export history** — no record of past exports | No audit trail of when data was exported |
| L10 | **No progress reporting** — BiExportModal receives only a callback | User sees a spinner but no meaningful progress information |
| L11 | **Full table scans** — no WHERE clause filtering in BI SQL | Cannot export a specific date range; always exports everything |
| L12 | **No parallel execution for all datasets** — only 2 batches (3+1) | Sequential execution for remaining 18 datasets slows export |
| L13 | **No data compression in CSVs** — CSVs stored as plain text in ZIP | Larger file sizes than necessary |

### 12.3 Data Quality Limitations

| # | Limitation | Impact |
|---|-----------|--------|
| L14 | **No timestamp consistency** — mixed UTC/localtime across columns | BI consumers must handle timezone conversion |
| L15 | **JSON blob columns** — kitchen_orders.items still stored as JSON | External ETL must parse JSON; no normalized structure in export |
| L16 | **No computed metrics in export** — only raw data | External system must compute KPIs (profit, margins, trends) |
| L17 | **No data quality scoring** — validation is pass/fail | Users don't know if the data is trustworthy |

### 12.4 Schema and Versioning Limitations

| # | Limitation | Impact |
|---|-----------|--------|
| L18 | **BI schema version is a code constant** — not stored in DB or export metadata | Cannot verify which version generated a given export file |
| L19 | **No schema migration tracking for BI** — no version history | Cannot determine what changed between versions |
| L20 | **Column removal from kitchen_orders** — items column removed | Breaking change for downstream ETL consuming this column |

### 12.5 Business Logic Limitations

| # | Limitation | Impact |
|---|-----------|--------|
| L21 | **No multi-currency support** — currency is hardcoded from app-config | Exports always in business's native currency |
| L22 | **No multi-language export** — column names are English, descriptions are French | Mixed-language metadata |
| L23 | **Business type detection from app-config.json only** — no override | Cannot export for a different business type than configured |
| L24 | **No role-based export restrictions** — any user with access to Reports can export | No data access control on BI exports |

### 12.6 Inventory/Warehouse Limitations

| # | Limitation | Impact |
|---|-----------|--------|
| L25 | **No perpetual inventory** — stock is updated manually via adjustments | Stock may drift from actual; no auto-deduction on sale |
| L26 | **No multi-warehouse support** — single stock per product | Cannot manage multiple locations |
| L27 | **No batch/lot tracking** — no expiry or lot number support | Cannot manage perishable inventory properly |

---

## PART 13 — DEPENDENCY MAP

### 13.1 BI Export Flow Dependencies

```
BiExportModal (Renderer)
    │
    ├── Depends on: preload.cjs (exportBiData bridge)
    │
    ▼
ipc-bi-export-handler.cjs (Main Process)
    │
    ├── Depends on: BiDatasetRegistry.resolveExportDatasets()
    │                      .getRegistryEntry()
    ├── Depends on: BiDataMapper.getMapper()
    ├── Depends on: BiSchemaContract.getColumnNames()
    │                      .getCsvHeader()
    ├── Depends on: BiValidator.validateAll()
    ├── Depends on: LoggerService
    └── Depends on: ElectronDatabaseManager.getDatabase()
                    └── Returns better-sqlite3 database connection
```

### 13.2 BI Library Internal Dependencies

```
BiDataMapper
    └── Depends on: BiSchemaContract.getSchema()
                    (for generic mapRow/mapRows)

BiValidator
    ├── Depends on: BiSchemaContract.getSchema()
    └── Depends on: BiDatasetRegistry (for registry entry lookup)

BiDatasetRegistry
    └── No internal dependencies (standalone)

BiSchemaContract
    └── No internal dependencies (standalone)
```

### 13.3 Report/Analytics Dependencies

```
Reports.jsx (Renderer)
    │
    ├── Depends on: BiExportModal
    ├── Depends on: POSConfiguration, useAppConfig
    ├── Depends on: recharts, shadcn/ui, lucide-react
    │
    ▼
ipc-reports-handlers.cjs (Main Process)
    │
    ├── Depends on: ElectronDatabaseManager.getDatabase()
    └── Depends on: DatabaseQueryOptimizer (may use)
```

### 13.4 Dashboard Dependencies

```
Dashboard.jsx (Renderer)
    │
    ├── Depends on: recharts, lucide-react
    ├── Depends on: POSConfiguration, useAppConfig
    │
    ▼
electronAPI.query() → ElectronDatabaseManager (raw SQL)
```

### 13.5 Admin Dependencies

```
UserAdmin.jsx → UserManagementAdvanced.jsx
    │
    ├── Depends on: shadcn/ui, lucide-react
    ├── Depends on: useAppConfig
    ├── Depends on: AuthContext
    │
    ▼
ElectronAuthManager.cjs → ElectronDatabaseManager

Settings.jsx
    │
    ├── Depends on: shadcn/ui, lucide-react
    ├── Depends on: useAppConfig, useSettings, useLicense
    │
    ▼
ipc-app-handlers.cjs → ElectronDatabaseManager

Inventory.jsx
    │
    ├── Depends on: shadcn/ui, lucide-react
    ├── Depends on: POSConfiguration
    │
    ▼
ipc-stock-handlers.cjs + ipc-database-handlers.cjs → ElectronDatabaseManager
```

### 13.6 Visual Dependency Graph

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│ BiExportModal│────▶│ preload.cjs  │────▶│ ipc-bi-export   │
│  (renderer)  │     │  (bridge)    │     │  -handler.cjs   │
└─────────────┘     └──────────────┘     └────────┬─────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────┐
                    │                             │                     │
                    ▼                             ▼                     ▼
          ┌─────────────────┐          ┌─────────────────┐   ┌─────────────────┐
          │ BiDatasetRegistry│          │  BiDataMapper   │   │  BiValidator    │
          │  (22 datasets)   │          │  (22 mappers)   │   │  (validation)   │
          └────────┬────────┘          └────────┬────────┘   └────────┬────────┘
                   │                            │                     │
                   │                            ▼                     │
                   │                   ┌─────────────────┐            │
                   │                   │ BiSchemaContract│            │
                   │                   │  (schemas)      │            │
                   │                   └─────────────────┘            │
                   ▼                                                  │
          ┌─────────────────┐                                         │
          │ ElectronDB      │◀────────────────────────────────────────┘
          │ Manager         │
          │ (SQLite OLTP)   │
          └─────────────────┘
```

---

## PART 14 — FINAL REPORT

### 14.1 Executive Summary

The current BI module is a **registry-driven export system** that generates structured CSV/ZIP archives from the live OLTP database. It consists of 4 library files (registry, schema, mapper, validator), 1 export handler, 1 frontend modal, and 1 IPC bridge — approximately 2,625 lines of code across 7 files.

**Key architectural fact: There is no BI Admin Panel.** BI functionality is embedded in the Reports page (`/reports`) via an "Export BI" button that opens BiExportModal. There is no data warehouse, no ETL pipeline, no upload mechanism, no scheduling, no export history, and no centralized BI management interface.

**Critical finding:** The `registerBiExportHandlers()` function that registers the `bi:export` IPC handler is **not called** anywhere in the main process entry point. The export handler may not be registered at application startup.

### 14.2 Current BI Architecture

- **Type:** Export-only, registry-driven, business-type-aware
- **Datasets:** 22 (10 facts, 12 dimensions — including new kitchen_order_items)
- **Schema version:** 2.2.0
- **Database:** SQLite with WAL mode (26 tables, 58 indexes)
- **Export format:** ZIP containing CSVs with UTF-8 BOM + metadata.json
- **Validation:** Schema conformance, type checking, referential integrity (7 cross-dataset checks)
- **Storage:** Documents/CarthaPOS/BI_Exports/

### 14.3 Admin Panel UI

- **None exists for BI.** No dedicated admin page, no management interface, no configuration UI for BI exports.
- The closest pages are Reports.jsx (analytics + export trigger), Inventory.jsx (stock management), Settings.jsx (backup/export), and UserManagementAdvanced.jsx (admin user/role management).
- AdminOnlyRoute protects `/user-admin` and `/user-management` for role-based access.
- No audit or monitoring specific to BI exports.

### 14.4 Frontend Components

- **BiExportModal.jsx** (229 lines) — The only BI-specific component. Modal with 4 states (idle, exporting, done, error).
- **Reports.jsx** (1,886 lines) — Contains the BI export trigger button. Also hosts 5 analytics tabs with recharts visualizations.
- **Dashboard.jsx** (601 lines) — Main KPI dashboard. Uses raw SQL queries via electronAPI.query().

### 14.5 Backend Components

- **BiDatasetRegistry.cjs** (541 lines) — Defines 22 datasets with SQL queries, business types, module requirements.
- **BiSchemaContract.cjs** (457 lines) — Canonical schemas with column names, types, required flags.
- **BiDataMapper.cjs** (538 lines) — 22 mapper functions from raw DB rows to BI objects.
- **BiValidator.cjs** (281 lines) — Pre-export validation: schemas, types, nulls, FK orphans, classification.
- **ipc-bi-export-handler.cjs** (455 lines) — Full export pipeline: resolve, collect, validate, generate CSV, build ZIP.
- **ipc-reports-handlers.cjs** (831 lines) — 14 analytics/report IPC handlers.

### 14.6 Upload Workflow

**No upload workflow exists.** The BI module is export-only. There is no data import, no file upload, and no ingestion pipeline.

### 14.7 ETL Workflow

**No ETL workflow exists.** The term "ETL" appears only in comments describing downstream consumers. The BI module extracts, minimally transforms, and exports CSV files for an external ETL system.

### 14.8 Warehouse Loading Workflow

**No warehouse loading exists.** There are no warehouse tables, no staging tables, and no loading workflow. All data is queried directly from OLTP tables.

### 14.9 Database Structure

- 26 tables, all in a single SQLite database
- No BI-specific tables (no export history, no warehouse, no ETL state tracking)
- 58 indexes for query performance
- Schema version: 2.2.0 (application constant, not stored in DB)
- Mixed timestamp storage: UTC (CURRENT_TIMESTAMP) and localtime (datetime('now','localtime'))

### 14.10 API Inventory

- 1 BI export endpoint (`bi:export` — IPC)
- 14 report/analytics endpoints (`report:*` — IPC)
- 1 raw SQL query endpoint (`query` — IPC)
- 20+ CRUD endpoints for inventory, users, suppliers, settings
- All are Electron IPC handlers, not HTTP endpoints

### 14.11 File Inventory

- **BI backend:** 5 files (registry, schema, mapper, validator, handler) — 2,272 lines
- **BI frontend:** 3 files (export modal, reports page, dashboard) — 2,716 lines
- **Admin:** 5 files (user admin, route guard, settings, hardware, navbar) — 2,161 lines
- **Supporting:** ~5 files (database manager, auth manager, logger, preload, inventory) — ~5,000 lines

### 14.12 Dependency Map

The BI module has a clean layered architecture with no circular dependencies:
- **Layer 1 (Standalone):** BiDatasetRegistry, BiSchemaContract — no dependencies
- **Layer 2 (Depends on Layer 1):** BiDataMapper (depends on SchemaContract), BiValidator (depends on both)
- **Layer 3 (Depends on Layer 2):** ipc-bi-export-handler (depends on all 4)
- **Layer 4 (Frontend):** BiExportModal → preload bridge → Layer 3

### 14.13 Current Limitations

27 identified limitations across 6 categories:
1. **Architectural (5):** No warehouse, no incremental extraction, no ETL, no upload, no admin panel
2. **Export-specific (8):** Unregistered handler, manual ZIP, no scheduling, no history, no progress, full scans, limited parallelism, no compression
3. **Data quality (4):** Mixed timestamps, JSON blobs, no computed metrics, pass/fail validation
4. **Schema/versioning (3):** Version not in DB, no migration tracking, breaking column removal
5. **Business logic (4):** No multi-currency, no multi-language, no business type override, no role-based export restrictions
6. **Inventory (3):** No perpetual inventory, no multi-warehouse, no batch/lot tracking

### 14.14 Overall Assessment

The BI module is a **well-designed export system** for its current scope — it cleanly separates concerns (registry, schema, mapper, validator, handler), supports business-type-aware exports, validates data integrity before export, and produces structured, documented ZIP archives.

However, the system is **fundamentally limited by its export-only architecture**. There is no BI admin panel, no warehouse, no ETL pipeline, no scheduling, no history, and no upload mechanism. The system generates data for external consumption but provides no tools to manage, monitor, or analyze BI operations internally.

The most critical issues are:
1. **registerBiExportHandlers is not wired** into the main process — the export endpoint may not work at runtime
2. **No BI admin panel** exists — all management is through a single button on the Reports page
3. **No warehouse/staging** — exports degrade as data grows
4. **No export history or scheduling** — every export is a manual ad-hoc operation
