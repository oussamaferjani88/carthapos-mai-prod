import React, { useState, useMemo } from 'react';
import { cn } from '../../../lib/utils';
import DraggableComponent from '../../drag-drop/DraggableComponent';
import { POSComponentRegistry } from '../../../constants/POSComponentRegistry';
import { POSConfiguration } from '../../../config/POSConfiguration';
import { Menu, X, Shield, ChevronRight } from 'lucide-react';

// Miroir de pos-template/components/POSNavbar.jsx (mode sidebar avec overlay) :
// barre d'icônes colorée + panneau latéral dépliable. Les items proviennent du
// registre qui suit exactement l'ordre de navigation du POS réel.
export const POSNavbar = ({
  config,
  activePage,
  setActivePage,
  modules = [],
  isDragMode,
  onComponentSelect,
  isVisible,
}) => {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);

  const animationTypeClass = POSConfiguration.getAnimationTypeClass(config);
  const animationSpeedClass = POSConfiguration.getAnimationSpeedClass(config);

  const navbarWidth = config.navbarWidth || '64px';
  const navbarHeight = config.navbarHeight || '48px';
  const navCollapsible = config.navbarCollapsible === true;

  // Items de navigation basés sur les modules sélectionnés (registre)
  const navigationItems = useMemo(() => {
    return POSComponentRegistry.getNavigationItems(modules);
  }, [modules]);

  const renderOverlayNavbar = () => (
    <>
      {/* Barre d'icônes (partie du flux normal) */}
      <div
        className="flex flex-col shadow-lg transition-all duration-300 relative z-30 h-full"
        style={{
          backgroundColor: config.primaryColor,
          width: isNavbarCollapsed && navCollapsible ? '0px' : navbarWidth,
          overflow: isNavbarCollapsed && navCollapsible ? 'hidden' : 'visible',
          minWidth: isNavbarCollapsed && navCollapsible ? '0px' : navbarWidth,
          transition: 'width 0.3s ease, min-width 0.3s ease',
        }}
      >
        <button
          className="p-2 border-b border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
          onClick={() => {
            if (navCollapsible) {
              setIsNavbarCollapsed(!isNavbarCollapsed);
            } else {
              setIsOverlayOpen(!isOverlayOpen);
            }
          }}
        >
          <Menu className="w-6 h-6 text-white" />
        </button>

        <nav className="flex-1 py-2 overflow-y-auto scrollbar-hide">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={cn(
                  'w-full p-2.5 flex items-center justify-center relative group',
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

        <div className="p-3 border-t border-white/20 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white/60" />
        </div>
      </div>

      {isOverlayOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
          onClick={() => setIsOverlayOpen(false)}
        />
      )}

      {isOverlayOpen && (
        <div
          className="fixed left-0 top-0 h-full w-64 z-50 shadow-2xl transition-all duration-300"
          style={{ backgroundColor: config.backgroundColor }}
        >
          <div
            className="px-4 py-4 border-b flex items-center justify-between"
            style={{ borderColor: config.accentColor + '20' }}
          >
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
                    isActive ? 'text-white shadow-md' : 'hover:bg-gray-100'
                  )}
                  style={isActive
                    ? { backgroundColor: config.primaryColor, color: '#ffffff' }
                    : { color: config.textColor }}
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

          <div
            className="border-t px-4 py-3"
            style={{ borderColor: config.accentColor + '20' }}
          >
            <div className="flex items-center space-x-2 text-xs" style={{ color: config.textMutedColor }}>
              <Shield className="w-3 h-3" />
              <div>
                <div>{config.businessName || 'POS System'} v2.1.0</div>
                {config.currentUser && (
                  <div className="text-xs mt-1">
                    Connecté: {config.currentUser.name || config.currentUser.username}
                  </div>
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
      className="flex flex-row items-center border-b shadow-sm w-full"
      style={{
        backgroundColor: config.backgroundColor,
        borderColor: config.accentColor + '20',
        height: navbarHeight,
      }}
    >
      <div className="px-4 flex-1 flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: config.textColor }}>
          {config.businessName || 'POS System'}
        </h2>
      </div>

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
                isActive ? 'text-white' : 'hover:bg-gray-100'
              )}
              style={isActive
                ? { backgroundColor: config.primaryColor, color: '#ffffff' }
                : { color: config.textColor }}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button className="lg:hidden p-2 mr-4">
        <Menu className="w-6 h-6" />
      </button>
    </div>
  );

  const navbarContent = config.navbarPosition === 'top'
    ? renderTopNavbar()
    : renderOverlayNavbar();

  return (
    <DraggableComponent
      id="navbar"
      isVisible={isVisible('navbar') || isDragMode}
      isDragMode={isDragMode}
      onComponentSelect={onComponentSelect}
      style={{
        position: 'relative',
        zIndex: 30,
        height: '100%',
        flexShrink: 0,
        ...(config.navbarPosition === 'right' ? { order: 2 } : {}),
      }}
    >
      {navbarContent}
    </DraggableComponent>
  );
};

export default POSNavbar;
