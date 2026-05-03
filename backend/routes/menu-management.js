const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/menu - Get complete menu structure
router.get('/', async (req, res) => {
  try {
    const menu = {
      categories: [
        {
          id: 1,
          name: 'Boissons',
          display_order: 1,
          is_active: true,
          items: [
            {
              id: 1,
              name: 'Café Expresso',
              description: 'Café italien authentique, corsé et aromatique',
              price: 2.50,
              category_id: 1,
              is_available: true,
              preparation_time: 2,
              allergens: [],
              variants: [
                { name: 'Simple', price_modifier: 0 },
                { name: 'Double', price_modifier: 1.00 }
              ]
            },
            {
              id: 2,
              name: 'Cappuccino',
              description: 'Expresso avec mousse de lait onctueuse',
              price: 3.50,
              category_id: 1,
              is_available: true,
              preparation_time: 3,
              allergens: ['lait']
            }
          ]
        },
        {
          id: 2,
          name: 'Pâtisseries',
          display_order: 2,
          is_active: true,
          items: [
            {
              id: 3,
              name: 'Croissant',
              description: 'Croissant au beurre, croustillant et doré',
              price: 1.80,
              category_id: 2,
              is_available: true,
              preparation_time: 0,
              allergens: ['gluten', 'lait']
            },
            {
              id: 4,
              name: 'Pain au Chocolat',
              description: 'Viennoiserie feuilletée avec chocolat noir',
              price: 2.00,
              category_id: 2,
              is_available: true,
              preparation_time: 0,
              allergens: ['gluten', 'lait']
            }
          ]
        },
        {
          id: 3,
          name: 'Plats',
          display_order: 3,
          is_active: true,
          items: [
            {
              id: 5,
              name: 'Salade César',
              description: 'Salade romaine, parmesan, croûtons, sauce césar',
              price: 12.50,
              category_id: 3,
              is_available: true,
              preparation_time: 8,
              allergens: ['lait', 'œuf'],
              options: [
                { name: 'Avec poulet', price_modifier: 3.00 },
                { name: 'Avec saumon', price_modifier: 5.00 }
              ]
            }
          ]
        }
      ],
      stats: {
        total_categories: 3,
        total_items: 5,
        active_items: 5,
        average_price: 4.46
      }
    };

    res.json(menu);
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// GET /api/menu/categories - Get menu categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { id: 1, name: 'Boissons', display_order: 1, is_active: true, items_count: 8 },
      { id: 2, name: 'Pâtisseries', display_order: 2, is_active: true, items_count: 6 },
      { id: 3, name: 'Plats', display_order: 3, is_active: true, items_count: 12 },
      { id: 4, name: 'Desserts', display_order: 4, is_active: true, items_count: 5 }
    ];

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/menu/categories - Create new category
router.post('/categories', async (req, res) => {
  try {
    const { name, display_order, is_active = true } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const newCategory = {
      id: Date.now(),
      name,
      display_order: display_order || 999,
      is_active,
      items_count: 0,
      created_at: new Date().toISOString()
    };

    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/menu/categories/:id - Update category
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedCategory = {
      id: parseInt(id),
      ...updateData,
      updated_at: new Date().toISOString()
    };

    res.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/menu/categories/:id - Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    res.json({ 
      success: true, 
      message: `Category ${id} deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// GET /api/menu/items - Get menu items
router.get('/items', async (req, res) => {
  try {
    const { category_id, available_only } = req.query;
    
    let items = [
      {
        id: 1,
        name: 'Café Expresso',
        description: 'Café italien authentique',
        price: 2.50,
        category_id: 1,
        category_name: 'Boissons',
        is_available: true,
        preparation_time: 2,
        allergens: [],
        image_url: null
      },
      {
        id: 2,
        name: 'Cappuccino',
        description: 'Expresso avec mousse de lait',
        price: 3.50,
        category_id: 1,
        category_name: 'Boissons',
        is_available: true,
        preparation_time: 3,
        allergens: ['lait']
      },
      {
        id: 3,
        name: 'Croissant',
        description: 'Croissant au beurre traditionnel',
        price: 1.80,
        category_id: 2,
        category_name: 'Pâtisseries',
        is_available: true,
        preparation_time: 0,
        allergens: ['gluten', 'lait']
      }
    ];

    // Filter by category if specified
    if (category_id) {
      items = items.filter(item => item.category_id === parseInt(category_id));
    }

    // Filter by availability if specified
    if (available_only === 'true') {
      items = items.filter(item => item.is_available);
    }

    res.json(items);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// GET /api/menu/items/:id - Get menu item by ID
router.get('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = {
      id: parseInt(id),
      name: 'Salade César',
      description: 'Salade romaine fraîche avec parmesan, croûtons maison et sauce césar',
      price: 12.50,
      category_id: 3,
      category_name: 'Plats',
      is_available: true,
      preparation_time: 8,
      allergens: ['lait', 'œuf'],
      ingredients: ['Salade romaine', 'Parmesan', 'Croûtons', 'Sauce césar'],
      nutritional_info: {
        calories: 280,
        protein: 15,
        carbs: 12,
        fat: 20
      },
      variants: [
        { name: 'Classique', price_modifier: 0 },
        { name: 'Avec poulet', price_modifier: 3.00 },
        { name: 'Avec saumon', price_modifier: 5.00 }
      ]
    };

    res.json(item);
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// POST /api/menu/items - Create new menu item
router.post('/items', async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category_id,
      preparation_time = 0,
      allergens = [],
      is_available = true
    } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    const newItem = {
      id: Date.now(),
      name,
      description,
      price: parseFloat(price),
      category_id: parseInt(category_id),
      preparation_time: parseInt(preparation_time),
      allergens,
      is_available,
      created_at: new Date().toISOString()
    };

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// PUT /api/menu/items/:id - Update menu item
router.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.price) {
      updateData.price = parseFloat(updateData.price);
    }

    const updatedItem = {
      id: parseInt(id),
      ...updateData,
      updated_at: new Date().toISOString()
    };

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// DELETE /api/menu/items/:id - Delete menu item
router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    res.json({ 
      success: true, 
      message: `Menu item ${id} deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// POST /api/menu/items/:id/toggle-availability - Toggle item availability
router.post('/items/:id/toggle-availability', async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = {
      id: parseInt(id),
      is_available: Math.random() > 0.5, // Random toggle for demo
      updated_at: new Date().toISOString()
    };

    res.json(item);
  } catch (error) {
    console.error('Error toggling item availability:', error);
    res.status(500).json({ error: 'Failed to toggle item availability' });
  }
});

module.exports = router;