/**
 * Logger Service - Centralized logging for Electron app
 * Logs to both console and file
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class LoggerService {
  constructor() {
    this.logPath = path.join(os.homedir(), 'pos-debug.log');
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
    this.setupLogging();
  }

  setupLogging() {
    console.log = (...args) => this.writeLog('INFO', ...args);
    console.error = (...args) => this.writeLog('ERROR', ...args);
  }

  writeLog(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (arg instanceof Error) {
        return `Error: ${arg.message}\nStack: ${arg.stack}`;
      } else if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      } else {
        return String(arg);
      }
    }).join(' ');
    
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    try {
      fs.appendFileSync(this.logPath, logEntry);
    } catch {
      // Ignore file write errors
    }
    
    // Still log to console
    if (level === 'ERROR') {
      this.originalConsoleError(...args);
    } else {
      this.originalConsoleLog(...args);
    }
  }

  getLogPath() {
    return this.logPath;
  }

  info(...args) {
    this.writeLog('INFO', ...args);
  }

  error(...args) {
    this.writeLog('ERROR', ...args);
  }

  warn(...args) {
    this.writeLog('WARN', ...args);
  }

  debug(...args) {
    this.writeLog('DEBUG', ...args);
  }
}

// Singleton instance
let loggerInstance = null;

function getLogger() {
  if (!loggerInstance) {
    loggerInstance = new LoggerService();
  }
  return loggerInstance;
}

module.exports = { LoggerService, getLogger };
