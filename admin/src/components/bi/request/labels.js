import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  CircleAlert,
  Database,
  FileArchive,
  FileText,
  LayoutDashboard,
  MessageCircleQuestion,
  Rocket,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

export const PAYMENT_LABELS = {
  NOT_REQUIRED: 'Non requis',
  PENDING: 'En attente',
  VERIFIED: 'Vérifié',
  REJECTED: 'Refusé',
};

export const EVENT_LABELS = {
  REQUEST_CREATED: 'Demande envoyée',
  ZIP_UPLOADED: 'Données téléversées',
  ZIP_VALIDATED: 'Données validées',
  ZIP_INVALID: 'Données invalides',
  PAYMENT_VERIFIED: 'Paiement vérifié',
  PAYMENT_REJECTED: 'Paiement refusé',
  REQUEST_APPROVED: 'Demande approuvée',
  REQUEST_REJECTED: 'Demande refusée',
  REQUEST_INFO_REQUESTED: 'Infos complémentaires demandées',
  REQUEST_CANCELLED: 'Demande annulée',
  ETL_STARTED: 'ETL démarré',
  ETL_COMPLETED: 'ETL terminé',
  ETL_FAILED: 'ETL en échec',
  DASHBOARD_GENERATED: 'Dashboard préparé',
  DASHBOARD_PUBLISHED: 'Dashboard publié',
  REQUEST_COMPLETED: 'Demande terminée',
};

export const EVENT_STYLE = {
  REQUEST_CREATED: { icon: FileText, classes: 'bg-blue-100 text-blue-700' },
  ZIP_UPLOADED: { icon: FileArchive, classes: 'bg-amber-100 text-amber-700' },
  ZIP_VALIDATED: { icon: BadgeCheck, classes: 'bg-green-100 text-green-700' },
  ZIP_INVALID: { icon: AlertTriangle, classes: 'bg-red-100 text-red-700' },
  PAYMENT_VERIFIED: { icon: ShieldCheck, classes: 'bg-green-100 text-green-700' },
  PAYMENT_REJECTED: { icon: XCircle, classes: 'bg-red-100 text-red-700' },
  REQUEST_APPROVED: { icon: BadgeCheck, classes: 'bg-blue-100 text-blue-700' },
  REQUEST_REJECTED: { icon: XCircle, classes: 'bg-red-100 text-red-700' },
  REQUEST_INFO_REQUESTED: { icon: MessageCircleQuestion, classes: 'bg-amber-100 text-amber-700' },
  REQUEST_CANCELLED: { icon: Ban, classes: 'bg-red-100 text-red-700' },
  ETL_STARTED: { icon: Database, classes: 'bg-amber-100 text-amber-700' },
  ETL_COMPLETED: { icon: Database, classes: 'bg-green-100 text-green-700' },
  ETL_FAILED: { icon: CircleAlert, classes: 'bg-red-100 text-red-700' },
  DASHBOARD_GENERATED: { icon: LayoutDashboard, classes: 'bg-blue-100 text-blue-700' },
  DASHBOARD_PUBLISHED: { icon: Rocket, classes: 'bg-green-100 text-green-700' },
  REQUEST_COMPLETED: { icon: CheckCircle2, classes: 'bg-green-100 text-green-700' },
};

export const EVENT_ERRORS = ['ZIP_INVALID', 'ETL_FAILED', 'REQUEST_REJECTED', 'PAYMENT_REJECTED', 'REQUEST_CANCELLED'];

export const JOB_STATUS_LABELS = {
  QUEUED: 'En file',
  PROCESSING: 'En traitement',
  COMPLETED: 'Terminé',
  FAILED: 'Échec',
};

export function jobStatusLabel(status) {
  return JOB_STATUS_LABELS[status] || status || '—';
}

export function jobStatusClass(status) {
  if (status === 'COMPLETED') return 'bg-green-100 text-green-700';
  if (status === 'FAILED') return 'bg-red-100 text-red-700';
  if (status === 'PROCESSING' || status === 'QUEUED') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-700';
}
