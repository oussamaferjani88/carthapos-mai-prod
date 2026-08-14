import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Database,
  Eye,
  FileText,
  Inbox,
  LayoutDashboard,
  Loader2,
  MessageCircleQuestion,
  MoreHorizontal,
  Play,
  RefreshCw,
  Rocket,
  Search,
  SearchX,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import PageHeader from "../components/shared/PageHeader";
import { Textarea } from "../components/ui/textarea";
import api from "../lib/api";
import { cn } from "../lib/utils";
import {
  BUSINESS_TYPES,
  businessTypeInfo,
  dashboardStatusLabel,
  fmtDate,
  PAYMENT_STATUS_LABELS,
  paymentStatusClass,
  paymentStatusLabel,
  STATUS_OPTIONS,
  statusLabel,
  statusMeta,
  uploadStatusClass,
  uploadStatusLabel,
} from "../lib/bi-labels";

const PAGE_SIZE = 10;

const STAT_CARDS = [
  { key: "total", label: "Total", icon: ClipboardList, filter: "ALL" },
  {
    key: "pending",
    label: "En attente",
    icon: Clock,
    filter: "PENDING_REVIEW",
  },
  {
    key: "processing",
    label: "En traitement",
    icon: Database,
    filter: "PROCESSING_ETL",
  },
  { key: "published", label: "Publiées", icon: Rocket, filter: "PUBLISHED" },
];

function paymentOk(request) {
  return ["VERIFIED", "NOT_REQUIRED"].includes(request.paymentStatus);
}

function canRunEtl(request) {
  const upload = request.uploads?.[0];
  return (
    request.status === "APPROVED" &&
    !!upload &&
    !["COMPLETED", "PROCESSING"].includes(upload.status)
  );
}

function primaryAction(request) {
  const dashboard = request.dashboards?.[0];
  if (request.status === "PENDING_REVIEW" && paymentOk(request))
    return { type: "approve", label: "Approuver", variant: "default" };
  if (
    request.status === "PENDING_REVIEW" &&
    request.paymentStatus === "PENDING"
  )
    return {
      type: "verifyPayment",
      label: "Vérifier paiement",
      variant: "outline",
    };
  if (request.status === "REQUEST_INFO")
    return { type: "view", label: "Voir le détail", variant: "outline" };
  if (canRunEtl(request))
    return { type: "etl", label: "Lancer l'ETL", variant: "default" };
  if (request.status === "DATA_REVIEW" && request.uploads?.[0])
    return { type: "review", label: "Réviser les données", variant: "outline" };
  if (["READY_FOR_REVIEW", "PUBLISHED"].includes(request.status) && dashboard)
    return {
      type: "dashboard",
      label: "Voir le dashboard",
      variant: "outline",
    };
  return { type: "view", label: "Voir le détail", variant: "outline" };
}

function buildMenu(request) {
  const upload = request.uploads?.[0];
  const dashboard = request.dashboards?.[0];
  const items = [];
  items.push({
    key: "view",
    label: "Voir le détail",
    icon: ArrowUpRight,
    type: "link",
    link: `/bi-requests/${request.id}`,
  });
  if (request.paymentStatus === "PENDING") {
    items.push({
      key: "verifyPayment",
      label: "Vérifier le paiement",
      icon: Check,
      type: "dialog",
      dialog: "verifyPayment",
    });
    items.push({
      key: "rejectPayment",
      label: "Refuser le paiement",
      icon: XCircle,
      type: "dialog",
      dialog: "rejectPayment",
      destructive: true,
    });
  }
  if (
    ["PENDING_REVIEW", "REQUEST_INFO"].includes(request.status) &&
    paymentOk(request)
  ) {
    items.push({
      key: "approve",
      label: "Approuver",
      icon: Check,
      type: "dialog",
      dialog: "approve",
    });
  }
  if (request.status === "PENDING_REVIEW") {
    items.push({
      key: "info",
      label: "Demander des informations",
      icon: MessageCircleQuestion,
      type: "dialog",
      dialog: "info",
    });
  }
  if (canRunEtl(request)) {
    items.push({
      key: "etl",
      label: "Lancer le traitement ETL",
      icon: Play,
      type: "action",
    });
  }
  if (request.status === "DATA_REVIEW" && upload) {
    items.push({
      key: "review",
      label: "Réviser les données",
      icon: Eye,
      type: "link",
      link: `/bi-wizard?uploadId=${upload.id}`,
    });
  }
  if (["READY_FOR_REVIEW", "PUBLISHED"].includes(request.status) && dashboard) {
    items.push({
      key: "dashboard",
      label: "Voir le dashboard",
      icon: LayoutDashboard,
      type: "link",
      link: `/bi-dashboard/${dashboard.id}`,
    });
  }
  if (!["REJECTED", "CANCELLED", "COMPLETED"].includes(request.status)) {
    items.push({
      key: "reject",
      label: "Rejeter la demande",
      icon: Ban,
      type: "dialog",
      dialog: "reject",
      destructive: true,
    });
  }
  items.push({
    key: "notes",
    label: "Modifier les notes",
    icon: FileText,
    type: "dialog",
    dialog: "notes",
  });
  items.push({ type: "separator" });
  items.push({
    key: "delete",
    label: "Supprimer la demande",
    icon: Trash2,
    type: "dialog",
    dialog: "delete",
    destructive: true,
  });
  return items;
}

const ACTION_META = {
  approve: {
    title: "Approuver la demande",
    description:
      "La demande sera approuvée et passera à l'étape suivante du workflow.",
    confirm: "Approuver",
    destructive: false,
    fields: [
      {
        key: "note",
        label: "Note admin (optionnel)",
        placeholder: "Note interne pour cette approbation",
        rows: 2,
      },
    ],
  },
  reject: {
    title: "Rejeter la demande",
    description:
      "La demande sera refusée et le client en sera informé. Cette action est définitive.",
    confirm: "Rejeter la demande",
    destructive: true,
    fields: [
      {
        key: "note",
        label: "Motif du rejet",
        placeholder: "Expliquez le motif au client",
        rows: 3,
      },
    ],
  },
  info: {
    title: "Demander des informations",
    description:
      "Une demande de complément d’information sera envoyée au client.",
    confirm: "Demander des informations",
    destructive: false,
    fields: [
      {
        key: "note",
        label: "Note envoyée au client",
        placeholder: "Précisez les informations attendues",
        rows: 3,
      },
    ],
  },
  verifyPayment: {
    title: "Vérifier le paiement",
    description: "Marquez le paiement comme vérifié pour cette demande.",
    confirm: "Vérifier le paiement",
    destructive: false,
    fields: [
      {
        key: "method",
        label: "Méthode de paiement",
        placeholder: "Ex : Virement bancaire",
      },
      {
        key: "notes",
        label: "Notes de paiement",
        placeholder: "Référence, remarque…",
      },
    ],
  },
  rejectPayment: {
    title: "Refuser le paiement",
    description:
      "Le paiement sera marqué comme refusé. Le client devra le régulariser.",
    confirm: "Refuser le paiement",
    destructive: true,
    fields: [
      {
        key: "note",
        label: "Motif du refus",
        placeholder: "Expliquez le motif au client",
        rows: 2,
      },
    ],
  },
  notes: {
    title: "Modifier les notes",
    description: "Notes internes liées à cette demande.",
    confirm: "Sauvegarder",
    destructive: false,
    fields: [
      {
        key: "specialist",
        label: "Notes spécialistes",
        placeholder: "Note pour la demande",
      },
      {
        key: "admin",
        label: "Notes admin",
        placeholder: "Notes internes (non visibles par le client)",
      },
    ],
  },
  delete: {
    title: "Supprimer la demande",
    description:
      "La demande sera définitivement supprimée. Les uploads et dashboards liés seront conservés mais détachés de cette demande.",
    confirm: "Supprimer la demande",
    destructive: true,
    fields: [],
  },
};

function StatCard({ label, value, icon, active, onClick }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-card p-3 text-left transition-colors",
        active ? "border-primary/50 bg-accent/50" : "hover:bg-accent/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-md",
            active
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
    </button>
  );
}

function StatusBadge({ status }) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return (
    <Badge className={cn("gap-1", meta.className)}>
      <Icon className="w-3 h-3" />
      {statusLabel(status)}
    </Badge>
  );
}

function PaymentBadge({ paymentStatus }) {
  return (
    <Badge className={cn("gap-1", paymentStatusClass(paymentStatus))}>
      {paymentStatus === "VERIFIED" && <CheckCircle2 className="w-3 h-3" />}
      {paymentStatus === "PENDING" && <Clock className="w-3 h-3" />}
      {paymentStatus === "REJECTED" && <XCircle className="w-3 h-3" />}
      {paymentStatusLabel(paymentStatus)}
    </Badge>
  );
}

function BusinessBadge({ businessType }) {
  const info = businessTypeInfo(businessType);
  const Icon = info.icon;
  return (
    <Badge className={cn("gap-1 bg-muted/60 text-foreground")}>
      <Icon className="w-3 h-3 text-muted-foreground" />
      {info.label}
    </Badge>
  );
}

function DataCell({ request }) {
  const upload = request.uploads?.[0];
  const dashboard = request.dashboards?.[0];
  return (
    <div className="space-y-1">
      {upload ? (
        <div className="flex items-center gap-1.5">
          <Badge className={cn("gap-1", uploadStatusClass(upload.status))}>
            {uploadStatusLabel(upload.status)}
          </Badge>
          <span className="text-xs text-muted-foreground truncate max-w-[140px]">
            {upload.fileName}
          </span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Aucun fichier</span>
      )}
      {dashboard && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <LayoutDashboard className="w-3 h-3" />
          <span>
            Dashboard v{dashboard.version} ·{" "}
            {dashboardStatusLabel(dashboard.status)}
          </span>
        </div>
      )}
    </div>
  );
}

function RowActions({ request, updating, act }) {
  const primary = primaryAction(request);
  const isBusy = updating === request.id;

  let primaryNode;
  if (primary.type === "approve") {
    primaryNode = (
      <Button
        size="sm"
        variant="default"
        disabled={isBusy}
        onClick={() => act.approve(request)}
      >
        {isBusy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Check className="w-3.5 h-3.5" />
        )}
        {primary.label}
      </Button>
    );
  } else if (primary.type === "etl") {
    primaryNode = (
      <Button
        size="sm"
        variant="default"
        disabled={isBusy}
        onClick={() => act.etl(request)}
      >
        {isBusy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5" />
        )}
        {primary.label}
      </Button>
    );
  } else if (primary.type === "verifyPayment") {
    primaryNode = (
      <Button
        size="sm"
        variant="outline"
        onClick={() => act.openDialog(request, "verifyPayment")}
      >
        {primary.label}
      </Button>
    );
  } else if (primary.type === "review") {
    primaryNode = (
      <Link to={`/bi-wizard?uploadId=${request.uploads?.[0].id}`}>
        <Button size="sm" variant="outline">
          <Eye className="w-3.5 h-3.5" />
          {primary.label}
        </Button>
      </Link>
    );
  } else if (primary.type === "dashboard") {
    primaryNode = (
      <Link to={`/bi-dashboard/${request.dashboards?.[0].id}`}>
        <Button size="sm" variant="outline">
          <LayoutDashboard className="w-3.5 h-3.5" />
          {primary.label}
        </Button>
      </Link>
    );
  } else {
    primaryNode = (
      <Button size="sm" variant="outline" onClick={() => act.view(request.id)}>
        {primary.label}
      </Button>
    );
  }

  const items = buildMenu(request);

  return (
    <div className="flex items-center gap-1">
      {primaryNode}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {items.map((item) => {
            const Icon = item.icon;
            if (item.type === "separator") {
              return <DropdownMenuSeparator key="sep-delete" />;
            }
            if (item.type === "link") {
              return (
                <DropdownMenuItem key={item.key} asChild>
                  <Link to={item.link}>
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            }
            if (item.type === "action") {
              return (
                <DropdownMenuItem
                  key={item.key}
                  disabled={isBusy}
                  onSelect={() => act.etl(request)}
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  {item.label}
                </DropdownMenuItem>
              );
            }
            return (
              <DropdownMenuItem
                key={item.key}
                className={
                  item.destructive
                    ? "text-destructive focus:text-destructive"
                    : ""
                }
                onSelect={() => act.openDialog(request, item.dialog)}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    item.destructive
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                />
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DataRow({ request, updating, act, selected, onToggle }) {
  const clientName = request.businessName || request.businessType || "—";
  return (
    <TableRow className="cursor-pointer" onClick={() => act.view(request.id)}>
      <TableCell onClick={(e) => e.stopPropagation()} className="w-10">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Sélectionner ${request.id}`}
        />
      </TableCell>
      <TableCell>
        <div className="font-mono text-xs text-muted-foreground">
          {request.id}
        </div>
        <div className="text-sm font-medium">
          {request.dashboardTemplate ||
            request.dashboardType ||
            "Dashboard personnalisé"}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-medium text-foreground">{clientName}</div>
        <div className="text-xs text-muted-foreground">
          {request.licenseId || request.userEmail || ""}
        </div>
      </TableCell>
      <TableCell>
        <BusinessBadge businessType={request.businessType} />
      </TableCell>
      <TableCell>
        <DataCell request={request} />
      </TableCell>
      <TableCell>
        <StatusBadge status={request.status} />
      </TableCell>
      <TableCell>
        <PaymentBadge paymentStatus={request.paymentStatus} />
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {fmtDate(request.createdAt)}
        </span>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <RowActions request={request} updating={updating} act={act} />
      </TableCell>
    </TableRow>
  );
}

function DataCard({ request, updating, act, selected, onToggle }) {
  const info = businessTypeInfo(request.businessType);
  const Icon = info.icon;
  const dashboard = request.dashboards?.[0];
  const isBusy = updating === request.id;
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={`Sélectionner ${request.id}`}
          />
          <div className={cn("rounded-lg p-2 shrink-0", info.color)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {request.businessName || request.businessType || "—"}
            </div>
            <div className="font-mono text-xs text-muted-foreground truncate">
              {request.id}
            </div>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <BusinessBadge businessType={request.businessType} />
        <PaymentBadge paymentStatus={request.paymentStatus} />
        {request.licenseId && (
          <span className="text-muted-foreground">
            Licence {request.licenseId}
          </span>
        )}
      </div>

      <div className="text-sm text-muted-foreground truncate">
        {request.dashboardTemplate ||
          request.dashboardType ||
          "Dashboard personnalisé"}
      </div>

      <DataCell request={request} />

      <div className="text-xs text-muted-foreground">
        Créée le {fmtDate(request.createdAt)}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t">
        {isBusy ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <RowActions request={request} updating={updating} act={act} />
        )}
        {dashboard && (
          <Link
            to={`/bi-dashboard/${dashboard.id}`}
            className="ml-auto text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            Dashboard <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </Card>
  );
}

function LoadingRows() {
  return (
    <div
      className="space-y-2"
      aria-busy="true"
      aria-label="Chargement des demandes"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border rounded-lg p-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-36 ml-auto" />
        </div>
      ))}
    </div>
  );
}

function ActionModal({ request, action, onClose, onSubmit }) {
  const meta = ACTION_META[action];
  const [fields, setFields] = useState(() => {
    const init = {};
    meta.fields.forEach((f) => {
      if (action === "notes" && f.key === "specialist")
        init[f.key] = request.specialistNotes || "";
      else if (action === "notes" && f.key === "admin")
        init[f.key] = request.adminNotes || "";
      else init[f.key] = "";
    });
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(action, fields, request);
      onClose();
    } catch (e) {
      setError(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Une erreur est survenue",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {meta.fields.map((f) =>
            f.rows ? (
              <div key={f.key} className="space-y-1">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor={`${action}-${f.key}`}
                >
                  {f.label}
                </label>
                <Textarea
                  id={`${action}-${f.key}`}
                  rows={f.rows}
                  value={fields[f.key]}
                  onChange={(e) =>
                    setFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                  placeholder={f.placeholder}
                />
              </div>
            ) : (
              <div key={f.key} className="space-y-1">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor={`${action}-${f.key}`}
                >
                  {f.label}
                </label>
                <Input
                  id={`${action}-${f.key}`}
                  value={fields[f.key]}
                  onChange={(e) =>
                    setFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                  placeholder={f.placeholder}
                />
              </div>
            ),
          )}
          {error && (
            <div
              className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              role="alert"
            >
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            variant={meta.destructive ? "destructive" : "default"}
            onClick={submit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {meta.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BIRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    published: 0,
  });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [businessTypeFilter, setBusinessTypeFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (businessTypeFilter !== "ALL")
        params.businessType = businessTypeFilter;
      if (paymentStatusFilter !== "ALL")
        params.paymentStatus = paymentStatusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
      params.sort = sortBy;
      params.page = page;
      params.pageSize = PAGE_SIZE;

      const response = await api.get("/bi-requests", { params });
      const payload = response.data;
      setRequests(Array.isArray(payload?.items) ? payload.items : []);
      setTotal(typeof payload?.total === "number" ? payload.total : 0);
      setTotalPages(
        typeof payload?.totalPages === "number" ? payload.totalPages : 1,
      );
    } catch (e) {
      console.error(e);
      setError(true);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    businessTypeFilter,
    paymentStatusFilter,
    dateFrom,
    dateTo,
    sortBy,
    debouncedSearch,
    page,
  ]);

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get("/bi-requests", {
        params: { sort: "newest", page: 1, pageSize: 100 },
      });
      const items = Array.isArray(response.data?.items)
        ? response.data.items
        : [];
      const counts = { pending: 0, processing: 0, published: 0 };
      items.forEach((r) => {
        if (["PENDING_REVIEW", "REQUEST_INFO"].includes(r.status))
          counts.pending += 1;
        else if (
          [
            "APPROVED",
            "PROCESSING_ETL",
            "DATA_REVIEW",
            "GENERATING_DASHBOARD",
            "READY_FOR_REVIEW",
          ].includes(r.status)
        )
          counts.processing += 1;
        else if (["PUBLISHED", "COMPLETED"].includes(r.status))
          counts.published += 1;
      });
      setStats({
        total:
          typeof response.data?.total === "number"
            ? response.data.total
            : items.length,
        ...counts,
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [
    statusFilter,
    businessTypeFilter,
    paymentStatusFilter,
    dateFrom,
    dateTo,
    sortBy,
    search,
  ]);

  const refresh = () => {
    loadRequests();
    loadStats();
  };

  const mutate = async (fn, successMsg) => {
    try {
      await fn();
      toast.success(successMsg);
      await Promise.all([loadRequests(), loadStats()]);
      return true;
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Une erreur est survenue",
      );
      return false;
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const pageIds = requests.map((r) => r.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const somePageSelected = pageIds.some((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    let deleted = 0;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        await api.delete(`/bi-requests/${id}`);
        deleted += 1;
      } catch (e) {
        failed += 1;
        console.error(e);
      }
    }
    setBulkDeleting(false);
    setBulkDeleteOpen(false);
    setSelectedIds([]);
    await Promise.all([loadRequests(), loadStats()]);
    if (failed > 0) {
      toast.error(`${deleted} supprimée(s), ${failed} échec(s)`);
    } else if (deleted > 0) {
      toast.success(`${deleted} demande(s) supprimée(s)`);
    }
  };

  const act = {
    view: (id) => navigate(`/bi-requests/${id}`),
    openDialog: (request, action) => setDialog({ request, action }),
    approve: (request) => {
      setUpdatingId(request.id);
      mutate(
        () =>
          api.patch(`/bi-requests/${request.id}/approve`, { adminNotes: "" }),
        "Demande approuvée",
      ).finally(() => setUpdatingId(null));
    },
    etl: (request) => {
      const upload = request.uploads?.[0];
      if (!upload) return;
      setUpdatingId(request.id);
      mutate(
        () => api.post(`/bi-uploads/${upload.id}/start-etl`),
        "Traitement ETL lancé",
      ).finally(() => setUpdatingId(null));
    },
  };

  const handleDialogSubmit = async (action, fields, request) => {
    if (action === "approve") {
      await api.patch(`/bi-requests/${request.id}/approve`, {
        adminNotes: fields.note || "",
      });
    } else if (action === "reject") {
      await api.patch(`/bi-requests/${request.id}/reject`, {
        adminNotes: fields.note || "",
      });
    } else if (action === "info") {
      await api.patch(`/bi-requests/${request.id}/request-info`, {
        adminNotes: fields.note || "",
      });
    } else if (action === "verifyPayment") {
      await api.patch(`/bi-requests/${request.id}/payment`, {
        paymentStatus: "VERIFIED",
        paymentMethod: fields.method || "",
        paymentNotes: fields.notes || "",
      });
    } else if (action === "rejectPayment") {
      await api.patch(`/bi-requests/${request.id}/payment`, {
        paymentStatus: "REJECTED",
        paymentNotes: fields.note || "",
      });
    } else if (action === "notes") {
      await api.patch(`/bi-requests/${request.id}/status`, {
        status: request.status,
        specialistNotes: fields.specialist || "",
        adminNotes: fields.admin || "",
      });
    } else if (action === "delete") {
      await api.delete(`/bi-requests/${request.id}`);
    }
    toast.success(
      action === "delete" ? "Demande supprimée" : "Action effectuée",
    );
    await Promise.all([loadRequests(), loadStats()]);
  };

  const hasActiveFilters =
    statusFilter !== "ALL" ||
    businessTypeFilter !== "ALL" ||
    paymentStatusFilter !== "ALL" ||
    !!dateFrom ||
    !!dateTo ||
    !!search.trim() ||
    sortBy !== "newest";

  const resetFilters = () => {
    setStatusFilter("ALL");
    setBusinessTypeFilter("ALL");
    setPaymentStatusFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
    setSearch("");
  };

  const setStatFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Demandes BI"
        description="Suivi des demandes de dashboards personnalisés et gestion du workflow."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5", loading && "animate-spin")}
              />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => navigate("/bi-upload-portal")}>
              <UploadCloud className="w-3.5 h-3.5" />
              Importer des données
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map((card) => {
          const active =
            statusFilter === card.filter ||
            (card.filter === "ALL" && statusFilter === "ALL");
          return (
            <StatCard
              key={card.key}
              label={card.label}
              value={stats[card.key]}
              icon={card.icon}
              active={active}
              onClick={() => setStatFilter(card.filter)}
            />
          );
        })}
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-8 h-9"
                placeholder="Rechercher (id, licence, client, email)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select
                value={businessTypeFilter}
                onValueChange={setBusinessTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Activité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Toutes les activités</SelectItem>
                  {BUSINESS_TYPES.map((bt) => (
                    <SelectItem key={bt.value} value={bt.value}>
                      {bt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select
                value={paymentStatusFilter}
                onValueChange={setPaymentStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les paiements</SelectItem>
                  {Object.entries(PAYMENT_STATUS_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Tri" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Plus récentes</SelectItem>
                  <SelectItem value="oldest">Plus anciennes</SelectItem>
                  <SelectItem value="status">Par statut</SelectItem>
                  <SelectItem value="completed">Par terminées</SelectItem>
                  <SelectItem value="pending">Par en attente</SelectItem>
                  <SelectItem value="rejected">Par rejetées</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                title="Date de début"
              />
              <span className="text-muted-foreground text-sm">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                title="Date de fin"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="w-3.5 h-3.5" />
                Réinitialiser
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              {loading
                ? "Chargement…"
                : `${total} demande${total > 1 ? "s" : ""}`}
              {hasActiveFilters ? " (filtrée)" : ""}
            </span>
            {!loading && requests.length > 0 && totalPages > 1 && (
              <span>
                Page {page} / {totalPages}
              </span>
            )}
          </div>
        </div>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Impossible de charger les demandes</AlertTitle>
          <AlertDescription>
            Une erreur est survenue lors de la récupération des données.
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={refresh}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      ) : loading ? (
        <LoadingRows />
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            {hasActiveFilters ? (
              <SearchX className="w-7 h-7 text-muted-foreground" />
            ) : (
              <Inbox className="w-7 h-7 text-muted-foreground" />
            )}
          </div>
          <p className="font-medium text-sm">
            {hasActiveFilters
              ? "Aucun résultat pour ces filtres"
              : "Aucune demande BI"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {hasActiveFilters
              ? "Essayez de modifier votre recherche ou vos filtres."
              : "Les demandes envoyées par les clients apparaîtront ici."}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={resetFilters}
            >
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      ) : (
        <>
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <span className="text-sm font-medium">
                {selectedIds.length} sélectionnée(s)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                  disabled={bulkDeleting}
                >
                  Annuler la sélection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={bulkDeleting}
                >
                  {bulkDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Supprimer la sélection
                </Button>
              </div>
            </div>
          )}

          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allPageSelected}
                      indeterminate={somePageSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Tout sélectionner"
                    />
                  </TableHead>
                  <TableHead>Demande</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Activité</TableHead>
                  <TableHead>Données</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <DataRow
                    key={request.id}
                    request={request}
                    updating={updatingId}
                    act={act}
                    selected={selectedIds.includes(request.id)}
                    onToggle={() => toggleSelect(request.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="lg:hidden space-y-3">
            {requests.map((request) => (
              <DataCard
                key={request.id}
                request={request}
                updating={updatingId}
                act={act}
                selected={selectedIds.includes(request.id)}
                onToggle={() => toggleSelect(request.id)}
              />
            ))}
          </div>
        </>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {total} demande(s) · page {page} / {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {dialog && (
        <ActionModal
          key={`${dialog.request.id}-${dialog.action}`}
          request={dialog.request}
          action={dialog.action}
          onClose={() => setDialog(null)}
          onSubmit={handleDialogSubmit}
        />
      )}

      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={(open) =>
          !open && !bulkDeleting && setBulkDeleteOpen(false)
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer la sélection</DialogTitle>
            <DialogDescription>
              {selectedIds.length} demande(s) seront définitivement supprimées.
              Les uploads et dashboards liés seront conservés mais détachés de
              ces demandes. Les demandes avec un traitement ETL en cours ne
              pourront pas être supprimées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={bulkDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {bulkDeleting ? "Suppression…" : "Supprimer la sélection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
