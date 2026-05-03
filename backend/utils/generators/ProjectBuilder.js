/**
 * Project Builder - Handles project creation, setup, and building
 * Updated to use extracted components for better debugging
 */

const path = require('path');
const fs = require('fs');
const { createLogger } = require('../common/logger');
const BuildSystemManager = require('./BuildSystemManager');
const FilePatcher = require('./FilePatcher');

const logger = createLogger('ProjectBuilder');

class ProjectBuilder {
  constructor(license, outputPath = null) {
    this.license = license;
    // Use /app/generated-pos in Docker, or local path in dev
    this.baseOutputPath = outputPath || process.env.GENERATED_POS_PATH || path.join(process.cwd(), 'generated-pos');
    this.projectName = this.generateProjectName();
    this.projectPath = path.join(this.baseOutputPath, this.projectName);
    this.buildManager = new BuildSystemManager(this.projectPath);
    this.filePatcher = new FilePatcher(this.projectPath);
    
    logger.info(`Base output path: ${this.baseOutputPath}`);
  }

  generateProjectName() {
    const clientName = this.license.client.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const licenseKey = this.license.licenseKey.toLowerCase();
    return `pos-${clientName}-${licenseKey}`;
  }

  async initialize() {
    logger.info(`Initializing project: ${this.projectName}`);
    
    // Ensure base output directory exists
    if (!fs.existsSync(this.baseOutputPath)) {
      fs.mkdirSync(this.baseOutputPath, { recursive: true });
    }

    // Clean up existing project if it exists
    if (fs.existsSync(this.projectPath)) {
      await this.cleanupExistingProject();
    }

    return {
      projectName: this.projectName,
      projectPath: this.projectPath,
      baseOutputPath: this.baseOutputPath
    };
  }

  async cleanupExistingProject() {
    logger.info('Cleaning up existing project directory');
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        execSync(`rmdir /s /q "${this.projectPath}"`, { shell: true });
      } else {
        const { execSync } = require('child_process');
        execSync(`rm -rf "${this.projectPath}"`);
      }
    } catch (error) {
      logger.warn('Could not clean existing project directory:', error.message);
    }
  }

  async buildApplication() {
    logger.info('Building Electron application');
    
    // Apply file patches first
    await this.filePatcher.applyAllPatches();
    
    // Execute build process
    const buildStats = await this.buildManager.executeFullBuild();
    
    logger.info('Build completed successfully');
    return buildStats;
  }

  findExecutable() {
    return this.buildManager.findExecutable();
  }

  async cleanupBuildArtifacts() {
    logger.info('Cleaning up build artifacts to save space');
    await this.buildManager.cleanupBuildDirectories();
  }
}

module.exports = ProjectBuilder;
