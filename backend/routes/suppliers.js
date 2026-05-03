const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/suppliers - Get all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = [
      {
        id: 1,
        name: 'Boulangerie Martin',
        email: 'contact@boulangerie-martin.fr',
        phone: '+33 1 23 45 67 89',
        address: '15 Rue du Pain, 75001 Paris',
        category: 'Boulangerie',
        status: 'active',
        contact_person: 'Jean Martin',
        tax_number: 'FR12345678901',
        payment_terms: '30 jours',
        products: ['Pain', 'Viennoiseries', 'Pâtisseries'],
        rating: 4.5,
        orders_count: 45,
        last_order: '2024-09-25',
        created_at: '2024-01-15'
      },
      {
        id: 2,
        name: 'Fruits & Légumes Bio',
        email: 'commandes@fruits-bio.fr',
        phone: '+33 1 34 56 78 90',
        address: '22 Avenue Verte, 75012 Paris',
        category: 'Fruits & Légumes',
        status: 'active',
        contact_person: 'Marie Dupont',
        tax_number: 'FR23456789012',
        payment_terms: '15 jours',
        products: ['Fruits bio', 'Légumes bio', 'Herbes'],
        rating: 4.8,
        orders_count: 78,
        last_order: '2024-09-26',
        created_at: '2024-02-10'
      },
      {
        id: 3,
        name: 'Laiterie Régionale',
        email: 'service@laiterie-regionale.fr',
        phone: '+33 1 45 67 89 01',
        address: '8 Chemin des Vaches, 75020 Paris',
        category: 'Produits laitiers',
        status: 'active',
        contact_person: 'Pierre Fromage',
        tax_number: 'FR34567890123',
        payment_terms: '21 jours',
        products: ['Lait', 'Fromages', 'Yaourts', 'Beurre'],
        rating: 4.2,
        orders_count: 32,
        last_order: '2024-09-24',
        created_at: '2024-03-05'
      }
    ];

    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// GET /api/suppliers/:id - Get supplier by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock supplier data
    const supplier = {
      id: parseInt(id),
      name: 'Boulangerie Martin',
      email: 'contact@boulangerie-martin.fr',
      phone: '+33 1 23 45 67 89',
      address: '15 Rue du Pain, 75001 Paris',
      category: 'Boulangerie',
      status: 'active',
      contact_person: 'Jean Martin',
      tax_number: 'FR12345678901',
      payment_terms: '30 jours',
      products: ['Pain', 'Viennoiseries', 'Pâtisseries'],
      rating: 4.5,
      orders_count: 45,
      last_order: '2024-09-25',
      created_at: '2024-01-15',
      notes: 'Fournisseur de confiance, livraisons ponctuelles'
    };

    res.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

// POST /api/suppliers - Create new supplier
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      category,
      contact_person,
      tax_number,
      payment_terms,
      products,
      notes
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const newSupplier = {
      id: Date.now(),
      name,
      email,
      phone,
      address,
      category,
      status: 'active',
      contact_person,
      tax_number,
      payment_terms: payment_terms || '30 jours',
      products: products || [],
      rating: 0,
      orders_count: 0,
      last_order: null,
      created_at: new Date().toISOString(),
      notes
    };

    res.status(201).json(newSupplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedSupplier = {
      id: parseInt(id),
      ...updateData,
      updated_at: new Date().toISOString()
    };

    res.json(updatedSupplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    res.json({ 
      success: true, 
      message: `Supplier ${id} deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

// GET /api/suppliers/:id/orders - Get supplier orders
router.get('/:id/orders', async (req, res) => {
  try {
    const { id } = req.params;
    
    const orders = [
      {
        id: 1,
        supplier_id: parseInt(id),
        order_number: 'CMD-2024-001',
        date: '2024-09-25',
        status: 'delivered',
        total: 245.80,
        items: [
          { product: 'Pain de campagne', quantity: 20, price: 3.50 },
          { product: 'Croissants', quantity: 50, price: 1.20 },
          { product: 'Pain au chocolat', quantity: 30, price: 1.40 }
        ]
      },
      {
        id: 2,
        supplier_id: parseInt(id),
        order_number: 'CMD-2024-002',
        date: '2024-09-20',
        status: 'delivered',
        total: 180.50,
        items: [
          { product: 'Baguettes', quantity: 40, price: 1.10 },
          { product: 'Tartes aux fruits', quantity: 8, price: 12.50 }
        ]
      }
    ];

    res.json(orders);
  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    res.status(500).json({ error: 'Failed to fetch supplier orders' });
  }
});

// POST /api/suppliers/:id/orders - Create order for supplier
router.post('/:id/orders', async (req, res) => {
  try {
    const { id } = req.params;
    const { items, notes } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const newOrder = {
      id: Date.now(),
      supplier_id: parseInt(id),
      order_number: `CMD-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      total,
      items,
      notes
    };

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating supplier order:', error);
    res.status(500).json({ error: 'Failed to create supplier order' });
  }
});

module.exports = router;