/**
 * Theme Customizer - Handles theme application and CSS customization
 * Extracted from pos-generator.js for better modularity
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('../common/logger');
const TailwindConfigManager = require('../config/TailwindConfigManager');

const logger = createLogger('ThemeCustomizer');

class ThemeCustomizer {
  constructor(projectPath, license) {
    this.projectPath = projectPath;
    this.license = license;
    this.tailwindManager = new TailwindConfigManager(projectPath);
  }

  /**
   * Apply all theme customizations
   */
  async applyCustomization() {
    logger.info('Starting theme customization');

    try {
      await this.ensureCSSFiles();          // ✅ NEW: Ensure CSS files exist
      await this.updateTailwindConfig();
      await this.updateGlobalStyles();
      await this.updateComponentStyles();
      await this.updateAppConfig();
      
      logger.info('Theme customization completed successfully');
    } catch (error) {
      logger.error('Theme customization failed:', error);
      throw error;
    }
  }

  /**
   * Ensure all required CSS files exist
   */
  async ensureCSSFiles() {
    logger.debug('Ensuring all required CSS files exist');

    const indexCSSPath = path.join(this.projectPath, 'src', 'index.css');
    const completeCSSPath = path.join(this.projectPath, 'src', 'styles', 'complete.css');
    const customCSSPath = path.join(this.projectPath, 'src', 'styles', 'custom.css');
    const stylesDir = path.join(this.projectPath, 'src', 'styles');

    // Ensure styles directory exists
    if (!fs.existsSync(stylesDir)) {
      logger.warn('Styles directory not found - this should have been copied from template');
      fs.mkdirSync(stylesDir, { recursive: true });
    }

    // Verify index.css exists and imports complete.css
    if (!fs.existsSync(indexCSSPath)) {
      logger.warn('index.css not found - creating default import file');
      const indexCSSContent = `/* POS Template - Main CSS Import */
@import './styles/complete.css';
`;
      fs.writeFileSync(indexCSSPath, indexCSSContent);
      logger.info('Created index.css');
    }

    // Verify complete.css exists with Tailwind directives
    if (!fs.existsSync(completeCSSPath)) {
      logger.error('complete.css not found - CSS will not compile correctly!');
      logger.warn('This file should have been copied from pos-template during AssetManager.copyTemplate()');
    } else {
      const completeCSSContent = fs.readFileSync(completeCSSPath, 'utf8');
      if (!completeCSSContent.includes('@tailwind')) {
        logger.error('complete.css does not contain @tailwind directives!');
      } else {
        logger.debug('complete.css exists with Tailwind directives');
      }
    }

    // Verify custom.css exists
    if (!fs.existsSync(customCSSPath)) {
      logger.warn('custom.css not found - this may be intentional');
    }

    logger.debug('CSS files verification completed');
  }

  /**
   * Update Tailwind configuration with theme colors
   */
  async updateTailwindConfig() {
    logger.debug('Updating Tailwind configuration');

    const config = this.license.configuration || {};
    const theme = {
      primaryColor: config.primaryColor || '#3B82F6',
      secondaryColor: config.secondaryColor || '#10B981',
      accentColor: config.accentColor || '#F59E0B',
      backgroundColor: config.backgroundColor || '#FFFFFF',
      textColor: config.textColor || '#1F2937',
      borderRadius: config.borderRadius || '8',
      customFont: config.customFont || 'Inter'
    };

    this.tailwindManager.updateTailwindConfig(theme);
    logger.debug('Tailwind configuration updated');
  }

  /**
   * Update global CSS styles
   */
  async updateGlobalStyles() {
    logger.debug('Updating global styles');

    const config = this.license.configuration || {};
    const cssPath = path.join(this.projectPath, 'src', 'index.css');

    if (!fs.existsSync(cssPath)) {
      logger.warn('Global CSS file not found, skipping global styles update');
      return;
    }

    let cssContent = fs.readFileSync(cssPath, 'utf8');

    // Add custom CSS variables
    const customCSS = this.generateCustomCSS(config);
    
    // Insert custom CSS at the beginning
    if (!cssContent.includes('/* Custom Theme Variables */')) {
      cssContent = customCSS + '\n\n' + cssContent;
      fs.writeFileSync(cssPath, cssContent);
      logger.debug('Global styles updated');
    }
  }

  /**
   * Generate custom CSS variables
   */
  generateCustomCSS(config) {
    // Convert borderRadius to pixels
    let borderRadiusValue = '8';
    if (config.borderRadius) {
      switch (config.borderRadius) {
        case 'small': borderRadiusValue = '4'; break;
        case 'medium': borderRadiusValue = '8'; break;
        case 'large': borderRadiusValue = '12'; break;
        case 'xl': borderRadiusValue = '16'; break;
        default: borderRadiusValue = config.borderRadius.toString(); break;
      }
    }

    return `/* Custom Theme Variables - POSConfiguration Compatible */
:root {
  /* POSConfiguration CSS Variables */
  --primary-color: ${config.primaryColor || '#3B82F6'};
  --secondary-color: ${config.secondaryColor || '#f8fafc'};
  --accent-color: ${config.accentColor || '#1e40af'};
  --background-color: ${config.backgroundColor || '#FFFFFF'};
  --text-color: ${config.textColor || '#1F2937'};
  --text-muted-color: ${config.textMutedColor || '#6b7280'};
  --card-border-color: ${config.cardBorderColor || '#e5e7eb'};
  --font-family: '${config.customFont || 'Inter'}', ui-sans-serif, system-ui;
  --font-size: ${config.fontSize || '14px'};
  --font-weight: ${config.fontWeight || '400'};
  --shadow-style: ${config.shadows !== false ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none'};
  --animation-duration: ${config.animations !== false ? '0.2s' : '0s'};
  
  /* Legacy compatibility */
  --color-primary: ${config.primaryColor || '#3B82F6'};
  --color-secondary: ${config.secondaryColor || '#10B981'};
  --color-accent: ${config.accentColor || '#F59E0B'};
  --color-background: ${config.backgroundColor || '#FFFFFF'};
  --color-text: ${config.textColor || '#1F2937'};
  --border-radius: ${borderRadiusValue}px;
}

/* Custom component styles */
.btn-primary {
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--border-radius);
  transition: all 0.2s ease-in-out;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: white;
  border-radius: var(--border-radius);
}

.card {
  background-color: var(--color-background);
  border-radius: var(--border-radius);
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}

.text-primary {
  color: var(--color-primary);
}

.text-secondary {
  color: var(--color-secondary);
}

.text-accent {
  color: var(--color-accent);
}`;
  }

  /**
   * Update component-specific styles
   */
  async updateComponentStyles() {
    logger.debug('Updating component styles');

    const componentsDir = path.join(this.projectPath, 'src', 'components');
    if (!fs.existsSync(componentsDir)) {
      logger.warn('Components directory not found, skipping component styles');
      return;
    }

    // Update specific component files if they exist
    await this.updateHeaderStyles();
    await this.updateSidebarStyles();
    await this.updateButtonStyles();
  }

  /**
   * Update header component styles
   */
  async updateHeaderStyles() {
    const headerPath = path.join(this.projectPath, 'src', 'components', 'Header.jsx');
    if (fs.existsSync(headerPath)) {
      let content = fs.readFileSync(headerPath, 'utf8');
      
      // Replace default header classes with themed ones
      content = content.replace(
        /className="[^"]*bg-blue-600[^"]*"/g,
        'className="bg-primary text-white"'
      );
      
      fs.writeFileSync(headerPath, content);
      logger.debug('Header styles updated');
    }
  }

  /**
   * Update sidebar component styles
   */
  async updateSidebarStyles() {
    const sidebarPath = path.join(this.projectPath, 'src', 'components', 'Sidebar.jsx');
    if (fs.existsSync(sidebarPath)) {
      let content = fs.readFileSync(sidebarPath, 'utf8');
      
      // Replace default sidebar classes with themed ones
      content = content.replace(
        /className="[^"]*bg-gray-800[^"]*"/g,
        'className="bg-gray-900 text-white"'
      );
      
      fs.writeFileSync(sidebarPath, content);
      logger.debug('Sidebar styles updated');
    }
  }

  /**
   * Update button component styles
   */
  async updateButtonStyles() {
    const buttonPath = path.join(this.projectPath, 'src', 'components', 'Button.jsx');
    if (fs.existsSync(buttonPath)) {
      let content = fs.readFileSync(buttonPath, 'utf8');
      
      // Replace default button classes with themed ones
      content = content.replace(
        /className="[^"]*bg-blue-500[^"]*"/g,
        'className="btn-primary"'
      );
      
      fs.writeFileSync(buttonPath, content);
      logger.debug('Button styles updated');
    }
  }

  /**
   * Update application configuration
   */
  async updateAppConfig() {
    logger.debug('Updating app configuration');

    // Create both public and dist directories for compatibility
    const publicConfigPath = path.join(this.projectPath, 'public', 'app-config.json');
    const distConfigPath = path.join(this.projectPath, 'dist', 'app-config.json');
    
    // Ensure directories exist
    if (!fs.existsSync(path.dirname(publicConfigPath))) {
      fs.mkdirSync(path.dirname(publicConfigPath), { recursive: true });
    }
    if (!fs.existsSync(path.dirname(distConfigPath))) {
      fs.mkdirSync(path.dirname(distConfigPath), { recursive: true });
    }

    const config = this.license.configuration || {};
    
    // ⚡ Generate database filename from business name
    const businessName = config.businessName || this.license.client?.name || 'Mon Commerce';
    const sanitizedBusinessName = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')  // Replace non-alphanumeric with hyphen
      .replace(/-+/g, '-')           // Remove multiple consecutive hyphens
      .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
    const databaseFilename = `${sanitizedBusinessName}.db`;
    
    // Enhanced app configuration matching useAppConfig expectations
    const normalizeModules = (moduleItems, fallbackModules) => {
      if (Array.isArray(moduleItems) && moduleItems.length > 0) {
        return moduleItems.map((moduleItem) => {
          const moduleData = moduleItem?.module || moduleItem;
          const isEnabled = moduleItem?.isEnabled ?? moduleItem?.enabled ?? moduleData?.isEnabled ?? moduleData?.enabled ?? true;
          return {
            name: moduleData?.name || moduleItem?.name || 'unknown',
            displayName: moduleData?.displayName || moduleItem?.displayName || moduleData?.name || moduleItem?.name || 'Module',
            isEnabled: isEnabled === true,
            description: moduleData?.description || moduleItem?.description || ''
          };
        });
      }

      return fallbackModules;
    };

    const defaultModules = [
      { name: "pos-core", displayName: "Caisse de base", isEnabled: true, description: "Fonctionnalites de base de la caisse" },
      { name: "inventory", displayName: "Gestion des stocks", isEnabled: true, description: "Gestion des produits et stocks" },
      { name: "reports", displayName: "Rapports", isEnabled: true, description: "Rapports de ventes et analyses" }
    ];

    const normalizedModules = normalizeModules(this.license.selectedModules || this.license.modules, defaultModules);

    const appConfig = {
      license: {
        id: this.license.id || null,
        key: this.license.licenseKey || null,
        client: this.license.client?.name || null
      },
      modules: normalizedModules,
      theme: {
        businessName: businessName,
        appTitle: config.appTitle || businessName,
        footerText: config.footerText || `Powered by ${businessName}`,
        welcomeText: config.welcomeText || `Bienvenue chez ${businessName}`,
        logo: config.businessLogo || config.logo || null,
        favicon: config.favicon || null,
        colors: {
          primary: config.primaryColor || '#3B82F6',
          secondary: config.secondaryColor || '#f8fafc',
          accent: config.accentColor || '#1e40af',
          background: config.backgroundColor || '#FFFFFF',
          text: config.textColor || '#1F2937',
          textMuted: config.textMutedColor || '#6b7280',
          border: config.cardBorderColor || '#e5e7eb',
          cardBackground: config.cardBackgroundColor || '#FFFFFF'
        },
        currency: config.currency || 'TND',
        currencyPosition: config.currencyPosition || 'after',
        taxRate: config.taxRate || 20,
        language: config.language || 'fr',
        timezone: config.timezone || 'Europe/Paris',
        dateFormat: config.dateFormat || 'DD/MM/YYYY',
        timeFormat: config.timeFormat || '24h',
        // All POSConfiguration-compatible properties
        primaryColor: config.primaryColor || '#3B82F6',
        secondaryColor: config.secondaryColor || '#f8fafc',
        accentColor: config.accentColor || '#1e40af',
        backgroundColor: config.backgroundColor || '#FFFFFF',
        textColor: config.textColor || '#1F2937',
        textMutedColor: config.textMutedColor || '#6b7280',
        cardBorderColor: config.cardBorderColor || '#e5e7eb',
        cardBackgroundColor: config.cardBackgroundColor || '#FFFFFF',
        fontFamily: config.customFont || 'Inter',
        fontSize: config.fontSize || '14px',
        fontWeight: config.fontWeight || '400',
        animations: config.animations !== false,
        animationType: config.animationType || 'slide',
        animationSpeed: config.animationSpeed || 'normal',
        shadows: config.shadows !== false,
        shadowIntensity: config.shadowIntensity || 'medium',
        borderRadius: config.borderRadius || 'medium',
        gradientBackgrounds: config.gradientBackgrounds || false,
        glassEffect: config.glassEffect || false,
        highContrastMode: config.highContrastMode || false,
        largeTextMode: config.largeTextMode || false,
        compactMode: config.compactMode || false,
        sidebarCollapsible: config.sidebarCollapsible !== false,
        showBreadcrumbs: config.showBreadcrumbs !== false,
        navbarPosition: config.navbarPosition || 'left',
        navbarWidth: config.navbarWidth || '64px',
        navbarHeight: config.navbarHeight || '48px',
        navbarStyle: config.navbarStyle || 'modern',
        dashboardLayout: config.dashboardLayout || 'grid',
        showQuickStats: config.showQuickStats !== false,
        showRecentOrders: config.showRecentOrders !== false,
        showTopProducts: config.showTopProducts !== false,
        enableTableManagement: config.enableTableManagement !== false,
        enableCustomerDisplay: config.enableCustomerDisplay !== false,
        autoRefreshInterval: config.autoRefreshInterval || 30,
        showProductImages: config.showProductImages !== false,
        enableBarcode: config.enableBarcode !== false,
        enableInventoryTracking: config.enableInventoryTracking !== false,
        enableCash: config.enableCash !== false,
        enableCard: config.enableCard !== false,
        enableMobile: config.enableMobile !== false,
        enableGiftCards: config.enableGiftCards || false,
        enableMultiLocation: config.enableMultiLocation || false,
        enableUserRoles: config.enableUserRoles || false,
        enableAuditLog: config.enableAuditLog || false,
        enableNotifications: config.enableNotifications !== false,
        enableCaching: config.enableCaching !== false,
        lazyLoading: config.lazyLoading !== false,
        keyboardNavigation: config.keyboardNavigation !== false,
        reducedMotion: config.reducedMotion || false,
        spacingScale: config.spacingScale || 1,
        maxWidth: config.maxWidth || '1200px',
        navbarCollapsible: config.navbarCollapsible || false,
        components: {
          cards: {
            borderRadius: config.components?.cards?.borderRadius || 'medium',
            padding: config.components?.cards?.padding || 1,
            shadowStyle: config.components?.cards?.shadowStyle || 'default'
          },
          buttons: {
            style: config.components?.buttons?.style || 'default',
            size: config.components?.buttons?.size || 'medium',
            hoverEffects: config.components?.buttons?.hoverEffects !== false
          },
          grid: {
            columns: config.components?.grid?.columns || 3,
            gap: config.components?.grid?.gap || 4
          },
          forms: {
            inputStyle: config.components?.forms?.inputStyle || 'default',
            inputSize: config.components?.forms?.inputSize || 'medium',
            focusRing: config.components?.forms?.focusRing !== false
          }
        }
      },
      businessInfo: {
        name: businessName,
        address: config.businessAddress || '',
        phone: config.businessPhone || '',
        email: config.businessEmail || '',
        website: config.businessWebsite || '',
        taxId: config.businessTaxId || '',
        logo: config.businessLogo || config.logo || null
      },
      receipt: {
        enabled: true,
        header: config.receiptHeader || businessName,
        footer: config.receiptFooter || 'Merci de votre visite!',
        autoPrint: config.printReceiptAuto || false,
        paperWidth: config.receiptPaperWidth || 80,
        showLogo: config.receiptShowLogo !== false,
        showBusinessInfo: config.receiptShowBusinessInfo !== false,
        showQR: config.receiptShowQR || false,
        qrContent: config.receiptQRContent || 'website',
        copies: config.receiptCopies || 1
      },
      database: {
        type: 'sqlite',
        filename: databaseFilename  // ⚡ Dynamic: uses business name (e.g., "naruto.db", "restaurant-le-gourmet.db")
      },
      security: {
        requireUSBLicense: false,
        licenseFileName: 'license.key'
      },
      printer: {
        enabled: true,
        autoprint: config.printReceiptAuto || false,
        paperWidth: config.receiptPaperWidth || 80
      },
      features: config.features || {
        barcode: true,
        multiplePaymentMethods: true,
        discounts: true,
        returns: true,
        inventory: true,
        customers: true,
        reporting: true,
        multiLocation: false
      }
    };

    // Write JSON configuration to both locations
    const configContent = JSON.stringify(appConfig, null, 2);
    
    fs.writeFileSync(publicConfigPath, configContent);
    fs.writeFileSync(distConfigPath, configContent);
    
    logger.debug('App configuration updated in both public and dist directories');
    logger.info(`🗄️ Database filename configured: ${databaseFilename}`);
    logger.debug('Configuration preview:', JSON.stringify({
      businessName: appConfig.theme.businessName,
      databaseFilename: appConfig.database.filename,
      primaryColor: appConfig.theme.primaryColor,
      modules: appConfig.modules.length
    }, null, 2));
  }

  /**
   * Get theme summary for logging
   */
  getThemeSummary() {
    const config = this.license.configuration || {};
    return {
      businessName: config.businessName || this.license.client.name,
      primaryColor: config.primaryColor || '#3B82F6',
      secondaryColor: config.secondaryColor || '#10B981',
      customFont: config.customFont || 'Inter',
      featuresCount: Object.keys(config.features || {}).length
    };
  }
}

module.exports = ThemeCustomizer;
