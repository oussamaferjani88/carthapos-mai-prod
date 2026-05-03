/**
 * usePOSConfiguration Hook
 * Manages POS configuration state and theme presets
 */

import { useState } from 'react';
import toast from 'react-hot-toast';

const DEFAULT_CONFIGURATION = {
  // Basic Business Info
  businessName: 'Mon POS',
  logo: '',
  favicon: '',
  appTitle: 'POS System',
  footerText: 'Powered by POS System',
  
  // Business Details
  businessAddress: '',
  businessPhone: '',
  businessEmail: '',
  businessWebsite: '',
  businessTaxId: '',
  
  // Color Scheme
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  accentColor: '#F59E0B',
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  cardBackgroundColor: '#FFFFFF',
  cardBorderColor: '#E5E7EB',
  textMutedColor: '#6B7280',
  
  // Typography
  fontFamily: 'Inter',
  fontSize: '14px',
  headingFontSize: '24px',
  fontWeight: 'normal',
  
  // Layout & Spacing
  borderRadius: 'medium',
  spacing: 'medium',
  cardPadding: '16px',
  navbarPosition: 'left',
  navbarWidth: '64px',
  navbarHeight: '48px',
  showNavbarBrand: true,
  navbarStyle: 'modern',
  contentMaxWidth: '1200px',
  sidebarCollapsible: true,
  showBreadcrumbs: true,
  
  // Visual Effects
  shadowIntensity: 'medium',
  hoverEffects: 'subtle',
  animations: true,
  animationsDuration: 'normal',
  glassEffect: false,
  gradientBackgrounds: false,
  
  // Component Styles
  buttonStyle: 'filled',
  buttonSize: 'medium',
  buttonHoverEffect: 'scale',
  cardStyle: 'modern',
  cardCornerRadius: '8px',
  cardShadow: 'medium',
  tableStyle: 'modern',
  tableRowHover: true,
  tableCompactMode: false,
  modalStyle: 'centered',
  
  // Accessibility & Interface
  responsiveMode: 'auto',
  compactMode: false,
  largeTextMode: false,
  highContrastMode: false,
  reducedMotion: false,
  
  // Dashboard Layout
  dashboardLayout: 'grid',
  statsCardStyle: 'default',
  showQuickActions: true,
  widgetSizes: 'mixed',
  
  // Navigation Advanced
  navbarCollapsible: true,
  showModuleIcons: true,
  showModuleBadges: true,
  
  // Branding
  customCSS: '',
  brandWatermark: false,
  splashScreen: false,
  
  // Currency & Localization
  currency: 'EUR',
  currencyPosition: 'before',
  taxRate: 20.0,
  language: 'fr',
  timezone: 'Europe/Paris',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  numberFormat: '1,234.56',
  
  // Receipt Customization
  receiptHeader: 'Thank you for your purchase!',
  receiptFooter: 'Please come again!',
  receiptShowLogo: true,
  receiptShowQRCode: true,
  
  // Security & Access
  requireLogin: true,
  sessionTimeout: 30,
  showUserInfo: true,
  allowGuestMode: false,
  allowRefunds: true,
  allowDiscounts: true,
  allowPriceOverride: true,
  requireManagerApproval: false,
  
  // Display Settings
  theme: 'light',
  highContrast: false,
  largeText: false,
  reduceMotion: false,
  
  // Performance
  lazyLoading: true,
  imageOptimization: true,
  cacheData: true,
  
  // Module Settings
  sales: {
    showProductImages: true,
    barcodeScanner: true,
    quickAddButtons: true,
    receiptTemplate: 'default'
  },
  inventory: {
    lowStockThreshold: 10,
    showStockAlerts: true,
    autoReorder: false,
    stockHistory: true
  },
  reports: {
    defaultPeriod: 'today',
    showCharts: true,
    exportFormats: ['pdf', 'excel']
  },
  
  // Preview device
  previewDevice: 'desktop'
};

export const usePOSConfiguration = (initialConfig = {}) => {
  const [configuration, setConfiguration] = useState({
    ...DEFAULT_CONFIGURATION,
    ...initialConfig
  });

  /**
   * Update configuration field
   */
  const updateConfig = (field, value) => {
    setConfiguration(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Update multiple configuration fields
   */
  const updateMultipleConfig = (updates) => {
    setConfiguration(prev => ({
      ...prev,
      ...updates
    }));
  };

  /**
   * Apply theme preset
   */
  const applyThemePreset = (presetName) => {
    const presets = {
      modern: {
        primaryColor: '#3B82F6',
        accentColor: '#F59E0B',
        secondaryColor: '#1E40AF',
        backgroundColor: '#FFFFFF',
        textColor: '#1F2937',
        cardBackgroundColor: '#FFFFFF',
        cardBorderColor: '#E5E7EB',
        fontFamily: 'Inter',
        borderRadius: 'medium',
        spacing: 'medium',
        shadowIntensity: 'medium',
        fontSize: '14px',
        fontWeight: 'normal'
      },
      dark: {
        primaryColor: '#6366F1',
        accentColor: '#F59E0B',
        secondaryColor: '#374151',
        backgroundColor: '#111827',
        textColor: '#F9FAFB',
        cardBackgroundColor: '#1F2937',
        cardBorderColor: '#374151',
        fontFamily: 'Inter',
        borderRadius: 'medium',
        spacing: 'medium',
        shadowIntensity: 'medium',
        fontSize: '14px',
        fontWeight: 'normal',
        theme: 'dark'
      },
      elegant: {
        primaryColor: '#6366F1',
        accentColor: '#EC4899',
        secondaryColor: '#F3F4F6',
        backgroundColor: '#FFFFFF',
        textColor: '#1F2937',
        cardBackgroundColor: '#FFFFFF',
        cardBorderColor: '#E5E7EB',
        fontFamily: 'Poppins',
        borderRadius: 'large',
        spacing: 'spacious',
        shadowIntensity: 'heavy',
        fontSize: '16px',
        fontWeight: 'medium'
      },
      nature: {
        primaryColor: '#059669',
        accentColor: '#F59E0B',
        secondaryColor: '#D1FAE5',
        backgroundColor: '#F0FDF4',
        textColor: '#1F2937',
        cardBackgroundColor: '#FFFFFF',
        cardBorderColor: '#BBF7D0',
        fontFamily: 'Open Sans',
        borderRadius: 'medium',
        spacing: 'medium',
        shadowIntensity: 'light',
        fontSize: '14px',
        fontWeight: 'normal'
      },
      minimal: {
        primaryColor: '#6B7280',
        accentColor: '#9CA3AF',
        secondaryColor: '#F9FAFB',
        backgroundColor: '#FFFFFF',
        textColor: '#374151',
        cardBackgroundColor: '#FFFFFF',
        cardBorderColor: '#E5E7EB',
        fontFamily: 'Inter',
        borderRadius: 'none',
        spacing: 'compact',
        shadowIntensity: 'none',
        fontSize: '12px',
        fontWeight: 'light'
      },
      cafe: {
        primaryColor: '#92400E',
        accentColor: '#F59E0B',
        secondaryColor: '#FEF3C7',
        backgroundColor: '#FFFBEB',
        textColor: '#1F2937',
        cardBackgroundColor: '#FFFFFF',
        cardBorderColor: '#FCD34D',
        fontFamily: 'Montserrat',
        borderRadius: 'large',
        spacing: 'spacious',
        shadowIntensity: 'medium',
        fontSize: '16px',
        fontWeight: 'medium'
      }
    };

    const preset = presets[presetName];
    if (preset) {
      updateMultipleConfig(preset);
      toast.success(`Thème "${presetName}" appliqué`);
    }
  };

  /**
   * Upload logo
   */
  const uploadLogo = (file) => {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner un fichier image');
        reject(new Error('Invalid file type'));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 5MB)');
        reject(new Error('File too large'));
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        updateConfig('logo', event.target.result);
        toast.success('Logo chargé avec succès');
        resolve(event.target.result);
      };
      reader.onerror = () => {
        toast.error('Erreur lors du chargement du logo');
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  /**
   * Reset configuration to default
   */
  const resetConfiguration = () => {
    setConfiguration(DEFAULT_CONFIGURATION);
    toast.info('Configuration réinitialisée');
  };

  /**
   * Validate configuration
   */
  const validateConfiguration = () => {
    const errors = [];

    if (!configuration.businessName || configuration.businessName.trim() === '') {
      errors.push('Le nom de l\'entreprise est requis');
    }

    if (!configuration.primaryColor) {
      errors.push('La couleur principale est requise');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  return {
    configuration,
    updateConfig,
    updateMultipleConfig,
    applyThemePreset,
    uploadLogo,
    resetConfiguration,
    validateConfiguration,
    setConfiguration
  };
};
