import { useEffect, useMemo, useRef } from 'react';
import { POSComponentRegistry } from '../../../constants/POSComponentRegistry';
import { POSConfiguration } from '../../../config/POSConfiguration';
import { ShoppingCart, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../../lib/utils';

type Notification = string | { type?: string; message: string } | null;

interface POSContentProps {
  config: Record<string, any>;
  activePage: string;
  modules: string[];
  notification: Notification;
  setNotification: (n: Notification) => void;
  isDragMode?: boolean;
}

// Ported from admin/src/components/pos/preview/POSContent.jsx: scrolling
// container for the active page + notification toast (same per-type colors),
// plus the componentVars mechanism so the customizer's card/button/grid/form
// controls actually take visual effect inside the preview.
export const POSContent = ({ config, activePage, modules, notification, setNotification, isDragMode }: POSContentProps) => {
  const mainContentRef = useRef<HTMLDivElement>(null);
  const styles = POSConfiguration.getStyles(config);
  const glassEffect = POSConfiguration.getGlassEffect(config);
  const animationClasses = POSConfiguration.getAnimationClasses(config);
  const animationTypeClass = POSConfiguration.getAnimationTypeClass(config);
  const animationSpeedClass = POSConfiguration.getAnimationSpeedClass(config);

  // Component CSS vars so modules inherit the customizer's cart/button/grid/
  // input personalization.
  const componentVars = useMemo(() => {
    const cards = config.components?.cards || {};
    const buttons = config.components?.buttons || {};
    const grid = config.components?.grid || {};
    const forms = config.components?.forms || {};

    const borderRadiusMap: Record<string, string> = { none: '0', small: '0.25rem', medium: '0.5rem', large: '0.75rem', xl: '1rem', full: '9999px' };
    const shadowMap: Record<string, string> = { none: 'none', soft: '0 1px 2px rgba(0,0,0,0.05)', default: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)', hard: '0 10px 15px rgba(0,0,0,0.1)', colored: '0 10px 15px rgba(59,130,246,0.3)' };
    const paddingMap: Record<string, string> = { '0.5': '0.25rem', '1': '0.5rem', '1.5': '0.75rem', '2': '1rem' };
    const buttonStyleMap: Record<string, string> = { default: '0.375rem', rounded: '0.5rem', pill: '9999px', square: '0', outline: '0.375rem', ghost: '0.375rem' };
    const sizePxMap: Record<string, { x: string; y: string; fs: string }> = {
      small: { x: '0.5rem', y: '0.25rem', fs: '0.75rem' },
      medium: { x: '1rem', y: '0.5rem', fs: '0.875rem' },
      large: { x: '1.5rem', y: '0.75rem', fs: '1rem' },
      xl: { x: '2rem', y: '1rem', fs: '1.125rem' },
    };
    const inputStyleMap: Record<string, string> = { default: '0.375rem', rounded: '9999px', underlined: '0', filled: '0.375rem', outlined: '0.375rem' };
    const inputSizeMap: Record<string, { x: string; y: string; fs: string }> = {
      small: { x: '0.5rem', y: '0.25rem', fs: '0.75rem' },
      medium: { x: '0.75rem', y: '0.5rem', fs: '0.875rem' },
      large: { x: '1rem', y: '0.75rem', fs: '1rem' },
    };

    const br = borderRadiusMap[cards.borderRadius] || '0.5rem';
    const sh = shadowMap[cards.shadowStyle] || '0 1px 3px rgba(0,0,0,0.1)';
    const pd = paddingMap[String(cards.padding)] || '0.5rem';
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
    } as Record<string, string>;
  }, [config]);

  // Reset scroll on page change (like the real POS)
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activePage]);

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'info': return <Info className="w-4 h-4" />;
      default: return <ShoppingCart className="w-4 h-4" />;
    }
  };

  const getNotificationColors = (type?: string) => {
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

  // Content padding: pt-3 (consistent with the real POS), but height fills
  // the scrollable area (h-full) so each page takes the full viewport and
  // the preview doesn't leave a gap at the bottom. The real POS's pb-20
  // (full screen) is reduced here since the preview already has a footer.
  const contentPadding = activePage === 'sales' ? 'p-0 h-full' : config.compactMode ? 'py-1.5 h-full' : 'pt-3 pb-4 h-full';

  return (
    <div
      className={cn('flex-1 flex flex-col min-w-0 relative', animationTypeClass, animationSpeedClass, animationClasses)}
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: 0,
        ...(config.gradientBackgrounds ? { background: POSConfiguration.getContainerGradient(config) } : {}),
        ...(config.glassEffect ? glassEffect : {}),
        transition: styles.animation,
        ...componentVars,
      }}
    >
      {/* Customizer-scoped styles — only apply inside .pos-preview. Also
          defines slideInRight, which neither app's global CSS provides
          (the toast below references it either way; harmless local fix). */}
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
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Main scrolling area (except for the Sales page) */}
      <main
        ref={mainContentRef}
        className={cn('flex-1', activePage === 'sales' ? 'overflow-hidden' : 'overflow-auto', animationTypeClass, animationSpeedClass, animationClasses)}
        style={{
          backgroundColor: config.backgroundColor,
          minHeight: 0,
          width: '100%',
          fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif',
          fontSize: config.fontSize || '14px',
          fontWeight: config.fontWeight || '400',
          transition: styles.animation,
          ...(config.gradientBackgrounds ? { background: POSConfiguration.getGradientBackground(config) } : {}),
          ...(config.glassEffect ? { ...glassEffect, backgroundColor: 'rgba(255, 255, 255, 0.05)' } : {}),
        }}
      >
        <div className={contentPadding}>{renderContent()}</div>
      </main>

      {/* Drag & Drop mode indicator (admin-only control) */}
      {isDragMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Mode Drag & Drop actif</span>
          </div>
        </div>
      )}

      {/* Notification toast (like the real POS) */}
      {notification && (
        <div
          className={cn('fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg', getNotificationColors(typeof notification === 'string' ? undefined : notification.type))}
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          <div className="flex items-center space-x-3">
            {getNotificationIcon(typeof notification === 'string' ? undefined : notification.type)}
            <span className="text-sm font-medium">{typeof notification === 'string' ? notification : notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSContent;
