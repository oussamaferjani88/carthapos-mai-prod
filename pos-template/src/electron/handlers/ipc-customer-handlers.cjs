/**
 * Customer IPC Handlers
 * Handles customer management operations
 */

const { ipcMain } = require('electron');

function registerCustomerHandlers(db) {
  console.log('👥 Registering customer IPC handlers...');

  ipcMain.handle('get-customers', () => {
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

  ipcMain.handle('add-customer', (event, customer) => {
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

  ipcMain.handle('update-customer', (event, id, customer) => {
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

  ipcMain.handle('delete-customer', (event, id) => {
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
