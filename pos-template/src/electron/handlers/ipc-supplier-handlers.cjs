/**
 * Supplier IPC Handlers
 * Handles supplier management operations
 */

const { ipcMain } = require('electron');

function registerSupplierHandlers(db) {
  console.log('🚚 Registering supplier IPC handlers...');

  ipcMain.handle('get-suppliers', () => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM suppliers ORDER BY name',
        [],
        (err, rows) => {
          if (err) {
            console.error('Error getting suppliers:', err);
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  });

  ipcMain.handle('add-supplier', (event, supplier) => {
    return new Promise((resolve, reject) => {
      const { name, contact, phone, email, address } = supplier;
      
      db.run(
        `INSERT INTO suppliers (name, contact, phone, email, address)
         VALUES (?, ?, ?, ?, ?)`,
        [name, contact || '', phone || '', email || '', address || ''],
        function(err) {
          if (err) {
            console.error('Error adding supplier:', err);
            reject(err);
          } else {
            console.log('✅ Supplier added successfully with ID:', this.lastID);
            resolve({ id: this.lastID });
          }
        }
      );
    });
  });

  ipcMain.handle('update-supplier', (event, id, supplier) => {
    return new Promise((resolve, reject) => {
      const { name, contact, phone, email, address } = supplier;
      
      db.run(
        `UPDATE suppliers 
         SET name = ?, contact = ?, phone = ?, email = ?, address = ?
         WHERE id = ?`,
        [name, contact || '', phone || '', email || '', address || '', id],
        function(err) {
          if (err) {
            console.error('Error updating supplier:', err);
            reject(err);
          } else {
            console.log('✅ Supplier updated successfully');
            resolve({ success: true });
          }
        }
      );
    });
  });

  ipcMain.handle('delete-supplier', (event, id) => {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM suppliers WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('Error deleting supplier:', err);
            reject(err);
          } else {
            console.log('✅ Supplier deleted successfully');
            resolve({ success: true });
          }
        }
      );
    });
  });
}

module.exports = { registerSupplierHandlers };
