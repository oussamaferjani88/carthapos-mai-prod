/**
 * Warehouse Query Service
 *
 * Provides pre-computed analytics queries for the BI warehouse.
 * All queries are tenant-isolated via tenantId.
 * Business-type aware — returns relevant metrics per sector.
 *
 * These queries are designed for Metabase compatibility:
 *   - Each method returns raw data suitable for chart rendering
 *   - No custom dashboard logic — just structured data access
 */

const warehousePrisma = require('../prisma-warehouse/client');
const analyticsCache = require('./analytics-cache-service');

const prisma = warehousePrisma;

// dimTimeId is an int in YYYYMMDD form (the business transaction date).
// Analytics MUST bucket by dimTimeId — createdAt is only the ETL load time.
function toDimInt(date) {
  const dt = new Date(date);
  if (isNaN(dt.getTime())) return null;
  return dt.getUTCFullYear() * 10000 + (dt.getUTCMonth() + 1) * 100 + dt.getUTCDate();
}

function dimToDateKey(dimTimeId) {
  if (dimTimeId === null || dimTimeId === undefined) return null;
  const s = String(dimTimeId).padStart(8, '0');
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

class WarehouseService {

  // ─── Revenue ──────────────────────────────────────────────────

  // Revenue bucketed by TRANSACTION DATE (dimTimeId = YYYYMMDD).
  // Previously this grouped by createdAt (ETL load time), which shifted
  // revenue onto the upload date instead of the sale date.
  async getRevenueByDay(tenantId, days = 30, timezone = 'UTC') {
    const startDim = toDimInt(Date.now() - days * 86400000);

    const sales = await prisma.factSale.findMany({
      where: {
        tenantId,
        dimTimeId: { gte: startDim },
      },
      select: { dimTimeId: true, total: true },
      orderBy: { dimTimeId: 'asc' },
    });

    const byDay = {};
    for (const s of sales) {
      const key = dimToDateKey(s.dimTimeId);
      if (!key) continue;
      byDay[key] = (byDay[key] || 0) + s.total;
    }

    return Object.entries(byDay).map(([date, revenue]) => ({ date, revenue }));
  }

  // ─── Top Products ─────────────────────────────────────────────

  async getTopProducts(tenantId, limit = 10) {
    const inventory = await prisma.factInventory.findMany({
      where: { tenantId },
      orderBy: { timesSold: 'desc' },
      take: limit,
    });

    return inventory.map(i => ({
      productName: i.productName,
      timesSold: i.timesSold,
      stock: i.stock,
      price: i.price,
    }));
  }

  // ─── Inventory Turnover ───────────────────────────────────────

  async getInventoryTurnover(tenantId) {
    const items = await prisma.factInventory.findMany({
      where: { tenantId },
    });

    return items
      .filter(i => i.stock > 0)
      .map(i => ({
        productName: i.productName,
        turnover: i.timesSold / Math.max(i.stock, 1),
        timesSold: i.timesSold,
        stock: i.stock,
      }))
      .sort((a, b) => b.turnover - a.turnover);
  }

  // ─── Table Turnover (restaurant) ─────────────────────────────

  async getTableTurnover(tenantId) {
    const orders = await prisma.factKitchenOrder.findMany({
      where: { tenantId, tableNumber: { not: null } },
      orderBy: { tableNumber: 'asc' },
    });

    const byTable = {};
    for (const o of orders) {
      const key = o.tableNumber;
      byTable[key] = (byTable[key] || 0) + 1;
    }

    return Object.entries(byTable).map(([tableNumber, orderCount]) => ({
      tableNumber: parseInt(tableNumber),
      orderCount,
    }));
  }

  // ─── Kitchen Performance ──────────────────────────────────────

  // Window is applied to the ORDER DATE (dimTimeId), not the load time.
  async getKitchenPerformance(tenantId, days = 7) {
    const startDim = toDimInt(Date.now() - days * 86400000);

    const orders = await prisma.factKitchenOrder.findMany({
      where: {
        tenantId,
        dimTimeId: { gte: startDim },
      },
    });

    return {
      total: orders.length,
      byStatus: this._groupBy(orders, 'status'),
      byPriority: this._groupBy(orders, 'priority'),
    };
  }

  // ─── Appointments ────────────────────────────────────────────

  async getAppointmentSummary(tenantId) {
    const appointments = await prisma.factAppointment.findMany({
      where: { tenantId },
    });

    return {
      total: appointments.length,
      byStatus: this._groupBy(appointments, 'status'),
    };
  }

  // ─── Supplier Performance ─────────────────────────────────────

  async getSupplierPerformance(tenantId) {
    const suppliers = await prisma.dimSupplier.findMany({
      where: { tenantId },
    });

    return suppliers.map(s => ({
      name: s.name,
      contact: s.contact,
      phone: s.phone,
    }));
  }

  // ─── Peak Hours (cafe) ────────────────────────────────────────

  // The warehouse only stores the transaction DATE (dimTimeId, YYYYMMDD) —
  // hour-of-day is not in the warehouse schema. Transaction hours come from
  // the analytics cache, which is parsed from the POS export's created_at
  // (the real transaction timestamp). Using load-time createdAt here would
  // report upload hours instead of business hours, so it is not used.
  async getPeakHours(tenantId, timezone = 'UTC') {
    const { snapshot } = await analyticsCache.getSnapshot(tenantId);
    const sales = (snapshot && snapshot.datasets && snapshot.datasets.sales) || [];

    const byHour = {};
    for (const s of sales) {
      if (s.hour === null || s.hour === undefined) continue;
      byHour[s.hour] = (byHour[s.hour] || 0) + 1;
    }

    return Object.entries(byHour)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => a.hour - b.hour);
  }

  // ─── Average Ticket ───────────────────────────────────────────

  // Window is applied to the TRANSACTION DATE (dimTimeId), not the load time.
  async getAverageTicket(tenantId, days = 30) {
    const startDim = toDimInt(Date.now() - days * 86400000);

    const sales = await prisma.factSale.findMany({
      where: {
        tenantId,
        dimTimeId: { gte: startDim },
      },
      select: { total: true },
    });

    if (sales.length === 0) return { average: 0, count: 0, total: 0 };

    const total = sales.reduce((sum, s) => sum + s.total, 0);
    return {
      average: Math.round((total / sales.length) * 100) / 100,
      count: sales.length,
      total: Math.round(total * 100) / 100,
    };
  }

  // ─── Dashboard Summary (business-type aware) ──────────────────

  async getDashboardSummary(tenantId, businessType, timezone = 'UTC') {
    const summary = {
      tenantId,
      businessType,
      timezone,
      revenue: null,
      topProducts: null,
      inventory: null,
      appointments: null,
    };

    summary.revenue = await this.getRevenueByDay(tenantId, 30, timezone);
    summary.topProducts = await this.getTopProducts(tenantId);

    if (['restaurant', 'cafe'].includes(businessType)) {
      summary.tableTurnover = await this.getTableTurnover(tenantId);
      summary.kitchenPerformance = await this.getKitchenPerformance(tenantId);
      summary.averageTicket = await this.getAverageTicket(tenantId);
      summary.peakHours = await this.getPeakHours(tenantId, timezone);
    }

    if (['pharmacy', 'retail'].includes(businessType)) {
      summary.inventoryTurnover = await this.getInventoryTurnover(tenantId);
      summary.supplierPerformance = await this.getSupplierPerformance(tenantId);
    }

    if (businessType === 'pharmacy') {
      summary.appointmentSummary = await this.getAppointmentSummary(tenantId);
    }

    return summary;
  }

  // ─── Helper ───────────────────────────────────────────────────

  _groupBy(arr, key) {
    const grouped = {};
    for (const item of arr) {
      const val = item[key] || 'unknown';
      grouped[val] = (grouped[val] || 0) + 1;
    }
    return grouped;
  }
}

module.exports = new WarehouseService();
