import { useMemo, useState } from 'react';
import POSPreview from './POSPreview';
import ReceiptDesignerPreview from './ReceiptDesignerPreview';

interface POSRealtimePreviewProps {
  config: Record<string, any>;
  modules: any[];
  navbarPosition?: string;
  isDragMode?: boolean;
  onComponentSelect?: (name: string) => void;
  previewDevice?: string;
}

export default function POSRealtimePreview({
  config, modules, navbarPosition, isDragMode = false, onComponentSelect, previewDevice = 'desktop',
}: POSRealtimePreviewProps) {
  const formattedModules = useMemo(() => {
    if (!modules || !Array.isArray(modules)) return [];
    return modules.map((m: any) => {
      if (typeof m === 'string') return { name: m, slug: m };
      return { name: m.name || m.slug || m, slug: m.slug || m.name || m };
    });
  }, [modules]);

  const previewConfig = useMemo(() => {
    const defaults: Record<string, any> = {
      businessName: 'POS System', primaryColor: '#3b82f6', accentColor: '#6366f1',
      secondaryColor: '#f3f4f6', backgroundColor: '#ffffff', textColor: '#1f2937',
      cardBackgroundColor: '#ffffff', cardBorderColor: '#e5e7eb', textMutedColor: '#6b7280',
      fontFamily: 'Inter', fontSize: '14px', fontWeight: 'normal', borderRadius: 'medium',
      currency: '€', currencyPosition: 'before', navbarPosition: 'left', spacing: 'medium',
      shadowIntensity: 'medium', animations: true, animationType: 'slide', animationSpeed: 'normal',
      cardAnimations: true, cardAnimationType: 'slide', cardAnimationSpeed: 'normal',
      shadows: true, gradientBackgrounds: false, glassEffect: false, spacingScale: 1,
      maxWidth: '1200px', compactMode: false, navbarCollapsible: false,
      components: {
        cards: { borderRadius: 'medium', padding: 1, shadowStyle: 'default' },
        buttons: { style: 'default', size: 'medium', hoverEffects: true },
        grid: { columns: 3, gap: 4 },
        forms: { inputStyle: 'default', inputSize: 'medium', focusRing: true },
      },
    };
    return { ...defaults, ...config };
  }, [config]);

  const [viewMode, setViewMode] = useState('pos');

  const getScaleConfig = () => {
    switch (previewDevice) {
      case 'mobile': return { scale: 0.7, width: '142.86%', height: '142.86%' };
      case 'tablet': return { scale: 0.8, width: '125%', height: '125%' };
      default: return { scale: 1.0, width: '100%', height: '100%' };
    }
  };

  const scaleConfig = getScaleConfig();

  return (
    <div style={{
      width: '100%', height: '100%', minHeight: '600px', background: '#f8fafc',
      borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxShadow: '0 2px 12px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb',
      position: 'relative', margin: 0, padding: 0, boxSizing: 'border-box',
    }}>
      <div style={{
        flex: 1, minHeight: '100%', minWidth: 0, overflow: 'hidden', background: 'transparent',
        transform: `scale(${scaleConfig.scale})`, transformOrigin: 'top left',
        width: scaleConfig.width, height: scaleConfig.height,
        transition: 'transform 0.3s ease-in-out', position: 'relative',
        display: 'flex', flexDirection: 'column', margin: 0, padding: 0, boxSizing: 'border-box',
      }}>
        {viewMode === 'pos' ? (
          <POSPreview
            configuration={{ ...previewConfig, navbarPosition: navbarPosition || previewConfig.navbarPosition, isDragMode, selectedComponent: config?.selectedComponent }}
            modules={formattedModules}
            onComponentSelect={onComponentSelect}
            isDragMode={isDragMode}
          />
        ) : (
          <ReceiptDesignerPreview onClose={() => setViewMode('pos')} />
        )}
      </div>
    </div>
  );
}
