import { getToken, getAuthUser, getAuthClient, clearAuth } from "@/lib/auth";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

export type PortalUser = {
  id?: string;
  name?: string;
  email?: string;
  companyName?: string;
};

export function getStoredUser(): PortalUser | null {
  try {
    const authUser = getAuthUser();
    const authClient = getAuthClient();
    if (authUser || authClient) {
      return {
        id: authClient?.id || authUser?.id,
        name: authClient?.name || authUser?.username,
        email: authClient?.email || authUser?.email,
        companyName: authClient?.name || undefined,
      };
    }

    const local = localStorage.getItem("user");
    if (local) return JSON.parse(local);

    const session = sessionStorage.getItem("user");
    if (session) return JSON.parse(session);
  } catch (error) {
    console.warn("Unable to parse stored user", error);
  }
  return null;
}

/**
 * Identity for client-scoped requests. The authenticated client (resolved
 * from the JWT by the backend) is the single source of truth. The AccessMode
 * `currentUserId` is only used for explicit access-mode testing URLs.
 */
export function getIdentityUserId(): string | null {
  const accessMode = localStorage.getItem("accessMode");
  const currentUserId = localStorage.getItem("currentUserId");
  if (accessMode === "user" && currentUserId) return currentUserId;

  const authClient = getAuthClient();
  if (authClient?.id) return authClient.id;

  const authUser = getAuthUser();
  if (authUser?.id) return authUser.id;

  return null;
}

export async function biFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // AccessMode testing override — only sent when explicitly activated via URL params.
  const accessMode = localStorage.getItem("accessMode");
  const currentUserId = localStorage.getItem("currentUserId");
  if (accessMode === "user" && currentUserId) {
    headers.set("X-User-Id", currentUserId);
    headers.set("X-Access-Mode", "user");
  }

  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

/**
 * Resolve the authenticated client's real client id for query params.
 * Prefers the authenticated client; falls back to AccessMode identity.
 */
export async function resolveClientId(): Promise<string | null> {
  const accessMode = localStorage.getItem("accessMode");
  const currentUserId = localStorage.getItem("currentUserId");
  if (accessMode === "user" && currentUserId) return currentUserId;

  const authClient = getAuthClient();
  if (authClient?.id) return authClient.id;

  const authUser = getAuthUser();
  if (authUser?.id) return authUser.id;

  return null;
}

export { clearAuth };

export type BiRequest = {
  id: string;
  clientId: string | null;
  licenseId: string | null;
  businessType: string;
  businessName: string;
  dashboardTemplate: string | null;
  message: string;
  objectives: string[] | null;
  kpis: string[] | null;
  dashboardRequirements: string | null;
  specialistNotes: string | null;
  adminNotes: string | null;
  status: string;
  paymentRequired: boolean;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentNotes: string | null;
  files: unknown[];
  currentStep: number | null;
  progressPercent: number | null;
  createdAt: string;
  updatedAt: string;
  events?: BiRequestEvent[];
  uploads?: BiUpload[];
  dashboards?: BiDashboard[];
  upload?: { id: string; fileName: string; fileSize: number; status: string };
};

export type BiRequestEvent = {
  id: string;
  requestId: string;
  type: string;
  message: string | null;
  metadata: unknown;
  performedBy: string | null;
  performedByRole: string | null;
  performedAt: string;
};

export type BiUploadFile = {
  id: string;
  uploadId: string | null;
  fileName: string | null;
  rowCount: number;
  fileSize: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
};

export type BiProcessingLog = {
  id: string;
  jobId: string | null;
  level: string;
  step: string;
  message: string;
  createdAt: string;
};

export type BiProcessingJob = {
  id: string;
  uploadId: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  recordsLoaded: number;
  createdAt: string;
  updatedAt: string | null;
  logs?: BiProcessingLog[];
};

export type BiUpload = {
  id: string;
  clientId: string | null;
  requestId: string | null;
  businessType: string | null;
  fileName: string | null;
  fileSize: number | null;
  status: string;
  totalFiles: number;
  totalRows: number;
  errorMessage: string | null;
  createdAt: string;
  files?: BiUploadFile[];
  processingJob?: BiProcessingJob | null;
};

export type BiDashboard = {
  id: string;
  clientId: string | null;
  requestId: string | null;
  uploadId: string | null;
  businessType: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  templateUsed: string | null;
  generator: string;
  generatedAt: string | null;
  assignedAt: string | null;
  createdAt: string;
  assignment?: { status: string; version: number; assignedAt: string | null };
  upload?: { id: string; fileName: string | null; status: string; totalRows: number; totalFiles: number; createdAt: string };
  template?: { id: string; businessType: string; name: string; description: string | null; active: boolean; metabaseDashboardId: number | null };
};

export type BiNotification = {
  id: string;
  clientId: string | null;
  requestId: string | null;
  dashboardId: string | null;
  role: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type BiDashboardTemplate = {
  id: string;
  businessType: string;
  name: string;
  description: string | null;
  active: boolean;
  metabaseDashboardId: number | null;
  kpis?: string[];
  dimensions?: string[];
  facts?: string[];
  image?: string | null;
};

export const ACTIVE_REQUEST_STATUSES = ["PROCESSING_ETL", "DATA_REVIEW", "GENERATING_DASHBOARD"];

export const TIMELINE_STEPS = [
  { step: 1, key: "REQUEST_CREATED", label: "Demande envoyée" },
  { step: 2, key: "APPROVED", label: "Approuvée" },
  { step: 3, key: "PROCESSING_ETL", label: "Traitement des données" },
  { step: 4, key: "DATA_REVIEW", label: "Révision des données" },
  { step: 5, key: "GENERATING_DASHBOARD", label: "Génération du tableau de bord" },
  { step: 6, key: "READY_FOR_REVIEW", label: "Tableau de bord prêt" },
  { step: 7, key: "PUBLISHED", label: "Publié" },
];

export const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "En attente de révision",
  REQUEST_INFO: "Informations complémentaires requises",
  APPROVED: "Approuvée",
  PROCESSING_ETL: "Traitement des données",
  DATA_REVIEW: "Révision des données",
  GENERATING_DASHBOARD: "Génération du tableau de bord",
  READY_FOR_REVIEW: "Tableau de bord prêt",
  PUBLISHED: "Publié",
  COMPLETED: "Terminée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  NOT_REQUIRED: "Non requis",
  PENDING: "En attente",
  VERIFIED: "Vérifié",
  REJECTED: "Refusé",
};

export const UPLOAD_STATUS_LABELS: Record<string, string> = {
  UPLOADED: "Téléversé",
  PENDING: "En attente",
  PROCESSING: "En cours de traitement",
  PROCESSED: "Traité",
  VALIDATING: "Validation en cours",
  QUEUED: "En file d'attente",
  VALIDATED: "Validé",
  PREPARED: "Préparé",
  COMPLETED: "Terminé",
  FAILED: "Échec",
};

export const PROCESSING_JOB_STATUS_LABELS: Record<string, string> = {
  QUEUED: "En file d'attente",
  PROCESSING: "En cours de traitement",
  RUNNING: "En cours de traitement",
  PROCESSED: "Traité",
  COMPLETED: "Terminé",
  FAILED: "Échec",
};

export const DASHBOARD_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  READY_FOR_REVIEW: "Prêt pour révision",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
};

export const EVENT_LABELS: Record<string, string> = {
  REQUEST_CREATED: "Demande envoyée",
  ZIP_UPLOADED: "Données téléversées",
  ZIP_VALIDATED: "Données validées",
  ZIP_INVALID: "Données invalides",
  PAYMENT_VERIFIED: "Paiement vérifié",
  PAYMENT_REJECTED: "Paiement refusé",
  REQUEST_APPROVED: "Demande approuvée",
  REQUEST_REJECTED: "Demande refusée",
  REQUEST_INFO_REQUESTED: "Informations complémentaires demandées",
  REQUEST_CANCELLED: "Demande annulée",
  ETL_STARTED: "Traitement des données démarré",
  ETL_COMPLETED: "Traitement des données terminé",
  ETL_FAILED: "Échec du traitement des données",
  DASHBOARD_GENERATED: "Tableau de bord généré",
  DASHBOARD_PUBLISHED: "Tableau de bord publié",
  REQUEST_COMPLETED: "Demande terminée",
};

export function isActiveStatus(status?: string | null): boolean {
  return !!status && ACTIVE_REQUEST_STATUSES.includes(status);
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function timeAgo(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `il y a ${weeks} sem`;
  return date.toLocaleDateString();
}

export const TERMINAL_STATUSES = ["COMPLETED", "REJECTED", "CANCELLED"];

export function isTerminalStatus(status?: string | null): boolean {
  return !!status && TERMINAL_STATUSES.includes(status);
}

// Short labels for the horizontal stage progress bar (Phase 2).
export const STAGES = [
  { step: 1, label: "Demande" },
  { step: 2, label: "Approbation" },
  { step: 3, label: "Données" },
  { step: 4, label: "Révision" },
  { step: 5, label: "Génération" },
  { step: 6, label: "Aperçu" },
  { step: 7, label: "Publication" },
];

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "COMPLETED":
    case "PUBLISHED":
    case "ACTIVE":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "APPROVED":
    case "READY_FOR_REVIEW":
    case "VALIDATED":
    case "VERIFIED":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "REJECTED":
    case "CANCELLED":
    case "FAILED":
    case "ZIP_INVALID":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    case "SUPERSEDED":
    case "ARCHIVED":
      return "bg-muted text-muted-foreground border-border";
    case "DRAFT":
    case "REQUEST_INFO":
    case "PENDING":
    case "PENDING_REVIEW":
    case "PROCESSING_ETL":
    case "DATA_REVIEW":
    case "GENERATING_DASHBOARD":
    case "UPLOADED":
    case "VALIDATING":
    case "QUEUED":
    default:
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  }
}

// Group notifications by calendar day for the notification list (Phase 2 §4).
export function groupByDay(items: BiNotification[]): { label: string; items: BiNotification[] }[] {
  const groups = new Map<string, BiNotification[]>();
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  for (const item of items) {
    const date = new Date(item.createdAt);
    const key =
      date.toDateString() === today.toDateString()
        ? "today"
        : date.toDateString() === yesterday.toDateString()
          ? "yesterday"
          : fmt.format(date);
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }

  const labels: Record<string, string> = { today: "Aujourd'hui", yesterday: "Hier" };
  return Array.from(groups.entries()).map(([key, list]) => ({
    label: labels[key] || key,
    items: list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  }));
}
