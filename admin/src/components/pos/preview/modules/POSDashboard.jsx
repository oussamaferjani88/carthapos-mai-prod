import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart, Users, Package, DollarSign, TrendingUp, TrendingDown, Euro, Check } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { POSConfiguration } from '../../../../config/POSConfiguration';

export const POSDashboard = ({ config, modules }) => {
  const styles = POSConfiguration.getStyles(config);
  const cardClasses = POSConfiguration.getCardClasses(config);
  const buttonClasses = POSConfiguration.getButtonClasses(config);
  const gridClasses = POSConfiguration.getGridClasses(config);
  const layoutClasses = POSConfiguration.getLayoutClasses(config);

  const formatCurrency = (amount) => {
    const currency = config.currency || 'DT';
    const position = config.currencyPosition || 'after';
    if (position === 'before') {
      return `${currency}${amount.toFixed(2)}`;
    }
    return `${amount.toFixed(2)} ${currency}`;
  };

  const DEMO_STATS = {
    totalSales: 23,
    totalRevenue: 1247.50,
    productsCount: 156,
    lowStockCount: 8,
  };

  const DEMO_ORDERS = [
    { id: 1, total: 45.80, items: 3, time: '14:32' },
    { id: 2, total: 23.50, items: 1, time: '14:15' },
    { id: 3, total: 67.20, items: 5, time: '13:58' },
    { id: 4, total: 12.90, items: 2, time: '13:45' },
    { id: 5, total: 89.30, items: 4, time: '13:22' }
  ];

  const DEMO_CHART = [
    { month: 'Jan', revenue: 1200 },
    { month: 'Fév', revenue: 1800 },
    { month: 'Mar', revenue: 1400 },
    { month: 'Avr', revenue: 2200 },
    { month: 'Mai', revenue: 1900 },
    { month: 'Juin', revenue: 2600 },
  ];

  const statsArray = [
    {
      title: 'Ventes du jour',
      value: DEMO_STATS.totalSales.toString(),
      icon: ShoppingCart,
      color: 'bg-blue-500',
      description: 'Transactions effectuées'
    },
    {
      title: "Chiffre d'affaires",
      value: formatCurrency(DEMO_STATS.totalRevenue),
      icon: Euro,
      color: 'bg-green-500',
      description: 'Revenus du jour'
    },
    {
      title: 'Produits',
      value: DEMO_STATS.productsCount.toString(),
      icon: Package,
      color: 'bg-purple-500',
      description: 'Articles en stock'
    },
    {
      title: 'Stock faible',
      value: DEMO_STATS.lowStockCount.toString(),
      icon: TrendingUp,
      color: 'bg-orange-500',
      description: 'Articles à réapprovisionner'
    }
  ];

  return (
    <div
      className={cn(layoutClasses, 'space-y-6')}
      style={{
        ...styles.container,
        ...POSConfiguration.getStyleVars(config),
        fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif',
        fontSize: config.fontSize || '14px',
        fontWeight: config.fontWeight || '400'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: config.textColor }}>
            Dashboard
          </h1>
          <p className="mt-1" style={{ color: config.textMutedColor }}>
            Vue d'ensemble de votre activité
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            className={cn(buttonClasses, 'font-medium transition-colors')}
            style={{ backgroundColor: config.primaryColor, color: '#fff' }}
          >
            Voir les rapports
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={cn('grid gap-4', gridClasses, 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4')}>
        {statsArray.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card
              key={index}
              className={cn(cardClasses, 'hover:shadow-md transition-shadow')}
              style={{
                ...styles.card,
                borderColor: config.cardBorderColor
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: config.textColor }}>
                  {stat.title}
                </CardTitle>
                <div
                  className={cn(stat.color, 'rounded-lg p-3')}
                  style={{ backgroundColor: config.primaryColor }}
                >
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: config.textColor }}>
                  {stat.value}
                </div>
                <p className="text-sm mt-1" style={{ color: config.textMutedColor }}>
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: config.cardBorderColor }}>
          <CardHeader>
            <CardTitle>Ventes récentes</CardTitle>
            <CardDescription>Les dernières transactions effectuées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DEMO_ORDERS.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: config.secondaryColor || '#f9fafb' }}>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: config.primaryColor + '20' }}>
                      <ShoppingCart className="h-4 w-4" style={{ color: config.primaryColor }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: config.textColor }}>Vente #{sale.id}</p>
                      <p className="text-sm" style={{ color: config.textMutedColor }}>
                        {sale.items} article(s) • {sale.time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" style={{ color: config.textColor }}>{formatCurrency(sale.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: config.cardBorderColor }}>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors group" style={{ borderColor: config.cardBorderColor }}>
                <ShoppingCart className="h-8 w-8 mb-2" style={{ color: config.textMutedColor }} />
                <span className="text-sm font-medium" style={{ color: config.textMutedColor }}>Nouvelle vente</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors group" style={{ borderColor: config.cardBorderColor }}>
                <Package className="h-8 w-8 mb-2" style={{ color: config.textMutedColor }} />
                <span className="text-sm font-medium" style={{ color: config.textMutedColor }}>Ajout produit</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors group" style={{ borderColor: config.cardBorderColor }}>
                <Users className="h-8 w-8 mb-2" style={{ color: config.textMutedColor }} />
                <span className="text-sm font-medium" style={{ color: config.textMutedColor }}>Nouveau client</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors group" style={{ borderColor: config.cardBorderColor }}>
                <DollarSign className="h-8 w-8 mb-2" style={{ color: config.textMutedColor }} />
                <span className="text-sm font-medium" style={{ color: config.textMutedColor }}>Voir rapports</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      <Card className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: config.cardBorderColor }}>
        <CardHeader>
          <CardTitle>Alertes</CardTitle>
          <CardDescription>Notifications importantes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DEMO_STATS.lowStockCount > 0 && (
              <div className="flex items-center space-x-3 p-3 rounded-lg border" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
                <Package className="h-5 w-5 text-orange-600" />
                <div className="flex-1">
                  <p className="font-medium text-orange-800">Stock faible</p>
                  <p className="text-sm text-orange-700">
                    {DEMO_STATS.lowStockCount} article(s) nécessitent un réapprovisionnement
                  </p>
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  {DEMO_STATS.lowStockCount}
                </Badge>
              </div>
            )}

            {DEMO_STATS.totalSales > 20 && (
              <div className="flex items-center space-x-3 p-3 rounded-lg border" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-800">Objectif atteint</p>
                  <p className="text-sm text-green-700">
                    Vous avez dépassé votre objectif de ventes du jour
                  </p>
                </div>
              </div>
            )}

            {DEMO_STATS.lowStockCount === 0 && DEMO_STATS.totalSales <= 20 && (
              <div className="text-center py-8">
                <Check className="h-12 w-12 mx-auto mb-3" style={{ color: config.textMutedColor }} />
                <p style={{ color: config.textMutedColor }}>Aucune alerte</p>
                <p className="text-sm mt-1" style={{ color: config.textMutedColor }}>
                  Tout fonctionne correctement
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sales Overview Chart */}
      <Card className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: config.cardBorderColor }}>
        <CardHeader>
          <CardTitle>Aperçu des ventes</CardTitle>
          <CardDescription>Évolution du chiffre d'affaires mensuel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEMO_CHART}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Revenus']} />
                <Bar dataKey="revenue" fill={config.primaryColor || '#3b82f6'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
