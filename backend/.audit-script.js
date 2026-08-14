const { Client } = require('pg');
const fs = require('fs');

const OUT = 'D:/Carthapos/backend/.audit-dump.json';
const c = new Client({ connectionString: 'postgresql://postgres:oussama@localhost:5432/pos_system' });

const q = (sql, params) => c.query(sql, params).then((r) => r.rows);
const num = (sql, params) => c.query(sql, params).then((r) => Number(r.rows[0].n));

const BI_TABLES = ['dim_clients', 'dim_products', 'dim_suppliers', 'dim_time',
  'fact_sales', 'fact_inventory', 'fact_kitchen_orders', 'fact_appointments',
  'bi_uploads', 'bi_upload_files', 'bi_processing_jobs', 'bi_processing_logs',
  'bi_requests', 'bi_analysis_requests', 'bi_dashboard_templates', 'bi_dashboards', 'bi_notifications'];

const BI_VIEWS = ['v_sales', 'v_revenue_daily', 'v_inventory', 'v_product_performance',
  'v_kitchen_orders', 'v_table_turnover', 'v_peak_hours', 'v_appointments', 'v_suppliers', 'v_dashboard_kpis'];

async function main() {
  await c.connect();
  const report = { generatedAt: new Date().toISOString(), tables: {}, views: {} };

  // ── Table inventory ─────────────────────────────────────────────
  for (const t of BI_TABLES) {
    const cols = await q(
      `SELECT column_name, data_type, is_nullable, COALESCE(column_default,'') AS def
         FROM information_schema.columns WHERE table_schema='public' AND table_name=$1
         ORDER BY ordinal_position`, [t]);
    const pk = await q(
      `SELECT a.attname AS col FROM pg_index i
         JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
        WHERE i.indrelid=$1::regclass AND i.indisprimary`, [t]);
    const fks = await q(
      `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
        WHERE conrelid=$1::regclass AND contype='f'`, [t]);
    const idx = await q(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=$1`, [t]);
    const rowCount = await c.query(`SELECT count(*) FROM "${t}"`).then((r) => Number(r.rows[0].count));
    const hasUpd = cols.some((x) => x.column_name === 'updatedAt');
    const hasCrt = cols.some((x) => x.column_name === 'createdAt');
    let lastUpdated = null;
    if (hasUpd) lastUpdated = await q(`SELECT max("updatedAt") AS m FROM "${t}"`).then((r) => r[0].m && r[0].m.toISOString());
    if (lastUpdated === null && hasCrt) lastUpdated = await q(`SELECT max("createdAt") AS m FROM "${t}"`).then((r) => r[0].m && r[0].m.toISOString());
    const tenantCol = cols.some((x) => ['tenantId', 'clientId'].includes(x.column_name)) ? (cols.find((x) => ['tenantId', 'clientId'].includes(x.column_name)).column_name) : null;
    const tenants = tenantCol ? await q(`SELECT count(DISTINCT "${tenantCol}") AS n FROM "${t}"`).then((r) => Number(r[0].n)) : null;
    report.tables[t] = {
      purpose: '', rowCount, columns: cols.map((x) => `${x.column_name}:${x.data_type}${x.is_nullable === 'NO' ? ':NOTNULL' : ''}`),
      primaryKey: pk.map((x) => x.col), foreignKeys: fks.map((x) => x.def),
      indexes: idx.map((x) => x.indexdef), tenantIsolationField: tenantCol, distinctTenants: tenants, lastUpdated,
    };
  }

  // ── View inventory (definition) ─────────────────────────────────
  for (const v of BI_VIEWS) {
    const def = await q(`SELECT pg_get_viewdef($1::regclass, true) AS d`, [v]);
    report.views[v] = def[0] ? def[0].d : '(not found)';
  }

  // ── Star schema validation on fact_sales ────────────────────────
  const fkeys = await q(`
    SELECT 'dim_time' AS dim, count(*) AS total,
      count(*) FILTER (WHERE "dimTimeId" IS NOT NULL) AS filled,
      count(*) FILTER (WHERE "dimTimeId" IS NULL) AS missing,
      count(*) FILTER (WHERE "dimTimeId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dim_time d WHERE d.id = fs."dimTimeId")) AS orphan
    FROM fact_sales fs
    UNION ALL
    SELECT 'dim_products' AS dim, count(*) AS total,
      count(*) FILTER (WHERE "dimProductId" IS NOT NULL) AS filled,
      count(*) FILTER (WHERE "dimProductId" IS NULL) AS missing,
      count(*) FILTER (WHERE "dimProductId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dim_products d WHERE d.id = fs."dimProductId")) AS orphan
    FROM fact_sales fs
    UNION ALL
    SELECT 'dim_clients' AS dim, count(*) AS total,
      count(*) FILTER (WHERE "dimClientId" IS NOT NULL) AS filled,
      count(*) FILTER (WHERE "dimClientId" IS NULL) AS missing,
      count(*) FILTER (WHERE "dimClientId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dim_clients d WHERE d.id = fs."dimClientId")) AS orphan
    FROM fact_sales fs`);
  report.starSchema = fkeys;

  // fact_inventory dim_product relation
  report.factInventoryProduct = await q(`
    SELECT count(*) AS total,
      count(*) FILTER (WHERE "dimProductId" IS NULL) AS missing,
      count(*) FILTER (WHERE "dimProductId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dim_products d WHERE d.id = fi."dimProductId")) AS orphan
    FROM fact_inventory fi`);

  // ── Dimension audits ────────────────────────────────────────────
  report.dimTime = {
    rows: await num('SELECT count(*) FROM dim_time'),
    minId: await q('SELECT min(id) AS m, max(id) AS x FROM dim_time').then((r) => ({ min: r[0].m, max: r[0].x })),
    nullDates: await num('SELECT count(*) FROM dim_time WHERE date IS NULL'),
    zeroDay: await num('SELECT count(*) FROM dim_time WHERE day = 0 OR month = 0 OR year < 2000'),
  };
  report.dimTimeCoverage = await q(`
    SELECT 'sales' AS src, count(DISTINCT fs."dimTimeId") AS covered, count(DISTINCT fs."dimTimeId") FILTER (WHERE fs."dimTimeId" IS NOT NULL) AS withKey FROM fact_sales fs
    UNION ALL SELECT 'kitchen', count(DISTINCT fko."dimTimeId"), count(DISTINCT fko."dimTimeId") FILTER (WHERE fko."dimTimeId" IS NOT NULL) FROM fact_kitchen_orders fko
    UNION ALL SELECT 'appointments', count(DISTINCT fa."dimTimeId"), count(DISTINCT fa."dimTimeId") FILTER (WHERE fa."dimTimeId" IS NOT NULL) FROM fact_appointments fa`);
  report.dimTimeMissingKeys = await q(`
    SELECT (SELECT count(*) FROM fact_sales fs WHERE fs."dimTimeId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dim_time d WHERE d.id=fs."dimTimeId")) AS sales_orphan_dates,
           (SELECT count(*) FROM fact_kitchen_orders fko WHERE fko."dimTimeId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dim_time d WHERE d.id=fko."dimTimeId")) AS kitchen_orphan_dates,
           (SELECT count(*) FROM fact_appointments fa WHERE fa."dimTimeId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dim_time d WHERE d.id=fa."dimTimeId")) AS appt_orphan_dates`);

  report.dimProduct = {
    rows: await num('SELECT count(*) FROM dim_products'),
    emptyName: await num(`SELECT count(*) FROM dim_products WHERE name IS NULL OR trim(name)=''`),
    emptyCategory: await num(`SELECT count(*) FROM dim_products WHERE category IS NULL OR trim(category)=''`),
    emptyFamily: await num(`SELECT count(*) FROM dim_products WHERE family IS NULL OR trim(family)=''`),
    missingBarcode: await num(`SELECT count(*) FROM dim_products WHERE barcode IS NULL OR trim(barcode)=''`),
    duplicateBusinessKeys: await q(`SELECT count(*) AS n FROM (SELECT "productId" FROM dim_products GROUP BY "productId","tenantId" HAVING count(*)>1) d`).then((r) => Number(r[0].n)),
    nullProductId: await num(`SELECT count(*) FROM dim_products WHERE "productId" IS NULL OR trim("productId")=''`),
    examples: await q(`SELECT "productId", name, category FROM dim_products LIMIT 5`),
  };

  report.dimClient = {
    rows: await num('SELECT count(*) FROM dim_clients'),
    dupTenant: await q(`SELECT count(*) AS n FROM (SELECT "tenantId" FROM dim_clients GROUP BY "tenantId" HAVING count(*)>1) d`).then((r) => Number(r[0].n)),
    missingBusinessType: await num(`SELECT count(*) FROM dim_clients WHERE "businessType" IS NULL OR trim("businessType")=''`),
    businessTypes: await q(`SELECT "businessType", count(*) FROM dim_clients GROUP BY "businessType"`),
    rowsDetail: await q(`SELECT "tenantId", name, "businessType" FROM dim_clients ORDER BY "tenantId"`),
  };

  report.dimSupplier = {
    rows: await num('SELECT count(*) FROM dim_suppliers'),
    emptyName: await num(`SELECT count(*) FROM dim_suppliers WHERE name IS NULL OR trim(name)=''`),
    dupKeys: await q(`SELECT count(*) AS n FROM (SELECT "supplierId" FROM dim_suppliers GROUP BY "supplierId","tenantId" HAVING count(*)>1) d`).then((r) => Number(r[0].n)),
  };

  // ── Fact table analyses ─────────────────────────────────────────
  report.factSales = {
    rows: await num('SELECT count(*) FROM fact_sales'),
    byTenant: await q('SELECT "tenantId", count(*) AS n, sum(total) AS rev FROM fact_sales GROUP BY "tenantId" ORDER BY n DESC'),
    byPayment: await q(`SELECT COALESCE("paymentMethod",'(null)') AS m, count(*) AS n, sum(total) AS rev FROM fact_sales GROUP BY 1 ORDER BY n DESC`),
    nulls: await q(`
      SELECT
        count(*) FILTER (WHERE total IS NULL) AS total_null,
        count(*) FILTER (WHERE tax IS NULL) AS tax_null,
        count(*) FILTER (WHERE discount IS NULL) AS discount_null,
        count(*) FILTER (WHERE "paymentMethod" IS NULL) AS pm_null,
        count(*) FILTER (WHERE "dimTimeId" IS NULL) AS time_null,
        count(*) FILTER (WHERE "saleId" IS NULL OR trim("saleId")='') AS saleid_null
      FROM fact_sales`),
    negativeTotal: await num('SELECT count(*) FROM fact_sales WHERE total < 0'),
    zeroTotal: await num('SELECT count(*) FROM fact_sales WHERE total = 0'),
    negativeTax: await num('SELECT count(*) FROM fact_sales WHERE tax < 0'),
    duplicateSaleIds: await q(`SELECT count(*) AS n FROM (SELECT "saleId","tenantId" FROM fact_sales GROUP BY "saleId","tenantId" HAVING count(*)>1) d`).then((r) => Number(r[0].n)),
    revenueTotal: await q('SELECT sum(total) AS rev, avg(total) AS avg, min(total) AS mn, max(total) AS mx, count(DISTINCT "dimTimeId") AS days FROM fact_sales'),
    byDayRecent: await q(`SELECT "dimTimeId" AS d, count(*) AS n, round(sum(total)::numeric,2) AS rev FROM fact_sales WHERE "dimTimeId" >= 20260701 GROUP BY "dimTimeId" ORDER BY "dimTimeId" DESC LIMIT 10`),
  };

  report.factInventory = {
    rows: await num('SELECT count(*) FROM fact_inventory'),
    byTenant: await q('SELECT "tenantId", count(*) AS n FROM fact_inventory GROUP BY "tenantId" ORDER BY n DESC'),
    nulls: await q(`
      SELECT count(*) FILTER (WHERE stock IS NULL) AS stock_null,
             count(*) FILTER (WHERE price IS NULL) AS price_null,
             count(*) FILTER (WHERE "productName" IS NULL OR trim("productName")='') AS name_empty,
             count(*) FILTER (WHERE "dimProductId" IS NULL) AS prod_null
      FROM fact_inventory`),
    negativeStock: await num('SELECT count(*) FROM fact_inventory WHERE stock < 0'),
    zeroStock: await num('SELECT count(*) FROM fact_inventory WHERE stock = 0'),
    negativePrice: await num('SELECT count(*) FROM fact_inventory WHERE price < 0'),
    zeroPrice: await num('SELECT count(*) FROM fact_inventory WHERE price = 0'),
    stockValue: await q('SELECT sum(stock * price) AS stock_value, sum(stock) AS units, count(*) AS skus FROM fact_inventory'),
    lowStock: await q('SELECT count(*) AS n FROM fact_inventory WHERE stock > 0 AND stock < 10'),
    byProduct: await q(`SELECT "productName", stock, price, "timesSold" FROM fact_inventory ORDER BY stock ASC LIMIT 5`),
  };

  report.factKitchen = {
    rows: await num('SELECT count(*) FROM fact_kitchen_orders'),
    byTenant: await q('SELECT "tenantId", count(*) AS n FROM fact_kitchen_orders GROUP BY "tenantId" ORDER BY n DESC'),
    byStatus: await q(`SELECT COALESCE(status,'(null)') AS s, count(*) FROM fact_kitchen_orders GROUP BY 1 ORDER BY 2 DESC`),
    byPriority: await q(`SELECT COALESCE(priority,'(null)') AS s, count(*) FROM fact_kitchen_orders GROUP BY 1 ORDER BY 2 DESC`),
    nulls: await q(`SELECT count(*) FILTER (WHERE "dimTimeId" IS NULL) AS time_null,
        count(*) FILTER (WHERE status IS NULL) AS status_null,
        count(*) FILTER (WHERE "tableNumber" IS NULL) AS table_null,
        count(*) FILTER (WHERE items IS NULL OR items='') AS items_empty FROM fact_kitchen_orders`),
    byDay: await q(`SELECT "dimTimeId" AS d, count(*) AS n FROM fact_kitchen_orders WHERE "dimTimeId" >= 20260701 GROUP BY 1 ORDER BY 1 DESC LIMIT 8`),
  };

  report.factAppointments = {
    rows: await num('SELECT count(*) FROM fact_appointments'),
    byTenant: await q('SELECT "tenantId", count(*) AS n FROM fact_appointments GROUP BY "tenantId" ORDER BY n DESC'),
    byStatus: await q(`SELECT COALESCE(status,'(null)') AS s, count(*) FROM fact_appointments GROUP BY 1 ORDER BY 2 DESC`),
    nulls: await q(`SELECT count(*) FILTER (WHERE "dimTimeId" IS NULL) AS time_null,
        count(*) FILTER (WHERE "customerName" IS NULL OR trim("customerName")='') AS name_empty,
        count(*) FILTER (WHERE "serviceId" IS NULL) AS service_null,
        count(*) FILTER (WHERE duration IS NULL) AS dur_null FROM fact_appointments`),
  };

  // ── Data quality / duplicate business keys across facts ────────
  report.duplicateSalesAcrossExports = await q(`
    SELECT "tenantId", count(*) AS n FROM (
      SELECT "saleId", "tenantId", count(*) FROM fact_sales GROUP BY "saleId","tenantId" HAVING count(*)>1
    ) d GROUP BY "tenantId" ORDER BY n DESC LIMIT 10`);

  // ── Tenant isolation ────────────────────────────────────────────
  report.tenantIsolation = {
    factsWithTenant: await q(`
      SELECT 'fact_sales' AS t, count(*) FILTER (WHERE "tenantId" IS NULL) AS nulls, count(DISTINCT "tenantId") AS tenants FROM fact_sales
      UNION ALL SELECT 'fact_inventory', count(*) FILTER (WHERE "tenantId" IS NULL), count(DISTINCT "tenantId") FROM fact_inventory
      UNION ALL SELECT 'fact_kitchen_orders', count(*) FILTER (WHERE "tenantId" IS NULL), count(DISTINCT "tenantId") FROM fact_kitchen_orders
      UNION ALL SELECT 'fact_appointments', count(*) FILTER (WHERE "tenantId" IS NULL), count(DISTINCT "tenantId") FROM fact_appointments`),
    dimsWithTenant: await q(`
      SELECT 'dim_clients' AS t, count(*) FILTER (WHERE "tenantId" IS NULL) AS nulls, count(DISTINCT "tenantId") AS tenants FROM dim_clients
      UNION ALL SELECT 'dim_products', count(*) FILTER (WHERE "tenantId" IS NULL), count(DISTINCT "tenantId") FROM dim_products
      UNION ALL SELECT 'dim_suppliers', count(*) FILTER (WHERE "tenantId" IS NULL), count(DISTINCT "tenantId") FROM dim_suppliers`),
  };

  // ── BI pipeline / template tables (unquoted lowercase columns) ──
  report.biUploads = {
    rows: await num('SELECT count(*) FROM bi_uploads'),
    byStatus: await q(`SELECT status, count(*), max(createdat) AS last FROM bi_uploads GROUP BY status ORDER BY count(*) DESC`),
    byClient: await q(`SELECT clientid AS c, count(*), max(createdat) AS last FROM bi_uploads GROUP BY clientid ORDER BY count(*) DESC`),
    businessTypes: await q(`SELECT businesstype AS bt, count(*) FROM bi_uploads GROUP BY businesstype`),
  };
  report.biTemplates = {
    rows: await num('SELECT count(*) FROM bi_dashboard_templates'),
    detail: await q(`SELECT id, businesstype, name, active, createdat FROM bi_dashboard_templates`),
  };
  report.biDashboards = {
    rows: await num('SELECT count(*) FROM bi_dashboards'),
    byStatus: await q(`SELECT status, count(*) FROM bi_dashboards GROUP BY status`),
  };
  report.biRequests = {
    rows: await num('SELECT count(*) FROM bi_requests'),
    byStatus: await q(`SELECT status, count(*) FROM bi_requests GROUP BY status`),
  };
  report.biJobs = await q(`SELECT status, count(*), sum(recordsloaded) AS records FROM bi_processing_jobs GROUP BY status`);

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log('Dump written to', OUT);
  await c.end();
}

main().catch((e) => { console.error('AUDIT ERROR:', e.message); process.exit(1); });
