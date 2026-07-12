import { useState, useEffect } from 'react';
import { moduleService } from '../services';
import toast from 'react-hot-toast';

export const usePOSModules = (initialModules: string[] = []) => {
  const [modulesByCategory, setModulesByCategory] = useState<Record<string, any[]>>({});
  const [selectedModules, setSelectedModules] = useState<string[]>(initialModules);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadModules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await moduleService.getModulesByCategory();
      setModulesByCategory(data && typeof data === 'object' ? data : {});
      if (selectedModules.length === 0) {
        const requiredIds = moduleService.getRequiredModuleIds();
        setSelectedModules(requiredIds);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      setModulesByCategory({});
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    const module = Object.values(modulesByCategory)
      .flat()
      .find((m: any) => m.id === moduleId);

    if (module && moduleService.isModuleRequired(module.name)) {
      if (selectedModules.includes(moduleId)) {
        toast.warning('Ce module est obligatoire et ne peut pas être désélectionné');
        return;
      }
    }

    setSelectedModules((prev) => {
      const isSelected = prev.includes(moduleId);
      return isSelected ? prev.filter((id) => id !== moduleId) : [...prev, moduleId];
    });
  };

  const setModulesForSector = (sector: any) => {
    if (!sector) return;
    const defaultModules = moduleService.getDefaultModulesForSector(sector, modulesByCategory);
    setSelectedModules(defaultModules);
  };

  const selectCategoryModules = (category: string) => {
    const categoryModules = modulesByCategory[category] || [];
    const categoryIds = categoryModules.map((m: any) => m.id);
    setSelectedModules((prev) => [...new Set([...prev, ...categoryIds])]);
  };

  const deselectCategoryModules = (category: string) => {
    const categoryModules = modulesByCategory[category] || [];
    const categoryIds = categoryModules
      .filter((m: any) => !moduleService.isModuleRequired(m.name))
      .map((m: any) => m.id);
    setSelectedModules((prev) => prev.filter((id) => !categoryIds.includes(id)));
  };

  const getSelectedModuleNames = () =>
    moduleService.getSelectedModuleDisplayNames(selectedModules, modulesByCategory);

  const isModuleSelected = (moduleId: string) => selectedModules.includes(moduleId);
  const isModuleRequired = (moduleName: string) => moduleService.isModuleRequired(moduleName);

  const getModuleCountByCategory = (category: string) => {
    const categoryModules = modulesByCategory[category] || [];
    const selectedCount = categoryModules.filter((m: any) => selectedModules.includes(m.id)).length;
    return { selected: selectedCount, total: categoryModules.length };
  };

  useEffect(() => {
    loadModules();
  }, []);

  return {
    modulesByCategory,
    selectedModules,
    loading,
    error,
    loadModules,
    toggleModule,
    setModulesForSector,
    selectCategoryModules,
    deselectCategoryModules,
    getSelectedModuleNames,
    isModuleSelected,
    isModuleRequired,
    getModuleCountByCategory,
    setSelectedModules,
  };
};
