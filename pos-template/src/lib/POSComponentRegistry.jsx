import React from 'react';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  Settings as SettingsIcon,
  Utensils,
  MenuSquare,
  Warehouse,
  Store,
  ArrowLeftRight,
  Palette,
  Tag,
  CreditCard,
  Receipt,
  WifiOff,
  UserCheck,
  Scale,
  Hash,
  Clock,
  CalendarDays,
  Shield,
  TableProperties,
  ChefHat,
  Calendar,
  Briefcase,
  Truck,
  Barcode as BarcodeIcon,
  Zap,
  Heart,
  Gift,
  Stethoscope,
  Factory,
  UserCog,
  Car,
  Cpu
} from 'lucide-react';

// Import all page components
import Dashboard from '../pages/Dashboard';
import Sales from '../pages/Sales';
import Products from '../pages/Products';
import Customers from '../pages/Customers';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import Tables from '../pages/Tables';
import Kitchen from '../pages/Kitchen';
import Appointments from '../pages/Appointments';
import Services from '../pages/Services';
import Suppliers from '../pages/Suppliers';
import Inventory from '../pages/Inventory';
import Barcode from '../pages/Barcode';
import QuickService from '../pages/QuickService';
import UserAdmin from '../pages/UserAdmin';
import MenuManagement from '../pages/MenuManagement';
import Takeaway from '../pages/Takeaway';
import Loyalty from '../pages/Loyalty';
import PaymentAdvanced from '../pages/PaymentAdvanced';
import GiftCards from '../pages/GiftCards';
import Prescription from '../pages/Prescription';
import Production from '../pages/Production';
import HardwareSettings from '../pages/HardwareSettings';

// POS Component Registry - matches admin preview exactly
export class POSComponentRegistry {
  static components = new Map();

  static init() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔧 [REGISTRY DEBUG] Initializing POSComponentRegistry...');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Register all components with their configurations
    this.register('dashboard', Dashboard, {
      navigationItem: { 
        label: 'Tableau de bord', 
        icon: Home, 
        order: 1,
        href: '/'
      }
    });

    this.register('sales', Sales, {
      navigationItem: { 
        label: 'Ventes', 
        icon: ShoppingCart, 
        order: 2,
        href: '/sales'
      }
    });

    this.register('products', Products, {
      navigationItem: { 
        label: 'Produits', 
        icon: Package, 
        order: 3,
        href: '/products'
      }
    });

    this.register('inventory', Inventory, {
      navigationItem: { 
        label: 'Stocks', 
        icon: Warehouse, 
        order: 4,
        href: '/inventory',
        modules: ['inventory']
      }
    });

    this.register('barcode', Barcode, {
      navigationItem: { 
        label: 'Code-barres', 
        icon: BarcodeIcon, 
        order: 5,
        href: '/barcode',
        modules: ['barcode']
      }
    });

    this.register('quick-service', QuickService, {
      navigationItem: { 
        label: 'Service rapide', 
        icon: Zap, 
        order: 6,
        href: '/quick-service',
        modules: ['quick-service']
      }
    });

    this.register('takeaway', Takeaway, {
      navigationItem: { 
        label: 'Vente à emporter', 
        icon: Car, 
        order: 7,
        href: '/takeaway',
        modules: ['takeaway']
      }
    });

    this.register('customers', Customers, {
      navigationItem: { 
        label: 'Clients', 
        icon: Users, 
        order: 8,
        href: '/customers',
        modules: ['customer-management']
      }
    });

    this.register('loyalty', Loyalty, {
      navigationItem: { 
        label: 'Fidélité', 
        icon: Heart, 
        order: 9,
        href: '/loyalty',
        modules: ['loyalty']
      }
    });

    this.register('tables', Tables, {
      navigationItem: { 
        label: 'Tables', 
        icon: TableProperties, 
        order: 10,
        href: '/tables',
        modules: ['tables']
      }
    });

    this.register('kitchen', Kitchen, {
      navigationItem: { 
        label: 'Cuisine', 
        icon: ChefHat, 
        order: 11,
        href: '/kitchen',
        modules: ['kitchen']
      }
    });

    this.register('menu-management', MenuManagement, {
      navigationItem: { 
        label: 'Menu', 
        icon: MenuSquare, 
        order: 12,
        href: '/menu-management',
        modules: ['menu-management']
      }
    });

    this.register('appointments', Appointments, {
      navigationItem: { 
        label: 'Rendez-vous', 
        icon: Calendar, 
        order: 13,
        href: '/appointments',
        modules: ['appointments']
      }
    });

    this.register('services', Services, {
      navigationItem: { 
        label: 'Services', 
        icon: Briefcase, 
        order: 14,
        href: '/services',
        modules: ['services']
      }
    });

    this.register('payment-advanced', PaymentAdvanced, {
      navigationItem: { 
        label: 'Paiements avancés', 
        icon: CreditCard, 
        order: 15,
        href: '/payment-advanced',
        modules: ['payment-advanced']
      }
    });

    this.register('gift-cards', GiftCards, {
      navigationItem: { 
        label: 'Cartes cadeaux', 
        icon: Gift, 
        order: 16,
        href: '/gift-cards',
        modules: ['gift-cards']
      }
    });

    this.register('prescription', Prescription, {
      navigationItem: { 
        label: 'Ordonnances', 
        icon: Stethoscope, 
        order: 17,
        href: '/prescription',
        modules: ['prescription']
      }
    });

    this.register('production', Production, {
      navigationItem: { 
        label: 'Production', 
        icon: Factory, 
        order: 18,
        href: '/production',
        modules: ['production']
      }
    });

    this.register('suppliers', Suppliers, {
      navigationItem: { 
        label: 'Fournisseurs', 
        icon: Truck, 
        order: 19,
        href: '/suppliers',
        modules: ['suppliers']
      }
    });

    this.register('user-management', UserAdmin, {
      navigationItem: { 
        label: 'Utilisateurs', 
        icon: UserCog, 
        order: 20,
        href: '/user-management',
        modules: ['user-management']
      }
    });

    this.register('reports', Reports, {
      navigationItem: { 
        label: 'Rapports', 
        icon: BarChart3, 
        order: 21,
        href: '/reports'
      }
    });

    this.register('settings', Settings, {
      navigationItem: { 
        label: 'Paramètres', 
        icon: SettingsIcon, 
        order: 22,
        href: '/settings'
      }
    });

    this.register('hardware-settings', HardwareSettings, {
      navigationItem: { 
        label: 'Matériel', 
        icon: Cpu, 
        order: 23,
        href: '/hardware-settings'
      }
    });
    
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`✅ Registry initialization complete`);
    console.log(`📊 Total components registered: ${this.components.size}`);
    console.log(`📋 Components: ${Array.from(this.components.keys()).join(', ')}`);
    console.log(`═══════════════════════════════════════════════════════════`);
  }

  static register(id, component, config = {}) {
    try {
      this.components.set(id, { component, ...config });
      console.log(`  ✅ Registered: ${id} => ${component?.displayName || component?.name || 'Component'}`);
    } catch (error) {
      console.error(`  ❌ Failed to register ${id}:`, error.message);
      throw error;
    }
  }

  static getPageRenderer(pageId, modules = []) {
    const entry = this.components.get(pageId);
    if (!entry) {
      console.warn(`⚠️ [REGISTRY] Page not found: ${pageId}`);
      return null;
    }

    // Check if page requires specific modules and if they're enabled
    const navigationItem = entry.navigationItem;
    if (navigationItem && navigationItem.modules) {
      const hasRequiredModule = navigationItem.modules.some(moduleId => 
        modules.some(module => {
          const moduleName = typeof module === 'string' ? module : 
                           (module.name || module.displayName || '');
          return moduleName.toLowerCase().includes(moduleId) || 
                 moduleName.toLowerCase().replace(/[^a-z]/g, '-').includes(moduleId);
        })
      );
      
      if (!hasRequiredModule) {
        console.log(`🚫 [REGISTRY] Page disabled (module not enabled): ${pageId}, required: ${navigationItem.modules.join(',')}`);
        return null;
      }
    }

    console.log(`✅ [REGISTRY] Page renderer granted: ${pageId}`);
    return entry.component;
  }

  static getNavigationItems(modules = []) {
    console.log(`📱 [REGISTRY] Building navigation items for modules:`, modules.map(m => m.name || m).join(', ') || 'NONE');
    const items = [];
    
    for (const [id, entry] of this.components.entries()) {
      if (!entry.navigationItem) continue;
      
      const navItem = entry.navigationItem;
      
      // Check if item requires specific modules
      if (navItem.modules) {
        const hasRequiredModule = navItem.modules.some(moduleId => 
          modules.some(module => {
            const moduleName = typeof module === 'string' ? module : 
                             (module.name || module.displayName || '');
            return moduleName.toLowerCase().includes(moduleId) || 
                   moduleName.toLowerCase().replace(/[^a-z]/g, '-').includes(moduleId);
          })
        );
        
        if (!hasRequiredModule) {
          console.log(`  🚫 Hidden nav item: ${navItem.label} (${id}) - requires: ${navItem.modules.join(',')}`);
          continue;
        }
      }
      
      console.log(`  ✅ Visible nav item: ${navItem.label} (${id})`);
      items.push({
        id,
        label: navItem.label,
        icon: navItem.icon,
        href: navItem.href,
        order: navItem.order || 999
      });
    }
    
    // Sort by order
    const sorted = items.sort((a, b) => a.order - b.order);
    console.log(`📊 [REGISTRY] Total nav items: ${sorted.length}`);
    return sorted;
  }

  static getAllComponents() {
    return Array.from(this.components.keys());
  }

  static getComponentConfig(id) {
    return this.components.get(id);
  }
}

// Initialize the registry
console.log('[REGISTRY] Calling POSComponentRegistry.init()...');
POSComponentRegistry.init();
console.log('[REGISTRY] POSComponentRegistry initialization completed');

export default POSComponentRegistry;