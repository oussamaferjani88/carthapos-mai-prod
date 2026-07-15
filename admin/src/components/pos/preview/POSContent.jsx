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

  // Resolve max-width from config
  const contentMaxWidth = config.maxWidth || '1200px';

  // Component-level CSS variables so child page components pick up card/button/grid/input styles
  const componentVars = React.useMemo(() => {
    const cards = config.components?.cards || {};
    const buttons = config.components?.buttons || {};
    const grid = config.components?.grid || {};
    const forms = config.components?.forms || {};

    const borderRadiusMap = { none: '0', small: '0.25rem', medium: '0.5rem', large: '0.75rem', xl: '1rem', full: '9999px' };
    const shadowMap = { none: 'none', soft: '0 1px 2px rgba(0,0,0,0.05)', default: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)', hard: '0 10px 15px rgba(0,0,0,0.1)', colored: '0 10px 15px rgba(59,130,246,0.3)' };
    const paddingMap = { 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem', 5: '1.25rem', 6: '1.5rem' };
    const buttonStyleMap = { default: '0.375rem', rounded: '0.5rem', pill: '9999px', square: '0', outline: '0.375rem', ghost: '0.375rem' };
    const sizePxMap = { small: { x: '0.5rem', y: '0.25rem', fs: '0.75rem' }, medium: { x: '1rem', y: '0.5rem', fs: '0.875rem' }, large: { x: '1.5rem', y: '0.75rem', fs: '1rem' }, xl: { x: '2rem', y: '1rem', fs: '1.125rem' } };
    const inputStyleMap = { default: '0.375rem', rounded: '9999px', underlined: '0', filled: '0.375rem', outlined: '0.375rem' };
    const inputSizeMap = { small: { x: '0.5rem', y: '0.25rem', fs: '0.75rem' }, medium: { x: '0.75rem', y: '0.5rem', fs: '0.875rem' }, large: { x: '1rem', y: '0.75rem', fs: '1rem' } };

    const br = borderRadiusMap[cards.borderRadius] || '0.5rem';
    const sh = shadowMap[cards.shadowStyle] || '0 1px 3px rgba(0,0,0,0.1)';
    const pd = paddingMap[cards.padding] || '0.25rem';
    const btnStyle = buttonStyleMap[buttons.style] || '0.375rem';
    const btnSize = sizePxMap[buttons.size] || sizePxMap.medium;
    const inputStyle = inputStyleMap[forms.inputStyle] || '0.375rem';
    const inputSize = inputSizeMap[forms.inputSize] || inputSizeMap.medium;
    const gridCols = grid.columns || 3;
    const gridGap = grid.gap || 4;

    return {
      '--pos-card-border-radius': br,
      '--pos-card-shadow': sh,
      '--pos-card-padding': pd,
      '--pos-button-border-radius': btnStyle,
      '--pos-button-px': btnSize.x,
      '--pos-button-py': btnSize.y,
      '--pos-button-fs': btnSize.fs,
      '--pos-button-hover': buttons.hoverEffects !== false ? '0.9' : '1',
      '--pos-input-border-radius': inputStyle,
      '--pos-input-px': inputSize.x,
      '--pos-input-py': inputSize.y,
      '--pos-input-fs': inputSize.fs,
      '--pos-input-focus-ring': forms.focusRing !== false ? '2px solid var(--primary-color)' : 'none',
      '--pos-grid-columns': String(gridCols),
      '--pos-grid-gap': `${gridGap * 0.25}rem`
    };
  }, [config]);
  
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
        transition: styles.animation,
        ...componentVars
      }}
    >
      {/* Scoped style overrides — only apply inside .pos-preview wrapper */}
      <style>{`
        .pos-preview .pos-preview-card,
        .pos-preview div[class*="rounded-lg"].bg-white,
        .pos-preview div[class*="rounded-xl"].bg-white {
          border-radius: var(--pos-card-border-radius);
          box-shadow: var(--pos-card-shadow);
          padding: var(--pos-card-padding);
        }
        .pos-preview .pos-preview-grid {
          grid-template-columns: repeat(var(--pos-grid-columns), minmax(0, 1fr));
          gap: var(--pos-grid-gap);
        }
      `}</style>
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
          activePage === 'sales' ? 'overflow-hidden' : 'overflow-auto',
          animationTypeClass,
          animationSpeedClass,
          animationClasses,
          config.compactMode ? 'p-2' : 'pb-20'
        )}
        style={{ 
          backgroundColor: config.backgroundColor, 
          minHeight: '100%',
          maxWidth: contentMaxWidth !== '100%' ? contentMaxWidth : '100%',
          margin: '0 auto',
          width: '100%',
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
