const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/takeaway/orders - Récupérer toutes les commandes à emporter
router.get('/orders', async (req, res) => {
  try {
    const { date, status } = req.query;
    
    let whereClause = {
      orderType: 'TAKEAWAY'
    };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereClause.createdAt = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    if (status) {
      whereClause.status = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        customer: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching takeaway orders:', error);
    res.status(500).json({ error: 'Failed to fetch takeaway orders' });
  }
});

// POST /api/takeaway/orders - Créer une nouvelle commande à emporter
router.post('/orders', async (req, res) => {
  try {
    const { customerId, items, pickupTime, specialInstructions } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Calculer le total
    let total = 0;
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });
      if (product) {
        total += product.price * item.quantity;
      }
    }

    const order = await prisma.order.create({
      data: {
        customerId,
        orderType: 'TAKEAWAY',
        status: 'PENDING',
        total,
        pickupTime: pickupTime ? new Date(pickupTime) : null,
        specialInstructions,
        orderItems: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        }
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        customer: true
      }
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating takeaway order:', error);
    res.status(500).json({ error: 'Failed to create takeaway order' });
  }
});

// PUT /api/takeaway/orders/:id/status - Mettre à jour le statut d'une commande
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        customer: true
      }
    });

    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// GET /api/takeaway/stats - Statistiques des commandes à emporter
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayOrders, totalRevenue, avgPreparationTime] = await Promise.all([
      prisma.order.count({
        where: {
          orderType: 'TAKEAWAY',
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      prisma.order.aggregate({
        where: {
          orderType: 'TAKEAWAY',
          createdAt: {
            gte: today,
            lt: tomorrow
          },
          status: {
            not: 'CANCELLED'
          }
        },
        _sum: {
          total: true
        }
      }),
      prisma.order.aggregate({
        where: {
          orderType: 'TAKEAWAY',
          status: 'DELIVERED',
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        },
        _avg: {
          preparationTime: true
        }
      })
    ]);

    res.json({
      todayOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      avgPreparationTime: avgPreparationTime._avg.preparationTime || 0
    });
  } catch (error) {
    console.error('Error fetching takeaway stats:', error);
    res.status(500).json({ error: 'Failed to fetch takeaway stats' });
  }
});

module.exports = router;
