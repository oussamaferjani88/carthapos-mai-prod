/**
 * Error Recovery Manager
 * Gestion avancée des erreurs et récupération automatique
 */

class ErrorRecoveryManager {
  constructor() {
    this.errorCount = 0;
    this.maxRetries = 3;
    this.isRecovering = false;
    this.lastError = null;
    this.errorHistory = [];
    this.backupData = {};
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    // Dev-mode detection: prefer Vite's import.meta.env.DEV when available
    let dev = false;
    try {
      dev = Boolean(import.meta?.env?.DEV);
    } catch {
      // In Node/Electron context fallback
      try {
        // eslint-disable-next-line no-undef
        dev = typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production';
      } catch {
        dev = false;
      }
    }
    this.isDev = dev;
  this.lastCriticalShownAt = 0;
  this.notificationCooldownMs = 60000; // 60s throttle for critical notifications
    this.criticalErrors = new Set([
      'ChunkLoadError',
      'TypeError',
      'ReferenceError',
      'NetworkError',
      'DatabaseError'
    ]);
    
    this.init();
  }

  /**
   * Initialiser le gestionnaire d'erreurs
   */
  init() {
    try {
      this.setupErrorHandlers();
      this.setupPeriodicHealthCheck();
      this.loadErrorHistory();
      
      // Exposer globalement
      window.errorRecovery = this;
      
      console.log('Error recovery manager initialized');
    } catch (error) {
      console.error('Failed to initialize error recovery:', error);
      // Fallback minimal
      window.addEventListener('error', (e) => {
        console.error('Unhandled error:', e.error);
      });
    }
  }

  /**
   * Configurer les gestionnaires d'erreurs
   */
  setupErrorHandlers() {
    try {
      // Erreurs JavaScript globales
      window.addEventListener('error', this.handleGlobalError.bind(this));
      
      // Erreurs de promesses non catchées
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
      
      // Erreurs de chunks (modules manquants)
      window.addEventListener('error', this.handleChunkError.bind(this));
      
  // Erreurs réseau (seulement si Electron)
      if (this.isElectron && typeof this.setupNetworkErrorHandling === 'function') {
        this.setupNetworkErrorHandling();
      }
      
      // Surveiller la mémoire (seulement si Electron)
      if (this.isElectron && typeof this.setupMemoryMonitoring === 'function') {
        this.setupMemoryMonitoring();
      }
    } catch (error) {
      console.warn('Some error handlers could not be setup:', error.message);
    }
  }

  /**
   * Configurer la surveillance réseau (Electron uniquement)
   */
  setupNetworkErrorHandling() {
    if (!this.isElectron) return;
    
    // Implementation pour Electron
    console.log('Network error handling setup (Electron mode)');
  }

  /**
   * Configurer la surveillance mémoire (Electron uniquement)
   */
  setupMemoryMonitoring() {
    if (!this.isElectron) return;
    
    // Implementation pour Electron
    console.log('Memory monitoring setup (Electron mode)');
  }

  /**
   * Gérer les erreurs globales
   */
  handleGlobalError(event) {
    const error = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      timestamp: new Date().toISOString(),
      type: 'javascript',
      stack: event.error?.stack
    };

    this.processError(error);
  }

  /**
   * Gérer les promesses rejetées
   */
  handleUnhandledRejection(event) {
    const error = {
      message: event.reason?.message || 'Unhandled Promise Rejection',
      reason: event.reason,
      timestamp: new Date().toISOString(),
      type: 'promise',
      stack: event.reason?.stack
    };

    this.processError(error);
    event.preventDefault(); // Empêcher l'affichage dans la console
  }

  /**
   * Gérer les erreurs de chunks
   */
  handleChunkError(event) {
    if (event.target.tagName === 'SCRIPT' && event.target.src) {
      const error = {
        message: 'Chunk load error',
        filename: event.target.src,
        timestamp: new Date().toISOString(),
        type: 'chunk',
        target: event.target.src
      };

      this.processError(error);
      this.attemptChunkRecovery(event.target.src);
    }
  }

  /**
   * Traiter une erreur
   */
  async processError(error) {
    this.lastError = error;
    this.errorCount++;
    this.errorHistory.push(error);
    
    // Limiter l'historique
    if (this.errorHistory.length > 100) {
      this.errorHistory.splice(0, 50);
    }
    
    // Sauvegarder l'historique
    this.saveErrorHistory();
    
    // Analyser la gravité
    const severity = this.analyzeSeverity(error);
    
    // Logger l'erreur
    this.logError(error, severity);
    
    // Notifier l'utilisateur
    this.notifyUser(error, severity);
    
    // Tentative de récupération
    await this.attemptRecovery(error, severity);
  }

  /**
   * Analyser la gravité d'une erreur
   */
  analyzeSeverity(error) {
    // En dev, être moins agressif pour éviter le spam
    if (this.isDev) {
      if (error?.message?.toLowerCase?.().includes('chunk') ||
          error?.message?.toLowerCase?.().includes('network') ||
          error?.message?.toLowerCase?.().includes('database')) {
        return 'critical';
      }
      return 'medium';
    }

    // En production, erreurs critiques
    if (this.criticalErrors.has(error.error?.name) ||
        (typeof error.message === 'string' && (
          error.message.includes('chunk') ||
          error.message.includes('network') ||
          error.message.includes('database')
        ))) {
      return 'critical';
    }
    
    // Erreurs fréquentes
    if (this.errorCount > 5 && 
        this.errorHistory.filter(e => e.message === error.message).length > 3) {
      return 'critical';
    }
    
    // Erreurs UI
    if (error.message.includes('element') || 
        error.message.includes('undefined') ||
        error.type === 'promise') {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Logger une erreur
   */
  logError(error, severity) {
    const logLevel = severity === 'critical' ? 'error' : 
                    severity === 'medium' ? 'warn' : 'info';
    
    console[logLevel]('Error captured:', {
      message: error.message,
      type: error.type,
      severity,
      timestamp: error.timestamp,
      stack: error.stack,
      errorCount: this.errorCount
    });
    
    // Envoyer au backend si disponible
    this.sendErrorReport(error, severity);
  }

  /**
   * Notifier l'utilisateur
   */
  notifyUser(error, severity) {
    if (severity === 'critical') {
      const now = Date.now();
      if (now - this.lastCriticalShownAt < this.notificationCooldownMs) return;
      this.lastCriticalShownAt = now;

      // En dev, ne pas afficher un overlay persistant
      if (this.isDev) {
        window.showNotification?.('Erreur détectée (dev) – récupération en cours...', 'warning', { duration: 4000 });
        return;
      }

      window.showNotification?.(
        'Erreur critique détectée. Récupération en cours...',
        'error',
        {
          persistent: true,
          actions: [
            {
              id: 'reload',
              label: 'Recharger',
              handler: () => window.location.reload()
            },
            {
              id: 'backup',
              label: 'Sauvegarder',
              handler: () => this.createEmergencyBackup()
            }
          ]
        }
      );
    } else if (severity === 'medium') {
      window.showNotification?.(
        'Une erreur est survenue. Le système tente de récupérer.',
        'warning',
        { duration: 5000 }
      );
    }
  }

  /**
   * Tentative de récupération
   */
  async attemptRecovery(error, severity) {
    if (this.isRecovering) return;
    
    this.isRecovering = true;
    
    try {
      switch (severity) {
        case 'critical':
          await this.criticalRecovery(error);
          break;
        case 'medium':
          await this.mediumRecovery(error);
          break;
        case 'low':
          await this.lowRecovery(error);
          break;
      }
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      await this.fallbackRecovery();
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Récupération critique
   */
  async criticalRecovery(error) {
    console.log('Attempting critical recovery...');
    
    // 1. Sauvegarder les données en cours
    await this.createEmergencyBackup();
    
    // 2. Nettoyer la mémoire
    this.clearMemoryLeaks();
    
    // 3. Réinitialiser les modules défaillants
    await this.reinitializeModules();
    
    // 4. Si échec, proposer rechargement
    if (this.errorCount > this.maxRetries) {
      this.offerReload();
    }
  }

  /**
   * Récupération moyenne
   */
  async mediumRecovery(error) {
    console.log('Attempting medium recovery...');
    
    // 1. Nettoyer les timers et événements
    this.cleanupTimersAndEvents();
    
    // 2. Réinitialiser les composants UI problématiques
    this.resetProblematicComponents();
    
    // 3. Vider les caches
    this.clearCaches();
  }

  /**
   * Récupération légère
   */
  async lowRecovery(error) {
    console.log('Attempting low recovery...');
    
    // 1. Nettoyer les variables temporaires
    this.cleanupTemporaryData();
    
    // 2. Réessayer les opérations échouées
    this.retryFailedOperations();
  }

  /**
   * Récupération de fallback
   */
  async fallbackRecovery() {
    console.log('Attempting fallback recovery...');
    
    // Dernier recours : rechargement de la page
    setTimeout(() => {
      if (this.isDev) {
        console.warn('Dev mode: suppressing reload confirm. You can reload manually.');
        return;
      }
      if (confirm('Le système a rencontré une erreur critique. Recharger la page ?')) {
        window.location.reload();
      }
    }, 2000);
  }

  /**
   * Récupération de chunks manquants
   */
  async attemptChunkRecovery(chunkUrl) {
    console.log('Attempting chunk recovery for:', chunkUrl);
    
    // Nettoyer le cache des modules
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.unregister();
      } catch (error) {
        console.warn('Could not unregister service worker:', error);
      }
    }
    
    // Proposer rechargement
    setTimeout(() => {
      if (this.isDev) {
        console.warn('Dev mode: chunk load issue – consider refreshing manually.');
        return;
      }
      if (confirm('Un module nécessaire n\'a pas pu être chargé. Recharger la page ?')) {
        window.location.reload();
      }
    }, 1000);
  }

  /**
   * Créer une sauvegarde d'urgence
   */
  async createEmergencyBackup() {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        currentSale: localStorage.getItem('currentSale'),
        cart: localStorage.getItem('cart'),
        userSession: localStorage.getItem('userSession'),
        appState: localStorage.getItem('appState'),
        url: window.location.href,
        userAgent: navigator.userAgent
      };
      
      localStorage.setItem('emergencyBackup', JSON.stringify(backupData));
      
      // Tenter d'envoyer au backend
      if (window.electronAPI) {
        await window.electronAPI.saveEmergencyBackup(backupData);
      }
      
      console.log('Emergency backup created');
      return backupData;
    } catch (error) {
      console.error('Failed to create emergency backup:', error);
    }
  }

  /**
   * Restaurer depuis une sauvegarde d'urgence
   */
  async restoreFromEmergencyBackup() {
    try {
      const backup = localStorage.getItem('emergencyBackup');
      if (!backup) return false;
      
      const backupData = JSON.parse(backup);
      
      // Restaurer les données
      if (backupData.currentSale) {
        localStorage.setItem('currentSale', backupData.currentSale);
      }
      if (backupData.cart) {
        localStorage.setItem('cart', backupData.cart);
      }
      if (backupData.userSession) {
        localStorage.setItem('userSession', backupData.userSession);
      }
      
      window.showNotification?.('Données restaurées depuis la sauvegarde d\'urgence', 'success');
      console.log('Emergency backup restored');
      return true;
    } catch (error) {
      console.error('Failed to restore emergency backup:', error);
      return false;
    }
  }

  /**
   * Nettoyer les fuites mémoire
   */
  clearMemoryLeaks() {
    // Nettoyer les timers globaux
    for (let i = 1; i < 99999; i++) {
      window.clearTimeout(i);
      window.clearInterval(i);
    }
    
    // Nettoyer les événements orphelins
    const elementsWithEvents = document.querySelectorAll('*');
    elementsWithEvents.forEach(element => {
      if (element._listeners) {
        delete element._listeners;
      }
    });
    
    // Forcer le garbage collection si possible
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * Réinitialiser les modules
   */
  async reinitializeModules() {
    try {
      // Réinitialiser les modules critiques
      if (window.electronAPI) {
        await window.electronAPI.reinitialize();
      }
      
      // Recharger les données essentielles
      if (window.loadEssentialData) {
        await window.loadEssentialData();
      }
      
      // Redémarrer les services
      this.restartServices();
    } catch (error) {
      console.error('Module reinitialization failed:', error);
    }
  }

  /**
   * Redémarrer les services
   */
  restartServices() {
    // Redémarrer les gestionnaires
    if (window.notificationManager) {
      window.notificationManager.init();
    }
    
    if (window.keyboardShortcuts) {
      window.keyboardShortcuts.init();
    }
    
    // Redémarrer les connexions
    this.restartConnections();
  }

  /**
   * Redémarrer les connexions
   */
  restartConnections() {
    // Reconnecter les WebSockets
    if (window.websocket) {
      window.websocket.reconnect();
    }
    
    // Réinitialiser les timers de synchronisation
    if (window.syncManager) {
      window.syncManager.restart();
    }
  }

  /**
   * Proposer rechargement
   */
  offerReload() {
    const message = `Le système a rencontré ${this.errorCount} erreurs. 
                    Il est recommandé de recharger la page pour éviter tout dysfonctionnement.`;
    
    window.showNotification?.(message, 'error', {
      persistent: true,
      actions: [
        {
          id: 'reload_now',
          label: 'Recharger maintenant',
          handler: () => window.location.reload()
        },
        {
          id: 'backup_and_reload',
          label: 'Sauvegarder et recharger',
          handler: async () => {
            await this.createEmergencyBackup();
            window.location.reload();
          }
        },
        {
          id: 'continue',
          label: 'Continuer (risqué)',
          handler: () => {
            this.errorCount = 0; // Reset le compteur
          }
        }
      ]
    });
  }

  /**
   * Vérification périodique de santé
   */
  setupPeriodicHealthCheck() {
    const interval = this.isDev ? 300000 : 60000; // 5 min en dev
    setInterval(() => {
      this.performHealthCheck();
    }, interval);
  }

  /**
   * Effectuer une vérification de santé
   */
  performHealthCheck() {
    const healthMetrics = {
      memoryUsage: this.getMemoryUsage(),
      errorRate: this.getErrorRate(),
      responseTime: this.getResponseTime(),
      storageUsage: this.getStorageUsage()
    };
    
    // Analyser les métriques
    if (healthMetrics.memoryUsage > 0.8) {
      console.warn('High memory usage detected:', healthMetrics.memoryUsage);
      this.clearMemoryLeaks();
    }
    
    if (healthMetrics.errorRate > 0.1) {
      console.warn('High error rate detected:', healthMetrics.errorRate);
    }
    
    if (healthMetrics.storageUsage > 0.9) {
      console.warn('Storage almost full:', healthMetrics.storageUsage);
      this.cleanupStorage();
    }
  }

  /**
   * Obtenir l'utilisation mémoire
   */
  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
    }
    return 0;
  }

  /**
   * Obtenir le taux d'erreur
   */
  getErrorRate() {
    const recentErrors = this.errorHistory.filter(
      error => Date.now() - new Date(error.timestamp).getTime() < 300000 // 5 minutes
    );
    return recentErrors.length / 100; // Taux sur 100 opérations
  }

  /**
   * Obtenir le temps de réponse
   */
  getResponseTime() {
    return performance.now();
  }

  /**
   * Obtenir l'utilisation du stockage
   */
  getStorageUsage() {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          totalSize += localStorage[key].length;
        }
      }
      // Approximation: 5MB limite typique
      return totalSize / (5 * 1024 * 1024);
    } catch {
      return 0;
    }
  }

  /**
   * Nettoyer le stockage
   */
  cleanupStorage() {
    try {
      // Supprimer les anciennes sauvegardes
      const keysToClean = ['errorHistory', 'oldBackups', 'temporaryData'];
      keysToClean.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Compresser les données importantes
      this.compressStoredData();
      
      console.log('Storage cleanup completed');
    } catch (error) {
      console.error('Storage cleanup failed:', error);
    }
  }

  /**
   * Compresser les données stockées
   */
  compressStoredData() {
    // Implémenter la compression des données si nécessaire
    // Pour l'instant, on supprime les données anciennes
    const oldHistory = this.errorHistory.filter(
      error => Date.now() - new Date(error.timestamp).getTime() > 604800000 // 7 jours
    );
    
    this.errorHistory = this.errorHistory.filter(
      error => Date.now() - new Date(error.timestamp).getTime() <= 604800000
    );
    
    this.saveErrorHistory();
  }

  /**
   * Sauvegarder l'historique des erreurs
   */
  saveErrorHistory() {
    try {
      localStorage.setItem('errorHistory', JSON.stringify(this.errorHistory));
    } catch (error) {
      console.error('Failed to save error history:', error);
    }
  }

  /**
   * Charger l'historique des erreurs
   */
  loadErrorHistory() {
    try {
      const stored = localStorage.getItem('errorHistory');
      if (stored) {
        this.errorHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load error history:', error);
      this.errorHistory = [];
    }
  }

  /**
   * Envoyer un rapport d'erreur
   */
  async sendErrorReport(error, severity) {
    try {
      if (window.electronAPI) {
        await window.electronAPI.sendErrorReport({
          error,
          severity,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionData: this.getSessionData()
        });
      }
    } catch (reportError) {
      console.error('Failed to send error report:', reportError);
    }
  }

  /**
   * Obtenir les données de session
   */
  getSessionData() {
    return {
      userId: localStorage.getItem('userId'),
      sessionStart: localStorage.getItem('sessionStart'),
      currentPage: window.location.pathname,
      userActions: localStorage.getItem('userActions')
    };
  }

  /**
   * Obtenir les statistiques d'erreurs
   */
  getErrorStats() {
    return {
      totalErrors: this.errorCount,
      recentErrors: this.errorHistory.filter(
        error => Date.now() - new Date(error.timestamp).getTime() < 3600000 // 1 heure
      ).length,
      errorsByType: this.errorHistory.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {}),
      criticalErrors: this.errorHistory.filter(
        error => this.analyzeSeverity(error) === 'critical'
      ).length,
      lastError: this.lastError,
      isRecovering: this.isRecovering
    };
  }

  /**
   * Réinitialiser les compteurs
   */
  reset() {
    this.errorCount = 0;
    this.errorHistory = [];
    this.lastError = null;
    this.isRecovering = false;
    localStorage.removeItem('errorHistory');
    console.log('Error recovery manager reset');
  }
}

// Instance globale
export const errorRecovery = new ErrorRecoveryManager();

export default ErrorRecoveryManager;
