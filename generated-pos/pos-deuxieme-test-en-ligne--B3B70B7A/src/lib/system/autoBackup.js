/**
 * Automatic Backup Manager
 * Système de sauvegarde automatique des données
 * DÉSACTIVÉ TEMPORAIREMENT - En attente de l'implémentation des fonctions Electron
 */

class AutoBackupManager {
  constructor() {
    this.isEnabled = false; // 🔴 DÉSACTIVÉ - Les fonctions Electron ne sont pas encore implémentées
    this.backupInterval = 300000; // 5 minutes par défaut
    this.maxBackups = 50;
    this.backupTypes = {
      sales: true,
      products: true,
      customers: true,
      settings: true,
      inventory: true
    };
    this.currentBackupId = null;
    this.backupInProgress = false;
    this.lastBackupTime = null;
    this.backupHistory = [];
    
    this.init();
  }

  /**
   * Initialiser le gestionnaire de sauvegarde
   */
  init() {
    this.loadSettings();
    this.loadBackupHistory();
    this.startAutomaticBackup();
    this.setupEventListeners();
    
    // Exposer globalement
    window.backupManager = this;
    
    console.log('Automatic backup manager initialized');
  }

  /**
   * Charger les paramètres
   */
  loadSettings() {
    try {
      const settings = localStorage.getItem('backupSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        this.isEnabled = parsed.isEnabled !== false;
        this.backupInterval = parsed.backupInterval || 300000;
        this.maxBackups = parsed.maxBackups || 50;
        this.backupTypes = { ...this.backupTypes, ...parsed.backupTypes };
      }
    } catch (error) {
      console.error('Error loading backup settings:', error);
    }
  }

  /**
   * Sauvegarder les paramètres
   */
  saveSettings() {
    try {
      const settings = {
        isEnabled: this.isEnabled,
        backupInterval: this.backupInterval,
        maxBackups: this.maxBackups,
        backupTypes: this.backupTypes
      };
      localStorage.setItem('backupSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving backup settings:', error);
    }
  }

  /**
   * Charger l'historique des sauvegardes
   */
  loadBackupHistory() {
    try {
      const history = localStorage.getItem('backupHistory');
      if (history) {
        this.backupHistory = JSON.parse(history);
      }
    } catch (error) {
      console.error('Error loading backup history:', error);
      this.backupHistory = [];
    }
  }

  /**
   * Sauvegarder l'historique des sauvegardes
   */
  saveBackupHistory() {
    try {
      // Limiter l'historique
      if (this.backupHistory.length > 100) {
        this.backupHistory = this.backupHistory.slice(-100);
      }
      localStorage.setItem('backupHistory', JSON.stringify(this.backupHistory));
    } catch (error) {
      console.error('Error saving backup history:', error);
    }
  }

  /**
   * Démarrer la sauvegarde automatique
   */
  startAutomaticBackup() {
    // 🔴 DÉSACTIVÉ - Ne rien faire si le backup est désactivé
    if (!this.isEnabled) {
      console.log('Backup system is disabled, automatic backup will not start');
      return;
    }
    
    // Nettoyer l'intervalle existant
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }
    
    // Créer un nouvel intervalle
    this.backupTimer = setInterval(() => {
      this.performAutomaticBackup();
    }, this.backupInterval);
    
    // Première sauvegarde immédiate si aucune sauvegarde récente
    const lastBackup = this.getLastBackup();
    if (!lastBackup || Date.now() - new Date(lastBackup.timestamp).getTime() > this.backupInterval) {
      setTimeout(() => this.performAutomaticBackup(), 5000); // Attendre 5 secondes après l'initialisation
    }
    
    console.log(`Automatic backup started with interval: ${this.backupInterval}ms`);
  }

  /**
   * Arrêter la sauvegarde automatique
   */
  stopAutomaticBackup() {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
    console.log('Automatic backup stopped');
  }

  /**
   * Effectuer une sauvegarde automatique
   */
  async performAutomaticBackup() {
    // 🔴 DÉSACTIVÉ - Ne rien faire si le backup est désactivé
    if (!this.isEnabled) {
      console.log('Backup system is disabled, skipping automatic backup');
      return;
    }

    if (this.backupInProgress) {
      console.log('Backup already in progress, skipping');
      return;
    }

    try {
      await this.createBackup('automatic');
    } catch (error) {
      console.error('Automatic backup failed:', error);
      
      // Notifier l'échec
      window.showNotification?.(
        'Échec de la sauvegarde automatique',
        'warning',
        {
          duration: 5000,
          actions: [
            {
              id: 'retry',
              label: 'Réessayer',
              handler: () => this.performAutomaticBackup()
            }
          ]
        }
      );
    }
  }

  /**
   * Créer une sauvegarde
   */
  async createBackup(type = 'manual', options = {}) {
    // 🔴 DÉSACTIVÉ - Ne rien faire si le backup est désactivé
    if (!this.isEnabled) {
      console.log('Backup system is disabled, skipping backup creation');
      window.showNotification?.('Système de sauvegarde désactivé', 'warning', { duration: 3000 });
      return null;
    }

    if (this.backupInProgress) {
      throw new Error('Une sauvegarde est déjà en cours');
    }

    this.backupInProgress = true;
    this.currentBackupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Notifier le début de la sauvegarde
      const notificationId = window.showNotification?.(
        'Sauvegarde en cours...',
        'info',
        { duration: 0, icon: '💾' }
      );

      // Collecter les données
      const backupData = await this.collectBackupData(options);
      
      // Créer l'objet de sauvegarde
      const backup = {
        id: this.currentBackupId,
        timestamp: new Date().toISOString(),
        type,
        version: '1.0',
        size: this.calculateDataSize(backupData),
        checksum: this.generateChecksum(backupData),
        data: backupData,
        metadata: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          user: localStorage.getItem('currentUser') || 'unknown',
          deviceId: this.getDeviceId()
        }
      };

      // Sauvegarder localement
      await this.saveBackupLocally(backup);
      
      // Sauvegarder sur le backend si disponible
      if (window.electronAPI) {
        await this.saveBackupRemotely(backup);
      }
      
      // Mettre à jour l'historique
      this.addToHistory(backup);
      
      // Nettoyer les anciennes sauvegardes
      await this.cleanupOldBackups();
      
      this.lastBackupTime = new Date().toISOString();
      
      // Fermer la notification de progression
      if (notificationId) {
        window.notificationManager?.remove(notificationId);
      }
      
      // Notifier le succès
      window.showNotification?.(
        `Sauvegarde ${type} terminée (${this.formatSize(backup.size)})`,
        'success',
        { 
          duration: 3000, 
          icon: '✅',
          actions: type === 'manual' ? [
            {
              id: 'view_backup',
              label: 'Voir les détails',
              handler: () => this.showBackupDetails(backup.id)
            }
          ] : []
        }
      );

      console.log('Backup completed:', backup.id);
      return backup;

    } catch (error) {
      console.error('Backup failed:', error);
      
      window.showNotification?.(
        `Échec de la sauvegarde: ${error.message}`,
        'error',
        { 
          duration: 8000,
          actions: [
            {
              id: 'retry',
              label: 'Réessayer',
              handler: () => this.createBackup(type, options)
            }
          ]
        }
      );
      
      throw error;
    } finally {
      this.backupInProgress = false;
      this.currentBackupId = null;
    }
  }

  /**
   * Collecter les données à sauvegarder
   */
  async collectBackupData(options = {}) {
    const data = {};

    try {
      // Ventes
      if (this.backupTypes.sales || options.includeSales) {
        data.sales = await this.getSalesData();
      }

      // Produits
      if (this.backupTypes.products || options.includeProducts) {
        data.products = await this.getProductsData();
      }

      // Clients
      if (this.backupTypes.customers || options.includeCustomers) {
        data.customers = await this.getCustomersData();
      }

      // Paramètres
      if (this.backupTypes.settings || options.includeSettings) {
        data.settings = await this.getSettingsData();
      }

      // Inventaire
      if (this.backupTypes.inventory || options.includeInventory) {
        data.inventory = await this.getInventoryData();
      }

      // Données de session actuelle
      data.currentSession = {
        currentSale: localStorage.getItem('currentSale'),
        cart: localStorage.getItem('cart'),
        userSession: localStorage.getItem('userSession')
      };

      return data;
    } catch (error) {
      console.error('Error collecting backup data:', error);
      throw new Error('Erreur lors de la collecte des données');
    }
  }

  /**
   * Obtenir les données de ventes
   */
  async getSalesData() {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.getSalesData();
      } else {
        // Fallback localStorage
        return {
          sales: JSON.parse(localStorage.getItem('salesHistory') || '[]'),
          transactions: JSON.parse(localStorage.getItem('transactions') || '[]')
        };
      }
    } catch (error) {
      console.error('Error getting sales data:', error);
      return { sales: [], transactions: [] };
    }
  }

  /**
   * Obtenir les données de produits
   */
  async getProductsData() {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.getProductsData();
      } else {
        return {
          products: JSON.parse(localStorage.getItem('products') || '[]'),
          categories: JSON.parse(localStorage.getItem('categories') || '[]')
        };
      }
    } catch (error) {
      console.error('Error getting products data:', error);
      return { products: [], categories: [] };
    }
  }

  /**
   * Obtenir les données de clients
   */
  async getCustomersData() {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.getCustomersData();
      } else {
        return {
          customers: JSON.parse(localStorage.getItem('customers') || '[]')
        };
      }
    } catch (error) {
      console.error('Error getting customers data:', error);
      return { customers: [] };
    }
  }

  /**
   * Obtenir les données de paramètres
   */
  async getSettingsData() {
    try {
      const settings = {};
      
      // Paramètres localStorage
      const localStorageKeys = [
        'appConfig', 'themeConfig', 'userPreferences',
        'moduleConfig', 'printerSettings', 'backupSettings'
      ];
      
      localStorageKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            settings[key] = JSON.parse(value);
          } catch {
            settings[key] = value;
          }
        }
      });

      return settings;
    } catch (error) {
      console.error('Error getting settings data:', error);
      return {};
    }
  }

  /**
   * Obtenir les données d'inventaire
   */
  async getInventoryData() {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.getInventoryData();
      } else {
        return {
          stockMovements: JSON.parse(localStorage.getItem('stockMovements') || '[]'),
          stockAdjustments: JSON.parse(localStorage.getItem('stockAdjustments') || '[]')
        };
      }
    } catch (error) {
      console.error('Error getting inventory data:', error);
      return { stockMovements: [], stockAdjustments: [] };
    }
  }

  /**
   * Sauvegarder localement
   */
  async saveBackupLocally(backup) {
    try {
      // Sauvegarder la metadata seulement (les données complètes sont trop lourdes pour localStorage)
      const metadata = {
        id: backup.id,
        timestamp: backup.timestamp,
        type: backup.type,
        size: backup.size,
        checksum: backup.checksum,
        metadata: backup.metadata
      };

      const localBackups = JSON.parse(localStorage.getItem('localBackups') || '[]');
      localBackups.push(metadata);
      
      // Limiter le nombre de métadonnées locales
      if (localBackups.length > this.maxBackups) {
        localBackups.splice(0, localBackups.length - this.maxBackups);
      }
      
      localStorage.setItem('localBackups', JSON.stringify(localBackups));
      
      // Pour le développement, sauvegarder aussi dans IndexedDB
      await this.saveToIndexedDB(backup);
      
    } catch (error) {
      console.error('Error saving backup locally:', error);
      throw new Error('Erreur lors de la sauvegarde locale');
    }
  }

  /**
   * Sauvegarder sur IndexedDB
   */
  async saveToIndexedDB(backup) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('POSBackups', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        
        const addRequest = store.add(backup);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('backups')) {
          const store = db.createObjectStore('backups', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('type', 'type');
        }
      };
    });
  }

  /**
   * Sauvegarder à distance
   */
  async saveBackupRemotely(backup) {
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveBackup(backup);
      }
    } catch (error) {
      console.warn('Remote backup failed:', error);
      // Ne pas faire échouer la sauvegarde si le remote échoue
    }
  }

  /**
   * Restaurer une sauvegarde
   */
  async restoreBackup(backupId, options = {}) {
    try {
      // Confirmer avec l'utilisateur
      if (!options.confirmed && !confirm('Êtes-vous sûr de vouloir restaurer cette sauvegarde ? Les données actuelles seront écrasées.')) {
        return false;
      }

      window.showNotification?.('Restauration en cours...', 'info', { duration: 0, icon: '🔄' });

      // Récupérer la sauvegarde
      const backup = await this.getBackup(backupId);
      if (!backup) {
        throw new Error('Sauvegarde introuvable');
      }

      // Vérifier l'intégrité
      if (!this.verifyBackupIntegrity(backup)) {
        throw new Error('Sauvegarde corrompue');
      }

      // Sauvegarder l'état actuel avant restauration
      await this.createBackup('pre_restore');

      // Restaurer les données
      await this.restoreBackupData(backup.data, options);

      window.showNotification?.('Restauration terminée avec succès', 'success', { duration: 5000 });

      // Recharger la page pour appliquer les changements
      if (confirm('Restauration terminée. Recharger la page pour appliquer les changements ?')) {
        window.location.reload();
      }

      return true;
    } catch (error) {
      console.error('Backup restoration failed:', error);
      window.showNotification?.(`Échec de la restauration: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Récupérer une sauvegarde
   */
  async getBackup(backupId) {
    try {
      // Essayer IndexedDB d'abord
      const backup = await this.getFromIndexedDB(backupId);
      if (backup) return backup;

      // Essayer le backend
      if (window.electronAPI) {
        return await window.electronAPI.getBackup(backupId);
      }

      return null;
    } catch (error) {
      console.error('Error getting backup:', error);
      return null;
    }
  }

  /**
   * Récupérer depuis IndexedDB
   */
  async getFromIndexedDB(backupId) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('POSBackups', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['backups'], 'readonly');
        const store = transaction.objectStore('backups');
        
        const getRequest = store.get(backupId);
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Restaurer les données
   */
  async restoreBackupData(data, options = {}) {
    try {
      // Restaurer les ventes
      if (data.sales && (options.restoreSales !== false)) {
        await this.restoreSalesData(data.sales);
      }

      // Restaurer les produits
      if (data.products && (options.restoreProducts !== false)) {
        await this.restoreProductsData(data.products);
      }

      // Restaurer les clients
      if (data.customers && (options.restoreCustomers !== false)) {
        await this.restoreCustomersData(data.customers);
      }

      // Restaurer les paramètres
      if (data.settings && (options.restoreSettings !== false)) {
        await this.restoreSettingsData(data.settings);
      }

      // Restaurer l'inventaire
      if (data.inventory && (options.restoreInventory !== false)) {
        await this.restoreInventoryData(data.inventory);
      }
    } catch (error) {
      console.error('Error restoring backup data:', error);
      throw error;
    }
  }

  /**
   * Calculer la taille des données
   */
  calculateDataSize(data) {
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Générer une somme de contrôle
   */
  generateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Vérifier l'intégrité d'une sauvegarde
   */
  verifyBackupIntegrity(backup) {
    try {
      const calculatedChecksum = this.generateChecksum(backup.data);
      return calculatedChecksum === backup.checksum;
    } catch (error) {
      console.error('Error verifying backup integrity:', error);
      return false;
    }
  }

  /**
   * Ajouter à l'historique
   */
  addToHistory(backup) {
    const historyEntry = {
      id: backup.id,
      timestamp: backup.timestamp,
      type: backup.type,
      size: backup.size,
      success: true
    };

    this.backupHistory.push(historyEntry);
    this.saveBackupHistory();
  }

  /**
   * Nettoyer les anciennes sauvegardes
   */
  async cleanupOldBackups() {
    try {
      // Nettoyer IndexedDB
      await this.cleanupIndexedDB();
      
      // Nettoyer localStorage
      const localBackups = JSON.parse(localStorage.getItem('localBackups') || '[]');
      if (localBackups.length > this.maxBackups) {
        const toKeep = localBackups.slice(-this.maxBackups);
        localStorage.setItem('localBackups', JSON.stringify(toKeep));
      }

      // Nettoyer le backend
      if (window.electronAPI) {
        await window.electronAPI.cleanupOldBackups(this.maxBackups);
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  /**
   * Nettoyer IndexedDB
   */
  async cleanupIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('POSBackups', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        const index = store.index('timestamp');
        
        // Récupérer toutes les sauvegardes triées par timestamp
        const getAllRequest = index.getAll();
        getAllRequest.onsuccess = () => {
          const backups = getAllRequest.result;
          
          if (backups.length > this.maxBackups) {
            // Supprimer les plus anciennes
            const toDelete = backups.slice(0, backups.length - this.maxBackups);
            
            let deleted = 0;
            toDelete.forEach(backup => {
              const deleteRequest = store.delete(backup.id);
              deleteRequest.onsuccess = () => {
                deleted++;
                if (deleted === toDelete.length) {
                  resolve();
                }
              };
            });
          } else {
            resolve();
          }
        };
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtenir la liste des sauvegardes
   */
  async getBackupList() {
    try {
      const localBackups = JSON.parse(localStorage.getItem('localBackups') || '[]');
      
      // Ajouter les sauvegardes du backend si disponible
      let remoteBackups = [];
      if (window.electronAPI) {
        try {
          remoteBackups = await window.electronAPI.getBackupList();
        } catch (error) {
          console.warn('Could not get remote backups:', error);
        }
      }

      // Fusionner et dédupliquer
      const allBackups = [...localBackups, ...remoteBackups];
      const uniqueBackups = allBackups.filter((backup, index, self) => 
        index === self.findIndex(b => b.id === backup.id)
      );

      // Trier par timestamp décroissant
      return uniqueBackups.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error getting backup list:', error);
      return [];
    }
  }

  /**
   * Obtenir la dernière sauvegarde
   */
  getLastBackup() {
    try {
      const localBackups = JSON.parse(localStorage.getItem('localBackups') || '[]');
      return localBackups.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0] || null;
    } catch (error) {
      console.error('Error getting last backup:', error);
      return null;
    }
  }

  /**
   * Formater la taille
   */
  formatSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Obtenir un ID de périphérique
   */
  getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * Configurer les écouteurs d'événements
   */
  setupEventListeners() {
    // Sauvegarder avant fermeture
    window.addEventListener('beforeunload', () => {
      if (this.isEnabled) {
        this.createBackup('emergency').catch(console.error);
      }
    });

    // Sauvegarder lors d'événements critiques
    window.addEventListener('error', () => {
      if (this.isEnabled) {
        this.createBackup('error').catch(console.error);
      }
    });
  }

  /**
   * Configurer les options de sauvegarde
   */
  configure(options) {
    this.isEnabled = options.isEnabled !== undefined ? options.isEnabled : this.isEnabled;
    this.backupInterval = options.backupInterval || this.backupInterval;
    this.maxBackups = options.maxBackups || this.maxBackups;
    this.backupTypes = { ...this.backupTypes, ...options.backupTypes };
    
    this.saveSettings();
    
    if (this.isEnabled) {
      this.startAutomaticBackup();
    } else {
      this.stopAutomaticBackup();
    }
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return {
      isEnabled: this.isEnabled,
      backupInterval: this.backupInterval,
      maxBackups: this.maxBackups,
      totalBackups: this.backupHistory.length,
      lastBackupTime: this.lastBackupTime,
      backupInProgress: this.backupInProgress,
      successfulBackups: this.backupHistory.filter(b => b.success).length,
      failedBackups: this.backupHistory.filter(b => !b.success).length
    };
  }
}

// Instance globale
export const autoBackup = new AutoBackupManager();

export default AutoBackupManager;
