# JWT Authentication Implementation - CarthaPos

## 🎯 Overview

This document describes the complete JWT (JSON Web Token) authentication system implemented for the CarthaPos admin panel, providing secure multi-user authentication with token-based session management.

---

## 📋 What Was Implemented

### ✅ Backend Authentication

#### 1. **JWT Middleware** (`backend/middleware/auth.js`)
- `generateToken(user)` - Creates JWT tokens with 7-day expiration
- `verifyToken` - Middleware to protect API routes
- `optionalAuth` - Optional authentication (doesn't block if token missing)
- `requireRole(...roles)` - Role-based authorization
- Token format: `Bearer <token>`
- Error codes: `NO_TOKEN`, `TOKEN_EXPIRED`, `INVALID_TOKEN`

#### 2. **Updated User Login** (`backend/routes/users.js`)
```javascript
// Before (returns plain user object):
res.json({ id: 1, username: "admin", ... })

// After (returns JWT token + user):
res.json({
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: { id: 1, username: "admin", role: "ADMIN", ... }
})
```

#### 3. **Protected API Routes** (`backend/server.js`)
- **Public routes** (no auth):
  - `POST /api/users/login`
  - `GET /api/health`
  
- **Protected routes** (JWT required):
  - `/api/clients/*`
  - `/api/licenses/*`
  - `/api/modules/*`
  - `/api/pos/*`
  - All other `/api/*` endpoints

#### 4. **Default Admin User** (`backend/prisma/seed.js`)
- Username: `admin`
- Password: `admin123`
- Email: `admin@carthapos.com`
- Role: `ADMIN`

---

### ✅ Frontend Authentication

#### 1. **Updated AuthContext** (`admin/src/contexts/AuthContext.jsx`)
- Stores JWT token in `localStorage` (`pos_admin_token`)
- Stores user data in `localStorage` (`pos_admin_user`)
- Provides `getAuthHeader()` for manual API calls
- Auto-logout on token expiration

#### 2. **API Utility with JWT** (`admin/src/utils/api.js`)
- Centralized API client with automatic JWT injection
- Methods: `get()`, `post()`, `put()`, `delete()`, `postFormData()`
- Handles 401 errors (auto-redirect to login)
- Special `login()` method (no token required)

#### 3. **Updated Axios Interceptors** (`admin/src/lib/api.js`)
- **Request interceptor**: Adds `Authorization: Bearer <token>` to all requests
- **Response interceptor**: Handles 401 errors, clears auth, redirects to login

#### 4. **Login Page** (`admin/src/pages/Login.jsx`)
- Modern gradient design with CarthaPos branding
- Username/email + password fields
- Loading states and error handling
- Demo credentials displayed

#### 5. **Protected Routes** (`admin/src/App.jsx`)
- Login route (`/login`) - public
- All other routes - protected with `ProtectedRoute` component
- Auto-redirect to login if not authenticated
- Auto-redirect to dashboard if already logged in

#### 6. **Layout Updates** (`admin/src/components/layout/Layout.jsx`)
- Shows logged-in user info (username + role)
- Logout button in top bar
- Toast notification on logout

---

## 🔐 Security Features

1. **Token Expiration**: Tokens expire after 7 days (configurable)
2. **Password Hashing**: bcrypt with salt rounds = 10
3. **Secure Storage**: JWT stored in localStorage (client-side)
4. **Authorization Header**: `Bearer <token>` format
5. **Auto-Logout**: Invalid/expired tokens trigger automatic logout
6. **Role-Based Access**: `requireRole()` middleware for granular permissions
7. **Error Codes**: Specific error codes for debugging (`TOKEN_EXPIRED`, etc.)

---

## 🚀 How to Use

### Step 1: Setup Database & Seed Admin User

```bash
cd backend

# Run migrations
npx prisma migrate dev

# Seed database (creates admin user)
npm run db:seed
```

**Output:**
```
✅ Database seeding completed successfully!
📊 Created 45 modules
👤 Created test client: Restaurant Le Gourmet
📄 Created test license: ABC-123-XYZ
🔐 Created admin user: admin (password: admin123)
```

### Step 2: Start Backend

```bash
cd backend
npm run dev
```

**Backend runs on:** `http://localhost:3001`

### Step 3: Start Admin Panel

```bash
cd admin
npm run dev
```

**Admin panel runs on:** `http://localhost:5173`

### Step 4: Login

1. Open browser: `http://localhost:5173`
2. You'll be redirected to `/login`
3. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
4. Click "Sign In"
5. You'll be redirected to dashboard

---

## 🧪 Testing Authentication

### Test 1: Login Flow
```javascript
// 1. Login with correct credentials
POST http://localhost:3001/api/users/login
Body: { "username": "admin", "password": "admin123" }

// Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "admin",
    "email": "admin@carthapos.com",
    "role": "ADMIN",
    "isActive": true
  }
}
```

### Test 2: Protected Route (Without Token)
```javascript
// Try to access clients without token
GET http://localhost:3001/api/clients
Headers: (no Authorization header)

// Response: 401 Unauthorized
{
  "error": "Access denied. No token provided.",
  "code": "NO_TOKEN"
}
```

### Test 3: Protected Route (With Token)
```javascript
// Access clients with valid token
GET http://localhost:3001/api/clients
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response: 200 OK
[
  { "id": "...", "name": "Restaurant Le Gourmet", ... }
]
```

### Test 4: Invalid Token
```javascript
// Try with invalid/expired token
GET http://localhost:3001/api/clients
Headers: {
  "Authorization": "Bearer invalid_token"
}

// Response: 401 Unauthorized
{
  "error": "Invalid token. Please login again.",
  "code": "INVALID_TOKEN"
}
```

### Test 5: Token Persistence
1. Login to admin panel
2. Open DevTools → Application → Local Storage
3. Check for:
   - `pos_admin_token` - JWT token
   - `pos_admin_user` - User data
4. Refresh page - you should stay logged in
5. Clear localStorage - you'll be logged out

### Test 6: Logout
1. Click "Logout" button in top bar
2. Check localStorage is cleared
3. You should be redirected to `/login`

---

## 📁 Files Modified/Created

### Backend
- ✅ `backend/middleware/auth.js` - **NEW** - JWT middleware
- ✅ `backend/routes/users.js` - Updated login endpoint
- ✅ `backend/server.js` - Added JWT protection to routes
- ✅ `backend/prisma/seed.js` - Added admin user seeding

### Frontend (Admin Panel)
- ✅ `admin/src/contexts/AuthContext.jsx` - Updated with JWT support
- ✅ `admin/src/utils/api.js` - **NEW** - API utility with JWT
- ✅ `admin/src/lib/api.js` - Updated axios interceptors
- ✅ `admin/src/pages/Login.jsx` - **NEW** - Login page
- ✅ `admin/src/App.jsx` - Added protected routes
- ✅ `admin/src/main.jsx` - Wrapped with AuthProvider
- ✅ `admin/src/components/layout/Layout.jsx` - Added user info & logout

---

## 🔧 Configuration

### Environment Variables (Optional)

Create `backend/.env`:
```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# API Configuration
PORT=3001
NODE_ENV=development
```

**Default values:**
- `JWT_SECRET`: `carthapos-secret-key-change-in-production-2025`
- `JWT_EXPIRES_IN`: `7d` (7 days)
- `PORT`: `3001`

---

## 🎨 Login Page Design

The login page features:
- Gradient background (blue to indigo)
- CarthaPos shield logo
- Clean white card with shadow
- Username/email field
- Password field
- Loading state animation
- Demo credentials info box
- Responsive design

---

## 🔍 Troubleshooting

### Issue: "No token provided"
**Solution:** Make sure you're logged in. Token is automatically added by axios interceptors.

### Issue: "Token expired"
**Solution:** Login again. Tokens expire after 7 days.

### Issue: "Cannot login with admin/admin123"
**Solution:** Run `npm run db:seed` in backend to create admin user.

### Issue: "401 on all API calls"
**Solution:** Check if JWT middleware is correctly applied in `server.js`.

### Issue: "Redirected to login after page refresh"
**Solution:** Check localStorage for `pos_admin_token` and `pos_admin_user`.

---

## 📊 JWT Token Structure

```javascript
// Token payload (decoded):
{
  "id": "user-id",
  "username": "admin",
  "email": "admin@carthapos.com",
  "role": "ADMIN",
  "iat": 1729612800, // Issued at
  "exp": 1730217600, // Expires at (7 days later)
  "iss": "CarthaPos"  // Issuer
}
```

---

## 🚀 Next Steps

Now that JWT authentication is complete, you can:

1. **Create more users** via Prisma Studio or API:
   ```bash
   npx prisma studio
   ```

2. **Implement role-based permissions**:
   ```javascript
   // In protected route:
   app.get('/api/admin-only', verifyToken, requireRole('ADMIN'), (req, res) => {
     res.json({ message: 'Admin only content' });
   });
   ```

3. **Add refresh tokens** (optional):
   - Short-lived access tokens (15min)
   - Long-lived refresh tokens (7 days)
   - Implement `/api/auth/refresh` endpoint

4. **Build User Dashboard** (next priority):
   - List user's POS applications
   - Edit/download/delete actions
   - POS statistics

---

## ✅ Verification Checklist

- [x] JWT tokens generated on login
- [x] Tokens stored in localStorage
- [x] Authorization header added to all API calls
- [x] Protected routes require valid token
- [x] Invalid tokens return 401 with error codes
- [x] Auto-redirect to login on 401
- [x] Logout clears token and redirects
- [x] Token persists across page refresh
- [x] Default admin user seeded
- [x] Login page styled and functional

---

## 📝 Summary

✅ **CRITICAL PRIORITY 1 COMPLETE: JWT Authentication System**

You now have a fully functional, secure JWT authentication system with:
- Token-based authentication (7-day expiration)
- Protected API routes
- Automatic token injection in all requests
- Auto-logout on token expiration
- Beautiful login page
- Default admin user
- Role-based authorization support

**Login Credentials:**
- Username: `admin`
- Password: `admin123`

**Test it now:**
```bash
# Terminal 1 - Backend
cd backend
npm run db:seed  # First time only
npm run dev

# Terminal 2 - Admin Panel
cd admin
npm run dev

# Open browser: http://localhost:5173
```

---

**🎉 You can now move to CRITICAL PRIORITY 2: User Dashboard!**
