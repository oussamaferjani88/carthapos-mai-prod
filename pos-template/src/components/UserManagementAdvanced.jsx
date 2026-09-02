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
import { useAppConfig } from '../hooks/useAppConfig';
import { canonicalModule, roleModuleDefaults } from '../lib/permissions';
import { usePermissions } from '../contexts/PermissionsContext';
import {
  Plus, Edit2, Trash2, UserCheck, UserX, Shield, Users, X, FileText, RefreshCw,
  ChevronDown, ChevronUp, Clock, Lock, Search, Key, AlertTriangle, Check, Save,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const BASE_MODULES = [
  { id: 'sales', label: 'Point de vente', icon: '💳', description: 'Caisse, encaissement et gestion des ventes' },
  { id: 'dashboard', label: 'Tableau de bord', icon: '📊', description: 'Vue d\'ensemble des ventes et statistiques' },
  { id: 'products', label: 'Produits', icon: '📦', description: 'Gestion du catalogue de produits' },
  { id: 'customers', label: 'Clients', icon: '👥', description: 'Gestion de la base clients' },
  { id: 'reports', label: 'Rapports', icon: '📈', description: 'Rapports et analyses de ventes' },
  { id: 'inventory', label: 'Gestion de stock', icon: '🏭', description: 'Accès à la page Produits et gestion des produits et du stock' },
  { id: 'settings', label: 'Paramètres', icon: '⚙️', description: 'Configuration du système' },
  { id: 'user-management', label: 'Gestion des utilisateurs', icon: '🛡️', description: 'Gestion des comptes utilisateurs et attributions de permissions' },
];

const OPTIONAL_MODULES = [
  { id: 'kitchen', label: 'Cuisine', icon: '🍳', description: 'Gestion des commandes cuisine', configModule: 'kitchen' },
  { id: 'tables', label: 'Tables', icon: '🪑', description: 'Plan de salle et gestion des tables', configModule: 'tables' },
  { id: 'gift_cards', label: 'Cartes cadeaux', icon: '🎁', description: 'Gestion des cartes cadeaux', configModule: 'gift-cards' },
  { id: 'suppliers', label: 'Fournisseurs', icon: '🚚', description: 'Gestion des fournisseurs', configModule: 'suppliers' },
  { id: 'services', label: 'Services', icon: '💈', description: 'Gestion des services et rendez-vous', configModule: 'services' },
  { id: 'loyalty', label: 'Fidélité', icon: '❤️', description: 'Programme de fidélité clients', configModule: 'loyalty' },
  { id: 'barcode', label: 'Code-barres', icon: '📱', description: 'Gestion des codes-barres produits', configModule: 'barcode' },
  { id: 'production', label: 'Production', icon: '🏭', description: 'Gestion de la production', configModule: 'production' },
  { id: 'appointments', label: 'Rendez-vous', icon: '📅', description: 'Gestion des rendez-vous', configModule: 'appointments' },
  { id: 'prescription', label: 'Ordonnances', icon: '💊', description: 'Gestion des ordonnances', configModule: 'prescription' },
];

// Permissions presented to the operator as two levels per module.
// "Lecture" = view only (can_read). "Écriture" = create + modify + delete
// (can_create / can_update / can_delete) and implies Lecture.
const READ_PERMISSION_LABEL = 'Lecture';
const WRITE_PERMISSION_LABEL = 'Écriture';

// Modules that only expose read actions — there is nothing to write, so
// "Écriture" is never offered and the module stays permanently in Lecture.
const ALWAYS_READ_ONLY_MODULES = [];
const isAlwaysReadOnly = (id) => ALWAYS_READ_ONLY_MODULES.includes(id);

const ROLES = [
  { value: 'superadmin', label: 'Super admin', color: 'bg-purple-100 text-purple-800' },
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
  const { config: appConfig } = useAppConfig();
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
  const [auditDateFrom, setAuditDateFrom] = useState('');
  const [auditDateTo, setAuditDateTo] = useState('');
  const [auditUserFilter, setAuditUserFilter] = useState('all');
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

  // "Gestion des utilisateurs" page actions follow the user-management module
  // permission. Admins get everything through the provider bypass.
  const { canCreate: umCreate, canUpdate: umUpdate, canDelete: umDelete } = usePermissions('user-management');

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
  const isSuperAdmin = (u) => !!(u && Number(u.id) === 1);

  // Who may assign permissions to whom:
  // - super admin (id 1): every other user (never himself).
  // - admin (created by the super admin): managers & cashiers only.
  // - manager / cashier: nobody.
  const canManagePermsOf = useCallback((target) => {
    if (!currentUser?.id || !target) return false;
    if (Number(target.id) === Number(currentUser.id)) return false;
    if (Number(currentUser.id) === 1) return true;
    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') return false;
    return target.role !== 'admin' && target.role !== 'superadmin';
  }, [currentUser]);

  const POS_MODULES = useMemo(() => {
    const enabledNames = (appConfig?.modules || []).filter(m => m.isEnabled !== false).map(m => m.name);
    const features = appConfig?.features || {};
    const optional = OPTIONAL_MODULES.filter(m => {
      if (features[m.id] === true) return true;
      return enabledNames.some(n => n === m.configModule || n.includes(m.configModule) || m.configModule.includes(n));
    });
    return [...BASE_MODULES, ...optional];
  }, [appConfig]);

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
    // Start from the role defaults (pre-filled), then overlay any rows this
    // user already has. The admin can change everything before saving.
    // NOTE: roleModuleDefaults returns {read,create,update,delete}; the dialog
    // uses {can_read,can_create,...} — translate so fresh users show checked.
    const toCanKeys = (d) => ({
      can_read: !!d.read,
      can_create: !!d.create,
      can_update: !!d.update,
      can_delete: !!d.delete,
    });
    const roleDefaults = roleModuleDefaults(user?.role || 'cashier', POS_MODULES);
    const perms = {};
    POS_MODULES.forEach(m => { perms[m.id] = { ...(roleDefaults[m.id] ? toCanKeys(roleDefaults[m.id]) : { can_read: false, can_create: false, can_update: false, can_delete: false }) }; });
    if (user && user.id) {
      try {
        const existing = await window.electronAPI.getUserModules(user.id);
        if (Array.isArray(existing)) {
          const seen = new Set();
          existing.forEach(m => {
            const key = canonicalModule(m.module_name);
            if (!perms[key]) return;
            const row = { can_read: !!m.can_read, can_create: !!m.can_create, can_update: !!m.can_update, can_delete: !!m.can_delete };
            if (seen.has(key)) {
              // Several legacy modules collapse into one entry — keep the union.
              perms[key] = {
                can_read: perms[key].can_read || row.can_read,
                can_create: perms[key].can_create || row.can_create,
                can_update: perms[key].can_update || row.can_update,
                can_delete: perms[key].can_delete || row.can_delete,
              };
            } else {
              perms[key] = row;
              seen.add(key);
            }
          });
        }
      } catch {}
    }
    // Read-only-by-nature modules (dashboard) are always exactly "Lecture".
    ALWAYS_READ_ONLY_MODULES.forEach(id => {
      if (perms[id]) perms[id] = { can_read: true, can_create: false, can_update: false, can_delete: false };
    });
    // Alias sync: "Produits" (products), "Menu" (menu-management), "Gestion de
    // stock" (inventory) are one canonical feature (inventory). Make every row
    // that canonicalizes to the same key show the same state, so permissions a
    // user was granted under one spelling are pre-selected on the other too.
    POS_MODULES.forEach(m => {
      const c = canonicalModule(m.id);
      if (c !== m.id && perms[c]) perms[m.id] = { ...perms[c] };
    });
    setModulePerms(perms);
    setShowPermissionsDialog(true);
  };

  const savePermissions = async () => {
    if (!permTarget?.id) { setShowPermissionsDialog(false); return; }
    setSubmitting(true);
    try {
      const modules = Object.entries(modulePerms).map(([key, val]) => {
        const forced = isAlwaysReadOnly(key);
        return {
          // Store the canonical module name so "products"/"menu-management"
          // rows collapse into "inventory" and runtime lookups stay aligned
          // with what the dialog shows.
          module_name: canonicalModule(key),
          can_read: forced ? 1 : (val.can_read ? 1 : 0),
          can_create: forced ? 0 : (val.can_create ? 1 : 0),
          can_update: forced ? 0 : (val.can_update ? 1 : 0),
          can_delete: forced ? 0 : (val.can_delete ? 1 : 0),
        };
      });
      // Several dialog rows share one canonical module (e.g. products + inventory
      // → "inventory"); dedupe so no UNIQUE(user_id, module_name) conflict occurs.
      const deduped = Array.from(
        new Map(modules.map(m => [m.module_name, m])).values()
      );
      await window.electronAPI.setUserModules(permTarget.id, deduped);
      setShowPermissionsDialog(false);
    } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };

  const setAllPerms = (value) => {
    const p = {};
    POS_MODULES.forEach(m => {
      if (isAlwaysReadOnly(m.id)) {
        p[m.id] = { can_read: true, can_create: false, can_update: false, can_delete: false };
      } else if (m.id === 'user-management' && Number(currentUser.id) !== 1) {
        // Only the super admin may change the "gestion des utilisateurs"
        // permission. Other admins: preserve its current value untouched.
        p[m.id] = { ...(modulePerms[m.id] || { can_read: false, can_create: false, can_update: false, can_delete: false }) };
      } else {
        p[m.id] = { can_read: value, can_create: value, can_update: value, can_delete: value };
      }
    });
    setModulePerms(p);
  };

  const applyToAliases = (id, updater) => {
    setModulePerms(prev => {
      const next = { ...prev };
      const c = canonicalModule(id);
      // Apply to the row plus every row sharing the same canonical key.
      POS_MODULES.forEach(m => {
        if (canonicalModule(m.id) === c) next[m.id] = updater({ ...(prev[m.id] || {}) });
      });
      return next;
    });
  };

  const setModulePerm = (moduleId, action, value) => {
    applyToAliases(moduleId, (cur) => ({ ...cur, [action]: value }));
  };

  // "Écriture" = create + update + delete and always implies "Lecture" (read).
  const setModuleWrite = (moduleId, checked) => {
    if (isAlwaysReadOnly(moduleId)) return; // e.g. dashboard: no write actions exist
    applyToAliases(moduleId, (cur) => ({
      can_read: checked ? true : (cur.can_read ?? false),
      can_create: !!checked,
      can_update: !!checked,
      can_delete: !!checked,
    }));
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

  const auditUsers = useMemo(() => {
    const s = new Set();
    auditLogs.forEach(l => { if (l.user_name) s.add(l.user_name); });
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [auditLogs]);

  const filteredAudit = useMemo(() => {
    let list = [...auditLogs];
    if (auditUserFilter !== 'all') list = list.filter(l => l.user_name === auditUserFilter);
    if (auditActionFilter !== 'all') list = list.filter(l => l.action_type === auditActionFilter);
    if (auditDateFrom || auditDateTo) {
      const localKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      list = list.filter(l => {
        const t = new Date(l.timestamp);
        if (isNaN(t.getTime())) return true; // keep entries with unparseable timestamps
        const key = localKey(t);
        if (auditDateFrom && key < auditDateFrom) return false;
        if (auditDateTo && key > auditDateTo) return false;
        return true;
      });
    }
    return list;
  }, [auditLogs, auditUserFilter, auditActionFilter, auditDateFrom, auditDateTo]);

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
    admins: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
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
          {activeTab === 'users' && umCreate && (
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
                                <div className="font-medium">@{user.role === 'superadmin' ? 'superadmin' : user.username}</div>
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
                              {canManagePermsOf(user) && umUpdate && (
                                <Button variant="ghost" size="sm" onClick={() => openPermissions(user)} title="Permissions">
                                  <Lock className="h-4 w-4" />
                                </Button>
                              )}
                              {umUpdate && (
                              <Button variant="ghost" size="sm" onClick={() => { setResetTarget(user); setResetPassword(''); setShowResetDialog(true); }} title="Réinitialiser MDP">
                                <Key className="h-4 w-4" />
                              </Button>
                              )}
                              {umUpdate && (
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingUser(user);
                                setUserForm({ username: user.username, full_name: user.full_name || '', email: user.email || '', phone: user.phone || '', role: user.role, badge_id: user.badge_id || '', pin: '', password: '', confirmPassword: '', is_server: !!user.is_server });
                                setFormErrors([]);
                                setShowUserDialog(true);
                              }} title="Modifier">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              )}
                              {!isSuperAdmin(user) && umUpdate && (
                                <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(user)} title={user.is_active ? 'Désactiver' : 'Activer'}>
                                  {user.is_active ? <UserX className="h-4 w-4 text-orange-500" /> : <UserCheck className="h-4 w-4 text-green-500" />}
                                </Button>
                              )}
                              {!isSuperAdmin(user) && umDelete && (
                                <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(user); setFormErrors([]); setShowDeleteDialog(true); }} title="Supprimer" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
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
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={auditUserFilter} onValueChange={(v) => { setAuditUserFilter(v); setAuditPage(1); }}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Utilisateur" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les utilisateurs</SelectItem>
                      {auditUsers.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Du</span>
                    <Input type="date" className="w-36" value={auditDateFrom} onChange={(e) => { setAuditDateFrom(e.target.value); setAuditPage(1); }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Au</span>
                    <Input type="date" className="w-36" value={auditDateTo} onChange={(e) => { setAuditDateTo(e.target.value); setAuditPage(1); }} />
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
                  {(auditDateFrom || auditDateTo || auditUserFilter !== 'all' || auditActionFilter !== 'all') && (
                    <Button variant="ghost" size="sm" onClick={() => { setAuditDateFrom(''); setAuditDateTo(''); setAuditUserFilter('all'); setAuditActionFilter('all'); setAuditPage(1); }}>
                      Réinitialiser
                    </Button>
                  )}
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
                <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })} disabled={editingUser && isSuperAdmin(editingUser)}>
                  <SelectTrigger disabled={editingUser && isSuperAdmin(editingUser)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.filter(r => r.value !== 'superadmin').map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Badge ID</Label>
                <Input value={userForm.badge_id} onChange={(e) => setUserForm({ ...userForm, badge_id: e.target.value })} />
              </div>
            </div>
            {userForm.role === 'cashier' && POS_MODULES.some(m => m.id === 'tables') && (
              <div className="flex items-center gap-3 py-1">
                <Switch checked={!!userForm.is_server} onCheckedChange={(v) => setUserForm({ ...userForm, is_server: v })} disabled={editingUser && isSuperAdmin(editingUser)} />
                <div><Label>C'est un serveur</Label><p className="text-xs text-muted-foreground">Peut être assigné aux tables et zones</p></div>
              </div>
            )}
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
            {editingUser && canManagePermsOf(editingUser) && umUpdate && (
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
      {(() => {
        // "Gestion des utilisateurs" only appears to the super admin (id 1);
        // other admins don't see it and therefore can't grant it.
        const visibleModules = POS_MODULES.filter(mod => !(mod.id === 'user-management' && Number(currentUser.id) !== 1));
        return (
        <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />Permissions modules
            </DialogTitle>
            <DialogDescription>
              Permissions de {permTarget?.username || 'l\'utilisateur'} — {visibleModules.length} modules disponibles
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-4" style={{ maxHeight: 'calc(85vh - 140px)' }}>
            <div className="space-y-2">
              {visibleModules.map(mod => (
                <div key={mod.id} className="border rounded-xl p-4 bg-card hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">{mod.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{mod.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{mod.description}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {modulePerms[mod.id]?.can_read && <Badge variant="outline" className="text-[10px] py-0">L</Badge>}
                      {(modulePerms[mod.id]?.can_create || modulePerms[mod.id]?.can_update || modulePerms[mod.id]?.can_delete) && <Badge variant="outline" className="text-[10px] py-0 text-destructive">É</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors border border-border">
                      <input
                        type="checkbox"
                        checked={modulePerms[mod.id]?.can_read || false}
                        onChange={(e) => setModulePerm(mod.id, 'can_read', e.target.checked)}
                        disabled={isAlwaysReadOnly(mod.id)}
                        className="rounded border-gray-300 h-4 w-4"
                      />
                      <span>{READ_PERMISSION_LABEL}</span>
                    </label>
                    {isAlwaysReadOnly(mod.id) ? (
                      <span className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-lg border border-dashed">
                        {WRITE_PERMISSION_LABEL} — Lecture seule
                      </span>
                    ) : (
                    <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors border border-border">
                      <input
                        type="checkbox"
                        checked={!!(modulePerms[mod.id] && (modulePerms[mod.id]?.can_create || modulePerms[mod.id]?.can_update || modulePerms[mod.id]?.can_delete))}
                        onChange={(e) => setModuleWrite(mod.id, e.target.checked)}
                        className="rounded border-gray-300 h-4 w-4"
                      />
                      <span>{WRITE_PERMISSION_LABEL}</span>
                    </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t px-6 pb-4">
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
      );
      })()}
    </div>
  );
};

export default UserManagementAdvanced;
