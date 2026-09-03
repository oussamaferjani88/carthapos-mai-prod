const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import authentication middleware
const { verifyToken, optionalAuth } = require('./middleware/auth');

// Import routes
const clientRoutes = require('./routes/clients');
const licenseRoutes = require('./src/routes/licenses');
const moduleRoutes = require('./routes/modules');
const usbRoutes = require('./routes/usb');
const posRoutes = require('./routes/pos');
const takeawayRoutes = require('./routes/takeaway');
const loyaltyRoutes = require('./routes/loyalty');
const userRoutes = require('./routes/users');
const directConvertRoutes = require('./routes/direct-convert');
const seedApiRoutes = require('./routes/seed-api');

// New module routes
const barcodeRoutes = require('./routes/barcode');
const suppliersRoutes = require('./routes/suppliers');
const menuManagementRoutes = require('./routes/menu-management');
const quickServiceRoutes = require('./routes/quick-service');
const paymentAdvancedRoutes = require('./routes/payment-advanced');
const giftCardsRoutes = require('./routes/gift-cards');
const prescriptionsRoutes = require('./routes/prescriptions');
const productionRoutes = require('./routes/production');
const biRequestsRoutes = require('./routes/bi-requests');
const biUploadsRoutes = require('./routes/bi-uploads');
const biDebugRoutes = require('./routes/bi-debug');
const biDashboardsRoutes = require('./routes/bi-dashboards');
const biDashboardTemplatesRoutes = require('./routes/bi-dashboard-templates');
const biNotificationsRoutes = require('./routes/bi-notifications');
const biAnalysisRoutes = require('./routes/bi-analysis');
const biAnalyticsRoutes = require('./routes/bi-analytics');
const biReviewsRoutes = require('./routes/bi-reviews');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Auth gate — defaults OFF (current dev behavior unchanged). Flip on via
// env AUTH_REQUIRED=true once the client portal ships real JWT login.
const AUTH_REQUIRED = process.env.AUTH_REQUIRED === 'true';

// Allowed browser origins (admin panel + client portal dev). Credentials-aware
// CORS cannot use origin:'*', so an explicit allowlist is required for the
// HttpOnly session cookie to be sent by browsers. Non-browser / no-origin
// requests (curl, Electron POS, server-to-server) always pass. Local dev
// origins (localhost/127.0.0.1 any port) are always allowed.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
// Render/hosting-platform origin: admin panel and client portal live on
// distinct *.onrender.com subdomains whose exact public hostnames carry
// unpredictable per-service suffixes (e.g. carthapos-admin-x8ov.onrender.com).
// Allowing any onrender.com subdomain keeps credentialed CORS working there
// while still echoing a specific (non-wildcard) origin — required alongside
// `credentials: true` by browser spec.
const isOnrenderOrigin = (origin) => /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin);

// Middleware
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || isLocalOrigin(origin) || isOnrenderOrigin(origin) || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Access-Mode', 'X-User-Id', 'x-user-id', 'X-User-Email', 'x-user-email', 'x-access-mode']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Increase server timeout for long-running operations (like POS generation)
app.use((req, res, next) => {
  req.setTimeout(1200000); // 20 minutes
  res.setTimeout(1200000);
  next();
});

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================================
// JWT AUTHENTICATION - DISABLED FOR DEVELOPMENT
// TODO: Re-enable before production deployment
// ============================================================================
// Public routes (no authentication required)
app.use('/api/users', userRoutes); // Login endpoint is in this router
app.use('/api/auth', authRoutes);

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Apply JWT authentication middleware to all routes below
// COMMENTED OUT FOR DEVELOPMENT - UNCOMMENT BEFORE PRODUCTION
// app.use('/api', verifyToken);
if (AUTH_REQUIRED) {
  app.use('/api', verifyToken);
}

// Protected routes (authentication required)
// NOTE: Currently accessible without authentication for development
app.use('/api/clients', clientRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/usb', usbRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/takeaway', takeawayRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api', directConvertRoutes);
app.use('/api', seedApiRoutes);

// New module routes (protected)
app.use('/api/barcode', barcodeRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/menu-management', menuManagementRoutes);
app.use('/api/quick-service', quickServiceRoutes);
app.use('/api/payment-advanced', paymentAdvancedRoutes);
app.use('/api/gift-cards', giftCardsRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/bi-requests', optionalAuth, biRequestsRoutes);
app.use('/api/bi-uploads', optionalAuth, biUploadsRoutes);
app.use('/api/bi/debug', optionalAuth, biDebugRoutes);
app.use('/api/bi/dashboards', optionalAuth, biDashboardsRoutes);
app.use('/api/bi/dashboard', optionalAuth, biDashboardsRoutes);
app.use('/api/bi/dashboard-templates', optionalAuth, biDashboardTemplatesRoutes);
app.use('/api/bi/metabase', optionalAuth, require('./routes/bi-metabase'));
app.use('/api/bi/notifications', optionalAuth, biNotificationsRoutes);
app.use('/api/bi/analysis', optionalAuth, biAnalysisRoutes);
app.use('/api/bi/analytics', optionalAuth, biAnalyticsRoutes);
app.use('/api/bi/reviews', optionalAuth, biReviewsRoutes);
app.use('/api/bi/review', optionalAuth, biReviewsRoutes);
app.use('/api/bi/assignments', optionalAuth, require('./routes/bi-assignments'));
app.use('/api/bi/stats', optionalAuth, require('./routes/bi-stats'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error caught by middleware:', err.stack);
  
  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(err.statusCode || err.status || 500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit process on Render - let it recover
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Continuing despite uncaught exception...');
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process on Render - let it recover
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Continuing despite unhandled rejection...');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Auto-seed for production
const autoSeed = require('./utils/autoSeed');

// Helper to run migrations if needed inside code (optional, but autoSeed handles data)
// Note: Migrations are handled by CMD in Dockerfile, so we just seed data here.

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);

  // Run Auto-Seed
  await autoSeed();
});

