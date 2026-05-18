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
     const startTime = Date.now();
     try {
       const db = getDatabase();
       if (!db) throw new Error('Database not initialized');
       
       const { name, price, category, family, barcode, stock, image, description } = product;
       
       console.log(`⏱️ [ADD-PRODUCT START] Adding: "${name}" - Family: "${family}"`);
       
        return new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO products (name, price, category, family, barcode, stock, image, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, price, category || family, family, barcode || null, stock || 0, image || null, description || ''],
            function(err) {
              const duration = Date.now() - startTime;
              if (err) {
                console.error(`❌ [ADD-PRODUCT FAILED] "${name}" - ${duration}ms - Error:`, err.message);
                reject(err);
                return;
              }
              console.log(`✅ [ADD-PRODUCT OK] "${name}" - ${duration}ms - ID: ${this.lastID}`);
              resolve({ id: this.lastID, ...product });
            }
          );
        });
     } catch (error) {
       const duration = Date.now() - startTime;
       console.error(`❌ [ADD-PRODUCT ERROR] ${duration}ms -`, error.message);
       throw error;
     }
   });

   // Update product
   ipcMain.handle('update-product', async (event, id, product) => {
     const startTime = Date.now();
     try {
       const db = getDatabase();
       if (!db) throw new Error('Database not initialized');
       
       const { name, price, category, family, barcode, stock, image, description } = product;
       
       console.log(`⏱️ [UPDATE-PRODUCT START] ID: ${id} - "${name}"`);
       
       return new Promise((resolve, reject) => {
         db.run(
           'UPDATE products SET name = ?, price = ?, category = ?, family = ?, barcode = ?, stock = ?, image = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
           [name, price, category || family, family, barcode || '', stock || 0, image || null, description || '', id],
           function(err) {
             const duration = Date.now() - startTime;
             if (err) {
               console.error(`❌ [UPDATE-PRODUCT FAILED] ID: ${id} - ${duration}ms - Error:`, err.message);
               reject(err);
               return;
             }
             console.log(`✅ [UPDATE-PRODUCT OK] ID: ${id} - ${duration}ms`);
             resolve({ id, ...product });
           }
         );
       });
     } catch (error) {
       const duration = Date.now() - startTime;
       console.error(`❌ [UPDATE-PRODUCT ERROR] ${duration}ms -`, error.message);
       throw error;
     }
   });

   // Delete product
   ipcMain.handle('delete-product', async (event, id) => {
     const startTime = Date.now();
     try {
       const db = getDatabase();
       if (!db) throw new Error('Database not initialized');
       
       console.log(`⏱️ [DELETE-PRODUCT START] ID: ${id}`);
       
       return new Promise((resolve, reject) => {
         db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
           const duration = Date.now() - startTime;
           if (err) {
             console.error(`❌ [DELETE-PRODUCT FAILED] ID: ${id} - ${duration}ms - Error:`, err.message);
             reject(err);
             return;
           }
           console.log(`✅ [DELETE-PRODUCT OK] ID: ${id} - ${duration}ms`);
           resolve({ success: true });
         });
       });
     } catch (error) {
       const duration = Date.now() - startTime;
       console.error(`❌ [DELETE-PRODUCT ERROR] ${duration}ms -`, error.message);
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
     const startTime = Date.now();
     try {
       const db = getDatabase();
       if (!db) throw new Error('Database not initialized');

       console.log(`⏱️ [GET-FAMILIES START]`);

       return new Promise((resolve, reject) => {
         db.all(
           'SELECT id, name, description FROM product_families ORDER BY name ASC',
           [],
           (err, rows) => {
             const duration = Date.now() - startTime;
             if (err) {
               console.error(`❌ [GET-FAMILIES FAILED] ${duration}ms - Error:`, err.message);
               reject(err);
               return;
             }
             const count = rows?.length || 0;
             console.log(`✅ [GET-FAMILIES OK] ${duration}ms - Found ${count} families:`, rows?.map(r => r.name) || []);
             resolve(rows || []);
           }
         );
       });
     } catch (error) {
       const duration = Date.now() - startTime;
       console.error(`❌ [GET-FAMILIES ERROR] ${duration}ms -`, error.message);
       return [];
     }
   });

   // Add a family (if not already existing)
   ipcMain.handle('add-family', async (event, name, description = null) => {
     const startTime = Date.now();
     try {
       const db = getDatabase();
       if (!db) throw new Error('Database not initialized');

       const trimmed = (name || '').trim();
       if (!trimmed) {
         throw new Error('Family name is required');
       }

       console.log(`⏱️ [ADD-FAMILY START] Adding family: "${trimmed}"`);

       return new Promise((resolve, reject) => {
         // Use db.serialize to ensure proper transaction handling
         db.serialize(() => {
           db.run(
             'INSERT OR IGNORE INTO product_families (name, description) VALUES (?, ?)',
             [trimmed, description],
             function(err) {
               if (err) {
                 const duration = Date.now() - startTime;
                 console.error(`❌ [ADD-FAMILY FAILED] "${trimmed}" - ${duration}ms - Error:`, err.message);
                 reject(err);
                 return;
               }
               
               // Verify family was actually inserted
               db.get(
                 'SELECT id, name FROM product_families WHERE name = ?',
                 [trimmed],
                 (verifyErr, row) => {
                   const duration = Date.now() - startTime;
                   if (verifyErr) {
                     console.error(`❌ [ADD-FAMILY VERIFY-FAILED] "${trimmed}" - ${duration}ms - Error:`, verifyErr.message);
                     reject(verifyErr);
                     return;
                   }
                   
                   if (row) {
                     console.log(`✅ [ADD-FAMILY OK] "${trimmed}" - ${duration}ms - ID: ${row.id} - PERSISTED`);
                     resolve({ id: row.id, name: trimmed });
                   } else {
                     console.error(`❌ [ADD-FAMILY VERIFY-FAILED] Family not found after insert: "${trimmed}"`);
                     reject(new Error('Family not persisted'));
                   }
                 }
               );
             }
           );
         });
       });
     } catch (error) {
       const duration = Date.now() - startTime;
       console.error(`❌ [ADD-FAMILY ERROR] ${duration}ms -`, error.message);
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
