import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import api from '../lib/api';

const STATUS_OPTIONS = ['PENDING', 'IN_REVIEW', 'DELIVERED', 'REJECTED'];

function getStatusClasses(status) {
  if (status === 'DELIVERED') return 'bg-green-100 text-green-700';
  if (status === 'IN_REVIEW') return 'bg-blue-100 text-blue-700';
  if (status === 'REJECTED') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}

export default function BIRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState(null);
  const [notesById, setNotesById] = useState({});

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (search.trim()) {
        params.q = search.trim();
      }
      params.sort = sortBy;
      params.page = page;
      params.pageSize = pageSize;

      const response = await api.get('/bi-requests', { params });
      const payload = response.data;
      const data = Array.isArray(payload?.items) ? payload.items : [];
      setRequests(data);
      setTotal(typeof payload?.total === 'number' ? payload.total : 0);
      setTotalPages(typeof payload?.totalPages === 'number' ? payload.totalPages : 1);
      setNotesById((prev) => {
        const next = { ...prev };
        data.forEach((item) => {
          if (!(item.id in next)) {
            next[item.id] = item.specialistNotes || '';
          }
        });
        return next;
      });
    } catch (error) {
      console.error(error);
      toast.error('Impossible de charger les demandes BI');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter, sortBy, search, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sortBy, search]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.patch(`/bi-requests/${id}/status`, {
        status,
        specialistNotes: notesById[id] || '',
      });
      toast.success('Statut BI mis a jour');
      await loadRequests();
    } catch (error) {
      console.error(error);
      toast.error('Echec de mise a jour du statut');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demandes BI</h1>
          <p className="text-muted-foreground">Suivi des demandes de dashboards personnalises et gestion du statut.</p>
        </div>
        <div className="flex gap-3 items-center">
          <Input
            className="w-72"
            placeholder="Rechercher (id, licence, client, email, message)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="w-56">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Tri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Plus recentes</SelectItem>
                <SelectItem value="oldest">Plus anciennes</SelectItem>
                <SelectItem value="status">Par statut</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File BI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm text-muted-foreground">
            {total} demande(s) trouvee(s)
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Chargement...</div>
          ) : requests.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucune demande BI pour le filtre actuel.</div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex flex-wrap gap-3 items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">{request.id}</div>
                      <div className="font-semibold">{request.dashboardType}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusClasses(request.status)}`}>
                      {request.status}
                    </span>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">License:</span> {request.licenseId}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Client:</span> {request.businessName || '-'}
                  </div>
                  <div className="text-sm text-muted-foreground">{request.message}</div>

                  {Array.isArray(request.files) && request.files.length > 0 && (
                    <div className="text-sm">
                      <div className="font-medium mb-1">Fichiers CSV:</div>
                      <div className="space-y-1">
                        {request.files.map((file) => (
                          <a
                            key={`${request.id}-${file.url}`}
                            href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}${file.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-primary hover:underline"
                          >
                            {file.originalName}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select
                      value={request.status}
                      onValueChange={(value) => updateStatus(request.id, value)}
                      disabled={updatingId === request.id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Changer statut" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground self-center">
                      Cree le {new Date(request.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-1">Notes specialistes</div>
                    <Textarea
                      rows={3}
                      value={notesById[request.id] || ''}
                      onChange={(e) =>
                        setNotesById((prev) => ({
                          ...prev,
                          [request.id]: e.target.value,
                        }))
                      }
                      placeholder="Ajoutez une note pour cette demande"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingId === request.id}
                        onClick={() => updateStatus(request.id, request.status)}
                      >
                        {updatingId === request.id ? 'Sauvegarde...' : 'Sauvegarder note'}
                      </Button>
                    </div>
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
                  Precedent
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
        </CardContent>
      </Card>
    </div>
  );
}
