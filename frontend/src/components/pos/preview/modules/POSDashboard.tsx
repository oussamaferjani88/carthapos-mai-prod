import { ShoppingCart, Package, DollarSign, TrendingUp, TrendingDown, Euro, Check } from 'lucide-react';

export const POSDashboard = ({ config, modules }: { config: any; modules?: any[] }) => {
  const formatCurrency = (amount: number) => {
    const currency = config.currency || '€';
    const position = config.currencyPosition || 'after';
    if (position === 'before') return `${currency}${amount.toFixed(2)}`;
    return `${amount.toFixed(2)} ${currency}`;
  };

  const DEMO_STATS = {
    totalSales: 23,
    totalRevenue: 1247.50,
    productsCount: 156,
    lowStockCount: 8,
    salesChange: '+12%',
    revenueChange: '+8%',
    productsChange: '+5%',
    lowStockChange: '+3%'
  };

  const DEMO_ORDERS = [
    { id: 1, total: 45.80, items: 3, time: '14:32' },
    { id: 2, total: 23.50, items: 1, time: '14:15' },
    { id: 3, total: 67.20, items: 5, time: '13:58' },
    { id: 4, total: 12.90, items: 2, time: '13:45' },
    { id: 5, total: 89.30, items: 4, time: '13:22' }
  ];

  const DEMO_CHART = [
    { month: 'Jan', revenue: 1200 },
    { month: 'Fév', revenue: 1800 },
    { month: 'Mar', revenue: 1400 },
    { month: 'Avr', revenue: 2200 },
    { month: 'Mai', revenue: 1900 },
    { month: 'Juin', revenue: 2600 },
  ];

  const statsArray = [
    {
      title: 'Ventes du jour',
      value: DEMO_STATS.totalSales.toString(),
      change: DEMO_STATS.salesChange,
      trend: 'up',
      icon: ShoppingCart,
      color: 'bg-blue-500',
      description: 'Transactions effectuées'
    },
    {
      title: "Chiffre d'affaires",
      value: formatCurrency(DEMO_STATS.totalRevenue),
      change: DEMO_STATS.revenueChange,
      trend: 'up',
      icon: Euro,
      color: 'bg-green-500',
      description: 'Revenus du jour'
    },
    {
      title: 'Produits',
      value: DEMO_STATS.productsCount.toString(),
      change: DEMO_STATS.productsChange,
      trend: 'up',
      icon: Package,
      color: 'bg-purple-500',
      description: 'Articles en stock'
    },
    {
      title: 'Stock faible',
      value: DEMO_STATS.lowStockCount.toString(),
      change: DEMO_STATS.lowStockChange,
      trend: 'down',
      icon: TrendingUp,
      color: 'bg-orange-500',
      description: 'Articles à réapprovisionner'
    }
  ];

  return (
    <div style={{ fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif', fontSize: config.fontSize || '14px', fontWeight: config.fontWeight || '400' }}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: config.textColor || '#1f2937' }}>
              Dashboard
            </h1>
            <p className="mt-1" style={{ color: config.textMutedColor || '#6b7280' }}>
              Welcome back! Here's what's happening with your store today.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              className="px-4 py-2 rounded-lg text-white font-medium transition-colors text-sm"
              style={{ backgroundColor: config.primaryColor || '#3b82f6' }}
            >
              View Reports
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statsArray.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 py-4"
                style={{ borderColor: config.cardBorderColor || '#e5e7eb' }}
              >
                <div className="flex flex-row items-center justify-between space-y-0 pb-2 px-6">
                  <span className="text-sm font-medium" style={{ color: config.textColor || '#1f2937' }}>
                    {stat.title}
                  </span>
                  <div className="rounded-lg p-3" style={{ backgroundColor: config.primaryColor || '#3b82f6' }}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="px-4">
                  <div className="text-2xl font-bold" style={{ color: config.textColor || '#1f2937' }}>
                    {stat.value}
                  </div>
                  {stat.change && (
                    <div className="flex items-center mt-4">
                      {stat.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ml-1 ${
                        stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </span>
                      <span className="text-sm ml-1" style={{ color: config.textMutedColor || '#6b7280' }}>
                        vs last month
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: config.cardBorderColor || '#e5e7eb' }}>
            <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 mb-4">
              <div className="leading-none font-semibold" style={{ color: config.textColor || '#1f2937' }}>Ventes récentes</div>
              <div className="text-sm" style={{ color: config.textMutedColor || '#6b7280' }}>Les dernières transactions effectuées</div>
            </div>
            <div className="px-4 space-y-3">
              {DEMO_ORDERS.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3" style={{ color: config.textMutedColor || '#9ca3af' }} />
                  <p style={{ color: config.textMutedColor || '#6b7280' }}>Aucune vente enregistrée</p>
                  <p className="text-sm mt-1" style={{ color: config.textMutedColor || '#6b7280' }}>
                    Les ventes apparaîtront ici une fois effectuées
                  </p>
                </div>
              ) : (DEMO_ORDERS.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: (config.primaryColor || '#3b82f6') + '20' }}>
                      <ShoppingCart className="h-4 w-4" style={{ color: config.primaryColor || '#3b82f6' }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: config.textColor || '#1f2937' }}>Vente #{sale.id}</p>
                      <p className="text-sm" style={{ color: config.textMutedColor || '#6b7280' }}>
                        {sale.items} article(s) • {sale.time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" style={{ color: config.textColor || '#1f2937' }}>{formatCurrency(sale.total)}</p>
                  </div>
                </div>
              )))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: config.cardBorderColor || '#e5e7eb' }}>
            <div className="px-6 mb-4">
              <div className="leading-none font-semibold" style={{ color: config.textColor || '#1f2937' }}>Quick Actions</div>
            </div>
            <div className="px-4">
              <div className="grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group" style={{ borderColor: config.cardBorderColor || '#d1d5db' }}>
                  <ShoppingCart className="h-8 w-8 mb-2 text-gray-400 group-hover:text-blue-500" />
                  <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">New Sale</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group" style={{ borderColor: config.cardBorderColor || '#d1d5db' }}>
                  <Package className="h-8 w-8 mb-2 text-gray-400 group-hover:text-green-500" />
                  <span className="text-sm font-medium text-gray-600 group-hover:text-green-600">Add Product</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors group" style={{ borderColor: config.cardBorderColor || '#d1d5db' }}>
                  <DollarSign className="h-8 w-8 mb-2 text-gray-400 group-hover:text-purple-500" />
                  <span className="text-sm font-medium text-gray-600 group-hover:text-purple-600">New Customer</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors group" style={{ borderColor: config.cardBorderColor || '#d1d5db' }}>
                  <TrendingUp className="h-8 w-8 mb-2 text-gray-400 group-hover:text-orange-500" />
                  <span className="text-sm font-medium text-gray-600 group-hover:text-orange-600">View Reports</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Alertes */}
        <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: config.cardBorderColor || '#e5e7eb' }}>
          <div className="px-6 mb-4">
            <div className="leading-none font-semibold" style={{ color: config.textColor || '#1f2937' }}>Alertes</div>
            <div className="text-sm mt-1" style={{ color: config.textMutedColor || '#6b7280' }}>Notifications importantes</div>
          </div>
          <div className="px-4 space-y-3">
            {DEMO_STATS.lowStockCount > 0 && (
              <div className="flex items-center space-x-3 p-3 rounded-lg border" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
                <Package className="h-5 w-5 text-orange-600" />
                <div className="flex-1">
                  <p className="font-medium text-orange-800">Stock faible</p>
                  <p className="text-sm text-orange-700">
                    {DEMO_STATS.lowStockCount} article(s) nécessitent un réapprovisionnement
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-orange-600 border-orange-600">
                  {DEMO_STATS.lowStockCount}
                </span>
              </div>
            )}

            {DEMO_STATS.totalSales > 20 && (
              <div className="flex items-center space-x-3 p-3 rounded-lg border" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-800">Objectif atteint</p>
                  <p className="text-sm text-green-700">
                    Vous avez dépassé votre objectif de ventes du jour
                  </p>
                </div>
              </div>
            )}

            {DEMO_STATS.lowStockCount === 0 && DEMO_STATS.totalSales <= 0 && (
              <div className="text-center py-8">
                <Check className="h-12 w-12 mx-auto mb-3" style={{ color: config.textMutedColor || '#9ca3af' }} />
                <p style={{ color: config.textMutedColor || '#6b7280' }}>Aucune alerte</p>
                <p className="text-sm mt-1" style={{ color: config.textMutedColor || '#6b7280' }}>
                  Tout fonctionne correctement
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sales Overview Chart */}
        <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: config.cardBorderColor || '#e5e7eb' }}>
          <div className="px-6 mb-4">
            <div className="leading-none font-semibold" style={{ color: config.textColor || '#1f2937' }}>Sales Overview</div>
          </div>
          <div className="px-4">
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Chart will be displayed here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSDashboard;