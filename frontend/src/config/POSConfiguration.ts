export class POSConfiguration {
  static createConfig(configuration: Record<string, any> = {}) {
    return {
      businessName: configuration.businessName || 'POS System',
      logo: configuration.logo || null,
      businessLogo: configuration.businessLogo || configuration.logo || null,
      favicon: configuration.favicon || null,
      appTitle: configuration.appTitle || 'POS System',
      footerText: configuration.footerText || 'Powered by POS System',
      businessAddress: configuration.businessAddress || '',
      businessPhone: configuration.businessPhone || '',
      businessEmail: configuration.businessEmail || '',
      businessWebsite: configuration.businessWebsite || '',
      businessTaxId: configuration.businessTaxId || '',
      primaryColor: configuration.primaryColor || '#3b82f6',
      secondaryColor: configuration.secondaryColor || '#f8fafc',
      accentColor: configuration.accentColor || '#1e40af',
      backgroundColor: configuration.backgroundColor || '#ffffff',
      textColor: configuration.textColor || '#1f2937',
      textMutedColor: configuration.textMutedColor || '#6b7280',
      cardBorderColor: configuration.cardBorderColor || '#e5e7eb',
      navbarPosition: configuration.navbarPosition || 'left',
      navbarWidth: configuration.navbarWidth || '64px',
      navbarHeight: configuration.navbarHeight || '48px',
      navbarStyle: configuration.navbarStyle || 'modern',
      sidebarCollapsible: configuration.sidebarCollapsible !== false,
      showBreadcrumbs: configuration.showBreadcrumbs !== false,
      dashboardLayout: configuration.dashboardLayout || 'grid',
      showQuickStats: configuration.showQuickStats !== false,
      showRecentOrders: configuration.showRecentOrders !== false,
      showTopProducts: configuration.showTopProducts !== false,
      enableTableManagement: configuration.enableTableManagement !== false,
      enableCustomerDisplay: configuration.enableCustomerDisplay !== false,
      autoRefreshInterval: configuration.autoRefreshInterval || 30,
      showProductImages: configuration.showProductImages !== false,
      enableBarcode: configuration.enableBarcode !== false,
      enableInventoryTracking: configuration.enableInventoryTracking !== false,
      enableCash: configuration.enableCash !== false,
      enableCard: configuration.enableCard !== false,
      enableMobile: configuration.enableMobile !== false,
      enableGiftCards: configuration.enableGiftCards || false,
      receiptHeader: configuration.receiptHeader || '',
      receiptFooter: configuration.receiptFooter || '',
      printReceiptAuto: configuration.printReceiptAuto || false,
      fontFamily: configuration.fontFamily || 'Inter',
      fontSize: configuration.fontSize || '14px',
      fontWeight: configuration.fontWeight || '400',
      shadowIntensity: configuration.shadowIntensity || 'medium',
      animations: configuration.animations !== false,
      animationType: configuration.animationType || 'slide',
      animationSpeed: configuration.animationSpeed || 'normal',
      cardAnimations: configuration.cardAnimations !== false,
      cardAnimationType: configuration.cardAnimationType || 'slide',
      cardAnimationSpeed: configuration.cardAnimationSpeed || 'normal',
      shadows: configuration.shadows !== false,
      gradientBackgrounds: configuration.gradientBackgrounds || false,
      glassEffect: configuration.glassEffect || false,
      currency: configuration.currency || '€',
      currencyPosition: configuration.currencyPosition || 'after',
      dateFormat: configuration.dateFormat || 'DD/MM/YYYY',
      timeFormat: configuration.timeFormat || '24h',
      language: configuration.language || 'fr',
      timezone: configuration.timezone || 'Europe/Paris',
      enableMultiLocation: configuration.enableMultiLocation || false,
      enableUserRoles: configuration.enableUserRoles || false,
      enableAuditLog: configuration.enableAuditLog || false,
      highContrastMode: configuration.highContrastMode || false,
      largeTextMode: configuration.largeTextMode || false,
      screenReaderMode: configuration.screenReaderMode || false,
      keyboardNavigation: configuration.keyboardNavigation !== false,
      reducedMotion: configuration.reducedMotion || false,
      enableCaching: configuration.enableCaching !== false,
      compactMode: configuration.compactMode || false,
      lazyLoading: configuration.lazyLoading !== false,
      spacingScale: configuration.spacingScale || 1,
      maxWidth: configuration.maxWidth || '1200px',
      navbarCollapsible: configuration.navbarCollapsible || false,
      components: {
        cards: {
          borderRadius: configuration.components?.cards?.borderRadius || 'medium',
          padding: configuration.components?.cards?.padding || 1,
          shadowStyle: configuration.components?.cards?.shadowStyle || 'default',
          ...configuration.components?.cards,
        },
        buttons: {
          style: configuration.components?.buttons?.style || 'default',
          size: configuration.components?.buttons?.size || 'medium',
          hoverEffects: configuration.components?.buttons?.hoverEffects !== false,
          ...configuration.components?.buttons,
        },
        grid: {
          columns: configuration.components?.grid?.columns || 3,
          gap: configuration.components?.grid?.gap || 4,
          ...configuration.components?.grid,
        },
        forms: {
          inputStyle: configuration.components?.forms?.inputStyle || 'default',
          inputSize: configuration.components?.forms?.inputSize || 'medium',
          focusRing: configuration.components?.forms?.focusRing !== false,
          ...configuration.components?.forms,
        },
        ...configuration.components,
      },
      enableAPI: configuration.enableAPI || false,
      webhookUrl: configuration.webhookUrl || '',
      enableNotifications: configuration.enableNotifications !== false,
      customCSS: configuration.customCSS || '',
      customJS: configuration.customJS || '',
      enableAdvancedReporting: configuration.enableAdvancedReporting || false,
      enableInventoryPrediction: configuration.enableInventoryPrediction || false,
      enableCustomerLoyalty: configuration.enableCustomerLoyalty || false,
      enableStaffScheduling: configuration.enableStaffScheduling || false,
      enableKitchenDisplay: configuration.enableKitchenDisplay || false,
      enableDeliveryTracking: configuration.enableDeliveryTracking || false,
      ...configuration,
    };
  }

  static getStyles(config: Record<string, any>) {
    return {
      card: {
        backgroundColor: config.backgroundColor,
        borderColor: config.cardBorderColor,
        color: config.textColor,
        boxShadow: this.getShadowStyle(config),
        transition: config.animations ? 'all 0.2s ease-in-out' : 'none',
        backdropFilter: config.glassEffect ? 'blur(10px) saturate(200%)' : 'none',
        background: config.gradientBackgrounds ? this.getGradientBackground(config) : config.backgroundColor,
      },
      animation: config.animations ? 'all 0.2s ease-in-out' : 'none',
      container: {
        background: config.gradientBackgrounds ? this.getContainerGradient(config) : config.backgroundColor,
        backdropFilter: config.glassEffect ? 'blur(10px)' : 'none',
      },
    };
  }

  static getShadowStyle(config: Record<string, any>) {
    if (!config.shadows || config.shadowIntensity === 'none') return 'none';
    switch (config.shadowIntensity) {
      case 'light': return '0 1px 3px rgba(0, 0, 0, 0.1)';
      case 'medium': return '0 4px 6px rgba(0, 0, 0, 0.1)';
      case 'heavy': return '0 10px 15px rgba(0, 0, 0, 0.2)';
      default: return '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
  }

  static getStyleVars(config: Record<string, any>) {
    return {
      '--primary-color': config.primaryColor,
      '--secondary-color': config.secondaryColor,
      '--accent-color': config.accentColor,
      '--background-color': config.backgroundColor,
      '--text-color': config.textColor,
      '--text-muted-color': config.textMutedColor,
      '--card-border-color': config.cardBorderColor,
      '--font-family': config.fontFamily || 'Inter, system-ui, sans-serif',
      '--font-size': config.fontSize || '14px',
      '--font-weight': config.fontWeight || '400',
      '--shadow-style': this.getShadowStyle(config),
      '--animation-duration': config.animations ? '0.2s' : '0s',
      '--gradient-bg': config.gradientBackgrounds ? this.getGradientBackground(config) : 'none',
      '--glass-effect': config.glassEffect ? 'blur(10px) saturate(200%)' : 'none',
    };
  }

  static getGradientBackground(config: Record<string, any>) {
    if (!config.gradientBackgrounds) return 'none';
    const primary = config.primaryColor || '#3b82f6';
    const secondary = config.secondaryColor || '#f8fafc';
    const accent = config.accentColor || '#1e40af';
    return `linear-gradient(135deg, ${primary}20 0%, ${accent}10 50%, ${secondary}30 100%)`;
  }

  static getContainerGradient(config: Record<string, any>) {
    if (!config.gradientBackgrounds) return config.backgroundColor;
    const primary = config.primaryColor || '#3b82f6';
    const background = config.backgroundColor || '#ffffff';
    return `linear-gradient(45deg, ${background} 0%, ${primary}05 100%)`;
  }

  static getGlassEffect(config: Record<string, any>) {
    if (!config.glassEffect) return {};
    return {
      backdropFilter: 'blur(10px) saturate(200%)',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
    };
  }

  static getAnimationClasses(config: Record<string, any>) {
    if (!config.animations && !config.cardAnimations) return '';
    return 'transition-all duration-200 ease-in-out';
  }

  static getAnimationTypeClass(config: Record<string, any>) {
    if (!config.animations && !config.cardAnimations) return 'pos-animations-disabled';
    const animationType = config.animationType || 'slide';
    return `pos-animation-${animationType}`;
  }

  static getAnimationSpeedClass(config: Record<string, any>) {
    if (!config.animations && !config.cardAnimations) return '';
    const speed = config.animationSpeed || 'normal';
    const speedMap: Record<string, string> = { slow: 'duration-300', normal: 'duration-200', fast: 'duration-100' };
    return speedMap[speed] || speedMap.normal;
  }

  static getCardAnimationClasses(config: Record<string, any>) {
    if (!config.cardAnimations) return '';
    const cardAnimationType = config.cardAnimationType || 'slide';
    const cardAnimationSpeed = config.cardAnimationSpeed || 'normal';
    const speedMap: Record<string, string> = { slow: 'duration-300', normal: 'duration-200', fast: 'duration-100' };
    const speedClass = speedMap[cardAnimationSpeed] || speedMap.normal;
    return `pos-card-animation pos-animation-${cardAnimationType} ${speedClass}`;
  }

  static shouldApplyCardAnimations(config: Record<string, any>) {
    return config.cardAnimations !== false;
  }

  static getCardClasses(config: Record<string, any>) {
    const cardConfig = config.components?.cards || {};
    const borderRadiusMap: Record<string, string> = {
      none: 'rounded-none', small: 'rounded', medium: 'rounded-lg',
      large: 'rounded-xl', xl: 'rounded-2xl', full: 'rounded-full',
    };
    const shadowMap: Record<string, string> = {
      none: '', soft: 'shadow-sm', default: 'shadow', hard: 'shadow-lg', colored: 'shadow-lg shadow-blue-200',
    };
    const borderRadius = borderRadiusMap[cardConfig.borderRadius] || 'rounded-lg';
    const shadow = shadowMap[cardConfig.shadowStyle] || 'shadow';
    const padding = `p-${Math.round((cardConfig.padding || 1) * 4)}`;
    return `${borderRadius} ${shadow} ${padding}`;
  }

  static getButtonClasses(config: Record<string, any>) {
    const buttonConfig = config.components?.buttons || {};
    const styleMap: Record<string, string> = {
      default: 'bg-primary text-primary-foreground',
      rounded: 'bg-primary text-primary-foreground rounded-full',
      pill: 'bg-primary text-primary-foreground rounded-full px-6',
      square: 'bg-primary text-primary-foreground rounded-none',
      outline: 'border border-primary text-primary bg-transparent',
      ghost: 'text-primary bg-transparent hover:bg-primary/10',
    };
    const sizeMap: Record<string, string> = {
      small: 'px-2 py-1 text-xs', medium: 'px-4 py-2 text-sm',
      large: 'px-6 py-3 text-base', xl: 'px-8 py-4 text-lg',
    };
    const style = styleMap[buttonConfig.style] || 'bg-primary text-primary-foreground';
    const size = sizeMap[buttonConfig.size] || 'px-4 py-2 text-sm';
    const hoverEffects = buttonConfig.hoverEffects !== false ? 'hover:opacity-90 transition-all' : '';
    return `${style} ${size} ${hoverEffects}`;
  }

  static getGridClasses(config: Record<string, any>) {
    const gridConfig = config.components?.grid || {};
    const columns = gridConfig.columns || 3;
    const gap = gridConfig.gap || 4;
    const columnMap: Record<string, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' };
    return `grid ${columnMap[columns] || 'grid-cols-3'} gap-${gap}`;
  }

  static getInputClasses(config: Record<string, any>) {
    const formConfig = config.components?.forms || {};
    const styleMap: Record<string, string> = {
      default: 'border border-gray-300 rounded-md',
      rounded: 'border border-gray-300 rounded-full',
      underlined: 'border-0 border-b border-gray-300 rounded-none',
      filled: 'bg-gray-100 border border-gray-200 rounded-md',
      outlined: 'border-2 border-primary rounded-md',
    };
    const sizeMap: Record<string, string> = {
      small: 'px-2 py-1 text-xs', medium: 'px-3 py-2 text-sm', large: 'px-4 py-3 text-base',
    };
    const style = styleMap[formConfig.inputStyle] || styleMap.default;
    const size = sizeMap[formConfig.inputSize] || sizeMap.medium;
    const focusRing = formConfig.focusRing ? 'focus:ring-2 focus:ring-primary focus:border-primary' : '';
    return `${style} ${size} ${focusRing}`.trim();
  }

  static getLayoutClasses(config: Record<string, any>) {
    const spacing = config.spacingScale || 1;
    const maxWidth = config.maxWidth || '1200px';
    const compact = config.compactMode;
    const spacingClass = compact ? 'space-y-2' : `space-y-${Math.round(spacing * 4)}`;
    const containerClass = maxWidth === '100%' ? 'max-w-full' : `max-w-${maxWidth.replace('px', '')}`;
    return `${containerClass} mx-auto ${spacingClass}`;
  }
}
