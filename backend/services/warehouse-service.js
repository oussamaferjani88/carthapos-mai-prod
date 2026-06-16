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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class WarehouseService {

  // ─── Revenue ──────────────────────────────────────────────────

  async getRevenueByDay(tenantId, days = 30, timezone = 'UTC') {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await prisma.factSale.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      include: { dimTime: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay = {};
    for (const s of sales) {
      const key = this._getDateInTimezone(s.createdAt, timezone);
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

  async getKitchenPerformance(tenantId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await prisma.factKitchenOrder.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
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

  async getPeakHours(tenantId, timezone = 'UTC') {
    const sales = await prisma.factSale.findMany({
      where: { tenantId },
    });

    const byHour = {};
    for (const s of sales) {
      const hour = this._getHourInTimezone(s.createdAt, timezone);
      byHour[hour] = (byHour[hour] || 0) + 1;
    }

    return Object.entries(byHour)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => a.hour - b.hour);
  }

  // ─── Average Ticket ───────────────────────────────────────────

  async getAverageTicket(tenantId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await prisma.factSale.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
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

  // ─── Timezone helpers ─────────────────────────────────────────

  _getHourInTimezone(date, timezone) {
    if (!timezone || timezone === 'UTC') {
      return new Date(date).getUTCHours();
    }
    try {
      return parseInt(new Date(date).toLocaleString('en-US', {
        timeZone: timezone, hour: 'numeric', hour12: false,
      }), 10);
    } catch {
      return new Date(date).getUTCHours();
    }
  }

  _getDateInTimezone(date, timezone) {
    if (!timezone || timezone === 'UTC') {
      return date.toISOString().substring(0, 10);
    }
    try {
      return new Date(date).toLocaleDateString('en-CA', { timeZone: timezone });
    } catch {
      return date.toISOString().substring(0, 10);
    }
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
