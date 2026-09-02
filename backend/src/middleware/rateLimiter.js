const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * Applies to all API routes
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many login attempts from this IP, please try again after 15 minutes.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Moderate rate limiter for resource creation
 * Prevents spam on POST endpoints
 */
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 create requests per hour
  message: {
    error: 'Too many creation requests from this IP, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many creation requests from this IP, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

/**
 * Strict rate limiter for POS generation
 * Very expensive operation - limit strictly
 */
const posGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 POS generations per hour
  message: {
    error: 'Too many POS generation requests. This is a resource-intensive operation. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many POS generation requests. This is a resource-intensive operation. Please try again later.',
      retryAfter: '1 hour'
    });
  }
});

/**
 * Moderate rate limiter for USB operations
 * Prevents USB spam
 */
const usbLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 USB operations per 15 minutes
  message: {
    error: 'Too many USB operations from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many USB operations from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Lenient rate limiter for read operations
 * More generous for GET requests
 */
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 read requests per 15 minutes
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Rate limiter for license lifecycle/activation operations.
 * Limits abuse of destructive or identity-binding endpoints.
 */
const licenseActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 lifecycle actions per 15 minutes
  message: {
    error: 'Too many license operations from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many license operations from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Rate limiter for license validation checks.
 * The Electron POS polls this endpoint on startup (best-effort), so the limit
 * is generous while still preventing high-volume enumeration.
 */
const licenseValidateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 validation checks per 15 minutes
  message: {
    error: 'Too many license validation requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many license validation requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  createLimiter,
  posGenerationLimiter,
  usbLimiter,
  readLimiter,
  licenseActionLimiter,
  licenseValidateLimiter
};
