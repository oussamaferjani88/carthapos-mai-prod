/**
 * Module Service
 * Handles all module-related API calls
 */

import { modulesApi } from '../lib/api';

class ModuleService {
  /**
   * Get all modules
   * @returns {Promise<Array>} List of modules
   */
  async getAllModules() {
    try {
      const response = await modulesApi.getAll();
      return response.data;
    } catch (error) {
      console.error('Error fetching modules:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch modules');
    }
  }

  /**
   * Modules no longer independent — now part of pos-core
   */
  getDeprecatedModuleSlugs() {
    return ['inventory', 'quick-service'];
  }

  /**
   * Get modules by category, filtering out deprecated ones
   * @returns {Promise<Object>} Modules grouped by category
   */
  async getModulesByCategory() {
    try {
      console.log('Fetching modules by category from API...');
      const response = await modulesApi.getByCategory();
      const data = response.data;
      const deprecated = this.getDeprecatedModuleSlugs();
      const filtered = {};
      for (const [category, modules] of Object.entries(data)) {
        const filteredModules = (modules || []).filter(m => !deprecated.includes(m.name));
        if (filteredModules.length > 0) {
          filtered[category] = filteredModules;
        }
      }
      return filtered;
    } catch (error) {
      console.error('Error fetching modules by category:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      throw new Error(error.response?.data?.error || 'Module not found');
    }
  }

  /**
   * Get module by ID
   * @param {string} moduleId - Module ID
   * @returns {Promise<Object>} Module data
   */
  async getModuleById(moduleId) {
    try {
      const response = await modulesApi.getById(moduleId);
      return response.data;
    } catch (error) {
      console.error('Error fetching module:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch module');
    }
  }

  /**
   * Get required modules (barcode, user-management)
   * @param {Object} modulesByCategory - Modules grouped by category
   * @returns {Array<string>} Array of required module IDs
   */
  getRequiredModuleIds(modulesByCategory) {
    const slugToId = {};
    Object.values(modulesByCategory).flat().forEach(m => {
      slugToId[m.name] = m.id;
    });
    
    // Required modules for a POS install: 'pos-core' (caisse de base), 'reports' (rapports), and 'user-management' (gestion des utilisateurs)
    const requiredModuleSlugs = ['pos-core', 'reports', 'user-management'];
    return requiredModuleSlugs.map(slug => slugToId[slug]).filter(Boolean);
  }

  /**
   * Get default modules for a sector
   * @param {Object} sector - Sector object
   * @param {Object} modulesByCategory - Modules grouped by category
   * @returns {Array<string>} Array of module IDs
   */
  getDefaultModulesForSector(sector, modulesByCategory) {
    const slugToId = {};
    Object.values(modulesByCategory).flat().forEach(m => {
      slugToId[m.name] = m.id;
    });
    
    const defaultModuleIds = (sector.defaultModules || [])
      .map(slug => slugToId[slug])
      .filter(Boolean);
    
    // Always include required modules
    const requiredModuleIds = this.getRequiredModuleIds(modulesByCategory);
    return [...new Set([...defaultModuleIds, ...requiredModuleIds])];
  }

  /**
   * Check if module is required
   * @param {string} moduleName - Module name/slug
   * @returns {boolean}
   */
  isModuleRequired(moduleName) {
    // Required module slugs must match module.name (slug)
    const requiredModuleSlugs = ['pos-core', 'reports', 'user-management'];
    return requiredModuleSlugs.includes(moduleName);
  }

  /**
   * Get selected module display names
   * @param {Array<string>} selectedModuleIds - Array of selected module IDs
   * @param {Object} modulesByCategory - Modules grouped by category
   * @returns {Array<Object>} Array of module objects with display names
   */
  getSelectedModuleDisplayNames(selectedModuleIds, modulesByCategory) {
    const allModules = Object.values(modulesByCategory).flat();
    return selectedModuleIds
      .map(id => allModules.find(m => m.id === id))
      .filter(Boolean)
      .map(m => ({
        id: m.id,
        name: m.displayName || m.name,
        slug: m.name,
        category: m.category
      }));
  }
}

export default new ModuleService();
