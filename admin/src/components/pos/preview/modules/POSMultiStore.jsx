import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Store, ArrowRightLeft, TrendingUp, Package, AlertCircle } from 'lucide-react';
import { POSConfiguration } from '../../../../config/POSConfiguration';

export const POSMultiStore = ({ config }) => {
  const [selectedStore, setSelectedStore] = useState('store-1');

  const stores = [
    { id: 'store-1', name: 'Magasin Centre-Ville', stock: 1245, sales: '15,234€', status: 'active' },
    { id: 'store-2', name: 'Magasin Zone Commerciale', stock: 987, sales: '12,450€', status: 'active' },
    { id: 'store-3', name: 'Magasin Gare', stock: 654, sales: '8,920€', status: 'active' },
    { id: 'store-4', name: 'Entrepôt Central', stock: 5420, sales: '0€', status: 'warehouse' }
  ];

  const recentTransfers = [
    { id: 1, from: 'Magasin Centre-Ville', to: 'Magasin Gare', product: 'Café Expresso', qty: 50, date: '2025-10-02' },
    { id: 2, from: 'Entrepôt Central', to: 'Magasin Zone Commerciale', product: 'Croissants', qty: 100, date: '2025-10-01' }
  ];

  const styles = POSConfiguration.getStyles(config);

  return (
    <div className="h-full flex flex-col space-y-4 py-6 bg-gray-50" style={{ fontFamily: config.fontFamily }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: config.textColor }}>
            <Store className="h-8 w-8" />
            Multi-Magasins
          </h1>
          <p className="text-gray-500">Gestion centralisée de vos succursales</p>
        </div>
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stores.map(store => (
              <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stores.map(store => (
          <Card key={store.id} style={styles.card}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Store className="h-5 w-5 text-blue-600" />
                <span className={`px-2 py-1 rounded text-xs ${
                  store.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {store.status === 'active' ? 'Actif' : 'Entrepôt'}
                </span>
              </div>
              <h3 className="font-semibold text-sm mb-1">{store.name}</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Stock:</span>
                  <span className="font-medium">{store.stock} articles</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventes:</span>
                  <span className="font-medium">{store.sales}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Stock Comparison */}
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Comparaison des Stocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Café Expresso', 'Croissants', 'Sandwichs', 'Eau Minérale'].map((product, idx) => (
                <div key={idx} className="border-b pb-2">
                  <div className="font-medium text-sm mb-2">{product}</div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {stores.slice(0, 4).map((store, i) => (
                      <div key={i} className="text-center">
                        <div className="text-gray-500 truncate">{store.name.split(' ')[1]}</div>
                        <div className="font-semibold" style={{ color: config.primaryColor }}>
                          {Math.floor(Math.random() * 100)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transfers */}
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transferts Récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransfers.map(transfer => (
                <div key={transfer.id} className="border-b pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{transfer.product}</span>
                    <span className="text-xs text-gray-500">{transfer.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="bg-blue-50 px-2 py-1 rounded">{transfer.from}</span>
                    <ArrowRightLeft className="h-3 w-3" />
                    <span className="bg-green-50 px-2 py-1 rounded">{transfer.to}</span>
                    <span className="ml-auto font-semibold">Qté: {transfer.qty}</span>
                  </div>
                </div>
              ))}
              <Button 
                className="w-full mt-2" 
                style={{ backgroundColor: config.primaryColor }}
              >
                Nouveau Transfert
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance par Magasin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stores.filter(s => s.status === 'active').map((store, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{store.name}</span>
                    <span className="font-semibold">{store.sales}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full" 
                      style={{ 
                        width: `${(idx + 1) * 25}%`,
                        backgroundColor: config.primaryColor 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Alertes Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded">
                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Stock faible - Magasin Gare</div>
                  <div className="text-xs text-gray-600">Café Expresso: seulement 5 unités</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded">
                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Rupture - Zone Commerciale</div>
                  <div className="text-xs text-gray-600">Croissants: stock épuisé</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POSMultiStore;
