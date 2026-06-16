# Deployment Guide - CarthaPos to Render.com

## Prerequisites
- GitHub account
- Render.com account (free tier available)
- Git installed locally

---

## Step 1: Prepare for Deployment

### 1.1 Create Prisma Migrations
```bash
cd backend
npx prisma migrate dev --name init
```

This creates migration files in `backend/prisma/migrations/`

### 1.2 Verify .gitignore is correct
✅ The .gitignore has been updated to include Prisma migrations
✅ .env files are excluded (use Render environment variables)

---

## Step 2: Push to GitHub

### 2.1 Initialize Git (if not already done)
```bash
cd C:\Users\LENOVO\Downloads\CarthaPos-main\CarthaPos-main
git init
git add .
git commit -m "Initial commit - CarthaPos system"
```

### 2.2 Create GitHub Repository
1. Go to https://github.com/new
2. Name: `carthapos-system`
3. **DO NOT** initialize with README (you already have code)
4. Click "Create repository"

### 2.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/carthapos-system.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Click "New" → "Blueprint"**
3. **Connect your GitHub repository**: `carthapos-system`
4. **Render will detect `render.yaml`** and create:
   - PostgreSQL database (free)
   - Backend API service (free)
   - Admin frontend (free static site)

### Option B: Manual Deployment

#### 3.1 Create PostgreSQL Database
1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Name: `carthapos-db`
3. Database: `pos_system`
4. Plan: **Free**
5. Click **"Create Database"**
6. **Copy the "Internal Database URL"** (you'll need this)

#### 3.2 Deploy Backend
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub: `carthapos-system`
3. **Configuration:**
   - **Name**: `carthapos-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npx prisma migrate deploy && npm start`
   - **Plan**: `Free`

4. **Environment Variables** (click "Advanced"):
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=<paste Internal Database URL from step 3.1>
   JWT_SECRET=<generate random string: 64+ characters>
   ENCRYPTION_KEY=<generate random string: 32+ characters>
   ```

5. Click **"Create Web Service"**

#### 3.3 Deploy Admin Frontend
1. Click **"New +"** → **"Static Site"**
2. Connect your GitHub: `carthapos-system`
3. **Configuration:**
   - **Name**: `carthapos-admin`
   - **Root Directory**: `admin`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Plan**: `Free`

4. **Environment Variables**:
   ```
   VITE_API_URL=https://carthapos-backend.onrender.com/api
   ```
   (Replace with your actual backend URL from step 3.2)

5. Click **"Create Static Site"**

---

## Step 4: Access Your Deployed App

After deployment completes (5-10 minutes):

- **Admin Interface**: `https://carthapos-admin.onrender.com`
- **Backend API**: `https://carthapos-backend.onrender.com/api`
- **Health Check**: `https://carthapos-backend.onrender.com/api/health`

### Default Login (after deployment):
You need to create a user first. The database is empty on first deployment.

---

## Step 5: Initial Setup After Deployment

### 5.1 Create First Admin User
Since the database is empty, you'll need to:

**Option 1: Run seed script via Render shell**
1. Go to backend service in Render
2. Click **"Shell"** tab
3. Run:
   ```bash
   cd backend
   npx prisma db seed
   ```

**Option 2: Add seed command to render.yaml**
Update the backend start command:
```yaml
startCommand: cd backend && npx prisma migrate deploy && npx prisma db seed && npm start
```

### 5.2 Test the System
1. Open admin interface: `https://carthapos-admin.onrender.com`
2. Login with seeded credentials (check your seed file)
3. Create a license
4. Generate a POS system
5. Download the installer

---

## Important Notes

### Free Tier Limitations
- **Backend sleeps after 15 minutes** of inactivity (spins back up on request, ~30 seconds)
- **750 hours/month** free (backend + frontend combined)
- **PostgreSQL**: 1GB storage, 97 hours/month compute

### Environment Variables to Generate

**JWT_SECRET** (64+ characters):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**ENCRYPTION_KEY** (32+ characters):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### CORS Configuration
Make sure backend allows admin frontend domain. Check `backend/server.js`:
```javascript
const cors = require('cors');
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://carthapos-admin.onrender.com' // Add this
  ],
  credentials: true
}));
```

---

## Troubleshooting

### Backend won't start
- Check **Logs** in Render dashboard
- Verify `DATABASE_URL` is set correctly
- Ensure Prisma migrations ran: `npx prisma migrate deploy`

### Frontend can't connect to backend
- Check `VITE_API_URL` points to correct backend URL
- Verify CORS settings in backend

### Database connection errors
- Use **Internal Database URL** (not External)
- Format: `postgresql://user:pass@host:5432/database?sslmode=require`

---

## Updating After Changes

```bash
# Make changes locally
git add .
git commit -m "Description of changes"
git push

# Render automatically redeploys on push
```

---

## Cost Estimate (if you upgrade)

- **Hobby Plan (Backend)**: $7/month
  - No sleep, custom domain, more RAM
- **Starter Plan (Database)**: $7/month
  - More storage and compute
- **Total**: ~$14/month for production-ready deployment

---

## Next Steps

1. **Custom Domain**: Add your own domain in Render settings
2. **SSL Certificate**: Automatic with custom domain
3. **Monitoring**: Set up alerts in Render
4. **Backups**: Enable automated database backups
5. **CI/CD**: Render auto-deploys on GitHub push

---

**Questions? Check Render docs: https://render.com/docs**
