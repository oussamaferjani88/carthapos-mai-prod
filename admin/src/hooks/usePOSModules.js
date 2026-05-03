/**
 * usePOSModules Hook
 * Manages module selection and state
 */

import { useState, useEffect } from 'react';
import { moduleService } from '../services';
import toast from 'react-hot-toast';

export const usePOSModules = (initialModules = []) => {
  const [modulesByCategory, setModulesByCategory] = useState({});
  const [selectedModules, setSelectedModules] = useState(initialModules);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load modules by category
   */
  const loadModules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await moduleService.getModulesByCategory();
      // Ensure modulesByCategory is always an object
      setModulesByCategory(data && typeof data === 'object' ? data : {});

      // Auto-select required modules if no modules selected
      if (selectedModules.length === 0) {
        const requiredIds = moduleService.getRequiredModuleIds(data || {});
        setSelectedModules(requiredIds);
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      console.error('Error loading modules:', err);
      // Set empty object on error
      setModulesByCategory({});
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle module selection
   */
  const toggleModule = (moduleId) => {
    // Find the module to check if it's required
    const module = Object.values(modulesByCategory)
      .flat()
      .find(m => m.id === moduleId);

    // Prevent deselecting required modules
    if (module && moduleService.isModuleRequired(module.name)) {
      if (selectedModules.includes(moduleId)) {
        toast.warning('Ce module est obligatoire et ne peut pas être désélectionné');
        return;
      }
    }

    setSelectedModules(prev => {
      const isSelected = prev.includes(moduleId);
      if (isSelected) {
        return prev.filter(id => id !== moduleId);
      } else {
        return [...prev, moduleId];
      }
    });
  };

  /**
   * Set modules based on sector
   */
  const setModulesForSector = (sector) => {
    if (!sector) return;

    const defaultModules = moduleService.getDefaultModulesForSector(
      sector,
      modulesByCategory
    );
    setSelectedModules(defaultModules);
  };

  /**
   * Select all modules in a category
   */
  const selectCategoryModules = (category) => {
    const categoryModules = modulesByCategory[category] || [];
    const categoryIds = categoryModules.map(m => m.id);
    setSelectedModules(prev => [...new Set([...prev, ...categoryIds])]);
  };

  /**
   * Deselect all modules in a category (except required)
   */
  const deselectCategoryModules = (category) => {
    const categoryModules = modulesByCategory[category] || [];
    const categoryIds = categoryModules
      .filter(m => !moduleService.isModuleRequired(m.name))
      .map(m => m.id);
    
    setSelectedModules(prev => prev.filter(id => !categoryIds.includes(id)));
  };

  /**
   * Get selected module display names
   */
  const getSelectedModuleNames = () => {
    return moduleService.getSelectedModuleDisplayNames(selectedModules, modulesByCategory);
  };

  /**
   * Check if module is selected
   */
  const isModuleSelected = (moduleId) => {
    return selectedModules.includes(moduleId);
  };

  /**
   * Check if module is required
   */
  const isModuleRequired = (moduleName) => {
    return moduleService.isModuleRequired(moduleName);
  };

  /**
   * Get module count by category
   */
  const getModuleCountByCategory = (category) => {
    const categoryModules = modulesByCategory[category] || [];
    const selectedCount = categoryModules.filter(m => selectedModules.includes(m.id)).length;
    const totalCount = categoryModules.length;
    return { selected: selectedCount, total: totalCount };
  };

  // Load modules on mount
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
    setSelectedModules
  };
};
