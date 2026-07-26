import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Plus, Edit2, Trash2, UserCheck, UserX, Shield, Users, X, FileText, RefreshCw,
  ChevronDown, ChevronUp, Clock, Lock, Search, Key, AlertTriangle, Check, Save,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const POS_MODULES = [
  { id: 'pos', label: 'Point de vente', icon: '💳', description: 'Interface de caisse principale' },
  { id: 'dashboard', label: 'Tableau de bord', icon: '📊', description: 'Vue d\'ensemble des ventes et statistiques' },
  { id: 'sales', label: 'Ventes', icon: '💰', description: 'Encaissement et gestion des ventes' },
  { id: 'products', label: 'Produits', icon: '📦', description: 'Gestion du catalogue de produits' },
  { id: 'customers', label: 'Clients', icon: '👥', description: 'Gestion de la base clients' },
  { id: 'reports', label: 'Rapports', icon: '📈', description: 'Rapports et analyses de ventes' },
  { id: 'tables', label: 'Tables', icon: '🪑', description: 'Plan de salle et gestion des tables' },
  { id: 'inventory', label: 'Gestion de stock', icon: '🏭', description: 'Suivi des mouvements de stock' },
  { id: 'settings', label: 'Paramètres', icon: '⚙️', description: 'Configuration du système' },
  { id: 'gift_cards', label: 'Cartes cadeaux', icon: '🎁', description: 'Gestion des cartes cadeaux' },
  { id: 'suppliers', label: 'Fournisseurs', icon: '🚚', description: 'Gestion des fournisseurs' },
  { id: 'services', label: 'Services', icon: '💈', description: 'Gestion des services et rendez-vous' },
  { id: 'kitchen', label: 'Cuisine', icon: '🍳', description: 'Gestion des commandes cuisine' },
  { id: 'caisse', label: 'Caisse', icon: '🏪', description: 'Ouverture/fermeture de caisse' },
];

const MODULE_PERMISSION_LABELS = { can_read: 'Lecture', can_create: 'Création', can_update: 'Modification', can_delete: 'Suppression' };

const ROLES = [
  { value: 'admin', label: 'Administrateur', color: 'bg-red-100 text-red-800' },
  { value: 'manager', label: 'Manager', color: 'bg-blue-100 text-blue-800' },
  { value: 'cashier', label: 'Caissier', color: 'bg-green-100 text-green-800' },
];

const AUDIT_ACTION_LABELS = {
  LOGIN_SUCCESS: { label: 'Connexion réussie', color: 'text-green-600', icon: '🔑' },
  LOGIN_FAILED: { label: 'Connexion échouée', color: 'text-red-600', icon: '❌' },
  ACCOUNT_LOCKED: { label: 'Compte verrouillé', color: 'text-red-700', icon: '🔒' },
  LOGOUT: { label: 'Déconnexion', color: 'text-gray-600', icon: '🚪' },
  USER_CREATE: { label: 'Création utilisateur', color: 'text-blue-600', icon: '👤' },
  USER_UPDATE: { label: 'Modification utilisateur', color: 'text-orange-600', icon: '✏️' },
  USER_DELETE: { label: 'Désactivation utilisateur', color: 'text-red-600', icon: '🗑️' },
  PASSWORD_CHANGE: { label: 'Changement mot de passe', color: 'text-yellow-600', icon: '🔑' },
  PASSWORD_RESET: { label: 'Réinitialisation mot de passe', color: 'text-orange-600', icon: '🔑' },
};

const ITEMS_PER_PAGE = 15;

const UserManagementAdvanced = ({ config }) => {
  const [currentUser] = useState(() => { try { return JSON.parse(localStorage.getItem('pos_user') || '{}'); } catch { return {}; } });
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('username');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [auditPage, setAuditPage] = useState(1);

  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ username: '', full_name: '', email: '', phone: '', role: 'cashier', badge_id: '', pin: '', password: '', confirmPassword: '', is_server: false });
  const [formErrors, setFormErrors] = useState([]);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');

  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [permTarget, setPermTarget] = useState(null);
  const [modulePerms, setModulePerms] = useState({});

  const loadUsers = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        window.electronAPI?.getUsers() || Promise.resolve([]),
        window.electronAPI?.getAllUsers?.() || Promise.resolve([]),
      ]);
      const active = results[0].status === 'fulfilled' ? results[0].value : [];
      const all = results[1].status === 'fulfilled' ? results[1].value : [];
      setUsers(all.length ? all : active);
    } catch (e) { console.error('Error loading users:', e); }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const logs = await window.electronAPI?.getAuditLogs?.({ limit: 500 }) || [];
      setAuditLogs(logs);
    } catch (e) { console.error('Error loading audit:', e); }
  }, []);

  useEffect(() => {
    Promise.all([loadUsers(), loadAudit()]).finally(() => setLoading(false));
  }, [loadUsers, loadAudit]);

  const getRoleInfo = (role) => ROLES.find(r => r.value === role) || ROLES[2];

  // ── User form validation ──────────────────────────────────────
  const validateUserForm = () => {
    const errors = [];
    if (!editingUser) {
      if (!userForm.username || userForm.username.trim().length < 2) errors.push("Nom d'utilisateur trop court (min 2 car.)");
      if (userForm.username && /[^a-zA-Z0-9._\-]/.test(userForm.username)) errors.push("Nom d'utilisateur: caractères non autorisés");
      if (!userForm.password || userForm.password.length < 6) errors.push("Mot de passe trop court (min 6 car.)");
      if (userForm.password !== userForm.confirmPassword) errors.push("Les mots de passe ne correspondent pas");
    }
    if (userForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) errors.push("Format d'email invalide");
    return errors;
  };

  const handleSaveUser = async () => {
    const errors = validateUserForm();
    if (errors.length > 0) { setFormErrors(errors); return; }
    setFormErrors([]);
    setSubmitting(true);
    try {
      if (editingUser) {
        const data = {};
        if (userForm.full_name !== undefined) data.full_name = userForm.full_name;
        if (userForm.email !== undefined) data.email = userForm.email || null;
        if (userForm.phone !== undefined) data.phone = userForm.phone || null;
        if (userForm.role !== undefined) data.role = userForm.role;
        if (userForm.badge_id !== undefined) data.badge_id = userForm.badge_id || null;
        if (userForm.is_server !== undefined) data.is_server = userForm.is_server;
        if (userForm.password) data.password = userForm.password;
        await window.electronAPI.updateUser(editingUser.id, data);
      } else {
        await window.electronAPI.addUser({
          username: userForm.username, password: userForm.password, full_name: userForm.full_name || userForm.username,
          email: userForm.email || null, phone: userForm.phone || null, role: userForm.role,
          badge_id: userForm.badge_id || null, is_server: userForm.is_server,
        });
      }
      setShowUserDialog(false);
      setEditingUser(null);
      setUserForm({ username: '', full_name: '', email: '', phone: '', role: 'cashier', badge_id: '', pin: '', password: '', confirmPassword: '', is_server: false });
      await loadUsers();
      await loadAudit();
    } catch (e) {
      setFormErrors([e.message || 'Erreur lors de la sauvegarde']);
    } finally { setSubmitting(false); }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await window.electronAPI.deleteUser(deleteTarget.id);
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      await loadUsers();
      await loadAudit();
    } catch (e) { setFormErrors([e.message]); } finally { setSubmitting(false); }
  };

  const handleToggleStatus = async (user) => {
    setSubmitting(true);
    try {
      await window.electronAPI.updateUser(user.id, { is_active: !user.is_active });
      await loadUsers();
      await loadAudit();
    } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };

  const handleResetPassword = async () => {
    if (!resetPassword || resetPassword.length < 6) { alert('Mot de passe trop court (min 6 car.)'); return; }
    setSubmitting(true);
    try {
      await window.electronAPI.adminResetPassword(resetTarget.id, resetPassword);
      setShowResetDialog(false);
      setResetTarget(null);
      setResetPassword('');
      await loadAudit();
    } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };

  // ── Module permissions ────────────────────────────────────────
  const openPermissions = async (user) => {
    setPermTarget(user);
    const perms = {};
    POS_MODULES.forEach(m => { perms[m.id] = { can_read: true, can_create: false, can_update: false, can_delete: false }; });
    if (user && user.id) {
      try {
        const existing = await window.electronAPI.getUserModules(user.id);
        if (Array.isArray(existing)) {
          existing.forEach(m => {
            if (perms[m.module_name]) {
              perms[m.module_name] = { can_read: !!m.can_read, can_create: !!m.can_create, can_update: !!m.can_update, can_delete: !!m.can_delete };
            }
          });
        }
      } catch {}
    }
    setModulePerms(perms);
    setShowPermissionsDialog(true);
  };

  const savePermissions = async () => {
    if (!permTarget?.id) { setShowPermissionsDialog(false); return; }
    setSubmitting(true);
    try {
      const modules = Object.entries(modulePerms).map(([key, val]) => ({
        module_name: key, ...val,
        can_read: val.can_read ? 1 : 0, can_create: val.can_create ? 1 : 0,
        can_update: val.can_update ? 1 : 0, can_delete: val.can_delete ? 1 : 0,
      }));
      await window.electronAPI.setUserModules(permTarget.id, modules);
      setShowPermissionsDialog(false);
    } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };

  const setAllPerms = (value) => {
    const p = {};
    POS_MODULES.forEach(m => { p[m.id] = { can_read: value, can_create: value, can_update: value, can_delete: value }; });
    setModulePerms(p);
  };

  const setModulePerm = (moduleId, action, value) => {
    setModulePerms(prev => ({ ...prev, [moduleId]: { ...prev[moduleId], [action]: value } }));
  };

  // ── Sorting / Filtering ───────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(u => u.username?.toLowerCase().includes(s) || u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.phone?.includes(s));
    }
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter);
    if (statusFilter !== 'all') list = list.filter(u => (statusFilter === 'active' ? u.is_active : !u.is_active));
    list.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [users, searchTerm, roleFilter, statusFilter, sortField, sortDir]);

  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const pagedUsers = filteredUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const filteredAudit = useMemo(() => {
    let list = [...auditLogs];
    if (auditSearch) {
      const s = auditSearch.toLowerCase();
      list = list.filter(l => l.user_name?.toLowerCase().includes(s) || l.action_type?.toLowerCase().includes(s) || l.notes?.toLowerCase().includes(s));
    }
    if (auditActionFilter !== 'all') list = list.filter(l => l.action_type === auditActionFilter);
    return list;
  }, [auditLogs, auditSearch, auditActionFilter]);

  const auditTotalPages = Math.max(1, Math.ceil(filteredAudit.length / 50));
  const pagedAudit = filteredAudit.slice((auditPage - 1) * 50, auditPage * 50);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
  };

  // ── Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.role === 'admin').length,
    servers: users.filter(u => u.is_server).length,
  }), [users]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-lg">Chargement des utilisateurs...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">Gérez les comptes, permissions et journal d'activité</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadUsers(); loadAudit(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />Actualiser
          </Button>
          {activeTab === 'users' && (
            <Button onClick={() => { setEditingUser(null); setUserForm({ username: '', full_name: '', email: '', phone: '', role: 'cashier', badge_id: '', pin: '', password: '', confirmPassword: '', is_server: false }); setFormErrors([]); setShowUserDialog(true); }}>
              <Plus className="mr-2 h-4 w-4" />Nouvel utilisateur
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />Utilisateurs ({stats.total})</TabsTrigger>
          <TabsTrigger value="audit"><FileText className="mr-2 h-4 w-4" />Journal ({auditLogs.length})</TabsTrigger>
        </TabsList>

        {/* ═══ USERS TAB ═══════════════════════════════════════════ */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actifs</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{stats.active}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <Shield className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{stats.admins}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Serveurs</CardTitle>
                <span className="text-lg">🍽️</span>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-purple-600">{stats.servers}</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Liste des utilisateurs</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Rechercher..." className="pl-10 w-64" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
                  </div>
                  <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Rôle" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les rôles</SelectItem>
                      {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 cursor-pointer hover:text-blue-600" onClick={() => toggleSort('username')}>
                        Utilisateur<SortIcon field="username" />
                      </th>
                      <th className="text-left py-3 px-2 cursor-pointer hover:text-blue-600" onClick={() => toggleSort('full_name')}>
                        Nom complet<SortIcon field="full_name" />
                      </th>
                      <th className="text-left py-3 px-2 cursor-pointer hover:text-blue-600" onClick={() => toggleSort('role')}>
                        Rôle<SortIcon field="role" />
                      </th>
                      <th className="text-left py-3 px-2">Statut</th>
                      <th className="text-left py-3 px-2 cursor-pointer hover:text-blue-600" onClick={() => toggleSort('last_login')}>
                        Dernière connexion<SortIcon field="last_login" />
                      </th>
                      <th className="text-right py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Aucun utilisateur trouvé</td></tr>
                    ) : pagedUsers.map(user => {
                      const roleInfo = getRoleInfo(user.role);
                      return (
                        <tr key={user.id} className={`border-b hover:bg-gray-50 ${!user.is_active ? 'opacity-50' : ''}`}>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                                {(user.full_name || user.username || '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium">@{user.username}</div>
                                {user.email && <div className="text-xs text-muted-foreground">{user.email}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2">{user.full_name || '—'}</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1">
                              <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
                              {user.is_server && <Badge className="bg-purple-100 text-purple-800 text-[10px]">Serveur</Badge>}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={user.is_active ? 'default' : 'destructive'}>
                              {user.is_active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-xs text-muted-foreground">
                            {user.last_login ? new Date(user.last_login).toLocaleString('fr-FR') : 'Jamais'}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openPermissions(user)} title="Permissions">
                                <Lock className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setResetTarget(user); setResetPassword(''); setShowResetDialog(true); }} title="Réinitialiser MDP">
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingUser(user);
                                setUserForm({ username: user.username, full_name: user.full_name || '', email: user.email || '', phone: user.phone || '', role: user.role, badge_id: user.badge_id || '', pin: '', password: '', confirmPassword: '', is_server: !!user.is_server });
                                setFormErrors([]);
                                setShowUserDialog(true);
                              }} title="Modifier">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(user)} title={user.is_active ? 'Désactiver' : 'Activer'}>
                                {user.is_active ? <UserX className="h-4 w-4 text-orange-500" /> : <UserCheck className="h-4 w-4 text-green-500" />}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(user); setFormErrors([]); setShowDeleteDialog(true); }} title="Supprimer" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {userTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="text-sm text-muted-foreground">{filteredUsers.length} résultat(s)</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm">Page {page} / {userTotalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(userTotalPages, p + 1))} disabled={page === userTotalPages}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ AUDIT TAB ═══════════════════════════════════════════ */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Journal d'activité</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Filtrer..." className="pl-10 w-64" value={auditSearch} onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }} />
                  </div>
                  <Select value={auditActionFilter} onValueChange={(v) => { setAuditActionFilter(v); setAuditPage(1); }}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Type d'action" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les actions</SelectItem>
                      {Object.entries(AUDIT_ACTION_LABELS).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CardDescription>{filteredAudit.length} entrée(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-1">
                  {pagedAudit.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune entrée</p>}
                  {pagedAudit.map(log => {
                    const info = AUDIT_ACTION_LABELS[log.action_type] || { label: log.action_type, color: 'text-gray-600', icon: '📋' };
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <div key={log.id} className="border rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                        <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none" onClick={() => setExpandedLogId(isExpanded ? null : log.id)}>
                          <span className="text-lg">{info.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{log.user_name || '—'}</span>
                              <span className={`text-sm ${info.color}`}>{info.label}</span>
                            </div>
                            {log.notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{log.notes}</p>}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : '—'}
                          </span>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-3 border-t bg-gray-50/50 text-sm space-y-2 pt-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div><span className="text-muted-foreground text-xs">Utilisateur</span><p className="font-medium">{log.user_name} (ID: {log.user_id})</p></div>
                              <div><span className="text-muted-foreground text-xs">Type</span><p className="font-medium">{log.action_type}</p></div>
                              <div><span className="text-muted-foreground text-xs">Entité</span><p className="font-medium">{log.entity_type || '—'} {log.entity_id ? `#${log.entity_id}` : ''}</p></div>
                              <div><span className="text-muted-foreground text-xs">Date</span><p className="font-medium">{log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : '—'}</p></div>
                            </div>
                            {log.old_value && <div><span className="text-muted-foreground text-xs">Valeur précédente</span><pre className="mt-1 bg-red-50 border border-red-100 rounded p-2 text-xs overflow-x-auto max-h-32">{typeof log.old_value === 'string' ? log.old_value : JSON.stringify(JSON.parse(log.old_value || '{}'), null, 2)}</pre></div>}
                            {log.new_value && <div><span className="text-muted-foreground text-xs">Nouvelle valeur</span><pre className="mt-1 bg-green-50 border border-green-100 rounded p-2 text-xs overflow-x-auto max-h-32">{typeof log.new_value === 'string' ? log.new_value : JSON.stringify(JSON.parse(log.new_value || '{}'), null, 2)}</pre></div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              {auditTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="text-sm text-muted-foreground">{filteredAudit.length} résultat(s)</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm">Page {auditPage} / {auditTotalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))} disabled={auditPage === auditTotalPages}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ USER CREATE/EDIT DIALOG ═════════════════════════════ */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {formErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                {formErrors.map((err, i) => <p key={i} className="text-sm text-red-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3 shrink-0" />{err}</p>)}
              </div>
            )}
            {!editingUser && (
              <div className="space-y-2">
                <Label>Nom d'utilisateur *</Label>
                <Input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} placeholder="jean.dupont" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} placeholder="Jean Dupont" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rôle *</Label>
                <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Badge ID</Label>
                <Input value={userForm.badge_id} onChange={(e) => setUserForm({ ...userForm, badge_id: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3 py-1">
              <Switch checked={!!userForm.is_server} onCheckedChange={(v) => setUserForm({ ...userForm, is_server: v })} />
              <div><Label>C'est un serveur</Label><p className="text-xs text-muted-foreground">Peut être assigné aux tables et zones</p></div>
            </div>
            {editingUser && (
              <div className="space-y-2">
                <Label>Nouveau mot de passe (laisser vide pour conserver)</Label>
                <Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              </div>
            )}
            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label>Mot de passe *</Label>
                  <Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Confirmer le mot de passe *</Label>
                  <Input type="password" value={userForm.confirmPassword || ''} onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })} />
                </div>
              </>
            )}
            {editingUser && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => openPermissions(editingUser)}>
                <Lock className="mr-2 h-4 w-4" />Gérer les permissions modules
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Annuler</Button>
            <Button onClick={handleSaveUser} disabled={submitting}>
              {submitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingUser ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CONFIRMATION ═════════════════════════════════ */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="mr-2 h-5 w-5" />Désactiver l'utilisateur
            </DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment désactiver <strong>{deleteTarget?.full_name || deleteTarget?.username}</strong> ?
              L'utilisateur ne pourra plus se connecter.
            </DialogDescription>
          </DialogHeader>
          {formErrors.length > 0 && (
            <div className="p-2 bg-red-50 rounded text-sm text-red-600">{formErrors.join(', ')}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={submitting}>
              {submitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
              Désactiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ RESET PASSWORD ══════════════════════════════════════ */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>Pour: {resetTarget?.full_name || resetTarget?.username}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Min 6 caractères" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Annuler</Button>
            <Button onClick={handleResetPassword} disabled={submitting}>
              {submitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
              Réinitialiser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ MODULE PERMISSIONS ══════════════════════════════════ */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />Permissions modules
            </DialogTitle>
            <DialogDescription>
              Permissions de {permTarget?.username || 'l\'utilisateur'} — Lecture, Création, Modification, Suppression par module
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-2">
              {POS_MODULES.map(mod => (
                <div key={mod.id} className="border rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg">{mod.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{mod.label}</div>
                      <div className="text-xs text-muted-foreground">{mod.description}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 ml-9">
                    {Object.entries(MODULE_PERMISSION_LABELS).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={modulePerms[mod.id]?.[key] || false}
                          onChange={(e) => setModulePerm(mod.id, key, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between pt-3 border-t mt-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setAllPerms(true)}>Tout activer</Button>
              <Button variant="outline" size="sm" onClick={() => setAllPerms(false)}>Tout désactiver</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>Annuler</Button>
              <Button onClick={savePermissions} disabled={submitting}>
                {submitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementAdvanced;
