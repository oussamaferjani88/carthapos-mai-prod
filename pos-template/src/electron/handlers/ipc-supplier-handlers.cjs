/**
 * Supplier IPC Handlers
 * Handles supplier management operations
 */

const { ipcMain } = require('electron');

function registerSupplierHandlers(ipcMainInstance, databaseManager) {
  console.log('🚚 Registering supplier IPC handlers...');

  const db = databaseManager.getDatabase();
  if (!db) { console.warn('⚠️ Database not available for supplier handlers'); return; }

  ipcMainInstance.handle('get-suppliers', () => {
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

  ipcMainInstance.handle('add-supplier', (event, supplier) => {
    return new Promise((resolve, reject) => {
      const { name, contact_person, contact, phone, email, address, notes } = supplier;
      
      db.run(
        `INSERT INTO suppliers (name, contact, phone, email, address, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, contact_person || contact || '', phone || '', email || '', address || '', notes || ''],
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

  ipcMainInstance.handle('update-supplier', (event, id, supplier) => {
    return new Promise((resolve, reject) => {
      const { name, contact_person, contact, phone, email, address, notes } = supplier;
      
      db.run(
        `UPDATE suppliers 
         SET name = ?, contact = ?, phone = ?, email = ?, address = ?, notes = ?
         WHERE id = ?`,
        [name, contact_person || contact || '', phone || '', email || '', address || '', notes || '', id],
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

  ipcMainInstance.handle('delete-supplier', (event, id) => {
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

  ipcMainInstance.handle('update-supplier-status', (event, id, isActive) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE suppliers SET is_active = ? WHERE id = ?',
        [isActive ? 1 : 0, id],
        function(err) {
          if (err) {
            console.error('Error updating supplier status:', err);
            reject(err);
          } else {
            console.log('✅ Supplier status updated');
            resolve({ success: true });
          }
        }
      );
    });
  });
}

module.exports = { registerSupplierHandlers };
