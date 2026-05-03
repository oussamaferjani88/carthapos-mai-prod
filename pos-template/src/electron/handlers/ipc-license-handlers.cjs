/**
 * License IPC Handlers
 * Handles USB detection and license validation
 */

const { ipcMain } = require('electron');

function registerLicenseHandlers(detectUSBDrives, loadAppConfig) {
  console.log('🔑 Registering license IPC handlers...');

  ipcMain.handle('validate-license', async () => {
    console.log('🔐 IPC: validate-license called');
    const config = loadAppConfig();
    return config && config.license ? true : false;
  });

  ipcMain.handle('detect-usb-drives', () => {
    console.log('🔍 IPC: detect-usb-drives called');
    return detectUSBDrives();
  });
  
  console.log('✅ License IPC handlers registered');
}

module.exports = { registerLicenseHandlers };
