/**
 * Kitchen IPC Handlers — Professional KDS v3
 *
 * Architecture:
 *  - Full lifecycle timeline: created_at → started_at → ready_at → served_at → completed_at
 *  - Smart priority engine: auto-promotes based on waiting time
 *  - SLA monitoring per department
 *  - Department performance analytics
 *  - Employee performance tracking
 *  - Queue position tracking
 *  - Bidirectional sync with sales.kitchen_status
 *  - Idempotent order creation (sale_id+department)
 *  - Server-side total calculation
 */

const { activeSessions } = require('./ipc-session-store.cjs');

const VALID_STATUSES = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const STATUS_TRANSITIONS = {
  pending:   ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready:     ['served'],
  served:    ['completed'],
  completed: [],
  cancelled: [],
};

const STATUS_TO_SALES_KITCHEN = {
  pending:   'order_received',
  preparing: 'preparing',
  ready:     'ready',
  served:    'served',
  completed: 'completed',
  cancelled: 'cancelled',
};

const AUTH_ROLES = ['admin', 'manager', 'cashier', 'server'];

const SLA_THRESHOLDS = { normal: 10, high: 20, urgent: 30 };

function getCurrentUser(event) {
  try {
    const wcId = event?.sender?.id;
    if (!wcId) return null;
    return activeSessions.get(wcId)?.userData || null;
  } catch { return null; }
}

function requireAuth(event, { throwOnFail = true } = {}) {
  const user = getCurrentUser(event);
  if (!user || !AUTH_ROLES.includes(user.role)) {
    if (throwOnFail) throw new Error('Accès refusé. Connectez-vous pour continuer.');
    return null;
  }
  return user;
}

function safeJsonParse(str, fallback = []) {
  if (!str) return fallback;
  if (Array.isArray(str)) return str;
  if (typeof str !== 'string') return fallback;
  try { const p = JSON.parse(str); return Array.isArray(p) ? p : fallback; }
  catch { return fallback; }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function computeTimeline(row) {
  const now = Date.now();
  const created = row.created_at ? new Date(row.created_at).getTime() : now;
  const started = row.started_at ? new Date(row.started_at).getTime() : null;
  const ready = row.ready_at ? new Date(row.ready_at).getTime() : null;
  const served = row.served_at ? new Date(row.served_at).getTime() : null;
  const completed = row.completed_at ? new Date(row.completed_at).getTime() : null;

  const waitingTime = started ? Math.max(0, Math.floor((started - created) / 60000)) : Math.max(0, Math.floor((now - created) / 60000));
  const prepTime = ready && started ? Math.max(0, Math.floor((ready - started) / 60000)) : (row.status === 'preparing' ? Math.max(0, Math.floor((now - started) / 60000)) : 0);
  const serviceTime = served && ready ? Math.max(0, Math.floor((served - ready) / 60000)) : 0;
  const totalTime = completed ? Math.max(0, Math.floor((completed - created) / 60000)) : Math.max(0, Math.floor((now - created) / 60000));

  const elapsed = Math.max(0, Math.floor((now - (started || created)) / 60000));
  const delay = row.estimated_minutes && elapsed > row.estimated_minutes ? elapsed - row.estimated_minutes : 0;

  return {
    waiting_time: waitingTime,
    preparation_time: prepTime,
    service_time: serviceTime,
    total_time: totalTime,
    elapsed,
    delay,
    _elapsed: formatElapsed(row.created_at, row.started_at),
  };
}

function formatElapsed(created_at, started_at) {
  if (!created_at) return { minutes: 0, text: '—' };
  const now = Date.now();
  const ref = started_at ? new Date(started_at).getTime() : new Date(created_at).getTime();
  const mins = Math.max(0, Math.floor((now - ref) / 60000));
  if (mins < 1) return { minutes: 0, text: '<1 min' };
  if (mins < 60) return { minutes: mins, text: `${mins} min` };
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { minutes: mins, text: m > 0 ? `${h}h${m}min` : `${h}h` };
}

function computeSmartPriority(created_at, started_at, currentPriority) {
  const ref = started_at || created_at;
  if (!ref) return currentPriority;
  const mins = Math.max(0, Math.floor((Date.now() - new Date(ref).getTime()) / 60000));
  if (mins >= SLA_THRESHOLDS.urgent && currentPriority !== 'urgent') return 'urgent';
  if (mins >= SLA_THRESHOLDS.high && currentPriority === 'normal') return 'high';
  return currentPriority;
}

function validateOrderPayload(order) {
  const errors = [];
  if (!order || typeof order !== 'object') return ['Order must be a non-null object'];
  if (!Array.isArray(order.items) || order.items.length === 0) {
    errors.push('items must be a non-empty array');
  } else {
    order.items.forEach((item, i) => {
      if (!item || typeof item !== 'object') errors.push(`items[${i}] must be an object`);
      if (!item.name && !item.product_name) errors.push(`items[${i}] must have a name`);
      if (item.quantity !== undefined && (typeof item.quantity !== 'number' || item.quantity < 1)) errors.push(`items[${i}].quantity must be a positive number`);
    });
  }
  if (order.priority && !VALID_PRIORITIES.includes(order.priority)) errors.push(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  return errors;
}

let getWindow = () => null;

function broadcastKitchenEvent(channel, payload) {
  try {
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  } catch (e) { console.error('[Kitchen] Broadcast error:', e.message); }
}

async function syncSaleKitchenStatus(databaseManager, saleId, kitchenStatus) {
  if (!saleId) return;
  try {
    const salesKitchenStatus = STATUS_TO_SALES_KITCHEN[kitchenStatus] || null;
    if (!salesKitchenStatus) return;
    await databaseManager.runQuery("UPDATE sales SET kitchen_status = ?, updated_at = datetime('now') WHERE id = ?", [salesKitchenStatus, saleId]);
  } catch (e) {
    console.error(`[Kitchen] Failed to sync sale #${saleId} kitchen_status:`, e.message);
  }
}

function registerKitchenHandlers(ipcMainInstance, databaseManager, getMainWindow) {
  console.log('[Kitchen] Registering kitchen IPC handlers v3...');
  getWindow = typeof getMainWindow === 'function' ? getMainWindow : () => null;
  const db = databaseManager.getDatabase();
  if (!db) { console.warn('[Kitchen] Database not available'); return; }

  // ── Get All Kitchen Orders ──────────────────────────────────────────
  ipcMainInstance.handle('get-kitchen-orders', async (event) => {
    const user = requireAuth(event, { throwOnFail: false });
    if (!user) return [];
    const rows = await databaseManager.getData(
      `SELECT * FROM kitchen_orders ORDER BY
        CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 ELSE 4 END ASC,
        CASE status WHEN 'pending' THEN 0 WHEN 'preparing' THEN 1 WHEN 'ready' THEN 2 WHEN 'served' THEN 3 WHEN 'completed' THEN 4 WHEN 'cancelled' THEN 5 ELSE 6 END ASC,
        created_at ASC`
    );
    return (rows || []).map(row => ({ ...row, items: safeJsonParse(row.items), ...computeTimeline(row) }));
  });

  // ── Get Active Kitchen Orders ───────────────────────────────────────
  ipcMainInstance.handle('get-active-kitchen-orders', async (event) => {
    const user = requireAuth(event, { throwOnFail: false });
    if (!user) return [];
    const rows = await databaseManager.getData(
      `SELECT * FROM kitchen_orders WHERE status IN ('pending', 'preparing', 'ready') ORDER BY
        CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 ELSE 4 END ASC,
        CASE status WHEN 'pending' THEN 0 WHEN 'preparing' THEN 1 WHEN 'ready' THEN 2 ELSE 3 END ASC,
        created_at ASC`
    );
    return (rows || []).map(row => ({ ...row, items: safeJsonParse(row.items), ...computeTimeline(row) }));
  });

  // ── Get Kitchen Order By ID ────────────────────────────────────────
  ipcMainInstance.handle('get-kitchen-order', async (event, id) => {
    requireAuth(event);
    if (!id) throw new Error('Order ID is required');
    const row = await databaseManager.getRow('SELECT * FROM kitchen_orders WHERE id = ?', [id]);
    if (!row) return null;
    return { ...row, items: safeJsonParse(row.items), ...computeTimeline(row) };
  });

  // ── Add Kitchen Order (manual creation) ────────────────────────────
  ipcMainInstance.handle('add-kitchen-order', async (event, order) => {
    const user = requireAuth(event);
    const errors = validateOrderPayload(order);
    if (errors.length > 0) throw new Error(`Validation failed: ${errors.join('; ')}`);
    return await createKitchenOrder(databaseManager, {
      table_number: String(order.table_number || '').trim(),
      items: order.items,
      notes: String(order.notes || '').trim(),
      priority: VALID_PRIORITIES.includes(order.priority) ? order.priority : 'normal',
      sale_id: order.sale_id || null,
      total: typeof order.total === 'number' ? order.total : 0,
      server_name: order.server_name || user.full_name || user.username || '',
      customer_name: order.customer_name || '',
      department: order.department || 'kitchen',
      estimated_minutes: order.estimated_minutes || null,
    });
  });

  // ── Update Kitchen Order Status ────────────────────────────────────
  ipcMainInstance.handle('update-kitchen-order-status', async (event, id, newStatus) => {
    const user = requireAuth(event);
    if (!id) throw new Error('Order ID is required');
    if (!VALID_STATUSES.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}`);

    const row = await databaseManager.getRow('SELECT * FROM kitchen_orders WHERE id = ?', [id]);
    if (!row) throw new Error(`Kitchen order #${id} not found`);
    if (row.status === newStatus) return { success: true, unchanged: true };

    const allowed = STATUS_TRANSITIONS[row.status] || [];
    if (!allowed.includes(newStatus)) throw new Error(`Transition '${row.status}' → '${newStatus}' not allowed. Allowed: ${allowed.join(', ') || 'none'}`);

    const setClauses = ["updated_at = datetime('now')"];
    const params = [];

    if (newStatus === 'preparing') setClauses.push("started_at = COALESCE(started_at, datetime('now'))");
    if (newStatus === 'ready') setClauses.push("ready_at = COALESCE(ready_at, datetime('now'))");
    if (newStatus === 'served') setClauses.push("served_at = COALESCE(served_at, datetime('now'))");
    if (['completed', 'cancelled'].includes(newStatus)) setClauses.push("completed_at = COALESCE(completed_at, datetime('now'))");

    // Smart priority auto-promote on transition
    const smartPrio = computeSmartPriority(row.created_at, row.started_at || (newStatus === 'preparing' ? new Date().toISOString() : row.created_at), row.priority);
    if (smartPrio !== row.priority) {
      setClauses.push('priority = ?');
      params.push(smartPrio);
    }

    setClauses.push('status = ?');
    params.push(newStatus, id);

    await databaseManager.runQuery(`UPDATE kitchen_orders SET ${setClauses.join(', ')} WHERE id = ?`, params);
    await syncSaleKitchenStatus(databaseManager, row.sale_id, newStatus);

    const updated = await databaseManager.getRow('SELECT * FROM kitchen_orders WHERE id = ?', [id]);
    const payload = updated ? { ...updated, items: safeJsonParse(updated.items), ...computeTimeline(updated) } : { id, status: newStatus };

    broadcastKitchenEvent('kitchen:order-updated', payload);
    return { success: true, order: payload };
  });

  // ── Batch Update Status ────────────────────────────────────────────
  ipcMainInstance.handle('kitchen:batch-status', async (event, ids, newStatus) => {
    const user = requireAuth(event);
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('ids must be non-empty');
    if (!VALID_STATUSES.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}`);

    const results = [];
    for (const id of ids) {
      try {
        const row = await databaseManager.getRow('SELECT * FROM kitchen_orders WHERE id = ?', [id]);
        if (!row) { results.push({ id, success: false, error: 'Not found' }); continue; }
        const allowed = STATUS_TRANSITIONS[row.status] || [];
        if (!allowed.includes(newStatus)) { results.push({ id, success: false, error: `Transition ${row.status}→${newStatus} not allowed` }); continue; }

        const setClauses = ["updated_at = datetime('now')"];
        const params = [];
        if (newStatus === 'preparing') setClauses.push("started_at = COALESCE(started_at, datetime('now'))");
        if (newStatus === 'ready') setClauses.push("ready_at = COALESCE(ready_at, datetime('now'))");
        if (newStatus === 'served') setClauses.push("served_at = COALESCE(served_at, datetime('now'))");
        if (['completed', 'cancelled'].includes(newStatus)) setClauses.push("completed_at = COALESCE(completed_at, datetime('now'))");
        setClauses.push('status = ?');
        params.push(newStatus, id);
        await databaseManager.runQuery(`UPDATE kitchen_orders SET ${setClauses.join(', ')} WHERE id = ?`, params);
        await syncSaleKitchenStatus(databaseManager, row.sale_id, newStatus);
        results.push({ id, success: true });
      } catch (e) { results.push({ id, success: false, error: e.message }); }
    }
    broadcastKitchenEvent('kitchen:batch-updated', { ids, status: newStatus, results });
    return results;
  });

  // ── Cancel Kitchen Order ───────────────────────────────────────────
  ipcMainInstance.handle('kitchen:cancel-order', async (event, id, reason) => {
    const user = requireAuth(event);
    if (!id) throw new Error('Order ID is required');
    const row = await databaseManager.getRow('SELECT * FROM kitchen_orders WHERE id = ?', [id]);
    if (!row) throw new Error(`Kitchen order #${id} not found`);
    const allowed = STATUS_TRANSITIONS[row.status] || [];
    if (!allowed.includes('cancelled')) throw new Error(`Cannot cancel order in '${row.status}' state`);

    await databaseManager.runQuery(
      `UPDATE kitchen_orders SET status = 'cancelled', cancel_reason = ?, cancelled_by = ?, completed_at = COALESCE(completed_at, datetime('now')), updated_at = datetime('now') WHERE id = ?`,
      [String(reason || '').trim(), user.full_name || user.username || '', id]
    );
    await syncSaleKitchenStatus(databaseManager, row.sale_id, 'cancelled');
    const updated = await databaseManager.getRow('SELECT * FROM kitchen_orders WHERE id = ?', [id]);
    const payload = updated ? { ...updated, items: safeJsonParse(updated.items), ...computeTimeline(updated) } : { id, status: 'cancelled' };
    broadcastKitchenEvent('kitchen:order-cancelled', payload);
    return { success: true, order: payload };
  });

  // ── Cancel All Kitchen Orders for a Sale ───────────────────────────
  ipcMainInstance.handle('kitchen:cancel-sale-orders', async (event, saleId, reason) => {
    const user = requireAuth(event);
    if (!saleId) throw new Error('Sale ID is required');
    const rows = await databaseManager.getData(
      `SELECT id FROM kitchen_orders WHERE sale_id = ? AND status NOT IN ('completed', 'cancelled')`, [saleId]
    );
    if (!rows || rows.length === 0) return { success: true, cancelled: 0 };
    let cancelledCount = 0;
    for (const r of rows) {
      try {
        const order = await databaseManager.getRow('SELECT status FROM kitchen_orders WHERE id = ?', [r.id]);
        if (!order || !(STATUS_TRANSITIONS[order.status] || []).includes('cancelled')) continue;
        await databaseManager.runQuery(
          `UPDATE kitchen_orders SET status = 'cancelled', cancel_reason = ?, cancelled_by = ?, completed_at = COALESCE(completed_at, datetime('now')), updated_at = datetime('now') WHERE id = ?`,
          [String(reason || 'Vente annulée').trim(), user.full_name || user.username || '', r.id]
        );
        cancelledCount++;
        broadcastKitchenEvent('kitchen:order-cancelled', { id: r.id, status: 'cancelled', sale_id: saleId });
      } catch (e) { console.error(`[Kitchen] Failed to cancel order #${r.id}:`, e.message); }
    }
    if (cancelledCount > 0) await syncSaleKitchenStatus(databaseManager, saleId, 'cancelled');
    return { success: true, cancelled: cancelledCount };
  });

  // ── Kitchen Dashboard (comprehensive KPIs) ─────────────────────────
  ipcMainInstance.handle('kitchen:get-dashboard', async (event) => {
    const user = requireAuth(event, { throwOnFail: false });
    if (!user) return null;

    const stats = await databaseManager.getRow(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) as preparing,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN status = 'served' THEN 1 ELSE 0 END) as served,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL
          THEN (julianday(completed_at) - julianday(started_at)) * 1440 ELSE 0 END) as total_prep_minutes,
        SUM(CASE WHEN status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL THEN 1 ELSE 0 END) as completed_with_time,
        SUM(CASE WHEN status IN ('pending','preparing') AND datetime(created_at, '+15 minutes') < datetime('now') THEN 1 ELSE 0 END) as overdue_count,
        SUM(CASE WHEN started_at IS NOT NULL AND created_at IS NOT NULL
          THEN (julianday(started_at) - julianday(created_at)) * 1440 ELSE 0 END) as total_wait_minutes,
        SUM(CASE WHEN started_at IS NOT NULL AND created_at IS NOT NULL THEN 1 ELSE 0 END) as completed_with_wait,
        SUM(CASE WHEN ready_at IS NOT NULL AND started_at IS NOT NULL
          THEN (julianday(ready_at) - julianday(started_at)) * 1440 ELSE 0 END) as total_ready_minutes,
        SUM(CASE WHEN ready_at IS NOT NULL AND started_at IS NOT NULL THEN 1 ELSE 0 END) as completed_with_ready,
        MIN(CASE WHEN status IN ('pending','preparing') THEN created_at END) as oldest_waiting,
        SUM(CASE WHEN status IN ('pending','preparing') THEN 1 ELSE 0 END) as active_queue
       FROM kitchen_orders WHERE DATE(created_at) = DATE('now', 'localtime')`
    );

    const s = stats || {};
    s.avg_prep_time = s.completed_with_time > 0 ? Math.round(s.total_prep_minutes / s.completed_with_time) : 0;
    s.avg_wait_time = s.completed_with_wait > 0 ? Math.round(s.total_wait_minutes / s.completed_with_wait) : 0;
    s.avg_ready_time = s.completed_with_ready > 0 ? Math.round(s.total_ready_minutes / s.completed_with_ready) : 0;
    s.performance_pct = s.total > 0 ? Math.round((s.completed / (s.completed + s.cancelled || 1)) * 100) : 0;
    s.sla_compliance = s.total > 0 ? Math.round(((s.completed - s.overdue_count) / (s.completed || 1)) * 100) : 100;
    if (s.sla_compliance < 0) s.sla_compliance = 0;
    s.oldest_waiting_minutes = s.oldest_waiting ? Math.max(0, Math.floor((Date.now() - new Date(s.oldest_waiting).getTime()) / 60000)) : 0;

    return s;
  });

  // ── Department Performance ──────────────────────────────────────────
  ipcMainInstance.handle('kitchen:get-department-stats', async (event) => {
    const user = requireAuth(event, { throwOnFail: false });
    if (!user) return [];

    const rows = await databaseManager.getData(
      `SELECT
        ko.department,
        kd.color as dept_color,
        kd.icon as dept_icon,
        kd.sla_target_minutes,
        COUNT(*) as total_orders,
        SUM(CASE WHEN ko.status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN ko.status = 'preparing' THEN 1 ELSE 0 END) as preparing,
        SUM(CASE WHEN ko.status = 'ready' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN ko.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN ko.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN ko.status IN ('pending','preparing') THEN 1 ELSE 0 END) as current_load,
        SUM(CASE WHEN ko.status IN ('pending','preparing') AND datetime(ko.created_at, '+' || COALESCE(kd.sla_target_minutes, 10) || ' minutes') < datetime('now') THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN ko.started_at IS NOT NULL AND ko.created_at IS NOT NULL
          THEN (julianday(ko.started_at) - julianday(ko.created_at)) * 1440 ELSE 0 END) as total_wait,
        SUM(CASE WHEN ko.started_at IS NOT NULL AND ko.created_at IS NOT NULL THEN 1 ELSE 0 END) as with_wait,
        SUM(CASE WHEN ko.ready_at IS NOT NULL AND ko.started_at IS NOT NULL
          THEN (julianday(ko.ready_at) - julianday(ko.started_at)) * 1440 ELSE 0 END) as total_prep,
        SUM(CASE WHEN ko.ready_at IS NOT NULL AND ko.started_at IS NOT NULL THEN 1 ELSE 0 END) as with_prep
       FROM kitchen_orders ko
       LEFT JOIN kitchen_departments kd ON LOWER(ko.department) = LOWER(kd.name)
       WHERE DATE(ko.created_at) = DATE('now', 'localtime')
       GROUP BY ko.department
       ORDER BY total_orders DESC`
    );

    return (rows || []).map(r => {
      const avgWait = r.with_wait > 0 ? Math.round(r.total_wait / r.with_wait) : 0;
      const avgPrep = r.with_prep > 0 ? Math.round(r.total_prep / r.with_prep) : 0;
      const loadPct = Math.min(100, r.current_load * 20);
      let busyLevel = 'normal';
      if (r.current_load >= 8) busyLevel = 'overloaded';
      else if (r.current_load >= 5) busyLevel = 'very_busy';
      else if (r.current_load >= 3) busyLevel = 'busy';
      return {
        department: r.department,
        dept_color: r.dept_color || '#3B82F6',
        dept_icon: r.dept_icon || '📋',
        sla_target_minutes: r.sla_target_minutes || 10,
        total_orders: r.total_orders,
        pending: r.pending,
        preparing: r.preparing,
        ready: r.ready,
        completed: r.completed,
        cancelled: r.cancelled,
        current_load: r.current_load,
        overdue: r.overdue,
        avg_wait_time: avgWait,
        avg_prep_time: avgPrep,
        load_pct: loadPct,
        busy_level: busyLevel,
      };
    });
  });

  // ── Employee Performance ────────────────────────────────────────────
  ipcMainInstance.handle('kitchen:get-employee-stats', async (event) => {
    const user = requireAuth(event, { throwOnFail: false });
    if (!user) return [];

    const rows = await databaseManager.getData(
      `SELECT
        server_name,
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status IN ('pending','preparing') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL
          THEN (julianday(completed_at) - julianday(started_at)) * 1440 ELSE 0 END) as total_prep,
        SUM(CASE WHEN status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL THEN 1 ELSE 0 END) as with_prep,
        SUM(CASE WHEN status IN ('pending','preparing') AND datetime(created_at, '+15 minutes') < datetime('now') THEN 1 ELSE 0 END) as overdue
       FROM kitchen_orders
       WHERE DATE(created_at) = DATE('now', 'localtime') AND server_name != ''
       GROUP BY server_name
       ORDER BY total_orders DESC`
    );

    return (rows || []).map(r => ({
      server_name: r.server_name,
      total_orders: r.total_orders,
      completed: r.completed,
      cancelled: r.cancelled,
      active: r.active,
      avg_prep_time: r.with_prep > 0 ? Math.round(r.total_prep / r.with_prep) : 0,
      overdue: r.overdue,
      completion_rate: r.total_orders > 0 ? Math.round((r.completed / r.total_orders) * 100) : 0,
    }));
  });

  // ── Product Analytics ───────────────────────────────────────────────
  ipcMainInstance.handle('kitchen:get-product-analytics', async (event) => {
    const user = requireAuth(event, { throwOnFail: false });
    if (!user) return [];

    const rows = await databaseManager.getData(
      `SELECT
        je.value as product_name,
        COUNT(*) as times_prepared,
        SUM(CASE WHEN ko.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN ko.status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM kitchen_orders ko, json_each(ko.items) je
       WHERE DATE(ko.created_at) = DATE('now', 'localtime')
       GROUP BY je.value
       ORDER BY times_prepared DESC
       LIMIT 20`
    );

    return (rows || []).map(r => {
      let parsed;
      try { parsed = typeof r.product_name === 'string' ? JSON.parse(r.product_name) : r.product_name; } catch { parsed = { name: r.product_name }; }
      return {
        product_name: parsed?.name || parsed?.product_name || String(r.product_name),
        times_prepared: r.times_prepared,
        cancelled: r.cancelled,
        completed: r.completed,
      };
    });
  });

  // ── Queue Position ──────────────────────────────────────────────────
  ipcMainInstance.handle('kitchen:get-queue-position', async (event, orderId) => {
    const user = requireAuth(event, { throwOnFail: false });
    if (!user || !orderId) return { position: 0, total: 0 };

    const order = await databaseManager.getRow('SELECT department, created_at, status FROM kitchen_orders WHERE id = ?', [orderId]);
    if (!order) return { position: 0, total: 0 };

    if (order.status !== 'pending' && order.status !== 'preparing') return { position: 0, total: 0 };

    const result = await databaseManager.getRow(
      `SELECT COUNT(*) as pos FROM kitchen_orders
       WHERE LOWER(department) = LOWER(?) AND status IN ('pending','preparing')
       AND created_at <= ? AND id != ?`,
      [order.department, order.created_at, orderId]
    );
    const totalRow = await databaseManager.getRow(
      `SELECT COUNT(*) as total FROM kitchen_orders
       WHERE LOWER(department) = LOWER(?) AND status IN ('pending','preparing')`,
      [order.department]
    );

    return { position: (result?.pos || 0) + 1, total: totalRow?.total || 0 };
  });

  // ── Smart Priority Auto-Promote ────────────────────────────────────
  ipcMainInstance.handle('kitchen:auto-promote-priorities', async (event) => {
    const user = requireAuth(event, { throwOnFail: false });
    if (!user) return { promoted: 0 };

    const rows = await databaseManager.getData(
      `SELECT id, priority, created_at, started_at FROM kitchen_orders
       WHERE status IN ('pending', 'preparing')`
    );

    let promoted = 0;
    for (const row of (rows || [])) {
      const newPrio = computeSmartPriority(row.created_at, row.started_at || row.created_at, row.priority);
      if (newPrio !== row.priority) {
        await databaseManager.runQuery("UPDATE kitchen_orders SET priority = ?, updated_at = datetime('now') WHERE id = ?", [newPrio, row.id]);
        broadcastKitchenEvent('kitchen:order-updated', { id: row.id, priority: newPrio });
        promoted++;
      }
    }
    return { promoted };
  });

  // ── Delete Kitchen Order (admin only) ──────────────────────────────
  ipcMainInstance.handle('kitchen:delete-order', async (event, id) => {
    const user = requireAuth(event);
    if (user.role !== 'admin' && user.role !== 'manager') throw new Error('Accès refusé.');
    if (!id) throw new Error('Order ID is required');
    await databaseManager.runQuery('DELETE FROM kitchen_orders WHERE id = ?', [id]);
    broadcastKitchenEvent('kitchen:order-deleted', { id });
    return { success: true };
  });

  // ── Get Kitchen History ────────────────────────────────────────────
  ipcMainInstance.handle('kitchen:get-history', async (event, filters) => {
    requireAuth(event);
    const { status, limit = 100, offset = 0, date_from, date_to, search, department, server_name, priority } = filters || {};
    let query = 'SELECT * FROM kitchen_orders WHERE 1=1';
    const params = [];

    if (status && status !== 'all') { query += ' AND status = ?'; params.push(status); }
    if (date_from) { query += ' AND DATE(created_at) >= DATE(?)'; params.push(date_from); }
    if (date_to) { query += ' AND DATE(created_at) <= DATE(?)'; params.push(date_to); }
    if (department && department !== 'all') { query += ' AND LOWER(department) = LOWER(?)'; params.push(department); }
    if (server_name) { query += ' AND server_name LIKE ?'; params.push(`%${server_name}%`); }
    if (priority && priority !== 'all') { query += ' AND priority = ?'; params.push(priority); }
    if (search) {
      query += ' AND (table_number LIKE ? OR notes LIKE ? OR server_name LIKE ? OR customer_name LIKE ? OR CAST(sale_id AS TEXT) LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await databaseManager.getData(query, params);
    return (rows || []).map(row => ({ ...row, items: safeJsonParse(row.items), ...computeTimeline(row) }));
  });

  // ── Get Recent Orders ──────────────────────────────────────────────
  ipcMainInstance.handle('kitchen:get-recent', async (event, limit = 50) => {
    requireAuth(event);
    const rows = await databaseManager.getData(
      `SELECT * FROM kitchen_orders WHERE status IN ('completed', 'cancelled') ORDER BY completed_at DESC LIMIT ?`, [limit]
    );
    return (rows || []).map(row => ({ ...row, items: safeJsonParse(row.items), ...computeTimeline(row) }));
  });

  // ── SLA Summary ────────────────────────────────────────────────────
  ipcMainInstance.handle('kitchen:get-sla-summary', async (event) => {
    const user = requireAuth(event, { throwOnFail: false });
    if (!user) return null;

    const deptSla = await databaseManager.getData(
      `SELECT
        ko.department,
        kd.sla_target_minutes,
        COUNT(*) as total,
        SUM(CASE WHEN ko.status = 'completed' AND ko.ready_at IS NOT NULL AND ko.started_at IS NOT NULL
          AND (julianday(ko.ready_at) - julianday(ko.started_at)) * 1440 <= kd.sla_target_minutes THEN 1 ELSE 0 END) as within_sla,
        SUM(CASE WHEN ko.status IN ('completed','cancelled') THEN 1 ELSE 0 END) as finished
       FROM kitchen_orders ko
       LEFT JOIN kitchen_departments kd ON LOWER(ko.department) = LOWER(kd.name)
       WHERE DATE(ko.created_at) = DATE('now', 'localtime')
       GROUP BY ko.department`
    );

    return (deptSla || []).map(r => ({
      department: r.department,
      sla_target_minutes: r.sla_target_minutes || 10,
      total: r.total,
      within_sla: r.within_sla,
      sla_pct: r.finished > 0 ? Math.round((r.within_sla / r.finished) * 100) : 100,
    }));
  });

  console.log('[Kitchen] Kitchen IPC handlers v3 registered successfully');
}

/**
 * Centralized kitchen order creation with broadcast.
 */
async function createKitchenOrder(databaseManager, data, options = {}) {
  const {
    table_number = '', items = [], notes = '', priority = 'normal',
    sale_id = null, total: callerTotal, server_name = '', customer_name = '',
    department = 'kitchen', estimated_minutes = null,
  } = data;

  const safePriority = VALID_PRIORITIES.includes(priority) ? priority : 'normal';
  const safeItems = Array.isArray(items) ? items : [];
  const safeTable = String(table_number).trim() || '';

  const computedTotal = safeItems.reduce((sum, item) => {
    const price = typeof item.price === 'number' ? item.price : 0;
    const qty = typeof item.quantity === 'number' ? item.quantity : 1;
    return sum + (price * qty);
  }, 0);
  const safeTotal = computedTotal > 0 ? computedTotal : (typeof callerTotal === 'number' ? callerTotal : 0);

  if (sale_id) {
    const existing = await databaseManager.getRow(
      `SELECT * FROM kitchen_orders WHERE sale_id = ? AND LOWER(department) = LOWER(?) AND status NOT IN ('cancelled')`, [sale_id, department]
    );
    if (existing) return { ...existing, items: safeJsonParse(existing.items) };
  }

  const result = await databaseManager.runQuery(
    `INSERT INTO kitchen_orders (table_number, items, notes, priority, status, sale_id, total, server_name, customer_name, department, estimated_minutes, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [safeTable, JSON.stringify(safeItems), String(notes).trim(), safePriority, sale_id || null, safeTotal,
     String(server_name).trim(), String(customer_name).trim(), String(department).trim() || 'kitchen',
     typeof estimated_minutes === 'number' ? estimated_minutes : null]
  );

  const order = await databaseManager.getRow('SELECT * FROM kitchen_orders WHERE id = ?', [result.lastID]);
  const payload = order ? { ...order, items: safeJsonParse(order.items) } : { id: result.lastID, status: 'pending' };

  if (!options.skipBroadcast) broadcastKitchenEvent('kitchen:order-created', payload);
  if (sale_id) await syncSaleKitchenStatus(databaseManager, sale_id, 'pending');

  return payload;
}

module.exports = { registerKitchenHandlers, createKitchenOrder, escapeHtml, safeJsonParse, VALID_STATUSES, VALID_PRIORITIES, STATUS_TRANSITIONS, broadcastKitchenEvent };
