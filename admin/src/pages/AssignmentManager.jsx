import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Archive,
  Info,
  LayoutDashboard,
  Link2,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  SearchX,
  Trash2,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";
import PageHeader from "../components/shared/PageHeader";
import api from "../lib/api";

const PAGE_SIZE = 10;

function assignmentStatusClass(status) {
  if (status === "ACTIVE") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("fr-FR");
}

export default function AssignmentManager() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [clientOptions, setClientOptions] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: PAGE_SIZE };
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (clientFilter !== "ALL") params.clientId = clientFilter;
      if (search.trim()) params.q = search.trim();
      const res = await api.get("/bi/assignments", { params });
      const data = res.data?.data || {};
      const items = Array.isArray(data.items) ? data.items : [];
      setAssignments(items);
      setTotal(typeof data.total === "number" ? data.total : 0);
      setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 1);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger les assignations");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, clientFilter, search]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, clientFilter, search]);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await api.get("/bi/assignments", {
          params: { pageSize: 200 },
        });
        const data = res.data?.data || {};
        const items = Array.isArray(data.items) ? data.items : [];
        const map = new Map();
        items.forEach((a) => {
          if (a.client?.id && a.client?.name && !map.has(a.client.id)) {
            map.set(a.client.id, a.client.name);
          }
        });
        setClientOptions(Array.from(map, ([id, name]) => ({ id, name })));
      } catch {
        setClientOptions([]);
      }
    };
    loadClients();
  }, []);

  const runAction = async (id, fn, successMessage) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(successMessage);
      await loadAssignments();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Échec de l'opération");
    } finally {
      setBusyId(null);
    }
  };

  const activate = (assignment) => {
    if (
      !window.confirm(
        `Réactiver l'assignation de « ${assignment.dashboard?.name} » pour ce client ?`,
      )
    )
      return;
    runAction(
      assignment.id,
      () => api.post(`/bi/assignments/${assignment.id}/activate`),
      "Assignation réactivée",
    );
  };

  const archive = (assignment) => {
    if (
      !window.confirm(
        `Archiver l'assignation de « ${assignment.dashboard?.name} » ?`,
      )
    )
      return;
    runAction(
      assignment.id,
      () => api.post(`/bi/assignments/${assignment.id}/archive`),
      "Assignation archivée",
    );
  };

  const remove = (assignment) => {
    if (
      !window.confirm(
        `Supprimer cette assignation ? Le dashboard « ${assignment.dashboard?.name} » sera conservé.`,
      )
    )
      return;
    runAction(
      assignment.id,
      () => api.delete(`/bi/assignments/${assignment.id}`),
      "Assignation supprimée",
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gestion des assignations"
        description="Assignez des dashboards publiés à vos clients et gérez les versions actives."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nouvelle assignation
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Assignations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <Input
              className="w-64"
              placeholder="Rechercher (dashboard, client, activité)"
              aria-label="Rechercher une assignation"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  <SelectItem value="ACTIVE">Actives</SelectItem>
                  <SelectItem value="SUPERSEDED">Remplacées</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-56">
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les clients</SelectItem>
                  {clientOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-4 text-sm text-muted-foreground">
            {total} assignation(s) trouvée(s)
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <SearchX className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">Aucune assignation trouvée</p>
              <p className="text-sm text-muted-foreground mt-1">
                Modifiez vos filtres ou créez une nouvelle assignation.
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dashboard</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Assignée le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {a.dashboard?.name || "—"}
                            </div>
                            {a.dashboard?.businessType && (
                              <div className="text-xs text-muted-foreground">
                                {a.dashboard.businessType}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="truncate">
                              {a.client?.name || "—"}
                            </div>
                            {a.client?.email && (
                              <div className="text-xs text-muted-foreground truncate">
                                {a.client.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        v{a.version ?? a.dashboard?.version ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={assignmentStatusClass(a.status)}>
                          {a.status === "ACTIVE" ? "Active" : "Remplacée"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(a.assignedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {a.status !== "ACTIVE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busyId === a.id}
                              onClick={() => activate(a)}
                            >
                              {busyId === a.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                              Réactiver
                            </Button>
                          )}
                          {a.status === "ACTIVE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busyId === a.id}
                              onClick={() => archive(a)}
                            >
                              {busyId === a.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Archive className="w-3.5 h-3.5" />
                              )}
                              Archiver
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={busyId === a.id}
                            onClick={() => remove(a)}
                            title="Supprimer l'assignation (le dashboard est conservé)"
                            aria-label="Supprimer l'assignation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Page {page} / {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateAssignmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={loadAssignments}
      />
    </div>
  );
}

function CreateAssignmentDialog({ open, onOpenChange, onCreated }) {
  const [dashboards, setDashboards] = useState([]);
  const [clients, setClients] = useState([]);
  const [dashboardId, setDashboardId] = useState("");
  const [clientId, setClientId] = useState("");
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedDashboard = useMemo(
    () => dashboards.find((d) => d.id === dashboardId) || null,
    [dashboards, dashboardId],
  );

  useEffect(() => {
    if (!open) return;
    setDashboardId("");
    setClientId("");
    setVersion("");
    setSubmitting(false);
    const load = async () => {
      setLoading(true);
      try {
        const [dashRes, clientRes] = await Promise.all([
          api.get("/bi/dashboards", { params: { pageSize: 100 } }),
          api.get("/clients").catch(() => ({ data: [] })),
        ]);
        const dashData = dashRes.data?.data || {};
        setDashboards(Array.isArray(dashData.items) ? dashData.items : []);
        const clientData = Array.isArray(clientRes.data)
          ? clientRes.data
          : clientRes.data?.data || [];
        setClients(Array.isArray(clientData) ? clientData : []);
      } catch (error) {
        console.error(error);
        toast.error("Impossible de charger les dashboards");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open]);

  const handleDashboardChange = (value) => {
    setDashboardId(value);
    const dash = dashboards.find((d) => d.id === value);
    if (dash) setVersion(String(dash.version ?? ""));
  };

  const submit = async () => {
    if (!dashboardId || !clientId) {
      toast.error("Veuillez sélectionner un dashboard et un client");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/bi/assignments", {
        dashboardId,
        clientId,
        version: version.trim() ? Number(version.trim()) : undefined,
      });
      toast.success("Assignation créée et activée");
      onOpenChange(false);
      if (onCreated) onCreated();
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.error || "Échec de création de l'assignation",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Nouvelle assignation
          </DialogTitle>
          <DialogDescription>
            Active cette version du dashboard pour le client. Toute autre
            version active du client sera remplacée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Dashboard</label>
            <div className="mt-1">
              <Select
                value={dashboardId}
                onValueChange={handleDashboardChange}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      loading ? "Chargement..." : "Sélectionner un dashboard"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {dashboards.map((d) => (
                    <SelectItem
                      key={d.id}
                      value={d.id}
                      disabled={d.status !== "PUBLISHED"}
                    >
                      {d.name} (v{d.version}) —{" "}
                      {d.businessType || "sans activité"}
                      {d.status !== "PUBLISHED" ? ` · ${d.status}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDashboard?.status !== "PUBLISHED" && selectedDashboard && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> Seuls les dashboards publiés
                peuvent être assignés.
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Client</label>
            <div className="mt-1">
              <Select
                value={clientId}
                onValueChange={setClientId}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      loading ? "Chargement..." : "Sélectionner un client"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name || c.id}
                      {c.email ? ` · ${c.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Version</label>
            <Input
              className="mt-1"
              type="number"
              min="1"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder={
                selectedDashboard
                  ? `Par défaut : ${selectedDashboard.version ?? 1}`
                  : "Ex : 2"
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button onClick={submit} disabled={submitting || loading}>
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            Créer l'assignation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
