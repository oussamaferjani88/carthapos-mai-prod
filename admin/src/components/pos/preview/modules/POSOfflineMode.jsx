import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { WifiOff, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export const POSOfflineMode = ({ config }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(3);

  const offlineTransactions = [
    { id: 'OFF-001', product: 'Café Expresso', amount: 2.50, time: '14:25', status: 'pending' },
    { id: 'OFF-002', product: 'Croissant', amount: 1.80, time: '14:32', status: 'pending' },
    { id: 'OFF-003', product: 'Sandwich', amount: 4.50, time: '14:45', status: 'pending' }
  ];

  const styles = {
    card: {
      backgroundColor: config.cardColor || '#ffffff',
      borderRadius: config.borderRadius || '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 p-6 bg-gray-50" style={{ fontFamily: config.fontFamily }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: config.textColor }}>
            <WifiOff className="h-8 w-8" />
            Mode Hors-Ligne
          </h1>
          <p className="text-gray-500">Travaillez sans connexion internet</p>
        </div>
        <Button 
          onClick={() => setIsOnline(!isOnline)}
          style={{ backgroundColor: isOnline ? '#10b981' : '#ef4444' }}
        >
          {isOnline ? <Cloud className="mr-2 h-4 w-4" /> : <CloudOff className="mr-2 h-4 w-4" />}
          {isOnline ? 'En Ligne' : 'Hors Ligne'}
        </Button>
      </div>

      {/* Status Card */}
      <Card style={styles.card} className={isOnline ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isOnline ? (
                <Cloud className="h-12 w-12 text-green-600" />
              ) : (
                <CloudOff className="h-12 w-12 text-orange-600" />
              )}
              <div>
                <h3 className="text-2xl font-bold">{isOnline ? 'Système En Ligne' : 'Mode Hors-Ligne Actif'}</h3>
                <p className="text-sm text-gray-600">
                  {isOnline 
                    ? 'Toutes les fonctionnalités sont disponibles' 
                    : 'Les ventes seront synchronisées à la reconnexion'
                  }
                </p>
              </div>
            </div>
            {!isOnline && pendingSync > 0 && (
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600">{pendingSync}</div>
                <div className="text-sm text-gray-600">Transactions en attente</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={styles.card}>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold text-orange-600">{pendingSync}</div>
            <div className="text-sm text-gray-500">En Attente</div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold text-green-600">127</div>
            <div className="text-sm text-gray-500">Synchronisées</div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <div className="text-2xl font-bold text-red-600">0</div>
            <div className="text-sm text-gray-500">Erreurs</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Transactions */}
      <Card style={styles.card} className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transactions en Attente de Synchronisation</CardTitle>
            <Button 
              size="sm" 
              disabled={isOnline === false}
              style={{ backgroundColor: config.primaryColor }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Synchroniser Maintenant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {offlineTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-semibold">Toutes les transactions sont synchronisées!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {offlineTransactions.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <div>
                      <div className="font-semibold">{transaction.id}</div>
                      <div className="text-sm text-gray-500">{transaction.product}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-sm text-gray-500">{transaction.time}</div>
                    <div className="font-bold">{transaction.amount.toFixed(2)}€</div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                      En attente
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default POSOfflineMode;
