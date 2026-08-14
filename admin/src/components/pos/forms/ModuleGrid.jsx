/**
 * ModuleGrid Component
 * Compact module selection grid (Shopify Admin style)
 */

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  Barcode,
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  Circle,
  ClipboardList,
  ConciergeBell,
  Cpu,
  CreditCard,
  Factory,
  Gift,
  HandCoins,
  KeyRound,
  Lock,
  Package,
  Palette,
  Pill,
  ReceiptText,
  Scale,
  Search,
  ShoppingBag,
  ShoppingCart,
  Split,
  Sparkles,
  Store,
  Tag,
  Ticket,
  Truck,
  Users,
  UsersRound,
  Utensils,
  WifiOff,
  Wrench,
} from 'lucide-react';

// Module icon mapping (neutral, lucide-based)
const MODULE_ICONS = {
  'pos-core': ShoppingCart,
  'user-management': Users,
  'reports': BarChart3,
  'barcode': Barcode,
  'inventory': Package,
  'suppliers': Truck,
  'variants': Palette,
  'promotions': Tag,
  'serial-batch': Boxes,
  'weight-scale': Scale,
  'tables': Utensils,
  'kitchen': ChefHat,
  'menu-management': ClipboardList,
  'takeaway': ShoppingBag,
  'customer-management': UsersRound,
  'loyalty': Gift,
  'gift-cards': Ticket,
  'layaway': HandCoins,
  'payment-advanced': CreditCard,
  'split-payments': Split,
  'appointments': CalendarDays,
  'services': Wrench,
  'prescription': Pill,
  'production': Factory,
  'rental': KeyRound,
  'employee-management': Briefcase,
  'tax-management': ReceiptText,
  'offline-mode': WifiOff,
  'sales': Store,
  'customers': UsersRound,
  'default': Package,
};

const getModuleIcon = (moduleName) => MODULE_ICONS[moduleName] || MODULE_ICONS['default'];

// Category labels and icons
const CATEGORY_LABELS = {
  'core': 'Core (Système)',
  'inventory': 'Inventaire',
  'restaurant': 'Restaurant',
  'customer': 'Clients',
  'payment': 'Paiements',
  'specialized': 'Spécialisé',
  'administration': 'Administration',
  'service': 'Service',
};

const CATEGORY_ICONS = {
  'core': Cpu,
  'inventory': Boxes,
  'restaurant': Utensils,
  'customer': Users,
  'payment': CreditCard,
  'specialized': Wrench,
  'administration': Building2,
  'service': ConciergeBell,
};

const getCategoryLabel = (category) => CATEGORY_LABELS[category] || category;
const getCategoryIcon = (category) => CATEGORY_ICONS[category] || Package;

export default function ModuleGrid({
  modulesByCategory,
  selectedModules,
  onModuleToggle,
  isModuleRequired,
}) {
  // Ensure props are always the right shape
  const modulesData = useMemo(
    () => (modulesByCategory && typeof modulesByCategory === 'object' ? modulesByCategory : {}),
    [modulesByCategory],
  );
  const selectedList = Array.isArray(selectedModules) ? selectedModules : [];

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = Object.keys(modulesData);
  const allModules = useMemo(
    () => Object.values(modulesData).flat().filter(Boolean),
    [modulesData],
  );
  const totalModules = allModules.length;

  const normalizedSearch = search.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    const list = categoryFilter === 'all' ? categories : categories.filter((c) => c === categoryFilter);
    if (!normalizedSearch) return list;

    return list.filter((category) => {
      const modules = modulesData[category] || [];
      return modules.some((m) =>
        (m.displayName || '').toLowerCase().includes(normalizedSearch) ||
        (m.name || '').toLowerCase().includes(normalizedSearch) ||
        (m.description || '').toLowerCase().includes(normalizedSearch),
      );
    });
  }, [categoryFilter, normalizedSearch, categories, modulesData]);

  const hasAnyResult = filteredCategories.some(
    (category) => (modulesData[category] || []).length > 0,
  );

  const nonRequiredSelectedCount = selectedList.filter((id) => {
    const module = allModules.find((m) => m.id === id);
    return module && !isModuleRequired(module.name);
  }).length;

  const deselectAll = () => {
    selectedList.forEach((id) => {
      const module = allModules.find((m) => m.id === id);
      if (module && !isModuleRequired(module.name)) {
        onModuleToggle(id);
      }
    });
  };

  const toggleCategory = (modules) => {
    const hasUnselected = modules.some((m) => !selectedList.includes(m.id));
    modules.forEach((module) => {
      const isSelected = selectedList.includes(module.id);
      if (hasUnselected && !isSelected) {
        onModuleToggle(module.id);
      } else if (!hasUnselected && isSelected && !isModuleRequired(module.name)) {
        onModuleToggle(module.id);
      }
    });
  };

  const renderModuleCard = (module) => {
    const isRequired = isModuleRequired(module.name);
    const isSelected = selectedList.includes(module.id);
    const ModuleIcon = getModuleIcon(module.name);

    return (
      <button
        key={module.id}
        type="button"
        disabled={isRequired}
        onClick={() => onModuleToggle(module.id)}
        aria-pressed={isSelected}
        className={cn(
          'flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-all duration-150',
          isRequired
            ? 'cursor-not-allowed border-blue-200 bg-blue-50/70'
            : isSelected
              ? 'border-blue-500 bg-blue-50 shadow-sm hover:border-blue-600'
              : 'border-border bg-card hover:border-[#b5b5b6] hover:bg-accent/50 hover:shadow-sm',
        )}
      >
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-md transition-colors',
            isSelected || isRequired
              ? 'bg-blue-100 text-blue-600'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <ModuleIcon className="size-[18px]" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              {module.displayName}
            </span>
            {isRequired && (
              <Badge variant="neutral" className="shrink-0 gap-1 text-[11px]">
                <Lock className="size-2.5" />
                Obligatoire
              </Badge>
            )}
          </span>
          {module.description && (
            <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted-foreground">
              {module.description}
            </span>
          )}
        </span>

        <span className="shrink-0 pt-1">
          {isRequired ? (
            <Lock className="size-4 text-muted-foreground/60" />
          ) : isSelected ? (
            <CheckCircle2 className="size-5 text-blue-600" />
          ) : (
            <Circle className="size-5 text-[#c9c9cb]" />
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Sélectionnez vos modules
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Choisissez les fonctionnalités qui correspondent à votre activité
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-[13px]">
            <CheckCircle2 className="size-3.5 text-blue-600" />
            {selectedList.length} sur {totalModules} sélectionnés
          </Badge>
          {nonRequiredSelectedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              Tout désélectionner
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un module..."
            className="pl-8"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {getCategoryLabel(category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {categories.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center">
          <Package className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chargement des modules…</p>
        </div>
      ) : !hasAnyResult ? (
        <div className="rounded-lg border bg-card p-10 text-center">
          <Search className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h3 className="mb-1 text-sm font-medium">Aucun module trouvé</h3>
          <p className="mb-4 text-[13px] text-muted-foreground">
            Aucun module ne correspond à votre recherche.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setCategoryFilter('all');
            }}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((category) => {
            const modules = (modulesData[category] || []).filter((m) =>
              !normalizedSearch ||
              (m.displayName || '').toLowerCase().includes(normalizedSearch) ||
              (m.name || '').toLowerCase().includes(normalizedSearch) ||
              (m.description || '').toLowerCase().includes(normalizedSearch),
            );
            if (modules.length === 0) return null;

            const selectableModules = modules.filter((m) => !isModuleRequired(m.name));
            const selectedCount = modules.filter((m) => selectedList.includes(m.id)).length;
            const allSelected = selectedCount === modules.length;
            const CategoryIcon = getCategoryIcon(category);

            return (
              <section key={category}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded bg-muted text-muted-foreground">
                      <CategoryIcon className="size-3" />
                    </span>
                    <h3 className="truncate text-[13px] font-medium text-foreground">
                      {getCategoryLabel(category)}
                    </h3>
                    <Badge variant="neutral" className="px-1.5 text-[10px]">
                      {selectedCount}/{modules.length}
                    </Badge>
                  </div>
                  {selectableModules.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => toggleCategory(modules)}
                    >
                      {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {modules.map(renderModuleCard)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Help Text */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="mb-1 text-sm font-medium text-blue-900">
              Conseil : sélectionnez uniquement les modules dont vous avez besoin
            </p>
            <p className="text-[13px] leading-snug text-blue-700">
              Vous pourrez toujours ajouter ou retirer des modules plus tard. Les modules
              obligatoires (Core) sont pré-sélectionnés.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
