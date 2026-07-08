/**
 * ModuleGrid Component
 * Odoo-style module selection grid
 */

import { Badge } from '../../ui/badge';
import { CheckCircle, Package, Sparkles } from 'lucide-react';

// Module icons mapping (Odoo-style)
const getModuleIcon = (moduleName) => {
  const iconMap = {
    'sales': '💰',
    'pos-core': '🛒',
    'customers': '👥',
    'customer-management': '👥',
    'reports': '📊',
    'barcode': '📱',
    'tables': '🪑',
    'kitchen': '👨‍🍳',
    'menu-management': '📋',
    'takeaway': '🥡',
    'loyalty': '🎁',
    'suppliers': '🚚',
    'variants': '🎨',
    'promotions': '🏷️',
    'serial-batch': '🔢',
    'weight-scale': '⚖️',
    'layaway': '💳',
    'payment-advanced': '💳',
    'gift-cards': '🎁',
    'split-payments': '💰',
    'appointments': '📅',
    'services': '⚙️',
    'prescription': '💊',
    'production': '🏭',
    'rental': '🔑',
    'tax-management': '📝',
    'employee-management': '👔',
    'user-management': '👤',
    'offline-mode': '📡',
    'default': '⚙️'
  };
  return iconMap[moduleName] || iconMap['default'];
};

// Category colors (Odoo-style)
const getCategoryColor = (category) => {
  const colorMap = {
    'core': 'from-blue-500 to-blue-600',
    'inventory': 'from-green-500 to-green-600',
    'restaurant': 'from-orange-500 to-orange-600',
    'service': 'from-purple-500 to-purple-600',
    'customer': 'from-pink-500 to-pink-600',
    'payment': 'from-indigo-500 to-indigo-600',
    'specialized': 'from-yellow-500 to-yellow-600',
    'administration': 'from-red-500 to-red-600',
    'default': 'from-gray-500 to-gray-600'
  };
  return colorMap[category] || colorMap['default'];
};

export default function ModuleGrid({ 
  modulesByCategory, 
  selectedModules, 
  onModuleToggle,
  isModuleRequired 
}) {
  // Ensure modulesByCategory is always an object
  const modulesData = modulesByCategory && typeof modulesByCategory === 'object' ? modulesByCategory : {};
  // Ensure selectedModules is always an array
  const selectedList = Array.isArray(selectedModules) ? selectedModules : [];
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-left max-w-2xl">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-2 shadow-lg">
          <Package className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Sélectionnez vos modules
        </h2>
        <p className="text-sm text-gray-600">
          Choisissez les fonctionnalités qui correspondent à votre activité
        </p>
      </div>

      {/* Selected Modules Counter */}
      <div className="flex items-center justify-center gap-4">
        <Badge variant="outline" className="px-4 py-2 text-sm">
          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
          {selectedList.length} modules sélectionnés
        </Badge>
      </div>

      {/* All Modules Grid */}
      <div className="flex justify-center">
        <div className="grid grid-cols-6 gap-10">
          {Object.entries(modulesData).flatMap(([category, modules]) => 
            Array.isArray(modules) ? modules.map((module) => {
              const isRequired = isModuleRequired(module.name);
              const isSelected = selectedList.includes(module.id);
              
              return (
                <div
                  key={module.id}
                  onClick={() => !isRequired && onModuleToggle(module.id)}
                  className="group relative cursor-pointer"
                >
                  {/* Main Card */}
                  <div className={`
                    w-32 h-32 rounded-2xl flex flex-col items-center justify-center text-4xl transition-all duration-200 relative
                    ${isSelected 
                      ? `bg-gradient-to-br ${getCategoryColor(category)} shadow-lg scale-105` 
                      : 'bg-gray-100 group-hover:bg-gray-200 group-hover:shadow-md'
                    }
                  `}>
                    {/* Icon */}
                    <span className="mb-2">
                      {getModuleIcon(module.name)}
                    </span>
                    
                    {/* Module Name */}
                    <span className={`
                      text-xs font-medium text-center px-2 transition-colors leading-tight
                      ${isSelected ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'}
                    `}>
                      {module.displayName}
                    </span>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-white shadow-sm">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Required Badge */}
                    {isRequired && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center border-2 border-white shadow-sm">
                          <span className="text-white text-sm font-bold">!</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hover Description Tooltip */}
                  {module.description && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-48 text-center z-20">
                      <div className="font-medium mb-1">{module.displayName}</div>
                      <div className="text-gray-300">{module.description}</div>
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : []
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">
              💡 Conseil : Sélectionnez uniquement les modules dont vous avez besoin
            </p>
            <p className="text-sm text-blue-700">
              Vous pourrez toujours ajouter ou retirer des modules plus tard. Les modules obligatoires (Core) sont pré-sélectionnés.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
