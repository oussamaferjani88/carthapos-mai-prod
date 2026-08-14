import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  LayoutDashboard,
  MessageCircleQuestion,
  RefreshCw,
  Rocket,
  WandSparkles,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import RequestHeader from '../components/bi/request/RequestHeader';
import RequestWorkflow from '../components/bi/request/RequestWorkflow';
import RequestWorkspace from '../components/bi/request/RequestWorkspace';
import RequestSidebar from '../components/bi/request/RequestSidebar';
import RequestDataSource from '../components/bi/request/RequestDataSource';
import RequestHistory from '../components/bi/request/RequestHistory';
import { EVENT_ERRORS } from '../components/bi/request/labels';
import api from '../lib/api';
import { businessTypeInfo } from '../lib/bi-labels';

export default function AdminRequestDetail() {
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await api.get(`/bi-requests/${id}`);
      const req = res.data;
      setRequest(req);
      setAdminNotes(req?.adminNotes || '');
    } catch (error) {
      console.error(error);
      setLoadError(true);
      toast.error('Impossible de charger la demande');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const status = request?.status;
  useEffect(() => {
    if (!status) return;
    const active = ['PROCESSING_ETL', 'DATA_REVIEW', 'GENERATING_DASHBOARD'].includes(status);
    if (!active) return;
    const interval = setInterval(load, 6000);
    return () => clearInterval(interval);
  }, [status, load]);

  const run = async (key, fn) => {
    setActionLoading(key);
    try {
      await fn();
      toast.success('Action effectuée');
      await load();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.response?.data?.error || "Échec de l'action");
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (loadError && !request) {
    return (
      <div className="space-y-4">
        <Link
          to="/bi-requests"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux demandes
        </Link>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Impossible de charger la demande</AlertTitle>
          <AlertDescription>
            Une erreur est survenue lors de la récupération des données. Vérifiez votre connexion puis réessayez.
            <Button variant="outline" size="sm" className="mt-2" onClick={load}>
              <RefreshCw className="h-3.5 w-3.5" /> Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!request) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">Demande introuvable.</p>
        <Link to="/bi-requests" className="text-sm text-primary hover:underline">
          ← Retour
        </Link>
      </div>
    );
  }

  const upload = request.uploads?.[0] || null;
  const dashboard = request.dashboards?.[0] || null;
  const currentStep = request.currentStep || 0;
  const progress = request.progressPercent || 0;
  const info = businessTypeInfo(request.businessType);

  let daysElapsed = null;
  if (request.createdAt) {
    const created = new Date(request.createdAt);
    if (!isNaN(created.getTime())) {
      daysElapsed = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000));
    }
  }

  const paymentOk = ['VERIFIED', 'NOT_REQUIRED'].includes(request.paymentStatus);
  const canVerifyPayment = request.paymentStatus === 'PENDING';
  const canApprove = ['PENDING_REVIEW', 'REQUEST_INFO'].includes(request.status) && paymentOk;
  const canRunEtl =
    request.status === 'APPROVED' && !!upload && !['COMPLETED', 'VALIDATING', 'PROCESSING'].includes(upload.status);
  const canGenerate = request.status === 'DATA_REVIEW' && !!upload && upload.status === 'COMPLETED';
  const canPreview = !!dashboard && ['DRAFT', 'READY_FOR_REVIEW'].includes(dashboard.status);
  const canPublish = !!dashboard && ['DRAFT', 'READY_FOR_REVIEW'].includes(dashboard.status);
  const canReject = !['REJECTED', 'CANCELLED', 'COMPLETED'].includes(request.status);
  const canRequestInfo = request.status === 'PENDING_REVIEW';

  const isEtlProcessing =
    request.status === 'PROCESSING_ETL' ||
    (request.status === 'APPROVED' && !!upload && !['COMPLETED', 'FAILED'].includes(upload.status));
  const workflowStep = isEtlProcessing ? 3 : currentStep;
  const hasError = (request.events || []).some((ev) => EVENT_ERRORS.includes(ev.type));

  const onVerifyPayment = () =>
    run('payment', () =>
      api.patch(`/bi-requests/${id}/payment`, {
        paymentStatus: 'VERIFIED',
        paymentMethod: paymentMethod || null,
      }),
    );
  const onRequestInfo = () => run('info', () => api.patch(`/bi-requests/${id}/request-info`, { adminNotes }));
  const onApprove = () => run('approve', () => api.patch(`/bi-requests/${id}/approve`, { adminNotes }));
  const onReject = () => {
    if (!window.confirm('Rejeter cette demande ?')) return;
    run('reject', () => api.patch(`/bi-requests/${id}/reject`, { adminNotes }));
  };
  const onGenerate = () =>
    run('generate', () => api.post('/bi/dashboards/generate-from-upload', { uploadId: upload.id }));
  const onPublish = () => run('publish', () => api.post(`/bi/dashboards/${dashboard.id}/publish`));
  const onSaveNotes = () => run('notes', () => api.patch(`/bi-requests/${id}/status`, { adminNotes }));

  const actions = [
    { key: 'payment', label: 'Vérifier le paiement', icon: Check, disabled: !canVerifyPayment, onClick: onVerifyPayment },
    { key: 'info', label: 'Demander des informations', icon: MessageCircleQuestion, disabled: !canRequestInfo, onClick: onRequestInfo },
    { key: 'approve', label: 'Approuver', icon: Check, disabled: !canApprove, onClick: onApprove },
    { key: 'generate', label: 'Préparer le dashboard', icon: WandSparkles, disabled: !canGenerate, onClick: onGenerate },
    { key: 'preview', label: 'Prévisualiser', icon: LayoutDashboard, disabled: !canPreview, link: dashboard ? `/bi-dashboard/${dashboard.id}` : null },
    { key: 'publish', label: 'Publier le dashboard', icon: Rocket, disabled: !canPublish, onClick: onPublish },
    { key: 'reject', label: 'Rejeter la demande', icon: Ban, destructive: true, disabled: !canReject, onClick: onReject },
  ];

  return (
    <div className="space-y-5">
      <RequestHeader request={request} info={info} actions={actions} onRefresh={load} actionLoading={actionLoading} />

      <RequestWorkflow
        currentStep={workflowStep}
        isError={['REJECTED', 'CANCELLED'].includes(request.status)}
        hasError={hasError}
        status={request.status}
      />

      <RequestWorkspace
        request={request}
        upload={upload}
        dashboard={dashboard}
        canRunEtl={canRunEtl}
        canVerifyPayment={canVerifyPayment}
        canApprove={canApprove}
        canGenerate={canGenerate}
        canPreview={canPreview}
        canPublish={canPublish}
        canRequestInfo={canRequestInfo}
        canReject={canReject}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onVerifyPayment={onVerifyPayment}
        onApprove={onApprove}
        onRequestInfo={onRequestInfo}
        onReject={onReject}
        onGenerate={onGenerate}
        onPublish={onPublish}
        onRefresh={load}
        actionLoading={actionLoading}
      />

      {!isEtlProcessing &&
        (request.status === 'DATA_REVIEW' ? (
          <RequestDataSource uploads={request.uploads} />
        ) : request.status === 'READY_FOR_REVIEW' ? null : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="min-w-0 space-y-5 lg:col-span-2">
              <RequestDataSource uploads={request.uploads} />
              <RequestHistory events={request.events} />
            </div>
            <div className="lg:self-start lg:sticky lg:top-4">
              <RequestSidebar
                request={request}
                progress={progress}
                daysElapsed={daysElapsed}
                adminNotes={adminNotes}
                onNotesChange={setAdminNotes}
                onSaveNotes={onSaveNotes}
                actionLoading={actionLoading}
              />
            </div>
          </div>
        ))}
    </div>
  );
}
