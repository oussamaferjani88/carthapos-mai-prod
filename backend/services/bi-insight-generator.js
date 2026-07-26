const { PrismaClient } = require('@prisma/client');
const warehouseService = require('./warehouse-service');

const prisma = new PrismaClient();

/**
 * Generate BI insights from warehouse data for a given client/businessType.
 * Returns an array of { type, title, description } objects.
 */
async function generateInsights(clientId, businessType, timezone = 'UTC') {
  const insights = [];

  try {
    const summary = await warehouseService.getDashboardSummary(clientId, businessType, timezone);
    if (!summary) return insights;

    // Revenue insight (all business types)
    const revenueDays = summary.revenue || summary.revenueByDay || [];
    if (revenueDays.length > 0) {
      const totalRevenue = revenueDays.reduce((s, d) => s + (d.revenue || 0), 0);
      const bestDay = revenueDays.reduce((a, b) => ((a.revenue || 0) > (b.revenue || 0) ? a : b), {});
      insights.push({
        type: 'OPPORTUNITY',
        title: 'Top Revenue Day',
        description: `Highest revenue day was ${bestDay.date || 'N/A'} with ${formatCurrency(bestDay.revenue || 0)}. Total revenue: ${formatCurrency(totalRevenue)}.`,
      });
    }

    // Top products insight
    if (summary.topProducts && summary.topProducts.length > 0) {
      const best = summary.topProducts[0];
      insights.push({
        type: 'INSIGHT',
        title: 'Best Selling Product',
        description: `"${best.name || best.productName || 'N/A'}" is the top performer with ${best.total || best.quantity || 0} units sold.`,
      });
    }

    // Average ticket
    if (summary.averageTicket !== undefined || summary.avgTicket !== undefined) {
      const avg = summary.averageTicket ?? summary.avgTicket;
      insights.push({
        type: 'KPI',
        title: 'Average Ticket',
        description: `Average transaction value is ${formatCurrency(avg)}.`,
      });
    }

    // Business-type specific insights
    if (businessType === 'restaurant' || businessType === 'cafe') {
      if (summary.peakHours && summary.peakHours.length > 0) {
        const peak = summary.peakHours.reduce((a, b) => ((a.count || 0) > (b.count || 0) ? a : b), {});
        insights.push({
          type: 'INSIGHT',
          title: 'Peak Business Hour',
          description: `Your busiest hour is ${peak.hour || peak.hourRange || 'N/A'} with ${peak.count || 0} orders. Consider staffing accordingly.`,
        });
      }
      if (summary.tableTurnover && summary.tableTurnover.length > 0) {
        const avgTurnover = summary.tableTurnover.reduce((s, t) => s + (t.turnoverMinutes || t.duration || 0), 0) / summary.tableTurnover.length;
        insights.push({
          type: 'INSIGHT',
          title: 'Table Turnover Rate',
          description: `Average table turnover is ${Math.round(avgTurnover)} minutes. ${avgTurnover < 60 ? 'Good efficiency.' : 'Consider optimizing table management.'}`,
        });
      }
    }

    if (businessType === 'retail' || businessType === 'pharmacy') {
      if (summary.inventoryTurnover && summary.inventoryTurnover.length > 0) {
        const lowStock = summary.inventoryTurnover.filter(i => (i.stock || 0) < 10);
        if (lowStock.length > 0) {
          insights.push({
            type: 'ALERT',
            title: 'Low Stock Alert',
            description: `${lowStock.length} product(s) have critically low stock (below 10 units). Reorder soon to avoid stockouts.`,
          });
        }
      }
    }

    if (businessType === 'pharmacy') {
      if (summary.supplierPerformance && summary.supplierPerformance.length > 0) {
        const topSupplier = summary.supplierPerformance[0];
        insights.push({
          type: 'INSIGHT',
          title: 'Top Supplier',
          description: `"${topSupplier.name || topSupplier.supplierName || 'N/A'}" is your leading supplier.`,
        });
      }
    }

    if (businessType === 'salon') {
      if (summary.appointmentSummary && summary.appointmentSummary.length > 0) {
        const total = summary.appointmentSummary.length;
        const completed = summary.appointmentSummary.filter(a => a.status === 'COMPLETED' || a.status === 'DONE').length;
        insights.push({
          type: 'KPI',
          title: 'Appointment Fulfillment',
          description: `${completed} of ${total} appointments completed (${total > 0 ? Math.round(completed / total * 100) : 0}% fulfillment rate).`,
        });
      }
    }

    return insights;
  } catch (error) {
    console.error('[INSIGHT GENERATOR] Error:', error.message);
    return [];
  }
}

function formatCurrency(val) {
  const num = Number(val);
  if (isNaN(num)) return '€0.00';
  return num.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

module.exports = { generateInsights };
