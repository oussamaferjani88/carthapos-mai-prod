import { Menu } from 'lucide-react';
import { POSConfiguration } from '../../../config/POSConfiguration';

interface POSHeaderProps {
  config: Record<string, any>;
  isNavbarCollapsed: boolean;
  setIsNavbarCollapsed: (collapsed: boolean) => void;
  onMobileMenuToggle?: () => void;
}

export const POSHeader = ({ config, isNavbarCollapsed, setIsNavbarCollapsed, onMobileMenuToggle }: POSHeaderProps) => {
  const styles = POSConfiguration.getStyles(config);
  const glassEffect = POSConfiguration.getGlassEffect(config);

  if (config.navbarPosition === 'top') return null;

  return (
    <header
      className="border-b"
      style={{
        backgroundColor: config.cardBackgroundColor || '#ffffff',
        borderColor: config.cardBorderColor || '#e5e7eb',
        fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif',
        fontSize: config.fontSize || '14px',
        fontWeight: config.fontWeight || '400',
        boxShadow: styles.card.boxShadow,
        transition: styles.animation,
        ...(config.gradientBackgrounds ? { background: POSConfiguration.getContainerGradient(config) } : {}),
        ...(config.glassEffect ? glassEffect : {}),
      }}
    >
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center space-x-3">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={onMobileMenuToggle}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <img
              src={config.logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI4IiBmaWxsPSIjM2I4MmY2Ii8+PHBhdGggZD0iTTggMTJoOHY4aC04di04ek0xMiA4aDh2OGgtOHYtOHoiIGZpbGw9IndoaXRlIi8+PC9zdmc+'}
              alt={config.businessName || 'POS Logo'}
              className="w-8 h-8 rounded-lg object-cover border shadow-sm"
              style={{ borderColor: config.cardBorderColor || '#e5e7eb' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI4IiBmaWxsPSIjM2I4MmY2Ii8+PHBhdGggZD0iTTggMTJoOHY4aC04di04ek0xMiA4aDh2OGgtOHYtOHoiIGZpbGw9IndoaXRlIi8+PC9zdmc+';
              }}
            />
            <h1 className="text-lg font-bold" style={{ color: config.textColor || '#1f2937' }}>
              {config.businessName || 'POS System'}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-sm px-3 py-1.5 rounded-full" style={{ backgroundColor: config.textMutedColor + '20', color: config.textMutedColor }}>
            📅 {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="text-sm bg-green-500/10 text-green-700 px-3 py-1.5 rounded-full">🟢 Système en ligne</div>
          {config.isPreviewMode && <div className="text-sm bg-orange-500/10 text-orange-700 px-3 py-1.5 rounded-full">🎭 Mode Prévisualisation</div>}
        </div>

        {config.currentUser && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: config.primaryColor }}>
                {config.currentUser.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium" style={{ color: config.textColor }}>{config.currentUser.name}</p>
                <p className="text-xs" style={{ color: config.textMutedColor }}>
                  {config.currentUser.role}
                  {config.isPreviewMode && <span className="ml-2 text-orange-600 font-medium">• DÉMO</span>}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default POSHeader;
