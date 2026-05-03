const licenseService = require('../services/licenseService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

class LicenseController {
  // GET /api/v1/licenses
  getAllLicenses = asyncHandler(async (req, res) => {
    const licenses = await licenseService.getAllLicenses();
    return ApiResponse.success(res, licenses, 'Licenses retrieved successfully');
  });

  // GET /api/v1/licenses/:id
  getLicenseById = asyncHandler(async (req, res) => {
    const license = await licenseService.getLicenseById(req.params.id);
    return ApiResponse.success(res, license, 'License retrieved successfully');
  });

  // GET /api/v1/licenses/key/:licenseKey
  getLicenseByKey = asyncHandler(async (req, res) => {
    const license = await licenseService.getLicenseByKey(req.params.licenseKey);
    return ApiResponse.success(res, license, 'License retrieved successfully');
  });

  // GET /api/v1/licenses/client/:clientId
  getClientLicenses = asyncHandler(async (req, res) => {
    const licenses = await licenseService.getClientLicenses(req.params.clientId);
    return ApiResponse.success(res, licenses, 'Client licenses retrieved successfully');
  });

  // POST /api/v1/licenses
  createLicense = asyncHandler(async (req, res) => {
    const license = await licenseService.createLicense(req.body);
    return ApiResponse.created(res, license, 'License created successfully');
  });

  // PUT /api/v1/licenses/:id
  updateLicense = asyncHandler(async (req, res) => {
    const license = await licenseService.updateLicense(req.params.id, req.body);
    return ApiResponse.success(res, license, 'License updated successfully');
  });

  // PUT /api/v1/licenses/:id/configuration
  updateConfiguration = asyncHandler(async (req, res) => {
    const config = await licenseService.updateConfiguration(req.params.id, req.body);
    return ApiResponse.success(res, config, 'License configuration updated successfully');
  });

  // PATCH /api/v1/licenses/:id/toggle
  toggleLicenseStatus = asyncHandler(async (req, res) => {
    const license = await licenseService.toggleLicenseStatus(req.params.id);
    return ApiResponse.success(res, license, 'License status toggled successfully');
  });

  // DELETE /api/v1/licenses/:id
  deleteLicense = asyncHandler(async (req, res) => {
    await licenseService.deleteLicense(req.params.id);
    return ApiResponse.success(res, null, 'License deleted successfully');
  });

  // GET /api/v1/licenses/active
  getActiveLicenses = asyncHandler(async (req, res) => {
    const licenses = await licenseService.getActiveLicenses();
    return ApiResponse.success(res, licenses, 'Active licenses retrieved successfully');
  });

  // GET /api/v1/licenses/expiring?days=30
  getExpiringSoon = asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const licenses = await licenseService.getExpiringSoon(days);
    return ApiResponse.success(res, licenses, 'Expiring licenses retrieved successfully');
  });

  // POST /api/v1/licenses/:id/modules/:moduleId
  attachModule = asyncHandler(async (req, res) => {
    const license = await licenseService.attachModule(req.params.id, req.params.moduleId);
    return ApiResponse.success(res, license, 'Module attached successfully');
  });

  // DELETE /api/v1/licenses/:id/modules/:moduleId
  detachModule = asyncHandler(async (req, res) => {
    const license = await licenseService.detachModule(req.params.id, req.params.moduleId);
    return ApiResponse.success(res, license, 'Module detached successfully');
  });

  // PATCH /api/v1/licenses/:id/modules/:moduleId/toggle
  toggleModule = asyncHandler(async (req, res) => {
    const { isEnabled } = req.body;
    const license = await licenseService.toggleModule(req.params.id, req.params.moduleId, isEnabled);
    return ApiResponse.success(res, license, 'Module toggled successfully');
  });

  // POST /api/v1/licenses/:id/generate-file
  generateLicenseFile = asyncHandler(async (req, res) => {
    const fileData = await licenseService.generateLicenseFile(req.params.id);
    return ApiResponse.success(res, fileData, 'License file generated successfully');
  });
}

module.exports = new LicenseController();
