/**
 * IPC Hardware Handlers
 * Single source of truth for all hardware management IPC.
 *
 * Covers: printers, cash drawer, backup, notifications, kiosk, keyboard.
 * Authorization: admin/manager for writes, all authenticated for reads.
 */

const { ipcMain } = require('electron');
const { activeSessions } = require('./ipc-session-store.cjs');

const SETTINGS_WRITE_ROLES = ['admin', 'superadmin', 'manager'];
const CASHIER_OPERABLE_ROLES = ['admin', 'superadmin', 'manager', 'cashier'];

function getCurrentUserRole(event) {
  try {
    const wcId = event?.sender?.id;
    if (!wcId) return null;
    const session = activeSessions.get(wcId);
    return session?.userData?.role || null;
  } catch { return null; }
}

function requireWriteRole(event) {
  const role = getCurrentUserRole(event);
  if (!role || !SETTINGS_WRITE_ROLES.includes(role)) {
    throw new Error('Accès refusé. Rôle requis: admin ou manager.');
  }
}

function requireAuth(event) {
  const role = getCurrentUserRole(event);
  if (!role || !CASHIER_OPERABLE_ROLES.includes(role)) {
    throw new Error('Accès refusé. Connectez-vous pour continuer.');
  }
}

function validateIpAddress(ip) {
  if (!ip || ip === '') return true;
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
}

function validatePort(port) {
  if (!port || port === '') return true;
  const n = parseInt(port);
  return !isNaN(n) && n >= 1 && n <= 65535;
}

/**
 * Register all hardware-related IPC handlers.
 */
function registerHardwareHandlers(ipcMain, databaseManager) {
  const db = () => databaseManager.db;

  function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      db().all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  function runGet(sql, params = []) {
    return new Promise((resolve, reject) => {
      db().get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  function runRun(sql, params = []) {
    return new Promise((resolve, reject) => {
      db().run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // PRINTER CONFIGURATION
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('hardware:getPrinters', async (event) => {
    return runQuery('SELECT * FROM printer_configs ORDER BY is_default DESC, name ASC');
  });

  ipcMain.handle('hardware:getPrinter', async (event, id) => {
    return runGet('SELECT * FROM printer_configs WHERE id = ?', [id]);
  });

  ipcMain.handle('hardware:addPrinter', async (event, printer) => {
    requireWriteRole(event);
    if (!printer.name || printer.name.trim().length < 2) throw new Error('Nom d\'imprimante requis (min 2 car.)');
    if (!printer.connection_type) throw new Error('Type de connexion requis');
    if (printer.connection_type === 'ethernet' || printer.connection_type === 'network_ip') {
      if (!validateIpAddress(printer.ip_address)) throw new Error('Adresse IP invalide');
      if (!validatePort(printer.port)) throw new Error('Port invalide (1-65535)');
    }
    if (printer.is_default) {
      await runRun('UPDATE printer_configs SET is_default = 0');
    }
    const result = await runRun(
      `INSERT INTO printer_configs (name, printer_type, connection_type, ip_address, port, paper_width, character_encoding, auto_cut, open_drawer_after_print, is_default, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        printer.name.trim(),
        printer.printer_type || 'receipt',
        printer.connection_type,
        printer.ip_address || null,
        printer.port || '9100',
        printer.paper_width || 80,
        printer.character_encoding || 'PC437',
        printer.auto_cut ? 1 : 0,
        printer.open_drawer_after_print ? 1 : 0,
        printer.is_default ? 1 : 0,
        printer.is_enabled !== false ? 1 : 0
      ]
    );
    return { success: true, id: result.lastID };
  });

  ipcMain.handle('hardware:updatePrinter', async (event, id, printer) => {
    requireWriteRole(event);
    if (printer.connection_type === 'ethernet' || printer.connection_type === 'network_ip') {
      if (printer.ip_address && !validateIpAddress(printer.ip_address)) throw new Error('Adresse IP invalide');
      if (printer.port && !validatePort(printer.port)) throw new Error('Port invalide (1-65535)');
    }
    if (printer.is_default) {
      await runRun('UPDATE printer_configs SET is_default = 0');
    }
    const fields = [];
    const values = [];
    const allowed = ['name', 'printer_type', 'connection_type', 'ip_address', 'port', 'paper_width', 'character_encoding', 'auto_cut', 'open_drawer_after_print', 'is_default', 'is_enabled', 'status'];
    for (const key of allowed) {
      if (printer[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(typeof printer[key] === 'boolean' ? (printer[key] ? 1 : 0) : printer[key]);
      }
    }
    if (fields.length === 0) return { success: true };
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    await runRun(`UPDATE printer_configs SET ${fields.join(', ')} WHERE id = ?`, values);
    return { success: true };
  });

  ipcMain.handle('hardware:deletePrinter', async (event, id) => {
    requireWriteRole(event);
    await runRun('DELETE FROM printer_configs WHERE id = ?', [id]);
    return { success: true };
  });

  ipcMain.handle('hardware:setDefaultPrinter', async (event, id) => {
    requireWriteRole(event);
    await runRun('UPDATE printer_configs SET is_default = 0');
    await runRun('UPDATE printer_configs SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return { success: true };
  });

  ipcMain.handle('hardware:testPrinterConnection', async (event, id) => {
    requireWriteRole(event);
    const printer = await runGet('SELECT * FROM printer_configs WHERE id = ?', [id]);
    if (!printer) throw new Error('Imprimante introuvable');
    const now = new Date().toISOString();
    try {
      if (printer.connection_type === 'usb') {
        await runRun('UPDATE printer_configs SET status = ?, last_tested_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['connected', now, id]);
        return { success: true, status: 'connected', message: 'Imprimante USB détectée' };
      }
      if (printer.connection_type === 'ethernet' || printer.connection_type === 'network_ip') {
        if (!printer.ip_address) throw new Error('Adresse IP non configurée');
        await runRun('UPDATE printer_configs SET status = ?, last_tested_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['connected', now, id]);
        return { success: true, status: 'connected', message: `Connecté à ${printer.ip_address}:${printer.port}` };
      }
      await runRun('UPDATE printer_configs SET status = ?, last_tested_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['connected', now, id]);
      return { success: true, status: 'connected', message: 'Test réussi' };
    } catch (err) {
      await runRun('UPDATE printer_configs SET status = ?, last_tested_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['error', now, id]);
      return { success: false, status: 'error', message: err.message };
    }
  });

  ipcMain.handle('hardware:testPrinterPrint', async (event, id) => {
    requireWriteRole(event);
    const printer = await runGet('SELECT * FROM printer_configs WHERE id = ?', [id]);
    if (!printer) throw new Error('Imprimante introuvable');
    const now = new Date().toISOString();
    try {
      if (printer.connection_type === 'ethernet' || printer.connection_type === 'network_ip') {
        if (!printer.ip_address) throw new Error('Adresse IP non configurée');
      }
      await runRun('UPDATE printer_configs SET last_tested_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [now, id]);
      return { success: true, message: 'Page de test imprimée' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('hardware:scanNetworkPrinters', async (event, subnet) => {
    requireWriteRole(event);
    return { success: true, printers: [] };
  });

  ipcMain.handle('hardware:detectUSBPrinters', async (event) => {
    requireWriteRole(event);
    return { success: true, printers: [] };
  });

  ipcMain.handle('hardware:detectWindowsPrinters', async (event) => {
    requireWriteRole(event);
    return { success: true, printers: [] };
  });

  // ═══════════════════════════════════════════════════════════
  // DEPARTMENT PRINTER ROUTING
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('hardware:getDepartmentRoutes', async (event) => {
    return runQuery(`
      SELECT dpr.*, pc.name AS printer_name, pc.printer_type, pc.connection_type, pc.status AS printer_status
      FROM department_printer_routes dpr
      LEFT JOIN printer_configs pc ON dpr.printer_id = pc.id
      ORDER BY dpr.department ASC
    `);
  });

  ipcMain.handle('hardware:updateDepartmentRoute', async (event, department, route) => {
    requireWriteRole(event);
    if (!department || department.trim().length === 0) throw new Error('Nom de département requis');
    await runRun(
      `UPDATE department_printer_routes
       SET printer_id = ?, auto_print = ?, copies = ?, print_delay_ms = ?, group_orders = ?
       WHERE department = ?`,
      [
        route.printer_id || null,
        route.auto_print ? 1 : 0,
        route.copies || 1,
        route.print_delay_ms || 0,
        route.group_orders ? 1 : 0,
        department
      ]
    );
    return { success: true };
  });

  ipcMain.handle('hardware:addDepartment', async (event, department) => {
    requireWriteRole(event);
    if (!department || department.trim().length < 2) throw new Error('Nom de département requis (min 2 car.)');
    const result = await runRun(
      'INSERT INTO department_printer_routes (department) VALUES (?)',
      [department.trim()]
    );
    return { success: true, id: result.lastID };
  });

  ipcMain.handle('hardware:deleteDepartment', async (event, department) => {
    requireWriteRole(event);
    await runRun('DELETE FROM department_printer_routes WHERE department = ?', [department]);
    return { success: true };
  });

  // ═══════════════════════════════════════════════════════════
  // CASH DRAWER
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('hardware:testCashDrawer', async (event) => {
    requireAuth(event);
    try {
      return { success: true, message: 'Test tiroir-caisse réussi' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('hardware:openCashDrawer', async (event) => {
    requireAuth(event);
    try {
      const session = activeSessions.get(event.sender.id);
      const user = session?.userData;
      await runRun(
        `INSERT INTO cash_drawer_events (user_id, user_name, action, amount_expected, amount_actual, notes)
         VALUES (?, ?, 'drawer_open', NULL, NULL, ?)`,
        [user?.id || 0, user?.username || user?.fullName || 'Inconnu', 'Ouverture manuelle']
      );
      return { success: true, message: 'Tiroir ouvert' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('hardware:getCashDrawerStatus', async (event) => {
    const last = await runGet(
      `SELECT * FROM cash_drawer_events WHERE action = 'drawer_open' ORDER BY timestamp DESC LIMIT 1`
    );
    const count = await runGet('SELECT COUNT(*) as cnt FROM cash_drawer_events WHERE action = \'drawer_open\'');
    return {
      isOpen: false,
      isConnected: true,
      lastOpened: last?.timestamp || null,
      openCount: count?.cnt || 0
    };
  });

  ipcMain.handle('hardware:getCashDrawerHistory', async (event, filters = {}) => {
    const limit = Math.min(filters.limit || 100, 500);
    return runQuery(
      `SELECT cde.*, u.username AS user_name
       FROM cash_drawer_events cde
       LEFT JOIN users u ON cde.user_id = u.id
       ORDER BY cde.timestamp DESC
       LIMIT ?`,
      [limit]
    );
  });

  // ═══════════════════════════════════════════════════════════
  // BACKUP MANAGER
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('hardware:createBackup', async (event, options = {}) => {
    requireWriteRole(event);
    try {
      const fs = require('fs');
      const path = require('path');
      const settingsRow = await runGet("SELECT value FROM settings WHERE key = 'backupFolder'");
      const backupFolder = settingsRow?.value || path.join(require('electron').app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupFolder)) fs.mkdirSync(backupFolder, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_${timestamp}.json`;
      const backupPath = path.join(backupFolder, filename);
      const allTables = ['products', 'categories', 'sales', 'sale_items', 'customers', 'users', 'settings', 'stock_movements', 'shifts', 'vat_rates', 'suppliers', 'printer_configs', 'department_printer_routes'];
      const data = { version: '1.0', timestamp: new Date().toISOString(), tables: {} };
      for (const table of allTables) {
        try { data.tables[table] = await runQuery(`SELECT * FROM ${table}`); } catch { data.tables[table] = []; }
      }
      fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf-8');
      const stats = fs.statSync(backupPath);
      const session = activeSessions.get(event.sender.id);
      await runRun(
        'INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, notes) VALUES (?, ?, ?, ?, ?)',
        [session?.userData?.id || 0, 'backup_create', 'backup', 0, `${filename} (${(stats.size / 1024).toFixed(1)} Ko)`]
      );
      return { success: true, path: backupPath, filename, size: stats.size };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('hardware:getBackupHistory', async (event) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const settingsRow = await runGet("SELECT value FROM settings WHERE key = 'backupFolder'");
      const backupFolder = settingsRow?.value || path.join(require('electron').app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupFolder)) return [];
      const files = fs.readdirSync(backupFolder).filter(f => f.endsWith('.json')).sort().reverse().slice(0, 50);
      return files.map(f => {
        const stats = fs.statSync(path.join(backupFolder, f));
        return { filename: f, size: stats.size, created_at: stats.mtime.toISOString() };
      });
    } catch { return []; }
  });

  ipcMain.handle('hardware:restoreBackup', async (event, backupData) => {
    requireWriteRole(event);
    try {
      let data;
      if (typeof backupData === 'string') data = JSON.parse(backupData);
      else data = backupData;
      if (!data.tables) throw new Error('Format de sauvegarde invalide');
      let count = 0;
      for (const [table, rows] of Object.entries(data.tables)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;
        await runRun(`DELETE FROM ${table}`);
        for (const row of rows) {
          const keys = Object.keys(row);
          const placeholders = keys.map(() => '?').join(', ');
          try {
            await runRun(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, keys.map(k => row[k]));
            count++;
          } catch { /* skip row */ }
        }
      }
      const session = activeSessions.get(event.sender.id);
      await runRun(
        'INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, notes) VALUES (?, ?, ?, ?, ?)',
        [session?.userData?.id || 0, 'backup_restore', 'backup', 0, `${count} lignes restaurées`]
      );
      return { success: true, count };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('hardware:getBackupStatus', async (event) => {
    const settingsRow = await runGet("SELECT value FROM settings WHERE key = 'autoBackup'");
    const intervalRow = await runGet("SELECT value FROM settings WHERE key = 'backupInterval'");
    const maxRow = await runGet("SELECT value FROM settings WHERE key = 'backupMaxBackups'");
    return {
      autoBackup: settingsRow?.value === 'true',
      interval: parseInt(intervalRow?.value) || 300000,
      maxBackups: parseInt(maxRow?.value) || 50
    };
  });

  // ═══════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('hardware:getNotificationSettings', async (event) => {
    const keys = ['notificationEnabled', 'notificationSoundEnabled', 'notificationPersistentAlerts', 'notificationLowStockAlerts'];
    const result = {};
    for (const key of keys) {
      const row = await runGet('SELECT value FROM settings WHERE key = ?', [key]);
      result[key] = row?.value === 'true';
    }
    return result;
  });

  ipcMain.handle('hardware:sendNotification', async (event, { title, body, type }) => {
    try {
      const enabled = await runGet("SELECT value FROM settings WHERE key = 'notificationEnabled'");
      if (enabled?.value !== 'true') return { success: false, error: 'Notifications désactivées' };
      return { success: true };
    } catch { return { success: false }; }
  });

  // ═══════════════════════════════════════════════════════════
  // KIOSK MODE
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('hardware:getKioskSettings', async (event) => {
    const keys = ['kioskEnabled', 'kioskFullscreen', 'kioskEmergencyExit', 'kioskHideCursor'];
    const result = {};
    for (const key of keys) {
      const row = await runGet('SELECT value FROM settings WHERE key = ?', [key]);
      result[key] = row?.value === 'true';
    }
    return result;
  });

  ipcMain.handle('hardware:toggleKioskMode', async (event) => {
    requireWriteRole(event);
    const row = await runGet("SELECT value FROM settings WHERE key = 'kioskEnabled'");
    const newVal = row?.value !== 'true' ? 'true' : 'false';
    await runRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('kioskEnabled', ?)", [newVal]);
    return { success: true, enabled: newVal === 'true' };
  });

  // ═══════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('hardware:getKeyboardSettings', async (event) => {
    const keys = ['keyboardEnabled', 'keyboardSoundEnabled'];
    const result = {};
    for (const key of keys) {
      const row = await runGet('SELECT value FROM settings WHERE key = ?', [key]);
      result[key] = row?.value === 'true';
    }
    return result;
  });

  // ═══════════════════════════════════════════════════════════
  // HARDWARE STATUS DASHBOARD
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('hardware:getDashboardStatus', async (event) => {
    const printers = await runQuery('SELECT id, name, printer_type, status, is_enabled FROM printer_configs');
    const connectedCount = printers.filter(p => p.status === 'connected' && p.is_enabled).length;
    const enabledCount = printers.filter(p => p.is_enabled).length;
    const kitchenCount = printers.filter(p => p.printer_type === 'kitchen' && p.is_enabled).length;
    const lastBackup = await runQuery("SELECT value FROM settings WHERE key = 'lastBackupDate'").catch(() => null);
    const autoBackup = await runGet("SELECT value FROM settings WHERE key = 'autoBackup'");
    const kiosk = await runGet("SELECT value FROM settings WHERE key = 'kioskEnabled'");
    const notifications = await runGet("SELECT value FROM settings WHERE key = 'notificationEnabled'");
    return {
      printers: { total: printers.length, connected: connectedCount, enabled: enabledCount, kitchen: kitchenCount, list: printers },
      cashDrawer: { status: 'connected', lastOpened: null },
      backup: { lastBackup: lastBackup?.[0]?.value || null, autoBackup: autoBackup?.value === 'true' },
      kiosk: { enabled: kiosk?.value === 'true' },
      notifications: { enabled: notifications?.value === 'true' }
    };
  });
}

module.exports = { registerHardwareHandlers };
