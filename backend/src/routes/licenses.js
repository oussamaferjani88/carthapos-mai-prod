'use strict';

const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseController');
const { validate, validateQuery } = require('../middleware/validator');
const { createLimiter, licenseActionLimiter, licenseValidateLimiter } = require('../middleware/rateLimiter');
const { adminAuth } = require('../../middleware/auth');
const { requirePermission, requirePermissionForAdmin } = require('../../middleware/permissions');
const {
  createLicenseSchema,
  adminCreateLicenseSchema,
  updateLicenseSchema,
  updateConfigurationSchema,
  generateLicenseFileSchema,
  activateLicenseSchema,
  validateLicenseSchema,
  suspendRevokeSchema,
  renewLicenseSchema,
  extendLicenseSchema,
  transferLicenseSchema,
  replaceLicenseSchema,
  toggleModuleSchema,
  expiringQuerySchema
} = require('../validators/licenseValidator');

// Special routes (before :id routes)
router.get('/active', adminAuth, requirePermission('licenses.view'), licenseController.getActiveLicenses);
router.get('/expiring', adminAuth, requirePermission('licenses.view'), validateQuery(expiringQuerySchema), licenseController.getExpiringSoon);
router.get('/key/:licenseKey', licenseController.getLicenseByKey);
router.get('/client/:clientId', licenseController.getClientLicenses);

// CRUD operations
// NOTE: GET /, GET /:id and POST / are shared with the web client portal
// (frontend/). They are permission-enforced ONLY for admin sessions via
// requirePermissionForAdmin — unauthenticated portal/POS requests pass through.
router.get('/', requirePermissionForAdmin('licenses.view'), licenseController.getAllLicenses);
router.get('/:id', requirePermissionForAdmin('licenses.view'), licenseController.getLicenseById);
router.get('/:id/history', adminAuth, requirePermission('licenses.view'), licenseController.getLicenseHistory);
router.post('/', requirePermissionForAdmin('licenses.create'), createLimiter, validate(createLicenseSchema), licenseController.createLicense);
router.post('/admin-create', adminAuth, requirePermission('licenses.create'), createLimiter, validate(adminCreateLicenseSchema), licenseController.adminCreateLicense);
router.put('/:id', adminAuth, requirePermission('licenses.update'), validate(updateLicenseSchema), licenseController.updateLicense);
router.put('/:id/configuration', adminAuth, requirePermission('licenses.update'), validate(updateConfigurationSchema), licenseController.updateConfiguration);
router.patch('/:id/toggle', adminAuth, requirePermission('licenses.update'), licenseController.toggleLicenseStatus);
router.delete('/:id', adminAuth, requirePermission('licenses.delete'), licenseController.deleteLicense);
router.post('/:id/generate-file', licenseActionLimiter, validate(generateLicenseFileSchema), licenseController.generateLicenseFile);
router.post('/:id/regenerate', adminAuth, requirePermission('licenses.update'), licenseActionLimiter, licenseController.regenerateSignature);

// Activation / binding
// activate / validate / generate-file must stay public (Electron POS runtime).
router.post('/:id/activate', licenseActionLimiter, validate(activateLicenseSchema), licenseController.activateLicense);
router.post('/:id/deactivate', adminAuth, requirePermission('licenses.update'), licenseActionLimiter, licenseController.deactivateLicense);
router.post('/:id/validate', licenseValidateLimiter, validate(validateLicenseSchema), licenseController.validateLicense);

// Lifecycle (admin panel)
router.post('/:id/suspend', adminAuth, requirePermission('licenses.suspend'), licenseActionLimiter, validate(suspendRevokeSchema), licenseController.suspendLicense);
router.post('/:id/resume', adminAuth, requirePermission('licenses.update'), licenseActionLimiter, licenseController.resumeLicense);
router.post('/:id/revoke', adminAuth, requirePermission('licenses.revoke'), licenseActionLimiter, validate(suspendRevokeSchema), licenseController.revokeLicense);
router.post('/:id/renew', adminAuth, requirePermission('licenses.update'), licenseActionLimiter, validate(renewLicenseSchema), licenseController.renewLicense);
router.post('/:id/extend', adminAuth, requirePermission('licenses.update'), licenseActionLimiter, validate(extendLicenseSchema), licenseController.extendLicense);
router.post('/:id/transfer', adminAuth, requirePermission('licenses.update'), licenseActionLimiter, validate(transferLicenseSchema), licenseController.transferLicense);
router.post('/:id/reset-binding', adminAuth, requirePermission('licenses.update'), licenseActionLimiter, licenseController.resetBinding);
router.post('/:id/replace', adminAuth, requirePermission('licenses.update'), licenseActionLimiter, validate(replaceLicenseSchema), licenseController.replaceLicense);

// Module management (admin panel)
router.post('/:id/modules/:moduleId', adminAuth, requirePermission('licenses.update'), licenseActionLimiter, licenseController.attachModule);
router.delete('/:id/modules/:moduleId', adminAuth, requirePermission('licenses.update'), licenseActionLimiter, licenseController.detachModule);
router.patch('/:id/modules/:moduleId/toggle', adminAuth, requirePermission('licenses.update'), licenseActionLimiter, validate(toggleModuleSchema), licenseController.toggleModule);

module.exports = router;
