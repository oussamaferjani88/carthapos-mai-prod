const posRepository = require('../repositories/posRepository');
const { generatePOSApplication } = require('../../utils/pos-generator');
const { exec } = require('child_process');
const { promisify } = require('util');
const { NotFoundError, ValidationError } = require('../utils/errors');

const execAsync = promisify(exec);

class POSService {
  /**
   * Generate POS application
   */
  async generatePOSApplication(data) {
    const { licenseId, outputPath } = data;

    if (!licenseId) {
      throw new ValidationError('License ID is required');
    }

    // Get license with full details
    const license = await posRepository.getLicenseForGeneration(licenseId);
    console.log('[POS DEBUG] [Backend] Loaded license for generation:', JSON.stringify(license, null, 2));

    if (!license) {
      throw new NotFoundError('License not found');
    }

    if (!license.isActive) {
      throw new ValidationError('License is not active');
    }

    // Generate POS application
    const result = await generatePOSApplication(license, outputPath);

    // Update package.json with business name and ensure correct main file
    const { packageJson, packageJsonPath } = posRepository.getPackageJson(result.outputPath);
    const businessName = license.configuration?.businessName;

    if (!businessName) {
      throw new ValidationError('Business name is required in POS configuration');
    }

    packageJson.build.productName = businessName;

    // Update installer filename to use business name
    packageJson.build.win.artifactName = `${businessName}-Setup-\${version}.\${ext}`;

    // Update NSIS shortcut name to use business name
    packageJson.build.nsis.shortcutName = businessName;

    // Ensure electron-modular.cjs is used (refactored version with IPC handlers)
    if (packageJson.main !== 'public/electron-modular.cjs') {
      packageJson.main = 'public/electron-modular.cjs';
    }

    // Ensure files array includes electron-modular.cjs and all required files
    if (!packageJson.build) packageJson.build = {};
    if (!packageJson.build.files) packageJson.build.files = [];

    // Update files array to include correct Electron entry point and handlers
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

    posRepository.updatePackageJson(packageJsonPath, packageJson);

    // Build Windows executable automatically
    let executablePath = null;
    try {
      const buildRes = await execAsync('npm run build:win', {
        cwd: result.outputPath,
        maxBuffer: 1024 * 1024 * 10
      });
      console.log('Build completed successfully');

      // Find installer file
      executablePath = posRepository.findInstallerFile(result.outputPath);

      // STRICT VALIDATION: Do not fallback to project folder
      if (!executablePath) {
        console.error('Build finished but no executable found.');
        throw new Error('Build failed: No .exe file generated. Check logs for details.');
      }
    } catch (buildError) {
      console.error('Error during Windows build:', buildError);
      console.error('Build error details:', buildError.stderr || buildError.stdout);

    } catch (buildError) {
      console.error('Error during Windows build:', buildError);
      console.error('Build error details:', buildError.stderr || buildError.stdout);

      // THROW the error so the frontend knows it failed, instead of returning a folder that causes 404
      throw new Error(`Build failed: ${buildError.message}\nDetails: ${buildError.stderr || buildError.stdout || 'Unknown error'}`);
    }

    return {
      message: 'POS application generated and built successfully',
      licenseKey: license.licenseKey,
      outputPath: result.outputPath,
      executablePath: executablePath
    };
  }

  /**
   * Build existing POS application
   */
  async buildPOSApplication(data) {
    const { projectPath, platform = 'win' } = data;

    if (!projectPath) {
      throw new ValidationError('Project path is required');
    }

    if (!posRepository.projectExists(projectPath)) {
      throw new NotFoundError('Project path not found');
    }

    // Validate project has package.json
    try {
      posRepository.getPackageJson(projectPath);
    } catch (error) {
      throw new ValidationError('Invalid POS project - package.json not found');
    }

    // Install dependencies if necessary
    if (!posRepository.nodeModulesExists(projectPath)) {
      console.log('Installing dependencies...');
      await execAsync('npm install --legacy-peer-deps', { cwd: projectPath });
    }

    // Build command based on platform
    let buildCommand;
    if (platform === 'win') {
      buildCommand = 'npm run build && npx electron-builder --win --publish=never';
    } else {
      buildCommand = platform ? `npm run build:${platform}` : 'npm run build && npx electron-builder --publish=never';
    }

    console.log(`Building POS application with command: ${buildCommand}`);

    const { stdout, stderr } = await execAsync(buildCommand, {
      cwd: projectPath,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    console.log('Build stdout:', stdout);
    if (stderr) console.log('Build stderr:', stderr);

    // Find installer executable
    let executablePath = posRepository.findInstallerFile(projectPath);

    if (!executablePath) {
      const distContents = posRepository.getDistContents(projectPath);
      console.log('No installer found, dist contents:', distContents);
    }

    return {
      message: 'POS application built successfully',
      projectPath,
      executablePath,
      buildOutput: stdout,
      buildErrors: stderr
    };
  }

  /**
   * Get available POS templates
   */
  async getTemplates() {
    try {
      const templates = posRepository.getTemplates();
      return { templates };
    } catch (error) {
      throw new NotFoundError('POS templates not found');
    }
  }

  /**
   * Get business sectors
   */
  getSectors() {
    const sectors = posRepository.getSectors();
    return { sectors };
  }

  /**
   * Find installer for download
   */
  async findInstallerForDownload(requestedPath) {
    if (!requestedPath) {
      throw new ValidationError('Path parameter is required');
    }

    if (!posRepository.projectExists(requestedPath)) {
      throw new NotFoundError('Path not found');
    }

    const { installerPath, searchedPaths } = posRepository.findInstallerInProject(requestedPath);

    if (!installerPath || !posRepository.projectExists(installerPath)) {
      throw new NotFoundError('No installer file found in the project directory', {
        requestedPath,
        searchedPaths
      });
    }

    return installerPath;
  }
}

module.exports = new POSService();
