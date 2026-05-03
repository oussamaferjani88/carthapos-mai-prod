import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { useThemeApplier } from '../hooks/useThemeApplier';
// import { useAuth } from '../contexts/AuthContext'; // unused for now
import { AppConfig } from '../config/AppConfig';
import { POSHeader } from './POSHeader';
import { POSNavbar } from './POSNavbar';
import { POSContent } from './POSContent';
import { Shield } from 'lucide-react';

/**
 * Layout principal du POS - Version refactorisée
 * Utilise 3 composants modulaires pour correspondre au POS Preview
 */
export default function Layout({ children, config = {} /*, license (unused for now) */ }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // const { user } = useAuth(); // unused for now, keeping for future use

  // Get theme configuration (backward compatibility)
  const getThemeConfig = () => {
    if (typeof window !== 'undefined' && window.themeConfig) {
      return window.themeConfig;
    }
    return {};
  };

  // Get configuration from AppConfig
  const appConfig = AppConfig.getConfig();
  const themeConfig = getThemeConfig();

  // Merge configurations (backward compatibility)
  const defaultConfig = {
    businessName: appConfig.businessInfo.name || themeConfig.businessName || 'POS System',
    businessLogo: appConfig.businessInfo.logo || themeConfig.businessLogo || null,
    primaryColor: appConfig.theme.primary || themeConfig.colors?.primary || '#3b82f6',
    accentColor: appConfig.theme.accent || themeConfig.colors?.accent || '#6366f1',
    secondaryColor: appConfig.theme.secondary || themeConfig.colors?.secondary || '#f3f4f6',
    backgroundColor: appConfig.theme.background || themeConfig.colors?.background || '#ffffff',
    textColor: appConfig.theme.text || themeConfig.colors?.text || '#1f2937',
    cardBackgroundColor: themeConfig.colors?.cardBackground || '#ffffff',
    cardBorderColor: themeConfig.colors?.border || '#e5e7eb',
    textMutedColor: themeConfig.colors?.textMuted || '#6b7280',
    fontFamily: themeConfig.typography?.fontFamily || 'Inter',
    fontSize: themeConfig.typography?.fontSize || '14px',
    navbarPosition: appConfig.layout.navbarPosition || themeConfig.layout?.navbarPosition || 'left',
    enabledModules: appConfig.enabledModules || [],
    footerText: `Powered by ${appConfig.businessInfo.name || 'POS System'}`,
    language: 'fr',
    ...config
  };

  // Apply theme dynamically
  useThemeApplier(defaultConfig);

  // Determine layout flex direction based on navbar position
  const layoutFlexDirection = defaultConfig.navbarPosition === 'top' ? 'flex-col' : 'flex-row';

  return (
    <div 
      className={cn(
        "h-screen flex overflow-hidden",
        layoutFlexDirection
      )}
      style={{
        fontFamily: `"${defaultConfig.fontFamily}", sans-serif`,
        backgroundColor: defaultConfig.backgroundColor,
        color: defaultConfig.textColor,
        fontSize: defaultConfig.fontSize
      }}
    >
      {/* Navbar Component - Overlay style moderne */}
      <POSNavbar 
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Component - Avec logo, badges système, user info */}
        <POSHeader 
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        
        {/* Content Component - Avec notification toast */}
        <POSContent>
          {/* Page Content from React Router */}
          <div className="p-4">
            {children}
          </div>
        </POSContent>
        
        {/* Footer - Garde le footer du template original */}
        <footer 
          className="border-t p-4 bg-gray-50" 
          style={{ 
            borderColor: defaultConfig.cardBorderColor,
            backgroundColor: defaultConfig.cardBackgroundColor
          }}
        >
          <div 
            className="flex items-center justify-between text-sm" 
            style={{ color: defaultConfig.textMutedColor }}
          >
            <div className="flex items-center space-x-4">
              <Shield className="w-3 h-3" />
              <span>{defaultConfig.footerText}</span>
              <span>•</span>
              <span>Version 2.1.0</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>
                Connecté depuis {new Date().toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>En ligne</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Menu Overlay (si nécessaire) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
