import { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  Edit2, 
  Trash2, 
  Mail,
  Phone,
  MapPin,
  Search,
  MoreHorizontal,
  Building,
  User
} from 'lucide-react';

// Components
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      
      if (window.electronAPI) {
        const suppliersData = await window.electronAPI.getSuppliers();
        setSuppliers(suppliersData);
      } else {
        // Fallback pour le développement web
        setSuppliers([
          {
            id: 1,
            name: 'Café Excellence',
            contact_person: 'Jean Dupont',
            email: 'contact@cafe-excellence.fr',
            phone: '01 23 45 67 89',
            address: '123 Rue du Commerce, 75001 Paris',
            is_active: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            name: 'Boulangerie Centrale',
            contact_person: 'Marie Martin',
            email: 'marie@boulangerie-centrale.fr',
            phone: '01 98 76 54 32',
            address: '456 Avenue des Artisans, 69000 Lyon',
            is_active: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 3,
            name: 'Distribution Fruits & Légumes',
            contact_person: 'Pierre Moreau',
            email: 'pierre@dfl.com',
            phone: '04 56 78 90 12',
            address: '789 Zone Industrielle, 13000 Marseille',
            is_active: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 4,
            name: 'Équipement Pro',
            contact_person: 'Sophie Bernard',
            email: 'sophie@equipement-pro.fr',
            phone: '02 34 56 78 90',
            address: '321 Rue de l\'Industrie, 44000 Nantes',
            is_active: 0,
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert('Veuillez remplir au moins le nom du fournisseur');
      return;
    }

    try {
      if (editingSupplier) {
        // Pour la mise à jour, on utiliserait updateSupplier si disponible
        console.log('Update supplier:', formData);
      } else {
        if (window.electronAPI) {
          await window.electronAPI.addSupplier(formData);
        }
      }
      
      setDialogOpen(false);
      setEditingSupplier(null);
      setFormData({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' });
      loadSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const openCreateDialog = () => {
    setEditingSupplier(null);
    setFormData({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      notes: supplier.notes || ''
    });
    setDialogOpen(true);
  };

  const deleteSupplier = async (supplierId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      try {
        if (window.electronAPI) {
          await window.electronAPI.deleteSupplier(supplierId);
        }
        loadSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const toggleSupplierStatus = async (supplierId, currentStatus) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.updateSupplierStatus(supplierId, !currentStatus);
      }
      loadSuppliers();
    } catch (error) {
      console.error('Error updating supplier status:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.is_active).length,
    inactive: suppliers.filter(s => !s.is_active).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Truck className="mr-3 h-8 w-8" />
            Fournisseurs
          </h1>
          <p className="text-muted-foreground">
            Gestion des fournisseurs et partenaires commerciaux
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau fournisseur
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building className="h-4 w-4 text-blue-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total fournisseurs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Truck className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Actifs</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building className="h-4 w-4 text-gray-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Inactifs</p>
                <p className="text-2xl font-bold">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fournisseurs ({filteredSuppliers.length})</CardTitle>
          <CardDescription>
            Liste des fournisseurs et partenaires commerciaux
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Coordonnées</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          {supplier.address && (
                            <div className="text-sm text-muted-foreground flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {supplier.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.contact_person ? (
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{supplier.contact_person}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Non défini</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="text-sm flex items-center">
                            <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                            <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:underline">
                              {supplier.email}
                            </a>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="text-sm flex items-center">
                            <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                            <a href={`tel:${supplier.phone}`} className="text-blue-600 hover:underline">
                              {supplier.phone}
                            </a>
                          </div>
                        )}
                        {!supplier.email && !supplier.phone && (
                          <span className="text-muted-foreground text-sm">Non renseigné</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={supplier.is_active ? "default" : "secondary"}>
                        {supplier.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(supplier)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => toggleSupplierStatus(supplier.id, supplier.is_active)}
                          >
                            {supplier.is_active ? 'Désactiver' : 'Activer'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteSupplier(supplier.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Truck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun fournisseur</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Aucun fournisseur ne correspond à votre recherche'
                  : 'Commencez par ajouter votre premier fournisseur'
                }
              </p>
              {!searchTerm && (
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un fournisseur
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom du fournisseur *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom de l'entreprise"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="contact_person">Personne de contact</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Nom du contact principal"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@fournisseur.com"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="01 23 45 67 89"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adresse complète du fournisseur"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes internes..."
                rows={2}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingSupplier ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
