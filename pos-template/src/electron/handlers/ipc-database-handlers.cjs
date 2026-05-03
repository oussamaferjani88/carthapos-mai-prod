/**
 * IPC Database Handlers
 * Handles all database-related IPC communication
 */

const { ipcMain } = require('electron');

class IPCDatabaseHandlers {
  constructor(logger, dbManager) {
    this.logger = logger;
    this.dbManager = dbManager;
  }

  /**
   * Register all database IPC handlers
   */
  registerHandlers() {
    this.logger.info('📝 Registering database IPC handlers...');

    // Get products
    ipcMain.handle('get-products', async () => {
      this.logger.info('📦 Fetching products...');
      
      try {
        const products = await this.dbManager.getData(
          'SELECT * FROM products ORDER BY name ASC'
        );
        this.logger.info(`✅ Fetched ${products.length} products`);
        return products || [];
      } catch (error) {
        this.logger.error('❌ Error fetching products:', error);
        return [];
      }
    });

    // Get tables
    ipcMain.handle('get-tables', async () => {
      this.logger.info('🪑 Fetching tables...');
      
      try {
        const tables = await this.dbManager.getData(
          'SELECT * FROM restaurant_tables ORDER BY table_number ASC'
        );
        this.logger.info(`✅ Fetched ${tables.length} tables`);
        return tables || [];
      } catch (error) {
        this.logger.error('❌ Error fetching tables:', error);
        return [];
      }
    });

    // Generic query handler
    ipcMain.handle('database:query', async (event, sql, params = []) => {
      try {
        return await this.dbManager.getData(sql, params);
      } catch (error) {
        this.logger.error('❌ Database query error:', error);
        throw error;
      }
    });

    // Generic execute handler
    ipcMain.handle('database:execute', async (event, sql, params = []) => {
      try {
        return await this.dbManager.runQuery(sql, params);
      } catch (error) {
        this.logger.error('❌ Database execute error:', error);
        throw error;
      }
    });

    // Transaction handler
    ipcMain.handle('database:transaction', async () => {
      try {
        // TODO: Implement transaction support in DatabaseManager
        this.logger.warn('⚠️ Transaction support not yet implemented');
        return { success: false, error: 'Not implemented' };
      } catch (error) {
        this.logger.error('❌ Database transaction error:', error);
        throw error;
      }
    });

    this.logger.info('✅ Database IPC handlers registered');
  }
}

// Functional export for electron-modular.cjs
function registerDatabaseHandlers(getDatabase) {
  const { ipcMain } = require('electron');
  
  // Get products
  ipcMain.handle('get-products', async () => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');
      
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM products ORDER BY name ASC', [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      return [];
    }
  });

  // Add product
  ipcMain.handle('add-product', async (event, product) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');
      
      const { name, price, category, family, barcode, stock, image, description } = product;
      
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO products (name, price, category, family, barcode, stock, image, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [name, price, category || family, family, barcode || '', stock || 0, image || null, description || ''],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            resolve({ id: this.lastID, ...product });
          }
        );
      });
    } catch (error) {
      console.error('❌ Error adding product:', error);
      throw error;
    }
  });

  // Update product
  ipcMain.handle('update-product', async (event, id, product) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');
      
      const { name, price, category, family, barcode, stock, image, description } = product;
      
      return new Promise((resolve, reject) => {
        db.run(
          'UPDATE products SET name = ?, price = ?, category = ?, family = ?, barcode = ?, stock = ?, image = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [name, price, category || family, family, barcode || '', stock || 0, image || null, description || '', id],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            resolve({ id, ...product });
          }
        );
      });
    } catch (error) {
      console.error('❌ Error updating product:', error);
      throw error;
    }
  });

  // Delete product
  ipcMain.handle('delete-product', async (event, id) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');
      
      return new Promise((resolve, reject) => {
        db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ success: true });
        });
      });
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      throw error;
    }
  });

  // Get tables
  ipcMain.handle('get-tables', async () => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');
      
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM restaurant_tables ORDER BY table_number ASC', [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    } catch (error) {
      console.error('❌ Error fetching tables:', error);
      return [];
    }
  });
  
  // Database query
  ipcMain.handle('database:query', async (event, sql, params = []) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');
      
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    } catch (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }
  });

  // Database execute
  ipcMain.handle('database:execute', async (event, sql, params = []) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');
      
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    } catch (error) {
      console.error('❌ Database execute error:', error);
      throw error;
    }
  });

  // Database transaction
  ipcMain.handle('database:transaction', async (event, queries) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');
      
      return new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          
          let completed = 0;
          const results = [];
          
          queries.forEach((query, index) => {
            db.run(query.sql, query.params || [], function(err) {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              results[index] = { lastID: this.lastID, changes: this.changes };
              completed++;
              
              if (completed === queries.length) {
                db.run('COMMIT');
                resolve(results);
              }
            });
          });
        });
      });
    } catch (error) {
      console.error('❌ Database transaction error:', error);
      throw error;
    }
  });

  // === Product Families (persistent "familles") ===

  // Get all families
  ipcMain.handle('get-families', async () => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      return new Promise((resolve, reject) => {
        db.all(
          'SELECT id, name, description FROM product_families ORDER BY name ASC',
          [],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
    } catch (error) {
      console.error('❌ Error fetching families:', error);
      return [];
    }
  });

  // Add a family (if not already existing)
  ipcMain.handle('add-family', async (event, name, description = null) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      const trimmed = (name || '').trim();
      if (!trimmed) {
        throw new Error('Family name is required');
      }

      return new Promise((resolve, reject) => {
        db.run(
          'INSERT OR IGNORE INTO product_families (name, description) VALUES (?, ?)',
          [trimmed, description],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            resolve({ id: this.lastID || null, name: trimmed });
          }
        );
      });
    } catch (error) {
      console.error('❌ Error adding family:', error);
      throw error;
    }
  });

  // Delete a family and detach it from products
  ipcMain.handle('delete-family', async (event, name) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      const trimmed = (name || '').trim();
      if (!trimmed) {
        throw new Error('Family name is required');
      }

      // Wrap in a small transaction
      await new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          db.run(
            'UPDATE products SET family = NULL WHERE family = ?',
            [trimmed],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              db.run(
                'DELETE FROM product_families WHERE name = ?',
                [trimmed],
                function(err2) {
                  if (err2) {
                    db.run('ROLLBACK');
                    reject(err2);
                    return;
                  }
                  db.run('COMMIT');
                  resolve();
                }
              );
            }
          );
        });
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting family:', error);
      throw error;
    }
  });
  
  console.log('✅ Database IPC handlers registered');
}

module.exports = { IPCDatabaseHandlers, registerDatabaseHandlers };
