import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Users, FileText, Package, Activity, Download, AlertCircle, Loader2 } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { clientsApi, licensesApi, modulesApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function Reports() {
  const { hasPermission } = useAuth();
  const can = (p) => hasPermission(p);

  const [stats, setStats] = useState({
    clients: 0,
    licenses: 0,
    activeLicenses: 0,
    modules: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const safeGet = async (fn) => {
      try {
        const res = await fn();
        return res.data || [];
      } catch {
        return [];
      }
    };

    const [clients, licenses, modules] = await Promise.all([
      can("clients.view") ? safeGet(() => clientsApi.getAll()) : Promise.resolve([]),
      can("licenses.view") ? safeGet(() => licensesApi.getAll()) : Promise.resolve([]),
      can("modules.view") ? safeGet(() => modulesApi.getAll()) : Promise.resolve([]),
    ]);

    setStats({
      clients: clients.length,
      licenses: licenses.length,
      activeLicenses: licenses.filter((l) => l.isActive).length,
      modules: modules.length,
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const exportCsv = () => {
    if (!can("reports.export")) return;
    const rows = [];
    if (can("clients.view")) rows.push(["clients", stats.clients]);
    if (can("licenses.view")) rows.push(["licenses", stats.licenses, "active", stats.activeLicenses]);
    if (can("modules.view")) rows.push(["modules", stats.modules]);
    const csv = "metric,value\n" + rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows = [
    { label: "Clients", value: stats.clients, permission: "clients.view", icon: Users },
    { label: "Licences", value: stats.licenses, permission: "licenses.view", icon: FileText },
    { label: "Licences actives", value: stats.activeLicenses, permission: "licenses.view", icon: Activity },
    { label: "Modules", value: stats.modules, permission: "modules.view", icon: Package },
  ].filter((r) => can(r.permission));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rapports"
        description="Statistiques agrégées"
        actions={
          can("reports.export") && (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="size-3.5" /> Exporter CSV
            </Button>
          )
        }
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Aucune donnée accessible avec vos permissions actuelles.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((row) => (
            <Card key={row.label}>
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[13px] font-medium text-muted-foreground">
                    {row.label}
                  </CardTitle>
                  <span className="grid size-7 place-items-center rounded-md bg-muted text-muted-foreground">
                    <row.icon className="size-4" />
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-semibold tracking-tight">{row.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Périmètre du rapport</CardTitle>
          <CardDescription>
            Les données affichées sont filtrées par vos permissions (RBAC).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant={can("clients.view") ? "success" : "neutral"}>Clients</Badge>
            <Badge variant={can("licenses.view") ? "success" : "neutral"}>Licences</Badge>
            <Badge variant={can("modules.view") ? "success" : "neutral"}>Modules</Badge>
            <Badge variant={can("reports.export") ? "success" : "neutral"}>Export CSV</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
