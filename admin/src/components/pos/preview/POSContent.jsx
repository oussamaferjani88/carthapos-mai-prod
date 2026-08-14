import React, { useEffect, useRef } from 'react';
import { POSComponentRegistry } from '../../../constants/POSComponentRegistry';
import { POSConfiguration } from '../../../config/POSConfiguration';
import { ShoppingCart, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../../lib/utils';

// Miroir de pos-template/components/POSContent.jsx : conteneur défilant de la
// page active + toast de notification (mêmes styles de couleurs par type).
export const POSContent = ({
  config,
  activePage,
  modules,
  notification,
  setNotification,
  isDragMode,
}) => {
  const mainContentRef = useRef(null);
  const styles = POSConfiguration.getStyles(config);
  const glassEffect = POSConfiguration.getGlassEffect(config);
  const animationClasses = POSConfiguration.getAnimationClasses(config);
  const animationTypeClass = POSConfiguration.getAnimationTypeClass(config);
  const animationSpeedClass = POSConfiguration.getAnimationSpeedClass(config);

  // Variables CSS des composants pour que les modules héritent des
  // personnalisations (cart/button/grid/input) du customizer.
  const componentVars = React.useMemo(() => {
    const cards = config.components?.cards || {};
    const buttons = config.components?.buttons || {};
    const grid = config.components?.grid || {};
    const forms = config.components?.forms || {};

    const borderRadiusMap = { none: '0', small: '0.25rem', medium: '0.5rem', large: '0.75rem', xl: '1rem', full: '9999px' };
    const shadowMap = { none: 'none', soft: '0 1px 2px rgba(0,0,0,0.05)', default: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)', hard: '0 10px 15px rgba(0,0,0,0.1)', colored: '0 10px 15px rgba(59,130,246,0.3)' };
    const paddingMap = { 0.5: '0.25rem', 1: '0.5rem', 1.5: '0.75rem', 2: '1rem' };
    const buttonStyleMap = { default: '0.375rem', rounded: '0.5rem', pill: '9999px', square: '0', outline: '0.375rem', ghost: '0.375rem' };
    const sizePxMap = { small: { x: '0.5rem', y: '0.25rem', fs: '0.75rem' }, medium: { x: '1rem', y: '0.5rem', fs: '0.875rem' }, large: { x: '1.5rem', y: '0.75rem', fs: '1rem' }, xl: { x: '2rem', y: '1rem', fs: '1.125rem' } };
    const inputStyleMap = { default: '0.375rem', rounded: '9999px', underlined: '0', filled: '0.375rem', outlined: '0.375rem' };
    const inputSizeMap = { small: { x: '0.5rem', y: '0.25rem', fs: '0.75rem' }, medium: { x: '0.75rem', y: '0.5rem', fs: '0.875rem' }, large: { x: '1rem', y: '0.75rem', fs: '1rem' } };

    const br = borderRadiusMap[cards.borderRadius] || '0.5rem';
    const sh = shadowMap[cards.shadowStyle] || '0 1px 3px rgba(0,0,0,0.1)';
    const pd = paddingMap[cards.padding] || '0.5rem';
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
      '--pos-grid-gap': `${gridGap * 0.25}rem`,
    };
  }, [config]);

  // Réinitialise le scroll quand on change de page (comme le POS réel)
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activePage]);

  // Icône et couleurs du toast selon le type (comme le POS réel)
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'info': return <Info className="w-4 h-4" />;
      default: return <ShoppingCart className="w-4 h-4" />;
    }
  };

  const getNotificationColors = (type) => {
    switch (type) {
      case 'success': return 'bg-green-500 text-white';
      case 'error': return 'bg-red-500 text-white';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-gray-800 text-white';
    }
  };

  const renderContent = () => {
    const PageComponent = POSComponentRegistry.getPageRenderer(activePage, modules);

    if (!PageComponent) {
      console.warn(`Page renderer for "${activePage}" not found, falling back to dashboard`);
      const DashboardComponent = POSComponentRegistry.getPageRenderer('dashboard', modules);
      return <DashboardComponent config={config} modules={modules} />;
    }

    const props = {
      config,
      modules,
      ...(setNotification && { setNotification }),
    };

    return <PageComponent {...props} />;
  };

  // Padding du contenu : px-2 pt-3 (cohérent avec le POS réel), mais la
  // hauteur remplit la zone défilante (h-full) pour que chaque page occupe
  // tout le viewport et que l'aperçu ne laisse pas de vide en bas. Le pb-20
  // du POS réel (écran plein) est réduit ici car l'aperçu a déjà un footer.
  const contentPadding = activePage === 'sales'
    ? 'p-0 h-full'
    : config.compactMode ? 'p-1.5 h-full' : 'px-2 pt-3 pb-4 h-full';

  return (
    <div
      className={cn(
        'flex-1 flex flex-col min-w-0 relative h-full',
        animationTypeClass,
        animationSpeedClass,
        animationClasses
      )}
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100%',
        ...(config.gradientBackgrounds ? {
          background: POSConfiguration.getContainerGradient(config),
        } : {}),
        ...(config.glassEffect ? glassEffect : {}),
        transition: styles.animation,
        ...componentVars,
      }}
    >
      {/* Styles scopés du customizer — ne s'appliquent qu'à l'intérieur de .pos-preview */}
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

      {/* Zone de contenu principale (défilante sauf pour la page Ventes) */}
      <main
        ref={mainContentRef}
        className={cn(
          'flex-1',
          activePage === 'sales' ? 'overflow-hidden' : 'overflow-auto',
          animationTypeClass,
          animationSpeedClass,
          animationClasses
        )}
        style={{
          backgroundColor: config.backgroundColor,
          minHeight: '100%',
          width: '100%',
          maxWidth: config.maxWidth !== '100%' ? config.maxWidth : '100%',
          margin: '0 auto',
          fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif',
          fontSize: config.fontSize || '14px',
          fontWeight: config.fontWeight || '400',
          transition: styles.animation,
          ...(config.gradientBackgrounds ? {
            background: POSConfiguration.getGradientBackground(config),
          } : {}),
          ...(config.glassEffect ? {
            ...glassEffect,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          } : {}),
        }}
      >
        <div className={contentPadding}>{renderContent()}</div>
      </main>

      {/* Indicateur de mode Drag & Drop (contrôle admin uniquement) */}
      {isDragMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Mode Drag & Drop actif</span>
          </div>
        </div>
      )}

      {/* Toast de notification (comme le POS réel) */}
      {notification && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg',
            getNotificationColors(notification.type || 'default')
          )}
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          <div className="flex items-center space-x-3">
            {getNotificationIcon(notification.type)}
            <span className="text-sm font-medium">
              {typeof notification === 'string' ? notification : notification.message}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSContent;
