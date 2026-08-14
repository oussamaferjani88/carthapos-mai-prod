/**
 * Shared ETL data-validation utilities (single source of truth).
 *
 * Every parser in the BI pipeline (schema validation, data preparation,
 * warehouse timestamp handling) must go through these functions so that
 * validation behaviour is identical everywhere.
 */

const ISO_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const INTEGER_RE = /^-?\d+$/;
const NUMBER_RE = /^-?\d+(\.\d+)?$/;
const TABLE_NUMBER_RE = /^(?:t|table)[\s_-]*(\d+)$/i;

function isEmpty(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function normalizeText(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Categorical normalization: trim, collapse internal whitespace, lowercase.
 * Lowercase is the canonical case across the warehouse because the dashboard
 * and analytics-cache consumers read lowercase enum values; normalizing to a
 * single canonical form removes case-split buckets ("Cash"/"CASH"/"cash").
 */
function normalizeCategorical(value) {
  if (typeof value !== 'string') return value;
  return normalizeText(value).toLowerCase();
}

/**
 * Strict real-number parsing. A value is invalid (never silently coerced)
 * unless it matches the plain decimal format.
 */
function parseNumber(value) {
  if (typeof value === 'number') return { value, invalid: false, changed: false };
  if (value === null || value === undefined) return { value: null, invalid: false, changed: false };
  const s = String(value).trim();
  if (s === '') return { value: null, invalid: false, changed: false };
  if (!NUMBER_RE.test(s)) return { value: null, invalid: true, changed: false };
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return { value: null, invalid: true, changed: false };
  return { value: n, invalid: false, changed: String(n) !== s };
}

/**
 * Strict integer parsing. "12.5", "1e3", "1,200", "+12", "abc123", "12."
 * are all invalid. Values that survive must be plain signed integers.
 */
function parseInteger(value) {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { value, invalid: false, changed: false };
    return { value: null, invalid: true, changed: false };
  }
  if (value === null || value === undefined) return { value: null, invalid: false, changed: false };
  const s = String(value).trim();
  if (s === '') return { value: null, invalid: false, changed: false };
  if (!INTEGER_RE.test(s)) return { value: null, invalid: true, changed: false };
  const n = parseInt(s, 10);
  if (!Number.isSafeInteger(n)) return { value: null, invalid: true, changed: false };
  return { value: n, invalid: false, changed: String(n) !== s };
}

/**
 * Table-number parsing. A plain signed integer is accepted exactly as
 * parseInteger handles it. Otherwise the value must be a clear table
 * identifier carrying a number — "T7", "t8", "Table 5", "TABLE-12",
 * "table_7", "T-7" — whose integer part is extracted. Values that do not
 * carry a number ("Comptoir", "Take Away", "Delivery", "N/A", "-", blank)
 * are invalid so the pipeline never invents a table number.
 * Returns { value, invalid, changed, extracted }.
 */
function parseTableNumber(value) {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { value, invalid: false, changed: false, extracted: false };
    return { value: null, invalid: true, changed: false, extracted: false };
  }
  if (value === null || value === undefined) return { value: null, invalid: false, changed: false, extracted: false };
  const s = String(value).trim();
  if (s === '') return { value: null, invalid: false, changed: false, extracted: false };
  if (INTEGER_RE.test(s)) {
    const n = parseInt(s, 10);
    if (!Number.isSafeInteger(n)) return { value: null, invalid: true, changed: false, extracted: false };
    return { value: n, invalid: false, changed: String(n) !== s, extracted: false };
  }
  const m = s.match(TABLE_NUMBER_RE);
  if (!m) return { value: null, invalid: true, changed: false, extracted: false };
  const n = parseInt(m[1], 10);
  if (!Number.isSafeInteger(n)) return { value: null, invalid: true, changed: false, extracted: false };
  return { value: n, invalid: false, changed: true, extracted: true };
}

/**
 * Strict calendar-validated date parsing. Accepts "YYYY-MM-DD[ HH:MM[:SS]]"
 * (with either a space or "T" separator). Rejects impossible day/month
 * combinations ("2026-02-30"), invalid timestamps and any non-ISO format.
 * Never rolls over, never silently corrects. Returns { value, invalid, dt }.
 */
/**
 * Known non-table service locations. Canonical keys are lowercased, accent-
 * stripped, whitespace-collapsed strings mapping to a canonical service type.
 * Orders fulfilled at these locations legitimately have no physical table, so
 * table_number stays NULL instead of being an invalid-value error.
 */
const SERVICE_LOCATIONS = {
  comptoir: 'counter',
  counter: 'counter',
  takeaway: 'takeaway',
  'take away': 'takeaway',
  'take-away': 'takeaway',
  'a emporter': 'takeaway',
  aemporter: 'takeaway',
  delivery: 'delivery',
  livraison: 'delivery',
  drive: 'delivery',
  'drive-through': 'delivery',
  'drive thru': 'delivery',
  drive_thru: 'delivery',
};

function normalizeLocation(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns the canonical service type (counter | takeaway | delivery) when the
 * value is a known non-table service location, otherwise null.
 */
function knownServiceLocation(value) {
  if (typeof value !== 'string') return null;
  const key = normalizeLocation(value);
  return SERVICE_LOCATIONS[key] || null;
}

function parseDate(value) {
  if (value === null || value === undefined) return { value: null, invalid: false, dt: null };
  const s = String(value).trim();
  if (s === '') return { value: null, invalid: false, dt: null };
  const m = s.match(ISO_DATETIME_RE);
  if (!m) return { value: null, invalid: true, dt: null };
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4] || 0);
  const minute = Number(m[5] || 0);
  const second = Number(m[6] || 0);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    return { value: null, invalid: true, dt: null };
  }
  const dt = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return { value: null, invalid: true, dt: null };
  }
  return { value: s, invalid: false, dt };
}

/**
 * Date object variant of parseDate. Returns null for invalid dates instead of
 * rolling them forward. Used by warehouse timestamp columns.
 */
function toDate(value) {
  return parseDate(value).dt;
}

/**
 * Canonical categorical value maps. Keys and values are lowercase canonical
 * forms. Aliases map onto canonical values (e.g. espèces/especes → cash).
 */
const ENUM_MAPS = {
  payment_method: {
    cash: 'cash', card: 'card', mobile: 'mobile', credit: 'credit', debit: 'debit',
    bank_transfer: 'bank_transfer', cheque: 'cheque', check: 'cheque',
    espèces: 'cash', especes: 'cash', espèce: 'cash', espece: 'cash', carte: 'card',
  },
  sale_status: {
    pending: 'pending', paid: 'paid', completed: 'completed', cancelled: 'cancelled',
    canceled: 'cancelled', refunded: 'refunded', voided: 'voided',
  },
  kitchen_status: {
    pending: 'pending', preparing: 'preparing', cooking: 'cooking', ready: 'ready',
    served: 'served', completed: 'completed', cancelled: 'cancelled', canceled: 'cancelled',
  },
  priority: {
    normal: 'normal', high: 'high', urgent: 'urgent', low: 'low',
  },
  appointment_status: {
    scheduled: 'scheduled', confirmed: 'confirmed', pending: 'pending',
    in_progress: 'in_progress', completed: 'completed', cancelled: 'cancelled',
    canceled: 'cancelled', no_show: 'no_show', done: 'completed',
  },
  table_status: {
    available: 'available', occupied: 'occupied', reserved: 'reserved',
    cleaning: 'cleaning', maintenance: 'maintenance', closed: 'closed',
  },
};

/**
 * Normalize a categorical value against an optional enum domain.
 * Returns { value, known }. When a domain is provided and the normalized value
 * is not a known canonical value, known=false so the caller can warn.
 */
function normalizeEnum(value, domain) {
  if (typeof value !== 'string') return { value, known: true };
  const s = normalizeCategorical(value);
  const map = ENUM_MAPS[domain];
  if (!map) return { value: s, known: true };
  const canonical = map[s];
  if (canonical !== undefined) return { value: canonical, known: true };
  return { value: s, known: false };
}

function formatNumber(n) {
  return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : String(n);
}

module.exports = {
  isEmpty,
  normalizeText,
  normalizeCategorical,
  parseNumber,
  parseInteger,
  parseTableNumber,
  knownServiceLocation,
  parseDate,
  toDate,
  normalizeEnum,
  ENUM_MAPS,
  formatNumber,
};
