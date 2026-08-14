const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { generateToken, optionalAuth } = require('../middleware/auth');

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

// POST /api/auth/login — email or username + password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email }, { username: email }] },
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
      select: { id: true, name: true, email: true },
    });

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
        client,
      },
    });
  } catch (error) {
    console.error('[AUTH] Login failed:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET /api/auth/me — current user + client
router.get('/me', optionalAuth, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, role: true, isActive: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const client = await prisma.client.findUnique({
      where: { userId: user.id },
      select: { id: true, name: true, email: true, phone: true },
    });

    res.json({ success: true, data: { user, client } });
  } catch (error) {
    console.error('[AUTH] Me failed:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
