import { useEffect, useMemo, useState } from 'react';
import {
  Link2,
  X,
  ArrowDown,
  Eye,
  Copy,
  Check,
  Loader2,
  Database,
  Table2,
  FileCode2,
  GitMerge,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '@/lib/utils';
import api from '../../lib/api';
import {
  HEALTH_BADGE,
  HEALTH_BAR,
  healthTone,
  joinFactColumns,
  joinDimColumns,
  generateJoinSql,
} from '../../lib/bi-model-utils';

function num(n) {
  return Number.isFinite(n) ? n.toLocaleString('fr-FR') : String(n);
}

function formatCell(v) {
  if (v === null || v === undefined) return <span className="text-muted-foreground/60">∅</span>;
  if (typeof v === 'object') return <span className="font-mono text-[10px]">{JSON.stringify(v)}</span>;
  return String(v);
}

function JoinPreview({ uploadId, rel, fact, dim }) {
  const [factRows, setFactRows] = useState(null);
  const [dimRows, setDimRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setFactRows(null);
    setDimRows(null);
    setError(null);
    api
      .get(`/bi-uploads/${uploadId}/transformation-preview`, {
        params: { section: 'facts', table: fact.name, page: 1, pageSize: 50 },
      })
      .then((fr) => {
        if (!alive) return;
        setFactRows(fr.data?.data?.rows || []);
      })
      .catch((err) => {
        if (alive) setError(err.response?.data?.error || err.message);
      });
    api
      .get(`/bi-uploads/${uploadId}/transformation-preview`, {
        params: { section: 'dimensions', table: dim.name, page: 1, pageSize: 100 },
      })
      .then((dr) => {
        if (!alive) return;
        setDimRows(dr.data?.data?.rows || []);
      })
      .catch((err) => {
        if (alive) setError(err.response?.data?.error || err.message);
      });
    return () => {
      alive = false;
    };
  }, [uploadId, rel, fact.name, dim.name]);

  const matched = useMemo(() => {
    if (!factRows || !dimRows) return [];
    const map = new Map(dimRows.map((r) => [String(r[rel.pk]), r]));
    return factRows
      .map((fr) => ({ fact: fr, dim: map.get(String(fr[rel.fk])) || null }))
      .filter((x) => x.dim)
      .slice(0, 10);
  }, [factRows, dimRows, rel]);

  const fCols = useMemo(() => joinFactColumns(fact, rel), [fact, rel]);
  const dCols = useMemo(() => joinDimColumns(dim, rel), [dim, rel]);

  if (error) return <p className="py-4 text-sm text-red-600">{error}</p>;
  if (!factRows || !dimRows) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement des lignes jointes…
      </div>
    );
  }
  if (matched.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Aucun exemple joint dans les {num(factRows.length)} premières lignes du fait (dimension chargée : {num(dimRows.length)} lignes).
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-left text-[11px]">
        <thead>
          <tr className="border-b">
            <th colSpan={fCols.length} className="border-r bg-violet-50 px-2 py-1.5 text-xs font-semibold text-violet-700">
              Fait — {fact.name}
            </th>
            <th colSpan={dCols.length} className="bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-700">
              Dimension — {dim.name}
            </th>
          </tr>
          <tr className="border-b">
            {fCols.map((c) => (
              <th key={`f-${c.name}`} className="border-r bg-violet-50/50 px-2 py-1.5 font-mono font-medium whitespace-nowrap">{c.name}</th>
            ))}
            {dCols.map((c) => (
              <th key={`d-${c.name}`} className="bg-blue-50/50 px-2 py-1.5 font-mono font-medium whitespace-nowrap">{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matched.map((m, i) => (
            <tr key={i} className={i % 2 ? 'bg-muted/30' : ''}>
              {fCols.map((c) => (
                <td key={`f-${c.name}`} className="border-r border-b px-2 py-1 whitespace-nowrap text-muted-foreground">{formatCell(m.fact[c.name])}</td>
              ))}
              {dCols.map((c) => (
                <td key={`d-${c.name}`} className="border-b px-2 py-1 whitespace-nowrap text-muted-foreground">{formatCell(m.dim[c.name])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t px-2 py-1.5 text-[10px] text-muted-foreground">
        {num(matched.length)} exemples de lignes correspondantes (jonction {fact.name}.{rel.fk} = {dim.name}.{rel.pk}).
      </p>
    </div>
  );
}

export default function WarehouseInspector({ data, fact, dim, model, uploadId, onClose, onShowTable }) {
  const { rel, health } = data;
  const [tab, setTab] = useState('apercu');
  const [copied, setCopied] = useState(false);
  const pct = health ? health.health : null;
  const tone = healthTone(pct);
  const sql = useMemo(() => generateJoinSql(rel, fact, dim), [rel, fact, dim]);

  const copySql = () => {
    navigator.clipboard?.writeText(sql).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Link2 className="h-4 w-4 text-cyan-700" /> Inspecteur de relation
        </p>
        <Button variant="ghost" size="icon" onClick={onClose} title="Fermer l'inspecteur">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-3">
        <TabsList className="w-full">
          <TabsTrigger value="apercu" className="flex-1 gap-1"><Database className="h-3.5 w-3.5" /> Aperçu</TabsTrigger>
          <TabsTrigger value="jointure" className="flex-1 gap-1"><GitMerge className="h-3.5 w-3.5" /> Jointure</TabsTrigger>
          <TabsTrigger value="sql" className="flex-1 gap-1"><FileCode2 className="h-3.5 w-3.5" /> SQL</TabsTrigger>
        </TabsList>

        <TabsContent value="apercu" className="space-y-4 pt-3">
          <div className="rounded-lg border bg-slate-50/80 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-medium text-violet-700">{rel.fact}.{rel.fk}</span>
            </div>
            <div className="my-1 flex items-center justify-center">
              <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-medium text-blue-700">{rel.dimension}.{rel.pk}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Cardinalité</p>
              <p className="font-semibold">{rel.cardinality || '1:N'}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Type d'entrepôt</p>
              <p className="font-semibold">{model.warehouseType || 'Star Schema'}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Lignes fait</p>
              <p className="font-semibold tabular-nums">{health ? num(health.rows) : '—'}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Lignes dimension</p>
              <p className="font-semibold tabular-nums">{num(dim.count)}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Correspondances</p>
              <p className="font-semibold text-green-700 tabular-nums">{health ? num(health.matched) : '—'}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Orphelines</p>
              <p className={cn('font-semibold tabular-nums', health && health.orphan > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                {health ? num(health.orphan) : '—'}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Sans clé</p>
              <p className="font-semibold tabular-nums">{health ? num(health.noKey) : '—'}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Santé des relations</p>
              <p className="font-semibold tabular-nums">{pct === null ? '—' : `${pct}%`}</p>
            </div>
          </div>

          {pct !== null && (
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Intégrité référentielle</span>
                <Badge className={HEALTH_BADGE[tone]}>{pct}%</Badge>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full', HEALTH_BAR[tone])} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onShowTable('facts', rel.fact)}>
              <Eye className="h-3.5 w-3.5" /> {rel.fact}
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onShowTable('dimensions', rel.dimension)}>
              <Eye className="h-3.5 w-3.5" /> {rel.dimension}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="jointure" className="pt-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Exemples de lignes réellement jointes dans l'entrepôt (jonction {rel.fact}.{rel.fk} = {rel.dimension}.{rel.pk}).
          </p>
          <JoinPreview uploadId={uploadId} rel={rel} fact={fact} dim={dim} />
        </TabsContent>

        <TabsContent value="sql" className="pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">SQL de jointure généré automatiquement (lecture seule).</p>
            <Button size="sm" variant="outline" onClick={copySql}>
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copié' : 'Copier'}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-lg border bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">
            {sql}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}
