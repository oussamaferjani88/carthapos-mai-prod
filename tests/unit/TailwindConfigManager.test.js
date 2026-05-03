/**
 * Unit Tests for TailwindConfigManager
 */

const { describe, it, beforeEach, afterEach, expect, jest } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const { TailwindConfigManager } = require('../../backend/utils/config/TailwindConfigManager');

describe('TailwindConfigManager', () => {
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

    manager = new TailwindConfigManager(mockProjectRoot, mockLogger);
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
      const managerWithoutLogger = new TailwindConfigManager(mockProjectRoot);
      expect(managerWithoutLogger.logger).toBeDefined();
    });
  });

  describe('generateTailwindConfig', () => {
    it('should generate complete Tailwind config', () => {
      const theme = {
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        accentColor: '#F59E0B',
        backgroundColor: '#FFFFFF',
        textColor: '#1F2937',
        borderRadius: '8',
        customFont: 'Inter'
      };

      const config = manager.generateTailwindConfig(theme);

      expect(config).toContain('module.exports = {');
      expect(config).toContain('content: [');
      expect(config).toContain('theme: {');
      expect(config).toContain('extend: {');
      expect(config).toContain('primary: "#3B82F6"');
      expect(config).toContain('secondary: "#10B981"');
      expect(config).toContain('accent: "#F59E0B"');
      expect(config).toContain('fontFamily: {');
      expect(config).toContain('sans: ["Inter", "ui-sans-serif"');
      expect(config).toContain('borderRadius: {');
      expect(config).toContain('DEFAULT: "8px"');
    });

    it('should handle missing theme properties with defaults', () => {
      const theme = {
        primaryColor: '#3B82F6'
      };

      const config = manager.generateTailwindConfig(theme);

      expect(config).toContain('primary: "#3B82F6"');
      expect(config).toContain('secondary: "#10B981"'); // default
      expect(config).toContain('accent: "#F59E0B"'); // default
    });

    it('should handle custom brand colors', () => {
      const theme = {
        primaryColor: '#FF0000',
        brandColors: {
          tertiary: '#00FF00',
          quaternary: '#0000FF'
        }
      };

      const config = manager.generateTailwindConfig(theme);

      expect(config).toContain('tertiary: "#00FF00"');
      expect(config).toContain('quaternary: "#0000FF"');
    });
  });

  describe('createTailwindConfig', () => {
    it('should create tailwind.config.js file', () => {
      const mockConfig = 'mock tailwind config';
      const expectedPath = path.join(mockProjectRoot, 'tailwind.config.js');

      // Mock fs methods
      fs.writeFileSync = jest.fn();

      manager.createTailwindConfig(mockConfig);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expectedPath,
        mockConfig,
        'utf8'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tailwind config created successfully'
      );
    });

    it('should handle write errors gracefully', () => {
      const mockConfig = 'mock tailwind config';

      // Mock fs to throw error
      fs.writeFileSync = jest.fn(() => {
        throw new Error('Write failed');
      });

      expect(() => {
        manager.createTailwindConfig(mockConfig);
      }).toThrow('Failed to create Tailwind config: Write failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateTailwindConfig', () => {
    it('should update existing tailwind config', () => {
      const existingConfig = `module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#000000"
      }
    }
  }
}`;

      const newTheme = {
        primaryColor: '#FF0000',
        secondaryColor: '#00FF00'
      };

      const expectedPath = path.join(mockProjectRoot, 'tailwind.config.js');

      // Mock fs methods
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(existingConfig);
      fs.writeFileSync = jest.fn();

      manager.updateTailwindConfig(newTheme);

      expect(fs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf8');
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tailwind config updated successfully'
      );
    });

    it('should create new config if file does not exist', () => {
      const newTheme = {
        primaryColor: '#FF0000'
      };

      // Mock fs methods
      fs.existsSync = jest.fn().mockReturnValue(false);
      fs.writeFileSync = jest.fn();

      manager.updateTailwindConfig(newTheme);

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Created new Tailwind config'
      );
    });

    it('should handle read errors gracefully', () => {
      const newTheme = { primaryColor: '#FF0000' };

      // Mock fs methods
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn(() => {
        throw new Error('Read failed');
      });

      expect(() => {
        manager.updateTailwindConfig(newTheme);
      }).toThrow('Failed to update Tailwind config: Read failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('validateTailwindConfig', () => {
    it('should return true for valid config', () => {
      const validConfig = `module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {}
  }
}`;

      const expectedPath = path.join(mockProjectRoot, 'tailwind.config.js');

      // Mock fs methods
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(validConfig);

      const result = manager.validateTailwindConfig();

      expect(result).toBe(true);
      expect(fs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf8');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Tailwind config validation passed'
      );
    });

    it('should return false if config file does not exist', () => {
      // Mock fs methods
      fs.existsSync = jest.fn().mockReturnValue(false);

      const result = manager.validateTailwindConfig();

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Tailwind config file not found'
      );
    });

    it('should return false for invalid config', () => {
      const invalidConfig = 'invalid javascript syntax {';

      const expectedPath = path.join(mockProjectRoot, 'tailwind.config.js');

      // Mock fs methods
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(invalidConfig);

      const result = manager.validateTailwindConfig();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Tailwind config validation failed',
        expect.any(Error)
      );
    });

    it('should handle read errors gracefully', () => {
      const expectedPath = path.join(mockProjectRoot, 'tailwind.config.js');

      // Mock fs methods
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn(() => {
        throw new Error('Read failed');
      });

      const result = manager.validateTailwindConfig();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to read Tailwind config',
        expect.any(Error)
      );
    });
  });

  describe('getTailwindConfigPath', () => {
    it('should return correct config path', () => {
      const expectedPath = path.join(mockProjectRoot, 'tailwind.config.js');
      const result = manager.getTailwindConfigPath();

      expect(result).toBe(expectedPath);
    });
  });

  describe('extractThemeFromConfig', () => {
    it('should extract theme colors from existing config', () => {
      const config = `module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",
        secondary: "#10B981",
        accent: "#F59E0B"
      }
    }
  }
}`;

      const theme = manager.extractThemeFromConfig(config);

      expect(theme).toEqual({
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        accentColor: '#F59E0B'
      });
    });

    it('should handle config without extended colors', () => {
      const config = `module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {}
}`;

      const theme = manager.extractThemeFromConfig(config);

      expect(theme).toEqual({});
    });

    it('should handle malformed config gracefully', () => {
      const config = 'invalid config';

      const theme = manager.extractThemeFromConfig(config);

      expect(theme).toEqual({});
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Could not extract theme from config'
      );
    });
  });
});

module.exports = {};
