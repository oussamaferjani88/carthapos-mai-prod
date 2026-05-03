const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/production - Get all production orders
router.get('/', async (req, res) => {
  try {
    const { status, date_from, date_to, responsible_person } = req.query;
    
    let productionOrders = [
      {
        id: 1,
        order_number: 'PROD-2024-001',
        product_name: 'Pain de campagne',
        product_id: 'P001',
        quantity: 50,
        unit: 'unités',
        status: 'in_progress',
        priority: 'high',
        start_date: '2024-09-28',
        end_date: '2024-09-28',
        estimated_time: 240, // minutes
        actual_time: 180,
        responsible_person: 'Jean Boulanger',
        responsible_id: 'EMP001',
        ingredients: [
          { name: 'Farine T65', quantity: 5, unit: 'kg', cost: 8.50, supplier: 'Moulin Martin' },
          { name: 'Levure', quantity: 50, unit: 'g', cost: 2.30, supplier: 'Levures Bio' },
          { name: 'Sel', quantity: 100, unit: 'g', cost: 0.20, supplier: 'Sel de Mer' }
        ],
        total_cost: 11.00,
        cost_per_unit: 0.22,
        selling_price: 3.50,
        expected_margin: 93.7,
        notes: 'Recette traditionnelle, cuisson au four à bois',
        quality_checks: []
      },
      {
        id: 2,
        order_number: 'PROD-2024-002',
        product_name: 'Croissants',
        product_id: 'P002',
        quantity: 100,
        unit: 'unités',
        status: 'completed',
        priority: 'medium',
        start_date: '2024-09-27',
        end_date: '2024-09-27',
        estimated_time: 360,
        actual_time: 340,
        responsible_person: 'Marie Pâtissière',
        responsible_id: 'EMP002',
        ingredients: [
          { name: 'Farine T45', quantity: 3, unit: 'kg', cost: 6.90, supplier: 'Moulin Blanc' },
          { name: 'Beurre', quantity: 1.5, unit: 'kg', cost: 12.00, supplier: 'Laiterie du Coin' },
          { name: 'Œufs', quantity: 20, unit: 'unités', cost: 4.80, supplier: 'Ferme Bio' }
        ],
        total_cost: 23.70,
        cost_per_unit: 0.24,
        selling_price: 1.80,
        actual_margin: 86.7,
        completed_at: '2024-09-27T16:30:00Z',
        completed_by: 'Marie Pâtissière',
        quality_checks: [
          { check: 'Couleur dorée', status: 'passed', checked_by: 'Chef Paul' },
          { check: 'Texture feuilletée', status: 'passed', checked_by: 'Chef Paul' },
          { check: 'Poids moyen', status: 'passed', checked_by: 'Marie Pâtissière' }
        ]
      },
      {
        id: 3,
        order_number: 'PROD-2024-003',
        product_name: 'Tarte aux pommes',
        product_id: 'P003',
        quantity: 8,
        unit: 'tartes',
        status: 'scheduled',
        priority: 'low',
        start_date: '2024-09-29',
        end_date: '2024-09-29',
        estimated_time: 180,
        actual_time: null,
        responsible_person: 'Sophie Pâtissière',
        responsible_id: 'EMP003',
        ingredients: [
          { name: 'Pâte brisée', quantity: 2, unit: 'kg', cost: 8.00, supplier: 'Maison' },
          { name: 'Pommes', quantity: 4, unit: 'kg', cost: 6.00, supplier: 'Verger Local' },
          { name: 'Sucre', quantity: 500, unit: 'g', cost: 1.50, supplier: 'Sucre & Co' }
        ],
        total_cost: 15.50,
        cost_per_unit: 1.94,
        selling_price: 12.50,
        expected_margin: 84.5,
        notes: 'Pommes de saison, recette grand-mère'
      }
    ];

    // Apply filters
    if (status) {
      productionOrders = productionOrders.filter(order => order.status === status);
    }
    
    if (responsible_person) {
      productionOrders = productionOrders.filter(order => 
        order.responsible_person.toLowerCase().includes(responsible_person.toLowerCase())
      );
    }

    res.json(productionOrders);
  } catch (error) {
    console.error('Error fetching production orders:', error);
    res.status(500).json({ error: 'Failed to fetch production orders' });
  }
});

// GET /api/production/:id - Get production order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const productionOrder = {
      id: parseInt(id),
      order_number: 'PROD-2024-001',
      product_name: 'Pain de campagne',
      product_id: 'P001',
      recipe_id: 'R001',
      batch_number: 'BATCH-20240928-001',
      quantity: 50,
      unit: 'unités',
      status: 'in_progress',
      priority: 'high',
      start_date: '2024-09-28',
      end_date: '2024-09-28',
      estimated_time: 240,
      actual_time: 180,
      responsible_person: 'Jean Boulanger',
      responsible_id: 'EMP001',
      ingredients: [
        {
          id: 1,
          name: 'Farine T65',
          quantity: 5,
          unit: 'kg',
          cost: 8.50,
          supplier: 'Moulin Martin',
          lot_number: 'LOT-F65-240920',
          expiry_date: '2025-03-20'
        },
        {
          id: 2,
          name: 'Levure',
          quantity: 50,
          unit: 'g',
          cost: 2.30,
          supplier: 'Levures Bio',
          lot_number: 'LOT-LV-240925',
          expiry_date: '2024-12-25'
        }
      ],
      total_cost: 11.00,
      cost_per_unit: 0.22,
      selling_price: 3.50,
      expected_margin: 93.7,
      production_steps: [
        {
          step: 1,
          name: 'Préparation de la pâte',
          estimated_duration: 30,
          actual_duration: 25,
          status: 'completed',
          completed_at: '2024-09-28T08:25:00Z',
          notes: 'Pâte bien homogène'
        },
        {
          step: 2,
          name: 'Première fermentation',
          estimated_duration: 120,
          actual_duration: 115,
          status: 'completed',
          completed_at: '2024-09-28T10:20:00Z',
          notes: 'Levée parfaite'
        },
        {
          step: 3,
          name: 'Façonnage',
          estimated_duration: 30,
          actual_duration: 28,
          status: 'completed',
          completed_at: '2024-09-28T10:48:00Z',
          notes: 'Pains bien formés'
        },
        {
          step: 4,
          name: 'Deuxième fermentation',
          estimated_duration: 60,
          actual_duration: null,
          status: 'in_progress',
          started_at: '2024-09-28T10:50:00Z',
          notes: ''
        },
        {
          step: 5,
          name: 'Cuisson',
          estimated_duration: 45,
          actual_duration: null,
          status: 'pending',
          notes: 'Four à 220°C'
        }
      ],
      quality_checks: [
        {
          check: 'Poids des pains',
          target: '400g ± 20g',
          status: 'pending',
          checked_by: null,
          checked_at: null
        },
        {
          check: 'Couleur de la croûte',
          target: 'Dorée uniforme',
          status: 'pending',
          checked_by: null,
          checked_at: null
        }
      ],
      notes: 'Recette traditionnelle, cuisson au four à bois. Client préfère une croûte bien dorée.'
    };

    res.json(productionOrder);
  } catch (error) {
    console.error('Error fetching production order:', error);
    res.status(500).json({ error: 'Failed to fetch production order' });
  }
});

// POST /api/production - Create new production order
router.post('/', async (req, res) => {
  try {
    const {
      product_name,
      product_id,
      quantity,
      unit = 'unités',
      priority = 'medium',
      start_date,
      end_date,
      responsible_person,
      ingredients,
      notes
    } = req.body;

    if (!product_name || !quantity || !start_date) {
      return res.status(400).json({ error: 'Product name, quantity, and start date are required' });
    }

    const totalCost = ingredients ? ingredients.reduce((sum, ing) => sum + (ing.cost || 0), 0) : 0;
    const costPerUnit = quantity > 0 ? totalCost / quantity : 0;

    const newProductionOrder = {
      id: Date.now(),
      order_number: `PROD-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      product_name,
      product_id,
      batch_number: `BATCH-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(Date.now()).slice(-3)}`,
      quantity: parseInt(quantity),
      unit,
      status: 'scheduled',
      priority,
      start_date,
      end_date: end_date || start_date,
      estimated_time: 240, // Default 4 hours
      actual_time: null,
      responsible_person: responsible_person || 'À assigner',
      ingredients: ingredients || [],
      total_cost: parseFloat(totalCost.toFixed(2)),
      cost_per_unit: parseFloat(costPerUnit.toFixed(2)),
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    res.status(201).json(newProductionOrder);
  } catch (error) {
    console.error('Error creating production order:', error);
    res.status(500).json({ error: 'Failed to create production order' });
  }
});

// PUT /api/production/:id - Update production order
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.ingredients && updateData.quantity) {
      const totalCost = updateData.ingredients.reduce((sum, ing) => sum + (ing.cost || 0), 0);
      updateData.total_cost = parseFloat(totalCost.toFixed(2));
      updateData.cost_per_unit = parseFloat((totalCost / updateData.quantity).toFixed(2));
    }

    const updatedOrder = {
      id: parseInt(id),
      ...updateData,
      updated_at: new Date().toISOString()
    };

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating production order:', error);
    res.status(500).json({ error: 'Failed to update production order' });
  }
});

// POST /api/production/:id/start - Start production order
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const { started_by } = req.body;

    const startedOrder = {
      id: parseInt(id),
      status: 'in_progress',
      started_at: new Date().toISOString(),
      started_by: started_by || 'System',
      updated_at: new Date().toISOString()
    };

    res.json(startedOrder);
  } catch (error) {
    console.error('Error starting production order:', error);
    res.status(500).json({ error: 'Failed to start production order' });
  }
});

// POST /api/production/:id/complete - Complete production order
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed_by, actual_quantity, quality_notes } = req.body;

    const completedOrder = {
      id: parseInt(id),
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: completed_by || 'System',
      actual_quantity: actual_quantity || null,
      quality_notes: quality_notes || '',
      updated_at: new Date().toISOString()
    };

    res.json(completedOrder);
  } catch (error) {
    console.error('Error completing production order:', error);
    res.status(500).json({ error: 'Failed to complete production order' });
  }
});

// GET /api/production/recipes - Get production recipes
router.get('/recipes', async (req, res) => {
  try {
    const recipes = [
      {
        id: 1,
        name: 'Pain de campagne traditionnel',
        category: 'Boulangerie',
        yield: 10,
        unit: 'pains de 400g',
        preparation_time: 30,
        fermentation_time: 180,
        cooking_time: 45,
        total_time: 255,
        difficulty: 'medium',
        ingredients: [
          { name: 'Farine T65', quantity: 1000, unit: 'g' },
          { name: 'Eau', quantity: 650, unit: 'ml' },
          { name: 'Levure', quantity: 10, unit: 'g' },
          { name: 'Sel', quantity: 20, unit: 'g' }
        ],
        steps: [
          'Mélanger la farine et le sel',
          'Dissoudre la levure dans l\'eau tiède',
          'Incorporer l\'eau à la farine',
          'Pétrir pendant 10 minutes',
          'Première fermentation (2h)',
          'Façonner les pains',
          'Deuxième fermentation (1h)',
          'Cuire à 220°C pendant 45 minutes'
        ]
      }
    ];

    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// GET /api/production/stats - Get production statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      today: {
        orders: 12,
        completed: 8,
        in_progress: 3,
        scheduled: 1,
        total_production_cost: 456.80,
        estimated_revenue: 2340.50
      },
      this_week: {
        orders: 78,
        completed: 65,
        in_progress: 8,
        scheduled: 5,
        total_production_cost: 2890.40,
        actual_revenue: 12456.70,
        efficiency: 87.5 // Percentage
      },
      popular_products: [
        { name: 'Pain de campagne', orders: 45, revenue: 4567.50 },
        { name: 'Croissants', orders: 32, revenue: 2345.60 },
        { name: 'Baguettes', orders: 28, revenue: 1234.80 }
      ],
      efficiency_by_person: [
        { name: 'Jean Boulanger', orders: 23, avg_time_deviation: -5.2 },
        { name: 'Marie Pâtissière', orders: 18, avg_time_deviation: 2.1 },
        { name: 'Sophie Pâtissière', orders: 15, avg_time_deviation: -1.8 }
      ],
      cost_analysis: {
        avg_cost_per_unit: 0.67,
        avg_margin: 78.4,
        most_expensive_ingredient: 'Beurre (8.00€/kg)',
        cost_trend: 'stable'
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching production stats:', error);
    res.status(500).json({ error: 'Failed to fetch production stats' });
  }
});

module.exports = router;