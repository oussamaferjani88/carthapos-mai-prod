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

      // Auto-close any previous open shift for the same user
      // This prevents multiple open shifts and ensures X Report always
      // sees the current working shift without ambiguity.
      db.run(
        `UPDATE shifts SET status = 'closed', closed_at = datetime('now')
         WHERE user_id = ? AND status = 'open'`,
        [data.user_id],
        function(closeErr) {
          if (closeErr) { reject(closeErr); return; }
          if (this.changes > 0) {
            console.log(`ℹ️ Auto-closed ${this.changes} previous open shift(s) for user #${data.user_id}`);
            db.get(
              `SELECT id, user_name FROM shifts WHERE user_id = ? AND status = 'closed' ORDER BY closed_at DESC LIMIT 1`,
              [data.user_id],
              (aErr, closedShift) => {
                if (!aErr && closedShift) {
                  try {
                    db.run(
                      `INSERT INTO audit_logs (timestamp, user_id, user_name, action_type, entity_type, entity_id, notes)
                       VALUES (datetime('now'), ?, ?, 'SHIFT_CLOSE', 'shift', ?, ?)`,
                      [data.user_id, closedShift.user_name || '', closedShift.id,
                       `Caisse automatiquement fermée pour l'ouverture d'une nouvelle caisse`]
                    );
                  } catch (e) { /* non-critical */ }
                }
              }
            );
          }

          db.run(
            `INSERT INTO shifts (user_id, user_name, opening_float, opened_at, status)
             VALUES (?, ?, ?, datetime('now'), 'open')`,
            [data.user_id, data.user_name || '', data.opening_float || 0],
            function(err) { if (err) { reject(err); } else {
              try {
                db.run(
                  `INSERT INTO audit_logs (timestamp, user_id, user_name, action_type, entity_type, entity_id, notes)
                   VALUES (datetime('now'), ?, ?, 'SHIFT_OPEN', 'shift', ?, ?)`,
                  [data.user_id, data.user_name || '', this.lastID, `Caisse ouverte avec un fonds de ${data.opening_float || 0} TND`]
                );
              } catch (e) { /* non-critical */ }
              try {
                db.run(
                  `INSERT INTO cash_drawer_events (user_id, user_name, action, amount_expected, notes)
                   VALUES (?, ?, 'shift_open', ?, ?)`,
                  [data.user_id, data.user_name || '', data.opening_float || 0,
                   `Ouverture de caisse #${this.lastID} — fonds: ${data.opening_float || 0} TND`]
                );
              } catch (e) { /* non-critical */ }
              resolve({ id: this.lastID });
            } }
          );
        }
      );
    });
  });

  ipcMainInstance.handle('caisse:close-shift', (event, data) => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      if (!db) return reject(new Error('Database not available'));
      const diff = (data.closing_actual || 0) - (data.closing_expected || 0);
      db.run(
        `UPDATE shifts SET closed_at = datetime('now'), status = 'closed',
         closing_expected = ?, closing_actual = ?, difference = ?,
         cash_sales = ?, card_sales = ?, other_sales = ?,
         note = ?, denomination_breakdown = ?
         WHERE id = ? AND status = 'open'`,
        [data.closing_expected || 0, data.closing_actual || 0, diff,
         data.cash_sales || 0, data.card_sales || 0, data.other_sales || 0,
         data.note || '', JSON.stringify(data.denominations || {}), data.shift_id],
        function(err) {
          if (err) { reject(err); return; }
          if (this.changes === 0) {
            resolve({ success: false, warning: 'Shift is already closed', difference: 0 });
            return;
          }
          try {
              db.get('SELECT user_id, user_name FROM shifts WHERE id = ?', [data.shift_id], (sErr, shift) => {
                if (!sErr && shift) {
                  db.run(
                    `INSERT INTO audit_logs (timestamp, user_id, user_name, action_type, entity_type, entity_id, new_value, notes)
                     VALUES (datetime('now'), ?, ?, 'SHIFT_CLOSE', 'shift', ?, ?, ?)`,
                    [shift.user_id, shift.user_name || '', data.shift_id,
                     JSON.stringify({ expected: data.closing_expected, actual: data.closing_actual, difference: diff }),
                     `Caisse fermée. Écart: ${diff >= 0 ? '+' : ''}${diff.toFixed(3)} TND`]
                  );
                  db.run(
                    `INSERT INTO cash_drawer_events (user_id, user_name, action, amount_expected, amount_actual, difference, notes)
                     VALUES (?, ?, 'shift_close', ?, ?, ?, ?)`,
                    [shift.user_id, shift.user_name || '',
                     data.closing_expected || 0, data.closing_actual || 0, diff,
                     `Fermeture de caisse #${data.shift_id} — écart: ${diff >= 0 ? '+' : ''}${diff.toFixed(3)} TND`]
                  );
                }
              });
            } catch (e) { /* non-critical */ }
            resolve({ success: true, difference: diff });
        }
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
