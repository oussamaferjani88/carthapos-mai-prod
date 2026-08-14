import {
  BadgeCheck,
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  Coffee,
  Croissant,
  Database,
  Eye,
  FileText,
  Hotel,
  LayoutDashboard,
  MessageCircleQuestion,
  Pill,
  Rocket,
  Scissors,
  Store,
  Utensils,
  WandSparkles,
  XCircle,
} from 'lucide-react';

export const STATUS_OPTIONS = [
  'PENDING_REVIEW',
  'REQUEST_INFO',
  'APPROVED',
  'PROCESSING_ETL',
  'DATA_REVIEW',
  'GENERATING_DASHBOARD',
  'READY_FOR_REVIEW',
  'PUBLISHED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

export const STATUS_LABELS = {
  PENDING_REVIEW: 'En attente',
  REQUEST_INFO: 'Infos requises',
  APPROVED: 'Approuvée',
  PROCESSING_ETL: 'Traitement des données',
  DATA_REVIEW: 'Révision des données',
  GENERATING_DASHBOARD: 'Génération du dashboard',
  READY_FOR_REVIEW: 'Dashboard prêt',
  PUBLISHED: 'Publié',
  COMPLETED: 'Terminée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || '—';
}

const STATUS_META = {
  PENDING_REVIEW: { icon: Clock, className: 'bg-amber-100 text-amber-700' },
  REQUEST_INFO: { icon: MessageCircleQuestion, className: 'bg-amber-100 text-amber-700' },
  APPROVED: { icon: BadgeCheck, className: 'bg-blue-100 text-blue-700' },
  PROCESSING_ETL: { icon: Database, className: 'bg-purple-100 text-purple-700' },
  DATA_REVIEW: { icon: Eye, className: 'bg-purple-100 text-purple-700' },
  GENERATING_DASHBOARD: { icon: WandSparkles, className: 'bg-purple-100 text-purple-700' },
  READY_FOR_REVIEW: { icon: LayoutDashboard, className: 'bg-blue-100 text-blue-700' },
  PUBLISHED: { icon: Rocket, className: 'bg-green-100 text-green-700' },
  COMPLETED: { icon: CheckCircle2, className: 'bg-green-100 text-green-700' },
  REJECTED: { icon: XCircle, className: 'bg-red-100 text-red-700' },
  CANCELLED: { icon: Ban, className: 'bg-red-100 text-red-700' },
};

export function statusMeta(status) {
  return STATUS_META[status] || { icon: Clock, className: 'bg-gray-100 text-gray-700' };
}

export function statusClass(status) {
  return statusMeta(status).className;
}

export const PAYMENT_STATUS_LABELS = {
  NOT_REQUIRED: 'Non requis',
  PENDING: 'En attente',
  VERIFIED: 'Vérifié',
  REJECTED: 'Refusé',
};

export function paymentStatusLabel(paymentStatus) {
  return PAYMENT_STATUS_LABELS[paymentStatus] || paymentStatus || '—';
}

export function paymentStatusClass(paymentStatus) {
  if (paymentStatus === 'VERIFIED') return 'bg-green-100 text-green-700';
  if (paymentStatus === 'REJECTED') return 'bg-red-100 text-red-700';
  if (paymentStatus === 'PENDING') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
}

export const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'bakery', label: 'Boulangerie' },
  { value: 'retail', label: 'Commerce' },
  { value: 'salon', label: 'Salon' },
  { value: 'pharmacy', label: 'Pharmacie' },
  { value: 'hotel', label: 'Hôtel' },
];

const BUSINESS_TYPE_ICONS = {
  restaurant: Utensils,
  cafe: Coffee,
  bakery: Croissant,
  retail: Store,
  salon: Scissors,
  pharmacy: Pill,
  hotel: Hotel,
};

export function businessTypeInfo(businessType) {
  const found = BUSINESS_TYPES.find((bt) => bt.value === businessType);
  const Icon = BUSINESS_TYPE_ICONS[businessType] || Building2;
  return {
    icon: Icon,
    label: found?.label || businessType || '—',
    color: 'bg-indigo-100 text-indigo-700',
  };
}

export const UPLOAD_STATUS_LABELS = {
  UPLOADED: 'Téléversé',
  PENDING_PAYMENT_VERIFICATION: 'Paiement à vérifier',
  VALIDATING: 'Validation en cours',
  VALIDATED: 'Validé',
  PROCESSING: 'En traitement',
  QUEUED: 'En file',
  COMPLETED: 'Terminé',
  FAILED: 'Échec',
};

export function uploadStatusLabel(status) {
  return UPLOAD_STATUS_LABELS[status] || status || '—';
}

export function uploadStatusClass(status) {
  if (status === 'COMPLETED' || status === 'VALIDATED') return 'bg-green-100 text-green-700';
  if (status === 'FAILED') return 'bg-red-100 text-red-700';
  if (status === 'VALIDATING' || status === 'PROCESSING' || status === 'QUEUED') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-700';
}

export const DASHBOARD_STATUS_LABELS = {
  DRAFT: 'Brouillon',
  GENERATING: 'Génération…',
  READY_FOR_REVIEW: 'Prêt',
  PUBLISHED: 'Publié',
  FAILED: 'Échec',
};

export function dashboardStatusLabel(status) {
  return DASHBOARD_STATUS_LABELS[status] || status || '—';
}

export const WORKFLOW_STEPS = [
  { step: 1, key: 'REQUEST_CREATED', label: 'Demande envoyée', icon: FileText },
  { step: 2, key: 'APPROVED', label: 'Approuvée', icon: BadgeCheck },
  { step: 3, key: 'PROCESSING_ETL', label: 'Traitement des données', icon: Database },
  { step: 4, key: 'DATA_REVIEW', label: 'Révision des données', icon: Eye },
  { step: 5, key: 'GENERATING_DASHBOARD', label: 'Génération du dashboard', icon: WandSparkles },
  { step: 6, key: 'READY_FOR_REVIEW', label: 'Dashboard prêt', icon: LayoutDashboard },
  { step: 7, key: 'PUBLISHED', label: 'Publié', icon: Rocket },
];

export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR');
}

export function fmtBytes(value) {
  if (!value || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
