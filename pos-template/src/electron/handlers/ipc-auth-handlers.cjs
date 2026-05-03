/**
 * IPC Authentication Handlers
 * Handles all authentication-related IPC communication
 */

const { ipcMain } = require('electron');

class IPCAuthHandlers {
  constructor(logger, dbManager, authManager) {
    this.logger = logger;
    this.dbManager = dbManager;
    this.authManager = authManager;
  }

  /**
   * Initialize managers if not already initialized
   */
  async initializeManagers() {
    try {
      if (!this.dbManager || !this.authManager) {
        throw new Error('Managers not initialized');
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize managers:', error);
      throw error;
    }
  }

  /**
   * Register all authentication IPC handlers
   */
  registerHandlers() {
    this.logger.info('📝 Registering authentication IPC handlers...');

    // First-time setup check
    ipcMain.handle('needs-first-time-setup', async () => {
      try {
        await this.initializeManagers();
        return await this.authManager.needsFirstTimeSetup();
      } catch (error) {
        this.logger.error('❌ Error checking first-time setup:', error);
        throw error;
      }
    });

    // Check if admin password needs reset (demo password detected)
    ipcMain.handle('needs-admin-password-reset', async () => {
      try {
        await this.initializeManagers();
        return await this.authManager.needsAdminPasswordReset();
      } catch (error) {
        this.logger.error('❌ Error checking admin password reset need:', error);
        return false;
      }
    });

    // Create admin user
    ipcMain.handle('create-admin-user', async (event, userData) => {
      try {
        await this.initializeManagers();
        return await this.authManager.createAdminUser(userData);
      } catch (error) {
        this.logger.error('❌ Error creating admin user:', error);
        throw error;
      }
    });

    // Authenticate user
    ipcMain.handle('authenticate-user', async (event, username, password) => {
      try {
        await this.initializeManagers();
        return await this.authManager.authenticateUser(username, password);
      } catch (error) {
        this.logger.error('❌ Error authenticating user:', error);
        throw error;
      }
    });

    // Change password
    ipcMain.handle('change-password', async (event, userId, oldPassword, newPassword) => {
      try {
        await this.initializeManagers();
        return await this.authManager.changePassword(userId, oldPassword, newPassword);
      } catch (error) {
        this.logger.error('❌ Error changing password:', error);
        throw error;
      }
    });

    // Update admin password directly (used when default demo password detected)
    ipcMain.handle('update-admin-password', async (event, newPassword) => {
      try {
        await this.initializeManagers();
        return await this.authManager.updateAdminPassword(newPassword);
      } catch (error) {
        this.logger.error('❌ Error updating admin password:', error);
        throw error;
      }
    });

    // Create user
    ipcMain.handle('create-user', async (event, userData, createdBy) => {
      try {
        await this.initializeManagers();
        return await this.authManager.createUser(userData, createdBy);
      } catch (error) {
        this.logger.error('❌ Error creating user:', error);
        throw error;
      }
    });

    // Update user
    ipcMain.handle('update-user', async (event, userId, userData, updatedBy) => {
      try {
        await this.initializeManagers();
        return await this.authManager.updateUser(userId, userData, updatedBy);
      } catch (error) {
        this.logger.error('❌ Error updating user:', error);
        throw error;
      }
    });

    // Delete user
    ipcMain.handle('delete-user', async (event, userId) => {
      try {
        await this.initializeManagers();
        const deletedBy = 1; // TODO: Get from session
        return await this.authManager.deleteUser(userId, deletedBy);
      } catch (error) {
        this.logger.error('❌ Error deleting user:', error);
        throw error;
      }
    });

    // Get users
    ipcMain.handle('get-users', async () => {
      try {
        await this.initializeManagers();
        return await this.dbManager.getData(
          'SELECT id, username, full_name, email, role, badge_id, is_active, last_login FROM users WHERE is_active = 1'
        );
      } catch (error) {
        this.logger.error('❌ Error getting users:', error);
        throw error;
      }
    });

    // Validate user exists (for localStorage validation)
    ipcMain.handle('validate-user-exists', async (event, userId) => {
      try {
        await this.initializeManagers();
        return await this.authManager.validateUserExists(userId);
      } catch (error) {
        this.logger.error('❌ Error validating user existence:', error);
        return false;
      }
    });

    this.logger.info('✅ Auth IPC handlers registered');
  }
}

// Functional export expected by public/electron-modular.cjs
// This registers IPC handlers using a locally-initialized set of managers.
// It avoids tight coupling to main's module-scoped instances and works in packaged builds.
function registerAuthHandlers(/* initializeManagers (optional) */) {
  // Lazy-create our own logger and managers
  const { LoggerService } = require('../services/LoggerService.cjs');
  const ElectronDatabaseManager = require('../ElectronDatabaseManager.cjs');
  const ElectronAuthManager = require('../ElectronAuthManager.cjs');

  const logger = new LoggerService();
  let dbManager = null;
  let authManager = null;

  async function ensureManagers() {
    if (!dbManager) {
      dbManager = new ElectronDatabaseManager();
      await dbManager.initializeDatabase();
    }
    if (!authManager) {
      authManager = new ElectronAuthManager(dbManager);
    }
  }

  logger.info('📝 Registering authentication IPC handlers (function export)...');

  // First-time setup check
  ipcMain.handle('needs-first-time-setup', async () => {
    try {
      await ensureManagers();
      return await authManager.needsFirstTimeSetup();
    } catch (error) {
      logger.error('❌ Error checking first-time setup:', error);
      throw error;
    }
  });

  // Check if admin password needs reset (demo password detected)
  ipcMain.handle('needs-admin-password-reset', async () => {
    try {
      await ensureManagers();
      return await authManager.needsAdminPasswordReset();
    } catch (error) {
      logger.error('❌ Error checking admin password reset need:', error);
      return false;
    }
  });

  // Create admin user
  ipcMain.handle('create-admin-user', async (event, userData) => {
    try {
      await ensureManagers();
      return await authManager.createAdminUser(userData);
    } catch (error) {
      logger.error('❌ Error creating admin user:', error);
      throw error;
    }
  });

  // Authenticate user
  ipcMain.handle('authenticate-user', async (event, username, password) => {
    try {
      await ensureManagers();
      return await authManager.authenticateUser(username, password);
    } catch (error) {
      logger.error('❌ Error authenticating user:', error);
      throw error;
    }
  });

  // Change password
  ipcMain.handle('change-password', async (event, userId, oldPassword, newPassword) => {
    try {
      await ensureManagers();
      return await authManager.changePassword(userId, oldPassword, newPassword);
    } catch (error) {
      logger.error('❌ Error changing password:', error);
      throw error;
    }
  });

  // Update admin password directly (used when default demo password detected)
  ipcMain.handle('update-admin-password', async (event, newPassword) => {
    try {
      await ensureManagers();
      return await authManager.updateAdminPassword(newPassword);
    } catch (error) {
      logger.error('❌ Error updating admin password:', error);
      throw error;
    }
  });

  // Get users (basic list)
  ipcMain.handle('get-users', async () => {
    try {
      await ensureManagers();
      return await dbManager.getData(
        'SELECT id, username, full_name, email, role, badge_id, is_active, last_login FROM users WHERE is_active = 1'
      );
    } catch (error) {
      logger.error('❌ Error getting users:', error);
      throw error;
    }
  });

  // Validate user exists (for localStorage validation)
  ipcMain.handle('validate-user-exists', async (event, userId) => {
    try {
      await ensureManagers();
      return await authManager.validateUserExists(userId);
    } catch (error) {
      logger.error('❌ Error validating user existence:', error);
      return false;
    }
  });

  // Logout handler
  ipcMain.handle('logout', async (event, userId) => {
    try {
      await ensureManagers();
      await authManager.logout(userId);
      return { success: true };
    } catch (error) {
      logger.error('❌ Error logging out user:', error);
      return { success: false, error: error?.message || 'Logout failed' };
    }
  });

  logger.info('✅ Auth IPC handlers registered (function export)');
}

module.exports = {
  // Class export (legacy/internals)
  default: IPCAuthHandlers,
  // Named function export used by electron-modular.cjs
  registerAuthHandlers
};
