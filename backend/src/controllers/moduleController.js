const moduleService = require('../services/moduleService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

class ModuleController {
  // GET /api/v1/modules
  getAllModules = asyncHandler(async (req, res) => {
    const modules = await moduleService.getAllModules();
    return ApiResponse.success(res, modules, 'Modules retrieved successfully');
  });

  // GET /api/v1/modules/:id
  getModuleById = asyncHandler(async (req, res) => {
    const module = await moduleService.getModuleById(req.params.id);
    return ApiResponse.success(res, module, 'Module retrieved successfully');
  });

  // GET /api/v1/modules/category/:category
  getModulesByCategory = asyncHandler(async (req, res) => {
    const modules = await moduleService.getModulesByCategory(req.params.category);
    return ApiResponse.success(res, modules, 'Modules retrieved successfully');
  });

  // GET /api/v1/modules/core
  getCoreModules = asyncHandler(async (req, res) => {
    const modules = await moduleService.getCoreModules();
    return ApiResponse.success(res, modules, 'Core modules retrieved successfully');
  });

  // GET /api/v1/modules/categories
  getModuleCategories = asyncHandler(async (req, res) => {
    const categories = await moduleService.getModuleCategories();
    return ApiResponse.success(res, categories, 'Categories retrieved successfully');
  });

  // GET /api/modules/by-category (backward compatibility)
  getModulesGroupedByCategory = asyncHandler(async (req, res) => {
    const modules = await moduleService.getModulesGroupedByCategory();
    return ApiResponse.success(res, modules, 'Modules grouped by category retrieved successfully');
  });

  // POST /api/v1/modules
  createModule = asyncHandler(async (req, res) => {
    const module = await moduleService.createModule(req.body);
    return ApiResponse.created(res, module, 'Module created successfully');
  });

  // PUT /api/v1/modules/:id
  updateModule = asyncHandler(async (req, res) => {
    const module = await moduleService.updateModule(req.params.id, req.body);
    return ApiResponse.success(res, module, 'Module updated successfully');
  });

  // DELETE /api/v1/modules/:id
  deleteModule = asyncHandler(async (req, res) => {
    await moduleService.deleteModule(req.params.id);
    return ApiResponse.success(res, null, 'Module deleted successfully');
  });
}

module.exports = new ModuleController();
