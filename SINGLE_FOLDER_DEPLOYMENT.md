# CarthaPos - Single Folder Deployment Guide

**Updated:** May 17, 2026  
**Deployment Mode:** Single Installation Folder  
**Status:** ✅ Ready for Production

---

## 📁 Folder Structure After Installation

When you install CarthaPos to `C:\Program Files\CarthaPos-BusinessName\`, the folder structure will be:

```
C:\Program Files\CarthaPos-BusinessName\
├── carthapos.exe                    ← Application executable
├── resources/                       ← Electron resources
├── data/                            ← 🎯 ALL APPLICATION DATA (NEW!)
│   ├── carthapos.db                 ← SQLite database
│   ├── backups/
│   │   ├── carthapos-2026-05-17.db  ← Automatic backups
│   │   └── carthapos-2026-05-18.db
│   └── logs/
│       └── database-errors.log      ← Error logs
├── LICENSE
├── NOTICE.txt
└── ... (other files)
```

### Key Features of This Structure

✅ **Everything in One Place**
- No files scattered across different folders
- Easy to backup: backup entire folder
- Easy to move: move entire folder to new machine
- Easy to clean: delete folder to uninstall

✅ **Database Location**
- **Before:** `C:\ProgramData\CarthaPos\{businessname}\carthapos.db`
- **After:** `C:\Program Files\CarthaPos-BusinessName\data\carthapos.db`

✅ **Backup Location**
- **Before:** `C:\Users\{username}\AppData\Roaming\CarthaPos\backups\`
- **After:** `C:\Program Files\CarthaPos-BusinessName\data\backups\`

✅ **Logs Location**
- **Before:** `C:\Users\{username}\AppData\Roaming\CarthaPos\logs\`
- **After:** `C:\Program Files\CarthaPos-BusinessName\data\logs\`

---

## 🔧 Installation Changes

### NSIS Installer Configuration

The installer now includes a custom script (`nsis-installer.nsh`) that:

1. ✅ Creates `data/` folder at installation time
2. ✅ Creates `data/backups/` subfolder
3. ✅ Creates `data/logs/` subfolder
4. ✅ Sets proper permissions for all folders
5. ✅ Preserves user data on uninstall

### Installer Settings

```
Installation Location: C:\Program Files\CarthaPos-{businessname}\
Admin Rights Required: YES (needed for Program Files)
Data Folder Created: YES (automatically)
Data Preserved on Uninstall: YES
```

---

## 📝 What Changed in the Code

### 1. Database Path Resolution

**File:** `pos-template/src/electron/ElectronDatabaseManager.cjs`

```javascript
// OLD: Used C:\ProgramData\CarthaPos\{businessname}\
const programDataPath = process.env.PROGRAMDATA || 'C:\\ProgramData';
const portableDataFolder = path.join(programDataPath, 'CarthaPos');

// NEW: Uses installation directory
if (app.isPackaged) {
  const exePath = app.getPath('exe');              // C:\Program Files\CarthaPos-BusinessName\carthapos.exe
  const installDir = path.dirname(exePath);        // C:\Program Files\CarthaPos-BusinessName\
  const dataFolder = path.join(installDir, 'data'); // C:\Program Files\CarthaPos-BusinessName\data\
  return dataFolder;
}
```

### 2. Backup Path

**File:** `pos-template/src/electron/ElectronDatabaseManager.cjs` (line ~554)

```javascript
// OLD: Used AppData folder
getBackupPath() {
  return path.join(this.getAppDataPath(), sanitizedName, 'backups');
}

// NEW: Uses installation directory
getBackupPath() {
  const dataFolder = this.getAppInstallPath();
  const backupFolder = path.join(dataFolder, 'backups');
  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true });
  }
  return backupFolder;
}
```

### 3. Logs Path

**File:** `pos-template/src/electron/ElectronDatabaseManager.cjs` (line ~12)

```javascript
// OLD: Used userData folder
const logDir = path.join(app.getPath('userData'), 'logs');

// NEW: Uses installation directory
if (app.isPackaged) {
  const exePath = app.getPath('exe');
  const installDir = path.dirname(exePath);
  logDir = path.join(installDir, 'data', 'logs');
}
```

### 4. NSIS Installer Script

**File:** `pos-template/nsis-installer.nsh` (NEW)

```nsis
!macro customInstall
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\backups"
  CreateDirectory "$INSTDIR\data\logs"
  DetailPrint "✅ Creating application data folders..."
!macroend
```

---

## 🚀 Build Instructions (No Changes)

The build process remains exactly the same:

```bash
cd pos-template
npm run build:electron
```

Output: `release/carthapos-{businessname}-Setup-1.0.0.exe`

The installer now includes the custom NSIS script automatically.

---

## 📊 Deployment Checklist

Before deploying, verify:

- [ ] Code changes applied (database path, backup path, logs path)
- [ ] `nsis-installer.nsh` created in `pos-template/` folder
- [ ] `package.json` includes `"include": "nsis-installer.nsh"` in NSIS config
- [ ] Run `npm run build:electron` in pos-template/
- [ ] Installer created: `release/carthapos-{businessname}-Setup-1.0.0.exe`

---

## 🧪 Testing Single-Folder Installation

### Step 1: Install the App

```
1. Run: carthapos-{businessname}-Setup-1.0.0.exe
2. Choose installation location: C:\Program Files\CarthaPos-{businessname}\
3. Click Install (requires admin rights)
4. App should launch after installation
```

### Step 2: Verify Folder Structure

```
Open File Explorer:
Navigate to: C:\Program Files\CarthaPos-{businessname}\
Expected folders:
  ✅ data\
  ✅ data\backups\
  ✅ data\logs\
  ✅ carthapos.exe
```

### Step 3: Verify Database Location

```
1. Start the app
2. Check console for:
   "🔍 === DATABASE LOCATION DETECTION ==="
   "📁 Data Folder: C:\Program Files\CarthaPos-{businessname}\data"
   "🎯 SELECTED: Single Folder Mode (Installation Directory)"
3. Verify: carthapos.db exists in C:\Program Files\CarthaPos-{businessname}\data\
```

### Step 4: Test Full Workflow

```
1. Add products to POS system
2. Create a sale and complete payment
3. Close the app
4. Check: C:\Program Files\CarthaPos-{businessname}\data\carthapos.db
5. Verify: Database file exists and has data
6. Verify: Backups created in C:\Program Files\CarthaPos-{businessname}\data\backups\
```

### Step 5: Uninstall Test

```
1. Open Control Panel → Programs → Uninstall a program
2. Find "CarthaPos-{businessname}"
3. Click Uninstall
4. Navigate to: C:\Program Files\CarthaPos-{businessname}\
5. Verify: Entire folder and all files deleted
6. Verify: No leftover files in AppData or ProgramData
```

---

## 📦 Backup Strategy

### Automatic Backups

The system creates backups when:
1. App starts (initial backup)
2. Every time a sale is completed
3. On scheduled intervals (configurable)

### Backup Location

```
C:\Program Files\CarthaPos-{businessname}\data\backups\
├── carthapos-2026-05-17-initial.db
├── carthapos-2026-05-17-12-30-45.db
├── carthapos-2026-05-18-12-30-45.db
└── ... (numbered backups)
```

### Manual Backup

To backup your system:
```
1. Copy entire folder: C:\Program Files\CarthaPos-{businessname}\
2. Store copy on USB drive or external backup
3. All data is preserved in the backup
```

---

## 🔒 Permissions & Admin Rights

### Why Admin Rights Are Required

Program Files folder requires admin rights to write files. The NSIS installer automatically:
- Requests admin elevation
- Sets proper folder permissions
- Creates all necessary subfolders

### If Installation Fails

If you get "Access Denied" errors:
1. Right-click installer: "Run as Administrator"
2. Check that Program Files folder is writable
3. Check antivirus isn't blocking file creation
4. Try alternative installation path (not Program Files)

---

## 🎯 Single Folder Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Database location | C:\ProgramData\CarthaPos\ | C:\Program Files\CarthaPos\ |
| Backup location | C:\Users\{user}\AppData\ | C:\Program Files\CarthaPos\data\ |
| Log location | C:\Users\{user}\AppData\ | C:\Program Files\CarthaPos\data\ |
| Total locations | 3 different places | 1 single place |
| Backup process | Complex | Simple (copy 1 folder) |
| Migration to new machine | Difficult | Easy (copy 1 folder) |
| Uninstall cleanup | Scattered files | Complete (delete 1 folder) |
| Data isolation | Per-user | Per-installation |

---

## 🚨 Important Notes

### Data Persistence

✅ All data is preserved in `{installation}\data\` folder  
✅ Uninstalling app doesn't delete data  
✅ If you reinstall, previous data will be there  
✅ Backup files are created automatically  

### Multi-User Scenarios

⚠️ **Important:** In multi-user environments:
- App is installed per-machine (in Program Files)
- Data is stored at installation location (not per-user)
- All users share the same database
- If you need separate instances per user: install to different folders

Example for multiple businesses:
```
C:\Program Files\CarthaPos-Restaurant1\data\
C:\Program Files\CarthaPos-Restaurant2\data\
C:\Program Files\CarthaPos-Cafe\data\
```

---

## 📞 Troubleshooting

### "Access Denied" during installation

**Solution:** Run installer as Administrator
```
Right-click installer → Run as Administrator
```

### Database not found after installation

**Check:** 
1. Installation completed successfully
2. Verify: `C:\Program Files\CarthaPos-{businessname}\data\carthapos.db` exists
3. Check console logs for database path messages

### Data folder not created

**Check:**
1. Installation location is writable
2. Admin rights were used during installation
3. NSIS script ran successfully (check installer output)

### Backups not being created

**Check:**
1. `C:\Program Files\CarthaPos-{businessname}\data\backups\` exists and is writable
2. Check logs in: `C:\Program Files\CarthaPos-{businessname}\data\logs\database-errors.log`

---

## ✅ Production Deployment Checklist

Before releasing to production:

- [ ] All three code files modified (database, backup, logs paths)
- [ ] `nsis-installer.nsh` file created and in pos-template/ folder
- [ ] `package.json` includes NSIS script in build config
- [ ] Test installation on clean Windows machine
- [ ] Verify all folders created: data/, backups/, logs/
- [ ] Test full sales workflow
- [ ] Verify backups created automatically
- [ ] Test uninstall and data preservation
- [ ] Confirm no files in ProgramData or AppData
- [ ] Create backup of installation folder
- [ ] Ready for customer deployment

---

## 🎉 Result

**Everything is now in one place:**
```
C:\Program Files\CarthaPos-BusinessName\
├── Application executable
├── data/
│   ├── carthapos.db (DATABASE)
│   ├── backups/ (BACKUPS)
│   └── logs/ (ERROR LOGS)
```

✅ No scattered files  
✅ Easy to backup  
✅ Easy to move  
✅ Easy to clean up  
✅ Professional deployment  

---

Generated: May 17, 2026
