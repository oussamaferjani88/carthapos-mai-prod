/**
 * Kiosk Mode Manager
 * Gestion du mode kiosque et plein écran
 */

class KioskModeManager {
  constructor() {
    this.isKioskMode = false;
    this.isFullscreen = false;
    this.originalSettings = {};
    this.restrictedElements = [];
    this.init();
  }

  /**
   * Initialiser le gestionnaire de mode kiosque
   */
  init() {
    this.loadSettings();
    this.setupEventListeners();
    
    // Exposer globalement
    window.kioskMode = this;
    
    console.log('Kiosk mode manager initialized');
  }

  /**
   * Charger les paramètres
   */
  loadSettings() {
    try {
      this.isKioskMode = localStorage.getItem('kioskMode') === 'true';
      this.isFullscreen = localStorage.getItem('fullscreenMode') === 'true';
      
      if (this.isKioskMode) {
        this.enableKioskMode();
      }
      
      if (this.isFullscreen) {
        this.enableFullscreen();
      }
    } catch (error) {
      console.error('Error loading kiosk settings:', error);
    }
  }

  /**
   * Configurer les écouteurs d'événements
   */
  setupEventListeners() {
    // Écouter les changements de plein écran
    document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange.bind(this));
    document.addEventListener('mozfullscreenchange', this.handleFullscreenChange.bind(this));
    document.addEventListener('MSFullscreenChange', this.handleFullscreenChange.bind(this));

    // Empêcher certaines actions en mode kiosque
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    
    // Empêcher la sélection de texte en mode kiosque
    document.addEventListener('selectstart', this.handleSelectStart.bind(this));
    
    // Détecter les tentatives de sortie
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  /**
   * Activer le mode kiosque
   */
  async enableKioskMode() {
    try {
      this.isKioskMode = true;
      localStorage.setItem('kioskMode', 'true');
      
      // Sauvegarder les paramètres originaux
      this.saveOriginalSettings();
      
      // Appliquer les restrictions du mode kiosque
      this.applyKioskRestrictions();
      
      // Masquer les éléments d'interface non nécessaires
      this.hideUIElements();
      
      // Désactiver les raccourcis navigateur
      this.disableBrowserShortcuts();
      
      // Activer le plein écran automatiquement
      if (!this.isFullscreen) {
        await this.enableFullscreen();
      }
      
      // Notifier le changement
      this.dispatchKioskEvent('enabled');
      
      console.log('Kiosk mode enabled');
      return true;
    } catch (error) {
      console.error('Error enabling kiosk mode:', error);
      return false;
    }
  }

  /**
   * Désactiver le mode kiosque
   */
  async disableKioskMode() {
    try {
      this.isKioskMode = false;
      localStorage.setItem('kioskMode', 'false');
      
      // Restaurer les paramètres originaux
      this.restoreOriginalSettings();
      
      // Supprimer les restrictions
      this.removeKioskRestrictions();
      
      // Restaurer les éléments d'interface
      this.showUIElements();
      
      // Sortir du plein écran
      if (this.isFullscreen) {
        await this.disableFullscreen();
      }
      
      // Notifier le changement
      this.dispatchKioskEvent('disabled');
      
      console.log('Kiosk mode disabled');
      return true;
    } catch (error) {
      console.error('Error disabling kiosk mode:', error);
      return false;
    }
  }

  /**
   * Basculer le mode kiosque
   */
  async toggleKioskMode() {
    if (this.isKioskMode) {
      return await this.disableKioskMode();
    } else {
      return await this.enableKioskMode();
    }
  }

  /**
   * Activer le plein écran
   */
  async enableFullscreen() {
    try {
      const element = document.documentElement;
      
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
      
      this.isFullscreen = true;
      localStorage.setItem('fullscreenMode', 'true');
      
      return true;
    } catch (error) {
      console.error('Error enabling fullscreen:', error);
      return false;
    }
  }

  /**
   * Désactiver le plein écran
   */
  async disableFullscreen() {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
      
      this.isFullscreen = false;
      localStorage.setItem('fullscreenMode', 'false');
      
      return true;
    } catch (error) {
      console.error('Error disabling fullscreen:', error);
      return false;
    }
  }

  /**
   * Basculer le plein écran
   */
  async toggleFullscreen() {
    if (this.isFullscreen) {
      return await this.disableFullscreen();
    } else {
      return await this.enableFullscreen();
    }
  }

  /**
   * Sauvegarder les paramètres originaux
   */
  saveOriginalSettings() {
    this.originalSettings = {
      overflow: document.body.style.overflow,
      userSelect: document.body.style.userSelect,
      contextMenu: document.body.style.contextMenu,
      cursor: document.body.style.cursor
    };
  }

  /**
   * Restaurer les paramètres originaux
   */
  restoreOriginalSettings() {
    if (this.originalSettings.overflow !== undefined) {
      document.body.style.overflow = this.originalSettings.overflow;
    }
    if (this.originalSettings.userSelect !== undefined) {
      document.body.style.userSelect = this.originalSettings.userSelect;
    }
    if (this.originalSettings.contextMenu !== undefined) {
      document.body.style.contextMenu = this.originalSettings.contextMenu;
    }
    if (this.originalSettings.cursor !== undefined) {
      document.body.style.cursor = this.originalSettings.cursor;
    }
  }

  /**
   * Appliquer les restrictions du mode kiosque
   */
  applyKioskRestrictions() {
    // Empêcher le défilement
    document.body.style.overflow = 'hidden';
    
    // Empêcher la sélection de texte
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
    
    // Masquer le curseur après inactivité
    this.setupCursorHiding();
    
    // Ajouter la classe CSS pour le mode kiosque
    document.body.classList.add('kiosk-mode');
  }

  /**
   * Supprimer les restrictions du mode kiosque
   */
  removeKioskRestrictions() {
    // Restaurer le défilement
    document.body.style.overflow = '';
    
    // Restaurer la sélection de texte
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    document.body.style.mozUserSelect = '';
    document.body.style.msUserSelect = '';
    
    // Restaurer le curseur
    document.body.style.cursor = '';
    
    // Supprimer la classe CSS
    document.body.classList.remove('kiosk-mode');
    
    // Nettoyer les timers
    if (this.cursorHideTimer) {
      clearTimeout(this.cursorHideTimer);
    }
  }

  /**
   * Masquer les éléments d'interface
   */
  hideUIElements() {
    const elementsToHide = [
      '[data-kiosk-hide]',
      '.admin-only',
      '.debug-panel',
      '.user-menu',
      '.settings-button',
      '.logout-button'
    ];
    
    elementsToHide.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.style.display = 'none';
        this.restrictedElements.push({
          element,
          originalDisplay: element.style.display
        });
      });
    });
  }

  /**
   * Restaurer les éléments d'interface
   */
  showUIElements() {
    this.restrictedElements.forEach(({ element, originalDisplay }) => {
      element.style.display = originalDisplay || '';
    });
    this.restrictedElements = [];
  }

  /**
   * Configurer le masquage automatique du curseur
   */
  setupCursorHiding() {
    let mouseMoveTimer;
    
    const hideCursor = () => {
      document.body.style.cursor = 'none';
    };
    
    const showCursor = () => {
      document.body.style.cursor = '';
      clearTimeout(mouseMoveTimer);
      mouseMoveTimer = setTimeout(hideCursor, 3000); // Masquer après 3 secondes d'inactivité
    };
    
    document.addEventListener('mousemove', showCursor);
    document.addEventListener('mousedown', showCursor);
    
    // Masquer initialement après 3 secondes
    mouseMoveTimer = setTimeout(hideCursor, 3000);
  }

  /**
   * Désactiver les raccourcis navigateur
   */
  disableBrowserShortcuts() {
    const disabledKeys = [
      'F5', 'F11', 'F12',
      'Ctrl+R', 'Ctrl+Shift+R', 'Ctrl+Shift+I', 'Ctrl+Shift+J',
      'Ctrl+U', 'Ctrl+Shift+C', 'Ctrl+Shift+K',
      'Alt+F4', 'Ctrl+W', 'Ctrl+T', 'Ctrl+N',
      'Ctrl+H', 'Ctrl+D', 'Ctrl+L'
    ];
    
    this.keyDownHandler = (e) => {
      const key = this.getKeyCombo(e);
      if (disabledKeys.includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    
    document.addEventListener('keydown', this.keyDownHandler, true);
  }

  /**
   * Obtenir la combinaison de touches
   */
  getKeyCombo(event) {
    const parts = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    parts.push(event.key);
    return parts.join('+');
  }

  /**
   * Gérer les touches en mode kiosque
   */
  handleKeyDown(event) {
    if (!this.isKioskMode) return;
    
    // Empêcher certaines combinaisons
    const blockedCombos = [
      'F11', 'F12', 'Ctrl+Shift+I', 'Ctrl+Shift+J',
      'Ctrl+U', 'Alt+F4', 'Ctrl+W'
    ];
    
    const combo = this.getKeyCombo(event);
    if (blockedCombos.includes(combo)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Gérer le menu contextuel
   */
  handleContextMenu(event) {
    if (this.isKioskMode) {
      event.preventDefault();
      return false;
    }
  }

  /**
   * Gérer la sélection de texte
   */
  handleSelectStart(event) {
    if (this.isKioskMode) {
      event.preventDefault();
      return false;
    }
  }

  /**
   * Gérer les changements de plein écran
   */
  handleFullscreenChange() {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    
    this.isFullscreen = isCurrentlyFullscreen;
    localStorage.setItem('fullscreenMode', isCurrentlyFullscreen.toString());
    
    // Si on sort du plein écran en mode kiosque, le remettre automatiquement
    if (this.isKioskMode && !isCurrentlyFullscreen) {
      setTimeout(() => this.enableFullscreen(), 100);
    }
  }

  /**
   * Gérer la fermeture de fenêtre
   */
  handleBeforeUnload(event) {
    if (this.isKioskMode) {
      event.preventDefault();
      event.returnValue = 'Êtes-vous sûr de vouloir quitter le mode kiosque ?';
      return event.returnValue;
    }
  }

  /**
   * Envoyer un événement de changement de mode kiosque
   */
  dispatchKioskEvent(type) {
    const event = new CustomEvent('kioskModeChanged', {
      detail: {
        type,
        isKioskMode: this.isKioskMode,
        isFullscreen: this.isFullscreen
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Configurer l'interface pour le mode kiosque
   */
  setupKioskInterface() {
    // Créer le bouton de sortie d'urgence (coin caché)
    this.createEmergencyExitButton();
    
    // Configurer la navigation simplifiée
    this.setupSimplifiedNavigation();
    
    // Désactiver les tooltips et aides
    this.disableHelpElements();
  }

  /**
   * Créer le bouton de sortie d'urgence
   */
  createEmergencyExitButton() {
    const exitButton = document.createElement('div');
    exitButton.id = 'emergency-exit-button';
    exitButton.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 50px;
      height: 50px;
      background: transparent;
      z-index: 10000;
      cursor: pointer;
    `;
    
    let clickCount = 0;
    exitButton.addEventListener('click', () => {
      clickCount++;
      if (clickCount >= 5) {
        this.disableKioskMode();
        clickCount = 0;
      }
      
      // Reset le compteur après 3 secondes
      setTimeout(() => {
        clickCount = 0;
      }, 3000);
    });
    
    document.body.appendChild(exitButton);
  }

  /**
   * Obtenir le statut actuel
   */
  getStatus() {
    return {
      isKioskMode: this.isKioskMode,
      isFullscreen: this.isFullscreen,
      hasEmergencyExit: !!document.getElementById('emergency-exit-button')
    };
  }

  /**
   * Configurer les options du mode kiosque
   */
  setKioskOptions(options) {
    const defaultOptions = {
      allowRightClick: false,
      allowTextSelection: false,
      hideCursor: true,
      emergencyExit: true,
      autoFullscreen: true
    };
    
    this.kioskOptions = { ...defaultOptions, ...options };
    localStorage.setItem('kioskOptions', JSON.stringify(this.kioskOptions));
  }

  /**
   * Nettoyer les ressources
   */
  cleanup() {
    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler, true);
    }
    
    const exitButton = document.getElementById('emergency-exit-button');
    if (exitButton) {
      exitButton.remove();
    }
    
    this.disableKioskMode();
  }
}

// Styles CSS pour le mode kiosque
const kioskStyles = `
  .kiosk-mode {
    overflow: hidden !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
  }
  
  .kiosk-mode * {
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
  }
  
  .kiosk-mode [data-kiosk-hide] {
    display: none !important;
  }
  
  .kiosk-mode .admin-only {
    display: none !important;
  }
  
  @media (max-width: 768px) {
    .kiosk-mode {
      font-size: 1.2rem;
    }
  }
`;

// Injecter les styles
const styleSheet = document.createElement('style');
styleSheet.textContent = kioskStyles;
document.head.appendChild(styleSheet);

// Instance globale
export const kioskMode = new KioskModeManager();

export default KioskModeManager;
