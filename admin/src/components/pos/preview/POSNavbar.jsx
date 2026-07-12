import React, { useState, useMemo } from 'react';
import { cn } from '../../../lib/utils';
import DraggableComponent from '../../drag-drop/DraggableComponent';
import { POSComponentRegistry } from '../../../constants/POSComponentRegistry';
import { POSConfiguration } from '../../../config/POSConfiguration';
import { 
  ShoppingCart, 
  CreditCard, 
  Calculator, 
  Settings, 
  Users,
  Package,
  FileText,
  BarChart,
  Menu,
  X,
  Shield,
  ChevronRight
} from 'lucide-react';

export const POSNavbar = ({ 
  config,
  activePage, 
  setActivePage,
  modules = [], 
  isDragMode, 
  onComponentSelect, 
  isVisible 
}) => {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  // Get animation classes from configuration
  const animationTypeClass = POSConfiguration.getAnimationTypeClass(config);
  const animationSpeedClass = POSConfiguration.getAnimationSpeedClass(config);
  
  // Génère dynamiquement les items de navigation basés sur les modules sélectionnés
  const navigationItems = useMemo(() => {
    return POSComponentRegistry.getNavigationItems(modules);
  }, [modules]);

  const renderOverlayNavbar = () => (
    <>
      {/* Collapsed Icon Bar - Part of Normal Flow */}
      <div 
        className="h-full w-16 flex flex-col shadow-lg transition-all duration-300 relative z-30"
        style={{ backgroundColor: config.primaryColor }}
      >
        {/* Header Icon - Click to Toggle */}
        <button 
          className="p-3 border-b border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
          onClick={() => setIsOverlayOpen(!isOverlayOpen)}
        >
          <Menu className="w-6 h-6 text-white" />
        </button>

        {/* Navigation Icons */}
        <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={cn(
                  'w-full p-3 flex items-center justify-center relative group',
                  animationTypeClass,
                  animationSpeedClass,
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
                {isActive && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white rounded-l"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Icon */}
        <div className="p-3 border-t border-white/20 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white/60" />
        </div>
      </div>

      {/* Overlay Background - Covers entire screen */}
      {isOverlayOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
          onClick={() => setIsOverlayOpen(false)}
        />
      )}

      {/* Expanded Sidebar Overlay - Only when open */}
      {isOverlayOpen && (
        <div 
          className="fixed left-0 top-0 h-full w-64 z-50 shadow-2xl transition-all duration-300"
          style={{ backgroundColor: config.backgroundColor }}
        >
        {/* Header */}
        <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: config.accentColor + '20' }}>
          <h2 className="text-xl font-bold" style={{ color: config.textColor }}>
            {config.businessName || 'POS System'}
          </h2>
          <button
            onClick={() => setIsOverlayOpen(false)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 h-[calc(100vh-8rem)] scrollbar-hide">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setIsOverlayOpen(false);
                }}
                className={cn(
                  'w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left mb-1 group',
                  animationTypeClass,
                  animationSpeedClass,
                  isActive 
                    ? 'text-white shadow-md' 
                    : 'hover:bg-gray-100'
                )}
                style={isActive ? { 
                  backgroundColor: config.primaryColor,
                  color: '#ffffff'
                } : {
                  color: config.textColor
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium flex-1">{item.label}</span>
                <ChevronRight className={cn(
                  'w-4 h-4 transition-transform',
                  isActive ? 'text-white/80' : 'text-gray-400 group-hover:text-gray-600'
                )} />
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t px-4 py-3" style={{ borderColor: config.accentColor + '20' }}>
          <div className="flex items-center space-x-2 text-xs" style={{ color: config.textMutedColor }}>
            <Shield className="w-3 h-3" />
            <div>
              <div>{config.businessName || 'POS System'} v2.1.0</div>
              {config.currentUser && (
                <div className="text-xs mt-1">Connecté: {config.currentUser.name}</div>
              )}
              {config.isPreviewMode && (
                <div className="text-xs text-blue-600 mt-1">Mode Prévisualisation</div>
              )}
            </div>
          </div>
        </div>
        </div>
      )}
    </>
  );

  const renderTopNavbar = () => (
    <div 
      className="flex flex-row h-16 items-center border-b shadow-sm w-full"
      style={{ 
        backgroundColor: config.backgroundColor,
        borderColor: config.accentColor + '20'
      }}
    >
      {/* Header avec titre */}
      <div className="px-4 flex-1 flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: config.textColor }}>
          {config.businessName || 'POS System'}
        </h2>
      </div>

      {/* Menu Items */}
      <nav className="hidden lg:flex flex-row space-x-2 px-4 overflow-x-auto scrollbar-hide">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={cn(
                'flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-left whitespace-nowrap',
                isActive 
                  ? 'text-white' 
                  : 'hover:bg-gray-100'
              )}
              style={isActive ? { 
                backgroundColor: config.primaryColor,
                color: '#ffffff'
              } : {
                color: config.textColor
              }}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile menu button */}
      <button className="lg:hidden p-2 mr-4" onClick={() => {}}>
        <Menu className="w-6 h-6" />
      </button>
    </div>
  );

  // For top navbar, use the existing top layout
  if (config.navbarPosition === 'top') {
    return (
      <DraggableComponent
        id="navbar"
        isVisible={isVisible('navbar') || isDragMode}
        isDragMode={isDragMode}
        onComponentSelect={onComponentSelect}
      >
        {renderTopNavbar()}
      </DraggableComponent>
    );
  }

  // For left/sidebar position, use the new overlay drawer
  return (
    <DraggableComponent
      id="navbar"
      isVisible={isVisible('navbar') || isDragMode}
      isDragMode={isDragMode}
      onComponentSelect={onComponentSelect}
      style={{ 
        position: 'relative',
        zIndex: 30
      }}
    >
      {renderOverlayNavbar()}
    </DraggableComponent>
  );
};

export default POSNavbar;