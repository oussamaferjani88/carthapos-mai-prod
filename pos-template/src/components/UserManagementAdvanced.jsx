import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Edit2, Trash2, UserCheck, UserX, Shield, Users, Key } from 'lucide-react';
import { isPreviewMode, getPreviewData, logEnvironment } from '../utils/environment';

const UserManagementAdvanced = ({ config }) => {
  const DEMO_USERS = [
    {
      id: 1,
      username: 'admin',
      email: 'admin@pos.com',
      phone: '',
      role: 'admin',
      status: 'active',
      lastLogin: '2024-08-13 10:30:00',
      permissions: ['all']
    },
    {
      id: 2,
      username: 'cashier1',
      email: 'cashier1@pos.com',
      phone: '',
      role: 'cashier',
      status: 'active',
      lastLogin: '2024-08-13 09:15:00',
      permissions: ['sales', 'customers']
    }
  ];

  const [users, setUsers] = useState(() => getPreviewData(DEMO_USERS));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    logEnvironment();
    if (!isPreviewMode()) {
      loadUsersFromDB();
    }
  }, []);

  const loadUsersFromDB = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        console.log('📡 Fetching users from database via IPC get-users...');
        const data = await window.electronAPI.getUsers();
        console.log('✅ Loaded users from database:', data?.length || 0, 'users');
        console.log('📊 Raw user data:', JSON.stringify(data));
        if (data && data.length > 0) {
          const mapped = data.map(u => ({
            id: u.id,
            username: u.username || u.full_name || 'unknown',
            email: u.email || '',
            phone: u.phone || '',
            role: u.role || 'cashier',
            status: u.is_active ? 'active' : 'inactive',
            lastLogin: u.last_login || 'Jamais connecté',
            permissions: u.role === 'admin' ? ['all'] : []
          }));
          console.log('✅ Mapped users for display:', JSON.stringify(mapped));
          setUsers(mapped);
        } else {
          console.warn('⚠️ No users returned from database');
          setUsers([]);
        }
      } else {
        console.warn('⚠️ window.electronAPI not available');
      }
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      console.error('❌ Error details:', error.message, error.stack);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'cashier',
    permissions: []
  });

  const roles = [
    { value: 'admin', label: 'Administrateur', color: 'bg-red-100 text-red-800' },
    { value: 'manager', label: 'Manager', color: 'bg-blue-100 text-blue-800' },
    { value: 'cashier', label: 'Caissier', color: 'bg-green-100 text-green-800' },
    { value: 'viewer', label: 'Visualiseur', color: 'bg-gray-100 text-gray-800' }
  ];

  const permissions = [
    { id: 'sales', label: 'Ventes' },
    { id: 'products', label: 'Produits' },
    { id: 'inventory', label: 'Inventaire' },
    { id: 'customers', label: 'Clients' },
    { id: 'reports', label: 'Rapports' },
    { id: 'settings', label: 'Paramètres' },
    { id: 'users', label: 'Gestion utilisateurs' }
  ];

  const handleAddUser = async () => {
    console.log('📝 handleAddUser called with data:', JSON.stringify(newUser));

    if (!newUser.username || !newUser.password) {
      console.warn('⚠️ Missing required fields');
      alert('Veuillez remplir le nom d\'utilisateur et le mot de passe');
      return;
    }

    if (!isPreviewMode() && window.electronAPI) {
      setSubmitting(true);
      try {
        console.log('📡 Calling electronAPI.addUser with:', JSON.stringify({
          username: newUser.username,
          email: newUser.email || null,
          phone: newUser.phone || null,
          password: newUser.password,
          role: newUser.role,
          full_name: newUser.username
        }));
        const result = await window.electronAPI.addUser({
          username: newUser.username,
          email: newUser.email || null,
          phone: newUser.phone || null,
          password: newUser.password,
          role: newUser.role,
          full_name: newUser.username
        });
        console.log('✅ User created via IPC, result:', JSON.stringify(result));
        setNewUser({ username: '', email: '', phone: '', password: '', role: 'cashier', permissions: [] });
        setShowAddUser(false);
        await loadUsersFromDB();
      } catch (error) {
        console.error('❌ Failed to create user via IPC:', error);
        console.error('❌ Error details:', error.message, error.stack);
        alert('Erreur lors de la création: ' + (error.message || 'Erreur inconnue'));
      } finally {
        setSubmitting(false);
      }
    } else {
      console.warn('⚠️ Preview mode or no electronAPI — adding user to local state only (will NOT persist!)');
      const user = {
        id: users.length + 1,
        ...newUser,
        status: 'active',
        lastLogin: 'Jamais connecté'
      };
      setUsers([...users, user]);
      setNewUser({ username: '', email: '', phone: '', password: '', role: 'cashier', permissions: [] });
      setShowAddUser(false);
    }
  };

  const handleEditUser = (user) => {
    console.log('📝 handleEditUser called for:', JSON.stringify(user));
    setSelectedUser(user);
    setShowEditUser(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    console.log('📝 handleSaveEdit called for user:', JSON.stringify(selectedUser));

    if (!isPreviewMode() && window.electronAPI) {
      setSubmitting(true);
      try {
        console.log('📡 Calling electronAPI.updateUser for id:', selectedUser.id);
        const result = await window.electronAPI.updateUser(selectedUser.id, {
          username: selectedUser.username,
          email: selectedUser.email || null,
          phone: selectedUser.phone || null,
          role: selectedUser.role,
          status: selectedUser.status
        });
        console.log('✅ User updated via IPC, result:', JSON.stringify(result));
        setShowEditUser(false);
        setSelectedUser(null);
        await loadUsersFromDB();
      } catch (error) {
        console.error('❌ Failed to update user via IPC:', error);
        console.error('❌ Error details:', error.message, error.stack);
        alert('Erreur lors de la mise à jour: ' + (error.message || 'Erreur inconnue'));
      } finally {
        setSubmitting(false);
      }
    } else {
      console.warn('⚠️ Preview mode — updating local state only');
      setUsers(users.map(u => u.id === selectedUser.id ? selectedUser : u));
      setShowEditUser(false);
      setSelectedUser(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    console.log('📝 handleDeleteUser called for id:', userId);
    const user = users.find(u => u.id === userId);

    if (!isPreviewMode() && window.electronAPI) {
      setSubmitting(true);
      try {
        console.log('📡 Calling electronAPI.deleteUser for id:', userId);
        const result = await window.electronAPI.deleteUser(userId);
        console.log('✅ User deleted via IPC, result:', JSON.stringify(result));
        await loadUsersFromDB();
      } catch (error) {
        console.error('❌ Failed to delete user via IPC:', error);
        console.error('❌ Error details:', error.message, error.stack);
        alert('Erreur lors de la suppression: ' + (error.message || 'Erreur inconnue'));
      } finally {
        setSubmitting(false);
      }
    } else {
      console.warn('⚠️ Preview mode — deleting from local state only');
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const toggleUserStatus = async (userId) => {
    console.log('📝 toggleUserStatus called for id:', userId);
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    console.log('🔄 Toggling status from', user.status, 'to', newStatus);

    if (!isPreviewMode() && window.electronAPI) {
      setSubmitting(true);
      try {
        console.log('📡 Calling electronAPI.updateUser to toggle status for id:', userId);
        const result = await window.electronAPI.updateUser(userId, {
          username: user.username,
          email: user.email || null,
          phone: user.phone || null,
          role: user.role,
          status: newStatus
        });
        console.log('✅ Status toggled via IPC, result:', JSON.stringify(result));
        await loadUsersFromDB();
      } catch (error) {
        console.error('❌ Failed to toggle status via IPC:', error);
        console.error('❌ Error details:', error.message, error.stack);
        alert('Erreur lors du changement de statut: ' + (error.message || 'Erreur inconnue'));
      } finally {
        setSubmitting(false);
      }
    } else {
      console.warn('⚠️ Preview mode — toggling local state only');
      setUsers(users.map(u =>
        u.id === userId ? { ...u, status: newStatus } : u
      ));
    }
  };

  const getRoleColor = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj ? roleObj.color : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">
            Gérez les comptes utilisateurs et leurs permissions
          </p>
        </div>
        <Button onClick={() => setShowAddUser(true)} disabled={submitting} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouvel utilisateur
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrateurs</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En ligne</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">2</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>
            Gérez les comptes utilisateurs de votre système POS
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des utilisateurs...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email || user.phone ? (user.email ? user.email : user.phone) : '—'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.role)}>
                          {roles.find(r => r.value === user.role)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status === 'active' ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.lastLogin}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            disabled={submitting}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserStatus(user.id)}
                            disabled={submitting}
                          >
                            {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </Button>
                          {user.role !== 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={submitting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
            <DialogDescription>
              Créez un nouveau compte utilisateur pour votre système POS
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nom d'utilisateur <span className="text-red-500">*</span></Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  placeholder="nom.utilisateur"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe <span className="text-red-500">*</span></Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleAddUser} disabled={submitting}>
              {submitting ? 'Création...' : "Créer l'utilisateur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'utilisateur
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom d'utilisateur</Label>
                  <Input
                    value={selectedUser.username}
                    onChange={(e) => setSelectedUser({...selectedUser, username: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={selectedUser.email || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={selectedUser.role} onValueChange={(value) => setSelectedUser({...selectedUser, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUser(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={submitting}>
              {submitting ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementAdvanced;
