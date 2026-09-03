/**
 * Global Keyboard Shortcuts Manager
 * Système de raccourcis clavier pour POS
 */

class KeyboardShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.isEnabled = true;
    this.currentModifiers = {
      ctrl: false,
      alt: false,
      shift: false,
      meta: false
    };
    
    // Raccourcis par défaut
    this.defaultShortcuts = {
      // Navigation
      'F1': { action: 'showHelp', description: 'Afficher l\'aide' },
      'F2': { action: 'openSales', description: 'Aller aux ventes' },
      'F3': { action: 'openProducts', description: 'Aller aux produits' },
      'F4': { action: 'openInventory', description: 'Aller à l\'inventaire' },
      'F5': { action: 'refreshPage', description: 'Actualiser' },
      'F6': { action: 'openReports', description: 'Aller aux rapports' },
      'F7': { action: 'openSettings', description: 'Aller aux paramètres' },
      'F8': { action: 'openCustomers', description: 'Aller aux clients' },
      'F9': { action: 'openCashDrawer', description: 'Ouvrir le tiroir-caisse' },
      'F10': { action: 'toggleFullscreen', description: 'Mode plein écran' },
      'F11': { action: 'toggleKioskMode', description: 'Mode kiosque' },
      'F12': { action: 'openDebugConsole', description: 'Console de débogage' },
      
      // Actions rapides
      'Ctrl+N': { action: 'newSale', description: 'Nouvelle vente' },
      'Ctrl+S': { action: 'saveSale', description: 'Sauvegarder la vente' },
      'Ctrl+P': { action: 'printReceipt', description: 'Imprimer le ticket' },
      'Ctrl+D': { action: 'printDuplicate', description: 'Imprimer un duplicata' },
      'Ctrl+F': { action: 'focusSearch', description: 'Focus sur la recherche' },
      'Ctrl+Q': { action: 'logout', description: 'Déconnexion' },
      'Ctrl+R': { action: 'refreshData', description: 'Actualiser les données' },
      'Ctrl+B': { action: 'toggleSidebar', description: 'Basculer la sidebar' },
      
      // Paiement
      'Ctrl+1': { action: 'paymentCash', description: 'Paiement espèces' },
      'Ctrl+2': { action: 'paymentCard', description: 'Paiement carte' },
      'Ctrl+3': { action: 'paymentCheck', description: 'Paiement chèque' },
      'Ctrl+4': { action: 'paymentMobile', description: 'Paiement mobile' },
      
      // Navigation dans les listes
      'ArrowUp': { action: 'selectPrevious', description: 'Sélection précédente' },
      'ArrowDown': { action: 'selectNext', description: 'Sélection suivante' },
      'Enter': { action: 'confirmSelection', description: 'Confirmer la sélection' },
      'Escape': { action: 'cancelAction', description: 'Annuler l\'action' },
      'Delete': { action: 'removeItem', description: 'Supprimer l\'élément' },
      
      // Quantités
      'NumpadAdd': { action: 'increaseQuantity', description: 'Augmenter la quantité' },
      'NumpadSubtract': { action: 'decreaseQuantity', description: 'Diminuer la quantité' },
      'NumpadMultiply': { action: 'multiplyQuantity', description: 'Multiplier la quantité' },
      'NumpadDivide': { action: 'setCustomQuantity', description: 'Quantité personnalisée' },
      
      // Remises et modifications
      'Ctrl+Minus': { action: 'applyDiscount', description: 'Appliquer une remise' },
      'Ctrl+Plus': { action: 'addSurcharge', description: 'Ajouter un supplément' },
      'Ctrl+Alt+P': { action: 'overridePrice', description: 'Modifier le prix' },
      
      // Fonctions avancées
      'Ctrl+Shift+T': { action: 'openCashCount', description: 'Comptage de caisse' },
      'Ctrl+Shift+R': { action: 'openRefund', description: 'Remboursement' },
      'Ctrl+Shift+H': { action: 'openSalesHistory', description: 'Historique des ventes' },
      'Ctrl+Shift+B': { action: 'openBackup', description: 'Sauvegarde' },
      'Ctrl+Shift+E': { action: 'exportData', description: 'Exporter les données' }
    };
    
    this.init();
  }

  /**
   * Initialiser le gestionnaire de raccourcis
   */
  init() {
    // Charger les raccourcis personnalisés
    this.loadCustomShortcuts();
    
    // Écouter les événements clavier
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Empêcher les raccourcis du navigateur en mode kiosque
    if (this.isKioskMode()) {
      this.disableBrowserShortcuts();
    }
    
    console.log('Keyboard shortcuts initialized');
  }

  /**
   * Gérer les touches pressées
   */
  handleKeyDown(event) {
    if (!this.isEnabled) return;
    
    // Mettre à jour les modificateurs
    this.updateModifiers(event);
    
    // Générer la clé du raccourci
    const shortcutKey = this.getShortcutKey(event);
    
    // Vérifier si c'est un raccourci valide
    const shortcut = this.getShortcut(shortcutKey);
    
    if (shortcut) {
      // Empêcher le comportement par défaut
      event.preventDefault();
      event.stopPropagation();
      
      // Exécuter l'action
      this.executeAction(shortcut.action, event);
      
      // Logger le raccourci utilisé
      this.logShortcutUsage(shortcutKey, shortcut.action);
    }
  }

  /**
   * Gérer les touches relâchées
   */
  handleKeyUp(event) {
    this.updateModifiers(event);
  }

  /**
   * Mettre à jour l'état des modificateurs
   */
  updateModifiers(event) {
    this.currentModifiers.ctrl = event.ctrlKey;
    this.currentModifiers.alt = event.altKey;
    this.currentModifiers.shift = event.shiftKey;
    this.currentModifiers.meta = event.metaKey;
  }

  /**
   * Générer la clé du raccourci
   */
  getShortcutKey(event) {
    const parts = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    // Gérer les touches spéciales
    let key = event.key;
    
    // Normaliser les noms des touches
    const keyMap = {
      ' ': 'Space',
      'ArrowUp': 'ArrowUp',
      'ArrowDown': 'ArrowDown',
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight',
      'Escape': 'Escape',
      'Enter': 'Enter',
      'Tab': 'Tab',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'Insert': 'Insert',
      'Home': 'Home',
      'End': 'End',
      'PageUp': 'PageUp',
      'PageDown': 'PageDown'
    };
    
    if (keyMap[key]) {
      key = keyMap[key];
    }
    
    // Pour les touches F1-F12
    if (key.startsWith('F') && key.length <= 3) {
      // Pas de modificateurs pour les touches de fonction par défaut
      return key;
    }
    
    parts.push(key);
    return parts.join('+');
  }

  /**
   * Obtenir un raccourci
   */
  getShortcut(key) {
    return this.shortcuts.get(key) || this.defaultShortcuts[key];
  }

  /**
   * Exécuter une action
   */
  async executeAction(action, event) {
    try {
      switch (action) {
        case 'showHelp':
          this.showHelp();
          break;
        case 'openSales':
          this.navigateTo('/sales');
          break;
        case 'openProducts':
          this.navigateTo('/products');
          break;
        case 'openInventory':
          this.navigateTo('/inventory');
          break;
        case 'refreshPage':
          window.location.reload();
          break;
        case 'openReports':
          this.navigateTo('/reports');
          break;
        case 'openSettings':
          this.navigateTo('/settings');
          break;
        case 'openCustomers':
          this.navigateTo('/customers');
          break;
        case 'openCashDrawer':
          await this.openCashDrawer();
          break;
        case 'toggleFullscreen':
          this.toggleFullscreen();
          break;
        case 'toggleKioskMode':
          this.toggleKioskMode();
          break;
        case 'openDebugConsole':
          this.openDebugConsole();
          break;
        case 'newSale':
          this.newSale();
          break;
        case 'saveSale':
          this.saveSale();
          break;
        case 'printReceipt':
          await this.printReceipt();
          break;
        case 'printDuplicate':
          await this.printDuplicate();
          break;
        case 'focusSearch':
          this.focusSearch();
          break;
        case 'logout':
          this.logout();
          break;
        case 'refreshData':
          this.refreshData();
          break;
        case 'toggleSidebar':
          this.toggleSidebar();
          break;
        case 'paymentCash':
          this.selectPaymentMethod('cash');
          break;
        case 'paymentCard':
          this.selectPaymentMethod('card');
          break;
        case 'paymentCheck':
          this.selectPaymentMethod('check');
          break;
        case 'paymentMobile':
          this.selectPaymentMethod('mobile');
          break;
        default:
          console.warn(`Action non définie: ${action}`);
      }
    } catch (error) {
      console.error(`Erreur lors de l'exécution de l'action ${action}:`, error);
      this.showNotification(`Erreur: ${error.message}`, 'error');
    }
  }

  /**
   * Afficher l'aide des raccourcis
   */
  showHelp() {
    const helpContent = this.generateHelpContent();
    
    // Créer une modal d'aide
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold">Raccourcis Clavier</h2>
          <button id="closeHelp" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${helpContent}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fermer la modal
    modal.querySelector('#closeHelp').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Fermer avec Escape
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', closeOnEscape);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
  }

  /**
   * Générer le contenu d'aide
   */
  generateHelpContent() {
    const categories = {
      'Navigation': ['F2', 'F3', 'F4', 'F6', 'F7', 'F8'],
      'Actions Rapides': ['Ctrl+N', 'Ctrl+S', 'Ctrl+P', 'Ctrl+D', 'Ctrl+F'],
      'Paiement': ['Ctrl+1', 'Ctrl+2', 'Ctrl+3', 'Ctrl+4'],
      'Système': ['F1', 'F5', 'F9', 'F10', 'F11', 'F12'],
      'Fonctions Avancées': ['Ctrl+Shift+T', 'Ctrl+Shift+R', 'Ctrl+Shift+H']
    };
    
    let content = '';
    
    Object.entries(categories).forEach(([category, shortcuts]) => {
      content += `<div class="mb-4">
        <h3 class="font-semibold text-lg mb-2 text-blue-600">${category}</h3>
        <ul class="space-y-1">`;
      
      shortcuts.forEach(key => {
        const shortcut = this.getShortcut(key);
        if (shortcut) {
          content += `
            <li class="flex justify-between items-center py-1">
              <span class="font-mono bg-gray-100 px-2 py-1 rounded text-sm">${key}</span>
              <span class="text-gray-600 text-sm">${shortcut.description}</span>
            </li>`;
        }
      });
      
      content += '</ul></div>';
    });
    
    return content;
  }

  /**
   * Navigation
   */
  navigateTo(path) {
    // Utiliser React Router ou autre système de navigation
    if (window.history && window.history.pushState) {
      window.history.pushState(null, null, path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  /**
   * Ouvrir le tiroir-caisse
   */
  async openCashDrawer() {
    try {
      if (window.cashDrawer) {
        await window.cashDrawer.openDrawer('shortcut');
        this.showNotification('Tiroir-caisse ouvert', 'success');
      }
    } catch (error) {
      this.showNotification('Erreur ouverture tiroir-caisse', 'error');
    }
  }

  /**
   * Imprimer le ticket
   */
  async printReceipt() {
    try {
      if (window.thermalPrinter) {
        // Récupérer la vente actuelle
        const currentSale = this.getCurrentSale();
        if (currentSale) {
          await window.thermalPrinter.printReceipt(currentSale);
          this.showNotification('Ticket imprimé', 'success');
        } else {
          this.showNotification('Aucune vente à imprimer', 'warning');
        }
      }
    } catch (error) {
      this.showNotification('Erreur impression', 'error');
    }
  }

  /**
   * Focus sur la recherche
   */
  focusSearch() {
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="recherche"], input[placeholder*="search"]');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  /**
   * Basculer le mode plein écran
   */
  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  /**
   * Basculer la sidebar
   */
  toggleSidebar() {
    // Déclencher l'événement de toggle sidebar
    const event = new CustomEvent('toggleSidebar');
    window.dispatchEvent(event);
  }

  /**
   * Afficher une notification
   */
  showNotification(message, type = 'info') {
    // Utiliser le système de notifications existant
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Obtenir la vente actuelle
   */
  getCurrentSale() {
    try {
      return JSON.parse(localStorage.getItem('currentSale') || 'null');
    } catch {
      return null;
    }
  }

  /**
   * Charger les raccourcis personnalisés
   */
  loadCustomShortcuts() {
    try {
      const customShortcuts = JSON.parse(localStorage.getItem('customShortcuts') || '{}');
      Object.entries(customShortcuts).forEach(([key, shortcut]) => {
        this.shortcuts.set(key, shortcut);
      });
    } catch (error) {
      console.error('Error loading custom shortcuts:', error);
    }
  }

  /**
   * Sauvegarder les raccourcis personnalisés
   */
  saveCustomShortcuts() {
    try {
      const customShortcuts = Object.fromEntries(this.shortcuts);
      localStorage.setItem('customShortcuts', JSON.stringify(customShortcuts));
    } catch (error) {
      console.error('Error saving custom shortcuts:', error);
    }
  }

  /**
   * Ajouter un raccourci personnalisé
   */
  addShortcut(key, action, description) {
    this.shortcuts.set(key, { action, description });
    this.saveCustomShortcuts();
  }

  /**
   * Supprimer un raccourci
   */
  removeShortcut(key) {
    this.shortcuts.delete(key);
    this.saveCustomShortcuts();
  }

  /**
   * Activer/Désactiver les raccourcis
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Vérifier si on est en mode kiosque
   */
  isKioskMode() {
    return localStorage.getItem('kioskMode') === 'true';
  }

  /**
   * Désactiver les raccourcis du navigateur
   */
  disableBrowserShortcuts() {
    const disabledKeys = ['F5', 'F11', 'F12', 'Ctrl+R', 'Ctrl+Shift+R', 'Ctrl+Shift+I'];
    
    document.addEventListener('keydown', (e) => {
      const key = this.getShortcutKey(e);
      if (disabledKeys.includes(key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  /**
   * Logger l'utilisation des raccourcis
   */
  logShortcutUsage(key, action) {
    try {
      const usage = JSON.parse(localStorage.getItem('shortcutUsage') || '{}');
      usage[key] = (usage[key] || 0) + 1;
      localStorage.setItem('shortcutUsage', JSON.stringify(usage));
    } catch (error) {
      console.error('Error logging shortcut usage:', error);
    }
  }

  /**
   * Obtenir les statistiques d'utilisation
   */
  getUsageStats() {
    try {
      return JSON.parse(localStorage.getItem('shortcutUsage') || '{}');
    } catch {
      return {};
    }
  }
}

// Instance globale
export const keyboardShortcuts = new KeyboardShortcutManager();

// Exposer globalement pour les autres modules
window.keyboardShortcuts = keyboardShortcuts;

export default KeyboardShortcutManager;
