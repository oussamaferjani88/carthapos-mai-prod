import { useState, useEffect } from "react";
import {
  RefreshCw,
  AlertCircle,
  ExternalLink,
  LayoutDashboard,
  Lock,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function EmbeddedDashboardContainer({ dashboardId }) {
  const [embedData, setEmbedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEmbedInfo = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/bi/dashboards/${dashboardId}/embed`);
      if (!res.ok) throw new Error("Failed to load dashboard information");
      const json = await res.json();
      setEmbedData(json.data || json);
    } catch (err) {
      setError(err.message || "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dashboardId) fetchEmbedInfo();
  }, [dashboardId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Chargement du dashboard...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <p className="text-sm text-destructive font-medium mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchEmbedInfo}>
            <RefreshCw className="mr-2 h-3 w-3" /> Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!embedData || !embedData.dashboard) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <LayoutDashboard className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Information du dashboard non disponible.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { dashboard, template, embedding } = embedData;
  const notPublished = dashboard.status !== "PUBLISHED";

  if (notPublished) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Dashboard pas encore disponible
          </CardTitle>
          <CardDescription>
            Ce dashboard est actuellement en statut{" "}
            <strong>{dashboard.status}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Il sera accessible ici une fois examiné et publié.
            Une notification vous sera envoyée lorsqu'il sera prêt.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!embedding.metabaseDashboardId || !template) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <LayoutDashboard className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-center">
            Aucun template de dashboard n'est actuellement disponible pour cette
            activité.
          </p>
          <p className="text-xs text-muted-foreground mt-1 text-center max-w-md">
            Un analyste BI doit créer le dashboard et l'enregistrer pour les
            entreprises <strong>{dashboard.businessType}</strong>.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Embedding is fully configured and enabled — render iframe
  if (embedding.enabled && embedding.iframeUrl) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{dashboard.businessType}</Badge>
            {template?.name && (
              <span className="text-xs text-muted-foreground">{template.name}</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(embedding.metabaseUrl, "_blank")}
          >
            <ExternalLink className="mr-2 h-3 w-3" /> Ouvrir dans Metabase
          </Button>
        </div>
        <div
          className="w-full border rounded-lg overflow-hidden"
          style={{ height: "70vh" }}
        >
          <iframe
            src={embedding.iframeUrl}
            title={dashboard.name}
            width="100%"
            height="100%"
            style={{ border: "none" }}
            allow="fullscreen"
          />
        </div>
      </div>
    );
  }

  // Embedding available but not yet enabled — show preview card with open button
  if (embedding.available && !embedding.enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            {template?.name || dashboard.name}
          </CardTitle>
          <CardDescription>
            Dashboard lié à Metabase (intégration pas encore active).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Ce dashboard est configuré pour l'intégration. Le spécialiste BI a
            activé le partage public, mais la fonctionnalité d'intégration n'est
            pas encore activée dans la configuration du backend. Vous pouvez
            toujours le voir directement dans Metabase.
          </p>
          <div className="flex gap-3">
            <Button
              variant="default"
              onClick={() => window.open(embedding.metabaseUrl, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Ouvrir dans Metabase
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Metabase linked but no public UUID for embedding — show open button fallback
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          {dashboard.name}
        </CardTitle>
        <CardDescription>Votre dashboard est prêt. Voir dans Metabase.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <p>
              Type d'activité : <strong>{dashboard.businessType}</strong>
            </p>
            {template && (
              <p>
                Template : <strong>{template.name}</strong>
              </p>
            )}
          </div>
          <Button
            variant="default"
            size="lg"
            onClick={() => window.open(embedding.metabaseUrl, "_blank")}
          >
            <ExternalLink className="mr-2 h-5 w-5" />
            Ouvrir le Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
