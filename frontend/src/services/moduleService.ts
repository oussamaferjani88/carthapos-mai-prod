import { modulesApi } from '../lib/api';

class ModuleService {
  async getAllModules() {
    try {
      const response = await modulesApi.getAll();
      return response.data;
    } catch (error: any) {
      console.error('Error fetching modules:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch modules');
    }
  }

  async getModulesByCategory() {
    try {
      const response = await modulesApi.getByCategory();
      return response.data;
    } catch (error: any) {
      console.error('Error fetching modules by category:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch modules by category');
    }
  }

  async getModuleById(id: string) {
    try {
      const response = await modulesApi.getById(id);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching module:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch module');
    }
  }

  getRequiredModuleIds(): string[] {
    return ['pos-core', 'reports', 'user-management'];
  }

  getDefaultModulesForSector(sector: any, modulesByCategory: Record<string, any[]>): string[] {
    if (!sector?.defaultModules) return this.getRequiredModuleIds();
    const required = this.getRequiredModuleIds();
    const defaults = sector.defaultModules.filter((m: string) => !required.includes(m));
    return [...required, ...defaults];
  }

  isModuleRequired(moduleName: string): boolean {
    return ['pos-core', 'reports', 'user-management'].includes(moduleName);
  }

  getSelectedModuleDisplayNames(selectedModuleIds: string[], modulesByCategory: Record<string, any[]>): string[] {
    const allModules = Object.values(modulesByCategory).flat();
    return selectedModuleIds
      .map((id) => allModules.find((m: any) => m.id === id))
      .filter(Boolean)
      .map((m: any) => m.displayName);
  }
}

export default new ModuleService();
