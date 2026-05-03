/**
 * Sales IPC Handlers
 * Handles sales transactions and reporting
 */

const { ipcMain } = require('electron');

function registerSalesHandlers(db) {
  console.log('💰 Registering sales IPC handlers...');

  ipcMain.handle('get-sales', () => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM sales ORDER BY date DESC',
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
      const { items, total, paymentMethod, customerId } = sale;
      
      db.run(
        `INSERT INTO sales (date, items, total, payment_method, customer_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          new Date().toISOString(),
          JSON.stringify(items),
          total,
          paymentMethod || 'cash',
          customerId || null
        ],
        function(err) {
          if (err) {
            console.error('Error adding sale:', err);
            reject(err);
          } else {
            console.log('✅ Sale added successfully with ID:', this.lastID);
            
            // Update inventory
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
            
            resolve({ id: this.lastID });
          }
        }
      );
    });
  });

  ipcMain.handle('get-sale-details', (event, id) => {
    return new Promise((resolve, reject) => {
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
          } else {
            if (row && row.items) {
              try {
                row.items = JSON.parse(row.items);
              } catch (parseErr) {
                console.error('Error parsing items:', parseErr);
              }
            }
            resolve(row || null);
          }
        }
      );
    });
  });
}

module.exports = { registerSalesHandlers };
