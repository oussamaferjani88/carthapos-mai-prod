import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingCart, Users, Package, DollarSign, TrendingUp, TrendingDown,
  Euro, Clock, Check, AlertTriangle, Activity, BarChart3, Target,
  ArrowUpRight, ArrowDownRight, RefreshCw, LayoutDashboard, User,
  AlertCircle, CreditCard, Receipt, Box, Warehouse
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { isPreviewMode } from '../utils/environment';

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

const Dashboard = () => {
  const { config: electronConfig, loading: configLoading } = useAppConfig();

  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    averageTicket: 0,
    todayProfit: 0,
    todayCustomers: 0,
    lowStockCount: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartPeriod, setChartPeriod] = useState('month');
  const [bestSellers, setBestSellers] = useState([]);
  const [inventorySummary, setInventorySummary] = useState({ totalProducts: 0, totalStockValue: 0, lowStockItems: [], outOfStock: 0 });
  const [cashDrawer, setCashDrawer] = useState({ active: false, openingFloat: 0, currentTotal: 0, salesCount: 0 });
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getConfig = useCallback(() => {
    if (electronConfig && electronConfig.theme) return POSConfiguration.createConfig(electronConfig.theme);
    if (typeof window !== 'undefined' && window.themeConfig) return POSConfiguration.createConfig(window.themeConfig);
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6', secondaryColor: '#1e40af', backgroundColor: '#ffffff',
      textColor: '#1f2937', textMutedColor: '#6b7280', cardBorderColor: '#e5e7eb',
      currency: 'DT', currencyPosition: 'after'
    });
  }, [electronConfig]);

  const config = getConfig();
  const styles = POSConfiguration.getStyles(config);
  const layoutClasses = POSConfiguration.getLayoutClasses(config);

  const formatCurrency = useCallback((amount) => {
    const val = parseFloat(amount) || 0;
    return config.currencyPosition === 'before'
      ? `${config.currency}${val.toFixed(2)}`
      : `${val.toFixed(2)} ${config.currency}`;
  }, [config]);

  const loadDashboardData = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const [todaySalesRes, allSalesRes, recentRes, chartRes, productsRes, lowStockRes,
        outOfStockRes, stockValueRes, shiftRes, todayCustomersRes] = await Promise.all([
        window.electronAPI.query(
          `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
           FROM sales WHERE DATE(created_at, 'localtime') = ?`, [today]
        ),
        window.electronAPI.query(
          `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM sales`
        ),
        window.electronAPI.query(
          `SELECT id, total, payment_method, created_at
           FROM sales ORDER BY created_at DESC LIMIT 5`
        ),
        window.electronAPI.query(
          `SELECT strftime('%Y-%m', created_at) as period, COALESCE(SUM(total), 0) as revenue
           FROM sales GROUP BY period ORDER BY period ASC`
        ),
        window.electronAPI.query('SELECT COUNT(*) as count FROM products'),
        window.electronAPI.query(
          'SELECT COUNT(*) as count FROM products WHERE min_stock > 0 AND stock <= min_stock'
        ),
        window.electronAPI.query('SELECT COUNT(*) as count FROM products WHERE stock = 0'),
        window.electronAPI.query(
          'SELECT COALESCE(SUM(stock * price), 0) as total_value FROM products WHERE stock > 0'
        ),
        window.electronAPI.query(
          `SELECT id, user_name, opening_float, opened_at FROM shifts WHERE status = 'open' LIMIT 1`
        ),
        window.electronAPI.query(
          `SELECT COUNT(DISTINCT id) as count FROM sales WHERE DATE(created_at, 'localtime') = ?`, [today]
        )
      ]);

      const todayRevenue = parseFloat(todaySalesRes?.[0]?.revenue) || 0;
      const todayOrders = parseInt(todaySalesRes?.[0]?.count) || 0;
      const averageTicket = todayOrders > 0 ? todayRevenue / todayOrders : 0;

      let todayProfit = 0;
      try {
        const saleItems = await window.electronAPI.query(
          `SELECT si.quantity, si.price, p.cost_price, p.price as unit_price
           FROM sale_items si
           JOIN sales s ON si.sale_id = s.id
           LEFT JOIN products p ON si.product_id = p.id
           WHERE DATE(s.created_at, 'localtime') = ?`, [today]
        );
        saleItems.forEach(item => {
          const cost = parseFloat(item.cost_price) || parseFloat(item.unit_price) || 0;
          todayProfit += (parseFloat(item.price) - cost) * parseInt(item.quantity);
        });
      } catch (e) {
        console.error('[DASHBOARD] Profit calc error:', e);
      }

      setStats({
        todayRevenue,
        todayOrders,
        averageTicket,
        todayProfit,
        todayCustomers: parseInt(todayCustomersRes?.[0]?.count) || 0,
        lowStockCount: parseInt(lowStockRes?.[0]?.count) || 0
      });

      const txWithItems = await Promise.all(
        (recentRes || []).map(async (sale) => {
          const items = await window.electronAPI.query(
            'SELECT SUM(quantity) as items FROM sale_items WHERE sale_id = ?', [sale.id]
          );
          return {
            id: sale.id,
            total: sale.total,
            payment_method: sale.payment_method,
            items: items?.[0]?.items || 0,
            time: new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          };
        })
      );
      setRecentTransactions(txWithItems);

      setChartData((chartRes || []).map(row => ({
        period: row.period,
        revenue: parseFloat(row.revenue)
      })));

      setInventorySummary({
        totalProducts: parseInt(productsRes?.[0]?.count) || 0,
        totalStockValue: parseFloat(stockValueRes?.[0]?.total_value) || 0,
        lowStockItems: parseInt(lowStockRes?.[0]?.count) || 0,
        outOfStock: parseInt(outOfStockRes?.[0]?.count) || 0
      });

      setActiveShift(shiftRes?.[0] || null);

      setCashDrawer({
        active: !!shiftRes?.[0],
        openingFloat: parseFloat(shiftRes?.[0]?.opening_float) || 0,
        currentTotal: todayRevenue,
        salesCount: todayOrders
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error('[DASHBOARD] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const handleSale = () => loadDashboardData();
    window.addEventListener('sale-completed', handleSale);
    return () => window.removeEventListener('sale-completed', handleSale);
  }, [loadDashboardData]);

  useEffect(() => {
    if (!window.electronAPI) return;
    let query;
    switch (chartPeriod) {
      case 'today':
        query = `SELECT strftime('%H:00', created_at) as period, COALESCE(SUM(total), 0) as revenue
                 FROM sales WHERE DATE(created_at, 'localtime') = date('now')
                 GROUP BY period ORDER BY period ASC`;
        break;
      case 'week':
        query = `SELECT strftime('%w', created_at) as day_num,
                 CASE strftime('%w', created_at) WHEN '0' THEN 'Dim' WHEN '1' THEN 'Lun' WHEN '2' THEN 'Mar'
                   WHEN '3' THEN 'Mer' WHEN '4' THEN 'Jeu' WHEN '5' THEN 'Ven' WHEN '6' THEN 'Sam' END as period,
                 COALESCE(SUM(total), 0) as revenue
                 FROM sales WHERE created_at >= date('now', '-7 days')
                 GROUP BY day_num, period ORDER BY day_num ASC`;
        break;
      case 'year':
        query = `SELECT strftime('%m', created_at) as month_num,
                 CASE strftime('%m', created_at) WHEN '01' THEN 'Jan' WHEN '02' THEN 'Fév' WHEN '03' THEN 'Mar'
                   WHEN '04' THEN 'Avr' WHEN '05' THEN 'Mai' WHEN '06' THEN 'Jun'
                   WHEN '07' THEN 'Jul' WHEN '08' THEN 'Aoû' WHEN '09' THEN 'Sep'
                   WHEN '10' THEN 'Oct' WHEN '11' THEN 'Nov' WHEN '12' THEN 'Déc' END as period,
                 COALESCE(SUM(total), 0) as revenue
                 FROM sales WHERE strftime('%Y', created_at) = strftime('%Y', 'now')
                 GROUP BY month_num, period ORDER BY month_num ASC`;
        break;
      default:
        query = `SELECT strftime('%Y-%m', created_at) as period, COALESCE(SUM(total), 0) as revenue
                 FROM sales GROUP BY period ORDER BY period DESC LIMIT 12`;
    }
    window.electronAPI.query(query).then(data => {
      setChartData((data || []).map(row => ({ period: row.period, revenue: parseFloat(row.revenue) })).reverse());
    });
  }, [chartPeriod]);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.query(
      `SELECT p.name, SUM(si.quantity) as total_sold, SUM(si.quantity * si.price) as total_revenue
       FROM sale_items si JOIN products p ON si.product_id = p.id
       GROUP BY si.product_id ORDER BY total_sold DESC LIMIT 5`
    ).then(data => setBestSellers(data || []));
  }, []);

  const getPaymentLabel = (method) => {
    if (!method) return 'N/A';
    const m = method.toLowerCase();
    if (m === 'cash' || m === 'espèces' || m === 'especes') return 'Espèces';
    if (m === 'card' || m === 'carte') return 'Carte';
    return method;
  };

  const getPaymentColor = (method) => {
    if (!method) return 'bg-gray-100 text-gray-700';
    const m = method.toLowerCase();
    if (m === 'cash' || m === 'espèces' || m === 'especes') return 'bg-green-100 text-green-700';
    if (m === 'card' || m === 'carte') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className={`${layoutClasses} flex items-center justify-center min-h-[60vh]`}
        style={{ ...styles.container, ...POSConfiguration.getStyleVars(config) }}>
        <div className="text-center">
          <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-4" style={{ color: config.primaryColor }} />
          <p style={{ color: config.textMutedColor }}>Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${layoutClasses} space-y-6`}
      style={{ ...styles.container, ...POSConfiguration.getStyleVars(config) }}>

      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: config.primaryColor + '20' }}>
            <LayoutDashboard className="h-6 w-6" style={{ color: config.primaryColor }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: config.textColor }}>
              Bonjour ! 👋
            </h1>
            <p style={{ color: config.textMutedColor }}>
              {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums" style={{ color: config.textColor }}>
              {currentTime.toLocaleTimeString('fr-FR')}
            </p>
            {activeShift && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Caisse ouverte — {activeShift.user_name}
              </span>
            )}
          </div>
          <button onClick={loadDashboardData}
            className="p-2 rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: config.cardBorderColor }} title="Rafraîchir">
            <RefreshCw className="h-4 w-4" style={{ color: config.textMutedColor }} />
          </button>
        </div>
      </div>

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { title: "Revenus du jour", value: formatCurrency(stats.todayRevenue), icon: Euro, color: '#22c55e', bg: '#dcfce7' },
          { title: "Commandes", value: stats.todayOrders.toString(), icon: ShoppingCart, color: '#3b82f6', bg: '#dbeafe' },
          { title: "Ticket moyen", value: formatCurrency(stats.averageTicket), icon: Receipt, color: '#8b5cf6', bg: '#ede9fe' },
          { title: "Profit du jour", value: formatCurrency(stats.todayProfit), icon: TrendingUp, color: '#14b8a6', bg: '#ccfbf1' },
          { title: "Clients", value: stats.todayCustomers.toString(), icon: Users, color: '#f59e0b', bg: '#fef3c7' },
          { title: "Stock faible", value: stats.lowStockCount.toString(), icon: AlertTriangle, color: stats.lowStockCount > 0 ? '#ef4444' : '#6b7280', bg: stats.lowStockCount > 0 ? '#fee2e2' : '#f3f4f6' }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="rounded-xl border p-4 transition-shadow hover:shadow-md"
              style={{ borderColor: config.cardBorderColor, backgroundColor: 'white' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: config.textMutedColor }}>{kpi.title}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: kpi.bg }}>
                  <Icon className="h-4 w-4" style={{ color: kpi.color }} />
                </div>
              </div>
              <p className="text-xl font-bold tabular-nums" style={{ color: config.textColor }}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* 3. MAIN CONTENT — 2 COL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COL — Revenue Chart + Best Sellers */}
        <div className="lg:col-span-2 space-y-6">

          {/* 5. REVENUE CHART */}
          <div className="rounded-xl border p-6" style={{ borderColor: config.cardBorderColor, backgroundColor: 'white' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold" style={{ color: config.textColor }}>Revenus</h3>
                <p className="text-sm" style={{ color: config.textMutedColor }}>Évolution du chiffre d'affaires</p>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                {[
                  { key: 'today', label: "Aujourd'hui" },
                  { key: 'week', label: 'Semaine' },
                  { key: 'month', label: 'Mois' },
                  { key: 'year', label: 'Année' }
                ].map(period => (
                  <button key={period.key} onClick={() => setChartPeriod(period.key)}
                    className="px-3 py-1 text-xs font-medium rounded-md transition-all"
                    style={{
                      backgroundColor: chartPeriod === period.key ? 'white' : 'transparent',
                      color: chartPeriod === period.key ? config.primaryColor : config.textMutedColor,
                      boxShadow: chartPeriod === period.key ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                    }}>
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center rounded-lg border-2 border-dashed"
                style={{ borderColor: config.cardBorderColor }}>
                <div className="text-center">
                  <BarChart3 className="h-10 w-10 mx-auto mb-2" style={{ color: config.textMutedColor }} />
                  <p style={{ color: config.textMutedColor }}>Aucune donnée de vente</p>
                  <p className="text-xs mt-1" style={{ color: config.textMutedColor }}>
                    Les données apparaîtront après la première vente
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Revenus']} />
                  <Bar dataKey="revenue" fill={config.primaryColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 6. BEST SELLERS */}
          <div className="rounded-xl border p-6" style={{ borderColor: config.cardBorderColor, backgroundColor: 'white' }}>
            <h3 className="font-semibold mb-4" style={{ color: config.textColor }}>Meilleures ventes</h3>
            {bestSellers.length === 0 ? (
              <div className="py-8 text-center rounded-lg border-2 border-dashed" style={{ borderColor: config.cardBorderColor }}>
                <Target className="h-8 w-8 mx-auto mb-2" style={{ color: config.textMutedColor }} />
                <p className="text-sm" style={{ color: config.textMutedColor }}>Aucune donnée de vente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bestSellers.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: config.primaryColor }}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: config.textColor }}>{item.name}</p>
                      <p className="text-xs" style={{ color: config.textMutedColor }}>{item.total_sold} vendu(s)</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: config.textColor }}>
                      {formatCurrency(item.total_revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COL — Business Health + Inventory + Cash Drawer */}
        <div className="space-y-6">

          {/* 3. BUSINESS HEALTH */}
          <div className="rounded-xl border p-6" style={{ borderColor: config.cardBorderColor, backgroundColor: 'white' }}>
            <h3 className="font-semibold mb-4" style={{ color: config.textColor }}>Santé du business</h3>
            <div className="space-y-3">
              {[
                {
                  label: 'Revenus du jour',
                  value: formatCurrency(stats.todayRevenue),
                  status: stats.todayRevenue > 0 ? 'good' : 'neutral',
                  icon: Euro
                },
                {
                  label: 'Stock faible',
                  value: `${stats.lowStockCount} article(s)`,
                  status: stats.lowStockCount > 5 ? 'bad' : stats.lowStockCount > 0 ? 'warn' : 'good',
                  icon: AlertTriangle
                },
                {
                  label: 'Produits en rupture',
                  value: `${inventorySummary.outOfStock} article(s)`,
                  status: inventorySummary.outOfStock > 0 ? 'bad' : 'good',
                  icon: Box
                },
                {
                  label: 'Ticket moyen',
                  value: formatCurrency(stats.averageTicket),
                  status: stats.averageTicket > 20 ? 'good' : stats.averageTicket > 10 ? 'neutral' : 'warn',
                  icon: Target
                }
              ].map((item, idx) => {
                const Icon = item.icon;
                const statusColors = { good: '#22c55e', warn: '#f59e0b', bad: '#ef4444', neutral: '#6b7280' };
                return (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                    <Icon className="h-4 w-4" style={{ color: statusColors[item.status] }} />
                    <span className="flex-1 text-sm" style={{ color: config.textColor }}>{item.label}</span>
                    <span className="text-sm font-medium tabular-nums" style={{ color: config.textColor }}>{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7. INVENTORY SUMMARY */}
          <div className="rounded-xl border p-6" style={{ borderColor: config.cardBorderColor, backgroundColor: 'white' }}>
            <h3 className="font-semibold mb-4" style={{ color: config.textColor }}>Inventaire</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                <span className="text-sm" style={{ color: config.textMutedColor }}>Total produits</span>
                <span className="text-sm font-semibold" style={{ color: config.textColor }}>{inventorySummary.totalProducts}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                <span className="text-sm" style={{ color: config.textMutedColor }}>Valeur stock</span>
                <span className="text-sm font-semibold" style={{ color: config.textColor }}>{formatCurrency(inventorySummary.totalStockValue)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                <span className="text-sm" style={{ color: config.textMutedColor }}>Stock faible</span>
                <span className="text-sm font-semibold" style={{ color: inventorySummary.lowStockItems > 0 ? '#f59e0b' : config.textColor }}>
                  {inventorySummary.lowStockItems}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                <span className="text-sm" style={{ color: config.textMutedColor }}>Rupture</span>
                <span className="text-sm font-semibold" style={{ color: inventorySummary.outOfStock > 0 ? '#ef4444' : config.textColor }}>
                  {inventorySummary.outOfStock}
                </span>
              </div>
            </div>
          </div>

          {/* 8. CASH DRAWER SUMMARY */}
          <div className="rounded-xl border p-6" style={{ borderColor: config.cardBorderColor, backgroundColor: 'white' }}>
            <h3 className="font-semibold mb-4" style={{ color: config.textColor }}>Caisse</h3>
            {cashDrawer.active ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-green-700">Caisse ouverte</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                  <span className="text-sm" style={{ color: config.textMutedColor }}>Départ</span>
                  <span className="text-sm font-semibold" style={{ color: config.textColor }}>{formatCurrency(cashDrawer.openingFloat)}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                  <span className="text-sm" style={{ color: config.textMutedColor }}>Ventes du jour</span>
                  <span className="text-sm font-semibold" style={{ color: config.textColor }}>{formatCurrency(cashDrawer.currentTotal)}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                  <span className="text-sm" style={{ color: config.textMutedColor }}>Nombre de ventes</span>
                  <span className="text-sm font-semibold" style={{ color: config.textColor }}>{cashDrawer.salesCount}</span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center rounded-lg border-2 border-dashed" style={{ borderColor: config.cardBorderColor }}>
                <CreditCard className="h-8 w-8 mx-auto mb-2" style={{ color: config.textMutedColor }} />
                <p className="text-sm" style={{ color: config.textMutedColor }}>Aucune caisse ouverte</p>
                <p className="text-xs mt-1" style={{ color: config.textMutedColor }}>
                  Ouvrez la caisse depuis l'écran de vente
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. RECENT TRANSACTIONS */}
      <div className="rounded-xl border p-6" style={{ borderColor: config.cardBorderColor, backgroundColor: 'white' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold" style={{ color: config.textColor }}>Transactions récentes</h3>
            <p className="text-sm" style={{ color: config.textMutedColor }}>Les 5 dernières ventes</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#f3f4f6', color: config.textMutedColor }}>
            {recentTransactions.length} vente(s)
          </span>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center rounded-lg border-2 border-dashed" style={{ borderColor: config.cardBorderColor }}>
            <ShoppingCart className="h-10 w-10 mx-auto mb-2" style={{ color: config.textMutedColor }} />
            <p className="text-sm font-medium" style={{ color: config.textColor }}>Aucune transaction</p>
            <p className="text-xs mt-1" style={{ color: config.textMutedColor }}>
              Les transactions apparaîtront ici après la première vente
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: config.cardBorderColor }}>
                  <th className="text-left text-xs font-medium py-2 px-3" style={{ color: config.textMutedColor }}>#</th>
                  <th className="text-left text-xs font-medium py-2 px-3" style={{ color: config.textMutedColor }}>Heure</th>
                  <th className="text-left text-xs font-medium py-2 px-3" style={{ color: config.textMutedColor }}>Articles</th>
                  <th className="text-left text-xs font-medium py-2 px-3" style={{ color: config.textMutedColor }}>Paiement</th>
                  <th className="text-right text-xs font-medium py-2 px-3" style={{ color: config.textMutedColor }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                    style={{ borderColor: config.cardBorderColor }}>
                    <td className="py-3 px-3 text-sm font-medium" style={{ color: config.textColor }}>#{tx.id}</td>
                    <td className="py-3 px-3 text-sm" style={{ color: config.textMutedColor }}>{tx.time}</td>
                    <td className="py-3 px-3 text-sm" style={{ color: config.textColor }}>{tx.items} article(s)</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPaymentColor(tx.payment_method)}`}>
                        {getPaymentLabel(tx.payment_method)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm font-semibold text-right tabular-nums" style={{ color: config.textColor }}>
                      {formatCurrency(tx.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
