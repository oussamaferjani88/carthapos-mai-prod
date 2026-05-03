# Testing the User Dashboard and POS Generator Integration

## Setup

### 1. Start Both Applications

Open **3 terminals**:

#### Terminal 1 - Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on: `http://localhost:3001`

#### Terminal 2 - Frontend (User Interface)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: `http://localhost:8081`

#### Terminal 3 - Admin (POS Generator)
```bash
cd admin
npm install
npm run dev
```
Admin runs on: `http://localhost:5174`

---

## Testing Steps

### Step 1: Access Frontend
1. Open browser: `http://localhost:8081`
2. Click "Get Started" or "Create Account"

### Step 2: Register a User
1. Fill registration form:
   - Full Name: `John Doe`
   - Email: `john@example.com`
   - Company: `Test Company`
   - Password: `password123`
   - Confirm Password: `password123`
   - Accept terms ✓
2. Click "Create Account"
3. **You'll be redirected to `/dashboard`**

### Step 3: User Dashboard
You should see:
- **Statistics Cards**: Total Systems, Active Systems, Total Modules
- **My POS Systems List**: Empty state with "Create Your First POS" button
- **Sidebar Navigation**:
  - Dashboard
  - POS Generator
  - Settings (coming soon)
- **User Profile**: Shows name and email

### Step 4: Access POS Generator
1. Click "Create New POS" or "POS Generator" in sidebar
2. **Page loads with embedded admin generator**
3. The admin app detects `accessMode=user` 
4. Sidebar shows only:
   - Tableau de bord ✓
   - Générateur POS ✓
   - (Admin features hidden) ✗

### Step 5: Create a POS System
1. In the embedded generator:
   - **Step 1**: Select client or create new client
   - **Step 2**: Select business sector
   - **Step 3**: Choose modules
   - **Step 4**: Configure license
   - **Step 5**: Generate POS
2. All data will be tagged with `userId`
3. User only sees their own data

### Step 6: Verify Data Isolation
1. Open admin directly: `http://localhost:5174`
2. Admin sees ALL systems (admin mode)
3. Go back to frontend dashboard
4. User only sees THEIR systems (user mode)

---

## What's Implemented

### ✅ Frontend (User Interface)
- Dashboard with POS list
- Statistics cards
- Generator page with iframe embed
- Access mode setup (`localStorage`)
- Navigation to admin generator

### ✅ Admin (Access Mode Detection)
- `AccessModeContext` to detect user/admin mode
- `useClients` hook filters by userId
- `usePOSGenerator` adds userId to all operations
- API interceptor adds userId to requests
- Layout hides admin-only features in user mode

### ✅ Data Filtering
- Clients filtered by userId
- Licenses tagged with userId
- POS systems isolated per user
- API requests include userId header

---

## Expected Behavior

### User Mode (Frontend Access)
```
✓ Can create POS systems
✓ Can view only their POS systems
✓ Can download their systems
✓ Can customize their systems
✗ Cannot see other users' data
✗ Cannot access admin features
✗ Cannot manage users
```

### Admin Mode (Direct Admin Access)
```
✓ Can see ALL users' systems
✓ Can manage all clients
✓ Can manage licenses
✓ Can manage users
✓ Full access to all features
```

---

## Troubleshooting

### Issue: iframe not loading
**Solution**: Check that admin is running on port 5174
```bash
cd admin
npm run dev
```

### Issue: Data not filtering
**Check localStorage**:
```javascript
// Open browser console on admin page
localStorage.getItem('accessMode')    // Should be 'user'
localStorage.getItem('currentUserId') // Should have user ID
```

### Issue: No data shown
**Check API calls**:
- Open Network tab in DevTools
- Look for `X-User-Id` header in requests
- Check if `userId` query param is present

---

## Next Steps (Backend Integration)

The backend needs to support userId filtering:

### API Endpoints to Modify

#### GET /api/clients
```javascript
// Filter by userId if X-User-Id header present
if (req.headers['x-user-id']) {
  clients = clients.filter(c => c.userId === req.headers['x-user-id']);
}
```

#### POST /api/licenses
```javascript
// Add userId to license when creating
const license = {
  ...req.body,
  userId: req.headers['x-user-id'] || req.body.userId,
  createdBy: req.headers['x-user-id'] || req.body.createdBy
};
```

#### GET /api/pos-systems
```javascript
// Filter by userId
if (req.headers['x-user-id']) {
  systems = systems.filter(s => s.userId === req.headers['x-user-id']);
}
```

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│           Frontend (Port 8081)                      │
│  ┌──────────────────────────────────────────┐      │
│  │  User Dashboard                          │      │
│  │  - My POS Systems                        │      │
│  │  - Statistics                            │      │
│  │  - [Create New POS Button]               │      │
│  └──────────────────────────────────────────┘      │
│                    ↓ Click                          │
│  ┌──────────────────────────────────────────┐      │
│  │  Generator Page (iframe)                 │      │
│  │  ┌────────────────────────────────────┐  │      │
│  │  │ Sets: accessMode='user'            │  │      │
│  │  │       currentUserId='123'          │  │      │
│  │  └────────────────────────────────────┘  │      │
│  └──────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│           Admin (Port 5174)                         │
│  ┌──────────────────────────────────────────┐      │
│  │  AccessModeContext                       │      │
│  │  - Reads localStorage                    │      │
│  │  - isUserMode = true                     │      │
│  │  - currentUserId = '123'                 │      │
│  └──────────────────────────────────────────┘      │
│                    ↓                                │
│  ┌──────────────────────────────────────────┐      │
│  │  POS Generator                           │      │
│  │  - Filters clients by userId             │      │
│  │  - Tags all data with userId             │      │
│  │  - Hides admin features                  │      │
│  └──────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│           Backend API (Port 3001)                   │
│  - Receives X-User-Id header                        │
│  - Filters data by userId                           │
│  - Returns only user's data                         │
└─────────────────────────────────────────────────────┘
```

---

## Current Status

✅ **Working**: 
- User registration → Dashboard navigation
- Dashboard UI with sidebar
- Generator iframe embed
- Access mode detection
- Data filtering in admin hooks
- API interceptor with userId

⏳ **Needs Backend**: 
- API endpoints filtering by userId
- Database queries with userId
- User authentication persistence

🔜 **Future Enhancements**:
- Settings page
- POS viewer/editor
- Download functionality
- Real-time updates
