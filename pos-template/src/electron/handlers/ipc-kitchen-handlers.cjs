/**
 * Kitchen IPC Handlers
 * Handles kitchen order management for restaurants
 */

function registerKitchenHandlers(ipcMainInstance, databaseManager) {
  console.log('👨‍🍳 Registering kitchen IPC handlers...');

  const db = databaseManager.getDatabase();
  if (!db) { console.warn('⚠️ Database not available for kitchen handlers'); return; }

  // ── Get Kitchen Orders ─────────────────────────────────────────────
  ipcMainInstance.handle('get-kitchen-orders', async () => {
    const rows = await databaseManager.getData(
      `SELECT * FROM kitchen_orders ORDER BY
        CASE priority
          WHEN 'urgent' THEN 0
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END ASC,
        CASE status
          WHEN 'pending' THEN 0
          WHEN 'preparing' THEN 1
          WHEN 'ready' THEN 2
          WHEN 'served' THEN 3
          WHEN 'completed' THEN 4
          WHEN 'cancelled' THEN 5
          ELSE 6
        END ASC,
        created_at ASC`
    );
    return (rows || []).map(row => ({
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || [])
    }));
  });

  // ── Get Active Kitchen Orders (non-completed, non-cancelled) ───────
  ipcMainInstance.handle('get-active-kitchen-orders', async () => {
    const rows = await databaseManager.getData(
      `SELECT * FROM kitchen_orders
       WHERE status NOT IN ('completed', 'cancelled', 'served')
       ORDER BY
        CASE priority
          WHEN 'urgent' THEN 0
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END ASC,
        CASE
          WHEN status IN ('pending') THEN 0
          WHEN status IN ('preparing', 'in_progress') THEN 1
          WHEN status = 'ready' THEN 2
          ELSE 3
        END ASC,
        created_at ASC`
    );
    return (rows || []).map(row => ({
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || [])
    }));
  });

  // ── Get Kitchen Order By ID ────────────────────────────────────────
  ipcMainInstance.handle('get-kitchen-order', async (event, id) => {
    const row = await databaseManager.getRow(
      'SELECT * FROM kitchen_orders WHERE id = ?', [id]
    );
    if (!row) return null;
    return {
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || [])
    };
  });

  // ── Add Kitchen Order ──────────────────────────────────────────────
  ipcMainInstance.handle('add-kitchen-order', async (event, order) => {
    const { table_number, items, notes, priority, sale_id, total } = order;
    return databaseManager.runQuery(
      `INSERT INTO kitchen_orders (table_number, items, notes, priority, status, sale_id, total, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))`,
      [
        table_number || '',
        JSON.stringify(items || []),
        notes || '',
        priority || 'normal',
        sale_id || null,
        total || 0
      ]
    );
  });

  // ── Update Kitchen Order Status ────────────────────────────────────
  ipcMainInstance.handle('update-kitchen-order-status', async (event, id, newStatus) => {
    const validStatuses = ['pending', 'preparing', 'in_progress', 'ready', 'served', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    // Map legacy in_progress to preparing for internal consistency
    const normalizedStatus = newStatus === 'in_progress' ? 'preparing' : newStatus;

    const setClauses = ["updated_at = datetime('now')"];
    const params = [];

    if (normalizedStatus === 'preparing') {
      setClauses.push("started_at = COALESCE(started_at, datetime('now'))");
    }
    if (normalizedStatus === 'completed' || normalizedStatus === 'served' || normalizedStatus === 'cancelled') {
      setClauses.push("completed_at = COALESCE(completed_at, datetime('now'))");
    }

    setClauses.push('status = ?');
    params.push(normalizedStatus, id);

    return databaseManager.runQuery(
      `UPDATE kitchen_orders SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );
  });

  // ── Get Kitchen Order Stats ────────────────────────────────────────
  ipcMainInstance.handle('get-kitchen-order-stats', async () => {
    const stats = await databaseManager.getRow(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status IN ('preparing','in_progress') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN status = 'served' THEN 1 ELSE 0 END) as served,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM kitchen_orders`
    );
    return stats || { total: 0, pending: 0, in_progress: 0, ready: 0, served: 0, completed: 0, cancelled: 0 };
  });
}

module.exports = { registerKitchenHandlers };
