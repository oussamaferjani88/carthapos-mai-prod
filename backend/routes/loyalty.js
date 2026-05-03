const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/loyalty/customers - Récupérer tous les clients fidèles
router.get('/customers', async (req, res) => {
  try {
    const loyaltyCustomers = await prisma.customer.findMany({
      where: {
        loyaltyPoints: {
          gt: 0
        }
      },
      include: {
        orders: {
          select: {
            id: true,
            total: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        loyaltyPoints: 'desc'
      }
    });

    res.json(loyaltyCustomers);
  } catch (error) {
    console.error('Error fetching loyalty customers:', error);
    res.status(500).json({ error: 'Failed to fetch loyalty customers' });
  }
});

// POST /api/loyalty/points/add - Ajouter des points à un client
router.post('/points/add', async (req, res) => {
  try {
    const { customerId, points, reason } = req.body;

    if (!customerId || !points) {
      return res.status(400).json({ error: 'Customer ID and points are required' });
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: {
          increment: points
        }
      }
    });

    // Enregistrer la transaction de points
    await prisma.loyaltyTransaction.create({
      data: {
        customerId,
        points,
        type: 'EARNED',
        reason: reason || 'Points ajoutés manuellement'
      }
    });

    res.json(customer);
  } catch (error) {
    console.error('Error adding loyalty points:', error);
    res.status(500).json({ error: 'Failed to add loyalty points' });
  }
});

// POST /api/loyalty/points/redeem - Utiliser des points
router.post('/points/redeem', async (req, res) => {
  try {
    const { customerId, points, reason } = req.body;

    if (!customerId || !points) {
      return res.status(400).json({ error: 'Customer ID and points are required' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.loyaltyPoints < points) {
      return res.status(400).json({ error: 'Insufficient loyalty points' });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: {
          decrement: points
        }
      }
    });

    // Enregistrer la transaction de points
    await prisma.loyaltyTransaction.create({
      data: {
        customerId,
        points: -points,
        type: 'REDEEMED',
        reason: reason || 'Points utilisés'
      }
    });

    res.json(updatedCustomer);
  } catch (error) {
    console.error('Error redeeming loyalty points:', error);
    res.status(500).json({ error: 'Failed to redeem loyalty points' });
  }
});

// GET /api/loyalty/transactions/:customerId - Historique des transactions de points
router.get('/transactions/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const transactions = await prisma.loyaltyTransaction.findMany({
      where: { customerId },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching loyalty transactions:', error);
    res.status(500).json({ error: 'Failed to fetch loyalty transactions' });
  }
});

// GET /api/loyalty/stats - Statistiques du programme de fidélité
router.get('/stats', async (req, res) => {
  try {
    const [activeMembers, totalPointsDistributed, totalPointsRedeemed, averagePoints] = await Promise.all([
      prisma.customer.count({
        where: {
          loyaltyPoints: {
            gt: 0
          }
        }
      }),
      prisma.loyaltyTransaction.aggregate({
        where: {
          type: 'EARNED'
        },
        _sum: {
          points: true
        }
      }),
      prisma.loyaltyTransaction.aggregate({
        where: {
          type: 'REDEEMED'
        },
        _sum: {
          points: true
        }
      }),
      prisma.customer.aggregate({
        where: {
          loyaltyPoints: {
            gt: 0
          }
        },
        _avg: {
          loyaltyPoints: true
        }
      })
    ]);

    res.json({
      activeMembers,
      totalPointsDistributed: totalPointsDistributed._sum.points || 0,
      totalPointsRedeemed: Math.abs(totalPointsRedeemed._sum.points || 0),
      averagePoints: averagePoints._avg.loyaltyPoints || 0
    });
  } catch (error) {
    console.error('Error fetching loyalty stats:', error);
    res.status(500).json({ error: 'Failed to fetch loyalty stats' });
  }
});

module.exports = router;
