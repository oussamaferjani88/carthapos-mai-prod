import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Loader2,
  Mail,
  Search,
  SearchX,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import PageHeader from "../components/shared/PageHeader";
import { Skeleton } from "../components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "../components/ui/dropdown-menu";
import api from "../lib/api";

const PAGE_SIZE = 20;

const CATEGORIES = ["REQUEST", "DASHBOARD", "PAYMENT", "VALIDATION", "SYSTEM"];

const CATEGORY_LABELS = {
  REQUEST: "Demande",
  DASHBOARD: "Dashboard",
  PAYMENT: "Paiement",
  VALIDATION: "Validation",
  SYSTEM: "Système",
};

const CATEGORY_CLASSES = {
  REQUEST: "bg-blue-100 text-blue-700",
  DASHBOARD: "bg-purple-100 text-purple-700",
  PAYMENT: "bg-amber-100 text-amber-700",
  VALIDATION: "bg-green-100 text-green-700",
  SYSTEM: "bg-gray-100 text-gray-700",
};

function timeAgo(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(value).toLocaleDateString("fr-FR");
}

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const res = await api.get("/bi/stats");
        setCategoryCounts(res.data?.data?.notifications?.byCategory || {});
      } catch {
        setCategoryCounts({});
      }
    };
    loadCounts();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { role: "ADMIN", page, pageSize: PAGE_SIZE };
      if (category !== "ALL") params.category = category;
      if (unreadOnly) params.isRead = "false";
      if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
      const res = await api.get("/bi/notifications", { params });
      const data = res.data?.data || {};
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
      setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 1);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger les notifications");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [category, unreadOnly, debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [category, unreadOnly, debouncedSearch]);

  const markRead = async (notification) => {
    setBusyId(notification.id);
    try {
      await api.patch(`/bi/notifications/${notification.id}/read`);
      setItems((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n,
        ),
      );
    } catch (error) {
      console.error(error);
      toast.error("Échec de la mise à jour de la notification");
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/bi/notifications/read-all", { role: "ADMIN" });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("Toutes les notifications sont marquées comme lues");
    } catch (error) {
      console.error(error);
      toast.error("Échec de la mise à jour des notifications");
    }
  };

  const remove = async (notification) => {
    if (!window.confirm("Supprimer cette notification ?")) return;
    setBusyId(notification.id);
    try {
      await api.delete(`/bi/notifications/${notification.id}`);
      setItems((prev) => prev.filter((n) => n.id !== notification.id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error(error);
      toast.error("Échec de la suppression");
    } finally {
      setBusyId(null);
    }
  };

  const clearFiltered = async () => {
    const scope =
      category === "ALL"
        ? "toutes les notifications filtrées"
        : `les notifications « ${CATEGORY_LABELS[category] || category} »`;
    if (!window.confirm(`Effacer ${scope} ?`)) return;
    try {
      const payload = { role: "ADMIN" };
      if (category !== "ALL") payload.category = category;
      if (unreadOnly) payload.isRead = "false";
      await api.post("/bi/notifications/clear", payload);
      toast.success("Notifications effacées");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Échec de l'effacement");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const pageIds = items.map((n) => n.id);
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

  const bulkDelete = async () => {
    if (!window.confirm(`Supprimer ${selectedIds.length} notification(s) ?`))
      return;
    setBulkDeleting(true);
    try {
      const res = await api.post("/bi/notifications/delete-many", {
        role: "ADMIN",
        ids: selectedIds,
      });
      const count = res.data?.count ?? selectedIds.length;
      setSelectedIds([]);
      toast.success(`${count} notification(s) supprimée(s)`);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Échec de la suppression");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Centre de notifications"
        description="Boîte de réception BI : demandes, dashboards, paiements et validations."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="w-3.5 h-3.5 mr-1" /> Tout lire
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Effacer
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={clearFiltered}
                  className="text-red-600"
                >
                  Effacer les notifications affichées
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Boîte de réception
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex flex-wrap gap-2 mb-4"
            role="group"
            aria-label="Filtrer par catégorie"
          >
            <button
              type="button"
              onClick={() => setCategory("ALL")}
              aria-pressed={category === "ALL"}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                category === "ALL"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              Toutes
              {Object.keys(categoryCounts).length > 0 && (
                <span className="ml-1.5 opacity-70">
                  {Object.values(categoryCounts).reduce((a, b) => a + b, 0)}
                </span>
              )}
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  category === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {CATEGORY_LABELS[c] || c}
                {typeof categoryCounts[c] === "number" &&
                  categoryCounts[c] > 0 && (
                    <span className="ml-1.5 opacity-70">
                      {categoryCounts[c]}
                    </span>
                  )}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Rechercher (titre, message)"
                aria-label="Rechercher une notification"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="rounded border-input"
              />
              Non lues uniquement
            </label>
          </div>

          <div className="mb-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{total} notification(s)</span>
            {!loading && items.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Tout sélectionner"
                />
                <span>Tout sélectionner</span>
              </label>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 mb-4">
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
                  onClick={bulkDelete}
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

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                {debouncedSearch.trim() || category !== "ALL" || unreadOnly ? (
                  <SearchX className="w-7 h-7 text-muted-foreground" />
                ) : (
                  <Mail className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
              <p className="font-medium text-sm">
                {debouncedSearch.trim() || category !== "ALL" || unreadOnly
                  ? "Aucune notification pour ces filtres"
                  : "Aucune notification"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-lg border p-3 flex items-start gap-3 ${n.isRead ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}
                  aria-label={
                    n.isRead ? "Notification lue" : "Notification non lue"
                  }
                >
                  <Checkbox
                    checked={selectedIds.includes(n.id)}
                    onCheckedChange={() => toggleSelect(n.id)}
                    className="mt-1 shrink-0"
                    aria-label={`Sélectionner ${n.title || n.id}`}
                  />
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${n.isRead ? "bg-muted-foreground/30" : "bg-primary"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={
                          CATEGORY_CLASSES[n.category] ||
                          "bg-gray-100 text-gray-700"
                        }
                      >
                        {CATEGORY_LABELS[n.category] || n.category || "Système"}
                      </Badge>
                      {!n.isRead && (
                        <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                          Non lue
                        </span>
                      )}
                      <span className="text-sm font-semibold truncate">
                        {n.title}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {n.message}
                    </p>
                    <div className="text-[11px] text-muted-foreground/70 mt-1">
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap shrink-0">
                    {n.requestId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Voir la demande"
                        onClick={() => navigate(`/bi-requests/${n.requestId}`)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Demande
                      </Button>
                    )}
                    {n.dashboardId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Voir le dashboard"
                        onClick={() =>
                          navigate(`/bi-dashboard/${n.dashboardId}`)
                        }
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Dashboard
                      </Button>
                    )}
                    {!n.isRead && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === n.id}
                        onClick={() => markRead(n)}
                      >
                        {busyId === n.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        Marquer comme lu
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={busyId === n.id}
                      title="Supprimer"
                      onClick={() => remove(n)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Page {page} / {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
                >
                  Suivant <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
