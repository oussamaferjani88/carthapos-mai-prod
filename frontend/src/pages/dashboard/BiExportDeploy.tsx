import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileArchive, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

type PortalUser = { id?: string; email?: string; name?: string; companyName?: string };
type License = { id: string; clientId: string; sector: string; isActive: boolean };

type BiUpload = {
  id: string;
  clientId: string;
  businessType: string;
  fileName: string;
  fileSize: number;
  status: string;
  totalRows: number;
  createdAt: string;
  errorMessage?: string;
  processingJob?: {
    status: string;
    recordsLoaded: number;
    startedAt: string;
    completedAt: string;
  };
};

function getStoredUser(): PortalUser | null {
  try {
    const local = localStorage.getItem("user");
    if (local) return JSON.parse(local);
    const session = sessionStorage.getItem("user");
    if (session) return JSON.parse(session);
  } catch { /* ignore */ }
  return null;
}

export default function BiExportDeploy() {
  const { t } = useTranslation();
  const user = getStoredUser();

  const [uploads, setUploads] = useState<BiUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [businessType, setBusinessType] = useState("restaurant");
  const [detectedClientId, setDetectedClientId] = useState("");
  const [selectedUpload, setSelectedUpload] = useState<BiUpload | null>(null);

  // Load licenses to detect clientId and business type
  useEffect(() => {
    if (!user?.id) return;
    fetch(`${API_BASE_URL}/licenses?userId=${user.id}`)
      .then(r => r.json())
      .then((licenses: License[]) => {
        if (Array.isArray(licenses) && licenses.length > 0) {
          const active = licenses.find(l => l.isActive) || licenses[0];
          setDetectedClientId(active.clientId || active.id);
          setBusinessType(active.sector || "restaurant");
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const loadUploads = useCallback(async () => {
    if (!detectedClientId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bi-uploads?clientId=${encodeURIComponent(detectedClientId)}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setUploads(Array.isArray(json?.data?.items) ? json.data.items : []);
    } catch {
      setUploads([]);
    } finally {
      setLoading(false);
    }
  }, [detectedClientId]);

  useEffect(() => { if (detectedClientId) loadUploads(); }, [detectedClientId, loadUploads]);

  // Auto-refresh while processing
  useEffect(() => {
    const hasActive = uploads.some(u => ["UPLOADED", "VALIDATING", "PROCESSING"].includes(u.status));
    if (!hasActive) return;
    const interval = setInterval(loadUploads, 8000);
    return () => clearInterval(interval);
  }, [uploads, loadUploads]);

  const handleSubmit = async () => {
    if (!file || !detectedClientId) return;
    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", detectedClientId);
      formData.append("businessType", businessType);

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded * 100) / e.total));
      });
      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener("load", () => resolve());
        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("POST", `${API_BASE_URL}/bi-uploads`);
        xhr.send(formData);
      });
      setProgress(100);
      setFile(null);
      loadUploads();
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const statusIcon = (s: string) =>
    s === "COMPLETED" ? CheckCircle2 :
    s === "FAILED" ? XCircle :
    ["VALIDATING", "PROCESSING"].includes(s) ? RefreshCw : Clock;

  const statusColor = (s: string) =>
    s === "COMPLETED" ? "text-green-600" :
    s === "FAILED" ? "text-red-600" : "text-amber-600";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <FileArchive className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Déployer un export BI</h1>
              <p className="text-muted-foreground">
                Téléversez le fichier ZIP généré par votre POS pour déployer vos données d'analyse dans l'entrepôt.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 space-y-6">

        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="w-5 h-5" /> Nouveau déploiement
            </CardTitle>
            <CardDescription>
              Générez d'abord un export BI depuis votre POS (Reports → Export BI), puis téléversez le fichier ZIP ci-dessous.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-muted/30 rounded text-sm flex items-center gap-2">
              <span className="text-muted-foreground">Client détecté :</span>
              <span className="font-medium">{detectedClientId || "Chargement..."}</span>
              <span className="text-muted-foreground">· {businessType}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Type d'activité</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                >
                  <option value="restaurant">Restaurant</option>
                  <option value="cafe">Café</option>
                  <option value="pharmacy">Pharmacie</option>
                  <option value="retail">Commerce</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Fichier ZIP</label>
                <Input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            {progress > 0 && (
              <div className="w-full bg-muted rounded-full h-2.5 mb-4">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!file || uploading || !detectedClientId} className="gap-2">
                {uploading ? (
                  <>{progress}% Envoi en cours...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Déployer</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Historique des déploiements</CardTitle>
              <Button variant="outline" size="sm" className="gap-1" onClick={loadUploads}>
                <RefreshCw className="w-4 h-4" /> Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : uploads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun déploiement pour le moment. Générez un export BI depuis votre POS.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Fichier</th>
                      <th className="pb-3 pr-4 font-medium">Client</th>
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
                      const Icon = statusIcon(u.status);
                      return (
                        <tr
                          key={u.id}
                          className="border-b hover:bg-muted/50 cursor-pointer"
                          onClick={() => setSelectedUpload(u)}
                        >
                          <td className="py-3 pr-4 max-w-[200px] truncate">{u.fileName}</td>
                          <td className="py-3 pr-4">{u.clientId}</td>
                          <td className="py-3 pr-4">{u.businessType}</td>
                          <td className="py-3 pr-4">{Math.round(u.fileSize / 1024)} KB</td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${statusColor(u.status)}`}>
                              <Icon className="w-3 h-3" /> {u.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4">{u.totalRows || "—"}</td>
                          <td className="py-3 pr-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="py-3">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedUpload(u); }}>
                              Détails
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        {selectedUpload && (
          <DetailModal
            upload={selectedUpload}
            onClose={() => setSelectedUpload(null)}
            onRefresh={() => {
              fetch(`${API_BASE_URL}/bi-uploads/${selectedUpload.id}`)
                .then(r => r.json())
                .then(j => setSelectedUpload(j?.data || j))
                .catch(() => {});
            }}
          />
        )}
      </div>
    </div>
  );
}

function DetailModal({ upload, onClose, onRefresh }: { upload: BiUpload; onClose: () => void; onRefresh: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const job = (upload as any).processingJob;

  useEffect(() => {
    fetch(`${API_BASE_URL}/bi-uploads/${upload.id}/logs`)
      .then(r => r.json())
      .then(j => setLogs(Array.isArray(j?.data) ? j.data : []))
      .catch(() => {});
  }, [upload.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Détails du déploiement</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="w-3 h-3" /></Button>
              <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Fichier :</span> {upload.fileName}</div>
            <div><span className="text-muted-foreground">Client :</span> {upload.clientId}</div>
            <div><span className="text-muted-foreground">Type :</span> {upload.businessType}</div>
            <div><span className="text-muted-foreground">Taille :</span> {Math.round(upload.fileSize / 1024)} KB</div>
            <div><span className="text-muted-foreground">Statut :</span> {upload.status}</div>
            <div><span className="text-muted-foreground">Lignes :</span> {upload.totalRows || "—"}</div>
            <div className="col-span-2"><span className="text-muted-foreground">Date :</span> {new Date(upload.createdAt).toLocaleString()}</div>
          </div>

          {upload.errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {upload.errorMessage}
            </div>
          )}

          {job && (
            <div className="border border-border rounded p-3 text-sm space-y-1">
              <div className="font-medium mb-1">Traitement ETL</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut :</span>
                <span>{job.status}</span>
              </div>
              {job.startedAt && <div className="flex justify-between"><span className="text-muted-foreground">Début :</span><span>{new Date(job.startedAt).toLocaleString()}</span></div>}
              {job.completedAt && <div className="flex justify-between"><span className="text-muted-foreground">Fin :</span><span>{new Date(job.completedAt).toLocaleString()}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Enregistrements :</span><span className="font-medium">{job.recordsLoaded || 0}</span></div>
            </div>
          )}

          {logs.length > 0 && (
            <div className="border border-border rounded p-3">
              <div className="font-medium text-sm mb-2">Journal ETL</div>
              <div className="space-y-1 max-h-40 overflow-y-auto text-xs font-mono">
                {logs.map((log: any) => (
                  <div key={log.id} className={`p-1 rounded ${log.level === "ERROR" ? "bg-red-50 text-red-700" : log.level === "WARN" ? "bg-amber-50 text-amber-700" : ""}`}>
                    <span className="text-muted-foreground">[{new Date(log.createdAt).toLocaleTimeString()}]</span>{" "}
                    <span className="font-semibold">{log.step}</span> {log.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
