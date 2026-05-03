const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/quick-service/presets - Get quick service presets/favorites
router.get('/presets', async (req, res) => {
  try {
    const presets = [
      {
        id: 1,
        name: 'Petit Déjeuner Express',
        items: [
          { name: 'Café', price: 2.50, quantity: 1 },
          { name: 'Croissant', price: 1.80, quantity: 1 }
        ],
        total: 4.30,
        category: 'morning',
        usage_count: 45,
        color: '#F59E0B'
      },
      {
        id: 2,
        name: 'Menu Sandwich',
        items: [
          { name: 'Sandwich Jambon', price: 4.50, quantity: 1 },
          { name: 'Chips', price: 1.20, quantity: 1 },
          { name: 'Soda', price: 2.00, quantity: 1 }
        ],
        total: 7.70,
        category: 'lunch',
        usage_count: 78,
        color: '#EF4444'
      },
      {
        id: 3,
        name: 'Pause Café',
        items: [
          { name: 'Cappuccino', price: 3.50, quantity: 1 },
          { name: 'Muffin', price: 2.80, quantity: 1 }
        ],
        total: 6.30,
        category: 'snack',
        usage_count: 32,
        color: '#8B5CF6'
      },
      {
        id: 4,
        name: 'Menu Étudiant',
        items: [
          { name: 'Sandwich', price: 3.50, quantity: 1 },
          { name: 'Café', price: 2.50, quantity: 1 }
        ],
        total: 6.00,
        category: 'student',
        usage_count: 25,
        color: '#10B981'
      }
    ];

    res.json(presets);
  } catch (error) {
    console.error('Error fetching quick service presets:', error);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

// POST /api/quick-service/presets - Create new preset
router.post('/presets', async (req, res) => {
  try {
    const { name, items, category, color } = req.body;

    if (!name || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Name and items array are required' });
    }

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const newPreset = {
      id: Date.now(),
      name,
      items,
      total: parseFloat(total.toFixed(2)),
      category: category || 'custom',
      usage_count: 0,
      color: color || '#6B7280',
      created_at: new Date().toISOString()
    };

    res.status(201).json(newPreset);
  } catch (error) {
    console.error('Error creating preset:', error);
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

// PUT /api/quick-service/presets/:id - Update preset
router.put('/presets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.items) {
      const total = updateData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      updateData.total = parseFloat(total.toFixed(2));
    }

    const updatedPreset = {
      id: parseInt(id),
      ...updateData,
      updated_at: new Date().toISOString()
    };

    res.json(updatedPreset);
  } catch (error) {
    console.error('Error updating preset:', error);
    res.status(500).json({ error: 'Failed to update preset' });
  }
});

// DELETE /api/quick-service/presets/:id - Delete preset
router.delete('/presets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    res.json({ 
      success: true, 
      message: `Preset ${id} deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting preset:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

// POST /api/quick-service/presets/:id/use - Record preset usage
router.post('/presets/:id/use', async (req, res) => {
  try {
    const { id } = req.params;
    
    const usage = {
      preset_id: parseInt(id),
      used_at: new Date().toISOString(),
      usage_count: Math.floor(Math.random() * 100) + 1 // Mock increment
    };

    res.json(usage);
  } catch (error) {
    console.error('Error recording preset usage:', error);
    res.status(500).json({ error: 'Failed to record preset usage' });
  }
});

// GET /api/quick-service/popular-items - Get most popular items for quick access
router.get('/popular-items', async (req, res) => {
  try {
    const popularItems = [
      {
        id: 1,
        name: 'Café Expresso',
        price: 2.50,
        category: 'Boissons',
        sales_count: 250,
        color: '#8B4513'
      },
      {
        id: 2,
        name: 'Croissant',
        price: 1.80,
        category: 'Pâtisserie',
        sales_count: 180,
        color: '#DAA520'
      },
      {
        id: 3,
        name: 'Sandwich Jambon',
        price: 4.50,
        category: 'Snacks',
        sales_count: 120,
        color: '#CD853F'
      },
      {
        id: 4,
        name: 'Cappuccino',
        price: 3.50,
        category: 'Boissons',
        sales_count: 95,
        color: '#D2691E'
      },
      {
        id: 5,
        name: 'Pain au Chocolat',
        price: 2.00,
        category: 'Pâtisserie',
        sales_count: 85,
        color: '#8B4513'
      },
      {
        id: 6,
        name: 'Salade César',
        price: 7.90,
        category: 'Plats',
        sales_count: 75,
        color: '#228B22'
      }
    ];

    res.json(popularItems);
  } catch (error) {
    console.error('Error fetching popular items:', error);
    res.status(500).json({ error: 'Failed to fetch popular items' });
  }
});

// GET /api/quick-service/stats - Get quick service statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      today: {
        orders: 45,
        revenue: 387.50,
        avg_order_time: 2.3, // minutes
        popular_preset: 'Petit Déjeuner Express'
      },
      this_week: {
        orders: 312,
        revenue: 2650.80,
        avg_order_time: 2.1,
        most_used_preset: 'Menu Sandwich'
      },
      presets_usage: [
        { name: 'Menu Sandwich', count: 78 },
        { name: 'Petit Déjeuner Express', count: 45 },
        { name: 'Pause Café', count: 32 },
        { name: 'Menu Étudiant', count: 25 }
      ],
      time_distribution: [
        { hour: 8, orders: 12 },
        { hour: 9, orders: 18 },
        { hour: 10, orders: 8 },
        { hour: 11, orders: 15 },
        { hour: 12, orders: 25 },
        { hour: 13, orders: 20 },
        { hour: 14, orders: 10 },
        { hour: 15, orders: 8 },
        { hour: 16, orders: 14 },
        { hour: 17, orders: 12 }
      ]
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching quick service stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST /api/quick-service/quick-sale - Process quick sale
router.post('/quick-sale', async (req, res) => {
  try {
    const { items, payment_method = 'cash', preset_id } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.20; // 20% VAT
    const total = subtotal + tax;

    const sale = {
      id: Date.now(),
      items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      payment_method,
      preset_id: preset_id || null,
      timestamp: new Date().toISOString(),
      receipt_number: `QS-${Date.now().toString().slice(-6)}`
    };

    res.status(201).json(sale);
  } catch (error) {
    console.error('Error processing quick sale:', error);
    res.status(500).json({ error: 'Failed to process quick sale' });
  }
});

module.exports = router;