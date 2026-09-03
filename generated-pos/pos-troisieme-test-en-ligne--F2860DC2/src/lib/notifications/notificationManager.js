/**
 * Advanced Notification System
 * Système de notifications avec persistance et types avancés
 */

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.maxNotifications = 5;
    this.container = null;
    this.persistentNotifications = [];
    this.soundEnabled = true;
    this.init();
  }

  /**
   * Initialiser le système de notifications
   */
  init() {
    this.createContainer();
    this.loadPersistentNotifications();
    this.setupSounds();
    
    // Exposer globalement
    window.showNotification = this.show.bind(this);
    window.notificationManager = this;
    
    console.log('Notification system initialized');
  }

  /**
   * Créer le conteneur des notifications
   */
  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.className = `
      fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none
      max-w-sm w-full
    `;
    this.container.style.zIndex = '9999';
    document.body.appendChild(this.container);
  }

  /**
   * Afficher une notification
   */
  show(message, type = 'info', options = {}) {
    const notification = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date().toISOString(),
      duration: options.duration || this.getDefaultDuration(type),
      persistent: options.persistent || false,
      actions: options.actions || [],
      icon: options.icon || this.getDefaultIcon(type),
      sound: options.sound !== false,
      priority: options.priority || 'normal'
    };

    // Ajouter à la liste
    this.notifications.push(notification);

    // Sauvegarder si persistant
    if (notification.persistent) {
      this.persistentNotifications.push(notification);
      this.savePersistentNotifications();
    }

    // Créer l'élément DOM
    this.createNotificationElement(notification);

    // Jouer le son
    if (notification.sound && this.soundEnabled) {
      this.playSound(type);
    }

    // Programmer la suppression automatique
    if (notification.duration > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, notification.duration);
    }

    // Limiter le nombre de notifications
    this.limitNotifications();

    return notification.id;
  }

  /**
   * Créer l'élément DOM d'une notification
   */
  createNotificationElement(notification) {
    const element = document.createElement('div');
    element.id = `notification-${notification.id}`;
    element.className = `
      notification-item pointer-events-auto transform transition-all duration-300 ease-in-out
      bg-white border border-gray-200 rounded-lg shadow-lg p-4 mb-2
      animate-slide-in-right max-w-sm
      ${this.getTypeClasses(notification.type)}
    `;

    element.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          ${this.renderIcon(notification.icon, notification.type)}
        </div>
        <div class="ml-3 flex-1">
          <div class="text-sm font-medium text-gray-900">
            ${this.escapeHtml(notification.message)}
          </div>
          ${notification.actions.length > 0 ? this.renderActions(notification) : ''}
          <div class="text-xs text-gray-500 mt-1">
            ${new Date(notification.timestamp).toLocaleTimeString('fr-FR')}
          </div>
        </div>
        <div class="ml-4 flex-shrink-0">
          <button 
            class="text-gray-400 hover:text-gray-600 focus:outline-none"
            onclick="window.notificationManager.remove('${notification.id}')"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
      </div>
      ${notification.persistent ? '<div class="w-full bg-blue-200 h-1 mt-2 rounded"></div>' : ''}
    `;

    // Animation d'entrée
    element.style.transform = 'translateX(100%)';
    element.style.opacity = '0';

    this.container.appendChild(element);

    // Déclencher l'animation
    requestAnimationFrame(() => {
      element.style.transform = 'translateX(0)';
      element.style.opacity = '1';
    });
  }

  /**
   * Obtenir les classes CSS selon le type
   */
  getTypeClasses(type) {
    const classes = {
      success: 'border-green-200 bg-green-50',
      error: 'border-red-200 bg-red-50',
      warning: 'border-yellow-200 bg-yellow-50',
      info: 'border-blue-200 bg-blue-50',
      system: 'border-purple-200 bg-purple-50'
    };
    return classes[type] || classes.info;
  }

  /**
   * Rendre l'icône
   */
  renderIcon(icon, type) {
    if (icon) {
      return `<span class="text-lg">${icon}</span>`;
    }

    const defaultIcons = {
      success: `<svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
      </svg>`,
      error: `<svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
      </svg>`,
      warning: `<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
      </svg>`,
      info: `<svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
      </svg>`,
      system: `<svg class="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
      </svg>`
    };

    return defaultIcons[type] || defaultIcons.info;
  }

  /**
   * Rendre les actions
   */
  renderActions(notification) {
    if (!notification.actions.length) return '';

    const actionsHtml = notification.actions.map(action => `
      <button 
        class="text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-100 mr-2 mt-1"
        onclick="window.notificationManager.executeAction('${notification.id}', '${action.id}')"
      >
        ${this.escapeHtml(action.label)}
      </button>
    `).join('');

    return `<div class="mt-2">${actionsHtml}</div>`;
  }

  /**
   * Exécuter une action
   */
  async executeAction(notificationId, actionId) {
    const notification = this.notifications.find(n => n.id == notificationId);
    if (!notification) return;

    const action = notification.actions.find(a => a.id === actionId);
    if (!action) return;

    try {
      if (action.handler) {
        await action.handler();
      }
      
      // Fermer la notification après l'action
      this.remove(notificationId);
    } catch (error) {
      console.error('Error executing notification action:', error);
      this.show('Erreur lors de l\'exécution de l\'action', 'error');
    }
  }

  /**
   * Supprimer une notification
   */
  remove(id) {
    const element = document.getElementById(`notification-${id}`);
    if (element) {
      // Animation de sortie
      element.style.transform = 'translateX(100%)';
      element.style.opacity = '0';
      
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }, 300);
    }

    // Supprimer de la liste
    this.notifications = this.notifications.filter(n => n.id !== id);
    
    // Supprimer des notifications persistantes
    this.persistentNotifications = this.persistentNotifications.filter(n => n.id !== id);
    this.savePersistentNotifications();
  }

  /**
   * Supprimer toutes les notifications
   */
  clear() {
    this.notifications.forEach(notification => {
      this.remove(notification.id);
    });
  }

  /**
   * Notification pour stock faible
   */
  showLowStockAlert(product) {
    return this.show(
      `Stock faible: ${product.name} (${product.stock} restant)`,
      'warning',
      {
        persistent: true,
        icon: '📦',
        actions: [
          {
            id: 'view_product',
            label: 'Voir le produit',
            handler: () => this.navigateToProduct(product.id)
          },
          {
            id: 'reorder',
            label: 'Commander',
            handler: () => this.initiateReorder(product.id)
          }
        ]
      }
    );
  }

  /**
   * Notification pour paiement réussi
   */
  showPaymentSuccess(amount, method) {
    return this.show(
      `Paiement de ${amount}€ réussi (${method})`,
      'success',
      {
        duration: 3000,
        icon: '💳',
        sound: true
      }
    );
  }

  /**
   * Notification d'erreur système
   */
  showSystemError(error) {
    return this.show(
      `Erreur système: ${error.message}`,
      'error',
      {
        persistent: true,
        icon: '⚠️',
        actions: [
          {
            id: 'retry',
            label: 'Réessayer',
            handler: () => window.location.reload()
          },
          {
            id: 'report',
            label: 'Signaler',
            handler: () => this.reportError(error)
          }
        ]
      }
    );
  }

  /**
   * Notification de sauvegarde
   */
  showBackupStatus(status, details = '') {
    const types = {
      'started': { type: 'info', icon: '💾', message: 'Sauvegarde démarrée...' },
      'completed': { type: 'success', icon: '✅', message: 'Sauvegarde terminée' },
      'failed': { type: 'error', icon: '❌', message: 'Échec de la sauvegarde' }
    };

    const config = types[status] || types.started;
    
    return this.show(
      `${config.message} ${details}`,
      config.type,
      {
        icon: config.icon,
        duration: status === 'started' ? 0 : 4000
      }
    );
  }

  /**
   * Obtenir la durée par défaut selon le type
   */
  getDefaultDuration(type) {
    const durations = {
      success: 3000,
      error: 0, // Persistant jusqu'à fermeture manuelle
      warning: 5000,
      info: 4000,
      system: 0
    };
    return durations[type] || 4000;
  }

  /**
   * Obtenir l'icône par défaut selon le type
   */
  getDefaultIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      system: '⚙️'
    };
    return icons[type] || icons.info;
  }

  /**
   * Limiter le nombre de notifications
   */
  limitNotifications() {
    while (this.notifications.length > this.maxNotifications) {
      const oldest = this.notifications[0];
      this.remove(oldest.id);
    }
  }

  /**
   * Charger les notifications persistantes
   */
  loadPersistentNotifications() {
    try {
      const stored = localStorage.getItem('persistentNotifications');
      if (stored) {
        this.persistentNotifications = JSON.parse(stored);
        
        // Réafficher les notifications persistantes
        this.persistentNotifications.forEach(notification => {
          this.notifications.push(notification);
          this.createNotificationElement(notification);
        });
      }
    } catch (error) {
      console.error('Error loading persistent notifications:', error);
    }
  }

  /**
   * Sauvegarder les notifications persistantes
   */
  savePersistentNotifications() {
    try {
      localStorage.setItem('persistentNotifications', 
        JSON.stringify(this.persistentNotifications));
    } catch (error) {
      console.error('Error saving persistent notifications:', error);
    }
  }

  /**
   * Configurer les sons
   */
  setupSounds() {
    this.sounds = {
      success: this.createAudioContext(800, 100), // Son aigu court
      error: this.createAudioContext(300, 300),   // Son grave long
      warning: this.createAudioContext(600, 200), // Son moyen
      info: this.createAudioContext(500, 150),    // Son neutre
      system: this.createAudioContext(400, 100)   // Son système
    };
  }

  /**
   * Créer un contexte audio
   */
  createAudioContext(frequency, duration) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      return { audioContext, frequency, duration };
    } catch (error) {
      console.warn('Audio context not supported');
      return null;
    }
  }

  /**
   * Jouer un son
   */
  playSound(type) {
    if (!this.soundEnabled) return;
    
    const sound = this.sounds[type];
    if (!sound || !sound.audioContext) return;

    try {
      const oscillator = sound.audioContext.createOscillator();
      const gainNode = sound.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(sound.audioContext.destination);
      
      oscillator.frequency.value = sound.frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, sound.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, 
        sound.audioContext.currentTime + sound.duration / 1000);
      
      oscillator.start(sound.audioContext.currentTime);
      oscillator.stop(sound.audioContext.currentTime + sound.duration / 1000);
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  }

  /**
   * Activer/Désactiver les sons
   */
  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
    localStorage.setItem('notificationSoundEnabled', enabled.toString());
  }

  /**
   * Échapper le HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return {
      total: this.notifications.length,
      persistent: this.persistentNotifications.length,
      byType: this.notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

// Styles CSS à injecter
const styles = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
  
  .notification-item {
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
  }
`;

// Injecter les styles
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Instance globale
export const notificationManager = new NotificationManager();

export default NotificationManager;
