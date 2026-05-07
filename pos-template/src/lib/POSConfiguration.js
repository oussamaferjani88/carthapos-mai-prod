export class POSConfiguration {
  static createConfig(configuration = {}) {
    return {
      // Basic Business Info
      businessName: configuration.businessName || 'POS System',
      logo: configuration.logo || null,
      businessLogo: configuration.businessLogo || configuration.logo || null,
      favicon: configuration.favicon || null,
      appTitle: configuration.appTitle || 'POS System',
      footerText: configuration.footerText || 'Powered by POS System',
      
      // Business Details
      businessAddress: configuration.businessAddress || '',
      businessPhone: configuration.businessPhone || '',
      businessEmail: configuration.businessEmail || '',
      businessWebsite: configuration.businessWebsite || '',
      businessTaxId: configuration.businessTaxId || '',
      
      // Colors & Branding
      primaryColor: configuration.primaryColor || '#3b82f6',
      secondaryColor: configuration.secondaryColor || '#f8fafc',
      accentColor: configuration.accentColor || '#1e40af',
      backgroundColor: configuration.backgroundColor || '#ffffff',
      textColor: configuration.textColor || '#1f2937',
      textMutedColor: configuration.textMutedColor || '#6b7280',
      cardBorderColor: configuration.cardBorderColor || '#e5e7eb',
      
      // Layout & Navigation
      navbarPosition: configuration.navbarPosition || 'left',
      navbarWidth: configuration.navbarWidth || '64px',
      navbarHeight: configuration.navbarHeight || '48px',
      navbarStyle: configuration.navbarStyle || 'modern',
      sidebarCollapsible: configuration.sidebarCollapsible !== false,
      showBreadcrumbs: configuration.showBreadcrumbs !== false,
      
      // Dashboard Configuration
      dashboardLayout: configuration.dashboardLayout || 'grid',
      showQuickStats: configuration.showQuickStats !== false,
      showRecentOrders: configuration.showRecentOrders !== false,
      showTopProducts: configuration.showTopProducts !== false,
      
      // Sales Configuration
      enableTableManagement: configuration.enableTableManagement !== false,
      enableCustomerDisplay: configuration.enableCustomerDisplay !== false,
      autoRefreshInterval: configuration.autoRefreshInterval || 30,
      
      // Product Configuration
      showProductImages: configuration.showProductImages !== false,
      enableBarcode: configuration.enableBarcode !== false,
      enableInventoryTracking: configuration.enableInventoryTracking !== false,
      
      // Payment Configuration
      enableCash: configuration.enableCash !== false,
      enableCard: configuration.enableCard !== false,
      enableMobile: configuration.enableMobile !== false,
      enableGiftCards: configuration.enableGiftCards || false,
      
      // Receipt Configuration
      receiptHeader: configuration.receiptHeader || '',
      receiptFooter: configuration.receiptFooter || '',
      printReceiptAuto: configuration.printReceiptAuto || false,
      
      // Typography
      fontFamily: configuration.fontFamily || 'Inter',
      fontSize: configuration.fontSize || '14px',
      fontWeight: configuration.fontWeight || '400',
      
      // Visual Effects
      shadowIntensity: configuration.shadowIntensity || 'medium',
      animations: configuration.animations !== false,
      animationType: configuration.animationType || 'slide', // Type pour navigation
      animationSpeed: configuration.animationSpeed || 'normal', // Vitesse pour navigation
      cardAnimations: configuration.cardAnimations !== false, // Activer cartes
      cardAnimationType: configuration.cardAnimationType || 'slide', // Type pour cartes
      cardAnimationSpeed: configuration.cardAnimationSpeed || 'normal', // Vitesse pour cartes
      shadows: configuration.shadows !== false,
      gradientBackgrounds: configuration.gradientBackgrounds || false,
      glassEffect: configuration.glassEffect || false,
      
      // Currency & Formatting
      currency: configuration.currency || 'DT',
      currencyPosition: configuration.currencyPosition || 'after',
      dateFormat: configuration.dateFormat || 'DD/MM/YYYY',
      timeFormat: configuration.timeFormat || '24h',
      
      // Language & Localization
      language: configuration.language || 'fr',
      timezone: configuration.timezone || 'Europe/Paris',
      
      // Advanced Features
      enableMultiLocation: configuration.enableMultiLocation || false,
      enableUserRoles: configuration.enableUserRoles || false,
      enableAuditLog: configuration.enableAuditLog || false,
      
      // Accessibility
      highContrastMode: configuration.highContrastMode || false,
      largeTextMode: configuration.largeTextMode || false,
      screenReaderMode: configuration.screenReaderMode || false,
      keyboardNavigation: configuration.keyboardNavigation !== false,
      reducedMotion: configuration.reducedMotion || false,
      
      // Performance
      enableCaching: configuration.enableCaching !== false,
      compactMode: configuration.compactMode || false,
      lazyLoading: configuration.lazyLoading !== false,
      
      // Layout et Disposition (nouvelles propriétés)
      spacingScale: configuration.spacingScale || 1,
      maxWidth: configuration.maxWidth || '1200px',
      navbarCollapsible: configuration.navbarCollapsible || false,
      
      // Composants - Nouvelles personnalisations
      components: {
        cards: {
          borderRadius: configuration.components?.cards?.borderRadius || 'medium',
          padding: configuration.components?.cards?.padding || 1,
          shadowStyle: configuration.components?.cards?.shadowStyle || 'default',
          ...configuration.components?.cards
        },
        buttons: {
          style: configuration.components?.buttons?.style || 'default',
          size: configuration.components?.buttons?.size || 'medium',
          hoverEffects: configuration.components?.buttons?.hoverEffects !== false,
          ...configuration.components?.buttons
        },
        grid: {
          columns: configuration.components?.grid?.columns || 3,
          gap: configuration.components?.grid?.gap || 4,
          ...configuration.components?.grid
        },
        forms: {
          inputStyle: configuration.components?.forms?.inputStyle || 'default',
          inputSize: configuration.components?.forms?.inputSize || 'medium',
          focusRing: configuration.components?.forms?.focusRing !== false,
          ...configuration.components?.forms
        },
        ...configuration.components
      },
      
      // Integration
      enableAPI: configuration.enableAPI || false,
      webhookUrl: configuration.webhookUrl || '',
      enableNotifications: configuration.enableNotifications !== false,
      
      // Custom Styling
      customCSS: configuration.customCSS || '',
      customJS: configuration.customJS || '',
      
      // Feature Toggles
      enableAdvancedReporting: configuration.enableAdvancedReporting || false,
      enableInventoryPrediction: configuration.enableInventoryPrediction || false,
      enableCustomerLoyalty: configuration.enableCustomerLoyalty || false,
      enableStaffScheduling: configuration.enableStaffScheduling || false,
      enableKitchenDisplay: configuration.enableKitchenDisplay || false,
      enableDeliveryTracking: configuration.enableDeliveryTracking || false,
      
      // Préserver toutes les autres propriétés de configuration (comme currentUser, onLogout, etc.)
      ...configuration
    };
  }

  static getStyles(config) {
    return {
      card: {
        backgroundColor: config.backgroundColor,
        borderColor: config.cardBorderColor,
        color: config.textColor,
        boxShadow: this.getShadowStyle(config),
        transition: config.animations ? 'all 0.2s ease-in-out' : 'none',
        backdropFilter: config.glassEffect ? 'blur(10px) saturate(200%)' : 'none',
        background: config.gradientBackgrounds ? this.getGradientBackground(config) : config.backgroundColor
      },
      animation: config.animations ? 'all 0.2s ease-in-out' : 'none',
      container: {
        background: config.gradientBackgrounds ? this.getContainerGradient(config) : config.backgroundColor,
        backdropFilter: config.glassEffect ? 'blur(10px)' : 'none'
      }
    };
  }

  static getShadowStyle(config) {
    if (!config.shadows || config.shadowIntensity === 'none') {
      return 'none';
    }
    
    switch (config.shadowIntensity) {
      case 'light':
        return '0 1px 3px rgba(0, 0, 0, 0.1)';
      case 'medium':
        return '0 4px 6px rgba(0, 0, 0, 0.1)';
      case 'heavy':
        return '0 10px 15px rgba(0, 0, 0, 0.2)';
      default:
        return '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
  }

  static getStyleVars(config) {
    // Calculer automatiquement les couleurs de texte sur fond coloré
    const getContrastColor = (bgColor) => {
      if (!bgColor) return '#FFFFFF';
      // Simple contraste: si couleur foncée, texte blanc, sinon noir
      const hex = bgColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return brightness > 155 ? '#000000' : '#FFFFFF';
    };

    return {
      // Couleurs principales avec foreground calculées
      '--color-primary': config.primaryColor,
      '--color-primary-foreground': getContrastColor(config.primaryColor),
      '--color-secondary': config.secondaryColor,
      '--color-secondary-foreground': getContrastColor(config.secondaryColor),
      '--color-accent': config.accentColor,
      '--color-accent-foreground': getContrastColor(config.accentColor),
      '--color-background': config.backgroundColor,
      '--color-card-background': config.cardBackgroundColor || config.backgroundColor,
      '--color-text': config.textColor,
      '--color-text-muted': config.textMutedColor,
      '--color-border': config.cardBorderColor,
      
      // Legacy variables pour compatibilité
      '--primary-color': config.primaryColor,
      '--secondary-color': config.secondaryColor,
      '--accent-color': config.accentColor,
      '--background-color': config.backgroundColor,
      '--text-color': config.textColor,
      '--text-muted-color': config.textMutedColor,
      '--card-border-color': config.cardBorderColor,
      
      // Typographie et effets
      '--font-family': config.fontFamily || 'Inter, system-ui, sans-serif',
      '--font-size': config.fontSize || '14px',
      '--font-weight': config.fontWeight || '400',
      '--shadow-style': this.getShadowStyle(config),
      '--animation-duration': config.animations ? '0.2s' : '0s',
      '--gradient-bg': config.gradientBackgrounds ? this.getGradientBackground(config) : 'none',
      '--glass-effect': config.glassEffect ? 'blur(10px) saturate(200%)' : 'none'
    };
  }

  static getGradientBackground(config) {
    if (!config.gradientBackgrounds) return 'none';
    
    // Créer un gradient basé sur les couleurs du thème
    const primary = config.primaryColor || '#3b82f6';
    const secondary = config.secondaryColor || '#f8fafc';
    const accent = config.accentColor || '#1e40af';
    
    return `linear-gradient(135deg, ${primary}20 0%, ${accent}10 50%, ${secondary}30 100%)`;
  }

  static getContainerGradient(config) {
    if (!config.gradientBackgrounds) return config.backgroundColor;
    
    const primary = config.primaryColor || '#3b82f6';
    const background = config.backgroundColor || '#ffffff';
    
    return `linear-gradient(45deg, ${background} 0%, ${primary}05 100%)`;
  }

  static getGlassEffect(config) {
    if (!config.glassEffect) return {};
    
    return {
      backdropFilter: 'blur(10px) saturate(200%)',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px'
    };
  }

  static getAnimationClasses(config) {
    // Les animations peuvent être activées pour navigation ou cartes
    if (!config.animations && !config.cardAnimations) return '';
    
    // Suppression du zoom, animations plus appropriées pour POS
    return 'transition-all duration-200 ease-in-out';
  }

  static getAnimationTypeClass(config) {
    // Les animations peuvent être activées pour navigation ou cartes
    if (!config.animations && !config.cardAnimations) return 'pos-animations-disabled';
    
    const animationType = config.animationType || 'slide';
    return `pos-animation-${animationType}`;
  }

  static getAnimationSpeedClass(config) {
    // Les animations peuvent être activées pour navigation ou cartes
    if (!config.animations && !config.cardAnimations) return '';
    
    const speed = config.animationSpeed || 'normal';
    const speedMap = {
      'slow': 'duration-300',
      'normal': 'duration-200', 
      'fast': 'duration-100'
    };
    
    return speedMap[speed] || speedMap['normal'];
  }

  // Nouvelles méthodes spécifiques pour cartes
  static getCardAnimationClasses(config) {
    if (!config.cardAnimations) return '';
    
    const cardAnimationType = config.cardAnimationType || 'slide';
    const cardAnimationSpeed = config.cardAnimationSpeed || 'normal';
    const speedMap = {
      'slow': 'duration-300',
      'normal': 'duration-200', 
      'fast': 'duration-100'
    };
    const speedClass = speedMap[cardAnimationSpeed] || speedMap['normal'];
    
    return `pos-card-animation pos-animation-${cardAnimationType} ${speedClass}`;
  }

  static shouldApplyCardAnimations(config) {
    return config.cardAnimations !== false;
  }

  // ⚡ Static cache for memoization (prevents recalculation on every render)
  static _classesCache = new Map();
  static _MAX_CACHE_SIZE = 50;

  // Helper to generate cache key
  static _getCacheKey(prefix, config) {
    // Create a simple hash of the config to use as cache key
    try {
      return prefix + '_' + JSON.stringify(config).split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
    } catch {
      return prefix + '_' + Date.now();
    }
  }

  // Nouvelles méthodes pour les composants (with memoization)
  static getCardClasses(config) {
    const cardConfig = config.components?.cards || {};
    const cacheKey = POSConfiguration._getCacheKey('card', cardConfig);
    
    // ⚡ Return cached value if available
    if (POSConfiguration._classesCache.has(cacheKey)) {
      return POSConfiguration._classesCache.get(cacheKey);
    }
    
    const borderRadiusMap = {
      'none': 'rounded-none',
      'small': 'rounded',
      'medium': 'rounded-lg',
      'large': 'rounded-xl',
      'xl': 'rounded-2xl',
      'full': 'rounded-full'
    };
    
    const shadowMap = {
      'none': '',
      'soft': 'shadow-sm',
      'default': 'shadow',
      'hard': 'shadow-lg',
      'colored': 'shadow-lg shadow-blue-200'
    };

    const borderRadius = borderRadiusMap[cardConfig.borderRadius] || 'rounded-lg';
    const shadow = shadowMap[cardConfig.shadowStyle] || 'shadow';
    const padding = `p-${Math.round((cardConfig.padding || 1) * 4)}`;

    const classes = `${borderRadius} ${shadow} ${padding}`;
    
    // ⚡ Cache the result and maintain cache size limit
    if (POSConfiguration._classesCache.size >= POSConfiguration._MAX_CACHE_SIZE) {
      const firstKey = POSConfiguration._classesCache.keys().next().value;
      POSConfiguration._classesCache.delete(firstKey);
    }
    POSConfiguration._classesCache.set(cacheKey, classes);
    
    return classes;
  }

  static getButtonClasses(config) {
    const buttonConfig = config.components?.buttons || {};
    const cacheKey = POSConfiguration._getCacheKey('button', buttonConfig);
    
    // ⚡ Return cached value if available
    if (POSConfiguration._classesCache.has(cacheKey)) {
      return POSConfiguration._classesCache.get(cacheKey);
    }
    
    const styleMap = {
      'default': 'bg-primary text-primary-foreground',
      'rounded': 'bg-primary text-primary-foreground rounded-full',
      'pill': 'bg-primary text-primary-foreground rounded-full px-6',
      'square': 'bg-primary text-primary-foreground rounded-none',
      'outline': 'border border-primary text-primary bg-transparent',
      'ghost': 'text-primary bg-transparent hover:bg-primary/10'
    };
    
    const sizeMap = {
      'small': 'px-2 py-1 text-xs',
      'medium': 'px-4 py-2 text-sm',
      'large': 'px-6 py-3 text-base',
      'xl': 'px-8 py-4 text-lg'
    };

    const style = styleMap[buttonConfig.style] || 'bg-primary text-primary-foreground';
    const size = sizeMap[buttonConfig.size] || 'px-4 py-2 text-sm';
    const hoverEffects = buttonConfig.hoverEffects !== false ? 'hover:opacity-90 transition-all' : '';

    const classes = `${style} ${size} ${hoverEffects}`;
    
    // ⚡ Cache the result and maintain cache size limit
    if (POSConfiguration._classesCache.size >= POSConfiguration._MAX_CACHE_SIZE) {
      const firstKey = POSConfiguration._classesCache.keys().next().value;
      POSConfiguration._classesCache.delete(firstKey);
    }
    POSConfiguration._classesCache.set(cacheKey, classes);
    
    return classes;
  }

  static getGridClasses(config) {
    const gridConfig = config.components?.grid || {};
    const columns = gridConfig.columns || 3;
    const gap = gridConfig.gap || 4;
    
    const columnMap = {
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6'
    };

    return `grid ${columnMap[columns] || 'grid-cols-3'} gap-${gap}`;
  }

  static getInputClasses(config) {
    const formConfig = config.components?.forms || {};
    const styleMap = {
      'default': 'border border-gray-300 rounded-md',
      'rounded': 'border border-gray-300 rounded-full',
      'underlined': 'border-0 border-b border-gray-300 rounded-none',
      'filled': 'bg-gray-100 border border-gray-200 rounded-md',
      'outlined': 'border-2 border-primary rounded-md'
    };
    
    const sizeMap = {
      'small': 'px-2 py-1 text-xs',
      'medium': 'px-3 py-2 text-sm',
      'large': 'px-4 py-3 text-base'
    };

    const style = styleMap[formConfig.inputStyle] || styleMap['default'];
    const size = sizeMap[formConfig.inputSize] || sizeMap['medium'];
    const focusRing = formConfig.focusRing ? 'focus:ring-2 focus:ring-primary focus:border-primary' : '';

    return `${style} ${size} ${focusRing}`.trim();
  }

  static getLayoutClasses(config) {
    const spacing = config.spacingScale || 1;
    const maxWidth = config.maxWidth || '1200px';
    const compact = config.compactMode;
    
    const spacingClass = compact ? 'space-y-2' : `space-y-${Math.round(spacing * 4)}`;
    const containerClass = maxWidth === '100%' ? 'max-w-full' : `max-w-${maxWidth.replace('px', '')}`;
    
    return `${containerClass} mx-auto ${spacingClass}`;
  }
}