import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Users, Plus } from 'lucide-react';

export const POSCustomers = ({ config }) => {
  const customers = [
    { name: 'M. Dupont', email: 'dupont@email.com', orders: 12, total: '€156.50' },
    { name: 'Mme Martin', email: 'martin@email.com', orders: 8, total: '€89.75' },
    { name: 'M. Bernard', email: 'bernard@email.com', orders: 15, total: '€245.00' }
  ];

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
      className="space-y-4"
      style={{
        fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif',
        fontSize: config.fontSize || '14px',
        fontWeight: config.fontWeight || '400'
      }}
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: config.textColor }}>
            Gestion des Clients
          </h1>
          <p style={{ color: config.textMutedColor }}>
            Gérez votre base de clients
          </p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90"
          style={{ backgroundColor: config.primaryColor }}
        >
          <Plus className="h-4 w-4" />
          Nouveau client
        </button>
      </div>

      <Card style={styles.card}>
        <CardHeader>
          <CardTitle>Liste des clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customers.map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: config.cardBorderColor }}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6" style={{ color: config.textMutedColor }} />
                  </div>
                  <div>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm" style={{ color: config.textMutedColor }}>
                      {customer.email}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold" style={{ color: config.primaryColor }}>
                    {customer.total}
                  </div>
                  <div className="text-sm" style={{ color: config.textMutedColor }}>
                    {customer.orders} commandes
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
