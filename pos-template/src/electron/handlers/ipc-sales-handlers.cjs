/**
 * Sales IPC Handlers
 * Handles sales transactions and reporting
 */

const { ipcMain } = require('electron');

function registerSalesHandlers(ipcMainInstance, databaseManager) {
  console.log('💰 Registering sales IPC handlers...');
  
  // Get the database instance
  const db = databaseManager.getDatabase();
  if (!db) {
    console.warn('⚠️ Database not available for sales handlers');
    return;
  }

  ipcMain.handle('get-sales', () => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM sales ORDER BY created_at DESC',
        [],
        (err, rows) => {
          if (err) {
            console.error('Error getting sales:', err);
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  });

  ipcMain.handle('add-sale', (event, sale) => {
    return new Promise((resolve, reject) => {
      const { items, total, tax, discount, payment_method, customer_id } = sale;
      
      db.run(
        `INSERT INTO sales (total, tax, discount, payment_method, customer_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          total,
          tax || 0,
          discount || 0,
          payment_method || 'cash',
          customer_id || null
        ],
        function(err) {
          if (err) {
            console.error('Error adding sale:', err);
            reject(err);
          } else {
            const saleId = this.lastID;
            console.log('✅ Sale added successfully with ID:', saleId);
            
            // Insert sale items
            if (items && items.length > 0) {
              try {
                items.forEach(item => {
                  db.run(
                    `INSERT INTO sale_items (sale_id, product_id, quantity, price)
                     VALUES (?, ?, ?, ?)`,
                    [saleId, item.id, item.quantity, item.price],
                    (err) => {
                      if (err) console.error('Error inserting sale item:', err);
                    }
                  );
                });
              } catch (itemErr) {
                console.error('Error inserting sale items:', itemErr);
              }
            }
            
            // Update inventory
            if (items && items.length > 0) {
              try {
                items.forEach(item => {
                  db.run(
                    'UPDATE products SET stock = stock - ? WHERE id = ?',
                    [item.quantity, item.id],
                    (err) => {
                      if (err) {
                        console.error(`Error updating stock for product ${item.id}:`, err);
                      }
                    }
                  );
                });
              } catch (stockErr) {
                console.error('Error updating inventory:', stockErr);
              }
            }
            
            resolve({ id: saleId });
          }
        }
      );
    });
  });

  ipcMain.handle('get-sale-details', (event, id) => {
    return new Promise((resolve, reject) => {
      const saleItemsQuery = `
        SELECT si.*, p.name as product_name
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `;
      
      db.get(
        `SELECT 
          s.*,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone
         FROM sales s
         LEFT JOIN customers c ON s.customer_id = c.id
         WHERE s.id = ?`,
        [id],
        (err, row) => {
          if (err) {
            console.error('Error getting sale details:', err);
            reject(err);
          } else if (!row) {
            resolve(null);
          } else {
            db.all(saleItemsQuery, [id], (itemsErr, items) => {
              if (itemsErr) {
                console.error('Error getting sale items:', itemsErr);
                row.items = [];
              } else {
                row.items = items || [];
              }
              resolve(row);
            });
          }
        }
      );
    });
  });
}

module.exports = { registerSalesHandlers };
