import { useState, useEffect } from 'react';
import { 
  Plus, 
  Users, 
  Clock, 
  Check, 
  X,
  Edit2,
  Trash2,
  Coffee,
  Utensils
} from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';

// Components
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({
    table_number: '',
    capacity: 2,
    x_position: 0,
    y_position: 0
  });

  // POSConfiguration integration
  const { config: electronConfig } = useAppConfig();
  const getConfig = () => {
    if (electronConfig?.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937'
    });
  };
  const config = getConfig();

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      
      if (window.electronAPI) {
        const tables = await window.electronAPI.getTables();
        setTables(tables);
      } else {
        // Fallback pour le développement web
        setTables([
          { 
            id: 1, 
            table_number: 'T1', 
            capacity: 4, 
            status: 'available',
            x_position: 100,
            y_position: 100,
            current_order_id: null
          },
          { 
            id: 2, 
            table_number: 'T2', 
            capacity: 2, 
            status: 'occupied',
            x_position: 250,
            y_position: 100,
            current_order_id: 123
          },
          { 
            id: 3, 
            table_number: 'T3', 
            capacity: 6, 
            status: 'reserved',
            x_position: 100,
            y_position: 250,
            current_order_id: null
          },
          { 
            id: 4, 
            table_number: 'T4', 
            capacity: 4, 
            status: 'cleaning',
            x_position: 250,
            y_position: 250,
            current_order_id: null
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.table_number.trim()) {
      alert('Le numéro de table est obligatoire');
      return;
    }

    try {
      if (editingTable) {
        // Pour la mise à jour, on utiliserait updateTable si disponible
        console.log('Update table:', formData);
      } else {
        if (window.electronAPI) {
          await window.electronAPI.addTable(formData);
        }
      }
      
      setDialogOpen(false);
      setEditingTable(null);
      setFormData({ table_number: '', capacity: 2, x_position: 0, y_position: 0 });
      loadTables();
    } catch (error) {
      console.error('Error saving table:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const openCreateDialog = () => {
    setEditingTable(null);
    setFormData({ table_number: '', capacity: 2, x_position: 0, y_position: 0 });
    setDialogOpen(true);
  };

  const updateTableStatus = async (tableId, newStatus) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.updateTableStatus(tableId, newStatus);
      }
      loadTables();
    } catch (error) {
      console.error('Error updating table status:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-500 hover:bg-green-600';
      case 'occupied':
        return 'bg-red-500 hover:bg-red-600';
      case 'reserved':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'cleaning':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'available':
        return 'Libre';
      case 'occupied':
        return 'Occupée';
      case 'reserved':
        return 'Réservée';
      case 'cleaning':
        return 'Nettoyage';
      default:
        return 'Inconnue';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return <Check className="h-4 w-4" />;
      case 'occupied':
        return <Utensils className="h-4 w-4" />;
      case 'reserved':
        return <Clock className="h-4 w-4" />;
      case 'cleaning':
        return <Coffee className="h-4 w-4" />;
      default:
        return <X className="h-4 w-4" />;
    }
  };

  const statusStats = {
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length
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
          <h1 className="text-3xl font-bold">Gestion des tables</h1>
          <p className="text-muted-foreground">
            Gérez le plan de salle et l'état des tables
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle table
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Tables libres</p>
                <p className="text-2xl font-bold">{statusStats.available}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Utensils className="h-4 w-4 text-red-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Tables occupées</p>
                <p className="text-2xl font-bold">{statusStats.occupied}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-blue-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Tables réservées</p>
                <p className="text-2xl font-bold">{statusStats.reserved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Coffee className="h-4 w-4 text-yellow-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Nettoyage</p>
                <p className="text-2xl font-bold">{statusStats.cleaning}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floor Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Plan de salle</CardTitle>
          <CardDescription>
            Cliquez sur une table pour changer son statut
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative bg-gray-50 rounded-lg p-8 min-h-96 border-2 border-dashed border-gray-200">
            {tables.map((table) => (
              <div
                key={table.id}
                className={`absolute w-20 h-20 rounded-lg text-white text-xs font-medium flex flex-col items-center justify-center cursor-pointer transition-colors ${getStatusColor(table.status)}`}
                style={{
                  left: `${table.x_position}px`,
                  top: `${table.y_position}px`
                }}
                onClick={() => {
                  const statuses = ['available', 'occupied', 'reserved', 'cleaning'];
                  const currentIndex = statuses.indexOf(table.status);
                  const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                  updateTableStatus(table.id, nextStatus);
                }}
              >
                <div className="flex items-center mb-1">
                  {getStatusIcon(table.status)}
                </div>
                <div className="font-bold">{table.table_number}</div>
                <div className="flex items-center text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {table.capacity}
                </div>
              </div>
            ))}
            
            {tables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Aucune table configurée</p>
                  <p className="text-sm">Ajoutez votre première table pour commencer</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tables List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des tables</CardTitle>
          <CardDescription>
            {tables.length} table(s) configurée(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <Card key={table.id} className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">{table.table_number}</h3>
                      <p className="text-sm text-muted-foreground">
                        Capacité: {table.capacity} personnes
                      </p>
                    </div>
                    <Badge className={getStatusColor(table.status) + ' text-white'}>
                      {getStatusLabel(table.status)}
                    </Badge>
                  </div>
                  
                  {table.current_order_id && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                      Commande en cours: #{table.current_order_id}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-xs text-muted-foreground">
                      Position: ({table.x_position}, {table.y_position})
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTableStatus(table.id, 'available')}
                        disabled={table.status === 'available'}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTableStatus(table.id, 'occupied')}
                        disabled={table.status === 'occupied'}
                      >
                        <Utensils className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTableStatus(table.id, 'cleaning')}
                        disabled={table.status === 'cleaning'}
                      >
                        <Coffee className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTable ? 'Modifier la table' : 'Nouvelle table'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="table_number">Numéro de table *</Label>
              <Input
                id="table_number"
                value={formData.table_number}
                onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                placeholder="T1, Table 1, etc."
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacité</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 2 })}
                placeholder="Nombre de personnes"
                min="1"
                max="20"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="x_position">Position X</Label>
                <Input
                  id="x_position"
                  type="number"
                  value={formData.x_position}
                  onChange={(e) => setFormData({ ...formData, x_position: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="y_position">Position Y</Label>
                <Input
                  id="y_position"
                  type="number"
                  value={formData.y_position}
                  onChange={(e) => setFormData({ ...formData, y_position: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
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
                {editingTable ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
