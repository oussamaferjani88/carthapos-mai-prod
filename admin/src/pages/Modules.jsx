import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Shield,
  Cpu,
  Boxes,
  Utensils,
  ConciergeBell,
  Users,
  CreditCard,
  Wrench,
} from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { modulesApi } from "../lib/api";
import toast from "react-hot-toast";

export default function Modules() {
  const [modulesByCategory, setModulesByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    category: "",
    isCore: false,
  });

  const categories = [
    { value: "core", label: "Core (Système)" },
    { value: "inventory", label: "Gestion des stocks" },
    { value: "restaurant", label: "Restaurant" },
    { value: "service", label: "Service" },
    { value: "customer", label: "Client" },
    { value: "payment", label: "Paiement" },
    { value: "specialized", label: "Spécialisé" },
  ];

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      const response = await modulesApi.getByCategory();
      setModulesByCategory(response.data);
    } catch (error) {
      console.error("Error loading modules:", error);
      toast.error("Erreur lors du chargement des modules");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.displayName || !formData.category) {
      toast.error("Le nom, nom d'affichage et catégorie sont obligatoires");
      return;
    }

    try {
      if (editingModule) {
        await modulesApi.update(editingModule.id, formData);
        toast.success("Module mis à jour avec succès");
      } else {
        await modulesApi.create(formData);
        toast.success("Module créé avec succès");
      }

      setDialogOpen(false);
      setEditingModule(null);
      setFormData({
        name: "",
        displayName: "",
        description: "",
        category: "",
        isCore: false,
      });
      loadModules();
    } catch (error) {
      console.error("Error saving module:", error);
      toast.error(
        error.response?.data?.error || "Erreur lors de la sauvegarde",
      );
    }
  };

  const handleEdit = (module) => {
    setEditingModule(module);
    setFormData({
      name: module.name,
      displayName: module.displayName,
      description: module.description || "",
      category: module.category,
      isCore: module.isCore,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (module) => {
    if (module.isCore) {
      toast.error("Impossible de supprimer un module core");
      return;
    }

    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer le module "${module.displayName}" ?`,
      )
    ) {
      return;
    }

    try {
      await modulesApi.delete(module.id);
      toast.success("Module supprimé avec succès");
      loadModules();
    } catch (error) {
      console.error("Error deleting module:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const openCreateDialog = () => {
    setEditingModule(null);
    setFormData({
      name: "",
      displayName: "",
      description: "",
      category: "",
      isCore: false,
    });
    setDialogOpen(true);
  };

  const getCategoryLabel = (categoryValue) => {
    const category = categories.find((c) => c.value === categoryValue);
    return category ? category.label : categoryValue;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      core: Cpu,
      inventory: Boxes,
      restaurant: Utensils,
      service: ConciergeBell,
      customer: Users,
      payment: CreditCard,
      specialized: Wrench,
    };
    return icons[category] || Package;
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Modules"
          description="Gérez les modules disponibles pour les systèmes POS"
        />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/4"></div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="p-4 border rounded-lg">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-full mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
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
        title="Modules"
        description="Gérez les modules disponibles pour les systèmes POS"
        actions={
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau module
          </Button>
        }
      />

      {Object.keys(modulesByCategory).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-2 text-base font-medium">Aucun module</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Commencez par créer votre premier module
            </p>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un module
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(modulesByCategory).map(([category, modules]) => (
            <Card key={category}>
              <CardHeader className="flex flex-row items-center gap-2">
                <span className="grid size-7 place-items-center rounded-md bg-muted text-muted-foreground">
                  {(() => {
                    const CategoryIcon = getCategoryIcon(category);
                    return <CategoryIcon className="size-4" />;
                  })()}
                </span>
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {getCategoryLabel(category)}
                    <Badge variant="outline">{modules.length} module(s)</Badge>
                  </CardTitle>
                  <CardDescription>
                    Modules de la catégorie{" "}
                    {getCategoryLabel(category).toLowerCase()}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {modules.map((module) => (
                    <div
                      key={module.id}
                      className="rounded-lg border p-3 transition-colors hover:bg-accent/30"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="font-medium">
                          {module.displayName}
                          {module.isCore && (
                            <Shield className="ml-2 inline h-3 w-3 text-blue-600" />
                          )}
                        </h3>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(module)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {!module.isCore && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(module)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="mb-2 text-sm text-muted-foreground">
                        {module.description || "Aucune description"}
                      </p>

                      <div className="flex items-center justify-between">
                        <code className="rounded bg-muted px-2 py-1 text-xs">
                          {module.name}
                        </code>
                        {module.isCore && (
                          <Badge variant="neutral" className="text-xs">
                            Core
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog pour créer/modifier un module */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingModule ? "Modifier le module" : "Nouveau module"}
            </DialogTitle>
            <DialogDescription>
              {editingModule
                ? "Modifiez les informations du module"
                : "Créez un nouveau module pour le système POS"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nom technique *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="nom-du-module"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nom utilisé en interne (sans espaces, tirets autorisés)
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="displayName">Nom d'affichage *</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  placeholder="Nom du module"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Catégorie *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Description du module et de ses fonctionnalités"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isCore"
                  checked={formData.isCore}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isCore: checked })
                  }
                />
                <Label htmlFor="isCore" className="text-sm">
                  Module core (obligatoire)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingModule ? "Mettre à jour" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
