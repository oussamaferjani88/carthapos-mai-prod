import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, User, Phone, Mail, MapPin, Star, Edit2, Trash2, Gift,
  ShoppingBag, TrendingUp, Award, Heart, Clock, DollarSign, Receipt, X,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Tag, FileText,
  Users, BarChart3, Activity, Eye, Power, Check, Loader2, AlertTriangle, CalendarDays,
  Download, Upload, Settings
} from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { getCurrencySymbol } from '../utils/currency';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const LEVELS = [
  { name: 'Bronze', min: 0, color: 'bg-orange-100 text-orange-700', ring: 'ring-orange-200' },
  { name: 'Silver', min: 200, color: 'bg-gray-100 text-gray-700', ring: 'ring-gray-200' },
  { name: 'Gold', min: 500, color: 'bg-yellow-100 text-yellow-700', ring: 'ring-yellow-200' },
  { name: 'Platinum', min: 1000, color: 'bg-purple-100 text-purple-700', ring: 'ring-purple-200' },
];
const PAGE_SIZE = 25;

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous les clients' },
  { value: 'active', label: 'Actifs' },
  { value: 'inactive', label: 'Inactifs' },
  { value: 'with_purchases', label: 'Avec achats' },
  { value: 'without_purchases', label: 'Sans achats' },
  { value: 'recently_added', label: 'Récemment ajoutés' },
  { value: 'recently_active', label: 'Récemment actifs' },
];

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nom A→Z' },
  { value: 'name-desc', label: 'Nom Z→A' },
  { value: 'created_at-desc', label: 'Récents' },
  { value: 'created_at-asc', label: 'Anciens' },
  { value: 'loyalty_points-desc', label: 'Points ↑' },
  { value: 'loyalty_points-asc', label: 'Points ↓' },
  { value: 'total_spent-desc', label: 'Dépensé ↑' },
  { value: 'total_spent-asc', label: 'Dépensé ↓' },
  { value: 'visit_count-desc', label: 'Visites ↑' },
  { value: 'visit_count-asc', label: 'Visites ↓' },
  { value: 'last_visit_date-desc', label: 'Dernière visite ↑' },
  { value: 'last_visit_date-asc', label: 'Dernière visite ↓' },
];

export default function Customers() {
  const { config: electronConfig } = useAppConfig();
  const getConfig = () => {
    if (electronConfig && electronConfig.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    return POSConfiguration.createConfig({});
  };
  const config = getConfig();

  const formatCurrency = (v) => {
    const val = parseFloat(v) || 0;
    return config.currencyPosition === 'before'
      ? `${config.currency}${val.toFixed(2)}`
      : `${val.toFixed(2)} ${config.currency}`;
  };

  const formatPrice = (v) => {
    const val = parseFloat(v) || 0;
    const symbol = getCurrencySymbol(config.currency || 'TND');
    return config.currencyPosition === 'before'
      ? `${symbol}${val.toFixed(2)}`
      : `${val.toFixed(2)} ${symbol}`;
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try { return new Date(d.endsWith('Z') ? d : d + 'Z').toLocaleDateString(); } catch { return '-'; }
  };

  const formatDateTime = (d) => {
    if (!d) return '-';
    try { return new Date(d.endsWith('Z') ? d : d + 'Z').toLocaleString(); } catch { return '-'; }
  };

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', loyalty_points: 0, notes: '', tags: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [detailTab, setDetailTab] = useState('profile');
  const [detailPurchases, setDetailPurchases] = useState([]);
  const [detailStats, setDetailStats] = useState(null);
  const [detailFavorites, setDetailFavorites] = useState([]);
  const [detailActivity, setDetailActivity] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [purchasesFilter, setPurchasesFilter] = useState('all');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const data = await window.electronAPI.getCustomers();
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Le nom est obligatoire';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Format d\'email invalide';
    }
    if (formData.phone && !/^[\d\s\+\-\(\)]{6,}$/.test(formData.phone)) {
      errors.phone = 'Format de téléphone invalide';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        loyalty_points: parseInt(formData.loyalty_points) || 0,
        notes: formData.notes.trim(),
        tags: formData.tags.trim(),
      };
      if (editingCustomer) {
        if (window.electronAPI) {
          await window.electronAPI.updateCustomer(editingCustomer.id, payload);
        }
      } else {
        if (window.electronAPI) {
          await window.electronAPI.addCustomer(payload);
        }
      }
      setDialogOpen(false);
      setEditingCustomer(null);
      resetForm();
      await loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      setFormErrors({ submit: 'Erreur lors de la sauvegarde: ' + (error.message || '') });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', address: '', loyalty_points: 0, notes: '', tags: '' });
    setFormErrors({});
  };

  const openCreateDialog = () => {
    setEditingCustomer(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      loyalty_points: customer.loyalty_points || 0,
      notes: customer.notes || '',
      tags: Array.isArray(customer.tags) ? customer.tags.join(', ') : (customer.tags || ''),
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleDelete = async (customer) => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.deleteCustomer(customer.id);
      setDeleteTarget(null);
      setDeleteError('');
      await loadCustomers();
    } catch (error) {
      setDeleteError(error.message || 'Impossible de supprimer ce client. Il a peut-être des ventes ou rendez-vous associés.');
    }
  };

  const handleToggleActive = async (customer) => {
    try {
      setTogglingId(customer.id);
      if (window.electronAPI) {
        await window.electronAPI.toggleCustomerActive(customer.id);
      }
      await loadCustomers();
    } catch (error) {
      console.error('Error toggling customer:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nom', 'Email', 'Téléphone', 'Adresse', 'Points fidélité', 'Total dépensé', 'Visites', 'Dernière visite', 'Actif', 'Notes', 'Tags', 'Date inscription'];
    const rows = filteredAndSorted.map(c => [
      c.name, c.email || '', c.phone || '', c.address || '', c.loyalty_points || 0,
      c.total_spent || 0, c.visit_count || 0, c.last_visit_date || '',
      c.is_active ? 'Oui' : 'Non', c.notes || '', c.tags || '', c.created_at || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `clients_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) return;
      const hdrs = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        hdrs.forEach((h, idx) => { row[h] = values[idx] || ''; });
        const customerData = {
          name: row['Nom'] || '', email: row['Email'] || '', phone: row['Téléphone'] || '',
          address: row['Adresse'] || '', loyalty_points: parseInt(row['Points fidélité'] || '0') || 0,
          notes: row['Notes'] || '', tags: row['Tags'] || ''
        };
        if (!customerData.name) continue;
        try {
          if (window.electronAPI) await window.electronAPI.addCustomer(customerData);
          count++;
        } catch { /* skip duplicates */ }
      }
      if (count > 0) {
        await loadCustomers();
        setImportResult(`${count} client(s) importé(s)`);
        setTimeout(() => setImportResult(''), 3000);
      }
    };
    input.click();
  };

  const [importResult, setImportResult] = useState('');

  const [loyaltyDialogOpen, setLoyaltyDialogOpen] = useState(false);
  const [loyaltyLevels, setLoyaltyLevels] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_loyalty_levels');
      return saved ? JSON.parse(saved) : [...LEVELS];
    } catch { return [...LEVELS]; }
  });
  const [editingLevel, setEditingLevel] = useState(null);
  const [levelForm, setLevelForm] = useState({ name: '', min: 0, color: '', ring: '' });

  const saveLoyaltyLevels = (newLevels) => {
    setLoyaltyLevels(newLevels);
    localStorage.setItem('pos_loyalty_levels', JSON.stringify(newLevels));
  };

  const handleSaveLevel = () => {
    if (!levelForm.name.trim() || levelForm.min < 0) return;
    let updated;
    if (editingLevel !== null) {
      updated = loyaltyLevels.map((l, i) => i === editingLevel ? { ...l, ...levelForm } : l);
    } else {
      updated = [...loyaltyLevels, { ...levelForm, color: levelForm.color || 'bg-blue-100 text-blue-700', ring: levelForm.ring || 'ring-blue-200' }];
    }
    updated.sort((a, b) => b.min - a.min);
    saveLoyaltyLevels(updated);
    setEditingLevel(null);
    setLevelForm({ name: '', min: 0, color: '', ring: '' });
  };

  const handleDeleteLevel = (idx) => {
    saveLoyaltyLevels(loyaltyLevels.filter((_, i) => i !== idx));
    setEditingLevel(null);
  };

  const getActiveLevel = (points) => {
    let level = loyaltyLevels[loyaltyLevels.length - 1] || LEVELS[0];
    for (const l of loyaltyLevels) {
      if (points >= l.min) { level = l; break; }
    }
    return level;
  };

  const openDetailView = async (customer) => {
    setDetailCustomer(customer);
    setDetailTab('profile');
    setPurchasesFilter('all');
    setDetailOpen(true);
    setLoadingDetail(true);
    try {
      if (window.electronAPI) {
        const [purchasesData, statsData, favData, actData] = await Promise.all([
          window.electronAPI.getCustomerPurchases(customer.id).catch(() => []),
          window.electronAPI.getCustomerStats(customer.id).catch(() => null),
          window.electronAPI.getCustomerFavoriteProducts(customer.id).catch(() => []),
          window.electronAPI.getCustomerActivity(customer.id).catch(() => []),
        ]);
        setDetailPurchases(purchasesData || []);
        setDetailStats(statsData);
        setDetailFavorites(favData || []);
        setDetailActivity(actData || []);
      }
    } catch (error) {
      console.error('Error loading detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...customers];

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.address?.toLowerCase().includes(s) ||
        (Array.isArray(c.tags) ? c.tags.join(' ').toLowerCase().includes(s) : c.tags?.toLowerCase().includes(s))
      );
    }

    if (filterStatus !== 'all') {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      switch (filterStatus) {
        case 'active': result = result.filter(c => c.is_active !== false); break;
        case 'inactive': result = result.filter(c => c.is_active === false); break;
        case 'with_purchases': result = result.filter(c => (c.visit_count || 0) > 0); break;
        case 'without_purchases': result = result.filter(c => !c.visit_count || c.visit_count === 0); break;
        case 'recently_added':
          result = result.filter(c => c.created_at && new Date(c.created_at) >= thirtyDaysAgo);
          break;
        case 'recently_active':
          result = result.filter(c => c.last_visit_date && new Date(c.last_visit_date) >= thirtyDaysAgo);
          break;
      }
    }

    if (filterLevel !== 'all') {
      const level = loyaltyLevels.find(l => l.name === filterLevel);
      if (level) {
        const levelIndex = loyaltyLevels.indexOf(level);
        const minPoints = level.min;
        const maxPoints = levelIndex < loyaltyLevels.length - 1 ? loyaltyLevels[levelIndex + 1].min - 1 : Infinity;
        result = result.filter(c => {
          const pts = c.loyalty_points || 0;
          return pts >= minPoints && pts <= maxPoints;
        });
      }
    }

    const [key, dir] = sortBy.split('-');
    result.sort((a, b) => {
      let cmp = 0;
      switch (key) {
        case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break;
        case 'created_at':
          cmp = new Date(a.created_at || 0) - new Date(b.created_at || 0); break;
        case 'loyalty_points':
          cmp = (a.loyalty_points || 0) - (b.loyalty_points || 0); break;
        case 'total_spent':
          cmp = (a.total_spent || 0) - (b.total_spent || 0); break;
        case 'visit_count':
          cmp = (a.visit_count || 0) - (b.visit_count || 0); break;
        case 'last_visit_date':
          cmp = new Date(a.last_visit_date || 0) - new Date(b.last_visit_date || 0); break;
        default: cmp = 0;
      }
      return dir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [customers, searchTerm, filterStatus, filterLevel, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, page]);

  useEffect(() => { setPage(1); }, [searchTerm, filterStatus, filterLevel, sortBy]);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.is_active !== false).length;
    const vip = customers.filter(c => (c.loyalty_points || 0) >= 500).length;
    const totalPoints = customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);
    const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const withVisits = customers.filter(c => (c.visit_count || 0) > 0);
    const avgTicket = withVisits.length > 0
      ? withVisits.reduce((sum, c) => sum + (c.total_spent || 0), 0) / withVisits.reduce((sum, c) => sum + (c.visit_count || 0), 0)
      : 0;
    const avgVisits = total > 0
      ? customers.reduce((sum, c) => sum + (c.visit_count || 0), 0) / total
      : 0;
    return { total, active, vip, totalPoints, totalRevenue, avgTicket, avgVisits };
  }, [customers]);

  const detailPurchasesFiltered = useMemo(() => {
    if (purchasesFilter === 'all') return detailPurchases;
    if (purchasesFilter === 'cash') return detailPurchases.filter(p => p.payment_method === 'cash');
    if (purchasesFilter === 'card') return detailPurchases.filter(p => p.payment_method === 'card');
    if (purchasesFilter === 'credit') return detailPurchases.filter(p => p.payment_method === 'credit');
    return detailPurchases;
  }, [detailPurchases, purchasesFilter]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 p-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" /> Gestion des clients
            </h1>
            <p className="text-sm text-muted-foreground">
              {stats.total} client{stats.total > 1 ? 's' : ''} enregistré{stats.total > 1 ? 's' : ''}
              {importResult && <span className="ml-2 text-green-600 font-medium">{importResult}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImportCSV}>
              <Upload className="h-4 w-4 mr-1" /> Importer
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredAndSorted.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Exporter
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLoyaltyDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-1" /> Niveaux
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-1" /> Nouveau client
            </Button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total clients', value: stats.total, icon: Users, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Actifs', value: stats.active, icon: User, color: '#22c55e', bg: '#f0fdf4' },
            { label: 'VIP (500+)', value: stats.vip, icon: Star, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Points totaux', value: stats.totalPoints.toLocaleString(), icon: Gift, color: '#8b5cf6', bg: '#f5f3ff' },
            { label: 'CA total', value: formatPrice(stats.totalRevenue), icon: DollarSign, color: '#14b8a6', bg: '#f0fdfa' },
            { label: 'Panier moyen', value: formatPrice(stats.avgTicket), icon: ShoppingBag, color: '#ec4899', bg: '#fdf2f8' },
            { label: 'Visites moy.', value: stats.avgVisits.toFixed(1), icon: BarChart3, color: '#f97316', bg: '#fff7ed' },
          ].map((stat, i) => (
            <Card key={i} className="transition-all hover:shadow-md hover:scale-[1.02]">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: stat.bg }}>
                    <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-sm font-bold tabular-nums truncate">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* SEARCH + FILTERS */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email, téléphone, adresse, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-[140px] h-9">
              <Award className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              {loyaltyLevels.map(l => (
                <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] h-9">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchTerm || filterStatus !== 'all' || filterLevel !== 'all') && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterLevel('all'); }}>
              <X className="h-3.5 w-3.5 mr-1" /> Réinitialiser
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {filteredAndSorted.length} client{filteredAndSorted.length !== 1 ? 's' : ''} affiché{filteredAndSorted.length !== 1 ? 's' : ''} sur {customers.length}
        </p>

        {/* CUSTOMER TABLE */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Fidélité</TableHead>
                    <TableHead className="text-right">Visites</TableHead>
                    <TableHead className="text-right">Total dépensé</TableHead>
                    <TableHead>Dernière visite</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>{searchTerm || filterStatus !== 'all' || filterLevel !== 'all'
                          ? 'Aucun client trouvé pour cette recherche'
                          : 'Aucun client enregistré'}</p>
                      </TableCell>
                    </TableRow>
                  ) : paginatedCustomers.map((customer) => {
                    const level = getActiveLevel(customer.loyalty_points || 0);
                    const isActive = customer.is_active !== false;
                    const tagsList = Array.isArray(customer.tags) ? customer.tags : (customer.tags ? customer.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
                    return (
                      <TableRow key={customer.id} className="cursor-pointer" onClick={() => openDetailView(customer)}>
                        <TableCell>
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            {customer.name ? (
                              <span className="text-sm font-semibold text-muted-foreground">{customer.name.charAt(0).toUpperCase()}</span>
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground/40" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm leading-tight">{customer.name}</p>
                            {tagsList.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {tagsList.slice(0, 2).map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0">{tag}</Badge>
                                ))}
                                {tagsList.length > 2 && <span className="text-[9px] text-muted-foreground">+{tagsList.length - 2}</span>}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-xs text-muted-foreground">
                            {customer.email && (
                              <div className="flex items-center gap-1"><Mail className="h-3 w-3 flex-shrink-0" /><span className="truncate max-w-[150px]">{customer.email}</span></div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-1"><Phone className="h-3 w-3 flex-shrink-0" /><span>{customer.phone}</span></div>
                            )}
                            {customer.address && (
                              <div className="flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0" /><span className="truncate max-w-[150px]">{customer.address}</span></div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={`${level.color} text-[10px]`}>{level.name}</Badge>
                            <span className="text-xs text-muted-foreground tabular-nums">{customer.loyalty_points || 0} pts</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{customer.visit_count || 0}</TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">{formatPrice(customer.total_spent)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(customer.last_visit_date)}</TableCell>
                        <TableCell>
                          <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px]">
                            {isActive ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(customer)}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Modifier</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetailView(customer)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Détails</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleToggleActive(customer)}
                                  disabled={togglingId === customer.id}
                                >
                                  {togglingId === customer.id
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Power className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                  }
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isActive ? 'Désactiver' : 'Activer'}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { setDeleteTarget(customer); setDeleteError(''); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Supprimer</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Page {page} / {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══════════════════════ CREATE / EDIT DIALOG ═══════════════════════ */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{editingCustomer ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 min-h-0 pr-4">
              <form onSubmit={handleSubmit} className="space-y-4 pb-2">
                <div className="grid gap-2">
                  <Label>Nom *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nom complet"
                    className={formErrors.name ? 'border-destructive' : ''}
                  />
                  {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemple.com"
                    className={formErrors.email ? 'border-destructive' : ''}
                  />
                  {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01 23 45 67 89"
                    className={formErrors.phone ? 'border-destructive' : ''}
                  />
                  {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Adresse</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Adresse complète"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Points de fidélité</Label>
                    <Input
                      type="number"
                      value={formData.loyalty_points}
                      onChange={(e) => setFormData({ ...formData, loyalty_points: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Niveau: {getActiveLevel(parseInt(formData.loyalty_points) || 0).name}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tags</Label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="vip, fidèle, ..."
                    />
                    <p className="text-[10px] text-muted-foreground">Séparez par des virgules</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notes internes sur le client..."
                    rows={3}
                  />
                </div>
                {formErrors.submit && (
                  <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{formErrors.submit}</p>
                )}
              </form>
            </ScrollArea>
            <DialogFooter className="flex-shrink-0 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editingCustomer ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════ DETAIL SHEET (as Dialog) ═══════════════════════ */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                {detailCustomer && (
                  <>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-base font-bold text-muted-foreground">{detailCustomer.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p>{detailCustomer.name}</p>
                      <p className="text-sm font-normal text-muted-foreground">{detailCustomer.email || detailCustomer.phone || ''}</p>
                    </div>
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            {detailCustomer && (
              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 min-h-0 flex flex-col">
                <TabsList className="flex-shrink-0 h-10 w-full justify-start">
                  <TabsTrigger value="profile" className="text-xs"><User className="h-3.5 w-3.5 mr-1" />Profil</TabsTrigger>
                  <TabsTrigger value="purchases" className="text-xs"><ShoppingBag className="h-3.5 w-3.5 mr-1" />Achats</TabsTrigger>
                  <TabsTrigger value="stats" className="text-xs"><TrendingUp className="h-3.5 w-3.5 mr-1" />Statistiques</TabsTrigger>
                  <TabsTrigger value="favorites" className="text-xs"><Heart className="h-3.5 w-3.5 mr-1" />Favoris</TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs"><Activity className="h-3.5 w-3.5 mr-1" />Activité</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 min-h-0 mt-4">
                  {/* TAB: PROFILE */}
                  {detailTab === 'profile' && (
                    <div className="space-y-4 pr-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Nom</Label>
                          <p className="text-sm font-medium">{detailCustomer.name}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Email</Label>
                          <p className="text-sm">{detailCustomer.email || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Téléphone</Label>
                          <p className="text-sm">{detailCustomer.phone || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Adresse</Label>
                          <p className="text-sm">{detailCustomer.address || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Inscription</Label>
                          <p className="text-sm">{formatDate(detailCustomer.created_at)}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Statut</Label>
                          <Badge variant={detailCustomer.is_active !== false ? 'default' : 'secondary'} className="text-xs">
                            {detailCustomer.is_active !== false ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Fidélité</Label>
                        <div className="flex items-center gap-3">
                          <Badge className={`${getActiveLevel(detailCustomer.loyalty_points || 0).color} text-xs`}>
                            {getActiveLevel(detailCustomer.loyalty_points || 0).name}
                          </Badge>
                          <span className="text-lg font-bold tabular-nums">{detailCustomer.loyalty_points || 0} pts</span>
                        </div>
                      </div>
                      {(() => {
                        const tagsList = Array.isArray(detailCustomer.tags) ? detailCustomer.tags : (detailCustomer.tags ? detailCustomer.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
                        return tagsList.length > 0 ? (
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Tags</Label>
                            <div className="flex items-center gap-1 flex-wrap">
                              {tagsList.map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}
                      {detailCustomer.notes && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Notes</Label>
                          <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{detailCustomer.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: PURCHASES */}
                  {detailTab === 'purchases' && (
                    <div className="space-y-3 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select value={purchasesFilter} onValueChange={setPurchasesFilter}>
                          <SelectTrigger className="w-[160px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les paiements</SelectItem>
                            <SelectItem value="cash">Espèces</SelectItem>
                            <SelectItem value="card">Carte</SelectItem>
                            <SelectItem value="credit">Crédit</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">{detailPurchasesFiltered.length} achat(s)</span>
                      </div>
                      {loadingDetail ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : detailPurchasesFiltered.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Aucun achat trouvé</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {detailPurchasesFiltered.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                  <Receipt className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Vente #{p.id}</p>
                                  <p className="text-xs text-muted-foreground">{formatDateTime(p.created_at)}</p>
                                  {p.cashier_name && <p className="text-[10px] text-muted-foreground">Caissier: {p.cashier_name}</p>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold tabular-nums">{formatPrice(p.total)}</p>
                                <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground">
                                  <span>{p.total_items || p.item_count || 0} article(s)</span>
                                  {p.payment_method && (
                                    <>
                                      <span>·</span>
                                      <Badge variant="outline" className="text-[9px]">{p.payment_method}</Badge>
                                    </>
                                  )}
                                </div>
                                {p.discount > 0 && (
                                  <p className="text-[10px] text-emerald-600">-{formatPrice(p.discount)}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: STATISTICS */}
                  {detailTab === 'stats' && (
                    <div className="space-y-4 pr-2">
                      {loadingDetail ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: 'Visites', value: detailStats?.visit_count || detailCustomer.visit_count || 0, icon: ShoppingBag, color: '#3b82f6', bg: '#eff6ff' },
                              { label: 'Total dépensé', value: formatPrice(detailStats?.total_spent || detailCustomer.total_spent), icon: DollarSign, color: '#22c55e', bg: '#f0fdf4' },
                              { label: 'Panier moyen', value: formatPrice(detailStats?.average_ticket), icon: TrendingUp, color: '#8b5cf6', bg: '#f5f3ff' },
                              { label: 'Points fidélité', value: detailCustomer.loyalty_points || 0, icon: Award, color: '#f59e0b', bg: '#fffbeb' },
                            ].map((s, i) => (
                              <Card key={i}>
                                <CardContent className="p-3 text-center">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1" style={{ backgroundColor: s.bg }}>
                                    <s.icon className="h-4 w-4" style={{ color: s.color }} />
                                  </div>
                                  <p className="text-lg font-bold tabular-nums">{s.value}</p>
                                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          {detailStats?.monthly_spending && detailStats.monthly_spending.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Dépenses mensuelles</Label>
                              <div className="space-y-1">
                                {detailStats.monthly_spending.map((m, i) => {
                                  const maxSpend = Math.max(...detailStats.monthly_spending.map(x => x.total || 0), 1);
                                  const width = ((m.total || 0) / maxSpend) * 100;
                                  return (
                                    <div key={i} className="flex items-center gap-3 text-xs">
                                      <span className="w-16 text-muted-foreground tabular-nums">{m.month}</span>
                                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${width}%` }} />
                                      </div>
                                      <span className="w-20 text-right font-medium tabular-nums">{formatPrice(m.total)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {detailStats?.visit_frequency && (
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Fréquence des visites</Label>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/50 rounded-lg p-3">
                                  <p className="text-[10px] text-muted-foreground">Première visite</p>
                                  <p className="text-sm font-medium">{formatDate(detailStats.visit_frequency.first_visit)}</p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3">
                                  <p className="text-[10px] text-muted-foreground">Dernière visite</p>
                                  <p className="text-sm font-medium">{formatDate(detailStats.visit_frequency.last_visit)}</p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3">
                                  <p className="text-[10px] text-muted-foreground">Total visites</p>
                                  <p className="text-sm font-medium">{detailStats.visit_frequency.total_visits || 0}</p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3">
                                  <p className="text-[10px] text-muted-foreground">Jours entre visites (moy.)</p>
                                  <p className="text-sm font-medium">{detailStats.visit_frequency.avg_days_between ? detailStats.visit_frequency.avg_days_between.toFixed(0) + ' j' : '-'}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* TAB: FAVORITES */}
                  {detailTab === 'favorites' && (
                    <div className="space-y-3 pr-2">
                      {loadingDetail ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : detailFavorites.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Heart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Aucun produit favori</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {detailFavorites.map((f, i) => (
                            <div key={f.id || i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                                  <Heart className="h-4 w-4 text-red-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{f.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {f.avg_purchase_price != null && (
                                      <span>Prix moy: {formatPrice(f.avg_purchase_price)}</span>
                                    )}
                                    {f.current_price != null && f.current_price !== f.avg_purchase_price && (
                                      <span>· Actuel: {formatPrice(f.current_price)}</span>
                                    )}
                                    {f.last_purchased_at && (
                                      <span>· Dernier: {formatDate(f.last_purchased_at)}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold tabular-nums">×{f.total_qty || 0}</p>
                                <p className="text-[10px] text-muted-foreground">{f.times_bought || 0} fois</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: ACTIVITY */}
                  {detailTab === 'activity' && (
                    <div className="space-y-3 pr-2">
                      {loadingDetail ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : detailActivity.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Aucune activité enregistrée</p>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                          <div className="space-y-4">
                            {detailActivity.map((act, i) => {
                              const typeColors = {
                                sale: { bg: 'bg-emerald-50', icon: ShoppingBag, color: 'text-emerald-600', label: 'Vente' },
                                purchase: { bg: 'bg-blue-50', icon: ShoppingBag, color: 'text-blue-600', label: 'Achat' },
                                loyalty: { bg: 'bg-purple-50', icon: Gift, color: 'text-purple-600', label: 'Fidélité' },
                                appointment: { bg: 'bg-orange-50', icon: CalendarDays, color: 'text-orange-600', label: 'Rendez-vous' },
                                note: { bg: 'bg-gray-50', icon: FileText, color: 'text-gray-600', label: 'Note' },
                              };
                              const style = typeColors[act.type] || typeColors.sale;
                              return (
                                <div key={i} className="flex gap-3 relative">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${style.bg}`}>
                                    <style.icon className={`h-4 w-4 ${style.color}`} />
                                  </div>
                                  <div className="flex-1 pb-2">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <Badge variant="outline" className="text-[9px]">{style.label}</Badge>
                                      <span className="text-[10px] text-muted-foreground">{formatDateTime(act.created_at)}</span>
                                    </div>
                                    {act.amount != null && (
                                      <p className="text-sm font-medium">{formatPrice(act.amount)}</p>
                                    )}
                                    {act.service_name && (
                                      <p className="text-xs text-muted-foreground">{act.service_name}</p>
                                    )}
                                    {act.payment_method && (
                                      <p className="text-[10px] text-muted-foreground">Paiement: {act.payment_method}</p>
                                    )}
                                    {act.notes && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{act.notes}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </Tabs>
            )}

            <DialogFooter className="flex-shrink-0 pt-2">
              <Button variant="outline" onClick={() => setDetailOpen(false)}>Fermer</Button>
              {detailCustomer && (
                <Button onClick={() => { setDetailOpen(false); openEditDialog(detailCustomer); }}>
                  <Edit2 className="h-4 w-4 mr-1" /> Modifier
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════ DELETE CONFIRMATION ═══════════════════════ */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteError(''); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Supprimer le client
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteError ? (
                  <span className="text-destructive">{deleteError}</span>
                ) : (
                  <>
                    Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.name}</strong> ?
                    Cette action est irréversible.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setDeleteTarget(null); setDeleteError(''); }}>
                {deleteError ? 'Fermer' : 'Annuler'}
              </AlertDialogCancel>
              {!deleteError && (
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteTarget && handleDelete(deleteTarget)}
                >
                  Supprimer
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* LOYALTY LEVELS DIALOG */}
        <Dialog open={loyaltyDialogOpen} onOpenChange={setLoyaltyDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" /> Configuration des niveaux de fidélité
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Configurez les seuils de points pour chaque niveau. Les niveaux sont classés du plus haut au plus bas.
              </p>
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {loyaltyLevels.map((l, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                    <Badge className={`${l.color} text-xs whitespace-nowrap`}>{l.name}</Badge>
                    <span className="text-sm tabular-nums min-w-[60px]">≥ {l.min} pts</span>
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" className="h-7 px-2"
                      onClick={() => { setEditingLevel(idx); setLevelForm({ name: l.name, min: l.min, color: l.color, ring: l.ring }); }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    {loyaltyLevels.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive"
                        onClick={() => handleDeleteLevel(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {editingLevel !== null ? `Éditer le niveau « ${levelForm.name} »` : 'Ajouter un niveau'}
                </p>
                <div className="flex gap-2">
                  <Input placeholder="Nom" value={levelForm.name} onChange={e => setLevelForm(p => ({ ...p, name: e.target.value }))}
                    className="flex-1" />
                  <Input type="number" placeholder="Points min" value={levelForm.min}
                    onChange={e => setLevelForm(p => ({ ...p, min: parseInt(e.target.value) || 0 }))} className="w-28" />
                </div>
                <div className="flex gap-2">
                  <Select value={levelForm.color || ''} onValueChange={v => {
                    const c = LEVELS.find(l => l.name === v);
                    if (c) setLevelForm(p => ({ ...p, color: c.color, ring: c.ring, name: p.name || c.name }));
                  }}>
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue placeholder="Style de badge" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map(l => (
                        <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveLevel}
                    disabled={!levelForm.name.trim() || levelForm.min < 0}>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {editingLevel !== null ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                  {editingLevel !== null && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingLevel(null); setLevelForm({ name: '', min: 0, color: '', ring: '' }); }}>
                      Annuler
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
