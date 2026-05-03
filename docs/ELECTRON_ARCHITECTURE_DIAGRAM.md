# 🏗️ Electron Modular Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RENDERER PROCESS (React App)                        │
│                                                                             │
│  Components → useEffect() → window.electronAPI.needsFirstTimeSetup()       │
│                                      ↓                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ IPC (Inter-Process Communication)
                                       ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PRELOAD SCRIPT (preload.js)                           │
│                                                                             │
│  contextBridge.exposeInMainWorld('electronAPI', {                          │
│    needsFirstTimeSetup: () => ipcRenderer.invoke('needs-first-time-setup')│
│    authenticateUser: (u, p) => ipcRenderer.invoke('authenticate-user', ...)│
│  })                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │
                                       ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                  MAIN PROCESS (electron-modular.cjs)                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    1. INITIALIZATION                                 │  │
│  │  • Setup LoggerService                                               │  │
│  │  • Initialize Managers (DB, Auth, Window, License)                   │  │
│  │  • Load App Config from USB                                          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                  ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │              2. REGISTER IPC HANDLERS (Before app.whenReady)         │  │
│  │                                                                       │  │
│  │  registerAuthHandlers(initializeManagers)       ← CRITICAL FIRST     │  │
│  │  registerDatabaseHandlers(() => db)                                  │  │
│  │  registerAppHandlers(loadAppConfig, initDB)                          │  │
│  │  registerLicenseHandlers(detectUSB, loadConfig)                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                  ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                   3. APP STARTUP (app.whenReady)                     │  │
│  │                                                                       │  │
│  │  • Initialize Database                                               │  │
│  │  • Register Business Logic Handlers:                                 │  │
│  │    - registerSalesHandlers(db)                                       │  │
│  │    - registerCustomerHandlers(db)                                    │  │
│  │    - registerKitchenHandlers(db)                                     │  │
│  │    - registerServiceHandlers(db)                                     │  │
│  │    - registerSupplierHandlers(db)                                    │  │
│  │  • Create Main Window                                                │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HANDLER MODULES                                   │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐  │
│  │ ipc-auth-handlers    │  │ ipc-sales-handlers   │  │ ipc-customer-   │  │
│  │                      │  │                      │  │ handlers        │  │
│  │ • needs-setup        │  │ • get-sales          │  │ • get-customers │  │
│  │ • create-admin       │  │ • add-sale           │  │ • add-customer  │  │
│  │ • authenticate       │  │ • sale-details       │  │ • update        │  │
│  │ • logout             │  │                      │  │ • delete        │  │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────┘  │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐  │
│  │ ipc-kitchen-handlers │  │ ipc-service-handlers │  │ ipc-supplier-   │  │
│  │                      │  │                      │  │ handlers        │  │
│  │ • get-orders         │  │ • get-appointments   │  │ • get-suppliers │  │
│  │ • add-order          │  │ • add-appointment    │  │ • add-supplier  │  │
│  │ • update-status      │  │ • get-services       │  │ • update        │  │
│  │                      │  │ • add-service        │  │ • delete        │  │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────┘  │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │ ipc-license-handlers │  │ ipc-database-        │                        │
│  │                      │  │ handlers             │                        │
│  │ • get-app-config     │  │ • get-stats          │                        │
│  │ • validate-license   │  │ • backup             │                        │
│  │ • detect-usb         │  │ • restore            │                        │
│  └──────────────────────┘  └──────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MANAGER LAYER                                    │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐  │
│  │ ElectronDatabase     │  │ ElectronAuth         │  │ ElectronWindow  │  │
│  │ Manager              │  │ Manager              │  │ Manager         │  │
│  │                      │  │                      │  │                 │  │
│  │ • initializeDB()     │  │ • needsSetup()       │  │ • createWindow()│  │
│  │ • createBackup()     │  │ • createAdmin()      │  │ • manageWindow()│  │
│  │ • runMigrations()    │  │ • authenticate()     │  │                 │  │
│  │ • getBusinessName()  │  │ • checkPermission()  │  │                 │  │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────┘  │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │ ElectronLicense      │  │ LoggerService        │                        │
│  │ Manager              │  │                      │                        │
│  │                      │  │ • writeLog()         │                        │
│  │ • validateLicense()  │  │ • formatMessage()    │                        │
│  │ • loadFromUSB()      │  │ • getLogPath()       │                        │
│  └──────────────────────┘  └──────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA PERSISTENCE LAYER                              │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       SQLite Database                                 │  │
│  │                                                                       │  │
│  │  Location: {InstallDir}\data\{BusinessName}.db                       │  │
│  │  Backups:  %APPDATA%\{BusinessName}\backups\                         │  │
│  │                                                                       │  │
│  │  Tables:                                                              │  │
│  │  • users                  • sales               • products            │  │
│  │  • customers              • kitchen_orders      • appointments        │  │
│  │  • services               • suppliers           • audit_logs          │  │
│  │  • user_modules           • user_sessions                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Example: User Authentication

```
1. USER ACTION
   ↓
   User enters username/password in Login screen (React)

2. RENDERER PROCESS
   ↓
   const result = await window.electronAPI.authenticateUser(username, password)

3. PRELOAD BRIDGE
   ↓
   ipcRenderer.invoke('authenticate-user', username, password)

4. MAIN PROCESS (electron-modular.cjs)
   ↓
   ipcMain.handle('authenticate-user', ...) registered by ipc-auth-handlers.js

5. AUTH HANDLER (ipc-auth-handlers.js)
   ↓
   await initializeManagers()
   ↓
   return await authManager.authenticateUser(username, password)

6. AUTH MANAGER (ElectronAuthManager.js)
   ↓
   • Hash password with bcrypt
   • Query database via dbManager
   • Create session
   • Log audit trail
   • Return user object + token

7. RESPONSE FLOW (Reverse)
   ↓
   Auth Handler → IPC Main → Preload → Renderer → React Component

8. UI UPDATE
   ↓
   • Store user in React state
   • Redirect to dashboard
   • Show welcome message
```

## 📊 Module Dependencies

```
electron-modular.cjs
├── depends on: LoggerService
├── depends on: ElectronDatabaseManager
├── depends on: ElectronAuthManager
├── depends on: ElectronWindowManager
├── depends on: ElectronLicenseManager
├── imports: ipc-auth-handlers
├── imports: ipc-database-handlers
├── imports: ipc-app-handlers
├── imports: ipc-license-handlers
├── imports: ipc-sales-handlers
├── imports: ipc-customer-handlers
├── imports: ipc-kitchen-handlers
├── imports: ipc-service-handlers
└── imports: ipc-supplier-handlers

ipc-auth-handlers
└── depends on: ElectronAuthManager (via initializeManagers)

ipc-sales-handlers
├── depends on: db (SQLite instance)
└── indirectly uses: ElectronDatabaseManager

ipc-customer-handlers
├── depends on: db (SQLite instance)
└── indirectly uses: ElectronDatabaseManager

ipc-kitchen-handlers
├── depends on: db (SQLite instance)
└── indirectly uses: ElectronDatabaseManager

ipc-service-handlers
├── depends on: db (SQLite instance)
└── indirectly uses: ElectronDatabaseManager

ipc-supplier-handlers
├── depends on: db (SQLite instance)
└── indirectly uses: ElectronDatabaseManager

ElectronAuthManager
└── depends on: ElectronDatabaseManager

ElectronDatabaseManager
└── depends on: fs, path, sqlite3, app
```

## 🎯 Critical Registration Order

```
PHASE 1: BEFORE app.whenReady() ⚠️ CRITICAL
├── registerAuthHandlers()         ← MUST BE FIRST (first-time setup needs this)
├── registerDatabaseHandlers()
├── registerAppHandlers()
└── registerLicenseHandlers()

PHASE 2: AFTER app.whenReady() AND database initialized
├── initializeDatabase()
├── registerSalesHandlers(db)      ← Needs db instance
├── registerCustomerHandlers(db)   ← Needs db instance
├── registerKitchenHandlers(db)    ← Needs db instance
├── registerServiceHandlers(db)    ← Needs db instance
└── registerSupplierHandlers(db)   ← Needs db instance
```

**Why this order matters:**

1. **Auth handlers FIRST**: The renderer process calls `needsFirstTimeSetup()` immediately on mount. If handler not registered, app crashes with "No handler registered" error.

2. **Database handlers EARLY**: App config and license validation may need database access.

3. **Business handlers AFTER db init**: Sales, customers, etc. all need the `db` instance, so must wait until database is initialized.

## 🔍 Handler Lookup Table

| Handler Name | Module | Purpose | Dependencies |
|-------------|--------|---------|--------------|
| `needs-first-time-setup` | ipc-auth-handlers | Check if admin exists | authManager |
| `create-admin-user` | ipc-auth-handlers | Create first admin | authManager, dbManager |
| `authenticate-user` | ipc-auth-handlers | Login user | authManager |
| `logout` | ipc-auth-handlers | Logout user | authManager |
| `get-user-modules` | ipc-auth-handlers | Get user permissions | authManager |
| `set-user-modules` | ipc-auth-handlers | Set user permissions | authManager |
| `check-user-permission` | ipc-auth-handlers | Check permission | authManager |
| `get-database-stats` | ipc-database-handlers | DB statistics | db |
| `backup-database` | ipc-database-handlers | Create backup | dbManager |
| `get-app-config` | ipc-license-handlers | Get config | loadAppConfig() |
| `validate-license` | ipc-license-handlers | Check license | loadAppConfig() |
| `detect-usb-drives` | ipc-license-handlers | Find USB | detectUSBDrives() |
| `get-sales` | ipc-sales-handlers | Fetch sales | db |
| `add-sale` | ipc-sales-handlers | Create sale | db |
| `get-sale-details` | ipc-sales-handlers | Sale detail | db |
| `get-customers` | ipc-customer-handlers | Fetch customers | db |
| `add-customer` | ipc-customer-handlers | Create customer | db |
| `update-customer` | ipc-customer-handlers | Update customer | db |
| `delete-customer` | ipc-customer-handlers | Delete customer | db |
| `get-kitchen-orders` | ipc-kitchen-handlers | Fetch orders | db |
| `add-kitchen-order` | ipc-kitchen-handlers | Create order | db |
| `update-kitchen-order-status` | ipc-kitchen-handlers | Update status | db |
| `get-appointments` | ipc-service-handlers | Fetch appointments | db |
| `add-appointment` | ipc-service-handlers | Create appointment | db |
| `update-appointment-status` | ipc-service-handlers | Update status | db |
| `get-services` | ipc-service-handlers | Fetch services | db |
| `add-service` | ipc-service-handlers | Create service | db |
| `get-suppliers` | ipc-supplier-handlers | Fetch suppliers | db |
| `add-supplier` | ipc-supplier-handlers | Create supplier | db |
| `update-supplier` | ipc-supplier-handlers | Update supplier | db |
| `delete-supplier` | ipc-supplier-handlers | Delete supplier | db |

---

**Last Updated**: 2025-10-24  
**Purpose**: Visual guide to understand the modular Electron architecture
