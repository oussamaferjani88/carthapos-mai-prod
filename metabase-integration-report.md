# Metabase-CarthaPOS BI Integration Report

**Date**: June 30, 2026  
**Scope**: Migration from custom React/Recharts dashboard generation to Metabase Community Edition  
**Project**: CarthaPOS BI Module — PFE (Projet de Fin d'Études)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Analysis](#2-architecture-analysis)
3. [Current vs Target Architecture](#3-current-vs-target-architecture)
4. [Metabase CE Limitations & Mitigations](#4-metabase-ce-limitations--mitigations)
5. [Database Changes](#5-database-changes)
6. [API Changes](#6-api-changes)
7. [Metabase Configuration](#7-metabase-configuration)
8. [Dashboard Template Strategy](#8-dashboard-template-strategy)
9. [Dashboard Generation Workflow](#9-dashboard-generation-workflow)
10. [Dashboard Customization Workflow](#10-dashboard-customization-workflow)
11. [Client Embedding Strategy](#11-client-embedding-strategy)
12. [Security Analysis](#12-security-analysis)
13. [Implementation Plan](#13-implementation-plan)
14. [Risk Assessment](#14-risk-assessment)

---

## 1. Executive Summary

The current CarthaPOS BI module uses a fully custom stack: the ETL pipeline loads data into a PostgreSQL warehouse, a custom Node.js service (`warehouse-service.js`) queries that warehouse, and React/Recharts components render dashboards in both admin and client portals. The `dashboardConfig` JSON field on `BiDashboard` stores template-driven section definitions (KPI, line, bar, pie, table).

**Target**: Replace the React/Recharts rendering layer with **Metabase Community Edition** dashboards, while preserving the existing ETL pipeline, warehouse schema, business workflow (BiRequest → BiUpload → ETL → dashboard), and multi-tenant isolation.

**Key Insight**: Metabase CE cannot natively enforce row-level security (RLS) or provide authenticated embedded dashboards with tenant isolation. The recommended architecture uses **PostgreSQL schema-per-tenant** for data isolation and **Metabase API consumption** via a React wrapper for client display, creating a hybrid architecture that is both showable for a PFE project and architecturally sound.

---

## 2. Architecture Analysis

### Current Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   POS Export  │────▶│  BiUpload    │────▶│  ETL Pipeline │
│   (ZIP/CSV)   │     │  (validation) │     │  (warehouse)  │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Client View │◀────│  BiDashboard │◀────│  Warehouse   │
│  Recharts    │     │  JSON Config │     │  PostgreSQL  │
│  (React)     │     │  + templates │     │  (dim + fact)│
└──────────────┘     └──────────────┘     └──────────────┘
       ▲                      │
       │                      ▼
┌──────────────┐     ┌──────────────┐
│ Admin View   │◀────│  warehouse-  │
│  Recharts    │     │  service.js  │
│  (React)     │     │  (queries)   │
└──────────────┘     └──────────────┘
```

**Current data flow**:
1. Upload ZIP → validated by ETL → data loaded into warehouse (dim_*, fact_* tables)
2. Admin triggers dashboard generation → template applied → `dashboardConfig` JSON created
3. Client/admin opens dashboard → React calls `GET /bi/dashboards/:id/data` → `warehouse-service.js` queries warehouse → returns metrics → Recharts renders

### Target Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   POS Export  │────▶│  BiUpload    │────▶│  ETL Pipeline │
│   (ZIP/CSV)   │     │  (validation) │     │  (warehouse)  │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │  Warehouse   │
                                          │  PostgreSQL  │
                                          │  (dim + fact)│
                                          └──────┬───────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    │                            │                            │
                    ▼                            ▼                            ▼
          ┌─────────────────┐       ┌─────────────────────┐      ┌──────────────────────┐
          │  Per-Tenant     │       │  Metabase App DB   │      │  BiDashboard         │
          │  PG Views       │──────▶│  (metabase tables)  │      │  (stores MB refs)    │
          │  (schema_cli_X) │       │  Dashboards, Cards, │      │  + metabaseId        │
          └────────┬────────┘       │  Collections        │      │  + embedUrl            │
                   │                └──────────┬──────────┘      └──────────────────────┘
                   │                           │                           ▲
                   ▼                           ▼                           │
          ┌─────────────────┐       ┌─────────────────────┐               │
          │  Client Portal  │       │  Admin Portal       │────────────────┘
          │  MB API Proxy   │       │  MB Native UI       │
          │  + React Render │       │  (full Metabase)    │
          └─────────────────┘       └─────────────────────┘
```

**Target data flow**:
1. Upload ZIP → validated by ETL → data loaded into warehouse (unchanged)
2. Auto-create PostgreSQL **per-tenant views** in dedicated schema (e.g., `tenant_client123.sales_view`)
3. Admin configures Metabase data source pointing to these schemas
4. Dashboard generation creates BiDashboard record + Metabase dashboard via API
5. Admin customizes dashboard in Metabase native UI
6. Client views dashboard via Metabase public embedding OR API-proxied React rendering
7. On publish, dashboard becomes visible in client portal

---

## 3. Current vs Target: Component Mapping

| Component | Current | Target | Change Required |
|-----------|---------|--------|-----------------|
| ETL Pipeline | `etl-pipeline.js` | Keep | None |
| Warehouse Schema | dim_*, fact_* tables | Keep, add per-tenant views | Add views (non-destructive) |
| `warehouse-service.js` | Prisma queries | Keep for admin preview | Optional: add Metabase API client |
| Dashboard Templates | `bi-dashboard-templates.js` | Convert to Metabase dashboard definitions | Replace template strategy |
| Dashboard Generation | Async `generate-from-upload` | Create MB dashboard via API + store MB IDs | New code |
| `BiDashboard.dashboardConfig` | JSON with sections | Add `metabaseId`, `metabaseEmbedUrl`, keep config for fallback | Schema change |
| Admin Dashboard View | `AdminDashboardViewer.jsx` | Redirect to Metabase OR show embedded iframe | Rewrite viewer |
| Client Dashboard View | `BIDashboardViewer.tsx` | Show embedded Metabase dashboard | Rewrite viewer |
| Notifications | `BiNotification` | Keep | None |
| Workflow statuses | DRAFT → IN_PROGRESS → READY_FOR_REVIEW → PUBLISHED | Keep | None |

---

## 4. Metabase CE Limitations & Mitigations

### Critical Limitations

| Limitation | Impact | Mitigation for PFE |
|------------|--------|-------------------|
| **No authenticated embedding** | CE cannot embed dashboards with JWT/session auth. Only public (unauthenticated) embedding is available. | **Option A (Recommended)**: Use Metabase API to fetch card data and render in existing React components. This gives full auth control. |
| **No row-level security (sandboxing)** | CE cannot restrict which rows a user sees. All users connecting to a data source see all data. | **PostgreSQL schema-per-tenant**: Create a dedicated schema per client (e.g., `tenant_client_abc123`) with views that filter by `tenantId`. Each schema becomes a separate Metabase data source. |
| **No native multi-tenancy** | No built-in concept of tenants/organizations | See above — schema-per-tenant pattern |
| **No API key management** | CE API calls use session tokens (need login) | Use a single service account for programmatic access; store session token server-side |
| **No audit logging** | CE does not log user actions | Keep CarthaPOS-side audit via BiNotification/BiProcessingLog |
| **Limited REST API** | No create/update dashboard endpoints in CE (read-only API) | Dashboard creation requires Metabase UI OR direct DB manipulation of Metabase's internal tables |

### Metabase CE API Capabilities

| Capability | Available in CE? | Notes |
|------------|-----------------|-------|
| List dashboards | Yes | `GET /api/dashboard` |
| Get dashboard cards | Yes | `GET /api/dashboard/:id` |
| Execute card query | Yes | `POST /api/card/:id/query` |
| Get embed URL | Yes | `GET /api/dashboard/:id/public_link` (must enable public sharing) |
| Create dashboard | **No** | Only available in EE via API. Must create via UI or direct database insert. |
| Create card | **No** | Same limitation |
| Update card | **No** | Same limitation |

**Implication**: In CE, dashboards must be created either:
1. Manually by an admin in the Metabase UI
2. Programmatically by inserting records directly into the Metabase application database (`metabase` PostgreSQL database)
3. Using a third-party library like `metabase-admin` or `py-metabase`

**For this PFE project**, the recommended approach is:
- **Admin customization**: BI specialist uses Metabase native UI directly (full Metabase access)
- **Programmatic dashboard creation**: Server inserts into Metabase's internal tables (REPORT_DASHBOARD, REPORT_CARD, etc.) via the same PostgreSQL connection
- **Client viewing**: Use Metabase's public embed URL with short-lived tokens OR fetch card data via API and render in React

---

## 5. Database Changes

### 5.1 Prisma Schema Changes — BiDashboard Model

```prisma
model BiDashboard {
  id              String    @id @default(cuid())
  clientId        String @map("clientid")
  licenseId       String? @map("licenseid")
  uploadId        String? @map("uploadid")
  businessType    String @map("businesstype")
  name            String
  description    String?
  status          String    @default("DRAFT")
  dashboardType   String    @map("dashboardtype") @default("custom")
  dashboardConfig Json? @map("dashboardconfig")
  generationSteps Json? @map("generationsteps")
  createdBy       String? @map("createdby")
  assignedAt      DateTime? @map("assignedat")
  createdAt       DateTime  @map("createdat") @default(now())
  updatedAt       DateTime  @map("updatedat") @updatedAt

  // ─── NEW FIELDS for Metabase integration ──────────────────
  metabaseId        Int?      @map("metabaseid")        // Metabase internal dashboard ID
  metabaseEmbedUrl  String?   @map("metabaseembedurl")  // public embed URL
  metabaseEmbedToken String?  @map("metabaseembedtoken") // embed secret (if public sharing)
  metabaseCollectionId Int?   @map("metabasecollectionid") // Metabase collection for organization
  tenantSchemaName  String?   @map("tenantschemaname")   // e.g. "tenant_client_abc123"
  // ─────────────────────────────────────────────────────────

  client  Client      @relation(fields: [clientId], references: [id], onDelete: Cascade)
  license License?    @relation(fields: [licenseId], references: [id])
  upload  BiUpload?   @relation(fields: [uploadId], references: [id])
  notifications BiNotification[]

  @@map("bi_dashboards")
}
```

### 5.2 New Model: BiMetabaseSync

```prisma
model BiMetabaseSync {
  id            String   @id @default(cuid())
  dashboardId   String   @map("dashboardid")
  metabaseId    Int      @map("metabaseid")
  syncType      String   @map("synctype")     // "CREATED" | "UPDATED" | "PUBLISHED"
  syncStatus    String   @map("syncstatus")   // "PENDING" | "SUCCESS" | "FAILED"
  errorMessage  String?  @map("errormessage")
  metabaseData  Json?    @map("metabasedata") // snapshot of MB dashboard config
  createdAt     DateTime @map("createdat") @default(now())

  dashboard BiDashboard @relation(fields: [dashboardId], references: [id], onDelete: Cascade)

  @@map("bi_metabase_syncs")
}
```

### 5.3 New Model: BiTenantSchema

```prisma
model BiTenantSchema {
  id            String   @id @default(cuid())
  clientId      String   @map("clientid")
  schemaName    String   @map("schemaname")    // e.g. "tenant_client_abc123"
  description   String?  @map("description")
  status        String   @map("status")        // "ACTIVE" | "PENDING" | "FAILED"
  lastSyncAt    DateTime? @map("lastsyncat")
  createdAt     DateTime @map("createdat") @default(now())

  @@unique([clientId])
  @@map("bi_tenant_schemas")
}
```

### 5.4 PostgreSQL Views — Per-Tenant Schema Pattern

For each client, create a dedicated PostgreSQL schema with views:

```sql
-- Create schema for tenant
CREATE SCHEMA IF NOT EXISTS tenant_client_abc123;

-- Create views that filter by tenantId
CREATE OR REPLACE VIEW tenant_client_abc123.v_sales AS
  SELECT * FROM public.fact_sale WHERE "tenantId" = 'abc123';

CREATE OR REPLACE VIEW tenant_client_abc123.v_inventory AS
  SELECT * FROM public.fact_inventory WHERE "tenantId" = 'abc123';

CREATE OR REPLACE VIEW tenant_client_abc123.v_appointments AS
  SELECT * FROM public.fact_appointment WHERE "tenantId" = 'abc123';

CREATE OR REPLACE VIEW tenant_client_abc123.v_kitchen_orders AS
  SELECT * FROM public.fact_kitchen_order WHERE "tenantId" = 'abc123';

-- Dimension views (same data, but scoped for consistency)
CREATE OR REPLACE VIEW tenant_client_abc123.v_products AS
  SELECT * FROM public.dim_product WHERE "tenantId" = 'abc123';

CREATE OR REPLACE VIEW tenant_client_abc123.v_suppliers AS
  SELECT * FROM public.dim_supplier WHERE "tenantId" = 'abc123';

CREATE OR REPLACE VIEW tenant_client_abc123.v_time AS
  SELECT * FROM public.dim_time;

CREATE OR REPLACE VIEW tenant_client_abc123.v_client AS
  SELECT * FROM public.dim_client WHERE "tenantId" = 'abc123';
```

Then, in Metabase, add each schema as a **separate database connection** (same host/port/credentials but different `search_path` or schema filter). This is the only reliable way to enforce tenant isolation in CE.

### 5.5 Indexes

No new indexes required beyond the existing `@@index([tenantId])` already added.

---

## 6. API Changes

### 6.1 New Endpoints

```
POST   /api/bi/metabase/sync          — Sync a BiDashboard with Metabase
POST   /api/bi/metabase/create-dashboard  — Create a dashboard in Metabase (via direct DB insert)
POST   /api/bi/metabase/create-card       — Create a card (chart) in an MB dashboard
POST   /api/bi/metabase/refresh-embed     — Refresh the public embed URL for a dashboard
GET    /api/bi/metabase/dashboard/:id     — Fetch dashboard data from Metabase API (proxy)
GET    /api/bi/metabase/card/:id/query    — Execute a Metabase card query (proxy)
POST   /api/bi/tenant-schemas/create      — Create per-tenant PG schema + views
POST   /api/bi/tenant-schemas/refresh     — Refresh tenant views after new ETL run
```

### 6.2 Modified Endpoints

```
POST   /api/bi/dashboards/generate-from-upload
  — After template selection, also:
    - Create per-tenant schema if not exists
    - Create Metabase dashboard via direct DB insert
    - Create Metabase cards via direct DB insert
    - Store metabaseId, metabaseEmbedUrl on BiDashboard
    - Create BiMetabaseSync record

PATCH  /api/bi/dashboards/:id
  - On status → PUBLISHED: also enable public sharing in Metabase
  - Generate/refresh public embed URL
```

### 6.3 Endpoint Specifications

#### POST /api/bi/metabase/create-dashboard

```
Request:
{
  "biDashboardId": "abc123",
  "name": "Restaurant Analytics",
  "description": "Revenue, peak hours, top products",
  "collectionId": 1,           // Metabase collection ID (optional)
  "parameters": []              // Dashboard-level filter params
}

Response 201:
{
  "success": true,
  "data": {
    "metabaseId": 42,
    "dashboardUrl": "/dashboard/42-restaurant-analytics"
  }
}
```

Implementation approach: Insert directly into Metabase's internal PostgreSQL tables:
```sql
INSERT INTO metabase.public.report_dashboard (
  name, description, created_at, updated_at, creator_id, parameters, collection_id
) VALUES (
  'Restaurant Analytics - Client ABC',
  'Revenue, peak hours, top products',
  NOW(), NOW(),
  1,  -- Metabase admin user ID
  '[]',  -- JSON parameters
  1     -- Collection ID
)
RETURNING id;
```

#### POST /api/bi/metabase/create-card

```
Request:
{
  "dashboardId": 42,            // Metabase dashboard ID
  "biDashboardId": "abc123",    // CarthaPOS dashboard ID
  "name": "Revenue Over Time",
  "display": "line",            // line, bar, pie, table, scalar, etc.
  "datasetQuery": {
    "database": 1,              // Metabase DB ID for tenant schema
    "type": "query",
    "query": {
      "source-table": "v_sales",
      "aggregation": [["sum", ["field", "total", null]]],
      "breakout": [["field", "created_at", {"temporal-unit": "day"}]]
    }
  },
  "visualizationSettings": {
    "graph.dimensions": ["created_at"],
    "graph.metrics": ["total"]
  }
}

Response 201:
{
  "success": true,
  "data": {
    "metabaseCardId": 128,
    "dashboardTabId": 1
  }
}
```

#### POST /api/bi/metabase/sync

```
Request:
{
  "biDashboardId": "abc123",
  "metabaseId": 42,
  "syncType": "UPDATED"   // CREATED | UPDATED | PUBLISHED
}

Response 200:
{
  "success": true,
  "data": {
    "syncId": "sync_001",
    "metabaseData": { ... }  // snapshot from Metabase
  }
}
```

### 6.4 Metabase API Proxy

Create a new service `metabase-client.js` that:

```javascript
class MetabaseClient {
  constructor() {
    this.baseUrl = process.env.MB_API_URL || 'http://localhost:3000/api';
    this.session = null;  // cached session token
  }

  async login() {
    // Use service account credentials stored in .env
    const res = await fetch(`${this.baseUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.MB_SERVICE_USER,
        password: process.env.MB_SERVICE_PASS,
      }),
    });
    const data = await res.json();
    this.session = data.id;
  }

  async request(method, path, body = null) {
    if (!this.session) await this.login();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Metabase-Session': this.session,
      },
      body: body ? JSON.stringify(body) : null,
    });
    if (res.status === 401) {
      // Session expired — re-login and retry
      await this.login();
      return this.request(method, path, body);
    }
    return res.json();
  }

  async listDashboards() { return this.request('GET', '/dashboard'); }
  async getDashboard(id) { return this.request('GET', `/dashboard/${id}`); }
  async executeCard(cardId, params = {}) {
    return this.request('POST', `/card/${cardId}/query`, params);
  }
  async getPublicEmbedUrl(dashboardId) {
    return this.request('POST', `/dashboard/${dashboardId}/public_link`);
  }
  async createDashboard(dbInsert) {
    // CE limitation — fall through to direct DB insert
    return this._directDbCreateDashboard(dbInsert);
  }
}
```

---

## 7. Metabase Configuration

### 7.1 Create Read-Only Database User

```sql
-- Create a dedicated read-only role
CREATE ROLE metabase_reader WITH LOGIN PASSWORD 'metabase_ro_pass_2026' NOINHERIT;

-- Grant usage on all relevant schemas
GRANT USAGE ON SCHEMA public TO metabase_reader;
GRANT USAGE ON SCHEMA tenant_client_abc123 TO metabase_reader; -- repeat for each tenant

-- Grant SELECT on all warehouse tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA tenant_client_abc123 TO metabase_reader;

-- Ensure future tables also get SELECT grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_client_abc123 GRANT SELECT ON TABLES TO metabase_reader;
```

**Important**: Do NOT grant write access (INSERT, UPDATE, DELETE) on any `public` tables. The `metabase` user should only read from the warehouse — Metabase's own app data goes into its own `metabase` database.

### 7.2 Metabase Application Database

The `start-metabase.bat` already configures:
```
MB_DB_TYPE=postgres
MB_DB_DBNAME=metabase
MB_DB_HOST=localhost
MB_DB_PORT=5432
MB_DB_USER=postgres
MB_DB_PASS=oussama
```

This is correct — Metabase's own internal tables (users, dashboards, cards, collections) live in the `metabase` database, while the warehouse data lives in `pos_system`.

### 7.3 Add Warehouse as Metabase Data Source

For each tenant schema, add a separate database connection in Metabase Admin Panel:

1. **Settings → Admin → Databases → Add Database**
2. **Name**: `Warehouse - Client ABC`
3. **Engine**: PostgreSQL
4. **Host**: localhost
5. **Port**: 5432
6. **Database name**: pos_system
7. **Username**: metabase_reader
8. **Password**: (as set above)
9. **Use a secure connection**: No (dev only)
10. **Schema filters**: `tenant_client_abc123` (restrict to this tenant's schema)

### 7.4 Programmatic Data Source Addition

If the number of tenants grows, add data sources via Metabase API:

```javascript
// POST /api/database
{
  "engine": "postgres",
  "name": "Warehouse - Client ABC",
  "details": {
    "host": "localhost",
    "port": 5432,
    "dbname": "pos_system",
    "user": "metabase_reader",
    "password": "metabase_ro_pass_2026",
    "schema-filters-type": "inclusion",
    "schema-filters-patterns": ["tenant_client_abc123"],
    "ssl": false,
    "tunnel-enabled": false,
    "advanced-options": true
  },
  "is_full_sync": true
}
```

### 7.5 Environment Variables

Add to `backend/.env`:
```
MB_API_URL=http://localhost:3000/api
MB_SERVICE_USER=admin@carthapos.com
MB_SERVICE_PASS=metabase_admin_pass_2026
MB_DASHBOARD_COLLECTION_ID=1
```

---

## 8. Dashboard Template Strategy

### 8.1 Current Template Shortcomings

The current `bi-dashboard-templates.js` defines templates as:
```javascript
sections: [
  { key: 'kpiSummary', type: 'kpi', title: 'KPIs', span: 12 },
  { key: 'revenue', type: 'line', title: 'Revenue (30 days)', span: 6 },
  ...
]
```

These are **layout hints** that the React viewer interprets. Metabase needs actual query definitions.

### 8.2 New Template Structure

Convert templates to Metabase-native definitions:

```javascript
// bi-dashboard-templates.js — NEW VERSION
const METABASE_TEMPLATES = {
  restaurant: {
    name: 'Restaurant Analytics',
    businessType: 'restaurant',
    description: 'Revenue, peak hours, top products, kitchen performance, table turnover',
    collectionName: 'Restaurant Dashboards',
    cards: [
      {
        name: 'Revenue (30 days)',
        display: 'line',
        datasetQuery: {
          database: 0,  // placeholder — resolved at creation time
          type: 'query',
          query: {
            sourceTable: 'v_sales',
            aggregation: [['sum', ['field', 'total', null]]],
            breakout: [['field', 'created_at', { 'temporal-unit': 'day' }]],
          },
        },
        visualizationSettings: {
          'graph.dimensions': ['created_at'],
          'graph.metrics': ['total'],
          'graph.series_order': [],
          'graph.show_values': true,
        },
        size: { row: 0, col: 0, sizeX: 6, sizeY: 4 },
      },
      {
        name: 'Total Revenue KPI',
        display: 'scalar',
        datasetQuery: {
          database: 0,
          type: 'query',
          query: {
            sourceTable: 'v_sales',
            aggregation: [['sum', ['field', 'total', null]]],
          },
        },
        visualizationSettings: {
          'scalar.format': 'currency',
          'scalar.prefix': '€',
        },
        size: { row: 0, col: 6, sizeX: 3, sizeY: 2 },
      },
      {
        name: 'Top Products',
        display: 'bar',
        datasetQuery: {
          database: 0,
          type: 'query',
          query: {
            sourceTable: 'v_inventory',
            aggregation: [['sum', ['field', 'times_sold', null]]],
            breakout: [['field', 'product_name', null]],
            limit: 10,
          },
        },
        visualizationSettings: {
          'graph.dimensions': ['product_name'],
          'graph.metrics': ['times_sold'],
        },
        size: { row: 2, col: 0, sizeX: 6, sizeY: 4 },
      },
      // ... more cards
    ],
    dashboardFilters: [
      {
        name: 'Date Range',
        slug: 'date_range',
        type: 'date/all-options',
        default: null,
      },
    ],
  },
  // ... cafe, retail, pharmacy, salon
};
```

### 8.3 Card Types Mapping

| Current Config Type | Metabase Display Type | Notes |
|--------------------|----------------------|-------|
| kpi | `scalar` | Single value display |
| line | `line` | Time series |
| bar | `bar` | Categorical comparison |
| pie | `pie` | Distribution |
| table | `table` | Raw data |
| area | `area` | Stacked area (new) |
| combo | `combo` | Line + bar combined (new) |

### 8.4 Template Resolution at Generation Time

When generating a dashboard from an upload:

1. Detect `businessType` from upload
2. Select matching template
3. **Resolve `database` placeholder**: Replace `0` with the actual Metabase database ID for the tenant's schema
4. **Resolve `sourceTable` placeholders**: Convert view names (e.g., `v_sales`) to Metabase table IDs (requires a lookup query on Metabase's internal `metabase_table` table)
5. Insert dashboard + cards directly into Metabase's internal tables
6. Store `metabaseId` on BiDashboard

---

## 9. Dashboard Generation Workflow

### 9.1 Modified generate-from-upload Flow

```
POST /api/bi/dashboards/generate-from-upload
  │
  ├── 1. Validate upload (COMPLETED) + request (APPROVED) [unchanged]
  │
  ├── 2. Check no existing dashboard [unchanged]
  │
  ├── 3. Create BiDashboard with status=GENERATING [unchanged]
  │
  └── Background (setImmediate):
       │
       ├── 4. Detect businessType → select template [unchanged]
       │
       ├── 5. Create/verify tenant PG schema + views [NEW]
       │     └── INSERT INTO bi_tenant_schemas
       │
       ├── 6. Connect to Metabase app database [NEW]
       │
       ├── 7. Create Metabase dashboard (direct DB insert) [NEW]
       │     └── INSERT INTO report_dashboard
       │
       ├── 8. Create Metabase cards (direct DB inserts) [NEW]
       │     └── INSERT INTO report_card (for each template card)
       │
       ├── 9. Map cards to dashboard tabs [NEW]
       │     └── INSERT INTO report_dashboardcard
       │
       ├── 10. Enable public sharing [NEW]
       │     └── POST /api/dashboard/:id/public_link
       │
       ├── 11. Store Metabase IDs on BiDashboard [NEW]
       │     └── UPDATE bi_dashboards SET metabaseId=..., metabaseEmbedUrl=...
       │
       ├── 12. Create BiMetabaseSync record [NEW]
       │
       ├── 13. Set status=DRAFT [unchanged]
       │
       └── 14. Create notification [unchanged]
```

### 9.2 Direct Metabase DB Insert

Since CE does not expose create-dashboard/card APIs, we insert directly into the `metabase` database:

```javascript
const mbPrisma = new PrismaClient({
  datasources: { db: { url: process.env.METABASE_DATABASE_URL } },
});

async function createMetabaseDashboard(biDashboardId, template, tenantSchemaName) {
  const mbDbId = await resolveMetabaseDatabaseId(tenantSchemaName);

  // 1. Create dashboard
  const [dashboard] = await mbPrisma.$queryRawUnsafe(`
    INSERT INTO report_dashboard (name, description, created_at, updated_at, creator_id, parameters)
    VALUES ($1, $2, NOW(), NOW(), 1, '[]')
    RETURNING id
  `, template.name, template.description);

  // 2. Create cards
  for (const cardDef of template.cards) {
    const datasetQuery = resolveQuery(cardDef.datasetQuery, mbDbId);

    const [card] = await mbPrisma.$queryRawUnsafe(`
      INSERT INTO report_card (
        name, description, display, dataset_query, visualization_settings,
        created_at, updated_at, database_id, creator_id, collection_id
      ) VALUES (
        $1, '', $2, $3::jsonb, $4::jsonb,
        NOW(), NOW(), $5, 1, NULL
      )
      RETURNING id
    `, cardDef.name, cardDef.display,
       JSON.stringify(datasetQuery),
       JSON.stringify(cardDef.visualizationSettings),
       mbDbId
    );

    // 3. Link card to dashboard
    await mbPrisma.$queryRawUnsafe(`
      INSERT INTO report_dashboardcard (
        dashboard_id, card_id, row, col, sizeX, sizeY,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), NOW()
      )
    `, dashboard.id, card.id,
       cardDef.size.row, cardDef.size.col,
       cardDef.size.sizeX, cardDef.size.sizeY);
  }

  return { metabaseDashboardId: dashboard.id };
}

async function resolveMetabaseDatabaseId(tenantSchemaName) {
  // Query Metabase's internal database table to find the DB ID
  // that matches the tenant schema
  const [record] = await mbPrisma.$queryRawUnsafe(`
    SELECT id FROM metabase_database
    WHERE details->>'dbname' = 'pos_system'
    AND details->>'schema-filters-patterns' @> $1::jsonb
  `, JSON.stringify([tenantSchemaName]));

  if (!record) {
    // Auto-register the database in Metabase if not found
    return await registerTenantDatabase(tenantSchemaName);
  }

  return record.id;
}
```

### 9.3 Enable Public Sharing

```javascript
async function enablePublicSharing(dashboardId) {
  const client = new MetabaseClient();
  await client.login();
  
  try {
    // First check if already shared
    const dash = await client.request('GET', `/dashboard/${dashboardId}`);
    if (dash.public_uuid) {
      return { publicUuid: dash.public_uuid };
    }

    // Enable public sharing
    const result = await client.request('POST', `/dashboard/${dashboardId}/public_link`);
    return { publicUuid: result.uuid };
  } catch (err) {
    throw new Error(`Failed to enable public sharing: ${err.message}`);
  }
}
```

---

## 10. Dashboard Customization Workflow

### 10.1 Admin Customization Flow

```
         ┌──────────────────────────────────┐
         │   Dashboard generated (DRAFT)     │
         │   Metabase dashboard created      │
         └──────────────┬───────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │  BI Specialist opens Metabase    │
         │  URL directly                     │
         │  (linked from admin portal)      │
         └──────────────┬───────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │  Specialist customizes:          │
         │  • Adds/removes cards            │
         │  • Changes chart types           │
         │  • Adds filters                  │
         │  • Rearranges layout             │
         │  • Renames sections              │
         └──────────────┬───────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │  Specialist clicks "Sync" in     │
         │  CarthaPOS admin panel           │
         └──────────────┬───────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │  Server fetches Metabase config  │
         │  via API:                        │
         │  GET /api/dashboard/:id          │
         │  Stores in BiMetabaseSync        │
         └──────────────┬───────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │  BiDashboard status progresses   │
         │  DRAFT → IN_PROGRESS →           │
         │  READY_FOR_REVIEW → PUBLISHED    │
         └──────────────────────────────────┘
```

### 10.2 Sync Customization from Metabase

```javascript
// POST /api/bi/metabase/sync-customizations
async function syncMetabaseCustomizations(biDashboardId) {
  const dashboard = await prisma.biDashboard.findUnique({
    where: { id: biDashboardId },
    select: { metabaseId: true },
  });

  // Fetch dashboard + cards from Metabase API
  const client = new MetabaseClient();
  await client.login();

  const mbDashboard = await client.request('GET', `/dashboard/${dashboard.metabaseId}`);

  // Fetch each card's full definition
  const cards = await Promise.all(
    mbDashboard.ordered_cards.map(card =>
      client.request('GET', `/card/${card.card_id}`)
    )
  );

  // Store snapshot in BiMetabaseSync
  await prisma.biMetabaseSync.create({
    data: {
      dashboardId: biDashboardId,
      metabaseId: dashboard.metabaseId,
      syncType: 'UPDATED',
      syncStatus: 'SUCCESS',
      metabaseData: {
        dashboard: mbDashboard,
        cards,
      },
    },
  });

  // Optionally update the dashboardConfig for React fallback
  const reactConfig = convertMetabaseToReactConfig(mbDashboard, cards);
  if (reactConfig) {
    await prisma.biDashboard.update({
      where: { id: biDashboardId },
      data: { dashboardConfig: reactConfig },
    });
  }

  return { synced: true, cards: cards.length };
}
```

### 10.3 Admin Portal — Metabase Link Button

In `AdminBIDashboardManager.jsx`, add a "Open in Metabase" button:

```jsx
{dashboard.metabaseId && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => window.open(
      `http://localhost:3000/dashboard/${dashboard.metabaseId}`,
      '_blank'
    )}
  >
    <ExternalLink className="h-3 w-3 mr-1" /> Open in Metabase
  </Button>
)}
```

Also add a "Sync Customizations" button that calls the sync endpoint.

---

## 11. Client Embedding Strategy

### 11.1 Analysis of Metabase CE Embedding Options

| Option | Auth Required? | Tenant Isolation | UX Quality | Effort | Viable for PFE? |
|--------|---------------|-----------------|-----------|-------|----------------|
| **Public embed (iframe)** | None (anonymous) | None (all data) | Good | Low | ❌ (no security) |
| **Signed JWT embed** | EE-only | Via token | Best | N/A | ❌ (CE limitation) |
| **API proxy + React** | Full CarthaPOS auth | Via query params | Best | High | ✅ **Recommended** |
| **Direct Metabase login** | Separate MB auth | Via schema filter | Poor | Medium | ❌ (bad UX) |

### 11.2 Recommended: API Proxy + React Rendering

**Architecture**:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Client      │────▶│  CarthaPOS   │────▶│  Metabase    │
│  Browser     │     │  API Proxy   │     │  API         │
│  (React)     │◀────│  (backend)   │◀────│  (localhost) │
└──────────────┘     └──────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │  Warehouse   │
                    │  (direct)    │
                    └──────────────┘
```

**Flow**:

1. Client navigates to `/dashboard/bi-dashboard/:id` in CarthaPOS
2. `BIDashboardViewer.tsx` loads the BiDashboard record
3. If the dashboard has `metabaseId` and the user is authenticated:
   - **Option A (Metabase API)**: Server calls Metabase API to execute each card's query, returns JSON data to React → renders using existing Recharts components
   - **Option B (Hybrid)**: Keep the existing `warehouse-service.js` approach but render data in a Metabase-like layout

4. **For the PFE deliverable**, implement **Option A**:

```javascript
// GET /api/bi/dashboards/:id/client-data — new endpoint
router.get('/:id/client-data', async (req, res) => {
  try {
    const dashboard = await prisma.biDashboard.findUnique({
      where: { id: req.params.id },
    });

    if (!dashboard || dashboard.status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Dashboard not found or not published' });
    }

    const metabaseClient = new MetabaseClient();
    await metabaseClient.login();

    // Fetch Metabase dashboard definition
    const mbDashboard = await metabaseClient.request(
      'GET', `/dashboard/${dashboard.metabaseId}`
    );

    // Execute each card's query
    const cardData = await Promise.all(
      mbDashboard.ordered_cards.map(async (cardRef) => {
        const result = await metabaseClient.request(
          'POST', `/card/${cardRef.card_id}/query`,
          { parameters: req.query.parameters || [] }
        );
        return {
          id: cardRef.card_id,
          name: cardRef.card.name,
          display: cardRef.card.display,
          data: result.data,
          cols: result.data ? result.data.cols : [],
          rows: result.data ? result.data.rows : [],
        };
      })
    );

    res.json({
      success: true,
      data: {
        dashboard: {
          id: dashboard.id,
          name: dashboard.name,
          description: dashboard.description,
          businessType: dashboard.businessType,
        },
        cards: cardData,
        layout: mbDashboard.ordered_cards.map(c => ({
          cardId: c.card_id,
          row: c.row,
          col: c.col,
          sizeX: c.sizeX,
          sizeY: c.sizeY,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

5. **Client-side rendering**: Create a new `MetabaseDashboardViewer.tsx` that:
   - Fetches the card data from the proxy endpoint
   - Renders each card using existing chart components (line, bar, pie, table, scalar)
   - Applies the Metabase layout (row, col, sizeX, sizeY)
   - Uses a CSS grid for placement matching Metabase's layout

```tsx
// MetabaseDashboardViewer.tsx — PFE-ready component
function MetabaseDashboardViewer({ dashboardId }: { dashboardId: string }) {
  const [data, setData] = useState<ClientDashboardData | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/bi/dashboards/${dashboardId}/client-data`)
      .then(r => r.json())
      .then(json => setData(json.data));
  }, [dashboardId]);

  if (!data) return <Loading />;

  // Build grid from layout
  const maxRow = Math.max(...data.layout.map(l => l.row + l.sizeY));
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gridAutoRows: '80px',
    gap: '16px',
  };

  return (
    <div style={gridStyle}>
      {data.cards.map(card => {
        const layout = data.layout.find(l => l.cardId === card.id);
        const style = {
          gridRow: `${layout.row + 1} / span ${layout.sizeY}`,
          gridColumn: `${layout.col + 1} / span ${layout.sizeX}`,
        };
        return (
          <div key={card.id} style={style}>
            <Card>
              <CardHeader><CardTitle>{card.name}</CardTitle></CardHeader>
              <CardContent>
                <MetabaseCardRenderer card={card} />
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
```

### 11.3 Alternative: Public Embedding (for demo purposes only)

For a quick demo, enable public embedding in Metabase:

1. **Admin Settings → Public Sharing → Enable**
2. The server generates a public UUID for each dashboard
3. Embed in iframe:

```tsx
<iframe
  src={`http://localhost:3000/public/dashboard/${publicUuid}`}
  width="100%"
  height="800"
  frameBorder="0"
/>
```

**Security warning**: Anyone with the UUID can view the dashboard. This is acceptable only for demo/development.

### 11.4 Fallback: Keep React Rendering

If the Metabase API approach proves too complex, keep the current React/Recharts rendering as a **fallback**. The `dashboardConfig` JSON is still populated with the template definition. The system degrades gracefully — if `metabaseId` is null, fall back to the existing `warehouse-service.js` query approach.

---

## 12. Security Analysis

### 12.1 Threat Model

| Threat | Risk | Mitigation |
|--------|------|-----------|
| Client sees another client's data | **High** | Schema-per-tenant in PostgreSQL |
| Unauthorized dashboard access | **High** | All client access goes through CarthaPOS auth proxy |
| Metabase API exposed to internet | **Medium** | Proxy through CarthaPOS backend (no direct MB access) |
| Metabase service account compromised | **Medium** | Use read-only database user; restrict service account permissions |
| Public embed URL leaked | **High** | Do NOT use public embedding for production; use API proxy instead |
| Tenant schema not properly isolated | **High** | Automated tests after each view creation verify row counts match expected tenant |

### 12.2 Isolation Architecture

```
                  ┌──────────────────────────────┐
                  │      PostgreSQL Database       │
                  │         pos_system             │
                  │                                │
                  │  ┌─────────────────────────┐  │
                  │  │  public schema           │  │
                  │  │  dim_*, fact_*, bi_*     │  │
                  │  │  (all tenants interleaved)│  │
                  │  └─────────────────────────┘  │
                  │                                │
                  │  ┌─────────────────────────┐  │
                  │  │  tenant_client_abc      │  │
                  │  │  v_sales (WHERE tenantId=│  │
                  │  │    = 'abc')             │  │
                  │  │  v_inventory            │  │
                  │  │  ...                    │  │
                  │  └─────────────────────────┘  │
                  │                                │
                  │  ┌─────────────────────────┐  │
                  │  │  tenant_client_xyz      │  │
                  │  │  v_sales (WHERE tenantId=│  │
                  │  │    = 'xyz')             │  │
                  │  │  v_inventory            │  │
                  │  │  ...                    │  │
                  │  └─────────────────────────┘  │
                  └──────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │ Metabase     │   │ Metabase     │   │ CarthaPOS    │
   │ DB Source #1 │   │ DB Source #2 │   │ Backend      │
   │ Schema:      │   │ Schema:      │   │ (direct SQL) │
   │ client_abc   │   │ client_xyz   │   │ with auth    │
   └──────────────┘   └──────────────┘   └──────────────┘
```

### 12.3 Recommended Security Checklist

- [x] Read-only database user for Metabase
- [ ] Environment variables for all secrets (MB password, service user)
- [ ] Metabase bound to localhost only (not exposed to network)
- [ ] No public embedding in production
- [ ] CarthaPOS API proxy validates user session before proxying MB requests
- [ ] Tenant schema views verified with count queries during generation
- [ ] Metabase service account stored in backend `.env` (not committed)
- [ ] JWT auth re-enabled before production (currently disabled for dev)

---

## 13. Implementation Plan

### Phase 1: Foundation (Week 1)

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 1.1 | Add Metabase fields to Prisma schema | `schema.prisma` | Small |
| 1.2 | Add BiMetabaseSync + BiTenantSchema models | `schema.prisma` | Small |
| 1.3 | Run migration (or raw SQL if `prisma db push` fails) | SQL | Small |
| 1.4 | Create `metabase-client.js` service | `backend/services/` | Medium |
| 1.5 | Add Metabase env vars to `.env` | `backend/.env` | Small |

### Phase 2: Tenant Schema Management (Week 1-2)

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 2.1 | Create `POST /api/bi/tenant-schemas/create` endpoint | `backend/routes/bi-metabase.js` | Medium |
| 2.2 | Implement view creation SQL for all 8 warehouse tables | `backend/services/tenant-schema.js` | Medium |
| 2.3 | Add view refresh after ETL completes | `etl-pipeline.js` | Small |

### Phase 3: Metabase Dashboard Creation (Week 2-3)

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 3.1 | Implement direct DB insert functions for dashboards + cards | `backend/services/metabase-db-sync.js` | High |
| 3.2 | Convert templates to Metabase card definitions | `bi-dashboard-templates.js` | High |
| 3.3 | Modify `generate-from-upload` to create MB dashboards | `bi-dashboards.js` | High |
| 3.4 | Add public sharing enablement | `metabase-client.js` | Medium |
| 3.5 | Store metabaseId + embed URL on BiDashboard | `bi-dashboards.js` | Small |

### Phase 4: Admin Customization (Week 3)

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 4.1 | Add "Open in Metabase" button to AdminBIDashboardManager | `AdminBIDashboardManager.jsx` | Small |
| 4.2 | Add "Sync Customizations" button + endpoint | Both | Medium |
| 4.3 | Add Metabase link to dashboard details modal | `AdminBIDashboardManager.jsx` | Small |
| 4.4 | Update status workflow buttons | `AdminBIDashboardManager.jsx` | Small |

### Phase 5: Client Delivery (Week 3-4)

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 5.1 | Create `GET /api/bi/dashboards/:id/client-data` proxy endpoint | `bi-dashboards.js` | Medium |
| 5.2 | Create `MetabaseDashboardViewer.tsx` React component | `frontend/src/pages/` | High |
| 5.3 | Update client route to use new viewer | `App.tsx` | Small |
| 5.4 | Add fallback to legacy React rendering | `BIDashboardViewer.tsx` | Medium |

### Phase 6: Polish & Docs (Week 4)

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 6.1 | Error handling for Metabase API failures | Various | Medium |
| 6.2 | Admin user guide for Metabase workflow | Documentation | Medium |
| 6.3 | Update this report with implementation details | — | Small |

### Effort Summary

| Phase | Small | Medium | High | Total (person-days) |
|-------|-------|--------|------|-------------------|
| 1 | 4 | 1 | 0 | 3 |
| 2 | 1 | 2 | 0 | 3 |
| 3 | 1 | 1 | 3 | 7 |
| 4 | 3 | 1 | 0 | 2 |
| 5 | 1 | 1 | 1 | 4 |
| 6 | 1 | 1 | 0 | 2 |

**Total**: ~21 person-days (4 weeks for single developer)

---

## 14. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|-----------|
| Metabase CE API limitations block programmatic creation | **Certain** | High | Use direct DB inserts as primary approach; document in report |
| Prisma migration fails (`zone.tab` error) | **High** | Medium | Use raw SQL as established practice |
| Schema-per-tenant pattern does not scale | **Medium** | Medium | Acceptable for PFE; production would need RLS in EE |
| Metabase format changes between CE versions | **Low** | Medium | Pin Metabase version; document internal table schema |
| Public embed URL leaks | **Low** | High | Do not use public embed; use API proxy |
| ETL + Metabase sync timing race conditions | **Medium** | Medium | Views are updated at generation time, not at ETL time |
| Client MetabaseDashboardViewer too complex | **Medium** | Medium | Keep legacy React rendering as fallback |
| Performance: many concurrent card queries | **Low** | Medium | Cache Metabase responses server-side (10 min TTL) |

---

## Appendix A: Metabase Internal Table Schema (CE v1.50+)

For direct DB inserts into the `metabase` database:

```sql
-- Core tables needed for dashboard creation
report_dashboard         — Dashboards
report_card             — Individual charts/queries
report_dashboardcard    — Mapping cards to dashboards (with position)
collection              — Collections for organization
metabase_database       — Database connections
metabase_table          — Tables within each database
metabase_field          — Fields within each table
core_user               — Metabase users
permissions_group       — Permission groups
permissions_group_membership — User-group membership
```

**Key relationships**:
- `report_dashboardcard.dashboard_id` → `report_dashboard.id`
- `report_dashboardcard.card_id` → `report_card.id`
- `report_card.database_id` → `metabase_database.id`
- `report_card.table_id` → `metabase_table.id` (optional)
- `report_card.collection_id` → `collection.id`

## Appendix B: React Component Migration Guide

| Existing Component | Action | New Component |
|-------------------|--------|---------------|
| `BIDashboardViewer.tsx` | **Extend** | Add Metabase card rendering + fallback to legacy |
| `AdminDashboardViewer.jsx` | **Replace** | Show iframe/modal linking to Metabase |
| `DashboardLineChart.jsx` | **Keep** | Used for API-proxy rendering |
| `DashboardBarChart.jsx` | **Keep** | Same |
| `DashboardPieChart.jsx` | **Keep** | Same |
| Chart components | **Add** | `ScalarCard.jsx` for KPI values from Metabase |

## Appendix C: Environment Variables Reference

Add to `backend/.env`:
```bash
# Metabase API connection
MB_API_URL=http://localhost:3000/api
MB_SERVICE_USER=admin@carthapos.com
MB_SERVICE_PASS=set_in_production
MB_DASHBOARD_COLLECTION_ID=1

# Direct Metabase DB connection (for programmatic inserts)
METABASE_DATABASE_URL="postgresql://postgres:oussama@localhost:5432/metabase"

# Read-only Metabase warehouse user
METABASE_WAREHOUSE_USER=metabase_reader
METABASE_WAREHOUSE_PASS=metabase_ro_pass_2026
```

---

*End of Report*
