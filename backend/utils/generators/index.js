/**
 * Main POS Generator Entry Point
 * Refactored from monolithic pos-generator.js to use modular components
 */

const ProjectBuilder = require('./ProjectBuilder');
const ThemeCustomizer = require('./ThemeCustomizer');
const DependencyManager = require('./DependencyManager');
const AssetManager = require('./AssetManager');
const FilePatcher = require('./FilePatcher');
const BuildSystemManager = require('./BuildSystemManager');
const { validateLicense } = require('../config/license-validator');
const { createLogger } = require('../common/logger');

const logger = createLogger('POS Generator');

/**
 * Generate a complete POS application from license data
 * @param {Object} license - License configuration
 * @param {string} outputPath - Optional output directory
 * @param {Object} options - Generation options
 * @param {boolean} options.skipBuild - Skip the compiled build step (for source-only gen)
 * @param {boolean} options.skipNodeModulesInstall - Skip node_modules install for fast source generation
 * @param {boolean} options.fastMode - Fast mode: skip build entirely for quick testing
 * @returns {Promise<Object>} Generation result
 */
async function generatePOSApplication(license, outputPath = null, options = {}) {
  logger.info('🚀 Starting POS generation process with modular architecture');
  
  try {
    // 1. Validate license
    const validatedLicense = await validateLicense(license);
    logger.info('✅ License validated');

    // 2. Initialize project builder
    const projectBuilder = new ProjectBuilder(validatedLicense, outputPath);
    const projectInfo = await projectBuilder.initialize();
    logger.info(`📁 Project initialized at: ${projectInfo.projectPath}`);

    // 3. Copy template and manage assets
    const assetManager = new AssetManager(projectInfo.projectPath);
    await assetManager.copyTemplate();
    await assetManager.ensurePreloadFile();
    await assetManager.renameElectronFiles();
    await assetManager.createConfigFile(validatedLicense); // Create config.json with businessName
    logger.info('📋 Template and assets processed');

    // 4. Install dependencies with extracted components
    const dependencyManager = new DependencyManager(projectInfo.projectPath, validatedLicense);
    await dependencyManager.installDependencies({
      skipNodeModulesInstall: Boolean(options.skipNodeModulesInstall || options.fastMode)
    });
    logger.info('📦 Dependencies installed using modular approach');

    // 5. Apply theme customization
    const themeCustomizer = new ThemeCustomizer(projectInfo.projectPath, validatedLicense);
    await themeCustomizer.applyCustomization();
    logger.info('🎨 Theme customization applied');

     // 6. Apply file patches
     const filePatcher = new FilePatcher(projectInfo.projectPath);
     const businessName = validatedLicense.configuration?.businessName || 
                         validatedLicense.client?.name || 
                         'CarthaPos';
     await filePatcher.applyAllPatches(businessName);
     logger.info('🔧 File patches applied');

    // 7. Build application
    let buildStats = {};
    const buildManager = new BuildSystemManager(projectInfo.projectPath);

    // Fast mode: skip build entirely for quick config testing
    if (options.fastMode) {
      logger.info('⏩ FAST MODE: Skipping build step entirely (source generation only)');
      buildStats = {
        skipped: true,
        reason: 'Fast mode - source generation only',
        timestamp: new Date().toISOString()
      };
    } else if (options.skipBuild) {
      logger.info('⏩ Skipping local build step (source-only generation mode)');
      buildStats = {
        skipped: true,
        reason: options.skipNodeModulesInstall ? 'Fast source generation' : 'Build skipped',
        timestamp: new Date().toISOString()
      };
    } else {
      buildStats = await buildManager.executeFullBuild();
      logger.info('🔨 Application built successfully');
    }

    const result = {
      outputPath: projectInfo.projectPath,
      projectName: projectInfo.projectName,
      executablePath: options.skipBuild || options.fastMode ? null : buildManager.findExecutable(),
      buildStats: buildStats,
      timestamp: new Date().toISOString()
    };
    
    logger.info('✅ POS generation completed successfully with modular architecture');
    return result;

  } catch (error) {
    logger.error('❌ POS generation failed:', error);
    throw new Error(`Failed to generate POS application: ${error.message}`);
  }
}

/**
 * Get generation statistics and health check
 */
async function getGenerationStats() {
  return {
    architecture: 'modular',
    components: [
      'ProjectBuilder',
      'AssetManager', 
      'DependencyManager',
      'ThemeCustomizer',
      'FilePatcher',
      'BuildSystemManager'
    ],
    extractedUtilities: [
      'PackageConfigManager',
      'TailwindConfigManager',
      'Logger',
      'LicenseValidator'
    ],
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generatePOSApplication,
  getGenerationStats
};
