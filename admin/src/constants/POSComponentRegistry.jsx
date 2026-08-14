import React from 'react';
import { POSDashboard } from '../components/pos/preview/modules/POSDashboard';
import { POSSales } from '../components/pos/preview/modules/POSSales';
import { POSProducts } from '../components/pos/preview/modules/POSProducts';
import { POSInventory } from '../components/pos/preview/modules/POSInventory';
import { POSCustomers } from '../components/pos/preview/modules/POSCustomers';
import { POSReports } from '../components/pos/preview/modules/POSReports';
import { POSSettings } from '../components/pos/preview/modules/POSSettings';
import { POSTables } from '../components/pos/preview/modules/POSTables';
import { POSMenuManagement } from '../components/pos/preview/modules/POSMenuManagement';
import { POSUserManagement } from '../components/pos/preview/modules/POSUserManagement';
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
import { POSPlaceholder } from '../components/pos/preview/modules/POSPlaceholder';

import {
  Home,
  ShoppingCart,
  Package,
  Warehouse,
  Barcode as BarcodeIcon,
  Zap,
  Car,
  Users,
  Heart,
  TableProperties,
  ChefHat,
  MenuSquare,
  Calendar,
  Briefcase,
  CreditCard,
  Gift,
  Stethoscope,
  Factory,
  Truck,
  UserCog,
  BarChart3,
  Settings as SettingsIcon,
  Cpu,
  Store,
  ArrowLeftRight,
  Palette,
  Tag,
  CircleDollarSign,
  Receipt,
  WifiOff,
  UserCheck,
  Scale,
  Hash,
  Clock,
  CalendarDays,
} from 'lucide-react';

// Fabrique un composant placeholder qui suit la coquille et le design system
// du POS réel pour les modules enregistrés mais non encore détaillés dans
// l'aperçu.
const createPlaceholder = (label, icon, description) =>
  function PlaceholderModule(props) {
    return (
      <POSPlaceholder {...props} placeholder={{ label, icon, description }} />
    );
  };

// Registre centralisé des composants POS
// L'ordre reflète exactement la navigation du POS réel (pos-template).
// Modules 1-23 : miroir du registre réel. Modules 24+ : extensions
// d'aperçu propres à l'admin (futures fonctionnalités du POS).
export class POSComponentRegistry {
  static components = new Map();

  static init() {
    // ── Modules du POS réel (ordre identique à pos-template) ──────────────
    this.register('dashboard', POSDashboard, {
      navigationItem: {
        label: 'Tableau de bord',
        icon: Home,
        order: 1,
      },
    });

    this.register('sales', POSSales, {
      navigationItem: {
        label: 'Ventes',
        icon: ShoppingCart,
        order: 2,
      },
    });

    this.register('products', POSProducts, {
      navigationItem: {
        label: 'Produits',
        icon: Package,
        order: 3,
      },
    });

    this.register('inventory', POSInventory, {
      requiresModule: ['inventory', 'stock', 'stocks', 'gestion de stock'],
      navigationItem: {
        label: 'Stocks',
        icon: Warehouse,
        order: 4,
      },
    });

    this.register('barcode', createPlaceholder('Code-barres', BarcodeIcon, 'Générez et imprimez vos étiquettes code-barres'), {
      requiresModule: ['barcode', 'code-barres', 'etiquettes'],
      navigationItem: {
        label: 'Code-barres',
        icon: BarcodeIcon,
        order: 5,
      },
    });

    this.register('quick-service', createPlaceholder('Service rapide', Zap, 'Ventes express sans passer par le panier'), {
      requiresModule: ['quick-service', 'service rapide', 'service'],
      navigationItem: {
        label: 'Service rapide',
        icon: Zap,
        order: 6,
      },
    });

    this.register('takeaway', createPlaceholder('Vente à emporter', Car, 'Commandes à emporter et suivi des livraisons'), {
      requiresModule: ['takeaway', 'a emporter', 'emporter', 'livraison'],
      navigationItem: {
        label: 'Vente à emporter',
        icon: Car,
        order: 7,
      },
    });

    this.register('customers', POSCustomers, {
      requiresModule: ['customer', 'customers', 'client', 'clients', 'gestion client'],
      navigationItem: {
        label: 'Clients',
        icon: Users,
        order: 8,
      },
    });

    this.register('loyalty', createPlaceholder('Fidélité', Heart, 'Programme de fidélité et points clients'), {
      requiresModule: ['loyalty', 'fidelite', 'fidélité', 'points'],
      navigationItem: {
        label: 'Fidélité',
        icon: Heart,
        order: 9,
      },
    });

    this.register('tables', POSTables, {
      requiresModule: ['table', 'tables', 'restaurant', 'gestion des tables'],
      navigationItem: {
        label: 'Tables',
        icon: TableProperties,
        order: 10,
      },
    });

    this.register('kitchen', createPlaceholder('Cuisine', ChefHat, 'Écran cuisine pour le suivi des commandes'), {
      requiresModule: ['kitchen', 'cuisine', 'écran cuisine', 'ecran cuisine'],
      navigationItem: {
        label: 'Cuisine',
        icon: ChefHat,
        order: 11,
      },
    });

    this.register('menu-management', POSMenuManagement, {
      requiresModule: ['menu', 'carte', 'menus', 'menu-management'],
      navigationItem: {
        label: 'Menu',
        icon: MenuSquare,
        order: 12,
      },
    });

    this.register('appointments', createPlaceholder('Rendez-vous', Calendar, 'Planification des rendez-vous clients'), {
      requiresModule: ['appointment', 'appointments', 'rendez-vous', 'rendezvous'],
      navigationItem: {
        label: 'Rendez-vous',
        icon: Calendar,
        order: 13,
      },
    });

    this.register('services', createPlaceholder('Services', Briefcase, 'Catalogue des services proposés'), {
      requiresModule: ['service', 'services'],
      navigationItem: {
        label: 'Services',
        icon: Briefcase,
        order: 14,
      },
    });

    this.register('payment-advanced', createPlaceholder('Paiements avancés', CreditCard, 'Moyens de paiement et terminal'), {
      requiresModule: ['payment-advanced', 'paiements avancés', 'payment advanced'],
      navigationItem: {
        label: 'Paiements avancés',
        icon: CreditCard,
        order: 15,
      },
    });

    this.register('gift-cards', createPlaceholder('Cartes cadeaux', Gift, 'Émission et gestion des cartes cadeaux'), {
      requiresModule: ['gift-cards', 'gift cards', 'cartes cadeaux', 'carte cadeau'],
      navigationItem: {
        label: 'Cartes cadeaux',
        icon: Gift,
        order: 16,
      },
    });

    this.register('prescription', createPlaceholder('Ordonnances', Stethoscope, 'Gestion des ordonnances et prescriptions'), {
      requiresModule: ['prescription', 'ordonnance', 'ordonnances'],
      navigationItem: {
        label: 'Ordonnances',
        icon: Stethoscope,
        order: 17,
      },
    });

    this.register('production', createPlaceholder('Production', Factory, 'Suivi de la production et fabrication'), {
      requiresModule: ['production', 'fabrication'],
      navigationItem: {
        label: 'Production',
        icon: Factory,
        order: 18,
      },
    });

    this.register('suppliers', createPlaceholder('Fournisseurs', Truck, 'Gestion des fournisseurs et réapprovisionnement'), {
      requiresModule: ['supplier', 'suppliers', 'fournisseur', 'fournisseurs'],
      navigationItem: {
        label: 'Fournisseurs',
        icon: Truck,
        order: 19,
      },
    });

    this.register('user-management', POSUserManagement, {
      requiresModule: ['user-management', 'users', 'utilisateurs', 'gestion utilisateurs', 'permissions'],
      navigationItem: {
        label: 'Utilisateurs',
        icon: UserCog,
        order: 20,
      },
    });

    this.register('reports', POSReports, {
      navigationItem: {
        label: 'Rapports',
        icon: BarChart3,
        order: 21,
      },
    });

    this.register('settings', POSSettings, {
      navigationItem: {
        label: 'Paramètres',
        icon: SettingsIcon,
        order: 22,
      },
    });

    this.register('hardware-settings', createPlaceholder('Matériel', Cpu, 'Périphériques, imprimantes et diagnostics'), {
      requiresModule: ['hardware', 'materiel', 'matériel', 'peripherique', 'périphérique'],
      navigationItem: {
        label: 'Matériel',
        icon: Cpu,
        order: 23,
      },
    });

    // ── Extensions d'aperçu propres à l'admin (futurs modules POS) ────────
    this.register('multi-store', POSMultiStore, {
      requiresModule: ['multi-store', 'multi store', 'multistore', 'magasins multiples'],
      navigationItem: {
        label: 'Multi-Magasins',
        icon: Store,
        order: 24,
      },
    });

    this.register('transfers', POSTransfers, {
      requiresModule: ['transfers', 'transferts', 'transfer', 'stock transfer'],
      navigationItem: {
        label: 'Transferts',
        icon: ArrowLeftRight,
        order: 25,
      },
    });

    this.register('variants', POSVariants, {
      requiresModule: ['variants', 'variantes', 'product variants', 'tailles couleurs'],
      navigationItem: {
        label: 'Variantes',
        icon: Palette,
        order: 26,
      },
    });

    this.register('promotions', POSPromotions, {
      requiresModule: ['promotions', 'promos', 'discounts', 'remises'],
      navigationItem: {
        label: 'Promotions',
        icon: Tag,
        order: 27,
      },
    });

    this.register('split-payments', POSSplitPayments, {
      requiresModule: ['split-payments', 'split payments', 'paiements multiples', 'multiple payments'],
      navigationItem: {
        label: 'Paiements Multiples',
        icon: CircleDollarSign,
        order: 28,
      },
    });

    this.register('tax-management', POSTaxManagement, {
      requiresModule: ['tax-management', 'tax', 'tva', 'taxes', 'gestion fiscale'],
      navigationItem: {
        label: 'Gestion TVA',
        icon: Receipt,
        order: 29,
      },
    });

    this.register('offline-mode', POSOfflineMode, {
      requiresModule: ['offline-mode', 'offline', 'mode hors ligne', 'sync'],
      navigationItem: {
        label: 'Mode Hors Ligne',
        icon: WifiOff,
        order: 30,
      },
    });

    this.register('employee-management', POSEmployeeManagement, {
      requiresModule: ['employee-management', 'employees', 'staff', 'personnel', 'gestion personnel'],
      navigationItem: {
        label: 'Personnel',
        icon: UserCheck,
        order: 31,
      },
    });

    this.register('weight-scale', POSWeightScale, {
      requiresModule: ['weight-scale', 'scale', 'balance', 'weighing', 'pesée'],
      navigationItem: {
        label: 'Balance',
        icon: Scale,
        order: 32,
      },
    });

    this.register('serial-batch', POSSerialBatch, {
      requiresModule: ['serial-batch', 'serial', 'batch', 'lot', 'numéro série', 'traçabilité'],
      navigationItem: {
        label: 'Séries & Lots',
        icon: Hash,
        order: 33,
      },
    });

    this.register('layaway', POSLayaway, {
      requiresModule: ['layaway', 'deposits', 'réservations', 'acomptes', 'dépôts'],
      navigationItem: {
        label: 'Réservations',
        icon: Clock,
        order: 34,
      },
    });

    this.register('rental', POSRental, {
      requiresModule: ['rental', 'location', 'rent', 'louer'],
      navigationItem: {
        label: 'Location',
        icon: CalendarDays,
        order: 35,
      },
    });
  }

  static register(componentId, component, config = {}) {
    this.components.set(componentId, {
      component,
      config: {
        requiresModule: config.requiresModule || null,
        navigationItem: config.navigationItem || null,
        permissions: config.permissions || [],
        ...config,
      },
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
        ...comp.config.navigationItem,
      }));
  }

  static isComponentAvailable(componentData, enabledModules) {
    if (!componentData.config.requiresModule) return true;

    const requiredModules = Array.isArray(componentData.config.requiresModule)
      ? componentData.config.requiresModule
      : [componentData.config.requiresModule];

    const normalizedEnabledModules = enabledModules.map(module => {
      const moduleName = typeof module === 'string' ? module : (module.name || module.label || module.id || '');
      return moduleName.toLowerCase().trim();
    });

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
export const navigationItems = POSComponentRegistry.getNavigationItems([
  'sales', 'vente', 'products', 'produits', 'inventory', 'stock', 'stocks',
  'customers', 'clients', 'reports', 'rapports', 'barcode', 'code-barres',
  'quick-service', 'service rapide', 'takeaway', 'a emporter', 'loyalty', 'fidélité',
  'tables', 'restaurant', 'kitchen', 'cuisine', 'menu', 'carte', 'appointments',
  'rendez-vous', 'services', 'payment-advanced', 'paiements avancés', 'gift-cards',
  'cartes cadeaux', 'prescription', 'ordonnances', 'production', 'suppliers',
  'fournisseurs', 'user-management', 'utilisateurs', 'hardware', 'matériel',
]);
