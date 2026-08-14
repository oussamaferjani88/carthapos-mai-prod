import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  FileText,
  LayoutDashboard,
  Sparkles,
  Timer,
  WandSparkles,
  History,
  Layers,
  RefreshCw,
  SearchX,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import KpiCard from '../pages/analytics/components/KpiCard';
import ChartCard from '../pages/analytics/components/ChartCard';
import { fmtDuration, COLORS, PIE_COLORS } from '../lib/analytics';
import api from '../lib/api';

const REQUEST_STATUS_LABELS = {
  PENDING_REVIEW: 'En attente',
  REQUEST_INFO: 'Infos requises',
  APPROVED: 'Approuvée',
  PROCESSING_ETL: 'ETL en cours',
  DATA_REVIEW: 'Révision des données',
  GENERATING_DASHBOARD: 'Génération',
  READY_FOR_REVIEW: 'Prêt à réviser',
  PUBLISHED: 'Publié',
  COMPLETED: 'Terminée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
};

const DASHBOARD_STATUS_LABELS = {
  GENERATING: 'Génération',
  DRAFT: 'Brouillon',
  IN_PROGRESS: 'En cours',
  READY_FOR_REVIEW: 'Prêt à réviser',
  PUBLISHED: 'Publié',
  SUPERSEDED: 'Remplacé',
  ARCHIVED: 'Archivé',
  FAILED: 'Échec',
};

const UPLOAD_STATUS_LABELS = {
  UPLOADED: 'Déposé',
  VALIDATING: 'Validation',
  PROCESSING: 'Traitement',
  COMPLETED: 'Terminé',
  FAILED: 'Échec',
  CANCELLED: 'Annulé',
};

const CATEGORY_LABELS = {
  REQUEST: 'Demande',
  DASHBOARD: 'Dashboard',
  PAYMENT: 'Paiement',
  VALIDATION: 'Validation',
  SYSTEM: 'Système',
};

function mapToChart(map, labels) {
  return Object.entries(map || {})
    .map(([key, value]) => ({ name: labels?.[key] || key, value: typeof value === 'number' ? value : 0 }))
    .sort((a, b) => b.value - a.value);
}

function EmptyChart({ height = 240 }) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ height }}>
      <SearchX className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
    </div>
  );
}

export default function BiStatsSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bi/stats');
      setData(res.data?.data || null);
    } catch (error) {
      console.error(error);
      toast.error('Impossible de charger les statistiques BI');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const requests = data?.requests || {};
  const dashboards = data?.dashboards || {};
  const uploads = data?.uploads || {};
  const notifications = data?.notifications || {};
  const durations = data?.durations || {};
  const templates = typeof data?.templates === 'number' ? data.templates : 0;
  const multiVersionCount = typeof dashboards.multiVersionCount === 'number' ? dashboards.multiVersionCount : 0;

  const requestsData = mapToChart(requests.byStatus, REQUEST_STATUS_LABELS);
  const businessData = mapToChart(data?.requestsByBusinessType, null);
  const dashboardsData = mapToChart(dashboards.byStatus, DASHBOARD_STATUS_LABELS);
  const uploadsData = mapToChart(uploads.byStatus, UPLOAD_STATUS_LABELS);
  const notificationsData = mapToChart(notifications.byCategory, CATEGORY_LABELS);

  const durationsData = [
    { name: 'ETL', label: 'ETL', seconds: durations.avgEtlSec || 0 },
    { name: 'Génération', label: 'Génération', seconds: durations.avgGenerationSec || 0 },
    { name: 'Demande complète', label: 'Demande complète', seconds: durations.avgRequestDurationSec || 0 },
  ].filter((d) => d.seconds > 0);

  const kpis = [
    { key: 'requests', label: 'Demandes', value: requests.total ?? '—', icon: FileText, color: '#8b5cf6', sub: `${Object.keys(requests.byStatus || {}).length} statuts` },
    { key: 'dashboards', label: 'Dashboards', value: dashboards.total ?? '—', icon: LayoutDashboard, color: '#06b6d4', sub: `${multiVersionCount} multi-versions` },
    { key: 'templates', label: 'Templates', value: templates || '—', icon: Sparkles, color: '#f59e0b' },
    { key: 'etl', label: 'ETL moyen', value: fmtDuration(durations.avgEtlSec), icon: Timer, color: '#10b981' },
    { key: 'generation', label: 'Génération moyenne', value: fmtDuration(durations.avgGenerationSec), icon: WandSparkles, color: '#ec4899' },
    { key: 'duration', label: 'Durée demande', value: fmtDuration(durations.avgRequestDurationSec), icon: History, color: '#6366f1' },
    { key: 'multiversion', label: 'Dashboards multi-versions', value: multiVersionCount || '—', icon: Layers, color: '#84cc16' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Statistiques BI</h2>
          <p className="text-muted-foreground">Vue d'ensemble de l'activité BI : demandes, dashboards, uploads et notifications.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-[280px] w-full rounded-lg" />
            <Skeleton className="h-[280px] w-full rounded-lg" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
            {kpis.map((k, i) => (
              <KpiCard key={k.key} label={k.label} value={k.value} icon={k.icon} color={k.color} sub={k.sub} delay={i * 0.04} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Demandes par statut" description="Répartition des demandes BI" loading={false}>
              {requestsData.length ? (
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={requestsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.2} vertical={false} />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={32} />
                      <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }} />
                      <Bar dataKey="value" name="Demandes" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard title="Demandes par type d'activité" description="Répartition par activité" loading={false}>
              {businessData.length ? (
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={businessData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} strokeWidth={0} label={(entry) => `${entry.name} (${entry.value})`}>
                        {businessData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard title="Dashboards par statut" description="Répartition des dashboards générés" loading={false}>
              {dashboardsData.length ? (
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.2} vertical={false} />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={32} />
                      <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }} />
                      <Bar dataKey="value" name="Dashboards" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard title="Uploads par statut" description="Répartition des imports de données" loading={false}>
              {uploadsData.length ? (
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={uploadsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.2} vertical={false} />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={32} />
                      <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }} />
                      <Bar dataKey="value" name="Uploads" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard title="Notifications par catégorie" description="Répartition des notifications" loading={false}>
              {notificationsData.length ? (
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={notificationsData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} strokeWidth={0} label={(entry) => `${entry.name} (${entry.value})`}>
                        {notificationsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard title="Durées moyennes" description="Temps moyens ETL, génération et demande complète (secondes)" loading={false}>
              {durationsData.length ? (
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={durationsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="durGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.2} vertical={false} />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={32} />
                      <Tooltip formatter={(value) => fmtDuration(value)} />
                      <Area type="monotone" dataKey="seconds" name="Durée moyenne" stroke="#10b981" strokeWidth={2.5} fill="url(#durGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
