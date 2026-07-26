import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { useThemeApplier } from '../hooks/useThemeApplier';
import { POSHeader } from './POSHeader';
import { POSNavbar } from './POSNavbar';
import { POSContent } from './POSContent';
import { Shield } from 'lucide-react';

export default function Layout({ children, config = {} }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navbarHidden, setNavbarHidden] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.hidden !== undefined) setNavbarHidden(e.detail.hidden);
      else setNavbarHidden(prev => !prev);
    };
    window.addEventListener('pos-navbar-toggle', handler);
    return () => window.removeEventListener('pos-navbar-toggle', handler);
  }, []);

  // Extract theme from config (passed from App.jsx via useAppConfig)
  const theme = config?.theme || {};

  // Build merged config: passed config takes priority, fallback to window.themeConfig
  const mergedConfig = {
    businessName: theme.businessName || 'POS System',
    businessLogo: theme.logo || null,
    primaryColor: theme.primaryColor || theme.colors?.primary || '#3b82f6',
    accentColor: theme.accentColor || theme.colors?.accent || '#6366f1',
    secondaryColor: theme.secondaryColor || theme.colors?.secondary || '#f3f4f6',
    backgroundColor: theme.backgroundColor || theme.colors?.background || '#ffffff',
    textColor: theme.textColor || theme.colors?.text || '#1f2937',
    cardBackgroundColor: theme.cardBackgroundColor || theme.colors?.cardBackground || '#ffffff',
    cardBorderColor: theme.cardBorderColor || theme.colors?.border || '#e5e7eb',
    textMutedColor: theme.textMutedColor || theme.colors?.textMuted || '#6b7280',
    fontFamily: theme.fontFamily || 'Inter',
    fontSize: theme.fontSize || '14px',
    navbarPosition: theme.navbarPosition || 'left',
    enabledModules: (config?.modules || []).filter(m => m.isEnabled !== false).map(m => m.name),
    footerText: theme.footerText || `Powered by ${theme.businessName || 'POS System'}`,
    language: theme.language || 'fr',
    shadows: theme.shadows !== false,
    animations: theme.animations !== false,
    borderRadius: theme.borderRadius || 'medium'
  };

  useThemeApplier(mergedConfig);

  const layoutFlexDirection = mergedConfig.navbarPosition === 'top' ? 'flex-col' : 'flex-row';

  return (
    <div 
      className={cn(
        "h-screen flex overflow-hidden",
        layoutFlexDirection
      )}
      style={{
        fontFamily: `"${mergedConfig.fontFamily}", sans-serif`,
        backgroundColor: mergedConfig.backgroundColor,
        color: mergedConfig.textColor,
        fontSize: mergedConfig.fontSize
      }}
    >
      {!navbarHidden && (
        <POSNavbar 
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <POSHeader 
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        
        <POSContent>
          <div className="px-2 pt-3 pb-20">
            {children}
          </div>
        </POSContent>
        
        <footer 
          className="border-t p-4" 
          style={{ 
            borderColor: mergedConfig.cardBorderColor,
            backgroundColor: mergedConfig.cardBackgroundColor,
            color: mergedConfig.textMutedColor
          }}
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <Shield className="w-3 h-3" />
              <span>{mergedConfig.footerText}</span>
              <span>•</span>
              <span>Version 2.1.0</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>
                {new Date().toLocaleTimeString(config?.theme?.language === 'fr' ? 'fr-FR' : 'en-US', { 
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

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
