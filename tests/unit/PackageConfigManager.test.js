/**
 * Unit Tests for PackageConfigManager
 */

const { describe, it, beforeEach, afterEach, expect } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const PackageConfigManager = require('../../backend/utils/config/PackageConfigManager');

describe('PackageConfigManager', () => {
  let tempDir;
  let packageConfigManager;
  let mockLicense;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = path.join(__dirname, 'temp-test-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });

    // Mock license data
    mockLicense = {
      client: {
        name: 'Test Café'
      },
      sector: 'cafe'
    };

    // Create mock package.json
    const mockPackageJson = {
      name: 'test-pos',
      version: '0.1.0',
      type: 'module',
      main: 'index.js',
      scripts: {
        test: 'jest'
      },
      build: {
        win: {},
        nsis: {}
      }
    };

    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(mockPackageJson, null, 2)
    );

    packageConfigManager = new PackageConfigManager(tempDir, mockLicense);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('updatePackageJson', () => {
    it('should update package.json with license-specific information', async () => {
      await packageConfigManager.updatePackageJson();

      const updatedPackageJson = packageConfigManager.getPackageJson();
      
      expect(updatedPackageJson.name).toBe('pos-test-café');
      expect(updatedPackageJson.description).toBe('POS System for Test Café - cafe');
      expect(updatedPackageJson.version).toBe('1.0.0');
      expect(updatedPackageJson.main).toBe('public/electron.js');
      expect(updatedPackageJson.type).toBeUndefined(); // Should be removed
    });

    it('should configure build settings for Windows installer', async () => {
      await packageConfigManager.updatePackageJson();

      const updatedPackageJson = packageConfigManager.getPackageJson();
      
      expect(updatedPackageJson.build.win.requestedExecutionLevel).toBe('requireAdministrator');
      expect(updatedPackageJson.build.nsis.perMachine).toBe(true);
      expect(updatedPackageJson.build.nsis.allowElevation).toBe(true);
      expect(updatedPackageJson.build.nsis.warningsAsErrors).toBe(false);
    });

    it('should throw error if package.json does not exist', async () => {
      // Remove package.json
      fs.unlinkSync(path.join(tempDir, 'package.json'));

      await expect(packageConfigManager.updatePackageJson())
        .rejects.toThrow('package.json not found in project');
    });
  });

  describe('validatePackageJson', () => {
    it('should validate existing package.json successfully', async () => {
      await packageConfigManager.updatePackageJson();
      
      const isValid = packageConfigManager.validatePackageJson();
      expect(isValid).toBe(true);
    });

    it('should throw error for missing required fields', () => {
      // Create invalid package.json
      const invalidPackageJson = {
        description: 'Missing name and version'
      };

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(invalidPackageJson, null, 2)
      );

      expect(() => packageConfigManager.validatePackageJson())
        .toThrow('Missing required fields in package.json: name, version, main');
    });

    it('should throw error if package.json does not exist', () => {
      // Remove package.json
      fs.unlinkSync(path.join(tempDir, 'package.json'));

      expect(() => packageConfigManager.validatePackageJson())
        .toThrow('package.json not found');
    });
  });

  describe('getPackageJson', () => {
    it('should return parsed package.json content', () => {
      const packageJson = packageConfigManager.getPackageJson();
      
      expect(packageJson).toBeDefined();
      expect(packageJson.name).toBe('test-pos');
      expect(packageJson.version).toBe('0.1.0');
    });

    it('should return null if package.json does not exist', () => {
      // Remove package.json
      fs.unlinkSync(path.join(tempDir, 'package.json'));

      const packageJson = packageConfigManager.getPackageJson();
      expect(packageJson).toBeNull();
    });
  });

  describe('updateBuildConfiguration', () => {
    it('should add build configuration if not present', () => {
      const packageJson = {};
      packageConfigManager.updateBuildConfiguration(packageJson);

      expect(packageJson.build).toBeDefined();
      expect(packageJson.build.win).toBeDefined();
      expect(packageJson.build.nsis).toBeDefined();
    });

    it('should update existing build configuration', () => {
      const packageJson = {
        build: {
          win: { existingProperty: 'value' },
          nsis: { existingProperty: 'value' }
        }
      };

      packageConfigManager.updateBuildConfiguration(packageJson);

      expect(packageJson.build.win.requestedExecutionLevel).toBe('requireAdministrator');
      expect(packageJson.build.win.existingProperty).toBe('value'); // Should preserve existing
      expect(packageJson.build.nsis.perMachine).toBe(true);
      expect(packageJson.build.nsis.existingProperty).toBe('value'); // Should preserve existing
    });
  });
});

module.exports = {};
