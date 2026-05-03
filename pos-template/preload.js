const { contextBridge, ipcRenderer } = require('electron');

// Exposer les API sécurisées au renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration de l'application
  getAppConfig: () => ipcRenderer.invoke('get-app-config'),
  
  // Validation de licence
  validateLicense: () => ipcRenderer.invoke('validate-license'),
  
  // Gestion USB
  detectUSBDrives: () => ipcRenderer.invoke('detect-usb-drives'),
  
  // Base de données
  getDatabaseStats: () => ipcRenderer.invoke('get-database-stats'),
  
  // Produits
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),
  updateProduct: (id, product) => ipcRenderer.invoke('update-product', id, product),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  getProductsData: () => ipcRenderer.invoke('get-products-data'),
  
  // Ventes
  getSales: () => ipcRenderer.invoke('get-sales'),
  addSale: (sale) => ipcRenderer.invoke('add-sale', sale),
  getSaleDetails: (id) => ipcRenderer.invoke('get-sale-details', id),
  getSalesData: () => ipcRenderer.invoke('get-sales-data'),
  
  // Utilisateurs
  getUsers: () => ipcRenderer.invoke('get-users'),
  addUser: (user) => ipcRenderer.invoke('add-user', user),
  updateUser: (id, user) => ipcRenderer.invoke('update-user', id, user),
  deleteUser: (id) => ipcRenderer.invoke('delete-user', id),
  
  // Authentication & Setup
  needsFirstTimeSetup: () => ipcRenderer.invoke('needs-first-time-setup'),
  needsAdminPasswordReset: () => ipcRenderer.invoke('needs-admin-password-reset'),
  createAdminUser: (userData) => ipcRenderer.invoke('create-admin-user', userData),
  authenticateUser: (username, password) => ipcRenderer.invoke('authenticate-user', username, password),
  logout: (userId) => ipcRenderer.invoke('logout', userId),
  updateAdminPassword: (newPassword) => ipcRenderer.invoke('update-admin-password', newPassword),
  
  // Invoke method for dynamic IPC calls
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  
  // User Permissions
  getUserModules: (userId) => ipcRenderer.invoke('get-user-modules', userId),
  setUserModules: (userId, modules) => ipcRenderer.invoke('set-user-modules', userId, modules),
  checkUserPermission: (userId, module, action) => ipcRenderer.invoke('check-user-permission', userId, module, action),
  
  // Audit Logging
  logAuditEvent: (event) => ipcRenderer.invoke('log-audit-event', event),
  getAuditLogs: (filters) => ipcRenderer.invoke('get-audit-logs', filters),
  
  // Cash Drawer Events
  logCashDrawerEvent: (event) => ipcRenderer.invoke('log-cash-drawer-event', event),
  getCashDrawerHistory: (filters) => ipcRenderer.invoke('get-cash-drawer-history', filters),
  
  // Sessions
  getUserSessions: (userId) => ipcRenderer.invoke('get-user-sessions', userId),
  
  // Clients
  getCustomersData: () => ipcRenderer.invoke('get-customers-data'),
  
  // Inventaire
  getInventoryData: () => ipcRenderer.invoke('get-inventory-data'),
  
  // Sauvegarde
  saveBackup: (backupData) => ipcRenderer.invoke('save-backup', backupData),
  cleanupOldBackups: () => ipcRenderer.invoke('cleanup-old-backups'),
  
  // Événements
  onLicenseStatusChanged: (callback) => {
    ipcRenderer.on('license-status-changed', callback);
  },
  
  onDatabaseUpdated: (callback) => {
    ipcRenderer.on('database-updated', callback);
  }
  ,
  onDatabaseLocation: (callback) => {
    ipcRenderer.on('database-location', (event, dbPath) => callback(dbPath));
  }
});

