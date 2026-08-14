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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import PageHeader from "../components/shared/PageHeader";
import { Plus, Edit, Trash2, Mail, Phone, MapPin, Users } from "lucide-react";
import { clientsApi } from "../lib/api";
import toast from "react-hot-toast";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await clientsApi.getAll();
      setClients(response.data);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error("Le nom et l'email sont obligatoires");
      return;
    }

    try {
      if (editingClient) {
        await clientsApi.update(editingClient.id, formData);
        toast.success("Client mis à jour avec succès");
      } else {
        await clientsApi.create(formData);
        toast.success("Client créé avec succès");
      }

      setDialogOpen(false);
      setEditingClient(null);
      setFormData({ name: "", email: "", phone: "", address: "" });
      loadClients();
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error(
        error.response?.data?.error || "Erreur lors de la sauvegarde",
      );
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      address: client.address || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (client) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer le client "${client.name}" ?`,
      )
    ) {
      return;
    }

    try {
      await clientsApi.delete(client.id);
      toast.success("Client supprimé avec succès");
      loadClients();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const openCreateDialog = () => {
    setEditingClient(null);
    setFormData({ name: "", email: "", phone: "", address: "" });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Clients"
          description="Gérez vos clients et leurs informations"
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
        title="Clients"
        description="Gérez vos clients et leurs informations"
        actions={
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau client
          </Button>
        }
      />

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-2 text-base font-medium">Aucun client</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Commencez par créer votre premier client
            </p>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card
              key={client.id}
              className="transition-colors hover:bg-accent/30"
            >
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{client.name}</CardTitle>
                  <CardDescription className="mt-1 flex items-center">
                    <Mail className="mr-1 h-3 w-3" />
                    {client.email}
                  </CardDescription>
                </div>
                <Badge variant="neutral">
                  {client.licenses?.length || 0} licence(s)
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {client.phone && (
                    <div className="flex items-center text-muted-foreground">
                      <Phone className="mr-2 h-3 w-3" />
                      {client.phone}
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="mr-2 h-3 w-3" />
                      {client.address}
                    </div>
                  )}
                  <div className="font-mono text-xs text-muted-foreground">
                    ID: {client.id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Créé le{" "}
                    {new Date(client.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(client)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(client)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog pour créer/modifier un client */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Modifier le client" : "Nouveau client"}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? "Modifiez les informations du client"
                : "Créez un nouveau client pour le système POS"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nom du client ou de l'entreprise"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@exemple.com"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+33 1 23 45 67 89"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Adresse complète"
                />
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
                {editingClient ? "Mettre à jour" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
