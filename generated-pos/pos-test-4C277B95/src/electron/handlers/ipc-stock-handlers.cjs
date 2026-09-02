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
        `SELECT p.id, p.name, p.family, p.category, p.unit, p.supplier, p.cost_price, p.price,
                SUM(sm.quantity) as total_consumed,
                p.stock, p.min_stock
         FROM stock_movements sm
         JOIN products p ON p.id = sm.product_id
         WHERE sm.movement_type IN ('out', 'sale', 'waste')
           AND sm.created_at >= datetime('now', '-90 days')
         GROUP BY p.id
         ORDER BY total_consumed DESC
         LIMIT 50`,
        [],
        (err, rows) => { if (err) { reject(err); } else { resolve(rows || []); } }
      );
    });
  });

  ipcMainInstance.handle('stock:least-consumed', () => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      db.all(
        `SELECT p.id, p.name, p.family, p.category, p.unit, p.supplier, p.cost_price, p.price,
                COALESCE(SUM(sm.quantity), 0) as total_consumed,
                p.stock, p.min_stock
         FROM products p
         LEFT JOIN stock_movements sm ON p.id = sm.product_id
           AND sm.movement_type IN ('out', 'sale', 'waste')
           AND sm.created_at >= datetime('now', '-90 days')
         GROUP BY p.id
         ORDER BY total_consumed ASC
         LIMIT 50`,
        [],
        (err, rows) => { if (err) { reject(err); } else { resolve(rows || []); } }
      );
    });
  });

  ipcMainInstance.handle('stock:never-sold', () => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      db.all(
        `SELECT p.id, p.name, p.family, p.category, p.unit, p.stock, p.price, p.cost_price, p.supplier
         FROM products p
         WHERE p.id NOT IN (
           SELECT DISTINCT si.product_id FROM sale_items si
         )
         ORDER BY p.name ASC`,
        [],
        (err, rows) => { if (err) { reject(err); } else { resolve(rows || []); } }
      );
    });
  });

  ipcMainInstance.handle('stock:adjust', (event, data) => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      if (!data || !data.product_id) return reject(new Error('product_id required'));
      if (typeof data.new_stock !== 'number' || data.new_stock < 0) {
        return reject(new Error('new_stock must be a non-negative number'));
      }
      db.get('SELECT stock, name FROM products WHERE id = ?', [data.product_id], (err, product) => {
        if (err) return reject(err);
        if (!product) return reject(new Error('Product not found'));
        const stockBefore = product.stock || 0;
        const newStock = Math.max(0, Math.round(data.new_stock));
        if (newStock === stockBefore) return resolve({ id: null, noChange: true });
        const diff = newStock - stockBefore;
        let movementType = data.movement_type || 'adjustment';
        if (diff > 0 && movementType === 'adjustment') movementType = 'in';
        if (diff < 0 && movementType === 'adjustment') movementType = 'out';
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          db.run('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStock, data.product_id]);
          db.run(
            `INSERT INTO stock_movements (product_id, product_name, movement_type, quantity, stock_before, stock_after, reason, reference, user_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.product_id, product.name, movementType, Math.abs(diff), stockBefore, newStock,
             data.reason || '', data.reference || '', data.user_name || ''],
            function(movErr) {
              if (movErr) { db.run('ROLLBACK'); return reject(movErr); }
              db.run('COMMIT', (commitErr) => {
                if (commitErr) return reject(commitErr);
                resolve({ id: this.lastID, stock_before: stockBefore, stock_after: newStock, movement_type: movementType });
              });
            }
          );
        });
      });
    });
  });

  ipcMainInstance.handle('stock:alerts', () => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      db.all(
        `SELECT
           (SELECT COUNT(*) FROM products WHERE stock = 0) as out_of_stock,
           (SELECT COUNT(*) FROM products WHERE min_stock > 0 AND stock > 0 AND stock <= min_stock) as low_stock,
           (SELECT COUNT(*) FROM products WHERE stock < 0) as negative_stock,
           (SELECT COUNT(*) FROM products WHERE supplier = '' OR supplier IS NULL) as no_supplier,
           (SELECT COUNT(*) FROM products WHERE barcode = '' OR barcode IS NULL) as no_barcode,
           (SELECT COUNT(*) FROM products WHERE family = '' OR family IS NULL) as no_family,
           (SELECT COUNT(*) FROM products WHERE cost_price = 0 OR cost_price IS NULL) as no_cost,
           (SELECT COUNT(*) FROM products WHERE price < cost_price AND cost_price > 0) as below_cost`,
        [],
        (err, row) => { if (err) { reject(err); } else { resolve(row?.[0] || {}); } }
      );
    });
  });

  ipcMainInstance.handle('stock:inventory-value', () => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      db.all(
        `SELECT p.id, p.name, p.family, p.stock, p.cost_price, p.price,
                (p.cost_price * p.stock) as cost_value,
                (p.price * p.stock) as retail_value
         FROM products p
         WHERE p.stock > 0
         ORDER BY cost_value DESC`,
        [],
        (err, rows) => { if (err) { reject(err); } else { resolve(rows || []); } }
      );
    });
  });
}

module.exports = { registerStockHandlers };
