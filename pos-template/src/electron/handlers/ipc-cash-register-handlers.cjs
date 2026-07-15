const { ipcMain } = require('electron');

function registerCaisseHandlers(ipcMainInstance, databaseManager) {
  console.log(' Registering cash register (caisse) IPC handlers...');

  const getDb = () => databaseManager.getDatabase();

  ipcMainInstance.handle('caisse:get-active-shift', () => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      db.get(
        `SELECT s.*, u.full_name as user_name FROM shifts s
         LEFT JOIN users u ON u.id = s.user_id
         WHERE s.status = 'open' ORDER BY s.opened_at DESC LIMIT 1`,
        [],
        (err, row) => { if (err) { reject(err); } else { resolve(row || null); } }
      );
    });
  });

  ipcMainInstance.handle('caisse:open-shift', (event, data) => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      db.run(
        `INSERT INTO shifts (user_id, user_name, opening_float, opened_at, status)
         VALUES (?, ?, ?, datetime('now','localtime'), 'open')`,
        [data.user_id, data.user_name || '', data.opening_float || 0],
        function(err) { if (err) { reject(err); } else { resolve({ id: this.lastID }); } }
      );
    });
  });

  ipcMainInstance.handle('caisse:close-shift', (event, data) => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      const diff = (data.closing_actual || 0) - (data.closing_expected || 0);
      db.run(
        `UPDATE shifts SET closed_at = datetime('now','localtime'), status = 'closed',
         closing_expected = ?, closing_actual = ?, difference = ?,
         cash_sales = ?, card_sales = ?, other_sales = ?,
         note = ?, denomination_breakdown = ?
         WHERE id = ? AND status = 'open'`,
        [data.closing_expected || 0, data.closing_actual || 0, diff,
         data.cash_sales || 0, data.card_sales || 0, data.other_sales || 0,
         data.note || '', JSON.stringify(data.denominations || {}), data.shift_id],
        function(err) { if (err) { reject(err); } else { resolve({ success: true, difference: diff }); } }
      );
    });
  });

  ipcMainInstance.handle('caisse:get-shift-history', (event, filters) => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      let sql = `SELECT s.*, u.full_name as user_name FROM shifts s
                 LEFT JOIN users u ON u.id = s.user_id
                 WHERE s.status = 'closed'`;
      const params = [];
      if (filters?.startDate) { sql += ` AND s.opened_at >= ?`; params.push(filters.startDate); }
      if (filters?.endDate) { sql += ` AND s.opened_at <= ?`; params.push(filters.endDate); }
      if (filters?.userId) { sql += ` AND s.user_id = ?`; params.push(filters.userId); }
      sql += ` ORDER BY s.opened_at DESC LIMIT 100`;
      db.all(sql, params, (err, rows) => { if (err) { reject(err); } else { resolve(rows || []); } });
    });
  });

  ipcMainInstance.handle('caisse:get-shift-detail', (event, shiftId) => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      db.get(
        `SELECT s.*, u.full_name as user_name FROM shifts s
         LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
        [shiftId],
        (err, row) => { if (err) { reject(err); } else { resolve(row || null); } }
      );
    });
  });

  ipcMainInstance.handle('caisse:get-sales-totals-for-shift', (event, data) => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      const isShift = data.shift_id ? true : false;
      let sql = `SELECT
        COALESCE(SUM(CASE WHEN payment_method IN ('cash','espèces','especes') THEN total ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_method IN ('card','carte') THEN total ELSE 0 END), 0) as card_total,
        COALESCE(SUM(CASE WHEN payment_method NOT IN ('cash','espèces','especes','card','carte') THEN total ELSE 0 END), 0) as other_total,
        COUNT(*) as sale_count
        FROM sales WHERE 1=1`;
      const params = [];
      if (isShift) {
        sql += ` AND shift_id = ?`;
        params.push(data.shift_id);
        db.get(sql, params, (err, row) => { if (err) { reject(err); } else { resolve(row || { cash_total: 0, card_total: 0, other_total: 0, sale_count: 0 }); } });
      } else {
        if (data.startDate && data.endDate) {
          sql += ` AND created_at >= ? AND created_at <= ?`;
          params.push(data.startDate, data.endDate);
        }
        db.get(sql, params, (err, row) => { if (err) { reject(err); } else { resolve(row || { cash_total: 0, card_total: 0, other_total: 0, sale_count: 0 }); } });
      }
    });
  });
}

module.exports = { registerCaisseHandlers };
