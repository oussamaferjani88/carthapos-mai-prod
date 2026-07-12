export function getSelectedModuleDisplayNames(selectedModules: string[], modulesByCategory: Record<string, any[]>): { name: string }[] {
  let allModules: any[] = [];
  if (Array.isArray(modulesByCategory)) {
    allModules = modulesByCategory;
  } else {
    allModules = Object.values(modulesByCategory).flat();
  }

  const result = selectedModules
    .map(id => {
      const found = allModules.find((m: any) => m.id === id);
      return found;
    })
    .filter(Boolean)
    .map((m: any) => ({ name: m.displayName || m.name }));

  if (result.length === 0) {
    return [{ name: 'Caisse de base' }, { name: 'Rapports' }];
  }

  return result;
}
