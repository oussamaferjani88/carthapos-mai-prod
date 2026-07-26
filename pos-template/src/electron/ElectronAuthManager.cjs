/**
 * Electron Auth Manager
 * Handles user authentication, permissions, and audit logging
 */

const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;

class ElectronAuthManager {
  constructor(dbManager) {
    this.db = dbManager;
  }

  /**
   * Check if first-time setup is needed
   *
   * Conditions where we consider it "first time":
   * - No active admin user exists at all
   * - OR an admin exists but has no real password yet (NULL / empty hash)
   *
   * @returns {Promise<boolean>} True if admin must go through setup wizard
   */
  async needsFirstTimeSetup() {
    try {
      const admins = await this.db.getData(
        'SELECT id, username, password_hash FROM users WHERE role = ? AND is_active = 1',
        ['admin']
      );

      console.log('[DIAG] needsFirstTimeSetup: SQL returned rows =', admins ? admins.length : 0);
      if (admins && admins.length > 0) {
        admins.forEach(a => {
          const h = a.password_hash;
          console.log('[DIAG] needsFirstTimeSetup: admin row id=', a.id, 'username=', a.username, 'hash_exists=', !!h, 'hash_length=', h ? h.length : 0, 'hash_prefix=', h ? h.substring(0, 12) : 'NULL');
        });
      }

      // Case 1: absolutely no admin → first-time setup
      if (!admins || admins.length === 0) {
        console.log('[DIAG] needsFirstTimeSetup: NO admins found, returning TRUE');
        return true;
      }

      // Case 2: admin exists but without a proper password
      // Some generated databases may create the admin row first, then expect
      // the POS to ask the admin to define a password on first launch.
      const hasAdminWithPassword = admins.some((admin) => {
        const hash = admin.password_hash;
        return typeof hash === 'string' && hash.trim().length > 0;
      });

      console.log('[DIAG] needsFirstTimeSetup: hasAdminWithPassword =', hasAdminWithPassword, 'returning', !hasAdminWithPassword);

      // If no admin has a non-empty password_hash, treat as first-time setup
      return !hasAdminWithPassword;
    } catch (error) {
      console.error('❌ Error checking first-time setup:', error);
      console.log('[DIAG] needsFirstTimeSetup: CAUGHT error, rethrowing');
      throw error;
    }
  }

  /**
   * Check if existing admin still uses the default demo password (admin123)
   * This helps recover from cases where a packaged build accidentally seeded a demo admin.
   * @returns {Promise<boolean>} True if admin exists AND password matches 'admin123'
   */
  async needsAdminPasswordReset() {
    try {
      const user = await this.db.getRow(
        'SELECT id, username, password_hash FROM users WHERE username = ? AND is_active = 1',
        ['admin']
      );
      if (!user) {
        console.log('[DIAG] needsAdminPasswordReset: no admin user found, returning FALSE');
        return false;
      }

      const h = user.password_hash;
      console.log('[DIAG] needsAdminPasswordReset: user found id=', user.id, 'username=', user.username, 'hash_exists=', !!h, 'hash_length=', h ? h.length : 0, 'hash_prefix=', h ? h.substring(0, 15) : 'NULL');

      // Empty or missing hash should force setup/reset flow.
      if (!user.password_hash || String(user.password_hash).trim() === '') {
        console.log('[DIAG] needsAdminPasswordReset: hash is EMPTY, returning TRUE');
        return true;
      }

      // Some legacy/demo builds may have stored plain text by mistake.
      if (String(user.password_hash) === 'admin123') {
        console.log('[DIAG] needsAdminPasswordReset: hash is PLAIN TEXT admin123, returning TRUE');
        return true;
      }

      // Compare against known demo password. If it matches, force password reset flow.
      console.log('[DIAG] needsAdminPasswordReset: calling bcrypt.compare("admin123", hash)');
      const isDefault = await bcrypt.compare('admin123', user.password_hash);
      console.log('[DIAG] needsAdminPasswordReset: bcrypt.compare result =', !!isDefault, 'returning', !!isDefault);
      console.log('[DIAG] needsAdminPasswordReset: bcrypt AWAITED - no Promise used directly as boolean');
      return !!isDefault;
    } catch (error) {
      console.error('❌ Error checking admin default password:', error);
      console.log('[DIAG] needsAdminPasswordReset: CAUGHT error, returning FALSE');
      return false;
    }
  }

  /**
   * Update the admin user's password (used when demo password is detected)
   * @param {string} newPassword
   */
  async updateAdminPassword(newPassword) {
    try {
      console.log('[DIAG] updateAdminPassword: called with new password length=', newPassword ? newPassword.length : 0);
      const user = await this.db.getRow(
        'SELECT id FROM users WHERE username = ? AND is_active = 1',
        ['admin']
      );
      if (!user) {
        console.log('[DIAG] updateAdminPassword: admin user NOT FOUND, throwing');
        throw new Error('Admin user does not exist');
      }
      console.log('[DIAG] updateAdminPassword: found admin user id=', user.id);

      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      console.log('[DIAG] updateAdminPassword: new hash created, length=', passwordHash.length, 'prefix=', passwordHash.substring(0, 15));
      await this.db.runQuery(
        'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
        [passwordHash, new Date().toISOString(), user.id]
      );

      console.log('✅ Admin password updated successfully');
      console.log('[DIAG] updateAdminPassword: UPDATE query completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating admin password:', error);
      console.log('[DIAG] updateAdminPassword: CAUGHT error, rethrowing');
      throw error;
    }
  }

  /**
   * Create the initial admin user
   * @param {Object} userData - User data {username, password}
   * @returns {Promise<Object>} Created user data
   */
  async createAdminUser(userData) {
    try {
      console.log('🔐 Creating admin user:', userData.username);

      // Check if admin already exists
      console.log('[DIAG] createAdminUser: about to call this.needsFirstTimeSetup() internally');
      const needsSetup = await this.needsFirstTimeSetup();
      console.log('[DIAG] createAdminUser: internal needsFirstTimeSetup() returned', needsSetup);
      if (!needsSetup) {
        console.log('[DIAG] createAdminUser: needsSetup=false, throwing "Admin user already exists"');
        throw new Error('Admin user already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

      // Insert admin user
      const result = await this.db.runQuery(
        `INSERT INTO users (username, password_hash, full_name, role, is_active, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.username || 'admin',
          passwordHash,
          userData.fullName || userData.full_name || 'Administrateur',
          'admin',
          1,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );

      const user = {
        id: result.lastID,
        username: userData.username || 'admin',
        full_name: userData.fullName || userData.full_name || 'Administrateur',
        role: 'admin',
        permissions: ['all']
      };

      console.log('✅ Admin user created successfully');
      return user;
    } catch (error) {
      console.error('❌ Error creating admin user:', error);
      throw error;
    }
  }

  /**
   * Get security settings
   * @returns {Promise<Object>}
   */
  async getSecuritySettings() {
    try {
      const settings = await this.db.getRow('SELECT * FROM security_settings WHERE id = 1');
      return settings || { max_login_attempts: 5, lockout_duration_minutes: 15, session_timeout_minutes: 480, password_min_length: 6, password_require_uppercase: 0, password_require_numbers: 0, password_require_special: 0 };
    } catch (error) {
      return { max_login_attempts: 5, lockout_duration_minutes: 15, session_timeout_minutes: 480, password_min_length: 6, password_require_uppercase: 0, password_require_numbers: 0, password_require_special: 0 };
    }
  }

  /**
   * Update security settings
   * @param {Object} settings
   */
  async updateSecuritySettings(settings) {
    try {
      await this.db.runQuery(
        `UPDATE security_settings SET max_login_attempts = ?, lockout_duration_minutes = ?,
         session_timeout_minutes = ?, password_min_length = ?, password_require_uppercase = ?,
         password_require_numbers = ?, password_require_special = ?, updated_at = ? WHERE id = 1`,
        [settings.max_login_attempts || 5, settings.lockout_duration_minutes || 15,
         settings.session_timeout_minutes || 480, settings.password_min_length || 6,
         settings.password_require_uppercase ? 1 : 0, settings.password_require_numbers ? 1 : 0,
         settings.password_require_special ? 1 : 0, new Date().toISOString()]
      );
      return true;
    } catch (error) {
      console.error('❌ Error updating security settings:', error);
      throw error;
    }
  }

  /**
   * Validate password against security settings
   * @param {string} password
   * @returns {Promise<{valid: boolean, errors: string[]}>}
   */
  async validatePassword(password) {
    const settings = await this.getSecuritySettings();
    const errors = [];
    if (!password || password.length < (settings.password_min_length || 6)) {
      errors.push(`Le mot de passe doit contenir au moins ${settings.password_min_length || 6} caractères`);
    }
    if (settings.password_require_uppercase && !/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    }
    if (settings.password_require_numbers && !/[0-9]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }
    if (settings.password_require_special && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate user input fields
   * @param {Object} userData
   * @param {boolean} isEdit
   * @returns {{valid: boolean, errors: string[]}}
   */
  validateUserInput(userData, isEdit = false) {
    const errors = [];
    if (!isEdit) {
      if (!userData.username || userData.username.trim().length < 2) {
        errors.push("Le nom d'utilisateur doit contenir au moins 2 caractères");
      }
      if (userData.username && /[^a-zA-Z0-9._\-]/.test(userData.username)) {
        errors.push("Le nom d'utilisateur ne peut contenir que des lettres, chiffres, points, tirets");
      }
      if (!userData.password || userData.password.length < 6) {
        errors.push('Le mot de passe doit contenir au moins 6 caractères');
      }
    }
    if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push("Format d'email invalide");
    }
    if (userData.phone && !/^[\d\s\+\-\(\)]{6,}$/.test(userData.phone)) {
      errors.push("Format de téléphone invalide");
    }
    if (userData.role && !['admin', 'cashier', 'manager', 'server'].includes(userData.role)) {
      errors.push('Rôle invalide');
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Count active admin users
   * @returns {Promise<number>}
   */
  async countActiveAdmins() {
    const result = await this.db.getRow('SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = 1', ['admin']);
    return result ? result.count : 0;
  }

  /**
   * Authenticate user with brute-force protection
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async authenticateUser(username, password) {
    try {
      const user = await this.db.getRow('SELECT * FROM users WHERE username = ?', [username]);

      // Generic error — never reveal whether username exists or password is wrong
      const AUTH_ERROR = 'Échec de l\'authentification. Vérifiez vos identifiants.';

      if (!user) {
        // Still run bcrypt to prevent timing attacks
        await bcrypt.hash('dummy', SALT_ROUNDS);
        throw new Error(AUTH_ERROR);
      }

      if (!user.is_active) {
        throw new Error('Compte désactivé. Contactez un administrateur.');
      }

      const settings = await this.getSecuritySettings();
      const maxAttempts = settings.max_login_attempts || 5;
      const lockoutMinutes = settings.lockout_duration_minutes || 15;

      // Check lockout
      if (user.locked_until) {
        const lockExpiry = new Date(user.locked_until);
        if (lockExpiry > new Date()) {
          const remaining = Math.ceil((lockExpiry - new Date()) / 60000);
          throw new Error(`Compte verrouillé. Réessayez dans ${remaining} minute(s).`);
        }
        // Lock expired, reset (atomic)
        await this.db.runQuery('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
        user.login_attempts = 0;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        // Atomic increment of login attempts
        const newAttempts = (user.login_attempts || 0) + 1;
        if (newAttempts >= maxAttempts) {
          const lockUntil = new Date(Date.now() + lockoutMinutes * 60000).toISOString();
          await this.db.runQuery(
            'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
            [newAttempts, lockUntil, user.id]
          );
          await this.logAuditEvent({ user_id: user.id, user_name: username, action_type: 'ACCOUNT_LOCKED', entity_type: 'user', entity_id: user.id, notes: `Compte verrouillé après ${newAttempts} tentatives échouées` });
          throw new Error(`Compte verrouillé après ${maxAttempts} tentatives. Réessayez dans ${lockoutMinutes} minutes.`);
        }
        await this.db.runQuery('UPDATE users SET login_attempts = ? WHERE id = ?', [newAttempts, user.id]);
        await this.logAuditEvent({ user_id: user.id, user_name: username, action_type: 'LOGIN_FAILED', entity_type: 'user', entity_id: user.id, notes: `Tentative de connexion échouée (${newAttempts}/${maxAttempts})` });
        throw new Error(AUTH_ERROR);
      }

      // Success — reset attempts
      await this.db.runQuery(
        'UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = ?, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), new Date().toISOString(), user.id]
      );

      await this.db.runQuery('INSERT INTO user_sessions (user_id, login_time) VALUES (?, ?)', [user.id, new Date().toISOString()]);

      // Track recent login
      try {
        await this.db.runQuery('INSERT INTO recent_logins (user_id, login_at) VALUES (?, ?)', [user.id, new Date().toISOString()]);
        // Keep only last 10 per user
        await this.db.runQuery(
          'DELETE FROM recent_logins WHERE user_id = ? AND id NOT IN (SELECT id FROM recent_logins WHERE user_id = ? ORDER BY login_at DESC LIMIT 10)',
          [user.id, user.id]
        );
      } catch (e) { /* non-critical */ }

      const permissions = await this.getUserPermissions(user.id, user.role);

      await this.logAuditEvent({ user_id: user.id, user_name: username, action_type: 'LOGIN_SUCCESS', entity_type: 'user', entity_id: user.id, notes: 'Connexion réussie' });

      return {
        id: user.id, username: user.username, full_name: user.full_name, email: user.email,
        phone: user.phone, role: user.role, badge_id: user.badge_id, is_server: !!user.is_server,
        avatar_url: user.avatar_url || null, use_pin: !!user.use_pin, permissions
      };
    } catch (error) {
      console.error('❌ Authentication error:', error.message);
      throw error;
    }
  }

  /**
   * Change user password (requires old password)
   * @param {number} userId
   * @param {string} oldPassword
   * @param {string} newPassword
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      const user = await this.db.getRow('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) throw new Error('Utilisateur non trouvé');

      const isValid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isValid) throw new Error('Mot de passe actuel incorrect');

      const pwValidation = await this.validatePassword(newPassword);
      if (!pwValidation.valid) throw new Error(pwValidation.errors[0]);

      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await this.db.runQuery('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, new Date().toISOString(), userId]);

      await this.logAuditEvent({ user_id: userId, user_name: user.username, action_type: 'PASSWORD_CHANGE', entity_type: 'user', entity_id: userId, notes: 'Mot de passe modifié' });

      return true;
    } catch (error) {
      console.error('❌ Error changing password:', error);
      throw error;
    }
  }

  /**
   * Admin reset user password (no old password required)
   * @param {number} userId
   * @param {string} newPassword
   */
  async adminResetPassword(userId, newPassword) {
    try {
      const user = await this.db.getRow('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) throw new Error('Utilisateur non trouvé');

      const pwValidation = await this.validatePassword(newPassword);
      if (!pwValidation.valid) throw new Error(pwValidation.errors[0]);

      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await this.db.runQuery('UPDATE users SET password_hash = ?, login_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?', [passwordHash, new Date().toISOString(), userId]);

      await this.logAuditEvent({ user_id: userId, user_name: user.username, action_type: 'PASSWORD_RESET', entity_type: 'user', entity_id: userId, notes: 'Mot de passe réinitialisé par admin' });

      return true;
    } catch (error) {
      console.error('❌ Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Logout user and close session
   * @param {number} userId - User ID
   */
  async logout(userId) {
    try {
      // Update last session logout time
      await this.db.runQuery(
        `UPDATE user_sessions 
         SET logout_time = ?, session_duration = (strftime('%s', ?) - strftime('%s', login_time)) / 60
         WHERE user_id = ? AND logout_time IS NULL`,
        [new Date().toISOString(), new Date().toISOString(), userId]
      );
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  }

  /**
   * Validate if user exists in database (for localStorage validation)
   * @param {number} userId - User ID to check
   * @returns {Promise<boolean>} True if user exists and is active
   */
  async validateUserExists(userId) {
    try {
      const user = await this.db.getRow(
        'SELECT id FROM users WHERE id = ? AND is_active = 1',
        [userId]
      );
      return !!user;
    } catch (error) {
      console.error('❌ Error validating user existence:', error);
      return false;
    }
  }

  /**
   * Get user permissions
   * @param {number} userId - User ID
   * @param {string} role - User role
   * @returns {Promise<Array>} Array of permissions
   */
  async getUserPermissions(userId, role) {
    try {
      // Admin has all permissions
      if (role === 'admin') {
        return ['all'];
      }

      // Get user-specific module permissions
      const modules = await this.db.getData(
        'SELECT module_name FROM user_modules WHERE user_id = ? AND can_read = 1',
        [userId]
      );

      return modules.map(m => m.module_name);
    } catch (error) {
      console.error('❌ Error getting permissions:', error);
      return [];
    }
  }

  /**
   * Get user modules with detailed permissions
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of module permissions
   */
  async getUserModules(userId) {
    try {
      const modules = await this.db.getData(
        'SELECT * FROM user_modules WHERE user_id = ?',
        [userId]
      );
      return modules;
    } catch (error) {
      console.error('❌ Error getting user modules:', error);
      throw error;
    }
  }

  /**
   * Set user module permissions
   * @param {number} userId - User ID
   * @param {Array} modules - Array of module permissions
   * @param {number} grantedBy - Admin user ID granting permissions
   */
  async setUserModules(userId, modules, grantedBy) {
    try {
      // Delete existing permissions
      await this.db.runQuery('DELETE FROM user_modules WHERE user_id = ?', [userId]);

      // Insert new permissions
      for (const module of modules) {
        await this.db.runQuery(
          `INSERT INTO user_modules 
           (user_id, module_name, can_read, can_create, can_update, can_delete, granted_by, granted_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            module.module_name,
            module.can_read ? 1 : 0,
            module.can_create ? 1 : 0,
            module.can_update ? 1 : 0,
            module.can_delete ? 1 : 0,
            grantedBy,
            new Date().toISOString()
          ]
        );
      }

      console.log('✅ User modules updated successfully');
    } catch (error) {
      console.error('❌ Error setting user modules:', error);
      throw error;
    }
  }

  /**
   * Check if user has permission for specific action
   * @param {number} userId - User ID
   * @param {string} moduleName - Module name
   * @param {string} action - Action (read, create, update, delete)
   * @returns {Promise<boolean>} True if user has permission
   */
  async checkUserPermission(userId, moduleName, action) {
    try {
      // Get user role first
      const user = await this.db.getRow('SELECT role FROM users WHERE id = ?', [userId]);
      
      // Admin has all permissions
      if (user && user.role === 'admin') {
        return true;
      }

      // Check specific module permission
      const permission = await this.db.getRow(
        `SELECT can_${action} FROM user_modules WHERE user_id = ? AND module_name = ?`,
        [userId, moduleName]
      );

      return permission && permission[`can_${action}`] === 1;
    } catch (error) {
      console.error('❌ Error checking permission:', error);
      return false;
    }
  }

  /**
   * Log audit event
   * @param {Object} event - Audit event data
   */
  async logAuditEvent(event) {
    try {
      await this.db.runQuery(
        `INSERT INTO audit_logs 
         (timestamp, user_id, user_name, action_type, entity_type, entity_id, old_value, new_value, ip_address, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.timestamp || new Date().toISOString(),
          event.user_id,
          event.user_name,
          event.action_type,
          event.entity_type || null,
          event.entity_id || null,
          event.old_value ? JSON.stringify(event.old_value) : null,
          event.new_value ? JSON.stringify(event.new_value) : null,
          event.ip_address || null,
          event.notes || null
        ]
      );
      console.log('📝 Audit event logged:', event.action_type);
    } catch (error) {
      console.error('❌ Error logging audit event:', error);
      // Don't throw - audit logging should not break main operations
    }
  }

  /**
   * Get audit logs with filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Array of audit logs
   */
  async getAuditLogs(filters = {}) {
    try {
      let sql = 'SELECT * FROM audit_logs WHERE 1=1';
      const params = [];

      if (filters.user_id) {
        sql += ' AND user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.action_type) {
        sql += ' AND action_type = ?';
        params.push(filters.action_type);
      }

      if (filters.entity_type) {
        sql += ' AND entity_type = ?';
        params.push(filters.entity_type);
      }

      if (filters.start_date) {
        sql += ' AND timestamp >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        sql += ' AND timestamp <= ?';
        params.push(filters.end_date);
      }

      sql += ' ORDER BY timestamp DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      const logs = await this.db.getData(sql, params);
      return logs;
    } catch (error) {
      console.error('❌ Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * Log cash drawer event
   * @param {Object} event - Cash drawer event data
   */
  async logCashDrawerEvent(event) {
    try {
      await this.db.runQuery(
        `INSERT INTO cash_drawer_events 
         (timestamp, user_id, user_name, action, reason, amount_expected, amount_actual, difference, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.timestamp || new Date().toISOString(),
          event.user_id,
          event.user_name,
          event.action,
          event.reason || null,
          event.amount_expected || null,
          event.amount_actual || null,
          event.difference || null,
          event.notes || null
        ]
      );
      console.log('💰 Cash drawer event logged:', event.action);
    } catch (error) {
      console.error('❌ Error logging cash drawer event:', error);
      // Don't throw - logging should not break main operations
    }
  }

  /**
   * Get cash drawer history with filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Array of cash drawer events
   */
  async getCashDrawerHistory(filters = {}) {
    try {
      let sql = 'SELECT * FROM cash_drawer_events WHERE 1=1';
      const params = [];

      if (filters.user_id) {
        sql += ' AND user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.action) {
        sql += ' AND action = ?';
        params.push(filters.action);
      }

      if (filters.start_date) {
        sql += ' AND timestamp >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        sql += ' AND timestamp <= ?';
        params.push(filters.end_date);
      }

      sql += ' ORDER BY timestamp DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      const events = await this.db.getData(sql, params);
      return events;
    } catch (error) {
      console.error('❌ Error getting cash drawer history:', error);
      throw error;
    }
  }

  /**
   * Get user sessions
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of user sessions
   */
  async getUserSessions(userId) {
    try {
      const sessions = await this.db.getData(
        'SELECT * FROM user_sessions WHERE user_id = ? ORDER BY login_time DESC LIMIT 50',
        [userId]
      );
      return sessions;
    } catch (error) {
      console.error('❌ Error getting user sessions:', error);
      throw error;
    }
  }

  /**
   * Create new user (admin only)
   * @param {Object} userData - User data
   * @param {number} createdBy - Admin user ID creating the user
   * @returns {Promise<Object>} Created user data
   */
  async createUser(userData, createdBy) {
    try {
      // Input validation
      const validation = this.validateUserInput(userData, false);
      if (!validation.valid) throw new Error(validation.errors[0]);

      if (userData.password) {
        const pwCheck = await this.validatePassword(userData.password);
        if (!pwCheck.valid) throw new Error(pwCheck.errors[0]);
      }

      // Check username uniqueness
      const existingUsername = await this.db.getRow('SELECT id FROM users WHERE username = ?', [userData.username]);
      if (existingUsername) throw new Error("Ce nom d'utilisateur existe déjà");

      // Check email uniqueness
      if (userData.email) {
        const existingEmail = await this.db.getRow('SELECT id FROM users WHERE email = ?', [userData.email]);
        if (existingEmail) throw new Error("Cet email est déjà utilisé");
      }

      // Check badge_id uniqueness
      if (userData.badge_id) {
        const existingBadge = await this.db.getRow('SELECT id FROM users WHERE badge_id = ?', [userData.badge_id]);
        if (existingBadge) throw new Error("Ce numéro de badge est déjà utilisé");
      }

      // Get creator username for audit
      const creator = await this.db.getRow('SELECT username FROM users WHERE id = ?', [createdBy]);
      const creatorName = creator ? creator.username : 'system';

      const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

      const result = await this.db.runQuery(
        `INSERT INTO users (username, password_hash, full_name, email, phone, role, badge_id, pin, is_active, is_server, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userData.username, passwordHash, userData.full_name || null, userData.email || null, userData.phone || null, userData.role || 'cashier', userData.badge_id || null, userData.pin || null, userData.is_active !== undefined ? (userData.is_active ? 1 : 0) : 1, userData.is_server ? 1 : 0, createdBy, new Date().toISOString(), new Date().toISOString()]
      );

      await this.logAuditEvent({
        user_id: createdBy, user_name: creatorName, action_type: 'USER_CREATE',
        entity_type: 'user', entity_id: result.lastID,
        new_value: { username: userData.username, role: userData.role, full_name: userData.full_name },
        notes: `Utilisateur ${userData.username} créé`
      });

      return { id: result.lastID, username: userData.username, role: userData.role };
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user (admin only)
   * @param {number} userId - User ID to update
   * @param {Object} userData - Updated user data
   * @param {number} updatedBy - Admin user ID performing update
   */
  async updateUser(userId, userData, updatedBy) {
    try {
      const oldUser = await this.db.getRow('SELECT * FROM users WHERE id = ?', [userId]);
      if (!oldUser) throw new Error('Utilisateur non trouvé');

      // Input validation (skip username/password for edits)
      const validation = this.validateUserInput(userData, true);
      if (!validation.valid) throw new Error(validation.errors[0]);

      // Prevent deactivating last admin
      if (userData.is_active === false && oldUser.role === 'admin') {
        const adminCount = await this.countActiveAdmins();
        if (adminCount <= 1) throw new Error("Impossible de désactiver le dernier administrateur");
      }

      // Check email uniqueness (excluding self)
      if (userData.email && userData.email !== oldUser.email) {
        const existingEmail = await this.db.getRow('SELECT id FROM users WHERE email = ? AND id != ?', [userData.email, userId]);
        if (existingEmail) throw new Error("Cet email est déjà utilisé");
      }

      // Check badge_id uniqueness (excluding self)
      if (userData.badge_id && userData.badge_id !== oldUser.badge_id) {
        const existingBadge = await this.db.getRow('SELECT id FROM users WHERE badge_id = ? AND id != ?', [userData.badge_id, userId]);
        if (existingBadge) throw new Error("Ce numéro de badge est déjà utilisé");
      }

      const creator = await this.db.getRow('SELECT username FROM users WHERE id = ?', [updatedBy]);
      const creatorName = creator ? creator.username : 'system';

      const updates = [];
      const params = [];

      const fields = ['full_name', 'email', 'phone', 'role', 'badge_id', 'pin'];
      for (const field of fields) {
        if (userData[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(userData[field] || null);
        }
      }
      if (userData.is_active !== undefined) { updates.push('is_active = ?'); params.push(userData.is_active ? 1 : 0); }
      if (userData.is_server !== undefined) { updates.push('is_server = ?'); params.push(userData.is_server ? 1 : 0); }
      if (userData.password) {
        const pwCheck = await this.validatePassword(userData.password);
        if (!pwCheck.valid) throw new Error(pwCheck.errors[0]);
        const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);
        updates.push('password_hash = ?');
        params.push(passwordHash);
        updates.push('login_attempts = ?');
        params.push(0);
        updates.push('locked_until = ?');
        params.push(null);
      }

      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(userId);

      await this.db.runQuery(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

      await this.logAuditEvent({
        user_id: updatedBy, user_name: creatorName, action_type: 'USER_UPDATE',
        entity_type: 'user', entity_id: userId,
        old_value: { username: oldUser.username, role: oldUser.role, full_name: oldUser.full_name, is_active: oldUser.is_active },
        new_value: { username: oldUser.username, ...userData },
        notes: `Utilisateur ${oldUser.username} mis à jour`
      });
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user (soft delete - admin only, prevents last admin)
   * @param {number} userId - User ID to delete
   * @param {number} deletedBy - Admin user ID performing deletion
   */
  async deleteUser(userId, deletedBy) {
    try {
      const user = await this.db.getRow('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) throw new Error('Utilisateur non trouvé');

      // Prevent deleting last admin
      if (user.role === 'admin') {
        const adminCount = await this.countActiveAdmins();
        if (adminCount <= 1) throw new Error("Impossible de supprimer le dernier administrateur");
      }

      // Prevent self-deletion
      if (userId === deletedBy) throw new Error("Vous ne pouvez pas supprimer votre propre compte");

      const deleter = await this.db.getRow('SELECT username FROM users WHERE id = ?', [deletedBy]);
      const deleterName = deleter ? deleter.username : 'system';

      await this.db.runQuery('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?', [new Date().toISOString(), userId]);

      await this.db.runQuery(
        "UPDATE user_sessions SET logout_time = ?, session_duration = (strftime('%s', ?) - strftime('%s', login_time)) / 60 WHERE user_id = ? AND logout_time IS NULL",
        [new Date().toISOString(), new Date().toISOString(), userId]
      );

      await this.logAuditEvent({
        user_id: deletedBy, user_name: deleterName, action_type: 'USER_DELETE',
        entity_type: 'user', entity_id: userId,
        old_value: { username: user.username, role: user.role },
        notes: `Utilisateur ${user.username} désactivé`
      });
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Reactivate a soft-deleted user by username (reuses the existing row)
   * @param {Object} userData - New user data (username, password, email, phone, role, etc.)
   * @returns {Promise<Object>} Reactivated user info
   */
  async reactivateUser(userData) {
    try {
      const existing = await this.db.getRow(
        'SELECT id, username FROM users WHERE username = ?',
        [userData.username]
      );

      if (!existing) {
        throw new Error(`User ${userData.username} not found for reactivation`);
      }

      const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

      await this.db.runQuery(
        `UPDATE users SET 
         password_hash = ?, full_name = ?, email = ?, phone = ?, role = ?,
         is_active = 1, updated_at = ?
         WHERE id = ?`,
        [
          passwordHash,
          userData.full_name || userData.username,
          userData.email || null,
          userData.phone || null,
          userData.role || 'cashier',
          new Date().toISOString(),
          existing.id
        ]
      );

      console.log('✅ User reactivated successfully:', userData.username);
      return { id: existing.id, username: userData.username, role: userData.role };
    } catch (error) {
      console.error('❌ Error reactivating user:', error);
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Login Screen Methods
  // ══════════════════════════════════════════════════════════════

  /**
   * Get all active users for the visual login screen
   * @returns {Promise<Array>}
   */
  async getActiveUsersForLogin() {
    try {
      return await this.db.getData(
        `SELECT id, username, full_name, role, avatar_url, use_pin, is_active, is_server, locked_until, last_login
         FROM users WHERE is_active = 1 ORDER BY full_name ASC, username ASC`
      );
    } catch (error) {
      console.error('❌ Error getting active users for login:', error);
      return [];
    }
  }

  /**
   * Authenticate user by PIN (4-6 digits)
   * @param {number} userId
   * @param {string} pin
   * @returns {Promise<Object>}
   */
  async authenticateByPin(userId, pin) {
    try {
      const user = await this.db.getRow('SELECT * FROM users WHERE id = ? AND is_active = 1', [userId]);
      const AUTH_ERROR = 'Échec de l\'authentification. PIN incorrect.';

      if (!user) {
        await bcrypt.hash('dummy', SALT_ROUNDS);
        throw new Error(AUTH_ERROR);
      }

      if (!user.is_active) {
        throw new Error('Compte désactivé. Contactez un administrateur.');
      }

      if (!user.pin_hash || !user.use_pin) {
        throw new Error('PIN non configuré pour cet utilisateur.');
      }

      // Check lockout
      const settings = await this.getSecuritySettings();
      const maxAttempts = settings.max_login_attempts || 5;
      const lockoutMinutes = settings.lockout_duration_minutes || 15;

      if (user.locked_until) {
        const lockExpiry = new Date(user.locked_until);
        if (lockExpiry > new Date()) {
          const remaining = Math.ceil((lockExpiry - new Date()) / 60000);
          throw new Error(`Compte verrouillé. Réessayez dans ${remaining} minute(s).`);
        }
        await this.db.runQuery('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
        user.login_attempts = 0;
      }

      const isValid = await bcrypt.compare(pin, user.pin_hash);
      if (!isValid) {
        const newAttempts = (user.login_attempts || 0) + 1;
        if (newAttempts >= maxAttempts) {
          const lockUntil = new Date(Date.now() + lockoutMinutes * 60000).toISOString();
          await this.db.runQuery('UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?', [newAttempts, lockUntil, user.id]);
          await this.logAuditEvent({ user_id: user.id, user_name: user.username, action_type: 'ACCOUNT_LOCKED', entity_type: 'user', entity_id: user.id, notes: `Compte verrouillé après ${newAttempts} tentatives PIN échouées` });
          throw new Error(`Compte verrouillé après ${maxAttempts} tentatives. Réessayez dans ${lockoutMinutes} minutes.`);
        }
        await this.db.runQuery('UPDATE users SET login_attempts = ? WHERE id = ?', [newAttempts, user.id]);
        await this.logAuditEvent({ user_id: user.id, user_name: user.username, action_type: 'LOGIN_FAILED', entity_type: 'user', entity_id: user.id, notes: `Tentative PIN échouée (${newAttempts}/${maxAttempts})` });
        throw new Error(AUTH_ERROR);
      }

      // Success
      await this.db.runQuery('UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = ?, updated_at = ? WHERE id = ?', [new Date().toISOString(), new Date().toISOString(), user.id]);
      await this.db.runQuery('INSERT INTO user_sessions (user_id, login_time) VALUES (?, ?)', [user.id, new Date().toISOString()]);

      try {
        await this.db.runQuery('INSERT INTO recent_logins (user_id, login_at) VALUES (?, ?)', [user.id, new Date().toISOString()]);
        await this.db.runQuery('DELETE FROM recent_logins WHERE user_id = ? AND id NOT IN (SELECT id FROM recent_logins WHERE user_id = ? ORDER BY login_at DESC LIMIT 10)', [user.id, user.id]);
      } catch (e) { /* non-critical */ }

      const permissions = await this.getUserPermissions(user.id, user.role);
      await this.logAuditEvent({ user_id: user.id, user_name: user.username, action_type: 'LOGIN_SUCCESS', entity_type: 'user', entity_id: user.id, notes: 'Connexion réussie (PIN)' });

      return {
        id: user.id, username: user.username, full_name: user.full_name, email: user.email,
        phone: user.phone, role: user.role, badge_id: user.badge_id, is_server: !!user.is_server,
        avatar_url: user.avatar_url || null, use_pin: true, permissions
      };
    } catch (error) {
      console.error('❌ PIN Authentication error:', error.message);
      throw error;
    }
  }

  /**
   * Get recent logins for the login screen
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getRecentLogins(limit = 5) {
    try {
      return await this.db.getData(
        `SELECT DISTINCT u.id, u.username, u.full_name, u.role, u.avatar_url,
                MAX(rl.login_at) as last_login_at
         FROM recent_logins rl
         JOIN users u ON u.id = rl.user_id
         WHERE u.is_active = 1
         GROUP BY u.id
         ORDER BY MAX(rl.login_at) DESC
         LIMIT ?`,
        [limit]
      );
    } catch (error) {
      console.error('❌ Error getting recent logins:', error);
      return [];
    }
  }

  /**
   * Update user avatar
   * @param {number} userId
   * @param {string} avatarUrl
   */
  async updateUserAvatar(userId, avatarUrl) {
    try {
      await this.db.runQuery('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?', [avatarUrl, new Date().toISOString(), userId]);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating user avatar:', error);
      throw error;
    }
  }

  /**
   * Set or clear user PIN
   * @param {number} userId
   * @param {string|null} pin - null to clear PIN
   * @param {boolean} usePin
   */
  async setUserPin(userId, pin, usePin = true) {
    try {
      const user = await this.db.getRow('SELECT id FROM users WHERE id = ?', [userId]);
      if (!user) throw new Error('Utilisateur non trouvé');

      let pinHash = null;
      if (pin && usePin) {
        pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
      }

      await this.db.runQuery(
        'UPDATE users SET pin_hash = ?, use_pin = ?, updated_at = ? WHERE id = ?',
        [pinHash, usePin ? 1 : 0, new Date().toISOString(), userId]
      );

      await this.logAuditEvent({
        user_id: userId, user_name: user.username || 'unknown',
        action_type: pinHash ? 'PIN_SET' : 'PIN_CLEARED',
        entity_type: 'user', entity_id: userId,
        notes: pinHash ? 'PIN configuré' : 'PIN supprimé'
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error setting user PIN:', error);
      throw error;
    }
  }

  /**
   * Validate a password against security settings
   * @param {string} password
   * @returns {Promise<{valid: boolean, errors: string[], checks: Object}>}
   */
  async validatePasswordDetailed(password) {
    const settings = await this.getSecuritySettings();
    const errors = [];
    const checks = {
      minLength: { label: `${settings.password_min_length || 6} caractères minimum`, passed: false },
      uppercase: { label: 'Majuscule', passed: false },
      lowercase: { label: 'Minuscule', passed: false },
      numbers: { label: 'Chiffre', passed: false },
      special: { label: 'Caractère spécial', passed: false },
    };

    const minLen = settings.password_min_length || 6;
    checks.minLength.passed = password && password.length >= minLen;
    if (!checks.minLength.passed) errors.push(`Minimum ${minLen} caractères`);

    checks.uppercase.passed = /[A-Z]/.test(password);
    if (settings.password_require_uppercase && !checks.uppercase.passed) errors.push('Majuscule requise');

    checks.lowercase.passed = /[a-z]/.test(password);
    if (!checks.lowercase.passed) errors.push('Minuscule requise');

    checks.numbers.passed = /[0-9]/.test(password);
    if (settings.password_require_numbers && !checks.numbers.passed) errors.push('Chiffre requis');

    checks.special.passed = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (settings.password_require_special && !checks.special.passed) errors.push('Caractère spécial requis');

    return { valid: errors.length === 0, errors, checks };
  }
}

module.exports = ElectronAuthManager;
