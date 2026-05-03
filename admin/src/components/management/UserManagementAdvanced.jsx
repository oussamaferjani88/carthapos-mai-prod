import React, { useState } from 'react';
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
  Shield
} from 'lucide-react';
import PermissionManager, { PERMISSION_GROUPS } from '../../utils/permissions';

const UserManagementAdvanced = ({ config = {} }) => {
  const [users, setUsers] = useState([
    {
      id: 1,
      username: 'admin',
      fullName: 'Administrateur Principal',
      role: 'admin',
      permissions: ['all'],
      isActive: true,
      createdAt: '2024-01-15',
      lastLogin: '2024-08-07 14:30'
    },
    {
      id: 2,
      username: 'subadmin1',
      fullName: 'Sous Admin 1',
      role: 'subadmin',
      permissions: [],
      isActive: true,
      createdAt: '2024-02-01',
      lastLogin: '2024-08-07 12:15'
    }
  ]);

  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [newUser, setNewUser] = useState({
    username: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    role: 'subadmin',
    customPermissions: []
  });

  const handleAddUser = () => {
    if (newUser.password !== newUser.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    const permissions = newUser.role === 'admin' ? ['all'] : [];
    const user = {
      id: users.length + 1,
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role,
      permissions,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: null
    };
    setUsers([...users, user]);
    setNewUser({
      username: '',
      fullName: '',
      password: '',
      confirmPassword: '',
      role: 'subadmin',
      customPermissions: []
    });
    setShowAddUser(false);
  };

  const handleEditUser = (user) => {
    setEditingUser({
      ...user,
      originalPermissions: [...user.permissions]
    });
  };

  const handleSaveEdit = () => {
    setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
    setEditingUser(null);
  };

  const toggleUserStatus = (userId) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, isActive: !u.isActive } : u
    ));
  };

  const deleteUser = (userId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrateur',
          color: 'bg-red-100',
          textColor: 'text-red-800',
          description: 'Accès complet au système'
        };
      case 'cashier':
        return {
          label: 'Caissier',
          color: 'bg-blue-100',
          textColor: 'text-blue-800',
          description: 'Accès aux fonctions de vente'
        };
      default:
        return {
          label: 'Utilisateur',
          color: 'bg-gray-100',
          textColor: 'text-gray-800',
          description: 'Utilisateur standard'
        };
    }
  };

  const getPermissionGroupLabel = (groupKey) => {
    const group = PERMISSION_GROUPS[groupKey];
    return group ? group.label : groupKey;
  };

  const activeUsers = users.filter(u => u.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
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
          style={{ backgroundColor: config.primaryColor }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Nouvel Utilisateur
        </Button>
      </div>

      {/* Statistics */}
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
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users Table */}
        <Card style={{ backgroundColor: config.cardBackgroundColor, borderColor: config.cardBorderColor }}>
          <CardHeader>
            <CardTitle>Liste des Utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {users.map((user) => {
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
                              {user.fullName}
                            </p>
                            <p className="text-sm" style={{ color: config.textMutedColor }}>
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${roleInfo.color} ${roleInfo.textColor}`}>
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
              })}
            </div>
          </CardContent>
        </Card>

        {/* User Details */}
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
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleUserStatus(selectedUser.id)}
                  >
                    {selectedUser.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  {selectedUser.role !== 'admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteUser(selectedUser.id)}
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
                      <h3 className="font-bold text-lg">{selectedUser.fullName}</h3>
                      <p className="text-gray-600">@{selectedUser.username}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {(() => {
                          const roleInfo = getRoleInfo(selectedUser.role);
                          return (
                            <Badge className={`${roleInfo.color} ${roleInfo.textColor}`}>
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
                      <span>{selectedUser.createdAt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dernière connexion:</span>
                      <span>{selectedUser.lastLogin || 'Jamais'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Permissions</h4>
                  {selectedUser.permissions.includes('all') ? (
                    <Badge className="bg-red-100 text-red-800">
                      Accès complet (Administrateur)
                    </Badge>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(PERMISSION_GROUPS).map(groupKey => {
                        const group = PERMISSION_GROUPS[groupKey];
                        const hasGroupPermissions = group.permissions.some(p => 
                          selectedUser.permissions.includes(p)
                        );
                        
                        if (hasGroupPermissions) {
                          return (
                            <Badge key={groupKey} className="bg-blue-100 text-blue-800">
                              {group.label}
                            </Badge>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
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

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Nouvel Utilisateur</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowAddUser(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom complet</label>
                  <input
                    type="text"
                    value={newUser.fullName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full p-2 border rounded"
                    placeholder="Jean Dupont"
                  />
                </div>
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
                    <option value="subadmin">Sous-admin</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              </div>

              {newUser.role === 'cashier' && (
                <div>
                  <label className="block text-sm font-medium mb-3">Privilèges accordés</label>
                  <div className="space-y-3">
                    {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => (
                      <div key={groupKey} className="flex items-start space-x-3 p-3 border rounded">
                        <input
                          type="checkbox"
                          id={groupKey}
                          checked={newUser.selectedPermissionGroups.includes(groupKey)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewUser(prev => ({
                                ...prev,
                                selectedPermissionGroups: [...prev.selectedPermissionGroups, groupKey]
                              }));
                            } else {
                              setNewUser(prev => ({
                                ...prev,
                                selectedPermissionGroups: prev.selectedPermissionGroups.filter(g => g !== groupKey)
                              }));
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <label htmlFor={groupKey} className="font-medium cursor-pointer">
                            {group.label}
                          </label>
                          <p className="text-sm text-gray-600">{group.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleAddUser}
                  style={{ backgroundColor: config.primaryColor }}
                  disabled={!newUser.username || !newUser.fullName || !newUser.password || newUser.password !== newUser.confirmPassword}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Créer l'utilisateur
                </Button>
                <Button variant="outline" onClick={() => setShowAddUser(false)}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Modifier {editingUser.fullName}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setEditingUser(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom complet</label>
                <input
                  type="text"
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full p-2 border rounded"
                />
              </div>

              {editingUser.role === 'cashier' && (
                <div>
                  <label className="block text-sm font-medium mb-3">Privilèges accordés</label>
                  <div className="space-y-2">
                    {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
                      const hasGroupPermissions = group.permissions.some(p => 
                        editingUser.permissions.includes(p)
                      );
                      
                      return (
                        <div key={groupKey} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`edit-${groupKey}`}
                            checked={hasGroupPermissions}
                            onChange={(e) => {
                              let newPermissions = [...editingUser.permissions];
                              
                              if (e.target.checked) {
                                // Ajouter toutes les permissions du groupe
                                group.permissions.forEach(p => {
                                  if (!newPermissions.includes(p)) {
                                    newPermissions.push(p);
                                  }
                                });
                              } else {
                                // Retirer toutes les permissions du groupe
                                newPermissions = newPermissions.filter(p => 
                                  !group.permissions.includes(p)
                                );
                              }
                              
                              setEditingUser(prev => ({
                                ...prev,
                                permissions: newPermissions
                              }));
                            }}
                          />
                          <label htmlFor={`edit-${groupKey}`} className="cursor-pointer">
                            {group.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveEdit} style={{ backgroundColor: config.primaryColor }}>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </Button>
                <Button variant="outline" onClick={() => setEditingUser(null)}>
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
