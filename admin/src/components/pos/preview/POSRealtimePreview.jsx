import React, { useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DragDropProvider } from '../../../contexts/DragDropContext';
import POSPreviewPage from '../../../pages/pos/POSPreviewPage';
import ReceiptDesignerPreview from './ReceiptDesignerPreview';
import ErrorBoundary from '../../common/ErrorBoundary';
import { Button } from '../../ui/button';
import { Receipt, Monitor } from 'lucide-react';

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
      // Configuration par défaut
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
      // Valeurs par défaut pour les effets
      animations: true,
      animationType: 'slide', // Type pour navigation
      animationSpeed: 'normal', // Vitesse pour navigation
      cardAnimations: true, // Animations pour cartes
      cardAnimationType: 'slide', // Type pour cartes
      cardAnimationSpeed: 'normal', // Vitesse pour cartes
      shadows: true,
      gradientBackgrounds: false,
      glassEffect: false,
      // Valeurs par défaut pour le layout
      spacingScale: 1,
      maxWidth: '1200px',
      compactMode: false,
      navbarCollapsible: false,
      
      // Valeurs par défaut pour les composants
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
    
    // Fusionner les configs en donnant priorité à config
    const merged = { ...defaults, ...config };
    console.log('POSRealtimePreview config merged:', merged);
    return merged;
  }, [config]);

  // State pour basculer entre POS et Receipt Designer
  const [viewMode, setViewMode] = useState('pos'); // 'pos' ou 'receipt'

  // Configuration du scale selon le device
  const getScaleConfig = () => {
    switch (previewDevice) {
      case 'mobile':
        return { scale: 0.7, width: '142.86%', height: '142.86%' };
      case 'tablet':
        return { scale: 0.8, width: '125%', height: '125%' };
      case 'desktop':
      default:
        return { scale: 1.0, width: '100%', height: '100%' };
    }
  };

  const scaleConfig = getScaleConfig();

  return (
    <DragDropProvider>
      <DndProvider backend={HTML5Backend}>
        <div
          style={{
            width: '100%',
            height: '100%',
            minHeight: '600px',
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
          {/* Toggle buttons entre POS et Receipt Designer */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            display: 'flex',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '8px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <Button
              size="sm"
              variant={viewMode === 'pos' ? 'default' : 'outline'}
              onClick={() => setViewMode('pos')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Monitor size={16} />
              POS Interface
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'receipt' ? 'default' : 'outline'}
              onClick={() => setViewMode('receipt')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Receipt size={16} />
              Receipt Designer
            </Button>
          </div>

          {/* Conteneur principal */}
          <div style={{ 
            flex: 1, 
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
                    selectedComponent: config?.selectedComponent
                  }}
                  modules={formattedModules}
                  onComponentSelect={onComponentSelect}
                  isDragMode={isDragMode}
                />
              ) : (
                <ReceiptDesignerPreview />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </DndProvider>
    </DragDropProvider>
  );
}
