const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { adminAuth } = require('../middleware/auth');
const { requirePermission, requirePermissionForAdmin } = require('../middleware/permissions');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/modules - Récupérer tous les modules
// (shared with portal; permission-enforced only for admin sessions)
router.get('/', requirePermissionForAdmin('modules.view'), async (req, res) => {
  try {
    const modules = await prisma.module.findMany({
      orderBy: [
        { isCore: 'desc' },
        { category: 'asc' },
        { displayName: 'asc' }
      ]
    });
    res.json(modules);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

// GET /api/modules/by-category - Récupérer les modules groupés par catégorie
router.get('/by-category', async (req, res) => {
  try {
    const modules = await prisma.module.findMany({
      orderBy: [
        { isCore: 'desc' },
        { displayName: 'asc' }
      ]
    });

    const modulesByCategory = modules.reduce((acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = [];
      }
      acc[module.category].push(module);
      return acc;
    }, {});

    res.json(modulesByCategory);
  } catch (error) {
    console.error('Error fetching modules by category:', error);
    res.status(500).json({ error: 'Failed to fetch modules by category' });
  }
});

// GET /api/modules/:id - Récupérer un module par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const module = await prisma.module.findUnique({
      where: { id }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json(module);
  } catch (error) {
    console.error('Error fetching module:', error);
    res.status(500).json({ error: 'Failed to fetch module' });
  }
});

// POST /api/modules - Créer un nouveau module (admin only)
router.post('/', adminAuth, requirePermission('modules.manage'), async (req, res) => {
  try {
    const { name, displayName, description, category, isCore } = req.body;

    if (!name || !displayName || !category) {
      return res.status(400).json({ error: 'Name, displayName, and category are required' });
    }

    const existingModule = await prisma.module.findUnique({
      where: { name }
    });

    if (existingModule) {
      return res.status(409).json({ error: 'Module with this name already exists' });
    }

    const module = await prisma.module.create({
      data: {
        name,
        displayName,
        description,
        category,
        isCore: isCore || false
      }
    });

    res.status(201).json(module);
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// PUT /api/modules/:id - Mettre à jour un module (admin only)
router.put('/:id', adminAuth, requirePermission('modules.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, displayName, description, category, isCore } = req.body;

    const existingModule = await prisma.module.findUnique({
      where: { id }
    });

    if (!existingModule) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Vérifier si le nom est déjà utilisé par un autre module
    if (name && name !== existingModule.name) {
      const nameExists = await prisma.module.findUnique({
        where: { name }
      });

      if (nameExists) {
        return res.status(409).json({ error: 'Name already in use by another module' });
      }
    }

    const updatedModule = await prisma.module.update({
      where: { id },
      data: {
        name: name || existingModule.name,
        displayName: displayName || existingModule.displayName,
        description,
        category: category || existingModule.category,
        isCore: isCore !== undefined ? isCore : existingModule.isCore
      }
    });

    res.json(updatedModule);
  } catch (error) {
    console.error('Error updating module:', error);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// DELETE /api/modules/:id - Supprimer un module (admin only)
router.delete('/:id', adminAuth, requirePermission('modules.manage'), async (req, res) => {
  try {
    const { id } = req.params;

    const existingModule = await prisma.module.findUnique({
      where: { id }
    });

    if (!existingModule) {
      return res.status(404).json({ error: 'Module not found' });
    }

    if (existingModule.isCore) {
      return res.status(400).json({ error: 'Cannot delete core modules' });
    }

    await prisma.module.delete({
      where: { id }
    });

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

module.exports = router;

