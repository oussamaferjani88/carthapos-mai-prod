const Joi = require('joi');

const createClientSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(100),
  email: Joi.string().required().email().trim().lowercase(),
  phone: Joi.string().optional().allow('', null).trim(),
  address: Joi.string().optional().allow('', null).trim()
});

const updateClientSchema = Joi.object({
  name: Joi.string().optional().trim().min(2).max(100),
  email: Joi.string().optional().email().trim().lowercase(),
  phone: Joi.string().optional().allow('', null).trim(),
  address: Joi.string().optional().allow('', null).trim()
}).min(1);

const searchClientSchema = Joi.object({
  q: Joi.string().optional().allow('').trim()
});

module.exports = {
  createClientSchema,
  updateClientSchema,
  searchClientSchema
};
