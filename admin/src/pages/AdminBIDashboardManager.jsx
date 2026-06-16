import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  LayoutDashboard, FileText, Clock, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Search, Plus, Eye, Trash2, Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import api from '../lib/api';

const DASHBOARD_STATUS = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  READY_FOR_REVIEW: { label: 'Ready for Review', color: 'bg-yellow-100 text-yellow-700' },
  PUBLISHED: { label: 'Published', color: 'bg-green-100 text-green-700' },
  ARCHIVED: { label: 'Archived', color: 'bg-red-100 text-red-700' },
};

function formatDate(iso) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('fr-FR');
}

export default function AdminBIDashboardManager() {
  const [uploads, setUploads] = useState([]);
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [uploadsRes, dashboardsRes] = await Promise.all([
        api.get('/bi-uploads', { params: { pageSize: 100 } }),
        api.get('/bi/dashboards', { params: { pageSize: 100 } }),
      ]);
      setUploads(uploadsRes.data?.data?.items || []);
      setDashboards(dashboardsRes.data?.data?.items || []);
    } catch (err) {
      toast.error('Error loading data: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const completedUploads = uploads.filter(u => u.status === 'COMPLETED');

  const getDashboardForUpload = (upload) => {
    return dashboards.find(d => d.uploadId === upload.id || d.clientId === upload.clientId);
  };

  const handleCreateDashboard = async (upload) => {
    setSelectedUpload(upload);
    setCreateForm({
      name: `${upload.businessType.charAt(0).toUpperCase() + upload.businessType.slice(1)} Dashboard`,
      description: `Analytics dashboard for ${upload.clientId}`,
    });
    setShowCreateDialog(true);
  };

  const submitCreateDashboard = async () => {
    if (!selectedUpload) return;
    setCreating(true);
    try {
      const res = await api.post('/bi/dashboards', {
        clientId: selectedUpload.clientId,
        uploadId: selectedUpload.id,
        businessType: selectedUpload.businessType,
        name: createForm.name,
        description: createForm.description,
      });
      toast.success('Dashboard created as DRAFT');
      setShowCreateDialog(false);
      loadData();
    } catch (err) {
      toast.error('Failed to create: ' + (err.response?.data?.error || err.message));
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (dashboard, newStatus) => {
    try {
      await api.patch(`/bi/dashboards/${dashboard.id}`, { status: newStatus });
      toast.success(`Dashboard status: ${DASHBOARD_STATUS[newStatus]?.label || newStatus}`);
      loadData();
    } catch (err) {
      toast.error('Failed to update: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (dashboard) => {
    if (!window.confirm(`Delete dashboard "${dashboard.name}"?`)) return;
    try {
      await api.delete(`/bi/dashboards/${dashboard.id}`);
      toast.success('Dashboard deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredDashboards = statusFilter === 'ALL'
    ? dashboards
    : dashboards.filter(d => d.status === statusFilter);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">BI Dashboard Manager</h1>
          <p className="text-muted-foreground">Manage BI dashboards: create, assign, mark ready for clients.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Completed Uploads Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completed Uploads Ready for Dashboards</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : completedUploads.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No completed uploads yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Client</th>
                    <th className="pb-3 pr-4 font-medium">Business Type</th>
                    <th className="pb-3 pr-4 font-medium">File</th>
                    <th className="pb-3 pr-4 font-medium">Rows</th>
                    <th className="pb-3 pr-4 font-medium">Upload Date</th>
                    <th className="pb-3 pr-4 font-medium">Assigned Dashboard</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {completedUploads.map((u) => {
                    const dashboard = getDashboardForUpload(u);
                    return (
                      <tr key={u.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 pr-4 font-medium">{u.clientId}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline">{u.businessType}</Badge>
                        </td>
                        <td className="py-3 pr-4 max-w-[150px] truncate">{u.fileName}</td>
                        <td className="py-3 pr-4">{u.totalRows || '\u2014'}</td>
                        <td className="py-3 pr-4">{formatDate(u.createdAt)}</td>
                        <td className="py-3 pr-4">
                          {dashboard ? (
                            <Badge className={DASHBOARD_STATUS[dashboard.status]?.color}>
                              {DASHBOARD_STATUS[dashboard.status]?.label || dashboard.status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">None</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            {!dashboard && (
                              <Button variant="outline" size="sm" onClick={() => handleCreateDashboard(u)}>
                                <Plus className="h-3 w-3 mr-1" /> Create Dashboard
                              </Button>
                            )}
                            {dashboard && dashboard.status !== 'PUBLISHED' && dashboard.status !== 'READY_FOR_REVIEW' && (
                              <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(dashboard, 'READY_FOR_REVIEW')}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Submit for Review
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Dashboards Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">All Dashboards</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.entries(DASHBOARD_STATUS).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredDashboards.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No dashboards found.</div>
          ) : (
            <div className="space-y-3">
              {filteredDashboards.map((d) => (
                <Card key={d.id} className="border">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4 text-primary" />
                          <span className="font-semibold">{d.name}</span>
                          <Badge className={DASHBOARD_STATUS[d.status]?.color}>
                            {DASHBOARD_STATUS[d.status]?.label || d.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Client: {d.clientId} | Business: {d.businessType} | Created: {formatDate(d.createdAt)}
                        </p>
                        {d.description && (
                          <p className="text-xs text-muted-foreground">{d.description}</p>
                        )}
                        {d.assignedAt && (
                          <p className="text-xs text-muted-foreground">Assigned: {formatDate(d.assignedAt)}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {d.status === 'DRAFT' && (
                          <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(d, 'IN_PROGRESS')}>
                            <Clock className="h-3 w-3 mr-1" /> Start
                          </Button>
                        )}
                        {d.status === 'IN_PROGRESS' && (
                          <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(d, 'READY_FOR_REVIEW')}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Submit for Review
                          </Button>
                        )}
                        {d.status === 'READY_FOR_REVIEW' && (
                          <span className="text-xs text-yellow-600 font-medium flex items-center gap-1 mr-2">
                            <Clock className="h-3 w-3" /> Awaiting review
                          </span>
                        )}
                        {d.status === 'PUBLISHED' && (
                          <Button variant="outline" size="sm" onClick={() => window.open(`/bi-dashboard/${d.id}`, '_blank')}>
                            <Eye className="h-3 w-3 mr-1" /> Preview
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(d)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Dashboard config preview */}
                    {d.dashboardConfig?.sections && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {d.dashboardConfig.sections.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {s.type === 'line' ? '\u{1F4C8}' : s.type === 'bar' ? '\u{1F4CA}' : s.type === 'pie' ? '\u{1F967}' : '\u{1F4CB}'} {s.title}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dashboard Dialog */}
      {showCreateDialog && selectedUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateDialog(false)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-lg m-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Create Dashboard</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Client</label>
                <p className="text-sm text-muted-foreground">{selectedUpload.clientId}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Business Type</label>
                <Badge variant="outline">{selectedUpload.businessType}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium">Dashboard Name</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A template matching the business type will be applied automatically.
                The dashboard will be created in DRAFT status.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={submitCreateDashboard} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Dashboard'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
