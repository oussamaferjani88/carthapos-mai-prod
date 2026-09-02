import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Heart, Gift, Star, TrendingUp, Users, Award, Percent, Search, X } from 'lucide-react';
import { getCurrencySymbol } from '../utils/currency';
import { usePermissions } from '../contexts/PermissionsContext';

const LEVELS = [
  { name: 'Bronze', min: 0, color: 'bg-amber-100 text-amber-800', icon: Award },
  { name: 'Silver', min: 200, color: 'bg-gray-100 text-gray-800', icon: Star },
  { name: 'Gold', min: 500, color: 'bg-yellow-100 text-yellow-800', icon: Star },
  { name: 'Platinum', min: 1000, color: 'bg-purple-100 text-purple-800', icon: Award },
];

function getLevel(points) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[0];
}

const Loyalty = () => {
  const { canCreate, canUpdate, canDelete } = usePermissions('loyalty');
  const formatCurrency = (amount) => {
    const val = parseFloat(amount) || 0;
    return `${val.toFixed(2)} ${getCurrencySymbol('TND')}`;
  };

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const [rewards, setRewards] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_loyalty_rewards');
      return saved ? JSON.parse(saved) : [
        { id: 1, name: 'Café Gratuit', description: 'Un café expresso offert', pointsCost: 50, type: 'product', active: true },
        { id: 2, name: 'Remise 10%', description: 'Réduction de 10% sur la prochaine commande', pointsCost: 100, type: 'discount', active: true },
        { id: 3, name: 'Dessert Gratuit', description: 'Un dessert au choix offert', pointsCost: 150, type: 'product', active: true },
        { id: 4, name: 'Menu Complet', description: 'Menu entrée + plat + dessert', pointsCost: 500, type: 'product', active: true },
      ];
    } catch { return []; }
  });

  const [newReward, setNewReward] = useState({ name: '', description: '', pointsCost: '', type: 'product' });

  useEffect(() => { loadCustomers(); }, []);

  useEffect(() => {
    localStorage.setItem('pos_loyalty_rewards', JSON.stringify(rewards));
  }, [rewards]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      if (window.electronAPI?.getCustomers) {
        const data = await window.electronAPI.getCustomers();
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const q = searchTerm.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  }, [customers, searchTerm]);

  const stats = useMemo(() => {
    const totalPoints = customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);
    const totalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const totalVisits = customers.reduce((sum, c) => sum + (c.visit_count || 0), 0);
    const vipCount = customers.filter(c => (c.loyalty_points || 0) >= 500).length;
    return {
      totalCustomers: customers.length,
      totalPoints,
      averagePoints: customers.length > 0 ? Math.round(totalPoints / customers.length) : 0,
      activeRewards: rewards.filter(r => r.active).length,
      totalSpent,
      vipCount,
      totalVisits,
      averageTicket: totalVisits > 0 ? (totalSpent / totalVisits).toFixed(2) : '0.00'
    };
  }, [customers, rewards]);

  const levelDistribution = useMemo(() => {
    const dist = {};
    LEVELS.forEach(l => dist[l.name] = 0);
    customers.forEach(c => { const l = getLevel(c.loyalty_points || 0); dist[l.name]++; });
    return dist;
  }, [customers]);

  const handleAddReward = () => {
    if (!newReward.name || !newReward.pointsCost) return;
    if (!canCreate) { alert("Action non autorisée : accès en lecture seule sur la fidélité."); return; }
    setRewards([...rewards, { id: Date.now(), ...newReward, pointsCost: parseInt(newReward.pointsCost), active: true }]);
    setNewReward({ name: '', description: '', pointsCost: '', type: 'product' });
  };

  const handleToggleReward = (id) => {
    if (!canUpdate) { alert("Action non autorisée : accès en lecture seule sur la fidélité."); return; }
    setRewards(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const handleDeleteReward = (id) => {
    if (!canDelete) { alert("Action non autorisée : accès en lecture seule sur la fidélité."); return; }
    setRewards(prev => prev.filter(r => r.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Programme de Fidélité</h1>
          <p className="text-muted-foreground mt-1">Gérez les points et récompenses de vos clients</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Clients fidèles</p>
              <p className="text-2xl font-bold">{stats.totalCustomers}</p>
            </div>
            <Users className="w-8 h-8 text-primary opacity-70" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Points totaux</p>
              <p className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</p>
            </div>
            <Star className="w-8 h-8 text-yellow-500 opacity-70" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Moyenne points</p>
              <p className="text-2xl font-bold">{stats.averagePoints}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500 opacity-70" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Clients VIP</p>
              <p className="text-2xl font-bold">{stats.vipCount}</p>
            </div>
            <Award className="w-8 h-8 text-purple-500 opacity-70" />
          </div>
        </div>
      </div>

      {/* Level Distribution */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Distribution par niveau</h3>
        <div className="flex gap-4 flex-wrap">
          {LEVELS.map(level => {
            const count = levelDistribution[level.name] || 0;
            const pct = stats.totalCustomers > 0 ? (count / stats.totalCustomers * 100) : 0;
            return (
              <div key={level.name} className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${level.color}`}>{level.name}</span>
                <span className="text-sm font-bold">{count}</span>
                <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button onClick={() => setActiveTab('overview')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <Users className="w-4 h-4 inline mr-2" />Clients
          </button>
          <button onClick={() => setActiveTab('rewards')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'rewards' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <Gift className="w-4 h-4 inline mr-2" />Récompenses ({rewards.length})
          </button>
        </nav>
      </div>

      {/* Customers Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Rechercher un client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Niveau</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Points</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total dépensé</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Visites</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCustomers.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucun client trouvé</td></tr>
                  ) : filteredCustomers.map((customer) => {
                    const level = getLevel(customer.loyalty_points || 0);
                    const LevelIcon = level.icon;
                    return (
                      <tr key={customer.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-xs">{customer.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="text-sm font-medium">{customer.name}</div>
                              <div className="text-xs text-muted-foreground">{customer.email || customer.phone || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${level.color}`}><LevelIcon className="w-3 h-3 inline mr-1" />{level.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center"><Star className="w-4 h-4 text-yellow-500 mr-1" /><span className="font-medium">{customer.loyalty_points || 0}</span></div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{formatCurrency(customer.total_spent || 0)}</td>
                        <td className="px-4 py-3 text-sm">{customer.visit_count || 0}</td>
                        <td className="px-4 py-3">
                          <select
                            disabled={!canUpdate}
                            onChange={(e) => {
                              if (!canUpdate) return;
                              if (e.target.value) {
                                const reward = rewards.find(r => r.id === parseInt(e.target.value));
                                if (reward && (customer.loyalty_points || 0) >= reward.pointsCost) {
                                  if (window.electronAPI?.updateCustomer) {
                                    window.electronAPI.updateCustomer(customer.id, { ...customer, loyalty_points: (customer.loyalty_points || 0) - reward.pointsCost });
                                  }
                                  setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, loyalty_points: (c.loyalty_points || 0) - reward.pointsCost } : c));
                                }
                                e.target.value = '';
                              }
                            }}
                            className="text-xs px-2 py-1 border border-border rounded-md bg-background focus:outline-none"
                          >
                            <option value="">Échanger</option>
                            {rewards.filter(r => r.active && (customer.loyalty_points || 0) >= r.pointsCost).map(reward => (
                              <option key={reward.id} value={reward.id}>{reward.name} ({reward.pointsCost} pts)</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          {canCreate && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">Nouvelle récompense</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <input type="text" placeholder="Nom" value={newReward.name} onChange={(e) => setNewReward({ ...newReward, name: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="text" placeholder="Description" value={newReward.description} onChange={(e) => setNewReward({ ...newReward, description: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="number" placeholder="Coût en points" value={newReward.pointsCost} onChange={(e) => setNewReward({ ...newReward, pointsCost: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <select value={newReward.type} onChange={(e) => setNewReward({ ...newReward, type: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="product">Produit</option>
                <option value="discount">Remise</option>
                <option value="service">Service</option>
              </select>
              <button onClick={handleAddReward} disabled={!newReward.name || !newReward.pointsCost} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"><Plus className="w-4 h-4" /> Ajouter</button>
            </div>
          </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => {
              const IconComponent = reward.type === 'product' ? Gift : reward.type === 'discount' ? Percent : Star;
              return (
                <div key={reward.id} className={`bg-card border border-border rounded-lg p-4 ${!reward.active ? 'opacity-50' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg"><IconComponent className="w-5 h-5 text-primary" /></div>
                      <div>
                        <h4 className="font-semibold text-sm">{reward.name}</h4>
                        <p className="text-xs text-muted-foreground">{reward.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500" /><span className="text-sm font-medium">{reward.pointsCost} pts</span></div>
                    <div className="flex gap-1">
                      <button onClick={() => handleToggleReward(reward.id)} className={`text-xs px-2 py-1 rounded ${reward.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{reward.active ? 'Actif' : 'Inactif'}</button>
                      <button onClick={() => handleDeleteReward(reward.id)} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">Supprimer</button>
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
