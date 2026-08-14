import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import api from "../lib/api";
import { useClientNameMap } from "../hooks/useClientNameMap";

const DASHBOARD_STATUS = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  READY_FOR_REVIEW: {
    label: "Ready for Review",
    color: "bg-yellow-100 text-yellow-700",
  },
  PUBLISHED: { label: "Published", color: "bg-green-100 text-green-700" },
  ARCHIVED: { label: "Archived", color: "bg-red-100 text-red-700" },
};

function formatDate(iso) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString("fr-FR");
}

export default function AdminBIReview() {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("READY_FOR_REVIEW");
  const clientNames = useClientNameMap();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { pageSize: 100 };
      if (statusFilter !== "ALL") params.status = statusFilter;
      const res = await api.get("/bi/reviews", { params });
      setDashboards(res.data?.data?.items || []);
    } catch (err) {
      toast.error("Error: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (d) => {
    try {
      await api.patch(`/bi/reviews/${d.id}/approve`);
      toast.success(`"${d.name}" approved and published`);
      loadData();
    } catch (err) {
      toast.error("Failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleReject = async (d) => {
    try {
      await api.patch(`/bi/reviews/${d.id}/reject`);
      toast.success(`"${d.name}" returned to draft`);
      loadData();
    } catch (err) {
      toast.error("Failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handlePreview = (d) => {
    window.open(`/bi-dashboard/${d.id}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">BI Review Queue</h1>
          <p className="text-sm text-muted-foreground">
            Approve or reject dashboards awaiting publication.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="READY_FOR_REVIEW">Ready for Review</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {dashboards.length} dashboard{dashboards.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        ) : dashboards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                No dashboards in this view.
              </p>
            </CardContent>
          </Card>
        ) : (
          dashboards.map((d) => (
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
                      Client: {clientNames[d.clientId] || "—"} | Business:{" "}
                      {d.businessType} | Created: {formatDate(d.createdAt)}
                    </p>
                    {d.description && (
                      <p className="text-xs text-muted-foreground">
                        {d.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {d.status === "READY_FOR_REVIEW" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(d)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />{" "}
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleReject(d)}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(d)}
                        >
                          <Eye className="h-3 w-3 mr-1" /> Preview
                        </Button>
                      </>
                    )}
                    {d.status === "PUBLISHED" && (
                      <>
                        <Badge className="bg-green-100 text-green-700">
                          Live
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(d)}
                        >
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
