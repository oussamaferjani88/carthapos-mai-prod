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
    const paddingMap = { 0.5: '0.25rem', 1: '0.5rem', 1.5: '0.75rem', 2: '1rem' };
    const buttonStyleMap = { default: '0.375rem', rounded: '0.5rem', pill: '9999px', square: '0', outline: '0.375rem', ghost: '0.375rem' };
    const sizePxMap = { small: { x: '0.5rem', y: '0.25rem', fs: '0.75rem' }, medium: { x: '1rem', y: '0.5rem', fs: '0.875rem' }, large: { x: '1.5rem', y: '0.75rem', fs: '1rem' }, xl: { x: '2rem', y: '1rem', fs: '1.125rem' } };
    const inputStyleMap = { default: '0.375rem', rounded: '9999px', underlined: '0', filled: '0.375rem', outlined: '0.375rem' };
    const inputSizeMap = { small: { x: '0.5rem', y: '0.25rem', fs: '0.75rem' }, medium: { x: '0.75rem', y: '0.5rem', fs: '0.875rem' }, large: { x: '1rem', y: '0.75rem', fs: '1rem' } };

    const br = borderRadiusMap[cards.borderRadius] || '0.5rem';
    // cards.shadowStyle (Layout) n'est plus une 2e échelle de profondeur qui
    // entre en conflit avec shadowIntensity (Thème) : "none"/"colored" restent
    // des variantes par carte explicites, sinon on hérite de l'ombre du thème.
    const sh = cards.shadowStyle === 'none'
      ? 'none'
      : cards.shadowStyle === 'colored'
        ? `0 10px 15px ${config.primaryColor || '#3b82f6'}4D`
        : POSConfiguration.getShadowStyle(config);
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

  // Padding du contenu : pt-3 (cohérent avec le POS réel), mais la
  // hauteur remplit la zone défilante (h-full) pour que chaque page occupe
  // tout le viewport et que l'aperçu ne laisse pas de vide en bas. Le pb-20
  // du POS réel (écran plein) est réduit ici car l'aperçu a déjà un footer.
  const contentPadding = activePage === 'sales' ? 'p-0 h-full' : 'h-full';

  // spacingScale/maxWidth (Layout > Général) - un multiplicateur sur le
  // padding vertical de la page et une largeur max centrée. Ce sont les
  // seuls endroits où ces deux réglages peuvent avoir un effet global sans
  // devoir réécrire l'espacement interne (fixe, compilé) de chaque page.
  const spacingScale = config.spacingScale || 1;
  const maxWidth = config.maxWidth || '1200px';
  const basePadY = config.compactMode ? 0.375 : 0.75;
  const contentStyle = {
    paddingTop: `${basePadY * spacingScale}rem`,
    paddingBottom: `${(config.compactMode ? 0.375 : 1) * spacingScale}rem`,
    maxWidth: maxWidth === '100%' ? 'none' : maxWidth,
    marginLeft: maxWidth === '100%' ? undefined : 'auto',
    marginRight: maxWidth === '100%' ? undefined : 'auto',
  };

  return (
    <div
      className={cn(
        'flex-1 flex flex-col min-w-0 relative',
        animationTypeClass,
        animationSpeedClass,
        animationClasses
      )}
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: 0,
        ...(config.gradientBackgrounds ? {
          background: POSConfiguration.getContainerGradient(config),
        } : {}),
        ...(config.glassEffect ? glassEffect : {}),
        transition: styles.animation,
        ...componentVars,
      }}
    >
      {/* Styles scopés du customizer — ne s'appliquent qu'à l'intérieur de .pos-preview.
          [data-slot="..."] cible les primitives shadcn/ui (Card/Button/Input/Select
          exposent toutes un data-slot stable) en plus des anciens divs "bg-white" -
          faute de quoi les réglages Layout > Composants n'atteignaient que les
          quelques pages qui n'utilisent pas shadcn. */}
      <style>{`
        .pos-preview .pos-preview-card,
        .pos-preview [data-slot="card"],
        .pos-preview div[class*="rounded-lg"].bg-white,
        .pos-preview div[class*="rounded-xl"].bg-white {
          border-radius: var(--pos-card-border-radius);
          box-shadow: var(--pos-card-shadow);
        }
        .pos-preview .pos-preview-card,
        .pos-preview [data-slot="card-content"],
        .pos-preview div[class*="rounded-lg"].bg-white,
        .pos-preview div[class*="rounded-xl"].bg-white {
          padding: var(--pos-card-padding);
        }
        .pos-preview .pos-preview-grid {
          grid-template-columns: repeat(var(--pos-grid-columns), minmax(0, 1fr)) !important;
          gap: var(--pos-grid-gap) !important;
        }

        .pos-preview [data-slot="button"] {
          border-radius: var(--pos-button-border-radius) !important;
          padding: var(--pos-button-py) var(--pos-button-px) !important;
          font-size: var(--pos-button-fs) !important;
        }
        .pos-preview [data-slot="button"]:hover {
          opacity: var(--pos-button-hover);
        }
        .pos-preview[data-btn-style="outline"] [data-slot="button"]:not([data-variant="ghost"]) {
          background-color: transparent !important;
          border: 1px solid var(--primary) !important;
          color: var(--primary) !important;
          box-shadow: none !important;
        }
        .pos-preview[data-btn-style="ghost"] [data-slot="button"] {
          background-color: transparent !important;
          color: var(--primary) !important;
          box-shadow: none !important;
        }

        .pos-preview [data-slot="input"],
        .pos-preview [data-slot="select-trigger"] {
          border-radius: var(--pos-input-border-radius) !important;
          padding: var(--pos-input-py) var(--pos-input-px) !important;
          font-size: var(--pos-input-fs) !important;
        }
        .pos-preview [data-slot="input"]:focus,
        .pos-preview [data-slot="select-trigger"]:focus {
          outline: var(--pos-input-focus-ring);
          outline-offset: 1px;
        }
        .pos-preview[data-input-style="underlined"] [data-slot="input"] {
          border: none !important;
          border-bottom: 1px solid var(--border) !important;
          border-radius: 0 !important;
          background: transparent !important;
        }
        .pos-preview[data-input-style="filled"] [data-slot="input"] {
          background-color: var(--muted) !important;
          border-color: transparent !important;
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
          minHeight: 0,
          width: '100%',
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
        <div className={contentPadding} style={contentStyle}>{renderContent()}</div>
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
