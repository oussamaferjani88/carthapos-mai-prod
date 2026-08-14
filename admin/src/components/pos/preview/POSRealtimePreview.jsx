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

  // Largeur de conception du POS réel (~1366px plein écran). En dessous de
  // cette largeur, l'aperçu est mis à l'échelle pour rester proportionnel au
  // conteneur (évite des éléments trop grands par rapport à la taille du cadre).
  const DESIGN_WIDTH = 1366;
  const containerRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth || 0;
      setFitScale(Math.max(0.45, Math.min(1, width / DESIGN_WIDTH)));
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

  // Configuration du scale selon le device
  const getScaleConfig = () => {
    switch (previewDevice) {
      case 'mobile':
        return { scale: 0.7, width: '142.86%', height: '142.86%' };
      case 'tablet':
        return { scale: 0.8, width: '125%', height: '125%' };
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
            minHeight: '400px',
            background: '#f8fafc',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            position: 'relative',
            margin: 0,
            padding: 0,
            boxSizing: 'border-box'
          }}
        >
          {/* Conteneur principal — flex:0 0 auto (pas de flex-grow) pour que la
              hauteur compensée ((1/scale)*100%) soit respectée : le contenu
              non-scalé est plus grand que le conteneur puis réduit par le
              scale pour remplir exactement 100% de la hauteur. */}
          <div style={{ 
            flex: '0 0 auto', 
            minHeight: '100%',
            minWidth: 0, 
            overflow: 'hidden',
            background: 'transparent',
            transform: `scale(${scaleConfig.scale})`,
            transformOrigin: 'top left',
            width: scaleConfig.width,
            height: scaleConfig.height,
            transition: 'transform 0.3s ease-in-out',
            position: 'relative',
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
