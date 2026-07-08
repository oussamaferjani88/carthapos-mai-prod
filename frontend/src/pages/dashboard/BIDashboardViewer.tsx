import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LayoutDashboard, Bell, Eye, AlertCircle, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EmbeddedDashboardContainer from "@/components/dashboard/EmbeddedDashboardContainer";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

type PortalUser = { id?: string; email?: string; name?: string; companyName?: string };

function getStoredUser(): PortalUser | null {
  try {
    const local = localStorage.getItem("user");
    if (local) return JSON.parse(local);
    const session = sessionStorage.getItem("user");
    if (session) return JSON.parse(session);
  } catch { }
  return null;
}

function formatDate(iso?: string): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function BIDashboardViewer() {
  const { dashboardId } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [user] = useState<PortalUser | null>(() => getStoredUser());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!dashboardId || dashboardId === "list") {
      try {
        const res = await fetch(`${API_BASE_URL}/bi/dashboards?clientId=${user?.id || ""}&status=PUBLISHED&pageSize=50`);
        if (res.ok) {
          const json = await res.json();
          setDashboards(json.data?.items || []);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const dashRes = await fetch(`${API_BASE_URL}/bi/dashboards/${dashboardId}`);
      if (!dashRes.ok) throw new Error("Dashboard not found");
      const dashJson = await dashRes.json();
      setDashboard(dashJson.data || dashJson);

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
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [dashboardId, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/bi/notifications/${id}/read`, { method: "PATCH" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await fetch(`${API_BASE_URL}/bi/notifications/read-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
                      {d.metabaseDashboardId ? "Metabase dashboard linked" : "No visualization configured"}
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-muted-foreground text-sm mt-1">{dashboard.description}</p>
          )}
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">{dashboard.businessType}</Badge>
            {dashboard.status === "PUBLISHED" && (
              <Badge className="bg-green-100 text-green-700">Published</Badge>
            )}
            {dashboard.metabaseDashboardId && (
              <Badge variant="outline" className="text-[10px]">
                MB #{dashboard.metabaseDashboardId}
              </Badge>
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
        <div className="lg:col-span-3 space-y-4">
          <EmbeddedDashboardContainer dashboardId={dashboard.id} />
        </div>

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
                    <Card key={n.id} className={`border ${!n.isRead ? "bg-muted/50 border-primary/20" : ""}`}>
                      <CardContent className="py-2 px-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium">{n.title}</p>
                            <p className="text-[10px] text-muted-foreground">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(n.createdAt).toLocaleDateString("fr-FR")}
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