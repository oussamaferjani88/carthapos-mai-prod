import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { TrendingUp, Users, ShoppingBag, Euro } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { POSConfiguration } from '../../../../config/POSConfiguration';

export const POSDashboard = ({ config, modules }) => {
  const styles = POSConfiguration.getStyles(config);
  
  // Nouvelles classes de composants
  const cardClasses = POSConfiguration.getCardClasses(config);
  const buttonClasses = POSConfiguration.getButtonClasses(config);
  const gridClasses = POSConfiguration.getGridClasses(config);
  const layoutClasses = POSConfiguration.getLayoutClasses(config);

  console.log('🎨 Dashboard Component Classes:', {
    cardClasses,
    buttonClasses,
    gridClasses,
    layoutClasses,
    config: config.components
  });

  const stats = [
    {
      title: "Ventes aujourd'hui",
      value: "€1,247.50",
      change: "+12%",
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      title: "Clients servis",
      value: "42",
      change: "+8%",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Articles vendus",
      value: "156",
      change: "+15%",
      icon: ShoppingBag,
      color: "text-purple-600"
    },
    {
      title: "Ticket moyen",
      value: "€29.70",
      change: "+3%",
      icon: Euro,
      color: "text-orange-600"
    }
  ];

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
          Dashboard
        </h1>
        <p style={{ color: config.textMutedColor }}>
          Vue d'ensemble de votre activité
        </p>
      </div>

      {/* Statistiques avec nouvelles classes */}
      <div className={cn(
        "grid gap-4",
        gridClasses,
        config.dashboardLayout === 'list' ? 'grid-cols-1' :
        config.dashboardLayout === 'compact' ? 'grid-cols-2 lg:grid-cols-4' :
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      )}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className={cn("transition-all duration-200", cardClasses)}
              style={styles.card}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={cn("text-xs", stat.color)}>
                  {stat.change} vs hier
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activité récente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card 
          className={cn("transition-all duration-200", cardClasses)}
          style={styles.card}
        >
          <CardHeader>
            <CardTitle>Commandes récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { id: "#1234", client: "M. Dupont", montant: "€24.50", status: "Payé" },
                { id: "#1235", client: "Mme Martin", montant: "€18.75", status: "En cours" },
                { id: "#1236", client: "M. Bernard", montant: "€32.00", status: "Payé" }
              ].map((order) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{order.id}</div>
                    <div className="text-sm" style={{ color: config.textMutedColor }}>
                      {order.client}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold" style={{ color: config.primaryColor }}>
                      {order.montant}
                    </div>
                    <div className="text-sm" style={{ color: config.textMutedColor }}>
                      {order.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Produits populaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { nom: "Café Expresso", ventes: 28, revenus: "€84.00" },
                { nom: "Croissant", ventes: 15, revenus: "€22.50" },
                { nom: "Sandwich Club", ventes: 12, revenus: "€54.00" }
              ].map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{product.nom}</div>
                    <div className="text-sm" style={{ color: config.textMutedColor }}>
                      {product.ventes} vendus
                    </div>
                  </div>
                  <div className="font-bold" style={{ color: config.primaryColor }}>
                    {product.revenus}
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
