const Joi = require('joi');

/**
 * User validation schemas
 */

// User roles enum
const USER_ROLES = ['ADMIN', 'MANAGER', 'CASHIER'];

// Create user validation
const createUserSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username must not exceed 50 characters',
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      'any.required': 'Username is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required'
    }),
  role: Joi.string()
    .valid(...USER_ROLES)
    .default('CASHIER')
    .messages({
      'any.only': `Role must be one of: ${USER_ROLES.join(', ')}`
    })
});

// Update user validation
const updateUserSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .messages({
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username must not exceed 50 characters',
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
    }),
  email: Joi.string()
    .email()
    .messages({
      'string.email': 'Email must be a valid email address'
    }),
  password: Joi.string()
    .min(6)
    .messages({
      'string.min': 'Password must be at least 6 characters'
    }),
  role: Joi.string()
    .valid(...USER_ROLES)
    .messages({
      'any.only': `Role must be one of: ${USER_ROLES.join(', ')}`
    }),
  isActive: Joi.boolean()
}).min(1); // At least one field must be provided

// Login validation
const loginSchema = Joi.object({
  username: Joi.string()
    .required()
    .messages({
      'any.required': 'Username or email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// User ID validation (for params)
const userIdSchema = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'any.required': 'User ID is required'
    })
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  loginSchema,
  userIdSchema
};
