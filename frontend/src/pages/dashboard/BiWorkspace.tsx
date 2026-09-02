import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronRight, FileArchive, LayoutDashboard, Loader2, Plus, RefreshCw, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MyDashboards from "./MyDashboards";
import {
  biFetch,
  resolveClientId,
  isActiveStatus,
  STATUS_LABELS,
  STAGES,
  statusBadgeClass,
  type BiRequest,
  type BiNotification,
} from "@/lib/bi-client";
import { StatusBadge } from "@/components/bi/StatusBadge";
import { BIEmptyState } from "@/components/bi/BIEmptyState";
import { BIErrorState } from "@/components/bi/BIErrorState";
import { BISkeletonList } from "@/components/bi/BISkeleton";
import { NotificationList } from "@/components/bi/NotificationList";

export default function BiWorkspace() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState<BiRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<BiNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [activeTab, setActiveTab] = useState("requests");
  const [dashboardsRefreshKey, setDashboardsRefreshKey] = useState(0);

  const hasActive = useRef(false);

  const loadRequests = useCallback(async () => {
    try {
      const res = await biFetch("/bi-requests");
      if (!res.ok) throw new Error("Impossible de charger les demandes");
      const json = await res.json();
      setRequests(Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : []);
      setError("");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Impossible de charger les demandes.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const clientId = await resolveClientId();
      if (!clientId) return;
      const [listRes, unreadRes] = await Promise.all([
        biFetch(`/bi/notifications?clientId=${encodeURIComponent(clientId)}&pageSize=50`),
        biFetch(`/bi/notifications/unread-count?clientId=${encodeURIComponent(clientId)}`),
      ]);
      if (listRes.ok) {
        const json = await listRes.json();
        setNotifications(Array.isArray(json?.data?.items) ? json.data.items : []);
      }
      if (unreadRes.ok) {
        const json = await unreadRes.json();
        setUnread(typeof json?.data?.count === "number" ? json.data.count : 0);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    loadNotifications();
  }, [loadRequests, loadNotifications]);

  useEffect(() => {
    hasActive.current = requests.some((r) => isActiveStatus(r.status));
  }, [requests]);

  useEffect(() => {
    if (!hasActive.current) return;
    const interval = setInterval(() => {
      loadRequests();
      loadNotifications();
    }, 6000);
    return () => clearInterval(interval);
  }, [hasActive.current, loadRequests, loadNotifications]);

  const markAllRead = async () => {
    const clientId = await resolveClientId();
    if (!clientId) return;
    await biFetch("/bi/notifications/read-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const openNotification = (notification: BiNotification) => {
    navigate(
      notification.dashboardId
        ? `/dashboard/bi-dashboard/${notification.dashboardId}`
        : notification.requestId
          ? `/dashboard/bi/requests/${notification.requestId}`
          : "#"
    );
  };

  const currentStageLabel = (request: BiRequest) => {
    const stage = STAGES.find((s) => s.step === (request.currentStep || 0));
    return stage ? stage.label : "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-[22px]">Mon espace BI</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Suivez vos demandes de tableaux de bord, consultez vos dashboards publiés et vos notifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasActive.current && (
            <Badge variant="outline" className="gap-1.5 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> En cours
            </Badge>
          )}
          <Button onClick={() => navigate("/dashboard/bi/requests/new")} className="gap-2">
            <Plus className="w-4 h-4" /> Nouvelle demande
          </Button>
        </div>
      </div>

      {error && <BIErrorState message={error} onRetry={loadRequests} />}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests" className="gap-2">
            <FileArchive className="w-4 h-4" /> Demandes
            {requests.length > 0 && <Badge variant="secondary" className="ml-1">{requests.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="dashboards" className="gap-2">
            <LayoutDashboard className="w-4 h-4" /> Mes tableaux de bord
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" /> Notifications
            {unread > 0 && <Badge variant="destructive" className="ml-1">{unread}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {requests.length} demande(s)
            </div>
            <Button variant="outline" size="sm" onClick={loadRequests}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Actualiser
            </Button>
          </div>

          {loading ? (
            <BISkeletonList count={4} />
          ) : requests.length === 0 ? (
            <BIEmptyState
              icon={FolderOpen}
              title="Aucune demande pour le moment"
              description="Créez votre première demande de tableau de bord : choisissez un modèle, décrivez vos objectifs et envoyez vos données."
              actionLabel="Créer ma première demande"
              onAction={() => navigate("/dashboard/bi/requests/new")}
            />
          ) : (
            <div className="space-y-3">
              {requests.map((request) => {
                const progress = request.progressPercent || 0;
                const stage = currentStageLabel(request);
                return (
                  <Card key={request.id} className="cursor-pointer hover:border-primary/40 transition-colors">
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          className="text-left flex-1 min-w-0"
                          onClick={() => navigate(`/dashboard/bi/requests/${request.id}`)}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{request.businessName || request.businessType}</span>
                            <StatusBadge status={request.status} label={STATUS_LABELS[request.status] || request.status} />
                            {isActiveStatus(request.status) && (
                              <Badge variant="outline" className="gap-1.5 animate-pulse border-primary/30 text-primary">
                                <Loader2 className="w-3 h-3 animate-spin" /> En cours
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Progress value={progress} className="h-1.5 w-36" />
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1.5">
                            {request.businessType}
                            {request.dashboardTemplate ? ` · ${request.dashboardTemplate}` : ""}
                            {stage ? ` · Étape : ${stage}` : ""}
                          </div>
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/dashboard/bi/requests/${request.id}`)}
                        >
                          Ouvrir <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dashboards" className="mt-4">
          <MyDashboards refreshKey={dashboardsRefreshKey} />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationList
            notifications={notifications}
            unread={unread}
            onMarkAllRead={markAllRead}
            onOpenNotification={openNotification}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
