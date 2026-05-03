const Joi = require('joi');

const createLicenseSchema = Joi.object({
  clientId: Joi.string().required(),
  sector: Joi.string().required().valid('restaurant', 'cafe', 'boutique', 'pharmacy', 'bakery', 'grocery', 'other'),
  licenseType: Joi.string().required().valid('SUBSCRIPTION', 'LIFETIME'),
  expirationDate: Joi.date().when('licenseType', {
    is: 'SUBSCRIPTION',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  machineId: Joi.string().optional().allow('', null),
  moduleIds: Joi.array().items(Joi.string()).optional()
});

const updateLicenseSchema = Joi.object({
  sector: Joi.string().optional().valid('restaurant', 'cafe', 'boutique', 'pharmacy', 'bakery', 'grocery', 'other'),
  licenseType: Joi.string().optional().valid('SUBSCRIPTION', 'LIFETIME'),
  expirationDate: Joi.date().optional().allow(null),
  isActive: Joi.boolean().optional(),
  machineId: Joi.string().optional().allow('', null)
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

const toggleModuleSchema = Joi.object({
  isEnabled: Joi.boolean().required()
});

const expiringQuerySchema = Joi.object({
  days: Joi.number().optional().min(1).max(365).default(30)
});

module.exports = {
  createLicenseSchema,
  updateLicenseSchema,
  updateConfigurationSchema,
  toggleModuleSchema,
  expiringQuerySchema
};
