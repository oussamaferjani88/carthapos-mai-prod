import React, { useState, useEffect } from 'react';
import { ShoppingCart, Users, Package, DollarSign, TrendingUp, TrendingDown, Euro, Clock, Check } from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { isPreviewMode, getPreviewData, logEnvironment } from '../utils/environment';

// Simple Card components for the preview (matching admin preview)
const Card = ({ className = "", children, ...props }) => (
  <div className={`bg-card text-card-foreground flex flex-col gap-4 rounded-xl border py-4 shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

const CardHeader = ({ className = "", children, ...props }) => (
  <div className={`grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 ${className}`} {...props}>
    {children}
  </div>
);

const CardTitle = ({ className = "", children, ...props }) => (
  <div className={`leading-none font-semibold ${className}`} {...props}>
    {children}
  </div>
);

const CardDescription = ({ className = "", children, ...props }) => (
  <div className={`text-muted-foreground text-sm ${className}`} {...props}>
    {children}
  </div>
);

const CardContent = ({ className = "", children, ...props }) => (
  <div className={`px-4 ${className}`} {...props}>
    {children}
  </div>
);

const Badge = ({ variant = "default", className = "", children, ...props }) => {
  const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const variantClasses = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
  };
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};

const Dashboard = () => {
  // Log environment on component mount
  useEffect(() => {
    logEnvironment();
  }, []);

  // Integration: Electron config + POSConfiguration styling
  const { config: electronConfig, loading: configLoading } = useAppConfig();

  // State for real data
  const [stats, setStats] = useState({
    todaySales: 0,
    todayRevenue: 0,
    productsCount: 0,
    lowStockCount: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get unified theme configuration (same as Sales.jsx)
  const getConfig = () => {
    if (electronConfig && electronConfig.theme) {
      console.log('[POS DEBUG] [Dashboard] Using Electron config:', electronConfig);
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    
    if (typeof window !== 'undefined' && window.themeConfig) {
      console.log('[POS DEBUG] [Dashboard] Using window.themeConfig');
      return POSConfiguration.createConfig(window.themeConfig);
    }
    
    console.log('[POS DEBUG] [Dashboard] Using fallback configuration');
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      textMutedColor: '#6b7280',
      cardBorderColor: '#e5e7eb',
      currency: 'DT',
      currencyPosition: 'after'
    });
  };

  const config = getConfig();
  const styles = POSConfiguration.getStyles(config);
  const cardClasses = POSConfiguration.getCardClasses(config);
  const buttonClasses = POSConfiguration.getButtonClasses(config);
  const gridClasses = POSConfiguration.getGridClasses(config);
  const layoutClasses = POSConfiguration.getLayoutClasses(config);

  // Demo data for preview mode only
  const DEMO_STATS = {
    todaySales: 23,
    todayRevenue: 1247.50,
    productsCount: 156,
    lowStockCount: 8,
    salesChange: '+12%',
    revenueChange: '+8%',
    productsChange: '+15%',
    lowStockChange: '-2%'
  };

  const DEMO_ORDERS = [
    { id: 1, total: 45.80, items: 3, time: '14:32' },
    { id: 2, total: 23.50, items: 1, time: '14:15' },
    { id: 3, total: 67.20, items: 5, time: '13:58' },
    { id: 4, total: 12.90, items: 2, time: '13:45' },
    { id: 5, total: 89.30, items: 4, time: '13:22' }
  ];

  // Load real data from database in production mode
  useEffect(() => {
    if (!isPreviewMode()) {
      loadDashboardData();
    } else {
      // In preview mode, use demo data
      setStats({
        todaySales: DEMO_STATS.todaySales,
        todayRevenue: DEMO_STATS.todayRevenue,
        productsCount: DEMO_STATS.productsCount,
        lowStockCount: DEMO_STATS.lowStockCount
      });
      setRecentOrders(DEMO_ORDERS);
      setLoading(false);
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      if (window.electronAPI) {
        // Load today's sales count and revenue
        const today = new Date().toISOString().split('T')[0];
        const sales = await window.electronAPI.query(
          `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue 
           FROM sales 
           WHERE DATE(created_at) = ?`,
          [today]
        );

        // Load products count
        const products = await window.electronAPI.query(
          'SELECT COUNT(*) as count FROM products'
        );

        // Load low stock count (stock <= 5)
        const lowStock = await window.electronAPI.query(
          'SELECT COUNT(*) as count FROM products WHERE stock <= 5'
        );

        // Load recent orders (last 5)
        const recent = await window.electronAPI.query(
          `SELECT id, total, created_at 
           FROM sales 
           ORDER BY created_at DESC 
           LIMIT 5`
        );

        // Count items per sale
        const ordersWithItems = await Promise.all(
          recent.map(async (order) => {
            const items = await window.electronAPI.query(
              'SELECT SUM(quantity) as items FROM sale_items WHERE sale_id = ?',
              [order.id]
            );
            const time = new Date(order.created_at).toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            return {
              id: order.id,
              total: order.total,
              items: items[0]?.items || 0,
              time: time
            };
          })
        );

        setStats({
          todaySales: sales[0]?.count || 0,
          todayRevenue: sales[0]?.revenue || 0,
          productsCount: products[0]?.count || 0,
          lowStockCount: lowStock[0]?.count || 0
        });

        setRecentOrders(ordersWithItems);
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      // Set empty data on error
      setStats({
        todaySales: 0,
        todayRevenue: 0,
        productsCount: 0,
        lowStockCount: 0
      });
      setRecentOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (config.currencyPosition === 'before') {
      return `${config.currency}${amount.toFixed(2)}`;
    }
    return `${amount.toFixed(2)} ${config.currency}`;
  };

  // Build stats array for display
  const statsArray = [
    {
      title: 'Ventes du jour',
      value: stats.todaySales.toString(),
      change: isPreviewMode() ? DEMO_STATS.salesChange : null,
      trend: 'up',
      icon: ShoppingCart,
      color: 'bg-blue-500',
      description: 'Transactions effectuées'
    },
    {
      title: 'Chiffre d\'affaires',
      value: formatCurrency(stats.todayRevenue),
      change: isPreviewMode() ? DEMO_STATS.revenueChange : null,
      trend: 'up',
      icon: Euro,
      color: 'bg-green-500',
      description: 'Revenus du jour'
    },
    {
      title: 'Produits',
      value: stats.productsCount.toString(),
      change: isPreviewMode() ? DEMO_STATS.productsChange : null,
      trend: 'up',
      icon: Package,
      color: 'bg-purple-500',
      description: 'Articles en stock'
    },
    {
      title: 'Stock faible',
      value: stats.lowStockCount.toString(),
      change: isPreviewMode() ? DEMO_STATS.lowStockChange : null,
      trend: 'down',
      icon: TrendingUp,
      color: 'bg-orange-500',
      description: 'Articles à réapprovisionner'
    }
  ];

  return (
    <div 
      className={`${layoutClasses} space-y-6`}
      style={{
        ...styles.container,
        ...POSConfiguration.getStyleVars(config)
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-bold" 
            style={{ color: config.textColor }}
          >
            Dashboard
          </h1>
          <p 
            className="mt-1" 
            style={{ color: config.textMutedColor }}
          >
            Welcome back! Here's what's happening with your store today.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            className={`${buttonClasses} font-medium transition-colors`}
            style={{ backgroundColor: config.primaryColor }}
          >
            View Reports
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={`dashboard-stats-grid ${gridClasses.replace('grid-cols-3', 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4')}`}>
        {statsArray.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card 
              key={index} 
              className={`${cardClasses} hover:shadow-md transition-shadow`}
              style={{
                ...styles.card,
                borderColor: config.cardBorderColor
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle 
                  className="text-sm font-medium"
                  style={{ color: config.textColor }}
                >
                  {stat.title}
                </CardTitle>
                <div 
                  className={`${stat.color} rounded-lg p-3`}
                  style={{ backgroundColor: config.primaryColor }}
                >
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="text-2xl font-bold" 
                  style={{ color: config.textColor }}
                >
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
                    <span 
                      className="text-sm ml-1" 
                      style={{ color: config.textMutedColor }}
                    >
                      vs last month
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <CardHeader>
            <CardTitle>Ventes récentes</CardTitle>
            <CardDescription className="text-gray-600">
              Les dernières transactions effectuées
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune vente enregistrée</p>
                <p className="text-sm text-gray-400 mt-1">
                  Les ventes apparaîtront ici une fois effectuées
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <ShoppingCart className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Vente #{sale.id}</p>
                        <p className="text-sm text-gray-600">
                          {sale.items} article(s) • {sale.time}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(sale.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group">
                <ShoppingCart className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mb-2" />
                <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">New Sale</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group">
                <Package className="h-8 w-8 text-gray-400 group-hover:text-green-500 mb-2" />
                <span className="text-sm font-medium text-gray-600 group-hover:text-green-600">Add Product</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors group">
                <Users className="h-8 w-8 text-gray-400 group-hover:text-purple-500 mb-2" />
                <span className="text-sm font-medium text-gray-600 group-hover:text-purple-600">New Customer</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors group">
                <DollarSign className="h-8 w-8 text-gray-400 group-hover:text-orange-500 mb-2" />
                <span className="text-sm font-medium text-gray-600 group-hover:text-orange-600">View Reports</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes et notifications */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <CardHeader>
          <CardTitle>Alertes</CardTitle>
          <CardDescription className="text-gray-600">
            Notifications importantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.lowStockCount > 0 && (
              <div className="flex items-center space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <Package className="h-5 w-5 text-orange-600" />
                <div className="flex-1">
                  <p className="font-medium text-orange-800">Stock faible</p>
                  <p className="text-sm text-orange-700">
                    {stats.lowStockCount} article(s) nécessitent un réapprovisionnement
                  </p>
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  {stats.lowStockCount}
                </Badge>
              </div>
            )}
            
            {stats.todaySales > 20 && (
              <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-800">Objectif atteint</p>
                  <p className="text-sm text-green-700">
                    Vous avez dépassé votre objectif de ventes du jour
                  </p>
                </div>
              </div>
            )}

            {stats.lowStockCount === 0 && stats.todaySales <= 20 && (
              <div className="text-center py-8">
                <Check className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune alerte</p>
                <p className="text-sm text-gray-400 mt-1">
                  Tout fonctionne correctement
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart Placeholder */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Chart will be displayed here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
