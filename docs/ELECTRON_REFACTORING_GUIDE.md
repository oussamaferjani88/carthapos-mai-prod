# Electron.cjs Refactoring Guide

## 📋 Overview

The monolithic `electron.cjs` file (2109 lines) has been refactored into a modular architecture for better maintainability, debugging, and code organization.

## 🏗️ New Structure

```
pos-template/
├── public/
│   ├── electron.cjs                    # ❌ OLD - Monolithic (2109 lines)
│   ├── electron-modular.cjs            # ✅ NEW - Modular entry point (400 lines)
│   └── preload.js                      # Unchanged
└── src/
    └── electron/
        ├── managers/                    # Business logic managers
        │   ├── ElectronDatabaseManager.js
        │   ├── ElectronAuthManager.js
        │   ├── ElectronWindowManager.js
        │   └── ElectronLicenseManager.js
        ├── handlers/                    # IPC Handlers (separated by domain)
        │   ├── ipc-auth-handlers.js          # Authentication & users
        │   ├── ipc-database-handlers.js      # Database operations
        │   ├── ipc-app-handlers.js           # App lifecycle
        │   ├── ipc-license-handlers.js       # License & USB
        │   ├── ipc-sales-handlers.js         # Sales transactions
        │   ├── ipc-customer-handlers.js      # Customer management
        │   ├── ipc-kitchen-handlers.js       # Kitchen orders
        │   ├── ipc-service-handlers.js       # Services & appointments
        │   └── ipc-supplier-handlers.js      # Supplier management
        ├── services/                    # Utility services
        │   └── LoggerService.js              # Centralized logging
        └── config/                      # Configuration files
            └── constants.js                   # App constants
```

## 🔄 Migration Steps

### Step 1: Update package.json

```json
{
  "main": "public/electron-modular.cjs"  // Change from electron.cjs
}
```

### Step 2: Test the modular version

```bash
# Development mode
npm run dev

# Production build
npm run build
```

### Step 3: Verify all features work

- ✅ First-time setup screen
- ✅ Authentication flow
- ✅ Database operations
- ✅ USB license detection
- ✅ Sales module
- ✅ Customer module
- ✅ Kitchen module
- ✅ Services module
- ✅ Supplier module

### Step 4: Remove old electron.cjs (after verification)

```bash
# Backup first
mv public/electron.cjs public/electron.cjs.backup

# Rename modular version
mv public/electron-modular.cjs public/electron.cjs
```

## 📦 Module Responsibilities

### **electron-modular.cjs** (Main Entry)
- App initialization
- Manager setup
- Handler registration
- Window creation
- Lifecycle management

### **Managers** (`src/electron/`)
- `ElectronDatabaseManager`: Database connection, migrations, backups
- `ElectronAuthManager`: User authentication, sessions, permissions
- `ElectronWindowManager`: Window creation and management
- `ElectronLicenseManager`: License validation and management

### **IPC Handlers** (`src/electron/handlers/`)

Each handler file exports a `register*Handlers()` function:

#### **ipc-auth-handlers.js**
```javascript
- needs-first-time-setup
- create-admin-user
- authenticate-user
- logout
- get-user-modules
- set-user-modules
- check-user-permission
```

#### **ipc-sales-handlers.js**
```javascript
- get-sales
- add-sale
- get-sale-details
```

#### **ipc-customer-handlers.js**
```javascript
- get-customers
- add-customer
- update-customer
- delete-customer
```

#### **ipc-kitchen-handlers.js**
```javascript
- get-kitchen-orders
- add-kitchen-order
- update-kitchen-order-status
```

#### **ipc-service-handlers.js**
```javascript
- get-appointments
- add-appointment
- update-appointment-status
- get-services
- add-service
```

#### **ipc-supplier-handlers.js**
```javascript
- get-suppliers
- add-supplier
- update-supplier
- delete-supplier
```

#### **ipc-license-handlers.js**
```javascript
- get-app-config
- validate-license
- detect-usb-drives
```

#### **ipc-database-handlers.js**
```javascript
- get-database-stats
- backup-database
- restore-database
```

#### **ipc-app-handlers.js**
```javascript
- app-version
- app-path
- open-external
```

### **Services** (`src/electron/services/`)

#### **LoggerService.js**
- Centralized logging to file and console
- Automatic timestamping
- Error formatting
- Log file rotation (future enhancement)

## ✅ Benefits of Refactoring

### 1. **Maintainability**
- Each file has a single, clear responsibility
- Easy to locate and fix bugs
- Changes in one domain don't affect others

### 2. **Testability**
- Each handler can be unit tested independently
- Mock managers easily for testing
- Clear input/output contracts

### 3. **Debugging**
- Console logs show which handler file is active
- Smaller files easier to read and understand
- Stack traces are more meaningful

### 4. **Scalability**
- Easy to add new handlers without touching existing code
- Clear pattern for new features
- Can split handlers further if they grow

### 5. **Team Collaboration**
- Multiple developers can work on different handlers
- Reduced merge conflicts
- Clear code ownership

## 🔍 Debugging Tips

### Enable verbose logging
```javascript
// In electron-modular.cjs
console.log('🔐 Registering authentication IPC handlers...');
```

### Check handler registration
Each handler file logs when it registers:
```
🔐 Registering authentication IPC handlers...
💰 Registering sales IPC handlers...
👥 Registering customer IPC handlers...
```

### View logs
```bash
# Windows
type %USERPROFILE%\pos-debug.log

# Linux/Mac
cat ~/pos-debug.log
```

### Test individual handlers
```javascript
// In renderer process
const result = await window.electronAPI.getSales();
console.log('Sales:', result);
```

## 🚨 Common Issues

### Issue: "No handler registered for 'xxx'"
**Solution**: Check that the handler is registered in `electron-modular.cjs`

### Issue: Database not initialized
**Solution**: Ensure `initializeDatabase()` is called before registering business handlers

### Issue: Manager is undefined
**Solution**: Call `initializeManagers()` before using any manager

### Issue: Handlers not working in production
**Solution**: Verify all `require()` paths are correct relative to `public/` folder

## 📝 Adding New Handlers

### Example: Adding inventory handlers

1. **Create handler file**: `src/electron/handlers/ipc-inventory-handlers.js`

```javascript
const { ipcMain } = require('electron');

function registerInventoryHandlers(db) {
  console.log('📦 Registering inventory IPC handlers...');

  ipcMain.handle('get-products', () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('add-product', (event, product) => {
    // Implementation
  });
}

module.exports = { registerInventoryHandlers };
```

2. **Import in electron-modular.cjs**:

```javascript
const { registerInventoryHandlers } = require('../src/electron/handlers/ipc-inventory-handlers');
```

3. **Register after database initialization**:

```javascript
app.whenReady().then(async () => {
  await initializeDatabase();
  registerInventoryHandlers(db);  // Add this line
  // ... other handlers
});
```

4. **Expose in preload.js**:

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),
});
```

## 🔄 Rollback Plan

If issues arise, you can easily rollback:

1. **Quick rollback** (just change package.json):
```json
{
  "main": "public/electron.cjs"  // Back to original
}
```

2. **Full rollback** (restore old file):
```bash
mv public/electron.cjs.backup public/electron.cjs
rm public/electron-modular.cjs
```

## 📊 File Size Comparison

| File | Lines | Purpose |
|------|-------|---------|
| electron.cjs (OLD) | 2109 | Everything |
| electron-modular.cjs (NEW) | ~400 | Main entry point |
| ipc-auth-handlers.js | ~150 | Auth handlers |
| ipc-sales-handlers.js | ~100 | Sales handlers |
| ipc-customer-handlers.js | ~90 | Customer handlers |
| ipc-kitchen-handlers.js | ~80 | Kitchen handlers |
| ipc-service-handlers.js | ~120 | Service handlers |
| ipc-supplier-handlers.js | ~90 | Supplier handlers |
| LoggerService.js | ~60 | Logging service |
| **TOTAL (Modular)** | **~1090** | **Split across 9 files** |

## 🎯 Next Steps

1. ✅ Test modular version in development
2. ✅ Verify all existing features work
3. ✅ Update package.json to use new entry point
4. ✅ Test production build
5. ✅ Update backend/routes/pos.js to reference new file
6. ✅ Document any issues found
7. ✅ Remove old electron.cjs after full verification

## 📚 Related Documentation

- [DATABASE_LOCATION_IMPLEMENTATION.md](../../DATABASE_LOCATION_IMPLEMENTATION.md)
- [AUTHENTICATION_FLOW_COMPLETE.md](../../AUTHENTICATION_FLOW_COMPLETE.md)
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/api/ipc-main)

---

**Last Updated**: 2025-10-24  
**Status**: ✅ Refactoring Complete - Ready for Testing
