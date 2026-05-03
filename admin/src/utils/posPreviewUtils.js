// Utility to map selected module IDs to display names for the preview
export function getSelectedModuleDisplayNames(selectedModules, modulesByCategory) {
  // Gérer le cas où modulesByCategory est un tableau au lieu d'un objet
  let allModules = [];
  if (Array.isArray(modulesByCategory)) {
    allModules = modulesByCategory;
  } else {
    allModules = Object.values(modulesByCategory).flat();
  }
  
  const result = selectedModules
    .map(id => {
      const found = allModules.find(m => m.id === id);
      return found;
    })
    .filter(Boolean)
    .map(m => ({ name: m.displayName || m.name }));
  
  // Fallback si aucun module trouvé
  if (result.length === 0) {
    return [{ name: 'Caisse de base' }, { name: 'Rapports' }];
  }
  
  return result;
}
