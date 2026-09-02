import { useState, FormEvent } from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Checkbox } from '../../../ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '../../../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table';
import {
  Plus, Edit, Trash2, Package, Search, Barcode, Settings,
  LayoutGrid, List, ArrowUpDown, Upload, Download, Copy,
  Tag, X, DollarSign, TrendingUp, ChefHat,
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  family: string;
  price: number;
  cost_price: number;
  barcode: string;
  image: string | null;
  stock: number;
  min_stock: number;
  unit: string;
  supplier: string;
  description: string;
  price_type: string;
  requires_kitchen?: boolean | number;
  preparation_department?: string;
}

interface Family { name: string; product_count: number }

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nom A→Z' },
  { value: 'name-desc', label: 'Nom Z→A' },
  { value: 'price-asc', label: 'Prix ↑' },
  { value: 'price-desc', label: 'Prix ↓' },
  { value: 'stock-asc', label: 'Stock ↑' },
  { value: 'stock-desc', label: 'Stock ↓' },
  { value: 'newest', label: 'Récents' },
  { value: 'margin', label: 'Marge ↓' },
];

const DEMO_PRODUCTS: Product[] = [
  { id: 1, name: 'Café Expresso', family: 'Boissons', price: 2.50, cost_price: 0.80, barcode: '1234567890123', image: null, stock: 120, min_stock: 20, unit: 'unit', supplier: 'Torréfaction locale', description: 'Café italien corsé', price_type: 'ttc' },
  { id: 2, name: 'Croissant Nature', family: 'Viennoiseries', price: 1.80, cost_price: 0.60, barcode: '1234567891234', image: null, stock: 45, min_stock: 10, unit: 'unit', supplier: 'Boulangerie Martin', description: 'Croissant au beurre', price_type: 'ttc' },
  { id: 3, name: 'Sandwich Jambon', family: 'Sandwichs', price: 4.50, cost_price: 2.10, barcode: '1234567892345', image: null, stock: 8, min_stock: 5, unit: 'unit', supplier: '', description: 'Pain frais, jambon', price_type: 'ttc' },
  { id: 4, name: 'Eau Minérale 50cl', family: 'Boissons', price: 1.20, cost_price: 0.30, barcode: '1234567893456', image: null, stock: 200, min_stock: 30, unit: 'bouteille', supplier: 'Source Verte', description: 'Eau minérale naturelle', price_type: 'ttc' },
  { id: 5, name: 'Salade César', family: 'Salades', price: 7.90, cost_price: 3.50, barcode: '', image: null, stock: 0, min_stock: 5, unit: 'unit', supplier: '', description: 'Salade verte, croûtons, parmesan', price_type: 'ttc' },
  { id: 6, name: 'Muffin Chocolat', family: 'Pâtisseries', price: 2.80, cost_price: 0.90, barcode: '1234567895678', image: null, stock: 3, min_stock: 10, unit: 'unit', supplier: '', description: 'Muffin moelleux aux pépites', price_type: 'ttc' },
];

const DEMO_FAMILIES: Family[] = [
  { name: 'Boissons', product_count: 2 },
  { name: 'Viennoiseries', product_count: 1 },
  { name: 'Sandwichs', product_count: 1 },
  { name: 'Salades', product_count: 1 },
  { name: 'Pâtisseries', product_count: 1 },
];

const EMPTY_FORM = { name: '', family: '', price: '', cost_price: '', barcode: '', stock: '', min_stock: '', description: '' };

interface POSProductsProps {
  config: any;
  modules?: any[];
  setNotification?: (n: any) => void;
}

// Ported from admin/src/components/pos/preview/modules/POSProducts.jsx —
// real CRUD (create/edit/duplicate/delete/barcode generation, family
// management, card/table view, bulk actions) replacing the previous
// window.alert()-only stub actions.
export const POSProducts = ({ config, modules, setNotification }: POSProductsProps) => {
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [families, setFamilies] = useState<Family[]>(DEMO_FAMILIES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('all');
  const [kitchenFilter, setKitchenFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [viewMode, setViewMode] = useState('cards');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [newFamily, setNewFamily] = useState('');
  const [familyError, setFamilyError] = useState('');

  const textColor = config.textColor || '#1f2937';
  const mutedColor = config.textMutedColor || '#6b7280';

  const moduleNames = (modules || []).map((m: any) => ((m && (m.slug || m.name)) || '').toLowerCase().trim());
  const isBarcodeEnabled = modules ? moduleNames.some((n: string) => n.includes('barcode')) : true;
  const isSupplierEnabled = modules ? moduleNames.some((n: string) => n.includes('supplier')) : false;
  const isKitchenEnabled = modules ? moduleNames.some((n: string) => n.includes('kitchen')) : false;

  const notify = (message: string, type = 'success') => {
    if (setNotification) setNotification({ message, type });
  };

  const formatPrice = (price: number) => {
    const val = parseFloat(String(price)) || 0;
    return config.currencyPosition === 'before' ? `${config.currency}${val.toFixed(2)}` : `${val.toFixed(2)} ${config.currency}`;
  };

  const generateLocalBarcode = () => {
    const randomDigits = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += (i % 2 === 0 ? 1 : 3) * parseInt(randomDigits[i]);
    }
    return randomDigits + ((10 - (sum % 10)) % 10);
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(sortedAndFiltered.map((p) => p.id)) : new Set());
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      notify('Veuillez remplir les champs obligatoires', 'error');
      return;
    }
    const payload = {
      name: formData.name,
      family: formData.family || '',
      price: parseFloat(formData.price) || 0,
      cost_price: parseFloat(formData.cost_price) || 0,
      barcode: formData.barcode || '',
      stock: parseInt(formData.stock) || 0,
      min_stock: parseInt(formData.min_stock) || 0,
      unit: 'unit',
      supplier: '',
      description: formData.description || '',
      price_type: 'ttc',
    };
    if (editingProduct) {
      setProducts(products.map((p) => (p.id === editingProduct.id ? { ...p, ...payload } : p)));
      notify(`Produit "${payload.name}" modifié`);
    } else {
      setProducts([...products, { id: Date.now(), image: null, ...payload }]);
      notify(`Produit "${payload.name}" créé`);
    }
    setDialogOpen(false);
    setEditingProduct(null);
    setFormData(EMPTY_FORM);
  };

  const openCreate = () => {
    setEditingProduct(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      family: product.family || '',
      price: String(product.price || ''),
      cost_price: String(product.cost_price || ''),
      barcode: product.barcode || '',
      stock: String(product.stock || ''),
      min_stock: String(product.min_stock || ''),
      description: product.description || '',
    });
    setDialogOpen(true);
  };

  const handleDuplicate = (product: Product) => {
    setProducts([...products, { ...product, id: Date.now(), name: `${product.name} (copie)`, barcode: '' }]);
    notify(`Produit "${product.name}" dupliqué`);
  };

  const handleDelete = (product: Product) => {
    if (window.confirm(`Supprimer "${product.name}" ?`)) {
      setProducts(products.filter((p) => p.id !== product.id));
      notify(`Produit "${product.name}" supprimé`);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Supprimer ${selectedIds.size} produit(s) ?`)) {
      setProducts(products.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      notify(`${selectedIds.size} produit(s) supprimé(s)`);
    }
  };

  const generateBarcodeForProduct = (product: Product) => {
    setProducts(products.map((p) => (p.id === product.id ? { ...p, barcode: generateLocalBarcode() } : p)));
    notify('Code-barres généré');
  };

  const handleBulkGenerateBarcodes = () => {
    setProducts(products.map((p) => (selectedIds.has(p.id) ? { ...p, barcode: p.barcode || generateLocalBarcode() } : p)));
    notify('Codes-barres générés');
  };

  const handleAddFamily = () => {
    const trimmed = newFamily.trim();
    if (!trimmed) {
      setFamilyError('Veuillez entrer un nom');
      setTimeout(() => setFamilyError(''), 3000);
      return;
    }
    if (families.some((f) => f.name === trimmed)) {
      setFamilyError('Cette famille existe déjà');
      setTimeout(() => setFamilyError(''), 3000);
      return;
    }
    setFamilies([...families, { name: trimmed, product_count: 0 }]);
    setNewFamily('');
    notify(`Famille "${trimmed}" ajoutée`);
  };

  const handleDeleteFamily = (family: Family) => {
    if (window.confirm(`Supprimer la famille "${family.name}" ?`)) {
      setFamilies(families.filter((f) => f.name !== family.name));
      notify(`Famille "${family.name}" supprimée`);
    }
  };

  const stats = {
    total: products.length,
    families: families.length,
    avgMargin: products.length > 0
      ? products.reduce((s, p) => s + (p.cost_price > 0 ? ((p.price - p.cost_price) / p.cost_price) * 100 : 0), 0) / products.length
      : 0,
    avgPrice: products.length > 0 ? products.reduce((s, p) => s + (p.price || 0), 0) / products.length : 0,
  };

  const familyNames = families.map((f) => f.name);

  const sortedAndFiltered = [...products]
    .filter((p) => {
      const s = searchTerm.toLowerCase();
      const matchSearch = !s ||
        p.name.toLowerCase().includes(s) ||
        (p.family || '').toLowerCase().includes(s) ||
        (p.supplier || '').toLowerCase().includes(s) ||
        (p.barcode || '').includes(s);
      const matchFamily = selectedFamily === 'all' || p.family === selectedFamily;
      const isKitchen = p.requires_kitchen === 1 || p.requires_kitchen === true;
      const matchKitchen = !isKitchenEnabled || kitchenFilter === 'all' || (kitchenFilter === 'kitchen' && isKitchen) || (kitchenFilter === 'non-kitchen' && !isKitchen);
      return matchSearch && matchFamily && matchKitchen;
    })
    .sort((a, b) => {
      const [key, dir] = sortBy.split('-');
      let cmp = 0;
      switch (key) {
        case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break;
        case 'price': cmp = (a.price || 0) - (b.price || 0); break;
        case 'stock': cmp = (a.stock || 0) - (b.stock || 0); break;
        case 'newest': cmp = (a.id || 0) - (b.id || 0); break;
        case 'margin': cmp = (a.cost_price > 0 ? (a.price - a.cost_price) / a.cost_price : 0) - (b.cost_price > 0 ? (b.price - b.cost_price) / b.cost_price : 0); break;
        default: cmp = 0;
      }
      return dir === 'desc' ? -cmp : cmp;
    });

  return (
    <div className="space-y-4 py-6" style={{ fontFamily: config.fontFamily, fontSize: config.fontSize, color: textColor }}>
      {/* TOOLBAR */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: textColor }}>Produits</h1>
            <p className="text-sm" style={{ color: mutedColor }}>
              {stats.total} produit{stats.total > 1 ? 's' : ''} • {stats.families} famille{stats.families > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isBarcodeEnabled && stats.total > 0 && products.some((p) => !p.barcode) && (
              <Button variant="outline" size="sm" onClick={handleBulkGenerateBarcodes}>
                <Barcode className="h-4 w-4 mr-1" /> Barcodes ({products.filter((p) => !p.barcode).length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => notify('Export CSV simulé (démo)')}>
              <Upload className="h-4 w-4 mr-1" /> Importer
            </Button>
            <Button variant="outline" size="sm" onClick={() => notify('Export CSV simulé (démo)')}>
              <Download className="h-4 w-4 mr-1" /> Exporter
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFamilyDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-1" /> Familles
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nouveau produit
            </Button>
          </div>
        </div>

        {/* Search / Filter / Sort / View */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isSupplierEnabled ? 'Rechercher par nom, famille, fournisseur, code-barres...' : 'Rechercher par nom, famille, code-barres...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={selectedFamily} onValueChange={setSelectedFamily}>
            <SelectTrigger className="w-[180px] h-9">
              <Tag className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les familles</SelectItem>
              {familyNames.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
            </SelectContent>
          </Select>
          {isKitchenEnabled && (
            <Select value={kitchenFilter} onValueChange={setKitchenFilter}>
              <SelectTrigger className="w-[170px] h-9">
                <ChefHat className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les produits</SelectItem>
                <SelectItem value="kitchen">Produits cuisine</SelectItem>
                <SelectItem value="non-kitchen">Non-cuisine</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] h-9">
              <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="h-6 w-px bg-border" />
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList className="h-9">
              <TabsTrigger value="cards" className="h-7 px-3"><LayoutGrid className="h-3.5 w-3.5" /></TabsTrigger>
              <TabsTrigger value="table" className="h-7 px-3"><List className="h-3.5 w-3.5" /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Package, color: '#3b82f6' },
          { label: 'Familles', value: stats.families, icon: Tag, color: '#8b5cf6' },
          { label: 'Marge moy.', value: `${stats.avgMargin.toFixed(0)}%`, icon: TrendingUp, color: '#14b8a6' },
          { label: 'Prix moyen', value: formatPrice(stats.avgPrice), icon: DollarSign, color: '#22c55e' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.color + '15' }}>
                <Icon className="h-4 w-4" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-sm font-semibold tabular-nums">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* BULK TOOLBAR */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-muted/50 border rounded-xl px-4 py-2">
          <Badge variant="default" className="text-xs">{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</Badge>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleBulkDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
          </Button>
          {isBarcodeEnabled && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleBulkGenerateBarcodes}>
              <Barcode className="h-3.5 w-3.5 mr-1" /> Générer codes-barres
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => setSelectedIds(new Set())}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {/* CONTENT */}
      {sortedAndFiltered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {searchTerm || selectedFamily !== 'all' || kitchenFilter !== 'all' ? 'Aucun produit trouvé' : 'Aucun produit'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchTerm || selectedFamily !== 'all' || kitchenFilter !== 'all' ? 'Essayez de modifier vos critères de recherche' : 'Commencez par créer votre premier produit'}
          </p>
          {!searchTerm && selectedFamily === 'all' && kitchenFilter === 'all' && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Créer un produit
            </Button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedAndFiltered.map((product) => {
            const stock = product.stock || 0;
            const minStock = product.min_stock || 0;
            const negativeStock = stock < 0;
            const outOfStock = stock === 0;
            const lowStock = minStock > 0 && stock > 0 && stock <= minStock;
            const margin = product.cost_price > 0 ? ((product.price - product.cost_price) / product.cost_price * 100).toFixed(0) : null;
            const isSelected = selectedIds.has(product.id);

            return (
              <Card
                key={product.id}
                className={`group relative overflow-hidden transition-all hover:shadow-md cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
                onClick={() => openEdit(product)}
              >
                <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(product.id)} className="bg-white/80 backdrop-blur" />
                </div>

                <div className="relative h-36 bg-muted">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    {outOfStock ? (
                      <Badge variant="destructive" className="text-[10px] shadow-sm">Rupture</Badge>
                    ) : lowStock ? (
                      <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-600 border-orange-200 shadow-sm">Stock faible</Badge>
                    ) : null}
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-1">{product.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {product.family && <Badge variant="secondary" className="text-[10px]">{product.family}</Badge>}
                      {isKitchenEnabled && (product.requires_kitchen === 1 || product.requires_kitchen === true) && (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">
                          <ChefHat className="h-2.5 w-2.5 mr-0.5" />
                          {product.preparation_department || 'Cuisine'}
                        </Badge>
                      )}
                      {product.unit && product.unit !== 'unit' && <Badge variant="outline" className="text-[10px]">{product.unit}</Badge>}
                    </div>
                  </div>

                  {isSupplierEnabled && product.supplier && (
                    <p className="text-xs text-muted-foreground mb-2 truncate">📦 {product.supplier}</p>
                  )}

                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-lg font-bold tabular-nums">{formatPrice(product.price)}</p>
                      {product.cost_price > 0 && <p className="text-xs text-muted-foreground">Coût: {formatPrice(product.cost_price)}</p>}
                    </div>
                    {margin !== null && (
                      <Badge variant="outline" className={`text-[10px] ${parseFloat(margin) > 0 ? 'text-emerald-600 border-emerald-200' : 'text-red-600 border-red-200'}`}>
                        +{margin}%
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: negativeStock ? '100%' : `${Math.min(100, minStock > 0 ? (stock / minStock) * 100 : stock > 0 ? 100 : 0)}%`,
                          backgroundColor: negativeStock ? '#dc2626' : outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#22c55e',
                        }}
                      />
                    </div>
                    <span className={`text-xs font-medium tabular-nums ${negativeStock ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>{stock}</span>
                  </div>

                  <div className="flex items-center gap-1 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs flex-1" onClick={() => openEdit(product)}>
                      <Edit className="h-3 w-3 mr-1" /> Modifier
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(product)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    {isBarcodeEnabled && !product.barcode && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => generateBarcodeForProduct(product)}>
                        <Barcode className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(product)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10">
                  <Checkbox
                    checked={sortedAndFiltered.length > 0 && sortedAndFiltered.every((p) => selectedIds.has(p.id))}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Tout sélectionner"
                  />
                </TableHead>
                <TableHead className="w-12">Img</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Famille</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-right">Coût</TableHead>
                <TableHead className="text-right">Marge</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                {isBarcodeEnabled && <TableHead>Code-barres</TableHead>}
                <TableHead>Fournisseur</TableHead>
                <TableHead className="text-right w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFiltered.map((product) => {
                const stock = product.stock ?? 0;
                const minStock = product.min_stock ?? 0;
                const margin = product.cost_price > 0 ? ((product.price - product.cost_price) / product.cost_price * 100).toFixed(0) : null;
                const stockBadge = stock === 0
                  ? <Badge variant="destructive" className="text-xs">Rupture</Badge>
                  : (minStock > 0 && stock <= minStock)
                    ? <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 bg-orange-50">Faible</Badge>
                    : <Badge variant="default" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">{stock}</Badge>;
                return (
                  <TableRow key={product.id} className={`transition-colors ${selectedIds.has(product.id) ? 'bg-muted/50' : 'hover:bg-muted/30'}`} onClick={() => openEdit(product)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => toggleSelect(product.id)} aria-label={`Sélectionner ${product.name}`} />
                    </TableCell>
                    <TableCell>
                      {product.image ? (
                        <img src={product.image} alt="" className="w-8 h-8 rounded object-cover" loading="lazy" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground/30" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        {product.price_type && (
                          <Badge variant="outline" className="text-[10px] mt-0.5 px-1 py-0">{product.price_type === 'ht' ? 'HT' : 'TTC'}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{product.family || '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatPrice(product.price)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatPrice(product.cost_price || 0)}</TableCell>
                    <TableCell className="text-right">
                      {margin === null ? <span className="text-muted-foreground">—</span> : <span className="font-medium" style={{ color: parseFloat(margin) > 0 ? '#22c55e' : '#ef4444' }}>{margin}%</span>}
                    </TableCell>
                    <TableCell className="text-center">{stockBadge}</TableCell>
                    {isBarcodeEnabled && (
                      <TableCell>
                        {product.barcode ? (
                          <span className="font-mono text-xs text-muted-foreground">{product.barcode}</span>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); generateBarcodeForProduct(product); }}>
                            <Barcode className="h-3 w-3 mr-1" /> Générer
                          </Button>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">{product.supplier || '—'}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(product)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(product)}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(product)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* PRODUCT FORM DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
            <DialogDescription>Configurez les informations du produit</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-2">
              <Label>Nom du produit *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Café Expresso, Croissant..." required />
            </div>
            <div className="grid gap-2">
              <Label>Famille</Label>
              <Select value={formData.family} onValueChange={(value) => setFormData({ ...formData, family: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une famille" />
                </SelectTrigger>
                <SelectContent>
                  {familyNames.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Prix de vente *</Label>
                <Input type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="0.00" required />
              </div>
              <div className="grid gap-2">
                <Label>Prix d'achat</Label>
                <Input type="number" step="0.01" min="0" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Stock initial</Label>
                <Input type="number" min="0" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>Stock minimum</Label>
                <Input type="number" min="0" value={formData.min_stock} onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })} placeholder="0" />
              </div>
            </div>
            {isBarcodeEnabled && (
              <div className="grid gap-2">
                <Label>Code-barres</Label>
                <div className="flex gap-2">
                  <Input value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} placeholder="Code-barres du produit" className="flex-1 font-mono" />
                  <Button type="button" variant="outline" size="sm" className="px-3 shrink-0" onClick={() => setFormData({ ...formData, barcode: generateLocalBarcode() })}>
                    <Barcode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description du produit..." />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit">{editingProduct ? 'Enregistrer' : 'Créer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* FAMILY MANAGEMENT DIALOG */}
      <Dialog open={familyDialogOpen} onOpenChange={setFamilyDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Gérer les familles</DialogTitle>
            <DialogDescription>Ajoutez, modifiez ou supprimez des familles pour organiser vos produits</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col flex-1 min-h-0 gap-4">
            <div className="flex gap-2 flex-shrink-0">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Nouvelle famille"
                  value={newFamily}
                  onChange={(e) => { setNewFamily(e.target.value); if (familyError) setFamilyError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFamily(); } }}
                />
                {familyError && <p className="text-xs text-destructive">{familyError}</p>}
              </div>
              <Button onClick={handleAddFamily} className="self-start mt-0"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
            </div>
            <div className="flex flex-col flex-1 min-h-0">
              <Label className="text-xs text-muted-foreground mb-2 flex-shrink-0">Familles ({families.length})</Label>
              {families.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune famille</p>
                </div>
              ) : (
                <div className="space-y-1 overflow-y-auto border rounded-lg p-2">
                  {families.map((family) => (
                    <div key={family.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{family.name}</span>
                        {family.product_count > 0 && <Badge variant="secondary" className="text-[10px]">{family.product_count}</Badge>}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteFamily(family)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSProducts;
