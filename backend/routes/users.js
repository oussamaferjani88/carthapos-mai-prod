const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/auth');
const { requireSuperAdmin, isCanonicalUsername } = require('../middleware/permissions');
const { PERMISSION_CATALOG } = require('../utils/permissionCatalog');
const router = express.Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// RBAC policy for user management:
//  - ALL management endpoints require SUPER_ADMIN (routes are SUPER_ADMIN-only).
//  - ADMIN/MANAGER accounts get explicitly-assigned permissions via the
//    permission catalog; SUPER_ADMIN is role-based and always bypasses checks.
//  - The canonical SUPER_ADMIN (env ADMIN_INITIAL_USERNAME) can never be
//    modified, deactivated, demoted, or deleted — not even by itself.
//  - No self-demotion, self-deactivation, or self-deletion.
//  - The legacy create endpoint accepts only ADMIN/MANAGER/BI_SPECIALIST
//    roles; SUPER_ADMIN cannot be created through the API.
// POST /api/users/login stays public.
// ---------------------------------------------------------------------------

const CREATABLE_ROLES = ['ADMIN', 'MANAGER', 'BI_SPECIALIST'];

// Roles that belong to CarthaPos staff and are managed here. Client-portal
// accounts (role CLIENT) are NOT staff — they are excluded from the admin
// user-management list (they live under their own client interface instead).
const ADMIN_USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'BI_SPECIALIST'];

async function fetchPermissionsByUser() {
  const rows = await prisma.userPermission.findMany({
    select: { userId: true, permission: { select: { key: true } } },
  });
  const map = {};
  rows.forEach((r) => {
    if (!map[r.userId]) map[r.userId] = [];
    map[r.userId].push(r.permission.key);
  });
  return map;
}

const USER_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  lastLogin: true,
};

// GET /api/users/permissions - Permission catalog (SUPER_ADMIN only)
router.get('/permissions', requireSuperAdmin, async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { key: 'asc' }],
    });
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// GET /api/users - All users with their granted permissions (SUPER_ADMIN only).
// Only CarthaPos staff accounts are returned; client-portal accounts (CLIENT)
// are excluded — they are managed through the client's own interface.
router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const [users, permissionMap] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ADMIN_USER_ROLES } },
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      fetchPermissionsByUser(),
    ]);
    res.json(users.map((u) => ({ ...u, permissions: permissionMap[u.id] || [] })));
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/stats - User statistics (SUPER_ADMIN only)
router.get('/stats', requireSuperAdmin, async (req, res) => {
  try {
    const [totalUsers, activeUsers, usersByRole] = await Promise.all([
      prisma.user.count({ where: { role: { in: ADMIN_USER_ROLES } } }),
      prisma.user.count({ where: { isActive: true, role: { in: ADMIN_USER_ROLES } } }),
      prisma.user.groupBy({ by: ['role'], _count: { role: true }, where: { role: { in: ADMIN_USER_ROLES } } }),
    ]);

    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {});

    res.json({ totalUsers, activeUsers, roleStats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// POST /api/users - Create an ADMIN/MANAGER account with explicit permissions
router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const { username, email, password, role, isActive, permissions } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (role === 'SUPER_ADMIN') {
      return res.status(400).json({
        error: 'SUPER_ADMIN accounts cannot be created through this API. Use the dedicated create-admin script for the canonical account.',
        code: 'SUPER_ADMIN_NOT_CREATABLE',
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this username or email already exists' });
    }

    const finalRole = CREATABLE_ROLES.includes(role) ? role : 'MANAGER';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: finalRole,
        isActive: isActive !== undefined ? isActive : true,
      },
      select: USER_SELECT,
    });

    let granted = [];
    if (Array.isArray(permissions) && permissions.length) {
      const catalog = await prisma.permission.findMany({ where: { key: { in: permissions } } });
      if (catalog.length) {
        await prisma.userPermission.createMany({
          data: catalog.map((p) => ({ userId: user.id, permissionId: p.id })),
          skipDuplicates: true,
        });
        granted = catalog.map((p) => p.key);
      }
    }

    res.status(201).json({ ...user, permissions: granted });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id/permissions - Replace the granted permissions of a user
router.put('/:id/permissions', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'permissions must be an array of permission keys' });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (isCanonicalUsername(target.username)) {
      return res.status(403).json({
        error: 'The canonical SUPER_ADMIN permissions are implicit and cannot be changed.',
        code: 'CANONICAL_PROTECTED',
      });
    }
    if (target.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'SUPER_ADMIN accounts have implicit full access.',
        code: 'SUPER_ADMIN_PROTECTED',
      });
    }

    const catalog = await prisma.permission.findMany({ where: { key: { in: permissions } } });

    await prisma.$transaction([
      prisma.userPermission.deleteMany({ where: { userId: id } }),
      ...(catalog.length
        ? [
            prisma.userPermission.createMany({
              data: catalog.map((p) => ({ userId: id, permissionId: p.id })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    res.json({ success: true, permissions: catalog.map((p) => p.key) });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ error: 'Failed to update user permissions' });
  }
});

// PUT /api/users/:id - Update a user (SUPER_ADMIN only)
router.put('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, isActive, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Client-portal accounts are managed through the client interface, never
    // through the admin user-management API.
    if (!ADMIN_USER_ROLES.includes(existingUser.role)) {
      return res.status(403).json({ error: 'Client accounts cannot be managed from the admin panel.', code: 'CLIENT_ACCOUNT_NOT_MANAGEABLE' });
    }

    const isCanonical = isCanonicalUsername(existingUser.username);
    const isSelf = existingUser.id === req.user.id;

    // ── Canonical SUPER_ADMIN: frozen except self-initiated password change ──
    if (isCanonical) {
      const structuralFields = ['username', 'email', 'role', 'isActive'];
      const hasStructuralChange = structuralFields.some((k) => req.body[k] !== undefined);
      if (hasStructuralChange) {
        return res.status(403).json({
          error: 'The canonical SUPER_ADMIN account cannot be modified, deactivated, or demoted.',
          code: 'CANONICAL_PROTECTED',
        });
      }
      if (password) {
        if (!isSelf) {
          return res.status(403).json({
            error: 'Only the canonical SUPER_ADMIN itself may change its own password.',
            code: 'CANONICAL_PROTECTED',
          });
        }
        const hashed = await bcrypt.hash(password, 10);
        const updated = await prisma.user.update({
          where: { id },
          data: { password: hashed },
          select: USER_SELECT,
        });
        return res.json({ ...updated, permissions: PERMISSION_CATALOG.map((p) => p.key) });
      }
      return res.json({ ...existingUser, permissions: PERMISSION_CATALOG.map((p) => p.key) });
    }

    // ── Self-protection: no self-demotion / self-deactivation ──
    if (isSelf) {
      if (role && role !== existingUser.role) {
        return res.status(403).json({ error: 'You cannot change your own role.', code: 'SELF_PROTECTED' });
      }
      if (isActive === false) {
        return res.status(403).json({ error: 'You cannot deactivate your own account.', code: 'SELF_PROTECTED' });
      }
    }

    // ── Role safety ──
    if (role === 'SUPER_ADMIN') {
      return res.status(400).json({ error: 'Cannot assign the SUPER_ADMIN role through this API.' });
    }
    if (existingUser.role === 'SUPER_ADMIN' && (role || isActive === false)) {
      return res.status(403).json({ error: 'SUPER_ADMIN accounts cannot be demoted or deactivated.' });
    }

    const updateData = {};
    if (username && username !== existingUser.username) updateData.username = username;
    if (email && email !== existingUser.email) updateData.email = email;
    if (role && role !== existingUser.role) updateData.role = role;
    if (isActive !== undefined && isActive !== existingUser.isActive) updateData.isActive = isActive;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SELECT,
    });

    const permRows = await prisma.userPermission.findMany({
      where: { userId: id },
      select: { permission: { select: { key: true } } },
    });

    res.json({ ...updatedUser, permissions: permRows.map((r) => r.permission.key) });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete a user (SUPER_ADMIN only)
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Client-portal accounts are managed through the client interface, never
    // through the admin user-management API.
    if (!ADMIN_USER_ROLES.includes(existingUser.role)) {
      return res.status(403).json({ error: 'Client accounts cannot be managed from the admin panel.', code: 'CLIENT_ACCOUNT_NOT_MANAGEABLE' });
    }

    if (isCanonicalUsername(existingUser.username)) {
      return res.status(400).json({
        error: 'The canonical SUPER_ADMIN account cannot be deleted.',
        code: 'CANONICAL_PROTECTED',
      });
    }
    if (existingUser.id === req.user.id) {
      return res.status(403).json({ error: 'You cannot delete your own account.', code: 'SELF_PROTECTED' });
    }

    // Prevent deleting the last admin-level account (ADMIN or SUPER_ADMIN).
    // Counts ADMIN + SUPER_ADMIN together so a SUPER_ADMIN may still remove the
    // sole ADMIN account while at least one admin-level account remains.
    if (existingUser.role === 'ADMIN' || existingUser.role === 'SUPER_ADMIN') {
      const adminLevelCount = await prisma.user.count({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      });
      if (adminLevelCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin-level user.' });
      }
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /api/users/login - Connexion utilisateur (public)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username }
        ]
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
