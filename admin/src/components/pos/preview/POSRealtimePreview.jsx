import React, { useMemo, useRef, useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DragDropProvider } from '../../../contexts/DragDropContext';
import POSPreviewPage from '../../../pages/pos/POSPreviewPage';
import ReceiptDesignerPreview from './ReceiptDesignerPreview';
import ErrorBoundary from '../../common/ErrorBoundary';

// Composant d'aperçu POS en temps réel - sans iframe, mise à jour instantanée
export default function POSRealtimePreview({ 
  config, 
  modules, 
  navbarPosition, 
  isDragMode = false, 
  onComponentSelect,
  previewDevice = 'desktop' 
}) {
  // Mémorisation des modules formatés pour éviter les re-rendus inutiles
  const formattedModules = useMemo(() => {
    if (!modules || !Array.isArray(modules)) return [];
    return modules.map(m => {
      if (typeof m === 'string') {
        return { name: m, slug: m };
      }
      return {
        name: m.name || m.slug || m,
        slug: m.slug || m.name || m
      };
    });
  }, [modules]);

  // Configuration memorisée avec valeurs par défaut
  const previewConfig = useMemo(() => {
    const defaults = {
      businessName: 'POS System',
      primaryColor: '#3b82f6',
      accentColor: '#6366f1',
      secondaryColor: '#f3f4f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      cardBackgroundColor: '#ffffff',
      cardBorderColor: '#e5e7eb',
      textMutedColor: '#6b7280',
      fontFamily: 'Inter',
      fontSize: '14px',
      fontWeight: 'normal',
      borderRadius: 'medium',
      currency: '€',
      currencyPosition: 'before',
      navbarPosition: 'left',
      spacing: 'medium',
      shadowIntensity: 'medium',
      animations: true,
      animationType: 'slide',
      animationSpeed: 'normal',
      cardAnimations: true,
      cardAnimationType: 'slide',
      cardAnimationSpeed: 'normal',
      shadows: true,
      gradientBackgrounds: false,
      glassEffect: false,
      spacingScale: 1,
      maxWidth: '1200px',
      compactMode: false,
      navbarCollapsible: false,
      navbarWidth: '64px',
      navbarHeight: '48px',
      sidebarCollapsible: true,
      components: {
        cards: {
          borderRadius: 'medium',
          padding: 1,
          shadowStyle: 'default'
        },
        buttons: {
          style: 'default',
          size: 'medium',
          hoverEffects: true
        },
        grid: {
          columns: 3,
          gap: 4
        },
        forms: {
          inputStyle: 'default',
          inputSize: 'medium',
          focusRing: true
        }
      }
    };
    
    const merged = { ...defaults, ...config };
    return merged;
  }, [config]);

  // State pour basculer entre POS et Receipt Designer
  const [viewMode, setViewMode] = useState('pos');

  const handleOpenReceiptDesigner = () => setViewMode('receipt');
  const handleCloseReceiptDesigner = () => setViewMode('pos');

  // Dimensions de conception du POS réel (~1366x768 plein écran). L'aperçu est
  // mis à l'échelle en mode "contain" (min des ratios largeur ET hauteur) pour
  // remplir exactement le cadre sans déborder ni être rogné, quelle que soit la
  // taille du conteneur. L'élément non-scalé est agrandi en sens inverse
  // ((1/scale)*100%) puis réduit par le scale pour occuper 100% du cadre.
  const DESIGN_WIDTH = 1366;
  const DESIGN_HEIGHT = 768;
  const MIN_SCALE = 0.35;
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setContainerSize({
        width: el.clientWidth || 0,
        height: el.clientHeight || 0
      });
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update);
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { width: containerWidth, height: containerHeight } = containerSize;

  // Échelle "contain" : la plus petite des deux contraintes pour que le POS
  // reste entièrement visible (largeur ET hauteur) sans débordement.
  const fitScale = Math.max(
    MIN_SCALE,
    Math.min(
      1,
      containerWidth > 0 && containerHeight > 0
        ? Math.min(containerWidth / DESIGN_WIDTH, containerHeight / DESIGN_HEIGHT)
        : 1
    )
  );

  // Configuration du scale selon le device. Les appareils sont aussi bornés par
  // la hauteur du cadre pour éviter tout rognage vertical sur écrans courts.
  const getScaleConfig = () => {
    switch (previewDevice) {
      case 'mobile': {
        const s = containerHeight > 0 ? Math.max(MIN_SCALE, Math.min(0.7, containerHeight / DESIGN_HEIGHT)) : 0.7;
        return { scale: s, width: `${(1 / s) * 100}%`, height: `${(1 / s) * 100}%` };
      }
      case 'tablet': {
        const s = containerHeight > 0 ? Math.max(MIN_SCALE, Math.min(0.8, containerHeight / DESIGN_HEIGHT)) : 0.8;
        return { scale: s, width: `${(1 / s) * 100}%`, height: `${(1 / s) * 100}%` };
      }
      case 'desktop':
      default:
        return { scale: fitScale, width: `${(1 / fitScale) * 100}%`, height: `${(1 / fitScale) * 100}%` };
    }
  };

  const scaleConfig = getScaleConfig();

  return (
    <DragDropProvider>
      <DndProvider backend={HTML5Backend}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            background: '#f8fafc',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            position: 'relative',
            margin: 0,
            padding: 0,
            boxSizing: 'border-box'
          }}
        >
          {/* Conteneur principal — position absolue remplissant le cadre. Le
              contenu non-scalé est agrandi en sens inverse ((1/scale)*100%) puis
              réduit par le scale pour occuper exactement 100% du cadre : pas de
              bande vide, pas de débordement, scrolling interne au workspace. */}
          <div style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'hidden',
            background: 'transparent',
            transform: `scale(${scaleConfig.scale})`,
            transformOrigin: 'top left',
            width: scaleConfig.width,
            height: scaleConfig.height,
            transition: 'transform 0.3s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            margin: 0,
            padding: 0,
            boxSizing: 'border-box'
          }}>
            <ErrorBoundary>
              {viewMode === 'pos' ? (
                <POSPreviewPage 
                  configuration={{
                    ...previewConfig,
                    navbarPosition: navbarPosition || previewConfig.navbarPosition,
                    isDragMode: isDragMode,
                    selectedComponent: config?.selectedComponent,
                    onOpenReceiptDesigner: handleOpenReceiptDesigner,
                    onCloseReceiptDesigner: handleCloseReceiptDesigner
                  }}
                  modules={formattedModules}
                  onComponentSelect={onComponentSelect}
                  isDragMode={isDragMode}
                />
              ) : (
                <ReceiptDesignerPreview onClose={handleCloseReceiptDesigner} />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </DndProvider>
    </DragDropProvider>
  );
}
