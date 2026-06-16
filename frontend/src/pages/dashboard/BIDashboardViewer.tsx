import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LayoutDashboard, Bell, Eye, AlertCircle, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

type PortalUser = { id?: string; email?: string; name?: string; companyName?: string };

type DashboardConfig = {
  title: string;
  sections: SectionDef[];
};

type SectionDef = {
  title: string;
  type: 'kpi' | 'line' | 'bar' | 'pie' | 'table';
  metricKey?: string;
  subtitle?: string;
  kpis?: { label: string; key: string; prefix?: string; suffix?: string; format?: string }[];
  xKey?: string;
  yKey?: string;
  dataKeys?: string[];
  span?: number;
};

function getStoredUser(): PortalUser | null {
  try {
    const local = localStorage.getItem("user");
    if (local) return JSON.parse(local);
    const session = sessionStorage.getItem("user");
    if (session) return JSON.parse(session);
  } catch { }
  return null;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function formatValue(val: any, format?: string, prefix?: string, suffix?: string): string {
  if (val === null || val === undefined) return '\u2014';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  let formatted: string;
  if (format === 'currency') formatted = num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  else if (format === 'percent') formatted = num.toFixed(1) + '%';
  else if (format === 'integer') formatted = num.toLocaleString('fr-FR');
  else formatted = num.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (prefix || '') + formatted + (suffix || '');
}

function isJsonDate(value: string): boolean {
  return !isNaN(Date.parse(value));
}

export default function BIDashboardViewer() {
  const { dashboardId } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [user] = useState<PortalUser | null>(() => getStoredUser());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    if (!dashboardId || dashboardId === 'list') {
      // List mode: show all dashboards for this user
      try {
        const res = await fetch(`${API_BASE_URL}/bi/dashboards?clientId=${user?.id || ''}&status=PUBLISHED&pageSize=50`);
        if (res.ok) {
          const json = await res.json();
          setDashboards(json.data?.items || []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const [dashRes, dataRes] = await Promise.all([
        fetch(`${API_BASE_URL}/bi/dashboards/${dashboardId}`),
        fetch(`${API_BASE_URL}/bi/dashboards/${dashboardId}/data?clientId=${user?.id || ''}`),
      ]);
      if (!dashRes.ok) throw new Error('Dashboard not found');
      const dashJson = await dashRes.json();
      setDashboard(dashJson.data || dashJson);

      if (dataRes.ok) {
        const dataJson = await dataRes.json();
        setMetrics(dataJson.data || dataJson);
      }

      if (user?.id) {
        const notifRes = await fetch(`${API_BASE_URL}/bi/notifications?clientId=${user.id}&pageSize=10`);
        if (notifRes.ok) {
          const notifJson = await notifRes.json();
          setNotifications(notifJson.data?.items || []);
        }
        const unreadRes = await fetch(`${API_BASE_URL}/bi/notifications/unread-count?clientId=${user.id}`);
        if (unreadRes.ok) {
          const unreadJson = await unreadRes.json();
          setUnreadCount(unreadJson.count ?? 0);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [dashboardId, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/bi/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await fetch(`${API_BASE_URL}/bi/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: user.id }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-2" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" className="mt-4" onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardId) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My BI Dashboards</h1>
            <p className="text-muted-foreground text-sm">Select a dashboard to view your business analytics.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
        {dashboards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No dashboards available yet. Check back after your data has been processed.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((d) => (
              <Card key={d.id} className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/dashboard/bi-dashboard/${d.id}`)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{d.name}</CardTitle>
                    <Badge variant="outline">{d.businessType}</Badge>
                  </div>
                  {d.description && <CardDescription className="text-xs">{d.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {d.dashboardConfig?.sections?.length || 0} section{(d.dashboardConfig?.sections?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!dashboard) return null;

  const config: DashboardConfig = dashboard.dashboardConfig || { title: dashboard.name, sections: [] };

  const renderChart = (section: SectionDef) => {
    if (!metrics) return <p className="text-xs text-muted-foreground py-4 text-center">No data available yet.</p>;

    if (section.type === 'kpi' && section.kpis) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {section.kpis.map((kpi) => {
            const value = metrics[kpi.key];
            return (
              <Card key={kpi.key} className="border">
                <CardContent className="pt-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                  <p className="text-xl font-bold text-primary">
                    {formatValue(value, kpi.format, kpi.prefix, kpi.suffix)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    }

    if (section.type === 'line') {
      const data = metrics[section.metricKey || 'revenueByDay'];
      if (!Array.isArray(data) || data.length === 0) {
        return <p className="text-xs text-muted-foreground py-4 text-center">No trend data.</p>;
      }
      const xKey = section.xKey || 'date';
      const yKey = section.yKey || 'revenue';
      return (
        <div className="w-full" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} tickMargin={4} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} tickMargin={4} width={35} />
              <Tooltip />
              <Line type="monotone" dataKey={yKey} stroke="#3b82f6" strokeWidth={2.5}
                dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (section.type === 'bar') {
      const data = metrics[section.metricKey || 'topProducts'];
      if (!Array.isArray(data) || data.length === 0) {
        return <p className="text-xs text-muted-foreground py-4 text-center">No data.</p>;
      }
      const xKey = section.xKey || 'name';
      const yKey = section.yKey || 'total';
      return (
        <div className="w-full" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} tickMargin={4} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} tickMargin={4} width={35} />
              <Tooltip />
              <Bar dataKey={yKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (section.type === 'pie') {
      const data = metrics[section.metricKey || 'productDistribution'];
      if (!Array.isArray(data) || data.length === 0) {
        return <p className="text-xs text-muted-foreground py-4 text-center">No distribution data.</p>;
      }
      const nameKey = section.xKey || 'name';
      const valueKey = section.yKey || 'value';
      return (
        <div className="w-full flex justify-center" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey={valueKey} nameKey={nameKey}
                cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                } labelLine={true}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (section.type === 'table') {
      const data = metrics[section.metricKey || 'topProducts'];
      if (!Array.isArray(data) || data.length === 0) {
        return <p className="text-xs text-muted-foreground py-4 text-center">No table data.</p>;
      }
      const keys = section.dataKeys || Object.keys(data[0]).filter(k => !isJsonDate(k));
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                {keys.map(k => <th key={k} className="pb-2 pr-3 font-medium capitalize">{k}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 10).map((row: any, i: number) => (
                <tr key={i} className="border-b hover:bg-muted/50">
                  {keys.map(k => (
                    <td key={k} className="py-2 pr-3">{formatValue(row[k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 10 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Showing 10 of {data.length} rows
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-muted-foreground text-sm mt-1">{dashboard.description}</p>
          )}
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">{dashboard.businessType}</Badge>
            {dashboard.status === 'PUBLISHED' && (
              <Badge className="bg-green-100 text-green-700">Published</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Dashboard Content */}
        <div className="lg:col-span-3 space-y-4">
          {config.sections.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">This dashboard has no sections configured yet.</p>
              </CardContent>
            </Card>
          ) : (
            config.sections.map((section, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  {section.subtitle && (
                    <CardDescription>{section.subtitle}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {renderChart(section)}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right Sidebar - Notifications */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </CardTitle>
                {unreadCount > 0 && (
                  <Badge>{unreadCount} new</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" className="w-full mb-3" onClick={handleMarkAllRead}>
                  <CheckCircle2 className="mr-2 h-3 w-3" /> Mark all as read
                </Button>
              )}
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No notifications yet.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {notifications.map((n) => (
                    <Card key={n.id} className={`border ${!n.isRead ? 'bg-muted/50 border-primary/20' : ''}`}>
                      <CardContent className="py-2 px-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium">{n.title}</p>
                            <p className="text-[10px] text-muted-foreground">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(n.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          {!n.isRead && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleMarkRead(n.id)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
