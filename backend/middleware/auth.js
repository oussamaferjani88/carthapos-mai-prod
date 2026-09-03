const jwt = require('jsonwebtoken');

// JWT Secret - In production, store this in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'carthapos-secret-key-change-in-production-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // 7 days default

// HttpOnly session cookie name (admin panel session)
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'pos_admin';
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

/**
 * Minimal cookie header parser (no extra dependency needed).
 * @param {import('express').Request} req
 * @returns {Object<string,string>}
 */
function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    acc[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    return acc;
  }, {});
}

/**
 * Extract a JWT from the Authorization header (Bearer) or the session cookie.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookies = parseCookies(req);
  if (cookies[AUTH_COOKIE_NAME]) {
    return cookies[AUTH_COOKIE_NAME];
  }
  return null;
}

/**
 * Cookie options for the HttpOnly session cookie.
 * @param {number} maxAgeMs
 * @returns {Object}
 */
function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    // In production the admin frontend and backend live on different subdomains
    // of onrender.com, which browsers treat as separate sites. SameSite=Lax
    // silently drops the cookie on those cross-site XHR/fetch calls, so admin
    // cookie-based auth never reaches the backend. Only SameSite=None (paired
    // with Secure, which browsers require alongside None) travels on cross-site
    // requests. Keep 'lax' + non-secure for local dev (same localhost origin).
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeMs,
  };
}

/**
 * Compute cookie max-age from the JWT expiry string (e.g. "7d", "24h").
 * @returns {number}
 */
function authCookieMaxAge() {
  const match = String(JWT_EXPIRES_IN).match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return parseInt(match[1], 10) * multipliers[match[2]];
}

/**
 * Set the HttpOnly session cookie on the response.
 * @param {import('express').Response} res
 * @param {string} token
 */
function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions(authCookieMaxAge()));
}

/**
 * Clear the HttpOnly session cookie on the response.
 * @param {import('express').Response} res
 */
function clearAuthCookie(res) {
  // Options must mirror the login cookie's SameSite/Secure attributes or some
  // browsers won't actually delete it.
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
}

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role || 'user'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'CarthaPos'
  });
};

/**
 * Verify JWT token middleware
 * Protects routes by checking for a valid JWT token in the Authorization
 * header (Bearer) or the HttpOnly session cookie.
 */
const verifyToken = (req, res, next) => {
  try {
    // Get token from Authorization header or session cookie
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to request object
    req.user = decoded;

    // Continue to next middleware/route handler
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token. Please login again.',
        code: 'INVALID_TOKEN'
      });
    }

    // Other errors
    return res.status(500).json({
      error: 'Failed to authenticate token.',
      code: 'AUTH_ERROR',
      details: error.message
    });
  }
};

/**
 * Optional authentication middleware
 * Attempts to verify token (header or cookie) but doesn't block if missing
 * Useful for routes that have both public and authenticated features
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Silently fail - just continue without user info
    next();
  }
};

/**
 * Role-based authorization middleware
 * Checks if authenticated user has required role
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required.',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Admin authorization middleware
 * Requires a valid token AND an ADMIN / SUPER_ADMIN role.
 * Applies to admin-panel-only endpoints (users management, license lifecycle,
 * module management). Public/POS-runtime routes are deliberately not covered.
 */
const adminAuth = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && ADMIN_ROLES.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({
      error: 'Access denied. Insufficient permissions.',
      code: 'INSUFFICIENT_PERMISSIONS',
      requiredRoles: ADMIN_ROLES,
      userRole: req.user ? req.user.role : null
    });
  });
};

module.exports = {
  generateToken,
  verifyToken,
  optionalAuth,
  requireRole,
  adminAuth,
  parseCookies,
  extractToken,
  setAuthCookie,
  clearAuthCookie,
  AUTH_COOKIE_NAME,
  ADMIN_ROLES,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
