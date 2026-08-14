import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Download,
  Play,
  Link2,
  LayoutDashboard,
  ShieldCheck,
  WandSparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import PageHeader from "../components/shared/PageHeader";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

const STATUS_CONFIG = {
  UPLOADED: {
    label: "Déposé",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  VALIDATING: {
    label: "Validation...",
    color: "bg-amber-100 text-amber-700",
    icon: RefreshCw,
  },
  PROCESSING: {
    label: "Traitement...",
    color: "bg-amber-100 text-amber-700",
    icon: RefreshCw,
  },
  COMPLETED: {
    label: "Terminé",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  FAILED: { label: "Échoué", color: "bg-red-100 text-red-700", icon: XCircle },
};

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR");
}

export default function BiUploadPortal() {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clientFilter, setClientFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [clients, setClients] = useState([]);
  const clientNames = Object.fromEntries(
    clients.map((c) => [c.clientId, c.name || c.clientId]),
  );

  const loadUploads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (clientFilter !== "ALL") params.clientId = clientFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;

      const res = await api.get("/bi-uploads", { params });
      const payload = res.data?.data || res.data;
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setUploads(items);
      setTotalPages(payload?.totalPages || 1);
    } catch (err) {
      toast.error(
        "Erreur chargement des uploads: " +
          (err.response?.data?.error || err.message),
      );
    } finally {
      setLoading(false);
    }
  }, [page, clientFilter, statusFilter]);

  const loadClients = useCallback(async () => {
    try {
      const res = await api.get("/bi-uploads/clients/list");
      const data = res.data?.data || [];
      setClients(data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Auto-refresh every 10s when processing uploads exist
  useEffect(() => {
    const hasActive = uploads.some((u) =>
      ["UPLOADED", "VALIDATING", "PROCESSING"].includes(u.status),
    );
    if (!hasActive) return;
    const interval = setInterval(loadUploads, 10000);
    return () => clearInterval(interval);
  }, [uploads, loadUploads]);

  // ─── Detail view ────────────────────────────────────────────

  const openDetail = async (upload) => {
    setSelectedUpload(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/bi-uploads/${upload.id}`);
      setSelectedUpload(res.data?.data || res.data);
    } catch {
      toast.error("Erreur chargement détails");
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <PageHeader
        title="Historique BI"
        description="Consultez les imports passés, le statut de traitement ETL, les rapports d'exécution et les dashboards préparés."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/bi-wizard")}
          >
            <WandSparkles className="mr-2 h-4 w-4" /> Nouvel import
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Rechercher par fichier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.clientId} value={c.clientId}>
                    {c.name || c.clientId} ({c.businessType || "—"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {Object.keys(STATUS_CONFIG).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadUploads}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload List */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des téléversements</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun téléversement trouvé. Importez un fichier ZIP BI pour
              commencer.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Requête</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Lignes</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((u) => {
                  const StatusIcon = STATUS_CONFIG[u.status]?.icon || Clock;
                  return (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer"
                      onClick={() => openDetail(u)}
                    >
                      <TableCell>{clientNames[u.clientId] || "—"}</TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={u.fileName}
                      >
                        <FileText className="mr-1 inline h-3 w-3" />
                        {u.fileName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{u.businessType}</Badge>
                      </TableCell>
                      <TableCell>
                        {u.biRequest ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                            <Link2 className="h-3 w-3" />
                            {u.biRequest.id.substring(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatBytes(u.fileSize)}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_CONFIG[u.status]?.color || ""}>
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_CONFIG[u.status]?.label || u.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{u.totalRows || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetail(u)}
                          >
                            Détails
                          </Button>
                          {["UPLOADED", "VALIDATING", "PROCESSING"].includes(
                            u.status,
                          ) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    `Annuler le traitement de "${u.fileName}" ?`,
                                  )
                                )
                                  return;
                                try {
                                  await api.post(`/bi-uploads/${u.id}/cancel`);
                                  toast.success("Traitement annulé");
                                  loadUploads();
                                } catch (err) {
                                  toast.error(
                                    "Erreur annulation: " +
                                      (err.response?.data?.error ||
                                        err.message),
                                  );
                                }
                              }}
                            >
                              Annuler
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  `Supprimer définitivement "${u.fileName}" ?`,
                                )
                              )
                                return;
                              try {
                                await api.delete(`/bi-uploads/${u.id}`);
                                toast.success("Upload supprimé");
                                loadUploads();
                              } catch (err) {
                                toast.error(
                                  "Erreur suppression: " +
                                    (err.response?.data?.error || err.message),
                                );
                              }
                            }}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Précedent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedUpload && (
        <DetailModal
          upload={selectedUpload}
          loading={detailLoading}
          clientNames={clientNames}
          onClose={() => setSelectedUpload(null)}
          onRefresh={() => openDetail(selectedUpload)}
        />
      )}
    </div>
  );
}

// ─── ETL Progress Helper ────────────────────────────────────────

const ETL_STEP_PROGRESS = {
  init: 5,
  extract: 10,
  metadata: 20,
  "schema-check": 25,
  validate: 35,
  EXTRACT: 40,
  LOAD: 60,
  LOAD_DIMS: 60,
  LOAD_FACTS: 75,
  CANCELLED: 100,
  COMPLETE: 90,
};

function getProgressPercent(step, status) {
  if (status === "COMPLETED") return 100;
  if (status === "FAILED") return 100;
  if (step && ETL_STEP_PROGRESS[step] !== undefined)
    return ETL_STEP_PROGRESS[step];
  if (status === "QUEUED") return 5;
  if (status === "PROCESSING") return 30;
  return 0;
}

// ─── Detail Modal ───────────────────────────────────────────────

function DetailModal({ upload, loading, clientNames, onClose, onRefresh }) {
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (!upload?.id) return;
    const id = upload.id;
    const fetchLogs = () =>
      api
        .get(`/bi-uploads/${id}/logs`)
        .then((res) => setLogs(res.data?.data || []))
        .catch(() => {});
    fetchLogs();
    const poll = setInterval(fetchLogs, 5000);
    return () => clearInterval(poll);
  }, [upload?.id]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const job = upload?.processingJob;
  const hasError = upload?.status === "FAILED";

  // Compute duration
  let duration = null;
  if (job?.startedAt) {
    const start = new Date(job.startedAt);
    const end = job.completedAt ? new Date(job.completedAt) : new Date();
    const sec = Math.round((end - start) / 1000);
    if (sec < 60) duration = `${sec}s`;
    else duration = `${Math.floor(sec / 60)}m ${sec % 60}s`;
  }

  // Latest step from logs
  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const currentStep = latestLog?.step || (job ? job.status : upload.status);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails du téléversement</DialogTitle>
          <DialogDescription>
            Informations, traitement ETL et dashboard lié à ce téléversement.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : (
            <>
              {/* Info card */}
              <Card>
                <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Client :</span>{" "}
                    <span className="font-medium">
                      {clientNames[upload.clientId] || upload.clientId}
                    </span>
                    {clientNames[upload.clientId] && (
                      <span className="font-mono text-xs text-muted-foreground ml-2">
                        ({upload.clientId})
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type :</span>{" "}
                    <Badge variant="outline">{upload.businessType}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fichier :</span>{" "}
                    {upload.fileName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Taille :</span>{" "}
                    {formatBytes(upload.fileSize)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Statut :</span>{" "}
                    <Badge
                      className={STATUS_CONFIG[upload.status]?.color || ""}
                    >
                      {STATUS_CONFIG[upload.status]?.label || upload.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lignes :</span>{" "}
                    {upload.totalRows || "En attente..."}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Créé le :</span>{" "}
                    {formatDate(upload.createdAt)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mis à jour :</span>{" "}
                    {formatDate(upload.updatedAt)}
                  </div>
                </CardContent>
              </Card>

              {/* Linked Request */}
              {upload.biRequest && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Requête liée</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID :</span>
                      <span className="font-mono text-xs">
                        {upload.biRequest.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nom :</span>
                      <span>{upload.biRequest.businessName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Statut :</span>
                      <Badge
                        variant={
                          upload.biRequest.status === "APPROVED"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {upload.biRequest.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type :</span>
                      <Badge variant="outline">
                        {upload.biRequest.dashboardType}
                      </Badge>
                    </div>
                    {/* Start ETL button — only for APPROVED requests not already processing/completed */}
                    {upload.biRequest.status === "APPROVED" &&
                      !["VALIDATING", "PROCESSING", "COMPLETED"].includes(
                        upload.status,
                      ) && (
                        <div className="pt-2">
                          <StartEtlButton
                            uploadId={upload.id}
                            onComplete={onRefresh}
                          />
                        </div>
                      )}
                  </CardContent>
                </Card>
              )}

              {/* Admin Quick Approve — for walk-in clients with no existing request */}
              {!upload.biRequest &&
                !["VALIDATING", "PROCESSING", "COMPLETED"].includes(
                  upload.status,
                ) && (
                  <Card className="border-green-200">
                    <CardHeader>
                      <CardTitle className="text-sm text-green-700">
                        Approbation Rapide Admin
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="text-muted-foreground text-xs mb-3">
                        Client venu en personne ? Paiement en espèces ? Créez
                        une demande BI avec approbation immédiate.
                      </p>
                      <AdminQuickApproveButton
                        uploadId={upload.id}
                        onComplete={onRefresh}
                      />
                    </CardContent>
                  </Card>
                )}

              {/* Processing Job */}
              {job && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Traitement ETL</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Statut :</span>
                      <Badge
                        variant={
                          job.status === "COMPLETED"
                            ? "default"
                            : job.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Étape en cours :
                      </span>
                      <span className="font-mono text-xs">{currentStep}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Progression
                        </span>
                        <span className="font-medium">
                          {getProgressPercent(currentStep, job?.status)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className="bg-primary h-2.5 rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${getProgressPercent(currentStep, job?.status)}%`,
                          }}
                        />
                      </div>
                    </div>
                    {duration && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Durée :</span>
                        <span className="font-medium">{duration}</span>
                      </div>
                    )}
                    {job.startedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Début :</span>
                        <span>{formatDate(job.startedAt)}</span>
                      </div>
                    )}
                    {job.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fin :</span>
                        <span>{formatDate(job.completedAt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Enregistrements :
                      </span>
                      <span className="font-medium">
                        {job.recordsLoaded || 0}
                      </span>
                    </div>
                    {job.errorMessage && (
                      <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 mt-2 text-xs font-mono whitespace-pre-wrap">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        {job.errorMessage}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Dashboard */}
              {(() => {
                const dashboard = upload.dashboards?.[0];
                const canGenerate =
                  upload.status === "COMPLETED" &&
                  upload.biRequest?.status === "APPROVED" &&
                  !dashboard;
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Dashboard</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {dashboard ? (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">
                              Statut :
                            </span>
                            <Badge
                              variant={
                                dashboard.status === "PUBLISHED"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {dashboard.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Nom :</span>
                            <span className="font-medium">
                              {dashboard.name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ID :</span>
                            <span className="font-mono text-xs">
                              {dashboard.id}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground text-xs">
                          Aucun dashboard préparé pour cet upload.
                        </p>
                      )}
                      {canGenerate && (
                        <div className="pt-2">
                          <GenerateDashboardButton
                            uploadId={upload.id}
                            onComplete={onRefresh}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Error message (non-job) */}
              {hasError && upload.errorMessage && !job?.errorMessage && (
                <Card className="border-red-200">
                  <CardContent className="pt-4">
                    <div className="bg-red-50 rounded p-2 text-red-700 text-sm font-mono text-xs">
                      {upload.errorMessage}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Uploaded Files */}
              {upload.files?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Fichiers dans le ZIP
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      {upload.files.map((f) => (
                        <div key={f.id} className="flex justify-between">
                          <span>{f.fileName}</span>
                          <span className="text-muted-foreground">
                            {f.rowCount} lignes
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Processing Logs */}
              {logs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Journal ETL ({logs.length} entrées)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 max-h-48 overflow-y-auto text-xs font-mono">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-1 rounded ${log.level === "ERROR" ? "bg-red-50 text-red-700" : log.level === "WARN" ? "bg-amber-50 text-amber-700" : ""}`}
                        >
                          <span className="text-muted-foreground">
                            [
                            {new Date(log.createdAt).toLocaleTimeString(
                              "fr-FR",
                            )}
                            ]
                          </span>{" "}
                          <span className="font-semibold">{log.step}</span>{" "}
                          {log.message}
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Debug hint when stuck */}
              {upload.status === "UPLOADED" &&
                !job?.completedAt &&
                !job?.errorMessage && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="pt-4 text-sm">
                      <p className="text-amber-800 font-medium">
                        ⚠ Le traitement semble bloqué
                      </p>
                      <p className="text-amber-700 text-xs mt-1">
                        Le statut est "Déposé" depuis longtemps. Vérifie la
                        console du serveur backend pour les logs [ETL] et
                        [UPLOAD]. Tu peux aussi utiliser{" "}
                        <code className="bg-amber-100 px-1 rounded">
                          GET /api/bi/debug/health
                        </code>{" "}
                        pour l'état général.
                      </p>
                    </CardContent>
                  </Card>
                )}
            </>
          )}
        </div>
        <DialogFooter className="sm:justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fermer
          </Button>
          <Button size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Generate Dashboard Button ────────────────────────────────────

function GenerateDashboardButton({ uploadId, onComplete }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!window.confirm("Préparer un dashboard pour cet upload ?")) return;
    setGenerating(true);
    try {
      await api.post("/bi/dashboards/generate-from-upload", { uploadId });
      toast.success("Dashboard préparé avec succès");
      if (onComplete) onComplete();
    } catch (err) {
      toast.error(
        "Erreur préparation dashboard: " +
          (err.response?.data?.error || err.message),
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      size="sm"
      className="w-full"
      onClick={handleGenerate}
      disabled={generating}
    >
      <LayoutDashboard className="h-4 w-4 mr-2" />
      {generating ? "Préparation..." : "Préparer Dashboard"}
    </Button>
  );
}

// ─── Start ETL Button ────────────────────────────────────────────

function StartEtlButton({ uploadId, onComplete }) {
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (!window.confirm("Lancer le traitement ETL pour cet upload ?")) return;
    setStarting(true);
    try {
      await api.post(`/bi-uploads/${uploadId}/start-etl`);
      toast.success(
        "Pipeline ETL démarré. Le traitement est en cours en arrière-plan.",
      );
      if (onComplete) onComplete();
    } catch (err) {
      toast.error(
        "Erreur démarrage ETL: " + (err.response?.data?.error || err.message),
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <Button
      size="sm"
      className="w-full"
      disabled={starting}
      onClick={handleStart}
    >
      <Play className="h-4 w-4 mr-2" />
      {starting ? "Démarrage..." : "Lancer ETL"}
    </Button>
  );
}

// ─── Admin Quick Approve Button ──────────────────────────────────────

function AdminQuickApproveButton({ uploadId, onComplete }) {
  const [approving, setApproving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [businessType, setBusinessType] = useState("restaurant");
  const [businessName, setBusinessName] = useState("");

  const handleConfirm = async () => {
    if (!businessName.trim()) {
      toast.error("Veuillez saisir un nom d'entreprise.");
      return;
    }
    setApproving(true);
    try {
      await api.post(`/bi-uploads/${uploadId}/admin-approve`, {
        businessType,
        businessName: businessName.trim(),
      });
      toast.success(
        "Approbation rapide effectuée. La demande BI est créée et liée au téléversement.",
      );
      setShowModal(false);
      if (onComplete) onComplete();
    } catch (err) {
      toast.error("Erreur: " + (err.response?.data?.error || err.message));
    } finally {
      setApproving(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        onClick={() => setShowModal(true)}
      >
        <ShieldCheck className="h-4 w-4 mr-2" />
        Approbation Rapide Admin
      </Button>

      {showModal && (
        <Dialog open onOpenChange={(open) => !open && setShowModal(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Approbation Rapide Admin</DialogTitle>
              <DialogDescription>
                Client venu en personne ? Paiement en espèces ? Remplissez les
                informations ci-dessous pour créer une demande BI approuvée et
                la lier à ce téléversement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Nom de l'entreprise
                </label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex: Café de la Paix"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type d'activité</label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="cafe">Café</SelectItem>
                    <SelectItem value="retail">Commerce</SelectItem>
                    <SelectItem value="pharmacy">Pharmacie</SelectItem>
                    <SelectItem value="salon">Salon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle className="mr-1 inline h-4 w-4" />
                Cela va créer une demande BI avec statut{" "}
                <strong>APPROUVÉ</strong> et paiement <strong>VÉRIFIÉ</strong>,
                puis la lier à ce téléversement.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={approving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {approving ? "Création..." : "Confirmer l'approbation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
