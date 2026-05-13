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
    const logDir = path.join(app.getPath('userData'), 'logs');
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
      const appPath = this.getAppInstallPath();
      const legacyConfigPath = path.join(appPath, 'resources', 'config.json');
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
      const appPath = this.getAppInstallPath();
      const dbDir = path.join(appPath, 'data');
      
      console.log('📁 App installation path:', appPath);
      console.log('📁 Database directory path:', dbDir);
      
      // Create data directory if it doesn't exist
      let dbDirFinal = dbDir;
      try {
        if (!fs.existsSync(dbDirFinal)) {
          fs.mkdirSync(dbDirFinal, { recursive: true });
          console.log('✅ Created database directory:', dbDirFinal);
        } else {
          console.log('✅ Database directory already exists:', dbDirFinal);
        }

        // Test write permissions
        const testFile = path.join(dbDirFinal, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('✅ Database directory is writable');
      } catch (dirError) {
        console.error('❌ Cannot write to installation directory:', dirError.message);
        console.log('⚠️ Falling back to AppData directory');

        // Fallback to AppData if installation directory is not writable
        const { app } = require('electron');
        dbDirFinal = path.join(app.getPath('userData'), 'data');

        if (!fs.existsSync(dbDirFinal)) {
          fs.mkdirSync(dbDirFinal, { recursive: true });
        }

        console.log('📁 Using fallback directory:', dbDirFinal);
      }

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
      const appPath = this.getAppInstallPath();
      const legacyConfigPath = path.join(appPath, 'resources', 'config.json');
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
   * Get app installation path (where the exe is installed)
   * @returns {string} Installation path
   */
  getAppInstallPath() {
    const { app } = require('electron');
    
    console.log('\n🔍 === DATABASE LOCATION DETECTION ===');
    
    // Check if portable mode is forced
    const forcePortable = this.isPortableModeForced();
    if (forcePortable) {
      console.log('🎯 Portable mode FORCED via config.json (forcePortableMode: true)');
    }
    
    // In production (packaged app), we want the directory where the .exe is located
    if (app.isPackaged) {
      const exePath = app.getPath('exe');
      const installDir = path.dirname(exePath);
      console.log(`📍 EXE Path: ${exePath}`);
      console.log(`📍 Install Directory: ${installDir}`);
      
      // Test if install directory is writable
      try {
        const testFile = path.join(installDir, `.carthapos_write_test_${Date.now()}`);
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('✅ Install directory is WRITABLE');
        console.log('🎯 SELECTED: Install Directory (Portable Mode)');
        console.log('   Database will be in: <InstallDir>/data/');
        console.log('═══════════════════════════════════\n');
        return installDir;
      } catch (writeError) {
        console.log('❌ Install directory is NOT WRITABLE');
        console.log(`   Reason: ${writeError.message}`);
        
        if (forcePortable) {
          console.log('🚨 ERROR: Portable mode forced but install directory not writable!');
          console.log('   Please install in a writable location (e.g., D:\\Apps)');
          console.log('   instead of system folders (Program Files)');
          console.log('═══════════════════════════════════\n');
          throw new Error('Portable mode required but installation directory is not writable. Please install to a user-writable location.');
        }
        
        console.log('⚠️  Falling back to AppData (User Data) directory...');
        const userData = app.getPath('userData');
        console.log(`📍 User Data Path: ${userData}`);
        console.log('✅ User Data Path is ALWAYS WRITABLE');
        console.log('🎯 SELECTED: AppData (Non-Portable Mode)');
        console.log('   Database will be in: %APPDATA%/Roaming/<AppName>/');
        console.log('   This is normal for system-wide installations (Program Files)');
        console.log('═══════════════════════════════════\n');
        return userData;
      }
    } else {
      // Development: use userData for testing
      console.log('🛠️  DEVELOPMENT MODE');
      const userData = app.getPath('userData');
      console.log(`📍 User Data Path: ${userData}`);
      console.log('🎯 SELECTED: AppData (Development Mode)');
      console.log('═══════════════════════════════════\n');
      return userData;
    }
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
   * Get backup directory path (in AppData for safety)
   * @returns {string} Backup directory path
   */
  getBackupPath() {
    const businessName = this.getBusinessNameFromConfig();
    const sanitizedName = this.sanitizeDbName(businessName);
    return path.join(this.getAppDataPath(), sanitizedName, 'backups');
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
          category TEXT,
          family TEXT,
          description TEXT,
          barcode TEXT UNIQUE,
          image TEXT,
          stock INTEGER DEFAULT 0,
          min_stock INTEGER DEFAULT 0,
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
      'CREATE INDEX IF NOT EXISTS idx_user_modules_user ON user_modules(user_id)'
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
        'sales', 
        'customers', 
        'users', 
        'user_modules', 
        'audit_logs', 
        'cash_drawer_events', 
        'user_sessions'
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
}

module.exports = ElectronDatabaseManager;
