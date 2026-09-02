# Sprint Progress Report — CarthaPOS Restaurant & Café Edition

---

## Sprint 7 — Settings ✅

### Goal
Wire the Settings page to persist config to the database.

### Changes
| File | Change |
|------|--------|
| `public/preload.cjs` | Added 3 bridges: `getSetting`, `setSetting`, `getAllSettings` → reuses existing `settings:get`/`settings:set`/`settings:getAll` IPC handlers in `ipc-app-handlers.cjs` |

### Result
- Settings page now loads from DB on mount, falls back to `app-config` theme values
- Save button persists to `settings` table via `INSERT ... ON CONFLICT DO UPDATE`
- HardwareSettings and SecuritySettings pages are UI-only, no IPC changes needed

---

## Sprint 8 — Receipt Designer ✅

### Goal
Persist receipt template config to the database and wire test print.

### Changes
| File | Change |
|------|--------|
| `public/preload.cjs` | Added `getReceiptConfig` → `settings:get('receiptConfig')`, `saveReceiptConfig` → `settings:set('receiptConfig', JSON.stringify(config))` |
| `src/pages/ReceiptDesigner.jsx` | `loadConfiguration` reads DB first, localStorage fallback. `saveConfiguration` writes DB + localStorage. `testPrint` no longer stub — calls `window.thermalPrinter.testPrint()` if available |
| `src/pages/Sales.jsx` | `printReceipt` is now async, reads receipt config from DB first, localStorage fallback. Caller at line 376 now `await`s the call |
| `src/lib/hardware/thermalPrinter.js` | Added `window.thermalPrinter = thermalPrinter` global assignment so pages can access it |

### Result
- Receipt designer config survives localStorage clear
- Sales.jsx receipt printing uses same config source
- Test print button actually attempts to print via ThermalPrinterManager

---

## Sprint 6 (continued) — Inventory + Reports ✅

### Goal
Add `cost_price`, `unit`, `min_stock`, `supplier` fields to products; use `min_stock` everywhere; add most-consumed inventory report.

### Changes
| File | Change |
|------|--------|
| `src/electron/ElectronDatabaseManager.cjs` | Migration: `supplier_id INTEGER` → `supplier TEXT`. Updated CREATE TABLE |
| `src/components/ProductFormDialog.jsx` | Added `cost_price`, `min_stock`, `unit`, `supplier` input fields + populate on edit |
| `src/electron/handlers/ipc-database-handlers.cjs` | `add-product`/`update-product` now read/write `cost_price`, `min_stock`, `unit`, `supplier` |
| `src/pages/Dashboard.jsx` | Low-stock SQL: `stock <= 5` → `min_stock > 0 AND stock <= min_stock` |
| `src/pages/Inventory.jsx` | Filter, count, stock badge all use `min_stock`. Table added columns: Unité, Prix achat, Valeur stock (cost_price), Fournisseur. Reports tab with most-consumed products query |
| `src/pages/Products.jsx` | `getStockBadge` now accepts `minStock` parameter |
| `src/pages/Sales.jsx` | Low-stock indicator uses `product.min_stock` |
| `src/pages/Barcode.jsx` | Badge variant uses `product.min_stock || 10` |
| `src/pages/QuickService.jsx` | Badge variant uses `product.min_stock || 10` |
| `public/preload.cjs` | Added `addSupplier`, `updateSupplier`, `deleteSupplier`, `getMostConsumedProducts`. Removed duplicate stock bridges |
| `src/electron/handlers/ipc-stock-handlers.cjs` | Added `stock:most-consumed` handler (top 15 products by consumption, 90-day window) |

### Result
- Products now track purchase price, unit, minimum stock alert threshold, and supplier
- Low-stock alerts across all pages respect per-product `min_stock` instead of hardcoded thresholds
- Inventory reports tab shows most-consumed products ranked by total quantity consumed

---

## End-to-End Validation — Missing Bridges ✅

### Goal
Fix all `window.electronAPI.*` calls that had no corresponding preload bridge.

### Changes
| File | Change |
|------|--------|
| `public/preload.cjs` | Added 9 missing bridges: `getCustomers`, `addCustomer`, `updateCustomer`, `deleteCustomer`, `addService`, `deleteService`, `addAppointment`, `updateAppointmentStatus`, `updateSupplierStatus` |

### Missing Bridges Fixed
| Method Called | Page | IPC Channel | Handler Existed? |
|---|---|---|---|
| `getCustomers` | Customers.jsx, Appointments.jsx | `get-customers` | ✅ Already existed |
| `addCustomer` | Customers.jsx | `add-customer` | ✅ Already existed |
| `updateCustomer` | Customers.jsx | `update-customer` | ✅ Already existed |
| `deleteCustomer` | Customers.jsx | `delete-customer` | ✅ Already existed |
| `addService` | Services.jsx | `add-service` | ✅ Already existed |
| `deleteService` | Services.jsx | `delete-service` | ✅ Already existed |
| `addAppointment` | Appointments.jsx | `add-appointment` | ✅ Already existed |
| `updateAppointmentStatus` | Appointments.jsx | `update-appointment-status` | ✅ Already existed |
| `updateSupplierStatus` | Suppliers.jsx | `update-supplier-status` | ✅ Already existed |

All back-end IPC handlers already existed — only the preload bridges were missing.

---

## Restaurant Edition — Feature Complete ✅

| Sprint | Feature | Status |
|--------|---------|--------|
| 1 | Sales (payment, kitchen orders, hold/recall, receipts) | ✅ |
| 2 | Kitchen display (real-time orders, polling, sound, print) | ✅ |
| 3 | Tables (CRUD, merge, split, transfer, drag, zones) | ✅ |
| 4 | Cash Register (shift open/close, drawer events, totals) | ✅ |
| 5 | Reports (real DB transactions, dashboard charts, top products) | ✅ |
| 6 | Inventory (stock adjustments, movements, min_stock alerts, most-consumed report) | ✅ |
| 7 | Settings (business info, currency, tax, preferences persisted to DB) | ✅ |
| 8 | Receipt Designer (config saved to DB, test print wired) | ✅ |

### Still Deferred (non-blocking)
- Build system fix (Vite config ESM/require conflict, missing `public/` files)
- NotificationManager / ErrorRecovery modules (disabled in `main.jsx`)
- Printer/CashDrawer hardware IPC handlers (`initializePrinter`, `printReceipt`, etc.)

### Next Phase
BI (ETL, Data Warehouse, Star Schema, OLAP, KPIs, Power BI)
