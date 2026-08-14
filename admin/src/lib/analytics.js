import api from './api';

// ─── Analytics API wrapper (routes mounted at /api/bi/analytics) ──
export const analyticsApi = {
  get: (path, params) => api.get(`/bi/analytics${path}`, { params }),
  overview: (params) => api.get('/bi/analytics/overview', { params }),
  trend: (params) => api.get('/bi/analytics/trend', { params }),
  paymentMix: (params) => api.get('/bi/analytics/payment-mix', { params }),
  peakHours: (params) => api.get('/bi/analytics/peak-hours', { params }),
  weekday: (params) => api.get('/bi/analytics/weekday', { params }),
  categories: (params) => api.get('/bi/analytics/categories', { params }),
  products: (params) => api.get('/bi/analytics/products', { params }),
  customers: (params) => api.get('/bi/analytics/customers', { params }),
  employees: (params) => api.get('/bi/analytics/employees', { params }),
  tables: (params) => api.get('/bi/analytics/tables', { params }),
  kitchen: (params) => api.get('/bi/analytics/kitchen', { params }),
  inventory: (params) => api.get('/bi/analytics/inventory', { params }),
  shifts: (params) => api.get('/bi/analytics/shifts', { params }),
  reservations: (params) => api.get('/bi/analytics/reservations', { params }),
  insights: (params) => api.get('/bi/analytics/insights', { params }),
  filters: (params) => api.get('/bi/analytics/filters', { params }),
  status: (params) => api.get('/bi/analytics/status', { params }),
  drilldown: (params) => api.get('/bi/analytics/drilldown', { params }),
  refresh: (clientId) => api.post('/bi/analytics/refresh', { clientId }),
};

// ─── CSV export helper ───────────────────────────────────────────
export function exportCsv(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Date helpers ────────────────────────────────────────────────
export const toDateStr = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const datePresets = [
  { id: 'all', label: 'Toute la période', range: null },
  { id: '7d', label: '7 derniers jours', days: 7 },
  { id: '30d', label: '30 derniers jours', days: 30 },
  { id: 'thisMonth', label: 'Ce mois-ci' },
  { id: 'lastMonth', label: 'Mois dernier' },
  { id: 'thisYear', label: 'Cette année' },
];

export function resolvePreset(preset) {
  if (preset === 'all' || !preset) return { from: null, to: null };
  if (preset === '7d' || preset === '30d') {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (preset === '7d' ? 6 : 29));
    return { from: toDateStr(from), to: toDateStr(to) };
  }
  const now = new Date();
  if (preset === 'thisMonth') {
    return { from: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDateStr(now) };
  }
  if (preset === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toDateStr(from), to: toDateStr(to) };
  }
  if (preset === 'thisYear') {
    return { from: `${now.getFullYear()}-01-01`, to: toDateStr(now) };
  }
  return { from: null, to: null };
}

// ─── Formatting ──────────────────────────────────────────────────
export function fmtMoney(v, currency = 'TND') {
  if (v === null || v === undefined || isNaN(v)) return '\u2014';
  return `${Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function fmtNum(v) {
  if (v === null || v === undefined || isNaN(v)) return '\u2014';
  return Number(v).toLocaleString('fr-FR');
}

export function fmtPct(v, digits = 1) {
  if (v === null || v === undefined || isNaN(v)) return '\u2014';
  return `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: digits })} %`;
}

export function fmtDuration(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '\u2014';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function fmtHour(h) {
  if (h === null || h === undefined) return '\u2014';
  return `${String(h).padStart(2, '0')}:00`;
}

// ─── Chart palette (shadcn-ish, works in light/dark) ─────────────
export const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];
export const PIE_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#6366f1', '#ef4444', '#84cc16'];

// Detect if the sample data is a demo (from a debug fake) or real.
export const isNotEmpty = (arr) => Array.isArray(arr) && arr.length > 0;
