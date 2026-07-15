/**
 * Customer IPC Handlers
 * Handles customer management operations
 */

const { ipcMain } = require('electron');

function registerCustomerHandlers(ipcMainInstance, databaseManager) {
  console.log('👥 Registering customer IPC handlers...');
  const db = databaseManager.getDatabase();
  if (!db) { console.warn('⚠️ Database not available for customer handlers'); return; }

  ipcMainInstance.handle('get-customers', () => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM customers ORDER BY name',
        [],
        (err, rows) => {
          if (err) {
            console.error('Error getting customers:', err);
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  });

  ipcMainInstance.handle('add-customer', (event, customer) => {
    return new Promise((resolve, reject) => {
      const { name, email, phone, address } = customer;
      
      db.run(
        `INSERT INTO customers (name, email, phone, address)
         VALUES (?, ?, ?, ?)`,
        [name, email || null, phone || null, address || null],
        function(err) {
          if (err) {
            console.error('Error adding customer:', err);
            reject(err);
          } else {
            console.log('✅ Customer added successfully with ID:', this.lastID);
            resolve({ id: this.lastID });
          }
        }
      );
    });
  });

  ipcMainInstance.handle('update-customer', (event, id, customer) => {
    return new Promise((resolve, reject) => {
      const { name, email, phone, address } = customer;
      
      db.run(
        `UPDATE customers 
         SET name = ?, email = ?, phone = ?, address = ?
         WHERE id = ?`,
        [name, email || null, phone || null, address || null, id],
        function(err) {
          if (err) {
            console.error('Error updating customer:', err);
            reject(err);
          } else {
            console.log('✅ Customer updated successfully');
            resolve({ success: true });
          }
        }
      );
    });
  });

  ipcMainInstance.handle('get-customer-purchases', (event, customerId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT s.id, s.total, s.tax, s.discount, s.payment_method, s.created_at,
                s.user_id, u.full_name as cashier_name,
                (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count
         FROM sales s
         LEFT JOIN users u ON u.id = s.user_id
         WHERE s.customer_id = ?
         ORDER BY s.created_at DESC LIMIT 50`,
        [customerId],
        (err, rows) => {
          if (err) { console.error('Error getting customer purchases:', err); reject(err); }
          else { resolve(rows || []); }
        }
      );
    });
  });

  ipcMainInstance.handle('get-customer-stats', (event, customerId) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as visit_count, COALESCE(SUM(total), 0) as total_spent,
                COALESCE(AVG(total), 0) as average_ticket,
                COALESCE(SUM(discount), 0) as total_discounts
         FROM sales WHERE customer_id = ?`,
        [customerId],
        (err, row) => {
          if (err) { console.error('Error getting customer stats:', err); reject(err); }
          else { resolve(row || { visit_count: 0, total_spent: 0, average_ticket: 0, total_discounts: 0 }); }
        }
      );
    });
  });

  ipcMainInstance.handle('get-customer-favorite-products', (event, customerId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT p.id, p.name, p.price, SUM(si.quantity) as total_qty, COUNT(DISTINCT si.sale_id) as times_bought
         FROM sale_items si
         JOIN products p ON p.id = si.product_id
         JOIN sales s ON s.id = si.sale_id
         WHERE s.customer_id = ?
         GROUP BY p.id, p.name, p.price
         ORDER BY total_qty DESC LIMIT 10`,
        [customerId],
        (err, rows) => {
          if (err) { console.error('Error getting favorite products:', err); reject(err); }
          else { resolve(rows || []); }
        }
      );
    });
  });

  ipcMainInstance.handle('delete-customer', (event, id) => {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM customers WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('Error deleting customer:', err);
            reject(err);
          } else {
            console.log('✅ Customer deleted successfully');
            resolve({ success: true });
          }
        }
      );
    });
  });
}

module.exports = { registerCustomerHandlers };
