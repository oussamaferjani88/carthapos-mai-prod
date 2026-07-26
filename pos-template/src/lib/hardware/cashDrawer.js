/**
 * Cash Drawer Hardware Interface
 * All operations via Electron IPC + SQLite. Zero localStorage usage.
 */

class CashDrawerManager {
  constructor() {
    this.isOpen = false;
    this.isConnected = false;
  }

  async initialize(config = {}) {
    try {
      if (window.electronAPI?.testCashDrawer) {
        const result = await window.electronAPI.testCashDrawer();
        this.isConnected = result.success;
        return result;
      }
      this.isConnected = true;
      return { success: true, message: 'Mode simulation' };
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  async openDrawer(reason = 'manual') {
    if (!this.isConnected) throw new Error('Tiroir-caisse non connecté');
    if (window.electronAPI?.openCashDrawer) {
      const result = await window.electronAPI.openCashDrawer();
      this.isOpen = result.success;
      return result;
    }
    this.isOpen = true;
    return { success: true, message: 'Tiroir ouvert (simulation)' };
  }

  async checkStatus() {
    if (window.electronAPI?.getCashDrawerStatusHw) {
      return await window.electronAPI.getCashDrawerStatusHw();
    }
    return { isOpen: this.isOpen, isConnected: this.isConnected, lastOpened: null, openCount: 0 };
  }

  async testConnection() {
    try {
      const result = await this.openDrawer('test');
      return result.success;
    } catch { return false; }
  }

  async getDrawerHistory(filters = {}) {
    if (window.electronAPI?.getCashDrawerHistory) {
      return await window.electronAPI.getCashDrawerHistory(filters) || [];
    }
    return [];
  }

  async disconnect() {
    this.isConnected = false;
    this.isOpen = false;
  }
}

export const cashDrawer = new CashDrawerManager();
if (typeof window !== 'undefined') window.cashDrawer = cashDrawer;
export default CashDrawerManager;
