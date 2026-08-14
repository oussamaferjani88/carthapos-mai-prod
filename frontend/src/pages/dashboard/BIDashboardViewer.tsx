import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LayoutDashboard, Bell, Eye, AlertCircle, RefreshCw, CheckCircle2, ArrowRight, History, ChevronDown, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { biFetch, resolveClientId, DASHBOARD_STATUS_LABELS, type BiDashboard } from "@/lib/bi-client";
import { StatusBadge } from "@/components/bi/StatusBadge";
import EmbeddedDashboardContainer from "@/components/dashboard/EmbeddedDashboardContainer";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function formatDate(iso?: string): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function versionStatusLabel(status: string): string {
  if (status === "ACTIVE") return "Actif";
  if (status === "SUPERSEDED") return "Ancienne version";
  if (status === "PUBLISHED") return "Publié";
  return DASHBOARD_STATUS_LABELS[status] || status;
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
  const [versionHistory, setVersionHistory] = useState<BiDashboard[]>([]);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!dashboardId || dashboardId === "list") {
      try {
        const clientId = await resolveClientId();
        const res = await fetch(`${API_BASE_URL}/bi/dashboards?clientId=${clientId || ""}&status=PUBLISHED&pageSize=50`);
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

      const clientId = await resolveClientId();
      if (clientId) {
        try {
          const notifRes = await biFetch(`/bi/notifications?clientId=${encodeURIComponent(clientId)}&pageSize=10`);
          if (notifRes.ok) {
            const notifJson = await notifRes.json();
            setNotifications(notifJson.data?.items || []);
          }
          const unreadRes = await biFetch(`/bi/notifications/unread-count?clientId=${encodeURIComponent(clientId)}`);
          if (unreadRes.ok) {
            const unreadJson = await unreadRes.json();
            setUnreadCount(unreadJson.count ?? 0);
          }
        } catch { }
      }

      try {
        if (clientId) {
          const vhRes = await biFetch(`/bi/dashboards?clientId=${encodeURIComponent(clientId)}&pageSize=50`);
          if (vhRes.ok) {
            const vhJson = await vhRes.json();
            const items = Array.isArray(vhJson?.data?.items) ? (vhJson.data.items as BiDashboard[]) : [];
            setVersionHistory([...items].sort((a, b) => (b.version ?? 0) - (a.version ?? 0)));
          }
        }
      } catch { }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/bi/notifications/${id}/read`, { method: "PATCH" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { }
  };

  const handleMarkAllRead = async () => {
    try {
      const clientId = await resolveClientId();
      if (!clientId) return;
      await biFetch("/bi/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
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
          <p className="mt-2 text-muted-foreground text-sm">Chargement du tableau de bord…</p>
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
              <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
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
            <h1 className="text-2xl font-bold">Mes tableaux de bord BI</h1>
            <p className="text-muted-foreground text-sm">Sélectionnez un tableau de bord pour consulter vos analyses.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
          </Button>
        </div>
        {dashboards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Aucun tableau de bord disponible pour le moment. Revenez après le traitement de vos données.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((d) => (
              <Card key={d.id} role="button" tabIndex={0}
                aria-label={`Ouvrir le tableau de bord ${d.name}`}
                className="hover:shadow-md transition-shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => navigate(`/dashboard/bi-dashboard/${d.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/dashboard/bi-dashboard/${d.id}`);
                  }
                }}>
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
                    <Button variant="ghost" size="sm" aria-label={`Ouvrir ${d.name}`}>
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-muted-foreground text-sm mt-1">{dashboard.description}</p>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline">{dashboard.businessType}</Badge>
            <Badge variant="outline">v{dashboard.version}</Badge>
            {dashboard.assignment?.status === "ACTIVE" ? (
              <Badge className="bg-green-100 text-green-700">Actif</Badge>
            ) : dashboard.assignment?.status === "SUPERSEDED" ? (
              <Badge variant="outline" className="text-muted-foreground">Ancienne version</Badge>
            ) : dashboard.status === "PUBLISHED" ? (
              <Badge className="bg-green-100 text-green-700">Publié</Badge>
            ) : null}
            {dashboard.metabaseDashboardId && (
              <Badge variant="outline" className="text-[10px]">
                MB #{dashboard.metabaseDashboardId}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1.5">
            {dashboard.generatedAt && `Généré le ${formatDate(dashboard.generatedAt)}`}
            {dashboard.upload?.fileName ? ` · Données : ${dashboard.upload.fileName}` : ""}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/bi/requests/new")}>
            <PenLine className="mr-2 h-4 w-4" /> Demander une évolution
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <EmbeddedDashboardContainer dashboardId={dashboard.id} />
        </div>

        <div className="space-y-4">
          <Card>
            <Collapsible open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen}>
              <CardHeader className="pb-2">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full gap-2 text-left"
                    aria-label="Historique des versions"
                  >
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Historique des versions
                    </CardTitle>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", versionHistoryOpen ? "" : "-rotate-90")} />
                  </button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-2">
                  {versionHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Aucune version disponible.</p>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {versionHistory.map((v) => {
                        const status = v.assignment?.status || v.status;
                        const isCurrent = v.id === dashboardId;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => navigate(`/dashboard/bi-dashboard/${v.id}`)}
                            className={cn(
                              "w-full text-left rounded border p-2 flex items-center gap-2 transition-colors hover:border-primary/50",
                              isCurrent ? "border-primary/50 bg-primary/5" : "border-border"
                            )}
                          >
                            <Badge variant="outline" className="text-[10px] shrink-0">v{v.version}</Badge>
                            <StatusBadge status={status} label={versionStatusLabel(status)} className="text-[10px] shrink-0" />
                            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{formatDate(v.createdAt)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

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
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleMarkRead(n.id)} aria-label="Marquer comme lu">
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