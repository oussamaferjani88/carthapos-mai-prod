import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Package,
  Calendar,
  Download,
  Eye,
  Settings2,
  Copy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { posStatusMeta } from "@/lib/posStatus";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { getAuthUser, getAuthClient } from "@/lib/auth";
import posService from "@/services/posService";
import licenseService from "@/services/licenseService";
import POSGenerationProgress from "@/components/pos/generation/POSGenerationProgress";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

type PortalUser = { id?: string; email?: string };

type LicenseModule = {
  id: string;
  module?: { id?: string; displayName?: string; category?: string; isCore?: boolean };
};

type License = {
  id: string;
  clientId: string;
  licenseKey: string;
  sector: string;
  licenseType?: string;
  bindingType?: string;
  buildStatus?: string | null;
  buildProjectPath?: string | null;
  buildProjectName?: string | null;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  modules?: LicenseModule[];
  client?: { name?: string; email?: string };
  configuration?: {
    businessName?: string;
    currency?: string;
    language?: string;
    posConfigVersion?: number | null;
    rawConfig?: {
      sector?: string;
      licenseType?: string;
      bindingType?: string;
      expirationDate?: string | null;
      modules?: string[];
      configuration?: Record<string, unknown>;
      posConfigVersion?: number;
    } | null;
  } | null;
};

type PosSystem = {
  id: string;
  licenseId: string;
  name: string;
  type: string;
  modules: number;
  createdAt: string;
  status: string;
  buildProjectPath: string | null;
  version: number;
  raw: License;
};

const getPortalUser = (): PortalUser | null => {
  const authClient = getAuthClient();
  const authUser = getAuthUser();
  if (authClient?.id || authUser?.id) {
    return {
      id: authClient?.id || authUser?.id,
      email: authClient?.email || authUser?.email,
    };
  }

  try {
    const local = localStorage.getItem("user");
    if (local) return JSON.parse(local);
  } catch {
    // ignore
  }

  try {
    const session = sessionStorage.getItem("user");
    if (session) return JSON.parse(session);
  } catch {
    // ignore
  }

  return null;
};

const getStatusLabel = (license: License) => {
  if (license.buildStatus === "building") return "building";
  if (license.buildStatus === "completed") return "ready";
  if (license.buildStatus === "failed") return "failed";
  if (license.buildStatus === "cleaned") return "cleaned";
  return license.isActive ? "active" : "inactive";
};

const PosProjects = () => {
  const { t } = useTranslation();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({ threshold: 0.2 });
  const [projects, setProjects] = useState<PosSystem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [downloadFlow, setDownloadFlow] = useState<{ licenseId: string; projectName: string } | null>(null);
  const [dlProgress, setDlProgress] = useState(0);
  const [dlStepId, setDlStepId] = useState<string>("preparing");
  const [dlAction, setDlAction] = useState("");
  const [dlError, setDlError] = useState<string | null>(null);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const loadProjects = useCallback(async () => {
    const user = getPortalUser();
    if (!user?.id) {
      setProjects([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("userId", user.id);
      if (user.email) params.set("userEmail", user.email);

      const response = await fetch(`${API_BASE_URL}/licenses?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          ...(user.email ? { "X-User-Email": user.email } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load POS projects");
      }

      const data = (await response.json()) as License[];
      const list = Array.isArray(data) ? data : [];

      setProjects(
        list.map((license) => ({
          id: license.id,
          licenseId: license.id,
          name: license.configuration?.businessName || license.client?.name || "POS",
          type: license.sector,
          modules: license.modules?.length || 0,
          createdAt: license.createdAt,
          status: getStatusLabel(license),
          buildProjectPath: license.buildProjectPath || null,
          version: license.configuration?.posConfigVersion ?? 1,
          raw: license,
        }))
      );
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger vos projets POS");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const triggerDownload = (url: string) => {
    if (downloadLinkRef.current) {
      downloadLinkRef.current.href = url;
      downloadLinkRef.current.click();
    } else {
      window.open(url, "_blank");
    }
  };

  const downloadUrlFor = (buildProjectPath: string | null) =>
    buildProjectPath
      ? `${API_BASE_URL}/pos/download?path=${encodeURIComponent(buildProjectPath)}`
      : null;

  // Verify an installer really exists behind the download endpoint. The build
  // can report "completed" even when no .exe was produced, so a plain
  // window.open would surface raw backend JSON errors to the user. A timeout
  // avoids hanging while the backend is busy with another build.
  const checkInstaller = async (url: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, { method: "HEAD", signal: controller.signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  };

  const DL_STEPS = [
    { id: "preparing", label: "Préparation du projet", description: "Rechargement de la configuration enregistrée" },
    { id: "generating", label: "Génération du POS", description: "Création des fichiers à partir de la configuration" },
    { id: "building", label: "Construction de l'exécutable", description: "Compilation de l'application Electron" },
    { id: "packaging", label: "Packaging", description: "Préparation de l'exécutable Windows" },
    { id: "downloading", label: "Téléchargement", description: "Récupération de l'installateur" },
  ];

  const DL_STAGE_TIMING = [
    { after: 0, step: 0, pct: 10 },
    { after: 5000, step: 1, pct: 25 },
    { after: 120000, step: 2, pct: 70 },
    { after: 330000, step: 3, pct: 90 },
  ];

  const runDownload = async (project: PosSystem) => {
    // Fast path: the project claims a ready build. Verify an installer really
    // exists first; a build can be marked "completed" without an .exe (the
    // backend would otherwise return a raw JSON error on download).
    if (project.buildProjectPath && project.status === "ready") {
      const fastUrl = downloadUrlFor(project.buildProjectPath);
      if (fastUrl && (await checkInstaller(fastUrl))) {
        triggerDownload(fastUrl);
        return;
      }
    }

    setDownloadFlow({ licenseId: project.licenseId, projectName: project.name });
    setDlProgress(0);
    setDlStepId(DL_STEPS[0].id);
    setDlAction(DL_STEPS[0].label);
    setDlError(null);

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const stage = [...DL_STAGE_TIMING].reverse().find((s) => elapsed >= s.after);
      if (stage) {
        setDlStepId(DL_STEPS[stage.step].id);
        setDlProgress(stage.pct);
        setDlAction(DL_STEPS[stage.step].label);
      }
    }, 800);

    try {
      const result = await posService.generateAgain(project.licenseId);
      clearInterval(timer);
      const path = result?.path;
      if (!path) {
        setDlError("Aucun exécutable généré");
        setTimeout(() => setDownloadFlow(null), 3000);
        return;
      }

      // Confirm the freshly built installer is actually available before
      // triggering the download. If the build did not produce an .exe, surface
      // a clear error instead of a raw backend JSON response.
      const url = downloadUrlFor(path)!;
      const available = await checkInstaller(url);
      if (!available) {
        setDlError(
          "La génération est terminée mais l'exécutable est introuvable (le build a échoué côté serveur). Réessayez dans quelques instants."
        );
        toast.error("Génération terminée mais l'exécutable est introuvable");
        setTimeout(() => setDownloadFlow(null), 4000);
        return;
      }

      setDlStepId(DL_STEPS[4].id);
      setDlProgress(100);
      setDlAction(DL_STEPS[4].label);
      setTimeout(() => {
        triggerDownload(url);
        toast.success("Téléchargement démarré");
        setDownloadFlow(null);
        loadProjects();
      }, 700);
    } catch (error: any) {
      clearInterval(timer);
      setDlError(error?.message || "Erreur lors de la génération");
      setTimeout(() => setDownloadFlow(null), 4000);
    }
  };

  const duplicatePOS = async (project: PosSystem) => {
    setActionLoadingId(project.licenseId);
    try {
      const raw = project.raw;
      const snapshot = raw.configuration?.rawConfig || {};
      const licenseData = {
        clientId: raw.clientId,
        sector: snapshot.sector || raw.sector,
        licenseType: snapshot.licenseType || raw.licenseType || "LIFETIME",
        bindingType: snapshot.bindingType || raw.bindingType || "MACHINE",
        expirationDate:
          (snapshot.licenseType === "SUBSCRIPTION" && snapshot.expirationDate) || undefined,
        modules: snapshot.modules || raw.modules?.map((m) => m.module?.id).filter(Boolean) || [],
        configuration: snapshot.configuration || raw.configuration || {},
      };
      await licenseService.createLicense(licenseData);
      toast.success("Projet dupliqué avec succès");
      await loadProjects();
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la duplication");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openDetails = (license: License) => {
    setSelectedLicense(license);
    setDetailsOpen(true);
  };

  const modifyProject = (licenseId: string) => {
    window.location.href = `/pos-generator?licenseId=${encodeURIComponent(licenseId)}`;
  };

  const createNewProject = () => {
    window.location.href = "/pos-generator";
  };

  return (
    <div className="space-y-6">
      <div
        ref={headerRef}
        className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-700 ${
          headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-[22px]">Mes Projets POS</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Retrouvez chaque POS que vous avez généré. Modifiez, téléchargez ou dupliquez vos
            projets à tout moment.
          </p>
        </div>
        <Button className="gap-2" onClick={createNewProject}>
          <Plus className="w-4 h-4" />
          Nouveau POS
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.myPOS")}</CardTitle>
          <CardDescription>Vos configurations POS enregistrées définitivement.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-sm text-muted-foreground mb-4">Chargement...</div>}
          {projects.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun projet POS</h3>
              <p className="text-muted-foreground mb-6">
                Générez votre premier POS pour le retrouver ici en permanence.
              </p>
              <Link to="/pos-generator">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Créer mon premier POS
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project, index) => (
                <div
                  key={project.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg hover:shadow-md transition-all animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold truncate">{project.name}</h3>
                      <Badge variant={posStatusMeta(project.status).variant}>
                        {posStatusMeta(project.status).label}
                      </Badge>
                      {project.version > 1 && <Badge variant="neutral">v{project.version}</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {project.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {project.modules} modules
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => openDetails(project.raw)}
                    >
                      <Eye className="w-4 h-4" />
                      Détails
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={actionLoadingId === project.licenseId}
                      onClick={() => runDownload(project)}
                    >
                      <Download className="w-4 h-4" />
                      Télécharger
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={actionLoadingId === project.licenseId}
                      onClick={() => modifyProject(project.licenseId)}
                    >
                      <Settings2 className="w-4 h-4" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={actionLoadingId === project.licenseId}
                      onClick={() => duplicatePOS(project)}
                    >
                      <Copy className="w-4 h-4" />
                      Dupliquer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du projet</DialogTitle>
            <DialogDescription>Configuration et données de génération du POS.</DialogDescription>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-muted-foreground">Commerce</div>
                  <div className="font-medium">
                    {selectedLicense.configuration?.businessName ||
                      selectedLicense.client?.name ||
                      "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Secteur</div>
                  <div className="font-medium capitalize">{selectedLicense.sector}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Statut</div>
                  <div className="font-medium">{posStatusMeta(getStatusLabel(selectedLicense)).label}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Version</div>
                  <div className="font-medium">
                    v{selectedLicense.configuration?.posConfigVersion ?? 1}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Créé le</div>
                  <div className="font-medium">
                    {new Date(selectedLicense.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Clé de licence</div>
                  <div className="font-medium break-all">{selectedLicense.licenseKey}</div>
                </div>
              </div>

              <div>
                <div className="text-muted-foreground mb-1">Modules ({selectedLicense.modules?.length || 0})</div>
                <div className="flex flex-wrap gap-2">
                  {(selectedLicense.modules || []).map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground"
                    >
                      {m.module?.displayName || m.module?.id}
                    </span>
                  ))}
                  {(selectedLicense.modules || []).length === 0 && (
                    <span className="text-muted-foreground">Aucun module enregistré</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const p = projects.find((x) => x.licenseId === selectedLicense.id);
                    if (p) runDownload(p);
                  }}
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setDetailsOpen(false);
                    modifyProject(selectedLicense.id);
                  }}
                >
                  <Settings2 className="w-4 h-4" />
                  Modifier la configuration
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <a ref={downloadLinkRef} className="hidden" />

      <POSGenerationProgress
        isVisible={!!downloadFlow}
        steps={DL_STEPS}
        activeStepId={dlStepId}
        progress={dlProgress}
        currentAction={dlAction}
        error={dlError}
      />
    </div>
  );
};

export default PosProjects;
