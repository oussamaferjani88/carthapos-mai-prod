import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  LayoutDashboard,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Eye,
  Check,
  Copy,
  FolderOpen,
  FolderTree,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import api from "../lib/api";

const BUSINESS_TYPE_LABELS = {
  restaurant: "Restaurant",
  cafe: "Café",
  bakery: "Boulangerie",
  retail: "Commerce de détail",
  pharmacy: "Pharmacie",
  salon: "Salon de beauté",
  hotel: "Hôtel",
};

export default function AdminDashboardAssign() {
  const { dashboardId } = useParams();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [businessCollections, setBusinessCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [masterDashboards, setMasterDashboards] = useState([]);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get(`/bi/dashboards/${dashboardId}`);
      setDashboard(res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }, [dashboardId]);

  const loadBusinessCollections = useCallback(async () => {
    setLoadingCollections(true);
    try {
      const res = await api.get("/bi/metabase/business-collections");
      const items = res.data?.data || [];
      setBusinessCollections(items);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoadingCollections(false);
    }
  }, []);

  const loadMasterDashboards = useCallback(async (collectionId) => {
    if (collectionId == null) {
      setMasterDashboards([]);
      setSelectedMaster(null);
      return;
    }
    setLoadingMasters(true);
    try {
      const res = await api.get(
        `/bi/metabase/collections/${collectionId}/dashboards?directOnly=true`,
      );
      const items = res.data?.data || [];
      setMasterDashboards(items);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setMasterDashboards([]);
    } finally {
      setLoadingMasters(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadBusinessCollections();
  }, [loadDashboard, loadBusinessCollections]);

  // Auto-select the business collection matching the dashboard's businessType.
  useEffect(() => {
    if (!dashboard || !businessCollections.length || selectedCollection) return;
    const match = businessCollections.find(
      (c) =>
        c.businessType === dashboard.businessType && c.collectionId != null,
    );
    if (match) setSelectedCollection(match);
  }, [dashboard, businessCollections, selectedCollection]);

  // Load the master dashboards for the selected business collection.
  useEffect(() => {
    loadMasterDashboards(selectedCollection?.collectionId);
  }, [selectedCollection, loadMasterDashboards]);

  // Auto-select the registered master when it appears in the collection.
  useEffect(() => {
    if (!selectedCollection || !masterDashboards.length || selectedMaster)
      return;
    const registered = masterDashboards.find(
      (d) =>
        Number(d.id) === Number(selectedCollection.registeredMasterDashboardId),
    );
    if (registered) setSelectedMaster(registered);
  }, [selectedCollection, masterDashboards, selectedMaster]);

  const handleProvision = async () => {
    if (!dashboard || !selectedCollection || !selectedMaster) return;
    setProvisioning(true);
    setError("");
    setPreview(null);
    try {
      const res = await api.post(`/bi/dashboards/${dashboardId}/provision`, {
        collectionId: selectedCollection.collectionId,
        metabaseDashboardId: selectedMaster.id,
      });
      const data = res.data?.data;
      setProvisionResult(data);
      setDashboard(data.dashboard || dashboard);
      toast.success(res.data?.message || "Dashboard client créé.");
      const emb = await api.get(`/bi/dashboards/${dashboardId}/embed`);
      if (emb.data?.data?.embedding?.iframeUrl) {
        setPreview(emb.data.data.embedding.iframeUrl);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setProvisioning(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await api.post(`/bi/dashboards/${dashboardId}/publish`);
      toast.success("Dashboard publié.");
      navigate(`/bi-dashboard/${dashboardId}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setPublishing(false);
    }
  };

  const canPublish =
    dashboard && ["DRAFT", "READY_FOR_REVIEW"].includes(dashboard.status);

  if (!dashboard && !error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const matchingCollection = dashboard
    ? businessCollections.find(
        (c) =>
          c.businessType === dashboard.businessType && c.collectionId != null,
      )
    : null;
  const otherCollections = businessCollections.filter(
    (c) => c !== matchingCollection && c.collectionId != null,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/bi-dashboard/${dashboardId}`)}
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Provisionner le dashboard client
            </h1>
            {dashboard && (
              <p className="text-sm text-muted-foreground">
                {dashboard.name} ·{" "}
                {BUSINESS_TYPE_LABELS[dashboard.businessType] ||
                  dashboard.businessType}{" "}
                ·{" "}
                <Badge
                  variant={
                    dashboard.status === "PUBLISHED" ? "default" : "secondary"
                  }
                  className="text-[10px]"
                >
                  {dashboard.status}
                </Badge>
                {dashboard.metabaseDashboardId && (
                  <span className="ml-2">
                    Metabase #{dashboard.metabaseDashboardId}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/bi-requests")}>
          Retour aux demandes
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-primary" /> Type de
              commerce et modèle maître
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-xs text-muted-foreground">
              Choisissez la collection « type de commerce » (ex. Restaurant),
              puis le dashboard maître qu'elle contient. Le dashboard client est
              créé dans une collection dédiée <em>sous</em> cette collection et
              lié aux données du client.
            </p>

            {/* Step 1: business-type collection */}
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                1 · Collection type de commerce
              </p>
              {loadingCollections ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Chargement des
                  collections...
                </div>
              ) : businessCollections.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucune collection type de commerce détectée. Vérifiez la
                  configuration Metabase.
                </p>
              ) : (
                <div className="space-y-3">
                  {matchingCollection && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                        Recommandé
                      </p>
                      <CollectionRow
                        c={matchingCollection}
                        selected={
                          selectedCollection?.collectionId ===
                          matchingCollection.collectionId
                        }
                        onSelect={setSelectedCollection}
                      />
                    </div>
                  )}
                  {otherCollections.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                        Autres types de commerce
                      </p>
                      {otherCollections.map((c) => (
                        <CollectionRow
                          key={`${c.businessType}-${c.collectionId}`}
                          c={c}
                          selected={
                            selectedCollection?.collectionId === c.collectionId
                          }
                          onSelect={setSelectedCollection}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: master dashboard */}
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                2 · Dashboard maître dans «{" "}
                {selectedCollection?.collectionName || "—"} »
              </p>
              {!selectedCollection ? (
                <p className="text-xs text-muted-foreground">
                  Sélectionnez d'abord une collection type de commerce.
                </p>
              ) : loadingMasters ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Chargement des
                  dashboards...
                </div>
              ) : masterDashboards.length === 0 ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    No master dashboard template is configured for this business
                    type. Aucun dashboard n'est présent dans la collection «{" "}
                    {selectedCollection.collectionName} ».
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {masterDashboards.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedMaster(d)}
                      className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                        selectedMaster?.id === d.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{d.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          Metabase #{d.id}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleProvision}
              disabled={
                !dashboard ||
                !selectedCollection ||
                !selectedMaster ||
                provisioning
              }
            >
              {provisioning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Créer / mettre à jour le dashboard client
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> Aperçu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {provisionResult && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <FolderTree className="h-3.5 w-3.5 text-primary" />
                  {provisionResult.provisioning?.businessCollectionName} ·{" "}
                  <FolderOpen className="h-3.5 w-3.5 text-primary" />«{" "}
                  {provisionResult.provisioning?.collectionName} »
                </div>
                <div>
                  Dashboard Metabase #
                  {provisionResult.provisioning?.metabaseDashboardId}
                </div>
                <div>
                  {provisionResult.provisioning?.reused
                    ? "Instance existante réutilisée (idempotent)."
                    : `${provisionResult.provisioning?.cardCount} cartes liées aux données client.`}
                </div>
              </div>
            )}
            {preview ? (
              <iframe
                src={preview}
                title="Aperçu du dashboard client"
                className="w-full h-80 rounded-lg border bg-muted"
                frameBorder="0"
              />
            ) : (
              <div className="flex items-center justify-center h-80 rounded-lg border border-dashed text-sm text-muted-foreground">
                Cliquez sur « Créer / mettre à jour le dashboard client » pour
                générer et prévisualiser.
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Aperçu admin uniquement — non visible par le client.
              </span>
              <div className="flex gap-2">
                {(provisionResult?.provisioning?.metabaseDashboardId ||
                  dashboard?.metabaseDashboardId) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `${(import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:3001").replace("3001", "3000")}/dashboard/${provisionResult?.provisioning?.metabaseDashboardId || dashboard.metabaseDashboardId}`,
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="h-4 w-4" /> Ouvrir dans Metabase
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={
                    !canPublish ||
                    publishing ||
                    !(provisionResult || dashboard?.metabaseDashboardId)
                  }
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Publier
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CollectionRow({ c, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(c)}
      className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{c.collectionName}</span>
        <div className="flex gap-1">
          {c.hasMaster ? (
            <Badge variant="secondary" className="text-[10px]">
              Maître dispo
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-amber-600">
              Aucun maître
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">
            {BUSINESS_TYPE_LABELS[c.businessType] || c.businessType}
          </Badge>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">
        Collection Metabase #{c.collectionId}
        {c.registeredMasterDashboardId != null &&
        c.registeredMasterDashboardId >= 1000
          ? " · maître non configuré"
          : c.registeredMasterDashboardId != null
            ? ` · maître enregistré #${c.registeredMasterDashboardId}`
            : ""}
      </div>
    </button>
  );
}
