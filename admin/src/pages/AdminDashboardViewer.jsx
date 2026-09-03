import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Database,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import EmbeddedDashboardContainer from "../components/dashboard/EmbeddedDashboardContainer";
import api from "../lib/api";
import { useClientNameMap } from "../hooks/useClientNameMap";

const DASHBOARD_STATUS = {
  GENERATING: {
    label: "Generating...",
    color: "bg-purple-100 text-purple-700",
  },
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  READY_FOR_REVIEW: {
    label: "Ready for Review",
    color: "bg-yellow-100 text-yellow-700",
  },
  PUBLISHED: { label: "Published", color: "bg-green-100 text-green-700" },
  ARCHIVED: { label: "Archived", color: "bg-red-100 text-red-700" },
  FAILED: { label: "Failed", color: "bg-red-100 text-red-700" },
};

function formatDate(iso) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString("fr-FR");
}

export default function AdminDashboardViewer() {
  const { dashboardId } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const clientNames = useClientNameMap();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const dashRes = await api
        .get(`/bi/dashboards/${dashboardId}`)
        .catch(() => null);
      if (!dashRes) throw new Error("Dashboard not found");
      setDashboard(dashRes.data?.data || dashRes.data);
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground text-sm">
            Chargement du dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-2" />
            <p className="text-destructive font-medium">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/bi-upload-portal")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour au portail BI
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboard) return null;

  const badgeCfg = DASHBOARD_STATUS[dashboard.status] || {
    label: dashboard.status,
    color: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/bi-upload-portal")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                {dashboard.name}
              </h1>
              <Badge className={badgeCfg.color}>{badgeCfg.label}</Badge>
              {dashboard.metabaseDashboardId && (
                <Badge variant="outline">
                  <Database className="h-3 w-3 mr-1" />
                  MB #{dashboard.metabaseDashboardId}
                </Badge>
              )}
            </div>
            {dashboard.description && (
              <p className="text-muted-foreground text-sm mt-1">
                {dashboard.description}
              </p>
            )}
            <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
              <span>
                Client:{" "}
                {clientNames[dashboard.clientId] ||
                  dashboard.request?.businessName ||
                  dashboard.clientId}
              </span>
              <span>|</span>
              <span>Type: {dashboard.businessType}</span>
              <span>|</span>
              <span>Créé le: {formatDate(dashboard.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
          </Button>
        </div>
      </div>

      {/* Live embedded Metabase dashboard (same view the client sees) */}
      <EmbeddedDashboardContainer dashboardId={dashboard.id} />

      {/* Dashboard info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations du dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">ID :</span>{" "}
              <span className="font-mono text-xs">{dashboard.id}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Statut :</span>{" "}
              <Badge className={badgeCfg.color}>{badgeCfg.label}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Client :</span>{" "}
              {clientNames[dashboard.clientId] ||
                dashboard.request?.businessName ||
                dashboard.clientId}
            </div>
            <div>
              <span className="text-muted-foreground">Type d'activité :</span>{" "}
              {dashboard.businessType}
            </div>
            <div>
              <span className="text-muted-foreground">Créé le :</span>{" "}
              {formatDate(dashboard.createdAt)}
            </div>
            <div>
              <span className="text-muted-foreground">
                Dernière modification :
              </span>{" "}
              {formatDate(dashboard.updatedAt)}
            </div>
            {dashboard.assignedAt && (
              <div>
                <span className="text-muted-foreground">Publié le :</span>{" "}
                {formatDate(dashboard.assignedAt)}
              </div>
            )}
            {dashboard.metabaseDashboardId && (
              <div>
                <span className="text-muted-foreground">
                  Metabase Dashboard ID :
                </span>{" "}
                #{dashboard.metabaseDashboardId}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
