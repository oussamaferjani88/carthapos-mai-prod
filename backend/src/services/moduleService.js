const moduleRepository = require('../repositories/moduleRepository');
const { NotFoundError, ConflictError } = require('../utils/errors');

class ModuleService {
  async getAllModules() {
    return await moduleRepository.findAll({
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' }
      ]
    });
  }

  async getModuleById(id) {
    const module = await moduleRepository.findById(id);
    if (!module) {
      throw new NotFoundError('Module');
    }
    return module;
  }

  async getModuleByName(name) {
    const module = await moduleRepository.findByName(name);
    if (!module) {
      throw new NotFoundError('Module');
    }
    return module;
  }

  async getModulesByCategory(category) {
    return await moduleRepository.findByCategory(category);
  }

  async getCoreModules() {
    return await moduleRepository.findCoreModules();
  }

  async createModule(data) {
    // Check if module with same name exists
    const existing = await moduleRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError('Module with this name already exists');
    }

    return await moduleRepository.create(data);
  }

  async updateModule(id, data) {
    await this.getModuleById(id);

    // If name is being updated, check for conflicts
    if (data.name) {
      const existing = await moduleRepository.findByName(data.name);
      if (existing && existing.id !== id) {
        throw new ConflictError('Module name already in use');
      }
    }

    return await moduleRepository.update(id, data);
  }

  async deleteModule(id) {
    const module = await this.getModuleById(id);
    
    if (module.isCore) {
      throw new ValidationError('Cannot delete core modules');
    }

    return await moduleRepository.delete(id);
  }

  async getModuleCategories() {
    const modules = await this.getAllModules();
    const categories = [...new Set(modules.map(m => m.category))];
    return categories.sort();
  }

  async getModulesGroupedByCategory() {
    const modules = await this.getAllModules();
    
    // Group modules by category
    const grouped = modules.reduce((acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = [];
      }
      acc[module.category].push(module);
      return acc;
    }, {});

    return grouped;
  }
}

module.exports = new ModuleService();
