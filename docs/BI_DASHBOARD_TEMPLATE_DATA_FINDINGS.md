# BI Dashboard — "Template data not replaced by client data" Findings

Audit only (no code changes). Date: 2026-08-31.
Follow-up to `BI_DASHBOARD_FLOW_FINDINGS.md`.

## The user's report

The Metabase **master template** was itself built by assigning a database and running KPIs, so it is **pre-filled with data** (the shared warehouse / demo data). When a client dashboard is provisioned, the copied cards keep seeing **the same data — the client's data is not what shows up.** The system should either "empty" the template or re-point each client dashboard to show only that client's data.

## Architecture context (why this is a query-level problem)

- There is **one shared warehouse database** (`pos_system_warehouse`); all clients' rows live in the same tables.
- Tenant isolation is done via a **`tenantId` row/column** on each fact & dimension (not separate DBs). ETL writes each client's rows with `tenantId = clientId` (`etl-pipeline.js:675-681, 1066...`; upload attribution `bi-uploads.js:650-653`).
- The template's Metabase cards query that shared DB and its `source-table`s.
- Provisioning is supposed to re-scope each copied card to the client via `bakeTenantFilter` (`bi-provisioning.js:192-209`) — there is **no data move**; "filling with client data" is only achievable as a filter.
- So the client's data IS in the warehouse under their `tenantId`. If the client still sees the template/other data, the **tenant filter is not actually being applied** to the copied cards.

## Root causes (why the copied cards show unfiltered/template data)

1. **`bakeTenantFilter` silently no-ops → card shows ALL tenants (the template's data).** (`metabase-client.js:302-330`)
   - `tenantFieldIdByTable` (`metabase-client.js:280-292`) builds `{tableId → tenantFieldId}` only for tables that expose a column literally named `tenantId` (case-insensitive) in the **Metabase DB metadata**.
   - In the loop (`bi-provisioning.js:202-204`), `tenantFieldId = tableFieldMap[sourceTable]`.
   - If `tenantFieldId == null`, the MBQL branch at `metabase-client.js:307` requires `tenantFieldId != null` and is skipped → **the filter is never added**, `cardCount` stays 0, yet the dashboard is still created, published and pushed.
   - Net result: the copied card queries the shared `fact_*` table for **all rows of every tenant** → the user sees "the same data" as the template.

2. **Dimension-table cards can't be tenant-filtered.** `dim_time` has **no `tenantId` column** (`prisma-warehouse/schema.prisma:81-99`), and `bi-model-registry.js` lists `tenantId` only on `DimClient`. Any card sourcing/joining mostly through a tenant-less table (e.g. time-only KPIs) has no field to filter on → shared/global data.

3. **Native-SQL cards mis-injected.** `bakeTenantFilter` (`metabase-client.js:319-327`) injects `WHERE "tenantId" = '<v>'` after the **first `FROM`**. If the template card SQL uses JOINs/aliases (`FROM fact_sales fs LEFT JOIN ...`), the injection lands in the wrong place or the quoted column name doesn't match the DB case → filter is wrong or absent.

4. **Single-DB model means "empty the template" is not viable as-is.** The template physically cannot be emptied per client; the only correct fix is to guarantee every copied card is tenant-filtered. Currently that guarantee does not hold (causes 1–3).

## What is NOT the problem

- Per-client visibility/assignment (`assignedOnly`, `resolveClientId`) is correct — the leak is at the **data level inside the dashboard**, not which dashboard a client sees.
- TenantId mismatch: ETL writes `tenantId = clientId` and provisioning filters by `tenantId = dashboard.clientId` (same value), so the matching logic is consistent — the filter just isn't being applied where it matters.
- `is_deep_copy:true` creates genuinely independent cards, so sharing the template's card ids is not the issue.

## Investigation notes / next checks (no changes made)

- Confirm live on a provisioned dashboard how many of its copied cards actually received a tenant filter vs. were skipped (`cardCount` in the provision response reflects only applied filters).
- Confirm the warehouse DB's Metabase table metadata exposes `tenantId` on every fact (and which dims) so `tenantFieldIdByTable` can resolve them.
- Review template cards: are they MBQL or native SQL? Native multi-table cards are the highest-risk for cause 3.

## Required action (not yet done)

Make tenant filtering reliable so the client only ever sees their own rows:
- Don't silently skip cards where the tenant field can't be resolved — error/abort provisioning instead of pushing an unfiltered dashboard.
- Ensure a resolvable `tenantId` field exists on every sourced table (or that tenant-less tables like `dim_time` are never a card's primary source).
- Harden native-SQL injection to place the `WHERE "tenantId" = ...` correctly regardless of JOINs/aliases/case.
