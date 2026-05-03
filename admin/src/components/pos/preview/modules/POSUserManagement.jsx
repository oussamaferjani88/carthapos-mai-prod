import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Users, UserPlus, Shield, Edit, Trash2, X, Save, Key, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../../../lib/utils';

export const POSUserManagement = ({ config, modules = [] }) => {
  const [users, setUsers] = useState([
    {
      id: 1,
      name: 'Admin Principal',
      username: 'admin',
      role: 'admin',
      email: 'admin@pos.com',
      modules: [], // Admin a accès à tout
      active: true
    },
    {
      id: 2,
      name: 'Marie Dupont',
      username: 'marie',
      role: 'cashier',
      email: 'marie@pos.com',
      modules: ['dashboard', 'sales'], // Modules par défaut
      active: true
    },
    {
      id: 3,
      name: 'Jean Martin',
      username: 'jean',
      role: 'cashier',
      email: 'jean@pos.com',
      modules: ['dashboard', 'sales', 'customers', 'products'],
      active: true
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'cashier',
    modules: ['dashboard', 'sales']
  });

  // Available modules for assignment
  const availableModules = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'sales', name: 'Ventes', icon: '🛒' },
    { id: 'products', name: 'Produits', icon: '📦' },
    { id: 'customers', name: 'Clients', icon: '👥' },
    { id: 'inventory', name: 'Stocks', icon: '📋' },
    { id: 'tables', name: 'Tables', icon: '🍽️' },
    { id: 'reports', name: 'Rapports', icon: '📈' },
    { id: 'settings', name: 'Paramètres', icon: '⚙️' }
  ];

  const addUser = () => {
    if (!formData.name || !formData.username || !formData.password) {
      alert('Veuillez remplir tous les champs obligatoires!');
      return;
    }

    const newUser = {
      id: Math.max(...users.map(u => u.id)) + 1,
      name: formData.name,
      username: formData.username,
      email: formData.email,
      role: formData.role,
      modules: formData.role === 'admin' ? [] : formData.modules,
      active: true
    };

    setUsers([...users, newUser]);
    setFormData({ name: '', username: '', email: '', password: '', role: 'cashier', modules: ['dashboard', 'sales'] });
    setShowAddForm(false);
  };

  const editUser = () => {
    if (!selectedUser) return;

    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === selectedUser.id
          ? {
              ...user,
              name: formData.name,
              email: formData.email,
              role: formData.role,
              modules: formData.role === 'admin' ? [] : formData.modules
            }
          : user
      )
    );

    setShowEditForm(false);
    setSelectedUser(null);
    setFormData({ name: '', username: '', email: '', password: '', role: 'cashier', modules: ['dashboard', 'sales'] });
  };

  const deleteUser = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user.role === 'admin') {
      alert('Impossible de supprimer un compte admin!');
      return;
    }
    if (window.confirm(`Voulez-vous vraiment supprimer l'utilisateur ${user.name}?`)) {
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    }
  };

  const toggleUserStatus = (userId) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, active: !user.active } : user
      )
    );
  };

  const openEditForm = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      modules: user.modules
    });
    setShowEditForm(true);
  };

  const toggleModule = (moduleId) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(moduleId)
        ? prev.modules.filter(m => m !== moduleId)
        : [...prev.modules, moduleId]
    }));
  };

  const styles = {
    card: {
      backgroundColor: config.cardColor || '#ffffff',
      borderRadius: config.borderRadius || '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    cashiers: users.filter(u => u.role === 'cashier').length,
    active: users.filter(u => u.active).length
  };

  return (
    <div className="h-full flex flex-col space-y-4 p-6 bg-gray-50" style={{ fontFamily: config.fontFamily }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: config.textColor }}>
            <Users className="h-8 w-8" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-gray-500">Gérer les comptes et permissions du personnel</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          style={{ backgroundColor: config.primaryColor }}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Utilisateurs</p>
                <p className="text-2xl font-bold" style={{ color: config.primaryColor }}>{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Administrateurs</p>
                <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
              </div>
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Caissiers</p>
                <p className="text-2xl font-bold text-blue-600">{stats.cashiers}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Actifs</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card style={styles.card} className="flex-1">
        <CardHeader>
          <CardTitle>Liste des Utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg",
                      user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'
                    )}>
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{user.name}</span>
                        {user.role === 'admin' && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                            <Shield className="h-3 w-3 inline mr-1" />
                            ADMIN
                          </span>
                        )}
                        {!user.active && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                            Désactivé
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">@{user.username} • {user.email}</div>
                      {user.role === 'cashier' && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {user.modules.map(moduleId => {
                            const module = availableModules.find(m => m.id === moduleId);
                            return module ? (
                              <span key={moduleId} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                {module.icon} {module.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleUserStatus(user.id)}
                      className={user.active ? 'text-orange-600' : 'text-green-600'}
                    >
                      {user.active ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditForm(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {user.role !== 'admin' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteUser(user.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add User Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Ajouter un utilisateur
                </CardTitle>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ name: '', username: '', email: '', password: '', role: 'cashier', modules: ['dashboard', 'sales'] });
                  }}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom complet *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: Marie Dupont"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nom d'utilisateur *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: marie"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ex: marie@pos.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mot de passe *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Rôle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="cashier">Caissier</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              
              {formData.role === 'cashier' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Modules autorisés</label>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-2">
                      {availableModules.map(module => (
                        <label key={module.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.modules.includes(module.id)}
                            onChange={() => toggleModule(module.id)}
                            disabled={module.id === 'dashboard' || module.id === 'sales'}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">
                            {module.icon} {module.name}
                            {(module.id === 'dashboard' || module.id === 'sales') && (
                              <span className="text-xs text-gray-500 ml-1">(obligatoire)</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={addUser}
                  style={{ backgroundColor: config.primaryColor }}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Créer l'utilisateur
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ name: '', username: '', email: '', password: '', role: 'cashier', modules: ['dashboard', 'sales'] });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Form */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Modifier l'utilisateur
                </CardTitle>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setSelectedUser(null);
                    setFormData({ name: '', username: '', email: '', password: '', role: 'cashier', modules: ['dashboard', 'sales'] });
                  }}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom complet</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nom d'utilisateur</label>
                  <input
                    type="text"
                    value={formData.username}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Rôle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  disabled={selectedUser?.role === 'admin'}
                >
                  <option value="cashier">Caissier</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              
              {formData.role === 'cashier' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Modules autorisés</label>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-2">
                      {availableModules.map(module => (
                        <label key={module.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.modules.includes(module.id)}
                            onChange={() => toggleModule(module.id)}
                            disabled={module.id === 'dashboard' || module.id === 'sales'}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">
                            {module.icon} {module.name}
                            {(module.id === 'dashboard' || module.id === 'sales') && (
                              <span className="text-xs text-gray-500 ml-1">(obligatoire)</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={editUser}
                  style={{ backgroundColor: config.primaryColor }}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Enregistrer
                </Button>
                <Button
                  onClick={() => {
                    setShowEditForm(false);
                    setSelectedUser(null);
                    setFormData({ name: '', username: '', email: '', password: '', role: 'cashier', modules: ['dashboard', 'sales'] });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default POSUserManagement;
