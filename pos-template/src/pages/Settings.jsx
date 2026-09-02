import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePermissions } from '../contexts/PermissionsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '../components/ui/dialog';
import {
  Settings as SettingsIcon, Shield, Palette, Database, Printer, Info, Plus, Trash2,
  Percent, Edit2, Download, Upload, RefreshCw, Search, Save, AlertTriangle, X,
  ChevronRight, Building2, Globe, Clock, Receipt, Lock, Zap, Check,
  FileText, HardDrive, Bell, Image as ImageIcon, ChefHat
} from 'lucide-react';
import { useAppConfig } from '../hooks/useAppConfig';
import { useLicense } from '../hooks/useLicense';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../hooks/use-toast';
import ReceiptDesigner from './ReceiptDesigner';

const CURRENCIES = [
  { value: 'TND', label: 'Dinar Tunisien (DT)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dollar ($)' },
  { value: 'GBP', label: 'Livre (£)' },
  { value: 'CHF', label: 'Franc suisse (CHF)' }
];
const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' }
];
const TIMEZONES = [
  { value: 'Africa/Tunis', label: 'Africa/Tunis (CET)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' }
];
const DEFAULT_SETTINGS = {
  businessName: '', businessLogo: '', businessAddress: '', businessPhone: '',
  businessEmail: '', businessWebsite: '', businessTaxId: '', currency: 'TND',
  taxEnabled: true, numberFormat: 'fr-FR', language: 'fr', timezone: 'Africa/Tunis',
  printReceipts: true, printKitchen: true, receiptPrinter: '', kitchenPrinter: '',
  paperWidth: '80', soundEnabled: true, theme: 'default',
  autoLockEnabled: true, autoLockTimeout: 10,
  autoBackup: false
};

const MODULES = [
  { id: 'general', title: 'Général', description: 'Informations de l\'entreprise, devise, langue...', icon: Building2, color: 'bg-blue-500' },
  { id: 'kitchen', title: 'Départements Cuisine', description: 'Gérer les départements de préparation...', icon: ChefHat, color: 'bg-amber-500' },
  { id: 'receipt', title: 'Tickets', description: 'Conception et personnalisation des reçus...', icon: Receipt, color: 'bg-purple-500' },
  { id: 'backup', title: 'Sauvegardes', description: 'Sauvegarde et restauration des données...', icon: HardDrive, color: 'bg-amber-500' },
  { id: 'appearance', title: 'Apparence', description: 'Thème, sons et personnalisation...', icon: Palette, color: 'bg-pink-500' },
];

const SIDEBAR_ITEMS = [
  { id: 'general', label: 'Général', icon: SettingsIcon },
  { id: 'kitchen', label: 'Départements Cuisine', icon: ChefHat },
  { id: 'receipt', label: 'Tickets', icon: Receipt },
  { id: 'backup', label: 'Sauvegardes', icon: HardDrive },
  { id: 'appearance', label: 'Apparence', icon: Palette },
  { id: 'system', label: 'Système', icon: Info },
];

function validateField(key, value) {
  const str = String(value || '');
  switch (key) {
    case 'businessEmail': if (str && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return 'Email invalide'; break;
    case 'businessWebsite': if (str) { try { new URL(str); } catch { return 'URL invalide'; } } break;
    case 'businessPhone': if (str && !/^[\d\s\+\-\(\)]{4,20}$/.test(str)) return 'Numéro de téléphone invalide'; break;
  }
  return null;
}

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

function SkeletonSettings() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-8 w-48" />
      <SkeletonBlock className="h-4 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1,2,3,4].map(i => (
          <Card key={i}><CardContent className="p-6 space-y-4">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-4 w-48" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const { config } = useAppConfig();
  const { license } = useLicense();
  const { settings: dbSettings, loading: dbLoading, setMultipleSettings, reload } = useSettings();
  const { toast } = useToast();
  const { canCreate, canUpdate, canDelete, readOnly } = usePermissions('settings');
  const permsRef = useRef({ canCreate, canUpdate, canDelete });
  permsRef.current = { canCreate, canUpdate, canDelete };
  const permGuard = useCallback((action) => {
    const p = permsRef.current;
    const ok = action === 'create' ? p.canCreate : action === 'delete' ? p.canDelete : p.canUpdate;
    if (!ok) toast?.({ title: 'Action non autorisée', description: 'Accès en lecture seule sur les paramètres.', variant: 'destructive' });
    return ok;
  }, [toast]);

  const [activeModule, setActiveModule] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dbPath, setDbPath] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  const [vatRates, setVatRates] = useState([]);
  const [newVatRate, setNewVatRate] = useState({ name: '', rate: '' });
  const [editingVatRate, setEditingVatRate] = useState(null);

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const importRef = useRef(null);

  const [kitchenDepartments, setKitchenDepartments] = useState([]);
  const [kitchenLoading, setKitchenLoading] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptIcon, setNewDeptIcon] = useState('');
  const [editingDept, setEditingDept] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptIcon, setEditDeptIcon] = useState('');
  const [showDeleteDeptConfirm, setShowDeleteDeptConfirm] = useState(null);

  const isKitchenEnabled = config?.modules
    ? config.modules.some(m => (m.name || m) === 'kitchen' && m.isEnabled !== false)
    : false;

  const loadKitchenDepartments = useCallback(async () => {
    if (!isKitchenEnabled) return;
    setKitchenLoading(true);
    try {
      if (window.electronAPI?.getKitchenDepartments) {
        const data = await window.electronAPI.getKitchenDepartments();
        setKitchenDepartments(data || []);
      }
    } catch (e) { console.warn('Could not load kitchen departments:', e); }
    finally { setKitchenLoading(false); }
  }, [isKitchenEnabled]);

  useEffect(() => { loadKitchenDepartments(); }, [loadKitchenDepartments]);

  const handleAddKitchenDept = async () => {
    if (!newDeptName.trim()) return;
    if (!permGuard('create')) return;
    try {
      await window.electronAPI.addKitchenDepartment({ name: newDeptName.trim(), icon: newDeptIcon.trim() || null, is_active: 1 });
      setNewDeptName(''); setNewDeptIcon('');
      toast({ title: 'Département ajouté' });
      await loadKitchenDepartments();
    } catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };

  const handleUpdateKitchenDept = async (id) => {
    if (!editDeptName.trim()) return;
    if (!permGuard('update')) return;
    try {
      await window.electronAPI.updateKitchenDepartment(id, { name: editDeptName.trim(), icon: editDeptIcon.trim() || null });
      setEditingDept(null);
      toast({ title: 'Département mis à jour' });
      await loadKitchenDepartments();
    } catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };

  const handleToggleKitchenDept = async (id, isActive) => {
    if (!permGuard('update')) return;
    try {
      await window.electronAPI.updateKitchenDepartment(id, { is_active: isActive ? 0 : 1 });
      await loadKitchenDepartments();
    } catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };

  const handleDeleteKitchenDept = async (id) => {
    if (!permGuard('delete')) return;
    try {
      await window.electronAPI.deleteKitchenDepartment(id);
      setShowDeleteDeptConfirm(null);
      toast({ title: 'Département supprimé' });
      await loadKitchenDepartments();
    } catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };

  useEffect(() => { if (window.electronAPI?.getDatabasePath) window.electronAPI.getDatabasePath().then(setDbPath).catch(() => {}); }, []);

  useEffect(() => {
    if (dbSettings && Object.keys(dbSettings).length > 0) {
      setSettings(prev => ({
        ...prev,
        businessName: dbSettings.businessName ?? prev.businessName,
        businessLogo: dbSettings.businessLogo ?? prev.businessLogo,
        businessAddress: dbSettings.businessAddress ?? prev.businessAddress,
        businessPhone: dbSettings.businessPhone ?? prev.businessPhone,
        businessEmail: dbSettings.businessEmail ?? prev.businessEmail,
        businessWebsite: dbSettings.businessWebsite ?? prev.businessWebsite,
        businessTaxId: dbSettings.businessTaxId ?? prev.businessTaxId,
        currency: dbSettings.currency ?? prev.currency,
        taxEnabled: dbSettings.taxEnabled ?? prev.taxEnabled,
        numberFormat: dbSettings.numberFormat ?? prev.numberFormat,
        language: dbSettings.language ?? prev.language,
        timezone: dbSettings.timezone ?? prev.timezone,
        printReceipts: dbSettings.printReceipts ?? prev.printReceipts,
        printKitchen: dbSettings.printKitchen ?? prev.printKitchen,
        receiptPrinter: dbSettings.receiptPrinter ?? prev.receiptPrinter,
        kitchenPrinter: dbSettings.kitchenPrinter ?? prev.kitchenPrinter,
        paperWidth: dbSettings.paperWidth ?? prev.paperWidth,
        soundEnabled: dbSettings.soundEnabled ?? prev.soundEnabled,
        theme: dbSettings.theme ?? prev.theme,
        autoLockEnabled: dbSettings.autoLockEnabled ?? prev.autoLockEnabled,
        autoLockTimeout: dbSettings.autoLockTimeout ?? prev.autoLockTimeout,
        autoBackup: dbSettings.autoBackup ?? prev.autoBackup
      }));
    }
  }, [dbSettings]);

  useEffect(() => {
    if (config) {
      setSettings(prev => ({
        ...prev,
        businessName: prev.businessName ?? config.theme?.businessName ?? '',
        currency: prev.currency ?? config.theme?.currency ?? 'TND',
        language: prev.language ?? config.theme?.language ?? 'fr',
        timezone: prev.timezone ?? config.theme?.timezone ?? 'Africa/Tunis',
      }));
    }
  }, [config]);

  useEffect(() => { loadVatRates(); }, []);
  const loadVatRates = async () => { try { if (window.electronAPI?.getVatRates) setVatRates(await window.electronAPI.getVatRates() || []); } catch {} };

  const handleSettingChange = (key, value) => { if (readOnly) return; setSettings(prev => ({ ...prev, [key]: value })); setDirty(true); };
  const handleSave = async () => {
    if (!permGuard('update')) return;
    for (const [key, value] of Object.entries(settings)) { const err = validateField(key, value); if (err) { toast({ title: 'Validation', description: `${key}: ${err}`, variant: 'destructive' }); return; } }
    setLoading(true);
    try {
      const result = await setMultipleSettings(settings);
      if (result.success) {
        await reload();
        setDirty(false);
        window.dispatchEvent(new Event('pos:settings-changed'));
        toast({ title: 'Paramètres sauvegardés' });
      } else {
        if (result.failed && result.failed.length > 0) {
          const names = result.failed.slice(0, 3).map(f => f.key).join(', ');
          toast({ title: 'Erreur partielle', description: `${result.failed.length} paramètre(s) non sauvegardés: ${names}${result.failed.length > 3 ? '...' : ''}`, variant: 'destructive' });
        } else {
          toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
        }
        await reload();
      }
    }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  const confirmReset = () => { setSettings(DEFAULT_SETTINGS); setDirty(true); setShowResetDialog(false); toast({ title: 'Paramètres réinitialisés', description: 'Sauvegardez pour appliquer.' }); };
  const handleExport = async () => {
    try { if (window.electronAPI?.exportSettings) { const r = await window.electronAPI.exportSettings(); if (r.success) { const b = new Blob([r.data], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `carthapos-settings-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(u); setShowExportDialog(false); toast({ title: 'Export réussi' }); } } }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };
  const handleImportFile = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => setImportJson(ev.target.result); reader.readAsText(file); e.target.value = ''; };
  const handleImport = async () => {
    if (!importJson.trim()) return;
    if (!permGuard('update')) return;
    try { if (window.electronAPI?.importSettings) { const r = await window.electronAPI.importSettings(importJson); if (r.success) { await reload(); setImportJson(''); setShowImportDialog(false); toast({ title: 'Import réussi', description: `${r.count} paramètres importés.` }); } else { toast({ title: 'Erreur', description: r.error, variant: 'destructive' }); } } }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };
  const handleAddVatRate = async () => {
    if (!newVatRate.name || !newVatRate.rate) return;
    if (!permGuard('create')) return;
    try { await window.electronAPI.addVatRate({ name: newVatRate.name, rate: parseFloat(newVatRate.rate), is_active: true }); setNewVatRate({ name: '', rate: '' }); loadVatRates(); }
    catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  };
  const handleUpdateVatRate = async (id, updates) => { if (!permGuard('update')) return; try { await window.electronAPI.updateVatRate(id, updates); loadVatRates(); } catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); } };
  const handleDeleteVatRate = async (id) => { if (!permGuard('delete')) return; try { await window.electronAPI.deleteVatRate(id); loadVatRates(); } catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); } };

  const matchSearch = (text) => !globalSearch || text.toLowerCase().includes(globalSearch.toLowerCase());
  const s = settings;

  // ── Dashboard Landing ──
  if (!activeModule) {
    return (
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="max-w-5xl mx-auto p-8 space-y-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
            <p className="text-muted-foreground mt-1">Configurez votre système CarthaPOS</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un paramètre..." className="pl-10 h-11" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.filter(m => !(m.id === 'kitchen' && !isKitchenEnabled)).filter(m => !globalSearch || m.title.toLowerCase().includes(globalSearch.toLowerCase()) || m.description.toLowerCase().includes(globalSearch.toLowerCase())).map(m => (
              <button key={m.id} onClick={() => setActiveModule(m.id)}
                className="group text-left p-6 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20">
                <div className={`w-10 h-10 rounded-lg ${m.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <m.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                  {m.title}
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-sm text-muted-foreground">{m.description}</p>
              </button>
            ))}
          </div>
          {license && (
            <Card className="bg-muted/30">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Shield className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="font-medium">{license.clientName || 'CarthaPOS'}</p>
                    <p className="text-sm text-muted-foreground">Licence {license.licenseType === 'LIFETIME' ? 'à vie' : 'Abonnement'} — {license.sector || 'Général'}</p>
                  </div>
                </div>
                <Badge variant={license.licenseType === 'LIFETIME' ? 'default' : 'secondary'}>{license.modules?.filter(m => m.isEnabled).length || 0} modules</Badge>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    );
  }

  // ── Sub-pages ──
  if (activeModule === 'receipt') return <SettingsLayout active="receipt" onBack={() => setActiveModule(null)} onNavigate={setActiveModule} isKitchenEnabled={isKitchenEnabled}><ReceiptDesigner /></SettingsLayout>;

  // ── General / Backup / Appearance / System pages ──
  return (
    <SettingsLayout active={activeModule} onBack={() => setActiveModule(null)} onNavigate={setActiveModule} isKitchenEnabled={isKitchenEnabled}>
      {readOnly && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0" />
          Accès en lecture seule : vous pouvez consulter les paramètres mais pas les modifier.
        </div>
      )}
      {activeModule === 'general' && (
        <div className="space-y-8">
          <SectionHeader icon={Building2} title="Informations de l'entreprise" description="Nom, adresse et coordonnées de votre établissement" />
          <Card>
            <CardContent className="p-6 space-y-5">
              <Field label="Nom de l'établissement" helper="Affiché sur les tickets et l'interface">
                <Input value={s.businessName} onChange={(e) => handleSettingChange('businessName', e.target.value)} placeholder="Mon Restaurant" />
              </Field>
              <Field label="Logo de l'entreprise" helper="Image affichée sur les tickets et l'interface">
                <div className="space-y-3">
                  {s.businessLogo ? (
                    <div className="relative group">
                      <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/30">
                        <div className="w-20 h-20 rounded-lg bg-white border flex items-center justify-center overflow-hidden shrink-0">
                          <img src={s.businessLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">Logo actuel</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {s.businessLogo.startsWith('data:') ? 'Image téléchargée' : 'URL externe'}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors">
                              <RefreshCw className="w-3 h-3" />
                              Remplacer
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => { handleSettingChange('businessLogo', ev.target.result); };
                                reader.readAsDataURL(file);
                              }} />
                            </label>
                            <Button variant="ghost" size="sm" className="h-auto py-1.5 px-3 text-xs text-destructive hover:text-destructive" onClick={() => handleSettingChange('businessLogo', '')}>
                              <Trash2 className="w-3 h-3 mr-1" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/40 mb-2" />
                      <span className="text-sm font-medium text-muted-foreground">Cliquer ou glisser une image</span>
                      <span className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, SVG (max 2 Mo)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            toast({ title: 'Fichier trop volumineux', description: 'Taille maximale : 2 Mo', variant: 'destructive' });
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => { handleSettingChange('businessLogo', ev.target.result); };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </Field>
              <Field label="Adresse">
                <Input value={s.businessAddress} onChange={(e) => handleSettingChange('businessAddress', e.target.value)} placeholder="123 Rue Principale, Tunis" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Téléphone"><Input value={s.businessPhone} onChange={(e) => handleSettingChange('businessPhone', e.target.value)} placeholder="+216 71 000 000" /></Field>
                <Field label="Email"><Input type="email" value={s.businessEmail} onChange={(e) => handleSettingChange('businessEmail', e.target.value)} placeholder="contact@monrestaurant.tn" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Site web"><Input value={s.businessWebsite} onChange={(e) => handleSettingChange('businessWebsite', e.target.value)} placeholder="https://monrestaurant.tn" /></Field>
                <Field label="N° fiscal / SIRET"><Input value={s.businessTaxId} onChange={(e) => handleSettingChange('businessTaxId', e.target.value)} placeholder="12345678900000" /></Field>
              </div>
            </CardContent>
          </Card>

          <SectionHeader icon={Globe} title="Régionalisation" description="Devise, langue et paramètres régionaux" />
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Devise">
                  <Select value={s.currency} onValueChange={(v) => handleSettingChange('currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Langue">
                  <Select value={s.language} onValueChange={(v) => handleSettingChange('language', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Fuseau horaire">
                  <Select value={s.timezone} onValueChange={(v) => handleSettingChange('timezone', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEZONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Format des nombres">
                  <Select value={s.numberFormat} onValueChange={(v) => handleSettingChange('numberFormat', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr-FR">1 234,56 (FR)</SelectItem>
                      <SelectItem value="en-US">1,234.56 (US)</SelectItem>
                      <SelectItem value="de-DE">1.234,56 (DE)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </CardContent>
          </Card>

          <SectionHeader icon={Percent} title="TVA" description="Gestion des taux de TVA" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>TVA activée</Label><p className="text-sm text-muted-foreground">Appliquer la TVA sur les ventes</p></div>
                <Switch checked={s.taxEnabled} onCheckedChange={(v) => handleSettingChange('taxEnabled', v)} />
              </div>
              <Separator />
              <div className="space-y-3">
                {vatRates.length === 0 ? (
                  <div className="text-center py-8"><Percent className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" /><p className="text-sm text-muted-foreground">Aucun taux de TVA configuré</p></div>
                ) : vatRates.map((vr) => (
                  <div key={vr.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    {editingVatRate?.id === vr.id ? (
                      <>
                        <Input className="flex-1 h-8 text-sm" value={editingVatRate.name} onChange={(e) => setEditingVatRate({ ...editingVatRate, name: e.target.value })} placeholder="Nom" />
                        <div className="flex items-center gap-1"><Input className="w-20 h-8 text-sm text-right" type="number" step="0.1" min="0" max="100" value={editingVatRate.rate} onChange={(e) => setEditingVatRate({ ...editingVatRate, rate: e.target.value })} /><Percent className="w-3.5 h-3.5 text-muted-foreground" /></div>
                        <Button size="sm" className="h-8 px-3" onClick={() => { handleUpdateVatRate(vr.id, { name: editingVatRate.name, rate: parseFloat(editingVatRate.rate), is_active: vr.is_active }); setEditingVatRate(null); }}>OK</Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingVatRate(null)}><X className="h-4 w-4" /></Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1"><span className="font-medium text-sm">{vr.name}</span></div>
                        <Badge variant="secondary" className="font-mono">{vr.rate}%</Badge>
                        <Switch checked={!!vr.is_active} onCheckedChange={(v) => handleUpdateVatRate(vr.id, { name: vr.name, rate: vr.rate, is_active: v })} />
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingVatRate({ id: vr.id, name: vr.name, rate: String(vr.rate) })}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteVatRate(vr.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Input className="flex-1 h-9 text-sm" value={newVatRate.name} onChange={(e) => setNewVatRate({ ...newVatRate, name: e.target.value })} placeholder="Nom (ex: TVA 7%)" onKeyDown={(e) => e.key === 'Enter' && handleAddVatRate()} />
                  <div className="flex items-center gap-1"><Input className="w-20 h-9 text-sm text-right" type="number" step="0.1" min="0" max="100" value={newVatRate.rate} onChange={(e) => setNewVatRate({ ...newVatRate, rate: e.target.value })} placeholder="0" onKeyDown={(e) => e.key === 'Enter' && handleAddVatRate()} /><Percent className="w-3.5 h-4 text-muted-foreground" /></div>
                  <Button size="sm" className="h-9 px-3" onClick={handleAddVatRate} disabled={!newVatRate.name || !newVatRate.rate}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <SectionHeader icon={Lock} title="Verrouillage automatique" description="Configurer le verrouillage automatique de la session en cas d'inactivité" />
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Verrouillage automatique</Label>
                  <p className="text-sm text-muted-foreground">Verrouiller l'écran après une période d'inactivité</p>
                </div>
                <Switch checked={!!s.autoLockEnabled} onCheckedChange={(v) => handleSettingChange('autoLockEnabled', v)} />
              </div>
              {s.autoLockEnabled && (
                <>
                  <Separator />
                  <Field label="Délai d'inactivité (minutes)" helper="Temps sans activité avant le verrouillage automatique">
                    <div className="flex items-center gap-3">
                      {[5, 10, 15, 30, 60].map((mins) => (
                        <Button
                          key={mins}
                          variant={Number(s.autoLockTimeout) === mins ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSettingChange('autoLockTimeout', mins)}
                          className="h-9 px-4"
                        >
                          {mins} min
                        </Button>
                      ))}
                    </div>
                  </Field>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeModule === 'kitchen' && (
        <div className="space-y-8">
          <SectionHeader icon={ChefHat} title="Départements Cuisine" description="Gérer les départements de préparation utilisés dans le workflow cuisine" />

          {/* Add new department */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-end gap-3">
                <div className="flex-1 grid gap-2">
                  <Label>Nom du département</Label>
                  <Input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="Ex: Plongerie, Pâtisserie..." onKeyDown={(e) => e.key === 'Enter' && handleAddKitchenDept()} />
                </div>
                <div className="w-24 grid gap-2">
                  <Label>Icône (emoji)</Label>
                  <Input value={newDeptIcon} onChange={(e) => setNewDeptIcon(e.target.value)} placeholder="🍽️" maxLength={4} />
                </div>
                <Button onClick={handleAddKitchenDept} disabled={!newDeptName.trim()} className="gap-2">
                  <Plus className="h-4 w-4" /> Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Department list */}
          {kitchenLoading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" /></div>
          ) : kitchenDepartments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-10 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <ChefHat className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Aucun département</h3>
                <p className="text-xs text-muted-foreground/70 max-w-xs">Ajoutez des départements pour organiser la préparation de vos produits.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {kitchenDepartments.map((dept, idx) => (
                <Card key={dept.id} className={`transition-all duration-200 hover:shadow-md hover:border-primary/20 ${dept.is_active ? '' : 'opacity-50'}`} style={{ animationDelay: `${idx * 50}ms` }}>
                  <CardContent className="p-4 flex items-center gap-4">
                    {editingDept === dept.id ? (
                      <>
                        <Input value={editDeptName} onChange={(e) => setEditDeptName(e.target.value)} className="flex-1 h-9" onKeyDown={(e) => e.key === 'Enter' && handleUpdateKitchenDept(dept.id)} autoFocus />
                        <Input value={editDeptIcon} onChange={(e) => setEditDeptIcon(e.target.value)} className="w-16 h-9 text-center" maxLength={4} placeholder="🍽️" />
                        <Button size="sm" onClick={() => handleUpdateKitchenDept(dept.id)} disabled={!editDeptName.trim()} className="gap-1"><Check className="h-4 w-4" /> OK</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingDept(null)}><X className="h-4 w-4" /></Button>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl bg-amber-50 border border-amber-100 shrink-0 transition-transform hover:scale-110">{dept.icon || '🍽️'}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm">{dept.name}</span>
                          {dept.product_count !== undefined && <span className="text-xs text-muted-foreground ml-2">({dept.product_count} produit{dept.product_count !== 1 ? 's' : ''})</span>}
                        </div>
                        <Badge variant={dept.is_active ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0.5">
                          {dept.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                        <Switch checked={dept.is_active === 1 || dept.is_active === true} onCheckedChange={() => handleToggleKitchenDept(dept.id, dept.is_active)} />
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => { setEditingDept(dept.id); setEditDeptName(dept.name); setEditDeptIcon(dept.icon || ''); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => setShowDeleteDeptConfirm(dept)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Delete confirmation dialog */}
          <Dialog open={!!showDeleteDeptConfirm} onOpenChange={() => setShowDeleteDeptConfirm(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center text-orange-600"><AlertTriangle className="mr-2 h-5 w-5" /> Supprimer le département</DialogTitle>
                <DialogDescription>
                  Supprimer "{showDeleteDeptConfirm?.name}" ? Les produits associés ne seront plus liés à ce département.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDeptConfirm(null)}>Annuler</Button>
                <Button variant="destructive" onClick={() => handleDeleteKitchenDept(showDeleteDeptConfirm?.id)}>Supprimer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {activeModule === 'backup' && (
        <div className="space-y-8">
          <SectionHeader icon={HardDrive} title="Sauvegardes" description="Sauvegardez et restaurez vos données" />
          <Card><CardContent className="p-6 flex items-center justify-between">
            <div><Label>Sauvegarde automatique</Label><p className="text-sm text-muted-foreground">Créer des sauvegardes périodiques</p></div>
            <Switch checked={!!s.autoBackup} onCheckedChange={(v) => handleSettingChange('autoBackup', v)} />
          </CardContent></Card>
          <Card><CardContent className="p-6 space-y-4">
            <div className="flex gap-3">
              <Button onClick={async () => { try { const r = await window.electronAPI.createBackup(); if (r.success) toast({ title: 'Sauvegarde créée', description: r.filename }); } catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); } }}><Download className="mr-2 h-4 w-4" /> Créer une sauvegarde</Button>
              <Button variant="outline" onClick={() => setShowImportDialog(true)}><Upload className="mr-2 h-4 w-4" /> Restaurer</Button>
            </div>
          </CardContent></Card>
        </div>
      )}

      {activeModule === 'appearance' && (
        <div className="space-y-8">
          <SectionHeader icon={Palette} title="Apparence" description="Thème et personnalisation de l'interface" />
          <Card><CardContent className="p-6 space-y-5">
            <Field label="Thème">
              <Select value={s.theme} onValueChange={(v) => handleSettingChange('theme', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Défaut</SelectItem><SelectItem value="dark">Sombre</SelectItem><SelectItem value="light">Clair</SelectItem><SelectItem value="blue">Bleu</SelectItem><SelectItem value="green">Vert</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Separator />
            <div className="flex items-center justify-between">
              <div><Label>Sons système</Label><p className="text-sm text-muted-foreground">Activer les notifications sonores</p></div>
              <Switch checked={s.soundEnabled} onCheckedChange={(v) => handleSettingChange('soundEnabled', v)} />
            </div>
          </CardContent></Card>
        </div>
      )}

      {activeModule === 'system' && (
        <div className="space-y-8">
          <SectionHeader icon={Info} title="Système" description="Informations sur l'application et la base de données" />
          <Card><CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div><Label className="text-sm font-medium text-muted-foreground">Version</Label><p className="text-sm mt-1">1.0.0</p></div>
              <div><Label className="text-sm font-medium text-muted-foreground">Base de données</Label><p className="text-sm mt-1">SQLite</p></div>
            </div>
            <div><Label className="text-sm font-medium text-muted-foreground">Emplacement</Label><p className="text-xs mt-1 break-all font-mono text-muted-foreground">{dbPath || 'Indisponible'}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-6">
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowExportDialog(true)}><Download className="mr-2 h-4 w-4" /> Exporter la config</Button>
              <Button variant="outline" onClick={() => setShowImportDialog(true)}><Upload className="mr-2 h-4 w-4" /> Importer la config</Button>
              <Button variant="outline" onClick={() => setShowResetDialog(true)} className="text-destructive border-destructive/30 hover:bg-destructive/5"><AlertTriangle className="mr-2 h-4 w-4" /> Réinitialiser</Button>
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* Save bar */}
      {dirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Card className="shadow-lg border-primary/20 bg-background/95 backdrop-blur">
            <CardContent className="p-3 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Modifications non enregistrées</span>
              <Button variant="outline" size="sm" onClick={() => { setSettings(dbSettings || DEFAULT_SETTINGS); setDirty(false); }}>Annuler</Button>
              <Button size="sm" onClick={handleSave} disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent><DialogHeader><DialogTitle>Exporter la configuration</DialogTitle><DialogDescription>Tous les paramètres seront exportés en JSON.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setShowExportDialog(false)}>Annuler</Button><Button onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Exporter</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent><DialogHeader><DialogTitle>Importer la configuration</DialogTitle><DialogDescription>Les paramètres existants seront écrasés.</DialogDescription></DialogHeader>
          <div className="space-y-4"><input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} /><Button variant="outline" className="w-full" onClick={() => importRef.current?.click()}><Upload className="h-4 w-4 mr-2" /> Choisir un fichier</Button>{importJson && <div className="text-sm text-green-600 flex items-center gap-2"><Database className="h-4 w-4" /> Fichier chargé ({Math.round(importJson.length / 1024)} Ko)</div>}</div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowImportDialog(false); setImportJson(''); }}>Annuler</Button><Button onClick={handleImport} disabled={!importJson}><Upload className="h-4 w-4 mr-1" /> Importer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent><DialogHeader><DialogTitle className="flex items-center text-orange-600"><AlertTriangle className="mr-2 h-5 w-5" /> Réinitialiser</DialogTitle><DialogDescription>Restaurer les valeurs par défaut ? Sauvegardez pour appliquer.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setShowResetDialog(false)}>Annuler</Button><Button variant="destructive" onClick={confirmReset}>Réinitialiser</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}

// ── Shared Layout Components ──

function SettingsLayout({ children, active, onBack, onNavigate, isKitchenEnabled }) {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <aside className="w-56 shrink-0 border-r bg-muted/20 hidden md:block">
        <div className="p-4">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ChevronRight className="h-4 w-4 rotate-180" /> Tous les paramètres
          </button>
          <nav className="space-y-1">
            {SIDEBAR_ITEMS.filter(item => !(item.id === 'kitchen' && !isKitchenEnabled)).map(item => (
              <button key={item.id} onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active === item.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <ScrollArea className="h-full">
          <div className="max-w-4xl p-8">{children}</div>
        </ScrollArea>
      </main>
    </div>
  );
}

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
