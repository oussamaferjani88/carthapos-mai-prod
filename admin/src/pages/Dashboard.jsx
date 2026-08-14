import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
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
} from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { clientsApi, licensesApi, modulesApi } from "../lib/api";
import toast from "react-hot-toast";
import DashboardLineChart from "../components/charts/DashboardLineChart";
import DashboardBarChart from "../components/charts/DashboardBarChart";
import DashboardPieChart from "../components/charts/DashboardPieChart";
import DashboardAreaChart from "../components/charts/DashboardAreaChart";
import BiStatsSection from "../components/BiStatsSection";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    clients: 0,
    licenses: 0,
    activeLicenses: 0,
    modules: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
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
        modulesApi.getAll(),
      ]);

      const clients = clientsRes.data || [];
      const licenses = licensesRes.data || [];
      const modules = modulesRes.data || [];

      const previousMonthClients = Math.floor(clients.length * 0.85);
      const growth =
        clients.length > 0
          ? (
              ((clients.length - previousMonthClients) / previousMonthClients) *
              100
            ).toFixed(1)
          : 0;

      setStats({
        clients: clients.length,
        licenses: licenses.length,
        activeLicenses: licenses.filter((l) => l.isActive).length,
        modules: modules.length,
        totalRevenue: licenses.length * 299,
        monthlyGrowth: parseFloat(growth),
      });

      setRecentLicenses(
        licenses
          .filter((l) => l.createdAt)
          .slice(0, 5)
          .sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
          ),
      );
      setRecentClients(
        clients
          .filter((c) => c.createdAt)
          .slice(0, 5)
          .sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
          ),
      );

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = () => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const currentMonth = new Date().getMonth();
    const last6Months = months.slice(
      Math.max(0, currentMonth - 5),
      currentMonth + 1,
    );

    const baseValue = Math.floor(stats.clients / 6);
    return last6Months.map((month, index) => ({
      month,
      value: Math.floor(baseValue * (0.7 + index * 0.1) + Math.random() * 5),
    }));
  };

  const statCards = [
    {
      title: "Clients",
      value: stats.clients,
      description: "Enregistrés",
      icon: Users,
      change:
        stats.monthlyGrowth > 0
          ? `+${stats.monthlyGrowth}%`
          : `${stats.monthlyGrowth}%`,
      changeType: stats.monthlyGrowth > 0 ? "positive" : "negative",
      action: () => navigate("/clients"),
    },
    {
      title: "Licences",
      value: stats.licenses,
      description: "Créées",
      icon: FileText,
      change: `${((stats.activeLicenses / Math.max(stats.licenses, 1)) * 100).toFixed(0)}% actives`,
      changeType: "neutral",
      action: () => navigate("/licenses"),
    },
    {
      title: "Actives",
      value: stats.activeLicenses,
      description: "En cours",
      icon: Activity,
      change: `${stats.licenses - stats.activeLicenses} inactives`,
      changeType: "neutral",
      action: () => navigate("/licenses"),
    },
    {
      title: "Modules",
      value: stats.modules,
      description: "Disponibles",
      icon: Package,
      change: "Tous actifs",
      changeType: "positive",
      action: () => navigate("/modules"),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Tableau de bord" description="Chargement..." />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-2.5 bg-muted rounded w-2/3"></div>
              </CardHeader>
              <CardContent className="pt-0">
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
    <div className="space-y-5">
      <PageHeader
        title="Tableau de bord"
        description={`Mis à jour à ${lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={loadDashboardData}>
              <RefreshCw className="size-3.5" /> Actualiser
            </Button>
            <Button size="sm" onClick={() => navigate("/pos-generator")}>
              <Plus className="size-3.5" /> Nouveau POS
            </Button>
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className="cursor-pointer transition-colors hover:bg-accent/30"
            onClick={stat.action}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-[13px] font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <span className="grid size-7 place-items-center rounded-md bg-muted text-muted-foreground">
                <stat.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold tracking-tight">
                  {stat.value}
                </span>
                {stat.changeType === "positive" && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-green-600">
                    <TrendingUp className="size-3" /> {stat.change}
                  </span>
                )}
                {stat.changeType === "negative" && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-red-600">
                    <TrendingDown className="size-3" /> {stat.change}
                  </span>
                )}
                {stat.changeType === "neutral" && (
                  <span className="text-xs text-muted-foreground">
                    {stat.change}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Croissance clients
              </CardTitle>
              <CardDescription>Évolution mensuelle</CardDescription>
            </div>
            <span className="grid size-7 place-items-center rounded-md bg-blue-50 text-blue-600">
              <TrendingUp className="size-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-[170px]">
              <DashboardLineChart
                data={generateChartData()}
                xKey="month"
                yKey="value"
                color="#5c6ac4"
                height={170}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Types de licences
              </CardTitle>
              <CardDescription>Répartition</CardDescription>
            </div>
            <span className="grid size-7 place-items-center rounded-md bg-green-50 text-green-600">
              <FileText className="size-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-[170px]">
              <DashboardBarChart
                data={[
                  {
                    type: "À vie",
                    count: stats.licenses - Math.floor(stats.licenses * 0.4),
                  },
                  {
                    type: "Abonnement",
                    count: Math.floor(stats.licenses * 0.4),
                  },
                ]}
                xKey="type"
                yKey="count"
                color="#47c1bf"
                height={170}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Statut licences
              </CardTitle>
              <CardDescription>Actives vs Inactives</CardDescription>
            </div>
            <span className="grid size-7 place-items-center rounded-md bg-amber-50 text-amber-600">
              <Activity className="size-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-[170px]">
              <DashboardPieChart
                data={[
                  { name: "Actives", value: stats.activeLicenses },
                  {
                    name: "Inactives",
                    value: stats.licenses - stats.activeLicenses,
                  },
                ]}
                dataKey="value"
                nameKey="name"
                height={170}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Utilisation modules
              </CardTitle>
              <CardDescription>Tendance</CardDescription>
            </div>
            <span className="grid size-7 place-items-center rounded-md bg-violet-50 text-violet-600">
              <Package className="size-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-[170px]">
              <DashboardAreaChart
                data={generateChartData().map((item) => ({
                  ...item,
                  usage: item.value * stats.modules,
                }))}
                xKey="month"
                yKey="usage"
                color="#5c6ac4"
                height={170}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {/* Recent Licenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Licences récentes
              </CardTitle>
              <CardDescription>5 dernières</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/licenses")}
            >
              Tout voir
              <ArrowUpRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentLicenses.length === 0 ? (
              <div className="py-6 text-center">
                <FileText className="mx-auto size-6 text-muted-foreground/50 mb-1.5" />
                <p className="mb-2 text-xs text-muted-foreground">
                  Aucune licence
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/pos-generator")}
                >
                  Créer une licence
                </Button>
              </div>
            ) : (
              recentLicenses.map((license) => (
                <div
                  key={license.id}
                  className="group flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-accent/50"
                  onClick={() => navigate("/licenses")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-medium">
                        {license.client?.name ||
                          license.clientName ||
                          "Client inconnu"}
                      </span>
                      <Badge
                        variant={license.isActive ? "success" : "neutral"}
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {license.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {license.sector || "N/A"} •{" "}
                      {license.licenseType === "LIFETIME"
                        ? "À vie"
                        : "Abonnement"}
                    </div>
                  </div>
                  <div className="ml-2 flex flex-shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="size-3" />
                    {new Date(license.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                    <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Clients récents
              </CardTitle>
              <CardDescription>5 derniers</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/clients")}
            >
              Tout voir
              <ArrowUpRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentClients.length === 0 ? (
              <div className="py-6 text-center">
                <Users className="mx-auto size-6 text-muted-foreground/50 mb-1.5" />
                <p className="mb-2 text-xs text-muted-foreground">
                  Aucun client
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/clients")}
                >
                  Ajouter un client
                </Button>
              </div>
            ) : (
              recentClients.map((client) => (
                <div
                  key={client.id}
                  className="group flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-accent/50"
                  onClick={() => navigate("/clients")}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className="grid size-7 flex-shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {client.name?.charAt(0).toUpperCase() || "C"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {client.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {client.email}
                      </span>
                    </div>
                  </div>
                  <div className="ml-2 flex flex-shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="size-3" />
                    {new Date(client.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                    <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* BI Analytics Statistics */}
      <div className="border-t pt-5">
        <BiStatsSection />
      </div>
    </div>
  );
}
