/**
 * Asset Manager - Handles file copying, template processing, and asset management
 * Extracted from pos-generator.js for better modularity
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('../common/logger');

const logger = createLogger('AssetManager');

class AssetManager {
  constructor(projectPath) {
    this.projectPath = projectPath;
    // Check multiple possible locations for pos-template
    const possiblePaths = [
      path.join(__dirname, '..', '..', '..', 'pos-template'), // Local dev
      '/app/pos-template', // Docker/Production
      path.join(process.cwd(), 'pos-template'), // Fallback
      path.join(process.cwd(), '..', 'pos-template') // Another fallback
    ];
    
    this.templatePath = possiblePaths.find(p => fs.existsSync(p));
    
    if (!this.templatePath) {
      logger.error('pos-template not found in any expected location');
      logger.error('Searched paths:', possiblePaths);
      throw new Error('pos-template directory not found');
    }
    
    logger.info(`Using pos-template from: ${this.templatePath}`);
  }

  /**
   * Copy template files to project directory
   */
  async copyTemplate() {
    const t0 = performance.now();
    logger.info('Copying template files to project directory');

    try {
      if (!fs.existsSync(this.templatePath)) {
        throw new Error(`Template directory not found: ${this.templatePath}`);
      }

      // Ensure project directory exists
      if (!fs.existsSync(this.projectPath)) {
        fs.mkdirSync(this.projectPath, { recursive: true });
      }

       // Copy all template files
       await this.copyDirectoryRecursive(this.templatePath, this.projectPath);
       
       logger.info(`Template files copied successfully (${(performance.now() - t0).toFixed(0)}ms)`);
       
       // DEFENSIVE: Ensure essential component files exist (in case they were missed)
       await this.ensureEssentialFiles();
    } catch (error) {
      logger.error('Failed to copy template files:', error);
      throw error;
    }
  }

  /**
   * Recursively copy directory contents with parallel file operations
   * Using Promise.all for parallel copying instead of sequential fs.copyFileSync
   */
  async copyDirectoryRecursive(source, destination) {
    const entries = fs.readdirSync(source, { withFileTypes: true });
    
    // Separate directories and files for parallel processing
    const directories = [];
    const files = [];
    const copyTasks = [];

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and other unnecessary directories
        if (!this.shouldSkipDirectory(entry.name)) {
          directories.push({ sourcePath, destPath });
        }
      } else {
        // Skip unnecessary files
        if (!this.shouldSkipFile(entry.name)) {
          files.push({ sourcePath, destPath });
        }
      }
    }

    // Process directories sequentially (need to create them first)
    for (const { sourcePath, destPath } of directories) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      await this.copyDirectoryRecursive(sourcePath, destPath);
    }

    // Copy files in parallel for speed (max 8 concurrent operations)
    const chunkSize = 8;
    for (let i = 0; i < files.length; i += chunkSize) {
      const chunk = files.slice(i, i + chunkSize);
      const promises = chunk.map(({ sourcePath, destPath }) =>
        this.copyFileAsync(sourcePath, destPath)
      );
      await Promise.all(promises);
    }
  }

  /**
   * Async file copy helper
   */
  async copyFileAsync(source, destination) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(source);
      const writeStream = fs.createWriteStream(destination);
      
      readStream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', () => {
        logger.debug(`Copied file: ${path.basename(source)}`);
        resolve();
      });
      
      readStream.pipe(writeStream);
    });
  }

  /**
   * Check if directory should be skipped
   */
  shouldSkipDirectory(name) {
    const skipDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.vscode',
      '.idea',
      'tmp',
      'temp'
    ];
    return skipDirs.includes(name);
  }

  /**
   * Check if file should be skipped
   */
  shouldSkipFile(name) {
    const skipFiles = [
      '.DS_Store',
      'Thumbs.db',
      '.env',
      '.env.local',
      '.env.development',
      '.env.production',
      '*.log',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*'
    ];
    
    return skipFiles.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(name);
      }
      return pattern === name;
    });
  }

  /**
   * Ensure preload file exists for Electron
   */
  async ensurePreloadFile() {
    logger.debug('Ensuring preload file exists');

    const preloadPath = path.join(this.projectPath, 'src', 'electron', 'preload.js');
    
    if (!fs.existsSync(preloadPath)) {
      const preloadDir = path.dirname(preloadPath);
      if (!fs.existsSync(preloadDir)) {
        fs.mkdirSync(preloadDir, { recursive: true });
      }

      const preloadContent = this.generatePreloadScript();
      fs.writeFileSync(preloadPath, preloadContent);
      logger.debug('Preload file created');
    } else {
      logger.debug('Preload file already exists');
    }
  }

  /**
   * Generate preload script content
   */
  generatePreloadScript() {
    return `/**
 * Electron Preload Script
 * Auto-generated by POS Generator
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  database: {
    query: (sql, params) => ipcRenderer.invoke('database:query', sql, params),
    execute: (sql, params) => ipcRenderer.invoke('database:execute', sql, params),
    transaction: (queries) => ipcRenderer.invoke('database:transaction', queries)
  },

  // License operations
  license: {
    validate: () => ipcRenderer.invoke('license:validate'),
    getInfo: () => ipcRenderer.invoke('license:getInfo'),
    checkExpiry: () => ipcRenderer.invoke('license:checkExpiry')
  },

  // Window operations
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },

  // File operations
  file: {
    selectDirectory: () => ipcRenderer.invoke('file:selectDirectory'),
    selectFile: (filters) => ipcRenderer.invoke('file:selectFile', filters),
    saveFile: (data, filename) => ipcRenderer.invoke('file:saveFile', data, filename)
  },

  // Settings
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll')
  },

  // Notifications
  notifications: {
    show: (title, body, options) => ipcRenderer.invoke('notifications:show', title, body, options)
  }
});

// Listen for window events
window.addEventListener('DOMContentLoaded', () => {
  console.log('POS Application preload script loaded');
});
`;
  }

  /**
   * Rename Electron files with proper naming convention
   */
  async renameElectronFiles() {
    logger.debug('Renaming Electron files');

    const electronDir = path.join(this.projectPath, 'src', 'electron');
    if (!fs.existsSync(electronDir)) {
      logger.warn('Electron directory not found, skipping rename');
      return;
    }

    // Rename main.js to electron-main.js if it exists
    const mainPath = path.join(electronDir, 'main.js');
    const electronMainPath = path.join(electronDir, 'electron-main.js');
    
    if (fs.existsSync(mainPath) && !fs.existsSync(electronMainPath)) {
      fs.renameSync(mainPath, electronMainPath);
      logger.debug('Renamed main.js to electron-main.js');
    }

    // Ensure proper file structure
    await this.ensureElectronStructure();
  }

  /**
   * Create config.json file with business configuration
   * @param {Object} license - License object containing configuration
   */
  async createConfigFile(license) {
    logger.info('Creating config files with business configuration');

    try {
      // 1. Create resources/config.json (for backward compatibility)
      const resourcesDir = path.join(this.projectPath, 'resources');
      if (!fs.existsSync(resourcesDir)) {
        fs.mkdirSync(resourcesDir, { recursive: true });
        logger.debug('Created resources directory');
      }

      // Extract business name from license configuration
      // Priority: configuration.businessName > client.name > license sector > 'CarthaposDB'
      let businessName = null;
      
      if (license.configuration?.businessName) {
        businessName = license.configuration.businessName;
        logger.info(`📝 Business name from configuration: ${businessName}`);
      } else if (license.client?.name) {
        businessName = license.client.name;
        logger.info(`📝 Business name from client: ${businessName}`);
      } else if (license.sector) {
        businessName = license.sector;
        logger.info(`📝 Business name from sector: ${businessName}`);
      } else {
        businessName = 'CarthaposDB';
        logger.warn(`⚠️ Using default business name: ${businessName}`);
      }
      
      const databaseFilename = `${this.sanitizeDbBaseName(businessName)}.db`;
      logger.info(`📊 Sanitized database name: ${databaseFilename}`);
      
      // Check if portable mode should be forced (from license configuration)
      const forcePortableMode = license.configuration?.forcePortableMode === true;
      
      // Create config object for resources/config.json
      const config = {
        businessName: businessName,
        clientId: license.clientId,
        licenseKey: license.licenseKey,
        forcePortableMode: forcePortableMode,
        createdAt: new Date().toISOString(),
        version: '1.0.0'
      };

      // Write resources/config.json
      const configPath = path.join(resourcesDir, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      
      logger.info(`✅ Resources config created at: ${configPath}`);

      // 2. Create public/app-config.json (for Electron main process)
      const publicDir = path.join(this.projectPath, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
        logger.debug('Created public directory');
      }

      // Check if this license should require USB (for security/anti-piracy)
      // Default: true (USB required) unless explicitly set to false in license configuration
      const requireUSB = license.configuration?.requireUSBLicense !== false;

      // Filter to only include ENABLED modules
      const enabledModules = (license.modules || []).filter(m => m.isEnabled === true);
      
      // ALWAYS merge with features if available (features is the authoritative source)
      let modulesForConfig = [...enabledModules];
      if (license.configuration?.features) {
        const existingNames = modulesForConfig
          .map(m => m.module?.name || m.name)
          .filter(Boolean);

        Object.entries(license.configuration.features)
          .filter(([name, enabled]) => enabled === true && !existingNames.includes(name))
          .forEach(([name]) => {
            logger.info(`➕ Adding module from features: ${name}`);
            modulesForConfig.push({ name, isEnabled: true });
          });
      }

      // Create app config with embedded license data
      const appConfig = {
        license: {
          id: license.id,
          licenseKey: license.licenseKey,
          clientId: license.clientId,
          clientName: license.client?.name || businessName,
          licenseType: license.licenseType,
          bindingType: license.bindingType || 'MACHINE',
          machineId: license.machineId || null,
          expirationDate: license.expirationDate || null,
          isActive: license.isActive,
          isActivated: license.isActivated || false,
          activatedAt: license.activatedAt || null,
          lastValidatedAt: license.lastValidatedAt || null,
          modules: modulesForConfig,
          configuration: license.configuration || {}
        },
        modules: modulesForConfig,
        features: license.configuration?.features || {},  // Include features for reference
        theme: {
          // Ensure businessName is prominently set in theme
          businessName: businessName,
          ...( license.configuration || {}), // Spread all theme settings from configuration
          // Ensure these core properties exist
          primaryColor: license.configuration?.primaryColor || '#3B82F6',
          secondaryColor: license.configuration?.secondaryColor || '#1E40AF',
          backgroundColor: license.configuration?.backgroundColor || '#FFFFFF',
          textColor: license.configuration?.textColor || '#1F2937'
        },
        database: {
          type: 'sqlite',
          filename: databaseFilename  // Use the sanitized business name
        },
        security: {
          requireUSBLicense: requireUSB, // Default: true (USB required for security)
          licenseFileName: 'license.key'
        }
      };

      // Write public/app-config.json
      const appConfigPath = path.join(publicDir, 'app-config.json');
      fs.writeFileSync(appConfigPath, JSON.stringify(appConfig, null, 2), 'utf8');
      
        logger.info(`✅ App config created at: ${appConfigPath}`);
        logger.info(`📝 Business name: ${businessName}`);
        logger.info(`🗄️ Database filename: ${databaseFilename}`);
        logger.info(`🔑 License key: ${license.licenseKey}`);
        logger.info(`📦 Enabled modules: ${modulesForConfig.length}/${license.modules?.length || '?'}`);
        logger.info(`🎯 Portable mode: ${forcePortableMode ? 'FORCED' : 'AUTO (install dir if writable)'}`);
        logger.info(`🔒 USB License required: ${requireUSB ? 'YES (anti-piracy protection)' : 'NO (trusted client)'}`);
       
        // Log the actual config being written
        logger.info(`📋 App config content:`);
        logger.info(JSON.stringify(appConfig, null, 2));

      return appConfigPath;
    } catch (error) {
      logger.error('❌ Failed to create config files:', error);
      throw error;
    }
  }

  sanitizeDbBaseName(name) {
    const safe = (name || '')
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
    return safe || 'CarthaposDB';
  }

  /**
   * Ensure proper Electron directory structure
   */
  async ensureElectronStructure() {
    const electronDir = path.join(this.projectPath, 'src', 'electron');
    
    // Create directories if they don't exist
    const requiredDirs = [
      path.join(electronDir, 'managers'),
      path.join(electronDir, 'utils'),
      path.join(electronDir, 'database')
    ];

    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.debug(`Created directory: ${path.relative(this.projectPath, dir)}`);
      }
    }
  }

  /**
   * Update asset references in HTML and JS files with branded content
   * @param {string} businessName - Business name for window title
   * @param {string} primaryColor - Primary color for generated favicon
   * @param {string|null} logoPath - Path to business logo file (optional)
   */
  async updateAssetReferences(businessName, primaryColor = '#3B82F6', logoPath = null) {
    logger.debug('Updating asset references with business name:', businessName);

    const htmlPath = path.join(this.projectPath, 'index.html');
    if (!fs.existsSync(htmlPath)) {
      logger.warn('index.html not found, skipping asset reference update');
      return;
    }

    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Update title with business name
    htmlContent = htmlContent.replace(
      /<title>.*<\/title>/,
      `<title>${businessName}</title>`
    );
    logger.info(`✅ Updated window title to: ${businessName}`);

    // Generate branded favicon SVG and write to public/
    const publicDir = path.join(this.projectPath, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    this.generateBrandedFavicon(primaryColor, businessName, publicDir);

    // Update favicon reference to use the generated SVG
    htmlContent = htmlContent.replace(
      /<link[^>]*rel="icon"[^>]*>/,
      `<link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <link rel="alternate icon" href="./favicon.ico" />`
    );
    
    fs.writeFileSync(htmlPath, htmlContent);
    logger.debug('HTML references updated with branding');
  }

  /**
   * Generate a branded favicon SVG based on primary color
   */
  generateBrandedFavicon(color, name, outputDir) {
    const initials = (name || 'PS').substring(0, 2).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${color}"/>
  <text x="16" y="22" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="white">${initials}</text>
</svg>`;
    fs.writeFileSync(path.join(outputDir, 'favicon.svg'), svg);
    // Also write a 1x1 PNG placeholder as favicon.ico for legacy browsers
    // The actual .ico will be handled by the generator; this prevents 404s
    const minimalIco = Buffer.from([0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    fs.writeFileSync(path.join(outputDir, 'favicon.ico'), minimalIco);
    logger.info(`✅ Generated favicon with initials "${initials}" (color: ${color})`);
  }

  /**
   * Copy business logo to public/ directory if provided
   */
  async copyBusinessLogo(logoPath) {
    if (!logoPath || !fs.existsSync(logoPath)) {
      logger.debug('No business logo to copy');
      return null;
    }
    const publicDir = path.join(this.projectPath, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const ext = path.extname(logoPath) || '.png';
    const destName = `business-logo${ext}`;
    const destPath = path.join(publicDir, destName);
    fs.copyFileSync(logoPath, destPath);
    logger.info(`✅ Business logo copied to: ${destPath}`);
    return destName;
  }

  /**
   * Get template summary for logging
   */
  getTemplateSummary() {
    const stats = {
      templatePath: this.templatePath,
      projectPath: this.projectPath,
      templateExists: fs.existsSync(this.templatePath),
      projectExists: fs.existsSync(this.projectPath)
    };

    if (stats.templateExists) {
      try {
        const templateFiles = this.countFilesRecursive(this.templatePath);
        stats.templateFileCount = templateFiles;
      } catch (error) {
        stats.templateFileCount = 'unknown';
      }
    }

    return stats;
  }

  /**
   * Count files in directory recursively
   */
  countFilesRecursive(dir) {
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
        count += this.countFilesRecursive(path.join(dir, entry.name));
      } else if (entry.isFile() && !this.shouldSkipFile(entry.name)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Ensure essential component files exist (defensive check)
   * Sometimes parallel copy operations may miss files - this ensures they're all present
   */
  async ensureEssentialFiles() {
    try {
      // List of essential component files that must be copied
      const essentialComponents = [
        'ProductFormDialog.jsx',
        'POSNavbar.jsx',
        'POSContent.jsx',
        'POSHeader.jsx',
        'Layout.jsx',
        'ThemeWrapper.jsx',
        'SetupWizard.jsx'
      ];

      const componentsDir = path.join(this.projectPath, 'src', 'components');
      const templateComponentsDir = path.join(this.templatePath, 'src', 'components');

      if (!fs.existsSync(componentsDir)) {
        logger.warn('Components directory does not exist yet');
        return;
      }

      let copiedCount = 0;
      for (const componentFile of essentialComponents) {
        const destPath = path.join(componentsDir, componentFile);
        const sourcePath = path.join(templateComponentsDir, componentFile);

        // If file doesn't exist in destination, copy from template
        if (!fs.existsSync(destPath) && fs.existsSync(sourcePath)) {
          try {
            fs.copyFileSync(sourcePath, destPath);
            logger.info(`📋 Recovered missing component: ${componentFile}`);
            copiedCount++;
          } catch (err) {
            logger.warn(`Could not recover ${componentFile}: ${err.message}`);
          }
        }
      }

      if (copiedCount > 0) {
        logger.info(`✅ Recovered ${copiedCount} missing component files`);
      }
    } catch (error) {
      logger.warn('Error ensuring essential files:', error.message);
      // Don't throw - this is defensive and shouldn't block the build
    }
  }
}


module.exports = AssetManager;
