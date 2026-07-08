/**
 * Module Filter - Removes disabled module files from generated POS
 * Ensures only selected modules are included in the final build
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('../common/logger');

const logger = createLogger('ModuleFilter');

class ModuleFilter {
  constructor(projectPath) {
    this.projectPath = projectPath;
    
    // Mapping of module codes to their corresponding files
    this.moduleFileMapping = {
      'inventory': ['Inventory.jsx'],
      'kitchen': ['Kitchen.jsx'],
      'customers': ['Customers.jsx'],
      'customer-management': ['Customers.jsx'],
      'loyalty': ['Loyalty.jsx'],
      'takeaway': ['Takeaway.jsx'],
      'delivery': ['Takeaway.jsx'],
      'appointments': ['Appointments.jsx'],
      'services': ['Services.jsx'],
      'suppliers': ['Suppliers.jsx'],
      'payment-advanced': ['PaymentAdvanced.jsx'],
      'gift-cards': ['GiftCards.jsx'],
      'reports': ['Reports.jsx'],
      'menu-management': ['MenuManagement.jsx'],
      'barcode': ['Barcode.jsx'],
      'prescription': ['Prescription.jsx'],
      'production': ['Production.jsx'],
      'tables': ['Tables.jsx'],
      'combination': ['ReceiptDesigner.jsx'],
      'receipt-designer': ['ReceiptDesigner.jsx'],
      'hardware-settings': ['HardwareSettings.jsx'],
      'security-settings': ['SecuritySettings.jsx'],
      'system-diagnostics': ['SystemDiagnostics.jsx']
    };

    // Core modules that should NEVER be removed
    this.coreModules = [
      'Sales.jsx',
      'Products.jsx',
      'Dashboard.jsx',
      'Settings.jsx',
      'UserAdmin.jsx',
      'Login.jsx',
      'Inventory.jsx',
      'Barcode.jsx',
      'Customers.jsx',
      'Reports.jsx'
    ];
  }

  /**
   * Get module name from various formats
   */
  getModuleName(moduleItem) {
    if (!moduleItem) return null;
    if (typeof moduleItem === 'string') return moduleItem;
    return moduleItem?.module?.name || moduleItem?.name || null;
  }

  /**
   * Check if module is enabled using isEnabled/enabled flags
   */
  isModuleEnabled(moduleItem) {
    if (!moduleItem) return false;
    if (typeof moduleItem === 'object' && moduleItem.isEnabled !== undefined) {
      return moduleItem.isEnabled === true;
    }
    if (typeof moduleItem === 'object' && moduleItem.enabled !== undefined) {
      return moduleItem.enabled === true;
    }
    return true;
  }

  /**
   * Normalize module name for comparison (kebab-case, lowercase)
   * Handles: PascalCase, camelCase, kebab-case, snake_case, space separated
   */
  normalizeModuleName(name) {
    if (!name) return '';
    return name
      .toString()
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Check if a module code is enabled using fuzzy match
   */
  isModuleCodeEnabled(moduleCode, enabledCodes) {
    const normalized = this.normalizeModuleName(moduleCode);
    return enabledCodes.some(code => this.normalizeModuleName(code) === normalized);
  }

  /**
   * Filter modules - remove files for disabled modules
   * @param {Array} enabledModules - Array of enabled module objects
   */
  async filterModules(enabledModules) {
    try {
      logger.info(`🔍 Starting module filtering`);
      
      // Get enabled module names - use helper methods
      const enabledCodes = enabledModules
        .map(m => this.getModuleName(m))
        .filter(Boolean);

      logger.info(`📦 Enabled modules from license: ${enabledCodes.join(', ') || 'NONE'}`);
      logger.info(`✅ SKIPPING file deletion - keeping all page files to prevent ReferenceError`);
      logger.info(`ℹ️  Disabled modules will only have routes/navbar items hidden`);
      
      return { removed: 0, modules: enabledCodes, filesRemoved: [] };
    } catch (error) {
      logger.error('❌ Module filtering failed:', error);
      throw new Error(`Module filtering failed: ${error.message}`);
    }
  }

  /**
    * Update POSNavbar to hide disabled module menu items
    * This ensures disabled modules don't appear in the navigation even if somehow the file exists
    */
  async filterNavbarModules(enabledModules) {
    try {
      logger.info('🗂️ Filtering POSNavbar for disabled modules');

      const enabledCodes = enabledModules
        .filter((moduleItem) => this.isModuleEnabled(moduleItem))
        .map((moduleItem) => this.getModuleName(moduleItem))
        .filter(Boolean);

      const navbarPath = path.join(this.projectPath, 'src', 'components', 'POSNavbar.jsx');

      if (!fs.existsSync(navbarPath)) {
        logger.warn('POSNavbar not found, skipping navbar filtering');
        return;
      }

      let navbarContent = fs.readFileSync(navbarPath, 'utf8');
      let originalLength = navbarContent.length;

      // For each disabled module, comment out or remove its menu item
      // This is a safety net in case the file filtering doesn't work
      for (const [moduleCode, _] of Object.entries(this.moduleFileMapping)) {
        if (!this.isModuleCodeEnabled(moduleCode, enabledCodes)) {
          // Create regex to find and comment out menu items for this module
          const regexPattern = new RegExp(
            `\\{[^}]*?id:\\s*['"]${moduleCode}['"][^}]*?\\}`,
            'g'
          );
          
          navbarContent = navbarContent.replace(regexPattern, (match) => {
            return `/* DISABLED MODULE: ${moduleCode} */ \n    // ${match}`;
          });
        }
      }

      // Only write if content changed
      if (navbarContent.length !== originalLength) {
        fs.writeFileSync(navbarPath, navbarContent, 'utf8');
        logger.info('✅ POSNavbar filtered for disabled modules');
      } else {
        logger.info('ℹ️ No navbar changes needed');
      }

    } catch (error) {
      logger.warn('Could not filter navbar:', error.message);
      // Don't throw - navbar filtering is optional
    }
  }

  /**
    * Clean up unused imports in pages/index.js or routing config
    */
  async cleanupRoutes(enabledModules) {
    try {
      logger.info('🚦 Cleaning up unused route imports');

      // Extract enabled module codes with better handling
      const enabledCodes = enabledModules
        .filter((moduleItem) => this.isModuleEnabled(moduleItem))
        .map((moduleItem) => this.getModuleName(moduleItem))
        .filter(Boolean);

      logger.info(`📋 Enabled module codes for route cleanup: ${enabledCodes.join(', ') || 'NONE'}`);

      // Get list of actual .jsx files that exist in pages/ to double-check
      const pagesDir = path.join(this.projectPath, 'src', 'pages');
      const existingFiles = fs.existsSync(pagesDir)
        ? fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'))
        : [];

      logger.info(`📂 Existing page files: ${existingFiles.join(', ')}`);

      // Find routing configuration files AND component registry
      const possibleRouteFiles = [
        path.join(this.projectPath, 'src', 'routes', 'index.js'),
        path.join(this.projectPath, 'src', 'App.jsx'),
        path.join(this.projectPath, 'src', 'pages', 'index.js'),
        path.join(this.projectPath, 'src', 'lib', 'POSComponentRegistry.jsx')
      ];

      for (const routeFile of possibleRouteFiles) {
        if (fs.existsSync(routeFile)) {
          logger.info(`\n🔍 Processing route file: ${path.basename(routeFile)}`);
          let content = fs.readFileSync(routeFile, 'utf8');
          let wasModified = false;
          
          // Comment out imports ONLY for modules whose files DON'T exist
          for (const [moduleCode, files] of Object.entries(this.moduleFileMapping)) {
            if (!this.isModuleCodeEnabled(moduleCode, enabledCodes)) {
              for (const file of files) {
                // Only comment out if file was actually deleted
                if (!existingFiles.includes(file)) {
                  const fileNameWithoutExt = file.replace('.jsx', '');
                  const componentName = fileNameWithoutExt; // e.g., "Inventory" for Inventory.jsx
                  
                  logger.debug(`  🗑️  File deleted - cleaning up imports: ${file}`);
                  
                  // STEP 1: Comment out Route definitions FIRST (before component replacement)
                  // This ensures we don't break Routes by replacing components inside them
                  const routePattern = new RegExp(
                    `<Route[^>]*path=['\"]\\/${moduleCode}['\"][^>]*(?:/>|>.*?</Route>)`,
                    'g'
                  );
                  
                  if (routePattern.test(content)) {
                    logger.debug(`  ✓ Found Route for ${moduleCode} (${file})`);
                    const matchCount = (content.match(routePattern) || []).length;
                    logger.debug(`    Route matches: ${matchCount}`);
                    content = content.replace(routePattern, (match) => {
                      logger.debug(`    Commenting out Route: ${match.substring(0, 60)}...`);
                      return `/* DISABLED: ${moduleCode} */\n// ${match}`;
                    });
                    wasModified = true;
                  }
                  
                  // STEP 2: Comment out other patterns (after Route handling)
                  const patterns = [
                    // Direct imports: import Inventory from './pages/Inventory'
                    new RegExp(`import\\s+\\w+\\s+from\\s+['"\`].*${fileNameWithoutExt}['"\`]`, 'g'),
                    // Lazy imports: const Inventory = lazy(() => import('./pages/Inventory'))
                    new RegExp(`const\\s+\\w+\\s*=\\s*lazy\\(\\(\\)\\s*=>\\s*import\\(['"\`][^'"]*${fileNameWithoutExt}['"\`]\\)\\)`, 'g'),
                    // Component registration: this.register('inventory', Inventory, {...})
                    new RegExp(`this\\.register\\(['"]${moduleCode}['"]\\s*,\\s*${componentName}\\s*,`, 'g')
                  ];

                  for (const pattern of patterns) {
                    if (pattern.test(content)) {
                      logger.debug(`  ✓ Found import/registration for ${moduleCode} (${file})`);
                      const matchCount = (content.match(pattern) || []).length;
                      logger.debug(`    Matches: ${matchCount}`);
                      content = content.replace(pattern, (match) => {
                        logger.debug(`    Commenting out: ${match.substring(0, 50)}...`);
                        return `/* DISABLED: ${moduleCode} */\n// ${match}`;
                      });
                      wasModified = true;
                    }
                  }
                } else {
                  logger.debug(`  ✅ File exists - NOT cleaning up: ${file}`);
                }
              }
            }
          }

          if (wasModified) {
            fs.writeFileSync(routeFile, content, 'utf8');
            logger.info(`✅ Cleaned up: ${path.basename(routeFile)}`);
          } else {
            logger.debug(`  No changes needed for ${path.basename(routeFile)}`);
          }
        }
      }

    } catch (error) {
      logger.warn('Could not clean up routes:', error.message);
      // Don't throw - route cleanup is optional
    }
  }

  /**
    * Summary of what was filtered
    */
  getSummary(enabledModules) {
    const enabledCodes = enabledModules
      .filter(m => this.isModuleEnabled(m))
      .map(m => this.getModuleName(m))
      .filter(Boolean);

    const disabledModules = Object.keys(this.moduleFileMapping)
      .filter(code => !this.isModuleCodeEnabled(code, enabledCodes));

    return {
      enabledCount: enabledCodes.length,
      disabledCount: disabledModules.length,
      enabled: enabledCodes,
      disabled: disabledModules,
      totalModules: Object.keys(this.moduleFileMapping).length
    };
  }
}

module.exports = ModuleFilter;
