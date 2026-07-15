const { contextBridge, ipcRenderer } = require('electron');

// Helper to wrap IPC calls with error logging
function createIpcHandler(channel, ...args) {
  console.log(`📡 IPC Call: ${channel}`, args.length > 0 ? `with args:` : '', args);
  return ipcRenderer.invoke(channel, ...args)
    .then((result) => {
      console.log(`✅ IPC Success: ${channel}`, result);
      return result;
    })
    .catch((error) => {
      console.error(`❌ IPC Error on channel '${channel}':`, error.message, error);
      throw error;
    });
}

// Exposer les API sécurisées au renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration de l'application
  getAppConfig: () => createIpcHandler('get-app-config'),
  
  // Validation de licence
  validateLicense: () => createIpcHandler('validate-license'),
  
  // Gestion USB
  detectUSBDrives: () => createIpcHandler('detect-usb-drives'),
  
  // Base de données
  getDatabasePath: () => createIpcHandler('get-db-path'),
  getDatabaseStats: () => createIpcHandler('get-database-stats'),
  query: (sql, params) => createIpcHandler('database:query', sql, params),

  // Paramètres (Settings)
  getSetting: (key) => createIpcHandler('settings:get', key),
  setSetting: (key, value) => createIpcHandler('settings:set', key, value),
  getAllSettings: () => createIpcHandler('settings:getAll'),
  
  // Produits
  getProducts: () => createIpcHandler('get-products'),
  addProduct: (product) => createIpcHandler('add-product', product),
  updateProduct: (id, product) => createIpcHandler('update-product', id, product),
  deleteProduct: (id) => createIpcHandler('delete-product', id),
  getProductsData: () => createIpcHandler('get-products-data'),
  
  // Familles de produits (Product Families)
  getFamilies: () => createIpcHandler('get-families'),
  addFamily: (family, description, icon) => createIpcHandler('add-family', family, description, icon),
  deleteFamily: (familyName) => createIpcHandler('delete-family', familyName),
  
  // Ventes
  getSales: () => createIpcHandler('get-sales'),
  addSale: (sale) => createIpcHandler('add-sale', sale),
  getSaleDetails: (id) => createIpcHandler('get-sale-details', id),
  getSalesData: () => createIpcHandler('get-sales-data'),
  
  // Utilisateurs
  getUsers: () => createIpcHandler('get-users'),
  addUser: (user) => createIpcHandler('add-user', user),
  updateUser: (id, user) => createIpcHandler('update-user', id, user),
  deleteUser: (id) => createIpcHandler('delete-user', id),
  
  // Tables
  getTables: () => createIpcHandler('get-tables'),
  addTable: (table) => createIpcHandler('add-table', table),
  updateTable: (id, table) => createIpcHandler('update-table', id, table),
  deleteTable: (id) => createIpcHandler('delete-table', id),
  updateTableStatus: (id, status) => createIpcHandler('update-table-status', id, status),
  
  // Authentication & Setup
  needsFirstTimeSetup: () => createIpcHandler('needs-first-time-setup'),
  needsAdminPasswordReset: () => createIpcHandler('needs-admin-password-reset'),
  createAdminUser: (userData) => createIpcHandler('create-admin-user', userData),
  authenticateUser: (username, password) => createIpcHandler('authenticate-user', username, password),
  logout: (userId) => createIpcHandler('logout', userId),
  updateAdminPassword: (newPassword) => createIpcHandler('update-admin-password', newPassword),
  
  // Invoke method for dynamic IPC calls (also with error handling)
  invoke: (channel, ...args) => createIpcHandler(channel, ...args),
  
  // User Permissions
  getUserModules: (userId) => createIpcHandler('get-user-modules', userId),
  setUserModules: (userId, modules) => createIpcHandler('set-user-modules', userId, modules),
  checkUserPermission: (userId, module, action) => createIpcHandler('check-user-permission', userId, module, action),
  
  // Audit Logging
  logAuditEvent: (event) => createIpcHandler('log-audit-event', event),
  getAuditLogs: (filters) => createIpcHandler('get-audit-logs', filters),
  
  // Cash Drawer Events
  logCashDrawerEvent: (event) => createIpcHandler('log-cash-drawer-event', event),
  getCashDrawerHistory: (filters) => createIpcHandler('get-cash-drawer-history', filters),
  
  // Sessions
  getUserSessions: (userId) => createIpcHandler('get-user-sessions', userId),
  
  // Clients
  getCustomersData: () => createIpcHandler('get-customers-data'),
  getCustomers: () => createIpcHandler('get-customers'),
  addCustomer: (customer) => createIpcHandler('add-customer', customer),
  updateCustomer: (id, customer) => createIpcHandler('update-customer', id, customer),
  deleteCustomer: (id) => createIpcHandler('delete-customer', id),
  getCustomerPurchases: (customerId) => createIpcHandler('get-customer-purchases', customerId),
  getCustomerStats: (customerId) => createIpcHandler('get-customer-stats', customerId),
  getCustomerFavoriteProducts: (customerId) => createIpcHandler('get-customer-favorite-products', customerId),
  
  // Inventaire — Mouvements de stock
  getStockMovements: (filters) => createIpcHandler('stock:get-movements', filters),
  addStockMovement: (data) => createIpcHandler('stock:add-movement', data),
  getStockSummary: () => createIpcHandler('stock:get-summary'),
  
  // Sauvegarde
  saveBackup: (backupData) => createIpcHandler('save-backup', backupData),
  cleanupOldBackups: () => createIpcHandler('cleanup-old-backups'),
  
  // BI Export
  exportBiData: () => createIpcHandler('bi:export'),
  
  // Fournisseurs
  getSuppliers: () => createIpcHandler('get-suppliers'),
  addSupplier: (supplier) => createIpcHandler('add-supplier', supplier),
  updateSupplier: (id, supplier) => createIpcHandler('update-supplier', id, supplier),
  deleteSupplier: (id) => createIpcHandler('delete-supplier', id),
  updateSupplierStatus: (id, isActive) => createIpcHandler('update-supplier-status', id, isActive),

  // Rapports inventaire
  getMostConsumedProducts: () => createIpcHandler('stock:most-consumed'),
  getProductMovements: (productId, filters) => createIpcHandler('stock:get-product-movements', productId, filters),

  // Configuration ticket (Receipt Designer)
  getReceiptConfig: () => createIpcHandler('settings:get', 'receiptConfig'),
  saveReceiptConfig: (config) => createIpcHandler('settings:set', 'receiptConfig', JSON.stringify(config)),
  
  // Services & Rendez-vous
  getServices: () => createIpcHandler('get-services'),
  addService: (service) => createIpcHandler('add-service', service),
  deleteService: (id) => createIpcHandler('delete-service', id),
  getAppointments: (date) => createIpcHandler('get-appointments', date),
  addAppointment: (appointment) => createIpcHandler('add-appointment', appointment),
  updateAppointmentStatus: (id, status) => createIpcHandler('update-appointment-status', id, status),
  
  // Cuisine
  getKitchenOrders: () => createIpcHandler('get-kitchen-orders'),
  getActiveKitchenOrders: () => createIpcHandler('get-active-kitchen-orders'),
  getKitchenOrder: (id) => createIpcHandler('get-kitchen-order', id),
  addKitchenOrder: (order) => createIpcHandler('add-kitchen-order', order),
  updateKitchenOrderStatus: (id, status) => createIpcHandler('update-kitchen-order-status', id, status),
  getKitchenOrderStats: () => createIpcHandler('get-kitchen-order-stats'),
  
  // Commandes en attente (Hold/Recall)
  holdOrder: (order) => createIpcHandler('hold-order', order),
  getHeldOrders: () => createIpcHandler('get-held-orders'),
  deleteHeldOrder: (id) => createIpcHandler('delete-held-order', id),
  restoreHeldOrder: (id) => createIpcHandler('restore-held-order', id),
  
  // Caisse (Cash Register)
  getActiveShift: () => createIpcHandler('caisse:get-active-shift'),
  openShift: (data) => createIpcHandler('caisse:open-shift', data),
  closeShift: (data) => createIpcHandler('caisse:close-shift', data),
  getShiftHistory: (filters) => createIpcHandler('caisse:get-shift-history', filters),
  getShiftDetail: (id) => createIpcHandler('caisse:get-shift-detail', id),
  getSalesTotalsForShift: (data) => createIpcHandler('caisse:get-sales-totals-for-shift', data),

  // Événements
  onLicenseStatusChanged: (callback) => {
    ipcRenderer.on('license-status-changed', callback);
  },
  
  onDatabaseUpdated: (callback) => {
    ipcRenderer.on('database-updated', callback);
  },
  
  onDatabaseLocation: (callback) => {
    ipcRenderer.on('database-location', (event, dbPath) => callback(dbPath));
  }
});

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ Preload script loaded successfully');
console.log('🔐 electronAPI exposed to renderer process');
console.log('═══════════════════════════════════════════════════════════');
