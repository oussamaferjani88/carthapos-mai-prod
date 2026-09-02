import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Loader2, ExternalLink, Eye, Check, FolderOpen, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

export default function Step8Dashboard({ uploadId, onNext, onBack, updateWizardData }) {
  const [dashboardId, setDashboardId] = useState(null);
  const [, setDashboard] = useState(null);
  const [businessType, setBusinessType] = useState(null);
  const [collections, setCollections] = useState([]);
  const [dashboards, setDashboards] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedMetabaseId, setSelectedMetabaseId] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingDashboards, setLoadingDashboards] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  // 1. Ensure the CarthaPOS dashboard metadata row exists (never a Metabase
  //    dashboard — the Metabase dashboard already exists and will be selected).
  const ensureDashboard = useCallback(async () => {
    try {
      const res = await api.get(`/bi-uploads/${uploadId}`);
      const upload = res.data?.data || res.data;
      setBusinessType(upload?.businessType || upload?.biRequest?.businessType || null);
      const existing = upload?.dashboards?.[0];
      if (existing) {
        setDashboardId(existing.id);
        setDashboard(existing);
        return existing.id;
      }
      setGenerating(true);
      try {
        await api.post('/bi/dashboards/generate-from-upload', { uploadId });
      } catch (err) {
        if (err.response?.status !== 409) throw err;
      } finally {
        setGenerating(false);
      }
      const res2 = await api.get(`/bi-uploads/${uploadId}`);
      const dash = res2.data?.data?.dashboards?.[0];
      setBusinessType(res2.data?.data?.businessType || res2.data?.data?.biRequest?.businessType || null);
      if (dash) {
        setDashboardId(dash.id);
        setDashboard(dash);
        return dash.id;
      }
      return null;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return null;
    }
  }, [uploadId]);

  // 2. Load the business-type Metabase collections that hold a registered master
  //    template. Only collections with a master (hasMaster) are presented — the
  //    per-client copies (in nested "client's dashboard" sub-collections) never
  //    appear here.
  const loadCollections = useCallback(async () => {
    try {
      const res = await api.get('/bi/metabase/business-collections');
      const all = res.data?.data || [];
      const withMaster = all.filter((c) => c && c.hasMaster && c.collectionId != null);
      setCollections(withMaster);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await ensureDashboard();
      await loadCollections();
      setLoading(false);
    })();
  }, [ensureDashboard, loadCollections]);

  const loadDashboardsForCollection = useCallback(async (collectionId) => {
    setLoadingDashboards(true);
    setSelectedMetabaseId('');
    setPreview(null);
    try {
      // directOnly=true → only dashboards directly inside this business-type
      // collection (the templates), never the per-client copies deeper down.
      const res = await api.get(
        `/bi/metabase/collections/${collectionId}/dashboards?directOnly=true`,
      );
      setDashboards(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setDashboards([]);
    } finally {
      setLoadingDashboards(false);
    }
  }, []);

  const handleCollectionChange = (value) => {
    setSelectedCollection(value);
    loadDashboardsForCollection(value);
  };

  // Auto-select the business collection matching the client's business type, or
  // the single business collection, so the templates load directly.
  useEffect(() => {
    if (collections.length === 0 || selectedCollection) return;
    let match = null;
    if (businessType) {
      match = collections.find((c) => c.businessType === businessType);
    }
    const target = match || (collections.length === 1 ? collections[0] : null);
    if (target && target.collectionId != null) {
      const id = String(target.collectionId);
      setSelectedCollection(id);
      loadDashboardsForCollection(id);
    }
  }, [collections, selectedCollection, loadDashboardsForCollection, businessType]);

  // 3. Provision a per-client COPY of the chosen template, then preview it live
  //    (embedded, admin-only). The client dashboard is linked to the copy — never
  //    to the shared template — so each client sees only their own dashboard.
  const handleDashboardSelect = async (metabaseId) => {
    const id = Number(metabaseId);
    setSelectedMetabaseId(metabaseId);
    setPreview(null);
    if (!dashboardId) return;
    setError(null);
    try {
      await api.post(`/bi/dashboards/${dashboardId}/provision`, {
        metabaseDashboardId: id,
      });
      const emb = await api.get(`/bi/dashboards/${dashboardId}/embed`);
      const embedding = emb.data?.data?.embedding;
      updateWizardData({ metabaseDashboardId: embedding?.metabaseDashboardId ?? id });
      if (embedding?.iframeUrl) {
        setPreview(embedding.iframeUrl);
      } else {
        setError("Aperçu indisponible — activez le partage public ou l'embedding dans Metabase.");
      }
    } catch (err) {
      setSelectedMetabaseId('');
      setError(err.response?.data?.error || err.message);
    }
  };

  // 4. Publish — reuses the existing publish workflow unchanged.
  const handlePublish = async () => {
    if (!dashboardId) return;
    setPublishing(true);
    setError(null);
    try {
      await api.post(`/bi/dashboards/${dashboardId}/publish`);
      onNext();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">
            {generating ? 'Préparation du tableau de bord...' : 'Chargement des tableaux de bord...'}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 8 — Choisir un tableau de bord</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <LayoutDashboard className="h-6 w-6 text-green-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Les données du client sont prêtes.</p>
            <p className="text-xs text-green-700 mt-1">
              Sélectionnez un tableau de bord Metabase existant qui interrogera les données du client
              chargées dans l'entrepôt.
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}

        {/* Collection selection */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" /> Modèle de tableau de bord
          </p>
          <p className="text-xs text-muted-foreground">
            Sélectionnez un modèle de tableau de bord parmi les templates disponibles.
          </p>
          {collections.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              Aucune collection Metabase trouvée.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {collections.map((c) => (
                <button
                  key={`${c.businessType}-${c.collectionId}`}
                  type="button"
                  onClick={() => handleCollectionChange(String(c.collectionId))}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                    selectedCollection === String(c.collectionId)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted/50'
                  )}
                >
                  {c.businessType ? c.businessType.charAt(0).toUpperCase() + c.businessType.slice(1) : c.templateName || c.collectionName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dashboard selection */}
        {selectedCollection && (
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-primary" /> Tableaux de bord disponibles
            </p>
            {loadingDashboards ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement des dashboards...
              </div>
            ) : dashboards.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                Aucun dashboard dans cette collection (les questions et sous-collections sont filtrées).
              </p>
            ) : (
              <div className="grid gap-3">
                {dashboards.map((d) => (
                  <div
                    key={d.id}
                    className={cn(
                      'flex items-center justify-between p-4 border rounded-lg transition-colors cursor-pointer',
                      selectedMetabaseId === String(d.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    )}
                    onClick={() => handleDashboardSelect(String(d.id))}
                  >
                    <div className="flex items-center gap-3">
                      <LayoutDashboard className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.description || 'Tableau de bord analytique'}
                          {d.collectionName ? ` · ${d.collectionName}` : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant={selectedMetabaseId === String(d.id) ? 'default' : 'secondary'} className="text-[10px]">
                      {selectedMetabaseId === String(d.id) ? 'Sélectionné' : 'Choisir'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Prévisualisation
            </p>
            {selectedMetabaseId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(
                  `${(import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3001').replace('3001', '3000')}/dashboard/${selectedMetabaseId}`,
                  '_blank'
                )}
              >
                <ExternalLink className="h-4 w-4" /> Ouvrir dans Metabase
              </Button>
            )}
          </div>
          {preview ? (
            <iframe
              src={preview}
              title="Prévisualisation du tableau de bord"
              className="w-full h-96 rounded-lg border bg-muted"
              frameBorder="0"
            />
          ) : (
            <div className="flex items-center justify-center h-48 rounded-lg border border-dashed text-sm text-muted-foreground">
              Sélectionnez un dashboard pour afficher la prévisualisation.
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Aperçu admin uniquement — non visible par le client avant publication.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Retour
          </Button>
          <Button
            className="flex-1"
            onClick={handlePublish}
            disabled={!dashboardId || !selectedMetabaseId || publishing}
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Publier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
