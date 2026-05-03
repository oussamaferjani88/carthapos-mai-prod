/**
 * Cash Drawer Hardware Interface
 * Gestion du tiroir-caisse via Electron
 */

class CashDrawerManager {
  constructor() {
    this.isOpen = false;
    this.isConnected = false;
    this.port = null;
    this.config = {
      port: 'COM1', // Port série par défaut
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    };
  }

  /**
   * Initialiser la connexion au tiroir-caisse
   */
  async initialize(config = {}) {
    try {
      this.config = { ...this.config, ...config };
      
      if (window.electronAPI) {
        const result = await window.electronAPI.initializeCashDrawer(this.config);
        this.isConnected = result.success;
        this.port = result.port;
        
        console.log('Cash drawer initialized:', result);
        return result;
      } else {
        // Mode développement - simulation
        this.isConnected = true;
        console.log('Cash drawer initialized (simulation mode)');
        return { success: true, message: 'Simulation mode' };
      }
    } catch (error) {
      console.error('Error initializing cash drawer:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Ouvrir le tiroir-caisse
   */
  async openDrawer(reason = 'manual') {
    try {
      if (!this.isConnected) {
        throw new Error('Tiroir-caisse non connecté');
      }

      if (window.electronAPI) {
        const result = await window.electronAPI.openCashDrawer();
        this.isOpen = result.success;
        
        // Enregistrer l'ouverture
        await this.logDrawerEvent('open', reason);
        
        return result;
      } else {
        // Mode développement - simulation
        this.isOpen = true;
        console.log('Cash drawer opened (simulation)');
        await this.logDrawerEvent('open', reason);
        
        return { success: true, message: 'Tiroir ouvert (simulation)' };
      }
    } catch (error) {
      console.error('Error opening cash drawer:', error);
      throw error;
    }
  }

  /**
   * Vérifier le statut du tiroir
   */
  async checkStatus() {
    try {
      if (window.electronAPI) {
        const status = await window.electronAPI.getCashDrawerStatus();
        this.isOpen = status.isOpen;
        return status;
      } else {
        // Mode développement
        return {
          isOpen: this.isOpen,
          isConnected: this.isConnected,
          lastOpened: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Error checking drawer status:', error);
      return { isOpen: false, isConnected: false, error: error.message };
    }
  }

  /**
   * Fermer la connexion
   */
  async disconnect() {
    try {
      if (window.electronAPI) {
        await window.electronAPI.disconnectCashDrawer();
      }
      
      this.isConnected = false;
      this.isOpen = false;
      console.log('Cash drawer disconnected');
    } catch (error) {
      console.error('Error disconnecting cash drawer:', error);
    }
  }

  /**
   * Enregistrer les événements du tiroir
   * UPDATED: Now logs to database (SQLite) instead of localStorage for security
   */
  async logDrawerEvent(action, reason, amountData = {}) {
    try {
      // Get current user from localStorage (set during login)
      const storedUser = localStorage.getItem('pos_user');
      let userId = 0;
      let userName = 'unknown';
      
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          userId = user.id || 0;
          userName = user.username || user.full_name || 'unknown';
        } catch (e) {
          console.warn('Could not parse stored user:', e);
        }
      }

      const event = {
        timestamp: new Date().toISOString(),
        user_id: userId,
        user_name: userName,
        action,
        reason,
        amount_expected: amountData.expected || null,
        amount_actual: amountData.actual || null,
        difference: amountData.difference || null,
        notes: amountData.notes || null
      };

      // CRITICAL: Log to database (immutable, cannot be deleted by user)
      if (window.electronAPI) {
        await window.electronAPI.logCashDrawerEvent(event);
        console.log('💰 Cash drawer event logged to database:', action);
      } else {
        console.warn('⚠️ ElectronAPI not available - cash drawer event NOT logged to database!');
      }

      // Also keep in localStorage for quick access (but this is NOT the source of truth)
      const events = JSON.parse(localStorage.getItem('drawerEvents') || '[]');
      events.push(event);
      
      // Keep only last 50 events in localStorage (database has full history)
      if (events.length > 50) {
        events.splice(0, events.length - 50);
      }
      
      localStorage.setItem('drawerEvents', JSON.stringify(events));
    } catch (error) {
      console.error('❌ Error logging drawer event:', error);
      // Don't throw - logging should not break cash drawer operations
    }
  }

  /**
   * Obtenir l'historique des événements
   * UPDATED: Fetch from database (SQLite) with fallback to localStorage
   */
  async getDrawerHistory(filters = {}) {
    try {
      // Try to get from database first (source of truth)
      if (window.electronAPI) {
        const history = await window.electronAPI.getCashDrawerHistory(filters);
        return history || [];
      }
      
      // Fallback to localStorage if ElectronAPI not available (preview mode)
      console.warn('⚠️ ElectronAPI not available - using localStorage fallback');
      return JSON.parse(localStorage.getItem('drawerEvents') || '[]');
    } catch (error) {
      console.error('❌ Error getting drawer history:', error);
      // Last resort fallback to localStorage
      return JSON.parse(localStorage.getItem('drawerEvents') || '[]');
    }
  }

  /**
   * Test de connexion
   */
  async testConnection() {
    try {
      const result = await this.openDrawer('test');
      return result.success;
    } catch (error) {
      return false;
    }
  }
}

// Instance globale
export const cashDrawer = new CashDrawerManager();

// Commandes ESC/POS pour différents types de tiroirs
export const DRAWER_COMMANDS = {
  // Commande standard ESC/POS
  STANDARD: [0x1B, 0x70, 0x00, 0x19, 0xFA],
  // Epson
  EPSON: [0x1B, 0x70, 0x00, 0x32, 0x96],
  // Star
  STAR: [0x07],
  // Pulse sur pin 2
  PULSE_PIN2: [0x1B, 0x70, 0x00, 0x19, 0xFA],
  // Pulse sur pin 5
  PULSE_PIN5: [0x1B, 0x70, 0x01, 0x19, 0xFA]
};

export default CashDrawerManager;
