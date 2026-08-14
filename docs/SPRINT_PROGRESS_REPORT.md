# CarthaPOS — Sprint Progress Report (5 Sprints)

**Project:** CarthaPOS Restaurant & Café Edition (PFE)
**Working directory:** `D:/carthapos/pos-template/`
**Date:** July 15, 2026

---

## Overview

5 sprints completed covering 6 of 8 major feature modules. The app is an Electron + React + SQLite POS system with 20+ database tables, a full Kitchen Display System, Cash Register shift management, BI export pipeline, and multi-module architecture.

---

## Sprint 1 — Sales (Completed)

### What was done
- **Atomic transactions**: `runTransaction()` with BEGIN/COMMIT/ROLLBACK wraps the entire sale flow (sale header + items + inventory deduction + kitchen order + shift totals) in a single atomic operation.
- **User context**: `user_id` sourced from `useAuth()` context, passed through all sale operations.
- **Hold/Recall**: Full lifecycle — orders saved to `held_orders` table with JSON-serialized items, restored to the sale cart on recall, deleted after restore.
- **Full sale metadata**: `subtotal`, `discount_percentage`, `notes` stored on the `sales` table.
- **Receipt printing**: Integrated with Receipt Designer template system, called at sale completion.
- **Kitchen order creation**: Automatic creation inside the sale transaction when a `table_id` is assigned.
- **Customer stats**: `visit_count`, `total_spent`, `last_visit_date` updated atomically during sale.
- **Shift totals**: Active shift's `cash_sales`/`card_sales`/`other_sales` incremented inside the same transaction.
- **CustomEvents**: `sale-completed` and `kitchen-order-created` dispatched for cross-component reactivity.

### Key files
| File | Role |
|---|---|
| `src/electron/handlers/ipc-sales-handlers.cjs` | Atomic sale handler with 7-step pipeline |
| `src/electron/ElectronDatabaseManager.cjs:runTransaction()` | BEGIN/COMMIT/ROLLBACK wrapper |
| `src/pages/Sales.jsx` | Sales UI with cart, payment, hold/recall |

---

## Sprint 2 — Kitchen (Completed)

### What was done
- **Migration**: Added `started_at`/`completed_at` columns to `kitchen_orders`.
- **Handlers rewritten**: 4 dedicated handlers (`get-active-kitchen-orders`, `get-kitchen-order`, `get-kitchen-order-stats`, `update-kitchen-order-status`) with proper column names and auto-timestamp setting.
- **UI rewrite** (`Kitchen.jsx`): 7 stat cards (pending, in-progress, completed today, avg prep time, late orders, total today, all-time total), priority color mapping (high=red, normal=blue, low=gray), sound notification on new orders, working print button, 15-second auto-poll, `kitchen-order-created` event listener.
- **Preload bridges**: All 5 kitchen IPC channels exposed.

### Key files
| File | Role |
|---|---|
| `src/electron/handlers/ipc-sales-handlers.cjs` | Kitchen order creation inside sale |
| `src/pages/Kitchen.jsx` | Full KDS UI with stats, filtering, sound |
| `public/preload.cjs` | Bridges for kitchen IPC channels |

---

## Sprint 3 — Tables (Completed)

### What was done
- **7 new columns** via migration: `x`, `y` (positions), `waiter`, `notes`, `merged_tables`, `merged_into`, `zone`, `area_name` on `restaurant_tables`.
- **Handler rewrite**: `add-table` now inserts all 8 fields; `update-table` dynamically builds SET clauses from any provided field.
- **Fix UI persistence**: `executeMerge`, `executeSplit`, `executeTransfer` all persist to DB via `window.electronAPI.updateTable`. Delete button uses `await`. Positions saved on drag-end.
- **Floor plan** with drag-to-rearrange, status cycle click (available ↔ occupied ↔ reserved ↔ cleaning), merge/split/transfer modes, bulk table creation.

### Key files
| File | Role |
|---|---|
| `src/electron/ElectronDatabaseManager.cjs` | 7 migration ALTER TABLE statements |
| `src/electron/handlers/ipc-database-handlers.cjs` | Dynamic update handler |
| `src/pages/Tables.jsx` | Floor plan, list view, merge/split/transfer UI |

---

## Sprint 4 — Cash Register (Completed)

### What was done
- **Bug fix** (`ipc-cash-register-handlers.cjs:83-105`): `getSalesTotalsForShift` referenced `s.id` (no alias) and non-existent `shift_id` column. Fixed to use `shift_id` directly.
- **Missing handlers**: Added `log-cash-drawer-event` and `get-cash-drawer-history` IPC handlers to `ipc-auth-handlers.cjs`, wiring preload bridges to existing `ElectronAuthManager` methods.
- **Migration**: Added `shift_id` column to `sales` table.
- **Sale→shift link**: Restructured `add-sale` to find active shift before INSERT, storing `shift_id` on sale row.
- **Existing architecture** (pre-built): Full `CashRegister.jsx` (365 lines) with open/close shift dialogs, 14-denomination counting grid, shift history table, stat cards (cash sales, card sales, float+cash). `shifts` table with full schema. 6 IPC handlers in dedicated `ipc-cash-register-handlers.cjs`.

### Key files
| File | Role |
|---|---|
| `src/pages/CashRegister.jsx` | Shift management UI with denomination counting |
| `src/electron/handlers/ipc-cash-register-handlers.cjs` | 6 cash register IPC handlers |
| `src/electron/handlers/ipc-auth-handlers.cjs` | Cash drawer event handlers added |
| `src/electron/handlers/ipc-sales-handlers.cjs` | Shift totals update + shift_id storage |
| `src/electron/ElectronDatabaseManager.cjs` | shift_id migration |

---

## Sprint 5 — Reports / Dashboard (Completed)

### What was done
- **Transactions from DB** (`Reports.jsx`): Added `loadTransactions()` function that queries sales + users + customers with item count subquery. Maps DB columns to the transaction table display format. Falls back to demo data in preview mode. Was previously stuck on demo data only.
- **Dashboard chart wired** (`Dashboard.jsx`): Replaced `"Chart will be displayed here"` placeholder with live `<BarChart>` (recharts) rendering monthly revenue from the `chartData` state that was already loaded but never rendered.
- **Sales page navigation** (`Sales.jsx`): Fixed "Rapports" and "Client" quick-action buttons from toast stubs to `window.location.hash` navigation.

### Existing architecture
- **Reports.jsx** (1013 lines): Period selector (today/yesterday/week/month/year), stat cards, bar chart (hourly/daily), pie chart (categories), performance table, full transaction ledger with search/5 filters/sort/pagination, transaction detail modal, BI Export button.
- **Dashboard.jsx** (551 lines): 4 stat cards, recent sales, alerts, quick actions, now with working monthly revenue chart.
- **BI Export pipeline**: `BiExportModal` → `ipc-bi-export-handler.cjs` → `BiSchemaContract`/`BiDataMapper`/`BiValidator` → CSV → ZIP export.

### Key files
| File | Role |
|---|---|
| `src/pages/Reports.jsx` | Full reports page with charts, transactions, BI export |
| `src/pages/Dashboard.jsx` | Home page with stats + wired chart |
| `src/electron/handlers/ipc-sales-handlers.cjs` | `get-sales-data` handler |
| `src/components/BiExportModal.jsx` | BI export dialog |
| `src/electron/bi/BiSchemaContract.cjs` | Schema definitions for 9 datasets |
| `src/electron/bi/BiDataMapper.cjs` | DB→schema mapping (18 mappers) |
| `src/electron/bi/BiValidator.cjs` | Pre-export validation |

---

## Pre-audit Fixes (Cross-sprint)

Before the sprint work, a comprehensive pre-audit fixed critical issues:
- **4 missing DB tables** added: `inventory_movements`, `held_orders`, `user_sessions`, `cash_drawer_events`
- **3 handler crashes** fixed: `ipc-inventory-handlers.cjs`, `ipc-supplier-handlers.cjs`, `ipc-service-handlers.cjs` had `isPreviewMode` called without import
- **10+ preload bridges** added: customer stats, inventory, backup, held orders, kitchen orders, cash drawer events
- **`getDatabaseStats()`** updated to cover all 20 tables

---

## Current Project Status

### ✅ Completed (6 of 8 feature modules)
1. **Sales** — Atomic transactions, hold/recall, receipt printing, kitchen order integration, customer stats
2. **Kitchen** — Active order display, priority, stats cards, sound, auto-poll, print
3. **Tables** — Floor plan, drag positioning, status cycling, merge/split/transfer, bulk create
4. **Cash Register** — Open/close shifts with denomination counting, shift history, sale→shift linking
5. **Reports** — Period filtering, charts, transaction ledger, BI export pipeline (7+ CSV files + ZIP)
6. **Dashboard** — KPI cards, recent sales, alerts, monthly revenue chart

### 🔲 Remaining (2 feature modules)
7. **Inventory** — Stock management, movements, low-stock alerts, supplier management
8. **Settings / Receipt Designer** — App configuration, user management, receipt template designer

### ⚠️ Known Blockers (Deferred)
- **Build broken**: `vite.config.js` has ESM/require conflict
- **Missing production assets**: `public/app-config.json`, `public/favicon.ico`, `test-configs.js`
- **notificationManager** and **errorRecovery** remain disabled in `main.jsx`
- Build pipeline fix deferred until after Sprint 8 (feature completion)

### Database
- **20 tables** fully migrated in SQLite
- Auto-migration system handles column additions gracefully (ALTER TABLE IF NOT EXISTS pattern)
- Backup system writes to `{Documents}/CarthaPOS/`
- BI export to `{Documents}/CarthaPOS/BI_Exports/`

### Architecture
- **Electron main**: `public/electron-modular.cjs` (modular handler registration)
- **Preload**: `public/preload.cjs` (158 lines, 50+ IPC bridges)
- **React app**: Hash router, lazy-loaded pages, shadcn/ui components
- **IPC handlers**: 7 handler files in `src/electron/handlers/`, centralized DB manager in `ElectronDatabaseManager.cjs`
- **State**: `useAuth()` context for user, `useAppConfig()` for settings, component-local state for business logic

---

## File Change Summary

| File | Sprint(s) | Change |
|---|---|---|
| `ElectronDatabaseManager.cjs` | 2, 3, 4 | Added 11 migration columns across 3 tables (kitchen_orders 2, restaurant_tables 7, sales 1, settings 1), shifts + cash_drawer_events tables |
| `ipc-sales-handlers.cjs` | 1, 4 | Atomic transaction, shift_id storage, shift totals update |
| `ipc-database-handlers.cjs` | 3 | Dynamic update handler, full-field add-table |
| `ipc-cash-register-handlers.cjs` | 4 | Fixed getSalesTotalsForShift SQL bug |
| `ipc-auth-handlers.cjs` | 4 | Added cash drawer event handlers |
| `ipc-inventory-handlers.cjs` | Pre-audit | Fixed isPreviewMode import crash |
| `ipc-supplier-handlers.cjs` | Pre-audit | Fixed isPreviewMode import crash |
| `ipc-service-handlers.cjs` | Pre-audit | Fixed isPreviewMode import crash |
| `public/preload.cjs` | Pre-audit | Added 10+ bridges |
| `src/pages/Kitchen.jsx` | 2 | Full rewrite with KDS features |
| `src/pages/Tables.jsx` | 3 | Merge/split/transfer/delete DB persistence |
| `src/pages/CashRegister.jsx` | 4 | No changes needed (pre-built) |
| `src/pages/Reports.jsx` | 5 | Real DB transaction loading |
| `src/pages/Dashboard.jsx` | 5 | Chart wired from placeholder |
| `src/pages/Sales.jsx` | 5 | Reports/Client button navigation |
