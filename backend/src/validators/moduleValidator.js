const Joi = require('joi');

const createModuleSchema = Joi.object({
  name: Joi.string().required().trim().lowercase().pattern(/^[a-z0-9_-]+$/),
  displayName: Joi.string().required().trim().min(2).max(100),
  description: Joi.string().optional().allow('', null).trim(),
  category: Joi.string().required().trim().lowercase(),
  isCore: Joi.boolean().optional().default(false)
});

const updateModuleSchema = Joi.object({
  name: Joi.string().optional().trim().lowercase().pattern(/^[a-z0-9_-]+$/),
  displayName: Joi.string().optional().trim().min(2).max(100),
  description: Joi.string().optional().allow('', null).trim(),
  category: Joi.string().optional().trim().lowercase(),
  isCore: Joi.boolean().optional()
}).min(1);

module.exports = {
  createModuleSchema,
  updateModuleSchema
};
