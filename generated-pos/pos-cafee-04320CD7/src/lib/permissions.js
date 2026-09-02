// Canonical per-module permission keys + helpers.
// Shared by the admin permissions dialog (UserManagementAdvanced) and the
// runtime enforcement layer (PermissionsContext / PermissionRoute / pages).

// Legacy or duplicate `module_name` values folded onto a single canonical key.
// Kept so permissions granted before a module was renamed/merged still apply.
export const MODULE_ALIASES = {
  pos: 'sales',
  caisse: 'sales',
  vente: 'sales',
  ventes: 'sales',
  'customer-management': 'customers',
  'gift-cards': 'gift_cards',
  'menu-management': 'products',
  menu: 'products',
  // "Produits" page and "Gestion de stock" are the same feature — fold products
  // onto inventory so granting stock rights also controls the products page.
  products: 'inventory',
};

export const canonicalModule = (name) => {
  const seen = new Set();
  let key = name;
  while (MODULE_ALIASES[key] && !seen.has(key)) {
    seen.add(key);
    key = MODULE_ALIASES[key];
  }
  return key;
};

// Super admin (first user, id 1) and regular admins share full access.
export const isAdminRole = (role) => role === 'admin' || role === 'superadmin';

const ALL = { read: true, create: true, update: true, delete: true };
const NONE = { read: false, create: false, update: false, delete: false };
const READ_ONLY = { read: true, create: false, update: false, delete: false };

// Cashier role defaults (no explicit permission rows configured): only the
// caisse (sales, lecture + écriture so a cashier can finalize sales) and
// reports (lecture seule). Everything else is off until the admin grants it.
const CASHIER_DEFAULTS = {
  sales: { ...ALL },
  reports: { ...READ_ONLY },
};

// Role-based fallback — used ONLY when a user has zero per-module permission
// rows (fresh install, admin never opened the permissions dialog, demo mode).
// Once an admin saves the dialog, the stored rows take over completely.
export function roleDefaults(role, moduleKey) {
  const key = canonicalModule(moduleKey);
  if (isAdminRole(role)) return { ...ALL };
  if (role === 'manager') return key === 'user-management' ? { ...NONE } : { ...ALL };
  // cashier / unknown
  return CASHIER_DEFAULTS[key] ? { ...CASHIER_DEFAULTS[key] } : { ...NONE };
}

// Role-based starting point for the admin permissions dialog. The super admin
// can edit any entry before saving; saving materializes these as real rows
// that then strictly override the role defaults at runtime.
export function roleModuleDefaults(role, modules) {
  const defaults = {};
  (modules || []).forEach((m) => {
    const id = m.id || m;
    const key = canonicalModule(id);
    if (id === 'user-management') {
      // Never enabled by default — only granted explicitly by the admin.
      defaults[id] = { ...NONE };
    } else if (isAdminRole(role) || role === 'manager') {
      defaults[id] = { ...ALL };
    } else {
      defaults[id] = CASHIER_DEFAULTS[key] ? { ...CASHIER_DEFAULTS[key] } : { ...NONE };
    }
  });
  return defaults;
}

export const PERMISSION_PRESETS = { ALL, NONE, READ_ONLY };
