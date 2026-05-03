# Database Location - Enhanced Logging & Portable Mode

## 🎯 Overview

The POS system now includes:
1. **Detailed logging** showing exactly where the database will be stored and why
2. **Portable mode flag** to force database storage in the installation directory

## 📍 Database Location Logic

### Default Behavior (Auto Mode)

When the POS starts, it checks locations in this order:

```
1. Installation Directory (D:\POS System\)
   ├─ ✅ WRITABLE? → Use it (Portable Mode)
   └─ ❌ NOT WRITABLE? → Continue to step 2

2. AppData Directory (C:\Users\...\AppData\Roaming\pos-app\)
   └─ ✅ ALWAYS WRITABLE → Use it (System Install Mode)
```

### Console Output Example

When you run the POS, you'll see detailed logs like this:

```
🔍 === DATABASE LOCATION DETECTION ===
📍 EXE Path: D:\POS System\POS System.exe
📍 Install Directory: D:\POS System
✅ Install directory is WRITABLE
🎯 SELECTED: Install Directory (Portable Mode)
   Database will be in: <InstallDir>/data/
═══════════════════════════════════

🗄️ Initializing database...
🏢 Business name: My Café
📁 Created database directory: D:\POS System\data
📊 Final database path: D:\POS System\data\My_Cafe.db
✅ Connected to SQLite database: My_Cafe.db
```

**OR** if installed in a protected folder (like Program Files):

```
🔍 === DATABASE LOCATION DETECTION ===
📍 EXE Path: C:\Program Files\POS System\POS System.exe
📍 Install Directory: C:\Program Files\POS System
❌ Install directory is NOT WRITABLE
   Reason: EPERM: operation not permitted
⚠️  Falling back to AppData (User Data) directory...
📍 User Data Path: C:\Users\MSI\AppData\Roaming\pos-system
✅ User Data Path is ALWAYS WRITABLE
🎯 SELECTED: AppData (Non-Portable Mode)
   Database will be in: %APPDATA%/Roaming/<AppName>/
   This is normal for system-wide installations (Program Files)
═══════════════════════════════════
```

## 🎯 Portable Mode (Force Install Directory)

### What is Portable Mode?

Portable mode **forces** the database to be stored in the installation directory, even if it's not writable. If the installation folder isn't writable, the app will **fail to start** with a clear error message.

### When to Use Portable Mode?

✅ **Use portable mode when:**
- Installing on USB drives
- Installing on D:\ or E:\ drives
- You want all data in one folder for easy backup
- Creating a truly portable POS system

❌ **Don't use portable mode when:**
- Installing to Program Files (Windows protected folder)
- Installing to C:\Program Files
- Multiple users need separate databases
- You need per-user data isolation

### How to Enable Portable Mode

#### Option 1: During POS Generation (Recommended)

Add `forcePortableMode: true` to the license configuration when generating the POS:

```json
{
  "clientId": "client123",
  "licenseKey": "ABC-123-XYZ",
  "configuration": {
    "businessName": "My Café",
    "forcePortableMode": true
  }
}
```

#### Option 2: Manual Edit (After Generation)

Edit the `resources/config.json` file in the generated POS:

**File**: `<InstallDir>/resources/config.json`

```json
{
  "businessName": "My Café",
  "clientId": "client123",
  "licenseKey": "ABC-123-XYZ",
  "forcePortableMode": true,
  "createdAt": "2025-11-03T10:30:00.000Z",
  "version": "1.0.0"
}
```

### Portable Mode Console Output

When portable mode is enabled:

```
🔍 === DATABASE LOCATION DETECTION ===
🎯 Portable mode FORCED via config.json (forcePortableMode: true)
📍 EXE Path: D:\POS System\POS System.exe
📍 Install Directory: D:\POS System
✅ Install directory is WRITABLE
🎯 SELECTED: Install Directory (Portable Mode)
   Database will be in: <InstallDir>/data/
═══════════════════════════════════
```

**OR** if the folder isn't writable (ERROR):

```
🔍 === DATABASE LOCATION DETECTION ===
🎯 Portable mode FORCED via config.json (forcePortableMode: true)
📍 EXE Path: C:\Program Files\POS System\POS System.exe
📍 Install Directory: C:\Program Files\POS System
❌ Install directory is NOT WRITABLE
   Reason: EPERM: operation not permitted
🚨 ERROR: Portable mode forced but install directory not writable!
   Please install in a writable location (e.g., D:\Apps)
   instead of system folders (Program Files)
═══════════════════════════════════

❌ Database initialization failed: Error: Portable mode required but 
   installation directory is not writable. Please install to a user-writable location.
```

## 📂 File Locations Summary

### Portable Mode (Install Directory)

```
D:\POS System\                       ← Installation folder
├── resources/
│   └── config.json                  ← Config with forcePortableMode: true
├── data/                            ← DATABASE FOLDER (created on first run)
│   └── My_Cafe.db                   ← Main database
└── POS System.exe                   ← Executable

C:\Users\MSI\AppData\Roaming\pos-system\
└── My_Cafe\
    └── backups\                     ← Backups still in AppData for safety
        ├── My_Cafe_backup_initial_2025-11-03.db
        └── My_Cafe_backup_daily_2025-11-03.db
```

### System Mode (AppData)

```
C:\Program Files\POS System\         ← Installation folder (read-only)
├── resources/
│   └── config.json                  ← Config with forcePortableMode: false
└── POS System.exe

C:\Users\MSI\AppData\Roaming\pos-system\
├── data/                            ← DATABASE FOLDER
│   └── My_Cafe.db                   ← Main database
└── My_Cafe\
    └── backups\                     ← Backups
        ├── My_Cafe_backup_initial_2025-11-03.db
        └── My_Cafe_backup_daily_2025-11-03.db
```

## 🛠️ Testing Guide

### Test 1: Auto Mode (Default)

1. Generate POS without `forcePortableMode`
2. Install to **D:\POS System**
3. Run the app
4. Check console logs - should select **Install Directory**
5. Verify database at: `D:\POS System\data\<BusinessName>.db`

### Test 2: Auto Mode Fallback

1. Generate POS without `forcePortableMode`
2. Install to **C:\Program Files\POS System**
3. Run the app
4. Check console logs - should fallback to **AppData**
5. Verify database at: `C:\Users\...\AppData\Roaming\pos-system\data\<BusinessName>.db`

### Test 3: Portable Mode (Success)

1. Generate POS with `forcePortableMode: true`
2. Install to **D:\POS System**
3. Run the app
4. Check console logs - should show **Portable mode FORCED**
5. Verify database at: `D:\POS System\data\<BusinessName>.db`

### Test 4: Portable Mode (Error)

1. Generate POS with `forcePortableMode: true`
2. Install to **C:\Program Files\POS System**
3. Run the app
4. Check console logs - should show **ERROR** message
5. App should **fail to start** with clear error

## 🔧 Troubleshooting

### Problem: Database still in AppData after rebuild

**Solution**: 
1. Delete the old POS installation completely
2. Delete AppData folder: `C:\Users\MSI\AppData\Roaming\pos-system`
3. Rebuild POS template: `npm run build` in `pos-template/`
4. Generate new POS from admin panel
5. Install fresh and test

### Problem: Can't find database file

**Solution**: Look at the console logs when app starts. The logs will show:
```
📊 Final database path: <EXACT PATH HERE>
```

### Problem: Want to move from AppData to Install Dir

**Solution**:
1. Close the POS app
2. Add `"forcePortableMode": true` to `resources/config.json`
3. Copy the `.db` file from AppData to `<InstallDir>/data/`
4. Restart the app

### Problem: Portable mode error in Program Files

**Solution**: Don't use portable mode with Program Files! Either:
- **Option A**: Disable portable mode (`forcePortableMode: false`)
- **Option B**: Reinstall to a writable location (D:\, Desktop, etc.)

## 📝 Quick Reference

| Mode | Config Setting | Install Location | DB Location | Use Case |
|------|---------------|------------------|-------------|----------|
| Auto | `forcePortableMode: false` (default) | Anywhere | Install dir if writable, else AppData | General purpose |
| Portable | `forcePortableMode: true` | Writable folder only | Install dir (forced) | USB drives, portable setups |

## ✅ Benefits

1. **Clear Logging**: Always know where your database is
2. **Smart Fallback**: Works in Program Files automatically
3. **Portable Option**: Force install-dir for USB/portable setups
4. **Error Prevention**: Clear errors when portable mode can't be used
5. **Flexible**: Choose the right mode for your deployment

## 🚀 Next Steps

After applying these changes:

1. **Rebuild POS template**:
   ```cmd
   cd pos-template
   npm run build
   ```

2. **Generate new POS** from admin panel

3. **Install and test** - watch the console logs!

4. **Verify database location** matches the logged path

Done! 🎉
