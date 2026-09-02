const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./index');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CarthaPos API',
      version: '1.0.0',
      description: 'CarthaPos - Point of Sale as a Service (POSaaS) API Documentation',
      contact: {
        name: 'CarthaPos Support',
        email: 'support@carthapos.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.app.port}`,
        description: 'Development server'
      },
      {
        url: 'https://api.carthapos.com',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Users',
        description: 'User management and authentication'
      },
      {
        name: 'Clients',
        description: 'Client management operations'
      },
      {
        name: 'Licenses',
        description: 'License management and configuration'
      },
      {
        name: 'Modules',
        description: 'POS module management'
      },
      {
        name: 'USB',
        description: 'USB drive operations and license writing'
      },
      {
        name: 'POS',
        description: 'POS application generation and building'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Validation failed'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string'
                  },
                  message: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890'
            },
            username: {
              type: 'string',
              example: 'john_doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'MANAGER', 'BI_SPECIALIST'],
              example: 'MANAGER'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              nullable: true
            }
          }
        },
        Client: {
          type: 'object',
          properties: {
            id: {
              type: 'string'
            },
            name: {
              type: 'string',
              example: 'Acme Corporation'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'contact@acme.com'
            },
            phone: {
              type: 'string',
              example: '+1234567890',
              nullable: true
            },
            address: {
              type: 'string',
              example: '123 Main St, City, Country',
              nullable: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        License: {
          type: 'object',
          properties: {
            id: {
              type: 'string'
            },
            licenseKey: {
              type: 'string',
              example: 'CARTHA-XXXX-XXXX-XXXX'
            },
            clientId: {
              type: 'string'
            },
            sector: {
              type: 'string',
              example: 'restaurant'
            },
            licenseType: {
              type: 'string',
              enum: ['SUBSCRIPTION', 'LIFETIME']
            },
            expirationDate: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            isActive: {
              type: 'boolean'
            }
          }
        },
        Module: {
          type: 'object',
          properties: {
            id: {
              type: 'string'
            },
            name: {
              type: 'string',
              example: 'pos-core'
            },
            displayName: {
              type: 'string',
              example: 'POS Core'
            },
            description: {
              type: 'string'
            },
            category: {
              type: 'string',
              example: 'core'
            },
            isCore: {
              type: 'boolean'
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Invalid input',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError'
              }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized - Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFound: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        Conflict: {
          description: 'Conflict - Resource already exists',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        TooManyRequests: {
          description: 'Too Many Requests - Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'string',
                    example: 'Too many requests from this IP, please try again later.'
                  },
                  retryAfter: {
                    type: 'string',
                    example: '15 minutes'
                  }
                }
              }
            }
          }
        },
        ServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.js', // Path to the API routes
    './routes/*.js' // Legacy routes
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec
};
