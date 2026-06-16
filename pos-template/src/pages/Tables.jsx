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
  Utensils,
  ListIcon,
  Layers
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
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({
    table_number: '',
    capacity: 2
  });
  const [bulkFormData, setBulkFormData] = useState({
    prefix: 'T',
    start: 1,
    end: 10,
    capacity: 4
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
            current_order_id: null
          },
          { 
            id: 2, 
            table_number: 'T2', 
            capacity: 2, 
            status: 'occupied',
            current_order_id: 123
          },
          { 
            id: 3, 
            table_number: 'T3', 
            capacity: 6, 
            status: 'reserved',
            current_order_id: null
          },
          { 
            id: 4, 
            table_number: 'T4', 
            capacity: 4, 
            status: 'cleaning',
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
        if (window.electronAPI) {
          await window.electronAPI.updateTable(editingTable.id, formData);
        }
      } else {
        if (window.electronAPI) {
          await window.electronAPI.addTable(formData);
        }
      }
      
      setDialogOpen(false);
      setEditingTable(null);
      setFormData({ table_number: '', capacity: 2 });
      loadTables();
    } catch (error) {
      console.error('Error saving table:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const openCreateDialog = () => {
    setEditingTable(null);
    setFormData({ table_number: '', capacity: 2 });
    setDialogOpen(true);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    const { prefix, start, end, capacity } = bulkFormData;

    if (start > end) {
      alert('Le numéro de début doit être inférieur ou égal au numéro de fin');
      return;
    }

    const count = end - start + 1;
    if (count > 50) {
      alert('Maximum 50 tables par ajout en bulk');
      return;
    }

    try {
      if (window.electronAPI) {
        for (let i = start; i <= end; i++) {
          const tableNumber = `${prefix}${i}`;
          await window.electronAPI.addTable({ table_number: tableNumber, capacity });
        }
      }

      setBulkDialogOpen(false);
      setBulkFormData({ prefix: 'T', start: 1, end: 10, capacity: 4 });
      loadTables();
    } catch (error) {
      console.error('Error bulk adding tables:', error);
      alert('Erreur lors de l\'ajout en bulk');
    }
  };

  const getBulkPreview = () => {
    const { prefix, start, end } = bulkFormData;
    if (start > end) return [];
    const max = Math.min(end - start + 1, 20);
    return Array.from({ length: max }, (_, i) => `${prefix}${start + i}`);
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
            <Layers className="mr-2 h-4 w-4" />
            Ajout en bulk
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle table
          </Button>
        </div>
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
          <div className="bg-gray-50 rounded-lg p-8 min-h-48 border-2 border-dashed border-gray-200">
            <div className="flex flex-wrap gap-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className={`w-20 h-20 rounded-lg text-white text-xs font-medium flex flex-col items-center justify-center cursor-pointer transition-colors ${getStatusColor(table.status)}`}
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
              <div className="flex items-center justify-center text-gray-500 py-12 w-full">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Aucune table configurée</p>
                  <p className="text-sm">Ajoutez votre première table pour commencer</p>
                </div>
              </div>
            )}
            </div>
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
                  
                  <div className="flex justify-end items-center mt-4">
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

      {/* Bulk Add Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Ajout en bulk
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="prefix">Préfixe</Label>
                <Input
                  id="prefix"
                  value={bulkFormData.prefix}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, prefix: e.target.value })}
                  placeholder="T"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bulkStart">Début</Label>
                <Input
                  id="bulkStart"
                  type="number"
                  value={bulkFormData.start}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, start: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bulkEnd">Fin</Label>
                <Input
                  id="bulkEnd"
                  type="number"
                  value={bulkFormData.end}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, end: parseInt(e.target.value) || 10 })}
                  min="1"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bulkCapacity">Capacité par table</Label>
              <Input
                id="bulkCapacity"
                type="number"
                value={bulkFormData.capacity}
                onChange={(e) => setBulkFormData({ ...bulkFormData, capacity: parseInt(e.target.value) || 2 })}
                min="1"
                max="20"
              />
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Aperçu ({bulkFormData.end - bulkFormData.start + 1} tables)
              </p>
              <div className="flex flex-wrap gap-1">
                {getBulkPreview().map((name, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white border rounded text-xs font-mono">
                    {name}
                  </span>
                ))}
                {bulkFormData.end - bulkFormData.start + 1 > 20 && (
                  <span className="px-2 py-0.5 text-xs text-gray-400">
                    +{bulkFormData.end - bulkFormData.start - 19} autres...
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                Créer {bulkFormData.end - bulkFormData.start + 1} tables
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
