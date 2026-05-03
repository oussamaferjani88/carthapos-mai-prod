/**
 * Kitchen IPC Handlers
 * Handles kitchen order management for restaurants
 */

const { ipcMain } = require('electron');

function registerKitchenHandlers(db) {
  console.log('👨‍🍳 Registering kitchen IPC handlers...');

  ipcMain.handle('get-kitchen-orders', () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM kitchen_orders 
         WHERE status != 'completed' 
         ORDER BY created_at ASC`,
        [],
        (err, rows) => {
          if (err) {
            console.error('Error getting kitchen orders:', err);
            reject(err);
          } else {
            const orders = (rows || []).map(row => ({
              ...row,
              items: row.items ? JSON.parse(row.items) : []
            }));
            resolve(orders);
          }
        }
      );
    });
  });

  ipcMain.handle('add-kitchen-order', (event, order) => {
    return new Promise((resolve, reject) => {
      const { tableNumber, items, notes, priority } = order;
      
      db.run(
        `INSERT INTO kitchen_orders (table_number, items, notes, priority, status, created_at)
         VALUES (?, ?, ?, ?, 'pending', ?)`,
        [
          tableNumber,
          JSON.stringify(items),
          notes || '',
          priority || 'normal',
          new Date().toISOString()
        ],
        function(err) {
          if (err) {
            console.error('Error adding kitchen order:', err);
            reject(err);
          } else {
            console.log('✅ Kitchen order added successfully with ID:', this.lastID);
            resolve({ id: this.lastID });
          }
        }
      );
    });
  });

  ipcMain.handle('update-kitchen-order-status', (event, id, status) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE kitchen_orders SET status = ?, updated_at = ? WHERE id = ?',
        [status, new Date().toISOString(), id],
        function(err) {
          if (err) {
            console.error('Error updating kitchen order status:', err);
            reject(err);
          } else {
            console.log('✅ Kitchen order status updated');
            resolve({ success: true });
          }
        }
      );
    });
  });
}

module.exports = { registerKitchenHandlers };
