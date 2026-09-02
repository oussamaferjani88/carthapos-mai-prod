import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Package, Calendar, Download, Eye, RefreshCw, FileUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { posStatusMeta } from "@/lib/posStatus";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { getAuthUser, getAuthClient } from "@/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

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
  const authClient = getAuthClient();
  const authUser = getAuthUser();
  if (authClient?.id || authUser?.id) {
    return {
      id: authClient?.id || authUser?.id,
      email: authClient?.email || authUser?.email,
    };
  }

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

  const stats = [
    {
      label: t("dashboard.stats.totalSystems"),
      value: posSystems.length,
      icon: Package,
    },
    {
      label: t("dashboard.stats.activeSystems"),
      value: posSystems.filter((p) => p.status === "active" || p.status === "ready").length,
      icon: Eye,
    },
    {
      label: t("dashboard.stats.totalModules"),
      value: posSystems.reduce((acc, p) => acc + p.modules, 0),
      icon: Package,
    },
  ];

  return (
    <div className="space-y-6">
      <div
        ref={headerRef}
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all duration-700 ${
          headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-[22px]">{t("dashboard.title")}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <Link to="/dashboard/generator">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            {t("dashboard.createNew")}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={index} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.myPOS")}</CardTitle>
            <CardDescription>{t("dashboard.myPOSDescription")}</CardDescription>
            <Link
              to="/dashboard/projects"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Voir tous mes projets →
            </Link>
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
                        <Badge variant={posStatusMeta(pos.status).variant}>
                          {posStatusMeta(pos.status).label}
                        </Badge>
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
                  <div className="font-medium">{posStatusMeta(getStatusLabel(selectedLicense)).label}</div>
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

                <p className="text-sm text-muted-foreground">
                  Create, track, and manage your BI dashboard requests in the dedicated workspace.
                </p>

                <div className="flex justify-end">
                  <Button asChild size="sm">
                    <Link to="/dashboard/bi">Open BI workspace</Link>
                  </Button>
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
