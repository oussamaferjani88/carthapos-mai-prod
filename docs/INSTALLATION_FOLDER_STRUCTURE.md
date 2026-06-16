# CarthaPos - Installation Folder Structure

## Visual Folder Layout

### Installation Location: `C:\Program Files\CarthaPos-BusinessName\`

```
CarthaPos-BusinessName/
│
├── 🖥️  carthapos.exe                    ← Main application executable
│
├── 📁 resources/                        ← Electron framework files
│   ├── app.asar
│   ├── electron.asar
│   └── ...
│
├── 📁 data/                             ← 🎯 YOUR APPLICATION DATA (ALL IN ONE PLACE!)
│   │
│   ├── 📊 carthapos.db                  ← SQLite Database
│   │                                      └─ All products, sales, customers, tables
│   │
│   ├── 📁 backups/                      ← Automatic Backups
│   │   ├── carthapos-2026-05-17-initial.db
│   │   ├── carthapos-2026-05-17-12-30-45.db
│   │   ├── carthapos-2026-05-18-12-30-45.db
│   │   └── ... (more backups)
│   │
│   └── 📁 logs/                         ← Error and Performance Logs
│       ├── database-errors.log
│       └── ... (more logs)
│
├── LICENSE.txt
├── NOTICE.txt
├── ...
```

---

## What's New: Single Folder Deployment

### Before (OLD Way) ❌

Files scattered across multiple locations:

```
C:\Program Files\CarthaPos-BusinessName\
└── carthapos.exe

C:\ProgramData\CarthaPos\BusinessName\
├── carthapos.db
└── backups/

C:\Users\{username}\AppData\Roaming\CarthaPos\
├── logs/
└── ...
```

**Problems:**
- 3 different folders to manage
- Hard to backup everything
- Hard to move to new machine
- Uninstall leaves files scattered

---

### After (NEW Way) ✅

Everything in one place:

```
C:\Program Files\CarthaPos-BusinessName\
├── carthapos.exe
└── data/
    ├── carthapos.db
    ├── backups/
    └── logs/
```

**Benefits:**
- ✅ Everything in 1 folder
- ✅ Easy to backup (copy 1 folder)
- ✅ Easy to move (move 1 folder)
- ✅ Easy to clean up (delete 1 folder)
- ✅ Professional deployment

---

## File Size Reference

```
CarthaPos-BusinessName/ folder                    ~300-500 MB
├── Application & Resources                      ~200-300 MB
└── data/                                        ~100-200 MB initially
    ├── carthapos.db                             ~1-10 MB (depends on data)
    ├── backups/                                 ~50-100 MB (10-20 backups)
    └── logs/                                    ~1-5 MB (error logs)
```

---

## Installation Process

### Step 1: Run Installer
```
Execute: carthapos-BusinessName-Setup-1.0.0.exe
Requires: Administrator rights
```

### Step 2: NSIS Installer Creates Folders
```
Creates automatically:
  ✅ C:\Program Files\CarthaPos-BusinessName\
  ✅ C:\Program Files\CarthaPos-BusinessName\data\
  ✅ C:\Program Files\CarthaPos-BusinessName\data\backups\
  ✅ C:\Program Files\CarthaPos-BusinessName\data\logs\
```

### Step 3: App Initializes
```
App detects installation directory
App creates carthapos.db in data/ folder
App starts using single-folder structure
```

### Step 4: App Running
```
All operations use:
  Database: {installation}\data\carthapos.db
  Backups: {installation}\data\backups\
  Logs: {installation}\data\logs\
```

---

## Data Flow

### On App Start
```
1. Electron launches from C:\Program Files\CarthaPos-...\carthapos.exe
2. App detects installation directory
3. App checks for C:\Program Files\CarthaPos-...\data\ folder
4. App opens database at C:\Program Files\CarthaPos-...\data\carthapos.db
5. App loads products and configuration
```

### On Sale Transaction
```
1. User adds products to cart
2. User confirms payment
3. Sale data written to carthapos.db (in data/ folder)
4. Automatic backup created: data/backups/carthapos-{timestamp}.db
5. Logs written to: data/logs/database-errors.log
```

### On App Close
```
1. Database connection gracefully closed
2. All pending writes flushed to disk
3. App exits cleanly
4. All data preserved in C:\Program Files\CarthaPos-...\data\
```

---

## Access Permissions

### Windows Folder Permissions

```
C:\Program Files\CarthaPos-BusinessName\
└── Permissions: Full Control (for Administrators & App)
    └── data/
        └── Permissions: Read/Write (for Administrators & App)
```

### User Access

- **Administrator:** Full read/write to all folders ✅
- **Regular Users:** Read/write to data/ folder ✅
- **Other Machines:** Can't access (local installation only)

---

## Backup & Recovery

### Automatic Backups Created When:
- ✅ App starts (initial backup)
- ✅ Sale completed successfully
- ✅ Daily at startup (if enabled)
- ✅ Manual backup requested

### Backup File Example:
```
data/backups/carthapos-2026-05-18-14-30-45.db
                      └─ YYYY-MM-DD-HH-MM-SS
```

### Restore from Backup:
```
1. Stop the app
2. Delete or rename current carthapos.db
3. Copy backup file: carthapos-YYYY-MM-DD-HH-MM-SS.db
4. Rename to: carthapos.db
5. Start the app (will use restored database)
```

---

## Migration to New Machine

### Old Way (Scattered Files) ❌
```
1. Find database at: C:\ProgramData\CarthaPos\...
2. Find backups at: C:\Users\{user}\AppData\Roaming\CarthaPos\...
3. Find logs at: Same AppData folder
4. Manually copy from 3 different locations
5. Manually reconfigure paths on new machine
```

### New Way (Single Folder) ✅
```
1. Copy entire folder: C:\Program Files\CarthaPos-BusinessName\
2. Paste on new machine: C:\Program Files\CarthaPos-BusinessName\
3. That's it! Everything is there.
```

---

## Uninstallation

### What Gets Deleted:
- ✅ Application executables
- ✅ Resources and libraries
- ✅ Config files

### What Gets Preserved:
- ✅ Database: C:\Program Files\CarthaPos-BusinessName\data\carthapos.db
- ✅ Backups: C:\Program Files\CarthaPos-BusinessName\data\backups\
- ✅ Logs: C:\Program Files\CarthaPos-BusinessName\data\logs\

**Why?** User data should never be auto-deleted. Admin can manually delete the entire folder later if needed.

---

## Comparison: Old vs New

| Feature | OLD System | NEW System |
|---------|-----------|-----------|
| **Database Location** | C:\ProgramData\CarthaPos\...\carthapos.db | C:\Program Files\CarthaPos-BusinessName\data\carthapos.db |
| **Backups Location** | C:\Users\{user}\AppData\Roaming\CarthaPos\backups\ | C:\Program Files\CarthaPos-BusinessName\data\backups\ |
| **Logs Location** | C:\Users\{user}\AppData\Roaming\CarthaPos\logs\ | C:\Program Files\CarthaPos-BusinessName\data\logs\ |
| **Total Locations** | 3 separate folders | 1 single folder |
| **Backup Difficulty** | Complex (multiple folders) | Simple (copy 1 folder) |
| **Move to New Machine** | Difficult & manual | Easy (copy 1 folder) |
| **Storage Location** | Multiple drives/partitions | Single partition |
| **Uninstall Cleanup** | Scattered files remain | Clean (can delete 1 folder) |
| **Admin Setup Complexity** | High | Low |

---

## Key Advantages Summary

✨ **Single Location**
- No hunting through multiple folders
- Everything in Program Files
- Professional installation standard

✨ **Easy Backup**
- Copy entire folder to USB/external drive
- No missing files or dependencies
- Complete data preservation

✨ **Easy Migration**
- Move entire folder to new machine
- No reconfiguration needed
- All data travels with app

✨ **Easy Cleanup**
- Delete one folder = complete uninstall
- No leftover files in ProgramData
- No leftover files in AppData

✨ **Professional Deployment**
- Meets Windows best practices
- Standard Program Files installation
- Proper admin rights handling
- Data preservation on uninstall

---

## Installation & Configuration

**Required Admin Rights:** YES (for Program Files installation)

**Installation Folder Examples:**
```
C:\Program Files\CarthaPos-Restaurant-ABC\
C:\Program Files\CarthaPos-Cafe-XYZ\
C:\Program Files\CarthaPos-FastFood-123\
```

**Data Folder Examples:**
```
C:\Program Files\CarthaPos-Restaurant-ABC\data\
C:\Program Files\CarthaPos-Cafe-XYZ\data\
C:\Program Files\CarthaPos-FastFood-123\data\
```

---

**Status:** ✅ Ready for Production Deployment  
**Generated:** May 17, 2026
