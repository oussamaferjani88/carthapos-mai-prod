/**
 * BI Validator v2
 *
 * Validates data before export:
 *   - Missing required fields
 *   - Empty dataset warnings
 *   - Schema consistency checks
 *   - Cross-dataset referential integrity (orphan detection)
 *   - Facts vs Dimensions classification
 *
 * Returns warnings (non-fatal) and errors (fatal — export stops).
 *
 * v2 — Cross-dataset validation, orphan detection, validation report.
 */

const BiSchemaContract = require('./BiSchemaContract.cjs');
const BiDatasetRegistry = require('./BiDatasetRegistry.cjs');

const FACT_DATASETS = new Set([
  'sales', 'sale_items', 'kitchen_orders', 'stock_movements',
  'shifts', 'cash_drawer_events', 'z_reports', 'appointments', 'inventory',
  'audit_logs',
]);

const DIMENSION_DATASETS = new Set([
  'products', 'customers', 'suppliers', 'product_families',
  'tables', 'kitchen_departments', 'services', 'table_reservations',
  'vat_rates',
]);

const LABELS = {
  sales: 'Ventes',
  sale_items: 'Lignes de vente',
  products: 'Produits',
  customers: 'Clients',
  inventory: 'Inventaire',
  product_families: 'Familles',
  tables: 'Tables',
  kitchen_orders: 'Commandes cuisine',
  kitchen_departments: 'Departements cuisine',
  table_reservations: 'Reservations',
  suppliers: 'Fournisseurs',
  services: 'Services',
  appointments: 'Rendez-vous',
  stock_movements: 'Mouvements de stock',
  shifts: 'Caisses / Shifts',
  cash_drawer_events: 'Evenements caisse',
  z_reports: 'Rapports Z',
  audit_logs: 'Journal d\'audit',
  vat_rates: 'Taux de TVA',
};

/**
 * Validate a single dataset.
 */
function validateDataset(datasetKey, rows, label) {
  const errors = [];
  const warnings = [];
  const schema = BiSchemaContract.getSchema(datasetKey);

  if (!schema) {
    errors.push(`Unknown dataset "${datasetKey}" — no schema defined`);
    return { errors, warnings };
  }

  if (!rows || rows.length === 0) {
    warnings.push(`${label} (${datasetKey}.csv) contient 0 lignes — fichier vide genere`);
    return { errors, warnings };
  }

  const expectedColumns = schema.columns.map(c => c.name);
  const requiredCols = schema.columns.filter(c => c.required).map(c => c.name);
  let nullRequiredCount = 0;
  let typeMismatchCount = 0;

  for (let i = 0; i < Math.min(rows.length, 200); i++) {
    const row = rows[i];

    for (const colName of expectedColumns) {
      if (!(colName in row)) {
        errors.push(`${label}[${i}]: column "${colName}" is missing from mapped row`);
      }
    }

    for (const colName of requiredCols) {
      if (row[colName] === null || row[colName] === undefined) {
        nullRequiredCount++;
      }
    }

    for (const col of schema.columns) {
      const val = row[col.name];
      if (val === null || val === undefined) continue;

      if (col.type === 'integer' && !Number.isInteger(Number(val))) {
        typeMismatchCount++;
      }
      if (col.type === 'real' && isNaN(Number(val))) {
        typeMismatchCount++;
      }
    }
  }

  if (nullRequiredCount > 0) {
    warnings.push(
      `${label}: ${nullRequiredCount} valeurs obligatoires manquantes sur ${rows.length} lignes`
    );
  }

  if (typeMismatchCount > 0) {
    warnings.push(
      `${label}: ${typeMismatchCount} incoherences de type detectees`
    );
  }

  const firstRow = rows[0];
  if (firstRow) {
    const actualCols = Object.keys(firstRow);
    const schemaCols = new Set(expectedColumns);
    const extraCols = actualCols.filter(c => !schemaCols.has(c));
    if (extraCols.length > 0) {
      warnings.push(
        `${label}: colonnes inattendues — ${extraCols.join(', ')} (ignorees)`
      );
    }
  }

  return { errors, warnings };
}

/**
 * Cross-dataset referential integrity check.
 * Detects orphan records across datasets.
 */
function validateReferentialIntegrity(datasets) {
  const warnings = [];

  const hasSales = datasets.sales && datasets.sales.length > 0;
  const hasSaleItems = datasets.sale_items && datasets.sale_items.length > 0;
  const hasProducts = datasets.products && datasets.products.length > 0;
  const hasCustomers = datasets.customers && datasets.customers.length > 0;
  const hasSuppliers = datasets.suppliers && datasets.suppliers.length > 0;
  const hasTables = datasets.tables && datasets.tables.length > 0;
  const hasServices = datasets.services && datasets.services.length > 0;

  if (hasSaleItems && hasSales) {
    const saleIds = new Set(datasets.sales.map(s => s.sale_id));
    const orphans = datasets.sale_items.filter(si => si.sale_id && !saleIds.has(si.sale_id));
    if (orphans.length > 0) {
      warnings.push(
        `sale_items: ${orphans.length} ligne(s) orpheline(s) (sale_id inexistant dans sales)`
      );
    }
  }

  if (hasSaleItems && hasProducts) {
    const productIds = new Set(datasets.products.map(p => p.product_id));
    const orphans = datasets.sale_items.filter(si => si.product_id && !productIds.has(si.product_id));
    if (orphans.length > 0) {
      warnings.push(
        `sale_items: ${orphans.length} ligne(s) orpheline(s) (product_id inexistant dans products)`
      );
    }
  }

  if (hasSales && hasCustomers) {
    const customerIds = new Set(datasets.customers.map(c => c.customer_id));
    const orphans = datasets.sales.filter(s => s.customer_id && !customerIds.has(s.customer_id));
    if (orphans.length > 0) {
      warnings.push(
        `sales: ${orphans.length} vente(s) orpheline(s) (customer_id inexistant dans customers)`
      );
    }
  }

  if (hasSuppliers && hasProducts) {
    const supplierNames = new Set(
      datasets.suppliers.map(s => (s.name || '').toLowerCase())
    );
    const orphans = datasets.products.filter(
      p => p.supplier && !supplierNames.has(p.supplier.toLowerCase())
    );
    if (orphans.length > 0) {
      warnings.push(
        `products: ${orphans.length} produit(s) avec supplier inexistant dans suppliers`
      );
    }
  }

  if (hasTables) {
    const tableIds = new Set(datasets.tables.map(t => t.table_id));
    if (hasSales) {
      const orphans = datasets.sales.filter(s => s.table_id && !tableIds.has(s.table_id));
      if (orphans.length > 0) {
        warnings.push(
          `sales: ${orphans.length} vente(s) avec table_id inexistant dans tables`
        );
      }
    }
    if (datasets.table_reservations && datasets.table_reservations.length > 0) {
      const orphans = datasets.table_reservations.filter(
        tr => tr.table_id && !tableIds.has(tr.table_id)
      );
      if (orphans.length > 0) {
        warnings.push(
          `table_reservations: ${orphans.length} reservation(s) avec table_id inexistant`
        );
      }
    }
  }

  if (hasServices && hasAppointments && datasets.appointments && datasets.appointments.length > 0) {
    const serviceIds = new Set(datasets.services.map(s => s.service_id));
    const orphans = datasets.appointments.filter(
      a => a.service_id && !serviceIds.has(a.service_id)
    );
    if (orphans.length > 0) {
      warnings.push(
        `appointments: ${orphans.length} rendez-vous avec service_id inexistant`
      );
    }
  }

  return warnings;
}

/**
 * Classify datasets into facts and dimensions.
 */
function classifyDatasets(exportedKeys) {
  const facts = exportedKeys.filter(k => FACT_DATASETS.has(k));
  const dimensions = exportedKeys.filter(k => DIMENSION_DATASETS.has(k));
  const unknown = exportedKeys.filter(
    k => !FACT_DATASETS.has(k) && !DIMENSION_DATASETS.has(k)
  );
  return { facts, dimensions, unknown };
}

/**
 * Validate all datasets at once.
 * Returns errors, warnings, and classification.
 */
function validateAll(datasets, exportedKeys) {
  const errors = [];
  const warnings = [];

  for (const [key, rows] of Object.entries(datasets)) {
    const label = LABELS[key] || key;
    const result = validateDataset(key, rows, label);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  const refWarnings = validateReferentialIntegrity(datasets);
  warnings.push(...refWarnings);

  const classification = classifyDatasets(exportedKeys || Object.keys(datasets));

  return {
    errors,
    warnings,
    classification,
    summary: {
      datasetsValidated: Object.keys(datasets).length,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      factsCount: classification.facts.length,
      dimensionsCount: classification.dimensions.length,
    },
  };
}

module.exports = {
  validateDataset,
  validateAll,
  validateReferentialIntegrity,
  classifyDatasets,
  FACT_DATASETS,
  DIMENSION_DATASETS,
  LABELS,
};
