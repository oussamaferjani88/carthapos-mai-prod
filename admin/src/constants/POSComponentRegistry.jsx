import { POSDashboard } from '../components/pos/preview/modules/POSDashboard';
import { POSSales } from '../components/pos/preview/modules/POSSales';  // 🚀 Version modulaire avec layout professionnel
import { POSProducts } from '../components/pos/preview/modules/POSProducts';
import { POSCustomers } from '../components/pos/preview/modules/POSCustomers';
import { POSReports } from '../components/pos/preview/modules/POSReports';
import { POSSettings } from '../components/pos/preview/modules/POSSettings';
import { POSTables } from '../components/pos/preview/modules/POSTables';
import { POSMenuManagement } from '../components/pos/preview/modules/POSMenuManagement';
import { POSInventory } from '../components/pos/preview/modules/POSInventory';
import { POSMultiStore } from '../components/pos/preview/modules/POSMultiStore';
import { POSTransfers } from '../components/pos/preview/modules/POSTransfers';
import { POSVariants } from '../components/pos/preview/modules/POSVariants';
import { POSPromotions } from '../components/pos/preview/modules/POSPromotions';
import { POSSplitPayments } from '../components/pos/preview/modules/POSSplitPayments';
import { POSTaxManagement } from '../components/pos/preview/modules/POSTaxManagement';
import { POSOfflineMode } from '../components/pos/preview/modules/POSOfflineMode';
import { POSEmployeeManagement } from '../components/pos/preview/modules/POSEmployeeManagement';
import { POSWeightScale } from '../components/pos/preview/modules/POSWeightScale';
import { POSSerialBatch } from '../components/pos/preview/modules/POSSerialBatch';
import { POSLayaway } from '../components/pos/preview/modules/POSLayaway';
import { POSRental } from '../components/pos/preview/modules/POSRental';
import { POSUserManagement } from '../components/pos/preview/modules/POSUserManagement';

import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  Settings,
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
  Shield
} from 'lucide-react';

// Registre centralisé des composants POS
export class POSComponentRegistry {
  static components = new Map();

  static init() {
    // Enregistrement des composants avec leurs configurations
    this.register('dashboard', POSDashboard, {
      navigationItem: { 
        label: 'Dashboard', 
        icon: Home, 
        order: 1 
      }
    });

    this.register('sales', POSSales, {
      // Pas de requiresModule - toujours disponible pour la démo
      navigationItem: { 
        label: 'Ventes', 
        icon: ShoppingCart, 
        order: 2 
      }
    });

    this.register('products', POSProducts, {
      // Pas de requiresModule - toujours disponible pour la démo
      navigationItem: { 
        label: 'Produits', 
        icon: Package, 
        order: 3 
      }
    });

    this.register('inventory', POSInventory, {
      // Pas de requiresModule - toujours disponible pour la démo
      navigationItem: { 
        label: 'Stocks', 
        icon: Warehouse, 
        order: 4 
      }
    });

    this.register('tables', POSTables, {
      requiresModule: ['tables', 'restaurant', 'restaurant-management', 'gestion des tables'],
      navigationItem: { 
        label: 'Tables', 
        icon: Utensils, 
        order: 5 
      }
    });

    this.register('menu-management', POSMenuManagement, {
      requiresModule: ['menu', 'menu-management', 'carte', 'menus'],
      navigationItem: { 
        label: 'Menu', 
        icon: MenuSquare, 
        order: 6 
      }
    });

    this.register('customers', POSCustomers, {
      // Pas de requiresModule - toujours disponible pour la démo
      navigationItem: { 
        label: 'Clients', 
        icon: Users, 
        order: 7 
      }
    });

    this.register('reports', POSReports, {
      // Pas de requiresModule - toujours disponible pour la démo
      navigationItem: { 
        label: 'Rapports', 
        icon: BarChart3, 
        order: 8 
      }
    });

    // ===== NOUVEAUX MODULES =====
    
    this.register('multi-store', POSMultiStore, {
      requiresModule: ['multi-store', 'multi store', 'multistore', 'magasins multiples'],
      navigationItem: { 
        label: 'Multi-Magasins', 
        icon: Store, 
        order: 10 
      }
    });

    this.register('transfers', POSTransfers, {
      requiresModule: ['transfers', 'transferts', 'transfer', 'stock transfer'],
      navigationItem: { 
        label: 'Transferts', 
        icon: ArrowLeftRight, 
        order: 11 
      }
    });

    this.register('variants', POSVariants, {
      requiresModule: ['variants', 'variantes', 'product variants', 'tailles couleurs'],
      navigationItem: { 
        label: 'Variantes', 
        icon: Palette, 
        order: 12 
      }
    });

    this.register('promotions', POSPromotions, {
      requiresModule: ['promotions', 'promos', 'discounts', 'remises'],
      navigationItem: { 
        label: 'Promotions', 
        icon: Tag, 
        order: 13 
      }
    });

    this.register('split-payments', POSSplitPayments, {
      requiresModule: ['split-payments', 'split payments', 'paiements multiples', 'multiple payments'],
      navigationItem: { 
        label: 'Paiements Multiples', 
        icon: CreditCard, 
        order: 14 
      }
    });

    this.register('tax-management', POSTaxManagement, {
      requiresModule: ['tax-management', 'tax', 'tva', 'taxes', 'gestion fiscale'],
      navigationItem: { 
        label: 'Gestion TVA', 
        icon: Receipt, 
        order: 15 
      }
    });

    this.register('offline-mode', POSOfflineMode, {
      requiresModule: ['offline-mode', 'offline', 'mode hors ligne', 'sync'],
      navigationItem: { 
        label: 'Mode Hors Ligne', 
        icon: WifiOff, 
        order: 16 
      }
    });

    this.register('employee-management', POSEmployeeManagement, {
      requiresModule: ['employee-management', 'employees', 'staff', 'personnel', 'gestion personnel'],
      navigationItem: { 
        label: 'Personnel', 
        icon: UserCheck, 
        order: 17 
      }
    });

    this.register('weight-scale', POSWeightScale, {
      requiresModule: ['weight-scale', 'scale', 'balance', 'weighing', 'pesée'],
      navigationItem: { 
        label: 'Balance', 
        icon: Scale, 
        order: 18 
      }
    });

    this.register('serial-batch', POSSerialBatch, {
      requiresModule: ['serial-batch', 'serial', 'batch', 'lot', 'numéro série', 'traçabilité'],
      navigationItem: { 
        label: 'Séries & Lots', 
        icon: Hash, 
        order: 19 
      }
    });

    this.register('layaway', POSLayaway, {
      requiresModule: ['layaway', 'deposits', 'réservations', 'acomptes', 'dépôts'],
      navigationItem: { 
        label: 'Réservations', 
        icon: Clock, 
        order: 20 
      }
    });

    this.register('rental', POSRental, {
      requiresModule: ['rental', 'location', 'rent', 'louer'],
      navigationItem: { 
        label: 'Location', 
        icon: CalendarDays, 
        order: 21 
      }
    });

    this.register('user-management', POSUserManagement, {
      requiresModule: ['user-management', 'users', 'utilisateurs', 'gestion utilisateurs', 'permissions'],
      navigationItem: { 
        label: 'Utilisateurs', 
        icon: Shield, 
        order: 22 
      }
    });

    this.register('settings', POSSettings, {
      navigationItem: { 
        label: 'Paramètres', 
        icon: Settings, 
        order: 99 
      }
    });
  }

  static register(componentId, component, config = {}) {
    this.components.set(componentId, {
      component,
      config: {
        requiresModule: config.requiresModule || null,
        navigationItem: config.navigationItem || null,
        permissions: config.permissions || [],
        ...config
      }
    });
  }

  static getComponent(componentId) {
    return this.components.get(componentId);
  }

  static getAvailableComponents(enabledModules = []) {
    const available = [];
    
    for (const [id, componentData] of this.components) {
      if (this.isComponentAvailable(componentData, enabledModules)) {
        available.push({ id, ...componentData });
      }
    }
    
    return available.sort((a, b) => {
      const orderA = a.config.navigationItem?.order || 999;
      const orderB = b.config.navigationItem?.order || 999;
      return orderA - orderB;
    });
  }

  static getNavigationItems(enabledModules = []) {
    return this.getAvailableComponents(enabledModules)
      .filter(comp => comp.config.navigationItem)
      .map(comp => ({
        id: comp.id,
        ...comp.config.navigationItem
      }));
  }

  static isComponentAvailable(componentData, enabledModules) {
    // Si le composant ne nécessite pas de module, il est toujours disponible
    if (!componentData.config.requiresModule) return true;
    
    const requiredModules = Array.isArray(componentData.config.requiresModule) 
      ? componentData.config.requiresModule 
      : [componentData.config.requiresModule];

    // Normalise les modules activés pour la comparaison
    const normalizedEnabledModules = enabledModules.map(module => {
      const moduleName = typeof module === 'string' ? module : (module.name || module.label || module.id || '');
      return moduleName.toLowerCase().trim();
    });

    // Vérifie si au moins un des modules requis est activé
    return requiredModules.some(requiredModule => {
      const normalizedRequired = requiredModule.toLowerCase().trim();
      return normalizedEnabledModules.some(enabled => 
        enabled.includes(normalizedRequired) || normalizedRequired.includes(enabled)
      );
    });
  }

  static getPageRenderer(pageId, enabledModules = []) {
    const componentData = this.getComponent(pageId);
    
    if (!componentData) {
      console.warn(`Component "${pageId}" not found, falling back to dashboard`);
      return this.getComponent('dashboard')?.component || (() => <div>Page not found</div>);
    }

    if (!this.isComponentAvailable(componentData, enabledModules)) {
      console.warn(`Component "${pageId}" not available with current modules`);
      return this.getComponent('dashboard')?.component || (() => <div>Page not available</div>);
    }

    return componentData.component;
  }
}

// Initialiser le registre au chargement du module
POSComponentRegistry.init();

// Export des items de navigation pour compatibilité - avec tous les modules par défaut
export const navigationItems = POSComponentRegistry.getNavigationItems(['sales', 'vente', 'products', 'produits', 'inventory', 'stocks', 'customers', 'clients', 'reports', 'rapports']);
