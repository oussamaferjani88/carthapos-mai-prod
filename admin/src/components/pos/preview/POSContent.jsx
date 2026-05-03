import React, { useEffect, useRef } from 'react';
import { POSComponentRegistry } from '../../../constants/POSComponentRegistry';
import { POSConfiguration } from '../../../config/POSConfiguration';
import { ShoppingCart } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const POSContent = ({
  config,
  activePage,
  modules,
  notification,
  setNotification,
  isDragMode,
  onComponentSelect,
  isVisible
}) => {
  const mainContentRef = useRef(null);
  const styles = POSConfiguration.getStyles(config);
  const glassEffect = POSConfiguration.getGlassEffect(config);
  const animationClasses = POSConfiguration.getAnimationClasses(config);
  const animationTypeClass = POSConfiguration.getAnimationTypeClass(config);
  const animationSpeedClass = POSConfiguration.getAnimationSpeedClass(config);
  
  // Reset scroll position when switching to sales page
  useEffect(() => {
    if (activePage === 'sales' && mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activePage]);
  const renderContent = () => {
    // Utilise le registre de composants pour obtenir le bon composant
    const PageComponent = POSComponentRegistry.getPageRenderer(activePage, modules);
    
    if (!PageComponent) {
      console.warn(`Page renderer for "${activePage}" not found, falling back to dashboard`);
      const DashboardComponent = POSComponentRegistry.getPageRenderer('dashboard', modules);
      return <DashboardComponent config={config} modules={modules} />;
    }
    
    // Rendu du composant avec les props appropriées
    const props = {
      config,
      modules,
      ...(setNotification && { setNotification })
    };
    
    return <PageComponent {...props} />;
  };

  return (
    <div 
      className={cn(
        "flex-1 flex flex-col min-w-0 relative h-full",
        animationTypeClass,
        animationSpeedClass,
        animationClasses
      )}
      style={{ 
        position: 'relative', 
        zIndex: 1, 
        minHeight: '100%',
        ...(config.gradientBackgrounds ? {
          background: POSConfiguration.getContainerGradient(config)
        } : {}),
        ...(config.glassEffect ? glassEffect : {}),
        transition: styles.animation
      }}
    >
      {/* Notification */}
      {notification && (
        <div className="m-4 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg">
          {notification}
        </div>
      )}
      
      {/* Main Content Area */}
      <main 
        ref={mainContentRef}
        className={cn(
          "flex-1",
          // Only sales (ventes) page is non-scrollable, others should scroll with padding bottom
          activePage === 'sales' ? 'overflow-hidden' : 'overflow-auto pb-20',
          animationTypeClass,
          animationSpeedClass,
          animationClasses
        )}
        style={{ 
          backgroundColor: config.backgroundColor, 
          minHeight: '100%',
          fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif',
          fontSize: config.fontSize || '14px',
          fontWeight: config.fontWeight || '400',
          boxShadow: styles.card.boxShadow,
          transition: styles.animation,
          ...(config.gradientBackgrounds ? {
            background: POSConfiguration.getGradientBackground(config)
          } : {}),
          ...(config.glassEffect ? {
            ...glassEffect,
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
          } : {})
        }}
      >
        {renderContent()}
      </main>

      {/* Drag Mode Indicator */}
      {isDragMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Mode Drag & Drop actif</span>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="absolute top-4 right-4 z-50 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg transform transition-all duration-300 ease-in-out">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSContent;
