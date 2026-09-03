/**
 * File Lock Manager - Prevents race conditions when multiple POS instances
 * are accessing shared resources like .db-map.json
 */

const fs = require('fs');
const path = require('path');

class FileLockManager {
  constructor() {
    this.locks = new Map();
  }

  /**
   * Read file with lock protection
   * Prevents multiple processes from reading/writing simultaneously
   */
  readWithLock(filePath, timeout = 5000) {
    return this.acquireLock(filePath, timeout).then(() => {
      try {
        if (!fs.existsSync(filePath)) {
          this.releaseLock(filePath);
          return null;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        this.releaseLock(filePath);
        return content;
      } catch (error) {
        this.releaseLock(filePath);
        throw error;
      }
    });
  }

  /**
   * Write file with lock protection
   */
  writeWithLock(filePath, content, timeout = 5000) {
    return this.acquireLock(filePath, timeout).then(() => {
      try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write to temporary file first, then rename for atomic operation
        const tempPath = `${filePath}.tmp`;
        fs.writeFileSync(tempPath, content, 'utf8');
        fs.renameSync(tempPath, filePath);
        
        this.releaseLock(filePath);
        return true;
      } catch (error) {
        this.releaseLock(filePath);
        // Clean up temp file if it exists
        try {
          const tempPath = `${filePath}.tmp`;
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        } catch {}
        throw error;
      }
    });
  }

  /**
   * Acquire lock with timeout
   */
  acquireLock(filePath, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkLock = () => {
        if (!this.locks.has(filePath)) {
          this.locks.set(filePath, true);
          resolve();
          return;
        }

        const elapsed = Date.now() - startTime;
        if (elapsed > timeout) {
          reject(new Error(`Lock timeout for ${filePath} after ${timeout}ms`));
          return;
        }

        // Wait and retry
        setTimeout(checkLock, 50);
      };

      checkLock();
    });
  }

  /**
   * Release lock
   */
  releaseLock(filePath) {
    this.locks.delete(filePath);
  }

  /**
   * Read JSON with lock
   */
  readJsonWithLock(filePath, timeout = 5000) {
    return this.readWithLock(filePath, timeout).then(content => {
      if (content === null) return null;
      try {
        return JSON.parse(content);
      } catch (error) {
        throw new Error(`Failed to parse JSON from ${filePath}: ${error.message}`);
      }
    });
  }

  /**
   * Write JSON with lock
   */
  writeJsonWithLock(filePath, data, timeout = 5000) {
    return this.writeWithLock(filePath, JSON.stringify(data, null, 2), timeout);
  }
}

module.exports = new FileLockManager();
