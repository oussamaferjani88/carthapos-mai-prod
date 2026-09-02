import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Store, Send, UploadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { biFetch, API_BASE_URL, formatDate } from "@/lib/bi-client";
import { getAuthUser, getAuthClient } from "@/lib/auth";

const STEPS = [
  { id: 1, title: "Choisir le POS", icon: Store },
  { id: 2, title: "Données + Envoi", icon: Send },
];

type PosOption = {
  licenseId: string;
  businessName: string;
  sector: string;
  createdAt: string;
};

type PosLicense = {
  id: string;
  sector?: string;
  createdAt?: string;
  configuration?: { businessName?: string };
  client?: { name?: string };
};

const getPortalUser = () => {
  const authClient = getAuthClient();
  const authUser = getAuthUser();
  return {
    id: authClient?.id || authUser?.id,
    email: authClient?.email || authUser?.email,
  };
};

export default function RequestWizard() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [posLoading, setPosLoading] = useState(true);
  const [posOptions, setPosOptions] = useState<PosOption[]>([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState("");

  const [zipFile, setZipFile] = useState<File | null>(null);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadPos = async () => {
      const user = getPortalUser();
      if (!user?.id) {
        if (mounted) setPosLoading(false);
        return;
      }
      try {
        const params = new URLSearchParams();
        params.set("userId", user.id);
        if (user.email) params.set("userEmail", user.email);
        const res = await fetch(`${API_BASE_URL}/licenses?${params.toString()}`, {
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": user.id,
            ...(user.email ? { "X-User-Email": user.email } : {}),
          },
        });
        if (!res.ok) throw new Error("Failed to load POS");
        const data = await res.json();
        if (!mounted) return;
        // Backend wraps via ApiResponse.success(): { status, message, data }
        const body = data as { data?: PosLicense[] };
        const list = Array.isArray(body?.data) ? body.data : [];
        const options = list.map((license: PosLicense) => ({
          licenseId: license.id,
          businessName: license.configuration?.businessName || license.client?.name || "POS",
          sector: license.sector || "restaurant",
          createdAt: license.createdAt || "",
        }));
        setPosOptions(options);
        if (options.length > 0) setSelectedLicenseId(options[0].licenseId);
      } catch (err) {
        console.error(err);
        if (mounted) setError("Impossible de charger vos POS.");
      } finally {
        if (mounted) setPosLoading(false);
      }
    };
    loadPos();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedPos = posOptions.find((pos) => pos.licenseId === selectedLicenseId) || null;

  const canNext = () => {
    if (currentStep === 1) return !!selectedLicenseId;
    return !!zipFile;
  };

  const handleSubmit = async () => {
    if (!selectedPos) return;
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("licenseId", selectedPos.licenseId);
      formData.append("dashboardTemplate", selectedPos.sector || "restaurant");
      formData.append("businessName", selectedPos.businessName);
      formData.append("message", `Demande de tableau de bord pour ${selectedPos.businessName}.`);
      formData.append("paymentRequired", String(paymentRequired));
      if (zipFile) formData.append("file", zipFile);

      const res = await biFetch("/bi-requests", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Échec de l'envoi de la demande");
      }
      const json = await res.json();
      navigate(`/dashboard/bi/requests/${json.request?.id || ""}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndicator = (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {STEPS.map((step, idx) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${
              currentStep > step.id
                ? "bg-green-500/10 border-green-500/30 text-green-600"
                : currentStep === step.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border"
            }`}
          >
            {currentStep > step.id ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
            {step.title}
          </div>
          {idx < STEPS.length - 1 && <div className="w-6 h-px bg-border" />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/bi")}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-[22px]">Nouvelle demande de tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            Choisissez votre POS, envoyez vos données et suivez la création de votre tableau de bord.
          </p>
        </div>
      </div>

      {stepIndicator}

      <Card>
        <CardContent className="p-6">
          {error && <div className="mb-4 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">{error}</div>}

          {currentStep === 1 && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Sélectionnez le POS concerné par la demande</div>
              {posLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 rounded-lg border border-border bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : posOptions.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Aucun POS trouvé. Créez d'abord votre POS avant de faire une demande de tableau de bord.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {posOptions.map((pos) => (
                    <button
                      key={pos.licenseId}
                      type="button"
                      onClick={() => setSelectedLicenseId(pos.licenseId)}
                      className={`text-left rounded-lg border p-4 transition-colors ${
                        selectedLicenseId === pos.licenseId
                          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Store className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{pos.businessName}</div>
                          <div className="text-sm text-muted-foreground capitalize">{pos.sector}</div>
                          {pos.createdAt && <div className="text-xs text-muted-foreground mt-1">Créé le {formatDate(pos.createdAt)}</div>}
                        </div>
                        {selectedLicenseId === pos.licenseId && (
                          <span className="mt-0.5 p-1 rounded-full bg-primary text-primary-foreground">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fichier de données (ZIP exporté depuis votre POS)</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept=".zip" onChange={(e) => setZipFile(e.target.files?.[0] || null)} />
                  {zipFile && <span className="text-xs text-muted-foreground shrink-0">{zipFile.name}</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Utilisez la fonctionnalité d'export BI de votre POS pour générer le fichier ZIP.
                </p>
              </div>
              <Separator />
              <div className="flex items-center gap-2">
                <Checkbox id="payment" checked={paymentRequired} onCheckedChange={(v) => setPaymentRequired(v === true)} />
                <Label htmlFor="payment">Cette demande nécessite un paiement (facturation spéciale)</Label>
              </div>
              <Separator />
              <div className="rounded-lg border border-border p-4 space-y-1 text-sm">
                <div className="font-medium">Récapitulatif</div>
                {selectedPos && (
                  <>
                    <div>
                      POS : <span className="font-medium">{selectedPos.businessName}</span>
                    </div>
                    <div>
                      Activité : <span className="font-medium capitalize">{selectedPos.sector}</span>
                    </div>
                  </>
                )}
                <div>
                  Données : <span className="font-medium">{zipFile ? zipFile.name : "Aucun fichier sélectionné"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <UploadCloud className="w-4 h-4" />
                Vous pourrez modifier ou ajouter votre fichier de données depuis la page de la demande.
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (currentStep > 1 ? setCurrentStep((s) => s - 1) : navigate("/dashboard/bi"))}
              disabled={submitting}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> {currentStep === 1 ? "Annuler" : "Précédent"}
            </Button>
            {currentStep < 2 ? (
              <Button size="sm" onClick={() => setCurrentStep((s) => s + 1)} disabled={!canNext()}>
                Suivant <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !zipFile}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1" /> Envoyer la demande
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
