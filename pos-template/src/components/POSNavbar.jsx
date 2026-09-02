import React, { useState, useMemo, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Shield,
  Menu,
  X,
  ChevronRight,
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  Users,
  TableIcon as TableProperties,
  ChefHat,
  Calendar,
  Briefcase,
  Truck,
  Barcode,
  Warehouse,
  Zap,
  Heart,
  MenuSquare,
  CreditCard,
  Gift,
  Stethoscope,
  Factory,
  UserCog,
  Car,
  Cpu
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../contexts/AuthContext';
import { POSConfiguration } from '../lib/POSConfiguration';
import { navigationConfig as navigationRoutes, isModuleSetEnabled } from '../config/moduleRoutes';
import PermissionsContext from '../contexts/PermissionsContext';

// Icons are attached here (the only place they're rendered) rather than
// shared through config/moduleRoutes.js - see the comment there for why.
const ICONS_BY_ID = {
  dashboard: LayoutDashboard,
  sales: ShoppingCart,
  products: Package,
  inventory: Warehouse,
  barcode: Barcode,
  'quick-service': Zap,
  takeaway: Car,
  customers: Users,
  loyalty: Heart,
  tables: TableProperties,
  kitchen: ChefHat,
  menu: MenuSquare,
  appointments: Calendar,
  services: Briefcase,
  'payment-advanced': CreditCard,
  'gift-cards': Gift,
  prescription: Stethoscope,
  production: Factory,
  suppliers: Truck,
  'user-management': UserCog,
  reports: BarChart3,
  settings: Settings,
  hardware: Cpu
};

const navigationConfig = navigationRoutes.map(item => ({ ...item, icon: ICONS_BY_ID[item.id] }));

export const POSNavbar = ({ 
  onMobileMenuToggle,
  className = ''
}) => {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { config, loading } = useAppConfig();
  const { get: getPerms, loaded: permsLoaded } = useContext(PermissionsContext);

  // Extract theme configuration with fallbacks (même si loading)
  const theme = config?.theme || {};
  const primaryColor = theme.primaryColor || theme.colors?.primary || '#3b82f6';
  const backgroundColor = theme.backgroundColor || theme.colors?.background || '#ffffff';
  const textColor = theme.textColor || theme.colors?.text || '#1f2937';
  const accentColor = theme.accentColor || theme.colors?.accent || '#e5e7eb';
  const textMutedColor = theme.textMutedColor || '#6b7280';
  const businessName = theme.businessName || 'POS System';
  const navbarPosition = config?.layout?.navbarPosition || theme.navbarPosition || 'left';
  const navbarWidth = theme.navbarWidth || '64px';
  const navbarHeight = theme.navbarHeight || '48px';
  const navCollapsible = theme.navbarCollapsible === true;

  // Get animation classes from configuration
  const animationTypeClass = POSConfiguration.getAnimationTypeClass(theme);
  const animationSpeedClass = POSConfiguration.getAnimationSpeedClass(theme);

  // Filter navigation based on enabled modules and user role
  const navigationItems = useMemo(() => {
    // Si config pas encore chargé, retourner items de base
    if (!config) {
      return navigationConfig.filter(item => !item.modules || item.modules.length === 0);
    }

   // Extract enabled modules from config.modules array
     const enabledModules = (config.modules || [])
       .filter(m => m.isEnabled !== false)
       .map(m => m.name);
     
     console.log('═══════════════════════════════════════════════════════════');
     console.log('[POSNavbar] Module Filter Summary:');
     console.log('Total modules in config:', config.modules?.length);
     console.log('Module details:', config.modules?.map(m => ({name: m.name, enabled: m.isEnabled})));
     console.log('Enabled modules for navbar:', enabledModules);
     console.log('═══════════════════════════════════════════════════════════');
    
    return navigationConfig.filter(item =>
      isModuleSetEnabled(item.modules, enabledModules)
    ).filter(item => {
      // Filter by user role if applicable
      if (!user) return true;
      
      // Admin / superadmin sees everything
      if (user.role === 'admin' || user.role === 'superadmin') return true;

      // Items without a permission-gated route are always visible.
      if (!item.perm) return true;

      // Menu visibility must match route enforcement exactly: use the same
      // PermissionsContext resolution as PermissionRoute (role defaults when no
      // saved rows, strict when a row exists), never a looser fallback.
      if (!permsLoaded) return true; // rows loading: let the route decide access
      return !!getPerms(item.perm).read;
    });
  }, [config, user, getPerms, permsLoaded]);

  // Si config est en cours de chargement, ne rien afficher
  if (loading || !config) {
    return null;
  }

  // Overlay mode (moderne) pour navbar position left
  const renderOverlayNavbar = () => (
    <>
      {/* Collapsed Icon Bar - Always visible */}
      <div 
        className={`h-full flex flex-col shadow-lg transition-all duration-300 relative z-30 ${className}`}
        style={{ 
          backgroundColor: primaryColor,
          width: navbarWidth,
          minWidth: navbarWidth
        }}
      >
        {/* Header Icon - Click to Toggle */}
        <button 
          className="p-3 border-b border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
          onClick={() => setIsOverlayOpen(!isOverlayOpen)}
          title="Menu"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>

        {/* Navigation Icons */}
        <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  'w-full p-3 flex items-center justify-center relative group',
                  animationTypeClass,
                  animationSpeedClass,
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
                title={item.name}
              >
                <Icon className="w-5 h-5" />
                {isActive && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white rounded-l"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Icon */}
        <div className="p-3 border-t border-white/20 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white/60" />
        </div>
      </div>

      {/* Overlay Background - Covers entire screen */}
      {isOverlayOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
          onClick={() => setIsOverlayOpen(false)}
        />
      )}

      {/* Expanded Sidebar Overlay - Only when open */}
      {isOverlayOpen && (
        <div 
          className="fixed left-0 top-0 h-full w-64 z-50 shadow-2xl transition-all duration-300"
          style={{ backgroundColor: backgroundColor }}
        >
          {/* Header */}
          <div 
            className="px-4 py-4 border-b flex items-center justify-between" 
            style={{ borderColor: accentColor + '20' }}
          >
            <h2 className="text-xl font-bold" style={{ color: textColor }}>
              {businessName}
            </h2>
            <button
              onClick={() => setIsOverlayOpen(false)}
              className="p-1 rounded hover:bg-gray-100"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 h-[calc(100vh-8rem)] scrollbar-hide">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  onClick={() => setIsOverlayOpen(false)}
                  className={cn(
                    'w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left mb-1 group',
                    animationTypeClass,
                    animationSpeedClass,
                    isActive 
                      ? 'text-white shadow-md' 
                      : 'hover:bg-gray-100'
                  )}
                  style={isActive ? { 
                    backgroundColor: primaryColor,
                    color: '#ffffff'
                  } : {
                    color: textColor
                  }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium flex-1">{item.name}</span>
                  <ChevronRight className={cn(
                    'w-4 h-4 transition-transform',
                    isActive ? 'text-white/80' : 'text-gray-400 group-hover:text-gray-600'
                  )} />
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div 
            className="border-t px-4 py-3" 
            style={{ borderColor: accentColor + '20' }}
          >
            <div className="flex items-center space-x-2 text-xs" style={{ color: textMutedColor }}>
              <Shield className="w-3 h-3" />
              <div>
                <div>{businessName} v2.1.0</div>
                {user && (
                  <div className="text-xs mt-1">Connecté: {user.fullName || user.username}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Top navbar mode
  const renderTopNavbar = () => (
    <div 
      className={`flex flex-row items-center border-b shadow-sm w-full ${className}`}
      style={{ 
        backgroundColor: backgroundColor,
        borderColor: accentColor + '20',
        height: navbarHeight
      }}
    >
      {/* Header avec titre */}
      <div className="px-4 flex-1 flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: textColor }}>
          {businessName}
        </h2>
      </div>

      {/* Menu Items */}
      <nav className="hidden lg:flex flex-row space-x-2 px-4 overflow-x-auto scrollbar-hide">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.id}
              to={item.href}
              className={cn(
                'flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-left whitespace-nowrap',
                isActive 
                  ? 'text-white' 
                  : 'hover:bg-gray-100'
              )}
              style={isActive ? { 
                backgroundColor: primaryColor,
                color: '#ffffff'
              } : {
                color: textColor
              }}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile menu button */}
      <button
        className="lg:hidden p-2 mr-4"
        onClick={onMobileMenuToggle}
      >
        <Menu className="w-6 h-6" />
      </button>
    </div>
  );

  // Render according to navbar position
  if (navbarPosition === 'top') {
    return renderTopNavbar();
  }

  // Default: left sidebar with overlay
  return renderOverlayNavbar();
};
