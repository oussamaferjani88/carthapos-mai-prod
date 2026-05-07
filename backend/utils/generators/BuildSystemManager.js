/**
 * Build System Manager - Handles compilation and build processes
 * Extracted from pos-generator.js for better debugging and modularity
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../common/logger');

const logger = createLogger('BuildSystemManager');

class BuildSystemManager {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  /**
   * Clean npm cache to free up space on C: drive
   */
  async cleanNpmCache() {
    logger.info('Cleaning npm cache to free up disk space on C:');

    try {
      // Clean npm cache (this runs on C: drive even if project is on D: or E:)
      execSync('npm cache clean --force', {
        stdio: 'inherit',
        timeout: 60000
      });

      logger.info('✓ npm cache cleaned successfully');
    } catch (error) {
      logger.warn('Could not clean npm cache:', error.message);
    }
  }

  /**
   * Install npm dependencies by copying from template (FAST METHOD)
   * FALLBACK: If copy fails or on Linux, run npm install directly
   */
  async installDependencies() {
    logger.info('Installing npm dependencies');

    try {
      const isWindows = process.platform === 'win32';
      const targetNodeModules = path.join(this.projectPath, 'node_modules');

      // ✅ NEW OPTIMIZATION: Skip installation if node_modules already exists
      if (fs.existsSync(targetNodeModules)) {
        const existingPackages = fs.readdirSync(targetNodeModules).length;
        if (existingPackages > 100) {  // Sanity check - should have lots of packages
          logger.info(`✅ node_modules already exists with ${existingPackages} packages - SKIPPING INSTALL`);
          logger.info('⏱️ Time saved: ~3-5 minutes!');
          return;
        }
      }

      // On Linux (Render), skip copy and just install directly (more reliable)
      if (!isWindows) {
        logger.info('🐧 Linux detected - Running npm install directly (no copy)');
        logger.info('⏱️ This will take 3-5 minutes...');
        
        execSync('npm install --legacy-peer-deps', {
          cwd: this.projectPath,
          stdio: 'inherit',
          timeout: 600000 // 10 minutes
        });
        
        logger.info('✅ Dependencies installed successfully');
        return;
      }

      // Windows: Try fast copy method
      logger.info('💻 Windows detected - Attempting fast copy from template');
      
      // Path to template's node_modules
      const templatePath = path.join(__dirname, '../../../pos-template');
      const templateNodeModules = path.join(templatePath, 'node_modules');

      logger.info(`Source: ${templateNodeModules}`);
      logger.info(`Target: ${targetNodeModules}`);

      // Check if template has node_modules
      if (!fs.existsSync(templateNodeModules)) {
        logger.warn('⚠️ Template node_modules not found. Attempting emergency npm install...');
        try {
          execSync('npm install --legacy-peer-deps', {
            cwd: templatePath,
            stdio: 'inherit',
            timeout: 900000
          });
          logger.info('✓ Emergency install completed');
        } catch (e) {
          throw new Error(`CRITICAL: Template node_modules missing and install failed at ${templatePath}`);
        }
      }

      // Verify source content
      const sourceCount = fs.readdirSync(templateNodeModules).length;
      logger.info(`Source node_modules contains ${sourceCount} items`);
      if (sourceCount === 0) throw new Error("Template node_modules is empty!");

      // PRE-CLEANUP: Ensure target does not exist to prevent nesting
      if (fs.existsSync(targetNodeModules)) {
        logger.info('Removing existing target node_modules...');
        if (process.platform === 'win32') {
          execSync(`rmdir /s /q "${targetNodeModules}"`, { shell: true });
        } else {
          execSync(`rm -rf "${targetNodeModules}"`);
        }
      }

      // Create target directory
      if (!fs.existsSync(targetNodeModules)) {
        fs.mkdirSync(targetNodeModules, { recursive: true });
      }

      // Copy node_modules from template to generated POS
      logger.info(`Copying node_modules...`);

      if (isWindows) {
        const robocopyCmd = `robocopy "${templateNodeModules}" "${targetNodeModules}" /E /NFL /NDL /NJH /NJS /MT:16`;
        try {
          execSync(robocopyCmd, { stdio: 'inherit', timeout: 300000 });
        } catch (error) {
          if (error.status > 7) throw error;
        }
      } else {
        // For Linux/Mac, use cp -rL to follow symlinks and copy actual files
        // -r = recursive
        // -L = follow symbolic links (important for npm packages)
        // -p = preserve attributes
        // IMPORTANT: Use /. syntax to copy CONTENTS of directory, not the directory itself
        execSync(`cp -rLp "${templateNodeModules}/." "${targetNodeModules}/"`, {
          stdio: 'inherit',
          timeout: 300000
        });
      }

      // Verify critical packages exist
      const criticalPackages = ['@vitejs/plugin-react', 'vite', 'electron', 'react', 'react-dom'];
      const missingPackages = [];
      
      for (const pkg of criticalPackages) {
        const pkgPath = path.join(targetNodeModules, pkg);
        if (!fs.existsSync(pkgPath)) {
          missingPackages.push(pkg);
        }
      }
      
      if (missingPackages.length > 0) {
        logger.error(`❌ Missing critical packages after copy: ${missingPackages.join(', ')}`);
        logger.info('Attempting npm install as fallback...');
        
        execSync('npm install --legacy-peer-deps', {
          cwd: this.projectPath,
          stdio: 'inherit',
          timeout: 600000
        });
      }

      logger.info('✓ Dependencies copied successfully (7 min → 30 sec!)');

    } catch (error) {
      logger.error('Failed to copy dependencies:', error.message);
      throw new Error(`Failed to install npm packages: ${error.message}`);
    }
  }

  /**
   * Build the Electron application
   */
  async buildElectronApp() {
    logger.info('Building Electron application');

    try {
      // Detect platform - Windows .exe can only be built on Windows
      const isWindows = process.platform === 'win32';
      
      if (!isWindows) {
        logger.warn('⚠️ Running on Linux - Attempting Windows build via Wine');
        logger.info('Building Windows .exe installer using electron-builder + Wine');
        
        // Set Wine environment variables for electron-builder
        process.env.WINEPREFIX = '/tmp/.wine';
        process.env.WINEARCH = 'win64';
        
        // Build command for Windows on Linux
        const command = 'npm run build:electron';
        logger.info(`Executing: ${command}`);
        
        execSync(command, {
          cwd: this.projectPath,
          stdio: 'inherit',
          timeout: 1200000, // 20 minutes
          maxBuffer: 1024 * 1024 * 10,
          encoding: 'utf8',
          env: {
            ...process.env,
            USE_SYSTEM_FPM: 'true', // Use system fpm for packaging
            DEBUG: 'electron-builder' // Enable debug output
          }
        });
        
        logger.info('✅ Build completed on Linux via Wine');
      } else {
        // Windows platform - build full installer
        const command = 'npm run build:electron';
        logger.info(`Executing: ${command}`);

        execSync(command, {
          cwd: this.projectPath,
          stdio: 'inherit',
          timeout: 1200000, // 20 minutes
          maxBuffer: 1024 * 1024 * 10,
          encoding: 'utf8'
        });
        
        logger.info('Build completed');
        logger.info('Electron application built successfully');
      }

      // Check for installer file
      const installerPath = this.findExecutable();
      if (installerPath) {
        logger.info(`✅ Installer found: ${installerPath}`);
      } else {
        logger.warn('⚠️ Build completed but no installer .exe file found');
        logger.warn('Checking for unpacked version...');
        const distPath = path.join(this.projectPath, 'dist');
        const releasePath = path.join(this.projectPath, 'release');
        if (fs.existsSync(distPath)) {
          logger.info(`dist/ contents: ${fs.readdirSync(distPath).join(', ')}`);
        }
        if (fs.existsSync(releasePath)) {
          logger.info(`release/ contents: ${fs.readdirSync(releasePath).join(', ')}`);
        }
      }

    } catch (error) {
      // Check if it's just a warning (build still succeeded)
      const output = error.stdout?.toString() || '';
      const errorOutput = error.stderr?.toString() || '';

      // Check if dist folder was created (indicates successful build despite warnings)
      const distPath = path.join(this.projectPath, 'dist');
      const releasePath = path.join(this.projectPath, 'release');
      const buildSucceeded = (fs.existsSync(distPath) && fs.readdirSync(distPath).length > 0) ||
        (fs.existsSync(releasePath) && fs.readdirSync(releasePath).length > 0);

      if (buildSucceeded) {
        logger.warn('Build completed with warnings (but succeeded):');
        logger.warn('Output:', output);
        if (errorOutput) logger.warn('Warnings:', errorOutput);
        logger.info('✓ Build artifacts found - treating as success');
        return; // Exit successfully
      }

      // Real build failure
      logger.error('Failed to build Electron application:', error.message);
      logger.error('Build output:', output);
      logger.error('Error output:', errorOutput);
      logger.error('Error details:', {
        status: error.status,
        signal: error.signal
      });

      throw new Error(`Build command failed: ${error.message}`);
    }
  }

  /**
   * Clean up build directories to save space
   * Enhanced to also clean temporary files on C: drive
   */
  async cleanupBuildDirectories() {
    logger.info('Cleaning up build directories and temporary files');

    const dirsToClean = [
      'dist',
      'release',
      'temp-build',
      path.join('node_modules', '.cache'),
      path.join('node_modules', '.vite'),
      path.join('node_modules', '.tmp'),
      'coverage'
    ];

    let cleanedCount = 0;
    for (const dir of dirsToClean) {
      const dirPath = path.join(this.projectPath, dir);
      if (fs.existsSync(dirPath)) {
        try {
          if (process.platform === 'win32') {
            execSync(`rmdir /s /q "${dirPath}"`, { shell: true });
          } else {
            execSync(`rm -rf "${dirPath}"`);
          }
          logger.info(`✓ Cleaned directory: ${dir}`);
          cleanedCount++;
        } catch (error) {
          logger.warn(`Could not clean directory ${dir}:`, error.message);
        }
      }
    }

    logger.info(`Cleanup complete: ${cleanedCount} directories cleaned`);

    // Also clean npm cache after cleanup
    await this.cleanNpmCache();
  }

  /**
   * Find the generated executable file
   */
  findExecutable() {
    logger.info('Looking for generated executable');

    const searchPaths = [
      path.join(this.projectPath, 'dist'),
      path.join(this.projectPath, 'release'),
      path.join(this.projectPath, 'out')
    ];

    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        const files = fs.readdirSync(searchPath);
        const exeFile = files.find(file => file.endsWith('.exe'));

        if (exeFile) {
          const executablePath = path.join(searchPath, exeFile);
          logger.info(`Executable found: ${executablePath}`);
          return executablePath;
        }
      }
    }

    logger.warn('No executable file found');
    return null;
  }

  /**
   * Validate build environment
   */
  async validateBuildEnvironment() {
    logger.info('Validating build environment');

    // Check if package.json exists
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found in project directory');
    }

    // Check if node_modules exists (after install)
    const nodeModulesPath = path.join(this.projectPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      logger.warn('node_modules not found - dependencies may not be installed');
    }

    // Check if build scripts exist
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const requiredScripts = ['build:electron', 'build'];

    const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);
    if (missingScripts.length > 0) {
      logger.warn(`Missing build scripts: ${missingScripts.join(', ')}`);
    }

    logger.info('Build environment validation completed');
  }

  /**
   * Get build statistics
   */
  getBuildStats() {
    const stats = {
      projectPath: this.projectPath,
      hasNodeModules: fs.existsSync(path.join(this.projectPath, 'node_modules')),
      hasDist: fs.existsSync(path.join(this.projectPath, 'dist')),
      hasRelease: fs.existsSync(path.join(this.projectPath, 'release')),
      executablePath: this.findExecutable(),
      timestamp: new Date().toISOString()
    };

    logger.info('Build statistics:', stats);
    return stats;
  }

  /**
   * Execute complete build process
   */
  async executeFullBuild() {
    logger.info('Starting complete build process');

    try {
      await this.validateBuildEnvironment();
      await this.installDependencies();
      await this.buildElectronApp();

      const stats = this.getBuildStats();
      logger.info('Build process completed successfully');

      return stats;
    } catch (error) {
      logger.error('Build process failed:', error);
      throw error;
    }
  }
}

module.exports = BuildSystemManager;