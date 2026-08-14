import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  ShieldCheck,
  Key,
  UserCheck,
  Lock,
  Users,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  Save,
  X
} from 'lucide-react';

export default function SecuritySettings() {
  const [currentUser] = useState({
    username: 'admin',
    role: 'administrator',
    lastLogin: '2024-01-15 14:30'
  });

  const [users, setUsers] = useState([
    {
      id: 1,
      username: 'admin',
      role: 'administrator',
      email: 'admin@example.com',
      active: true,
      lastLogin: '2024-01-15 14:30'
    },
    {
      id: 2,
      username: 'cashier1',
      role: 'cashier',
      email: 'cashier1@example.com',
      active: true,
      lastLogin: '2024-01-15 13:45'
    },
    {
      id: 3,
      username: 'manager',
      role: 'manager',
      email: 'manager@example.com',
      active: true,
      lastLogin: '2024-01-15 12:20'
    }
  ]);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [, setEditingUser] = useState(null);

  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    passwordMinLength: 8,
    requireSpecialChars: true,
    twoFactorAuth: false,
    loginAttempts: 3,
    lockoutDuration: 15
  });

  const [auditLog] = useState([
    {
      id: 1,
      timestamp: '2024-01-15 14:30:00',
      user: 'admin',
      action: 'LOGIN',
      details: 'Connexion réussie'
    },
    {
      id: 2,
      timestamp: '2024-01-15 14:25:00',
      user: 'cashier1',
      action: 'SALE',
      details: 'Vente n°1234 - 45.50€'
    },
    {
      id: 3,
      timestamp: '2024-01-15 14:20:00',
      user: 'manager',
      action: 'PRODUCT_UPDATE',
      details: 'Modification produit ID:567'
    }
  ]);

  const roles = [
    { value: 'administrator', label: 'Administrateur', color: 'bg-red-100 text-red-800' },
    { value: 'manager', label: 'Manager', color: 'bg-blue-100 text-blue-800' },
    { value: 'cashier', label: 'Caissier', color: 'bg-green-100 text-green-800' },
    { value: 'readonly', label: 'Lecture seule', color: 'bg-gray-100 text-gray-800' }
  ];

  const getRoleColor = (role) => {
    const roleConfig = roles.find(r => r.value === role);
    return roleConfig ? roleConfig.color : 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role) => {
    const roleConfig = roles.find(r => r.value === role);
    return roleConfig ? roleConfig.label : role;
  };

  const handlePasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordForm.newPassword.length < securitySettings.passwordMinLength) {
      alert(`Le mot de passe doit contenir au moins ${securitySettings.passwordMinLength} caractères`);
      return;
    }

    // Simuler le changement de mot de passe
    alert('Mot de passe modifié avec succès');
    setShowPasswordForm(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleUserToggle = (userId) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, active: !u.active } : u
    ));
  };

  const handleUserDelete = (userId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleSecuritySettingChange = (setting, value) => {
    setSecuritySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sécurité & Utilisateurs</h1>
        <p className="text-muted-foreground">
          Gestion des utilisateurs, mots de passe et paramètres de sécurité
        </p>
      </div>

      {/* Utilisateur actuel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="mr-2 h-5 w-5" />
            Utilisateur Actuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{currentUser.username}</p>
              <p className="text-sm text-muted-foreground">
                Rôle: <Badge className={getRoleColor(currentUser.role)}>{getRoleLabel(currentUser.role)}</Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                Dernière connexion: {currentUser.lastLogin}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              <Key className="mr-2 h-4 w-4" />
              Changer le mot de passe
            </Button>
          </div>

          {showPasswordForm && (
            <div className="mt-4 p-4 border rounded-lg space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Mot de passe actuel</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handlePasswordChange}>
                  <Save className="mr-2 h-4 w-4" />
                  Sauvegarder
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordForm(false)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gestion des utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Gestion des Utilisateurs
            </div>
            <Button onClick={() => setEditingUser({})}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel utilisateur
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{user.username}</span>
                    <Badge className={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                    {!user.active && <Badge variant="destructive">Inactif</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Dernière connexion: {user.lastLogin}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUserToggle(user.id)}
                  >
                    {user.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingUser(user)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleUserDelete(user.id)}
                    disabled={user.id === 1} // Protéger l'admin principal
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Paramètres de sécurité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShieldCheck className="mr-2 h-5 w-5" />
            Paramètres de Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Expiration de session (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                value={securitySettings.sessionTimeout}
                onChange={(e) => handleSecuritySettingChange('sessionTimeout', parseInt(e.target.value))}
                min="5"
                max="480"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-min-length">Longueur minimale du mot de passe</Label>
              <Input
                id="password-min-length"
                type="number"
                value={securitySettings.passwordMinLength}
                onChange={(e) => handleSecuritySettingChange('passwordMinLength', parseInt(e.target.value))}
                min="4"
                max="20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-attempts">Tentatives de connexion max</Label>
              <Input
                id="login-attempts"
                type="number"
                value={securitySettings.loginAttempts}
                onChange={(e) => handleSecuritySettingChange('loginAttempts', parseInt(e.target.value))}
                min="1"
                max="10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lockout-duration">Durée de verrouillage (minutes)</Label>
              <Input
                id="lockout-duration"
                type="number"
                value={securitySettings.lockoutDuration}
                onChange={(e) => handleSecuritySettingChange('lockoutDuration', parseInt(e.target.value))}
                min="1"
                max="60"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journal d'audit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="mr-2 h-5 w-5" />
            Journal d'Audit
          </CardTitle>
          <CardDescription>
            Historique des actions effectuées dans le système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditLog.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <span className="font-medium">{entry.user}</span> - 
                  <span className="ml-1">{entry.action}</span>
                  <p className="text-sm text-muted-foreground">{entry.details}</p>
                </div>
                <span className="text-sm text-muted-foreground">{entry.timestamp}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
