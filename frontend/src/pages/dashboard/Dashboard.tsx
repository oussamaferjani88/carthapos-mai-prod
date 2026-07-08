import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Package, Calendar, Download, Eye, RefreshCw, FileUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

type PortalUser = {
  id?: string;
  email?: string;
};

type LicenseModule = {
  id: string;
  module?: {
    id?: string;
    displayName?: string;
    category?: string;
    isCore?: boolean;
  };
};

type License = {
  id: string;
  sector: string;
  buildStatus?: string | null;
  buildProjectPath?: string | null;
  createdAt: string;
  isActive: boolean;
  modules?: LicenseModule[];
  client?: { name?: string; email?: string };
  configuration?: { businessName?: string; currency?: string; language?: string };
};

type ModuleItem = {
  id: string;
  displayName: string;
  category: string;
  isCore: boolean;
};

type UpgradeQuote = {
  newModules: Array<{
    id: string;
    displayName: string;
    unitPrice: number;
  }>;
  amountDue: number;
  currency: string;
};

type PosSystem = {
  id: string;
  licenseId: string;
  name: string;
  type: string;
  modules: number;
  createdAt: string;
  status: string;
  buildProjectPath: string | null;
  raw: License;
};

type BIRequest = {
  id: string;
  licenseId: string;
  dashboardType: string;
  message: string;
  businessName?: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "REQUEST_INFO";
  specialistNotes?: string;
  objectives?: string[] | null;
  kpis?: string[] | null;
  dashboardRequirements?: string | null;
  paymentStatus?: string;
  createdAt: string;
  updatedAt?: string;
  files?: Array<{
    originalName: string;
    url: string;
  }>;
};

type ModuleUpgradeTransaction = {
  id: string;
  method: string;
  reference?: string | null;
  amountDue: number;
  paidAmount: number;
  change: number;
  createdAt: string;
  modulesAdded?: Array<{
    id: string;
    displayName: string;
    category: string;
    unitPrice: number;
  }>;
};

const getPortalUser = (): PortalUser | null => {
  try {
    const local = localStorage.getItem("user");
    if (local) return JSON.parse(local);
  } catch {
    // ignore
  }

  try {
    const session = sessionStorage.getItem("user");
    if (session) return JSON.parse(session);
  } catch {
    // ignore
  }

  return null;
};

const getStatusLabel = (license: License) => {
  if (license.buildStatus === "building") return "building";
  if (license.buildStatus === "completed") return "ready";
  if (license.buildStatus === "failed") return "failed";
  return license.isActive ? "active" : "inactive";
};

const Dashboard = () => {
  const { t } = useTranslation();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({ threshold: 0.2 });
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [availableModules, setAvailableModules] = useState<ModuleItem[]>([]);
  const [selectedUpgradeModuleIds, setSelectedUpgradeModuleIds] = useState<string[]>([]);
  const [quote, setQuote] = useState<UpgradeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeTransactions, setUpgradeTransactions] = useState<ModuleUpgradeTransaction[]>([]);
  const [upgradeTransactionsLoading, setUpgradeTransactionsLoading] = useState(false);
  const [biRequests, setBiRequests] = useState<BIRequest[]>([]);
  const [biLoading, setBiLoading] = useState(false);
  const [biSubmitLoading, setBiSubmitLoading] = useState(false);
  const [biForm, setBiForm] = useState({
    businessName: "",
    dashboardType: "sales-overview",
    message: "",
    objectives: "",
    kpis: "",
    dashboardRequirements: "",
    csvFiles: [] as File[],
  });

  const loadHistory = async () => {
    const user = getPortalUser();
    if (!user?.id) {
      setLicenses([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("userId", user.id);
      if (user.email) params.set("userEmail", user.email);

      const response = await fetch(`${API_BASE_URL}/licenses?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          ...(user.email ? { "X-User-Email": user.email } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load POS history");
      }

      const data = (await response.json()) as License[];
      setLicenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setLicenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Poll build status while there are pending builds.
  useEffect(() => {
    const pending = licenses.filter((l) => l.buildStatus === "building");
    if (pending.length === 0) return;

    const interval = setInterval(async () => {
      const updates = await Promise.all(
        pending.map(async (license) => {
          try {
            const response = await fetch(`${API_BASE_URL}/pos/build-status/${license.id}`);
            if (!response.ok) return null;
            const data = await response.json();
            return { id: license.id, status: data.status as string };
          } catch {
            return null;
          }
        })
      );

      setLicenses((prev) =>
        prev.map((license) => {
          const update = updates.find((u) => u?.id === license.id);
          if (!update) return license;
          return {
            ...license,
            buildStatus:
              update.status === "completed"
                ? "completed"
                : update.status === "failed"
                ? "failed"
                : "building",
          };
        })
      );
    }, 8000);

    return () => clearInterval(interval);
  }, [licenses]);

  const posSystems = useMemo<PosSystem[]>(() => {
    return licenses.map((license) => ({
      id: license.id,
      licenseId: license.id,
      name: license.configuration?.businessName || license.client?.name || "POS System",
      type: license.sector,
      modules: license.modules?.length || 0,
      createdAt: license.createdAt,
      status: getStatusLabel(license),
      buildProjectPath: license.buildProjectPath || null,
      raw: license,
    }));
  }, [licenses]);

  const regeneratePOS = async (licenseId: string) => {
    setActionLoadingId(licenseId);
    try {
      const response = await fetch(`${API_BASE_URL}/pos/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ licenseId }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate POS");
      }

      await loadHistory();
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const downloadPOS = (buildProjectPath: string | null) => {
    if (!buildProjectPath) {
      return;
    }

    const downloadUrl = `${API_BASE_URL}/pos/download?path=${encodeURIComponent(buildProjectPath)}`;
    window.open(downloadUrl, "_blank");
  };

  const openDetails = (license: License) => {
    setSelectedLicense(license);
    setSelectedUpgradeModuleIds([]);
    setQuote(null);
    setBiForm({
      businessName: license.configuration?.businessName || license.client?.name || "",
      dashboardType: "sales-overview",
      message: "",
      csvFiles: [],
    });
    setUpgradeTransactions([]);
    setDetailsOpen(true);
  };

  const loadModules = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/modules`);
      if (!response.ok) return;
      const data = (await response.json()) as ModuleItem[];
      setAvailableModules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (detailsOpen) {
      loadModules();
    }
  }, [detailsOpen]);

  const loadBiRequests = async (licenseId: string) => {
    const user = getPortalUser();
    setBiLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("licenseId", licenseId);
      if (user?.id) params.set("userId", user.id);
      if (user?.email) params.set("userEmail", user.email);

      const response = await fetch(`${API_BASE_URL}/bi-requests?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load BI requests");
      }

      const data = (await response.json()) as BIRequest[];
      setBiRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setBiRequests([]);
    } finally {
      setBiLoading(false);
    }
  };

  useEffect(() => {
    if (!detailsOpen || !selectedLicense) return;
    loadBiRequests(selectedLicense.id);
  }, [detailsOpen, selectedLicense]);

  const loadUpgradeTransactions = async (licenseId: string) => {
    setUpgradeTransactionsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/licenses/${licenseId}/module-upgrade-transactions`);
      if (!response.ok) {
        throw new Error("Failed to load module upgrade transactions");
      }

      const data = (await response.json()) as {
        transactions?: ModuleUpgradeTransaction[];
      };
      setUpgradeTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (error) {
      console.error(error);
      setUpgradeTransactions([]);
    } finally {
      setUpgradeTransactionsLoading(false);
    }
  };

  useEffect(() => {
    if (!detailsOpen || !selectedLicense) return;
    loadUpgradeTransactions(selectedLicense.id);
  }, [detailsOpen, selectedLicense]);

  useEffect(() => {
    const runQuote = async () => {
      if (!selectedLicense || selectedUpgradeModuleIds.length === 0) {
        setQuote(null);
        return;
      }

      setQuoteLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/licenses/${selectedLicense.id}/module-upgrade-quote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ moduleIds: selectedUpgradeModuleIds }),
        });

        if (!response.ok) {
          throw new Error("Failed to calculate quote");
        }

        const data = (await response.json()) as UpgradeQuote;
        setQuote(data);
      } catch (error) {
        console.error(error);
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    };

    runQuote();
  }, [selectedLicense, selectedUpgradeModuleIds]);

  const toggleUpgradeModule = (moduleId: string, checked: boolean) => {
    setSelectedUpgradeModuleIds((prev) => {
      if (checked) return Array.from(new Set([...prev, moduleId]));
      return prev.filter((id) => id !== moduleId);
    });
  };

  const purchaseAndRegenerate = async () => {
    if (!selectedLicense || !quote) return;

    setUpgradeLoading(true);
    try {
      const paymentReference = `UPG-${Date.now()}`;
      const purchaseResponse = await fetch(`${API_BASE_URL}/licenses/${selectedLicense.id}/module-upgrade-purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          moduleIds: selectedUpgradeModuleIds,
          payment: {
            method: "manual",
            reference: paymentReference,
            amount: quote.amountDue,
          },
        }),
      });

      if (!purchaseResponse.ok) {
        throw new Error("Failed to purchase module upgrade");
      }

      await regeneratePOS(selectedLicense.id);
      await loadHistory();
      await loadUpgradeTransactions(selectedLicense.id);

      setDetailsOpen(false);
      setSelectedLicense(null);
      setSelectedUpgradeModuleIds([]);
      setQuote(null);
    } catch (error) {
      console.error(error);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const submitBiRequest = async () => {
    if (!selectedLicense || !biForm.dashboardType || !biForm.message.trim()) {
      return;
    }

    const user = getPortalUser();
    setBiSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append("licenseId", selectedLicense.id);
      formData.append("businessName", biForm.businessName);
      formData.append("dashboardType", biForm.dashboardType);
      formData.append("message", biForm.message.trim());
      if (user?.id) formData.append("userId", user.id);
      if (user?.email) formData.append("userEmail", user.email);

      const objectives = biForm.objectives
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      formData.append("objectives", JSON.stringify(objectives));

      const kpis = biForm.kpis
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      formData.append("kpis", JSON.stringify(kpis));

      formData.append("dashboardRequirements", biForm.dashboardRequirements.trim());

      biForm.csvFiles.forEach((file) => formData.append("csvFiles", file));

      const response = await fetch(`${API_BASE_URL}/bi-requests`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit BI request");
      }

      setBiForm((prev) => ({
        ...prev,
        message: "",
        objectives: "",
        kpis: "",
        dashboardRequirements: "",
        csvFiles: [],
      }));
      await loadBiRequests(selectedLicense.id);
    } catch (error) {
      console.error(error);
    } finally {
      setBiSubmitLoading(false);
    }
  };

  const getBiStatusClasses = (status: BIRequest["status"]) => {
    if (status === "APPROVED") return "bg-green-500/10 text-green-600";
    if (status === "PENDING_REVIEW") return "bg-amber-500/10 text-amber-600";
    if (status === "REJECTED") return "bg-red-500/10 text-red-600";
    if (status === "REQUEST_INFO") return "bg-blue-500/10 text-blue-600";
    return "bg-gray-500/10 text-gray-600";
  };

  const stats = [
    {
      label: t("dashboard.stats.totalSystems"),
      value: posSystems.length,
      icon: Package,
      color: "text-blue-500",
    },
    {
      label: t("dashboard.stats.activeSystems"),
      value: posSystems.filter((p) => p.status === "active" || p.status === "ready").length,
      icon: Eye,
      color: "text-green-500",
    },
    {
      label: t("dashboard.stats.totalModules"),
      value: posSystems.reduce((acc, p) => acc + p.modules, 0),
      icon: Package,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div
            ref={headerRef}
            className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-700 ${
              headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div>
              <h1 className="text-3xl font-bold mb-2">{t("dashboard.title")}</h1>
              <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
            </div>
            <Link to="/dashboard/generator">
              <Button size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                {t("dashboard.createNew")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.myPOS")}</CardTitle>
            <CardDescription>{t("dashboard.myPOSDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <div className="text-sm text-muted-foreground mb-4">Loading history...</div>}
            {posSystems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("dashboard.noPOS")}</h3>
                <p className="text-muted-foreground mb-6">{t("dashboard.noPOSDescription")}</p>
                <Link to="/dashboard/generator">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t("dashboard.createFirst")}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {posSystems.map((pos, index) => (
                  <div
                    key={pos.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg hover:shadow-md transition-all animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{pos.name}</h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            pos.status === "active" || pos.status === "ready"
                              ? "bg-green-500/10 text-green-500"
                              : pos.status === "building"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          {pos.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {pos.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {pos.modules} {t("dashboard.modules")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(pos.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 md:mt-0">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => openDetails(pos.raw)}>
                        <Eye className="w-4 h-4" />
                        {t("dashboard.view")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={!pos.buildProjectPath || pos.status === "building"}
                        onClick={() => downloadPOS(pos.buildProjectPath)}
                      >
                        <Download className="w-4 h-4" />
                        {t("dashboard.download")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={actionLoadingId === pos.licenseId || pos.status === "building"}
                        onClick={() => regeneratePOS(pos.licenseId)}
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${actionLoadingId === pos.licenseId ? "animate-spin" : ""}`}
                        />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>POS Details</DialogTitle>
            <DialogDescription>Configuration and generation data for this POS.</DialogDescription>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-muted-foreground">Business</div>
                  <div className="font-medium">{selectedLicense.configuration?.businessName || selectedLicense.client?.name || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Sector</div>
                  <div className="font-medium capitalize">{selectedLicense.sector}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-medium">{getStatusLabel(selectedLicense)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Created</div>
                  <div className="font-medium">{new Date(selectedLicense.createdAt).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <div className="text-muted-foreground mb-2">Modules ({selectedLicense.modules?.length || 0})</div>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-auto">
                  {(selectedLicense.modules || []).map((m) => (
                    <div key={m.id} className="p-2 border border-border rounded">
                      <div className="font-medium">{m.module?.displayName || "Module"}</div>
                      <div className="text-xs text-muted-foreground">{m.module?.category || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground mb-2">Add more modules</div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto border border-border rounded p-3">
                  {availableModules
                    .filter((m) => !selectedLicense.modules?.some((lm) => lm.module?.id === m.id))
                    .map((module) => (
                      <label key={module.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedUpgradeModuleIds.includes(module.id)}
                          onCheckedChange={(checked) => toggleUpgradeModule(module.id, Boolean(checked))}
                        />
                        <span className="text-sm">{module.displayName}</span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="border border-border rounded p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount due</span>
                  <span className="font-semibold">
                    {quoteLoading ? "Calculating..." : `${quote?.amountDue ?? 0} ${quote?.currency ?? "EUR"}`}
                  </span>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    disabled={!quote || quote.amountDue < 0 || upgradeLoading}
                    onClick={purchaseAndRegenerate}
                  >
                    {upgradeLoading ? "Processing..." : "Pay & Regenerate"}
                  </Button>
                </div>
              </div>

              <div className="border border-border rounded p-4 space-y-3">
                <div className="font-medium">Module Upgrade Payment History</div>
                {upgradeTransactionsLoading ? (
                  <div className="text-xs text-muted-foreground">Loading payment history...</div>
                ) : upgradeTransactions.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No module upgrade payments recorded yet.</div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-auto">
                    {upgradeTransactions.map((tx) => (
                      <div key={tx.id} className="rounded border border-border p-2">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="text-xs font-medium uppercase tracking-wide">{tx.method}</div>
                          <div className="text-[11px] text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Paid {tx.paidAmount} EUR for {tx.modulesAdded?.length || 0} module(s)
                          {tx.reference ? ` • Ref: ${tx.reference}` : ""}
                        </div>
                        {(tx.modulesAdded || []).length > 0 && (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {(tx.modulesAdded || []).map((m) => m.displayName).join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-border rounded p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileUp className="w-4 h-4" />
                  <div className="font-medium">BI Dashboard Request</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-muted-foreground mb-1">Business name</div>
                    <Input
                      value={biForm.businessName}
                      onChange={(e) => setBiForm((prev) => ({ ...prev, businessName: e.target.value }))}
                      placeholder="Business name"
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Dashboard type</div>
                    <Select
                      value={biForm.dashboardType}
                      onValueChange={(value) => setBiForm((prev) => ({ ...prev, dashboardType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select dashboard type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales-overview">Sales overview</SelectItem>
                        <SelectItem value="inventory-control">Inventory control</SelectItem>
                        <SelectItem value="customer-insights">Customer insights</SelectItem>
                        <SelectItem value="finance-kpi">Finance KPI</SelectItem>
                        <SelectItem value="custom">Custom dashboard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1">Business objective</div>
                  <Textarea
                    value={biForm.message}
                    onChange={(e) => setBiForm((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="Describe your metrics, filters, and expected dashboard outcomes"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-muted-foreground mb-1">Objectives (one per line)</div>
                    <Textarea
                      value={biForm.objectives}
                      onChange={(e) => setBiForm((prev) => ({ ...prev, objectives: e.target.value }))}
                      placeholder="Increase sales by 20%&#10;Reduce inventory costs&#10;Improve customer retention"
                      rows={3}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">KPIs (one per line)</div>
                    <Textarea
                      value={biForm.kpis}
                      onChange={(e) => setBiForm((prev) => ({ ...prev, kpis: e.target.value }))}
                      placeholder="Monthly revenue&#10;Inventory turnover rate&#10;Customer acquisition cost"
                      rows={3}
                    />
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1">Dashboard requirements</div>
                  <Textarea
                    value={biForm.dashboardRequirements}
                    onChange={(e) => setBiForm((prev) => ({ ...prev, dashboardRequirements: e.target.value }))}
                    placeholder="Specific charts, filters, time ranges, or any special requirements"
                    rows={2}
                  />
                </div>

                <div>
                  <div className="text-muted-foreground mb-1">Upload CSV files (optional)</div>
                  <Input
                    type="file"
                    multiple
                    accept=".csv"
                    onChange={(e) =>
                      setBiForm((prev) => ({
                        ...prev,
                        csvFiles: Array.from(e.target.files || []),
                      }))
                    }
                  />
                  {biForm.csvFiles.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {biForm.csvFiles.length} file(s): {biForm.csvFiles.map((f) => f.name).join(", ")}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={submitBiRequest}
                    disabled={biSubmitLoading || !biForm.message.trim() || !biForm.dashboardType}
                  >
                    {biSubmitLoading ? "Submitting..." : "Submit BI Request"}
                  </Button>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="text-muted-foreground mb-2">Your BI requests for this POS</div>
                  {biLoading ? (
                    <div className="text-xs text-muted-foreground">Loading BI requests...</div>
                  ) : biRequests.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No BI requests submitted yet.</div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-auto">
                      {biRequests.map((request) => (
                        <div key={request.id} className="rounded border border-border p-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="font-medium text-xs uppercase tracking-wide">{request.dashboardType}</div>
                            <span className={`px-2 py-0.5 rounded text-[10px] ${getBiStatusClasses(request.status)}`}>
                              {request.status}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">{request.message}</div>
                          {Array.isArray(request.objectives) && request.objectives.length > 0 && (
                            <div className="text-[11px] mb-0.5">
                              <span className="font-medium">Objectives:</span> {request.objectives.join(", ")}
                            </div>
                          )}
                          {Array.isArray(request.kpis) && request.kpis.length > 0 && (
                            <div className="text-[11px] mb-0.5">
                              <span className="font-medium">KPIs:</span> {request.kpis.join(", ")}
                            </div>
                          )}
                          {request.dashboardRequirements?.trim() && (
                            <div className="text-[11px] mb-0.5">
                              <span className="font-medium">Requirements:</span> {request.dashboardRequirements}
                            </div>
                          )}
                          {request.specialistNotes?.trim() && (
                            <div className="text-xs mb-1">
                              <span className="font-medium">Specialist note:</span> {request.specialistNotes}
                            </div>
                          )}
                          {Array.isArray(request.files) && request.files.length > 0 && (
                            <div className="mb-1 space-y-0.5">
                              <div className="text-[11px] text-muted-foreground">Attached files</div>
                              {request.files.map((file) => (
                                <a
                                  key={`${request.id}-${file.url}`}
                                  href={`${API_ORIGIN}${file.url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-[11px] text-primary hover:underline"
                                >
                                  {file.originalName}
                                </a>
                              ))}
                            </div>
                          )}
                          {request.status === "APPROVED" && Array.isArray(request.files) && request.files.length > 0 && (
                            <div className="mb-1 rounded border border-green-200 bg-green-50 px-2 py-1">
                              <div className="text-[11px] font-medium text-green-700">Delivered assets ready</div>
                              <div className="text-[11px] text-green-700/90">
                                Download the attached files above
                                {request.updatedAt ? ` (updated ${new Date(request.updatedAt).toLocaleString()})` : ""}.
                              </div>
                            </div>
                          )}
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(request.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
