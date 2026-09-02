const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { createLogger } = require('../common/logger');
const perfLogger = require('./PerfLogger');

const logger = createLogger('BuildSystemManager');

const TEMPLATE_PATH = path.join(__dirname, '../../../pos-template');
const SHELL_CACHE_ROOT = path.join(TEMPLATE_PATH, '.shell-cache');
const SHELL_BUILD_WORKDIR = path.join(SHELL_CACHE_ROOT, '_building');

// Directories/files that never affect the compiled shell (build scratch space,
// or content generation always overwrites per-client) - excluded from the cache key.
const SHELL_HASH_EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'release', 'release-src', '.shell-cache', 'generated-pos']);
const SHELL_HASH_EXCLUDE_FILES = new Set(['app-config.json', 'favicon.ico', 'favicon.svg']);

class BuildSystemManager {
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.options = options;
    this._hasNodeModules = false;
  }

  /**
   * Run robocopy, treating exit codes 0-7 (informational: files copied,
   * extra files, mismatched, etc.) as success per robocopy convention.
   */
  _robocopy(name, src, dest, extraArgs = '') {
    const cmd = `robocopy "${src}" "${dest}" /E /NFL /NDL /NJH /NJS /MT:16 ${extraArgs}`.trim();
    try {
      perfLogger.measureSync(name, cmd, { timeout: 300000, shell: true, throws: true });
    } catch (error) {
      if (error.status > 7) throw error;
    }
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

  /**
   * Hash of everything that affects the compiled shell (source, electron/preload
   * .cjs files, build config) - excludes node_modules and anything generation
   * writes per-client (app-config.json, favicon.*, license.key). Used to decide
   * whether the cached shell needs rebuilding.
   */
  computeShellCacheKey() {
    const hash = crypto.createHash('sha256');

    const walk = (dir, relBase) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        if (entry.isDirectory()) {
          if (SHELL_HASH_EXCLUDE_DIRS.has(entry.name)) continue;
          walk(path.join(dir, entry.name), `${relBase}${entry.name}/`);
        } else if (entry.isFile()) {
          if (SHELL_HASH_EXCLUDE_FILES.has(entry.name)) continue;
          hash.update(`${relBase}${entry.name}\0`);
          hash.update(fs.readFileSync(path.join(dir, entry.name)));
        }
      }
    };

    walk(TEMPLATE_PATH, '');
    return hash.digest('hex').slice(0, 16);
  }

  /**
   * Return the cached compiled shell for the current pos-template source,
   * building it first if this is the first generation since a template change.
   * This is the only place vite build + full electron-builder packaging still
   * run - once per template version, not once per client.
   */
  async ensureShellCache() {
    const cacheKey = this.computeShellCacheKey();
    const cacheDir = path.join(SHELL_CACHE_ROOT, cacheKey, 'win-unpacked');
    const marker = path.join(cacheDir, 'resources', 'app.asar');

    if (fs.existsSync(marker)) {
      logger.info(`Shell cache hit: ${cacheKey}`);
      return cacheDir;
    }

    logger.info(`Shell cache miss: ${cacheKey} - building shell (only happens when pos-template source changes)`);
    await this._buildShell(cacheDir);
    return cacheDir;
  }

  async _buildShell(cacheDir) {
    fs.mkdirSync(SHELL_BUILD_WORKDIR, { recursive: true });

    // Sync template source into the persistent build workspace (re-syncing an
    // existing workspace is fast - robocopy only touches changed files).
    this._robocopy('shell cache - sync template source', TEMPLATE_PATH, SHELL_BUILD_WORKDIR,
      '/XD node_modules dist release release-src .shell-cache generated-pos');

    // Reuse node_modules from the template rather than a fresh install.
    const workNodeModules = path.join(SHELL_BUILD_WORKDIR, 'node_modules');
    const templateNodeModules = path.join(TEMPLATE_PATH, 'node_modules');
    if (!fs.existsSync(workNodeModules) || fs.readdirSync(workNodeModules).length < 100) {
      this._robocopy('shell cache - sync node_modules', templateNodeModules, workNodeModules);
    }

    // Placeholder app-config.json: its CONTENT is irrelevant (always overwritten
    // per client by packageFromCachedShell), but it must exist now so the asar
    // build registers dist/app-config.json as an unpacked path - only then can
    // the loose file's bytes be swapped later without repacking the asar.
    const publicDir = path.join(SHELL_BUILD_WORKDIR, 'public');
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(path.join(publicDir, 'app-config.json'), JSON.stringify({ theme: {}, modules: [] }), 'utf8');

    perfLogger.measureSync('shell cache - vite build', 'npx vite build --mode production', {
      cwd: SHELL_BUILD_WORKDIR, timeout: 300000,
      env: { ...process.env, NODE_ENV: 'production' }
    });

    perfLogger.measureSync('shell cache - electron-builder --dir', 'npx electron-builder --win --x64 --dir', {
      cwd: SHELL_BUILD_WORKDIR, timeout: 1200000,
      env: { ...process.env, DEBUG: process.env.DEBUG || 'electron-builder' }
    });

    const builtDir = path.join(SHELL_BUILD_WORKDIR, 'release', 'win-unpacked');
    if (!fs.existsSync(path.join(builtDir, 'resources', 'app.asar'))) {
      throw new Error('Shell cache build did not produce resources/app.asar');
    }

    fs.mkdirSync(path.dirname(cacheDir), { recursive: true });
    this._robocopy('shell cache - persist to cache', builtDir, cacheDir);

    logger.info(`Shell cache built: ${path.basename(path.dirname(cacheDir))}`);
  }

  /**
   * Fast per-client path: reuse the cached compiled shell (built once per
   * pos-template version, see ensureShellCache) instead of running vite build
   * + full electron-builder packaging for every client. Only the config file
   * differs per client, so only that gets swapped (plus the exe stub renamed
   * to match this client's productName - NSIS's generated install/shortcut
   * script expects "<productName>.exe" to exist, and since the shell was
   * packaged under pos-template's own generic name, that filename wouldn't
   * exist without this rename, breaking "Run after install" and shortcuts)
   * before wrapping the already-packed app in an NSIS installer via
   * --prepackaged (skips node_modules resolution and asar packing entirely).
   *
   * Known trade-off: the exe's internal VERSIONINFO resource (Task Manager's
   * "Description" column, right-click Properties) still shows the name baked
   * in at shell-build time - only the filename itself is corrected. Fully
   * fixing that needs rcedit-based resource patching, deliberately left out
   * for now given the added risk for a cosmetic-only remainder.
   */
  async packageFromCachedShell() {
    const cacheDir = await this.ensureShellCache();

    const releaseSrcParent = path.join(this.projectPath, 'release-src');
    const releaseSrc = path.join(releaseSrcParent, 'win-unpacked');
    if (fs.existsSync(releaseSrcParent)) {
      fs.rmSync(releaseSrcParent, { recursive: true, force: true });
    }
    fs.mkdirSync(releaseSrcParent, { recursive: true });

    this._robocopy('copy cached shell', cacheDir, releaseSrc);
    this._renameExeToProductName(releaseSrc);

    // Swap in this client's config, written earlier in the pipeline by
    // ThemeCustomizer.updateAppConfig() (contains theme, modules, and the
    // embedded signed license for MACHINE-bound activation).
    const clientConfigPath = path.join(this.projectPath, 'public', 'app-config.json');
    const unpackedConfigPath = path.join(releaseSrc, 'resources', 'app.asar.unpacked', 'dist', 'app-config.json');
    if (fs.existsSync(clientConfigPath)) {
      fs.mkdirSync(path.dirname(unpackedConfigPath), { recursive: true });
      fs.copyFileSync(clientConfigPath, unpackedConfigPath);
    } else {
      logger.warn('No public/app-config.json found to swap into cached shell - installer will ship with placeholder config');
    }

    const electronVersion = this._getInstalledElectronVersion();

    perfLogger.measureSync('electron-builder (prepackaged)',
      `npx electron-builder --win --x64 --prepackaged "${releaseSrc}" --publish=never -c.electronVersion=${electronVersion}`,
      {
        cwd: this.projectPath, timeout: 1200000,
        env: { ...process.env, DEBUG: process.env.DEBUG || 'electron-builder' }
      }
    );

    const installerPath = this.findExecutable();
    if (installerPath) {
      logger.info(`Installer found: ${installerPath}`);
    }
  }

  /**
   * Rename the win-unpacked exe stub to "<productName>.exe" so it matches
   * what the NSIS script --prepackaged is about to generate (from this
   * client's own package.json) will look for.
   */
  _renameExeToProductName(releaseSrc) {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    const productName = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).build?.productName;
    if (!productName) {
      logger.warn('No build.productName in package.json - skipping exe rename, installer shortcut may not resolve');
      return;
    }

    const currentExe = fs.readdirSync(releaseSrc).find(f => f.endsWith('.exe'));
    if (!currentExe) {
      logger.warn(`No .exe found directly in ${releaseSrc} - skipping rename`);
      return;
    }

    const targetName = `${productName}.exe`;
    if (currentExe === targetName) return;

    fs.renameSync(path.join(releaseSrc, currentExe), path.join(releaseSrc, targetName));
    logger.info(`Renamed ${currentExe} -> ${targetName}`);
  }

  _getInstalledElectronVersion() {
    const electronPkgPath = path.join(TEMPLATE_PATH, 'node_modules', 'electron', 'package.json');
    return JSON.parse(fs.readFileSync(electronPkgPath, 'utf8')).version;
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
      'dist', 'release', 'release-src', 'temp-build',
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

  /**
   * Fast per-client path: reuse the cached compiled shell instead of a full
   * vite build + electron-builder pack (see packageFromCachedShell). No
   * node_modules install needed - --prepackaged doesn't touch dependencies.
   */
  async executeFastBuild() {
    logger.info('Starting fast build process (cached shell)');

    await this.validateBuildEnvironment();
    await this.packageFromCachedShell();

    const stats = this.getBuildStats();
    logger.info('Fast build process completed successfully');
    return stats;
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
