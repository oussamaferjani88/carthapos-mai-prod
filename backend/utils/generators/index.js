const ProjectBuilder = require('./ProjectBuilder');
const ThemeCustomizer = require('./ThemeCustomizer');
const DependencyManager = require('./DependencyManager');
const AssetManager = require('./AssetManager');
const FilePatcher = require('./FilePatcher');
const ModuleFilter = require('./ModuleFilter');
const BuildSystemManager = require('./BuildSystemManager');
const { validateLicense } = require('../config/license-validator');
const { createLogger } = require('../common/logger');
const perfLogger = require('./PerfLogger');

const logger = createLogger('POS Generator');

async function generatePOSApplication(license, outputPath = null, options = {}) {
  const startAll = performance.now();
  const generationId = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const licenseId = license?.id || 'unknown';
  const clientId = license?.clientId || license?.client?.id || 'unknown';

  perfLogger.initGeneration({
    generationId,
    licenseId,
    clientId
  });

  logger.info('Starting POS generation process with modular architecture');

  try {
    // 1. Validate license
    const validatedLicense = await perfLogger.measure(
      'Validate License',
      () => validateLicense(license)
    );

    // 2. Initialize project builder
    const { projectInfo } = await perfLogger.measure(
      'Create Output Directory',
      async () => {
        const projectBuilder = new ProjectBuilder(validatedLicense, outputPath);
        const pi = await projectBuilder.initialize();
        return { projectInfo: pi };
      }
    );

    const projectPath = projectInfo.projectPath;
    const projectName = projectInfo.projectName;
    logger.info(`Project initialized at: ${projectPath}`);

    // 3. Copy template and manage assets
    const assetManager = new AssetManager(projectPath);
    await perfLogger.measure(
      'Copy Template',
      () => assetManager.copyTemplate()
    );
    await perfLogger.measure(
      'Ensure Preload File',
      () => assetManager.ensurePreloadFile()
    );
    await perfLogger.measure(
      'Rename Electron Files',
      () => assetManager.renameElectronFiles()
    );
    await perfLogger.measure(
      'Create Config File',
      () => assetManager.createConfigFile(validatedLicense)
    );

    // 4. Filter modules
    const moduleFilter = new ModuleFilter(projectPath);
    let modulesToFilter = validatedLicense.modules || [];

    if (validatedLicense.configuration?.features) {
      const features = validatedLicense.configuration.features;
      const existingNames = modulesToFilter
        .map(m => m.module?.name || m.name)
        .filter(Boolean);

      Object.entries(features)
        .filter(([name, enabled]) => enabled === true && !existingNames.includes(name))
        .forEach(([name]) => {
          logger.info(`➕ Adding module from features: ${name}`);
          modulesToFilter.push({ name, isEnabled: true });
        });
    }

    logger.info(`Final modules to filter (${modulesToFilter.length})`);

    await perfLogger.measure(
      'Module Filter - Filter Modules',
      () => moduleFilter.filterModules(modulesToFilter)
    );
    await perfLogger.measure(
      'Module Filter - Navbar',
      () => moduleFilter.filterNavbarModules(modulesToFilter)
    );
    await perfLogger.measure(
      'Module Filter - Cleanup Routes',
      () => moduleFilter.cleanupRoutes(modulesToFilter)
    );

    // 5. Install dependencies
    const dependencyManager = new DependencyManager(projectPath, validatedLicense);
    await perfLogger.measure(
      'Dependency Manager - Package JSON',
      () => dependencyManager.packageManager.updatePackageJson()
    );
    await perfLogger.measure(
      'Dependency Manager - Tailwind Dirs',
      () => dependencyManager.installTailwindDependencies()
    );
    await perfLogger.measure(
      'Dependency Manager - Config Files',
      () => dependencyManager.createConfigFiles()
    );

    if (options.skipNodeModulesInstall || options.fastMode) {
      logger.info('Skipping node_modules installation');
    } else {
      await perfLogger.measure(
        'Dependency Manager - Build Install',
        () => dependencyManager.buildManager.installDependencies()
      );
    }

    // 6. Theme customization
    const themeCustomizer = new ThemeCustomizer(projectPath, validatedLicense);
    await perfLogger.measure(
      'Theme Customizer - CSS Files',
      () => themeCustomizer.ensureCSSFiles()
    );
    await perfLogger.measure(
      'Theme Customizer - Tailwind Config',
      () => themeCustomizer.updateTailwindConfig()
    );
    await perfLogger.measure(
      'Theme Customizer - Global Styles',
      () => themeCustomizer.updateGlobalStyles()
    );
    await perfLogger.measure(
      'Theme Customizer - Component Styles',
      () => themeCustomizer.updateComponentStyles()
    );
    await perfLogger.measure(
      'Theme Customizer - App Config',
      () => themeCustomizer.updateAppConfig()
    );

    // 7. File patches
    const filePatcher = new FilePatcher(projectPath);
    const businessName = validatedLicense.configuration?.businessName ||
                        validatedLicense.client?.name ||
                        'CarthaPos';

    await perfLogger.measure(
      'File Patcher - Remove Unnecessary',
      () => filePatcher.removeUnnecessaryFiles()
    );
    await perfLogger.measure(
      'File Patcher - Fix Electron',
      () => filePatcher.fixElectronFiles()
    );
    await perfLogger.measure(
      'File Patcher - PostCSS Config',
      () => filePatcher.ensurePostCSSConfig()
    );
    await perfLogger.measure(
      'File Patcher - Tailwind Config',
      () => filePatcher.ensureTailwindConfig()
    );
    await perfLogger.measure(
      'File Patcher - Fix Vite Config',
      () => filePatcher.fixViteConfig()
    );
    await perfLogger.measure(
      'File Patcher - Ensure Preload',
      () => filePatcher.ensurePreloadFile()
    );
    await perfLogger.measure(
      'File Patcher - UI Components',
      () => filePatcher.ensureUIComponents()
    );
    await perfLogger.measure(
      'File Patcher - Dashboard Patch',
      () => filePatcher.patchDashboardComponent()
    );
    await perfLogger.measure(
      'File Patcher - Package JSON',
      () => filePatcher.patchPackageJSON(businessName)
    );

    // 8. Build application
    let buildStats = {};
    const buildManager = new BuildSystemManager(projectPath, {
      releaseBuild: options.releaseBuild === true
    });

    if (options.fastMode) {
      logger.info('FAST MODE: Skipping build step entirely');
      buildStats = { skipped: true, reason: 'Fast mode - source generation only' };
    } else if (options.skipBuild) {
      logger.info('Skipping local build step');
      buildStats = { skipped: true, reason: 'Build skipped' };
    } else {
      const buildTimings = {};
      await perfLogger.measure(
        'Build Electron',
        async () => {
          buildStats = await buildManager.executeFullBuild(buildTimings);
        }
      );
    }

    // Find executable
    const executablePath = options.skipBuild || options.fastMode
      ? null
      : buildManager.findExecutable();

    const totalMs = performance.now() - startAll;
    const timings = Object.fromEntries(
      perfLogger.steps.map(s => [
        s.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        Math.round(s.durationMs)
      ])
    );
    const result = {
      outputPath: projectPath,
      projectName,
      executablePath,
      buildStats,
      generationId,
      timings,
      totalDurationMs: totalMs,
      timestamp: new Date().toISOString()
    };

    perfLogger.finishGeneration();

    logger.info('POS generation completed successfully');
    return result;

  } catch (error) {
    perfLogger.finishGeneration();
    logger.error('POS generation failed:', error);
    throw new Error(`Failed to generate POS application: ${error.message}`);
  }
}

async function getGenerationStats() {
  return {
    architecture: 'modular',
    components: [
      'ProjectBuilder', 'AssetManager', 'DependencyManager',
      'ThemeCustomizer', 'FilePatcher', 'BuildSystemManager'
    ],
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generatePOSApplication,
  getGenerationStats
};
