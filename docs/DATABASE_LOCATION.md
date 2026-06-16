# Database File Location - Complete Reference

## Database Location Logic

The CarthaPos POS app determines where to store the database based on **installation location and write permissions**.

---

## Location Decision Flow

```
┌─────────────────────────────────────────────────────────────┐
│ POS App Starts                                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ Is Install Directory        │
        │ Writable?                   │
        └──────┬──────────────────┬───┘
               │                  │
         YES  │                  │ NO
              ▼                  ▼
    ┌──────────────────┐  ┌──────────────────────┐
    │ PORTABLE MODE    │  │ APPDATA MODE         │
    │ (Default)        │  │ (Fallback)           │
    ├──────────────────┤  ├──────────────────────┤
    │ Database in:     │  │ Database in:         │
    │ <InstallDir>/    │  │ %APPDATA%/Roaming/   │
    │ data/            │  │ <AppName>/data/      │
    │ naruto.db        │  │ naruto.db            │
    └──────────────────┘  └──────────────────────┘
```

---

## Scenario 1: Portable Mode (Most Common) ✅

### Install Location
```
D:\Apps\Naruto-POS\
├── Naruto-POS.exe
├── resources\
├── dist\
└── data\  ← Database folder created here
    └── naruto.db
```

### Full Database Path
```
D:\Apps\Naruto-POS\data\naruto.db
```

### When This Happens
- ✅ App installed to **user-writable directory** (not Program Files)
- ✅ Common install paths:
  - `D:\Apps\...`
  - `C:\Users\[Username]\Apps\...`
  - `C:\Users\[Username]\Desktop\...`
  - Any folder user can write to

### Console Log
```
🔍 === DATABASE LOCATION DETECTION ===
📍 EXE Path: D:\Apps\Naruto-POS\Naruto-POS.exe
📍 Install Directory: D:\Apps\Naruto-POS
✅ Install directory is WRITABLE
🎯 SELECTED: Install Directory (Portable Mode)
   Database will be in: <InstallDir>/data/
═══════════════════════════════════

📊 DATABASE INITIALIZATION SUMMARY
═══════════════════════════════════
📝 Database Name: naruto.db
📁 Full Database Path: D:\Apps\Naruto-POS\data\naruto.db
📂 Database Folder: D:\Apps\Naruto-POS\data
🏢 Business Name: Naruto
═══════════════════════════════════
```

---

## Scenario 2: AppData Mode (System Installation) 

### Install Location
```
C:\Program Files\Naruto-POS\
├── Naruto-POS.exe
├── resources\
├── dist\
└── (data folder NOT created here - read-only)
```

### Database Location (Fallback)
```
C:\Users\[Username]\AppData\Roaming\Naruto-POS\
└── data\
    └── naruto.db
```

### Full Database Path
```
C:\Users\[Username]\AppData\Roaming\Naruto-POS\data\naruto.db
```

### When This Happens
- ⚠️ App installed to **read-only directory** (Program Files, System32, etc.)
- ⚠️ Install tried to write to Program Files but failed
- ⚠️ Auto-fallback to AppData

### Console Log
```
🔍 === DATABASE LOCATION DETECTION ===
📍 EXE Path: C:\Program Files\Naruto-POS\Naruto-POS.exe
📍 Install Directory: C:\Program Files\Naruto-POS
❌ Install directory is NOT WRITABLE
   Reason: EACCES: permission denied, open 'C:\Program Files\...'
⚠️  Falling back to AppData (User Data) directory...
📍 User Data Path: C:\Users\[Username]\AppData\Roaming\Naruto-POS
✅ User Data Path is ALWAYS WRITABLE
🎯 SELECTED: AppData (Non-Portable Mode)
   Database will be in: %APPDATA%/Roaming/<AppName>/
   This is normal for system-wide installations (Program Files)
═══════════════════════════════════
```

---

## Actual Database File Names

The database filename is **based on the business name** from configuration:

### Examples

| Business Name | Database Filename | Full Path |
|---|---|---|
| Naruto | `naruto.db` | `D:\Apps\Naruto-POS\data\naruto.db` |
| Restaurant Le Gourmet | `restaurant_le_gourmet.db` | `D:\Apps\...\data\restaurant_le_gourmet.db` |
| Mon POS | `mon_pos.db` | `D:\Apps\...\data\mon_pos.db` |
| Café 123 | `cafe_123.db` | `D:\Apps\...\data\cafe_123.db` |

### Sanitization Rules
Business name is sanitized by removing:
- Special characters: `@#$%^&*()` → removed
- Spaces: ` ` → replaced with `_`
- Hyphens: `-` → replaced with `_`
- Other non-alphanumeric: removed
- Max length: 50 characters

---

## Environment Variables for Database Path

### Windows Environment Variables
```
%APPDATA% = C:\Users\[Username]\AppData\Roaming
```

### Example Full Paths

**Portable Mode**:
```
D:\Apps\My-Store-POS\data\my_store_pos.db
```

**AppData Mode**:
```
C:\Users\username\AppData\Roaming\My-Store-POS\data\my_store_pos.db
```

---

## How to Find Your Database

### Step 1: Find the App Installation Path

Open the POS app and check the Electron console (F12):

```
Look for line like:
📍 EXE Path: D:\Apps\MyPOS\MyPOS.exe
OR
📍 User Data Path: C:\Users\username\AppData\Roaming\MyPOS
```

### Step 2: Navigate to Database

**If Portable Mode** (most common):
```
Open: [Install Directory]\data\
Example: D:\Apps\MyPOS\data\
You should see: my_pos.db
```

**If AppData Mode**:
```
Open: %APPDATA%\Roaming\[AppName]\data\
Example: C:\Users\username\AppData\Roaming\MyPOS\data\
You should see: my_pos.db
```

### Quick Navigation (Windows)

**Using Explorer**:
1. Press `Windows + R`
2. Type: `%APPDATA%`
3. Navigate to: `Roaming\[AppName]\data\`

**Using Command Line**:
```cmd
# Navigate to AppData database location
cd %APPDATA%\Roaming\[AppName]\data\
dir

# Or check portable location if installed there
cd D:\Apps\[AppName]\data\
dir
```

---

## Multiple POS Instances - Database Locations

When you install multiple POS apps with the same business name:

### Instance 1: First Installation
```
D:\Apps\Naruto-Store-POS\
└── data\
    └── naruto_store.db  (main database)
    └── .db-map.json     (tracks which DB this instance uses)
```

### Instance 2: Second Installation (Same Business Name)
```
D:\Apps\Naruto-Store-POS-2\
└── data\
    └── naruto_store_2.db  (separate database)
    └── .db-map.json       (tracks DB assignment)
```

### Instance 3: Third Installation (Same Business Name)
```
D:\Apps\Naruto-Store-POS-3\
└── data\
    └── naruto_store_3.db  (separate database)
    └── .db-map.json       (tracks DB assignment)
```

**Each instance has its own database with incremented suffix!**

---

## Database Backup Location

Automatic backups are stored in the same data folder:

```
D:\Apps\MyPOS\data\
├── my_pos.db           (main database)
├── my_pos.db.backup-initial   (initial backup)
├── my_pos.db.backup-20250507   (daily backups)
└── .db-map.json        (instance tracking)
```

---

## Development Mode

If running in development (npm run electron-dev):

```
User Data Path: %APPDATA%\Roaming\CarthaPos-Dev\
OR
User Data Path: %APPDATA%\Roaming\[AppName]\

Database: %APPDATA%\Roaming\CarthaPos-Dev\data\carthapos_dev.db
```

---

## How to Check Your Database Location

### Method 1: Electron Console (Easiest)

```javascript
1. Open POS app
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for logs containing:
   - "📁 Full Database Path:"
   - "📂 Database Folder:"
   - "📝 Database Name:"
```

### Method 2: Check Log File

If logs are saved, look for:
```
[POS DEBUG] [Electron] 📁 Full Database Path: D:\Apps\...\data\...db
```

### Method 3: Manual Navigation

**Portable Mode**:
```
1. Find the installed .exe
2. Go to parent folder
3. Look for "data" folder
4. Database should be there
```

**AppData Mode**:
```
1. Open C:\Users\[YourUsername]\AppData\Roaming\
2. Look for folder matching app name
3. Go to "data" subfolder
4. Database should be there
```

---

## Common Issues & Locations

### Issue: "Database not found"
**Check locations in order**:
1. `[InstallDir]\data\[businessname].db`  ← Most common
2. `C:\Users\[Username]\AppData\Roaming\[AppName]\data\[businessname].db`
3. `C:\Users\[Username]\AppData\Roaming\[AppName]\data\[businessname]_2.db` ← If multiple instances

### Issue: "Database growing very large"
**Location**:
```
Check folder size: [DatabaseLocation]\
Should be: D:\Apps\MyPOS\data\ or %APPDATA%\Roaming\MyPOS\data\
```

### Issue: "Can't back up database"
**Backup location**:
```
Same folder as database: [DatabaseFolder]\[businessname].db.backup-*
```

---

## Summary Table

| Scenario | Location | Path |
|---|---|---|
| **Portable** (Normal) | Install Directory | `D:\Apps\MyPOS\data\my_pos.db` |
| **AppData** (Fallback) | User AppData | `%APPDATA%\Roaming\MyPOS\data\my_pos.db` |
| **Dev Mode** | AppData | `%APPDATA%\Roaming\CarthaPos-Dev\data\...db` |
| **Multiple Instances** | Separate DBs | `...data\business.db`, `...data\business_2.db` |

---

## Verification Checklist

After installing your POS app, verify database location:

- [ ] Check Electron console for database path logs
- [ ] Navigate to the shown database folder
- [ ] Verify `[businessname].db` file exists
- [ ] Check file size (should be > 100KB after first use)
- [ ] Verify database folder exists: `\data\`
- [ ] Check for `.db-map.json` file (tracks multiple instances)

---

## For Your Setup (Based on Your Console Log)

From your console log showing business name **"naruto"**:

### Expected Database Location:

**Most Likely (Portable Mode)**:
```
D:\Apps\Naruto-POS\data\naruto.db
OR
C:\Users\[YourUsername]\Apps\Naruto-POS\data\naruto.db
```

**Fallback (If installed to Program Files)**:
```
C:\Users\[YourUsername]\AppData\Roaming\Naruto-POS\data\naruto.db
```

### To Find It:

```
1. Open your POS app
2. Press F12 → Console
3. Look for: "📁 Full Database Path:"
4. Navigate to that folder in File Explorer
5. You should see: naruto.db
```

---

Use this information to locate and verify your database file!
