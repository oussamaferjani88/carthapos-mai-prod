/**
 * Package.json Configuration Manager
 * Handles package.json updates and build configurations
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('../common/logger');

const logger = createLogger('PackageConfigManager');

class PackageConfigManager {
  constructor(projectPath, license) {
    this.projectPath = projectPath;
    this.license = license;
    this.packageJsonPath = path.join(projectPath, 'package.json');
  }

  /**
   * Update package.json with license-specific configuration
   */
  async updatePackageJson() {
    logger.info('Updating package.json configuration');
    
    if (!fs.existsSync(this.packageJsonPath)) {
      throw new Error('package.json not found in project');
    }

    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    
    // Update basic metadata
    packageJson.name = `pos-${this.license.client.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    packageJson.description = `POS System for ${this.license.client.name} - ${this.license.sector}`;
    packageJson.version = '1.0.0';
    
    // Set correct main entry point (electron-modular.cjs with IPC handlers)
    packageJson.main = 'public/electron-modular.cjs';
    
    // Keep type: "module" for vite.config.js compatibility
    // Electron main file uses .cjs extension so it's treated as CommonJS regardless
    if (!packageJson.type) {
      packageJson.type = 'module';
    }
    
    // Update build configuration for better NSIS installer
    this.updateBuildConfiguration(packageJson);
    
    fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
    logger.info('package.json updated successfully');
  }

  /**
   * Update build configuration for Windows installer
   */
  updateBuildConfiguration(packageJson) {
    if (!packageJson.build) {
      packageJson.build = {};
    }

    // Files configuration - specify which files to include in the app
    // Always update the files array to ensure correct Electron entry point
    packageJson.build.files = [
      "dist/**/*",
      "public/electron-modular.cjs",
      "public/preload.js", 
      "public/app-config.json",
      "public/favicon.ico",
      "resources/**/*",
      "src/electron/**/*",
      "node_modules/sqlite3/**/*",
      "node_modules/crypto-js/**/*",
      "node_modules/bcryptjs/**/*",
      "!node_modules/node-gyp/**/*",
      "!node_modules/@electron/rebuild/**/*",
      "!node_modules/**/test/**/*",
      "!node_modules/**/tests/**/*",
      "!node_modules/**/*.md",
      "!node_modules/**/*.txt"
    ];

    // Windows configuration
    if (!packageJson.build.win) {
      packageJson.build.win = {};
    }
    packageJson.build.win.requestedExecutionLevel = 'requireAdministrator';

    // NSIS installer configuration
    if (!packageJson.build.nsis) {
      packageJson.build.nsis = {};
    }
    packageJson.build.nsis.perMachine = true;
    packageJson.build.nsis.allowElevation = true;
    packageJson.build.nsis.warningsAsErrors = false;

    logger.info('Build configuration updated for Windows installer');
  }

  /**
   * Get package.json content
   */
  getPackageJson() {
    if (fs.existsSync(this.packageJsonPath)) {
      return JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    }
    return null;
  }

  /**
   * Validate package.json structure
   */
  validatePackageJson() {
    const packageJson = this.getPackageJson();
    
    if (!packageJson) {
      throw new Error('package.json not found');
    }

    const requiredFields = ['name', 'version', 'main'];
    const missing = requiredFields.filter(field => !packageJson[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields in package.json: ${missing.join(', ')}`);
    }

    logger.info('package.json validation passed');
    return true;
  }
}

module.exports = PackageConfigManager;
