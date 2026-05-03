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
    this.userPermissions = userPermissions;
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
