import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { BarChart3, TrendingUp, Users, ShoppingBag } from 'lucide-react';

export const POSReports = ({ config }) => {
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
      <div>
        <h1 className="text-2xl font-bold" style={{ color: config.textColor }}>
          Rapports et Analyses
        </h1>
        <p style={{ color: config.textMutedColor }}>
          Analysez les performances de votre activité
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card style={styles.card}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-sm">
              <TrendingUp className="mr-2 h-4 w-4" />
              Ventes aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-xl font-bold">€1,247.50</div>
            <div className="text-xs text-green-600 mt-1">+12% vs hier</div>
          </CardContent>
        </Card>

        <Card style={styles.card}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-sm">
              <Users className="mr-2 h-4 w-4" />
              Clients servis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-xl font-bold">42</div>
            <div className="text-xs text-green-600 mt-1">+8% vs hier</div>
          </CardContent>
        </Card>

        <Card style={styles.card}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-sm">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Articles vendus
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-xl font-bold">156</div>
            <div className="text-xs text-green-600 mt-1">+15% vs hier</div>
          </CardContent>
        </Card>

        <Card style={styles.card}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Ticket moyen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-xl font-bold">€29.70</div>
            <div className="text-xs text-green-600 mt-1">+3% vs hier</div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Ventes de la semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] bg-slate-50 rounded flex items-center justify-center">
              <div className="text-center" style={{ color: config.textMutedColor }}>
                <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                <div>Graphique des ventes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Produits les plus vendus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { name: 'Café Americano', sales: 28, amount: '€84.00' },
                { name: 'Croissant', sales: 15, amount: '€22.50' },
                { name: 'Cappuccino', sales: 12, amount: '€48.00' }
              ].map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{product.name}</div>
                    <div className="text-xs" style={{ color: config.textMutedColor }}>
                      {product.sales} vendus
                    </div>
                  </div>
                  <div className="text-sm font-bold" style={{ color: config.primaryColor }}>
                    {product.amount}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
