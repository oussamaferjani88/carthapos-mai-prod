// Système de gestion des permissions
export const PERMISSIONS = {
  // Permissions générales
  ALL: 'all',
  
  // Ventes et caisse
  SALES_READ: 'sales_read',
  SALES_CREATE: 'sales_create',
  SALES_UPDATE: 'sales_update',
  SALES_DELETE: 'sales_delete',
  
  // Produits
  PRODUCTS_READ: 'products_read',
  PRODUCTS_CREATE: 'products_create',
  PRODUCTS_UPDATE: 'products_update',
  PRODUCTS_DELETE: 'products_delete',
  
  // Stock/Inventaire
  INVENTORY_READ: 'inventory_read',
  INVENTORY_CREATE: 'inventory_create',
  INVENTORY_UPDATE: 'inventory_update',
  INVENTORY_DELETE: 'inventory_delete',
  
  // Clients
  CUSTOMERS_READ: 'customers_read',
  CUSTOMERS_CREATE: 'customers_create',
  CUSTOMERS_UPDATE: 'customers_update',
  CUSTOMERS_DELETE: 'customers_delete',
  
  // Rapports
  REPORTS_READ: 'reports_read',
  REPORTS_ADVANCED: 'reports_advanced',
  REPORTS_EXPORT: 'reports_export',
  
  // Utilisateurs
  USERS_READ: 'users_read',
  USERS_CREATE: 'users_create',
  USERS_UPDATE: 'users_update',
  USERS_DELETE: 'users_delete',
  
  // Tables (restaurant)
  TABLES_READ: 'tables_read',
  TABLES_UPDATE: 'tables_update',
  
  // Cuisine
  KITCHEN_READ: 'kitchen_read',
  KITCHEN_UPDATE: 'kitchen_update',
  
  // Configuration
  SETTINGS_READ: 'settings_read',
  SETTINGS_UPDATE: 'settings_update',
  
  // Modules spécialisés
  BARCODE_READ: 'barcode_read',
  LOYALTY_READ: 'loyalty_read',
  LOYALTY_UPDATE: 'loyalty_update',
  TAKEAWAY_READ: 'takeaway_read',
  TAKEAWAY_UPDATE: 'takeaway_update',
  GIFT_CARDS_READ: 'gift_cards_read',
  GIFT_CARDS_UPDATE: 'gift_cards_update',
  PRESCRIPTION_READ: 'prescription_read',
  PRESCRIPTION_UPDATE: 'prescription_update',
  PRODUCTION_READ: 'production_read',
  PRODUCTION_UPDATE: 'production_update',
  SUPPLIERS_READ: 'suppliers_read',
  SUPPLIERS_UPDATE: 'suppliers_update',
  PAYMENT_ADVANCED: 'payment_advanced'
};

// Groupes de permissions pour faciliter la gestion
export const PERMISSION_GROUPS = {
  sales: {
    label: 'Ventes',
    description: 'Gestion des ventes et transactions',
    permissions: [
      PERMISSIONS.SALES_READ,
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.SALES_UPDATE
    ]
  },
  products: {
    label: 'Produits',
    description: 'Consultation et gestion des produits',
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_CREATE,
      PERMISSIONS.PRODUCTS_UPDATE,
      PERMISSIONS.PRODUCTS_DELETE
    ]
  },
  inventory: {
    label: 'Stock',
    description: 'Gestion des stocks et inventaires',
    permissions: [
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_CREATE,
      PERMISSIONS.INVENTORY_UPDATE,
      PERMISSIONS.INVENTORY_DELETE
    ]
  },
  customers: {
    label: 'Clients',
    description: 'Gestion de la base clients',
    permissions: [
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_CREATE,
      PERMISSIONS.CUSTOMERS_UPDATE,
      PERMISSIONS.CUSTOMERS_DELETE
    ]
  },
  reports: {
    label: 'Rapports',
    description: 'Consultation des rapports et statistiques',
    permissions: [
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.REPORTS_ADVANCED,
      PERMISSIONS.REPORTS_EXPORT
    ]
  },
  users: {
    label: 'Utilisateurs',
    description: 'Gestion des comptes utilisateurs',
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.USERS_DELETE
    ]
  },
  tables: {
    label: 'Tables',
    description: 'Gestion des tables (restaurant)',
    permissions: [
      PERMISSIONS.TABLES_READ,
      PERMISSIONS.TABLES_UPDATE
    ]
  },
  kitchen: {
    label: 'Cuisine',
    description: 'Interface cuisine et commandes',
    permissions: [
      PERMISSIONS.KITCHEN_READ,
      PERMISSIONS.KITCHEN_UPDATE
    ]
  },
  settings: {
    label: 'Paramètres',
    description: 'Configuration du système',
    permissions: [
      PERMISSIONS.SETTINGS_READ,
      PERMISSIONS.SETTINGS_UPDATE
    ]
  }
};

// Rôles prédéfinis avec leurs permissions
export const ROLES = {
  ADMIN: {
    id: 'admin',
    label: 'Administrateur',
    description: 'Accès complet au système',
    permissions: [PERMISSIONS.ALL]
  },
  MANAGER: {
    id: 'manager',
    label: 'Manager',
    description: 'Gestion avancée sans administration',
    permissions: [
      PERMISSIONS.SALES_READ,
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.SALES_UPDATE,
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_UPDATE,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_UPDATE,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_CREATE,
      PERMISSIONS.CUSTOMERS_UPDATE,
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.REPORTS_ADVANCED,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.TABLES_READ,
      PERMISSIONS.TABLES_UPDATE,
      PERMISSIONS.SETTINGS_READ
    ]
  },
  CASHIER: {
    id: 'cashier',
    label: 'Caissier',
    description: 'Interface de vente standard',
    permissions: [
      PERMISSIONS.SALES_READ,
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_CREATE,
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.TABLES_READ
    ]
  },
  KITCHEN: {
    id: 'kitchen',
    label: 'Cuisine',
    description: 'Interface cuisine uniquement',
    permissions: [
      PERMISSIONS.KITCHEN_READ,
      PERMISSIONS.KITCHEN_UPDATE,
      PERMISSIONS.TABLES_READ
    ]
  }
};

// Classe pour gérer les permissions
export class PermissionManager {
  constructor(userPermissions = []) {
    this.userPermissions = userPermissions || [];
  }

  // Vérifie si l'utilisateur a une permission spécifique
  hasPermission(permission) {
    if (this.userPermissions.includes(PERMISSIONS.ALL)) {
      return true;
    }
    return this.userPermissions.includes(permission);
  }

  // Vérifie si l'utilisateur a toutes les permissions d'un groupe
  hasPermissionGroup(groupKey) {
    const group = PERMISSION_GROUPS[groupKey];
    if (!group) return false;
    
    return group.permissions.every(permission => this.hasPermission(permission));
  }

  // Vérifie si l'utilisateur a au moins une permission d'un groupe
  hasAnyPermissionFromGroup(groupKey) {
    const group = PERMISSION_GROUPS[groupKey];
    if (!group) return false;
    
    return group.permissions.some(permission => this.hasPermission(permission));
  }

  // Obtient toutes les permissions disponibles pour l'affichage
  static getAllPermissions() {
    return Object.values(PERMISSIONS);
  }

  // Obtient les groupes de permissions pour l'interface d'administration
  static getPermissionGroups() {
    return PERMISSION_GROUPS;
  }

  // Obtient les permissions d'un rôle
  static getRolePermissions(roleId) {
    const role = Object.values(ROLES).find(r => r.id === roleId);
    return role ? role.permissions : [];
  }

  // Filtre les modules de navigation selon les permissions
  filterNavigationModules(modules, userPermissions) {
    const pm = new PermissionManager(userPermissions);
    
    return modules.filter(module => {
      switch (module.href) {
        case 'sales':
          return pm.hasPermission(PERMISSIONS.SALES_READ);
        case 'products':
          return pm.hasPermission(PERMISSIONS.PRODUCTS_READ);
        case 'inventory':
          return pm.hasPermission(PERMISSIONS.INVENTORY_READ);
        case 'customers':
          return pm.hasPermission(PERMISSIONS.CUSTOMERS_READ);
        case 'reports':
          return pm.hasPermission(PERMISSIONS.REPORTS_READ);
        case 'user-management':
          return pm.hasPermission(PERMISSIONS.USERS_READ);
        case 'tables':
          return pm.hasPermission(PERMISSIONS.TABLES_READ);
        case 'kitchen':
          return pm.hasPermission(PERMISSIONS.KITCHEN_READ);
        case 'settings':
          return pm.hasPermission(PERMISSIONS.SETTINGS_READ);
        case 'barcode':
          return pm.hasPermission(PERMISSIONS.BARCODE_READ);
        case 'loyalty':
          return pm.hasPermission(PERMISSIONS.LOYALTY_READ);
        case 'takeaway':
          return pm.hasPermission(PERMISSIONS.TAKEAWAY_READ);
        case 'gift-cards':
          return pm.hasPermission(PERMISSIONS.GIFT_CARDS_READ);
        case 'prescription':
          return pm.hasPermission(PERMISSIONS.PRESCRIPTION_READ);
        case 'production':
          return pm.hasPermission(PERMISSIONS.PRODUCTION_READ);
        case 'suppliers':
          return pm.hasPermission(PERMISSIONS.SUPPLIERS_READ);
        case 'payment-advanced':
          return pm.hasPermission(PERMISSIONS.PAYMENT_ADVANCED);
        case 'dashboard':
          return true; // Dashboard always accessible
        default:
          return true;
      }
    });
  }

  // Génère des permissions personnalisées pour un caissier
  static generateCashierPermissions(selectedGroups = []) {
    let permissions = [
      // Permissions de base toujours accordées
      PERMISSIONS.SALES_READ,
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.PRODUCTS_READ
    ];

    // Ajouter les permissions selon les groupes sélectionnés
    selectedGroups.forEach(groupKey => {
      const group = PERMISSION_GROUPS[groupKey];
      if (group) {
        permissions = [...permissions, ...group.permissions];
      }
    });

    // Supprimer les doublons
    return [...new Set(permissions)];
  }
}

export default PermissionManager;

// ============================================================================
// ADMIN DASHBOARD RBAC — dot-notation permission catalog
// Mirrors the server-side app_permissions catalog (backend/utils/permissionCatalog.js).
// ============================================================================

export const ADMIN_PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',

  CLIENTS_VIEW: 'clients.view',
  CLIENTS_CREATE: 'clients.create',
  CLIENTS_UPDATE: 'clients.update',
  CLIENTS_DELETE: 'clients.delete',

  LICENSES_VIEW: 'licenses.view',
  LICENSES_CREATE: 'licenses.create',
  LICENSES_UPDATE: 'licenses.update',
  LICENSES_SUSPEND: 'licenses.suspend',
  LICENSES_REVOKE: 'licenses.revoke',
  LICENSES_DELETE: 'licenses.delete',

  MODULES_VIEW: 'modules.view',
  MODULES_MANAGE: 'modules.manage',

  POS_VIEW: 'pos.view',
  POS_GENERATE: 'pos.generate',
  POS_BUILD: 'pos.build',

  USB_VIEW: 'usb.view',
  USB_WRITE: 'usb.write',

  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_PERMISSIONS: 'users.permissions',

  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_EDIT: 'products.edit',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_EDIT: 'inventory.edit',

  BI_VIEW: 'bi.view',
  BI_REQUESTS: 'bi.requests',
  BI_ASSIGNMENTS: 'bi.assignments',
  BI_NOTIFICATIONS: 'bi.notifications',
  BI_IMPORT: 'bi.import',
  BI_HISTORY: 'bi.history',
};

export const ADMIN_PERMISSION_GROUPS = [
  {
    key: 'clients',
    label: 'Clients',
    description: 'Gestion de la base clients',
    permissions: [ADMIN_PERMISSIONS.CLIENTS_VIEW, ADMIN_PERMISSIONS.CLIENTS_CREATE, ADMIN_PERMISSIONS.CLIENTS_UPDATE, ADMIN_PERMISSIONS.CLIENTS_DELETE],
  },
  {
    key: 'licenses',
    label: 'Licences',
    description: 'Gestion du cycle de vie des licences',
    permissions: [ADMIN_PERMISSIONS.LICENSES_VIEW, ADMIN_PERMISSIONS.LICENSES_CREATE, ADMIN_PERMISSIONS.LICENSES_UPDATE, ADMIN_PERMISSIONS.LICENSES_SUSPEND, ADMIN_PERMISSIONS.LICENSES_REVOKE, ADMIN_PERMISSIONS.LICENSES_DELETE],
  },
  {
    key: 'modules',
    label: 'Modules',
    description: 'Catalogue des modules',
    permissions: [ADMIN_PERMISSIONS.MODULES_VIEW, ADMIN_PERMISSIONS.MODULES_MANAGE],
  },
  {
    key: 'pos',
    label: 'Générateur POS',
    description: 'Génération et compilation de POS',
    permissions: [ADMIN_PERMISSIONS.POS_VIEW, ADMIN_PERMISSIONS.POS_GENERATE, ADMIN_PERMISSIONS.POS_BUILD],
  },
  {
    key: 'usb',
    label: 'Gestion USB',
    description: 'Écriture et vérification de licences USB',
    permissions: [ADMIN_PERMISSIONS.USB_VIEW, ADMIN_PERMISSIONS.USB_WRITE],
  },
  {
    key: 'users',
    label: 'Utilisateurs',
    description: 'Comptes et permissions (réservé SUPER_ADMIN côté serveur)',
    permissions: [ADMIN_PERMISSIONS.USERS_VIEW, ADMIN_PERMISSIONS.USERS_CREATE, ADMIN_PERMISSIONS.USERS_UPDATE, ADMIN_PERMISSIONS.USERS_DELETE, ADMIN_PERMISSIONS.USERS_PERMISSIONS],
  },
  {
    key: 'reports',
    label: 'Rapports',
    description: 'Rapports et statistiques agrégées',
    permissions: [ADMIN_PERMISSIONS.REPORTS_VIEW, ADMIN_PERMISSIONS.REPORTS_EXPORT],
  },
  {
    key: 'products',
    label: 'Produits',
    description: 'Catalogue produits (POS)',
    permissions: [ADMIN_PERMISSIONS.PRODUCTS_VIEW, ADMIN_PERMISSIONS.PRODUCTS_EDIT],
  },
  {
    key: 'inventory',
    label: 'Stock',
    description: 'État et ajustements de stock (POS)',
    permissions: [ADMIN_PERMISSIONS.INVENTORY_VIEW, ADMIN_PERMISSIONS.INVENTORY_EDIT],
  },
  {
    key: 'bi',
    label: 'BI Analytics',
    description: 'Demandes, imports, tableaux de bord BI',
    permissions: [ADMIN_PERMISSIONS.BI_VIEW, ADMIN_PERMISSIONS.BI_REQUESTS, ADMIN_PERMISSIONS.BI_ASSIGNMENTS, ADMIN_PERMISSIONS.BI_NOTIFICATIONS, ADMIN_PERMISSIONS.BI_IMPORT, ADMIN_PERMISSIONS.BI_HISTORY],
  },
];

// href -> required permission for the admin sidebar
const ADMIN_NAV_PERMISSION_MAP = {
  '/': null,
  '/clients': ADMIN_PERMISSIONS.CLIENTS_VIEW,
  '/licenses': ADMIN_PERMISSIONS.LICENSES_VIEW,
  '/modules': ADMIN_PERMISSIONS.MODULES_VIEW,
  '/pos-generator': ADMIN_PERMISSIONS.POS_VIEW,
  '/pos-projects': ADMIN_PERMISSIONS.POS_VIEW,
  '/usb-manager': ADMIN_PERMISSIONS.USB_VIEW,
  '/user-management': ADMIN_PERMISSIONS.USERS_VIEW,
  '/bi-requests': ADMIN_PERMISSIONS.BI_REQUESTS,
  '/bi-assignments': ADMIN_PERMISSIONS.BI_ASSIGNMENTS,
  '/bi-notifications': ADMIN_PERMISSIONS.BI_NOTIFICATIONS,
  '/bi-wizard': ADMIN_PERMISSIONS.BI_IMPORT,
  '/bi-upload-portal': ADMIN_PERMISSIONS.BI_HISTORY,
};

// Required permission to open a route (used by route guards)
export const ADMIN_ROUTE_PERMISSIONS = {
  '/clients': ADMIN_PERMISSIONS.CLIENTS_VIEW,
  '/licenses': ADMIN_PERMISSIONS.LICENSES_VIEW,
  '/modules': ADMIN_PERMISSIONS.MODULES_VIEW,
  '/pos-generator': ADMIN_PERMISSIONS.POS_VIEW,
  '/pos-projects': ADMIN_PERMISSIONS.POS_VIEW,
  '/usb-manager': ADMIN_PERMISSIONS.USB_VIEW,
  '/user-management': ADMIN_PERMISSIONS.USERS_VIEW,
  '/bi-requests': ADMIN_PERMISSIONS.BI_REQUESTS,
  '/bi-assignments': ADMIN_PERMISSIONS.BI_ASSIGNMENTS,
  '/bi-notifications': ADMIN_PERMISSIONS.BI_NOTIFICATIONS,
  '/bi-wizard': ADMIN_PERMISSIONS.BI_IMPORT,
  '/bi-upload-portal': ADMIN_PERMISSIONS.BI_HISTORY,
};

/**
 * Filter the admin sidebar navigation groups by the current user's permissions.
 * @param {Array} groups - navigationGroups from Layout.jsx
 * @param {PermissionManager} pm
 * @param {{isSuperAdmin?: boolean}} options
 */
export function filterAdminNavigation(groups, pm, options = {}) {
  const { isSuperAdmin = false } = options;
  const visible = (href) => {
    if (href === '/') return true;
    // User management is SUPER_ADMIN-only server-side — mirror that in the UI.
    if (href === '/user-management') return isSuperAdmin;
    const required = ADMIN_NAV_PERMISSION_MAP[href];
    if (!required) return true;
    return pm.hasPermission(required);
  };

  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => visible(i.href)) }))
    .filter((g) => g.items.length > 0);
}
