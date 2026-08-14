import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  FileText,
  UserCheck,
  Lightbulb,
  Database,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import api from "../lib/api";
import { useClientNameMap } from "../hooks/useClientNameMap";

const ANALYSIS_STATUS = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  UNDER_ANALYSIS: {
    label: "Under Analysis",
    color: "bg-blue-100 text-blue-700",
  },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700" },
};

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

function formatCurrency(val) {
  if (val === null || val === undefined) return "\u2014";
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return (
    num.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " \u20AC"
  );
}

function formatNumber(val) {
  if (val === null || val === undefined) return "\u2014";
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString("fr-FR");
}

function formatDate(iso) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString("fr-FR");
}

export default function AdminBIAnalysisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const clientNames = useClientNameMap();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [analysisRes, metricsRes] = await Promise.all([
        api.get(`/bi/analysis/${id}`),
        api.get(`/bi/analysis/${id}/metrics`),
      ]);
      setAnalysis(analysisRes.data?.data || analysisRes.data);
      setMetrics(metricsRes.data?.data || metricsRes.data);
      setNotes(analysisRes.data?.data?.notes || "");
    } catch (err) {
      toast.error("Error: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateInsights = async () => {
    try {
      await api.post(`/bi/analysis/${id}/generate-insights`);
      toast.success("Insights generated");
      loadData();
    } catch (err) {
      toast.error("Failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await api.patch(`/bi/analysis/${id}`, { notes });
      toast.success("Notes saved");
    } catch (err) {
      toast.error("Failed: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      if (newStatus === "COMPLETED") {
        await api.post(`/bi/analysis/${id}/generate-insights`);
      }
      await api.patch(`/bi/analysis/${id}`, { status: newStatus });
      toast.success(`Status: ${newStatus}`);
      loadData();
    } catch (err) {
      toast.error("Failed: " + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div>
        <p className="text-destructive">Analysis request not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/bi-analysis")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  const insights = analysis.insights || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/bi-analysis")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Analysis Detail</h1>
          <p className="text-muted-foreground text-sm">
            Client: {clientNames[analysis.clientId] || analysis.clientId} |
            Business: {analysis.businessType}
          </p>
          <div className="flex gap-2 mt-2">
            <Badge className={ANALYSIS_STATUS[analysis.status]?.color}>
              {ANALYSIS_STATUS[analysis.status]?.label || analysis.status}
            </Badge>
            {analysis.upload && (
              <Badge variant="outline">{analysis.upload.fileName}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateInsights}>
            <Lightbulb className="mr-2 h-4 w-4" /> Generate Insights
          </Button>
          {analysis.status === "PENDING" && (
            <Button
              size="sm"
              onClick={() => handleStatusChange("UNDER_ANALYSIS")}
            >
              <UserCheck className="mr-2 h-4 w-4" /> Start Analysis
            </Button>
          )}
          {analysis.status === "UNDER_ANALYSIS" && (
            <>
              <Button size="sm" onClick={() => handleStatusChange("COMPLETED")}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Complete
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleStatusChange("REJECTED")}
              >
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
            </>
          )}
          {(analysis.status === "COMPLETED" ||
            analysis.status === "REJECTED") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("PENDING")}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Reopen
            </Button>
          )}
        </div>
      </div>

      {/* Insight Cards */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.map((insight, i) => (
            <Card key={i} className="border-l-4 border-l-primary">
              <CardHeader className="pb-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {insight.type}
                  </Badge>
                  <CardTitle className="text-sm">{insight.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {insight.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Warehouse Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Warehouse Metrics
            </CardTitle>
            <CardDescription>
              Data from the analytics warehouse for this client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {metrics.totalRevenue !== undefined && (
                <MetricCard
                  label="Total Revenue"
                  value={formatCurrency(metrics.totalRevenue)}
                />
              )}
              {metrics.totalSales !== undefined && (
                <MetricCard
                  label="Sales Count"
                  value={formatNumber(metrics.totalSales)}
                />
              )}
              {metrics.averageTicket !== undefined && (
                <MetricCard
                  label="Avg Ticket"
                  value={formatCurrency(metrics.averageTicket)}
                />
              )}
              {metrics.avgTicket !== undefined && (
                <MetricCard
                  label="Avg Ticket"
                  value={formatCurrency(metrics.avgTicket)}
                />
              )}
              {metrics.totalProducts !== undefined && (
                <MetricCard
                  label="Products"
                  value={formatNumber(metrics.totalProducts)}
                />
              )}
              {metrics.totalRows !== undefined && (
                <MetricCard
                  label="Records"
                  value={formatNumber(metrics.totalRows)}
                />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Revenue Trend */}
              {metrics.revenueByDay && metrics.revenueByDay.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Revenue Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={metrics.revenueByDay}
                          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis
                            dataKey="date"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            width={40}
                          />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Products */}
              {metrics.topProducts && metrics.topProducts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={metrics.topProducts.slice(0, 8)}
                          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis
                            dataKey="name"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            width={40}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="total"
                            fill="#3b82f6"
                            radius={[3, 3, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Peak Hours */}
              {metrics.peakHours && metrics.peakHours.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Peak Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={metrics.peakHours}
                          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis
                            dataKey="hour"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            width={40}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            fill="#f59e0b"
                            radius={[3, 3, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Inventory */}
              {metrics.inventoryTurnover &&
                metrics.inventoryTurnover.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Inventory Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-left text-muted-foreground">
                              <th className="pb-1 pr-2">Product</th>
                              <th className="pb-1 pr-2">Stock</th>
                              <th className="pb-1">Sold</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.inventoryTurnover
                              .slice(0, 15)
                              .map((item, i) => (
                                <tr
                                  key={i}
                                  className="border-b hover:bg-muted/50"
                                >
                                  <td className="py-1 pr-2">
                                    {item.productName || item.name}
                                  </td>
                                  <td
                                    className={`py-1 pr-2 ${(item.stock || 0) < 10 ? "text-red-600 font-medium" : ""}`}
                                  >
                                    {item.stock ?? "\u2014"}
                                  </td>
                                  <td className="py-1">
                                    {item.timesSold ?? "\u2014"}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analyst Notes</CardTitle>
          <CardDescription>
            Record observations about this analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Enter your analysis notes here..."
            className="mb-3"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Created: {formatDate(analysis.createdAt)}
              {analysis.completedAt && (
                <> | Completed: {formatDate(analysis.completedAt)}</>
              )}
            </span>
            <Button size="sm" onClick={handleSaveNotes} disabled={saving}>
              {saving ? "Saving..." : "Save Notes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <Card>
      <CardContent className="pt-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}
