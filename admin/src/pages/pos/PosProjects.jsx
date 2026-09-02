/**
 * Projets POS
 * Every POS ever generated (all clients). Staff can inspect, re-download the
 * installer (regenerating from the saved config when needed), reopen the
 * configuration in the wizard, or duplicate it into a new project.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Calendar,
  Download,
  Eye,
  Settings2,
  Copy,
  User,
  Plus,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import PageHeader from '../../components/shared/PageHeader';
import POSGenerationProgress from '../../components/pos/generation/POSGenerationProgress';
import { licenseService, posService } from '../../services';
import toast from 'react-hot-toast';

const REGEN_STEPS = [
  { id: 'prepare', label: 'Préparation du projet', description: 'Rechargement de la configuration enregistrée' },
  { id: 'generate', label: 'Génération du POS', description: 'Création des fichiers à partir de la configuration' },
  { id: 'build', label: "Construction de l'exécutable", description: "Compilation de l'application Electron" },
  { id: 'download', label: 'Téléchargement', description: "Récupération de l'installateur" },
];

// elapsed ms -> { step index, progress % } for the simulated regen progress
const REGEN_TIMING = [
  { after: 0, idx: 0, pct: 10 },
  { after: 5000, idx: 1, pct: 25 },
  { after: 120000, idx: 2, pct: 70 },
  { after: 330000, idx: 3, pct: 90 },
];

const getStatus = (license) => {
  switch (license.buildStatus) {
    case 'building':
      return { key: 'building', label: 'Construction…', variant: 'info' };
    case 'completed':
      return { key: 'ready', label: 'Prête', variant: 'success' };
    case 'source_ready':
      return { key: 'source', label: 'Source prête', variant: 'neutral' };
    case 'failed':
      return { key: 'failed', label: 'Échec', variant: 'destructive' };
    case 'cleaned':
      return { key: 'cleaned', label: 'Nettoyée', variant: 'neutral' };
    default:
      return license.isActive
        ? { key: 'active', label: 'Active', variant: 'success' }
        : { key: 'inactive', label: 'Inactive', variant: 'neutral' };
  }
};

const creatorLabel = (project) => {
  const c = project.createdBy;
  if (!c || c === 'admin') return 'CarthaPos Admin';
  return c;
};

const toProject = (license) => ({
  id: license.id,
  licenseId: license.id,
  name: license.configuration?.businessName || license.client?.name || 'POS',
  sector: license.sector,
  clientName: license.client?.name || '—',
  modules: license.modules?.length || 0,
  createdAt: license.createdAt,
  version: license.configuration?.posConfigVersion ?? 1,
  status: getStatus(license),
  buildProjectPath: license.buildProjectPath || null,
  createdBy: license.createdBy || '',
  raw: license,
});

function localKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function PosProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [regenFlow, setRegenFlow] = useState(null);
  const [regenStepId, setRegenStepId] = useState(REGEN_STEPS[0].id);
  const [regenPct, setRegenPct] = useState(0);
  const [regenAction, setRegenAction] = useState('');
  const [regenError, setRegenError] = useState(null);
  const downloadLinkRef = useRef(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const licenses = await licenseService.getAllLicenses();
      const list = Array.isArray(licenses) ? licenses : [];
      setProjects(list.map(toProject));
    } catch (error) {
      console.error(error);
      toast.error('Impossible de charger les projets POS');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const creatorOptions = useMemo(() => {
    const seen = new Set(projects.map((p) => creatorLabel(p)).filter(Boolean));
    return ['all', ...[...seen].sort()];
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (
        q &&
        ![p.name, p.clientName, p.sector, p.raw.licenseKey]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      ) {
        return false;
      }
      if (creatorFilter !== 'all' && creatorLabel(p) !== creatorFilter) return false;
      const key = localKey(new Date(p.createdAt));
      if (dateFrom && key < dateFrom) return false;
      if (dateTo && key > dateTo) return false;
      return true;
    });
  }, [projects, query, creatorFilter, dateFrom, dateTo]);

  const resetFilters = () => {
    setQuery('');
    setCreatorFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const triggerDownload = (url) => {
    if (downloadLinkRef.current) {
      downloadLinkRef.current.href = url;
      downloadLinkRef.current.click();
    } else {
      window.open(url, '_blank');
    }
  };

  const runDownload = async (project) => {
    // Fast path: a ready build whose installer really exists.
    if (project.buildProjectPath && project.status.key === 'ready') {
      const fastUrl = posService.getDownloadUrl(project.buildProjectPath, project.licenseId);
      if (await posService.checkInstaller(fastUrl)) {
        triggerDownload(fastUrl);
        return;
      }
    }

    setRegenFlow({ licenseId: project.licenseId, name: project.name });
    setRegenError(null);
    setRegenPct(0);
    setRegenStepId(REGEN_STEPS[0].id);
    setRegenAction(REGEN_STEPS[0].label);

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const stage = [...REGEN_TIMING].reverse().find((s) => elapsed >= s.after);
      if (stage) {
        setRegenStepId(REGEN_STEPS[stage.idx].id);
        setRegenPct(stage.pct);
        setRegenAction(REGEN_STEPS[stage.idx].label);
      }
    }, 800);

    try {
      const result = await posService.generateAgain(project.licenseId);
      clearInterval(timer);

      const path = result?.path;
      if (!path) {
        setRegenError('Aucun exécutable généré');
        setTimeout(() => setRegenFlow(null), 3000);
        return;
      }

      const url = posService.getDownloadUrl(path, project.licenseId);
      if (!(await posService.checkInstaller(url))) {
        setRegenError(
          "La génération est terminée mais l'exécutable est introuvable (le build a échoué côté serveur). Réessayez dans quelques instants."
        );
        toast.error("Exécutable introuvable après génération");
        setTimeout(() => setRegenFlow(null), 4000);
        return;
      }

      setRegenStepId(REGEN_STEPS[3].id);
      setRegenPct(100);
      setRegenAction(REGEN_STEPS[3].label);
      setTimeout(() => {
        triggerDownload(url);
        toast.success('Téléchargement démarré');
        setRegenFlow(null);
        loadProjects();
      }, 700);
    } catch (error) {
      clearInterval(timer);
      setRegenError(error?.message || 'Erreur lors de la génération');
      setTimeout(() => setRegenFlow(null), 4000);
    }
  };

  const duplicate = async (project) => {
    setBusyId(project.licenseId);
    try {
      const raw = project.raw;
      const snapshot = raw.configuration?.rawConfig || {};
      await licenseService.createLicense({
        clientId: raw.clientId,
        sector: snapshot.sector || raw.sector,
        licenseType: snapshot.licenseType || raw.licenseType || 'LIFETIME',
        bindingType: snapshot.bindingType || raw.bindingType || 'MACHINE',
        expirationDate:
          (snapshot.licenseType === 'SUBSCRIPTION' && snapshot.expirationDate) || undefined,
        modules:
          snapshot.modules ||
          raw.modules?.map((m) => m.module?.id).filter(Boolean) ||
          [],
        configuration: snapshot.configuration || raw.configuration || {},
      });
      toast.success('Projet dupliqué');
      await loadProjects();
    } catch (error) {
      toast.error(error?.message || 'Erreur lors de la duplication');
    } finally {
      setBusyId(null);
    }
  };

  const openModify = (licenseId) => {
    setDetailsOpen(false);
    navigate(`/pos-generator?licenseId=${encodeURIComponent(licenseId)}`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projets POS"
        description="Tous les POS générés. Consultez, retéléchargez l'installateur, modifiez la configuration ou dupliquez un projet."
        actions={
          <Button onClick={() => navigate('/pos-generator')}>
            <Plus className="size-4" />
            Nouveau POS
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <Input
              placeholder="Rechercher par commerce, client, secteur ou clé…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-sm"
            />

            <Select value={creatorFilter} onValueChange={setCreatorFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Créé par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout créateur</SelectItem>
                {creatorOptions
                  .filter((c) => c !== 'all')
                  .map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="Date de début"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="date"
                aria-label="Date de fin"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>

            {(query ||
              creatorFilter !== 'all' ||
              dateFrom ||
              dateTo) && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Réinitialiser
              </Button>
            )}
          </div>

          {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

          {!loading && filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-border py-12 text-center">
              <Package className="mx-auto mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">
                {projects.length === 0 ? 'Aucun projet POS' : 'Aucun résultat'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {projects.length === 0
                  ? 'Les POS générés apparaîtront ici.'
                  : 'Ajustez votre recherche.'}
              </p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {project.name}
                      </h3>
                      <Badge variant={project.status.variant}>{project.status.label}</Badge>
                      {project.version > 1 && (
                        <Badge variant="neutral">v{project.version}</Badge>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 capitalize">
                        <Package className="size-3.5" />
                        {project.sector}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="size-3.5" />
                        {project.clientName}
                      </span>
                      <span>{project.modules} modules</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="size-3.5" />
                        Créé par {creatorLabel(project)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelected(project.raw);
                        setDetailsOpen(true);
                      }}
                    >
                      <Eye className="size-4" />
                      Détails
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === project.licenseId}
                      onClick={() => runDownload(project)}
                    >
                      <Download className="size-4" />
                      Télécharger
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === project.licenseId}
                      onClick={() => openModify(project.licenseId)}
                    >
                      <Settings2 className="size-4" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === project.licenseId}
                      onClick={() => duplicate(project)}
                    >
                      <Copy className="size-4" />
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails du projet</DialogTitle>
            <DialogDescription>Configuration enregistrée du POS.</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Commerce" value={selected.configuration?.businessName || selected.client?.name || '—'} />
                <Field label="Client" value={selected.client?.name || '—'} />
                <Field label="Secteur" value={selected.sector} className="capitalize" />
                <Field label="Statut" value={getStatus(selected).label} />
                <Field label="Version" value={`v${selected.configuration?.posConfigVersion ?? 1}`} />
                <Field label="Créé par" value={creatorLabel({ createdBy: selected.createdBy })} />
                <Field label="Créé le" value={new Date(selected.createdAt).toLocaleString()} />
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">Clé de licence</p>
                <code className="flex items-center gap-1.5 break-all rounded-md border border-border bg-muted/50 px-2.5 py-1.5 font-mono text-xs text-foreground">
                  <KeyRound className="size-3.5 shrink-0 text-muted-foreground" />
                  {selected.licenseKey}
                </code>
              </div>

              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">
                  Modules ({selected.modules?.length || 0})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(selected.modules || []).map((m) => (
                    <Badge key={m.id} variant="neutral">
                      {m.module?.displayName || m.module?.name || m.module?.id}
                    </Badge>
                  ))}
                  {(selected.modules || []).length === 0 && (
                    <span className="text-xs text-muted-foreground">Aucun module enregistré</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const p = projects.find((x) => x.licenseId === selected.id);
                    setDetailsOpen(false);
                    if (p) runDownload(p);
                  }}
                >
                  <Download className="size-4" />
                  Télécharger
                </Button>
                <Button variant="outline" size="sm" onClick={() => openModify(selected.id)}>
                  <Settings2 className="size-4" />
                  Modifier la configuration
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <a ref={downloadLinkRef} className="hidden" aria-hidden="true" tabIndex={-1} download>
        {' '}
      </a>

      <POSGenerationProgress
        isVisible={!!regenFlow}
        steps={REGEN_STEPS}
        activeStepId={regenStepId}
        progress={regenPct}
        currentAction={regenAction}
        error={regenError}
      />
    </div>
  );
}

function Field({ label, value, className = '' }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-medium text-foreground ${className}`}>{value}</p>
    </div>
  );
}
