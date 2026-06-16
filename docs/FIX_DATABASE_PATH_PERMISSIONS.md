# Fix: Database Path Permissions & Path Logic Bug

## Problem Summary
The POS app (`CarthaPos-firas`) failed to start with permission error:
```
EPERM: operation not permitted, open 'C:\Program Files\CarthaPos firas\data\.test_1779022128161'
```

## Root Causes (Multiple Issues Found)

### Issue 1: Installation Directory Not Writable
- Windows `C:\Program Files\` folder requires admin privileges for write operations
- NSIS installer created the `data/` folder but without write permissions for regular user
- App runs as regular user → cannot write to Program Files → crash

### Issue 2: Path Logic Bug (Double `/data` Path)
In `initializeDatabase()` at line 227:
```javascript
const appPath = this.getAppInstallPath();        // Returns: C:\Program Files\CarthaPos firas\data
const dbDir = path.join(appPath, 'data');        // Creates: C:\Program Files\CarthaPos firas\data\data ❌
```

This caused the app to look for database in the wrong location.

### Issue 3: Config File Lookup Failure
Methods `getTenantIdentifier()` and `getBusinessNameFromConfig()` were trying to read config from:
```javascript
const appPath = this.getAppInstallPath();        // Returns: /data folder
const configPath = path.join(appPath, 'resources', 'config.json');  // ❌ Wrong path
```

Should have been looking in the installation root, not the data folder.

## Solutions Implemented

### 1. **Refactored Path Methods**
Split the monolithic `getAppInstallPath()` into two separate methods:

**`getAppInstallationRoot()`** - Returns installation root directory
- Production: `C:\Program Files\CarthaPos-firas\`
- Development: `/pos-template/`

**`getDataFolderPath()`** - Returns data folder with fallback logic
- Primary: `{installation}\data\` (with write test)
- Fallback: `C:\Users\{user}\AppData\Roaming\carthapos-firas\CarthaPos\data\`
- Development: `./dev-data/`

**`getAppInstallPath()` (deprecated)** - Alias for backwards compatibility
- Now calls `getDataFolderPath()` internally

### 2. **Fallback Logic**
When Program Files isn't writable:
```javascript
try {
  // Try Program Files first
  const dataFolder = path.join(installRoot, 'data');
  // Test write permission...
  return dataFolder;
} catch (error) {
  // Fallback to AppData (writable on all Windows versions)
  const appDataFolder = path.join(userData, businessName, 'data');
  return appDataFolder;
}
```

### 3. **Fixed Path Concatenation**
- `initializeDatabase()` now calls `getDataFolderPath()` directly
- No more duplicate `/data` path join
- Config file lookups use `getAppInstallationRoot()`

## Modified Files
- `pos-template/src/electron/ElectronDatabaseManager.cjs`:
  - Added `getAppInstallationRoot()` (new method)
  - Refactored `getDataFolderPath()` (replaces logic, handles fallback)
  - Updated `initializeDatabase()` (removed duplicate path join)
  - Updated `getTenantIdentifier()` (use installation root)
  - Updated `getBusinessNameFromConfig()` (use installation root)
  - Kept `getAppInstallPath()` as deprecated wrapper

## Commit
`667c2b5` - Fix: Refactor database path logic with proper installation root vs data folder separation

## Testing Instructions

### Before Testing
Regenerate the POS from admin panel to include these fixes.

### Test Case 1: Program Files Writable (Ideal Case)
```
1. Generate "test1" POS from admin panel
2. Run installer with admin rights
3. Launch app
4. Check logs for: "✅ Data folder is WRITABLE"
5. Verify data folder created at: C:\Program Files\CarthaPos-test1\data\
6. Verify database at: C:\Program Files\CarthaPos-test1\data\carthapos.db
```

### Test Case 2: Program Files NOT Writable (Fallback Case)
```
1. Install normally (or run without admin rights)
2. Launch app
3. Check logs for: "❌ Cannot write to installation directory... falling back to AppData"
4. Check logs for: "✅ AppData folder is WRITABLE"
5. Verify data created at: C:\Users\{user}\AppData\Roaming\carthapos-{business}\CarthaPos\data\
6. Verify database at: C:\Users\{user}\AppData\Roaming\carthapos-{business}\CarthaPos\data\carthapos.db
```

### Test Case 3: Add Sales & Verify Persistence
```
1. Add products to cart
2. Apply discount (10%)
3. Complete payment
4. Close app
5. Reopen app
6. Check that sale was persisted in database
7. Verify backups created in data\backups\
8. Verify logs written to data\logs\
```

## Expected Behavior After Fix
- App starts successfully regardless of Program Files permissions
- Falls back to AppData gracefully if needed
- Database and backups stored in single folder
- Logs written to consistent location
- All files portable with the installation directory

## Technical Details

### New Startup Log Output (Program Files Writable)
```
🔍 === DATABASE LOCATION DETECTION ===
📦 OPERATING IN SINGLE FOLDER MODE (All data with exe)
📍 Installation Root: C:\Program Files\CarthaPos-firas
📍 Data Folder: C:\Program Files\CarthaPos-firas\data
✅ Data folder is WRITABLE
🎯 SELECTED: Single Folder Mode (Installation Directory)
   Installation Root: C:\Program Files\CarthaPos-firas
   Data Location: C:\Program Files\CarthaPos-firas\data
   All files in one place: YES ✅
```

### New Startup Log Output (Fallback to AppData)
```
🔍 === DATABASE LOCATION DETECTION ===
📦 OPERATING IN SINGLE FOLDER MODE (All data with exe)
📍 Installation Root: C:\Program Files\CarthaPos-firas
📍 Data Folder: C:\Program Files\CarthaPos-firas\data
❌ Cannot write to installation directory: EPERM...
⚠️  Installation folder not writable - falling back to AppData
✅ AppData folder is WRITABLE
🎯 FALLBACK: AppData Mode
   User Data Path: C:\Users\windows 11\AppData\Roaming\carthapos-firas
   Data Location: C:\Users\windows 11\AppData\Roaming\carthapos-firas\CarthaPos\data
```

## Next Steps
1. Regenerate "firas" POS from admin panel with this fix
2. Re-install to clean machine
3. Test both startup scenarios (Program Files writable / fallback)
4. Verify sales data persists correctly
5. Deploy to production

## Alternative Solutions Considered
1. **Force Admin Install** - Remove fallback, always require admin privileges
   - Rejected: Poor UX, many users don't have admin rights
2. **Use AppData Only** - Abandon single-folder concept
   - Rejected: Violates single-folder requirement
3. **Use programdata** - Store in shared system folder
   - Rejected: More complex, harder to migrate, less portable

## Resolution
Fallback approach selected because:
- ✅ Handles both scenarios gracefully
- ✅ Maintains single-folder deployment when possible
- ✅ Provides smooth user experience
- ✅ Data portable and consistent
- ✅ No admin privileges required
- ✅ Backwards compatible
