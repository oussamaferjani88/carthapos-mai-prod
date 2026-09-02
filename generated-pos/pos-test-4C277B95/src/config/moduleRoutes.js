// Single source of truth for which module(s) gate a given nav item / route.
// Imported by both POSNavbar.jsx (menu visibility) and App.jsx (route
// availability) so the two can never drift out of sync with each other.
//
// Deliberately has NO icon-library import: App.jsx only needs the id/href/
// modules data, and pulling lucide-react into App.jsx's eager top-level
// import graph (it used to only be reachable through lazily-loaded pages)
// shifts the vendor bundle's module-init order enough to trigger real
// runtime crashes in unrelated vendor chunks. Icons are attached locally in
// POSNavbar.jsx instead, which is the only consumer that actually renders them.

// modules: undefined/absent => always available (no license gate).
// perm: canonical permission module gating the target route (undefined =>
// route is not permission-gated). Must mirror the `module` field of the same
// path in src/App.jsx's route table; used by POSNavbar to keep menu visibility
// in sync with route enforcement.
export const navigationConfig = [
  { name: 'Tableau de bord', href: '/', id: 'dashboard', perm: 'dashboard' },
  { name: 'Ventes', href: '/sales', id: 'sales', perm: 'sales' },
  { name: 'Produits', href: '/products', id: 'products', perm: 'products' },
  { name: 'Stocks', href: '/inventory', id: 'inventory', modules: ['inventory'], perm: 'inventory' },
  { name: 'Code-barres', href: '/barcode', id: 'barcode', modules: ['barcode'], perm: 'barcode' },
  { name: 'Service rapide', href: '/quick-service', id: 'quick-service', modules: ['quick-service'], perm: 'sales' },
  { name: 'Vente à emporter', href: '/takeaway', id: 'takeaway', modules: ['takeaway'], perm: 'sales' },
  { name: 'Clients', href: '/customers', id: 'customers', modules: ['customer-management'], perm: 'customers' },
  { name: 'Fidélité', href: '/loyalty', id: 'loyalty', modules: ['loyalty'], perm: 'loyalty' },
  { name: 'Tables', href: '/tables', id: 'tables', modules: ['tables'], perm: 'tables' },
  { name: 'Cuisine', href: '/kitchen', id: 'kitchen', modules: ['kitchen'], perm: 'kitchen' },
  { name: 'Menu', href: '/menu-management', id: 'menu', modules: ['menu-management'], perm: 'products' },
  { name: 'Rendez-vous', href: '/appointments', id: 'appointments', modules: ['appointments'], perm: 'appointments' },
  { name: 'Services', href: '/services', id: 'services', modules: ['services'], perm: 'services' },
  { name: 'Paiements avancés', href: '/payment-advanced', id: 'payment-advanced', modules: ['payment-advanced'], perm: 'sales' },
  { name: 'Cartes cadeaux', href: '/gift-cards', id: 'gift-cards', modules: ['gift-cards'], perm: 'gift_cards' },
  { name: 'Ordonnances', href: '/prescription', id: 'prescription', modules: ['prescription'], perm: 'prescription' },
  { name: 'Production', href: '/production', id: 'production', modules: ['production'], perm: 'production' },
  { name: 'Fournisseurs', href: '/suppliers', id: 'suppliers', modules: ['suppliers'], perm: 'suppliers' },
  { name: 'Utilisateurs', href: '/user-management', id: 'user-management', modules: ['user-management'], perm: 'user-management' },
  { name: 'Rapports', href: '/reports', id: 'reports', perm: 'reports' },
  { name: 'Paramètres', href: '/settings', id: 'settings', perm: 'settings' },
  { name: 'Matériel', href: '/hardware-settings', id: 'hardware' },
];

// href -> required modules (undefined = always available), for App.jsx's route table.
export const requiredModulesByHref = navigationConfig.reduce((map, item) => {
  if (item.modules && item.modules.length > 0) {
    map[item.href] = item.modules;
  }
  return map;
}, {});

// Shared enabled/required matching (fuzzy substring, matches historical
// POSNavbar behavior) so nav visibility and route availability agree.
export function isModuleSetEnabled(requiredModules, enabledModules) {
  if (!requiredModules || requiredModules.length === 0) return true;
  return requiredModules.some(required =>
    enabledModules.some(enabled =>
      enabled === required ||
      enabled.includes(required) ||
      required.includes(enabled)
    )
  );
}
