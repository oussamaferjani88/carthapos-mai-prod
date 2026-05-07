/**
 * Dependency Manager - Handles npm installations and configurations
 * Updated to use extracted components for better debugging
 */

const { createLogger } = require('../common/logger');
const PackageConfigManager = require('../config/PackageConfigManager');
const TailwindConfigManager = require('../config/TailwindConfigManager');
const BuildSystemManager = require('./BuildSystemManager');

const logger = createLogger('DependencyManager');

class DependencyManager {
  constructor(projectPath, license) {
    this.projectPath = projectPath;
    this.license = license;
    this.packageManager = new PackageConfigManager(projectPath, license);
    this.tailwindManager = new TailwindConfigManager(projectPath, {});
    this.buildManager = new BuildSystemManager(projectPath);
  }

  async installDependencies(options = {}) {
    logger.info('Installing project dependencies');
    
    await this.packageManager.updatePackageJson();
    await this.installTailwindDependencies();
    await this.createConfigFiles();

    if (options.skipNodeModulesInstall) {
      logger.info('Skipping node_modules installation (source-only generation mode)');
    } else {
      await this.buildManager.installDependencies();
    }
    
    logger.info('Dependencies installed successfully');
  }

  async installTailwindDependencies() {
    // Delegate to TailwindConfigManager for consistency
    await this.tailwindManager.ensureTailwindDirectives();
  }

  async createConfigFiles() {
    await this.tailwindManager.createTailwindConfig();
    // Note: Keeping v4 syntax, no need to patch to v3
  }
}

module.exports = DependencyManager;
