'use strict';

const licenseService = require('../services/licenseService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

class LicenseController {
  // ── Lookups ────────────────────────────────────────────────

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

  // GET /api/v1/licenses/:id/history
  getLicenseHistory = asyncHandler(async (req, res) => {
    const history = await licenseService.getLicenseHistory(req.params.id);
    return ApiResponse.success(res, history, 'License history retrieved successfully');
  });

  // ── Creation / updates ─────────────────────────────────────

  // POST /api/v1/licenses
  createLicense = asyncHandler(async (req, res) => {
    const createdBy = req.user?.username || req.user?.email || req.body.createdBy || 'admin';
    const license = await licenseService.createLicense({ ...req.body, createdBy });
    return ApiResponse.created(res, license, 'License created successfully');
  });

  // POST /api/v1/licenses/admin-create
  adminCreateLicense = asyncHandler(async (req, res) => {
    const createdBy = req.user?.username || req.user?.email || req.body.createdBy || 'admin';
    const license = await licenseService.createLicense({ ...req.body, createdBy });
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

  // POST /api/v1/licenses/:id/generate-file
  generateLicenseFile = asyncHandler(async (req, res) => {
    const fileData = await licenseService.generateLicenseFile(req.params.id, req.body || {});
    return ApiResponse.success(res, fileData, 'License file generated successfully');
  });

  // POST /api/v1/licenses/:id/regenerate
  regenerateSignature = asyncHandler(async (req, res) => {
    const fileData = await licenseService.regenerateSignature(req.params.id, req.body?.performedBy || 'admin');
    return ApiResponse.success(res, fileData, 'License re-signed successfully');
  });

  // ── Activation / binding ───────────────────────────────────

  // POST /api/v1/licenses/:id/activate
  activateLicense = asyncHandler(async (req, res) => {
    const license = await licenseService.activateLicense(req.params.id, {
      machineFingerprint: req.body.machineFingerprint,
      usbDeviceId: req.body.usbDeviceId,
      performedBy: req.body.performedBy || 'admin'
    });
    return ApiResponse.success(res, license, 'License activated successfully');
  });

  // POST /api/v1/licenses/:id/deactivate
  deactivateLicense = asyncHandler(async (req, res) => {
    const license = await licenseService.deactivateLicense(req.params.id, {
      performedBy: req.body.performedBy || 'admin'
    });
    return ApiResponse.success(res, license, 'License deactivated successfully');
  });

  // POST /api/v1/licenses/:id/validate
  validateLicense = asyncHandler(async (req, res) => {
    const result = await licenseService.validateLicense(req.params.id, {
      machineFingerprint: req.body.machineFingerprint,
      usbDeviceId: req.body.usbDeviceId
    });
    return ApiResponse.success(res, result, 'License validation completed');
  });

  // ── Lifecycle ──────────────────────────────────────────────

  // POST /api/v1/licenses/:id/suspend
  suspendLicense = asyncHandler(async (req, res) => {
    const license = await licenseService.suspendLicense(req.params.id, {
      reason: req.body.reason,
      performedBy: req.body.performedBy || 'admin'
    });
    return ApiResponse.success(res, license, 'License suspended successfully');
  });

  // POST /api/v1/licenses/:id/resume
  resumeLicense = asyncHandler(async (req, res) => {
    const license = await licenseService.resumeLicense(req.params.id, {
      performedBy: req.body.performedBy || 'admin'
    });
    return ApiResponse.success(res, license, 'License resumed successfully');
  });

  // POST /api/v1/licenses/:id/revoke
  revokeLicense = asyncHandler(async (req, res) => {
    const license = await licenseService.revokeLicense(req.params.id, {
      reason: req.body.reason,
      performedBy: req.body.performedBy || 'admin'
    });
    return ApiResponse.success(res, license, 'License revoked successfully');
  });

  // POST /api/v1/licenses/:id/renew
  renewLicense = asyncHandler(async (req, res) => {
    const license = await licenseService.renewLicense(req.params.id, {
      expirationDate: req.body.expirationDate,
      performedBy: req.body.performedBy || 'admin'
    });
    return ApiResponse.success(res, license, 'License renewed successfully');
  });

  // POST /api/v1/licenses/:id/extend
  extendLicense = asyncHandler(async (req, res) => {
    const license = await licenseService.extendLicense(req.params.id, {
      days: parseInt(req.body.days) || req.body.days,
      performedBy: req.body.performedBy || 'admin'
    });
    return ApiResponse.success(res, license, 'License extended successfully');
  });

  // POST /api/v1/licenses/:id/transfer
  transferLicense = asyncHandler(async (req, res) => {
    const license = await licenseService.transferLicense(req.params.id, {
      machineFingerprint: req.body.machineFingerprint,
      usbDeviceId: req.body.usbDeviceId,
      performedBy: req.body.performedBy || 'admin'
    });
    return ApiResponse.success(res, license, 'License transferred successfully');
  });

  // POST /api/v1/licenses/:id/reset-binding
  resetBinding = asyncHandler(async (req, res) => {
    const license = await licenseService.resetBinding(req.params.id, {
      performedBy: req.body.performedBy || 'admin'
    });
    return ApiResponse.success(res, license, 'License binding reset successfully');
  });

  // POST /api/v1/licenses/:id/replace
  replaceLicense = asyncHandler(async (req, res) => {
    const result = await licenseService.replaceLicense(req.params.id, {
      ...req.body,
      performedBy: req.body.performedBy || 'admin'
    });
    return ApiResponse.success(res, result, 'License replaced successfully');
  });

  // ── Modules ────────────────────────────────────────────────

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
}

module.exports = new LicenseController();
