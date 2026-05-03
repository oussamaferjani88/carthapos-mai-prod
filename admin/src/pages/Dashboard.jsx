import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  Users, 
  FileText, 
  Package, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Calendar,
  Clock
} from 'lucide-react';
import { clientsApi, licensesApi, modulesApi } from '../lib/api';
import toast from 'react-hot-toast';
import DashboardLineChart from '../components/charts/DashboardLineChart';
import DashboardBarChart from '../components/charts/DashboardBarChart';
import DashboardPieChart from '../components/charts/DashboardPieChart';
import DashboardAreaChart from '../components/charts/DashboardAreaChart';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    clients: 0,
    licenses: 0,
    activeLicenses: 0,
    modules: 0,
    totalRevenue: 0,
    monthlyGrowth: 0
  });
  const [recentLicenses, setRecentLicenses] = useState([]);
  const [recentClients, setRecentClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      loadDashboardData();
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [clientsRes, licensesRes, modulesRes] = await Promise.all([
        clientsApi.getAll(),
        licensesApi.getAll(),
        modulesApi.getAll()
      ]);

      const clients = clientsRes.data || [];
      const licenses = licensesRes.data || [];
      const modules = modulesRes.data || [];

      const previousMonthClients = Math.floor(clients.length * 0.85);
      const growth = clients.length > 0 
        ? ((clients.length - previousMonthClients) / previousMonthClients * 100).toFixed(1)
        : 0;

      setStats({
        clients: clients.length,
        licenses: licenses.length,
        activeLicenses: licenses.filter(l => l.isActive).length,
        modules: modules.length,
        totalRevenue: licenses.length * 299,
        monthlyGrowth: parseFloat(growth)
      });

      setRecentLicenses(
        licenses
          .filter(l => l.createdAt)
          .slice(0, 5)
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      );
      setRecentClients(
        clients
          .filter(c => c.createdAt)
          .slice(0, 5)
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      );
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = months.slice(Math.max(0, currentMonth - 5), currentMonth + 1);
    
    const baseValue = Math.floor(stats.clients / 6);
    return last6Months.map((month, index) => ({
      month,
      value: Math.floor(baseValue * (0.7 + index * 0.1) + Math.random() * 5)
    }));
  };

  const statCards = [
    {
      title: 'Clients',
      value: stats.clients,
      description: 'Enregistrés',
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10',
      change: stats.monthlyGrowth > 0 ? `+${stats.monthlyGrowth}%` : `${stats.monthlyGrowth}%`,
      changeType: stats.monthlyGrowth > 0 ? 'positive' : 'negative',
      action: () => navigate('/clients')
    },
    {
      title: 'Licences',
      value: stats.licenses,
      description: 'Créées',
      icon: FileText,
      gradient: 'from-green-500 to-emerald-600',
      bgGradient: 'from-green-50 to-emerald-100 dark:from-green-950/20 dark:to-emerald-900/10',
      change: `${((stats.activeLicenses / Math.max(stats.licenses, 1)) * 100).toFixed(0)}% actives`,
      changeType: 'neutral',
      action: () => navigate('/licenses')
    },
    {
      title: 'Actives',
      value: stats.activeLicenses,
      description: 'En cours',
      icon: Activity,
      gradient: 'from-orange-500 to-amber-600',
      bgGradient: 'from-orange-50 to-amber-100 dark:from-orange-950/20 dark:to-amber-900/10',
      change: `${stats.licenses - stats.activeLicenses} inactives`,
      changeType: 'neutral',
      action: () => navigate('/licenses')
    },
    {
      title: 'Modules',
      value: stats.modules,
      description: 'Disponibles',
      icon: Package,
      gradient: 'from-purple-500 to-violet-600',
      bgGradient: 'from-purple-50 to-violet-100 dark:from-purple-950/20 dark:to-violet-900/10',
      change: 'Tous actifs',
      changeType: 'positive',
      action: () => navigate('/modules')
    }
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tableau de bord</h1>
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2 px-2.5 pt-2.5">
                <div className="h-2.5 bg-muted rounded w-2/3"></div>
              </CardHeader>
              <CardContent className="px-2.5 pb-2.5">
                <div className="h-6 bg-muted rounded w-1/2 mb-1"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Mis à jour: {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/pos-generator')}
            className="gap-1.5 h-8 text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau POS
          </Button>
        </div>
      </div>

      {/* Compact Stat Cards - All 4 in one row */}
      <div className="grid grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Card 
            key={stat.title} 
            className="relative overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
            onClick={stat.action}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-40 group-hover:opacity-60 transition-opacity`} />
            
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-1.5 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-1.5 rounded-md bg-gradient-to-br ${stat.gradient} shadow-sm`}>
                <stat.icon className="h-3.5 w-3.5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative px-3 pb-3">
              <div className="flex items-baseline justify-between mb-1">
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.changeType === 'positive' && (
                  <div className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-[10px] font-medium">{stat.change}</span>
                  </div>
                )}
                {stat.changeType === 'negative' && (
                  <div className="flex items-center gap-0.5 text-red-600 dark:text-red-400">
                    <TrendingDown className="w-3 h-3" />
                    <span className="text-[10px] font-medium">{stat.change}</span>
                  </div>
                )}
                {stat.changeType === 'neutral' && (
                  <span className="text-[10px] text-muted-foreground">{stat.change}</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compact Charts Section - 2 charts per row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Line Chart */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Croissance clients</CardTitle>
                <CardDescription className="text-xs">Évolution mensuelle</CardDescription>
              </div>
              <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/20">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="h-[160px]">
              <DashboardLineChart
                data={generateChartData()}
                xKey="month"
                yKey="value"
                color="#3b82f6"
                height={160}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Types de licences</CardTitle>
                <CardDescription className="text-xs">Répartition</CardDescription>
              </div>
              <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/20">
                <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="h-[160px]">
              <DashboardBarChart
                data={[
                  { type: 'À vie', count: stats.licenses - Math.floor(stats.licenses * 0.4) },
                  { type: 'Abonnement', count: Math.floor(stats.licenses * 0.4) },
                ]}
                xKey="type"
                yKey="count"
                color="#22c55e"
                height={160}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Statut licences</CardTitle>
                <CardDescription className="text-xs">Actives vs Inactives</CardDescription>
              </div>
              <div className="p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/20">
                <Activity className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="h-[160px]">
              <DashboardPieChart
                data={[
                  { name: 'Actives', value: stats.activeLicenses },
                  { name: 'Inactives', value: stats.licenses - stats.activeLicenses },
                ]}
                dataKey="value"
                nameKey="name"
                height={160}
              />
            </div>
          </CardContent>
        </Card>

        {/* Area Chart */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Utilisation modules</CardTitle>
                <CardDescription className="text-xs">Tendance</CardDescription>
              </div>
              <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/20">
                <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="h-[160px]">
              <DashboardAreaChart
                data={generateChartData().map(item => ({
                  ...item,
                  usage: item.value * stats.modules
                }))}
                xKey="month"
                yKey="usage"
                color="#a855f7"
                height={160}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compact Recent Activity */}
      <div className="grid grid-cols-2 gap-3">
        {/* Recent Licenses */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Licences récentes</CardTitle>
                <CardDescription className="text-xs">5 dernières</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/licenses')}
                className="gap-1 h-7 text-xs px-2"
              >
                Tout voir
                <ArrowUpRight className="w-2.5 h-2.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {recentLicenses.length === 0 ? (
              <div className="text-center py-4">
                <FileText className="w-6 h-6 mx-auto text-muted-foreground/50 mb-1.5" />
                <p className="text-[10px] text-muted-foreground mb-2">Aucune licence</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => navigate('/pos-generator')}
                >
                  Créer une licence
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentLicenses.map((license) => (
                  <div 
                    key={license.id} 
                    className="flex items-center justify-between p-2.5 border border-border rounded-md hover:bg-accent/50 transition-colors group cursor-pointer"
                    onClick={() => navigate('/licenses')}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="font-medium text-xs truncate">
                          {license.client?.name || license.clientName || 'Client inconnu'}
                        </h3>
                        <Badge 
                          variant={license.isActive ? "default" : "secondary"}
                          className="text-[9px] px-1.5 py-0 h-4"
                        >
                          {license.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>{license.sector || 'N/A'}</span>
                        <span>•</span>
                        <span>{license.licenseType === 'LIFETIME' ? 'À vie' : 'Abonnement'}</span>
                      </div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(license.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                    </div>
                    <ArrowUpRight className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Clients récents</CardTitle>
                <CardDescription className="text-xs">5 derniers</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/clients')}
                className="gap-1 h-7 text-xs px-2"
              >
                Tout voir
                <ArrowUpRight className="w-2.5 h-2.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {recentClients.length === 0 ? (
              <div className="text-center py-4">
                <Users className="w-6 h-6 mx-auto text-muted-foreground/50 mb-1.5" />
                <p className="text-[10px] text-muted-foreground mb-2">Aucun client</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => navigate('/clients')}
                >
                  Ajouter un client
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentClients.map((client) => (
                  <div 
                    key={client.id} 
                    className="flex items-center justify-between p-2.5 border border-border rounded-md hover:bg-accent/50 transition-colors group cursor-pointer"
                    onClick={() => navigate('/clients')}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0">
                        {client.name?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-xs truncate">{client.name}</h3>
                        <p className="text-[10px] text-muted-foreground truncate">{client.email}</p>
                      </div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <Calendar className="w-2 h-2" />
                        {new Date(client.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                    </div>
                    <ArrowUpRight className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
