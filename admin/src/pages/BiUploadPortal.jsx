import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import api from '../lib/api';

const STATUS_CONFIG = {
  UPLOADED:    { label: 'Déposé',       color: 'bg-blue-100 text-blue-700',     icon: Clock },
  VALIDATING:  { label: 'Validation...', color: 'bg-amber-100 text-amber-700',  icon: RefreshCw },
  PROCESSING:  { label: 'Traitement...', color: 'bg-amber-100 text-amber-700',  icon: RefreshCw },
  COMPLETED:   { label: 'Terminé',       color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  FAILED:      { label: 'Échoué',        color: 'bg-red-100 text-red-700',      icon: XCircle },
};

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR');
}

export default function BiUploadPortal() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clientFilter, setClientFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [clients, setClients] = useState([]);
  const fileInputRef = useRef(null);

  const loadUploads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (clientFilter !== 'ALL') params.clientId = clientFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.get('/bi-uploads', { params });
      const payload = res.data?.data || res.data;
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setUploads(items);
      setTotalPages(payload?.totalPages || 1);
    } catch (err) {
      toast.error('Erreur chargement des uploads: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, [page, clientFilter, statusFilter]);

  const loadClients = useCallback(async () => {
    try {
      const res = await api.get('/bi-uploads/clients/list');
      const data = res.data?.data || [];
      setClients(data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => { loadUploads(); }, [loadUploads]);
  useEffect(() => { loadClients(); }, [loadClients]);

  // Auto-refresh every 10s when processing uploads exist
  useEffect(() => {
    const hasActive = uploads.some(u =>
      ['UPLOADED', 'VALIDATING', 'PROCESSING'].includes(u.status)
    );
    if (!hasActive) return;
    const interval = setInterval(loadUploads, 10000);
    return () => clearInterval(interval);
  }, [uploads, loadUploads]);

  // ─── Upload handler ─────────────────────────────────────────

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error('Seuls les fichiers .zip sont acceptés');
      return;
    }

    // Prompt for clientId
    const manualClientId = window.prompt('ID client (obligatoire) :');
    if (!manualClientId) {
      toast.error('ID client requis');
      return;
    }

    const manualBusinessType = window.prompt('Type d\'activité (restaurant/cafe/pharmacy/retail) :', 'restaurant');

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', manualClientId);
      formData.append('businessType', manualBusinessType || 'unknown');

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 10, 90));
      }, 500);

      await api.post('/bi-uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(pct);
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success('Fichier téléversé avec succès. Traitement ETL lancé.');
      loadUploads();
    } catch (err) {
      toast.error('Échec téléversement: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Detail view ────────────────────────────────────────────

  const openDetail = async (upload) => {
    setSelectedUpload(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/bi-uploads/${upload.id}`);
      setSelectedUpload(res.data?.data || res.data);
    } catch (err) {
      toast.error('Erreur chargement détails');
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portail BI</h1>
          <p className="text-muted-foreground">
            Téléversez des exports BI (ZIP) provenant des POS clients et suivez leur traitement ETL.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>Téléversement {uploadProgress}%...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" /> Importer un ZIP BI</>
            )}
          </Button>
        </div>
      </div>

      {uploading && (
        <Card>
          <CardContent className="pt-4">
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">{uploadProgress}%</p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
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
                {clients.map(c => (
                  <SelectItem key={c.clientId} value={c.clientId}>
                    {c.clientId} ({c.businessType})
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
                {Object.keys(STATUS_CONFIG).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
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
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun téléversement trouvé. Importez un fichier ZIP BI pour commencer.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Client</th>
                    <th className="pb-3 pr-4 font-medium">Fichier</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Taille</th>
                    <th className="pb-3 pr-4 font-medium">Statut</th>
                    <th className="pb-3 pr-4 font-medium">Lignes</th>
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((u) => {
                    const StatusIcon = STATUS_CONFIG[u.status]?.icon || Clock;
                    return (
                      <tr
                        key={u.id}
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => openDetail(u)}
                      >
                        <td className="py-3 pr-4">{u.clientId}</td>
                        <td className="py-3 pr-4 max-w-[200px] truncate" title={u.fileName}>
                          <FileText className="inline h-3 w-3 mr-1" />
                          {u.fileName}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline">{u.businessType}</Badge>
                        </td>
                        <td className="py-3 pr-4">{formatBytes(u.fileSize)}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[u.status]?.color || ''}`}>
                            <StatusIcon className="h-3 w-3" />
                            {STATUS_CONFIG[u.status]?.label || u.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{u.totalRows || '—'}</td>
                        <td className="py-3 pr-4">{formatDate(u.createdAt)}</td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); openDetail(u); }}
                            >
                              Détails
                            </Button>
                            {['UPLOADED', 'VALIDATING', 'PROCESSING'].includes(u.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!window.confirm(`Annuler le traitement de "${u.fileName}" ?`)) return;
                                  try {
                                    await api.post(`/bi-uploads/${u.id}/cancel`);
                                    toast.success('Traitement annulé');
                                    loadUploads();
                                  } catch (err) {
                                    toast.error('Erreur annulation: ' + (err.response?.data?.error || err.message));
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
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!window.confirm(`Supprimer définitivement "${u.fileName}" ?`)) return;
                                try {
                                  await api.delete(`/bi-uploads/${u.id}`);
                                  toast.success('Upload supprimé');
                                  loadUploads();
                                } catch (err) {
                                  toast.error('Erreur suppression: ' + (err.response?.data?.error || err.message));
                                }
                              }}
                            >
                              Supprimer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Page {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Précedent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
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
          onClose={() => setSelectedUpload(null)}
          onRefresh={() => openDetail(selectedUpload)}
        />
      )}
    </div>
  );
}

// ─── Detail Modal ───────────────────────────────────────────────

function DetailModal({ upload, loading, onClose, onRefresh }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (upload?.id) {
      api.get(`/bi-uploads/${upload.id}/logs`)
        .then(res => setLogs(res.data?.data || []))
        .catch(() => {});
    }
  }, [upload?.id]);

  const job = upload?.processingJob;
  const hasError = upload?.status === 'FAILED';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Détails du téléversement</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : (
            <>
              {/* Info card */}
              <Card>
                <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Client :</span>{' '}
                    <span className="font-medium">{upload.clientId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type :</span>{' '}
                    <Badge variant="outline">{upload.businessType}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fichier :</span>{' '}
                    {upload.fileName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Taille :</span>{' '}
                    {formatBytes(upload.fileSize)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Statut :</span>{' '}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[upload.status]?.color || ''}`}>
                      {STATUS_CONFIG[upload.status]?.label || upload.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lignes :</span>{' '}
                    {upload.totalRows || 'En attente...'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Créé le :</span>{' '}
                    {formatDate(upload.createdAt)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mis à jour :</span>{' '}
                    {formatDate(upload.updatedAt)}
                  </div>
                </CardContent>
              </Card>

              {/* Processing Job */}
              {job && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Traitement ETL</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Statut :</span>
                      <Badge variant={job.status === 'COMPLETED' ? 'default' : job.status === 'FAILED' ? 'destructive' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Étape en cours :</span>
                      <span className="font-mono text-xs">{currentStep}</span>
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
                      <span className="text-muted-foreground">Enregistrements :</span>
                      <span className="font-medium">{job.recordsLoaded || 0}</span>
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
                  <CardHeader><CardTitle className="text-sm">Fichiers dans le ZIP</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      {upload.files.map(f => (
                        <div key={f.id} className="flex justify-between">
                          <span>{f.fileName}</span>
                          <span className="text-muted-foreground">{f.rowCount} lignes</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Processing Logs */}
              {logs.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Journal ETL ({logs.length} entrées)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1 max-h-48 overflow-y-auto text-xs font-mono">
                      {logs.map(log => (
                        <div key={log.id} className={`p-1 rounded ${log.level === 'ERROR' ? 'bg-red-50 text-red-700' : log.level === 'WARN' ? 'bg-amber-50 text-amber-700' : ''}`}>
                          <span className="text-muted-foreground">[{new Date(log.createdAt).toLocaleTimeString('fr-FR')}]</span>{' '}
                          <span className="font-semibold">{log.step}</span>{' '}
                          {log.message}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Debug hint when stuck */}
              {upload.status === 'UPLOADED' && !job?.completedAt && !job?.errorMessage && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-4 text-sm">
                    <p className="text-amber-800 font-medium">⚠ Le traitement semble bloqué</p>
                    <p className="text-amber-700 text-xs mt-1">
                      Le statut est "Déposé" depuis longtemps. Vérifie la console du serveur backend pour les logs [ETL] et [UPLOAD].
                      Tu peux aussi utiliser <code className="bg-amber-100 px-1 rounded">GET /api/bi/debug/health</code> pour l'état général.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
