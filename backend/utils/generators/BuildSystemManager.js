const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createLogger } = require('../common/logger');
const perfLogger = require('./PerfLogger');

const logger = createLogger('BuildSystemManager');

class BuildSystemManager {
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.options = options;
    this._hasNodeModules = false;
  }

  async cleanNpmCache() {
    logger.info('Cleaning npm cache to free up disk space on C:');
    try {
      perfLogger.measureSync('npm cache clean', 'npm cache clean --force', {
        timeout: 60000, stdio: 'pipe'
      });
      logger.info('✓ npm cache cleaned successfully');
    } catch (error) {
      logger.warn('Could not clean npm cache:', error.message);
    }
  }

  async installDependencies() {
    logger.info('Installing npm dependencies');
    const projectPath = this.projectPath;
    const targetNodeModules = path.join(projectPath, 'node_modules');
    const isWindows = process.platform === 'win32';
    const templatePath = path.join(__dirname, '../../../pos-template');
    const templateNodeModules = path.join(templatePath, 'node_modules');

    // Check if node_modules already exists in target
    const targetExists = fs.existsSync(targetNodeModules);
    let targetCount = 0;
    if (targetExists) {
      targetCount = fs.readdirSync(targetNodeModules).length;
    }

    logger.info(`Target node_modules: ${targetExists} (${targetCount} items)`);

    if (targetExists && targetCount > 100) {
      logger.info('node_modules already exists - skipping install');
      this._hasNodeModules = true;
      return;
    }

    if (!isWindows) {
      perfLogger.measureSync('npm ci', 'npm ci --legacy-peer-deps', {
        cwd: projectPath, timeout: 600000
      });
      return;
    }

    if (fs.existsSync(targetNodeModules)) {
      try {
        fs.rmSync(targetNodeModules, { recursive: true, force: true });
      } catch {
        perfLogger.measureSync('remove existing node_modules',
          `rmdir /s /q "${targetNodeModules}"`,
          { shell: true, stdio: 'pipe', throws: false }
        );
      }
    }

    if (!fs.existsSync(templateNodeModules)) {
      throw new Error(`Template node_modules not found at: ${templateNodeModules}`);
    }

    if (!fs.existsSync(targetNodeModules)) {
      fs.mkdirSync(targetNodeModules, { recursive: true });
    }

    // Use robocopy to copy node_modules from template (multi-threaded, ~20-30s)
    const robocopyCmd = `robocopy "${templateNodeModules}" "${targetNodeModules}" /E /NFL /NDL /NJH /NJS /MT:16`;
    try {
      perfLogger.measureSync('copy node_modules (robocopy)', robocopyCmd, {
        timeout: 300000, shell: true, throws: true
      });
    } catch (error) {
      if (error.status > 7) throw error;
    }

    // Verify critical packages
    const criticalPackages = ['@vitejs/plugin-react', 'vite', 'electron', 'react', 'react-dom'];
    const missingPackages = criticalPackages.filter(pkg => {
      return !fs.existsSync(path.join(targetNodeModules, pkg));
    });

    if (missingPackages.length > 0) {
      logger.error(`Missing critical packages: ${missingPackages.join(', ')} - falling back to npm ci`);
      perfLogger.measureSync('npm ci (fallback)', 'npm ci --legacy-peer-deps', {
        cwd: projectPath, timeout: 600000
      });
    }
  }

  async buildElectronApp() {
    logger.info('Building Electron application');
    const isWindows = process.platform === 'win32';

    if (!isWindows) {
      logger.warn('Running on Linux - attempting Windows build via Wine');
      process.env.WINEPREFIX = '/tmp/.wine';
      process.env.WINEARCH = 'win64';
    }

    // 3. Vite build
    perfLogger.measureSync('vite build', 'npx vite build --mode production', {
      cwd: this.projectPath,
      timeout: 300000,
      env: { ...process.env, NODE_ENV: 'production' }
    });

    const distPath = path.join(this.projectPath, 'dist');
    if (fs.existsSync(distPath)) {
      const distFiles = fs.readdirSync(distPath);
      logger.info(`Vite output: ${distFiles.length} files in dist/`);
    }

    // 4-10. electron-builder
    const env = { ...process.env };
    const debugValue = process.env.DEBUG || 'electron-builder';
    env.DEBUG = debugValue;
    if (!isWindows) env.USE_SYSTEM_FPM = 'true';

    // Use --dir for dev builds (fast), full installer for release builds
    const buildFlags = this.options?.releaseBuild ? '--win --x64 --publish=never' : '--win --x64 --dir';

    perfLogger.measureSync('electron-builder', `npx electron-builder ${buildFlags}`, {
      cwd: this.projectPath,
      timeout: 1200000,
      env
    });

    // For full builds, find and log the installer
    const installerPath = this.findExecutable();
    if (installerPath) {
      logger.info(`Installer found: ${installerPath}`);
    }
  }

  async cleanupBuildDirectories() {
    logger.info('Cleaning up build directories');
    const dirsToClean = [
      'dist', 'release', 'temp-build',
      'coverage'
    ];

    for (const dir of dirsToClean) {
      const dirPath = path.join(this.projectPath, dir);
      if (fs.existsSync(dirPath)) {
        const cmd = process.platform === 'win32'
          ? `rmdir /s /q "${dirPath}"`
          : `rm -rf "${dirPath}"`;
        try {
          perfLogger.measureSync(`clean ${dir}`, cmd, {
            shell: process.platform === 'win32',
            stdio: 'pipe',
            throws: false
          });
        } catch { }
      }
    }

    try {
      perfLogger.measureSync('npm cache clean', 'npm cache clean --force', {
        timeout: 60000, stdio: 'pipe', throws: false
      });
    } catch { }
  }

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
          const execPath = path.join(searchPath, exeFile);
          const stat = fs.statSync(execPath);
          logger.info(`Executable: ${execPath} (${Math.round(stat.size / 1024 / 1024)} MB)`);
          return execPath;
        }
      }
    }
    logger.warn('No executable file found');
    return null;
  }

  async validateBuildEnvironment() {
    logger.info('Validating build environment');
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found in project directory');
    }

    const nodeModulesPath = path.join(this.projectPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      logger.warn('node_modules not found before build');
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const requiredScripts = ['build:electron', 'build'];
    const missingScripts = requiredScripts.filter(s => !packageJson.scripts?.[s]);
    if (missingScripts.length > 0) {
      logger.warn(`Missing build scripts: ${missingScripts.join(', ')}`);
    }

    logger.info(`Free memory: ${Math.round(os.freemem() / 1024 / 1024)} MB`);
  }

  getBuildStats() {
    return {
      projectPath: this.projectPath,
      hasNodeModules: fs.existsSync(path.join(this.projectPath, 'node_modules')),
      hasDist: fs.existsSync(path.join(this.projectPath, 'dist')),
      hasRelease: fs.existsSync(path.join(this.projectPath, 'release')),
      executablePath: this.findExecutable(),
      timestamp: new Date().toISOString()
    };
  }

  async executeFullBuild(timings = {}) {
    logger.info('Starting complete build process');

    await this.validateBuildEnvironment();
    await this.installDependencies();
    await this.buildElectronApp();

    const stats = this.getBuildStats();
    logger.info('Build process completed successfully');
    return stats;
  }
}

module.exports = BuildSystemManager;
