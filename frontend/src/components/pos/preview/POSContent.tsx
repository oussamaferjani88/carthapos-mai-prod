import { useEffect, useRef } from 'react';
import { POSComponentRegistry } from '../../../constants/POSComponentRegistry';
import { POSConfiguration } from '../../../config/POSConfiguration';

interface POSContentProps {
  config: Record<string, any>;
  activePage: string;
  modules: string[];
  notification: string | null;
  setNotification: (msg: string | null) => void;
  isDragMode?: boolean;
  onComponentSelect?: (name: string) => void;
  isVisible?: (id: string) => boolean;
  currentUserRole?: string;
}

export const POSContent = ({ config, activePage, modules, notification, setNotification, isDragMode, onComponentSelect, isVisible, currentUserRole }: POSContentProps) => {
  const mainContentRef = useRef<HTMLDivElement>(null);
  const styles = POSConfiguration.getStyles(config);
  const glassEffect = POSConfiguration.getGlassEffect(config);

  useEffect(() => {
    if (activePage === 'sales' && mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activePage]);

  const renderContent = () => {
    const PageComponent = POSComponentRegistry.getPageRenderer(activePage, modules);
    if (!PageComponent) {
      const DashboardComponent = POSComponentRegistry.getPageRenderer('dashboard', modules);
      return <DashboardComponent config={config} modules={modules} />;
    }
    return <PageComponent config={config} modules={modules} setNotification={setNotification} />;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 relative h-full" style={{
      position: 'relative', zIndex: 1, minHeight: '100%',
      ...(config.gradientBackgrounds ? { background: POSConfiguration.getContainerGradient(config) } : {}),
      ...(config.glassEffect ? glassEffect : {}),
      transition: styles.animation,
    }}>
      {notification && (
        <div className="m-4 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg">{notification}</div>
      )}

      <main ref={mainContentRef}
        className={`flex-1 ${activePage === 'sales' ? 'overflow-hidden' : 'overflow-auto pb-20'}`}
        style={{
          backgroundColor: config.backgroundColor, minHeight: '100%',
          fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif',
          fontSize: config.fontSize || '14px', fontWeight: config.fontWeight || '400',
          boxShadow: styles.card.boxShadow, transition: styles.animation,
          ...(config.gradientBackgrounds ? { background: POSConfiguration.getGradientBackground(config) } : {}),
          ...(config.glassEffect ? { ...glassEffect, backgroundColor: 'rgba(255, 255, 255, 0.05)' } : {}),
        }}>
        {renderContent()}
      </main>

      {isDragMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Mode Drag & Drop actif</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSContent;
