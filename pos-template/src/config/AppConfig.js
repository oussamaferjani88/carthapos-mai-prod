// Configuration dynamique pour le POS Template
// Ce fichier sera généré automatiquement lors de la création du POS

export class AppConfig {
  static getConfig() {
    // Configuration par défaut (backward compatibility)
    const defaultConfig = {
      businessInfo: {
        name: 'POS System',
        logo: null,
        address: '',
        phone: '',
        email: ''
      },
      license: {
        licenseType: 'LIFETIME',
        bindingType: 'MACHINE',
        machineId: null,
        expirationDate: null,
        isActive: true,
        isActivated: false,
        activatedAt: null,
        lastValidatedAt: null
      },
      theme: {
        primary: '#3b82f6',
        secondary: '#f8fafc', 
        accent: '#1e40af',
        background: '#ffffff',
        text: '#1f2937'
      },
      // Tous les modules activés par défaut (compatibility)
      enabledModules: [
        // Core modules (always enabled)
        'pos-core',
        'user-management', 
        'reports',
        'barcode', // Now core module
        
        // Standard modules
        'dashboard',
        'sales', 
        'products',
        'inventory',
        'suppliers',
        'customers',
        'tables',
        'kitchen',
        'menu-management',
        'takeaway',
        'loyalty',
        'payment-advanced',
        'gift-cards',
        'appointments',
        'services',
        'prescription',
        'production',
        'settings'
      ],
      features: {
        tableManagement: true,
        menuManagement: true,
        inventoryTracking: true,
        customerManagement: true,
        kitchenManagement: true,
        appointmentBooking: true,
        serviceManagement: true,
        supplierManagement: true
      },
      layout: {
        navbarPosition: 'left',
        navbarStyle: 'modern',
        sidebarCollapsible: true
      }
    };

    // Charge la configuration personnalisée si elle existe
    if (typeof window !== 'undefined' && window.__POS_CONFIG__) {
      return {
        ...defaultConfig,
        ...window.__POS_CONFIG__
      };
    }

    return defaultConfig;
  }

  static isModuleEnabled(moduleId) {
    const config = this.getConfig();
    return config.enabledModules.includes(moduleId);
  }

  static getTheme() {
    return this.getConfig().theme;
  }

  static getBusinessInfo() {
    return this.getConfig().businessInfo;
  }

  static getFeatures() {
    return this.getConfig().features;
  }

  // Méthode pour appliquer le thème dynamiquement
  static applyTheme() {
    const theme = this.getTheme();
    
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', theme.primary);
      root.style.setProperty('--color-secondary', theme.secondary);
      root.style.setProperty('--color-accent', theme.accent);
      root.style.setProperty('--color-background', theme.background);
      root.style.setProperty('--color-text', theme.text);
    }
  }
}

// Auto-apply theme on load
if (typeof window !== 'undefined') {
  AppConfig.applyTheme();
}
