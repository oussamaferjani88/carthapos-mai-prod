import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, History, LayoutDashboard, RefreshCw, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { biFetch, resolveClientId, statusBadgeClass, timeAgo, type BiDashboard } from "@/lib/bi-client";
import { BIEmptyState } from "@/components/bi/BIEmptyState";
import { BIErrorState } from "@/components/bi/BIErrorState";
import { BISkeletonList } from "@/components/bi/BISkeleton";

type Props = {
  refreshKey?: number;
};

export default function MyDashboards({ refreshKey = 0 }: Props) {
  const navigate = useNavigate();
  const [active, setActive] = useState<BiDashboard[]>([]);
  const [history, setHistory] = useState<BiDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const clientId = await resolveClientId();
      if (!clientId) {
        setActive([]);
        setHistory([]);
        return;
      }
      const [activeRes, historyRes] = await Promise.all([
        biFetch(`/bi/dashboards?assignedOnly=true&clientId=${encodeURIComponent(clientId)}&pageSize=50`),
        biFetch(`/bi/dashboards?clientId=${encodeURIComponent(clientId)}&pageSize=50`),
      ]);
      if (!activeRes.ok || !historyRes.ok) throw new Error("Impossible de charger les tableaux de bord");
      const activeJson = await activeRes.json();
      const historyJson = await historyRes.json();
      const activeItems = Array.isArray(activeJson?.data?.items) ? activeJson.data.items : [];
      const allItems = Array.isArray(historyJson?.data?.items) ? historyJson.data.items : [];
      setActive(activeItems);
      // History = everything not currently the ACTIVE assignment (older versions + legacy).
      const activeIds = new Set(activeItems.map((d: BiDashboard) => d.id));
      setHistory(allItems.filter((d: BiDashboard) => !activeIds.has(d.id)));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Impossible de charger les tableaux de bord.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const DashboardCard = ({ dashboard, isActive }: { dashboard: BiDashboard; isActive: boolean }) => (
    <Card className="hover:border-primary/40 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            {dashboard.name}
            <Badge variant="outline">v{dashboard.version}</Badge>
          </CardTitle>
          <Badge variant="outline" className={statusBadgeClass(isActive ? "ACTIVE" : "SUPERSEDED")}>
            {isActive ? "Actif" : "Ancienne version"}
          </Badge>
        </div>
        <CardDescription>{dashboard.description || dashboard.businessType}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <Badge variant="secondary">{dashboard.businessType}</Badge>
          {isActive && <span className="flex items-center gap-1 text-green-600"><Rocket className="w-3 h-3" /> Publié</span>}
          {dashboard.generatedAt && <span>Généré {timeAgo(dashboard.generatedAt)}</span>}
        </div>
        <Button
          size="sm"
          onClick={() => navigate(`/dashboard/bi-dashboard/${dashboard.id}`)}
          className="w-full gap-2"
        >
          <Eye className="w-4 h-4" /> Ouvrir le tableau de bord
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Mes tableaux de bord</h2>
          <p className="text-sm text-muted-foreground">Vos tableaux de bord publiés et leurs versions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Actualiser
        </Button>
      </div>

      {error && <BIErrorState message={error} onRetry={load} />}

      {loading ? (
        <BISkeletonList count={3} />
      ) : (
        <>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Rocket className="w-4 h-4" /> Tableaux de bord actifs
            </h3>
            {active.length === 0 ? (
              <BIEmptyState
                icon={LayoutDashboard}
                title="Aucun tableau de bord publié"
                description="Créez une demande dans l'onglet « Demandes » pour obtenir votre premier tableau de bord."
                actionLabel="Créer une demande"
                onAction={() => navigate("/dashboard/bi/requests/new")}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {active.map((dashboard) => (
                  <DashboardCard key={dashboard.id} dashboard={dashboard} isActive />
                ))}
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <History className="w-4 h-4" /> Historique des versions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-80">
                {history.map((dashboard) => (
                  <DashboardCard key={dashboard.id} dashboard={dashboard} isActive={false} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
