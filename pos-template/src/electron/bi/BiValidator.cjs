/**
 * BI Validator
 *
 * Validates data before export:
 *   - missing required fields
 *   - empty dataset warnings
 *   - schema consistency checks
 *
 * Returns an array of warnings (non-fatal) and errors (fatal — export SHOULD stop).
 */

const BiSchemaContract = require('./BiSchemaContract.cjs');

/**
 * Validate a single dataset just before CSV generation.
 *
 * @param {string}  datasetKey  — e.g. "sales", "products"
 * @param {Array}   rows        — array of normalized BI objects (from BiDataMapper)
 * @param {string}  label       — display name for error messages
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateDataset(datasetKey, rows, label) {
  const errors = [];
  const warnings = [];
  const schema = BiSchemaContract.getSchema(datasetKey);

  if (!schema) {
    errors.push(`Unknown dataset "${datasetKey}" — no schema defined`);
    return { errors, warnings };
  }

  const expectedColumns = schema.columns.map(c => c.name);

  // --- empty dataset check ---
  if (!rows || rows.length === 0) {
    warnings.push(`${label} (${datasetKey}.csv) contient 0 lignes — fichier vide généré`);
    return { errors, warnings };
  }

  // --- per-row required-field and type checks ---
  const requiredCols = schema.columns.filter(c => c.required).map(c => c.name);
  let nullRequiredCount = 0;
  let typeMismatchCount = 0;

  for (let i = 0; i < Math.min(rows.length, 100); i++) {
    const row = rows[i];

    // check all expected columns exist
    for (const colName of expectedColumns) {
      if (!(colName in row)) {
        errors.push(`${label}[${i}]: column "${colName}" is missing from mapped row`);
      }
    }

    // check required fields are non-null
    for (const colName of requiredCols) {
      if (row[colName] === null || row[colName] === undefined) {
        nullRequiredCount++;
      }
    }

    // check type hints (basic)
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
      `${label}: ${nullRequiredCount} valeurs obligatoires manquantes (nulles) sur ${rows.length} lignes`
    );
  }

  if (typeMismatchCount > 0) {
    warnings.push(
      `${label}: ${typeMismatchCount} incohérences de type détectées (ex: chaîne attendue, nombre trouvé)`
    );
  }

  // --- column consistency (schema vs actual) ---
  const firstRow = rows[0];
  if (firstRow) {
    const actualCols = Object.keys(firstRow);
    const schemaCols = new Set(expectedColumns);
    const extraCols = actualCols.filter(c => !schemaCols.has(c));

    if (extraCols.length > 0) {
      warnings.push(
        `${label}: colonnes inattendues trouvées — ${extraCols.join(', ')} (elles seront ignorées)`
      );
    }
  }

  return { errors, warnings };
}

/**
 * Validate all datasets at once.
 *
 * @param {Object} datasets — map of { datasetKey: [rows] }
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateAll(datasets) {
  const errors = [];
  const warnings = [];

  const LABELS = {
    sales: 'Ventes',
    products: 'Produits',
    customers: 'Clients',
    inventory: 'Inventaire',
    tables: 'Tables',
    kitchen_orders: 'Commandes cuisine',
    suppliers: 'Fournisseurs',
    services: 'Services',
    appointments: 'Rendez-vous',
  };

  for (const [key, rows] of Object.entries(datasets)) {
    const result = validateDataset(key, rows, LABELS[key] || key);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return { errors, warnings };
}

module.exports = {
  validateDataset,
  validateAll,
};
