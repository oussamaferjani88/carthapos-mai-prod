/**
 * IPC App Handlers
 * Handles general application IPC communication (config, window, etc.)
 */

const { ipcMain } = require('electron');

class IPCAppHandlers {
  constructor(logger, appConfig, windowManager) {
    this.logger = logger;
    this.appConfig = appConfig;
    this.windowManager = windowManager;
  }

  /**
   * Register all app IPC handlers
   */
  registerHandlers() {
    this.logger.info('📝 Registering app IPC handlers...');

    // Get app configuration
    ipcMain.handle('get-app-config', () => {
      this.logger.info('⚙️ Getting app configuration');
      return this.appConfig;
    });

    // Window controls
    ipcMain.handle('window:minimize', () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) mainWindow.minimize();
    });

    ipcMain.handle('window:maximize', () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
      }
    });

    ipcMain.handle('window:close', () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) mainWindow.close();
    });

    ipcMain.handle('window:isMaximized', () => {
      const mainWindow = this.windowManager.getMainWindow();
      return mainWindow ? mainWindow.isMaximized() : false;
    });

    // Settings
    ipcMain.handle('settings:get', async () => {
      // TODO: Implement settings storage
      this.logger.warn('⚠️ Settings storage not yet implemented');
      return null;
    });

    ipcMain.handle('settings:set', async () => {
      // TODO: Implement settings storage
      this.logger.warn('⚠️ Settings storage not yet implemented');
      return { success: false };
    });

    ipcMain.handle('settings:getAll', async () => {
      // TODO: Implement settings storage
      this.logger.warn('⚠️ Settings storage not yet implemented');
      return {};
    });

    // Notifications
    ipcMain.handle('notifications:show', async (_event, title, body) => {
      // TODO: Implement native notifications
      this.logger.info(`📢 Notification: ${title} - ${body}`);
      return { success: true };
    });

    this.logger.info('✅ App IPC handlers registered');
  }
}

// Functional export for electron-modular.cjs
function registerAppHandlers(loadAppConfig) {
  const { ipcMain } = require('electron');
  
  // Get app configuration
  ipcMain.handle('get-app-config', () => {
    console.log('⚙️ Getting app configuration');
    return loadAppConfig();
  });

  // Settings (placeholder)
  ipcMain.handle('settings:get', async () => {
    console.log('⚠️ Settings storage not yet implemented');
    return null;
  });

  ipcMain.handle('settings:set', async () => {
    console.log('⚠️ Settings storage not yet implemented');
    return { success: false };
  });

  ipcMain.handle('settings:getAll', async () => {
    console.log('⚠️ Settings storage not yet implemented');
    return {};
  });

  // Notifications (placeholder)
  ipcMain.handle('notifications:show', async (_event, title, body) => {
    console.log(`📢 Notification: ${title} - ${body}`);
    return { success: true };
  });
  
  console.log('✅ App IPC handlers registered');
}

module.exports = { IPCAppHandlers, registerAppHandlers };
