/**
 * Thermal Printer Manager
 * Gestion de l'impression de tickets via ESC/POS
 */

class ThermalPrinterManager {
  constructor() {
    this.isConnected = false;
    this.printerType = 'EPSON'; // EPSON, STAR, GENERIC
    this.config = {
      port: 'USB',
      interface: 'USB', // USB, SERIAL, NETWORK
      ip: '192.168.1.100', // Pour imprimantes réseau
      characterSet: 'PC437',
      codeTable: 0
    };
    this.templates = {};
  }

  /**
   * Initialiser l'imprimante
   */
  async initialize(config = {}) {
    try {
      this.config = { ...this.config, ...config };
      
      if (window.electronAPI) {
        const result = await window.electronAPI.initializePrinter(this.config);
        this.isConnected = result.success;
        this.printerType = result.type || 'GENERIC';
        
        console.log('Printer initialized:', result);
        return result;
      } else {
        // Mode développement - simulation
        this.isConnected = true;
        console.log('Printer initialized (simulation mode)');
        return { success: true, message: 'Simulation mode' };
      }
    } catch (error) {
      console.error('Error initializing printer:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Imprimer un ticket de vente
   */
  async printReceipt(sale) {
    try {
      if (!this.isConnected) {
        throw new Error('Imprimante non connectée');
      }

      const receiptData = this.generateReceiptData(sale);
      
      if (window.electronAPI) {
        const result = await window.electronAPI.printReceipt(receiptData);
        return result;
      } else {
        // Mode développement - simulation
        console.log('Receipt printed (simulation):', receiptData);
        this.simulatePrint(receiptData);
        return { success: true, message: 'Ticket imprimé (simulation)' };
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      throw error;
    }
  }

  /**
   * Générer les données du ticket
   */
  generateReceiptData(sale) {
    const config = JSON.parse(localStorage.getItem('appConfig') || '{}');
    const businessName = config.businessName || 'Mon Commerce';
    const businessAddress = config.businessAddress || '';
    const businessPhone = config.businessPhone || '';
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR');

    return {
      header: {
        businessName,
        businessAddress,
        businessPhone,
        logo: config.logo || null
      },
      transaction: {
        id: sale.id || `T${Date.now()}`,
        date: dateStr,
        time: timeStr,
        cashier: sale.cashier || 'Caissier',
        customer: sale.customer || null
      },
      items: sale.items || [],
      totals: {
        subtotal: sale.subtotal || 0,
        tax: sale.tax || 0,
        discount: sale.discount || 0,
        total: sale.total || 0,
        paid: sale.paid || 0,
        change: sale.change || 0
      },
      payment: {
        method: sale.paymentMethod || 'Espèces',
        card: sale.cardNumber || null,
        authorization: sale.authCode || null
      },
      footer: {
        message: config.receiptFooter || 'Merci de votre visite !',
        returnPolicy: config.returnPolicy || '',
        website: config.website || '',
        socialMedia: config.socialMedia || ''
      }
    };
  }

  /**
   * Créer les commandes ESC/POS
   */
  createESCPOSCommands(receiptData) {
    const commands = [];
    
    // Initialiser l'imprimante
    commands.push(this.ESC_POS.INIT);
    
    // En-tête
    if (receiptData.header.businessName) {
      commands.push(this.ESC_POS.ALIGN_CENTER);
      commands.push(this.ESC_POS.FONT_LARGE);
      commands.push(this.ESC_POS.BOLD_ON);
      commands.push(this.encodeText(receiptData.header.businessName));
      commands.push(this.ESC_POS.NEW_LINE);
      commands.push(this.ESC_POS.BOLD_OFF);
      commands.push(this.ESC_POS.FONT_NORMAL);
    }
    
    if (receiptData.header.businessAddress) {
      commands.push(this.encodeText(receiptData.header.businessAddress));
      commands.push(this.ESC_POS.NEW_LINE);
    }
    
    if (receiptData.header.businessPhone) {
      commands.push(this.encodeText(`Tel: ${receiptData.header.businessPhone}`));
      commands.push(this.ESC_POS.NEW_LINE);
    }
    
    // Ligne de séparation
    commands.push(this.ESC_POS.NEW_LINE);
    commands.push(this.encodeText('--------------------------------'));
    commands.push(this.ESC_POS.NEW_LINE);
    
    // Informations transaction
    commands.push(this.ESC_POS.ALIGN_LEFT);
    commands.push(this.encodeText(`Ticket: ${receiptData.transaction.id}`));
    commands.push(this.ESC_POS.NEW_LINE);
    commands.push(this.encodeText(`Date: ${receiptData.transaction.date} ${receiptData.transaction.time}`));
    commands.push(this.ESC_POS.NEW_LINE);
    commands.push(this.encodeText(`Caissier: ${receiptData.transaction.cashier}`));
    commands.push(this.ESC_POS.NEW_LINE);
    
    if (receiptData.transaction.customer) {
      commands.push(this.encodeText(`Client: ${receiptData.transaction.customer}`));
      commands.push(this.ESC_POS.NEW_LINE);
    }
    
    // Ligne de séparation
    commands.push(this.ESC_POS.NEW_LINE);
    commands.push(this.encodeText('--------------------------------'));
    commands.push(this.ESC_POS.NEW_LINE);
    
    // Articles
    receiptData.items.forEach(item => {
      const line = this.formatItemLine(item.name, item.quantity, item.price, item.total);
      commands.push(this.encodeText(line));
      commands.push(this.ESC_POS.NEW_LINE);
    });
    
    // Ligne de séparation
    commands.push(this.encodeText('--------------------------------'));
    commands.push(this.ESC_POS.NEW_LINE);
    
    // Totaux
    commands.push(this.encodeText(this.formatTotalLine('Sous-total', receiptData.totals.subtotal)));
    commands.push(this.ESC_POS.NEW_LINE);
    
    if (receiptData.totals.discount > 0) {
      commands.push(this.encodeText(this.formatTotalLine('Remise', -receiptData.totals.discount)));
      commands.push(this.ESC_POS.NEW_LINE);
    }
    
    if (receiptData.totals.tax > 0) {
      commands.push(this.encodeText(this.formatTotalLine('TVA', receiptData.totals.tax)));
      commands.push(this.ESC_POS.NEW_LINE);
    }
    
    commands.push(this.ESC_POS.BOLD_ON);
    commands.push(this.encodeText(this.formatTotalLine('TOTAL', receiptData.totals.total)));
    commands.push(this.ESC_POS.NEW_LINE);
    commands.push(this.ESC_POS.BOLD_OFF);
    
    // Paiement
    commands.push(this.ESC_POS.NEW_LINE);
    commands.push(this.encodeText(`Paiement: ${receiptData.payment.method}`));
    commands.push(this.ESC_POS.NEW_LINE);
    commands.push(this.encodeText(this.formatTotalLine('Reçu', receiptData.totals.paid)));
    commands.push(this.ESC_POS.NEW_LINE);
    
    if (receiptData.totals.change > 0) {
      commands.push(this.encodeText(this.formatTotalLine('Monnaie', receiptData.totals.change)));
      commands.push(this.ESC_POS.NEW_LINE);
    }
    
    // Pied de page
    if (receiptData.footer.message) {
      commands.push(this.ESC_POS.NEW_LINE);
      commands.push(this.ESC_POS.ALIGN_CENTER);
      commands.push(this.encodeText(receiptData.footer.message));
      commands.push(this.ESC_POS.NEW_LINE);
    }
    
    // Coupe du papier
    commands.push(this.ESC_POS.NEW_LINE);
    commands.push(this.ESC_POS.NEW_LINE);
    commands.push(this.ESC_POS.CUT_PAPER);
    
    return commands.flat();
  }

  /**
   * Commandes ESC/POS
   */
  ESC_POS = {
    INIT: [0x1B, 0x40], // Initialize printer
    NEW_LINE: [0x0A], // Line feed
    CUT_PAPER: [0x1D, 0x56, 0x00], // Cut paper
    ALIGN_LEFT: [0x1B, 0x61, 0x00], // Align left
    ALIGN_CENTER: [0x1B, 0x61, 0x01], // Align center
    ALIGN_RIGHT: [0x1B, 0x61, 0x02], // Align right
    FONT_NORMAL: [0x1B, 0x21, 0x00], // Normal font
    FONT_LARGE: [0x1B, 0x21, 0x30], // Large font
    BOLD_ON: [0x1B, 0x45, 0x01], // Bold on
    BOLD_OFF: [0x1B, 0x45, 0x00], // Bold off
    UNDERLINE_ON: [0x1B, 0x2D, 0x01], // Underline on
    UNDERLINE_OFF: [0x1B, 0x2D, 0x00], // Underline off
    BARCODE_128: [0x1D, 0x6B, 0x49], // Code 128 barcode
    QR_CODE: [0x1D, 0x28, 0x6B] // QR Code
  };

  /**
   * Encoder le texte en format ESC/POS
   */
  encodeText(text) {
    return Array.from(new TextEncoder().encode(text + '\n'));
  }

  /**
   * Formater une ligne d'article
   */
  formatItemLine(name, quantity, price, total) {
    const maxNameLength = 20;
    const truncatedName = name.length > maxNameLength ? 
      name.substring(0, maxNameLength - 3) + '...' : name;
    
    const qtyStr = `${quantity}x`;
    const priceStr = `${price.toFixed(2)}€`;
    const totalStr = `${total.toFixed(2)}€`;
    
    const spaces1 = Math.max(1, maxNameLength - truncatedName.length);
    const spaces2 = Math.max(1, 8 - (qtyStr + priceStr).length);
    
    return `${truncatedName}${' '.repeat(spaces1)}${qtyStr}${priceStr}${' '.repeat(spaces2)}${totalStr}`;
  }

  /**
   * Formater une ligne de total
   */
  formatTotalLine(label, amount) {
    const maxLength = 32;
    const amountStr = `${amount.toFixed(2)}€`;
    const spaces = Math.max(1, maxLength - label.length - amountStr.length);
    return `${label}${' '.repeat(spaces)}${amountStr}`;
  }

  /**
   * Simuler l'impression (mode développement)
   */
  simulatePrint(receiptData) {
    const receiptText = this.generateReceiptText(receiptData);
    
    // Afficher dans la console
    console.log('\n=== TICKET IMPRIMÉ ===');
    console.log(receiptText);
    console.log('=====================\n');
    
    // Sauvegarder dans localStorage pour debug
    const receipts = JSON.parse(localStorage.getItem('printedReceipts') || '[]');
    receipts.push({
      timestamp: new Date().toISOString(),
      data: receiptData,
      text: receiptText
    });
    
    // Garder seulement les 50 derniers tickets
    if (receipts.length > 50) {
      receipts.splice(0, receipts.length - 50);
    }
    
    localStorage.setItem('printedReceipts', JSON.stringify(receipts));
  }

  /**
   * Générer le texte du ticket pour simulation
   */
  generateReceiptText(receiptData) {
    let text = '';
    
    // En-tête
    text += `${receiptData.header.businessName}\n`;
    if (receiptData.header.businessAddress) {
      text += `${receiptData.header.businessAddress}\n`;
    }
    if (receiptData.header.businessPhone) {
      text += `Tel: ${receiptData.header.businessPhone}\n`;
    }
    
    text += '\n--------------------------------\n';
    
    // Transaction
    text += `Ticket: ${receiptData.transaction.id}\n`;
    text += `Date: ${receiptData.transaction.date} ${receiptData.transaction.time}\n`;
    text += `Caissier: ${receiptData.transaction.cashier}\n`;
    
    if (receiptData.transaction.customer) {
      text += `Client: ${receiptData.transaction.customer}\n`;
    }
    
    text += '\n--------------------------------\n';
    
    // Articles
    receiptData.items.forEach(item => {
      text += this.formatItemLine(item.name, item.quantity, item.price, item.total) + '\n';
    });
    
    text += '--------------------------------\n';
    
    // Totaux
    text += this.formatTotalLine('Sous-total', receiptData.totals.subtotal) + '\n';
    
    if (receiptData.totals.discount > 0) {
      text += this.formatTotalLine('Remise', -receiptData.totals.discount) + '\n';
    }
    
    if (receiptData.totals.tax > 0) {
      text += this.formatTotalLine('TVA', receiptData.totals.tax) + '\n';
    }
    
    text += this.formatTotalLine('TOTAL', receiptData.totals.total) + '\n';
    
    // Paiement
    text += `\nPaiement: ${receiptData.payment.method}\n`;
    text += this.formatTotalLine('Reçu', receiptData.totals.paid) + '\n';
    
    if (receiptData.totals.change > 0) {
      text += this.formatTotalLine('Monnaie', receiptData.totals.change) + '\n';
    }
    
    // Pied de page
    if (receiptData.footer.message) {
      text += `\n${receiptData.footer.message}\n`;
    }
    
    return text;
  }

  /**
   * Imprimer un duplicata
   */
  async printDuplicate(saleId) {
    try {
      // Récupérer la vente depuis l'historique
      const sales = JSON.parse(localStorage.getItem('salesHistory') || '[]');
      const sale = sales.find(s => s.id === saleId);
      
      if (!sale) {
        throw new Error('Vente introuvable');
      }
      
      // Ajouter la mention "DUPLICATA"
      const duplicateSale = {
        ...sale,
        isDuplicate: true
      };
      
      return await this.printReceipt(duplicateSale);
    } catch (error) {
      console.error('Error printing duplicate:', error);
      throw error;
    }
  }

  /**
   * Test d'impression
   */
  async testPrint() {
    const testSale = {
      id: 'TEST001',
      cashier: 'Test',
      items: [
        { name: 'Article test', quantity: 1, price: 10.00, total: 10.00 }
      ],
      subtotal: 10.00,
      tax: 2.00,
      total: 12.00,
      paid: 15.00,
      change: 3.00,
      paymentMethod: 'Espèces'
    };
    
    return await this.printReceipt(testSale);
  }

  /**
   * Obtenir l'historique des impressions
   */
  getPrintHistory() {
    try {
      return JSON.parse(localStorage.getItem('printedReceipts') || '[]');
    } catch (error) {
      console.error('Error getting print history:', error);
      return [];
    }
  }
}

// Instance globale
export const thermalPrinter = new ThermalPrinterManager();

export default ThermalPrinterManager;
