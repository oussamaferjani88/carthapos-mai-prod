/**
 * Thermal Printer Manager
 * All configuration loaded from SQLite via IPC. Zero localStorage usage.
 */

class ThermalPrinterManager {
  constructor() {
    this.isConnected = false;
    this.printerType = 'EPSON';
    this._cachedBusinessInfo = null;
    this._cachedReceiptConfig = null;
    this._cacheTimestamp = 0;
  }

  async initialize(config = {}) {
    try {
      await this._loadConfigFromDB();
      if (window.electronAPI?.initializePrinter) {
        const result = await window.electronAPI.initializePrinter(config);
        this.isConnected = result.success;
        this.printerType = result.type || 'GENERIC';
        return result;
      }
      this.isConnected = true;
      return { success: true, message: 'Mode simulation' };
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  async _loadConfigFromDB() {
    const now = Date.now();
    if (this._cachedBusinessInfo && (now - this._cacheTimestamp) < 10000) return;

    try {
      if (window.electronAPI?.getAllSettings) {
        const all = await window.electronAPI.getAllSettings();
        if (all) {
          this._cachedBusinessInfo = {
            businessName: all.businessName || 'Mon Commerce',
            businessAddress: all.businessAddress || '',
            businessPhone: all.businessPhone || '',
            currency: all.currency || 'TND'
          };
        }
      }
    } catch {
      this._cachedBusinessInfo = { businessName: 'Mon Commerce', businessAddress: '', businessPhone: '', currency: 'TND' };
    }

    try {
      if (window.electronAPI?.getReceiptConfig) {
        const raw = await window.electronAPI.getReceiptConfig();
        if (raw) this._cachedReceiptConfig = typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    } catch { /* ignore */ }

    this._cacheTimestamp = now;
  }

  async printReceipt(sale) {
    if (!this.isConnected) throw new Error('Imprimante non connectée');
    await this._loadConfigFromDB();
    const receiptData = this.generateReceiptData(sale);
    if (window.electronAPI?.printReceipt) {
      return await window.electronAPI.printReceipt(receiptData);
    }
    return { success: true, message: 'Ticket imprimé (simulation)' };
  }

  generateReceiptData(sale) {
    const biz = this._cachedBusinessInfo || { businessName: 'Mon Commerce', businessAddress: '', businessPhone: '', currency: 'TND' };
    const rc = this._cachedReceiptConfig;
    const now = new Date();
    return {
      header: { businessName: biz.businessName, businessAddress: biz.businessAddress, businessPhone: biz.businessPhone, logo: biz.businessLogo || null },
      transaction: { id: sale.id || `T${Date.now()}`, date: now.toLocaleDateString('fr-FR'), time: now.toLocaleTimeString('fr-FR'), cashier: sale.cashier || 'Caissier', customer: sale.customer || null, table: sale.table || null },
      items: sale.items || [],
      totals: { subtotal: sale.subtotal || 0, tax: sale.tax || 0, discount: sale.discount || 0, total: sale.total || 0, paid: sale.paid || 0, change: sale.change || 0 },
      payment: { method: sale.paymentMethod || 'Espèces', card: sale.cardNumber || null, authorization: sale.authCode || null },
      footer: {
        message: rc?.footer?.customMessages?.find(m => m.enabled)?.text || 'Merci de votre visite !',
        returnPolicy: rc?.footer?.showReturnPolicy ? rc.footer.returnPolicyText : '',
        website: rc?.footer?.showWebsite ? (rc.footer.website || '') : '',
        socialMedia: rc?.footer?.showSocialMedia ? `FB: ${rc.footer.facebook || ''} IG: ${rc.footer.instagram || ''}` : ''
      },
      currency: biz.currency,
      receiptConfig: rc
    };
  }

  async printDuplicate(saleId) {
    if (window.electronAPI?.query) {
      const rows = await window.electronAPI.query(
        `SELECT s.*, GROUP_CONCAT(si.name || ' x' || si.quantity) as item_names, SUM(si.quantity * si.price) as computed_total FROM sales s LEFT JOIN sale_items si ON s.id = si.sale_id WHERE s.id = ? GROUP BY s.id`, [saleId]
      );
      if (!rows || rows.length === 0) throw new Error('Vente introuvable');
      return await this.printReceipt({ ...rows[0], isDuplicate: true });
    }
    throw new Error('Base de données non disponible');
  }

  async testPrint() {
    await this._loadConfigFromDB();
    return await this.printReceipt({
      id: 'TEST001', cashier: 'Test',
      items: [{ name: 'Article test', quantity: 1, price: 10.00, total: 10.00 }],
      subtotal: 10.00, tax: 2.00, total: 12.00, paid: 15.00, change: 3.00, paymentMethod: 'Espèces'
    });
  }

  getPrintHistory() { return []; }
}

export const thermalPrinter = new ThermalPrinterManager();
if (typeof window !== 'undefined') window.thermalPrinter = thermalPrinter;
export default ThermalPrinterManager;
