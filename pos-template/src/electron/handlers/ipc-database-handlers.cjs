/**
 * IPC Database Handlers (functional only — single source of truth)
 * Handles products, tables, categories, families, settings, and generic DB operations.
 */

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

   // Helper: check if user has write access
   function canModify(role) {
     return role === 'admin' || role === 'manager';
   }

   // Add product
   ipcMain.handle('add-product', async (event, product, userRole) => {
     if (userRole && !canModify(userRole)) throw new Error('Accès refusé: seuls les administrateurs et managers peuvent ajouter des produits');
     const startTime = Date.now();
     try {
       const db = getDatabase();
       if (!db) throw new Error('Database not initialized');
       
         const { name, price, cost_price, category, family, barcode, stock, min_stock, unit, supplier, image, description, vat_rate_id, price_type, requires_kitchen, preparation_department, preparation_time, image_settings } = product;
         
         console.log(`⏱️ [ADD-PRODUCT START] Adding: "${name}" - Family: "${family}"`);
         
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO products (name, price, cost_price, category, family, barcode, stock, min_stock, unit, supplier, image, description, vat_rate_id, price_type, requires_kitchen, preparation_department, preparation_time, image_settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [name, price, cost_price || 0, category || family, family, barcode || null, stock || 0, min_stock || 0, unit || 'unit', supplier || '', image || null, description || '', vat_rate_id || null, price_type || 'ttc', requires_kitchen ? 1 : 0, preparation_department || null, preparation_time || null, image_settings || null],
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
   ipcMain.handle('update-product', async (event, id, product, userRole) => {
     if (userRole && !canModify(userRole)) throw new Error('Accès refusé: seuls les administrateurs et managers peuvent modifier des produits');
     const startTime = Date.now();
     try {
       const db = getDatabase();
       if (!db) throw new Error('Database not initialized');
       
         const { name, price, cost_price, category, family, barcode, stock, min_stock, unit, supplier, image, description, vat_rate_id, price_type, requires_kitchen, preparation_department, preparation_time, image_settings } = product;
         
         console.log(`⏱️ [UPDATE-PRODUCT START] ID: ${id} - "${name}"`);
         
          return new Promise((resolve, reject) => {
            db.run(
              'UPDATE products SET name = ?, price = ?, cost_price = ?, category = ?, family = ?, barcode = ?, stock = ?, min_stock = ?, unit = ?, supplier = ?, image = ?, description = ?, vat_rate_id = ?, price_type = ?, requires_kitchen = ?, preparation_department = ?, preparation_time = ?, image_settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
               [name, price, cost_price || 0, category || family, family, barcode || null, stock || 0, min_stock || 0, unit || 'unit', supplier || '', image || null, description || '', vat_rate_id || null, price_type || 'ttc', requires_kitchen ? 1 : 0, preparation_department || null, preparation_time || null, image_settings || null, id],
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
   ipcMain.handle('delete-product', async (event, id, userRole) => {
     if (userRole && !canModify(userRole)) throw new Error('Accès refusé: seuls les administrateurs et managers peuvent supprimer des produits');
     const startTime = Date.now();
     try {
       const db = getDatabase();
       if (!db) throw new Error('Database not initialized');
       
       console.log(`⏱️ [DELETE-PRODUCT START] ID: ${id}`);

       // Referential integrity: check dependent records
       const checks = await new Promise((resolve, reject) => {
         db.all(
           `SELECT
             (SELECT COUNT(*) FROM sale_items WHERE product_id = ?) as sale_items,
             (SELECT COUNT(*) FROM stock_movements WHERE product_id = ?) as stock_movements,
             (SELECT COUNT(*) FROM kitchen_orders WHERE product_id = ?) as kitchen_orders`,
           [id, id, id],
           (err, rows) => {
             if (err) reject(err);
             else resolve(rows?.[0] || {});
           }
         );
       });

       const deps = [];
       if (checks.sale_items > 0) deps.push(`${checks.sale_items} vente(s)`);
       if (checks.stock_movements > 0) deps.push(`${checks.stock_movements} mouvement(s) de stock`);
       if (checks.kitchen_orders > 0) deps.push(`${checks.kitchen_orders} commande(s) cuisine`);

       if (deps.length > 0) {
         throw new Error(`Impossible de supprimer ce produit: ${deps.join(', ')} liée(s). Archiviez-le ou supprimez d'abord les enregistrements dépendants.`);
       }
       
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
        db.all('SELECT * FROM restaurant_tables ORDER BY id ASC', [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    } catch (error) {
      console.error('❌ Error fetching tables:', error);
      return [];
    }
  });

  // Add table
  ipcMain.handle('add-table', async (event, table) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');
      
      const { table_number, capacity, waiter, notes, x, y, zone, area_name, shape } = table;
      
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO restaurant_tables (table_number, capacity, waiter, notes, x, y, zone, area_name, shape)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            table_number,
            capacity || 2,
            waiter || '',
            notes || '',
            x || 50,
            y || 50,
            zone || '',
            area_name || '',
            shape || 'square'
          ],
          function(err) {
            if (err) {
              console.error('❌ Error adding table:', err.message);
              reject(err);
              return;
            }
            resolve({ id: this.lastID, ...table });
          }
        );
      });
    } catch (error) {
      console.error('❌ Error adding table:', error);
      throw error;
    }
  });

  // Update table
  ipcMain.handle('update-table', async (event, id, table) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      // Build dynamic SET from provided fields
      const fields = ['table_number', 'capacity', 'waiter', 'notes', 'status', 'x', 'y', 'zone', 'area_name', 'merged_tables', 'merged_into', 'current_order_id', 'shape', 'locked', 'customer_count', 'dining_started_at'];
      const setClauses = [];
      const params = [];

      for (const field of fields) {
        if (table[field] !== undefined) {
          setClauses.push(`${field} = ?`);
          params.push(table[field]);
        }
      }

      if (setClauses.length === 0) return { success: false, reason: 'No fields to update' };

      params.push(id);
      
      return new Promise((resolve, reject) => {
        db.run(
          `UPDATE restaurant_tables SET ${setClauses.join(', ')} WHERE id = ?`,
          params,
          function(err) {
            if (err) {
              console.error('❌ Error updating table:', err.message);
              reject(err);
              return;
            }
            resolve({ success: true });
          }
        );
      });
    } catch (error) {
      console.error('❌ Error updating table:', error);
      throw error;
    }
  });

  // Update table status
  ipcMain.handle('update-table-status', async (event, id, status) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');
      
      return new Promise((resolve, reject) => {
        db.run(
          'UPDATE restaurant_tables SET status = ? WHERE id = ?',
          [status, id],
          function(err) {
            if (err) {
              console.error('❌ Error updating table status:', err.message);
              reject(err);
              return;
            }
            resolve({ success: true });
          }
        );
      });
    } catch (error) {
      console.error('❌ Error updating table status:', error);
      throw error;
    }
  });

  // Delete table
  ipcMain.handle('delete-table', async (event, id) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      // Referential integrity: check dependent records
      const checks = await new Promise((resolve, reject) => {
        db.all(
          `SELECT
            (SELECT COUNT(*) FROM sales WHERE table_id = ? AND status != 'cancelled') as sales,
            (SELECT COUNT(*) FROM held_orders WHERE table_id = ?) as held_orders,
            (SELECT COUNT(*) FROM table_reservations WHERE table_id = ?) as reservations`,
          [id, id, id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows?.[0] || {});
          }
        );
      });

      const deps = [];
      if (checks.sales > 0) deps.push(`${checks.sales} vente(s)`);
      if (checks.held_orders > 0) deps.push(`${checks.held_orders} commande(s) en attente`);
      if (checks.reservations > 0) deps.push(`${checks.reservations} réservation(s)`);

      if (deps.length > 0) {
        throw new Error(`Impossible de supprimer cette table: ${deps.join(', ')} liée(s). Supprimez d'abord les enregistrements dépendants.`);
      }

      return new Promise((resolve, reject) => {
        db.run('DELETE FROM restaurant_tables WHERE id = ?', [id], function(err) {
          if (err) {
            console.error('❌ Error deleting table:', err.message);
            reject(err);
            return;
          }
          resolve({ success: true });
        });
      });
    } catch (error) {
      console.error('❌ Error deleting table:', error);
      throw error;
    }
  });

  // === Bulk table creation ===
  ipcMain.handle('bulk-add-tables', async (event, { prefix, start, end, capacity, zone, waiter, shape, notes }) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      const tables = [];
      for (let i = start; i <= end; i++) {
        tables.push({ number: `${prefix}${i}`, capacity: capacity || 2, zone: zone || '', waiter: waiter || '', shape: shape || 'square', notes: notes || '' });
      }

      return new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          let inserted = 0;
          let errors = [];

          tables.forEach((t, idx) => {
            db.run(
              'INSERT INTO restaurant_tables (table_number, capacity, status, x, y, zone, waiter, shape, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [t.number, t.capacity, 'available', 50 + (idx % 5) * 120, 50 + Math.floor(idx / 5) * 120, t.zone, t.waiter, t.shape, t.notes],
              function(err) {
                if (err) errors.push(err.message);
                inserted++;
                if (inserted === tables.length) {
                  if (errors.length > 0 && errors.length === tables.length) {
                    db.run('ROLLBACK');
                    reject(new Error(`Failed to insert any tables: ${errors[0]}`));
                  } else {
                    db.run('COMMIT');
                    resolve({ success: true, count: tables.length - errors.length, errors: errors.length > 0 ? errors : undefined });
                  }
                }
              }
            );
          });
        });
      });
    } catch (error) {
      console.error('❌ Error bulk adding tables:', error);
      throw error;
    }
  });

  // === Table Analytics ===
  ipcMain.handle('table-analytics', async () => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      return new Promise((resolve, reject) => {
        const analytics = {};

        // Status distribution
        db.all(
          `SELECT status, COUNT(*) as count FROM restaurant_tables GROUP BY status`,
          [],
          (err, rows) => {
            if (err) { reject(err); return; }
            analytics.statusCounts = rows || [];

            // Total capacity
            db.get(`SELECT SUM(capacity) as total_capacity FROM restaurant_tables`, [], (err2, row2) => {
              if (err2) { reject(err2); return; }
              analytics.totalCapacity = row2?.total_capacity || 0;

              // Average table size
              db.get(`SELECT AVG(capacity) as avg_capacity FROM restaurant_tables`, [], (err3, row3) => {
                if (err3) { reject(err3); return; }
                analytics.avgCapacity = row3?.avg_capacity || 0;

                // Tables per zone
                db.all(
                  `SELECT COALESCE(zone, 'Sans zone') as zone, COUNT(*) as count FROM restaurant_tables GROUP BY zone ORDER BY count DESC`,
                  [],
                  (err4, rows4) => {
                    if (err4) { reject(err4); return; }
                    analytics.zoneDistribution = rows4 || [];

                    // Today's reservations count
                    db.get(
                      `SELECT COUNT(*) as count FROM table_reservations WHERE reservation_date = DATE('now', 'localtime') AND status IN ('confirmed', 'seated')`,
                      [],
                      (err5, row5) => {
                        if (err5) { reject(err5); return; }
                        analytics.todayReservations = row5?.count || 0;

                        resolve(analytics);
                      }
                    );
                  }
                );
              });
            });
          }
        );
      });
    } catch (error) {
      console.error('❌ Error getting table analytics:', error);
      throw error;
    }
  });

  // === Reservations CRUD ===
  ipcMain.handle('get-reservations', async (event, filters = {}) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      let sql = `SELECT r.*, t.table_number 
                  FROM table_reservations r 
                  LEFT JOIN restaurant_tables t ON r.table_id = t.id 
                  WHERE 1=1`;
      const params = [];

      if (filters.date) {
        sql += ` AND r.reservation_date = ?`;
        params.push(filters.date);
      }
      if (filters.status) {
        sql += ` AND r.status = ?`;
        params.push(filters.status);
      }
      if (filters.table_id) {
        sql += ` AND r.table_id = ?`;
        params.push(filters.table_id);
      }

      sql += ` ORDER BY r.reservation_date DESC, r.reservation_time ASC`;

      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    } catch (error) {
      console.error('❌ Error getting reservations:', error);
      throw error;
    }
  });

  ipcMain.handle('add-reservation', async (event, reservation) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      const { table_id, customer_name, customer_phone, guests, reservation_date, reservation_time, duration_minutes, notes } = reservation;

      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO table_reservations (table_id, customer_name, customer_phone, guests, reservation_date, reservation_time, duration_minutes, notes, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
          [table_id || null, customer_name, customer_phone || '', guests || 2, reservation_date, reservation_time, duration_minutes || 120, notes || ''],
          function(err) {
            if (err) { reject(err); return; }

            // If table_id provided, mark table as reserved
            if (table_id) {
              db.run(`UPDATE restaurant_tables SET status = 'reserved' WHERE id = ?`, [table_id], () => {
                resolve({ id: this.lastID, ...reservation });
              });
            } else {
              resolve({ id: this.lastID, ...reservation });
            }
          }
        );
      });
    } catch (error) {
      console.error('❌ Error adding reservation:', error);
      throw error;
    }
  });

  ipcMain.handle('update-reservation', async (event, id, reservation) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      const fields = ['table_id', 'customer_name', 'customer_phone', 'guests', 'reservation_date', 'reservation_time', 'duration_minutes', 'notes', 'status'];
      const setClauses = [];
      const params = [];

      for (const field of fields) {
        if (reservation[field] !== undefined) {
          setClauses.push(`${field} = ?`);
          params.push(reservation[field]);
        }
      }

      if (setClauses.length === 0) return { success: false, reason: 'No fields to update' };

      params.push(id);

      return new Promise((resolve, reject) => {
        db.run(
          `UPDATE table_reservations SET ${setClauses.join(', ')} WHERE id = ?`,
          params,
          function(err) {
            if (err) { reject(err); return; }
            resolve({ success: true });
          }
        );
      });
    } catch (error) {
      console.error('❌ Error updating reservation:', error);
      throw error;
    }
  });

  ipcMain.handle('delete-reservation', async (event, id) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      return new Promise((resolve, reject) => {
        db.run('DELETE FROM table_reservations WHERE id = ?', [id], function(err) {
          if (err) { reject(err); return; }
          resolve({ success: true });
        });
      });
    } catch (error) {
      console.error('❌ Error deleting reservation:', error);
      throw error;
    }
  });

  // === Zones CRUD ===
  ipcMain.handle('get-zones', async () => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM table_zones ORDER BY sort_order ASC, name ASC', [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    } catch (error) {
      console.error('❌ Error getting zones:', error);
      throw error;
    }
  });

  ipcMain.handle('add-zone', async (event, zone) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO table_zones (name, color, description, sort_order, server_id) VALUES (?, ?, ?, ?, ?)`,
          [zone.name, zone.color || '#3B82F6', zone.description || '', zone.sort_order || 0, zone.server_id || null],
          function(err) {
            if (err) { reject(err); return; }
            resolve({ id: this.lastID, ...zone });
          }
        );
      });
    } catch (error) {
      console.error('❌ Error adding zone:', error);
      throw error;
    }
  });

  ipcMain.handle('update-zone', async (event, id, zone) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      const fields = ['name', 'color', 'description', 'sort_order', 'server_id'];
      const setClauses = [];
      const params = [];

      for (const field of fields) {
        if (zone[field] !== undefined) {
          setClauses.push(`${field} = ?`);
          params.push(zone[field]);
        }
      }

      if (setClauses.length === 0) return { success: false, reason: 'No fields to update' };
      params.push(id);

      return new Promise((resolve, reject) => {
        db.run(
          `UPDATE table_zones SET ${setClauses.join(', ')} WHERE id = ?`,
          params,
          function(err) {
            if (err) { reject(err); return; }
            resolve({ success: true });
          }
        );
      });
    } catch (error) {
      console.error('❌ Error updating zone:', error);
      throw error;
    }
  });

  ipcMain.handle('delete-zone', async (event, id) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      return new Promise((resolve, reject) => {
        db.run('DELETE FROM table_zones WHERE id = ?', [id], function(err) {
          if (err) { reject(err); return; }
          resolve({ success: true });
        });
      });
    } catch (error) {
      console.error('❌ Error deleting zone:', error);
      throw error;
    }
  });
  
  // ── Security: Whitelist of dangerous SQL keywords blocked in renderer queries ──
  const FORBIDDEN_SQL_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|TRUNCATE|ATTACH|DETACH|GRANT|REVOKE|EXEC|EXECUTE)\b/i;

  // Database query — SELECT only, no DML/DDL from renderer
  ipcMain.handle('database:query', async (event, sql, params = []) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      const trimmed = (sql || '').trim();
      if (!trimmed.toUpperCase().startsWith('SELECT')) {
        console.error('❌ [SECURITY] database:query rejected non-SELECT SQL:', trimmed.substring(0, 120));
        throw new Error('Accès refusé: seules les requêtes SELECT sont autorisées');
      }
      if (FORBIDDEN_SQL_KEYWORDS.test(trimmed)) {
        console.error('❌ [SECURITY] database:query contains forbidden keywords:', trimmed.substring(0, 120));
        throw new Error('Accès refusé: requête SQL interdite');
      }

      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    } catch (error) {
      console.error('❌ Database query error:', error.message);
      throw error;
    }
  });

  // Database execute — BLOCKED from renderer, all writes must use named IPC handlers
  ipcMain.handle('database:execute', async (event, sql, params = []) => {
    console.error('❌ [SECURITY] database:execute called from renderer — BLOCKED');
    throw new Error('Accès refusé: les écritures directes ne sont pas autorisées. Utilisez les handlers dédiés.');
  });

  // Database transaction — BLOCKED from renderer
  ipcMain.handle('database:transaction', async (event, queries) => {
    console.error('❌ [SECURITY] database:transaction called from renderer — BLOCKED');
    throw new Error('Accès refusé: les transactions directes ne sont pas autorisées.');
  });

  // ── Named handler: Move products from one family to another ──
  ipcMain.handle('update-product-family', async (event, oldFamily, newFamily) => {
    try {
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');
      return new Promise((resolve, reject) => {
        db.run('UPDATE products SET family = ? WHERE family = ?', [newFamily, oldFamily], function(err) {
          if (err) reject(err);
          else {
            try {
              db.run(
                `INSERT INTO audit_logs (timestamp, user_id, user_name, action_type, entity_type, new_value, notes)
                 VALUES (datetime('now','localtime'), 0, 'System', 'FAMILY_MOVE', 'family', ?, ?)`,
                [JSON.stringify({ from: oldFamily, to: newFamily, count: this.changes }),
                 `Famille "${oldFamily}" renommée en "${newFamily}" (${this.changes} produits déplacés)`]
              );
            } catch (e) { /* non-critical */ }
            resolve({ success: true, changes: this.changes });
          }
        });
      });
    } catch (error) {
      console.error('❌ Error moving products between families:', error);
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
            'SELECT id, name, description, icon FROM product_families ORDER BY name ASC',
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
    ipcMain.handle('add-family', async (event, name, description = null, icon = '') => {
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
              'INSERT OR IGNORE INTO product_families (name, description, icon) VALUES (?, ?, ?)',
              [trimmed, description, icon],
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
                      try {
                        db.run(
                          `INSERT INTO audit_logs (timestamp, user_id, user_name, action_type, entity_type, entity_id, new_value, notes)
                           VALUES (datetime('now','localtime'), 0, 'System', 'FAMILY_CREATE', 'family', ?, ?, ?)`,
                          [row.id, JSON.stringify({ name: trimmed }), `Famille "${trimmed}" créée`]
                        );
                      } catch (e) { /* non-critical */ }
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

      try {
        const db = getDatabase();
        if (db) {
          db.run(
            `INSERT INTO audit_logs (timestamp, user_id, user_name, action_type, entity_type, old_value, notes)
             VALUES (datetime('now','localtime'), 0, 'System', 'FAMILY_DELETE', 'family', ?, ?)`,
            [JSON.stringify({ name: name }), `Famille "${name}" supprimée`]
          );
        }
      } catch (e) { /* non-critical */ }

       return { success: true };
     } catch (error) {
       console.error('❌ Error deleting family:', error);
       throw error;
     }
    });

    // VAT Rates CRUD
    ipcMain.handle('get-vat-rates', async () => {
      try {
        const db = getDatabase();
        if (!db) throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
          db.all('SELECT * FROM vat_rates ORDER BY rate ASC', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });
      } catch (error) {
        console.error('❌ Error getting VAT rates:', error);
        throw error;
      }
    });

    ipcMain.handle('add-vat-rate', async (event, rate) => {
      try {
        const db = getDatabase();
        if (!db) throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
          db.run('INSERT INTO vat_rates (name, rate, is_active) VALUES (?, ?, ?)',
            [rate.name, rate.rate, rate.is_active !== false ? 1 : 0],
            function(err) {
              if (err) reject(err);
              else resolve({ id: this.lastID });
            }
          );
        });
      } catch (error) {
        console.error('❌ Error adding VAT rate:', error);
        throw error;
      }
    });

    ipcMain.handle('update-vat-rate', async (event, id, rate) => {
      try {
        const db = getDatabase();
        if (!db) throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
          db.run('UPDATE vat_rates SET name = ?, rate = ?, is_active = ? WHERE id = ?',
            [rate.name, rate.rate, rate.is_active ? 1 : 0, id],
            function(err) {
              if (err) reject(err);
              else resolve({ success: true });
            }
          );
        });
      } catch (error) {
        console.error('❌ Error updating VAT rate:', error);
        throw error;
      }
    });

    ipcMain.handle('delete-vat-rate', async (event, id) => {
      try {
        const db = getDatabase();
        if (!db) throw new Error('Database not initialized');

        // Referential integrity: check products using this VAT rate
        const count = await new Promise((resolve, reject) => {
          db.get('SELECT COUNT(*) as count FROM products WHERE vat_rate_id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row?.count || 0);
          });
        });

        if (count > 0) {
          throw new Error(`Impossible de supprimer ce taux de TVA: ${count} produit(s) l'utilise(nt). Modifiez d'abord les produits concernés.`);
        }

        return new Promise((resolve, reject) => {
          db.run('DELETE FROM vat_rates WHERE id = ?', [id], function(err) {
            if (err) reject(err);
            else resolve({ success: true });
          });
        });
      } catch (error) {
        console.error('❌ Error deleting VAT rate:', error.message);
        throw error;
      }
    });

    // ── Kitchen Department CRUD ──

    ipcMain.handle('get-kitchen-departments', async () => {
      try {
        const db = getDatabase();
        if (!db) throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
          db.all('SELECT * FROM kitchen_departments ORDER BY sort_order ASC, name ASC', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });
      } catch (error) {
        console.error('❌ Error fetching kitchen departments:', error);
        return [];
      }
    });

    ipcMain.handle('add-kitchen-department', async (event, dept) => {
      try {
        const db = getDatabase();
        if (!db) throw new Error('Database not initialized');
        const { name, icon, color } = dept;
        if (!name) throw new Error('Department name is required');
        return new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO kitchen_departments (name, icon, color) VALUES (?, ?, ?)',
            [name, icon || '', color || '#3B82F6'],
            function(err) {
              if (err) reject(err);
              else resolve({ id: this.lastID, name, icon: icon || '', color: color || '#3B82F6', is_active: 1 });
            }
          );
        });
      } catch (error) {
        console.error('❌ Error adding kitchen department:', error);
        throw error;
      }
    });

    ipcMain.handle('update-kitchen-department', async (event, id, dept) => {
      try {
        const db = getDatabase();
        if (!db) throw new Error('Database not initialized');
        const { name, icon, color, is_active, sort_order } = dept;
        return new Promise((resolve, reject) => {
          db.run(
            'UPDATE kitchen_departments SET name = ?, icon = ?, color = ?, is_active = ?, sort_order = ? WHERE id = ?',
            [name, icon || '', color || '#3B82F6', is_active ? 1 : 0, sort_order || 0, id],
            function(err) {
              if (err) reject(err);
              else resolve({ success: true });
            }
          );
        });
      } catch (error) {
        console.error('❌ Error updating kitchen department:', error);
        throw error;
      }
    });

    ipcMain.handle('delete-kitchen-department', async (event, id) => {
      try {
        const db = getDatabase();
        if (!db) throw new Error('Database not initialized');

        // Get the department name first
        const dept = await new Promise((resolve, reject) => {
          db.get('SELECT name FROM kitchen_departments WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (!dept) throw new Error('Département non trouvé');

        // Referential integrity: check products and kitchen orders using this department
        const checks = await new Promise((resolve, reject) => {
          db.all(
            `SELECT
              (SELECT COUNT(*) FROM products WHERE preparation_department = ?) as products,
              (SELECT COUNT(*) FROM kitchen_orders WHERE department = ?) as orders`,
            [dept.name, dept.name],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows?.[0] || {});
            }
          );
        });

        const deps = [];
        if (checks.products > 0) deps.push(`${checks.products} produit(s)`);
        if (checks.orders > 0) deps.push(`${checks.orders} commande(s) cuisine`);

        if (deps.length > 0) {
          throw new Error(`Impossible de supprimer ce département: ${deps.join(', ')} lié(s). Réaffectez ou supprimez d'abord les enregistrements dépendants.`);
        }

        return new Promise((resolve, reject) => {
          db.run('DELETE FROM kitchen_departments WHERE id = ?', [id], function(err) {
            if (err) reject(err);
            else resolve({ success: true });
          });
        });
      } catch (error) {
        console.error('❌ Error deleting kitchen department:', error.message);
        throw error;
      }
    });
    
    console.log('✅ Database IPC handlers registered');
 }

module.exports = { registerDatabaseHandlers };
