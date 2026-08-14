import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  FileText,
  Download,
  Eye,
  MoreHorizontal,
  Calendar,
  User,
  Package,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import PageHeader from "../components/shared/PageHeader";
import { licensesApi } from "../lib/api";
import toast from "react-hot-toast";

export default function Licenses() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadLicenses();
  }, []);

  const loadLicenses = async () => {
    try {
      setLoading(true);
      const response = await licensesApi.getAll();
      setLicenses(response.data);
    } catch (error) {
      console.error("Error loading licenses:", error);
      toast.error("Erreur lors du chargement des licences");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (license) => {
    setSelectedLicense(license);
    setDetailsOpen(true);
  };

  const handleGenerateLicenseFile = async (license) => {
    try {
      const response = await licensesApi.generateFile(license.id);

      // Créer un blob et télécharger le fichier
      const blob = new Blob([response.data.content], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `license-${license.licenseKey}.key`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Fichier de licence téléchargé");
    } catch (error) {
      console.error("Error generating license file:", error);
      toast.error("Erreur lors de la génération du fichier");
    }
  };

  const getLicenseStatusBadge = (license) => {
    if (!license.isActive) {
      return <Badge variant="neutral">Inactive</Badge>;
    }

    if (license.licenseType === "LIFETIME") {
      return <Badge variant="success">À vie</Badge>;
    }

    const expirationDate = new Date(license.expirationDate);
    const now = new Date();
    const daysUntilExpiration = Math.ceil(
      (expirationDate - now) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiration < 0) {
      return <Badge variant="danger">Expirée</Badge>;
    } else if (daysUntilExpiration <= 30) {
      return (
        <Badge variant="warning">Expire dans {daysUntilExpiration} jours</Badge>
      );
    } else {
      return <Badge variant="success">Active</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Licences"
          description="Gérez les licences POS de vos clients"
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Licences"
        description="Gérez les licences POS de vos clients"
      />

      {licenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-2 text-base font-medium">Aucune licence</h3>
            <p className="text-sm text-muted-foreground">
              Les licences créées apparaîtront ici
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {licenses.map((license) => (
            <Card
              key={license.id}
              className="transition-colors hover:bg-accent/30"
            >
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-md bg-muted text-xs font-semibold uppercase text-muted-foreground">
                      {license.sector ? license.sector.charAt(0) : "P"}
                    </span>
                    {license.client.name}
                  </CardTitle>
                  <CardDescription className="mt-1 font-mono text-xs">
                    {license.licenseKey}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleViewDetails(license)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Voir les détails
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleGenerateLicenseFile(license)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger licence
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Statut
                    </span>
                    {getLicenseStatusBadge(license)}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Secteur
                    </span>
                    <span className="text-sm font-medium capitalize">
                      {license.sector}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Modules
                    </span>
                    <Badge variant="outline">
                      {license.modules?.length || 0} modules
                    </Badge>
                  </div>

                  {license.expirationDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Expiration
                      </span>
                      <span className="text-sm">
                        {new Date(license.expirationDate).toLocaleDateString(
                          "fr-FR",
                        )}
                      </span>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Créée le{" "}
                    {new Date(license.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog des détails de licence */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la licence</DialogTitle>
            <DialogDescription>
              Informations complètes sur la licence sélectionnée
            </DialogDescription>
          </DialogHeader>

          {selectedLicense && (
            <div className="space-y-4">
              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Client
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{selectedLicense.client.name}</p>
                    <p className="text-muted-foreground">
                      {selectedLicense.client.email}
                    </p>
                    {selectedLicense.client.phone && (
                      <p className="text-muted-foreground">
                        {selectedLicense.client.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Licence
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Clé:</span>{" "}
                      {selectedLicense.licenseKey}
                    </p>
                    <p>
                      <span className="font-medium">Type:</span>{" "}
                      {selectedLicense.licenseType === "LIFETIME"
                        ? "À vie"
                        : "Abonnement"}
                    </p>
                    <p>
                      <span className="font-medium">Secteur:</span>{" "}
                      {selectedLicense.sector}
                    </p>
                    {selectedLicense.expirationDate && (
                      <p>
                        <span className="font-medium">Expiration:</span>{" "}
                        {new Date(
                          selectedLicense.expirationDate,
                        ).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Configuration */}
              {selectedLicense.configuration && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>
                        <span className="font-medium">Nom commercial:</span>{" "}
                        {selectedLicense.configuration.businessName}
                      </p>
                      <p>
                        <span className="font-medium">Devise:</span>{" "}
                        {selectedLicense.configuration.currency}
                      </p>
                      <p>
                        <span className="font-medium">TVA:</span>{" "}
                        {selectedLicense.configuration.taxRate}%
                      </p>
                    </div>
                    <div>
                      <p>
                        <span className="font-medium">Langue:</span>{" "}
                        {selectedLicense.configuration.language}
                      </p>
                      <p>
                        <span className="font-medium">Fuseau:</span>{" "}
                        {selectedLicense.configuration.timezone}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="font-medium mb-2">Couleurs:</p>
                    <div className="flex space-x-2">
                      <div className="flex items-center space-x-1">
                        <div
                          className="w-4 h-4 rounded border"
                          style={{
                            backgroundColor:
                              selectedLicense.configuration.primaryColor,
                          }}
                        ></div>
                        <span className="text-xs">Principale</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div
                          className="w-4 h-4 rounded border"
                          style={{
                            backgroundColor:
                              selectedLicense.configuration.accentColor,
                          }}
                        ></div>
                        <span className="text-xs">Accent</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modules */}
              <div>
                <h3 className="font-medium mb-2 flex items-center">
                  <Package className="mr-2 h-4 w-4" />
                  Modules activés ({selectedLicense.modules?.length || 0})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedLicense.modules?.map((licenseModule) => (
                    <div
                      key={licenseModule.id}
                      className="flex items-center space-x-2 p-2 border rounded"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {licenseModule.module.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {licenseModule.module.category}
                        </p>
                      </div>
                      {licenseModule.module.isCore && (
                        <Badge variant="neutral" className="text-xs">
                          Core
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Fermer
                </Button>
                <Button
                  onClick={() => handleGenerateLicenseFile(selectedLicense)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger licence
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
