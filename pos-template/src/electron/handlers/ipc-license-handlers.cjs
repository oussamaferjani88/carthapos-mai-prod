'use strict';

/**
 * License IPC Handlers
 * Canonical contract: { isValid, status, reason, license }
 */

const { ipcMain } = require('electron');
const LicenseVerifier = require('../license/LicenseVerifier.cjs');
const { detectUSBDrives } = require('../license/USBIdentityProvider.cjs');

function registerLicenseHandlers({ app, loadAppConfig }) {
  const verifier = new LicenseVerifier({ app, loadAppConfig });

  ipcMain.handle('validate-license', async () => {
    try {
      return await verifier.validateLocal();
    } catch (error) {
      console.error('[validate-license] error:', error);
      return { isValid: false, status: null, reason: 'LICENSE_CORRUPTED', license: null };
    }
  });

  ipcMain.handle('activate-license', async () => {
    try {
      return await verifier.activate();
    } catch (error) {
      console.error('[activate-license] error:', error);
      return { isValid: false, status: 'ACTIVATION_REQUIRED', reason: 'ACTIVATION_REQUIRED', license: null };
    }
  });

  ipcMain.handle('detect-usb-drives', async () => {
    try {
      return await detectUSBDrives();
    } catch (error) {
      console.error('[detect-usb-drives] error:', error);
      return [];
    }
  });
}

module.exports = { registerLicenseHandlers };
