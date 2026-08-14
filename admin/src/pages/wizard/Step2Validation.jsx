import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2, ShieldCheck, PackageOpen, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { cn } from '@/lib/utils';
import api from '../../lib/api';

function num(n) {
  return Number.isFinite(n) ? n.toLocaleString('fr-FR') : String(n);
}

function SummaryTile({ icon, label, value, tone = 'blue', sub }) {
  const toneCls = {
    blue: 'text-blue-600 bg-blue-50/60',
    green: 'text-green-600 bg-green-50/60',
    orange: 'text-amber-600 bg-amber-50/60',
    red: 'text-red-600 bg-red-50/60',
    violet: 'text-violet-600 bg-violet-50/60',
  }[tone];
  return (
    <div className="rounded-lg border p-3">
      <div className={cn('mb-1 flex h-8 w-8 items-center justify-center rounded-md', toneCls)}>{icon}</div>
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SectionTitle({ icon, tone = 'blue', children }) {
  const dot = {
    blue: 'bg-blue-500',
    violet: 'bg-violet-500',
    green: 'bg-green-500',
  }[tone];
  const iconCls = {
    blue: 'text-blue-600',
    violet: 'text-violet-600',
    green: 'text-green-600',
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

const STATUS_META = {
  OK: { icon: CheckCircle2, iconCls: 'text-green-600', badge: null, text: null },
  NOT_EXPORTED: {
    icon: Info,
    iconCls: 'text-slate-400',
    badge: 'Non exporté',
    badgeCls: 'bg-slate-100 text-slate-500',
    text: 'Jeu optionnel — non requis pour ce type de business ou cet export.',
  },
  EMPTY: {
    icon: Info,
    iconCls: 'text-slate-400',
    badge: 'Fichier vide',
    badgeCls: 'bg-slate-100 text-slate-500',
    text: 'Fichier présent mais vide (0 ligne).',
  },
  UNEXPECTED: {
    icon: AlertTriangle,
    iconCls: 'text-amber-500',
    badge: 'Inattendu',
    badgeCls: 'bg-amber-100 text-amber-700',
    text: 'Jeu de données inattendu — non reconnu par le schéma BI.',
  },
  SKIPPED: {
    icon: XCircle,
    iconCls: 'text-red-500',
    badge: 'Invalide',
    badgeCls: 'bg-red-100 text-red-700',
    text: 'Fichier présent mais incompatible avec le schéma attendu.',
  },
};

function DatasetRow({ ds }) {
  const meta = STATUS_META[ds.status] || STATUS_META.SKIPPED;
  const Icon = meta.icon;
  const errors = ds.errors?.length ? ds.errors.join(', ') : null;
  const warnings = ds.warnings?.length ? ds.warnings.join(', ') : null;
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 items-start gap-2">
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', meta.iconCls)} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{ds.name}</span>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {ds.required ? 'requis' : 'optionnel'}
            </Badge>
            {meta.badge && (
              <Badge className={cn('text-[10px]', meta.badgeCls)}>{meta.badge}</Badge>
            )}
            {ds.severity === 'ERROR' && (
              <Badge className="bg-red-100 text-[10px] text-red-700">ERROR</Badge>
            )}
            {ds.severity === 'WARN' && (
              <Badge className="bg-amber-100 text-[10px] text-amber-700">WARN</Badge>
            )}
            {ds.severity === 'INFO' && (
              <Badge className="bg-slate-100 text-[10px] text-slate-500">INFO</Badge>
            )}
          </div>
          {meta.text && <p className="mt-1 text-xs text-muted-foreground">{meta.text}</p>}
          {errors && <p className="mt-1 text-xs text-red-600">{errors}</p>}
          {warnings && <p className="mt-1 text-xs text-amber-600">{warnings}</p>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <Badge variant="secondary" className="text-xs">
          {ds.rowCount || 0} lignes
        </Badge>
        {ds.duplicateRows > 0 && (
          <p className="mt-1 text-[11px] text-amber-600">{ds.duplicateRows} doublon(s)</p>
        )}
      </div>
    </div>
  );
}

export default function Step2Validation({ uploadId, onNext }) {
  const [report, setReport] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!uploadId) return;
    setValidating(true);
    api.post(`/bi-uploads/${uploadId}/validate`).then(() => {
      return api.get(`/bi-uploads/${uploadId}/validation-report`);
    }).then((res) => {
      setReport(res.data?.data || res.data);
      setMeta(res.data?.metadata || null);
    }).catch((err) => {
      api.get(`/bi-uploads/${uploadId}/validation-report`).then((res) => {
        setReport(res.data?.data || res.data);
        setMeta(res.data?.metadata || null);
      }).catch(() => setError(err.response?.data?.error || err.message));
    }).finally(() => { setValidating(false); setLoading(false); });
  }, [uploadId]);

  if (loading || validating) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Validation en cours...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Erreur de validation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const entries = Object.entries(report || {}).map(([name, info]) => ({
    name,
    required: info.required === true,
    status: info.status,
    severity: info.severity || (info.status === 'OK' ? 'OK' : 'ERROR'),
    rowCount: info.rows ?? 0,
    errors: info.errors || [],
    warnings: info.warnings || [],
    duplicateRows: info.duplicateRows || 0,
  }));

  const required = entries.filter((e) => e.required);
  const optional = entries.filter((e) => !e.required);
  const requiredOk = required.filter((e) => e.status === 'OK');
  const blocking = entries.filter((e) => e.severity === 'ERROR');
  const notExported = optional.filter((e) => e.status === 'NOT_EXPORTED');
  const passed = blocking.length === 0;

  const businessType = meta?.businessType || 'inconnu';
  const modules = Array.isArray(meta?.enabledModules) ? meta.enabledModules : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 2 — Rapport de validation</CardTitle>
        <p className="text-sm text-muted-foreground">
          Le rapport reflète la configuration du business ({businessType}) : les jeux optionnels absents ne sont pas des erreurs.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg border p-4',
            passed ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
          )}
        >
          {passed ? (
            <CheckCircle2 className="h-7 w-7 shrink-0 text-green-600" />
          ) : (
            <XCircle className="h-7 w-7 shrink-0 text-red-600" />
          )}
          <div className="min-w-0">
            <p className="font-semibold">
              Validation globale : {passed ? 'Passée' : 'Échouée'}
            </p>
            <p className="text-sm text-muted-foreground">
              {meta?.businessName ? `${meta.businessName} · ` : ''}
              Type de business : {businessType} · Schéma v{meta?.biSchemaVersion ?? 'N/A'}
            </p>
            {modules.length > 0 && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Modules : {modules.join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <SummaryTile
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Jeux de données requis"
            value={`${requiredOk.length} / ${required.length}`}
            tone={requiredOk.length === required.length ? 'green' : 'red'}
          />
          <SummaryTile
            icon={<PackageOpen className="h-4 w-4" />}
            label="Optionnels non exportés"
            value={num(notExported.length)}
            tone={notExported.length === 0 ? 'green' : 'violet'}
            sub={notExported.length > 0 ? notExported.map((e) => e.name).join(', ') : 'Aucun'}
          />
          <SummaryTile
            icon={<Database className="h-4 w-4" />}
            label="Jeux de données"
            value={num(entries.length)}
            tone="blue"
            sub={`${optional.length} optionnel(s)`}
          />
        </div>

        {required.length > 0 && (
          <section>
            <SectionTitle tone="blue" icon={<ShieldCheck className="h-4 w-4" />}>
              Jeux de données requis
            </SectionTitle>
            <div className="space-y-2">
              {required.map((ds) => (
                <DatasetRow key={ds.name} ds={ds} />
              ))}
            </div>
          </section>
        )}

        {optional.length > 0 && (
          <section>
            <SectionTitle tone="violet" icon={<PackageOpen className="h-4 w-4" />}>
              Jeux de données optionnels
            </SectionTitle>
            <div className="space-y-2">
              {optional.map((ds) => (
                <DatasetRow key={ds.name} ds={ds} />
              ))}
            </div>
          </section>
        )}

        {passed ? (
          <Button onClick={onNext} className="w-full">
            Continuer vers l'aperçu
          </Button>
        ) : (
          <Button disabled className="w-full">
            {blocking.length} problème(s) à corriger avant de continuer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
