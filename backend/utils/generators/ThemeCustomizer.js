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
    
    // Enhanced app configuration matching useAppConfig expectations
    const appConfig = {
      license: {
        id: this.license.id || null,
        key: this.license.licenseKey || null,
        client: this.license.client?.name || null
      },
      modules: this.license.selectedModules || [
        { name: "pos-core", displayName: "Caisse de base", isEnabled: true, description: "Fonctionnalités de base de la caisse" },
        { name: "inventory", displayName: "Gestion des stocks", isEnabled: true, description: "Gestion des produits et stocks" },
        { name: "reports", displayName: "Rapports", isEnabled: true, description: "Rapports de ventes et analyses" }
      ],
      theme: {
        businessName: config.businessName || this.license.client?.name || 'Mon Commerce',
        colors: {
          primary: config.primaryColor || '#3B82F6',
          accent: config.secondaryColor || '#10B981',
          background: config.backgroundColor || '#FFFFFF',
          text: config.textColor || '#1F2937'
        },
        logo: config.businessLogo || config.logo || null,  // Support both businessLogo and logo
        currency: config.currency || 'EUR',
        taxRate: config.taxRate || 20,
        language: config.language || 'fr',
        timezone: config.timezone || 'Europe/Paris',
        // Add all POSConfiguration-compatible properties
        primaryColor: config.primaryColor || '#3B82F6',
        secondaryColor: config.secondaryColor || '#f8fafc',
        accentColor: config.accentColor || '#1e40af',
        backgroundColor: config.backgroundColor || '#FFFFFF',
        textColor: config.textColor || '#1F2937',
        textMutedColor: config.textMutedColor || '#6b7280',
        cardBorderColor: config.cardBorderColor || '#e5e7eb',
        fontFamily: config.customFont || 'Inter',
        fontSize: config.fontSize || '14px',
        fontWeight: config.fontWeight || '400',
        animations: config.animations !== false,
        shadows: config.shadows !== false,
        borderRadius: config.borderRadius || 'medium'
      },
      database: {
        type: 'sqlite',
        filename: 'pos-data.db'
      },
      security: {
        requireUSBLicense: false,
        licenseFileName: 'license.key'
      },
      printer: {
        enabled: true,
        autoprint: false,
        paperWidth: 80
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
    logger.debug('Configuration preview:', JSON.stringify({
      businessName: appConfig.theme.businessName,
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
