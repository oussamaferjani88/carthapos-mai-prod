/**
 * Window Manager - Handles Electron window creation and management
 */

const { BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

class WindowManager {
  constructor(logger) {
    this.logger = logger;
    this.mainWindow = null;
  }

  createWindow(appConfig = {}) {
    this.logger.info('🪟 Creating main window...');

    try {
      const windowOptions = {
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        frame: true,
        backgroundColor: '#FFFFFF',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          preload: path.join(__dirname, '../../public/preload.js'),
          webSecurity: true,
          allowRunningInsecureContent: false
        },
        icon: path.join(__dirname, '../../public/favicon.ico'),
        show: false,
        title: appConfig.theme?.businessName || 'POS System'
      };

      this.mainWindow = new BrowserWindow(windowOptions);

      // Load the app
      this.loadApp();

      // Setup window event handlers
      this.setupWindowEvents();

      this.logger.info('✅ Window creation completed successfully');
      return this.mainWindow;
    } catch (error) {
      this.logger.error('❌ Error in createWindow:', error);
      throw error;
    }
  }

  loadApp() {
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      this.logger.info('🔧 Running in DEVELOPMENT mode');
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.logger.info('📦 Running in PRODUCTION mode');
      const distPath = path.join(__dirname, '../../dist');
      const indexPath = path.join(distPath, 'index.html');

      this.logger.info('📂 Dist path:', distPath);
      this.logger.info('📄 Index path:', indexPath);

      if (fs.existsSync(distPath)) {
        this.logger.info('✅ Dist directory exists');
        const distFiles = fs.readdirSync(distPath);
        this.logger.info('📁 Dist contents:', distFiles);
      } else {
        this.logger.error('❌ Dist directory does not exist!');
      }

      this.mainWindow.loadFile(indexPath);
      // Enable DevTools in production for debugging
      this.mainWindow.webContents.openDevTools();
    }
  }

  setupWindowEvents() {
    this.mainWindow.once('ready-to-show', () => {
      this.logger.info('✅ Main window ready to show');
      this.mainWindow.show();
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      this.logger.info('✅ Page finished loading');
    });

    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      this.logger.error('❌ Page failed to load:', errorCode, errorDescription);
    });

    // Add listener for failed resource loads
    this.mainWindow.webContents.session.webRequest.onErrorOccurred((details) => {
      this.logger.error('❌ Resource failed to load:', details.url, 'Error:', details.error);
    });

    // Add listener for completed resource loads
    this.mainWindow.webContents.session.webRequest.onCompleted((details) => {
      if (details.url.includes('.css') || details.url.includes('.js')) {
        this.logger.info(`✅ Resource loaded successfully: ${details.url} (Status: ${details.statusCode})`);
      }
    });

    this.mainWindow.on('closed', () => {
      this.logger.info('🔒 Main window closed');
      this.mainWindow = null;
    });
  }

  getMainWindow() {
    return this.mainWindow;
  }

  showError(title, message) {
    dialog.showErrorBox(title, message);
  }
}

module.exports = WindowManager;
