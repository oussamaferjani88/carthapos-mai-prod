import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Clock, DollarSign, Calendar, CheckCircle } from 'lucide-react';

export const POSLayaway = ({ config }) => {
  const layaways = [
    {
      id: 'LAY-001',
      customer: 'Marie Dubois',
      product: 'Canapé 3 Places',
      total: 899.00,
      paid: 300.00,
      nextPayment: '25/01/2024',
      status: 'active'
    },
    {
      id: 'LAY-002',
      customer: 'Jean Martin',
      product: 'TV Samsung 55"',
      total: 699.00,
      paid: 500.00,
      nextPayment: '20/01/2024',
      status: 'active'
    },
    {
      id: 'LAY-003',
      customer: 'Sophie Laurent',
      product: 'Machine à Café Deluxe',
      total: 450.00,
      paid: 450.00,
      nextPayment: '-',
      status: 'completed'
    }
  ];

  const styles = {
    card: {
      backgroundColor: config.cardColor || '#ffffff',
      borderRadius: config.borderRadius || '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }
  };

  const getProgress = (paid, total) => {
    return (paid / total) * 100;
  };

  return (
    <div className="h-full flex flex-col space-y-4 p-6 bg-gray-50" style={{ fontFamily: config.fontFamily }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: config.textColor }}>
            <Clock className="h-8 w-8" />
            Dépôts & Réservations
          </h1>
          <p className="text-gray-500">Gestion des paiements échelonnés</p>
        </div>
        <Button style={{ backgroundColor: config.primaryColor }}>
          + Nouvelle Réservation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Réservations Actives</p>
                <p className="text-2xl font-bold" style={{ color: config.primaryColor }}>2</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Montant Total</p>
                <p className="text-2xl font-bold text-blue-600">2,048€</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Déjà Payé</p>
                <p className="text-2xl font-bold text-green-600">1,250€</p>
              </div>
              <CheckCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Restant</p>
                <p className="text-2xl font-bold text-orange-600">798€</p>
              </div>
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Layaway List */}
      <Card style={styles.card} className="flex-1">
        <CardHeader>
          <CardTitle>Liste des Réservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {layaways.map((layaway) => {
              const progress = getProgress(layaway.paid, layaway.total);
              return (
                <div key={layaway.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold" style={{ color: config.primaryColor }}>
                          {layaway.id}
                        </span>
                        {layaway.status === 'completed' ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                            Terminé
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            En Cours
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-semibold">{layaway.customer}</div>
                      <div className="text-sm text-gray-500">{layaway.product}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: config.primaryColor }}>
                        {layaway.total.toFixed(2)}€
                      </div>
                      <div className="text-sm text-gray-500">Total</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Progression</span>
                      <span className="font-semibold">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: config.primaryColor
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Déjà Payé</div>
                      <div className="font-semibold text-green-600">
                        {layaway.paid.toFixed(2)}€
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Restant</div>
                      <div className="font-semibold text-orange-600">
                        {(layaway.total - layaway.paid).toFixed(2)}€
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Prochain Paiement</div>
                      <div className="font-semibold text-blue-600">
                        {layaway.nextPayment}
                      </div>
                    </div>
                  </div>

                  {layaway.status === 'active' && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" style={{ backgroundColor: config.primaryColor }}>
                        Encaisser Paiement
                      </Button>
                      <Button size="sm" variant="outline">
                        Détails
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default POSLayaway;
