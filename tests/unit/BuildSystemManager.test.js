/**
 * Unit Tests for BuildSystemManager
 */

const { describe, it, beforeEach, afterEach, expect, jest } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { BuildSystemManager } = require('../../backend/utils/generators/BuildSystemManager');

// Mock child_process
jest.mock('child_process');

describe('BuildSystemManager', () => {
  let manager;
  let mockProjectRoot;
  let mockLogger;
  let originalExistsSync;
  let originalReadFileSync;
  let originalWriteFileSync;

  beforeEach(() => {
    mockProjectRoot = '/test/project';
    
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Store original fs methods
    originalExistsSync = fs.existsSync;
    originalReadFileSync = fs.readFileSync;
    originalWriteFileSync = fs.writeFileSync;

    manager = new BuildSystemManager(mockProjectRoot, mockLogger);

    // Clear spawn mock
    spawn.mockClear();
  });

  afterEach(() => {
    // Restore original fs methods
    fs.existsSync = originalExistsSync;
    fs.readFileSync = originalReadFileSync;
    fs.writeFileSync = originalWriteFileSync;
  });

  describe('constructor', () => {
    it('should initialize with project root and logger', () => {
      expect(manager.projectRoot).toBe(mockProjectRoot);
      expect(manager.logger).toBe(mockLogger);
    });

    it('should create logger if none provided', () => {
      const managerWithoutLogger = new BuildSystemManager(mockProjectRoot);
      expect(managerWithoutLogger.logger).toBeDefined();
    });
  });

  describe('installDependencies', () => {
    it('should install dependencies with npm', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        })
      };

      spawn.mockReturnValue(mockProcess);

      const result = await manager.installDependencies('npm');

      expect(spawn).toHaveBeenCalledWith('npm', ['install'], {
        cwd: mockProjectRoot,
        stdio: 'pipe'
      });
      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Installing dependencies with npm...');
    });

    it('should install dependencies with pnpm', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        })
      };

      spawn.mockReturnValue(mockProcess);

      const result = await manager.installDependencies('pnpm');

      expect(spawn).toHaveBeenCalledWith('pnpm', ['install'], {
        cwd: mockProjectRoot,
        stdio: 'pipe'
      });
      expect(result.success).toBe(true);
    });

    it('should handle installation failure', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10);
          }
        })
      };

      spawn.mockReturnValue(mockProcess);

      const result = await manager.installDependencies('npm');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Installation failed with exit code 1');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle spawn errors', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Spawn failed')), 10);
          }
        })
      };

      spawn.mockReturnValue(mockProcess);

      const result = await manager.installDependencies('npm');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Spawn failed');
    });
  });

  describe('buildProject', () => {
    it('should build project with npm', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        })
      };

      spawn.mockReturnValue(mockProcess);

      const result = await manager.buildProject('npm');

      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'build'], {
        cwd: mockProjectRoot,
        stdio: 'pipe'
      });
      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Building project with npm...');
    });

    it('should build project with custom script', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        })
      };

      spawn.mockReturnValue(mockProcess);

      const result = await manager.buildProject('npm', 'build:prod');

      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'build:prod'], {
        cwd: mockProjectRoot,
        stdio: 'pipe'
      });
      expect(result.success).toBe(true);
    });

    it('should handle build failure', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10);
          }
        })
      };

      spawn.mockReturnValue(mockProcess);

      const result = await manager.buildProject('npm');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Build failed with exit code 1');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('runScript', () => {
    it('should run custom script', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        })
      };

      spawn.mockReturnValue(mockProcess);

      const result = await manager.runScript('npm', 'test');

      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'test'], {
        cwd: mockProjectRoot,
        stdio: 'pipe'
      });
      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Running script: test');
    });

    it('should run script with arguments', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        })
      };

      spawn.mockReturnValue(mockProcess);

      const result = await manager.runScript('npm', 'test', ['--watch', '--verbose']);

      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'test', '--watch', '--verbose'], {
        cwd: mockProjectRoot,
        stdio: 'pipe'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('detectPackageManager', () => {
    it('should detect pnpm from lock file', () => {
      fs.existsSync = jest.fn((filePath) => {
        return filePath.includes('pnpm-lock.yaml');
      });

      const result = manager.detectPackageManager();

      expect(result).toBe('pnpm');
      expect(mockLogger.debug).toHaveBeenCalledWith('Detected package manager: pnpm');
    });

    it('should detect yarn from lock file', () => {
      fs.existsSync = jest.fn((filePath) => {
        return filePath.includes('yarn.lock');
      });

      const result = manager.detectPackageManager();

      expect(result).toBe('yarn');
      expect(mockLogger.debug).toHaveBeenCalledWith('Detected package manager: yarn');
    });

    it('should default to npm when no lock files found', () => {
      fs.existsSync = jest.fn().mockReturnValue(false);

      const result = manager.detectPackageManager();

      expect(result).toBe('npm');
      expect(mockLogger.debug).toHaveBeenCalledWith('No lock files found, defaulting to npm');
    });
  });

  describe('validateBuildConfig', () => {
    it('should validate existing build configuration', () => {
      const mockPackageJson = {
        scripts: {
          build: 'vite build',
          dev: 'vite dev'
        },
        devDependencies: {
          vite: '^4.0.0'
        }
      };

      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(mockPackageJson));

      const result = manager.validateBuildConfig();

      expect(result.isValid).toBe(true);
      expect(result.hasBuildScript).toBe(true);
      expect(result.hasDevScript).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('Build configuration validation passed');
    });

    it('should detect missing build script', () => {
      const mockPackageJson = {
        scripts: {
          dev: 'vite dev'
        }
      };

      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(mockPackageJson));

      const result = manager.validateBuildConfig();

      expect(result.isValid).toBe(false);
      expect(result.hasBuildScript).toBe(false);
      expect(result.errors).toContain('Missing build script');
    });

    it('should handle missing package.json', () => {
      fs.existsSync = jest.fn().mockReturnValue(false);

      const result = manager.validateBuildConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('package.json not found');
      expect(mockLogger.error).toHaveBeenCalledWith('package.json not found');
    });

    it('should handle malformed package.json', () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('invalid json');

      const result = manager.validateBuildConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid package.json format');
    });
  });

  describe('createBuildScript', () => {
    it('should create basic build script', () => {
      const script = manager.createBuildScript();

      expect(script).toContain('vite build');
      expect(mockLogger.debug).toHaveBeenCalledWith('Created basic build script');
    });

    it('should create build script with custom options', () => {
      const options = {
        mode: 'production',
        outDir: 'dist',
        minify: true
      };

      const script = manager.createBuildScript(options);

      expect(script).toContain('--mode production');
      expect(script).toContain('--outDir dist');
      expect(script).toContain('--minify');
    });

    it('should create build script for electron', () => {
      const options = {
        target: 'electron',
        electronBuilder: true
      };

      const script = manager.createBuildScript(options);

      expect(script).toContain('electron-builder');
      expect(mockLogger.debug).toHaveBeenCalledWith('Created electron build script');
    });
  });

  describe('getBuildOutput', () => {
    it('should return build output information', () => {
      const mockStats = {
        size: 1024000,
        mtime: new Date()
      };

      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.statSync = jest.fn().mockReturnValue(mockStats);
      fs.readdirSync = jest.fn().mockReturnValue(['index.html', 'assets']);

      const result = manager.getBuildOutput();

      expect(result.exists).toBe(true);
      expect(result.size).toBe(1024000);
      expect(result.files).toEqual(['index.html', 'assets']);
    });

    it('should handle missing build output', () => {
      fs.existsSync = jest.fn().mockReturnValue(false);

      const result = manager.getBuildOutput();

      expect(result.exists).toBe(false);
      expect(result.error).toBe('Build output directory not found');
    });
  });
});

module.exports = {};
