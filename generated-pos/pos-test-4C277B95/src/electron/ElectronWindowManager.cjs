/**
 * Electron Window Manager
 * Extracted from monolithic electron.js for better organization
 */

const { BrowserWindow } = require('electron');
const path = require('path');

class ElectronWindowManager {
  constructor() {
    this.mainWindow = null;
    this.appConfig = null;
  }

  setAppConfig(config) {
    this.appConfig = config;
  }

  /**
   * Create the main application window
   * @param {BrowserWindowConstructorOptions} options - Optional BrowserWindow options
   *   (used by the main process to inject the correct preload path, sizing, etc.)
   */
  createMainWindow(options = {}) {
    try {
      // Use business name from config
      const businessName = this.appConfig?.theme?.businessName || 
                          this.appConfig?.license?.clientName || 
                          'POS System';
      const windowTitle = businessName;
      
      console.log('🏪 Creating window with title:', windowTitle);
      console.log('📋 Current app config:', JSON.stringify(this.appConfig, null, 2));
      
      // Merge default options with caller-provided options.
      // IMPORTANT:
      // - We always enforce secure defaults (no nodeIntegration, contextIsolation true)
      // - We DO NOT override a provided `preload` path so the main process
      //   (electron-modular.cjs) can point to the correct unpacked preload.js
      const defaultWebPreferences = {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false
      };

      const mergedWebPreferences = {
        ...defaultWebPreferences,
        ...(options.webPreferences || {})
      };

      const windowOptions = {
        width: 1200,
        height: 800,
        ...options,
        webPreferences: mergedWebPreferences,
        title: windowTitle,
        show: false,
        icon: this.getAppIcon()
      };

      this.mainWindow = new BrowserWindow(windowOptions);

      this.loadApplication();
      this.setupWindowEvents();
      
      return this.mainWindow;
      
    } catch (error) {
      console.error('❌ Error creating main window:', error);
      throw error;
    }
  }

  /**
   * Load the application URL
   */
  loadApplication() {
    const isDev = process.env.NODE_ENV === 'development';
    console.log('🚀 Starting app in mode:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');
    console.log('🚀 NODE_ENV:', process.env.NODE_ENV);
    
    if (isDev) {
      console.log('🌐 Loading from dev server: http://localhost:5173');
      this.mainWindow.loadURL('http://localhost:5173');
      
      // Open DevTools in development
      this.mainWindow.webContents.openDevTools();
    } else {
      console.log('📦 Loading from file system');
      const indexPath = path.join(__dirname, '../../dist/index.html');
      console.log('📁 Index path:', indexPath);
      
      this.mainWindow.loadFile(indexPath);
    }
  }

  /**
   * Setup window event handlers
   */
  setupWindowEvents() {
    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      console.log('✅ Window ready to show');
      this.mainWindow.show();
      
      // Focus the window
      if (this.mainWindow) {
        this.mainWindow.focus();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      console.log('🚪 Main window closed');
      this.mainWindow = null;
    });

    // Handle navigation
    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      
      // Allow navigation to localhost in development
      if (parsedUrl.origin !== 'http://localhost:5173' && 
          !navigationUrl.startsWith('file://')) {
        console.log('🚫 Blocked navigation to:', navigationUrl);
        event.preventDefault();
      }
    });

    // Log when page finishes loading
    this.mainWindow.webContents.once('did-finish-load', () => {
      console.log('✅ Page finished loading');
    });

    // Handle load failures
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('❌ Failed to load page:', errorCode, errorDescription);
    });
  }

  /**
   * Get application icon path
   */
  getAppIcon() {
    try {
      const iconPath = path.join(__dirname, '../../public/favicon.ico');
      return iconPath;
    } catch (error) {
      console.warn('⚠️ Could not load app icon:', error.message);
      return null;
    }
  }

  /**
   * Update window title
   */
  updateWindowTitle(title) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.setTitle(title);
      console.log('🏷️ Window title updated to:', title);
    }
  }

  /**
   * Get main window instance
   */
  getMainWindow() {
    return this.mainWindow;
  }

  /**
   * Check if window exists and is not destroyed
   */
  isWindowValid() {
    return this.mainWindow && !this.mainWindow.isDestroyed();
  }

  /**
   * Close the main window
   */
  closeWindow() {
    if (this.isWindowValid()) {
      this.mainWindow.close();
    }
  }

  /**
   * Show the main window
   */
  showWindow() {
    if (this.isWindowValid()) {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  /**
   * Hide the main window
   */
  hideWindow() {
    if (this.isWindowValid()) {
      this.mainWindow.hide();
    }
  }
}

module.exports = ElectronWindowManager;
