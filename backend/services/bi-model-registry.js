/**
 * BI Dimensional Model Registry
 *
 * Read-only description of the BI warehouse star schema. Describes, for every
 * dimension and fact produced by the ETL preparation, the column roles
 * (primary key / foreign key / measure / attribute), the source CSV lineage of
 * each mapped column, and the fact → dimension relationships.
 *
 * This is pure metadata: it never modifies the ETL, the preview or the
 * warehouse. It exists solely so the "Dimensional Model" wizard step can
 * visualize how uploaded CSVs become warehouse tables.
 */

const ROLE_ORDER = ['primary_key', 'business_key', 'foreign_key', 'measure', 'attribute'];

const DIMENSIONS = {
  DimTime: {
    pk: ['id'],
    source: { note: 'Dérivé — union des dates de toutes les sources' },
    columns: {
      id: { role: 'primary_key', source: null },
      date: { role: 'attribute', source: null, note: 'Union des colonnes date (created_at, sale_date, …)' },
      year: { role: 'attribute', source: null, note: 'Dérivé de la date' },
      quarter: { role: 'attribute', source: null, note: 'Dérivé de la date' },
      month: { role: 'attribute', source: null, note: 'Dérivé de la date' },
      day: { role: 'attribute', source: null, note: 'Dérivé de la date' },
      dayOfWeek: { role: 'attribute', source: null, note: 'Dérivé de la date' },
      isWeekend: { role: 'attribute', source: null, note: 'Dérivé de la date' },
    },
  },
  DimClient: {
    pk: ['tenantId'],
    source: { note: 'Métadonnées de l\'export (client)' },
    columns: {
      tenantId: { role: 'primary_key', source: null, note: 'Identifiant du client' },
      exportId: { role: 'attribute', source: null, note: 'Identifiant de l\'import' },
      name: { role: 'attribute', source: { dataset: 'metadata', column: 'businessName' } },
      businessType: { role: 'attribute', source: { dataset: 'metadata', column: 'businessType' } },
    },
  },
  DimCustomer: {
    pk: ['id'],
    sourceDataset: 'customers',
    columns: {
      id: { role: 'primary_key', source: null, note: 'Clé dérivée cust_{client}_{customer_id}' },
      customerId: { role: 'attribute', source: { dataset: 'customers', column: 'customer_id' } },
      name: { role: 'attribute', source: { dataset: 'customers', column: 'name' } },
      email: { role: 'attribute', source: { dataset: 'customers', column: 'email' } },
      phone: { role: 'attribute', source: { dataset: 'customers', column: 'phone' } },
      address: { role: 'attribute', source: { dataset: 'customers', column: 'address' } },
      loyaltyPoints: { role: 'attribute', source: { dataset: 'customers', column: 'loyalty_points' } },
      totalSpent: { role: 'attribute', source: { dataset: 'customers', column: 'total_spent' } },
      visitCount: { role: 'attribute', source: { dataset: 'customers', column: 'visit_count' } },
      lastVisitDate: { role: 'attribute', source: { dataset: 'customers', column: 'last_visit_date' } },
      tags: { role: 'attribute', source: { dataset: 'customers', column: 'tags' } },
      isActive: { role: 'attribute', source: { dataset: 'customers', column: 'is_active' } },
    },
  },
  DimProduct: {
    pk: ['id'],
    sourceDataset: 'products',
    columns: {
      id: { role: 'primary_key', source: null, note: 'Clé dérivée prod_{client}_{product_id}' },
      productId: { role: 'attribute', source: { dataset: 'products', column: 'product_id' } },
      name: { role: 'attribute', source: { dataset: 'products', column: 'name' } },
      category: { role: 'attribute', source: { dataset: 'products', column: 'category' } },
      family: { role: 'attribute', source: { dataset: 'products', column: 'family' } },
      barcode: { role: 'attribute', source: { dataset: 'products', column: 'barcode' } },
    },
  },
  DimSupplier: {
    pk: ['id'],
    sourceDataset: 'suppliers',
    columns: {
      id: { role: 'primary_key', source: null, note: 'Clé dérivée supp_{client}_{supplier_id}' },
      supplierId: { role: 'attribute', source: { dataset: 'suppliers', column: 'supplier_id' } },
      name: { role: 'attribute', source: { dataset: 'suppliers', column: 'name' } },
      contact: { role: 'attribute', source: { dataset: 'suppliers', column: 'contact' } },
      phone: { role: 'attribute', source: { dataset: 'suppliers', column: 'phone' } },
      email: { role: 'attribute', source: { dataset: 'suppliers', column: 'email' } },
    },
  },
};

const FACTS = {
  FactSale: {
    sourceDataset: 'sales',
    grain: 'Une ligne par vente',
    relationships: [
      { dimension: 'DimCustomer', fk: 'dimCustomerId', pk: 'id' },
      { dimension: 'DimTime', fk: 'dimTimeId', pk: 'id' },
    ],
    columns: {
      saleId: { role: 'business_key', source: { dataset: 'sales', column: 'sale_id' } },
      dimCustomerId: { role: 'foreign_key', source: { dataset: 'sales', column: 'customer_id' }, references: 'DimCustomer' },
      dimTimeId: { role: 'foreign_key', source: { dataset: 'sales', column: 'created_at' }, references: 'DimTime' },
      total: { role: 'measure', source: { dataset: 'sales', column: 'total' } },
      tax: { role: 'measure', source: { dataset: 'sales', column: 'tax' } },
      discount: { role: 'measure', source: { dataset: 'sales', column: 'discount' } },
      paymentMethod: { role: 'attribute', source: { dataset: 'sales', column: 'payment_method' } },
      transactionHour: { role: 'attribute', source: { dataset: 'sales', column: 'created_at' }, note: 'Heure extraite de created_at' },
    },
  },
  FactInventory: {
    sourceDataset: 'inventory',
    grain: 'Une ligne par instantané de produit',
    relationships: [
      { dimension: 'DimProduct', fk: 'dimProductId', pk: 'id' },
    ],
    columns: {
      dimProductId: { role: 'foreign_key', source: { dataset: 'inventory', column: 'product_id' }, references: 'DimProduct' },
      productName: { role: 'attribute', source: { dataset: 'inventory', column: 'product_name' } },
      stock: { role: 'measure', source: { dataset: 'inventory', column: 'stock' } },
      price: { role: 'measure', source: { dataset: 'inventory', column: 'price' } },
      timesSold: { role: 'measure', source: { dataset: 'inventory', column: 'times_sold' } },
    },
  },
  FactAppointment: {
    sourceDataset: 'appointments',
    grain: 'Une ligne par rendez-vous',
    relationships: [
      { dimension: 'DimTime', fk: 'dimTimeId', pk: 'id' },
    ],
    columns: {
      dimTimeId: { role: 'foreign_key', source: { dataset: 'appointments', column: 'appointment_date' }, references: 'DimTime' },
      customerName: { role: 'attribute', source: { dataset: 'appointments', column: 'customer_name' } },
      customerPhone: { role: 'attribute', source: { dataset: 'appointments', column: 'customer_phone' } },
      serviceId: { role: 'attribute', source: { dataset: 'appointments', column: 'service_id' } },
      duration: { role: 'measure', source: { dataset: 'appointments', column: 'duration' } },
      status: { role: 'attribute', source: { dataset: 'appointments', column: 'status' } },
    },
  },
  FactKitchenOrder: {
    sourceDataset: 'kitchen_orders',
    grain: 'Une ligne par commande cuisine',
    relationships: [
      { dimension: 'DimTime', fk: 'dimTimeId', pk: 'id' },
    ],
    columns: {
      dimTimeId: { role: 'foreign_key', source: { dataset: 'kitchen_orders', column: 'created_at' }, references: 'DimTime' },
      orderId: { role: 'business_key', source: { dataset: 'kitchen_orders', column: 'order_id' } },
      tableNumber: { role: 'attribute', source: { dataset: 'kitchen_orders', column: 'table_number' }, note: 'Dénormalisé — pas de dimension table' },
      items: { role: 'attribute', source: { dataset: 'kitchen_orders', column: 'items' } },
      priority: { role: 'attribute', source: { dataset: 'kitchen_orders', column: 'priority' } },
      status: { role: 'attribute', source: { dataset: 'kitchen_orders', column: 'status' } },
      transactionHour: { role: 'attribute', source: { dataset: 'kitchen_orders', column: 'created_at' }, note: 'Heure extraite de created_at' },
    },
  },
  FactSaleItem: {
    sourceDataset: 'sale_items',
    grain: 'Une ligne par produit vendu dans une vente',
    relationships: [
      { dimension: 'DimProduct', fk: 'dimProductId', pk: 'id' },
      { dimension: 'DimTime', fk: 'dimTimeId', pk: 'id' },
    ],
    columns: {
      dimProductId: { role: 'foreign_key', source: { dataset: 'sale_items', column: 'product_id' }, references: 'DimProduct' },
      dimTimeId: { role: 'foreign_key', source: { dataset: 'sale_items', column: 'sale_date' }, references: 'DimTime' },
      saleItemId: { role: 'business_key', source: { dataset: 'sale_items', column: 'sale_item_id' } },
      saleId: { role: 'attribute', source: { dataset: 'sale_items', column: 'sale_id' }, note: 'Pont vers FactSale' },
      productId: { role: 'attribute', source: { dataset: 'sale_items', column: 'product_id' } },
      quantity: { role: 'measure', source: { dataset: 'sale_items', column: 'quantity' } },
      unitPrice: { role: 'measure', source: { dataset: 'sale_items', column: 'unit_price' } },
      lineTotal: { role: 'measure', source: { dataset: 'sale_items', column: 'line_total' } },
      vatRate: { role: 'measure', source: { dataset: 'sale_items', column: 'vat_rate' } },
      vatAmount: { role: 'measure', source: { dataset: 'sale_items', column: 'vat_amount' } },
      paymentMethod: { role: 'attribute', source: { dataset: 'sale_items', column: 'payment_method' } },
      productName: { role: 'attribute', source: { dataset: 'sale_items', column: 'product_name' } },
      category: { role: 'attribute', source: { dataset: 'sale_items', column: 'category' } },
      family: { role: 'attribute', source: { dataset: 'sale_items', column: 'family' } },
      transactionHour: { role: 'attribute', source: { dataset: 'sale_items', column: 'sale_date' }, note: 'Heure extraite de sale_date' },
    },
  },
  FactKitchenOrderItem: {
    sourceDataset: 'kitchen_order_items',
    grain: 'Une ligne par ligne d\'une commande cuisine',
    relationships: [
      { dimension: 'DimTime', fk: 'dimTimeId', pk: 'id' },
    ],
    columns: {
      dimTimeId: { role: 'foreign_key', source: { dataset: 'kitchen_order_items', column: 'created_at' }, references: 'DimTime' },
      kitchenOrderItemId: { role: 'business_key', source: { dataset: 'kitchen_order_items', column: 'kitchen_order_item_id' } },
      orderId: { role: 'attribute', source: { dataset: 'kitchen_order_items', column: 'order_id' }, note: 'Pont vers FactKitchenOrder' },
      saleId: { role: 'attribute', source: { dataset: 'kitchen_order_items', column: 'sale_id' }, note: 'Pont vers FactSale' },
      productId: { role: 'attribute', source: { dataset: 'kitchen_order_items', column: 'product_id' } },
      productName: { role: 'attribute', source: { dataset: 'kitchen_order_items', column: 'product_name' } },
      quantity: { role: 'measure', source: { dataset: 'kitchen_order_items', column: 'quantity' } },
      unitPrice: { role: 'measure', source: { dataset: 'kitchen_order_items', column: 'unit_price' } },
      lineTotal: { role: 'measure', source: { dataset: 'kitchen_order_items', column: 'line_total' } },
      department: { role: 'attribute', source: { dataset: 'kitchen_order_items', column: 'department' } },
      preparationTime: { role: 'measure', source: { dataset: 'kitchen_order_items', column: 'preparation_time' } },
      transactionHour: { role: 'attribute', source: { dataset: 'kitchen_order_items', column: 'created_at' }, note: 'Heure extraite de created_at' },
    },
  },
};

function columnEntries(meta) {
  return Object.entries(meta.columns)
    .map(([name, def]) => ({ name, ...def }))
    .sort((a, b) => (ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)) || a.name.localeCompare(b.name));
}

function genericColumns(rows) {
  if (!rows || rows.length === 0) return [];
  return Object.keys(rows[0]).map((name) => ({ name, role: 'attribute', source: null }));
}

function tableMeta(warehouse, key, meta, kind) {
  const rows = warehouse[kind][key] || [];
  const columns = meta ? columnEntries(meta) : genericColumns(rows);
  return {
    name: key,
    count: rows.length,
    pk: meta ? meta.pk : [],
    grain: meta ? meta.grain : null,
    sourceDataset: meta ? meta.sourceDataset : null,
    source: meta ? meta.source : null,
    columns,
  };
}

function buildDimensionalModel(warehouse) {
  const dims = warehouse.dimensions || {};
  const facts = warehouse.facts || {};

  const dimensions = Object.keys(dims).map((k) => tableMeta(warehouse, k, DIMENSIONS[k], 'dimensions'));
  const factTables = Object.keys(facts).map((k) => tableMeta(warehouse, k, FACTS[k], 'facts'));

  const relationships = [];
  for (const [factName, meta] of Object.entries(FACTS)) {
    for (const rel of meta.relationships || []) {
      relationships.push({ fact: factName, dimension: rel.dimension, fk: rel.fk, pk: rel.pk, cardinality: '1:N' });
    }
  }

  const dimIds = {};
  for (const [dimName, rows] of Object.entries(dims)) {
    dimIds[dimName] = new Set(rows.map((r) => (r.id === undefined ? r.tenantId : r.id)).filter((v) => v !== null && v !== undefined).map(String));
  }

  const fkHealth = [];
  for (const [factName, rows] of Object.entries(facts)) {
    const meta = FACTS[factName];
    if (!meta || !meta.relationships) continue;
    for (const rel of meta.relationships) {
      const ids = dimIds[rel.dimension];
      let matched = 0;
      let orphan = 0;
      let noKey = 0;
      const sampleMatched = [];
      const sampleOrphans = [];
      const seenMatched = new Set();
      const seenOrphan = new Set();
      for (const r of rows) {
        const v = r[rel.fk];
        if (v === null || v === undefined) {
          noKey += 1;
          continue;
        }
        if (ids && ids.has(String(v))) {
          matched += 1;
          if (sampleMatched.length < 5 && !seenMatched.has(String(v))) {
            seenMatched.add(String(v));
            sampleMatched.push(v);
          }
        } else {
          orphan += 1;
          if (sampleOrphans.length < 5 && !seenOrphan.has(String(v))) {
            seenOrphan.add(String(v));
            sampleOrphans.push(v);
          }
        }
      }
      const withKey = matched + orphan;
      fkHealth.push({
        fact: factName,
        dimension: rel.dimension,
        fk: rel.fk,
        pk: rel.pk,
        cardinality: '1:N',
        rows: rows.length,
        matched,
        orphan,
        noKey,
        health: withKey === 0 ? 100 : Math.round((matched / withKey) * 100),
        sampleMatched,
        sampleOrphans,
      });
    }
  }

  return { dimensions, facts: factTables, relationships, fkHealth, warehouseType: 'Star Schema' };
}

module.exports = { buildDimensionalModel, DIMENSIONS, FACTS };
