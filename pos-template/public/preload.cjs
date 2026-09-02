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
  activateLicense: () => createIpcHandler('activate-license'),
  
  // Gestion USB
  detectUSBDrives: () => createIpcHandler('detect-usb-drives'),
  
  // Base de données
  getDatabasePath: () => createIpcHandler('get-db-path'),
  getDatabaseStats: () => createIpcHandler('get-database-stats'),
  query: (sql, params) => createIpcHandler('database:query', sql, params),
  execute: (sql, params) => createIpcHandler('database:execute', sql, params),

  // Paramètres (Settings)
  getSetting: (key) => createIpcHandler('settings:get', key),
  setSetting: (key, value) => createIpcHandler('settings:set', key, value),
  getAllSettings: () => createIpcHandler('settings:getAll'),
  
  // Produits
  getProducts: () => createIpcHandler('get-products'),
  addProduct: (product, userRole) => createIpcHandler('add-product', product, userRole),
  updateProduct: (id, product, userRole) => createIpcHandler('update-product', id, product, userRole),
  deleteProduct: (id, userRole) => createIpcHandler('delete-product', id, userRole),
  
  // Familles de produits (Product Families)
  getFamilies: () => createIpcHandler('get-families'),
  addFamily: (family, description, icon) => createIpcHandler('add-family', family, description, icon),
  deleteFamily: (familyName) => createIpcHandler('delete-family', familyName),
  moveFamilyProducts: (oldFamily, newFamily) => createIpcHandler('update-product-family', oldFamily, newFamily),
  
  // Départements cuisine
  getKitchenDepartments: () => createIpcHandler('get-kitchen-departments'),
  addKitchenDepartment: (dept) => createIpcHandler('add-kitchen-department', dept),
  updateKitchenDepartment: (id, dept) => createIpcHandler('update-kitchen-department', id, dept),
  deleteKitchenDepartment: (id) => createIpcHandler('delete-kitchen-department', id),
  
  // Ventes
  getSales: () => createIpcHandler('get-sales'),
  addSale: (sale) => createIpcHandler('add-sale', sale),
  getSaleDetails: (id) => createIpcHandler('get-sale-details', id),
  getSalesData: () => createIpcHandler('get-sales-data'),
  getSalesHistory: (filters) => createIpcHandler('get-sales-history', filters),
  getSaleItems: (saleId) => createIpcHandler('get-sale-items', saleId),
  completePendingSale: (data) => createIpcHandler('complete-pending-sale', data),
  cancelSale: (saleId) => createIpcHandler('cancel-sale', saleId),
  
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
  bulkAddTables: (data) => createIpcHandler('bulk-add-tables', data),
  getTableAnalytics: () => createIpcHandler('table-analytics'),

  // Réservations
  getReservations: (filters) => createIpcHandler('get-reservations', filters),
  addReservation: (reservation) => createIpcHandler('add-reservation', reservation),
  updateReservation: (id, reservation) => createIpcHandler('update-reservation', id, reservation),
  deleteReservation: (id) => createIpcHandler('delete-reservation', id),

  // Zones
  getZones: () => createIpcHandler('get-zones'),
  addZone: (zone) => createIpcHandler('add-zone', zone),
  updateZone: (id, zone) => createIpcHandler('update-zone', id, zone),
  deleteZone: (id) => createIpcHandler('delete-zone', id),
  
  // Authentication & Setup
  needsFirstTimeSetup: () => createIpcHandler('needs-first-time-setup'),
  needsAdminPasswordReset: () => createIpcHandler('needs-admin-password-reset'),
  createAdminUser: (userData) => createIpcHandler('create-admin-user', userData),
  updateAdminPassword: (newPassword) => createIpcHandler('update-admin-password', newPassword),
  
  // Auth & Login Screen
  authenticateUser: (username, password) => createIpcHandler('authenticate-user', username, password),
  authenticateByPin: (userId, pin) => createIpcHandler('authenticate-by-pin', userId, pin),
  logout: (userId) => createIpcHandler('logout', userId),
  validateUserExists: (userId) => createIpcHandler('validate-user-exists', userId),
  changePassword: (userId, oldPassword, newPassword) => createIpcHandler('change-password', userId, oldPassword, newPassword),
  adminResetPassword: (userId, newPassword) => createIpcHandler('admin-reset-password', userId, newPassword),
  validatePassword: (password) => createIpcHandler('validate-password', password),
  validatePasswordDetailed: (password) => createIpcHandler('validate-password-detailed', password),
  getActiveUsersForLogin: () => createIpcHandler('get-active-users-for-login'),
  getRecentLogins: (limit) => createIpcHandler('get-recent-logins', limit),
  
  // PIN & Avatar Management
  setUserPin: (userId, pin, usePin) => createIpcHandler('set-user-pin', userId, pin, usePin),
  updateUserAvatar: (userId, avatarUrl) => createIpcHandler('update-user-avatar', userId, avatarUrl),
  
  // Session Management
  authSessionSet: (userId, userData) => createIpcHandler('auth-session-set', userId, userData),
  authSessionClear: () => createIpcHandler('auth-session-clear'),
  authSessionPing: () => createIpcHandler('auth-session-ping'),
  
  // User management (enhanced)
  getAllUsers: () => createIpcHandler('get-all-users'),
  
  // ── Rapports (dedicated handlers — no raw SQL from renderer) ──
  reportDashboard: (opts) => createIpcHandler('report:dashboard', opts),
  reportSalesByPeriod: (opts) => createIpcHandler('report:sales-by-period', opts),
  reportCategories: (opts) => createIpcHandler('report:categories', opts),
  reportTopProducts: (opts) => createIpcHandler('report:top-products', opts),
  reportTransactions: (opts) => createIpcHandler('report:transactions', opts),
  reportPaymentMethods: (opts) => createIpcHandler('report:payment-methods', opts),
  reportCashShifts: (opts) => createIpcHandler('report:cash-shifts', opts),
  reportCustomers: (opts) => createIpcHandler('report:customers', opts),
  reportCashiers: (opts) => createIpcHandler('report:cashiers', opts),
  reportRevenueTrends: (opts) => createIpcHandler('report:revenue-trends', opts),
  reportHourlyHeatmap: (opts) => createIpcHandler('report:hourly-heatmap', opts),

  // X/Z Reports
  generateXReport: (opts) => createIpcHandler('report:x-report', opts),
  generateZReport: (opts) => createIpcHandler('report:z-report', opts),
  getZReportHistory: (opts) => createIpcHandler('report:z-report-history', opts),
  getZReportDetail: (id) => createIpcHandler('report:z-report-detail', id),

  // Rapports — Export
  exportBiData: (opts) => createIpcHandler('bi:export', opts),
  exportReportPdf: (opts) => createIpcHandler('report:export-pdf', opts),
  exportReportCsv: (opts) => createIpcHandler('report:export-csv', opts),

  // Invoke method for dynamic IPC calls (also with error handling)
  invoke: (channel, ...args) => createIpcHandler(channel, ...args),
  
  // User Permissions
  getUserModules: (userId) => createIpcHandler('get-user-modules', userId),
  setUserModules: (userId, modules) => createIpcHandler('set-user-modules', userId, modules),
  checkUserPermission: (userId, module, action) => createIpcHandler('check-user-permission', userId, module, action),
  
  // Audit Logging
  logAuditEvent: (event) => createIpcHandler('log-audit-event', event),
  getAuditLogs: (filters) => createIpcHandler('get-audit-logs', filters),
  
  // Security Settings
  getSecuritySettings: () => createIpcHandler('get-security-settings'),
  updateSecuritySettings: (settings) => createIpcHandler('update-security-settings', settings),
  
  // Cash Drawer Events
  logCashDrawerEvent: (event) => createIpcHandler('log-cash-drawer-event', event),
  getCashDrawerHistory: (filters) => createIpcHandler('get-cash-drawer-history', filters),
  
  // Sessions
  getUserSessions: (userId) => createIpcHandler('get-user-sessions', userId),
  
  // Clients
  getCustomers: () => createIpcHandler('get-customers'),
  getCustomer: (id) => createIpcHandler('get-customer', id),
  addCustomer: (customer) => createIpcHandler('add-customer', customer),
  updateCustomer: (id, customer) => createIpcHandler('update-customer', id, customer),
  deleteCustomer: (id) => createIpcHandler('delete-customer', id),
  toggleCustomerActive: (id) => createIpcHandler('toggle-customer-active', id),
  getCustomerPurchases: (customerId) => createIpcHandler('get-customer-purchases', customerId),
  getCustomerStats: (customerId) => createIpcHandler('get-customer-stats', customerId),
  getCustomerFavoriteProducts: (customerId) => createIpcHandler('get-customer-favorite-products', customerId),
  getCustomerActivity: (customerId) => createIpcHandler('get-customer-activity', customerId),
  findCustomerDuplicates: () => createIpcHandler('find-customer-duplicates'),
  
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

  // TVA (VAT Rates)
  getVatRates: () => createIpcHandler('get-vat-rates'),
  addVatRate: (rate) => createIpcHandler('add-vat-rate', rate),
  updateVatRate: (id, rate) => createIpcHandler('update-vat-rate', id, rate),
  deleteVatRate: (id) => createIpcHandler('delete-vat-rate', id),

  // Rapports inventaire
  getMostConsumedProducts: () => createIpcHandler('stock:most-consumed'),
  getLeastConsumedProducts: () => createIpcHandler('stock:least-consumed'),
  getNeverSoldProducts: () => createIpcHandler('stock:never-sold'),
  getProductMovements: (productId, filters) => createIpcHandler('stock:get-product-movements', productId, filters),
  adjustStock: (data) => createIpcHandler('stock:adjust', data),
  getStockAlerts: () => createIpcHandler('stock:alerts'),
  getInventoryValue: () => createIpcHandler('stock:inventory-value'),

  // Configuration ticket (Receipt Designer)
  getReceiptConfig: () => createIpcHandler('get-receipt-config'),
  saveReceiptConfig: (config) => createIpcHandler('save-receipt-config', typeof config === 'string' ? config : JSON.stringify(config)),
  
  // Settings import/export/delete
  deleteSetting: (key) => createIpcHandler('settings:delete', key),
  exportSettings: () => createIpcHandler('settings:export'),
  importSettings: (jsonStr) => createIpcHandler('settings:import', jsonStr),
  
  // Services & Rendez-vous
  getServices: () => createIpcHandler('get-services'),
  addService: (service) => createIpcHandler('add-service', service),
  deleteService: (id) => createIpcHandler('delete-service', id),
  getAppointments: (date) => createIpcHandler('get-appointments', date),
  addAppointment: (appointment) => createIpcHandler('add-appointment', appointment),
  updateAppointmentStatus: (id, status) => createIpcHandler('update-appointment-status', id, status),
  
  // Cuisine (Kitchen Display System)
  getKitchenOrders: () => createIpcHandler('get-kitchen-orders'),
  getActiveKitchenOrders: () => createIpcHandler('get-active-kitchen-orders'),
  getKitchenOrder: (id) => createIpcHandler('get-kitchen-order', id),
  addKitchenOrder: (order) => createIpcHandler('add-kitchen-order', order),
  updateKitchenOrderStatus: (id, status) => createIpcHandler('update-kitchen-order-status', id, status),
  cancelKitchenOrder: (id, reason) => createIpcHandler('kitchen:cancel-order', id, reason),
  batchUpdateKitchenStatus: (ids, status) => createIpcHandler('kitchen:batch-status', ids, status),
  deleteKitchenOrder: (id) => createIpcHandler('kitchen:delete-order', id),
  getKitchenOrderStats: () => createIpcHandler('get-kitchen-order-stats'),
  getKitchenHistory: (filters) => createIpcHandler('kitchen:get-history', filters),
  getKitchenRecent: (limit) => createIpcHandler('kitchen:get-recent', limit),
  getKitchenDepartmentStats: () => createIpcHandler('kitchen:get-department-stats'),
  getKitchenDashboard: () => createIpcHandler('kitchen:get-dashboard'),
  getKitchenSlaSummary: () => createIpcHandler('kitchen:get-sla-summary'),
  getKitchenEmployeeStats: () => createIpcHandler('kitchen:get-employee-stats'),
  getKitchenProductAnalytics: () => createIpcHandler('kitchen:get-product-analytics'),
  getKitchenQueuePosition: (orderId) => createIpcHandler('kitchen:get-queue-position', orderId),
  autoPromoteKitchenPriorities: () => createIpcHandler('kitchen:auto-promote-priorities'),
  cancelSaleKitchenOrders: (saleId, reason) => createIpcHandler('kitchen:cancel-sale-orders', saleId, reason),
  // Kitchen real-time events
  onKitchenOrderCreated: (callback) => {
    ipcRenderer.on('kitchen:order-created', (_event, data) => callback(data));
  },
  onKitchenOrderUpdated: (callback) => {
    ipcRenderer.on('kitchen:order-updated', (_event, data) => callback(data));
  },
  onKitchenOrderCancelled: (callback) => {
    ipcRenderer.on('kitchen:order-cancelled', (_event, data) => callback(data));
  },
  onKitchenOrderDeleted: (callback) => {
    ipcRenderer.on('kitchen:order-deleted', (_event, data) => callback(data));
  },
  onKitchenBatchUpdated: (callback) => {
    ipcRenderer.on('kitchen:batch-updated', (_event, data) => callback(data));
  },
  removeKitchenListeners: () => {
    ipcRenderer.removeAllListeners('kitchen:order-created');
    ipcRenderer.removeAllListeners('kitchen:order-updated');
    ipcRenderer.removeAllListeners('kitchen:order-cancelled');
    ipcRenderer.removeAllListeners('kitchen:order-deleted');
    ipcRenderer.removeAllListeners('kitchen:batch-updated');
  },
  
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

  // ═══════════════════════════════════════════════════════════
  // Hardware Management
  // ═══════════════════════════════════════════════════════════

  // Printers
  getPrinters: () => createIpcHandler('hardware:getPrinters'),
  getPrinter: (id) => createIpcHandler('hardware:getPrinter', id),
  addPrinter: (printer) => createIpcHandler('hardware:addPrinter', printer),
  updatePrinter: (id, printer) => createIpcHandler('hardware:updatePrinter', id, printer),
  deletePrinter: (id) => createIpcHandler('hardware:deletePrinter', id),
  setDefaultPrinter: (id) => createIpcHandler('hardware:setDefaultPrinter', id),
  testPrinterConnection: (id) => createIpcHandler('hardware:testPrinterConnection', id),
  testPrinterPrint: (id) => createIpcHandler('hardware:testPrinterPrint', id),
  scanNetworkPrinters: (subnet) => createIpcHandler('hardware:scanNetworkPrinters', subnet),
  detectUSBPrinters: () => createIpcHandler('hardware:detectUSBPrinters'),
  detectWindowsPrinters: () => createIpcHandler('hardware:detectWindowsPrinters'),

  // Department Printer Routing
  getDepartmentRoutes: () => createIpcHandler('hardware:getDepartmentRoutes'),
  updateDepartmentRoute: (department, route) => createIpcHandler('hardware:updateDepartmentRoute', department, route),
  addDepartment: (department) => createIpcHandler('hardware:addDepartment', department),
  deleteDepartment: (department) => createIpcHandler('hardware:deleteDepartment', department),

  // Cash Drawer
  testCashDrawer: () => createIpcHandler('hardware:testCashDrawer'),
  openCashDrawer: () => createIpcHandler('hardware:openCashDrawer'),
  getCashDrawerStatusHw: () => createIpcHandler('hardware:getCashDrawerStatus'),

  // Backup
  createBackup: (options) => createIpcHandler('hardware:createBackup', options),
  getBackupHistory: () => createIpcHandler('hardware:getBackupHistory'),
  restoreBackup: (data) => createIpcHandler('hardware:restoreBackup', data),
  getBackupStatus: () => createIpcHandler('hardware:getBackupStatus'),

  // Notifications
  getNotificationSettingsHw: () => createIpcHandler('hardware:getNotificationSettings'),
  sendNotification: (data) => createIpcHandler('hardware:sendNotification', data),

  // Kiosk
  getKioskSettingsHw: () => createIpcHandler('hardware:getKioskSettings'),
  toggleKioskModeHw: () => createIpcHandler('hardware:toggleKioskMode'),

  // Keyboard
  getKeyboardSettingsHw: () => createIpcHandler('hardware:getKeyboardSettings'),

  // Hardware Dashboard
  getHardwareDashboard: () => createIpcHandler('hardware:getDashboardStatus'),

  // ═══════════════════════════════════════════════════════════

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
