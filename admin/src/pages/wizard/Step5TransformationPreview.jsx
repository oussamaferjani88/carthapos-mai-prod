import { useState, useEffect, useMemo } from 'react';
import {
  Loader2,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Store,
  Database,
  Table2,
  Boxes,
  RefreshCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { cn } from '@/lib/utils';
import api from '../../lib/api';

const TONES = {
  green: {
    border: 'border-l-green-500',
    badge: 'bg-green-100 text-green-700',
    icon: 'text-green-600',
    bg: 'bg-green-50/40',
    dot: 'bg-green-500',
  },
  blue: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'text-blue-600',
    bg: 'bg-blue-50/40',
    dot: 'bg-blue-500',
  },
  orange: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'text-amber-600',
    bg: 'bg-amber-50/40',
    dot: 'bg-amber-500',
  },
  red: {
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-700',
    icon: 'text-red-600',
    bg: 'bg-red-50/40',
    dot: 'bg-red-500',
  },
};

const SERVICE_TYPE_MAP = {
  comptoir: 'counter',
  counter: 'counter',
  takeaway: 'takeaway',
  'take away': 'takeaway',
  'take-away': 'takeaway',
  'à emporter': 'takeaway',
  'a emporter': 'takeaway',
  aemporter: 'takeaway',
  delivery: 'delivery',
  livraison: 'delivery',
  drive: 'delivery',
  'drive-through': 'delivery',
  'drive thru': 'delivery',
  drive_thru: 'delivery',
};

const CODE_LABELS = {
  DUPLICATE_REMOVED: 'Lignes dupliquées supprimées',
  COUNTER_ORDER: 'Commande comptoir',
  AUTO_EXTRACTED_NUMBER: 'Numéro de table extrait',
  AUTO_FIXED: 'Correction automatique',
};

function stripAccents(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeLocation(v) {
  return stripAccents(String(v)).toLowerCase().replace(/\s+/g, ' ').trim();
}

function serviceTypeOf(v) {
  return SERVICE_TYPE_MAP[normalizeLocation(v)] || null;
}

function humanize(s) {
  return String(s).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function str(v) {
  if (v === null || v === undefined) return 'NULL';
  if (v === '') return '(vide)';
  return String(v);
}

function num(n) {
  return Number.isFinite(n) ? n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—';
}

function fmtVal(v) {
  if (v === null || v === undefined || v === '') return <span className="text-muted-foreground">(vide)</span>;
  return String(v);
}

function SummaryCard({ icon, label, value, tone }) {
  const t = TONES[tone];
  return (
    <div className={cn('rounded-lg border p-4', t.bg)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground leading-tight">{label}</span>
        <span className={cn('shrink-0', t.icon)}>{icon}</span>
      </div>
      <p className={cn('mt-1.5 text-2xl font-bold', t.icon)}>{value}</p>
    </div>
  );
}

function SectionTitle({ icon, tone, children }) {
  const t = TONES[tone];
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-full', t.dot)} />
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <span className={t.icon}>{icon}</span>
        {children}
      </h3>
    </div>
  );
}

function DetailTable({ items }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <ScrollArea className="max-h-64">
        <UITable scrollable={false} className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Jeu</TableHead>
              <TableHead className="text-xs">#</TableHead>
              <TableHead className="text-xs">Champ</TableHead>
              <TableHead className="text-xs">Avant</TableHead>
              <TableHead className="text-xs">Après</TableHead>
              <TableHead className="text-xs">Raison</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs whitespace-nowrap">{c.dataset}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.rowIndex ?? '—'}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{c.column ? humanize(c.column) : '—'}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{fmtVal(c.originalValue)}</TableCell>
                <TableCell className="text-xs whitespace-nowrap font-medium">{fmtVal(c.preparedValue)}</TableCell>
                <TableCell className="text-xs">{c.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </UITable>
      </ScrollArea>
    </div>
  );
}

function GroupItem({ tone, icon, subtitle, title, reason, mono = false, count, details }) {
  const [open, setOpen] = useState(false);
  const t = TONES[tone];
  const hasDetails = details && details.length > 0;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn('rounded-r-lg border bg-muted/30', t.border)}>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className={cn('shrink-0', t.icon)}>{icon}</span>
          <div className="min-w-0 flex-1">
            {subtitle && <p className="text-xs leading-tight text-muted-foreground">{subtitle}</p>}
            <p className={cn('text-sm font-medium leading-snug', mono && 'font-mono text-xs')}>{title}</p>
            {reason && <p className="text-xs leading-tight text-muted-foreground">{reason}</p>}
          </div>
          {count > 1 && <Badge className={cn('shrink-0', t.badge)}>{count} lignes</Badge>}
          {hasDetails && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0 text-xs">
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {open ? 'Masquer' : 'Voir les détails'}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
        {hasDetails && (
          <CollapsibleContent>
            <div className="px-4 pb-3">
              <DetailTable items={details} />
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

function CounterOrderBlock({ group }) {
  const [open, setOpen] = useState(false);
  const { original, serviceType, items } = group;
  const count = items.length;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-r-lg border border-blue-200 border-l-4 border-l-blue-500 bg-blue-50/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-blue-600" />
          <span className="font-mono text-xs font-medium text-blue-700">COUNTER_ORDER</span>
          {count > 1 && <Badge className="bg-blue-100 text-blue-700">{count} lignes</Badge>}
          {count > 1 && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-auto text-xs">
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {open ? 'Masquer' : 'Voir les lignes'}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
        <div className="mt-2 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Valeur d'origine :</span>{' '}
            <span className="font-medium">{fmtVal(original)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Résultat :</span>{' '}
            <span className="font-mono text-xs">table_number = NULL</span>
            {serviceType && <span className="font-mono text-xs"> · service_type = {serviceType}</span>}
          </p>
          <p>
            <span className="text-muted-foreground">Raison :</span>{' '}
            Commande comptoir connue — aucune table de restaurant physique n'est associée à cette commande.
          </p>
        </div>
        {count > 1 && (
          <CollapsibleContent>
            <div className="mt-3">
              <DetailTable items={items} />
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

function ReconciliationCard({ grain, ok }) {
  if (!grain) return null;
  const diff = grain.sales - grain.expected;
  return (
    <div
      className={cn(
        'rounded-r-lg border px-4 py-3',
        ok
          ? 'border-blue-200 border-l-4 border-l-blue-500 bg-blue-50/40'
          : 'border-amber-200 border-l-4 border-l-amber-500 bg-amber-50/40'
      )}
    >
      <p className={cn('font-mono text-xs font-medium', ok ? 'text-blue-700' : 'text-amber-700')}>
        {ok ? 'SALES_RECONCILIATION_OK' : 'RECONCILIATION_MISMATCH'}
      </p>
      <div className="mt-2 space-y-1 text-sm">
        <p className="flex items-center gap-1.5">
          <CheckCircle2 className={cn('h-4 w-4', ok ? 'text-green-600' : 'text-amber-500')} />
          Sales total = {num(grain.sales)}
        </p>
        <p className="flex items-center gap-1.5">
          {ok ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
          Sale items total = {num(grain.expected)}
          {!ok && (
            <span className="font-medium text-amber-700">
              (écart {diff >= 0 ? '+' : ''}
              {num(diff)})
            </span>
          )}
        </p>
        <p>VAT = {num(grain.vat)}</p>
        <p>Discounts = {num(grain.discounts)}</p>
        {ok && <p className="font-medium text-green-700">Aucun problème de réconciliation détecté.</p>}
      </div>
    </div>
  );
}

export default function Step5TransformationPreview({ uploadId, onNext }) {
  const [tables, setTables] = useState([]);
  const [changes, setChanges] = useState([]);
  const [rawSummary, setRawSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uploadId) return;
    api.get(`/bi-uploads/${uploadId}/transformation-preview`).then((res) => {
      const summary = res.data?.data || res.data;
      setRawSummary(summary);
      if (res.data?.changes) setChanges(res.data.changes);

      const entries = [];
      const cleaned = summary.cleaned || {};
      const dims = summary.dimensions || {};
      const facts = summary.facts || {};
      for (const [name, count] of Object.entries(cleaned)) entries.push({ name, section: 'cleaned', type: 'cleaned', rows: count });
      for (const [name, count] of Object.entries(dims)) entries.push({ name, section: 'dimensions', type: 'dimension', rows: count });
      for (const [name, count] of Object.entries(facts)) entries.push({ name, section: 'facts', type: 'fact', rows: count });
      setTables(entries);
      return Promise.all(entries.map((t) =>
        api.get(`/bi-uploads/${uploadId}/transformation-preview`, { params: { section: t.section, table: t.name, pageSize: 50 } })
          .then((r) => {
            const d = r.data?.data || {};
            const rows = d.rows || [];
            const columns = d.header || (rows[0] ? Object.keys(rows[0]) : []);
            return { ...t, rows: d.totalRows ?? t.rows, columns, sample: rows };
          })
          .catch(() => t)
      )).then(setTables);
    }).catch((err) => {
      setError(err.response?.data?.error || err.message);
    }).finally(() => setLoading(false));
  }, [uploadId]);

  const report = useMemo(() => {
    const transforms = [];
    const counterOrders = [];
    const infos = [];
    const warnings = [];
    const errors = [];
    const tMap = new Map();
    const cMap = new Map();
    const iMap = new Map();
    const wMap = new Map();
    const eMap = new Map();
    const push = (map, key) => {
      let arr = map.get(key);
      if (!arr) {
        arr = [];
        map.set(key, arr);
      }
      return arr;
    };
    let grain = null;
    let globalMismatch = false;

    for (const c of changes || []) {
      if (c.code === 'RECONCILIATION_GRAIN') {
        grain = c;
        continue;
      }
      if (c.code === 'RECONCILIATION_GLOBAL') {
        globalMismatch = true;
        continue;
      }
      if (c.code === 'COUNTER_ORDER') {
        push(cMap, `${c.dataset}|${c.column}|${str(c.originalValue)}`).push(c);
        continue;
      }
      if (c.severity === 'ERROR') {
        push(eMap, c.code || 'ERROR').push(c);
        continue;
      }
      if (c.severity === 'WARN') {
        push(wMap, c.code || 'WARN').push(c);
        continue;
      }
      if (c.severity === 'INFO' && c.action === 'AUTO_FIXED') {
        push(tMap, `${c.dataset}|${c.column}|${c.code}|${str(c.originalValue)}|${str(c.preparedValue)}`).push(c);
        continue;
      }
      push(iMap, `${c.dataset}|${c.code || 'INFO'}`).push(c);
    }

    const byCount = (a, b) => b.items.length - a.items.length;
    for (const items of tMap.values()) transforms.push({
      column: items[0].column,
      code: items[0].code,
      original: items[0].originalValue,
      prepared: items[0].preparedValue,
      items,
    });
    for (const items of cMap.values()) counterOrders.push({
      column: items[0].column,
      original: items[0].originalValue,
      serviceType: serviceTypeOf(items[0].originalValue),
      items,
    });
    for (const items of iMap.values()) infos.push({ code: items[0].code, items });
    for (const items of wMap.values()) warnings.push({ code: items[0].code, items });
    for (const items of eMap.values()) errors.push({ code: items[0].code, items });
    transforms.sort(byCount);
    counterOrders.sort(byCount);
    infos.sort(byCount);
    warnings.sort(byCount);
    errors.sort(byCount);

    return { transforms, counterOrders, infos, warnings, errors, grain, globalMismatch };
  }, [changes]);

  const grainNumbers = useMemo(() => {
    if (!report.grain) return null;
    const m = /sum\(line_total\)=(-?[\d.]+), sum\(vat_amount\)=(-?[\d.]+), discounts=(-?[\d.]+), sales grain=(-?[\d.]+)/.exec(report.grain.reason || '');
    if (!m) return null;
    const items = Number(m[1]);
    const vat = Number(m[2]);
    const discounts = Number(m[3]);
    const sales = Number(m[4]);
    return { items, vat, discounts, sales, expected: items + vat - discounts };
  }, [report.grain]);

  const summary = useMemo(() => {
    const rows = new Set();
    for (const c of changes || []) {
      if (c.rowIndex !== null && c.rowIndex !== undefined) rows.add(`${c.dataset}|${c.rowIndex}`);
    }
    return {
      datasetsProcessed: rawSummary
        ? Object.keys(rawSummary.raw || rawSummary.cleaned || {}).length
        : 0,
      rowsModified: rows.size,
      automaticFixes: (changes || []).filter((c) => c.severity === 'INFO' && c.action === 'AUTO_FIXED').length,
      warnings: (changes || []).filter((c) => c.severity === 'WARN').length,
      errors: (changes || []).filter((c) => c.severity === 'ERROR').length,
      counterOrders: (changes || []).filter((c) => c.code === 'COUNTER_ORDER').length,
      extractedNumbers: (changes || []).filter((c) => c.code === 'AUTO_EXTRACTED_NUMBER').length,
    };
  }, [changes, rawSummary]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Chargement de l'aperçu...</span>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 5 — Aperçu avant / après</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <SectionTitle tone="blue" icon={<Database className="h-4 w-4" />}>Résumé</SectionTitle>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard tone="blue" icon={<Database className="h-5 w-5" />} label="Jeux de données traités" value={summary.datasetsProcessed} />
            <SummaryCard tone="blue" icon={<Table2 className="h-5 w-5" />} label="Lignes modifiées" value={summary.rowsModified} />
            <SummaryCard tone="green" icon={<CheckCircle2 className="h-5 w-5" />} label="Corrections automatiques" value={summary.automaticFixes} />
            <SummaryCard tone="orange" icon={<AlertTriangle className="h-5 w-5" />} label="Avertissements" value={summary.warnings} />
            <SummaryCard tone={summary.errors > 0 ? 'red' : 'green'} icon={<XCircle className="h-5 w-5" />} label="Erreurs" value={summary.errors} />
            <SummaryCard tone="blue" icon={<Store className="h-5 w-5" />} label="Commandes comptoir détectées" value={summary.counterOrders} />
            <SummaryCard tone="green" icon={<RefreshCcw className="h-5 w-5" />} label="Numéros de table extraits" value={summary.extractedNumbers} />
            <SummaryCard tone="blue" icon={<Boxes className="h-5 w-5" />} label="Transformations répétées groupées" value="Oui" />
          </div>
        </section>

        {changes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune modification détectée par la préparation.
          </p>
        ) : (
          <>
            {report.transforms.length > 0 && (
              <section>
                <SectionTitle tone="green" icon={<CheckCircle2 className="h-4 w-4" />}>
                  Corrections automatiques & normalisations
                </SectionTitle>
                <div className="space-y-2">
                  {report.transforms.map((g) => (
                    <GroupItem
                      key={`t-${g.column}-${g.code}-${str(g.original)}-${str(g.prepared)}`}
                      tone="green"
                      icon={<CheckCircle2 className="h-4 w-4" />}
                      subtitle={`${humanize(g.column)} · ${g.items[0].dataset}`}
                      title={`${str(g.original)} → ${str(g.prepared)}`}
                      count={g.items.length}
                      details={g.items}
                    />
                  ))}
                </div>
              </section>
            )}

            {report.counterOrders.length > 0 && (
              <section>
                <SectionTitle tone="blue" icon={<Store className="h-4 w-4" />}>
                  Commandes non liées à une table
                </SectionTitle>
                <div className="space-y-2">
                  {report.counterOrders.map((g) => (
                    <CounterOrderBlock key={`c-${g.column}-${str(g.original)}`} group={g} />
                  ))}
                </div>
              </section>
            )}

            {report.grain && (
              <section>
                <SectionTitle
                  tone={report.globalMismatch ? 'orange' : 'blue'}
                  icon={report.globalMismatch ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                >
                  Réconciliation des ventes
                </SectionTitle>
                <ReconciliationCard grain={grainNumbers} ok={!report.globalMismatch} />
              </section>
            )}

            {report.infos.length > 0 && (
              <section>
                <SectionTitle tone="blue" icon={<Info className="h-4 w-4" />}>Informations</SectionTitle>
                <div className="space-y-2">
                  {report.infos.map((g, idx) => (
                    <GroupItem
                      key={`i-${idx}-${g.code}`}
                      tone="blue"
                      icon={<Info className="h-4 w-4" />}
                      subtitle={g.items[0].dataset}
                      title={CODE_LABELS[g.code] || g.code}
                      mono={!CODE_LABELS[g.code]}
                      count={g.items.length}
                      details={g.items}
                    />
                  ))}
                </div>
              </section>
            )}

            {report.warnings.length > 0 && (
              <section>
                <SectionTitle tone="orange" icon={<AlertTriangle className="h-4 w-4" />}>Avertissements</SectionTitle>
                <div className="space-y-2">
                  {report.warnings.map((g, idx) => (
                    <GroupItem
                      key={`w-${idx}-${g.code}`}
                      tone="orange"
                      icon={<AlertTriangle className="h-4 w-4" />}
                      subtitle={`${g.items[0].dataset}${g.items[0].column ? ` · ${humanize(g.items[0].column)}` : ''}`}
                      title={g.code}
                      mono
                      reason={g.items[0].reason}
                      count={g.items.length}
                      details={g.items}
                    />
                  ))}
                </div>
              </section>
            )}

            {report.errors.length > 0 && (
              <section>
                <SectionTitle tone="red" icon={<XCircle className="h-4 w-4" />}>Erreurs</SectionTitle>
                <div className="space-y-2">
                  {report.errors.map((g, idx) => (
                    <GroupItem
                      key={`e-${idx}-${g.code}`}
                      tone="red"
                      icon={<XCircle className="h-4 w-4" />}
                      subtitle={`${g.items[0].dataset}${g.items[0].column ? ` · ${humanize(g.items[0].column)}` : ''}`}
                      title={g.code}
                      mono
                      reason={g.items[0].reason}
                      count={g.items.length}
                      details={g.items}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {tables.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée transformée disponible. Lancez la préparation à l'étape précédente.</p>
        ) : (
          <section>
            <SectionTitle tone="blue" icon={<Table2 className="h-4 w-4" />}>Données préparées</SectionTitle>
            <Tabs defaultValue={`${tables[0].section}-${tables[0].name}`} className="w-full">
              <ScrollArea className="max-w-full">
                <TabsList>
                  {tables.map((ds) => (
                    <TabsTrigger key={`${ds.section}-${ds.name}`} value={`${ds.section}-${ds.name}`} className="text-xs">
                      {ds.name}
                      <Badge variant={ds.type === 'dimension' ? 'default' : 'secondary'} className="ml-1.5 text-[10px]">
                        {ds.type === 'dimension' ? 'DIM' : ds.type === 'fact' ? 'FACT' : 'NET'}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
              {tables.map((ds) => (
                <TabsContent key={`${ds.section}-${ds.name}`} value={`${ds.section}-${ds.name}`}>
                  <div className="overflow-hidden rounded-lg border">
                    <ScrollArea className="max-h-80">
                      <UITable scrollable={false} className="min-w-max">
                        <TableHeader>
                          <TableRow>
                            {ds.columns?.map((col) => (
                              <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ds.sample?.map((row, i) => (
                            <TableRow key={i}>
                              {ds.columns?.map((col) => (
                                <TableCell key={col} className="text-xs whitespace-nowrap">{row[col] ?? ''}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </UITable>
                    </ScrollArea>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {ds.rows} lignes | {ds.columns?.length || 0} colonnes
                  </p>
                </TabsContent>
              ))}
            </Tabs>
          </section>
        )}

        <div className="flex gap-3">
          <Button className="flex-1" onClick={onNext}>
            Continuer vers la revue des erreurs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
