import React, { useState, useEffect } from 'react';
import { Plus, Heart, Gift, Star, TrendingUp, Users, Award, Percent } from 'lucide-react';
import { useThemeApplier } from '../hooks/useThemeApplier';

const Loyalty = () => {
  useThemeApplier();
  
  const [customers, setCustomers] = useState([
    {
      id: 1,
      name: 'Marie Dubois',
      email: 'marie.dubois@email.com',
      phone: '06 12 34 56 78',
      points: 450,
      level: 'Gold',
      totalSpent: 1250.00,
      visits: 28,
      joinDate: '2024-01-15'
    },
    {
      id: 2,
      name: 'Jean Martin',
      email: 'jean.martin@email.com',
      phone: '06 98 76 54 32',
      points: 230,
      level: 'Silver',
      totalSpent: 680.00,
      visits: 15,
      joinDate: '2024-03-20'
    },
    {
      id: 3,
      name: 'Sophie Laurent',
      email: 'sophie.laurent@email.com',
      phone: '06 11 22 33 44',
      points: 120,
      level: 'Bronze',
      totalSpent: 340.00,
      visits: 8,
      joinDate: '2024-06-10'
    }
  ]);

  const [rewards, setRewards] = useState([
    {
      id: 1,
      name: 'Café Gratuit',
      description: 'Un café expresso offert',
      pointsCost: 50,
      type: 'product',
      active: true
    },
    {
      id: 2,
      name: 'Remise 10%',
      description: 'Réduction de 10% sur la prochaine commande',
      pointsCost: 100,
      type: 'discount',
      active: true
    },
    {
      id: 3,
      name: 'Dessert Gratuit',
      description: 'Un dessert au choix offert',
      pointsCost: 150,
      type: 'product',
      active: true
    },
    {
      id: 4,
      name: 'Menu Complet',
      description: 'Menu entrée + plat + dessert offert',
      pointsCost: 500,
      type: 'product',
      active: true
    }
  ]);

  const [activeTab, setActiveTab] = useState('overview');
  const [newReward, setNewReward] = useState({
    name: '',
    description: '',
    pointsCost: '',
    type: 'product'
  });

  const levelColors = {
    Bronze: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    Silver: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    Gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    Platinum: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
  };

  const typeIcons = {
    product: Gift,
    discount: Percent,
    service: Star
  };

  const getCustomerLevel = (points) => {
    if (points >= 1000) return 'Platinum';
    if (points >= 500) return 'Gold';
    if (points >= 200) return 'Silver';
    return 'Bronze';
  };

  const getLoyaltyStats = () => {
    return {
      totalCustomers: customers.length,
      totalPoints: customers.reduce((sum, customer) => sum + customer.points, 0),
      averagePoints: Math.round(customers.reduce((sum, customer) => sum + customer.points, 0) / customers.length),
      activeRewards: rewards.filter(r => r.active).length
    };
  };

  const handleAddReward = () => {
    const reward = {
      id: Date.now(),
      ...newReward,
      pointsCost: parseInt(newReward.pointsCost),
      active: true
    };
    setRewards([...rewards, reward]);
    setNewReward({ name: '', description: '', pointsCost: '', type: 'product' });
  };

  const handleRedeemReward = (customerId, rewardId) => {
    const customer = customers.find(c => c.id === customerId);
    const reward = rewards.find(r => r.id === rewardId);
    
    if (customer && reward && customer.points >= reward.pointsCost) {
      setCustomers(customers.map(c => 
        c.id === customerId 
          ? { ...c, points: c.points - reward.pointsCost }
          : c
      ));
      // Here you would also create a redemption record
      alert(`${customer.name} a échangé ${reward.pointsCost} points contre "${reward.name}"`);
    }
  };

  const stats = getLoyaltyStats();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Programme de Fidélité</h1>
          <p className="text-muted-foreground mt-2">
            Gérez les points de fidélité et récompenses de vos clients
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Clients Fidèles</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalCustomers}</p>
            </div>
            <Users className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Points Totaux</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalPoints.toLocaleString()}</p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Moyenne Points</p>
              <p className="text-2xl font-bold text-foreground">{stats.averagePoints}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Récompenses</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeRewards}</p>
            </div>
            <Gift className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Clients
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rewards'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <Gift className="w-4 h-4 inline mr-2" />
            Récompenses
          </button>
        </nav>
      </div>

      {/* Customers Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Niveau
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total Dépensé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Visites
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-foreground">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">{customer.email}</div>
                          <div className="text-sm text-muted-foreground">{customer.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${levelColors[customer.level]}`}>
                          <Award className="w-3 h-3 inline mr-1" />
                          {customer.level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 mr-1" />
                          <span className="text-sm font-medium text-foreground">{customer.points}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {customer.totalSpent.toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {customer.visits}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleRedeemReward(customer.id, parseInt(e.target.value));
                              e.target.value = '';
                            }
                          }}
                          className="text-sm px-3 py-1 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                        >
                          <option value="">Échanger points</option>
                          {rewards
                            .filter(r => r.active && customer.points >= r.pointsCost)
                            .map(reward => (
                              <option key={reward.id} value={reward.id}>
                                {reward.name} ({reward.pointsCost} pts)
                              </option>
                            ))
                          }
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          {/* Add Reward Form */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Nouvelle Récompense</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Nom de la récompense"
                value={newReward.name}
                onChange={(e) => setNewReward({...newReward, name: e.target.value})}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <input
                type="text"
                placeholder="Description"
                value={newReward.description}
                onChange={(e) => setNewReward({...newReward, description: e.target.value})}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <input
                type="number"
                placeholder="Coût en points"
                value={newReward.pointsCost}
                onChange={(e) => setNewReward({...newReward, pointsCost: e.target.value})}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <div className="flex gap-2">
                <select
                  value={newReward.type}
                  onChange={(e) => setNewReward({...newReward, type: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background flex-1"
                >
                  <option value="product">Produit</option>
                  <option value="discount">Remise</option>
                  <option value="service">Service</option>
                </select>
                <button
                  onClick={handleAddReward}
                  disabled={!newReward.name || !newReward.pointsCost}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>
            </div>
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => {
              const IconComponent = typeIcons[reward.type] || Gift;
              return (
                <div key={reward.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{reward.name}</h4>
                        <p className="text-sm text-muted-foreground">{reward.description}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      reward.active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {reward.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-foreground">{reward.pointsCost} points</span>
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {reward.type}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Loyalty;
