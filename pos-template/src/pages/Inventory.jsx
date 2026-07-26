import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Checkbox } from '../components/ui/checkbox';
import { ScrollArea } from '../components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Package, AlertTriangle, TrendingDown, TrendingUp, DollarSign, Tag, Truck,
  Search, Filter, RefreshCw, History, ArrowDown, ArrowUp, ArrowRight,
  Plus, Edit, Trash2, Eye, Download, Upload, Copy, Settings, X, Check,
  FileText, ClipboardList, Scan, ChevronLeft, ChevronRight,
  ShoppingCart, RotateCcw, Minus, Box, Warehouse, Activity,
  ArrowUpDown, Calendar, User, Layers, CircleDot
} from 'lucide-react';

const ITEMS_PER_PAGE = 25;

const MOVEMENT_TYPES = [
  { value: 'in', label: 'Entrée', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { value: 'out', label: 'Sortie', color: 'text-red-600', bg: 'bg-red-50' },
  { value: 'sale', label: 'Vente', color: 'text-red-600', bg: 'bg-red-50' },
  { value: 'purchase', label: 'Achat', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { value: 'return', label: 'Retour', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { value: 'initial', label: 'Initial', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { value: 'adjustment', label: 'Ajustement', color: 'text-orange-600', bg: 'bg-orange-50' },
  { value: 'correction', label: 'Correction', color: 'text-orange-600', bg: 'bg-orange-50' },
  { value: 'waste', label: 'Déchet/Perte', color: 'text-red-600', bg: 'bg-red-50' },
];

function getMovementStyle(type) {
  const found = MOVEMENT_TYPES.find(m => m.value === type);
  return found || { value: type, label: type, color: 'text-gray-600', bg: 'bg-gray-50' };
}

function getStockStatus(stock, minStock) {
  if (stock < 0) return { text: `Dette (${stock})`, variant: 'destructive', color: 'text-red-700', bg: 'bg-red-100' };
  if (stock === 0) return { text: 'Rupture', variant: 'destructive', color: 'text-red-600', bg: 'bg-red-50' };
  if (minStock > 0 && stock <= minStock) return { text: 'Stock faible', variant: 'outline', color: 'text-amber-600', bg: 'bg-amber-50' };
  return { text: 'En stock', variant: 'default', color: 'text-emerald-600', bg: 'bg-emerald-50' };
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

export default function Inventory() {
  const { config: electronConfig } = useAppConfig();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canEdit = isAdmin || isManager;

  const getConfig = useCallback(() => {
    if (electronConfig?.theme) return POSConfiguration.createConfig(electronConfig.theme);
    if (typeof window !== 'undefined' && window.themeConfig) return POSConfiguration.createConfig(window.themeConfig);
    return POSConfiguration.createConfig({});
  }, [electronConfig]);
  const config = getConfig();

  const formatPrice = useCallback((v) => {
    const val = parseFloat(v) || 0;
    return config.currencyPosition === 'before'
      ? `${config.currency}${val.toFixed(2)}`
      : `${val.toFixed(2)} ${config.currency}`;
  }, [config]);

  const formatDateTime = useCallback((d) => {
    if (!d) return '-';
    try { return new Date(d.endsWith('Z') ? d : d + 'Z').toLocaleString(); } catch { return d; }
  }, []);

  const formatDate = useCallback((d) => {
    if (!d) return '';
    try { return new Date(d.endsWith('Z') ? d : d + 'Z').toLocaleDateString(); } catch { return ''; }
  }, []);

  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState([]);
  const [families, setFamilies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [vatRates, setVatRates] = useState([]);
  const [movements, setMovements] = useState([]);
  const [movementSummary, setMovementSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [search, setSearch] = useState('');
  const [filterFamily, setFilterFamily] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLowOnly, setFilterLowOnly] = useState(false);
  const [filterOutOfStock, setFilterOutOfStock] = useState(false);
  const [sortBy, setSortBy] = useState('name-asc');
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState(new Set());

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustMode, setAdjustMode] = useState('adjust');
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustReference, setAdjustReference] = useState('');
  const [adjustType, setAdjustType] = useState('adjustment');

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [detailsMovements, setDetailsMovements] = useState([]);

  const [movFilterType, setMovFilterType] = useState('all');
  const [movFilterSearch, setMovFilterSearch] = useState('');
  const [movStartDate, setMovStartDate] = useState('');
  const [movEndDate, setMovEndDate] = useState('');
  const [movPage, setMovPage] = useState(1);

  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', phone: '', email: '', address: '', notes: '' });
  const [supplierSearch, setSupplierSearch] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      setLoading(true);
      const [prods, fams, sups, vats] = await Promise.all([
        window.electronAPI.getProducts(),
        window.electronAPI.getFamilies?.() || [],
        window.electronAPI.getSuppliers?.() || [],
        window.electronAPI.getVatRates?.() || [],
      ]);
      setProducts(prods || []);
      setFamilies((fams || []).map(f => f.name).filter(Boolean));
      setSuppliers(sups || []);
      setVatRates(vats || []);
    } catch (e) { console.error('[Inventory] Load error:', e); }
    finally { setLoading(false); }
  }, []);

  const loadMovements = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const filters = {};
      if (movFilterType && movFilterType !== 'all') filters.movement_type = movFilterType;
      if (movFilterSearch) filters.search = movFilterSearch;
      if (movStartDate) filters.startDate = movStartDate;
      if (movEndDate) filters.endDate = movEndDate + 'T23:59:59';
      const [movs, summary] = await Promise.all([
        window.electronAPI.getStockMovements?.(filters) || [],
        window.electronAPI.getStockSummary?.() || {},
      ]);
      setMovements(movs || []);
      setMovementSummary(summary || {});
    } catch (e) { console.error(e); }
    finally { setLoadingMovements(false); }
  }, [movFilterType, movFilterSearch, movStartDate, movEndDate]);



  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (activeTab === 'movements') loadMovements(); }, [activeTab, loadMovements]);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    const s = search.toLowerCase();
    if (s) {
      result = result.filter(p =>
        p.name?.toLowerCase().includes(s) ||
        p.family?.toLowerCase().includes(s) ||
        p.supplier?.toLowerCase().includes(s) ||
        p.description?.toLowerCase().includes(s) ||
        p.barcode?.includes(s)
      );
    }
    if (filterFamily !== 'all') result = result.filter(p => (p.family || p.category) === filterFamily);
    if (filterSupplier !== 'all') result = result.filter(p => p.supplier === filterSupplier);
    if (filterStatus === 'in-stock') result = result.filter(p => p.stock > 0 && !(p.min_stock > 0 && p.stock <= p.min_stock));
    if (filterStatus === 'low-stock') result = result.filter(p => p.min_stock > 0 && p.stock > 0 && p.stock <= p.min_stock);
    if (filterStatus === 'out-of-stock') result = result.filter(p => p.stock === 0);
    if (filterLowOnly) result = result.filter(p => p.min_stock > 0 && p.stock > 0 && p.stock <= p.min_stock);
    if (filterOutOfStock) result = result.filter(p => p.stock === 0);
    const [key, dir] = sortBy.split('-');
    result.sort((a, b) => {
      let cmp = 0;
      switch (key) {
        case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break;
        case 'family': cmp = ((a.family || a.category) || '').localeCompare((b.family || b.category) || ''); break;
        case 'stock': cmp = (a.stock || 0) - (b.stock || 0); break;
        case 'price': cmp = (a.price || 0) - (b.price || 0); break;
        case 'cost': cmp = (a.cost_price || 0) - (b.cost_price || 0); break;
        case 'value': cmp = ((a.cost_price || a.price) * (a.stock || 0)) - ((b.cost_price || b.price) * (b.stock || 0)); break;
        case 'supplier': cmp = (a.supplier || '').localeCompare(b.supplier || ''); break;
        default: cmp = 0;
      }
      return dir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [products, search, filterFamily, filterSupplier, filterStatus, filterLowOnly, filterOutOfStock, sortBy]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, page]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));

  const paginatedMovements = useMemo(() => {
    const start = (movPage - 1) * 50;
    return movements.slice(start, start + 50);
  }, [movements, movPage]);
  const movTotalPages = Math.max(1, Math.ceil(movements.length / 50));

  const stats = useMemo(() => {
    const total = products.length;
    const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
    const outOfStock = products.filter(p => p.stock === 0).length;
    const lowStock = products.filter(p => p.min_stock > 0 && p.stock > 0 && p.stock <= p.min_stock).length;
    const invValue = products.reduce((s, p) => s + ((p.cost_price || p.price || 0) * (p.stock || 0)), 0);
    const retailValue = products.reduce((s, p) => s + ((p.price || 0) * (p.stock || 0)), 0);
    const avgCost = products.filter(p => p.cost_price > 0).length > 0
      ? products.filter(p => p.cost_price > 0).reduce((s, p) => s + p.cost_price, 0) / products.filter(p => p.cost_price > 0).length : 0;
    const familiesCount = new Set(products.map(p => p.family || p.category).filter(Boolean)).size;
    const suppliersCount = new Set(products.map(p => p.supplier).filter(Boolean)).size;
    return { total, totalStock, outOfStock, lowStock, invValue, retailValue, avgCost, familiesCount, suppliersCount };
  }, [products]);

  const supplierList = useMemo(() => {
    const s = new Set(products.map(p => p.supplier).filter(Boolean));
    return [...s].sort();
  }, [products]);

  const allFamilies = useMemo(() => {
    const f = new Set(products.map(p => p.family || p.category).filter(Boolean));
    families.forEach(fa => f.add(fa));
    return [...f].sort();
  }, [products, families]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedProducts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedProducts.map(p => p.id)));
  }, [selectedIds, paginatedProducts]);

  const handleAdjustOpen = useCallback((product) => {
    setAdjustProduct(product);
    setAdjustMode('adjust');
    setAdjustValue('');
    setAdjustReason('');
    setAdjustReference('');
    setAdjustType('adjustment');
    setAdjustOpen(true);
  }, []);

  const handleAdjustSubmit = useCallback(async () => {
    if (!adjustProduct) return;
    let newStock;
    if (adjustMode === 'adjust') {
      if (!adjustValue) return;
      newStock = adjustProduct.stock + parseInt(adjustValue);
    } else {
      if (adjustValue === '') return;
      newStock = parseInt(adjustValue);
    }
    newStock = Math.max(0, isNaN(newStock) ? adjustProduct.stock : newStock);
    try {
      if (window.electronAPI.adjustStock) {
        await window.electronAPI.adjustStock({
          product_id: adjustProduct.id,
          new_stock: newStock,
          movement_type: adjustType,
          reason: adjustReason,
          reference: adjustReference,
          user_name: user?.fullName || user?.username || 'Utilisateur',
        });
      } else {
        await window.electronAPI.updateProduct(adjustProduct.id, { ...adjustProduct, stock: newStock }, user?.role);
        if (newStock !== adjustProduct.stock) {
          await window.electronAPI.addStockMovement?.({
            product_id: adjustProduct.id,
            product_name: adjustProduct.name,
            movement_type: adjustType,
            quantity: Math.abs(newStock - adjustProduct.stock),
            stock_before: adjustProduct.stock,
            stock_after: newStock,
            reason: adjustReason,
            reference: adjustReference,
            user_name: user?.fullName || user?.username || 'Utilisateur',
          });
        }
      }
      showToast(`Stock mis à jour: ${adjustProduct.name} → ${newStock}`);
      setAdjustOpen(false);
      await loadData();
    } catch (e) {
      showToast('Erreur: ' + e.message, 'error');
    }
  }, [adjustProduct, adjustMode, adjustValue, adjustReason, adjustReference, adjustType, user, loadData, showToast]);

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selectedIds];
    for (const id of ids) {
      try { await window.electronAPI.deleteProduct(id, user?.role); } catch { /* skip */ }
    }
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
    showToast(`${ids.length} produit(s) supprimé(s)`);
    await loadData();
  }, [selectedIds, user, loadData, showToast]);

  const handleBulkAdjust = useCallback(async (newStock) => {
    const ids = [...selectedIds];
    for (const id of ids) {
      const prod = products.find(p => p.id === id);
      if (prod) {
        try {
          if (window.electronAPI.adjustStock) {
            await window.electronAPI.adjustStock({ product_id: id, new_stock: newStock, movement_type: 'adjustment', reason: 'Ajustement groupé', user_name: user?.fullName || user?.username || 'Utilisateur' });
          } else {
            await window.electronAPI.updateProduct(id, { ...prod, stock: newStock }, user?.role);
          }
        } catch { /* skip */ }
      }
    }
    setSelectedIds(new Set());
    showToast(`${ids.length} produit(s) ajusté(s)`);
    await loadData();
  }, [selectedIds, products, user, loadData, showToast]);

  const handleExportCSV = useCallback((data, filename) => {
    const headers = ['Nom', 'Famille', 'Fournisseur', 'Stock', 'Stock Min', 'Prix Achat', 'Prix Vente', 'Valeur', 'Code-barres', 'Unité'];
    const rows = (data || filteredProducts).map(p => [
      p.name, p.family || p.category || '', p.supplier || '', p.stock || 0, p.min_stock || 0,
      p.cost_price || 0, p.price || 0, ((p.cost_price || p.price) * (p.stock || 0)).toFixed(2),
      p.barcode || '', p.unit || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast('Export téléchargé');
  }, [filteredProducts, showToast]);

  const handleDeleteProduct = useCallback(async (product) => {
    try {
      await window.electronAPI.deleteProduct(product.id, user?.role);
      showToast(`"${product.name}" supprimé`);
      await loadData();
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
    setConfirmDelete(null);
  }, [user, loadData, showToast]);

  const handleSupplierSave = useCallback(async () => {
    if (!supplierForm.name.trim()) return;
    try {
      if (editingSupplier) {
        await window.electronAPI.updateSupplier(editingSupplier.id, supplierForm);
        showToast('Fournisseur mis à jour');
      } else {
        await window.electronAPI.addSupplier(supplierForm);
        showToast('Fournisseur ajouté');
      }
      setSupplierDialogOpen(false);
      setEditingSupplier(null);
      setSupplierForm({ name: '', contact: '', phone: '', email: '', address: '', notes: '' });
      await loadData();
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
  }, [supplierForm, editingSupplier, loadData, showToast]);

  const handleDeleteSupplier = useCallback(async (id) => {
    try {
      await window.electronAPI.deleteSupplier(id);
      showToast('Fournisseur supprimé');
      await loadData();
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
  }, [loadData, showToast]);

  const handleOpenDetails = useCallback(async (product) => {
    setDetailsProduct(product);
    setDetailsOpen(true);
    try {
      const movs = await window.electronAPI.getProductMovements?.(product.id, {}) || [];
      setDetailsMovements(movs);
    } catch { setDetailsMovements([]); }
  }, []);

  const openProductMovements = useCallback(async (product) => {
    setDetailsProduct(product);
    setDetailsOpen(true);
    try {
      const movs = await window.electronAPI.getProductMovements?.(product.id, {}) || [];
      setDetailsMovements(movs);
    } catch { setDetailsMovements([]); }
  }, []);

  const adjustPreview = useMemo(() => {
    if (!adjustProduct) return { before: 0, after: 0, diff: 0 };
    const before = adjustProduct.stock || 0;
    let after = before;
    if (adjustMode === 'adjust') after = before + (parseInt(adjustValue) || 0);
    else after = parseInt(adjustValue) || 0;
    after = Math.max(0, isNaN(after) ? before : after);
    return { before, after, diff: after - before };
  }, [adjustProduct, adjustMode, adjustValue]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-72" /></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* TOAST */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-4 fade-in-0 duration-300 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="h-6 w-6" /> Gestion des stocks
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} produit{stats.total !== 1 ? 's' : ''} • {stats.totalStock} unités en stock
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExportCSV(null, 'inventaire')}>
            <Download className="h-4 w-4 mr-1" /> Exporter
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total produits', value: stats.total, icon: Package, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Stock faible', value: stats.lowStock, icon: TrendingDown, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Ruptures', value: stats.outOfStock, icon: AlertTriangle, color: '#ef4444', bg: '#fef2f2' },
          { label: 'Valeur stock (coût)', value: formatPrice(stats.invValue), icon: DollarSign, color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'Prix moyen achat', value: formatPrice(stats.avgCost), icon: ShoppingCart, color: '#06b6d4', bg: '#ecfeff' },
          { label: 'Unités totales', value: stats.totalStock.toLocaleString(), icon: Box, color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Familles', value: stats.familiesCount, icon: Tag, color: '#ec4899', bg: '#fdf2f8' },
          { label: 'Fournisseurs', value: stats.suppliersCount, icon: Truck, color: '#f97316', bg: '#fff7ed' },
        ].map((stat, i) => (
          <Card key={i} className="transition-all hover:shadow-md hover:scale-[1.02]">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: stat.bg }}>
                  <stat.icon className="h-4.5 w-4.5" style={{ color: stat.color }} />
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

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-10">
          <TabsTrigger value="inventory" className="text-xs"><Package className="h-3.5 w-3.5 mr-1" />Inventaire</TabsTrigger>
          <TabsTrigger value="movements" className="text-xs"><History className="h-3.5 w-3.5 mr-1" />Mouvements</TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs"><Truck className="h-3.5 w-3.5 mr-1" />Fournisseurs</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ═══════════════════════ TAB: INVENTORY ═══════════════════════ */}
      {activeTab === 'inventory' && (
        <>
          {/* FILTERS */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Nom, famille, fournisseur, code-barres..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <Select value={filterFamily} onValueChange={v => { setFilterFamily(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] h-9"><Tag className="h-3.5 w-3.5 mr-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes familles</SelectItem>
                {allFamilies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSupplier} onValueChange={v => { setFilterSupplier(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] h-9"><Truck className="h-3.5 w-3.5 mr-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous fournisseurs</SelectItem>
                {supplierList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Tous statuts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="in-stock">En stock</SelectItem>
                <SelectItem value="low-stock">Stock faible</SelectItem>
                <SelectItem value="out-of-stock">Rupture</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px] h-9"><ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Nom A→Z</SelectItem>
                <SelectItem value="name-desc">Nom Z→A</SelectItem>
                <SelectItem value="stock-asc">Stock ↑</SelectItem>
                <SelectItem value="stock-desc">Stock ↓</SelectItem>
                <SelectItem value="price-asc">Prix ↑</SelectItem>
                <SelectItem value="price-desc">Prix ↓</SelectItem>
                <SelectItem value="value-desc">Valeur ↓</SelectItem>
                <SelectItem value="family-asc">Famille A→Z</SelectItem>
              </SelectContent>
            </Select>
            {(search || filterFamily !== 'all' || filterSupplier !== 'all' || filterStatus !== 'all') && (
              <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setSearch(''); setFilterFamily('all'); setFilterSupplier('all'); setFilterStatus('all'); setFilterLowOnly(false); setFilterOutOfStock(false); setPage(1); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Réinitialiser
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} affiché{filteredProducts.length !== 1 ? 's' : ''} sur {products.length}
          </p>

          {/* BULK TOOLBAR */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-muted/50 border rounded-xl px-4 py-2">
              <Badge variant="default" className="text-xs">{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</Badge>
              <Separator orientation="vertical" className="h-5" />
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                const val = window.prompt('Nouveau stock pour les produits sélectionnés:');
                if (val !== null && !isNaN(parseInt(val))) handleBulkAdjust(parseInt(val));
              }}><Edit className="h-3.5 w-3.5 mr-1" /> Ajuster stock</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleExportCSV(selectedIds.size > 0 ? products.filter(p => selectedIds.has(p.id)) : null, 'selection')}>
                <Download className="h-3.5 w-3.5 mr-1" /> Exporter
              </Button>
              {canEdit && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setConfirmBulkDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => setSelectedIds(new Set())}><X className="h-4 w-4" /></Button>
            </div>
          )}

          {/* PRODUCT TABLE */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10">
                        <Checkbox checked={selectedIds.size === paginatedProducts.length && paginatedProducts.length > 0} onCheckedChange={toggleSelectAll} />
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Famille</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                      <TableHead>Unité</TableHead>
                      <TableHead className="text-right">Prix achat</TableHead>
                      <TableHead className="text-right">Prix vente</TableHead>
                      <TableHead className="text-right">Valeur</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Aucun produit trouvé</p>
                        </TableCell>
                      </TableRow>
                    ) : paginatedProducts.map(product => {
                      const status = getStockStatus(product.stock, product.min_stock);
                      const value = (product.cost_price || product.price || 0) * (product.stock || 0);
                      const isSelected = selectedIds.has(product.id);
                      return (
                        <TableRow key={product.id} className={isSelected ? 'bg-muted/50' : ''}>
                          <TableCell><Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(product.id)} /></TableCell>
                          <TableCell>
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden">
                              {product.image ? <img src={product.image} alt="" className="w-full h-full object-cover" loading="lazy" /> : <Package className="h-4 w-4 text-muted-foreground/40" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm leading-tight">{product.name}</p>
                              {product.barcode && <p className="text-[10px] text-muted-foreground font-mono">{product.barcode}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{product.family || product.category || '-'}</TableCell>
                          <TableCell className="text-sm max-w-[120px] truncate">{product.supplier || '-'}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium">{product.stock || 0}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">{product.min_stock || 0}</TableCell>
                          <TableCell className="text-sm">{product.unit || '-'}</TableCell>
                          <TableCell className="text-right text-sm">{product.cost_price > 0 ? formatPrice(product.cost_price) : '-'}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatPrice(product.price)}</TableCell>
                          <TableCell className="text-right text-sm">{value > 0 ? formatPrice(value) : '-'}</TableCell>
                          <TableCell><Badge variant={status.variant} className="text-[10px]">{status.text}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDetails(product)} title="Détails"><Eye className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAdjustOpen(product)} title="Ajuster stock" disabled={!canEdit}><Edit className="h-3.5 w-3.5" /></Button>
                              {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(product)} title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></Button>}
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
                    <Button variant="outline" size="sm" className="h-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                    <Button variant="outline" size="sm" className="h-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════ TAB: MOVEMENTS ═══════════════════════ */}
      {activeTab === 'movements' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={movFilterType} onValueChange={setMovFilterType}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Tous types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                {MOVEMENT_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={movStartDate} onChange={e => setMovStartDate(e.target.value)} className="h-9 w-[150px]" placeholder="Date début" />
            <Input type="date" value={movEndDate} onChange={e => setMovEndDate(e.target.value)} className="h-9 w-[150px]" placeholder="Date fin" />
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={movFilterSearch} onChange={e => setMovFilterSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadMovements()} className="pl-9 h-9" />
            </div>
            <Button variant="outline" size="sm" className="h-9" onClick={loadMovements}><RefreshCw className="h-4 w-4 mr-1" /> Charger</Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => handleExportCSV(movements.map(m => ({ name: m.product_name, type: m.movement_type, qty: m.quantity, before: m.stock_before, after: m.stock_after, reason: m.reason, user: m.user_name, date: m.created_at })), 'mouvements')}>
              <Download className="h-4 w-4 mr-1" /> Exporter
            </Button>
          </div>
          {movementSummary && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Total: <span className="font-medium">{movementSummary.total_movements || 0}</span></span>
              <span>Entrées: <span className="font-medium text-emerald-600">{movementSummary.total_in || 0}</span></span>
              <span>Sorties: <span className="font-medium text-red-600">{movementSummary.total_out || 0}</span></span>
              <span>Ajustements: <span className="font-medium text-orange-600">{movementSummary.total_adjustments || 0}</span></span>
            </div>
          )}
          <Card>
            <CardContent className="p-0">
              {loadingMovements ? (
                <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
              ) : movements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Aucun mouvement enregistré</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Date</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Qté</TableHead>
                        <TableHead className="text-right">Avant</TableHead>
                        <TableHead className="text-right">Après</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead>Référence</TableHead>
                        <TableHead>Utilisateur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMovements.map(m => {
                        const style = getMovementStyle(m.movement_type);
                        const isIn = ['in', 'purchase', 'return', 'initial'].includes(m.movement_type);
                        const isOut = ['out', 'sale', 'waste'].includes(m.movement_type);
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="text-xs whitespace-nowrap">{formatDateTime(m.created_at)}</TableCell>
                            <TableCell className="font-medium text-sm">{m.product_name || '-'}</TableCell>
                            <TableCell><Badge variant="outline" className={`text-[10px] ${style.color}`}>{style.label}</Badge></TableCell>
                            <TableCell className={`text-right font-mono text-sm font-bold ${isIn ? 'text-emerald-600' : isOut ? 'text-red-600' : 'text-orange-600'}`}>
                              {isIn ? '+' : isOut ? '-' : ''}{m.quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{m.stock_before}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{m.stock_after}</TableCell>
                            <TableCell className="text-sm max-w-[160px] truncate">{m.reason || '-'}</TableCell>
                            <TableCell className="text-xs">{m.reference || '-'}</TableCell>
                            <TableCell className="text-xs">{m.user_name || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {movTotalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-xs text-muted-foreground">Page {movPage} / {movTotalPages}</p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="h-7" disabled={movPage <= 1} onClick={() => setMovPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="sm" className="h-7" disabled={movPage >= movTotalPages} onClick={() => setMovPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════ TAB: SUPPLIERS ═══════════════════════ */}
      {activeTab === 'suppliers' && (
        <>
          <div className="flex items-center justify-between">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un fournisseur..." value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Button size="sm" onClick={() => { setEditingSupplier(null); setSupplierForm({ name: '', contact: '', phone: '', email: '', address: '', notes: '' }); setSupplierDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nouveau fournisseur
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Nom</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead className="text-right">Produits</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.filter(s => !supplierSearch || s.name?.toLowerCase().includes(supplierSearch.toLowerCase())).map(s => {
                    const prodCount = products.filter(p => p.supplier === s.name).length;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-sm">{s.contact || '-'}</TableCell>
                        <TableCell className="text-sm">{s.phone || '-'}</TableCell>
                        <TableCell className="text-sm">{s.email || '-'}</TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate">{s.address || '-'}</TableCell>
                        <TableCell className="text-right text-sm">{prodCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-0.5 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingSupplier(s); setSupplierForm({ name: s.name, contact: s.contact || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' }); setSupplierDialogOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                            {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteSupplier(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {suppliers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>Aucun fournisseur enregistré</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════ DIALOGS ═══════════════════════ */}

      {/* STOCK ADJUSTMENT DIALOG */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Ajuster le stock</DialogTitle>
            <DialogDescription>{adjustProduct?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Stock actuel</p>
                <p className="text-2xl font-bold tabular-nums">{adjustProduct?.stock || 0}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: adjustPreview.after > adjustPreview.before ? '#f0fdf4' : adjustPreview.after < adjustPreview.before ? '#fef2f2' : '#f9fafb' }}>
                <p className="text-xs text-muted-foreground mb-1">Nouveau stock</p>
                <p className={`text-2xl font-bold tabular-nums ${adjustPreview.after > adjustPreview.before ? 'text-emerald-600' : adjustPreview.after < adjustPreview.before ? 'text-red-600' : ''}`}>
                  {adjustPreview.after}
                </p>
              </div>
            </div>
            {adjustPreview.diff !== 0 && (
              <div className={`text-center text-sm font-medium ${adjustPreview.diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {adjustPreview.diff > 0 ? '+' : ''}{adjustPreview.diff} unité{Math.abs(adjustPreview.diff) > 1 ? 's' : ''}
              </div>
            )}
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <button type="button" onClick={() => setAdjustMode('adjust')} className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-all ${adjustMode === 'adjust' ? 'bg-white shadow font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Ajuster (+/-)</button>
              <button type="button" onClick={() => setAdjustMode('set')} className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-all ${adjustMode === 'set' ? 'bg-white shadow font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Définir</button>
            </div>
            <div>
              <Label>{adjustMode === 'adjust' ? 'Ajustement (+/-)' : 'Nouveau stock'}</Label>
              <Input type="number" value={adjustValue} onChange={e => setAdjustValue(e.target.value)} placeholder={adjustMode === 'adjust' ? 'Ex: +10 ou -5' : 'Ex: 50'} className="mt-1" autoFocus />
            </div>
            <div>
              <Label>Type de mouvement</Label>
              <Select value={adjustType} onValueChange={setAdjustType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Raison</Label>
              <Input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Raison du changement..." className="mt-1" />
            </div>
            <div>
              <Label>Référence</Label>
              <Input value={adjustReference} onChange={e => setAdjustReference(e.target.value)} placeholder="N° bon, facture..." className="mt-1" />
            </div>
            <p className="text-xs text-muted-foreground">
              Opérateur: {user?.fullName || user?.username || 'Utilisateur'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Annuler</Button>
            <Button onClick={handleAdjustSubmit} disabled={adjustPreview.diff === 0}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRODUCT DETAILS DIALOG */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{detailsProduct?.name}</DialogTitle>
            <DialogDescription>Détails du produit</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0 px-1">
            {detailsProduct && (
              <div className="space-y-4 pb-4">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {detailsProduct.image ? <img src={detailsProduct.image} alt="" className="w-full h-full object-cover" /> : <Package className="h-10 w-10 text-muted-foreground/30" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold">{detailsProduct.name}</p>
                    {detailsProduct.barcode && <p className="text-xs font-mono text-muted-foreground">{detailsProduct.barcode}</p>}
                    {detailsProduct.description && <p className="text-xs text-muted-foreground">{detailsProduct.description}</p>}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Famille:</span> <span className="font-medium">{detailsProduct.family || detailsProduct.category || '-'}</span></div>
                  <div><span className="text-muted-foreground">Fournisseur:</span> <span className="font-medium">{detailsProduct.supplier || '-'}</span></div>
                  <div><span className="text-muted-foreground">Prix achat:</span> <span className="font-medium">{detailsProduct.cost_price > 0 ? formatPrice(detailsProduct.cost_price) : '-'}</span></div>
                  <div><span className="text-muted-foreground">Prix vente:</span> <span className="font-medium">{formatPrice(detailsProduct.price)}</span></div>
                  <div><span className="text-muted-foreground">Stock actuel:</span> <span className="font-bold">{detailsProduct.stock || 0}</span></div>
                  <div><span className="text-muted-foreground">Stock min:</span> <span className="font-medium">{detailsProduct.min_stock || 0}</span></div>
                  <div><span className="text-muted-foreground">Unité:</span> <span className="font-medium">{detailsProduct.unit || '-'}</span></div>
                  <div><span className="text-muted-foreground">Valeur stock:</span> <span className="font-medium">{formatPrice((detailsProduct.cost_price || detailsProduct.price) * (detailsProduct.stock || 0))}</span></div>
                  {detailsProduct.cost_price > 0 && (
                    <div><span className="text-muted-foreground">Marge:</span> <span className="font-medium">{((detailsProduct.price - detailsProduct.cost_price) / detailsProduct.cost_price * 100).toFixed(1)}%</span></div>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Derniers mouvements</p>
                  {detailsMovements.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun mouvement enregistré</p>
                  ) : (
                    <div className="space-y-1">
                      {detailsMovements.slice(0, 10).map(m => {
                        const style = getMovementStyle(m.movement_type);
                        return (
                          <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                            <span className="text-muted-foreground">{formatDateTime(m.created_at)}</span>
                            <Badge variant="outline" className={`text-[9px] ${style.color}`}>{style.label}</Badge>
                            <span className={`font-mono font-medium ${['in', 'purchase', 'return', 'initial'].includes(m.movement_type) ? 'text-emerald-600' : 'text-red-600'}`}>
                              {['in', 'purchase', 'return', 'initial'].includes(m.movement_type) ? '+' : '-'}{m.quantity}
                            </span>
                            <span className="text-muted-foreground">{m.reason || '-'}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Fermer</Button>
            {canEdit && <Button onClick={() => { setDetailsOpen(false); handleAdjustOpen(detailsProduct); }}>Ajuster stock</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUPPLIER DIALOG */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom *</Label><Input value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} placeholder="Nom du fournisseur" autoFocus /></div>
            <div><Label>Contact</Label><Input value={supplierForm.contact} onChange={e => setSupplierForm(p => ({ ...p, contact: e.target.value }))} placeholder="Personne de contact" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={supplierForm.phone} onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))} placeholder="+216 XX XXX XXX" /></div>
              <div><Label>Email</Label><Input value={supplierForm.email} onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemple.com" /></div>
            </div>
            <div><Label>Adresse</Label><Input value={supplierForm.address} onChange={e => setSupplierForm(p => ({ ...p, address: e.target.value }))} placeholder="Adresse" /></div>
            <div><Label>Notes</Label><Input value={supplierForm.notes} onChange={e => setSupplierForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSupplierSave} disabled={!supplierForm.name.trim()}>{editingSupplier ? 'Mettre à jour' : 'Ajouter'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE PRODUCT */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer "{confirmDelete?.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteProduct(confirmDelete)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRM BULK DELETE */}
      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selectedIds.size} produit(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les produits sélectionnés seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleBulkDelete}>
              Supprimer tout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
