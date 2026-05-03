import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Warehouse, AlertTriangle, TrendingDown, Package, Plus, Edit, Trash2 } from 'lucide-react';

export const POSInventory = ({ config, setNotification }) => {
  const [inventory, setInventory] = useState([
    { id: 1, name: 'Café en grains', sku: 'CAFE001', currentStock: 25, minStock: 10, maxStock: 100, unit: 'kg', price: 15.50 },
    { id: 2, name: 'Croissants surgelés', sku: 'CROIS001', currentStock: 5, minStock: 20, maxStock: 80, unit: 'pièces', price: 0.85 },
    { id: 3, name: 'Lait entier', sku: 'LAIT001', currentStock: 15, minStock: 8, maxStock: 40, unit: 'litres', price: 1.20 },
    { id: 4, name: 'Nappes jetables', sku: 'NAP001', currentStock: 50, minStock: 20, maxStock: 200, unit: 'pièces', price: 2.50 }
  ]);

  const [selectedItem, setSelectedItem] = useState(null);

  const updateStock = (itemId, newStock) => {
    setInventory(prevInventory =>
      prevInventory.map(item =>
        item.id === itemId ? { ...item, currentStock: newStock } : item
      )
    );
    setNotification('Stock mis à jour!');
    setTimeout(() => setNotification(null), 3000);
  };

  const getLowStockItems = () => {
    return inventory.filter(item => item.currentStock <= item.minStock);
  };

  const getStockStatus = (item) => {
    if (item.currentStock <= item.minStock) return 'low';
    if (item.currentStock >= item.maxStock * 0.8) return 'high';
    return 'normal';
  };

  const getStockStatusColor = (status) => {
    switch(status) {
      case 'low': return 'text-red-600 bg-red-50';
      case 'high': return 'text-green-600 bg-green-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getStockStatusText = (status) => {
    switch(status) {
      case 'low': return 'Stock faible';
      case 'high': return 'Stock élevé';
      default: return 'Stock normal';
    }
  };

  const totalValue = inventory.reduce((total, item) => total + (item.currentStock * item.price), 0);
  const lowStockCount = getLowStockItems().length;

  const styles = {
    card: {
      backgroundColor: config.backgroundColor,
      borderColor: config.cardBorderColor,
      color: config.textColor,
      fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif',
      fontSize: config.fontSize || '14px',
      fontWeight: config.fontWeight || '400'
    }
  };

  return (
    <div 
      className="space-y-6"
      style={{
        fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif',
        fontSize: config.fontSize || '14px',
        fontWeight: config.fontWeight || '400'
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: config.textColor }}>Gestion des stocks</h1>
          <p style={{ color: config.textMutedColor }}>
            Suivez et gérez votre inventaire en temps réel
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card style={styles.card}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-blue-500" />
              <div className="ml-2">
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Articles totaux</p>
                <p className="text-2xl font-bold">{inventory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div className="ml-2">
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Stock faible</p>
                <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Warehouse className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Valeur totale</p>
                <p className="text-2xl font-bold">{totalValue.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <div className="ml-2">
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Alertes actives</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <Card style={{ ...styles.card, borderColor: '#ef4444' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Alertes stock faible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getLowStockItems().map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-red-600">Stock: {item.currentStock} {item.unit} (min: {item.minStock})</p>
                  </div>
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Réapprovisionner
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      <Card style={styles.card}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventaire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: config.textMutedColor }}>
                    Article
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: config.textMutedColor }}>
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: config.textMutedColor }}>
                    Stock actuel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: config.textMutedColor }}>
                    Min/Max
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: config.textMutedColor }}>
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: config.textMutedColor }}>
                    Valeur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: config.textMutedColor }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: config.cardBorderColor }}>
                {inventory.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium" style={{ color: config.textColor }}>{item.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: config.textColor }}>
                        {item.sku}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: config.textColor }}>
                            {item.currentStock} {item.unit}
                          </span>
                          <input
                            type="number"
                            value={item.currentStock}
                            onChange={(e) => updateStock(item.id, parseInt(e.target.value))}
                            className="w-20 px-2 py-1 border rounded text-xs"
                            style={{ 
                              borderColor: config.cardBorderColor,
                              backgroundColor: config.backgroundColor
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: config.textColor }}>
                        {item.minStock} / {item.maxStock}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStockStatusColor(status)}`}>
                          {getStockStatusText(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium" style={{ color: config.textColor }}>
                        {(item.currentStock * item.price).toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="hover:opacity-80"
                            style={{ color: config.primaryColor }}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Item Details Modal (simplified) */}
      {selectedItem && (
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Détails - {selectedItem.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Stock actuel</p>
                <p className="text-lg">{selectedItem.currentStock} {selectedItem.unit}</p>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Prix unitaire</p>
                <p className="text-lg">{selectedItem.price.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Stock minimum</p>
                <p className="text-lg">{selectedItem.minStock} {selectedItem.unit}</p>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Stock maximum</p>
                <p className="text-lg">{selectedItem.maxStock} {selectedItem.unit}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  updateStock(selectedItem.id, selectedItem.currentStock + 10);
                  setSelectedItem(null);
                }}
                className="px-4 py-2 text-white rounded hover:opacity-90"
                style={{ backgroundColor: config.primaryColor }}
              >
                + 10 {selectedItem.unit}
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Fermer
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
