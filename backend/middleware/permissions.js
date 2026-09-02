/**
 * RBAC permission middleware.
 *
 * Policy:
 *  - SUPER_ADMIN always passes (role-based full access).
 *  - ADMIN / MANAGER users are checked against their stored `app_permissions`
 *    rows (granted explicitly by the SUPER_ADMIN).
 *  - User/account management endpoints (routes/users.js) are SUPER_ADMIN-only:
 *    `requireSuperAdmin`. MANAGER/ADMIN cannot manage accounts or permissions.
 *  - Shared/public endpoints (used by the web client portal & POS runtime) use
 *    `requirePermissionForAdmin`: requests WITHOUT an admin session pass through
 *    unchanged (portal/POS preserved); requests carrying an ADMIN/MANAGER session
 *    are permission-enforced; other authenticated roles are left untouched.
 */
const { PrismaClient } = require('@prisma/client');
// Lazy `auth` access: auth.js requires this module too (for /me), so the
// require() would otherwise resolve a partially-evaluated exports object.
const auth = require('./auth');

const prisma = new PrismaClient();

const PERMISSION_HOLDER_ROLES = ['ADMIN', 'MANAGER', 'BI_SPECIALIST'];

/**
 * Fetch the permission keys granted to a user (from app_permissions).
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
async function getUserPermissionKeys(userId) {
  const rows = await prisma.userPermission.findMany({
    where: { userId },
    select: { permission: { select: { key: true } } },
  });
  return rows.map((r) => r.permission.key);
}

/** True when username matches the canonical SUPER_ADMIN (from env). */
function isCanonicalUsername(username) {
  return !!process.env.ADMIN_INITIAL_USERNAME && username === process.env.ADMIN_INITIAL_USERNAME;
}

function forbidden(res, requiredKey, userRole) {
  return res.status(403).json({
    error: 'Access denied. Insufficient permissions.',
    code: 'INSUFFICIENT_PERMISSIONS',
    requiredPermission: requiredKey,
    userRole: userRole || null,
  });
}

/**
 * Requires a valid admin session AND the given permission.
 * Expects req.user to already be populated (e.g. by `adminAuth`). Re-runs the
 * token verification defensively if not, so it can be used standalone too.
 */
function requirePermission(permissionKey) {
  return (req, res, next) => {
    const handle = async () => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.', code: 'NOT_AUTHENTICATED' });
      }
      if (req.user.role === 'SUPER_ADMIN') return next();
      if (!PERMISSION_HOLDER_ROLES.includes(req.user.role)) {
        return forbidden(res, permissionKey, req.user.role);
      }
      try {
        const keys = await getUserPermissionKeys(req.user.id);
        if (keys.includes(permissionKey)) return next();
        return forbidden(res, permissionKey, req.user.role);
      } catch (error) {
        return next(error);
      }
    };
    if (req.user) return handle();
    auth.verifyToken(req, res, handle);
  };
}

/**
 * Permission gate for routes that are shared with the public portal / POS.
 * No session -> allow (public). SUPER_ADMIN -> allow. ADMIN/MANAGER -> enforce
 * the permission. Any other authenticated role -> allow (portal semantics).
 */
function requirePermissionForAdmin(permissionKey) {
  return (req, res, next) => {
    const handle = async () => {
      if (!req.user) return next();
      if (req.user.role === 'SUPER_ADMIN') return next();
      if (PERMISSION_HOLDER_ROLES.includes(req.user.role)) {
        try {
          const keys = await getUserPermissionKeys(req.user.id);
          if (keys.includes(permissionKey)) return next();
          return forbidden(res, permissionKey, req.user.role);
        } catch (error) {
          return next(error);
        }
      }
      return next();
    };
    auth.optionalAuth(req, res, handle);
  };
}

/**
 * SUPER_ADMIN-only gate (user & permission management endpoints).
 */
function requireSuperAdmin(req, res, next) {
  auth.verifyToken(req, res, () => {
    if (req.user && req.user.role === 'SUPER_ADMIN') {
      return next();
    }
    return res.status(403).json({
      error: 'Access denied. SUPER_ADMIN required.',
      code: 'SUPER_ADMIN_REQUIRED',
      userRole: req.user ? req.user.role : null,
    });
  });
}

module.exports = {
  getUserPermissionKeys,
  isCanonicalUsername,
  requirePermission,
  requirePermissionForAdmin,
  requireSuperAdmin,
  PERMISSION_HOLDER_ROLES,
};
