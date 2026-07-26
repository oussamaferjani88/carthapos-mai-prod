import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import {
  Printer, Wallet, Keyboard, Bell, Monitor, Shield, Database,
  TestTube, Download, Upload, RotateCcw, CheckCircle, XCircle, AlertTriangle,
  Info, RefreshCw, Plus, Trash2, Edit, Settings, Wifi, Usb, MonitorSpeaker,
  CircleDot, Zap, Search
} from 'lucide-react';

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

function SkeletonHardware() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-8 w-48" />
      <SkeletonBlock className="h-4 w-64" />
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="p-4 rounded-xl border space-y-3">
            <SkeletonBlock className="h-10 w-10 rounded-lg" />
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-5 w-16" />
          </div>
        ))}
      </div>
      {[1,2].map(i => (
        <Card key={i}><CardContent className="p-6 space-y-4">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-4 w-48" />
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
        </CardContent></Card>
      ))}
    </div>
  );
}

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'connected': case 'ready': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'error': case 'disconnected': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'warning': case 'testing': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    default: return <Info className="w-4 h-4 text-gray-400" />;
  }
};

const StatusBadge = ({ status, children }) => {
  const variants = { connected: 'default', ready: 'default', error: 'destructive', disconnected: 'destructive', warning: 'outline', testing: 'secondary', unknown: 'secondary' };
  const labels = { connected: 'Connecté', ready: 'Prêt', error: 'Erreur', disconnected: 'Déconnecté', warning: 'Attention', testing: 'Test...', unknown: 'Inconnu' };
  return <Badge variant={variants[status] || 'secondary'} className="gap-1"><StatusIcon status={status} /><span className="ml-1">{children || labels[status] || status}</span></Badge>;
};

const PRINTER_TYPES = [
  { value: 'receipt', label: 'Reçu client' },
  { value: 'kitchen', label: 'Cuisine' },
  { value: 'bar', label: 'Bar' },
  { value: 'bakery', label: 'Boulangerie' },
  { value: 'grill', label: 'Grillade' },
  { value: 'dessert', label: 'Desserts' },
  { value: 'customer', label: 'Display client' },
  { value: 'other', label: 'Autre' }
];

const CONNECTION_TYPES = [
  { value: 'usb', label: 'USB', icon: Usb },
  { value: 'ethernet', label: 'Ethernet', icon: Wifi },
  { value: 'network_ip', label: 'Réseau IP', icon: Wifi },
  { value: 'windows', label: 'Imprimante Windows', icon: MonitorSpeaker }
];

const DEFAULT_PRINTER = { name: '', printer_type: 'receipt', connection_type: 'usb', ip_address: '', port: '9100', paper_width: 80, character_encoding: 'PC437', auto_cut: true, open_drawer_after_print: false, is_default: false, is_enabled: true };

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
      <div><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div>
    </div>
  );
}

function Field({ label, helper, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

export default function HardwareSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dashboard, setDashboard] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [cashDrawerStatus, setCashDrawerStatus] = useState({ status: 'unknown', lastOpened: null, openCount: 0 });
  const [backupHistory, setBackupHistory] = useState([]);
  const [backupStatus, setBackupStatus] = useState({ autoBackup: true, interval: 300000, maxBackups: 50 });
  const [notifSettings, setNotifSettings] = useState({ notificationEnabled: true, notificationSoundEnabled: true, notificationPersistentAlerts: true, notificationLowStockAlerts: true });
  const [kioskSettings, setKioskSettings] = useState({ kioskEnabled: false, kioskFullscreen: false, kioskEmergencyExit: true, kioskHideCursor: true });
  const [kbSettings, setKbSettings] = useState({ keyboardEnabled: true, keyboardSoundEnabled: true });

  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [printerForm, setPrinterForm] = useState({ ...DEFAULT_PRINTER });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [showAddDeptDialog, setShowAddDeptDialog] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const restoreRef = React.useRef(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, pr, rt, cd, bh, bs, ns, ks, kb] = await Promise.all([
        window.electronAPI.getHardwareDashboard().catch(() => null),
        window.electronAPI.getPrinters().catch(() => []),
        window.electronAPI.getDepartmentRoutes().catch(() => []),
        window.electronAPI.getCashDrawerStatusHw().catch(() => ({ status: 'unknown' })),
        window.electronAPI.getBackupHistory().catch(() => []),
        window.electronAPI.getBackupStatus().catch(() => ({ autoBackup: true, interval: 300000, maxBackups: 50 })),
        window.electronAPI.getNotificationSettingsHw().catch(() => ({})),
        window.electronAPI.getKioskSettingsHw().catch(() => ({})),
        window.electronAPI.getKeyboardSettingsHw().catch(() => ({}))
      ]);
      if (dash) setDashboard(dash);
      setPrinters(Array.isArray(pr) ? pr : []);
      setRoutes(Array.isArray(rt) ? rt : []);
      setCashDrawerStatus(cd || { status: 'unknown' });
      setBackupHistory(Array.isArray(bh) ? bh : []);
      setBackupStatus(bs || {});
      setNotifSettings(ns || {});
      setKioskSettings(ks || {});
      setKbSettings(kb || {});
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveSetting = async (key, value) => {
    setSaving(true);
    try { await window.electronAPI.setSetting(key, value); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const openAddPrinter = () => { setEditingPrinter(null); setPrinterForm({ ...DEFAULT_PRINTER }); setShowPrinterDialog(true); };
  const openEditPrinter = (p) => { setEditingPrinter(p); setPrinterForm({ ...p }); setShowPrinterDialog(true); };
  const savePrinter = async () => {
    setSaving(true);
    try {
      if (editingPrinter) {
        await window.electronAPI.updatePrinter(editingPrinter.id, printerForm);
        toast({ title: 'Imprimante mise à jour' });
      } else {
        await window.electronAPI.addPrinter(printerForm);
        toast({ title: 'Imprimante ajoutée' });
      }
      setShowPrinterDialog(false);
      await loadAll();
    } catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const deletePrinter = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try { await window.electronAPI.deletePrinter(deleteTarget.id); setShowDeleteDialog(false); setDeleteTarget(null); toast({ title: 'Imprimante supprimée' }); await loadAll(); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const testPrinter = async (id) => {
    try { const r = await window.electronAPI.testPrinterConnection(id); toast({ title: r.success ? 'Succès' : 'Erreur', description: r.message, variant: r.success ? 'default' : 'destructive' }); await loadAll(); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };
  const printTestPage = async (id) => {
    try { const r = await window.electronAPI.testPrinterPrint(id); toast({ title: r.success ? 'Test réussi' : 'Erreur', description: r.message, variant: r.success ? 'default' : 'destructive' }); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };
  const setDefaultPrinter = async (id) => {
    try { await window.electronAPI.setDefaultPrinter(id); toast({ title: 'Imprimante par défaut définie' }); await loadAll(); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };
  const togglePrinterEnabled = async (id, enabled) => {
    try { await window.electronAPI.updatePrinter(id, { is_enabled: enabled }); await loadAll(); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };
  const scanNetwork = async () => {
    try { toast({ title: 'Scan réseau', description: 'Fonctionnalité à implémenter avec le backend réseau' }); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };
  const detectUSB = async () => {
    try { toast({ title: 'Détection USB', description: 'Fonctionnalité à implémenter avec le backend USB' }); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };

  const updateRoute = async (dept, field, value) => {
    const existing = routes.find(r => r.department === dept) || {};
    const updated = { ...existing, [field]: value, printer_id: existing.printer_id || null, auto_print: existing.auto_print || false, copies: existing.copies || 1, print_delay_ms: existing.print_delay_ms || 0, group_orders: existing.group_orders || false };
    updated[field] = value;
    try { await window.electronAPI.updateDepartmentRoute(dept, updated); await loadAll(); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };
  const addDepartment = async () => {
    if (!newDeptName.trim()) return;
    try { await window.electronAPI.addDepartment(newDeptName.trim()); setShowAddDeptDialog(false); setNewDeptName(''); toast({ title: 'Département ajouté' }); await loadAll(); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };
  const deleteDepartment = async (dept) => {
    try { await window.electronAPI.deleteDepartment(dept); toast({ title: 'Département supprimé' }); await loadAll(); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };

  const testCash = async () => {
    try { const r = await window.electronAPI.testCashDrawer(); toast({ title: r.success ? 'Test réussi' : 'Erreur', description: r.message, variant: r.success ? 'default' : 'destructive' }); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };
  const openCash = async () => {
    try { const r = await window.electronAPI.openCashDrawer(); toast({ title: r.success ? 'Tiroir ouvert' : 'Erreur', description: r.message, variant: r.success ? 'default' : 'destructive' }); await loadAll(); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };

  const createBackup = async () => {
    setSaving(true);
    try { const r = await window.electronAPI.createBackup(); if (r.success) { toast({ title: 'Sauvegarde créée', description: r.filename }); await loadAll(); } else { toast({ title: 'Erreur', description: r.error, variant: 'destructive' }); } }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const handleRestoreFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setRestoreFile({ name: file.name, data: ev.target.result, size: file.size }); };
    reader.readAsText(file); e.target.value = '';
  };
  const executeRestore = async () => {
    if (!restoreFile) return;
    setSaving(true);
    try { const r = await window.electronAPI.restoreBackup(restoreFile.data); if (r.success) { toast({ title: 'Restauration réussie', description: `${r.count} lignes restaurées` }); setShowRestoreDialog(false); setRestoreFile(null); await loadAll(); } else { toast({ title: 'Erreur', description: r.error, variant: 'destructive' }); } }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const toggleNotif = async (key, val) => { const s = { ...notifSettings, [key]: val }; setNotifSettings(s); await saveSetting(key, val); };
  const toggleKiosk = async (key, val) => { const s = { ...kioskSettings, [key]: val }; setKioskSettings(s); await saveSetting(key, val); };
  const toggleKb = async (key, val) => { const s = { ...kbSettings, [key]: val }; setKbSettings(s); await saveSetting(key, val); };
  const toggleKioskMode = async () => {
    try { const r = await window.electronAPI.toggleKioskModeHw(); setKioskSettings(p => ({ ...p, kioskEnabled: r.enabled })); toast({ title: r.enabled ? 'Mode kiosque activé' : 'Mode kiosque désactivé' }); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };

  if (loading) return <SkeletonHardware />;

  const dashItems = [
    { icon: Printer, label: 'Imprimantes', sub: `${dashboard?.printers?.connected || 0}/${dashboard?.printers?.enabled || 0} connectées`, color: (dashboard?.printers?.connected || 0) > 0 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 text-green-700' : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200 text-red-700', iconBg: (dashboard?.printers?.connected || 0) > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600', ring: (dashboard?.printers?.connected || 0) > 0 ? 'ring-green-500/20' : 'ring-red-500/20' },
    { icon: Printer, label: 'Cuisine', sub: `${dashboard?.printers?.kitchen || 0} active(s)`, color: (dashboard?.printers?.kitchen || 0) > 0 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 text-green-700' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 text-amber-700', iconBg: (dashboard?.printers?.kitchen || 0) > 0 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600', ring: (dashboard?.printers?.kitchen || 0) > 0 ? 'ring-green-500/20' : 'ring-amber-500/20' },
    { icon: Wallet, label: 'Tiroir-Caisse', sub: cashDrawerStatus.isConnected ? 'Connecté' : 'Déconnecté', color: cashDrawerStatus.isConnected ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 text-green-700' : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200 text-red-700', iconBg: cashDrawerStatus.isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600', ring: cashDrawerStatus.isConnected ? 'ring-green-500/20' : 'ring-red-500/20' },
    { icon: Database, label: 'Sauvegarde', sub: dashboard?.backup?.autoBackup ? 'Auto active' : 'Manuel', color: dashboard?.backup?.autoBackup ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 text-green-700' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 text-amber-700', iconBg: dashboard?.backup?.autoBackup ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600', ring: dashboard?.backup?.autoBackup ? 'ring-green-500/20' : 'ring-amber-500/20' },
    { icon: Shield, label: 'Kiosque', sub: dashboard?.kiosk?.enabled ? 'Actif' : 'Inactif', color: dashboard?.kiosk?.enabled ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 text-green-700' : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 text-gray-600', iconBg: dashboard?.kiosk?.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500', ring: dashboard?.kiosk?.enabled ? 'ring-green-500/20' : 'ring-gray-500/20' },
    { icon: Bell, label: 'Notifications', sub: dashboard?.notifications?.enabled ? 'Actives' : 'Inactives', color: dashboard?.notifications?.enabled ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 text-green-700' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 text-amber-700', iconBg: dashboard?.notifications?.enabled ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600', ring: dashboard?.notifications?.enabled ? 'ring-green-500/20' : 'ring-amber-500/20' },
  ];

  const printerTypeBadgeColors = {
    receipt: 'bg-blue-100 text-blue-700 border-blue-200',
    kitchen: 'bg-orange-100 text-orange-700 border-orange-200',
    bar: 'bg-purple-100 text-purple-700 border-purple-200',
    bakery: 'bg-amber-100 text-amber-700 border-amber-200',
    grill: 'bg-red-100 text-red-700 border-red-200',
    dessert: 'bg-pink-100 text-pink-700 border-pink-200',
    customer: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    other: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const getConnectionIcon = (type) => {
    switch (type) {
      case 'usb': return Usb;
      case 'ethernet': case 'network_ip': return Wifi;
      case 'windows': return MonitorSpeaker;
      default: return Wifi;
    }
  };

  const getConnectionLabel = (p) => {
    switch (p.connection_type) {
      case 'usb': return 'USB';
      case 'ethernet': case 'network_ip': return `${p.ip_address || '—'}:${p.port || '9100'}`;
      case 'windows': return p.name;
      default: return p.connection_type;
    }
  };

  const deptColors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500'];

  return (
    <div className="space-y-10">
      {/* ═══════════════ DASHBOARD ═══════════════ */}
      {dashboard && (
        <section>
          <SectionHeader icon={Monitor} title="Tableau de bord" description="État global du matériel" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
            {dashItems.map(item => (
              <div
                key={item.label}
                className={`relative overflow-hidden flex flex-col items-center gap-3 p-5 rounded-xl border transition-all duration-200 hover:shadow-md hover:scale-[1.02] ring-1 ${item.ring} ${item.color}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.iconBg}`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold">{item.label}</div>
                  <span className="text-xs opacity-80 mt-0.5 block">{item.sub}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-3">
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading} className="gap-2 transition-colors">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </Button>
          </div>
        </section>
      )}

      {/* ═══════════════ PRINTERS ═══════════════ */}
      <section>
        <SectionHeader icon={Printer} title="Imprimantes" description="Gestion des imprimantes et affectation aux départements" />

        <div className="flex flex-wrap items-center gap-2 mt-4 mb-5">
          <Button variant="default" size="sm" onClick={openAddPrinter} className="gap-2 transition-colors">
            <Plus className="h-4 w-4" /> Ajouter une imprimante
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button variant="outline" size="sm" onClick={detectUSB} className="gap-2 transition-colors">
            <Usb className="h-4 w-4" /> Détecter USB
          </Button>
          <Button variant="outline" size="sm" onClick={scanNetwork} className="gap-2 transition-colors">
            <Wifi className="h-4 w-4" /> Scanner le réseau
          </Button>
          <Button variant="outline" size="sm" onClick={() => { toast({ title: 'Détection Windows', description: 'Fonctionnalité à implémenter' }); }} className="gap-2 transition-colors">
            <MonitorSpeaker className="h-4 w-4" /> Détecter Windows
          </Button>
        </div>

        {printers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                <Printer className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-base font-semibold text-muted-foreground mb-1">Aucune imprimante configurée</h3>
              <p className="text-sm text-muted-foreground/70 mb-5 max-w-xs">
                Ajoutez une imprimante pour commencer à imprimer vos reçus, commandes cuisine, etc.
              </p>
              <Button onClick={openAddPrinter} className="gap-2">
                <Plus className="h-4 w-4" /> Ajouter une imprimante
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {printers.map(p => {
              const ConnIcon = getConnectionIcon(p.connection_type);
              const typeLabel = PRINTER_TYPES.find(t => t.value === p.printer_type)?.label || p.printer_type;
              const typeBadge = printerTypeBadgeColors[p.printer_type] || printerTypeBadgeColors.other;
              const isEnabled = p.is_enabled;
              const connStatus = p.status || p.connection_status || 'unknown';

              return (
                <Card
                  key={p.id}
                  className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 ${!isEnabled ? 'opacity-60' : ''}`}
                >
                  {/* Top colored accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    connStatus === 'connected' || connStatus === 'ready'
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                      : connStatus === 'error' || connStatus === 'disconnected'
                        ? 'bg-gradient-to-r from-red-400 to-rose-500'
                        : 'bg-gradient-to-r from-gray-300 to-gray-400'
                  }`} />

                  <CardContent className="p-5 pt-6 space-y-4">
                    {/* Header: name + status + toggle */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isEnabled
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <Printer className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                            {p.is_default && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                                <CircleDot className="h-2.5 w-2.5" /> Défaut
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <ConnIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{getConnectionLabel(p)}</span>
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(v) => togglePrinterEnabled(p.id, v)}
                        className="shrink-0"
                      />
                    </div>

                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium ${typeBadge}`}>
                        {typeLabel}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                        {p.paper_width}mm
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                        {p.character_encoding || 'PC437'}
                      </Badge>
                      {p.auto_cut && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                          Coupe auto
                        </Badge>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        {(connStatus === 'connected' || connStatus === 'ready') && (
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                          </span>
                        )}
                        {(connStatus === 'error' || connStatus === 'disconnected') && (
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                          </span>
                        )}
                        <StatusBadge status={connStatus} />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 pt-1 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs gap-1.5 transition-colors"
                        onClick={() => testPrinter(p.id)}
                        disabled={!isEnabled}
                        title="Tester la connexion"
                      >
                        <Zap className="h-3.5 w-3.5" /> Test
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs gap-1.5 transition-colors"
                        onClick={() => printTestPage(p.id)}
                        disabled={!isEnabled}
                        title="Imprimer page de test"
                      >
                        <Printer className="h-3.5 w-3.5" /> Imprimer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-2.5 text-xs gap-1.5 transition-colors ${p.is_default ? 'text-primary font-medium' : ''}`}
                        onClick={() => setDefaultPrinter(p.id)}
                        disabled={p.is_default || !isEnabled}
                        title="Définir par défaut"
                      >
                        <CircleDot className="h-3.5 w-3.5" />
                        {p.is_default ? 'Défaut' : 'Par défaut'}
                      </Button>
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 transition-colors"
                          onClick={() => openEditPrinter(p)}
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => { setDeleteTarget(p); setShowDeleteDialog(true); }}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════════════ DEPARTMENT ROUTING ═══════════════ */}
      {printers.length > 0 && (
        <section>
          <SectionHeader icon={Settings} title="Routage par Département" description="Affecter une imprimante à chaque département" />

          <div className="flex justify-end mt-4 mb-4">
            <Button size="sm" variant="outline" onClick={() => setShowAddDeptDialog(true)} className="gap-2 transition-colors">
              <Plus className="h-4 w-4" /> Ajouter un département
            </Button>
          </div>

          {routes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-10 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <Settings className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Aucun routage configuré</h3>
                <p className="text-xs text-muted-foreground/70 mb-4 max-w-xs">
                  Ajoutez un département pour lui assigner une imprimante.
                </p>
                <Button size="sm" variant="outline" onClick={() => setShowAddDeptDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Ajouter un département
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {routes.map((r, idx) => {
                const matchedPrinter = printers.find(p => String(p.id) === String(r.printer_id));
                return (
                  <Card key={r.department} className="transition-all duration-200 hover:shadow-md hover:border-primary/20">
                    <CardContent className="p-5 space-y-4">
                      {/* Top row: department name + printer selector */}
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${deptColors[idx % deptColors.length]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-semibold text-sm">{r.department}</span>
                            {matchedPrinter && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Printer className="h-3 w-3" />
                                <span>→</span>
                                <span className="font-medium text-primary/80">{matchedPrinter.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          onClick={() => deleteDepartment(r.department)}
                          title="Supprimer le département"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Printer selector */}
                      <Select value={r.printer_id ? String(r.printer_id) : 'none'} onValueChange={(v) => updateRoute(r.department, 'printer_id', v === 'none' ? null : parseInt(v))}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Sélectionner une imprimante..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucune imprimante</SelectItem>
                          {printers.filter(p => p.is_enabled).map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.name} ({PRINTER_TYPES.find(t => t.value === p.printer_type)?.label})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Controls row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Impression auto</Label>
                          <Switch checked={r.auto_print || false} onCheckedChange={(v) => updateRoute(r.department, 'auto_print', v)} disabled={!r.printer_id} />
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Grouper</Label>
                          <Switch checked={r.group_orders || false} onCheckedChange={(v) => updateRoute(r.department, 'group_orders', v)} disabled={!r.printer_id} />
                        </div>
                        <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Copies</Label>
                          <Input type="number" className="w-14 h-7 text-xs ml-auto" min="1" max="10" value={r.copies || 1} onChange={(e) => updateRoute(r.department, 'copies', parseInt(e.target.value) || 1)} disabled={!r.printer_id} />
                        </div>
                        <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Délai (ms)</Label>
                          <Input type="number" className="w-16 h-7 text-xs ml-auto" min="0" max="30000" step="500" value={r.print_delay_ms || 0} onChange={(e) => updateRoute(r.department, 'print_delay_ms', parseInt(e.target.value) || 0)} disabled={!r.printer_id} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══════════════ CASH DRAWER ═══════════════ */}
      <section>
        <SectionHeader icon={Wallet} title="Tiroir-Caisse" description="État et contrôle du tiroir-caisse" />
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Status visual */}
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                cashDrawerStatus.isConnected
                  ? 'bg-gradient-to-br from-green-100 to-emerald-100 text-green-600'
                  : 'bg-gradient-to-br from-red-100 to-rose-100 text-red-500'
              }`}>
                <Wallet className="h-8 w-8" />
              </div>

              {/* Info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <StatusBadge status={cashDrawerStatus.isConnected ? 'connected' : 'disconnected'} />
                  {cashDrawerStatus.isConnected && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                  )}
                </div>
                {cashDrawerStatus.lastOpened && (
                  <p className="text-xs text-muted-foreground">
                    Dernière ouverture : {new Date(cashDrawerStatus.lastOpened).toLocaleString('fr-FR')}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {cashDrawerStatus.openCount || 0} ouverture(s)
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <Button variant="outline" onClick={testCash} className="gap-2 transition-colors flex-1 sm:flex-none">
                  <TestTube className="h-4 w-4" /> Tester
                </Button>
                <Button onClick={openCash} disabled={!cashDrawerStatus.isConnected} className="gap-2 transition-colors flex-1 sm:flex-none">
                  <Wallet className="h-4 w-4" /> Ouvrir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════ BACKUP ═══════════════ */}
      <section>
        <SectionHeader icon={Database} title="Sauvegarde" description="Sauvegarde et restauration de la base de données" />
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="p-6 space-y-6">
            {/* Auto backup toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Sauvegarde automatique</Label>
                <p className="text-xs text-muted-foreground">Créer des sauvegardes périodiques automatiquement</p>
              </div>
              <Switch
                checked={backupStatus.autoBackup}
                onCheckedChange={(v) => { setBackupStatus(p => ({ ...p, autoBackup: v })); saveSetting('autoBackup', v); }}
              />
            </div>

            {/* Settings grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Intervalle de sauvegarde">
                <Select value={String(backupStatus.interval || 300000)} onValueChange={(v) => { const n = parseInt(v); setBackupStatus(p => ({ ...p, interval: n })); saveSetting('backupInterval', n); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60000">1 minute</SelectItem>
                    <SelectItem value="300000">5 minutes</SelectItem>
                    <SelectItem value="600000">10 minutes</SelectItem>
                    <SelectItem value="1800000">30 minutes</SelectItem>
                    <SelectItem value="3600000">1 heure</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Nombre max de sauvegardes">
                <Input type="number" min="1" max="200" value={backupStatus.maxBackups || 50} onChange={(e) => { const v = Math.max(1, Math.min(200, parseInt(e.target.value) || 50)); setBackupStatus(p => ({ ...p, maxBackups: v })); }} onBlur={(e) => saveSetting('backupMaxBackups', backupStatus.maxBackups)} />
              </Field>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={createBackup} variant="default" disabled={saving} className="gap-2 transition-colors">
                <Download className="h-4 w-4" /> {saving ? 'Création...' : 'Créer une sauvegarde'}
              </Button>
              <Button variant="outline" onClick={() => setShowRestoreDialog(true)} className="gap-2 transition-colors">
                <Upload className="h-4 w-4" /> Restaurer
              </Button>
            </div>

            {/* Backup history */}
            {backupHistory.length > 0 && (
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-muted-foreground">Historique récent</Label>
                <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl border">
                  {backupHistory.slice(0, 5).map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-3 hover:bg-muted/30 transition-colors first:rounded-t-xl last:rounded-b-xl">
                      <div className="flex items-center gap-2 min-w-0">
                        <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-mono text-xs truncate">{b.filename}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">
                        {(b.size / 1024).toFixed(1)} Ko &middot; {new Date(b.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════ NOTIFICATIONS ═══════════════ */}
      <section>
        <SectionHeader icon={Bell} title="Notifications" description="Paramètres de notification système" />
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="p-6 space-y-3">
            {[
              { key: 'notificationEnabled', label: 'Notifications activées', helper: 'Activer les notifications du système', icon: Bell },
              { key: 'notificationSoundEnabled', label: 'Sons des notifications', helper: 'Jouer un son lors des alertes', icon: Zap },
              { key: 'notificationPersistentAlerts', label: 'Alertes persistantes', helper: "Les alertes restent visibles jusqu'à confirmation", icon: AlertTriangle },
              { key: 'notificationLowStockAlerts', label: 'Alertes stock faible', helper: 'Notification quand le stock est bas', icon: Info },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.helper}</p>
                  </div>
                </div>
                <Switch checked={notifSettings[item.key] || false} onCheckedChange={(v) => toggleNotif(item.key, v)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════ KIOSK ═══════════════ */}
      <section>
        <SectionHeader icon={Shield} title="Mode Kiosque" description="Mode sécurisé pour utilisation publique" />
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'kioskFullscreen', label: 'Plein écran', helper: 'Afficher en plein écran sans barre de titre', icon: Monitor },
                { key: 'kioskEmergencyExit', label: "Sortie d'urgence (Ctrl+Q)", helper: 'Permettre la fermeture via Ctrl+Q', icon: Zap },
                { key: 'kioskHideCursor', label: 'Masquer le curseur', helper: 'Masquer le curseur de la souris', icon: Info },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.helper}</p>
                    </div>
                  </div>
                  <Switch checked={kioskSettings[item.key] || false} onCheckedChange={(v) => toggleKiosk(item.key, v)} />
                </div>
              ))}
            </div>

            <Separator />

            {isAdminOrManager ? (
              <Button
                onClick={toggleKioskMode}
                variant={kioskSettings.kioskEnabled ? 'destructive' : 'default'}
                className="w-full sm:w-auto gap-2 transition-colors"
              >
                <Shield className="h-4 w-4" />
                {kioskSettings.kioskEnabled ? 'Désactiver le mode kiosque' : 'Activer le mode kiosque'}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Le mode kiosque nécessite un compte admin ou manager.</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════ KEYBOARD ═══════════════ */}
      <section>
        <SectionHeader icon={Keyboard} title="Raccourcis Clavier" description="Configuration des raccourcis clavier globaux" />
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="p-6 space-y-3">
            {[
              { key: 'keyboardEnabled', label: 'Raccourcis activés', helper: 'Activer les raccourcis clavier globaux', icon: Keyboard },
              { key: 'keyboardSoundEnabled', label: 'Son des raccourcis', helper: 'Jouer un son lors de l\'utilisation des raccourcis', icon: Zap },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.helper}</p>
                  </div>
                </div>
                <Switch checked={kbSettings[item.key] || false} onCheckedChange={(v) => toggleKb(item.key, v)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════ PRINTER DIALOG ═══════════════ */}
      <Dialog open={showPrinterDialog} onOpenChange={setShowPrinterDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPrinter ? 'Modifier l\’imprimante' : 'Ajouter une imprimante'}</DialogTitle>
            <DialogDescription>Configurez les paramètres de l'imprimante</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Nom" helper="Nom distinctif de l'imprimante">
              <Input value={printerForm.name} onChange={(e) => setPrinterForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Imprimante Cuisine 1" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <Select value={printerForm.printer_type} onValueChange={(v) => setPrinterForm(p => ({ ...p, printer_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRINTER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Connexion">
                <Select value={printerForm.connection_type} onValueChange={(v) => setPrinterForm(p => ({ ...p, connection_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONNECTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            {(printerForm.connection_type === 'ethernet' || printerForm.connection_type === 'network_ip') && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Adresse IP"><Input value={printerForm.ip_address || ''} onChange={(e) => setPrinterForm(p => ({ ...p, ip_address: e.target.value }))} placeholder="192.168.1.100" /></Field>
                <Field label="Port"><Input value={printerForm.port || '9100'} onChange={(e) => setPrinterForm(p => ({ ...p, port: e.target.value }))} /></Field>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Largeur papier">
                <Select value={String(printerForm.paper_width || 80)} onValueChange={(v) => setPrinterForm(p => ({ ...p, paper_width: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58">58 mm</SelectItem>
                    <SelectItem value="80">80 mm</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Encodage">
                <Select value={printerForm.character_encoding || 'PC437'} onValueChange={(v) => setPrinterForm(p => ({ ...p, character_encoding: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PC437">PC437</SelectItem>
                    <SelectItem value="UTF-8">UTF-8</SelectItem>
                    <SelectItem value="ISO-8859-1">ISO-8859-1</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <Field label="Coupe automatique" helper="Couper le papier après impression"><div /></Field>
                <Switch checked={printerForm.auto_cut} onCheckedChange={(v) => setPrinterForm(p => ({ ...p, auto_cut: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <Field label="Ouvrir tiroir après impression" helper="Envoyer le signal d'ouverture"><div /></Field>
                <Switch checked={printerForm.open_drawer_after_print} onCheckedChange={(v) => setPrinterForm(p => ({ ...p, open_drawer_after_print: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <Field label="Imprimante par défaut" helper="Utilisée pour les reçus généraux"><div /></Field>
                <Switch checked={printerForm.is_default} onCheckedChange={(v) => setPrinterForm(p => ({ ...p, is_default: v }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrinterDialog(false)}>Annuler</Button>
            <Button onClick={savePrinter} disabled={!printerForm.name || saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ DELETE PRINTER DIALOG ═══════════════ */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2 h-5 w-5" /> Supprimer l'imprimante</DialogTitle>
            <DialogDescription>Êtes-vous sûr de vouloir supprimer «{deleteTarget?.name}» ? Cette action est irréversible.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={deletePrinter} disabled={saving}>{saving ? 'Suppression...' : 'Supprimer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ ADD DEPARTMENT DIALOG ═══════════════ */}
      <Dialog open={showAddDeptDialog} onOpenChange={setShowAddDeptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un département</DialogTitle>
            <DialogDescription>Nom du nouveau département (ex: Plongerie, Take-Away...)</DialogDescription>
          </DialogHeader>
          <Field label="Nom du département">
            <Input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="Ex: Plongerie" autoFocus />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDeptDialog(false)}>Annuler</Button>
            <Button onClick={addDepartment} disabled={!newDeptName.trim()}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ RESTORE DIALOG ═══════════════ */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurer une sauvegarde</DialogTitle>
            <DialogDescription>Sélectionnez un fichier JSON exporté pour restaurer la configuration. Cette action écrase toutes les données actuelles.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={handleRestoreFile} />
            <Button variant="outline" className="w-full" onClick={() => restoreRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Choisir un fichier</Button>
            {restoreFile && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Database className="h-4 w-4" /> {restoreFile.name} ({Math.round(restoreFile.size / 1024)} Ko)
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRestoreDialog(false); setRestoreFile(null); }}>Annuler</Button>
            <Button onClick={executeRestore} disabled={!restoreFile || saving} variant="destructive">{saving ? 'Restauration...' : 'Restaurer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
