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
      'delivery': ['Takeaway.jsx'], // Delivery bundled with Takeaway
      'appointments': ['Appointments.jsx'],
      'services': ['Services.jsx'],
      'suppliers': ['Suppliers.jsx'],
      'payment-advanced': ['PaymentAdvanced.jsx'],
      'gift-cards': ['GiftCards.jsx'],
      'reports': ['Reports.jsx'],
      'menu-management': ['MenuManagement.jsx'],
      'barcode': ['Barcode.jsx'],
      'quick-service': ['QuickService.jsx'],
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
      'Login.jsx'
    ];
  }

  getModuleName(moduleItem) {
    return moduleItem?.module?.name || moduleItem?.name;
  }

  isModuleEnabled(moduleItem) {
    if (moduleItem?.isEnabled !== undefined) {
      return moduleItem.isEnabled === true;
    }

    if (moduleItem?.enabled !== undefined) {
      return moduleItem.enabled === true;
    }

    if (moduleItem?.module?.isEnabled !== undefined) {
      return moduleItem.module.isEnabled === true;
    }

    if (moduleItem?.module?.enabled !== undefined) {
      return moduleItem.module.enabled === true;
    }

    return true;
  }

  /**
   * Filter modules - remove files for disabled modules
   * @param {Array} enabledModules - Array of enabled module objects with 'code' property
   */
  async filterModules(enabledModules) {
    try {
      logger.info(`🔍 Starting module filtering`);
      
      // Get enabled module names - be flexible with formats
      const enabledCodes = enabledModules
        .map(m => m.module?.name || m.name)
        .filter(Boolean);

      logger.info(`📦 Enabled modules from license: ${enabledCodes.join(', ') || 'NONE'}`);

      // SAFETY CHECK: If enabledCodes is very small or empty, be very conservative
      if (enabledCodes.length === 0 || enabledCodes.length < 3) {
        logger.warn(`⚠️  WARNING: Only ${enabledCodes.length} enabled modules detected`);
        logger.warn(`⚠️  This might be a parsing error. Checking file existence to be safe...`);
      }

      // Check which files ACTUALLY exist in pages/
      const pagesDir = path.join(this.projectPath, 'src', 'pages');
      let actualFiles = [];
      if (fs.existsSync(pagesDir)) {
        actualFiles = fs.readdirSync(pagesDir)
          .filter(f => f.endsWith('.jsx'));
        logger.info(`📂 Files found in pages/: ${actualFiles.join(', ')}`);
      }

      // Get files that should be removed based on moduleFileMapping
      // BUT: Be conservative - only remove files that:
      // 1. Are in the moduleFileMapping (known modules)
      // 2. Are NOT core modules
      // 3. The module is NOT in enabledCodes (explicitly disabled)
      const filesToRemove = [];

      for (const [moduleCode, files] of Object.entries(this.moduleFileMapping)) {
        if (!enabledCodes.includes(moduleCode)) {
          // This module is NOT enabled
          for (const file of files) {
            // Only remove if file actually exists and it's not a core module
            if (actualFiles.includes(file) && !this.coreModules.includes(file)) {
              filesToRemove.push(file);
              logger.info(`  🗑️  Mark for deletion: ${file} (module "${moduleCode}" not enabled)`);
            }
          }
        }
      }

      if (filesToRemove.length === 0) {
        logger.info('✅ No files to remove - all modules are enabled or core');
        return { removed: 0, modules: enabledCodes };
      }

      // Remove the files
      let removedCount = 0;
      for (const file of filesToRemove) {
        const filePath = path.join(pagesDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.debug(`  ✓ Deleted: ${file}`);
          removedCount++;
        }
      }

      logger.info(`✅ Module filtering completed - removed ${removedCount} module files`);
      
      return {
        removed: removedCount,
        modules: enabledCodes,
        filesRemoved: filesToRemove
      };

    } catch (error) {
      logger.error('❌ Module filtering failed:', error);
      throw new Error(`Module filtering failed: ${error.message}`);
    }
  }

  /**
   * Get list of files to remove based on disabled modules
   * @param {Array} enabledCodes - Array of enabled module codes
   * @returns {Array} Files to remove
   */
  getFilesToRemove(enabledCodes) {
    const filesToRemove = [];

    // Iterate through all possible modules
    for (const [moduleCode, files] of Object.entries(this.moduleFileMapping)) {
      // If this module is NOT enabled, mark its files for removal
      if (!enabledCodes.includes(moduleCode)) {
        for (const file of files) {
          // Never remove core files
          if (!this.coreModules.includes(file) && !filesToRemove.includes(file)) {
            filesToRemove.push(file);
          }
        }
      }
    }

    return filesToRemove;
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
        if (!enabledCodes.includes(moduleCode)) {
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
            if (!enabledCodes.includes(moduleCode)) {
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
    * Check if module is enabled (handle multiple formats)
    */
  isModuleEnabled(moduleItem) {
    if (moduleItem === null || moduleItem === undefined) return false;
    
    // Format 1: { name: 'inventory', isEnabled: true }
    if (moduleItem.isEnabled !== undefined) return moduleItem.isEnabled === true;
    
    // Format 2: { module: { name: 'inventory' }, enabled: true }
    if (moduleItem.enabled !== undefined) return moduleItem.enabled === true;
    
    // Format 3: Direct structure from features object
    if (moduleItem.enabled !== undefined) return moduleItem.enabled === true;
    
    // Default: assume enabled if present
    return true;
  }

  /**
    * Get module name (handle multiple formats)
    */
  getModuleName(moduleItem) {
    if (!moduleItem) return null;
    
    // Format 1: { name: 'inventory' }
    if (moduleItem.name) return moduleItem.name;
    
    // Format 2: { module: { name: 'inventory' } }
    if (moduleItem.module?.name) return moduleItem.module.name;
    
    // Format 3: string directly
    if (typeof moduleItem === 'string') return moduleItem;
    
    return null;
  }

  /**
    * Summary of what was filtered
    */
  getSummary(enabledModules) {
    const enabledCodes = enabledModules
      .filter(m => m.isEnabled === true)
      .map(m => m.module?.name || m.name)
      .filter(Boolean);

    const disabledModules = Object.keys(this.moduleFileMapping)
      .filter(code => !enabledCodes.includes(code));

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
