# 🧪 API Testing Guide - CarthaPos v2

## Quick Test Commands

### **Health Check**
```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-03T...",
  "uptime": 123.45,
  "environment": "development",
  "database": "connected",
  "memory": {
    "used": "45 MB",
    "total": "100 MB"
  }
}
```

---

## 📋 Clients API (v1)

### **Get All Clients**
```bash
curl http://localhost:3001/api/v1/clients
```

### **Create Client**
```bash
curl -X POST http://localhost:3001/api/v1/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "email": "test@example.com",
    "phone": "+1234567890",
    "address": "123 Test St"
  }'
```

### **Get Client by ID**
```bash
curl http://localhost:3001/api/v1/clients/{clientId}
```

### **Update Client**
```bash
curl -X PUT http://localhost:3001/api/v1/clients/{clientId} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Client Name",
    "phone": "+9876543210"
  }'
```

### **Search Clients**
```bash
curl "http://localhost:3001/api/v1/clients/search?q=test"
```

### **Delete Client**
```bash
curl -X DELETE http://localhost:3001/api/v1/clients/{clientId}
```

---

## 🔑 Licenses API (v1)

### **Get All Licenses**
```bash
curl http://localhost:3001/api/v1/licenses
```

### **Create License**
```bash
curl -X POST http://localhost:3001/api/v1/licenses \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "{clientId}",
    "sector": "restaurant",
    "licenseType": "LIFETIME",
    "moduleIds": ["module-id-1", "module-id-2"]
  }'
```

### **Create Subscription License**
```bash
curl -X POST http://localhost:3001/api/v1/licenses \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "{clientId}",
    "sector": "cafe",
    "licenseType": "SUBSCRIPTION",
    "expirationDate": "2026-12-31",
    "moduleIds": ["module-id-1"]
  }'
```

### **Get License by ID**
```bash
curl http://localhost:3001/api/v1/licenses/{licenseId}
```

### **Get Client Licenses**
```bash
curl http://localhost:3001/api/v1/licenses/client/{clientId}
```

### **Get Active Licenses**
```bash
curl http://localhost:3001/api/v1/licenses/active
```

### **Get Expiring Licenses**
```bash
curl "http://localhost:3001/api/v1/licenses/expiring?days=30"
```

### **Update License Configuration**
```bash
curl -X PUT http://localhost:3001/api/v1/licenses/{licenseId}/configuration \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "My Restaurant",
    "primaryColor": "#FF5733",
    "secondaryColor": "#1E40AF",
    "logo": "base64-encoded-logo",
    "currency": "USD",
    "taxRate": 10.5
  }'
```

### **Toggle License Status**
```bash
curl -X PATCH http://localhost:3001/api/v1/licenses/{licenseId}/toggle
```

### **Attach Module to License**
```bash
curl -X POST http://localhost:3001/api/v1/licenses/{licenseId}/modules/{moduleId}
```

### **Detach Module from License**
```bash
curl -X DELETE http://localhost:3001/api/v1/licenses/{licenseId}/modules/{moduleId}
```

### **Toggle Module**
```bash
curl -X PATCH http://localhost:3001/api/v1/licenses/{licenseId}/modules/{moduleId}/toggle \
  -H "Content-Type: application/json" \
  -d '{
    "isEnabled": false
  }'
```

---

## 📦 Modules API (v1)

### **Get All Modules**
```bash
curl http://localhost:3001/api/v1/modules
```

### **Get Core Modules**
```bash
curl http://localhost:3001/api/v1/modules/core
```

### **Get Module Categories**
```bash
curl http://localhost:3001/api/v1/modules/categories
```

### **Get Modules by Category**
```bash
curl http://localhost:3001/api/v1/modules/category/stock
```

### **Create Module**
```bash
curl -X POST http://localhost:3001/api/v1/modules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "inventory-management",
    "displayName": "Inventory Management",
    "description": "Track stock levels and inventory",
    "category": "stock",
    "isCore": false
  }'
```

### **Update Module**
```bash
curl -X PUT http://localhost:3001/api/v1/modules/{moduleId} \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Advanced Inventory",
    "description": "Updated description"
  }'
```

### **Delete Module**
```bash
curl -X DELETE http://localhost:3001/api/v1/modules/{moduleId}
```

---

## ✅ Validation Error Examples

### **Invalid Email**
```bash
curl -X POST http://localhost:3001/api/v1/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "invalid-email"
  }'
```

**Response:**
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

### **Missing Required Fields**
```bash
curl -X POST http://localhost:3001/api/v1/licenses \
  -H "Content-Type: application/json" \
  -d '{
    "sector": "restaurant"
  }'
```

**Response:**
```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "clientId",
      "message": "\"clientId\" is required"
    },
    {
      "field": "licenseType",
      "message": "\"licenseType\" is required"
    }
  ]
}
```

---

## 🔄 Backward Compatibility Tests

All old endpoints still work:

```bash
# Old endpoint (still works)
curl http://localhost:3001/api/clients

# New endpoint (recommended)
curl http://localhost:3001/api/v1/clients
```

---

## 🧪 Using Postman

### **Import Collection**
1. Create new collection: "CarthaPos API v1"
2. Set base URL: `http://localhost:3001/api/v1`
3. Add requests from above

### **Environment Variables**
```json
{
  "baseUrl": "http://localhost:3001",
  "apiVersion": "v1",
  "clientId": "",
  "licenseId": "",
  "moduleId": ""
}
```

---

## 📊 Response Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET request successful |
| 201 | Created | POST request created resource |
| 400 | Bad Request | Validation failed |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry (e.g., email) |
| 500 | Server Error | Internal error |

---

## 🎯 Test Workflow

### **1. Create a Client**
```bash
curl -X POST http://localhost:3001/api/v1/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Restaurant ABC",
    "email": "abc@restaurant.com",
    "phone": "+1234567890"
  }'
```
→ Save the returned `id` as `{clientId}`

### **2. Create a License**
```bash
curl -X POST http://localhost:3001/api/v1/licenses \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "{clientId}",
    "sector": "restaurant",
    "licenseType": "LIFETIME"
  }'
```
→ Save the returned `id` as `{licenseId}`

### **3. Configure the License**
```bash
curl -X PUT http://localhost:3001/api/v1/licenses/{licenseId}/configuration \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Restaurant ABC",
    "primaryColor": "#FF5733",
    "currency": "USD"
  }'
```

### **4. Get Client with Licenses**
```bash
curl http://localhost:3001/api/v1/clients/{clientId}/licenses
```

---

**Happy Testing! 🚀**
