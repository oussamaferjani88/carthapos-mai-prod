const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/payment-advanced/methods - Get available payment methods
router.get('/methods', async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 1,
        name: 'Carte bancaire',
        type: 'card',
        provider: 'stripe',
        is_active: true,
        fee_percentage: 2.9,
        fee_fixed: 0.30,
        supported_cards: ['visa', 'mastercard', 'amex'],
        requires_terminal: true,
        icon: 'credit-card'
      },
      {
        id: 2,
        name: 'Sans contact',
        type: 'contactless',
        provider: 'stripe',
        is_active: true,
        fee_percentage: 2.9,
        fee_fixed: 0.30,
        max_amount: 50.00,
        requires_terminal: true,
        icon: 'smartphone'
      },
      {
        id: 3,
        name: 'Apple Pay',
        type: 'mobile',
        provider: 'stripe',
        is_active: true,
        fee_percentage: 2.9,
        fee_fixed: 0.30,
        requires_terminal: false,
        icon: 'smartphone'
      },
      {
        id: 4,
        name: 'Google Pay',
        type: 'mobile',
        provider: 'stripe',
        is_active: true,
        fee_percentage: 2.9,
        fee_fixed: 0.30,
        requires_terminal: false,
        icon: 'smartphone'
      },
      {
        id: 5,
        name: 'PayPal',
        type: 'digital',
        provider: 'paypal',
        is_active: false,
        fee_percentage: 3.4,
        fee_fixed: 0.35,
        requires_terminal: false,
        icon: 'paypal'
      },
      {
        id: 6,
        name: 'Chèque',
        type: 'check',
        provider: 'manual',
        is_active: true,
        fee_percentage: 0,
        fee_fixed: 0,
        requires_verification: true,
        icon: 'file-text'
      },
      {
        id: 7,
        name: 'Virement',
        type: 'transfer',
        provider: 'manual',
        is_active: true,
        fee_percentage: 0,
        fee_fixed: 0,
        requires_verification: true,
        icon: 'arrow-right'
      }
    ];

    res.json(paymentMethods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// POST /api/payment-advanced/process - Process advanced payment
router.post('/process', async (req, res) => {
  try {
    const {
      amount,
      payment_method_id,
      payment_data,
      order_id,
      customer_id
    } = req.body;

    if (!amount || !payment_method_id) {
      return res.status(400).json({ error: 'Amount and payment method are required' });
    }

    // Mock payment processing
    const paymentResult = {
      id: Date.now(),
      order_id,
      customer_id,
      amount: parseFloat(amount),
      payment_method_id: parseInt(payment_method_id),
      status: Math.random() > 0.1 ? 'completed' : 'failed', // 90% success rate
      transaction_id: `TXN-${Date.now()}`,
      processing_fee: parseFloat((amount * 0.029 + 0.30).toFixed(2)),
      processed_at: new Date().toISOString(),
      payment_data: payment_data || {}
    };

    if (paymentResult.status === 'failed') {
      paymentResult.error_code = 'CARD_DECLINED';
      paymentResult.error_message = 'Transaction was declined by the bank';
    }

    res.json(paymentResult);
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// GET /api/payment-advanced/transactions - Get payment transactions
router.get('/transactions', async (req, res) => {
  try {
    const { start_date, end_date, status, payment_method } = req.query;
    
    const transactions = [
      {
        id: 1,
        transaction_id: 'TXN-1727534400123',
        order_id: 'ORD-001',
        amount: 25.50,
        status: 'completed',
        payment_method: 'Carte bancaire',
        customer_name: 'Jean Dupont',
        processed_at: '2024-09-28T10:30:00Z',
        processing_fee: 1.04
      },
      {
        id: 2,
        transaction_id: 'TXN-1727534401456',
        order_id: 'ORD-002',
        amount: 15.80,
        status: 'completed',
        payment_method: 'Apple Pay',
        customer_name: 'Marie Martin',
        processed_at: '2024-09-28T11:15:00Z',
        processing_fee: 0.76
      },
      {
        id: 3,
        transaction_id: 'TXN-1727534402789',
        order_id: 'ORD-003',
        amount: 45.20,
        status: 'failed',
        payment_method: 'Carte bancaire',
        customer_name: 'Pierre Durand',
        processed_at: '2024-09-28T12:00:00Z',
        processing_fee: 0,
        error_message: 'Insufficient funds'
      }
    ];

    // Apply filters if provided
    let filteredTransactions = transactions;
    
    if (status) {
      filteredTransactions = filteredTransactions.filter(t => t.status === status);
    }
    
    if (payment_method) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.payment_method.toLowerCase().includes(payment_method.toLowerCase())
      );
    }

    res.json(filteredTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/payment-advanced/terminals - Get payment terminals status
router.get('/terminals', async (req, res) => {
  try {
    const terminals = [
      {
        id: 1,
        name: 'Terminal Principal',
        serial_number: 'TPE-001',
        model: 'Ingenico Move/5000',
        status: 'online',
        battery_level: 87,
        last_transaction: '2024-09-28T12:30:00Z',
        software_version: '2.1.4',
        supported_methods: ['card', 'contactless', 'mobile']
      },
      {
        id: 2,
        name: 'Terminal Mobile',
        serial_number: 'TPE-002',
        model: 'SumUp Air',
        status: 'online',
        battery_level: 45,
        last_transaction: '2024-09-28T11:45:00Z',
        software_version: '1.8.2',
        supported_methods: ['card', 'contactless']
      },
      {
        id: 3,
        name: 'Terminal Secours',
        serial_number: 'TPE-003',
        model: 'Square Reader',
        status: 'offline',
        battery_level: 0,
        last_transaction: '2024-09-27T18:00:00Z',
        software_version: '3.2.1',
        supported_methods: ['card']
      }
    ];

    res.json(terminals);
  } catch (error) {
    console.error('Error fetching terminals:', error);
    res.status(500).json({ error: 'Failed to fetch terminals' });
  }
});

// POST /api/payment-advanced/refund - Process refund
router.post('/refund', async (req, res) => {
  try {
    const { transaction_id, amount, reason } = req.body;

    if (!transaction_id || !amount) {
      return res.status(400).json({ error: 'Transaction ID and amount are required' });
    }

    const refund = {
      id: Date.now(),
      original_transaction_id: transaction_id,
      refund_amount: parseFloat(amount),
      reason: reason || 'Customer request',
      status: 'processing',
      refund_id: `REF-${Date.now()}`,
      processed_at: new Date().toISOString(),
      estimated_arrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days
    };

    // Simulate processing
    setTimeout(() => {
      refund.status = 'completed';
    }, 2000);

    res.json(refund);
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// GET /api/payment-advanced/stats - Get payment statistics
router.get('/stats', async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
    const stats = {
      period,
      total_transactions: 156,
      successful_transactions: 148,
      failed_transactions: 8,
      success_rate: 94.9,
      total_amount: 3245.80,
      total_fees: 112.87,
      net_amount: 3132.93,
      by_method: [
        { method: 'Carte bancaire', count: 89, amount: 2156.40, percentage: 66.4 },
        { method: 'Sans contact', count: 34, amount: 678.20, percentage: 20.9 },
        { method: 'Apple Pay', count: 18, amount: 289.50, percentage: 8.9 },
        { method: 'Google Pay', count: 7, amount: 121.70, percentage: 3.8 }
      ],
      hourly_distribution: [
        { hour: 8, transactions: 12, amount: 145.60 },
        { hour: 9, transactions: 18, amount: 234.80 },
        { hour: 10, transactions: 15, amount: 189.40 },
        { hour: 11, transactions: 22, amount: 345.20 },
        { hour: 12, transactions: 28, amount: 456.80 },
        { hour: 13, transactions: 25, amount: 389.60 },
        { hour: 14, transactions: 16, amount: 234.50 }
      ]
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ error: 'Failed to fetch payment stats' });
  }
});

module.exports = router;