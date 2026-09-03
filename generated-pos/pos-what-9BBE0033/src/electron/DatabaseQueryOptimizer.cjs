/**
 * Optimized Database Query Manager
 * Provides connection pooling and query caching for better performance
 */

const sqlite3 = require('sqlite3').verbose();

class DatabaseQueryOptimizer {
  constructor(db) {
    this.db = db;
    this.queryCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.queryTimeout = 10000; // 10 seconds query timeout
    this.enableCache = true;
  }

  /**
   * Generate cache key from SQL and params
   */
  getCacheKey(sql, params = []) {
    return `${sql}::${JSON.stringify(params)}`;
  }

  /**
   * Execute query with timeout protection
   */
  async executeWithTimeout(sql, params = [], timeout = this.queryTimeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Query timeout after ${timeout}ms`));
      }, timeout);

      try {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          this.db.all(sql, params, (err, rows) => {
            clearTimeout(timeoutId);
            if (err) reject(err);
            else resolve(rows || []);
          });
        } else {
          this.db.run(sql, params, function(err) {
            clearTimeout(timeoutId);
            if (err) reject(err);
            else resolve({
              lastID: this.lastID,
              changes: this.changes
            });
          });
        }
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Execute query with optional caching for SELECT statements
   */
  async query(sql, params = [], useCache = true) {
    const cacheKey = this.getCacheKey(sql, params);

    // Check cache for SELECT statements
    if (useCache && this.enableCache && sql.trim().toUpperCase().startsWith('SELECT')) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`📦 Cache hit for query: ${sql.substring(0, 50)}...`);
        return cached.data;
      }
    }

    // Execute query with timeout
    const result = await this.executeWithTimeout(sql, params);

    // Cache SELECT results
    if (useCache && this.enableCache && sql.trim().toUpperCase().startsWith('SELECT')) {
      this.queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }

    return result;
  }

  /**
   * Execute multiple queries in a transaction for better performance
   */
  async transaction(queries) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            reject(err);
            return;
          }

          const results = [];
          let completed = 0;

          const executeNext = () => {
            if (completed >= queries.length) {
              this.db.run('COMMIT', (err) => {
                if (err) reject(err);
                else {
                  this.clearCache(); // Invalidate cache after transaction
                  resolve(results);
                }
              });
              return;
            }

            const { sql, params = [] } = queries[completed];
            this.db.run(sql, params, function(err) {
              if (err) {
                this.db.run('ROLLBACK', () => reject(err));
                return;
              }

              results.push({
                lastID: this.lastID,
                changes: this.changes
              });

              completed++;
              executeNext();
            });
          };

          executeNext();
        });
      });
    });
  }

  /**
   * Clear query cache
   */
  clearCache() {
    this.queryCache.clear();
    console.log('🧹 Query cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.queryCache.size,
      enabled: this.enableCache,
      timeout: this.cacheTimeout
    };
  }

  /**
   * Enable/disable caching
   */
  setCachingEnabled(enabled) {
    this.enableCache = enabled;
    if (!enabled) this.clearCache();
  }
}

module.exports = DatabaseQueryOptimizer;
