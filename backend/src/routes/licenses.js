const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseController');
const { validate, validateQuery } = require('../middleware/validator');
const {
  createLicenseSchema,
  updateLicenseSchema,
  updateConfigurationSchema,
  toggleModuleSchema,
  expiringQuerySchema
} = require('../validators/licenseValidator');

// Special routes (before :id routes)
router.get('/active', licenseController.getActiveLicenses);
router.get('/expiring', validateQuery(expiringQuerySchema), licenseController.getExpiringSoon);
router.get('/key/:licenseKey', licenseController.getLicenseByKey);
router.get('/client/:clientId', licenseController.getClientLicenses);

// CRUD operations
router.get('/', licenseController.getAllLicenses);
router.get('/:id', licenseController.getLicenseById);
router.post('/', validate(createLicenseSchema), licenseController.createLicense);
router.put('/:id', validate(updateLicenseSchema), licenseController.updateLicense);
router.put('/:id/configuration', validate(updateConfigurationSchema), licenseController.updateConfiguration);
router.patch('/:id/toggle', licenseController.toggleLicenseStatus);
router.delete('/:id', licenseController.deleteLicense);
router.post('/:id/generate-file', licenseController.generateLicenseFile);

// Module management
router.post('/:id/modules/:moduleId', licenseController.attachModule);
router.delete('/:id/modules/:moduleId', licenseController.detachModule);
router.patch('/:id/modules/:moduleId/toggle', validate(toggleModuleSchema), licenseController.toggleModule);

module.exports = router;
