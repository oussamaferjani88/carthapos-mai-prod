import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Tag, Percent, Gift, TrendingDown, Calendar } from 'lucide-react';
import { POSConfiguration } from '../../../../config/POSConfiguration';

export const POSPromotions = ({ config }) => {
  const [showAddPromo, setShowAddPromo] = useState(false);

  const promotions = [
    { 
      id: 1, 
      name: 'Happy Hour Café', 
      type: 'percentage', 
      value: 20, 
      conditions: '14h-16h',
      status: 'active',
      uses: 145,
      sales: '1,234€'
    },
    { 
      id: 2, 
      name: '2 Croissants = 1 Offert', 
      type: 'bogo', 
      value: 100, 
      conditions: 'Achat multiple',
      status: 'active',
      uses: 89,
      sales: '567€'
    },
    { 
      id: 3, 
      name: 'Réduction Fidélité -10%', 
      type: 'percentage', 
      value: 10, 
      conditions: 'Clients VIP',
      status: 'active',
      uses: 234,
      sales: '2,145€'
    },
    { 
      id: 4, 
      name: 'Weekend Special', 
      type: 'fixed', 
      value: 5, 
      conditions: 'Sam-Dim',
      status: 'scheduled',
      uses: 0,
      sales: '0€'
    }
  ];

  const styles = POSConfiguration.getStyles(config);

  const getPromoIcon = (type) => {
    switch(type) {
      case 'percentage': return <Percent className="h-5 w-5 text-orange-500" />;
      case 'bogo': return <Gift className="h-5 w-5 text-purple-500" />;
      case 'fixed': return <TrendingDown className="h-5 w-5 text-blue-500" />;
      default: return <Tag className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 py-6 bg-gray-50" style={{ fontFamily: config.fontFamily }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: config.textColor }}>
            <Tag className="h-8 w-8" />
            Promotions & Remises
          </h1>
          <p className="text-gray-500">Gérez vos offres promotionnelles</p>
        </div>
        <Button 
          onClick={() => setShowAddPromo(!showAddPromo)}
          style={{ backgroundColor: config.primaryColor }}
        >
          + Nouvelle Promotion
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Promotions Actives</p>
                <p className="text-2xl font-bold" style={{ color: config.primaryColor }}>3</p>
              </div>
              <Tag className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Utilisations Total</p>
                <p className="text-2xl font-bold text-blue-600">468</p>
              </div>
              <TrendingDown className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ventes Promotions</p>
                <p className="text-2xl font-bold text-green-600">3,946€</p>
              </div>
              <Gift className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Remise Moyenne</p>
                <p className="text-2xl font-bold text-orange-600">15%</p>
              </div>
              <Percent className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Promotions List */}
      <Card style={styles.card} className="flex-1">
        <CardHeader>
          <CardTitle>Liste des Promotions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {promotions.map(promo => (
              <div key={promo.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="bg-gray-100 p-3 rounded-lg">
                      {getPromoIcon(promo.type)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{promo.name}</div>
                      <div className="text-sm text-gray-500">Condition: {promo.conditions}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: config.primaryColor }}>
                        {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value}€`}
                      </div>
                      <div className="text-xs text-gray-500">Remise</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold text-blue-600">{promo.uses}</div>
                      <div className="text-xs text-gray-500">Utilisations</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold text-green-600">{promo.sales}</div>
                      <div className="text-xs text-gray-500">CA Généré</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      promo.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {promo.status === 'active' ? 'Active' : 'Planifiée'}
                    </span>
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

export default POSPromotions;
