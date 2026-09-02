# BI Dashboard Flow — Audit Findings

Audit only (no code changes). Date: 2026-08-31.
Scope: verify the intended flow "select template → copy → fill → rename → push → per-client isolation".

## Intended flow and verdict

| Step | Intended | Status | Where |
|---|---|---|---|
| 1. Show only templates (not other clients' dashboards) | admin picks master template | ✅ Implemented | `admin/src/pages/AdminDashboardAssign.jsx` → `/bi/metabase/business-collections` + `/bi/metabase/collections/:id/dashboards?directOnly=true` |
| 2. Copy the template | deep copy into per-client collection | ✅ Implemented | `metabase-client.js` `duplicateDashboard` (`/api/dashboard/:id/copy`, `is_deep_copy: true`) |
| 3. Fill copy with client warehouse data | tenant-filter each card | ⚠️ Partial | `metabase-client.js` `bakeTenantFilter` — filter-level isolation; cards lacking a `tenantId` field are skipped silently |
| 4. Rename copy with client/business name | copy keeps client name | ❌ NOT implemented | `bi-provisioning.js:169` → `targetName = master.name` (keeps template name) |
| 5. Push copy to client interface | publish + assign | ✅ Implemented | `POST /bi/dashboards/:id/publish`, `/bi/assignments` |
| 6. Each client sees only their own dashboard | identity-scoped visibility | ✅ Implemented | `bi-dashboards.js` `assignedOnly` + `resolveClientId(req)` |

## Key observations

- **Step 1 (template-only listing):** `metabase-client.js:72-105` `listDashboards(..., directOnly=true)` returns only dashboards directly in the business collection and does NOT recurse into sub-collections (where per-client dashboards live), so client dashboards never appear in the template picker. Correct.
- **Step 3 (fill):** `provisionClientDashboard` (`bi-provisioning.js:192-209`) bakes `["=", [field tenantId…], tenantId]` into every copied card via `bakeTenantFilter` (`metabase-client.js:302-330`, MBQL `filter` AND-merge / native-SQL `WHERE "tenantId" = ...`). Only works where a `tenantId` field exists (`tenantFieldIdByTable`); otherwise the card is left untouched (counted only when changed). Data isolation is filter-level, not a physical data copy.
- **Step 4 (rename) — THE GAP:** The per-client **collection** is named after the resolved business name (`bi-provisioning.js:149` → `ensureCollection(resolvedName)`), but the **dashboard copy itself** is named `targetName = master.name` (`bi-provisioning.js:169`) and created with that template name (`duplicateDashboard` name param, `metabase-client.js:221-231`). The copy is never renamed with the client/business name. This is the one real divergence from the described flow.
  - `resolveBusinessName` (`bi-provisioning.js:78-86`) resolves business name as: linked request `businessName` → client `name` → `clientId`. That resolved name is only used for the collection, not the dashboard name.
- **Step 6 (isolation):** `bi-dashboards.js:35-78` — an authenticated client is always scoped to their own `clientId` (`resolveClientId` overrides any `clientId` param) with `assignedOnly=true` returning only ACTIVE assignments. Single-dashboard GET has an ownership guard (`bi-dashboards.js:124-128`). No cross-tenant leak found.
- **Legacy `AssignmentManager.jsx`** (assignments CRUD) lists all dashboards via `/bi/dashboards` without client scope — admin-side legacy UI, separate from the template flow; not a tenant leak.
- **Idempotency:** provisioning reuses an existing instance (persisted `metabaseDashboardId`, or same-named dashboard in the client collection) — no duplicate accumulates.

## Required action (not yet done)

Fix Step 4: set the copied dashboard name to the resolved business name (`businessName`) instead of `master.name` in `bi-provisioning.js` (both the create path and the same-name idempotent lookup), so each client's copy is unmistakably tied to that client/business.
