import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Euro, ShoppingCart, Package, Calendar } from 'lucide-react';
import { POSConfiguration } from '../../../../config/POSConfiguration';

export const POSReports = ({ config }) => {
  const styles = POSConfiguration.getStyles(config);

  const formatPrice = (price) => {
    const currency = config.currency || 'DT';
    const position = config.currencyPosition || 'after';
    if (position === 'before') {
      return `${currency}${price.toFixed(2)}`;
    }
    return `${price.toFixed(2)} ${currency}`;
  };

  const DEMO_HOURLY_DATA = [
    { hour: '08h', sales: 5, revenue: 23.50 },
    { hour: '09h', sales: 12, revenue: 67.80 },
    { hour: '10h', sales: 18, revenue: 89.20 },
    { hour: '11h', sales: 25, revenue: 134.70 },
    { hour: '12h', sales: 45, revenue: 267.90 },
    { hour: '13h', sales: 38, revenue: 198.40 },
    { hour: '14h', sales: 22, revenue: 123.60 },
    { hour: '15h', sales: 15, revenue: 78.30 },
    { hour: '16h', sales: 19, revenue: 95.80 },
    { hour: '17h', sales: 28, revenue: 156.20 },
    { hour: '18h', sales: 12, revenue: 67.40 }
  ];

  const DEMO_CATEGORY_DATA = [
    { name: 'Boissons', value: 45, color: '#3B82F6' },
    { name: 'Viennoiseries', value: 28, color: '#10B981' },
    { name: 'Sandwichs', value: 18, color: '#F59E0B' },
    { name: 'Salades', value: 12, color: '#EF4444' },
    { name: 'Pâtisseries', value: 15, color: '#8B5CF6' },
    { name: 'Autres', value: 8, color: '#6B7280' }
  ];

  const totalSales = DEMO_HOURLY_DATA.reduce((sum, item) => sum + item.sales, 0);
  const totalRevenue = DEMO_HOURLY_DATA.reduce((sum, item) => sum + item.revenue, 0);
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  const periods = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'yesterday', label: 'Hier' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'year', label: 'Cette année' }
  ];

  const statCards = [
    {
      title: 'Ventes totales',
      value: totalSales,
      description: 'Transactions effectuées',
      icon: ShoppingCart,
      color: 'text-blue-600'
    },
    {
      title: "Chiffre d'affaires",
      value: formatPrice(totalRevenue),
      description: 'Revenus générés',
      icon: Euro,
      color: 'text-green-600'
    },
    {
      title: 'Ticket moyen',
      value: formatPrice(averageTicket),
      description: 'Montant moyen par vente',
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      title: 'Produit vedette',
      value: 'Café Expresso',
      description: 'Produit le plus vendu',
      icon: Package,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-6" style={{
      fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif',
      fontSize: config.fontSize || '14px',
      fontWeight: config.fontWeight || '400'
    }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: config.textColor }}>
            Rapports
          </h1>
          <p style={{ color: config.textMutedColor }}>
            Analysez les performances de votre activité
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" style={{ color: config.textMutedColor }} />
          <Select value="today" disabled>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} style={styles.card}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: config.textColor }}>
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: config.textColor }}>
                {stat.value}
              </div>
              <p className="text-xs mt-1" style={{ color: config.textMutedColor }}>
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique des ventes */}
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Évolution des ventes</CardTitle>
            <CardDescription>
              Ventes par heure pour la période sélectionnée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={DEMO_HOURLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'sales' ? `${value} ventes` : formatPrice(value),
                    name === 'sales' ? 'Ventes' : 'Revenus'
                  ]}
                />
                <Bar dataKey="sales" fill={config.primaryColor || '#3B82F6'} name="sales" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition par catégorie */}
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Ventes par catégorie</CardTitle>
            <CardDescription>
              Répartition des ventes par type de produit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={DEMO_CATEGORY_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {DEMO_CATEGORY_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Part']} />
                </PieChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-2">
                {DEMO_CATEGORY_DATA.map((category) => (
                  <div key={category.name} className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm" style={{ color: config.textColor }}>{category.name}</span>
                    <Badge variant="outline" className="ml-auto">
                      {category.value}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des performances */}
      <Card style={styles.card}>
        <CardHeader>
          <CardTitle>Performances détaillées</CardTitle>
          <CardDescription>
            Analyse détaillée par tranche horaire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: config.cardBorderColor }}>
                  <th className="text-left p-2 text-sm font-medium" style={{ color: config.textMutedColor }}>Heure</th>
                  <th className="text-right p-2 text-sm font-medium" style={{ color: config.textMutedColor }}>Ventes</th>
                  <th className="text-right p-2 text-sm font-medium" style={{ color: config.textMutedColor }}>Revenus</th>
                  <th className="text-right p-2 text-sm font-medium" style={{ color: config.textMutedColor }}>Ticket moyen</th>
                  <th className="text-right p-2 text-sm font-medium" style={{ color: config.textMutedColor }}>Performance</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_HOURLY_DATA.map((item, index) => {
                  const avgTicket = item.sales > 0 ? item.revenue / item.sales : 0;
                  const performance = item.sales > 20 ? 'Excellente' :
                    item.sales > 15 ? 'Bonne' :
                    item.sales > 10 ? 'Moyenne' : 'Faible';
                  const performanceColor = item.sales > 20 ? 'text-green-600' :
                    item.sales > 15 ? 'text-blue-600' :
                    item.sales > 10 ? 'text-orange-600' : 'text-red-600';

                  return (
                    <tr key={index} className="border-b" style={{ borderColor: config.cardBorderColor }}>
                      <td className="p-2 font-medium" style={{ color: config.textColor }}>{item.hour}</td>
                      <td className="text-right p-2" style={{ color: config.textColor }}>{item.sales}</td>
                      <td className="text-right p-2" style={{ color: config.textColor }}>{formatPrice(item.revenue)}</td>
                      <td className="text-right p-2" style={{ color: config.textColor }}>{formatPrice(avgTicket)}</td>
                      <td className={`text-right p-2 font-medium ${performanceColor}`}>
                        {performance}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
