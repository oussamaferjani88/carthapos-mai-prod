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

  /**
   * Filter modules - remove files for disabled modules
   * @param {Array} enabledModules - Array of enabled module objects with 'code' property
   */
  async filterModules(enabledModules) {
    try {
      logger.info(`🔍 Starting module filtering`);
      
      // Get enabled module names
      const enabledCodes = enabledModules
        .map(m => m.module?.name || m.name)
        .filter(Boolean);

      logger.info(`📦 Enabled modules: ${enabledCodes.join(', ') || 'none'}`);

      // Get all module files that should be removed
      const filesToRemove = this.getFilesToRemove(enabledCodes);

      if (filesToRemove.length === 0) {
        logger.info('✅ All modules enabled or no files to remove');
        return { removed: 0, modules: enabledCodes };
      }

      // Remove the files
      let removedCount = 0;
      for (const file of filesToRemove) {
        const filePath = path.join(this.projectPath, 'src', 'pages', file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.debug(`  ✓ Removed: ${file}`);
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
        .map(m => m.module?.name || m.name)
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

      const enabledCodes = enabledModules
        .map(m => m.module?.name || m.name)
        .filter(Boolean);

      // Find routing configuration files AND component registry
      const possibleRouteFiles = [
        path.join(this.projectPath, 'src', 'routes', 'index.js'),
        path.join(this.projectPath, 'src', 'App.jsx'),
        path.join(this.projectPath, 'src', 'pages', 'index.js'),
        path.join(this.projectPath, 'src', 'lib', 'POSComponentRegistry.jsx')
      ];

      for (const routeFile of possibleRouteFiles) {
        if (fs.existsSync(routeFile)) {
          let content = fs.readFileSync(routeFile, 'utf8');
          let wasModified = false;
          
          // Comment out imports for disabled modules
          for (const [moduleCode, files] of Object.entries(this.moduleFileMapping)) {
            if (!enabledCodes.includes(moduleCode)) {
              for (const file of files) {
                const fileNameWithoutExt = file.replace('.jsx', '');
                const componentName = fileNameWithoutExt; // e.g., "Inventory" for Inventory.jsx
                
                // Match various import patterns
                const patterns = [
                  // Direct imports: import Inventory from './pages/Inventory'
                  new RegExp(`import\\s+\\w+\\s+from\\s+['\`].*${fileNameWithoutExt}['\`]`, 'g'),
                  // Lazy imports: const Inventory = lazy(() => import('./pages/Inventory'))
                  new RegExp(`const\\s+\\w+\\s*=\\s*lazy\\(\\(\\)\\s*=>\\s*import\\(['\`].*${fileNameWithoutExt}['\`]\\)`, 'g'),
                  // Component registration: this.register('inventory', Inventory, {...})
                  new RegExp(`this\\.register\\(['"]${moduleCode}['"]\\s*,\\s*${componentName}\\s*,`, 'g'),
                  // Component usage in JSX: <Inventory /> or <ProtectedRoute><Inventory /></ProtectedRoute>
                  new RegExp(`<${componentName}\\s*\\/?>`, 'g')
                ];

                for (const pattern of patterns) {
                  if (pattern.test(content)) {
                    content = content.replace(pattern, (match) => {
                      return `/* DISABLED: ${moduleCode} */\n// ${match}`;
                    });
                    wasModified = true;
                  }
                }
              }
            }
          }

          if (wasModified) {
            fs.writeFileSync(routeFile, content, 'utf8');
            logger.info(`✅ Cleaned up: ${path.basename(routeFile)}`);
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
