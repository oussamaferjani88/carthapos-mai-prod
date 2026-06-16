const TEMPLATES = {
  restaurant: {
    name: 'Restaurant Analytics',
    businessType: 'restaurant',
    description: 'Revenue, peak hours, top products, kitchen performance, table turnover',
    sections: [
      { key: 'kpiSummary', type: 'kpi', title: 'KPIs', span: 12 },
      { key: 'revenue', type: 'line', title: 'Revenue (30 days)', span: 6 },
      { key: 'peakHours', type: 'bar', title: 'Peak Hours', span: 6 },
      { key: 'topProducts', type: 'bar', title: 'Top Products', span: 6 },
      { key: 'kitchenPerformance', type: 'pie', title: 'Kitchen Orders by Status', span: 3 },
      { key: 'tableTurnover', type: 'bar', title: 'Table Turnover', span: 3 },
      { key: 'averageTicket', type: 'kpi', title: 'Average Ticket', span: 12 },
    ],
  },

  cafe: {
    name: 'Cafe Analytics',
    businessType: 'cafe',
    description: 'Revenue, peak hours, top products, table turnover',
    sections: [
      { key: 'kpiSummary', type: 'kpi', title: 'KPIs', span: 12 },
      { key: 'revenue', type: 'line', title: 'Revenue (30 days)', span: 6 },
      { key: 'peakHours', type: 'bar', title: 'Peak Hours', span: 6 },
      { key: 'topProducts', type: 'bar', title: 'Top Products', span: 6 },
      { key: 'tableTurnover', type: 'bar', title: 'Table Turnover', span: 3 },
      { key: 'averageTicket', type: 'kpi', title: 'Average Ticket', span: 3 },
    ],
  },

  retail: {
    name: 'Retail Analytics',
    businessType: 'retail',
    description: 'Revenue, inventory turnover, top products, supplier metrics',
    sections: [
      { key: 'kpiSummary', type: 'kpi', title: 'KPIs', span: 12 },
      { key: 'revenue', type: 'line', title: 'Revenue (30 days)', span: 6 },
      { key: 'topProducts', type: 'bar', title: 'Top Products', span: 6 },
      { key: 'inventoryTurnover', type: 'bar', title: 'Inventory Turnover', span: 6 },
      { key: 'supplierPerformance', type: 'table', title: 'Suppliers', span: 6 },
    ],
  },

  pharmacy: {
    name: 'Pharmacy Analytics',
    businessType: 'pharmacy',
    description: 'Revenue, stock alerts, appointments, top medicines, supplier metrics',
    sections: [
      { key: 'kpiSummary', type: 'kpi', title: 'KPIs', span: 12 },
      { key: 'revenue', type: 'line', title: 'Revenue (30 days)', span: 6 },
      { key: 'topProducts', type: 'bar', title: 'Top Products', span: 6 },
      { key: 'inventoryTurnover', type: 'bar', title: 'Inventory Turnover', span: 4 },
      { key: 'appointmentSummary', type: 'pie', title: 'Appointments by Status', span: 4 },
      { key: 'supplierPerformance', type: 'table', title: 'Suppliers', span: 4 },
    ],
  },

  salon: {
    name: 'Salon Analytics',
    businessType: 'salon',
    description: 'Revenue, appointments, services, top products',
    sections: [
      { key: 'kpiSummary', type: 'kpi', title: 'KPIs', span: 12 },
      { key: 'revenue', type: 'line', title: 'Revenue (30 days)', span: 6 },
      { key: 'topProducts', type: 'bar', title: 'Top Products', span: 6 },
      { key: 'appointmentSummary', type: 'pie', title: 'Appointments by Status', span: 6 },
    ],
  },
};

function getTemplate(businessType) {
  return TEMPLATES[businessType] || TEMPLATES.restaurant;
}

function getAllTemplates() {
  return Object.values(TEMPLATES);
}

module.exports = { TEMPLATES, getTemplate, getAllTemplates };
