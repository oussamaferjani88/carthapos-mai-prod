const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Load configuration
const config = require('./src/config');
const { swaggerUi, swaggerSpec } = require('./src/config/swagger');

// Import error handlers
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Import rate limiters
const { generalLimiter } = require('./src/middleware/rateLimiter');

// Import routes (new architecture)
const healthRoutes = require('./src/routes/health');
const clientRoutes = require('./src/routes/clients');
const licenseRoutes = require('./src/routes/licenses');
const moduleRoutes = require('./src/routes/modules');
const userRoutes = require('./src/routes/users');
const usbRoutes = require('./src/routes/usb');
const posRoutes = require('./src/routes/pos');

// Import old routes (to be migrated)
const takeawayRoutes = require('./routes/takeaway');
const loyaltyRoutes = require('./routes/loyalty');
const directConvertRoutes = require('./routes/direct-convert');
const barcodeRoutes = require('./routes/barcode');
const suppliersRoutes = require('./routes/suppliers');
const menuManagementRoutes = require('./routes/menu-management');
const quickServiceRoutes = require('./routes/quick-service');
const paymentAdvancedRoutes = require('./routes/payment-advanced');
const giftCardsRoutes = require('./routes/gift-cards');
const prescriptionsRoutes = require('./routes/prescriptions');
const productionRoutes = require('./routes/production');
const biRequestsRoutes = require('./routes/bi-requests');

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security
app.use(helmet());

// CORS
app.use(cors(config.cors));

// Logging
if (config.app.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - Apply to all requests
app.use('/api/', generalLimiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================================
// API DOCUMENTATION (Swagger)
// ============================================================================

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CarthaPos API Documentation'
}));

// Swagger JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ============================================================================
// API ROUTES - Version 1
// ============================================================================

// Health check (public)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// API v1 routes (new architecture)
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/licenses', licenseRoutes);
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/usb', usbRoutes);
app.use('/api/v1/pos', posRoutes);

// ============================================================================
// LEGACY ROUTES (to be migrated to v1 structure)
// ============================================================================

// Old routes (backward compatibility)
app.use('/api/clients', clientRoutes); // Dual support
app.use('/api/licenses', licenseRoutes); // Dual support
app.use('/api/modules', moduleRoutes); // Dual support
app.use('/api/users', userRoutes); // Dual support
app.use('/api/usb', usbRoutes); // Dual support
app.use('/api/pos', posRoutes); // Dual support
app.use('/api/takeaway', takeawayRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api', directConvertRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/menu-management', menuManagementRoutes);
app.use('/api/quick-service', quickServiceRoutes);
app.use('/api/payment-advanced', paymentAdvancedRoutes);
app.use('/api/gift-cards', giftCardsRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/bi-requests', biRequestsRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(config.app.port, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║  🚀 ${config.app.name} Server Started                        ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  📡 URL:          http://0.0.0.0:${config.app.port}                     ║`);
  console.log(`║  🌍 Environment:  ${config.app.env.padEnd(42)}║`);
  console.log(`║  📊 Health:       http://0.0.0.0:${config.app.port}/health              ║`);
  console.log(`║  🔧 API v1:       http://0.0.0.0:${config.app.port}/api/v1             ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const prisma = require('./src/config/database');

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      await prisma.$disconnect();
      console.log('Database connection closed');
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

module.exports = app;
