import { useState, useEffect } from "react";
import { RefreshCw, AlertCircle, ExternalLink, LayoutDashboard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

type EmbedData = {
  dashboard: {
    id: string;
    clientId: string;
    name: string;
    description: string | null;
    status: string;
    businessType: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
  } | null;
  template: {
    id: string;
    name: string;
    businessType: string;
    metabaseDashboardId: number;
    active: boolean;
    embedType: string;
    embedPublicUuid: string | null;
  } | null;
  embedding: {
    available: boolean;
    enabled: boolean;
    metabaseDashboardId: number | null;
    metabaseUrl: string | null;
    metabaseBaseUrl: string;
    publicUrl: string | null;
    iframeUrl: string | null;
    embedType: string | null;
  };
};

type Props = {
  dashboardId: string;
};

export default function EmbeddedDashboardContainer({ dashboardId }: Props) {
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);
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
    } catch (err: any) {
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
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
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
            <RefreshCw className="mr-2 h-3 w-3" /> Retry
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
          <p className="text-sm text-muted-foreground">Dashboard information not available.</p>
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
            Dashboard Not Yet Available
          </CardTitle>
          <CardDescription>
            This dashboard is currently in <strong>{dashboard.status}</strong> status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            It will be accessible here once it is reviewed and published.
            You will receive a notification when it is ready.
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
            No dashboard template is currently available for this business.
          </p>
          <p className="text-xs text-muted-foreground mt-1 text-center max-w-md">
            A BI analyst needs to create the dashboard and register it for{" "}
            <strong>{dashboard.businessType}</strong> businesses.
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
            onClick={() => window.open(embedding.metabaseUrl!, "_blank")}
          >
            <ExternalLink className="mr-2 h-3 w-3" /> Open in Metabase
          </Button>
        </div>
        <div className="w-full border rounded-lg overflow-hidden" style={{ height: "70vh" }}>
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
            Dashboard linked to Metabase (embedding not yet active).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This dashboard is configured for embedding. The BI specialist has enabled
            public sharing, but the embedding feature is not yet enabled in the backend
            configuration. You can still view it directly in Metabase.
          </p>
          <div className="flex gap-3">
            <Button
              variant="default"
              onClick={() => window.open(embedding.metabaseUrl!, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Open in Metabase
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
        <CardDescription>
          Your business dashboard is ready. View it in Metabase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <p>Business type: <strong>{dashboard.businessType}</strong></p>
            {template && (
              <p>Template: <strong>{template.name}</strong></p>
            )}
          </div>
          <Button
            variant="default"
            size="lg"
            onClick={() => window.open(embedding.metabaseUrl!, "_blank")}
          >
            <ExternalLink className="mr-2 h-5 w-5" />
            Open Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}