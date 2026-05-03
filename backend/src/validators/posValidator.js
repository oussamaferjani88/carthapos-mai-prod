const Joi = require('joi');

/**
 * POS validation schemas
 */

// Generate POS validation
const generatePOSSchema = Joi.object({
  licenseId: Joi.string()
    .required()
    .messages({
      'any.required': 'License ID is required'
    }),
  outputPath: Joi.string()
    .optional()
});

// Build POS validation
const buildPOSSchema = Joi.object({
  projectPath: Joi.string()
    .required()
    .messages({
      'any.required': 'Project path is required'
    }),
  platform: Joi.string()
    .valid('win', 'mac', 'linux')
    .default('win')
    .messages({
      'any.only': 'Platform must be one of: win, mac, linux'
    })
});

// Download installer validation (query params)
const downloadInstallerQuerySchema = Joi.object({
  path: Joi.string()
    .required()
    .messages({
      'any.required': 'Path parameter is required'
    })
});

module.exports = {
  generatePOSSchema,
  buildPOSSchema,
  downloadInstallerQuerySchema
};
