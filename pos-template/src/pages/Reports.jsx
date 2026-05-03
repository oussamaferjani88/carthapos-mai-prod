import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Euro, ShoppingCart, Package, Calendar } from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { isPreviewMode, getPreviewData, logEnvironment } from '../utils/environment';

export default function Reports() {
  // Log environment on component mount
  useEffect(() => {
    logEnvironment();
  }, []);

  // Theme configuration integration
  const { config: electronConfig } = useAppConfig();
  const getConfig = () => {
    if (electronConfig && electronConfig.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937'
    });
  };
  const config = getConfig();
  const styles = POSConfiguration.getStyles(config);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    averageTicket: 0,
    topProduct: null
  });
  const [loading, setLoading] = useState(true);

  // Demo data for preview mode only
  const DEMO_HOURLY_DATA = [
    { hour: '08h', sales: 5, revenue: 23.50 },
    { hour: '09h', sales: 12, revenue: 67.80 },
    { hour: '10h', sales: 18, revenue: 89.20 },
    { hour: '11h', sales: 25, revenue: 134.70 },
    { hour: '12h', sales: 45, revenue: 267.90 },
    { hour: '13h', sales: 38, revenue: 198.40 },
    { hour: '14h', sales: 22, revenue: 123.60 },
    { hour: '15h', sales: 15, revenue: 78.30 },
    { hour: '16h', sales: 19, revenue: 95.80 },
    { hour: '17h', sales: 28, revenue: 156.20 },
    { hour: '18h', sales: 12, revenue: 67.40 }
  ];

  const DEMO_CATEGORY_DATA = [
    { name: 'Boissons', value: 45, color: '#3B82F6' },
    { name: 'Viennoiseries', value: 28, color: '#10B981' },
    { name: 'Sandwichs', value: 18, color: '#F59E0B' },
    { name: 'Salades', value: 12, color: '#EF4444' },
    { name: 'Pâtisseries', value: 15, color: '#8B5CF6' },
    { name: 'Autres', value: 8, color: '#6B7280' }
  ];

  useEffect(() => {
    loadReportsData();
  }, [selectedPeriod]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      
      // Preview mode: use demo data
      if (isPreviewMode()) {
        setSalesData(DEMO_HOURLY_DATA);
        setCategoryData(DEMO_CATEGORY_DATA);
        
        const totalSales = DEMO_HOURLY_DATA.reduce((sum, item) => sum + item.sales, 0);
        const totalRevenue = DEMO_HOURLY_DATA.reduce((sum, item) => sum + item.revenue, 0);
        
        setStats({
          totalSales,
          totalRevenue,
          averageTicket: totalRevenue / totalSales,
          topProduct: 'Café Expresso'
        });
        
        setLoading(false);
        return;
      }

      // Production mode: load from database
      if (!window.electronAPI) {
        console.warn('⚠️ Electron API not available');
        setSalesData([]);
        setCategoryData([]);
        setStats({
          totalSales: 0,
          totalRevenue: 0,
          averageTicket: 0,
          topProduct: null
        });
        setLoading(false);
        return;
      }

      // Get date range based on selected period
      const dateRange = getDateRangeForPeriod(selectedPeriod);
      
      // Load sales data grouped by hour (for today) or by day (for other periods)
      const groupBy = selectedPeriod === 'today' ? 'hour' : 'day';
      const salesQuery = selectedPeriod === 'today' 
        ? `SELECT 
             strftime('%H', created_at) as hour,
             COUNT(*) as sales,
             COALESCE(SUM(total), 0) as revenue
           FROM sales 
           WHERE DATE(created_at) = DATE('now', 'localtime')
           GROUP BY hour
           ORDER BY hour`
        : `SELECT 
             DATE(created_at) as date,
             COUNT(*) as sales,
             COALESCE(SUM(total), 0) as revenue
           FROM sales 
           WHERE created_at >= ? AND created_at < ?
           GROUP BY DATE(created_at)
           ORDER BY date`;

      const salesResult = selectedPeriod === 'today'
        ? await window.electronAPI.query(salesQuery)
        : await window.electronAPI.query(salesQuery, [dateRange.start, dateRange.end]);

      // Format hourly data
      const formattedSalesData = selectedPeriod === 'today'
        ? salesResult.map(item => ({
            hour: `${item.hour}h`,
            sales: item.sales,
            revenue: parseFloat(item.revenue)
          }))
        : salesResult.map(item => ({
            hour: new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
            sales: item.sales,
            revenue: parseFloat(item.revenue)
          }));

      setSalesData(formattedSalesData);

      // Load category data
      const categoryQuery = `
        SELECT 
          p.category,
          COUNT(si.id) as count
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.created_at >= ? AND s.created_at < ?
        GROUP BY p.category
        ORDER BY count DESC
      `;

      const categoryResult = await window.electronAPI.query(categoryQuery, [dateRange.start, dateRange.end]);
      
      const totalItems = categoryResult.reduce((sum, cat) => sum + cat.count, 0);
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];
      
      const formattedCategoryData = categoryResult.map((cat, index) => ({
        name: cat.category || 'Sans catégorie',
        value: totalItems > 0 ? Math.round((cat.count / totalItems) * 100) : 0,
        color: colors[index % colors.length]
      }));

      setCategoryData(formattedCategoryData);

      // Calculate stats
      const totalSales = formattedSalesData.reduce((sum, item) => sum + item.sales, 0);
      const totalRevenue = formattedSalesData.reduce((sum, item) => sum + item.revenue, 0);

      // Get top product
      const topProductQuery = `
        SELECT p.name, COUNT(si.id) as count
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.created_at >= ? AND s.created_at < ?
        GROUP BY p.id
        ORDER BY count DESC
        LIMIT 1
      `;
      
      const topProductResult = await window.electronAPI.query(topProductQuery, [dateRange.start, dateRange.end]);
      
      setStats({
        totalSales,
        totalRevenue,
        averageTicket: totalSales > 0 ? totalRevenue / totalSales : 0,
        topProduct: topProductResult[0]?.name || null
      });
      
    } catch (error) {
      console.error('❌ Error loading reports data:', error);
      setSalesData([]);
      setCategoryData([]);
      setStats({
        totalSales: 0,
        totalRevenue: 0,
        averageTicket: 0,
        topProduct: null
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get date range based on period
  const getDateRangeForPeriod = (period) => {
    const now = new Date();
    let start, end;

    switch (period) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        start = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
        end = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        start = new Date(weekStart.setHours(0, 0, 0, 0)).toISOString();
        end = new Date().toISOString();
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        end = new Date().toISOString();
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1).toISOString();
        end = new Date().toISOString();
        break;
      default:
        start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
    }

    return { start, end };
  };

  const periods = [
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'yesterday', label: 'Hier' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'year', label: 'Cette année' }
  ];

  const statCards = [
    {
      title: 'Ventes totales',
      value: stats.totalSales,
      description: 'Transactions effectuées',
      icon: ShoppingCart,
      color: 'text-blue-600'
    },
    {
      title: 'Chiffre d\'affaires',
      value: `${stats.totalRevenue.toFixed(2)} DT`,
      description: 'Revenus générés',
      icon: Euro,
      color: 'text-green-600'
    },
    {
      title: 'Ticket moyen',
      value: `${stats.averageTicket.toFixed(2)} DT`,
      description: 'Montant moyen par vente',
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      title: 'Produit vedette',
      value: stats.topProduct || 'N/A',
      description: 'Produit le plus vendu',
      icon: Package,
      color: 'text-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Rapports</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hasData = salesData.length > 0 || stats.totalSales > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rapports</h1>
          <p className="text-muted-foreground">
            Analysez les performances de votre activité
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique des ventes */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution des ventes</CardTitle>
            <CardDescription>
              Ventes par heure pour la période sélectionnée
            </CardDescription>
          </CardHeader>
          <CardContent>
            {salesData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucune vente pour cette période</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Les données apparaîtront une fois les ventes effectuées
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'sales' ? `${value} ventes` : `${value} DT`,
                      name === 'sales' ? 'Ventes' : 'Revenus'
                    ]}
                  />
                  <Bar dataKey="sales" fill="#3B82F6" name="sales" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Répartition par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle>Ventes par catégorie</CardTitle>
            <CardDescription>
              Répartition des ventes par type de produit
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucune donnée de catégorie</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Les catégories apparaîtront une fois les ventes effectuées
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Part']} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="grid grid-cols-2 gap-2">
                  {categoryData.map((category) => (
                    <div key={category.name} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-sm">{category.name}</span>
                      <Badge variant="outline" className="ml-auto">
                        {category.value}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tableau des performances */}
      <Card>
        <CardHeader>
          <CardTitle>Performances détaillées</CardTitle>
          <CardDescription>
            Analyse détaillée par tranche horaire
          </CardDescription>
        </CardHeader>
        <CardContent>
          {salesData.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucune donnée de performance</p>
              <p className="text-sm text-muted-foreground mt-1">
                Les performances apparaîtront une fois les ventes effectuées
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Heure</th>
                    <th className="text-right p-2">Ventes</th>
                    <th className="text-right p-2">Revenus</th>
                    <th className="text-right p-2">Ticket moyen</th>
                    <th className="text-right p-2">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.map((item, index) => {
                    const avgTicket = item.sales > 0 ? item.revenue / item.sales : 0;
                    const performance = item.sales > 20 ? 'Excellente' : 
                                      item.sales > 15 ? 'Bonne' : 
                                      item.sales > 10 ? 'Moyenne' : 'Faible';
                    const performanceColor = item.sales > 20 ? 'text-green-600' : 
                                           item.sales > 15 ? 'text-blue-600' : 
                                           item.sales > 10 ? 'text-orange-600' : 'text-red-600';
                    
                    return (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{item.hour}</td>
                        <td className="text-right p-2">{item.sales}</td>
                        <td className="text-right p-2">{item.revenue.toFixed(2)} DT</td>
                        <td className="text-right p-2">{avgTicket.toFixed(2)} DT</td>
                        <td className={`text-right p-2 font-medium ${performanceColor}`}>
                          {performance}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

