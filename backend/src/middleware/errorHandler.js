const config = require('../config');

const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message, isOperational = true } = err;
  
  // Log error
  console.error('Error:', {
    message: err.message,
    stack: config.app.env === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Prisma errors
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Duplicate entry. Resource already exists.';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Resource not found';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Invalid reference. Related resource not found.';
        break;
      default:
        statusCode = 400;
        message = 'Database operation failed';
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Multer errors (file upload)
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = `File upload error: ${err.message}`;
  }

  // Send response
  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message: config.app.env === 'production' && !isOperational
      ? 'Something went wrong'
      : message,
    ...(config.app.env === 'development' && {
      error: err.message,
      stack: err.stack
    })
  });
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Route ${req.originalUrl} not found`
  });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
