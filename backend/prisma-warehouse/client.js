/**
 * Warehouse Database Client
 *
 * Separate PrismaClient instance connected to the pos_system_warehouse
 * database. Used exclusively by ETL pipeline, warehouse-service, and
 * analytics routes for Dim/Fact table operations.
 *
 * The main PrismaClient (from @prisma/client) connects to pos_system
 * and handles all platform/operational models.
 */

const { PrismaClient } = require('../prisma-warehouse-generated');

const warehousePrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.WAREHOUSE_DATABASE_URL
    }
  }
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await warehousePrisma.$disconnect();
});

module.exports = warehousePrisma;
