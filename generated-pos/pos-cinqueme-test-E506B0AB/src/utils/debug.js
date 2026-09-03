/**
 * Debug Utility - Enhanced logging with context and suggestions
 */

const DEBUG_ENABLED = localStorage.getItem('POS_DEBUG_MODE') === 'true';

export const debugLog = {
  /**
   * Log with context and formatting
   */
  log: (title, data, type = 'info') => {
    if (!DEBUG_ENABLED) return;

    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍',
      module: '📦',
      component: '🔧',
      ipc: '📡'
    }[type] || '📌';

    console.log(
      `%c${prefix} [${timestamp}] ${title}`,
      'color: #3b82f6; font-weight: bold; font-size: 12px;',
      data
    );
  },

  /**
   * Verify module is loaded
   */
  verifyModule: (moduleName, component) => {
    if (!component) {
      console.error(`❌ MODULE NOT LOADED: ${moduleName}`);
      console.error(`   This module file may have been deleted or failed to import`);
      return false;
    }
    console.log(`✅ MODULE LOADED: ${moduleName}`);
    return true;
  },

  /**
   * Verify IPC channel exists
   */
  verifyIPC: (channel) => {
    if (!window.electronAPI) {
      console.error('❌ electronAPI not available - Preload script may not be loaded');
      return false;
    }
    if (!window.electronAPI[channel]) {
      console.error(`❌ IPC CHANNEL NOT FOUND: ${channel}`);
      console.error('   Available channels:', Object.keys(window.electronAPI).join(', '));
      return false;
    }
    return true;
  },

  /**
   * Log IPC error with suggestions
   */
  logIPCError: (channel, error) => {
    console.error('═══════════════════════════════════════════════════════════');
    console.error(`❌ IPC ERROR: ${channel}`);
    console.error('Error:', error?.message);
    console.error('Stack:', error?.stack);
    
    // Provide suggestions based on error type
    if (error?.message?.includes('not found')) {
      console.error('💡 SUGGESTION: The IPC handler may not be registered');
    } else if (error?.message?.includes('timeout')) {
      console.error('💡 SUGGESTION: The main process did not respond in time');
    } else if (error?.message?.includes('database')) {
      console.error('💡 SUGGESTION: Database connection issue - check database path');
    } else if (error?.message?.includes('permission')) {
      console.error('💡 SUGGESTION: Permission denied - app may not have write access');
    }
    
    console.error('═══════════════════════════════════════════════════════════');
  },

  /**
   * Log component render issue
   */
  logComponentError: (componentName, error) => {
    console.error('═══════════════════════════════════════════════════════════');
    console.error(`❌ COMPONENT ERROR: ${componentName}`);
    console.error('Error:', error?.message);
    console.error('Component:', componentName);
    
    if (error?.message?.includes('not defined')) {
      console.error('💡 SUGGESTION: Component was not registered or imported');
      console.error('   Check if this module is enabled in app-config.json');
    } else if (error?.message?.includes('undefined')) {
      console.error('💡 SUGGESTION: Component prop or state is undefined');
    }
    
    console.error('═══════════════════════════════════════════════════════════');
  },

  /**
   * Log module filtering info
   */
  logModuleFiltering: (enabledModules, disabledModules) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📦 MODULE CONFIGURATION');
    console.log(`✅ Enabled (${enabledModules.length}):`, enabledModules.join(', '));
    console.log(`🚫 Disabled (${disabledModules.length}):`, disabledModules.join(', '));
    console.log('═══════════════════════════════════════════════════════════');
  },

  /**
   * Enable/Disable debug mode
   */
  toggleDebug: () => {
    const newState = localStorage.getItem('POS_DEBUG_MODE') !== 'true';
    localStorage.setItem('POS_DEBUG_MODE', newState);
    console.log(`🔧 Debug mode ${newState ? 'ENABLED' : 'DISABLED'}`);
    console.log('   Type: debugLog.info("title", data) to log in debug mode');
    return newState;
  },

  /**
   * Check system status
   */
  checkSystemStatus: async () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 SYSTEM STATUS CHECK');
    console.log('═══════════════════════════════════════════════════════════');

    // Check Electron API
    console.log('✅ Electron API:', window.electronAPI ? 'Available' : '❌ NOT AVAILABLE');

    // Check app config
    if (window.electronAPI?.getAppConfig) {
      try {
        const config = await window.electronAPI.getAppConfig();
        console.log('✅ App Config:', {
          businessName: config?.theme?.businessName,
          modules: config?.modules?.length,
          database: config?.database?.filename
        });
      } catch (error) {
        console.error('❌ Failed to get app config:', error?.message);
      }
    }

    // Check database
    if (window.electronAPI?.getDatabaseStats) {
      try {
        const stats = await window.electronAPI.getDatabaseStats();
        console.log('✅ Database:', stats);
      } catch (error) {
        console.error('❌ Failed to get database stats:', error?.message);
      }
    }

    // Check user auth
    console.log('👤 Logged in as:', localStorage.getItem('currentUser') || 'NOT LOGGED IN');

    console.log('═══════════════════════════════════════════════════════════');
  }
};

// Export debug helper that can be called from console
window.POSDebug = {
  log: debugLog.log,
  verify: debugLog.verifyModule,
  status: debugLog.checkSystemStatus,
  toggle: debugLog.toggleDebug,
  ipc: debugLog.verifyIPC
};

console.log('═══════════════════════════════════════════════════════════');
console.log('🔧 Debug utilities loaded');
console.log('📌 Type: window.POSDebug.status() to check system');
console.log('📌 Type: window.POSDebug.toggle() to enable debug mode');
console.log('📌 Type: window.POSDebug.ipc("channel-name") to verify IPC');
console.log('═══════════════════════════════════════════════════════════');
