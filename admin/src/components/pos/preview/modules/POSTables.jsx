import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Plus, Edit, Trash2, Check, Utensils, Clock, Sparkles, X, Save } from 'lucide-react';

export const POSTables = ({ config, setNotification }) => {
  const [tables, setTables] = useState([
    { id: 1, number: 1, capacity: 2, status: 'available', x_position: 1, y_position: 1, customerName: null },
    { id: 2, number: 2, capacity: 4, status: 'occupied', x_position: 2, y_position: 1, customerName: 'M. Dubois' },
    { id: 3, number: 3, capacity: 2, status: 'available', x_position: 3, y_position: 1, customerName: null },
    { id: 4, number: 4, capacity: 6, status: 'reserved', x_position: 1, y_position: 2, customerName: 'Famille Martin' },
    { id: 5, number: 5, capacity: 2, status: 'cleaning', x_position: 2, y_position: 2, customerName: null },
    { id: 6, number: 6, capacity: 4, status: 'available', x_position: 3, y_position: 2, customerName: null },
  ]);
  
  const [selectedTable, setSelectedTable] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({
    number: '',
    capacity: 2,
    status: 'available'
  });

  const updateTableStatus = (tableId, newStatus) => {
    setTables(prevTables =>
      prevTables.map(table =>
        table.id === tableId ? { ...table, status: newStatus } : table
      )
    );
    setNotification(`Table ${tables.find(t => t.id === tableId)?.number} mise à jour!`);
    setTimeout(() => setNotification(null), 3000);
  };
  
  const addTable = () => {
    if (!formData.number) {
      setNotification('Veuillez saisir un numéro de table!');
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    const newTable = {
      id: Math.max(...tables.map(t => t.id)) + 1,
      number: parseInt(formData.number),
      capacity: parseInt(formData.capacity),
      status: formData.status,
      x_position: 1,
      y_position: 1,
      customerName: null
    };
    
    setTables([...tables, newTable]);
    setFormData({ number: '', capacity: 2, status: 'available' });
    setShowAddForm(false);
    setNotification(`Table ${formData.number} ajoutée avec succès!`);
    setTimeout(() => setNotification(null), 3000);
  };
  
  const editTable = () => {
    if (!selectedTable) return;
    
    setTables(prevTables =>
      prevTables.map(table =>
        table.id === selectedTable.id
          ? { ...table, number: parseInt(formData.number), capacity: parseInt(formData.capacity), status: formData.status }
          : table
      )
    );
    
    setShowEditForm(false);
    setSelectedTable(null);
    setFormData({ number: '', capacity: 2, status: 'available' });
    setNotification('Table modifiée avec succès!');
    setTimeout(() => setNotification(null), 3000);
  };
  
  const deleteTable = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    if (window.confirm(`Voulez-vous vraiment supprimer la table ${table.number}?`)) {
      setTables(prevTables => prevTables.filter(t => t.id !== tableId));
      setSelectedTable(null);
      setNotification(`Table ${table.number} supprimée!`);
      setTimeout(() => setNotification(null), 3000);
    }
  };
  
  const openEditForm = (table) => {
    setSelectedTable(table);
    setFormData({
      number: table.number,
      capacity: table.capacity,
      status: table.status
    });
    setShowEditForm(true);
  };

  const getTableStatusColor = (status) => {
    switch(status) {
      case 'available': return 'bg-green-500 text-white';
      case 'occupied': return 'bg-red-500 text-white';
      case 'reserved': return 'bg-yellow-500 text-white';
      case 'cleaning': return 'bg-gray-500 text-white';
      default: return 'bg-gray-300 text-gray-700';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'available': return 'Libre';
      case 'occupied': return 'Occupée';
      case 'reserved': return 'Réservée';
      case 'cleaning': return 'Nettoyage';
      default: return 'Inconnu';
    }
  };

  const statusStats = {
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length
  };

  const styles = {
    card: {
      backgroundColor: config.backgroundColor,
      borderColor: config.cardBorderColor,
      color: config.textColor
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: config.textColor }}>Gestion des tables</h1>
          <p style={{ color: config.textMutedColor }}>
            Gérez le plan de salle et l'état des tables
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          style={{ backgroundColor: config.primaryColor }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Ajouter une table
        </Button>
      </div>
      
      {/* Add Table Form Overlay */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Ajouter une table
                </CardTitle>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ number: '', capacity: 2, status: 'available' });
                  }}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Numéro de table</label>
                <input
                  type="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ex: 7"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Capacité (places)</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ex: 4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="available">Libre</option>
                  <option value="occupied">Occupée</option>
                  <option value="reserved">Réservée</option>
                  <option value="cleaning">Nettoyage</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={addTable}
                  style={{ backgroundColor: config.primaryColor }}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Enregistrer
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ number: '', capacity: 2, status: 'available' });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Edit Table Form Overlay */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Modifier la table
                </CardTitle>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setFormData({ number: '', capacity: 2, status: 'available' });
                  }}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Numéro de table</label>
                <input
                  type="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Capacité (places)</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="available">Libre</option>
                  <option value="occupied">Occupée</option>
                  <option value="reserved">Réservée</option>
                  <option value="cleaning">Nettoyage</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={editTable}
                  style={{ backgroundColor: config.primaryColor }}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Enregistrer
                </Button>
                <Button
                  onClick={() => {
                    setShowEditForm(false);
                    setFormData({ number: '', capacity: 2, status: 'available' });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card style={styles.card}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Tables libres</p>
                <p className="text-2xl font-bold">{statusStats.available}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Utensils className="h-4 w-4 text-red-500" />
              <div className="ml-2">
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Tables occupées</p>
                <p className="text-2xl font-bold">{statusStats.occupied}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div className="ml-2">
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Tables réservées</p>
                <p className="text-2xl font-bold">{statusStats.reserved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Sparkles className="h-4 w-4 text-gray-500" />
              <div className="ml-2">
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>En nettoyage</p>
                <p className="text-2xl font-bold">{statusStats.cleaning}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Grid */}
      <Card style={styles.card}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Plan de salle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg min-h-[300px]">
            {tables.map((table) => (
              <div
                key={table.id}
                className={`
                  ${getTableStatusColor(table.status)}
                  relative rounded-lg p-4 cursor-pointer
                  hover:opacity-80 transition-all duration-200
                  flex flex-col items-center justify-center
                  min-h-[100px] shadow-sm hover:shadow-md
                  ${selectedTable?.id === table.id ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                {/* Action Buttons */}
                <div className="absolute top-1 right-1 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditForm(table);
                    }}
                    className="p-1 bg-white/90 rounded hover:bg-white transition-colors"
                    title="Modifier"
                  >
                    <Edit className="h-3 w-3 text-blue-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTable(table.id);
                    }}
                    className="p-1 bg-white/90 rounded hover:bg-white transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </button>
                </div>
                
                <div 
                  onClick={() => setSelectedTable(table)}
                  className="flex flex-col items-center w-full"
                >
                  <div className="font-bold text-lg">T{table.number}</div>
                  <div className="text-sm">{table.capacity} places</div>
                  <div className="text-xs mt-1">{getStatusText(table.status)}</div>
                  {table.customerName && (
                    <div className="text-xs mt-1 opacity-90">{table.customerName}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table Details */}
      {selectedTable && (
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Table {selectedTable.number} - Détails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Capacité</p>
                  <p className="text-lg">{selectedTable.capacity} personnes</p>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Statut</p>
                  <p className="text-lg">{getStatusText(selectedTable.status)}</p>
                </div>
              </div>
              
              {selectedTable.customerName && (
                <div>
                  <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Client</p>
                  <p className="text-lg">{selectedTable.customerName}</p>
                </div>
              )}

              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => updateTableStatus(selectedTable.id, 'available')}
                  disabled={selectedTable.status === 'available'}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm disabled:opacity-50"
                >
                  <Check className="h-3 w-3 inline mr-1" />
                  Libre
                </button>
                <button
                  onClick={() => updateTableStatus(selectedTable.id, 'occupied')}
                  disabled={selectedTable.status === 'occupied'}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm disabled:opacity-50"
                >
                  <Utensils className="h-3 w-3 inline mr-1" />
                  Occupée
                </button>
                <button
                  onClick={() => updateTableStatus(selectedTable.id, 'reserved')}
                  disabled={selectedTable.status === 'reserved'}
                  className="px-3 py-1 bg-yellow-500 text-white rounded text-sm disabled:opacity-50"
                >
                  <Clock className="h-3 w-3 inline mr-1" />
                  Réservée
                </button>
                <button
                  onClick={() => updateTableStatus(selectedTable.id, 'cleaning')}
                  disabled={selectedTable.status === 'cleaning'}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  Nettoyage
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
