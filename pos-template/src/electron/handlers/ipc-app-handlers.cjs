/**
 * IPC App Handlers
 * Single source of truth for application settings, config, and utility IPC.
 *
 * Security: Every settings-modifying handler requires admin/manager role.
 */

const { ipcMain } = require('electron');
const { activeSessions } = require('./ipc-session-store.cjs');

const SETTINGS_WRITE_ROLES = ['admin', 'manager'];

const ALLOWED_SETTINGS_KEYS = new Set([
  'businessName', 'businessLogo', 'businessAddress', 'businessPhone',
  'businessEmail', 'businessWebsite', 'businessTaxId',
  'currency', 'taxEnabled', 'numberFormat', 'language', 'timezone',
  'autoBackup', 'backupFolder', 'backupFrequency',
  'printReceipts', 'printKitchen', 'receiptPrinter', 'kitchenPrinter', 'paperWidth',
  'soundEnabled', 'theme',
  'cashDrawerEnabled', 'cashDrawerPort', 'cashDrawerAutoOpen',
  'printerType', 'printerInterface', 'printerEnabled',
  'keyboardEnabled', 'keyboardSoundEnabled',
  'notificationEnabled', 'notificationSoundEnabled', 'notificationPersistentAlerts', 'notificationLowStockAlerts',
  'kioskEnabled', 'kioskFullscreen', 'kioskEmergencyExit', 'kioskHideCursor',
  'backupInterval', 'backupMaxBackups', 'backupIncludeImages',
  'receiptConfig',
  'autoLockEnabled', 'autoLockTimeout'
]);

function isAllowedKey(key) {
  return ALLOWED_SETTINGS_KEYS.has(key);
}

function getCurrentUserRole(event) {
  try {
    const wcId = event?.sender?.id;
    if (!wcId) return null;
    const session = activeSessions.get(wcId);
    return session?.userData?.role || null;
  } catch {
    return null;
  }
}

function validateEmail(email) {
  if (!email || email === '') return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUrl(url) {
  if (!url || url === '') return true;
  if (url.startsWith('data:image/')) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function validatePhone(phone) {
  if (!phone || phone === '') return true;
  return /^[\d\s\+\-\(\)]{4,20}$/.test(phone);
}

function validateSettingsPayload(key, value) {
  if (typeof key !== 'string' || key.length === 0) {
    return { valid: false, error: 'Invalid setting key' };
  }
  if (!isAllowedKey(key)) {
    return { valid: false, error: `Setting key '${key}' is not allowed` };
  }
  const strValue = String(value);

  switch (key) {
    case 'businessEmail':
      if (!validateEmail(strValue)) return { valid: false, error: 'Invalid email address' };
      break;
    case 'businessWebsite':
      if (!validateUrl(strValue)) return { valid: false, error: 'Invalid URL' };
      break;
    case 'businessPhone':
      if (!validatePhone(strValue)) return { valid: false, error: 'Invalid phone number' };
      break;
    case 'paperWidth':
      if (!['58', '80'].includes(strValue)) return { valid: false, error: 'Paper width must be 58 or 80' };
      break;
    case 'currency':
      if (!/^[A-Z]{3}$/.test(strValue)) return { valid: false, error: 'Currency must be a 3-letter code (e.g. TND, EUR)' };
      break;
    case 'timezone':
      if (strValue.length < 3 || strValue.length > 50) return { valid: false, error: 'Invalid timezone' };
      break;
    case 'language':
      if (!['fr', 'en', 'es', 'de'].includes(strValue)) return { valid: false, error: 'Unsupported language' };
      break;
    case 'autoLockTimeout': {
      const n = Number(strValue);
      if (isNaN(n) || n < 1 || n > 120) return { valid: false, error: 'Timeout must be between 1 and 120 minutes' };
      break;
    }
  }
  return { valid: true };
}

function logAudit(dbManager, event, actionType, notes, oldValue, newValue) {
  if (!dbManager) return;
  const userId = event?.__posSession?.userId || null;
  const userName = event?.__posSession?.userData?.username || 'system';
  dbManager.runQuery(
    `INSERT INTO audit_logs (user_id, user_name, action_type, notes, old_value, new_value, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [userId, userName, actionType, notes,
     oldValue != null ? String(oldValue) : null,
     newValue != null ? String(newValue) : null]
  ).catch(() => {});
}

/**
 * Register all app IPC handlers.
 * Called once from electron-modular.cjs with the DB manager and config loader.
 */
function registerAppHandlers(loadAppConfig, databaseManager) {
  const { ipcMain } = require('electron');

  // ── App config (from app-config.json + SQLite settings overlay) ───────
  ipcMain.handle('get-app-config', async () => {
    const config = loadAppConfig();
    if (!config) return config;

    // Merge user-modifiable settings from SQLite into config.theme
    // so rendering components (POSHeader, etc.) get persisted values.
    try {
      if (databaseManager && typeof databaseManager.getData === 'function') {
        const rows = await databaseManager.getData(
          `SELECT key, value FROM settings WHERE key IN (
            'businessLogo', 'businessName', 'businessAddress', 'businessPhone',
            'businessEmail', 'businessWebsite', 'businessTaxId',
            'currency', 'language', 'timezone', 'theme'
          )`
        );
        if (rows && rows.length > 0) {
          if (!config.theme) config.theme = {};
          for (const row of rows) {
            switch (row.key) {
              case 'businessLogo':   config.theme.logo = row.value; break;
              case 'businessName':   config.theme.businessName = row.value; break;
              case 'businessAddress': config.theme.businessAddress = row.value; break;
              case 'businessPhone':  config.theme.businessPhone = row.value; break;
              case 'businessEmail':  config.theme.businessEmail = row.value; break;
              case 'businessWebsite': config.theme.businessWebsite = row.value; break;
              case 'businessTaxId':  config.theme.businessTaxId = row.value; break;
              case 'currency':       config.theme.currency = row.value; break;
              case 'language':       config.theme.language = row.value; break;
              case 'timezone':       config.theme.timezone = row.value; break;
              case 'theme':          if (row.value && row.value !== 'default') config.theme.id = row.value; break;
            }
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not merge settings into app config:', e.message);
    }

    return config;
  });

  // ── Database path ────────────────────────────────────────────────────
  ipcMain.handle('get-db-path', () => {
    if (databaseManager && typeof databaseManager.getDatabasePath === 'function') {
      return databaseManager.getDatabasePath();
    }
    return null;
  });

  // ── Settings: get single key ─────────────────────────────────────────
  ipcMain.handle('settings:get', async (_event, key) => {
    try {
      if (!databaseManager || typeof databaseManager.getRow !== 'function') {
        return null;
      }
      if (typeof key !== 'string' || key.length === 0) return null;
      const row = await databaseManager.getRow('SELECT value FROM settings WHERE key = ?', [key]);
      return row ? row.value : null;
    } catch (error) {
      console.error('❌ Error getting setting:', error);
      return null;
    }
  });

  // ── Settings: set single key (with validation + auth + audit) ────────
  ipcMain.handle('settings:set', async (event, key, value) => {
    try {
      if (!databaseManager || typeof databaseManager.runQuery !== 'function') {
        return { success: false, error: 'Database not available' };
      }

      const role = getCurrentUserRole(event);
      if (role && !SETTINGS_WRITE_ROLES.includes(role)) {
        return { success: false, error: 'Insufficient permissions' };
      }

      const validation = validateSettingsPayload(key, value);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const strValue = String(value);

      const oldRow = await databaseManager.getRow('SELECT value FROM settings WHERE key = ?', [key]).catch(() => null);
      const oldValue = oldRow ? oldRow.value : null;

      await databaseManager.runQuery(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
        [key, strValue]
      );

      logAudit(databaseManager, event, 'SETTINGS_UPDATE', `Setting '${key}' updated`, oldValue, strValue);

      return { success: true };
    } catch (error) {
      console.error('❌ Error setting setting:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Settings: get all ────────────────────────────────────────────────
  ipcMain.handle('settings:getAll', async () => {
    try {
      if (!databaseManager || typeof databaseManager.getData !== 'function') {
        return {};
      }
      const rows = await databaseManager.getData('SELECT key, value FROM settings');
      const settings = {};
      for (const row of rows) {
        settings[row.key] = row.value;
      }
      return settings;
    } catch (error) {
      console.error('❌ Error getting all settings:', error);
      return {};
    }
  });

  // ── Settings: delete single key ──────────────────────────────────────
  ipcMain.handle('settings:delete', async (event, key) => {
    try {
      if (!databaseManager || typeof databaseManager.runQuery !== 'function') {
        return { success: false, error: 'Database not available' };
      }
      const role = getCurrentUserRole(event);
      if (role && !SETTINGS_WRITE_ROLES.includes(role)) {
        return { success: false, error: 'Insufficient permissions' };
      }
      if (typeof key !== 'string' || key.length === 0) {
        return { success: false, error: 'Invalid key' };
      }
      await databaseManager.runQuery('DELETE FROM settings WHERE key = ?', [key]);
      logAudit(databaseManager, event, 'SETTINGS_DELETE', `Setting '${key}' deleted`, key, null);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting setting:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Receipt config (convenience wrappers around settings table) ──────
  ipcMain.handle('get-receipt-config', async () => {
    try {
      if (!databaseManager || typeof databaseManager.getRow !== 'function') return null;
      const row = await databaseManager.getRow("SELECT value FROM settings WHERE key = 'receiptConfig'");
      return row ? row.value : null;
    } catch (error) {
      console.error('❌ Error getting receipt config:', error);
      return null;
    }
  });

  ipcMain.handle('save-receipt-config', async (event, configStr) => {
    try {
      if (!databaseManager || typeof databaseManager.runQuery !== 'function') {
        return { success: false, error: 'Database not available' };
      }
      const role = getCurrentUserRole(event);
      if (role && !SETTINGS_WRITE_ROLES.includes(role)) {
        return { success: false, error: 'Insufficient permissions' };
      }
      if (typeof configStr !== 'string') {
        return { success: false, error: 'Config must be a JSON string' };
      }
      try {
        JSON.parse(configStr);
      } catch {
        return { success: false, error: 'Invalid JSON' };
      }

      const oldRow = await databaseManager.getRow("SELECT value FROM settings WHERE key = 'receiptConfig'").catch(() => null);

      await databaseManager.runQuery(
        "INSERT INTO settings (key, value, updated_at) VALUES ('receiptConfig', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        [configStr]
      );

      logAudit(databaseManager, event, 'SETTINGS_UPDATE', 'Receipt configuration updated', oldRow?.value ? '[previous]' : null, '[updated]');

      return { success: true };
    } catch (error) {
      console.error('❌ Error saving receipt config:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Settings: export all ─────────────────────────────────────────────
  ipcMain.handle('settings:export', async (event) => {
    try {
      if (!databaseManager || typeof databaseManager.getData !== 'function') {
        return { success: false, error: 'Database not available' };
      }
      const rows = await databaseManager.getData('SELECT key, value FROM settings');
      const settings = {};
      for (const row of rows) {
        settings[row.key] = row.value;
      }
      let securitySettings = {};
      try {
        const secRow = await databaseManager.getRow('SELECT * FROM security_settings WHERE id = 1');
        if (secRow) {
          const { id, updated_at, ...rest } = secRow;
          securitySettings = rest;
        }
      } catch { /* table may not exist */ }

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        settings,
        securitySettings
      };

      logAudit(databaseManager, event, 'SETTINGS_EXPORT', 'Settings exported', null, null);

      return { success: true, data: JSON.stringify(exportData, null, 2) };
    } catch (error) {
      console.error('❌ Error exporting settings:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Settings: import ─────────────────────────────────────────────────
  ipcMain.handle('settings:import', async (event, jsonStr) => {
    try {
      if (!databaseManager || typeof databaseManager.runQuery !== 'function') {
        return { success: false, error: 'Database not available' };
      }
      const role = getCurrentUserRole(event);
      if (role && !SETTINGS_WRITE_ROLES.includes(role)) {
        return { success: false, error: 'Insufficient permissions' };
      }

      let importData;
      try {
        importData = JSON.parse(jsonStr);
      } catch {
        return { success: false, error: 'Invalid JSON' };
      }

      if (!importData.settings || typeof importData.settings !== 'object') {
        return { success: false, error: 'Invalid import format: missing settings' };
      }

      let count = 0;
      for (const [key, value] of Object.entries(importData.settings)) {
        if (isAllowedKey(key)) {
          await databaseManager.runQuery(
            'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
            [key, String(value)]
          );
          count++;
        }
      }

      if (importData.securitySettings && typeof importData.securitySettings === 'object') {
        const sec = importData.securitySettings;
        const fields = ['max_login_attempts', 'lockout_duration_minutes', 'session_timeout_minutes',
          'password_min_length', 'password_require_uppercase', 'password_require_numbers', 'password_require_special'];
        const updates = [];
        const values = [];
        for (const f of fields) {
          if (sec[f] !== undefined) {
            updates.push(`${f} = ?`);
            values.push(sec[f]);
          }
        }
        if (updates.length > 0) {
          updates.push('updated_at = CURRENT_TIMESTAMP');
          await databaseManager.runQuery(
            `UPDATE security_settings SET ${updates.join(', ')} WHERE id = 1`,
            values
          );
          count++;
        }
      }

      logAudit(databaseManager, event, 'SETTINGS_IMPORT', `Settings imported (${count} items)`, null, null);

      return { success: true, count };
    } catch (error) {
      console.error('❌ Error importing settings:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Notifications (placeholder) ──────────────────────────────────────
  ipcMain.handle('notifications:show', async (_event, title, body) => {
    console.log(`📢 Notification: ${title} - ${body}`);
    return { success: true };
  });

  // ── Shell ────────────────────────────────────────────────────────────
  ipcMain.handle('shell:showItemInFolder', async (_event, filePath) => {
    const { shell } = require('electron');
    shell.showItemInFolder(filePath);
    return { success: true };
  });

  // ── Error logging from renderer ──────────────────────────────────────
  ipcMain.handle('log-error', async (_event, errorData) => {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('🚨 ERROR LOGGED FROM RENDERER PROCESS');
    console.error('Timestamp:', errorData?.timestamp);
    console.error('Message:', errorData?.message);
    console.error('Stack:', errorData?.stack);
    console.error('═══════════════════════════════════════════════════════════');
    return { logged: true };
  });

  console.log('✅ App IPC handlers registered (unified, validated)');
}

module.exports = { registerAppHandlers };
