const Joi = require('joi');

const validSectors = ['restaurant', 'cafe', 'boutique', 'retail', 'pharmacy', 'bakery', 'grocery', 'beauty', 'other'];
const validBindingTypes = ['MACHINE', 'USB', 'HYBRID'];

const createLicenseSchema = Joi.object({
  clientId: Joi.string().required(),
  sector: Joi.string().required().valid(...validSectors),
  licenseType: Joi.string().required().valid('SUBSCRIPTION', 'LIFETIME'),
  bindingType: Joi.string().optional().valid(...validBindingTypes).default('MACHINE'),
  expirationDate: Joi.date().when('licenseType', {
    is: 'SUBSCRIPTION',
    then: Joi.required(),
    otherwise: Joi.allow(null, '')
  }),
  machineId: Joi.string().optional().allow('', null),
  moduleIds: Joi.array().items(Joi.string()).optional(),
  modules: Joi.array().items(Joi.string()).optional(),
  configuration: Joi.object().optional(),
  createdBy: Joi.string().optional().allow('', null)
});

const adminCreateLicenseSchema = createLicenseSchema;

const updateLicenseSchema = Joi.object({
  sector: Joi.string().optional().valid(...validSectors),
  licenseType: Joi.string().optional().valid('SUBSCRIPTION', 'LIFETIME'),
  expirationDate: Joi.date().optional().allow(null)
}).min(1);

const updateConfigurationSchema = Joi.object({
  businessName: Joi.string().optional().trim(),
  appTitle: Joi.string().optional().allow('', null).trim(),
  logo: Joi.string().optional().allow('', null),
  primaryColor: Joi.string().optional().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  secondaryColor: Joi.string().optional().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  accentColor: Joi.string().optional().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  backgroundColor: Joi.string().optional().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  textColor: Joi.string().optional().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  fontFamily: Joi.string().optional(),
  borderRadius: Joi.string().optional().valid('none', 'small', 'medium', 'large'),
  currency: Joi.string().optional().length(3).uppercase(),
  taxRate: Joi.number().optional().min(0).max(100),
  language: Joi.string().optional().valid('fr', 'en', 'ar'),
  timezone: Joi.string().optional(),
  navbarPosition: Joi.string().optional().allow('', null)
}).min(1);

const generateLicenseFileSchema = Joi.object({
  machineId: Joi.string().optional().allow('', null),
  machineFingerprint: Joi.string().optional().allow('', null),
  usbDeviceId: Joi.string().optional().allow('', null)
});

const activateLicenseSchema = Joi.object({
  machineFingerprint: Joi.string().optional().allow('', null),
  usbDeviceId: Joi.string().optional().allow('', null),
  performedBy: Joi.string().optional().allow('', null)
});

const validateLicenseSchema = Joi.object({
  machineFingerprint: Joi.string().optional().allow('', null),
  usbDeviceId: Joi.string().optional().allow('', null)
});

const suspendRevokeSchema = Joi.object({
  reason: Joi.string().optional().allow('', null),
  performedBy: Joi.string().optional().allow('', null)
});

const renewLicenseSchema = Joi.object({
  expirationDate: Joi.date().required(),
  performedBy: Joi.string().optional().allow('', null)
});

const extendLicenseSchema = Joi.object({
  days: Joi.number().integer().min(1).max(3650).required(),
  performedBy: Joi.string().optional().allow('', null)
});

const transferLicenseSchema = Joi.object({
  machineFingerprint: Joi.string().optional().allow('', null),
  usbDeviceId: Joi.string().optional().allow('', null),
  performedBy: Joi.string().optional().allow('', null)
}).min(1);

const replaceLicenseSchema = Joi.object({
  clientId: Joi.string().optional(),
  sector: Joi.string().optional().valid(...validSectors),
  licenseType: Joi.string().optional().valid('SUBSCRIPTION', 'LIFETIME'),
  expirationDate: Joi.date().optional().allow(null, ''),
  moduleIds: Joi.array().items(Joi.string()).optional(),
  modules: Joi.array().items(Joi.string()).optional(),
  configuration: Joi.object().optional(),
  performedBy: Joi.string().optional().allow('', null)
});

const toggleModuleSchema = Joi.object({
  isEnabled: Joi.boolean().required()
});

const expiringQuerySchema = Joi.object({
  days: Joi.number().optional().min(1).max(365).default(30)
});

module.exports = {
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
};
