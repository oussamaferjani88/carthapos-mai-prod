/**
 * Unit Tests for Logger
 */

const { describe, it, beforeEach, afterEach, expect, jest } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const { Logger, createLogger } = require('../../backend/utils/common/logger');

describe('Logger', () => {
  let logger;
  let tempLogFile;
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Setup test environment
    process.env.LOG_LEVEL = 'debug';
    process.env.LOG_TO_FILE = 'true';
    
    // Create temporary log file
    tempLogFile = path.join(__dirname, 'test-log-' + Date.now() + '.log');
    
    logger = new Logger('TestModule');
    logger.logFilePath = tempLogFile;

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    
    // Clean up log file
    if (fs.existsSync(tempLogFile)) {
      fs.unlinkSync(tempLogFile);
    }

    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with module name', () => {
      const testLogger = new Logger('TestModule');
      expect(testLogger.moduleName).toBe('TestModule');
    });

    it('should use default log level if not set', () => {
      delete process.env.LOG_LEVEL;
      const testLogger = new Logger('TestModule');
      expect(testLogger.logLevel).toBe('info');
    });

    it('should respect LOG_TO_FILE environment variable', () => {
      process.env.LOG_TO_FILE = 'false';
      const testLogger = new Logger('TestModule');
      expect(testLogger.logToFile).toBe(false);
    });
  });

  describe('log method', () => {
    it('should log info messages to console', () => {
      logger.info('Test info message');
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[TestModule\] \[INFO\] Test info message/)
      );
    });

    it('should log error messages to console.error', () => {
      logger.error('Test error message');
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[TestModule\] \[ERROR\] Test error message/)
      );
    });

    it('should log warn messages to console.warn', () => {
      logger.warn('Test warning message');
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[TestModule\] \[WARN\] Test warning message/)
      );
    });

    it('should log debug messages when log level is debug', () => {
      process.env.LOG_LEVEL = 'debug';
      const debugLogger = new Logger('DebugModule');
      
      debugLogger.debug('Test debug message');
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[DebugModule\] \[DEBUG\] Test debug message/)
      );
    });

    it('should not log debug messages when log level is info', () => {
      process.env.LOG_LEVEL = 'info';
      const infoLogger = new Logger('InfoModule');
      
      infoLogger.debug('Test debug message');
      
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringMatching(/DEBUG.*Test debug message/)
      );
    });
  });

  describe('file logging', () => {
    it('should write to log file when LOG_TO_FILE is true', () => {
      logger.info('Test file logging');
      
      // Check if file exists and contains the message
      expect(fs.existsSync(tempLogFile)).toBe(true);
      
      const logContent = fs.readFileSync(tempLogFile, 'utf8');
      expect(logContent).toMatch(/\[.*\] \[TestModule\] \[INFO\] Test file logging/);
    });

    it('should handle file write errors gracefully', () => {
      // Set an invalid file path
      logger.logFilePath = '/invalid/path/log.txt';
      
      // Should not throw error
      expect(() => {
        logger.info('This should not crash');
      }).not.toThrow();
    });

    it('should include additional arguments in log', () => {
      const testObject = { key: 'value' };
      logger.info('Test with object', testObject, 'string arg');
      
      const logContent = fs.readFileSync(tempLogFile, 'utf8');
      expect(logContent).toMatch(/\{"key":"value"\}/);
      expect(logContent).toMatch(/string arg/);
    });
  });

  describe('createLogger function', () => {
    it('should create logger instance with given module name', () => {
      const testLogger = createLogger('CreatedModule');
      
      expect(testLogger).toBeInstanceOf(Logger);
      expect(testLogger.moduleName).toBe('CreatedModule');
    });
  });

  describe('convenience methods', () => {
    it('should call log method with correct level for info', () => {
      const logSpy = jest.spyOn(logger, 'log');
      
      logger.info('Info message', 'extra arg');
      
      expect(logSpy).toHaveBeenCalledWith('info', 'Info message', 'extra arg');
    });

    it('should call log method with correct level for error', () => {
      const logSpy = jest.spyOn(logger, 'log');
      
      logger.error('Error message', 'extra arg');
      
      expect(logSpy).toHaveBeenCalledWith('error', 'Error message', 'extra arg');
    });

    it('should call log method with correct level for warn', () => {
      const logSpy = jest.spyOn(logger, 'log');
      
      logger.warn('Warning message', 'extra arg');
      
      expect(logSpy).toHaveBeenCalledWith('warn', 'Warning message', 'extra arg');
    });

    it('should call log method with correct level for debug', () => {
      const logSpy = jest.spyOn(logger, 'log');
      
      logger.debug('Debug message', 'extra arg');
      
      expect(logSpy).toHaveBeenCalledWith('debug', 'Debug message', 'extra arg');
    });
  });
});

module.exports = {};
