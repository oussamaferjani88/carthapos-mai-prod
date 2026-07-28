import { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Edit2, 
  Trash2, 
  Clock,
  DollarSign,
  Tag,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { getCurrencySymbol } from '../utils/currency';

// Components
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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

export default function Services() {
  const { config: electronConfig } = useAppConfig();
  const getConfig = () => {
    if (electronConfig?.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      currency: 'DT',
      currencyPosition: 'after',
      taxRate: 19
    });
  };
  const config = getConfig();
  const formatPrice = (price) => {
    if (config.currencyPosition === 'before') {
      return `${config.currency}${price.toFixed(2)}`;
    }
    return `${price.toFixed(2)} ${config.currency}`;
  };

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 60,
    price: 0,
    category: 'General'
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      
      if (window.electronAPI) {
        const servicesData = await window.electronAPI.getServices();
        setServices(servicesData);
      } else {
        // Fallback pour le développement web
        setServices([
          {
            id: 1,
            name: 'Coupe Homme',
            description: 'Coupe de cheveux classique pour homme',
            duration: 30,
            price: 25,
            category: 'Coiffure',
            is_active: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            name: 'Coupe Femme',
            description: 'Coupe de cheveux pour femme avec shampoing',
            duration: 45,
            price: 35,
            category: 'Coiffure',
            is_active: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 3,
            name: 'Coloration',
            description: 'Coloration complète avec produits professionnels',
            duration: 120,
            price: 80,
            category: 'Coloration',
            is_active: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 4,
            name: 'Manucure',
            description: 'Soin complet des ongles avec vernis',
            duration: 60,
            price: 40,
            category: 'Beauté',
            is_active: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 5,
            name: 'Massage Relaxant',
            description: 'Massage de détente de 60 minutes',
            duration: 60,
            price: 70,
            category: 'Bien-être',
            is_active: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 6,
            name: 'Consultation Médicale',
            description: 'Consultation générale avec médecin',
            duration: 30,
            price: 50,
            category: 'Médical',
            is_active: 1,
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      if (editingService) {
        // Pour la mise à jour, on utiliserait updateService si disponible
        console.log('Update service:', formData);
      } else {
        if (window.electronAPI) {
          await window.electronAPI.addService(formData);
        }
      }
      
      setDialogOpen(false);
      setEditingService(null);
      setFormData({ name: '', description: '', duration: 60, price: 0, category: 'General' });
      loadServices();
    } catch (error) {
      console.error('Error saving service:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const openCreateDialog = () => {
    setEditingService(null);
    setFormData({ name: '', description: '', duration: 60, price: 0, category: 'General' });
    setDialogOpen(true);
  };

  const openEditDialog = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
      category: service.category
    });
    setDialogOpen(true);
  };

  const deleteService = async (serviceId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      try {
        if (window.electronAPI) {
          await window.electronAPI.deleteService(serviceId);
        }
        loadServices();
      } catch (error) {
        console.error('Error deleting service:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  // Filter services based on search and category
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...new Set(services.map(s => s.category))];

  // Calculate stats
  const stats = {
    total: services.length,
    active: services.filter(s => s.is_active).length,
    categories: new Set(services.map(s => s.category)).size,
    avgPrice: services.length > 0 ? (services.reduce((sum, s) => sum + s.price, 0) / services.length).toFixed(2) : 0
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
            <Briefcase className="mr-3 h-8 w-8" />
            Services
          </h1>
          <p className="text-muted-foreground">
            Gestion du catalogue de services et prestations
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau service
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Briefcase className="h-4 w-4 text-blue-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total services</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Tag className="h-4 w-4 text-green-500" />
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
              <Tag className="h-4 w-4 text-purple-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Catégories</p>
                <p className="text-2xl font-bold">{stats.categories}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-orange-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Prix moyen</p>
                <p className="text-2xl font-bold">{formatPrice(stats.avgPrice)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.filter(cat => cat !== 'all').map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Services ({filteredServices.length})</CardTitle>
          <CardDescription>
            Liste des services et prestations proposés
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredServices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{service.name}</div>
                        {service.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Tag className="h-3 w-3 mr-1" />
                        {service.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        {service.duration}min
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-lg">
                        {formatPrice(service.price)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.is_active ? "default" : "secondary"}>
                        {service.is_active ? 'Actif' : 'Inactif'}
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
                          <DropdownMenuItem onClick={() => openEditDialog(service)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteService(service.id)}
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
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun service</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Aucun service ne correspond à vos critères de recherche'
                  : 'Commencez par ajouter votre premier service'
                }
              </p>
              {(!searchTerm && selectedCategory === 'all') && (
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un service
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
              {editingService ? 'Modifier le service' : 'Nouveau service'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom du service *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom du service"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description détaillée du service"
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="category">Catégorie</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Catégorie du service"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Durée (min) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                  min="5"
                  max="480"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Prix ({getCurrencySymbol(config?.currency || 'TND')}) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  min="0"
                  required
                />
              </div>
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
                {editingService ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
