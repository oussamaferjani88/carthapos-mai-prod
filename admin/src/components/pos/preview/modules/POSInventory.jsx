import { useState } from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Badge } from '../../../ui/badge';
import { Checkbox } from '../../../ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '../../../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import {
  Package, AlertTriangle, TrendingDown, DollarSign, ShoppingCart, Box, Tag, Truck,
  Search, RefreshCw, History, ArrowUpDown, X, Download, Plus, Edit, Trash2, Eye, Warehouse,
  ChevronLeft, ChevronRight, CircleDot
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
  return MOVEMENT_TYPES.find(m => m.value === type) || { value: type, label: type, color: 'text-gray-600', bg: 'bg-gray-50' };
}

function getStockStatus(stock, minStock) {
  if (stock < 0) return { text: `Dette (${stock})`, variant: 'destructive' };
  if (stock === 0) return { text: 'Rupture', variant: 'destructive' };
  if (minStock > 0 && stock <= minStock) return { text: 'Stock faible', variant: 'outline' };
  return { text: 'En stock', variant: 'default' };
}

const DEMO_PRODUCTS = [
  { id: 1, name: 'Café Expresso', family: 'Boissons', price: 2.50, cost_price: 0.80, barcode: '1234567890123', stock: 120, min_stock: 20, unit: 'unit', supplier: 'Torréfaction locale' },
  { id: 2, name: 'Croissant Nature', family: 'Viennoiseries', price: 1.80, cost_price: 0.60, barcode: '1234567891234', stock: 45, min_stock: 10, unit: 'unit', supplier: 'Boulangerie Martin' },
  { id: 3, name: 'Sandwich Jambon', family: 'Sandwichs', price: 4.50, cost_price: 2.10, barcode: '1234567892345', stock: 8, min_stock: 5, unit: 'unit', supplier: '' },
  { id: 4, name: 'Eau Minérale 50cl', family: 'Boissons', price: 1.20, cost_price: 0.30, barcode: '1234567893456', stock: 200, min_stock: 30, unit: 'bouteille', supplier: 'Source Verte' },
  { id: 5, name: 'Salade César', family: 'Salades', price: 7.90, cost_price: 3.50, barcode: '', stock: 0, min_stock: 5, unit: 'unit', supplier: '' },
  { id: 6, name: 'Muffin Chocolat', family: 'Pâtisseries', price: 2.80, cost_price: 0.90, barcode: '1234567895678', stock: 3, min_stock: 10, unit: 'unit', supplier: '' }
];

const DEMO_MOVEMENTS = [
  { id: 1, product_name: 'Café Expresso', movement_type: 'purchase', quantity: 100, stock_before: 20, stock_after: 120, reason: 'Réapprovisionnement fournisseur', reference: 'CMD-2025-001', user_name: 'Admin', created_at: '2025-06-13T08:30:00' },
  { id: 2, product_name: 'Croissant Nature', movement_type: 'in', quantity: 100, stock_before: 20, stock_after: 120, reason: 'Livraison boulangerie', reference: 'BL-2025-042', user_name: 'Admin', created_at: '2025-06-13T06:00:00' },
  { id: 3, product_name: 'Café Expresso', movement_type: 'sale', quantity: 12, stock_before: 132, stock_after: 120, reason: 'Vente journée', reference: '', user_name: 'Sophie', created_at: '2025-06-13T15:00:00' },
  { id: 4, product_name: 'Muffin Chocolat', movement_type: 'adjustment', quantity: -2, stock_before: 5, stock_after: 3, reason: 'Inventaire - écart constaté', reference: 'INV-2025-06', user_name: 'Marc', created_at: '2025-06-12T10:00:00' },
  { id: 5, product_name: 'Salade César', movement_type: 'in', quantity: 20, stock_before: 0, stock_after: 20, reason: 'Réapprovisionnement', reference: 'CMD-2025-002', user_name: 'Admin', created_at: '2025-06-11T09:00:00' },
  { id: 6, product_name: 'Eau Minérale 50cl', movement_type: 'waste', quantity: -5, stock_before: 205, stock_after: 200, reason: 'Produit périmé', reference: '', user_name: 'Sophie', created_at: '2025-06-10T16:00:00' }
];

export const POSInventory = ({ config, modules, setNotification }) => {
  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [movements, setMovements] = useState(DEMO_MOVEMENTS);
  const [activeTab, setActiveTab] = useState('inventory');
  const [search, setSearch] = useState('');
  const [filterFamily, setFilterFamily] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustMode, setAdjustMode] = useState('adjust');
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [movFilterType, setMovFilterType] = useState('all');
  const [movFilterSearch, setMovFilterSearch] = useState('');

  const textColor = config.textColor || '#1f2937';
  const mutedColor = config.textMutedColor || '#6b7280';

  const moduleNames = (modules || []).map(m => ((m && (m.slug || m.name)) || '').toLowerCase().trim());
  const isSupplierEnabled = modules ? moduleNames.some(n => n.includes('supplier')) : false;

  const notify = (message, type = 'success') => {
    if (setNotification) setNotification({ message, type });
  };

  const formatPrice = (v) => {
    const val = parseFloat(v) || 0;
    return config.currencyPosition === 'before'
      ? `${config.currency}${val.toFixed(2)}`
      : `${val.toFixed(2)} ${config.currency}`;
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try { return new Date(d.endsWith('Z') ? d : d + 'Z').toLocaleDateString(); } catch { return '-'; }
  };

  const formatDateTime = (d) => {
    if (!d) return '-';
    try { return new Date(d.endsWith('Z') ? d : d + 'Z').toLocaleString(); } catch { return d; }
  };

  const filteredProducts = [...products].filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      p.name?.toLowerCase().includes(s) ||
      p.family?.toLowerCase().includes(s) ||
      p.supplier?.toLowerCase().includes(s) ||
      (p.barcode || '').includes(s);
    const matchFamily = filterFamily === 'all' || p.family === filterFamily;
    const stock = p.stock || 0;
    const lowStock = p.min_stock > 0 && stock > 0 && stock <= p.min_stock;
    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'in-stock' && stock > 0 && !lowStock) ||
      (filterStatus === 'low-stock' && lowStock) ||
      (filterStatus === 'out-of-stock' && stock === 0);
    return matchSearch && matchFamily && matchStatus;
  }).sort((a, b) => {
    const [key, dir] = sortBy.split('-');
    let cmp = 0;
    switch (key) {
      case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break;
      case 'family': cmp = (a.family || '').localeCompare(b.family || ''); break;
      case 'stock': cmp = (a.stock || 0) - (b.stock || 0); break;
      case 'price': cmp = (a.price || 0) - (b.price || 0); break;
      case 'value': cmp = ((a.cost_price || a.price) * (a.stock || 0)) - ((b.cost_price || b.price) * (b.stock || 0)); break;
      default: cmp = 0;
    }
    return dir === 'desc' ? -cmp : cmp;
  });

  const paginatedProducts = filteredProducts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));

  const allFamilies = [...new Set(products.map(p => p.family).filter(Boolean))].sort();

  const stats = {
    total: products.length,
    totalStock: products.reduce((s, p) => s + (p.stock || 0), 0),
    outOfStock: products.filter(p => (p.stock || 0) === 0).length,
    lowStock: products.filter(p => p.min_stock > 0 && (p.stock || 0) > 0 && (p.stock || 0) <= p.min_stock).length,
    invValue: products.reduce((s, p) => s + ((p.cost_price || p.price || 0) * (p.stock || 0)), 0),
    avgCost: (() => {
      const withCost = products.filter(p => p.cost_price > 0);
      return withCost.length > 0 ? withCost.reduce((s, p) => s + p.cost_price, 0) / withCost.length : 0;
    })(),
    familiesCount: new Set(products.map(p => p.family).filter(Boolean)).size,
    suppliersCount: new Set(products.map(p => p.supplier).filter(Boolean)).size
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? new Set(paginatedProducts.map(p => p.id)) : new Set());
  };

  const openAdjust = (product) => {
    setAdjustProduct(product);
    setAdjustMode('adjust');
    setAdjustValue('');
    setAdjustReason('');
    setAdjustOpen(true);
  };

  const confirmAdjust = () => {
    if (!adjustProduct) return;
    const delta = adjustMode === 'adjust' ? (parseInt(adjustValue) || 0) : (parseInt(adjustValue) - (adjustProduct.stock || 0));
    const after = Math.max(0, (adjustProduct.stock || 0) + delta);
    setProducts(products.map(p => p.id === adjustProduct.id ? { ...p, stock: after } : p));
    setMovements([{
      id: Date.now(),
      product_name: adjustProduct.name,
      movement_type: delta >= 0 ? 'adjustment' : 'correction',
      quantity: Math.abs(delta),
      stock_before: adjustProduct.stock || 0,
      stock_after: after,
      reason: adjustReason || (adjustMode === 'adjust' ? 'Ajustement stock' : 'Correction stock'),
      reference: '',
      user_name: 'Admin',
      created_at: new Date().toISOString()
    }, ...movements]);
    notify(`Stock de "${adjustProduct.name}" mis à jour (${after})`);
    setAdjustOpen(false);
    setAdjustProduct(null);
  };

  const openDetails = (product) => {
    setDetailsProduct(product);
    setDetailsOpen(true);
  };

  const resetFilters = () => {
    setSearch('');
    setFilterFamily('all');
    setFilterStatus('all');
    setPage(1);
  };

  const filteredMovements = movements.filter(m =>
    (movFilterType === 'all' || m.movement_type === movFilterType) &&
    (!movFilterSearch || m.product_name.toLowerCase().includes(movFilterSearch.toLowerCase()))
  );

  const movementSummary = {
    total_movements: movements.length,
    total_in: movements.filter(m => ['in', 'purchase', 'return', 'initial'].includes(m.movement_type)).reduce((s, m) => s + m.quantity, 0),
    total_out: movements.filter(m => ['out', 'sale', 'waste'].includes(m.movement_type)).reduce((s, m) => s + Math.abs(m.quantity), 0),
    total_adjustments: movements.filter(m => ['adjustment', 'correction'].includes(m.movement_type)).length
  };

  const hasFilters = search || filterFamily !== 'all' || filterStatus !== 'all';

  return (
    <div className="space-y-4 p-6" style={{ fontFamily: config.fontFamily, fontSize: config.fontSize, color: textColor }}>
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: textColor }}>
            <Warehouse className="h-6 w-6" /> Gestion des stocks
          </h1>
          <p className="text-sm" style={{ color: mutedColor }}>
            {stats.total} produit{stats.total !== 1 ? 's' : ''} • {stats.totalStock} unités en stock
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => notify('Export CSV simulé (démo)')}>
            <Download className="h-4 w-4 mr-1" /> Exporter
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setMovements([...movements]); notify('Données actualisées'); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total produits', value: stats.total, icon: Package, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Stock faible', value: stats.lowStock, icon: TrendingDown, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Ruptures', value: stats.outOfStock, icon: AlertTriangle, color: '#ef4444', bg: '#fef2f2' },
          { label: 'Valeur stock (coût)', value: formatPrice(stats.invValue), icon: DollarSign, color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'Prix moyen achat', value: formatPrice(stats.avgCost), icon: ShoppingCart, color: '#06b6d4', bg: '#ecfeff' },
          { label: 'Unités totales', value: stats.totalStock.toLocaleString(), icon: Box, color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Familles', value: stats.familiesCount, icon: Tag, color: '#ec4899', bg: '#fdf2f8' },
          ...(isSupplierEnabled ? [{ label: 'Fournisseurs', value: stats.suppliersCount, icon: Truck, color: '#f97316', bg: '#fff7ed' }] : []),
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
          {isSupplierEnabled && (
            <TabsTrigger value="suppliers" className="text-xs"><Truck className="h-3.5 w-3.5 mr-1" />Fournisseurs</TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* TAB: INVENTORY */}
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
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={resetFilters}>
                <X className="h-3.5 w-3.5 mr-1" /> Réinitialiser
              </Button>
            )}
          </div>
          <p className="text-xs" style={{ color: mutedColor }}>
            {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} affiché{filteredProducts.length !== 1 ? 's' : ''} sur {products.length}
          </p>

          {/* BULK TOOLBAR */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-muted/50 border rounded-xl px-4 py-2">
              <Badge variant="default" className="text-xs">{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</Badge>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { const first = products.find(p => selectedIds.has(p.id)); if (first) openAdjust(first); }}>
                <Edit className="h-3.5 w-3.5 mr-1" /> Ajuster stock
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => notify('Export CSV simulé (démo)')}>
                <Download className="h-3.5 w-3.5 mr-1" /> Exporter
              </Button>
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
                        <Checkbox checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.has(p.id))} onCheckedChange={toggleSelectAll} />
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Famille</TableHead>
                      {isSupplierEnabled && <TableHead>Fournisseur</TableHead>}
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
                        <TableCell colSpan={isSupplierEnabled ? 13 : 12} className="text-center py-12 text-muted-foreground">
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
                          <TableCell className="text-sm">{product.family || '-'}</TableCell>
                          {isSupplierEnabled && <TableCell className="text-sm max-w-[120px] truncate">{product.supplier || '-'}</TableCell>}
                          <TableCell className="text-right font-mono text-sm font-medium">{product.stock || 0}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">{product.min_stock || 0}</TableCell>
                          <TableCell className="text-sm">{product.unit || '-'}</TableCell>
                          <TableCell className="text-right text-sm">{product.cost_price > 0 ? formatPrice(product.cost_price) : '-'}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatPrice(product.price)}</TableCell>
                          <TableCell className="text-right text-sm">{value > 0 ? formatPrice(value) : '-'}</TableCell>
                          <TableCell><Badge variant={status.variant} className="text-[10px]">{status.text}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetails(product)} title="Détails"><Eye className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAdjust(product)} title="Ajuster stock"><Edit className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Supprimer" onClick={() => {
                                if (window.confirm(`Supprimer "${product.name}" ?`)) {
                                  setProducts(products.filter(p => p.id !== product.id));
                                  notify(`Produit "${product.name}" supprimé`);
                                }
                              }}><Trash2 className="h-3.5 w-3.5" /></Button>
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
                  <p className="text-xs text-muted-foreground">Page {page} / {totalPages}</p>
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

      {/* TAB: MOVEMENTS */}
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
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={movFilterSearch} onChange={e => setMovFilterSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Button variant="outline" size="sm" className="h-9" onClick={() => notify('Données actualisées')}><RefreshCw className="h-4 w-4 mr-1" /> Charger</Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => notify('Export CSV simulé (démo)')}>
              <Download className="h-4 w-4 mr-1" /> Exporter
            </Button>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Total: <span className="font-medium">{movementSummary.total_movements}</span></span>
            <span>Entrées: <span className="font-medium text-emerald-600">{movementSummary.total_in}</span></span>
            <span>Sorties: <span className="font-medium text-red-600">{movementSummary.total_out}</span></span>
            <span>Ajustements: <span className="font-medium text-orange-600">{movementSummary.total_adjustments}</span></span>
          </div>
          <Card>
            <CardContent className="p-0">
              {filteredMovements.length === 0 ? (
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
                      {filteredMovements.map(m => {
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
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* TAB: SUPPLIERS */}
      {isSupplierEnabled && activeTab === 'suppliers' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Fournisseur</TableHead>
                  <TableHead className="text-right">Produits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...new Set(products.map(p => p.supplier).filter(Boolean))].map((name, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm"><Truck className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />{name}</TableCell>
                    <TableCell className="text-right text-sm">{products.filter(p => p.supplier === name).length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ADJUST STOCK DIALOG */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Gestion du stock</DialogTitle>
            <DialogDescription>Modifier le stock pour {adjustProduct?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Stock actuel</Label><Input value={adjustProduct?.stock || 0} disabled className="mt-1" /></div>
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <button type="button" onClick={() => setAdjustMode('adjust')}
                className={`flex-1 py-1 px-3 text-sm rounded-md transition-all ${adjustMode === 'adjust' ? 'bg-white shadow font-medium' : 'text-muted-foreground'}`}>Ajuster (+/-)</button>
              <button type="button" onClick={() => setAdjustMode('set')}
                className={`flex-1 py-1 px-3 text-sm rounded-md transition-all ${adjustMode === 'set' ? 'bg-white shadow font-medium' : 'text-muted-foreground'}`}>Définir</button>
            </div>
            <div>
              <Label>{adjustMode === 'adjust' ? 'Ajustement (+/-)' : 'Nouveau stock'}</Label>
              <Input type="number" className="mt-1" placeholder={adjustMode === 'adjust' ? 'Ex: +10 ou -5' : 'Ex: 50'} value={adjustValue} onChange={e => setAdjustValue(e.target.value)} />
            </div>
            <div><Label>Raison</Label><Input className="mt-1" placeholder="Raison du changement..." value={adjustReason} onChange={e => setAdjustReason(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Annuler</Button>
            <Button onClick={confirmAdjust} disabled={!adjustValue}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRODUCT DETAILS DIALOG */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{detailsProduct?.name}</DialogTitle>
            <DialogDescription>Informations du produit</DialogDescription>
          </DialogHeader>
          {detailsProduct && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-muted-foreground">Famille</Label><p className="font-medium">{detailsProduct.family || '-'}</p></div>
                <div><Label className="text-muted-foreground">Unité</Label><p className="font-medium">{detailsProduct.unit || '-'}</p></div>
                <div><Label className="text-muted-foreground">Prix vente</Label><p className="font-medium">{formatPrice(detailsProduct.price)}</p></div>
                <div><Label className="text-muted-foreground">Prix achat</Label><p className="font-medium">{detailsProduct.cost_price > 0 ? formatPrice(detailsProduct.cost_price) : '-'}</p></div>
                <div><Label className="text-muted-foreground">Stock</Label><p className="font-medium">{detailsProduct.stock || 0}</p></div>
                <div><Label className="text-muted-foreground">Stock min.</Label><p className="font-medium">{detailsProduct.min_stock || 0}</p></div>
              </div>
              {detailsProduct.barcode && (
                <div><Label className="text-muted-foreground">Code-barres</Label><p className="font-mono text-sm">{detailsProduct.barcode}</p></div>
              )}
              <div>
                <Label className="text-muted-foreground">Mouvements</Label>
                <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                  {movements.filter(m => m.product_name === detailsProduct.name).map(m => {
                    const style = getMovementStyle(m.movement_type);
                    return (
                      <div key={m.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatDate(m.created_at)}</span>
                          <Badge variant="outline" className={`text-[10px] ${style.color}`}>{style.label}</Badge>
                        </div>
                        <span className="font-mono text-sm">{m.quantity}</span>
                      </div>
                    );
                  })}
                  {movements.filter(m => m.product_name === detailsProduct.name).length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucun mouvement</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDetailsOpen(false); setDetailsProduct(null); }}>Fermer</Button>
            <Button variant="outline" onClick={() => { if (detailsProduct) { setDetailsOpen(false); openAdjust(detailsProduct); } }}><Plus className="h-4 w-4 mr-1" /> Ajuster</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSInventory;
