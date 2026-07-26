import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
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
  Shield,
  Menu,
  X,
  Heart,
  MenuSquare,
  CreditCard,
  Gift,
  Stethoscope,
  Factory,
  UserCog,
  Car,
  Cpu,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../contexts/AuthContext';
import { POSConfiguration } from '../lib/POSConfiguration';

// Navigation items configuration
const navigationConfig = [
  { name: 'Tableau de bord', icon: LayoutDashboard, href: '/', id: 'dashboard' },
  { name: 'Ventes', icon: ShoppingCart, href: '/sales', id: 'sales' },
  { name: 'Produits', icon: Package, href: '/products', id: 'products' },
  { name: 'Stocks', icon: Warehouse, href: '/inventory', id: 'inventory', modules: ['inventory'] },
  { name: 'Code-barres', icon: Barcode, href: '/barcode', id: 'barcode', modules: ['barcode'] },
  { name: 'Service rapide', icon: Zap, href: '/quick-service', id: 'quick-service', modules: ['quick-service'] },
  { name: 'Vente à emporter', icon: Car, href: '/takeaway', id: 'takeaway', modules: ['takeaway'] },
  { name: 'Clients', icon: Users, href: '/customers', id: 'customers', modules: ['customer-management'] },
  { name: 'Fidélité', icon: Heart, href: '/loyalty', id: 'loyalty', modules: ['loyalty'] },
  { name: 'Tables', icon: TableProperties, href: '/tables', id: 'tables', modules: ['tables'] },
  { name: 'Cuisine', icon: ChefHat, href: '/kitchen', id: 'kitchen', modules: ['kitchen'] },
  { name: 'Menu', icon: MenuSquare, href: '/menu-management', id: 'menu', modules: ['menu-management'] },
  { name: 'Rendez-vous', icon: Calendar, href: '/appointments', id: 'appointments', modules: ['appointments'] },
  { name: 'Services', icon: Briefcase, href: '/services', id: 'services', modules: ['services'] },
  { name: 'Paiements avancés', icon: CreditCard, href: '/payment-advanced', id: 'payment-advanced', modules: ['payment-advanced'] },
  { name: 'Cartes cadeaux', icon: Gift, href: '/gift-cards', id: 'gift-cards', modules: ['gift-cards'] },
  { name: 'Ordonnances', icon: Stethoscope, href: '/prescription', id: 'prescription', modules: ['prescription'] },
  { name: 'Production', icon: Factory, href: '/production', id: 'production', modules: ['production'] },
  { name: 'Fournisseurs', icon: Truck, href: '/suppliers', id: 'suppliers', modules: ['suppliers'] },
  { name: 'Utilisateurs', icon: UserCog, href: '/user-management', id: 'user-management', modules: ['user-management'] },
  { name: 'Rapports', icon: BarChart3, href: '/reports', id: 'reports' },
  { name: 'Paramètres', icon: Settings, href: '/settings', id: 'settings' },
  { name: 'Matériel', icon: Cpu, href: '/hardware-settings', id: 'hardware' },
];

export const POSNavbar = ({ 
  onMobileMenuToggle,
  className = ''
}) => {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { config, loading } = useAppConfig();

  const [userModules, setUserModules] = useState(null);

  useEffect(() => {
    if (user?.id && window.electronAPI?.getUserModules) {
      window.electronAPI.getUserModules(user.id).then(mods => {
        if (Array.isArray(mods)) {
          const map = {};
          mods.forEach(m => { map[m.module_name] = m.can_read; });
          setUserModules(map);
        }
      }).catch(() => setUserModules(null));
    }
  }, [user?.id]);

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
    
    return navigationConfig.filter(item => {
      // Always show items without module requirements
      if (!item.modules || item.modules.length === 0) {
        return true;
      }
      
      // Check if any of the item's required modules are enabled
      const isModuleEnabled = item.modules.some(requiredModule => 
        enabledModules.some(enabledModule => 
          // Exact match or contains match
          enabledModule === requiredModule ||
          enabledModule.includes(requiredModule) ||
          requiredModule.includes(enabledModule)
        )
      );
      
      return isModuleEnabled;
    }).filter(item => {
      // Filter by user role if applicable
      if (!user) return true;
      
      // Admin sees everything
      if (user.role === 'admin') return true;

      // Use DB-backed module permissions if available
      if (userModules) {
        // For items with a specific module requirement, check user access
        const itemId = item.id;
        const moduleKey = itemId === 'customers' ? 'customer-management' : itemId;
        if (userModules[moduleKey] !== undefined) {
          return !!userModules[moduleKey];
        }
        // If no explicit permission record, fall back to role defaults
      }

      // Role-based fallback when DB permissions not loaded
      if (user.role === 'manager') {
        return item.id !== 'user-management';
      }
      
      // Cashier sees limited pages
      if (user.role === 'cashier') {
        return ['dashboard', 'sales', 'products', 'customers'].includes(item.id);
      }
      
      return true;
    });
  }, [config, user, userModules]);

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
