import { Link } from 'react-router-dom';
import {
  Ban,
  BadgeCheck,
  Check,
  CheckCircle2,
  CircleAlert,
  Database,
  Eye,
  LayoutDashboard,
  Loader2,
  MessageCircleQuestion,
  RefreshCw,
  Rocket,
  WandSparkles,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import EtlStepsWorkflow from '../EtlStepsWorkflow';
import { cn } from '../../../lib/utils';
import { fmtDate, statusLabel, uploadStatusLabel } from '../../../lib/bi-labels';
import { jobStatusLabel } from './labels';

const PROCESS_PHASES = [
  { label: 'Validation', hint: 'Analyse du fichier source et contrôle du schéma' },
  { label: 'Préparation', hint: 'Détection et correction des données' },
  { label: 'Transformation', hint: 'Construction du modèle dimensionnel' },
  { label: 'Chargement', hint: 'Écriture dans l’entrepôt' },
];

function EtlProcessingPanel({ upload, onRefresh }) {
  const job = upload?.processingJob;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-muted-foreground" /> Traitement des données
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <Loader2 className="h-6 w-6 shrink-0 animate-spin text-blue-700" />
          <div>
            <p className="text-sm font-medium text-blue-900">Le pipeline traite les données en arrière-plan</p>
            <p className="mt-0.5 text-xs text-blue-700">
              {job?.status
                ? `Statut du job : ${jobStatusLabel(job.status)}`
                : 'Validation et préparation des données en cours.'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {PROCESS_PHASES.map((p, idx) => (
            <div key={p.label} className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                  idx === 0 && 'bg-green-100 text-green-700',
                  idx === 1 && 'bg-blue-100 text-blue-700',
                  idx > 1 && 'bg-muted text-muted-foreground',
                )}
              >
                {idx === 0 ? <Check className="h-3.5 w-3.5" /> : idx === 1 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : idx + 1}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{p.label}</p>
                <p className="truncate text-xs text-muted-foreground">{p.hint}</p>
              </div>
              {idx === 1 && <span className="ml-auto text-xs font-medium text-blue-700">En cours…</span>}
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Actualiser
        </Button>
      </CardContent>
    </Card>
  );
}

function EtlWorkspace({ request, upload, canRunEtl, onRefresh }) {
  if (!upload) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-muted-foreground" /> Traitement des données (ETL)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune donnée importée pour le moment.</p>
        </CardContent>
      </Card>
    );
  }

  const running =
    ['VALIDATING', 'PROCESSING'].includes(upload.status) ||
    ['QUEUED', 'RUNNING', 'PROCESSING'].includes(upload.processingJob?.status);

  if (running || request.status === 'PROCESSING_ETL') {
    return <EtlProcessingPanel upload={upload} onRefresh={onRefresh} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-muted-foreground" /> Traitement des données (ETL)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <EtlStepsWorkflow upload={upload} enabled={canRunEtl} onRefresh={onRefresh} />
      </CardContent>
    </Card>
  );
}

function ReviewRequestWorkspace({
  canVerifyPayment,
  canApprove,
  canRequestInfo,
  canReject,
  paymentMethod,
  onPaymentMethodChange,
  onVerifyPayment,
  onApprove,
  onRequestInfo,
  onReject,
  actionLoading,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BadgeCheck className="h-4 w-4 text-muted-foreground" /> Révision de la demande
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {canVerifyPayment && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-2 text-sm font-medium">Vérification du paiement</p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="payment-method">
                  Méthode de paiement
                </label>
                <Input
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(e) => onPaymentMethodChange(e.target.value)}
                  placeholder="Ex : Virement bancaire"
                  className="bg-background"
                />
              </div>
              <Button onClick={onVerifyPayment} disabled={!!actionLoading}>
                {actionLoading === 'payment' ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Vérifier le paiement
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {canApprove && (
            <Button onClick={onApprove} disabled={!!actionLoading}>
              {actionLoading === 'approve' ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Approuver la demande
            </Button>
          )}
          {canRequestInfo && (
            <Button variant="outline" onClick={onRequestInfo} disabled={!!actionLoading}>
              <MessageCircleQuestion className="h-4 w-4 mr-1" /> Demander des informations
            </Button>
          )}
          {canReject && (
            <Button variant="destructive" onClick={onReject} disabled={!!actionLoading}>
              <Ban className="h-4 w-4 mr-1" /> Rejeter
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DataReviewWorkspace({ upload, canGenerate, onGenerate, actionLoading }) {
  const job = upload?.processingJob;
  const records = job?.recordsLoaded || upload?.totalRows || 0;
  const elapsed =
    job?.startedAt && job?.completedAt
      ? `${((new Date(job.completedAt) - new Date(job.startedAt)) / 1000).toFixed(1)}s`
      : null;
  const stats = [
    { label: 'Enregistrements chargés', value: records ? records.toLocaleString('fr-FR') : '—' },
    { label: 'Statut du fichier', value: upload ? uploadStatusLabel(upload.status) : '—' },
    { label: 'Téléversé le', value: upload?.createdAt ? fmtDate(upload.createdAt) : '—' },
    { label: 'Durée du traitement', value: elapsed || '—' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4 text-muted-foreground" /> Révision des données
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50/50 p-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">Données chargées dans l’entrepôt</p>
            <p className="mt-0.5 text-xs text-green-700">
              Le traitement ETL est terminé. Les données validées et préparées sont prêtes pour la génération du
              dashboard.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border p-3">
              <p className="text-lg font-bold leading-tight">{s.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {canGenerate && (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onGenerate} disabled={!!actionLoading}>
              {actionLoading === 'generate' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <WandSparkles className="h-4 w-4 mr-2" />
              )}
              Préparer le dashboard
            </Button>
            <span className="text-xs text-muted-foreground">
              Les données sont prêtes — générez maintenant le tableau de bord.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GeneratingWorkspace() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <WandSparkles className="h-4 w-4 text-muted-foreground" /> Préparation du dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <Loader2 className="h-6 w-6 shrink-0 animate-spin text-blue-700" />
          <div>
            <p className="text-sm font-medium text-blue-900">Le dashboard est en cours de génération</p>
            <p className="mt-0.5 text-xs text-blue-700">Cette page se rafraîchit automatiquement.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardReviewWorkspace({ dashboard, canPreview, canPublish, onPublish, actionLoading }) {
  if (!dashboard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> Révision du dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun dashboard disponible.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> Révision du dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{dashboard.name}</p>
            <p className="text-xs text-muted-foreground">
              Version {dashboard.version} ·{' '}
              {dashboard.status === 'READY_FOR_REVIEW' ? 'Prêt à être révisé' : dashboard.status}
              {dashboard.templateUsed ? ` · Template : ${dashboard.templateUsed}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to={`/bi-dashboard/${dashboard.id}`}>
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-1" /> Prévisualiser
            </Button>
          </Link>
          {canPreview && (
            <Link to={`/bi-dashboard/${dashboard.id}/assign`}>
              <Button variant="outline">
                <LayoutDashboard className="h-4 w-4 mr-1" /> Provisionner le dashboard client
              </Button>
            </Link>
          )}
          {canPublish && (
            <Button onClick={onPublish} disabled={!!actionLoading}>
              {actionLoading === 'publish' ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4 mr-1" />
              )}
              Publier le dashboard
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PublishedWorkspace({ dashboard }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Rocket className="h-4 w-4 text-muted-foreground" /> Dashboard publié
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-green-200 bg-green-50/50 p-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-green-800">Le dashboard est en ligne</p>
            {dashboard && (
              <p className="mt-0.5 text-xs text-green-700">
                {dashboard.name} · Version {dashboard.version}
              </p>
            )}
          </div>
          {dashboard && (
            <Link className="ml-auto" to={`/bi-dashboard/${dashboard.id}`}>
              <Button variant="outline">
                <LayoutDashboard className="h-4 w-4 mr-1" /> Voir le dashboard
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TerminalWorkspace({ status }) {
  const isError = status === 'REJECTED' || status === 'CANCELLED';
  const message =
    status === 'REJECTED'
      ? 'Cette demande a été refusée.'
      : status === 'CANCELLED'
        ? 'Cette demande a été annulée.'
        : 'Cette demande est terminée.';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {isError ? (
            <CircleAlert className="h-4 w-4 text-red-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          Demande terminée
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn('text-sm', isError ? 'text-red-600' : 'text-muted-foreground')}>
          {message} Statut : {statusLabel(status)}.
        </p>
      </CardContent>
    </Card>
  );
}

export default function RequestWorkspace({
  request,
  upload,
  dashboard,
  canRunEtl,
  canVerifyPayment,
  canApprove,
  canGenerate,
  canPreview,
  canPublish,
  canRequestInfo,
  canReject,
  paymentMethod,
  onPaymentMethodChange,
  onVerifyPayment,
  onApprove,
  onRequestInfo,
  onReject,
  onGenerate,
  onPublish,
  onRefresh,
  actionLoading,
}) {
  const status = request.status;

  switch (status) {
    case 'APPROVED':
    case 'PROCESSING_ETL':
      return <EtlWorkspace request={request} upload={upload} canRunEtl={canRunEtl} onRefresh={onRefresh} />;
    case 'PENDING_REVIEW':
    case 'REQUEST_INFO':
      return (
        <ReviewRequestWorkspace
          canVerifyPayment={canVerifyPayment}
          canApprove={canApprove}
          canRequestInfo={canRequestInfo}
          canReject={canReject}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={onPaymentMethodChange}
          onVerifyPayment={onVerifyPayment}
          onApprove={onApprove}
          onRequestInfo={onRequestInfo}
          onReject={onReject}
          actionLoading={actionLoading}
        />
      );
    case 'DATA_REVIEW':
      return (
        <DataReviewWorkspace
          upload={upload}
          canGenerate={canGenerate}
          onGenerate={onGenerate}
          actionLoading={actionLoading}
        />
      );
    case 'GENERATING_DASHBOARD':
      return <GeneratingWorkspace />;
    case 'READY_FOR_REVIEW':
      return (
        <DashboardReviewWorkspace
          dashboard={dashboard}
          canPreview={canPreview}
          canPublish={canPublish}
          onPublish={onPublish}
          actionLoading={actionLoading}
        />
      );
    case 'PUBLISHED':
      return <PublishedWorkspace dashboard={dashboard} />;
    case 'COMPLETED':
    case 'REJECTED':
    case 'CANCELLED':
      return <TerminalWorkspace status={status} />;
    default:
      return null;
  }
}
