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
          userData.full_name || 'Administrateur',
          'admin',
          1,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );

      const user = {
        id: result.lastID,
        username: userData.username || 'admin',
        full_name: userData.full_name || 'Administrateur',
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
   * Authenticate user with username and password
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @returns {Promise<Object>} Authenticated user data
   */
  async authenticateUser(username, password) {
    try {
      console.log('🔐 Authenticating user:', username);

      // Get user from database
      const user = await this.db.getRow(
        'SELECT * FROM users WHERE username = ? AND is_active = 1',
        [username]
      );

      if (!user) {
        throw new Error('Utilisateur non trouvé ou inactif');
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        throw new Error('Mot de passe incorrect');
      }

      // Update last login
      await this.db.runQuery(
        'UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), new Date().toISOString(), user.id]
      );

      // Create session
      await this.db.runQuery(
        'INSERT INTO user_sessions (user_id, login_time) VALUES (?, ?)',
        [user.id, new Date().toISOString()]
      );

      // Get user permissions
      const permissions = await this.getUserPermissions(user.id, user.role);

      console.log('✅ User authenticated successfully');
      return {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        badge_id: user.badge_id,
        permissions: permissions
      };
    } catch (error) {
      console.error('❌ Authentication error:', error);
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
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

      // Insert user
      const result = await this.db.runQuery(
        `INSERT INTO users 
         (username, password_hash, full_name, email, phone, role, badge_id, pin, is_active, created_by, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.username,
          passwordHash,
          userData.full_name || null,
          userData.email || null,
          userData.phone || null,
          userData.role || 'cashier',
          userData.badge_id || null,
          userData.pin || null,
          userData.is_active !== undefined ? userData.is_active : 1,
          createdBy,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );

      // Log audit event
      await this.logAuditEvent({
        user_id: createdBy,
        user_name: 'admin',
        action_type: 'USER_CREATE',
        entity_type: 'user',
        entity_id: result.lastID,
        new_value: { username: userData.username, role: userData.role },
        notes: `User ${userData.username} created`
      });

      console.log('✅ User created successfully');
      return {
        id: result.lastID,
        username: userData.username,
        role: userData.role
      };
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
      // Get old user data for audit
      const oldUser = await this.db.getRow('SELECT * FROM users WHERE id = ?', [userId]);

      const updates = [];
      const params = [];

      if (userData.full_name !== undefined) {
        updates.push('full_name = ?');
        params.push(userData.full_name);
      }

      if (userData.email !== undefined) {
        updates.push('email = ?');
        params.push(userData.email || null);
      }

      if (userData.phone !== undefined) {
        updates.push('phone = ?');
        params.push(userData.phone || null);
      }

      if (userData.role !== undefined) {
        updates.push('role = ?');
        params.push(userData.role);
      }

      if (userData.badge_id !== undefined) {
        updates.push('badge_id = ?');
        params.push(userData.badge_id);
      }

      if (userData.pin !== undefined) {
        updates.push('pin = ?');
        params.push(userData.pin);
      }

      if (userData.is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(userData.is_active ? 1 : 0);
      }

      if (userData.password) {
        const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);
        updates.push('password_hash = ?');
        params.push(passwordHash);
      }

      updates.push('updated_at = ?');
      params.push(new Date().toISOString());

      params.push(userId);

      await this.db.runQuery(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Log audit event
      await this.logAuditEvent({
        user_id: updatedBy,
        user_name: 'admin',
        action_type: 'USER_UPDATE',
        entity_type: 'user',
        entity_id: userId,
        old_value: oldUser,
        new_value: userData,
        notes: `User ${oldUser.username} updated`
      });

      console.log('✅ User updated successfully');
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user (soft delete - admin only)
   * @param {number} userId - User ID to delete
   * @param {number} deletedBy - Admin user ID performing deletion
   */
  async deleteUser(userId, deletedBy) {
    try {
      // Get user data for audit
      const user = await this.db.getRow('SELECT * FROM users WHERE id = ?', [userId]);

      // Soft delete - set is_active to 0
      await this.db.runQuery(
        'UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), userId]
      );

      // Log audit event
      await this.logAuditEvent({
        user_id: deletedBy,
        user_name: 'admin',
        action_type: 'USER_DELETE',
        entity_type: 'user',
        entity_id: userId,
        old_value: user,
        notes: `User ${user.username} deleted (deactivated)`
      });

      console.log('✅ User deleted successfully');
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
}

module.exports = ElectronAuthManager;
