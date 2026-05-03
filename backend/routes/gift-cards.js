const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/gift-cards - Get all gift cards
router.get('/', async (req, res) => {
  try {
    const { status, customer_id } = req.query;
    
    let giftCards = [
      {
        id: 1,
        card_number: 'GC-2024-001234',
        initial_amount: 50.00,
        current_balance: 35.50,
        status: 'active',
        customer_id: 1,
        customer_name: 'Jean Dupont',
        customer_email: 'jean.dupont@email.com',
        issued_date: '2024-09-15',
        expiry_date: '2025-09-15',
        issued_by: 'Marie Caissière',
        last_used: '2024-09-25'
      },
      {
        id: 2,
        card_number: 'GC-2024-005678',
        initial_amount: 100.00,
        current_balance: 100.00,
        status: 'active',
        customer_id: 2,
        customer_name: 'Sophie Martin',
        customer_email: 'sophie.martin@email.com',
        issued_date: '2024-09-20',
        expiry_date: '2025-09-20',
        issued_by: 'Pierre Manager',
        last_used: null
      },
      {
        id: 3,
        card_number: 'GC-2024-009012',
        initial_amount: 25.00,
        current_balance: 0.00,
        status: 'expired',
        customer_id: 3,
        customer_name: 'Michel Durand',
        customer_email: 'michel.durand@email.com',
        issued_date: '2023-09-10',
        expiry_date: '2024-09-10',
        issued_by: 'Julie Vendeuse',
        last_used: '2024-08-15'
      }
    ];

    // Apply filters
    if (status) {
      giftCards = giftCards.filter(card => card.status === status);
    }
    
    if (customer_id) {
      giftCards = giftCards.filter(card => card.customer_id === parseInt(customer_id));
    }

    res.json(giftCards);
  } catch (error) {
    console.error('Error fetching gift cards:', error);
    res.status(500).json({ error: 'Failed to fetch gift cards' });
  }
});

// GET /api/gift-cards/:id - Get gift card by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const giftCard = {
      id: parseInt(id),
      card_number: 'GC-2024-001234',
      initial_amount: 50.00,
      current_balance: 35.50,
      status: 'active',
      customer_id: 1,
      customer_name: 'Jean Dupont',
      customer_email: 'jean.dupont@email.com',
      customer_phone: '+33 1 23 45 67 89',
      issued_date: '2024-09-15',
      expiry_date: '2025-09-15',
      issued_by: 'Marie Caissière',
      last_used: '2024-09-25',
      transactions: [
        {
          id: 1,
          type: 'issued',
          amount: 50.00,
          balance_after: 50.00,
          date: '2024-09-15',
          description: 'Carte cadeau émise'
        },
        {
          id: 2,
          type: 'used',
          amount: -14.50,
          balance_after: 35.50,
          date: '2024-09-25',
          description: 'Achat - Café et croissant',
          order_id: 'ORD-789'
        }
      ]
    };

    res.json(giftCard);
  } catch (error) {
    console.error('Error fetching gift card:', error);
    res.status(500).json({ error: 'Failed to fetch gift card' });
  }
});

// POST /api/gift-cards - Create new gift card
router.post('/', async (req, res) => {
  try {
    const {
      amount,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      expiry_months = 12,
      message,
      issued_by
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const cardNumber = `GC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + expiry_months);

    const newGiftCard = {
      id: Date.now(),
      card_number: cardNumber,
      initial_amount: parseFloat(amount),
      current_balance: parseFloat(amount),
      status: 'active',
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      issued_date: new Date().toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      issued_by: issued_by || 'System',
      message: message || '',
      last_used: null
    };

    res.status(201).json(newGiftCard);
  } catch (error) {
    console.error('Error creating gift card:', error);
    res.status(500).json({ error: 'Failed to create gift card' });
  }
});

// PUT /api/gift-cards/:id - Update gift card
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedGiftCard = {
      id: parseInt(id),
      ...updateData,
      updated_at: new Date().toISOString()
    };

    res.json(updatedGiftCard);
  } catch (error) {
    console.error('Error updating gift card:', error);
    res.status(500).json({ error: 'Failed to update gift card' });
  }
});

// POST /api/gift-cards/:id/use - Use gift card for payment
router.post('/:id/use', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, order_id, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Mock current balance check
    const currentBalance = 35.50;
    
    if (amount > currentBalance) {
      return res.status(400).json({ 
        error: 'Insufficient balance', 
        current_balance: currentBalance,
        requested_amount: amount
      });
    }

    const newBalance = currentBalance - amount;

    const transaction = {
      id: Date.now(),
      gift_card_id: parseInt(id),
      type: 'used',
      amount: -parseFloat(amount),
      balance_after: parseFloat(newBalance.toFixed(2)),
      date: new Date().toISOString(),
      description: description || 'Gift card payment',
      order_id: order_id || null
    };

    res.json({
      success: true,
      transaction,
      new_balance: newBalance,
      remaining_balance: newBalance
    });
  } catch (error) {
    console.error('Error using gift card:', error);
    res.status(500).json({ error: 'Failed to use gift card' });
  }
});

// POST /api/gift-cards/:id/reload - Add money to gift card
router.post('/:id/reload', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_method, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Mock current balance
    const currentBalance = 35.50;
    const newBalance = currentBalance + parseFloat(amount);

    const transaction = {
      id: Date.now(),
      gift_card_id: parseInt(id),
      type: 'reload',
      amount: parseFloat(amount),
      balance_after: parseFloat(newBalance.toFixed(2)),
      date: new Date().toISOString(),
      description: `Rechargement - ${payment_method || 'Espèces'}`,
      notes: notes || ''
    };

    res.json({
      success: true,
      transaction,
      new_balance: newBalance,
      previous_balance: currentBalance
    });
  } catch (error) {
    console.error('Error reloading gift card:', error);
    res.status(500).json({ error: 'Failed to reload gift card' });
  }
});

// GET /api/gift-cards/check/:card_number - Check gift card by number
router.get('/check/:card_number', async (req, res) => {
  try {
    const { card_number } = req.params;
    
    if (!card_number.startsWith('GC-')) {
      return res.status(400).json({ error: 'Invalid gift card number format' });
    }

    const giftCard = {
      card_number,
      current_balance: 35.50,
      status: 'active',
      expiry_date: '2025-09-15',
      customer_name: 'Jean Dupont',
      is_valid: true
    };

    res.json(giftCard);
  } catch (error) {
    console.error('Error checking gift card:', error);
    res.status(500).json({ error: 'Failed to check gift card' });
  }
});

// POST /api/gift-cards/:id/deactivate - Deactivate gift card
router.post('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = {
      id: parseInt(id),
      status: 'deactivated',
      deactivated_at: new Date().toISOString(),
      deactivation_reason: reason || 'Manual deactivation'
    };

    res.json(result);
  } catch (error) {
    console.error('Error deactivating gift card:', error);
    res.status(500).json({ error: 'Failed to deactivate gift card' });
  }
});

// GET /api/gift-cards/stats - Get gift card statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      total_cards: 245,
      active_cards: 189,
      expired_cards: 34,
      deactivated_cards: 22,
      total_issued_value: 12450.00,
      total_current_balance: 8750.50,
      total_redeemed_value: 3699.50,
      average_card_value: 50.82,
      most_popular_amounts: [
        { amount: 25.00, count: 78 },
        { amount: 50.00, count: 123 },
        { amount: 100.00, count: 44 }
      ],
      monthly_stats: [
        { month: '2024-07', issued: 23, redeemed: 1245.60 },
        { month: '2024-08', issued: 31, redeemed: 1890.30 },
        { month: '2024-09', issued: 28, redeemed: 1456.80 }
      ],
      redemption_rate: 29.7 // Percentage of total value redeemed
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching gift card stats:', error);
    res.status(500).json({ error: 'Failed to fetch gift card stats' });
  }
});

module.exports = router;