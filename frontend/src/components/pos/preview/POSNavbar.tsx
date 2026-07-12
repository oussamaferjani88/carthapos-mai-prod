import { useState, useMemo } from 'react';
import { POSComponentRegistry } from '../../../constants/POSComponentRegistry';
import { Menu, X, Shield, ChevronRight } from 'lucide-react';

interface POSNavbarProps {
  config: Record<string, any>;
  activePage: string;
  setActivePage: (page: string) => void;
  modules?: string[];
  isDragMode?: boolean;
  onComponentSelect?: (name: string) => void;
  isVisible?: (id: string) => boolean;
}

export const POSNavbar = ({ config, activePage, setActivePage, modules = [], isDragMode, onComponentSelect, isVisible }: POSNavbarProps) => {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const navigationItems = useMemo(() => {
    return POSComponentRegistry.getNavigationItems(modules);
  }, [modules]);

  const renderOverlayNavbar = () => (
    <>
      <div className="h-full w-16 flex flex-col shadow-lg transition-all duration-300 relative z-30" style={{ backgroundColor: config.primaryColor }}>
        <button className="p-3 border-b border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors" onClick={() => setIsOverlayOpen(!isOverlayOpen)}>
          <Menu className="w-6 h-6 text-white" />
        </button>
        <nav className="flex-1 py-4">
          {navigationItems.map((item: any) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button key={item.id} onClick={() => setActivePage(item.id)}
                className={`w-full p-3 flex items-center justify-center transition-colors relative group ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                title={item.label}>
                <Icon className="w-5 h-5" />
                {isActive && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white rounded-l"></div>}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/20 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white/60" />
        </div>
      </div>

      {isOverlayOpen && <div className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300" onClick={() => setIsOverlayOpen(false)} />}

      {isOverlayOpen && (
        <div className="fixed left-0 top-0 h-full w-64 z-50 shadow-2xl transition-all duration-300" style={{ backgroundColor: config.backgroundColor }}>
          <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: config.accentColor + '20' }}>
            <h2 className="text-xl font-bold" style={{ color: config.textColor }}>{config.restaurantName || 'POS System'}</h2>
            <button onClick={() => setIsOverlayOpen(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {navigationItems.map((item: any) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button key={item.id} onClick={() => { setActivePage(item.id); setIsOverlayOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors text-left mb-1 group ${isActive ? 'text-white shadow-md' : 'hover:bg-gray-100'}`}
                  style={isActive ? { backgroundColor: config.primaryColor } : {}}>
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium flex-1">{item.label}</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-white/80' : 'text-gray-400 group-hover:text-gray-600'}`} />
                </button>
              );
            })}
          </nav>
          <div className="border-t px-4 py-3" style={{ borderColor: config.accentColor + '20' }}>
            <div className="flex items-center space-x-2 text-xs" style={{ color: config.textMutedColor }}>
              <Shield className="w-3 h-3" />
              <div>
                <div>POS System v2.0</div>
                {config.isPreviewMode && <div className="text-xs text-blue-600 mt-1">Mode Prévisualisation</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderTopNavbar = () => (
    <div className="flex flex-row h-16 items-center border-b shadow-sm w-full" style={{ backgroundColor: config.backgroundColor, borderColor: config.accentColor + '20' }}>
      <div className="px-4 flex-1 flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: config.textColor }}>{config.restaurantName || 'POS System'}</h2>
      </div>
      <nav className="flex flex-row space-x-2 px-4">
        {navigationItems.map((item: any) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button key={item.id} onClick={() => setActivePage(item.id)}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left nav-item whitespace-nowrap ${isActive ? 'text-white' : 'hover:bg-gray-100'}`}
              style={isActive ? { backgroundColor: config.primaryColor } : {}}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  if (config.navbarPosition === 'top') return renderTopNavbar();
  return renderOverlayNavbar();
};

export default POSNavbar;
