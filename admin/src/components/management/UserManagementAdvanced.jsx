import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  CheckCircle,
  AlertCircle,
  User,
  Shield,
  Loader2
} from 'lucide-react';
import { usersApi } from '../../lib/api';

const ROLE_LABELS = {
  ADMIN: 'Administrateur',
  MANAGER: 'Manager',
  CASHIER: 'Caissier',
  KITCHEN: 'Cuisine'
};

const ROLE_COLORS = {
  ADMIN: 'bg-red-100 text-red-800',
  MANAGER: 'bg-purple-100 text-purple-800',
  CASHIER: 'bg-blue-100 text-blue-800',
  KITCHEN: 'bg-green-100 text-green-800'
};

const ROLE_DESCRIPTIONS = {
  ADMIN: 'Accès complet au système',
  MANAGER: 'Gestion avancée sans administration',
  CASHIER: 'Accès aux fonctions de vente',
  KITCHEN: 'Interface cuisine uniquement'
};

const UserManagementAdvanced = ({ config = {} }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    role: 'CASHIER',
    customPermissions: []
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await usersApi.getAll();
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Impossible de charger les utilisateurs');
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUser = async () => {
    if (newUser.password !== newUser.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (!newUser.email || !newUser.email.includes('@')) {
      toast.error('Email invalide');
      return;
    }

    setSubmitting(true);
    try {
      await usersApi.create({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role
      });
      toast.success('Utilisateur créé avec succès');
      setShowAddUser(false);
      setNewUser({
        username: '',
        email: '',
        fullName: '',
        password: '',
        confirmPassword: '',
        role: 'CASHIER',
        customPermissions: []
      });
      await fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erreur lors de la création';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      await usersApi.update(editingUser.id, {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        isActive: editingUser.isActive
      });
      toast.success('Utilisateur mis à jour');
      setEditingUser(null);
      await fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erreur de mise à jour';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setSubmitting(true);
    try {
      await usersApi.update(userId, { isActive: !user.isActive });
      toast.success(`Utilisateur ${user.isActive ? 'désactivé' : 'activé'}`);
      await fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erreur';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${user?.username || 'cet utilisateur'} ?`)) return;
    setSubmitting(true);
    try {
      await usersApi.delete(userId);
      toast.success('Utilisateur supprimé');
      if (selectedUser?.id === userId) setSelectedUser(null);
      await fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erreur de suppression';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleInfo = (role) => ({
    label: ROLE_LABELS[role] || 'Utilisateur',
    color: ROLE_COLORS[role] || 'bg-gray-100 text-gray-800',
    description: ROLE_DESCRIPTIONS[role] || 'Utilisateur standard'
  });

  const activeUsers = users.filter(u => u.isActive);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: config.primaryColor }} />
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg font-medium">{error}</p>
        <Button onClick={fetchUsers} variant="outline">Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: config.textColor }}>
            Gestion des Utilisateurs
          </h1>
          <p className="text-muted-foreground" style={{ color: config.textMutedColor }}>
            Créez et gérez les comptes utilisateurs avec privilèges personnalisés
          </p>
        </div>
        <Button
          onClick={() => setShowAddUser(true)}
          disabled={submitting}
          style={{ backgroundColor: config.primaryColor }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Nouvel Utilisateur
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={{ backgroundColor: config.cardBackgroundColor, borderColor: config.cardBorderColor }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Total</p>
                <p className="text-2xl font-bold" style={{ color: config.textColor }}>{users.length}</p>
              </div>
              <User className="h-8 w-8" style={{ color: config.primaryColor }} />
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: config.cardBackgroundColor, borderColor: config.cardBorderColor }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Actifs</p>
                <p className="text-2xl font-bold" style={{ color: config.textColor }}>{activeUsers.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: config.cardBackgroundColor, borderColor: config.cardBorderColor }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: config.textMutedColor }}>Administrateurs</p>
                <p className="text-2xl font-bold" style={{ color: config.textColor }}>
                  {users.filter(u => u.role === 'ADMIN').length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card style={{ backgroundColor: config.cardBackgroundColor, borderColor: config.cardBorderColor }}>
          <CardHeader>
            <CardTitle>Liste des Utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground" style={{ color: config.textMutedColor }}>
                  Aucun utilisateur trouvé
                </p>
              ) : (
                users.map((user) => {
                  const roleInfo = getRoleInfo(user.role);
                  return (
                    <div
                      key={user.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedUser?.id === user.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedUser(user)}
                      style={{ borderColor: selectedUser?.id === user.id ? config.primaryColor : config.cardBorderColor }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium" style={{ color: config.textColor }}>
                                {user.username}
                              </p>
                              <p className="text-sm" style={{ color: config.textMutedColor }}>
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={roleInfo.color}>
                            {roleInfo.label}
                          </Badge>
                          {user.isActive ? (
                            <Badge className="bg-green-100 text-green-800">Actif</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Inactif</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: config.cardBackgroundColor, borderColor: config.cardBorderColor }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Détails Utilisateur</CardTitle>
              {selectedUser && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditUser(selectedUser)}
                    disabled={submitting}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleUserStatus(selectedUser.id)}
                    disabled={submitting}
                  >
                    {selectedUser.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  {selectedUser.role !== 'ADMIN' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteUser(selectedUser.id)}
                      disabled={submitting}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{selectedUser.username}</h3>
                      <p className="text-gray-600">{selectedUser.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {(() => {
                          const roleInfo = getRoleInfo(selectedUser.role);
                          return (
                            <Badge className={roleInfo.color}>
                              {roleInfo.label}
                            </Badge>
                          );
                        })()}
                        <Badge className={selectedUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {selectedUser.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Informations</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Compte créé:</span>
                      <span>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dernière connexion:</span>
                      <span>{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Jamais'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Rôle</h4>
                  <Badge className={getRoleInfo(selectedUser.role).color}>
                    {getRoleInfo(selectedUser.role).label}
                  </Badge>
                  <p className="text-sm text-gray-500 mt-1">{getRoleInfo(selectedUser.role).description}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: config.textMutedColor }}>
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Sélectionnez un utilisateur</p>
                <p className="text-sm">Cliquez sur un utilisateur pour voir ses détails</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Nouvel Utilisateur</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowAddUser(false)} disabled={submitting}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom d'utilisateur</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full p-2 border rounded"
                    placeholder="jean.dupont"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-2 border rounded"
                    placeholder="jean@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mot de passe</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full p-2 border rounded"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confirmer mot de passe</label>
                  <input
                    type="password"
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full p-2 border rounded"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rôle</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full p-2 border rounded"
                  >
                    <option value="CASHIER">Caissier</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleAddUser}
                  disabled={submitting || !newUser.username || !newUser.email || !newUser.password || newUser.password !== newUser.confirmPassword}
                  style={{ backgroundColor: config.primaryColor }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  {submitting ? 'Création...' : "Créer l'utilisateur"}
                </Button>
                <Button variant="outline" onClick={() => setShowAddUser(false)} disabled={submitting}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Modifier {editingUser.username}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setEditingUser(null)} disabled={submitting}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom d'utilisateur</label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rôle</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="CASHIER">Caissier</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                <select
                  value={editingUser.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveEdit} disabled={submitting} style={{ backgroundColor: config.primaryColor }}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {submitting ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
                <Button variant="outline" onClick={() => setEditingUser(null)} disabled={submitting}>
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

export default UserManagementAdvanced;
