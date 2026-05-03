const Joi = require('joi');

/**
 * USB validation schemas
 */

// Write license validation
const writeLicenseSchema = Joi.object({
  drivePath: Joi.string()
    .required()
    .messages({
      'any.required': 'Drive path is required'
    }),
  licenseContent: Joi.string()
    .required()
    .messages({
      'any.required': 'License content is required'
    }),
  licenseKey: Joi.string()
    .required()
    .messages({
      'any.required': 'License key is required'
    })
});

// Verify license validation (params)
const verifyLicenseParamsSchema = Joi.object({
  drivePath: Joi.string()
    .required()
    .messages({
      'any.required': 'Drive path is required'
    })
});

module.exports = {
  writeLicenseSchema,
  verifyLicenseParamsSchema
};
