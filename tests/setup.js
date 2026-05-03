/**
 * Jest Test Setup
 * Global setup and utilities for Jest tests
 */

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };

beforeAll(() => {
  // Mock console methods unless in verbose mode
  if (!process.env.JEST_VERBOSE) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global test utilities
global.testUtils = {
  /**
   * Create a mock logger for testing
   */
  createMockLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }),

  /**
   * Create temporary file path for testing
   */
  createTempPath: (filename = 'test-file') => {
    const path = require('path');
    return path.join(__dirname, 'temp', `${filename}-${Date.now()}`);
  },

  /**
   * Wait for a specified amount of time
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Mock file system operations
   */
  mockFs: (existsMap = {}, readMap = {}, writeMap = {}) => {
    const fs = require('fs');
    
    fs.existsSync = jest.fn((path) => {
      return existsMap[path] !== undefined ? existsMap[path] : false;
    });
    
    fs.readFileSync = jest.fn((path, encoding) => {
      if (readMap[path]) {
        return readMap[path];
      }
      throw new Error(`File not found: ${path}`);
    });
    
    fs.writeFileSync = jest.fn((path, content, encoding) => {
      writeMap[path] = content;
      return true;
    });

    return { existsMap, readMap, writeMap };
  },

  /**
   * Generate mock configuration objects
   */
  createMockConfig: (overrides = {}) => ({
    businessName: 'Test Business',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    accentColor: '#F59E0B',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    borderRadius: '8',
    customFont: 'Inter',
    features: {
      inventory: true,
      customers: true,
      reporting: true,
      multiLocation: false
    },
    ...overrides
  }),

  /**
   * Create mock package.json content
   */
  createMockPackageJson: (overrides = {}) => JSON.stringify({
    name: 'test-pos',
    version: '1.0.0',
    scripts: {
      dev: 'vite dev',
      build: 'vite build',
      test: 'jest'
    },
    dependencies: {
      react: '^18.0.0',
      'react-dom': '^18.0.0'
    },
    devDependencies: {
      vite: '^4.0.0',
      '@types/node': '^18.0.0'
    },
    ...overrides
  }, null, 2),

  /**
   * Assert that a function was called with specific arguments
   */
  expectCalledWith: (mockFn, ...expectedArgs) => {
    expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
  },

  /**
   * Assert that a mock function was called a specific number of times
   */
  expectCalledTimes: (mockFn, times) => {
    expect(mockFn).toHaveBeenCalledTimes(times);
  },

  /**
   * Create a mock child process for testing
   */
  createMockChildProcess: (exitCode = 0, stdout = '', stderr = '') => ({
    stdout: {
      on: jest.fn((event, callback) => {
        if (event === 'data' && stdout) {
          setTimeout(() => callback(stdout), 10);
        }
      })
    },
    stderr: {
      on: jest.fn((event, callback) => {
        if (event === 'data' && stderr) {
          setTimeout(() => callback(stderr), 10);
        }
      })
    },
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(exitCode), 20);
      } else if (event === 'error' && exitCode === -1) {
        setTimeout(() => callback(new Error('Process failed')), 10);
      }
    })
  })
};

// Global matchers
expect.extend({
  /**
   * Check if a string contains all specified substrings
   */
  toContainAll(received, ...expected) {
    const pass = expected.every(substring => 
      typeof received === 'string' && received.includes(substring)
    );
    
    if (pass) {
      return {
        message: () => `Expected "${received}" not to contain all of: ${expected.join(', ')}`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected "${received}" to contain all of: ${expected.join(', ')}`,
        pass: false
      };
    }
  },

  /**
   * Check if an array has a specific length
   */
  toHaveLength(received, expected) {
    const pass = Array.isArray(received) && received.length === expected;
    
    if (pass) {
      return {
        message: () => `Expected array not to have length ${expected}`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected array to have length ${expected}, but got ${received?.length || 'not an array'}`,
        pass: false
      };
    }
  }
});

// Environment setup
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

module.exports = {};
