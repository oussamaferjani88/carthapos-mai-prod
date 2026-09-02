/**
 * IPC Authentication Handlers (Unified — hardened)
 * Single source of truth for all auth/user/audit/security IPC channels.
 *
 * Security rules:
 * - Unprotected channels: needs-first-time-setup, needs-admin-password-reset,
 *   create-admin-user (first-time only), authenticate-user, authenticate-by-pin,
 *   get-active-users-for-login, get-recent-logins, logout, validate-user-exists,
 *   validate-password, auth-session-set/clear
 * - User-management is itself a permission: add-user (create), delete-user
 *   (delete), update-user / set-user-modules / admin-reset-password /
 *   set-user-pin / update-user-avatar (update, own profile always allowed),
 *   get-all-users / get-user-sessions / full audit logs (read). Admins bypass.
 * - Admin-role only (admin OR superadmin): operating on admin accounts
 *   (create/modify/delete/reset a user whose role is admin/superadmin),
 *   update-admin-password, update-security-settings.
 */

const { ipcMain } = require('electron');
const { activeSessions } = require('./ipc-session-store.cjs');

function registerAuthHandlers(ipcMainInstance, externalAuthManager, externalDatabaseManager) {
  const { LoggerService } = require('../services/LoggerService.cjs');
  const ElectronDatabaseManager = require('../ElectronDatabaseManager.cjs');
  const ElectronAuthManager = require('../ElectronAuthManager.cjs');

  const logger = new LoggerService();
  let dbManager = externalDatabaseManager || null;
  let authManager = externalAuthManager || null;

  async function ensureManagers() {
    if (!dbManager) {
      dbManager = new ElectronDatabaseManager();
      await dbManager.initializeDatabase();
    }
    if (!authManager) {
      authManager = new ElectronAuthManager(dbManager);
    }
  }

  function getCurrentUserId(event) {
    const wcId = event.sender.id;
    const session = activeSessions.get(wcId);
    return session ? session.userId : null;
  }

  function getCurrentUserRole(event) {
    const wcId = event.sender.id;
    const session = activeSessions.get(wcId);
    return session?.userData?.role || null;
  }

  // Strictly the superadmin account (id 1). Creating or promoting a user to
  // the superadmin role is reserved to the super admin itself.
  function requireSuperAdmin(event) {
    if (Number(getCurrentUserId(event)) !== 1) {
      throw new Error('Accès refusé: réservé au super administrateur');
    }
  }

  // Both the superadmin (first user) and regular admins are "admin" for guards.
  function isAdminRole(role) {
    return role === 'admin' || role === 'superadmin';
  }

  function requireAdmin(event) {
    const role = getCurrentUserRole(event);
    if (!role || (role !== 'admin' && role !== 'superadmin' && role !== 'manager')) {
      throw new Error('Accès refusé: droits administrateur requis');
    }
  }

  // Strictly the admin role (no manager). Used for operating on admin accounts
  // so a granted manager/cashier can never promote themselves or alter admins.
  function requireAdminRole(event) {
    const role = getCurrentUserRole(event);
    if (!isAdminRole(role)) {
      throw new Error('Accès refusé: réservé au rôle administrateur');
    }
  }

  // "Gestion des utilisateurs" is itself a permission now: access follows the
  // user-management module row (or the admin bypass), not the role. Without a
  // granted permission the action is refused.
  async function requireUserManagement(event, action) {
    const currentUserId = getCurrentUserId(event);
    const role = getCurrentUserRole(event);
    if (!currentUserId) throw new Error('Non authentifié');
    if (isAdminRole(role)) return;
    await ensureManagers();
    const granted = await authManager.checkUserPermission(currentUserId, 'user-management', action);
    if (!granted) throw new Error('Accès refusé: permission « gestion des utilisateurs » requise');
  }

  async function targetRole(userId) {
    try {
      return (await dbManager.getRow('SELECT role FROM users WHERE id = ?', [userId]))?.role || null;
    } catch {
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Session tracking
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('auth-session-set', async (event, userId, userData) => {
    activeSessions.set(event.sender.id, { userId, userData, loginAt: Date.now(), lastActivity: Date.now() });
    return { success: true };
  });

  ipcMainInstance.handle('auth-session-clear', async (event) => {
    activeSessions.delete(event.sender.id);
    return { success: true };
  });

  ipcMainInstance.handle('auth-session-ping', async (event) => {
    const session = activeSessions.get(event.sender.id);
    if (session) {
      session.lastActivity = Date.now();
      return { success: true, sessionTimeout: (await authManager?.getSecuritySettings())?.session_timeout_minutes || 480 };
    }
    return { success: false };
  });

  // ══════════════════════════════════════════════════════════════
  // First-time setup (unprotected — no session exists yet)
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('needs-first-time-setup', async () => {
    try {
      await ensureManagers();
      return await authManager.needsFirstTimeSetup();
    } catch (error) {
      logger.error('❌ Error checking first-time setup:', error);
      throw error;
    }
  });

  ipcMainInstance.handle('needs-admin-password-reset', async () => {
    try {
      await ensureManagers();
      return await authManager.needsAdminPasswordReset();
    } catch (error) {
      logger.error('❌ Error checking admin password reset:', error);
      return false;
    }
  });

  ipcMainInstance.handle('update-admin-password', async (event, newPassword) => {
    try {
      await ensureManagers();
      // Only allow during first-time setup (no session) or if admin is logged in
      const userId = getCurrentUserId(event);
      const role = getCurrentUserRole(event);
      if (userId && !isAdminRole(role)) {
        throw new Error('Accès refusé: seuls les administrateurs peuvent modifier le mot de passe admin');
      }
      return await authManager.updateAdminPassword(newPassword);
    } catch (error) {
      logger.error('❌ Error updating admin password:', error);
      throw error;
    }
  });

  ipcMainInstance.handle('create-admin-user', async (event, userData) => {
    try {
      await ensureManagers();
      const user = await authManager.createAdminUser(userData);
      activeSessions.set(event.sender.id, { userId: user.id, userData: user, loginAt: Date.now(), lastActivity: Date.now() });
      return user;
    } catch (error) {
      logger.error('❌ Error creating admin user:', error);
      throw error;
    }
  });

  // ══════════════════════════════════════════════════════════════
  // Login Screen — Active Users & Recent Logins (unprotected)
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('get-active-users-for-login', async () => {
    try {
      await ensureManagers();
      return await authManager.getActiveUsersForLogin();
    } catch (error) {
      logger.error('❌ Error getting active users for login:', error);
      return [];
    }
  });

  ipcMainInstance.handle('get-recent-logins', async (event, limit) => {
    try {
      await ensureManagers();
      return await authManager.getRecentLogins(limit || 5);
    } catch (error) {
      logger.error('❌ Error getting recent logins:', error);
      return [];
    }
  });

  // ══════════════════════════════════════════════════════════════
  // Authentication (unprotected — these are the login entry points)
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('authenticate-user', async (event, username, password) => {
    try {
      await ensureManagers();
      const user = await authManager.authenticateUser(username, password);
      activeSessions.set(event.sender.id, { userId: user.id, userData: user, loginAt: Date.now(), lastActivity: Date.now() });
      return user;
    } catch (error) {
      logger.error('❌ Error authenticating user:', error);
      throw error;
    }
  });

  ipcMainInstance.handle('authenticate-by-pin', async (event, userId, pin) => {
    try {
      await ensureManagers();
      const user = await authManager.authenticateByPin(userId, pin);
      activeSessions.set(event.sender.id, { userId: user.id, userData: user, loginAt: Date.now(), lastActivity: Date.now() });
      return user;
    } catch (error) {
      logger.error('❌ Error authenticating by PIN:', error);
      throw error;
    }
  });

  ipcMainInstance.handle('logout', async (event, userId) => {
    try {
      await ensureManagers();
      await authManager.logout(userId);
      activeSessions.delete(event.sender.id);
      return { success: true };
    } catch (error) {
      logger.error('❌ Error logging out user:', error);
      activeSessions.delete(event.sender.id);
      return { success: false, error: error?.message || 'Logout failed' };
    }
  });

  // ══════════════════════════════════════════════════════════════
  // User CRUD (protected — admin/manager required)
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('get-users', async (event) => {
    try {
      await ensureManagers();
      return await dbManager.getData(
        `SELECT id, username, full_name, email, phone, role, badge_id, is_active, is_server, avatar_url, use_pin, last_login, created_at, updated_at
         FROM users WHERE is_active = 1 ORDER BY created_at DESC`
      );
    } catch (error) {
      logger.error('❌ Error getting users:', error);
      throw error;
    }
  });

  ipcMainInstance.handle('get-all-users', async (event) => {
    try {
      await ensureManagers();
      await requireUserManagement(event, 'read');
      return await dbManager.getData(
        `SELECT id, username, full_name, email, phone, role, badge_id, is_active, is_server, avatar_url, use_pin, last_login, created_at, updated_at
         FROM users ORDER BY created_at DESC`
      );
    } catch (error) {
      logger.error('❌ Error getting all users:', error);
      throw error;
    }
  });

  ipcMainInstance.handle('add-user', async (event, userData) => {
    try {
      await ensureManagers();
      await requireUserManagement(event, 'create');
      // Only the admin role may create further admin accounts; only the super
      // admin may create further superadmin accounts.
      if (userData && userData.role === 'superadmin') requireSuperAdmin(event);
      if (userData && isAdminRole(userData.role) && userData.role !== 'superadmin') requireAdminRole(event);
      const createdBy = getCurrentUserId(event) || 1;
      return await authManager.createUser(userData, createdBy);
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed: users.username')) {
        logger.warn('⚠️ Username exists, attempting reactivation:', userData.username);
        try {
          return await authManager.reactivateUser(userData);
        } catch (reactivateError) {
          logger.error('❌ Reactivation also failed:', reactivateError);
        }
      }
      logger.error('❌ IPC add-user error:', error);
      throw error;
    }
  });

  ipcMainInstance.handle('update-user', async (event, userId, userData) => {
    try {
      await ensureManagers();
      const currentUserId = getCurrentUserId(event);
      // Users can update their own profile; managing someone else requires the
      // "gestion des utilisateurs" update permission.
      if (currentUserId !== userId) await requireUserManagement(event, 'update');
      // Admin accounts can only be managed by the admin role — this blocks a
      // granted manager/cashier from promoting themselves or altering admins.
      // Superadmin accounts (or promotion to superadmin) are super-admin-only.
      if (userData?.role === 'superadmin' || (await targetRole(userId)) === 'superadmin') {
        requireSuperAdmin(event);
      }
      const targetIsAdmin = isAdminRole(await targetRole(userId)) || isAdminRole(userData?.role);
      if (targetIsAdmin) requireAdminRole(event);
      const updatedBy = currentUserId || 1;
      await authManager.updateUser(userId, userData, updatedBy);
      return { success: true };
    } catch (error) {
      logger.error('❌ IPC update-user error:', error);
      throw error;
    }
  });

  ipcMainInstance.handle('delete-user', async (event, userId) => {
    try {
      await ensureManagers();
      await requireUserManagement(event, 'delete');
      if ((await targetRole(userId)) === 'superadmin') requireSuperAdmin(event);
      if (isAdminRole(await targetRole(userId))) requireAdminRole(event);
      const deletedBy = getCurrentUserId(event) || 1;
      await authManager.deleteUser(userId, deletedBy);
      return { success: true };
    } catch (error) {
      logger.error('❌ IPC delete-user error:', error);
      throw error;
    }
  });

  ipcMainInstance.handle('validate-user-exists', async (event, userId) => {
    try {
      await ensureManagers();
      return await authManager.validateUserExists(userId);
    } catch (error) {
      return false;
    }
  });

  // ══════════════════════════════════════════════════════════════
  // Password Management (protected)
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('change-password', async (event, userId, oldPassword, newPassword) => {
    try {
      await ensureManagers();
      const currentUserId = getCurrentUserId(event);
      // Users can change their own password; changing someone else's password
      // requires the "gestion des utilisateurs" update permission.
      if (currentUserId !== userId) await requireUserManagement(event, 'update');
      return await authManager.changePassword(userId, oldPassword, newPassword);
    } catch (error) {
      logger.error('❌ Error changing password:', error);
      throw error;
    }
  });

  ipcMainInstance.handle('admin-reset-password', async (event, userId, newPassword) => {
    try {
      await ensureManagers();
      await requireUserManagement(event, 'update');
      if ((await targetRole(userId)) === 'superadmin') requireSuperAdmin(event);
      if (isAdminRole(await targetRole(userId))) requireAdminRole(event);
      return await authManager.adminResetPassword(userId, newPassword);
    } catch (error) {
      logger.error('❌ Error resetting password:', error);
      throw error;
    }
  });

  ipcMainInstance.handle('validate-password', async (event, password) => {
    try {
      await ensureManagers();
      return await authManager.validatePassword(password);
    } catch (error) {
      return { valid: false, errors: [error.message] };
    }
  });

  ipcMainInstance.handle('validate-password-detailed', async (event, password) => {
    try {
      await ensureManagers();
      return await authManager.validatePasswordDetailed(password);
    } catch (error) {
      return { valid: false, errors: [error.message], checks: {} };
    }
  });

  // ══════════════════════════════════════════════════════════════
  // PIN Management (protected)
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('set-user-pin', async (event, userId, pin, usePin) => {
    try {
      await ensureManagers();
      const currentUserId = getCurrentUserId(event);
      // Users can set their own PIN; setting someone else's requires the
      // "gestion des utilisateurs" update permission.
      if (currentUserId !== userId) await requireUserManagement(event, 'update');
      return await authManager.setUserPin(userId, pin, usePin);
    } catch (error) {
      logger.error('❌ Error setting user PIN:', error);
      throw error;
    }
  });

  // ══════════════════════════════════════════════════════════════
  // Avatar Management
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('update-user-avatar', async (event, userId, avatarUrl) => {
    try {
      await ensureManagers();
      const currentUserId = getCurrentUserId(event);
      if (currentUserId !== userId) await requireUserManagement(event, 'update');
      return await authManager.updateUserAvatar(userId, avatarUrl);
    } catch (error) {
      logger.error('❌ Error updating user avatar:', error);
      throw error;
    }
  });

  // ══════════════════════════════════════════════════════════════
  // Module permissions (protected)
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('get-user-modules', async (event, userId) => {
    try {
      await ensureManagers();
      return await authManager.getUserModules(userId);
    } catch (error) {
      logger.error('❌ IPC get-user-modules error:', error);
      return [];
    }
  });

  ipcMainInstance.handle('set-user-modules', async (event, userId, modules) => {
    try {
      await ensureManagers();
      // Permission assignment is admin-only, and nobody may change their own.
      // - super admin (id 1): every other user.
      // - admin (created by the super admin): managers & cashiers only.
      // - manager / cashier: nobody.
      const currentUserId = getCurrentUserId(event);
      const role = getCurrentUserRole(event);
      if (!currentUserId) throw new Error('Non authentifié');
      if (Number(userId) === Number(currentUserId)) {
        throw new Error('Impossible de modifier ses propres permissions');
      }
      if (Number(currentUserId) !== 1) {
        if (!isAdminRole(role)) {
          throw new Error('Accès refusé: réservé au rôle administrateur');
        }
        const target = await targetRole(userId);
        if (isAdminRole(target)) {
          throw new Error('Accès refusé: un administrateur ne peut modifier les permissions que des managers et caissiers');
        }
      }
      const grantedBy = currentUserId;
      // Only the super admin may grant or change the "gestion des utilisateurs"
      // permission. A non-superadmin actor can at most carry forward the value
      // already present for the target (otherwise the delete+insert below would
      // silently grant or revoke it).
      if (Number(currentUserId) !== 1) {
        const existing = await authManager.getUserModules(userId);
        const umRow = (Array.isArray(existing) ? existing : []).find(m => String(m.module_name) === 'user-management');
        const umPreserved = umRow
          ? { module_name: 'user-management', can_read: umRow.can_read ? 1 : 0, can_create: umRow.can_create ? 1 : 0, can_update: umRow.can_update ? 1 : 0, can_delete: umRow.can_delete ? 1 : 0 }
          : null;
        const clean = (Array.isArray(modules) ? modules : []).filter(m => String(m.module_name) !== 'user-management');
        if (umPreserved) clean.push(umPreserved);
        modules = clean;
      }
      await authManager.setUserModules(userId, modules, grantedBy);
      return { success: true };
    } catch (error) {
      logger.error('❌ IPC set-user-modules error:', error);
      throw error;
    }
  });

  ipcMainInstance.handle('check-user-permission', async (event, userId, moduleName, action) => {
    try {
      await ensureManagers();
      return await authManager.checkUserPermission(userId, moduleName, action);
    } catch (error) {
      return false;
    }
  });

  // ══════════════════════════════════════════════════════════════
  // Security settings (admin/manager only)
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('get-security-settings', async () => {
    try {
      await ensureManagers();
      return await authManager.getSecuritySettings();
    } catch (error) {
      logger.error('❌ IPC get-security-settings error:', error);
      return { max_login_attempts: 5, lockout_duration_minutes: 15, session_timeout_minutes: 480, password_min_length: 6, password_require_uppercase: 0, password_require_numbers: 0, password_require_special: 0 };
    }
  });

  ipcMainInstance.handle('update-security-settings', async (event, settings) => {
    try {
      await ensureManagers();
      requireAdmin(event);

      const allowed = ['max_login_attempts', 'lockout_duration_minutes', 'session_timeout_minutes',
        'password_min_length', 'password_require_uppercase', 'password_require_numbers', 'password_require_special'];
      const sanitized = {};
      for (const k of allowed) {
        if (settings[k] !== undefined) sanitized[k] = settings[k];
      }

      await authManager.updateSecuritySettings(sanitized);
      return { success: true };
    } catch (error) {
      logger.error('❌ IPC update-security-settings error:', error);
      throw error;
    }
  });

  // ══════════════════════════════════════════════════════════════
  // Audit logs (admin/manager only for viewing)
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('get-audit-logs', async (event, filters) => {
    try {
      await ensureManagers();
      const role = getCurrentUserRole(event);
      if (!role) {
        // Session not registered — return empty rather than crash
        logger.warn('⚠️ get-audit-logs: no active session, returning empty');
        return [];
      }
      const fullAccess = isAdminRole(role) ||
        (await authManager.checkUserPermission(getCurrentUserId(event), 'user-management', 'read'));
      if (!fullAccess) {
        // Non-admin: return only own activity
        const userId = getCurrentUserId(event);
        return await authManager.getAuditLogs({ ...filters, user_id: userId });
      }
      return await authManager.getAuditLogs(filters || {});
    } catch (error) {
      logger.error('❌ IPC get-audit-logs error:', error);
      return [];
    }
  });

  // ══════════════════════════════════════════════════════════════
  // Log audit event (any authenticated user can log)
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('log-audit-event', async (event, auditEvent) => {
    try {
      const userId = getCurrentUserId(event);
      if (!userId) throw new Error('Non authentifié');
      await ensureManagers();
      await authManager.logAuditEvent({
        user_id: auditEvent.user_id || userId,
        user_name: auditEvent.user_name || 'Unknown',
        action_type: auditEvent.action_type,
        entity_type: auditEvent.entity_type || null,
        entity_id: auditEvent.entity_id || null,
        old_value: auditEvent.old_value || null,
        new_value: auditEvent.new_value || null,
        notes: auditEvent.notes || null,
      });
      return { success: true };
    } catch (error) {
      logger.error('❌ IPC log-audit-event error:', error);
      return { success: false, error: error.message };
    }
  });

  // ══════════════════════════════════════════════════════════════
  // Cash drawer (any authenticated user)
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('log-cash-drawer-event', async (event, drawerEvent) => {
    try {
      await ensureManagers();
      await authManager.logCashDrawerEvent(drawerEvent);
      return { success: true };
    } catch (error) {
      logger.error('❌ IPC log-cash-drawer-event error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMainInstance.handle('get-cash-drawer-history', async (event, filters) => {
    try {
      await ensureManagers();
      return await authManager.getCashDrawerHistory(filters || {});
    } catch (error) {
      logger.error('❌ IPC get-cash-drawer-history error:', error);
      return [];
    }
  });

  // ══════════════════════════════════════════════════════════════
  // User sessions (admin/manager, or own sessions)
  // ══════════════════════════════════════════════════════════════
  ipcMainInstance.handle('get-user-sessions', async (event, userId) => {
    try {
      await ensureManagers();
      const currentUserId = getCurrentUserId(event);
      if (currentUserId !== userId) await requireUserManagement(event, 'read');
      return await authManager.getUserSessions(userId);
    } catch (error) {
      logger.error('❌ IPC get-user-sessions error:', error);
      return [];
    }
  });

  logger.info('✅ Auth IPC handlers registered (unified, hardened)');
}

module.exports = { registerAuthHandlers };
