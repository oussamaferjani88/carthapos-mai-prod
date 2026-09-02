const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const {
  generateToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
} = require('../middleware/auth');
const { getUserPermissionKeys } = require('../middleware/permissions');
const { PERMISSION_CATALOG } = require('../utils/permissionCatalog');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/auth/register — create CLIENT user + linked Client row
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, businessName, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'User with this username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'CLIENT',
        isActive: true,
      },
    });

    let client = await prisma.client.findUnique({ where: { email } });
    if (client) {
      client = await prisma.client.update({
        where: { id: client.id },
        data: { userId: user.id, ...(businessName ? { name: businessName } : {}) },
      });
    } else {
      client = await prisma.client.create({
        data: {
          name: businessName || username,
          email,
          phone: phone || null,
          userId: user.id,
        },
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
        client: { id: client.id, name: client.name, email: client.email },
      },
    });
  } catch (error) {
    console.error('[AUTH] Register failed:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login — username or email + password
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const identifier = username || req.body.email;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    setAuthCookie(res, token);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const client = await prisma.client.findUnique({
      where: { userId: user.id },
      select: { id: true, name: true, email: true },
    });

    let permissions = [];
    if (user.role === 'SUPER_ADMIN') {
      permissions = PERMISSION_CATALOG.map((p) => p.key);
    } else {
      permissions = await getUserPermissionKeys(user.id);
    }

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role, permissions },
        client,
      },
    });
  } catch (error) {
    console.error('[AUTH] Login failed:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// POST /api/auth/logout — clear the HttpOnly session cookie
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

// GET /api/auth/me — current user + client (strict authentication)
router.get('/me', verifyToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const client = await prisma.client.findUnique({
      where: { userId: user.id },
      select: { id: true, name: true, email: true, phone: true },
    });

    let permissions = [];
    if (user.role === 'SUPER_ADMIN') {
      permissions = PERMISSION_CATALOG.map((p) => p.key);
    } else {
      permissions = await getUserPermissionKeys(user.id);
    }

    res.json({ success: true, data: { user: { ...user, permissions }, client } });
  } catch (error) {
    console.error('[AUTH] Me failed:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
