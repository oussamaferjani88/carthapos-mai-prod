import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  BarChart3, Clock, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Search, Eye, UserCheck, FileText, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import api from '../lib/api';

const ANALYSIS_STATUS = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  UNDER_ANALYSIS: { label: 'Under Analysis', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
};

function formatDate(iso) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('fr-FR');
}

export default function AdminBIAnalystWorkspace() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { pageSize: 100 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('/bi/analysis', { params });
      setRequests(res.data?.data?.items || []);
    } catch (err) {
      toast.error('Error loading: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStartAnalysis = async (req) => {
    try {
      await api.patch(`/bi/analysis/${req.id}`, {
        status: 'UNDER_ANALYSIS',
        assignedTo: 'admin',
      });
      toast.success('Analysis started');
      loadData();
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleComplete = async (req) => {
    try {
      // Auto-generate insights before completing
      await api.post(`/bi/analysis/${req.id}/generate-insights`);
      await api.patch(`/bi/analysis/${req.id}`, { status: 'COMPLETED' });
      toast.success('Analysis completed. Dashboard can now be created.');
      loadData();
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleReject = async (req) => {
    const notes = window.prompt('Reason for rejection:');
    if (notes === null) return;
    try {
      await api.patch(`/bi/analysis/${req.id}`, { status: 'REJECTED', notes });
      toast.success('Analysis rejected');
      loadData();
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleReopen = async (req) => {
    try {
      await api.patch(`/bi/analysis/${req.id}`, { status: 'PENDING' });
      toast.success('Analysis reopened');
      loadData();
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">BI Analyst Workspace</h1>
          <p className="text-muted-foreground">Review and analyze completed data uploads before dashboard creation.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.entries(ANALYSIS_STATUS).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {requests.length} request{requests.length !== 1 ? 's' : ''}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No analysis requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-4 font-medium">Client</th>
                    <th className="p-4 font-medium">Business Type</th>
                    <th className="p-4 font-medium">Upload Date</th>
                    <th className="p-4 font-medium">File</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Analyst</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">{r.clientId}</td>
                      <td className="p-4">
                        <Badge variant="outline">{r.businessType}</Badge>
                      </td>
                      <td className="p-4">{r.upload ? formatDate(r.upload.createdAt) : '\u2014'}</td>
                      <td className="p-4 max-w-[150px] truncate">{r.upload?.fileName || '\u2014'}</td>
                      <td className="p-4">
                        <Badge className={ANALYSIS_STATUS[r.status]?.color}>
                          {ANALYSIS_STATUS[r.status]?.label || r.status}
                        </Badge>
                      </td>
                      <td className="p-4">{r.assignedTo || '\u2014'}</td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/bi-analysis/${r.id}`)}>
                            <Eye className="h-3 w-3 mr-1" /> View
                          </Button>
                          {r.status === 'PENDING' && (
                            <Button variant="outline" size="sm" onClick={() => handleStartAnalysis(r)}>
                              <UserCheck className="h-3 w-3 mr-1" /> Start
                            </Button>
                          )}
                          {r.status === 'UNDER_ANALYSIS' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleComplete(r)}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleReject(r)}>
                                <XCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          {(r.status === 'COMPLETED' || r.status === 'REJECTED') && (
                            <Button variant="outline" size="sm" onClick={() => handleReopen(r)}>
                              <RefreshCw className="h-3 w-3 mr-1" /> Reopen
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
