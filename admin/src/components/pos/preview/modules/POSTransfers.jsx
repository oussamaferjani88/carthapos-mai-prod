import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { ArrowRightLeft, Package, CheckCircle, Clock, XCircle } from 'lucide-react';
import { POSConfiguration } from '../../../../config/POSConfiguration';

export const POSTransfers = ({ config }) => {
  const [showNewTransfer, setShowNewTransfer] = useState(false);

  const transfers = [
    { 
      id: 'TRF-001', 
      from: 'Magasin Centre-Ville', 
      to: 'Magasin Gare', 
      product: 'Café Expresso', 
      qty: 50, 
      status: 'completed',
      date: '2025-10-02',
      time: '14:30'
    },
    { 
      id: 'TRF-002', 
      from: 'Entrepôt Central', 
      to: 'Zone Commerciale', 
      product: 'Croissants', 
      qty: 100, 
      status: 'pending',
      date: '2025-10-03',
      time: '09:00'
    },
    { 
      id: 'TRF-003', 
      from: 'Magasin Gare', 
      to: 'Centre-Ville', 
      product: 'Sandwichs', 
      qty: 30, 
      status: 'in-transit',
      date: '2025-10-03',
      time: '11:15'
    }
  ];

  const getStatusBadge = (status) => {
    const badges = {
      completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Terminé' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'En attente' },
      'in-transit': { bg: 'bg-blue-100', text: 'text-blue-700', icon: ArrowRightLeft, label: 'En transit' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Annulé' }
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  const styles = POSConfiguration.getStyles(config);

  return (
    <div className="h-full flex flex-col space-y-4 py-6 bg-gray-50" style={{ fontFamily: config.fontFamily }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: config.textColor }}>
            <ArrowRightLeft className="h-8 w-8" />
            Transferts de Stock
          </h1>
          <p className="text-gray-500">Gérez les mouvements entre magasins</p>
        </div>
        <Button 
          onClick={() => setShowNewTransfer(!showNewTransfer)}
          style={{ backgroundColor: config.primaryColor }}
        >
          + Nouveau Transfert
        </Button>
      </div>

      {/* New Transfer Form */}
      {showNewTransfer && (
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Créer un Transfert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Magasin Source</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store1">Magasin Centre-Ville</SelectItem>
                    <SelectItem value="store2">Magasin Zone Commerciale</SelectItem>
                    <SelectItem value="warehouse">Entrepôt Central</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Magasin Destination</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store1">Magasin Gare</SelectItem>
                    <SelectItem value="store2">Magasin Centre-Ville</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Produit</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="p1">Café Expresso</SelectItem>
                    <SelectItem value="p2">Croissants</SelectItem>
                    <SelectItem value="p3">Sandwichs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Quantité</label>
                <Input type="number" placeholder="0" min="1" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button style={{ backgroundColor: config.primaryColor }}>
                Créer le Transfert
              </Button>
              <Button variant="outline" onClick={() => setShowNewTransfer(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transfers List */}
      <Card style={styles.card} className="flex-1">
        <CardHeader>
          <CardTitle>Historique des Transferts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transfers.map(transfer => (
              <div key={transfer.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold">{transfer.id}</div>
                      <div className="text-sm text-gray-500">{transfer.date} à {transfer.time}</div>
                    </div>
                  </div>
                  {getStatusBadge(transfer.status)}
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs mb-1">De</div>
                    <div className="font-medium">{transfer.from}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs mb-1">Vers</div>
                    <div className="font-medium">{transfer.to}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs mb-1">Produit</div>
                    <div className="font-medium">{transfer.product}</div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <div className="font-semibold" style={{ color: config.primaryColor }}>
                    Quantité: {transfer.qty} unités
                  </div>
                  <div className="flex gap-2">
                    {transfer.status === 'pending' && (
                      <>
                        <Button size="sm" style={{ backgroundColor: config.primaryColor }}>
                          Valider
                        </Button>
                        <Button size="sm" variant="outline">Annuler</Button>
                      </>
                    )}
                    {transfer.status === 'in-transit' && (
                      <Button size="sm" style={{ backgroundColor: config.primaryColor }}>
                        Marquer comme Reçu
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default POSTransfers;
