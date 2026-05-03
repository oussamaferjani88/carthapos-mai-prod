# Backend Architecture - CarthaPos

## 📁 New Structure

```
backend/
├── server.js                    # Old server (legacy)
├── server-v2.js                 # New server with clean architecture
├── src/
│   ├── config/                  # Configuration
│   │   ├── index.js            # App configuration
│   │   └── database.js         # Database connection
│   ├── controllers/             # HTTP request handlers
│   │   ├── clientController.js
│   │   ├── licenseController.js
│   │   └── moduleController.js
│   ├── services/                # Business logic
│   │   ├── clientService.js
│   │   ├── licenseService.js
│   │   └── moduleService.js
│   ├── repositories/            # Data access layer
│   │   ├── BaseRepository.js
│   │   ├── clientRepository.js
│   │   ├── licenseRepository.js
│   │   └── moduleRepository.js
│   ├── validators/              # Request validation schemas
│   │   ├── clientValidator.js
│   │   ├── licenseValidator.js
│   │   └── moduleValidator.js
│   ├── middleware/              # Express middleware
│   │   ├── errorHandler.js     # Error handling
│   │   └── validator.js        # Validation middleware
│   ├── utils/                   # Helper functions
│   │   ├── errors.js           # Custom error classes
│   │   └── apiResponse.js      # Standardized responses
│   └── routes/                  # API routes (new)
│       ├── health.js
│       ├── clients.js
│       ├── licenses.js
│       └── modules.js
├── routes/                      # Old routes (legacy)
├── middleware/                  # Old middleware
├── utils/                       # Old utilities
└── prisma/                      # Database
    ├── schema.prisma
    ├── migrations/
    └── seed.js
```

---

## 🎯 Architecture Layers

### **1. Controllers** (`src/controllers/`)
- Handle HTTP requests and responses
- Validate input (using validators)
- Call service methods
- Return standardized API responses

**Example:**
```javascript
const clientService = require('../services/clientService');
const ApiResponse = require('../utils/apiResponse');

class ClientController {
  getAllClients = asyncHandler(async (req, res) => {
    const clients = await clientService.getAllClients();
    return ApiResponse.success(res, clients);
  });
}
```

### **2. Services** (`src/services/`)
- Contain business logic
- Orchestrate operations across repositories
- Handle complex workflows
- Throw custom errors

**Example:**
```javascript
const clientRepository = require('../repositories/clientRepository');

class ClientService {
  async createClient(data) {
    // Check for duplicates
    const existing = await clientRepository.findByEmail(data.email);
    if (existing) throw new ConflictError('Email already exists');
    
    // Create client
    return await clientRepository.create(data);
  }
}
```

### **3. Repositories** (`src/repositories/`)
- Abstract database operations
- Encapsulate Prisma queries
- Provide reusable data access methods
- No business logic

**Example:**
```javascript
class ClientRepository extends BaseRepository {
  async findByEmail(email) {
    return await this.model.findUnique({ where: { email } });
  }
}
```

### **4. Validators** (`src/validators/`)
- Define Joi validation schemas
- Validate request body, query, and params
- Reusable across routes

**Example:**
```javascript
const createClientSchema = Joi.object({
  name: Joi.string().required().min(2),
  email: Joi.string().required().email()
});
```

### **5. Middleware** (`src/middleware/`)
- Error handling
- Request validation
- Authentication (JWT)
- Logging

### **6. Utils** (`src/utils/`)
- Custom error classes
- API response formatters
- Helper functions

---

## 🚀 How to Use

### **Start New Server:**
```bash
# Development
npm run dev:v2

# Production
npm run start:v2
```

### **API Versioning:**
```
# New API (recommended)
GET /api/v1/clients
GET /api/v1/licenses
GET /api/v1/modules

# Legacy API (backward compatibility)
GET /api/clients
GET /api/licenses
GET /api/modules
```

---

## 📝 Creating New Endpoints

### **1. Create Validator** (`src/validators/`)
```javascript
// src/validators/productValidator.js
const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().required().min(0)
});

module.exports = { createProductSchema };
```

### **2. Create Repository** (`src/repositories/`)
```javascript
// src/repositories/productRepository.js
const BaseRepository = require('./BaseRepository');
const prisma = require('../config/database');

class ProductRepository extends BaseRepository {
  constructor() {
    super(prisma.product);
  }

  async findByCategory(category) {
    return await this.model.findMany({ where: { category } });
  }
}

module.exports = new ProductRepository();
```

### **3. Create Service** (`src/services/`)
```javascript
// src/services/productService.js
const productRepository = require('../repositories/productRepository');
const { NotFoundError } = require('../utils/errors');

class ProductService {
  async getAllProducts() {
    return await productRepository.findAll();
  }

  async createProduct(data) {
    return await productRepository.create(data);
  }
}

module.exports = new ProductService();
```

### **4. Create Controller** (`src/controllers/`)
```javascript
// src/controllers/productController.js
const productService = require('../services/productService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

class ProductController {
  getAllProducts = asyncHandler(async (req, res) => {
    const products = await productService.getAllProducts();
    return ApiResponse.success(res, products);
  });
}

module.exports = new ProductController();
```

### **5. Create Routes** (`src/routes/`)
```javascript
// src/routes/products.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { validate } = require('../middleware/validator');
const { createProductSchema } = require('../validators/productValidator');

router.get('/', productController.getAllProducts);
router.post('/', validate(createProductSchema), productController.createProduct);

module.exports = router;
```

### **6. Register Route in Server**
```javascript
// server-v2.js
const productRoutes = require('./src/routes/products');
app.use('/api/v1/products', productRoutes);
```

---

## ✅ Benefits

### **Separation of Concerns**
- Controllers → HTTP handling
- Services → Business logic
- Repositories → Data access
- Validators → Input validation

### **Testability**
- Each layer can be tested independently
- Easy to mock dependencies
- Unit tests for services
- Integration tests for controllers

### **Maintainability**
- Clear structure
- Easy to find code
- Consistent patterns
- Reusable components

### **Scalability**
- Easy to add new features
- Modular architecture
- Can extract services to microservices
- Database-agnostic (through repositories)

---

## 🔄 Migration Plan

1. ✅ **Phase 1:** Create new architecture (Done)
   - Folder structure
   - Base classes
   - Config layer
   - Error handling

2. ✅ **Phase 2:** Migrate core endpoints (Done)
   - Clients API
   - Licenses API
   - Modules API

3. **Phase 3:** Migrate remaining endpoints
   - USB API
   - POS generation API
   - Module-specific APIs

4. **Phase 4:** Add enhancements
   - Rate limiting
   - Caching (Redis)
   - Message queue
   - Logging (Winston)
   - Monitoring

5. **Phase 5:** Remove legacy code
   - Delete old routes
   - Delete old server.js
   - Rename server-v2.js to server.js

---

## 📊 API Response Format

### **Success Response:**
```json
{
  "status": "success",
  "message": "Clients retrieved successfully",
  "data": [...]
}
```

### **Error Response:**
```json
{
  "status": "error",
  "message": "Client not found"
}
```

### **Validation Error:**
```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email"
    }
  ]
}
```

---

## 🛠️ Environment Variables

```env
# App
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/carthapos

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*

# POS Generation
GENERATED_POS_PATH=./generated-pos
POS_TEMPLATE_PATH=./pos-template
```

---

## 📚 Next Steps

1. Add unit tests for services
2. Add integration tests for controllers
3. Implement rate limiting
4. Add Redis caching
5. Set up Winston logging
6. Add Swagger documentation
7. Migrate remaining endpoints

---

**Version:** 2.0  
**Last Updated:** November 3, 2025  
**Status:** Production Ready (for migrated endpoints)
