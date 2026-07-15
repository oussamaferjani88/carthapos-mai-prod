const { ipcMain } = require('electron');

function registerStockHandlers(ipcMainInstance, databaseManager) {
  console.log(' Registering stock movement IPC handlers...');

  const getDb = () => databaseManager.getDatabase();

  ipcMainInstance.handle('stock:get-movements', (event, filters) => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      let sql = `SELECT sm.*, p.name as product_name, p.price as product_price
                 FROM stock_movements sm
                 LEFT JOIN products p ON p.id = sm.product_id
                 WHERE 1=1`;
      const params = [];
      if (filters?.product_id) { sql += ` AND sm.product_id = ?`; params.push(filters.product_id); }
      if (filters?.movement_type) { sql += ` AND sm.movement_type = ?`; params.push(filters.movement_type); }
      if (filters?.startDate) { sql += ` AND sm.created_at >= ?`; params.push(filters.startDate); }
      if (filters?.endDate) { sql += ` AND sm.created_at <= ?`; params.push(filters.endDate); }
      if (filters?.search) {
        sql += ` AND (sm.product_name LIKE ? OR sm.reference LIKE ? OR sm.reason LIKE ? OR sm.user_name LIKE ?)`;
        const s = `%${filters.search}%`;
        params.push(s, s, s, s);
      }
      sql += ` ORDER BY sm.created_at DESC LIMIT 200`;
      db.all(sql, params, (err, rows) => { if (err) { reject(err); } else { resolve(rows || []); } });
    });
  });

  ipcMainInstance.handle('stock:add-movement', (event, data) => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      db.run(
        `INSERT INTO stock_movements (product_id, product_name, movement_type, quantity, stock_before, stock_after, reason, reference, user_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.product_id, data.product_name || '', data.movement_type, data.quantity,
         data.stock_before || 0, data.stock_after || 0, data.reason || '', data.reference || '', data.user_name || ''],
        function(err) { if (err) { reject(err); } else { resolve({ id: this.lastID }); } }
      );
    });
  });

  ipcMainInstance.handle('stock:get-summary', () => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      db.get(
        `SELECT
          COUNT(*) as total_movements,
          COALESCE(SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END), 0) as total_in,
          COALESCE(SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END), 0) as total_out,
          COALESCE(SUM(CASE WHEN movement_type = 'adjustment' THEN quantity ELSE 0 END), 0) as total_adjustments
         FROM stock_movements WHERE created_at >= datetime('now', '-30 days')`,
        [],
        (err, row) => { if (err) { reject(err); } else { resolve(row || {}); } }
      );
    });
  });

  ipcMainInstance.handle('stock:get-product-movements', (event, productId, filters) => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      let sql = `SELECT * FROM stock_movements WHERE product_id = ?`;
      const params = [productId];
      if (filters?.movement_type) { sql += ` AND movement_type = ?`; params.push(filters.movement_type); }
      if (filters?.startDate) { sql += ` AND created_at >= ?`; params.push(filters.startDate); }
      if (filters?.endDate) { sql += ` AND created_at <= ?`; params.push(filters.endDate); }
      sql += ` ORDER BY created_at DESC LIMIT 100`;
      db.all(sql, params, (err, rows) => { if (err) { reject(err); } else { resolve(rows || []); } });
    });
  });

  ipcMainInstance.handle('stock:most-consumed', () => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      db.all(
        `SELECT p.id, p.name, p.category, p.unit, SUM(sm.quantity) as total_consumed,
                p.stock, p.min_stock, p.supplier
         FROM stock_movements sm
         JOIN products p ON p.id = sm.product_id
         WHERE sm.movement_type = 'out'
           AND sm.created_at >= datetime('now', '-90 days')
         GROUP BY p.id
         ORDER BY total_consumed DESC
         LIMIT 15`,
        [],
        (err, rows) => { if (err) { reject(err); } else { resolve(rows || []); } }
      );
    });
  });
}

module.exports = { registerStockHandlers };
