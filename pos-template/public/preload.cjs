const { contextBridge, ipcRenderer } = require('electron');

// Helper to wrap IPC calls with error logging
function createIpcHandler(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args).catch((error) => {
    console.error(`❌ IPC Error on channel '${channel}':`, error.message);
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
  getDatabaseStats: () => createIpcHandler('get-database-stats'),
  
  // Produits
  getProducts: () => createIpcHandler('get-products'),
  addProduct: (product) => createIpcHandler('add-product', product),
  updateProduct: (id, product) => createIpcHandler('update-product', id, product),
  deleteProduct: (id) => createIpcHandler('delete-product', id),
  getProductsData: () => createIpcHandler('get-products-data'),
  
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
  
  // Inventaire
  getInventoryData: () => createIpcHandler('get-inventory-data'),
  
  // Sauvegarde
  saveBackup: (backupData) => createIpcHandler('save-backup', backupData),
  cleanupOldBackups: () => createIpcHandler('cleanup-old-backups'),
  
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
