/**
 * Electron Database Manager
 * Extracted from monolithic electron.js for better organization
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const FileLockManager = require('./FileLockManager.cjs');
const DatabaseQueryOptimizer = require('./DatabaseQueryOptimizer.cjs');

// Helper to write to error log file for debugging
function logToFile(message) {
  try {
    const { app } = require('electron');
    
    // Determine log directory based on app context
    let logDir;
    if (app.isPackaged) {
      // In production: logs next to the DB in the installation data folder
      const exePath = app.getPath('exe');
      const installDir = path.dirname(exePath);
      logDir = path.join(installDir, 'data', 'logs');
    } else {
      // In development: logs in userData
      logDir = path.join(app.getPath('userData'), 'logs');
    }
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'database-errors.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`, 'utf8');
  } catch (e) {
    // Silently fail if logging doesn't work
  }
}

class ElectronDatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.isInitialized = false;
    this.queryOptimizer = null;
  }

  /**
   * Read explicit DB filename from app-config.json when available.
   * This ensures generated POS instances use the filename chosen during generation.
   */
  getConfiguredDatabaseFilename() {
    const { app } = require('electron');
    try {
      let configPath;
      if (app.isPackaged) {
        configPath = path.join(app.getAppPath(), 'dist', 'app-config.json');
      } else {
        configPath = path.join(__dirname, '..', 'config', 'app-config.json');
      }

      if (!fs.existsSync(configPath)) return null;
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const configured = config?.database?.filename;
      if (!configured || typeof configured !== 'string') return null;

      const clean = configured.trim().replace(/[\\/:*?"<>|]/g, '');
      if (!clean) return null;

      return clean.toLowerCase().endsWith('.db') ? clean : `${clean}.db`;
    } catch (error) {
      console.warn('⚠️ Could not read configured database filename:', error.message);
      return null;
    }
  }

  /**
   * Stable identifier for the generated app instance/tenant.
   * We use this to persist which DB filename was selected when multiple
   * generated apps share the same Electron app name/userData folder.
   */
  getTenantIdentifierFromConfig() {
    const { app } = require('electron');

    const tryExtract = (config) => {
      if (!config || typeof config !== 'object') return null;
      const license = config.license || {};
      return (
        license.licenseKey ||
        license.key ||
        license.id ||
        license.clientId ||
        license.client_id ||
        config.clientId ||
        config.client_id ||
        null
      );
    };

    // 1) app-config.json (preferred)
    try {
      let configPath;
      if (app.isPackaged) {
        configPath = path.join(app.getAppPath(), 'dist', 'app-config.json');
      } else {
        configPath = path.join(__dirname, '..', 'config', 'app-config.json');
      }

      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const id = tryExtract(config);
        if (id && String(id).trim() !== '') return String(id).trim();
      }
    } catch (error) {
      console.warn('⚠️ Could not read tenant identifier from app-config.json:', error.message);
    }

    // 2) legacy resources/config.json (fallback)
    try {
      const installRoot = this.getAppInstallationRoot();
      const legacyConfigPath = path.join(installRoot, 'resources', 'config.json');
      if (fs.existsSync(legacyConfigPath)) {
        const legacyConfig = JSON.parse(fs.readFileSync(legacyConfigPath, 'utf8'));
        const id = legacyConfig.licenseKey || legacyConfig.clientId || legacyConfig.client_id || null;
        if (id && String(id).trim() !== '') return String(id).trim();
      }
    } catch (error) {
      console.warn('⚠️ Could not read tenant identifier from legacy config.json:', error.message);
    }

    return null;
  }

  /**
   * Pick a DB filename for this tenant, persisting it in a map file so we
   * don't create a new suffixed DB on every launch.
   * NOW USES FILE LOCKING to prevent race conditions with multiple POS instances
   */
  async getOrCreateDbFilename(dbDir, baseDbName) {
    const tenantId = this.getTenantIdentifierFromConfig();
    const mapPath = path.join(dbDir, '.db-map.json');

    try {
      // Read with lock to prevent concurrent access
      let map = await FileLockManager.readJsonWithLock(mapPath, 3000) || {};

      if (tenantId && typeof map[tenantId] === 'string' && map[tenantId].trim() !== '') {
        console.log(`✅ Found existing DB mapping for tenant: ${map[tenantId]}`);
        return map[tenantId].trim();
      }

      const selected = this.findAvailableDbFilename(dbDir, baseDbName);
      console.log(`🆕 Selected new DB filename: ${selected}`);

      if (tenantId) {
        map[tenantId] = selected;
        // Write with lock to prevent concurrent writes
        await FileLockManager.writeJsonWithLock(mapPath, map, 3000);
        console.log(`✅ Persisted DB mapping for tenant: ${tenantId}`);
      }

      return selected;
    } catch (error) {
      console.warn('⚠️ Could not use file locking, falling back to direct access:', error.message);
      // Fallback to non-locking version for backward compatibility
      let map = {};
      try {
        if (fs.existsSync(mapPath)) {
          map = JSON.parse(fs.readFileSync(mapPath, 'utf8')) || {};
        }
      } catch (fallbackError) {
        console.warn('⚠️ Fallback read also failed:', fallbackError.message);
        map = {};
      }

      if (tenantId && typeof map[tenantId] === 'string' && map[tenantId].trim() !== '') {
        return map[tenantId].trim();
      }

      const selected = this.findAvailableDbFilename(dbDir, baseDbName);

      if (tenantId) {
        map[tenantId] = selected;
        try {
          fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');
        } catch (writeError) {
          console.warn('⚠️ Could not write .db-map.json fallback:', writeError.message);
        }
      }

      return selected;
    }
  }

  /**
   * Find the first available filename: <name>.db, <name>_2.db, <name>_3.db...
   */
  findAvailableDbFilename(dbDir, baseDbName) {
    const base = `${baseDbName}.db`;
    if (!fs.existsSync(path.join(dbDir, base))) {
      return base;
    }

    for (let i = 2; i <= 999; i += 1) {
      const candidate = `${baseDbName}_${i}.db`;
      if (!fs.existsSync(path.join(dbDir, candidate))) {
        return candidate;
      }
    }

    return `${baseDbName}_${Date.now()}.db`;
  }

  /**
   * Initialize the database
   */
  async initializeDatabase() {
    console.log('🗄️ Initializing database...');
    
    try {
      // Get business name from configuration
      const businessName = this.getBusinessNameFromConfig();
      const dbName = this.sanitizeDbName(businessName);
      
      // Database in installation directory (portable)
      // getAppInstallPath() already returns the 'data' folder
      const dbDir = this.getAppInstallPath();
      
      console.log('📁 Database directory path:', dbDir);
      
      // Database directory creation and permission check already done in getAppInstallPath()
      let dbDirFinal = dbDir;

       const configuredDbFile = this.getConfiguredDatabaseFilename();
       const selectedDbFile = configuredDbFile || await this.getOrCreateDbFilename(dbDirFinal, dbName);
       this.dbPath = path.join(dbDirFinal, selectedDbFile);
      
      // Enhanced logging with database name and folder
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('📊 DATABASE INITIALIZATION SUMMARY');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📝 Database Name:', path.basename(this.dbPath));
      console.log('📁 Full Database Path:', this.dbPath);
      
      // Extract folder path
      const dbFolder = path.dirname(this.dbPath);
      console.log('📂 Database Folder:', dbFolder);
      console.log('🏢 Business Name:', businessName);
      console.log('═══════════════════════════════════════════════════════════\n');

      // Create database connection
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Error opening database:', err.message);
          throw err;
        }
        console.log(`✅ Connected to SQLite database: ${dbName}.db`);
      });

       // ⚡ Configure SQLite for reliable writes
       console.log('⚙️ Configuring SQLite pragmas for data reliability...');
       await new Promise((resolve, reject) => {
         this.db.serialize(() => {
           let pragmaCount = 0;
           let pragmasCompleted = 0;
           
           // We expect 3 pragmas to complete
           const checkComplete = () => {
             pragmasCompleted++;
             if (pragmasCompleted === pragmaCount) {
               resolve();
             }
           };
           
           // Enable journal mode (safer transactions)
           pragmaCount++;
           this.db.run('PRAGMA journal_mode = WAL', (err) => {
             if (err) console.warn('⚠️ WAL mode not available:', err.message);
             else console.log('✅ WAL mode enabled');
             checkComplete();
           });
           
           // Set synchronous mode to FULL (ensures all data is written)
           pragmaCount++;
           this.db.run('PRAGMA synchronous = FULL', (err) => {
             if (err) console.warn('⚠️ Could not set synchronous mode:', err.message);
             else console.log('✅ Synchronous mode set to FULL');
             checkComplete();
           });
           
           // Set timeout for busy database (default 5s)
           pragmaCount++;
           this.db.configure('busyTimeout', 5000);
           console.log('✅ Busy timeout set to 5s');
           checkComplete();
         });
       });

      // Initialize query optimizer for better performance
      this.queryOptimizer = new DatabaseQueryOptimizer(this.db);
      console.log('⚡ Query optimizer initialized with caching and timeout protection');

      // Create tables
      await this.createTables();
      this.isInitialized = true;
      
      console.log('✅ Database initialized successfully');
      
      // Create initial backup
      await this.createBackup('initial');
      
      return this.db;
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      console.error('📋 Full error:', error);
      logToFile(`Database initialization failed: ${error.message}`);
      logToFile(`Stack: ${error.stack}`);
      
      // Try to recover: close connection and attempt recovery
      if (this.db) {
        try {
          this.db.close();
        } catch (closeErr) {
          console.error('Could not close database:', closeErr.message);
          logToFile(`Could not close database: ${closeErr.message}`);
        }
      }
      
      // Check if database file is corrupted
      if (fs.existsSync(this.dbPath)) {
        console.log('🔧 Attempting database recovery...');
        logToFile('Attempting database recovery...');
        try {
          // Move corrupted database to backup
          const corruptedPath = this.dbPath + '.corrupted';
          fs.renameSync(this.dbPath, corruptedPath);
          console.log('📦 Moved corrupted database to:', corruptedPath);
          logToFile(`Moved corrupted database to: ${corruptedPath}`);
          
          // Also remove WAL and SHM files
          const walPath = this.dbPath + '-wal';
          const shmPath = this.dbPath + '-shm';
          if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
          if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
          
          // Try to reinitialize with a fresh database
          console.log('🔄 Retrying with fresh database...');
          logToFile('Retrying with fresh database...');
          return await this.initializeDatabase();
        } catch (recoveryErr) {
          console.error('❌ Recovery failed:', recoveryErr.message);
          logToFile(`Recovery failed: ${recoveryErr.message}`);
          throw new Error(`Database initialization failed and recovery failed: ${error.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Get business name from app configuration
   * @returns {string} Business name or default name
   */
  getBusinessNameFromConfig() {
    const { app } = require('electron');

    // 1) Primary source: POS generator app-config.json (per-tenant config)
    try {
      let configPath;

      if (app.isPackaged) {
        // In packaged apps, app-config.json is emitted next to dist/index.html
        const appPath = app.getAppPath();
        configPath = path.join(appPath, 'dist', 'app-config.json');
      } else {
        // In development, use the template config
        configPath = path.join(__dirname, '..', 'config', 'app-config.json');
      }

      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        const fromTheme = config.theme && config.theme.businessName;
        const fromRoot = config.businessName || config.appTitle;

        const name = fromTheme || fromRoot;
        if (name && name.trim() !== '') {
          return name;
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not read business name from app-config.json:', error.message);
    }

    // 2) Legacy / fallback: resources/config.json (if present)
    try {
      const installRoot = this.getAppInstallationRoot();
      const legacyConfigPath = path.join(installRoot, 'resources', 'config.json');
      if (fs.existsSync(legacyConfigPath)) {
        const legacyConfig = JSON.parse(fs.readFileSync(legacyConfigPath, 'utf8'));
        return legacyConfig.businessName || legacyConfig.appTitle || 'CarthaposDB';
      }
    } catch (error) {
      console.warn('⚠️ Could not read business name from legacy config.json:', error.message);
    }

    // 3) Final default
    return 'CarthaposDB';
  }

  /**
   * Sanitize database name (remove special characters, spaces, etc.)
   * @param {string} name - Business name
   * @returns {string} Sanitized database name
   */
  sanitizeDbName(name) {
    if (!name || name.trim() === '') {
      return 'CarthaposDB';
    }
    
    // Remove special characters and replace spaces with underscores
    return name
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/-+/g, '_') // Replace hyphens with underscores
      .substring(0, 50) // Limit length
      || 'CarthaposDB'; // Fallback if sanitization results in empty string
  }

  /**
   * Check if portable mode is forced via config
   * @returns {boolean} True if portable mode is forced
   */
  isPortableModeForced() {
    try {
      const { app } = require('electron');
      if (app.isPackaged) {
        const exePath = app.getPath('exe');
        const installDir = path.dirname(exePath);
        const configPath = path.join(installDir, 'resources', 'config.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          return config.forcePortableMode === true;
        }
      }
    } catch {
      // Ignore errors, return false
    }
    return false;
  }

  /**
   * Get app installation root path (where the exe is installed)
   * This is the base installation directory, NOT the data folder
   * @returns {string} Installation root path
   */
  getAppInstallationRoot() {
    const { app } = require('electron');
    
    if (app.isPackaged) {
      const exePath = app.getPath('exe');
      return path.dirname(exePath);
    } else {
      // Development mode
      return path.join(__dirname, '../..');
    }
  }

  /**
   * On Windows, permission fixing is handled by the NSIS installer at install time
   * (see nsis-installer.nsh), which creates the data folder with BUILTIN\Users full
   * control. No runtime UAC prompts are needed.
   *
   * This method simply checks if the folder is usable, and if not, returns false
   * so the caller falls back gracefully.
   */
  attemptPermissionFix(folderPath) {
    if (process.platform !== 'win32') return false;

    // The NSIS installer already created the folder with proper permissions.
    // If it doesn't exist or isn't writable, we just return false — no UAC.
    if (!fs.existsSync(folderPath)) {
      console.log('  ⚠️ data folder does not exist (installer may not have created it)');
      return false;
    }

    return this.testFolderWritable(folderPath);
  }

  /**
   * Test if a folder is writable by writing and deleting a temp file
   * @param {string} folderPath - The folder to test
   * @returns {boolean} True if the folder is writable
   */
  testFolderWritable(folderPath) {
    try {
      const testFile = path.join(folderPath, `.test_${Date.now()}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get data folder path (where database, backups, and logs go).
   * The NSIS installer (nsis-installer.nsh) creates `{installDir}\data\` with
   * proper permissions at install time. The app just checks for it and uses it.
   * No runtime UAC prompts or PowerShell scripts are needed.
   * @returns {string} Data folder path
   */
  getDataFolderPath() {
    const { app } = require('electron');
    
    console.log('\n🔍 === DATABASE LOCATION DETECTION ===');
    
    if (app.isPackaged) {
      const installRoot = this.getAppInstallationRoot();
      const dataFolder = path.join(installRoot, 'data');
      
      console.log(`📍 Installation Root: ${installRoot}`);
      console.log(`📍 Target Data Folder: ${dataFolder}`);
      
      try {
        // The NSIS installer already created this folder with proper permissions
        if (fs.existsSync(dataFolder)) {
          if (this.testFolderWritable(dataFolder)) {
            console.log('✅ Data folder is WRITABLE');
            console.log('🎯 SELECTED: Installation Directory');
            console.log(`   Data Location: ${dataFolder}\n`);
            return dataFolder;
          }
          // Folder exists but not writable (unlikely — installer set permissions)
          console.warn('⚠️ Data folder exists but is NOT writable');
        } else {
          // Folder doesn't exist (portable mode or direct exe launch)
          console.log('📁 Data folder not found, attempting to create it...');
          try {
            fs.mkdirSync(dataFolder, { recursive: true });
            console.log('✅ Data folder created');
            if (this.testFolderWritable(dataFolder)) {
              console.log('🎯 SELECTED: Installation Directory');
              console.log(`   Data Location: ${dataFolder}\n`);
              return dataFolder;
            }
          } catch (mkdirErr) {
            console.log(`  ⚠️ Cannot create folder: ${mkdirErr.message}`);
          }
        }
        
        // Fallback to AppData (guaranteed writable)
        console.warn('📁 Falling back to AppData...');
        const fallbackData = path.join(app.getPath('userData'), 'data');
        if (!fs.existsSync(fallbackData)) {
          fs.mkdirSync(fallbackData, { recursive: true });
        }
        console.log('🎯 SELECTED: AppData Fallback');
        console.log(`   Data Location: ${fallbackData}\n`);
        return fallbackData;
      } catch (error) {
        console.error('❌ Critical error determining data folder:', error.message);
        throw error;
      }
    } else {
      // Development: use a local data folder
      console.log('🛠️  DEVELOPMENT MODE');
      const devDataFolder = path.join(__dirname, '../../..', 'dev-data');
      if (!fs.existsSync(devDataFolder)) {
        fs.mkdirSync(devDataFolder, { recursive: true });
      }
      console.log(`📍 Dev Data Path: ${devDataFolder}\n`);
      return devDataFolder;
    }
  }

  /**
   * DEPRECATED: Use getDataFolderPath() instead
   * Kept for backwards compatibility
   */
  getAppInstallPath() {
    return this.getDataFolderPath();
  }

  /**
   * Get AppData path (for backups and legacy compatibility)
   * @returns {string} AppData path
   */
  getAppDataPath() {
    const { app } = require('electron');
    // app.getPath('userData') returns %APPDATA%\Roaming\{app-name}
    return app.getPath('userData');
  }

  /**
   * Get backup directory path (in installation folder)
   * All backups stored in the same place as the database
   * @returns {string} Backup directory path
   */
  getBackupPath() {
    const dataFolder = this.getAppInstallPath();
    const backupFolder = path.join(dataFolder, 'backups');
    
    // Create backup folder if it doesn't exist
    if (!fs.existsSync(backupFolder)) {
      fs.mkdirSync(backupFolder, { recursive: true });
    }
    
    return backupFolder;
  }

  /**
   * Create a backup of the database
   * @param {string} reason - Reason for backup (initial, daily, manual, etc.)
   * @returns {Promise<string>} Backup file path
   */
  async createBackup(reason = 'manual') {
    return new Promise((resolve, reject) => {
      try {
        if (!this.dbPath || !fs.existsSync(this.dbPath)) {
          console.warn('⚠️ No database to backup');
          return resolve(null);
        }

        const backupDir = this.getBackupPath();
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
          console.log('📁 Created backup directory:', backupDir);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                         new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const businessName = this.sanitizeDbName(this.getBusinessNameFromConfig());
        const backupFileName = `${businessName}_${reason}_${timestamp}.db`;
        const backupPath = path.join(backupDir, backupFileName);

        // Copy database file
        fs.copyFileSync(this.dbPath, backupPath);
        console.log(`✅ Database backup created: ${backupPath}`);

        // Clean old backups (keep last 10)
        this.cleanOldBackups(backupDir, 10);

        resolve(backupPath);
      } catch (error) {
        console.error('❌ Error creating backup:', error);
        reject(error);
      }
    });
  }

  /**
   * Clean old backups, keeping only the most recent ones
   * @param {string} backupDir - Backup directory path
   * @param {number} keepCount - Number of backups to keep
   */
  cleanOldBackups(backupDir, keepCount = 10) {
    try {
      if (!fs.existsSync(backupDir)) return;

      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.db'))
        .map(f => ({
          name: f,
          path: path.join(backupDir, f),
          time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // Delete older backups
      if (files.length > keepCount) {
        files.slice(keepCount).forEach(file => {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Deleted old backup: ${file.name}`);
        });
      }
    } catch (error) {
      console.error('❌ Error cleaning old backups:', error);
    }
  }

  /**
   * Create database tables
   */
  async createTables() {
    console.log('🏗️ Creating database tables...');
    
    try {
      const tables = [
      {
        name: 'product_families',
        sql: `CREATE TABLE IF NOT EXISTS product_families (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'products',
        sql: `CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          cost_price DECIMAL(10,2) DEFAULT 0,
          category TEXT,
          family TEXT,
          description TEXT,
          barcode TEXT UNIQUE,
          image TEXT,
          unit TEXT DEFAULT 'unit',
          stock INTEGER DEFAULT 0,
          min_stock INTEGER DEFAULT 0,
          supplier TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'categories',
        sql: `CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          color TEXT DEFAULT '#3B82F6',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'sales',
        sql: `CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          total DECIMAL(10,2) NOT NULL,
          tax DECIMAL(10,2) DEFAULT 0,
          discount DECIMAL(10,2) DEFAULT 0,
          payment_method TEXT DEFAULT 'cash',
          customer_id INTEGER,
          user_id INTEGER,
          table_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'sale_items',
        sql: `CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          FOREIGN KEY (sale_id) REFERENCES sales (id),
          FOREIGN KEY (product_id) REFERENCES products (id)
        )`
      },
      {
        name: 'customers',
        sql: `CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          phone TEXT,
          address TEXT,
          loyalty_points INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'users',
        sql: `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          full_name TEXT,
          email TEXT UNIQUE,
          role TEXT NOT NULL CHECK(role IN ('admin', 'cashier', 'manager')) DEFAULT 'cashier',
          badge_id TEXT UNIQUE,
          pin TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          created_by INTEGER,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`
      },
      {
        name: 'user_modules',
        sql: `CREATE TABLE IF NOT EXISTS user_modules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          module_name TEXT NOT NULL,
          can_read BOOLEAN DEFAULT 1,
          can_create BOOLEAN DEFAULT 0,
          can_update BOOLEAN DEFAULT 0,
          can_delete BOOLEAN DEFAULT 0,
          granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          granted_by INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (granted_by) REFERENCES users(id),
          UNIQUE(user_id, module_name)
        )`
      },
      {
        name: 'audit_logs',
        sql: `CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER NOT NULL,
          user_name TEXT NOT NULL,
          action_type TEXT NOT NULL,
          entity_type TEXT,
          entity_id INTEGER,
          old_value TEXT,
          new_value TEXT,
          ip_address TEXT,
          notes TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`
      },
      {
        name: 'cash_drawer_events',
        sql: `CREATE TABLE IF NOT EXISTS cash_drawer_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER NOT NULL,
          user_name TEXT NOT NULL,
          action TEXT NOT NULL CHECK(action IN ('open', 'close', 'count')),
          reason TEXT,
          amount_expected DECIMAL(10,2),
          amount_actual DECIMAL(10,2),
          difference DECIMAL(10,2),
          notes TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`
      },
      {
        name: 'restaurant_tables',
        sql: `CREATE TABLE IF NOT EXISTS restaurant_tables (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_number TEXT NOT NULL,
          capacity INTEGER DEFAULT 2,
          status TEXT DEFAULT 'available',
          current_order_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'user_sessions',
        sql: `CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          logout_time DATETIME,
          ip_address TEXT,
          device_info TEXT,
          session_duration INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`
      },
      {
        name: 'stock_movements',
        sql: `CREATE TABLE IF NOT EXISTS stock_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          product_name TEXT,
          movement_type TEXT NOT NULL CHECK(movement_type IN ('in','out','adjustment','initial','correction','purchase','waste','return','sale')),
          quantity INTEGER NOT NULL,
          stock_before INTEGER DEFAULT 0,
          stock_after INTEGER DEFAULT 0,
          reason TEXT,
          reference TEXT,
          user_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id)
        )`
      },
      {
        name: 'shifts',
        sql: `CREATE TABLE IF NOT EXISTS shifts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          user_name TEXT,
          opening_float DECIMAL(10,2) DEFAULT 0,
          closed_at DATETIME,
          opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'open' CHECK(status IN ('open','closed')),
          closing_expected DECIMAL(10,2) DEFAULT 0,
          closing_actual DECIMAL(10,2) DEFAULT 0,
          difference DECIMAL(10,2) DEFAULT 0,
          cash_sales DECIMAL(10,2) DEFAULT 0,
          card_sales DECIMAL(10,2) DEFAULT 0,
          other_sales DECIMAL(10,2) DEFAULT 0,
          note TEXT,
          denomination_breakdown TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`
      },
      {
        name: 'settings',
        sql: `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'kitchen_orders',
        sql: `CREATE TABLE IF NOT EXISTS kitchen_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_number TEXT NOT NULL,
          items TEXT,
          notes TEXT DEFAULT '',
          priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','preparing','ready','served','completed','cancelled')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME
        )`
      },
      {
        name: 'services',
        sql: `CREATE TABLE IF NOT EXISTS services (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          price DECIMAL(10,2) NOT NULL DEFAULT 0,
          duration INTEGER DEFAULT 30,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'appointments',
        sql: `CREATE TABLE IF NOT EXISTS appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          customer_phone TEXT,
          service_id INTEGER,
          appointment_date DATETIME NOT NULL,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','confirmed','in_progress','completed','cancelled','no_show')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (service_id) REFERENCES services(id)
        )`
      },
      {
        name: 'suppliers',
        sql: `CREATE TABLE IF NOT EXISTS suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          contact TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          notes TEXT DEFAULT '',
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'held_orders',
        sql: `CREATE TABLE IF NOT EXISTS held_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          items TEXT NOT NULL,
          table_id INTEGER,
          table_number TEXT,
          total DECIMAL(10,2) NOT NULL DEFAULT 0,
          subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
          tax DECIMAL(10,2) NOT NULL DEFAULT 0,
          discount DECIMAL(10,2) NOT NULL DEFAULT 0,
          discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
          customer_id INTEGER,
          customer_name TEXT,
          notes TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      }
    ];

    for (const table of tables) {
      try {
        await this.runQuery(table.sql);
        console.log(`✅ Table '${table.name}' created/verified`);
      } catch (tableError) {
        const errorMsg = `Error creating table '${table.name}': ${tableError.message}`;
        console.error(`❌ ${errorMsg}`);
        console.error(`📜 Full error:`, tableError);
        logToFile(errorMsg);
        logToFile(`Full error: ${JSON.stringify(tableError, null, 2)}`);
        throw new Error(errorMsg);
      }
    }

    // Create indexes for better query performance
    console.log('🔧 Creating database indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_families_name ON product_families(name)',
      'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action_type)',
      'CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_cash_drawer_timestamp ON cash_drawer_events(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_cash_drawer_user ON cash_drawer_events(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_modules_user ON user_modules(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_kitchen_status ON kitchen_orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_kitchen_created ON kitchen_orders(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_kitchen_priority ON kitchen_orders(priority)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_service ON appointments(service_id)',
      'CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)',
      'CREATE INDEX IF NOT EXISTS idx_services_name ON services(name)',
      'CREATE INDEX IF NOT EXISTS idx_held_orders_created ON held_orders(created_at)'
    ];

    for (const indexSql of indexes) {
      try {
        await this.runQuery(indexSql);
      } catch (indexError) {
        console.warn(`⚠️ Warning: Could not create index:`, indexError.message);
        // Don't throw for indexes - they're optional
      }
    }
    console.log('✅ Database indexes created');

    // Migration: Add icon column to product_families if not exists
    try {
      await this.runQuery("ALTER TABLE product_families ADD COLUMN icon TEXT DEFAULT ''");
      console.log('✅ Migration: Added icon column to product_families');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add phone column to users if not exists
    try {
      await this.runQuery("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''");
      console.log('✅ Migration: Added phone column to users');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add table_id column to sales if not exists
    try {
      await this.runQuery("ALTER TABLE sales ADD COLUMN table_id INTEGER DEFAULT NULL");
      console.log('✅ Migration: Added table_id column to sales');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add subtotal column to sales if not exists
    try {
      await this.runQuery("ALTER TABLE sales ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0");
      console.log('✅ Migration: Added subtotal column to sales');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add notes column to sales if not exists
    try {
      await this.runQuery("ALTER TABLE sales ADD COLUMN notes TEXT DEFAULT ''");
      console.log('✅ Migration: Added notes column to sales');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add visit_count to customers if not exists
    try {
      await this.runQuery("ALTER TABLE customers ADD COLUMN visit_count INTEGER DEFAULT 0");
      console.log('✅ Migration: Added visit_count to customers');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add total_spent to customers if not exists
    try {
      await this.runQuery("ALTER TABLE customers ADD COLUMN total_spent DECIMAL(10,2) DEFAULT 0");
      console.log('✅ Migration: Added total_spent to customers');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add last_visit_date to customers if not exists
    try {
      await this.runQuery("ALTER TABLE customers ADD COLUMN last_visit_date DATETIME DEFAULT NULL");
      console.log('✅ Migration: Added last_visit_date to customers');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add sale_id to kitchen_orders if not exists
    try {
      await this.runQuery("ALTER TABLE kitchen_orders ADD COLUMN sale_id INTEGER DEFAULT NULL");
      console.log('✅ Migration: Added sale_id to kitchen_orders');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add total to kitchen_orders if not exists
    try {
      await this.runQuery("ALTER TABLE kitchen_orders ADD COLUMN total DECIMAL(10,2) DEFAULT 0");
      console.log('✅ Migration: Added total to kitchen_orders');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add started_at to kitchen_orders if not exists
    try {
      await this.runQuery("ALTER TABLE kitchen_orders ADD COLUMN started_at DATETIME DEFAULT NULL");
      console.log('✅ Migration: Added started_at to kitchen_orders');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add completed_at to kitchen_orders if not exists
    try {
      await this.runQuery("ALTER TABLE kitchen_orders ADD COLUMN completed_at DATETIME DEFAULT NULL");
      console.log('✅ Migration: Added completed_at to kitchen_orders');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add x,y to restaurant_tables if not exists
    try {
      await this.runQuery("ALTER TABLE restaurant_tables ADD COLUMN x INTEGER DEFAULT 50");
      console.log('✅ Migration: Added x to restaurant_tables');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    try {
      await this.runQuery("ALTER TABLE restaurant_tables ADD COLUMN y INTEGER DEFAULT 50");
      console.log('✅ Migration: Added y to restaurant_tables');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add waiter to restaurant_tables if not exists
    try {
      await this.runQuery("ALTER TABLE restaurant_tables ADD COLUMN waiter TEXT DEFAULT ''");
      console.log('✅ Migration: Added waiter to restaurant_tables');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add notes to restaurant_tables if not exists
    try {
      await this.runQuery("ALTER TABLE restaurant_tables ADD COLUMN notes TEXT DEFAULT ''");
      console.log('✅ Migration: Added notes to restaurant_tables');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add merged_tables to restaurant_tables if not exists
    try {
      await this.runQuery("ALTER TABLE restaurant_tables ADD COLUMN merged_tables TEXT DEFAULT NULL");
      console.log('✅ Migration: Added merged_tables to restaurant_tables');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add merged_into to restaurant_tables if not exists
    try {
      await this.runQuery("ALTER TABLE restaurant_tables ADD COLUMN merged_into INTEGER DEFAULT NULL");
      console.log('✅ Migration: Added merged_into to restaurant_tables');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add zone to restaurant_tables if not exists
    try {
      await this.runQuery("ALTER TABLE restaurant_tables ADD COLUMN zone TEXT DEFAULT ''");
      console.log('✅ Migration: Added zone to restaurant_tables');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add area_name to restaurant_tables if not exists
    try {
      await this.runQuery("ALTER TABLE restaurant_tables ADD COLUMN area_name TEXT DEFAULT ''");
      console.log('✅ Migration: Added area_name to restaurant_tables');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add shift_id to sales if not exists
    try {
      await this.runQuery("ALTER TABLE sales ADD COLUMN shift_id INTEGER DEFAULT NULL REFERENCES shifts(id)");
      console.log('✅ Migration: Added shift_id to sales');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add cost_price to products if not exists
    try {
      await this.runQuery("ALTER TABLE products ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0");
      console.log('✅ Migration: Added cost_price to products');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add unit to products if not exists
    try {
      await this.runQuery("ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'unit'");
      console.log('✅ Migration: Added unit to products');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add supplier to products if not exists
    try {
      await this.runQuery("ALTER TABLE products ADD COLUMN supplier TEXT DEFAULT ''");
      console.log('✅ Migration: Added supplier to products');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Add notes to suppliers if not exists
    try {
      await this.runQuery("ALTER TABLE suppliers ADD COLUMN notes TEXT DEFAULT ''");
      console.log('✅ Migration: Added notes to suppliers');
    } catch (migrateError) {
      if (!migrateError.message.includes('duplicate column')) {
        console.warn(`⚠️ Migration note: ${migrateError.message}`);
      }
    }

    // Migration: Expand stock_movements CHECK constraint to include new types
    try {
      // SQLite cannot ALTER CHECK constraints; recreate the table
      await this.runQuery("ALTER TABLE stock_movements RENAME TO stock_movements_old");
      await this.runQuery(`CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        product_name TEXT,
        movement_type TEXT NOT NULL CHECK(movement_type IN ('in','out','adjustment','initial','correction','purchase','waste','return','sale')),
        quantity INTEGER NOT NULL,
        stock_before INTEGER DEFAULT 0,
        stock_after INTEGER DEFAULT 0,
        reason TEXT,
        reference TEXT,
        user_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`);
      await this.runQuery("INSERT INTO stock_movements SELECT * FROM stock_movements_old");
      await this.runQuery("DROP TABLE stock_movements_old");
      console.log('✅ Migration: Expanded stock_movements movement types');
    } catch (migrateError) {
      if (migrateError.message.includes('no such table')) {
        console.log('ℹ️ Migration skip: stock_movements_old does not exist (first run?)');
      } else {
        console.warn(`⚠️ Migration note (stock_movements types): ${migrateError.message}`);
      }
    }

    // Insert default data
    await this.insertDefaultData();
    console.log('✅ Database tables and indexes created successfully');
    } catch (error) {
      console.error('❌ Critical error during table creation:', error);
      logToFile(`Critical error during table creation: ${error.message}`);
      logToFile(`Stack: ${error.stack}`);
      throw new Error(`Database initialization failed during table creation: ${error.message}`);
    }
  }

  /**
   * Insert default data
   */
  async insertDefaultData() {
    console.log('📊 Skipping default data insertion - POS starts empty for client customization');
    
    // POS database is now empty by default
    // Clients can add their own products, categories, and data
    
    console.log('✅ Database ready (empty)');
  }

  /**
   * Run a database query
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Database query error:', err.message);
          console.error('📜 SQL that failed:', sql.substring(0, 200) + (sql.length > 200 ? '...' : ''));
          console.error('📋 Error details:', err.code, err.errno);
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Run multiple queries inside an atomic SQL transaction (BEGIN / COMMIT / ROLLBACK).
   * Guarantees that all queries succeed together or the DB is left unchanged.
   *
   * @param {function} callback - A function that receives a `query` helper.
   *   The `query(sql, params)` helper returns a Promise<{lastID, changes}>.
   *   If the callback throws or returns a rejected promise, ROLLBACK is issued.
   * @returns {Promise<any>} Resolves with the value returned by the callback.
   */
  async runTransaction(callback) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db.run('BEGIN', (beginErr) => {
        if (beginErr) {
          console.error('❌ Transaction BEGIN failed:', beginErr.message);
          return reject(beginErr);
        }

        const run = (sql, params = []) => {
          return new Promise((res, rej) => {
            this.db.run(sql, params, function(err) {
              if (err) rej(err);
              else res({ lastID: this.lastID, changes: this.changes });
            });
          });
        };

        const get = (sql, params = []) => {
          return new Promise((res, rej) => {
            this.db.get(sql, params, (err, row) => {
              if (err) rej(err);
              else res(row);
            });
          });
        };

        const all = (sql, params = []) => {
          return new Promise((res, rej) => {
            this.db.all(sql, params, (err, rows) => {
              if (err) rej(err);
              else res(rows);
            });
          });
        };

        const doRollback = (err) => {
          this.db.run('ROLLBACK', () => reject(err));
        };

        let result;
        try {
          result = callback({ run, get, all });
        } catch (syncErr) {
          return doRollback(syncErr);
        }

        if (result && typeof result.then === 'function') {
          result.then((val) => {
            this.db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                console.error('❌ Transaction COMMIT failed:', commitErr.message);
                this.db.run('ROLLBACK', () => reject(commitErr));
              } else {
                resolve(val);
              }
            });
          }).catch(doRollback);
        } else {
          this.db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              console.error('❌ Transaction COMMIT failed:', commitErr.message);
              this.db.run('ROLLBACK', () => reject(commitErr));
            } else {
              resolve(result);
            }
          });
        }
      });
    });
  }

  /**
   * Get data from database
   */
  getData(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Database query error:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get single row from database
   */
  getRow(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('❌ Database query error:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    if (!this.isInitialized) {
      return { error: 'Database not initialized' };
    }

    try {
      const stats = {};
      
      const tables = [
        'products',
        'categories',
        'product_families',
        'sales',
        'sale_items',
        'customers',
        'users',
        'user_modules',
        'audit_logs',
        'cash_drawer_events',
        'restaurant_tables',
        'user_sessions',
        'stock_movements',
        'shifts',
        'settings',
        'kitchen_orders',
        'services',
        'appointments',
        'suppliers',
        'held_orders'
      ];
      
      for (const table of tables) {
        const result = await this.getRow(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = result ? result.count : 0;
      }

      stats.dbPath = this.dbPath;
      stats.isInitialized = this.isInitialized;
      
      return stats;
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Close database connection
   */
  closeDatabase() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err.message);
        } else {
          console.log('✅ Database connection closed');
        }
      });
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get database instance
   */
  getDatabase() {
    return this.db;
  }

  /**
   * Get query optimizer for optimized queries with caching and timeout protection
   */
  getQueryOptimizer() {
    return this.queryOptimizer;
  }

  /**
   * Get the database file path
   * @returns {string|null}
   */
  getDatabasePath() {
    return this.dbPath || null;
  }

  /**
   * Check if database is initialized
   */
  isDatabaseInitialized() {
    return this.isInitialized;
  }

  /**
   * Close database connection gracefully
   */
  close() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
          reject(err);
        } else {
          console.log('Database connection closed successfully');
          this.db = null;
          this.isInitialized = false;
          resolve();
        }
      });
    });
  }
}

module.exports = ElectronDatabaseManager;
