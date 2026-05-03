/**
 * Centralized Logger for POS Generator
 * Provides consistent logging across all modules
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor(moduleName) {
    this.moduleName = moduleName;
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logToFile = process.env.LOG_TO_FILE === 'true';
    this.logFilePath = path.join(__dirname, '..', '..', '..', 'logs', 'pos-generator.log');
    
    // Ensure log directory exists
    if (this.logToFile) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  log(level, message, ...args) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.logLevel] || 1;
    const messageLevel = levels[level] || 1;

    if (messageLevel < currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${this.moduleName}] [${level.toUpperCase()}] ${message}`;
    
    // Convert additional arguments to strings
    const additionalArgs = args.map(arg => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg, null, 2);
      }
      return String(arg);
    }).join(' ');

    const fullMessage = additionalArgs ? `${formattedMessage} ${additionalArgs}` : formattedMessage;

    // Console output
    switch (level) {
      case 'error':
        console.error(fullMessage);
        break;
      case 'warn':
        console.warn(fullMessage);
        break;
      default:
        console.log(fullMessage);
    }

    // File output
    if (this.logToFile) {
      try {
        fs.appendFileSync(this.logFilePath, fullMessage + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error.message);
      }
    }
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }
}

/**
 * Create a new logger instance
 * @param {string} moduleName - Name of the module using the logger
 * @returns {Logger} Logger instance
 */
function createLogger(moduleName) {
  return new Logger(moduleName);
}

module.exports = {
  Logger,
  createLogger
};
