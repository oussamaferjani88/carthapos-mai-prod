# Architecture: Frontend User → Admin POS Generator

## Overview
The frontend user interface reuses the admin POS Generator functionality through an embedded iframe approach. This avoids code duplication while maintaining data separation between admin and regular users.

## How It Works

### 1. **User Dashboard (Frontend - Port 8081)**
   - Location: `frontend/src/pages/dashboard/`
   - User sees their dashboard with list of POS systems
   - Click "Create New POS" or "POS Generator" button

### 2. **Generator Page (Embedded Admin)**
   - Location: `frontend/src/pages/dashboard/Generator.tsx`
   - Embeds the admin POS Generator in an iframe
   - Sets `accessMode=user` and `currentUserId` in localStorage
   - Admin app URL: `http://localhost:5174/pos-generator`

### 3. **Admin App Detects Mode**
   - Location: `admin/src/contexts/AccessModeContext.jsx`
   - Reads `accessMode` from localStorage
   - If `mode === 'user'`: Filter data by `currentUserId`
   - If `mode === 'admin'`: Show all data

### 4. **Data Filtering**
   The admin components should check the access mode:
   ```jsx
   import { useAccessMode } from '@/contexts/AccessModeContext';
   
   function MyComponent() {
     const { isUserMode, currentUserId } = useAccessMode();
     
     // Filter data based on mode
     const filteredData = isUserMode 
       ? data.filter(item => item.userId === currentUserId)
       : data; // Admin sees all
   }
   ```

## Setup Instructions

### Step 1: Run Both Applications
```bash
# Terminal 1 - Frontend (User Interface)
cd frontend
npm run dev
# Runs on http://localhost:8081

# Terminal 2 - Admin (POS Generator & Management)
cd admin
npm run dev
# Runs on http://localhost:5174
```

### Step 2: User Flow
1. User registers/logs in on frontend
2. User navigates to dashboard (`/dashboard`)
3. User clicks "POS Generator"
4. Frontend embeds admin POS generator in iframe
5. Admin app reads `accessMode=user` and filters data

### Step 3: Modify Admin Components (TODO)
Add access mode filtering to:
- `admin/src/pages/pos/POSGeneratorPage.jsx`
- `admin/src/hooks/useClients.js` (filter by userId)
- `admin/src/hooks/usePOSModules.js`
- `admin/src/services/posService.js`

## Data Separation

### Admin Mode
- Sees all clients
- Can manage all POS systems
- Full CRUD operations
- User management

### User Mode
- Sees only their own POS systems
- Can only create/edit their POS
- No access to other users' data
- No admin features

## API Changes Needed

The backend should support filtering by userId:
```javascript
// Example API endpoint
GET /api/pos-systems?userId=123  // User mode
GET /api/pos-systems              // Admin mode (all systems)
```

## Benefits

✅ **No Code Duplication**: Reuse entire admin POS generator
✅ **Consistent UI**: Same generator interface for admin & users
✅ **Easy Maintenance**: Update generator once, works for both
✅ **Data Isolation**: Clear separation through access modes
✅ **Scalable**: Easy to add more shared features

## Alternative Approach (Future)

Instead of iframe, you could:
1. Share components via npm package
2. Monorepo with shared component library
3. Micro-frontends architecture

For now, iframe + access mode is the simplest solution.
