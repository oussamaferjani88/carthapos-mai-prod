import { POSComponentRegistry } from '../constants/POSComponentRegistry';
import { POSConfiguration } from '../config/POSConfiguration';

// Classe pour une configuration flexible et unifiée
export class FlexiblePOSConfiguration {
  static createConfiguration(userInput = {}) {
    const baseConfig = POSConfiguration.createConfig(userInput);
    
    return {
      ...baseConfig,
      
      // Modules activés avec leur configuration spécifique
      enabledModules: this.processModules(userInput.modules || []),
      
      // Navigation dynamique basée sur les modules
      navigation: this.generateNavigation(userInput.modules || []),
      
      // Pages disponibles
      availablePages: this.getAvailablePages(userInput.modules || []),
      
      // Configuration spécifique pour le preview
      previewMode: {
        showDemoData: userInput.showDemoData !== false,
        showPreviewIndicator: userInput.showPreviewIndicator !== false,
        allowDragAndDrop: userInput.allowDragAndDrop || false
      }
    };
  }
  
  static processModules(modules) {
    return modules.map(module => {
      // Normalise le format des modules
      if (typeof module === 'string') {
        return {
          id: module.toLowerCase().replace(/\s+/g, '-'),
          name: module,
          enabled: true,
          config: {}
        };
      }
      
      return {
        id: module.id || module.name?.toLowerCase().replace(/\s+/g, '-'),
        name: module.name || module.id,
        enabled: module.enabled !== false,
        config: module.config || {}
      };
    });
  }
  
  static generateNavigation(modules) {
    const processedModules = this.processModules(modules);
    return POSComponentRegistry.getNavigationItems(processedModules);
  }
  
  static getAvailablePages(modules) {
    const processedModules = this.processModules(modules);
    return POSComponentRegistry.getAvailableComponents(processedModules);
  }
  
  // Méthode pour tester différentes configurations
  static createTestConfigurations() {
    return {
      // Configuration Restaurant complet
      restaurant: this.createConfiguration({
        businessName: 'Restaurant Le Gourmet',
        primaryColor: '#8B5A2B',
        accentColor: '#D2691E',
        modules: [
          'Ventes',
          'Gestion des tables', 
          'Menu',
          'Cuisine',
          'Stocks',
          'Clients',
          'Rapports'
        ],
        enableTableManagement: true,
        enableMenuManagement: true,
        enableInventoryTracking: true
      }),
      
      // Configuration Café simple
      cafe: this.createConfiguration({
        businessName: 'Café Central',
        primaryColor: '#6B4423',
        accentColor: '#DEB887',
        modules: [
          'Ventes',
          'Service rapide',
          'Stocks',
          'Rapports'
        ],
        enableTableManagement: false,
        quickServiceMode: true
      }),
      
      // Configuration Boutique
      retail: this.createConfiguration({
        businessName: 'Boutique Mode',
        primaryColor: '#9B59B6',
        accentColor: '#E8DAEF',
        modules: [
          'Ventes',
          'Produits',
          'Stocks',
          'Clients',
          'Cartes cadeaux',
          'Rapports'
        ],
        enableInventoryTracking: true,
        enableCustomerManagement: true,
        enableGiftCards: true
      }),
      
      // Configuration Pharmacie
      pharmacy: this.createConfiguration({
        businessName: 'Pharmacie du Centre',
        primaryColor: '#27AE60',
        accentColor: '#A9DFBF',
        modules: [
          'Ventes',
          'Produits',
          'Stocks',
          'Clients',
          'Ordonnances',
          'Rapports'
        ],
        enableInventoryTracking: true,
        enablePrescriptionManagement: true,
        requirePharmacyLicense: true
      })
    };
  }
  
  // Méthode pour valider une configuration
  static validateConfiguration(config) {
    const errors = [];
    const warnings = [];
    
    // Validation des modules
    if (!config.enabledModules || config.enabledModules.length === 0) {
      warnings.push('Aucun module activé - le POS aura des fonctionnalités limitées');
    }
    
    // Validation des couleurs
    if (!this.isValidColor(config.primaryColor)) {
      errors.push('Couleur principale invalide');
    }
    
    // Validation de la configuration métier
    if (!config.businessName || config.businessName.trim().length === 0) {
      errors.push('Nom de l\'entreprise requis');
    }
    
    // Validation des modules cohérents
    const hasTableModule = config.enabledModules.some(m => 
      m.name.toLowerCase().includes('table') || m.name.toLowerCase().includes('restaurant')
    );
    const hasMenuModule = config.enabledModules.some(m => 
      m.name.toLowerCase().includes('menu') || m.name.toLowerCase().includes('carte')
    );
    
    if (hasTableModule && !hasMenuModule) {
      warnings.push('Module Tables activé sans module Menu - considérez d\'ajouter la gestion du menu');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  static isValidColor(color) {
    if (!color) return false;
    
    // Validation basique des couleurs hex
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }
  
  // Méthode pour exporter la configuration vers le pos-template
  static exportForTemplate(config) {
    return {
      // Configuration pour le template final
      businessInfo: {
        name: config.businessName,
        logo: config.logo,
        address: config.businessAddress,
        phone: config.businessPhone,
        email: config.businessEmail
      },
      
      // Thème
      theme: {
        primary: config.primaryColor,
        secondary: config.secondaryColor,
        accent: config.accentColor,
        background: config.backgroundColor,
        text: config.textColor
      },
      
      // Modules actifs pour la génération
      activeModules: config.enabledModules.filter(m => m.enabled).map(m => m.name),
      
      // Configuration des fonctionnalités
      features: {
        tableManagement: config.enableTableManagement,
        menuManagement: config.enableMenuManagement,
        inventoryTracking: config.enableInventoryTracking,
        customerManagement: config.enableCustomerManagement
      },
      
      // Layout
      layout: {
        navbarPosition: config.navbarPosition,
        navbarStyle: config.navbarStyle,
        sidebarCollapsible: config.sidebarCollapsible
      }
    };
  }
}

// Exemples d'utilisation
export const ConfigurationExamples = {
  // Utilisation pour le preview
  createPreview: (userConfig) => {
    const config = FlexiblePOSConfiguration.createConfiguration(userConfig);
    const validation = FlexiblePOSConfiguration.validateConfiguration(config);
    
    if (!validation.isValid) {
      console.error('Configuration invalide:', validation.errors);
      return null;
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Avertissements de configuration:', validation.warnings);
    }
    
    return config;
  },
  
  // Utilisation pour la génération du POS final
  generatePOS: (userConfig) => {
    const config = FlexiblePOSConfiguration.createConfiguration(userConfig);
    const templateConfig = FlexiblePOSConfiguration.exportForTemplate(config);
    
    return {
      config,
      templateConfig,
      navigation: config.navigation,
      pages: config.availablePages
    };
  }
};

// Tests de configuration
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // En mode développement, expose les configurations de test
  window.POSConfigTests = FlexiblePOSConfiguration.createTestConfigurations();
  console.log('Configurations de test disponibles:', window.POSConfigTests);
}
