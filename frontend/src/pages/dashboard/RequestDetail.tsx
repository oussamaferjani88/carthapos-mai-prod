import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Clock,
  Database,
  FileArchive,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  biFetch,
  isActiveStatus,
  STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  UPLOAD_STATUS_LABELS,
  PROCESSING_JOB_STATUS_LABELS,
  DASHBOARD_STATUS_LABELS,
  formatBytes,
  formatDate,
  timeAgo,
  type BiRequest,
} from "@/lib/bi-client";
import { StatusBadge } from "@/components/bi/StatusBadge";
import { StageProgress } from "@/components/bi/StageProgress";
import { BITimeline } from "@/components/bi/BITimeline";
import { BIErrorState } from "@/components/bi/BIErrorState";
import { BISkeletonCard } from "@/components/bi/BISkeleton";

const STEP_SECTION_MAP: Record<number, string> = {
  1: "section-info",
  2: "section-info",
  3: "section-uploads",
  4: "section-timeline",
  5: "section-timeline",
  6: "section-dashboard",
  7: "section-dashboard",
};

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<BiRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [zipFile, setZipFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await biFetch(`/bi-requests/${id}`);
      if (!res.ok) throw new Error("Demande introuvable");
      const json = await res.json();
      setRequest(json);
      setError("");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Impossible de charger la demande.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!request || !isActiveStatus(request.status)) return;
    const interval = setInterval(load, 6000);
    return () => clearInterval(interval);
  }, [request?.status, load]);

  const handleUploadZip = async () => {
    if (!zipFile) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("files", zipFile);
      const res = await biFetch(`/bi-requests/${id}/uploads`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Échec du téléversement");
      }
      setZipFile(null);
      await load();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Une erreur est survenue lors du téléversement.");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Voulez-vous vraiment annuler cette demande ?")) return;
    setCancelling(true);
    try {
      const res = await biFetch(`/bi-requests/${id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || "Impossible d'annuler");
      }
      await load();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Une erreur est survenue.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-20 h-8" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-56 bg-muted rounded animate-pulse" />
              <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="h-3 w-40 bg-muted rounded mt-2 animate-pulse" />
          </div>
        </div>
        <BISkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BISkeletonCard />
          <BISkeletonCard />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <BIErrorState message={error || "Demande introuvable."} />
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/dashboard/bi")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour
        </Button>
      </div>
    );
  }

  const currentStep = request.currentStep || 0;
  const progress = request.progressPercent || 0;
  const canCancel = ["PENDING_REVIEW", "REQUEST_INFO", "APPROVED"].includes(request.status);
  const publishedDashboard = (request.dashboards || []).find((d) => d.status === "PUBLISHED");
  const readyDashboard = (request.dashboards || [])[0];
  const active = isActiveStatus(request.status);

  const scrollToSection = (step: number) => {
    const sectionId = STEP_SECTION_MAP[step];
    if (!sectionId) return;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const nextStepHint = () => {
    switch (request.status) {
      case "PENDING_REVIEW":
        return "Votre demande est en attente de révision par l'équipe BI.";
      case "REQUEST_INFO":
        return "L'équipe BI a besoin d'informations complémentaires. Contactez-nous pour plus de détails.";
      case "APPROVED":
        return "Votre demande a été approuvée. Le traitement des données va commencer.";
      case "PROCESSING_ETL":
        return "Vos données sont en cours de traitement. Cette page se met à jour automatiquement.";
      case "DATA_REVIEW":
        return "Vos données sont prêtes. L'équipe BI va les réviser puis générer votre tableau de bord.";
      case "GENERATING_DASHBOARD":
        return "Votre tableau de bord est en cours de génération.";
      case "READY_FOR_REVIEW":
        return "Votre tableau de bord est prêt ! Il sera bientôt publié dans votre espace.";
      case "PUBLISHED":
      case "COMPLETED":
        return "Votre tableau de bord est disponible. Consultez-le dans l'onglet « Mes tableaux de bord ».";
      case "REJECTED":
        return "Cette demande a été refusée. Vous pouvez créer une nouvelle demande.";
      case "CANCELLED":
        return "Cette demande a été annulée.";
      default:
        return "";
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/bi")}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight sm:text-[22px] truncate">{request.businessName || request.businessType}</h1>
            <StatusBadge status={request.status} label={STATUS_LABELS[request.status] || request.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {request.businessType} · Créée le {formatDate(request.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); load(); }} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Actualiser
          </Button>
          {canCancel && (
            <Button variant="destructive" size="sm" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
              Annuler
            </Button>
          )}
        </div>
      </div>

      {error && <BIErrorState message={error} onRetry={load} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Avancement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StageProgress currentStep={currentStep} status={request.status} onStepClick={scrollToSection} />
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>{active ? "En cours..." : STATUS_LABELS[request.status] || request.status}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className={active ? "animate-pulse" : ""} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="space-y-6">
          {/* General info */}
          <Card id="section-info">
            <CardHeader>
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Modèle</span>
                <span className="font-medium">{request.dashboardTemplate || request.businessType}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Type d'activité</span>
                <span className="font-medium">{request.businessType}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Paiement</span>
                <span className="font-medium">{PAYMENT_STATUS_LABELS[request.paymentStatus] || request.paymentStatus}</span>
              </div>
              {request.specialistNotes && (
                <div className="pt-2 border-t border-border">
                  <div className="text-muted-foreground mb-1">Note de l'équipe BI</div>
                  <p className="font-medium whitespace-pre-wrap">{request.specialistNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Uploads */}
          <Card id="section-uploads">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Fichiers de données</CardTitle>
              {request.status !== "PUBLISHED" && !["COMPLETED", "REJECTED", "CANCELLED"].includes(request.status) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="sr-only" htmlFor="zip-upload">Fichier ZIP des données</label>
                  <Input
                    id="zip-upload"
                    type="file"
                    accept=".zip"
                    className="w-40 h-8 text-xs"
                    aria-label="Fichier ZIP des données"
                    onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                  />
                  <Button size="sm" variant="outline" onClick={handleUploadZip} disabled={!zipFile || uploading}>
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileArchive className="w-3.5 h-3.5 mr-1" />}
                    Téléverser
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!request.uploads || request.uploads.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucun fichier téléversé.</div>
              ) : (
                <div className="space-y-2">
                  {request.uploads.map((upload) => (
                    <div key={upload.id} className="rounded border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{upload.fileName || "fichier.zip"}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatBytes(upload.fileSize)} · {formatDate(upload.createdAt)}
                            {upload.totalRows > 0 ? ` · ${upload.totalRows} lignes` : ""}
                          </div>
                        </div>
                        <StatusBadge
                          status={upload.status}
                          label={UPLOAD_STATUS_LABELS[upload.status] || upload.status}
                          className="shrink-0"
                        />
                      </div>

                      {upload.files && upload.files.length > 0 && (
                        <div className="space-y-1.5 pt-1.5 border-t border-border">
                          {upload.files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between gap-3">
                              <div className="min-w-0 text-xs">
                                <span className="font-medium truncate">{file.fileName}</span>
                                <span className="text-muted-foreground">
                                  {" "}· {formatBytes(file.fileSize)}
                                  {file.rowCount > 0 ? ` · ${file.rowCount} lignes` : ""}
                                </span>
                                {file.errorMessage && (
                                  <div
                                    className="mt-1 text-destructive rounded bg-red-500/5 border border-red-500/20 px-2 py-1"
                                    role="alert"
                                  >
                                    {file.errorMessage}
                                  </div>
                                )}
                              </div>
                              <StatusBadge
                                status={file.status}
                                label={UPLOAD_STATUS_LABELS[file.status] || file.status}
                                className="text-[10px] shrink-0"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {upload.processingJob && (
                        <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-border">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                            <Database className="w-3.5 h-3.5 shrink-0" />
                            <span className="shrink-0">Traitement ETL</span>
                            <StatusBadge
                              status={upload.processingJob.status}
                              label={PROCESSING_JOB_STATUS_LABELS[upload.processingJob.status] || upload.processingJob.status}
                              className="text-[10px] shrink-0"
                            />
                            {typeof upload.processingJob.logs?.length === "number" && (
                              <span className="truncate">{upload.processingJob.logs!.length} entrée(s) de journal</span>
                            )}
                          </div>
                          {upload.processingJob.startedAt && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              Démarré le {formatDate(upload.processingJob.startedAt)}
                            </span>
                          )}
                        </div>
                      )}

                      {upload.errorMessage && (
                        <div
                          className="text-xs text-destructive rounded bg-red-500/5 border border-red-500/20 p-2"
                          role="alert"
                        >
                          {upload.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next step CTA */}
          <div id="section-dashboard" className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Prochaine étape : </span>
                {nextStepHint()}
              </div>
            </div>
            {(publishedDashboard || readyDashboard) && (
              <Button
                size="sm"
                onClick={() => navigate(`/dashboard/bi-dashboard/${(publishedDashboard || readyDashboard)!.id}`)}
              >
                Voir le tableau de bord <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>

          {readyDashboard && (
            <div className="rounded-lg border border-border p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <BadgeCheck className="w-5 h-5 text-blue-500 shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">{readyDashboard.name}</span>
                  <span className="text-muted-foreground"> · v{readyDashboard.version}</span>
                  <div className="text-xs text-muted-foreground">
                    {DASHBOARD_STATUS_LABELS[readyDashboard.status] || readyDashboard.status}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline / events */}
      <Card id="section-timeline">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Historique</CardTitle>
          {request.events && request.events.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Dernier événement {timeAgo(request.events[request.events.length - 1].performedAt)}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {!request.events || request.events.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun événement pour le moment.</div>
          ) : (
            <BITimeline events={request.events} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
