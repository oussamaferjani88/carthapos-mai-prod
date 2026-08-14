import { useCallback, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Database,
  Download,
  FileArchive,
  FileText,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { cn } from '../../../lib/utils';
import { fmtBytes, fmtDate, uploadStatusClass, uploadStatusLabel } from '../../../lib/bi-labels';
import { jobStatusClass, jobStatusLabel } from './labels';
import api from '../../../lib/api';

const API_ORIGIN = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3001';

function CollapsibleSection({ title, icon: Icon, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded border border-border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium hover:bg-accent/50"
          >
            <span className="flex items-center gap-2">
              {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
              {title}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border p-3">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function WarehouseSummary({ summary }) {
  const entries = Object.entries(summary).filter(([, v]) => !Array.isArray(v) && typeof v !== 'object');
  const numericKeys = entries.filter(([, v]) => typeof v === 'number');
  if (numericKeys.length >= 2) {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {entries.map(([k, v]) => (
          <div key={k} className="min-w-0 rounded bg-muted/50 p-2">
            <div className="text-[10px] tracking-wide text-muted-foreground uppercase break-all">{k}</div>
            <div className="truncate text-sm font-semibold">
              {typeof v === 'number' ? v.toLocaleString('fr-FR') : String(v)}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <pre className="max-h-48 overflow-auto rounded bg-muted/50 p-2 text-xs">
      {JSON.stringify(summary, null, 2)}
    </pre>
  );
}

function UploadDetailContent({ upload }) {
  const [logs, setLogs] = useState([]);
  const [validation, setValidation] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadDetails = useCallback(async () => {
    const id = upload.id;
    setLoading(true);
    try {
      const logRes = await api.get(`/bi-uploads/${id}/logs`);
      setLogs(Array.isArray(logRes.data?.data) ? logRes.data.data : []);
    } catch {
      setLogs([]);
    }
    try {
      const valRes = await api.get(`/bi-uploads/${id}/validation-report`);
      const payload = valRes.data;
      setValidation(payload?.data !== undefined ? payload.data : payload);
    } catch {
      setValidation(null);
    }
    try {
      const sumRes = await api.get(`/bi-uploads/${id}/summary`);
      const payload = sumRes.data;
      setSummary(payload?.data !== undefined ? payload.data : payload);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [upload.id]);

  const handleOpenChange = (next) => {
    if (next && !loaded) {
      setLoaded(true);
      loadDetails();
    }
  };

  const files = Array.isArray(upload.files) ? upload.files : [];
  const processingJob = upload.processingJob;

  return (
    <Collapsible open={loaded} onOpenChange={handleOpenChange}>
      <div className="space-y-3">
        {upload.errorMessage && (
          <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-600" role="alert">
            {upload.errorMessage}
          </div>
        )}

        {processingJob?.status && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge className={cn('gap-1', jobStatusClass(processingJob.status))}>
              {jobStatusLabel(processingJob.status)}
            </Badge>
            {processingJob.recordsLoaded > 0
              ? `${processingJob.recordsLoaded.toLocaleString('fr-FR')} lignes chargées`
              : ''}
          </div>
        )}

        {files.length > 0 && (
          <div className="overflow-hidden rounded border border-border">
            <div className="px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Fichiers
            </div>
            <div className="divide-y divide-border border-t border-border">
              {files.map((f) => (
                <div key={f.id || `${upload.id}-${f.fileName}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">{f.fileName || '—'}</div>
                    {f.errorMessage && <div className="text-xs text-red-600">{f.errorMessage}</div>}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <div>{(f.rowCount || 0).toLocaleString('fr-FR')} lignes</div>
                    <div>{fmtBytes(f.fileSize)} · {f.status || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && <p className="text-sm text-muted-foreground">Chargement des détails…</p>}

        <CollapsibleSection title="Journaux ETL" icon={FileText}>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun journal ETL.</p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto font-mono text-xs">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`rounded p-1 ${log.level === 'ERROR' ? 'bg-red-50 text-red-700' : log.level === 'WARN' ? 'bg-amber-50 text-amber-700' : ''}`}
                >
                  <span className="text-muted-foreground">
                    [{new Date(log.createdAt).toLocaleTimeString('fr-FR')}]
                  </span>{' '}
                  <span className="font-semibold">{log.step}</span> {log.message}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Rapport de validation" icon={CheckCircle2}>
          {validation === null || validation === undefined ? (
            <p className="text-sm text-muted-foreground">Rapport non disponible.</p>
          ) : (
            <pre className="max-h-48 overflow-auto rounded bg-muted/50 p-2 text-xs">
              {JSON.stringify(validation, null, 2)}
            </pre>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Résumé entrepôt" icon={Database}>
          {summary === null || summary === undefined ? (
            <p className="text-sm text-muted-foreground">Résumé non disponible.</p>
          ) : typeof summary === 'object' && !Array.isArray(summary) ? (
            <WarehouseSummary summary={summary} />
          ) : (
            <pre className="max-h-48 overflow-auto rounded bg-muted/50 p-2 text-xs">
              {JSON.stringify(summary, null, 2)}
            </pre>
          )}
        </CollapsibleSection>
      </div>
    </Collapsible>
  );
}

export default function RequestDataSource({ uploads }) {
  const [open, setOpen] = useState(false);
  const list = Array.isArray(uploads) ? uploads : [];

  if (list.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileArchive className="h-4 w-4 text-muted-foreground" /> Source des données
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {list.map((upload) => (
          <div key={upload.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{upload.fileName || 'fichier.zip'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <Badge className={cn('gap-1', uploadStatusClass(upload.status))}>
                    {uploadStatusLabel(upload.status)}
                  </Badge>
                  <span>{upload.fileSize ? fmtBytes(upload.fileSize) : '—'}</span>
                  {upload.totalRows > 0 && <span>{upload.totalRows.toLocaleString('fr-FR')} lignes</span>}
                  {upload.totalFiles > 0 && <span>{upload.totalFiles} fichiers</span>}
                  <span>Téléversé le {fmtDate(upload.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${API_ORIGIN}/api/bi-uploads/${upload.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Télécharger ${upload.fileName || 'le ZIP'}`}
                >
                  <Button variant="outline" size="sm">
                    <Download className="h-3.5 w-3.5 mr-1" /> ZIP
                  </Button>
                </a>
                <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
                  {open ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronRight className="h-3.5 w-3.5 mr-1" />}
                  Voir les détails
                </Button>
              </div>
            </div>
            {open && <UploadDetailContent upload={upload} />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
