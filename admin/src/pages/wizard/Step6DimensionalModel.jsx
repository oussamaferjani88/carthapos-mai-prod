import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Loader2,
  Network,
  Database,
  Table2,
  Link2,
  KeyRound,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Boxes,
  Layers,
  Eye,
  X,
  Search,
  PanelLeft,
  Download,
  FileImage,
  FileText,
  FileCode2,
  Info,
  Hash,
  Star,
  Sigma,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { cn } from '@/lib/utils';
import api from '../../lib/api';
import StarSchema from './StarSchema';
import ModelExplorer from './ModelExplorer';
import WarehouseInspector from './WarehouseInspector';
import { relKeyOf, exportSvg, exportPng, exportPdf, exportRelationshipReportPdf, exportLineageReportPdf } from '../../lib/model-export';
import { HEALTH_BADGE, healthTone, dimBusinessKey } from '../../lib/bi-model-utils';

const ROLE_LABELS = {
  primary_key: 'Clé primaire',
  business_key: 'Clé métier',
  foreign_key: 'Clé étrangère',
  measure: 'Mesure',
  attribute: 'Attribut',
};

const ROLE_BADGE = {
  primary_key: 'bg-blue-100 text-blue-700',
  business_key: 'bg-indigo-100 text-indigo-700',
  foreign_key: 'bg-violet-100 text-violet-700',
  measure: 'bg-emerald-100 text-emerald-700',
  attribute: 'bg-slate-100 text-slate-600',
};

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'dimensions', label: 'Dimensions seulement' },
  { value: 'facts', label: 'Faits seulement' },
  { value: 'broken', label: 'Relations cassées' },
  { value: 'healthy', label: 'Relations saines' },
  { value: 'selectedFact', label: 'Fait sélectionné' },
];

function num(n) {
  return Number.isFinite(n) ? n.toLocaleString('fr-FR') : String(n);
}

function formatCell(v) {
  if (v === null || v === undefined) return <span className="text-muted-foreground/60">∅</span>;
  if (typeof v === 'object') return <span className="font-mono text-[10px]">{JSON.stringify(v)}</span>;
  return String(v);
}

function SummaryTile({ icon, label, value, tone = 'blue' }) {
  const toneCls = {
    blue: 'text-blue-600 bg-blue-50/60',
    green: 'text-green-600 bg-green-50/60',
    orange: 'text-orange-600 bg-orange-50/60',
    red: 'text-red-600 bg-red-50/60',
    violet: 'text-violet-600 bg-violet-50/60',
    cyan: 'text-cyan-600 bg-cyan-50/60',
    indigo: 'text-indigo-600 bg-indigo-50/60',
    emerald: 'text-emerald-600 bg-emerald-50/60',
    amber: 'text-amber-600 bg-amber-50/60',
  }[tone];
  return (
    <div className="rounded-lg border p-3">
      <div className={cn('mb-1 flex h-8 w-8 items-center justify-center rounded-md', toneCls)}>{icon}</div>
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionTitle({ icon, tone = 'blue', children }) {
  const dot = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    violet: 'bg-violet-500',
  }[tone];
  const iconCls = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    violet: 'text-violet-600',
  }[tone];
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <span className={iconCls}>{icon}</span>
        {children}
      </h3>
    </div>
  );
}

function FactCard({ fact, dimmed, selected, connected, onSelect, onPreview }) {
  const fks = fact.columns.filter((c) => c.role === 'foreign_key');
  const measures = fact.columns.filter((c) => c.role === 'measure');
  const keys = fact.columns.filter((c) => c.role === 'business_key');
  const others = fact.columns.filter((c) => c.role === 'attribute');
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect({ kind: 'fact', name: fact.name })}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect({ kind: 'fact', name: fact.name }); }}
      className={cn(
        'rounded-lg border bg-muted/20 p-4 text-left transition-all hover:shadow',
        selected && 'ring-2 ring-orange-500',
        connected && 'ring-2 ring-emerald-400',
        dimmed && 'opacity-40'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-orange-700">{fact.name}</p>
        <Badge className="shrink-0 bg-orange-100 text-orange-700">{num(fact.count)} lignes</Badge>
      </div>
      {fact.sourceDataset && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <FileSpreadsheet className="h-3.5 w-3.5" /> {fact.sourceDataset}.csv
        </p>
      )}
      {fact.grain && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-medium">Grain</span> — {fact.grain}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-slate-400">
                <Info className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent>{fact.grain}</TooltipContent>
          </Tooltip>
        </p>
      )}
      <div className="mt-3 space-y-2 text-xs">
        {fks.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 font-medium text-violet-700">
              <Link2 className="h-3.5 w-3.5" /> Clés étrangères
            </p>
            <div className="space-y-1">
              {fks.map((c) => (
                <p key={c.name} className="flex items-center gap-1">
                  <span className="font-mono text-[11px]">{c.name}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-[11px] text-violet-700">{c.references}</span>
                  <Badge className="ml-auto bg-cyan-50 text-[9px] text-cyan-700">1:N</Badge>
                </p>
              ))}
            </div>
          </div>
        )}
        {measures.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-emerald-700">Mesures</p>
            <div className="flex flex-wrap gap-1">
              {measures.map((c) => (
                <Badge key={c.name} className="bg-emerald-100 text-emerald-700">{c.name}</Badge>
              ))}
            </div>
          </div>
        )}
        {keys.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-indigo-700">Clés métier</p>
            <div className="flex flex-wrap gap-1">
              {keys.map((c) => (
                <Badge key={c.name} className="bg-indigo-100 text-indigo-700">{c.name}</Badge>
              ))}
            </div>
          </div>
        )}
        {others.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-slate-600">Attributs</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{others.map((c) => c.name).join(', ')}</p>
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="mt-3 w-full"
        onClick={(e) => { e.stopPropagation(); onPreview(fact.name); }}
      >
        <Eye className="h-3.5 w-3.5" /> Preview Data
      </Button>
    </div>
  );
}

function DimensionCard({ dim, usedBy, dimmed, selected, connected, onSelect, onPreview }) {
  const attrs = dim.columns.filter((c) => c.role === 'attribute');
  const bk = dimBusinessKey(dim);
  const attrShow = attrs.filter((c) => c !== bk);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect({ kind: 'dimension', name: dim.name })}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect({ kind: 'dimension', name: dim.name }); }}
      className={cn(
        'rounded-lg border bg-muted/20 p-4 text-left transition-all hover:shadow',
        selected && 'ring-2 ring-blue-500',
        connected && 'ring-2 ring-emerald-400',
        dimmed && 'opacity-40'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-blue-700">{dim.name}</p>
        <Badge className="shrink-0 bg-blue-100 text-blue-700">{num(dim.count)} lignes</Badge>
      </div>
      {dim.sourceDataset ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <FileSpreadsheet className="h-3.5 w-3.5" /> {dim.sourceDataset}.csv
        </p>
      ) : (
        dim.source && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <FileSpreadsheet className="h-3.5 w-3.5" /> {dim.source.note}
          </p>
        )
      )}
      <div className="mt-3 space-y-2 text-xs">
        {dim.pk.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="flex items-center gap-1 font-medium text-blue-700">
              <KeyRound className="h-3.5 w-3.5" /> Clé primaire (subrogée)
            </span>
            {dim.pk.map((p) => (
              <Badge key={p} className="bg-blue-100 font-mono text-blue-700">{p}</Badge>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1">
          <span className="flex items-center gap-1 font-medium text-indigo-700">
            <Hash className="h-3.5 w-3.5" /> Clé métier
          </span>
          {bk ? <Badge className="bg-indigo-100 font-mono text-indigo-700">{bk.name}</Badge> : <span className="text-muted-foreground">—</span>}
        </div>
        {attrShow.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-slate-600">Attributs</p>
            <div className="flex flex-wrap gap-1">
              {attrShow.map((c) => (
                <Badge key={c.name} variant="outline" className="font-mono text-[10px] text-slate-600">{c.name}</Badge>
              ))}
            </div>
          </div>
        )}
        {usedBy.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 font-medium text-orange-700">
              <Link2 className="h-3.5 w-3.5" /> Utilisée par
            </p>
            <div className="flex flex-wrap gap-1">
              {usedBy.map((f) => (
                <Badge key={f} variant="outline" className="bg-orange-50 text-[10px] text-orange-700">{f}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="mt-3 w-full"
        onClick={(e) => { e.stopPropagation(); onPreview(dim.name); }}
      >
        <Eye className="h-3.5 w-3.5" /> Preview Data
      </Button>
    </div>
  );
}

function SampleDataDialog({ uploadId, sample, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (!sample) {
      setData(null);
      setPage(1);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    setData(null);
    api
      .get(`/bi-uploads/${uploadId}/transformation-preview`, {
        params: { section: sample.kind, table: sample.name, page, pageSize },
      })
      .then((res) => {
        if (alive) setData(res.data?.data || null);
      })
      .catch((err) => {
        if (alive) setError(err.response?.data?.error || err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [sample, uploadId, page]);

  const columns = useMemo(() => (data && data.rows.length ? Object.keys(data.rows[0]) : []), [data]);
  const totalRows = data ? data.totalRows : 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <Dialog open={!!sample} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" /> Preview Data — {sample?.name}
          </DialogTitle>
          <DialogDescription>
            {sample && data
              ? `${sample.kind === 'dimensions' ? 'Dimension' : 'Fait'} · ${num(totalRows)} lignes au total — lignes produites par la préparation (lecture seule)`
              : 'Chargement…'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-lg border">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Chargement des données…
            </div>
          )}
          {error && <p className="px-4 py-6 text-sm text-red-600">{error}</p>}
          {!loading && !error && data && (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="border-b px-3 py-2 font-mono font-semibold whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className={i % 2 ? 'bg-muted/30' : ''}>
                    {columns.map((c) => (
                      <td key={c} className="border-b px-3 py-1.5 whitespace-nowrap text-muted-foreground">{formatCell(row[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !error && data && data.rows.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">Aucune ligne.</p>
          )}
        </div>
        {data && totalRows > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground tabular-nums">
              Lignes {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalRows)} sur {num(totalRows)}
            </p>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} title="Page précédente">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="w-16 text-center text-xs text-muted-foreground tabular-nums">{page} / {num(totalPages)}</span>
              <Button size="icon" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} title="Page suivante">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Step6DimensionalModel({ uploadId }) {
  const [model, setModel] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedRel, setSelectedRel] = useState(null);
  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showExplorer, setShowExplorer] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [focusTarget, setFocusTarget] = useState(null);
  const diagramSvgRef = useRef(null);

  useEffect(() => {
    if (!uploadId) return;
    api.get(`/bi-uploads/${uploadId}/dimensional-model`).then((res) => {
      setModel(res.data?.data || null);
    }).catch((err) => {
      setError(err.response?.data?.error || err.message);
    }).finally(() => setLoading(false));
  }, [uploadId]);

  const summary = useMemo(() => {
    if (!model) return null;
    const tables = [...model.dimensions, ...model.facts];
    const totalRows = tables.reduce((a, t) => a + t.count, 0);
    const measures = model.facts.reduce((a, f) => a + f.columns.filter((c) => c.role === 'measure').length, 0);
    const attributes = tables.reduce((a, t) => a + t.columns.filter((c) => c.role === 'attribute').length, 0);
    const pks = model.dimensions.reduce((a, d) => a + d.pk.length, 0);
    const fks = model.facts.reduce((a, f) => a + f.columns.filter((c) => c.role === 'foreign_key').length, 0);
    const avgHealth = model.fkHealth.length
      ? Math.round(model.fkHealth.reduce((a, h) => a + h.health, 0) / model.fkHealth.length)
      : 100;
    const broken = model.fkHealth.filter((h) => h.health < 100).length;
    return {
      warehouseType: model.warehouseType || 'Star Schema',
      dimCount: model.dimensions.length,
      factCount: model.facts.length,
      relations: model.relationships.length,
      totalRows,
      measures,
      attributes,
      pks,
      fks,
      avgHealth,
      broken,
    };
  }, [model]);

  const selectedRelData = useMemo(() => {
    if (!selectedRel || !model) return null;
    const rel = model.relationships.find((r) => relKeyOf(r) === selectedRel);
    if (!rel) return null;
    const health = model.fkHealth.find(
      (h) => h.fact === rel.fact && h.dimension === rel.dimension && h.fk === rel.fk
    ) || null;
    const fact = model.facts.find((f) => f.name === rel.fact) || null;
    const dim = model.dimensions.find((d) => d.name === rel.dimension) || null;
    return { rel, health, fact, dim };
  }, [selectedRel, model]);

  const activeNodes = useMemo(() => {
    const dims = new Set();
    const facts = new Set();
    if (selected && model) {
      for (const r of model.relationships) {
        if (selected.kind === 'fact' && r.fact === selected.name) dims.add(r.dimension);
        if (selected.kind === 'dimension' && r.dimension === selected.name) facts.add(r.fact);
      }
    }
    if (selectedRelData) {
      dims.add(selectedRelData.rel.dimension);
      facts.add(selectedRelData.rel.fact);
    }
    return { dims, facts };
  }, [selected, selectedRelData, model]);

  const dimState = (name) => {
    const sel = !!selected && selected.kind === 'dimension' && selected.name === name;
    const con = activeNodes.dims.has(name);
    const dimmed = (!!selected || !!selectedRelData) && !sel && !con;
    return { sel, con, dimmed };
  };
  const factState = (name) => {
    const sel = !!selected && selected.kind === 'fact' && selected.name === name;
    const con = activeNodes.facts.has(name);
    const dimmed = (!!selected || !!selectedRelData) && !sel && !con;
    return { sel, con, dimmed };
  };

  const handleSelectNode = (node) => {
    setSelected(node);
    if (node) setSelectedRel(null);
  };
  const handleSelectRel = (key) => {
    setSelectedRel(key);
    if (key) {
      setSelected(null);
      setInspectorOpen(true);
    }
  };
  const handleExplorerSelect = (node) => {
    setSelected(node);
    setSelectedRel(null);
    setInspectorOpen(false);
    setFocusTarget({ kind: node.kind, name: node.name });
  };
  const resetSelection = () => {
    setSelected(null);
    setSelectedRel(null);
    setInspectorOpen(true);
  };
  const resetAll = () => {
    resetSelection();
    setSearchQuery('');
    setFilter('all');
    setInspectorOpen(true);
  };
  const previewTable = (kind, name) => setSample({ kind, name });

  const tiles = summary ? [
    { icon: <Star className="h-4 w-4" />, label: "Type d'entrepôt", value: summary.warehouseType, tone: 'violet' },
    { icon: <Database className="h-4 w-4" />, label: 'Dimensions', value: summary.dimCount, tone: 'blue' },
    { icon: <Table2 className="h-4 w-4" />, label: 'Faits', value: summary.factCount, tone: 'orange' },
    { icon: <Link2 className="h-4 w-4" />, label: 'Relations', value: summary.relations, tone: 'cyan' },
    { icon: <Boxes className="h-4 w-4" />, label: 'Enregistrements', value: num(summary.totalRows), tone: 'indigo' },
    { icon: <Sigma className="h-4 w-4" />, label: 'Mesures', value: summary.measures, tone: 'emerald' },
    { icon: <Hash className="h-4 w-4" />, label: 'Attributs', value: summary.attributes, tone: 'amber' },
    { icon: <KeyRound className="h-4 w-4" />, label: 'Clés primaires', value: summary.pks, tone: 'blue' },
    { icon: <Link2 className="h-4 w-4" />, label: 'Clés étrangères', value: summary.fks, tone: 'violet' },
    {
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: 'Santé moyenne des relations',
      value: `${summary.avgHealth}%`,
      tone: summary.avgHealth >= 100 ? 'green' : summary.avgHealth >= 80 ? 'amber' : 'red',
    },
    {
      icon: summary.broken === 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />,
      label: 'Relations cassées',
      value: num(summary.broken),
      tone: summary.broken === 0 ? 'green' : 'red',
    },
  ] : [];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Chargement du modèle dimensionnel...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Erreur</CardTitle></CardHeader>
        <CardContent><p className="text-red-600">{error}</p></CardContent>
      </Card>
    );
  }

  if (!model) {
    return (
      <Card>
        <CardHeader><CardTitle>Modèle dimensionnel</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun modèle disponible. Lancez la préparation à l'étape précédente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-blue-600" />
          Étape 6 — Modèle dimensionnel
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Explorateur de modèle sémantique en étoile (SSAS / Power BI Model View). Vue en lecture seule — aucune modification n'est apportée aux données, à l'ETL ni à l'entrepôt.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-6">
          {tiles.map((t, i) => (
            <SummaryTile key={i} {...t} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
          <Button
            size="sm"
            variant={showExplorer ? 'secondary' : 'outline'}
            onClick={() => setShowExplorer((v) => !v)}
            title="Afficher/masquer l'explorateur de modèle"
          >
            <PanelLeft className="h-4 w-4" /> Explorateur
          </Button>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une table ou une colonne…"
              className="h-9 w-56 pl-8 pr-8 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger size="sm" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4" /> Exports
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Exporter le diagramme</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => exportPng(diagramSvgRef.current, 'modele-dimensionnel.png')}>
                  <FileImage className="h-4 w-4" /> Diagramme — PNG
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportSvg(diagramSvgRef.current, 'modele-dimensionnel.svg')}>
                  <FileCode2 className="h-4 w-4" /> Diagramme — SVG
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportPdf(diagramSvgRef.current, 'modele-dimensionnel.pdf', 'Modèle dimensionnel — Schéma en étoile')}>
                  <FileText className="h-4 w-4" /> Diagramme — PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Rapports (PDF)</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => exportRelationshipReportPdf(model)}>
                  <Link2 className="h-4 w-4" /> Rapport des relations
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportLineageReportPdf(model)}>
                  <Network className="h-4 w-4" /> Rapport de lignage
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" onClick={resetAll} disabled={!selected && !selectedRel && !searchQuery && filter === 'all'}>
              <RotateCcw className="h-4 w-4" /> Réinitialiser
            </Button>
          </div>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <SectionTitle tone="blue" icon={<Network className="h-4 w-4" />}>Schéma en étoile</SectionTitle>
            {selectedRelData && !inspectorOpen && (
              <Button size="sm" variant="outline" onClick={() => setInspectorOpen(true)}>
                <Eye className="h-4 w-4" /> Afficher l'inspecteur
              </Button>
            )}
          </div>
          <div className={cn('grid gap-4', showExplorer && 'xl:grid-cols-[230px_minmax(0,1fr)]')}>
            {showExplorer && (
              <div className="hidden xl:block">
                <ModelExplorer model={model} selectedNode={selected} onSelect={handleExplorerSelect} />
              </div>
            )}
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row">
              <div className="min-w-0 flex-1">
                <StarSchema
                  model={model}
                  selectedNode={selected}
                  selectedRel={selectedRel}
                  searchQuery={searchQuery}
                  filter={filter}
                  focusRequest={focusTarget}
                  outerSvgRef={diagramSvgRef}
                  onSelectNode={handleSelectNode}
                  onSelectRel={handleSelectRel}
                />
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-blue-600" /> Dimension</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-orange-600" /> Fait</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> 100 %</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> 80–99 %</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> 60–79 %</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> &lt; 60 %</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-500" /> Sélection</span>
                  <span className="flex items-center gap-1"><span className="h-0.5 w-5 rounded bg-slate-400" /> Inactive</span>
                  <span className="ml-auto hidden lg:inline">
                    Cliquez sur une table ou une relation · molette = zoom · glissez = déplacer.
                  </span>
                </div>
              </div>
              {selectedRelData && inspectorOpen && (
                <aside className="w-full shrink-0 lg:w-[370px]">
                  <WarehouseInspector
                    data={selectedRelData}
                    fact={selectedRelData.fact}
                    dim={selectedRelData.dim}
                    model={model}
                    uploadId={uploadId}
                    onClose={resetSelection}
                    onShowTable={previewTable}
                  />
                </aside>
              )}
            </div>
          </div>
        </section>

        <section>
          <SectionTitle tone="blue" icon={<Database className="h-4 w-4" />}>Dimensions</SectionTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {model.dimensions.map((d) => (
              <DimensionCard
                key={d.name}
                dim={d}
                usedBy={model.relationships.filter((r) => r.dimension === d.name).map((r) => r.fact)}
                onSelect={handleSelectNode}
                onPreview={(n) => previewTable('dimensions', n)}
                {...dimState(d.name)}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle tone="orange" icon={<Table2 className="h-4 w-4" />}>Faits</SectionTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {model.facts.map((f) => (
              <FactCard key={f.name} fact={f} onSelect={handleSelectNode} onPreview={(n) => previewTable('facts', n)} {...factState(f.name)} />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle tone="green" icon={<Link2 className="h-4 w-4" />}>Intégrité référentielle des relations</SectionTitle>
          <div className="overflow-x-auto rounded-lg border">
            <ScrollArea className="max-h-96">
              <UITable scrollable={false} className="min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Relation</TableHead>
                    <TableHead className="text-xs">Cardinalité</TableHead>
                    <TableHead className="text-xs">Clé étrangère</TableHead>
                    <TableHead className="text-xs">Lignes fait</TableHead>
                    <TableHead className="text-xs">Correspondances</TableHead>
                    <TableHead className="text-xs">Orphelines</TableHead>
                    <TableHead className="text-xs">Sans clé</TableHead>
                    <TableHead className="text-xs">Santé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {model.fkHealth.map((h, i) => (
                    <TableRow
                      key={i}
                      className={cn('cursor-pointer', selectedRel === relKeyOf(h) && 'bg-cyan-50')}
                      onClick={() => handleSelectRel(selectedRel === relKeyOf(h) ? null : relKeyOf(h))}
                    >
                      <TableCell className="text-xs whitespace-nowrap">
                        <span className="font-mono text-violet-700">{h.fact}</span>
                        <span className="mx-1 text-muted-foreground">→</span>
                        <span className="font-mono text-blue-700">{h.dimension}</span>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        <Badge className="bg-cyan-50 text-cyan-700">{h.cardinality || '1:N'}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{h.fk}</TableCell>
                      <TableCell className="text-xs tabular-nums">{num(h.rows)}</TableCell>
                      <TableCell className="text-xs text-green-700 tabular-nums">{num(h.matched)}</TableCell>
                      <TableCell className={cn('text-xs tabular-nums', h.orphan > 0 ? 'text-red-600' : 'text-muted-foreground')}>{num(h.orphan)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">{num(h.noKey)}</TableCell>
                      <TableCell className="text-xs">
                        <Badge className={HEALTH_BADGE[healthTone(h.health)]}>{h.health}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </UITable>
            </ScrollArea>
          </div>
        </section>

        <section>
          <SectionTitle tone="blue" icon={<FileSpreadsheet className="h-4 w-4" />}>Traçabilité (lignage) — CSV source → entrepôt</SectionTitle>
          <div className="overflow-x-auto rounded-lg border">
            <ScrollArea className="max-h-96">
              <UITable scrollable={false} className="min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Table</TableHead>
                    <TableHead className="text-xs">Colonne</TableHead>
                    <TableHead className="text-xs">Rôle</TableHead>
                    <TableHead className="text-xs">Source CSV</TableHead>
                    <TableHead className="text-xs">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...model.dimensions, ...model.facts].map((t) =>
                    t.columns.map((c) => (
                      <TableRow key={`${t.name}-${c.name}`}>
                        <TableCell className="text-xs whitespace-nowrap font-mono">{t.name}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{c.name}</TableCell>
                        <TableCell className="text-xs">
                          <Badge className={ROLE_BADGE[c.role] || 'bg-slate-100 text-slate-600'}>{ROLE_LABELS[c.role] || c.role}</Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {c.source && c.source.dataset ? (
                            <span className="font-mono">{c.source.dataset}.{c.source.column}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.note || ''}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </UITable>
            </ScrollArea>
          </div>
        </section>
      </CardContent>

      <SampleDataDialog uploadId={uploadId} sample={sample} onClose={() => setSample(null)} />
    </Card>
  );
}
