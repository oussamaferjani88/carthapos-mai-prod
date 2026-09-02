import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { isPreviewMode } from '../utils/environment';
import { activityLog } from '../utils/activityLog';
import { getImageStyle } from '../utils/imageSettings';
import ProductFormDialog from '../components/ProductFormDialog';
import ProductQuickView from '../components/ProductQuickView';
import ProductTableView from '../components/ProductTableView';
import ProductBulkToolbar from '../components/ProductBulkToolbar';
import CategoryIconPicker, { getIconComponent } from '../components/CategoryIconPicker';
import {
  Plus, Edit, Trash2, Package, Search, Barcode, Settings,
  LayoutGrid, List, ArrowUpDown, ChevronDown, Upload, Download, Copy,
  Box, Truck, Percent, Tag, Eye, X, ShoppingCart, DollarSign, TrendingUp, ChefHat
} from 'lucide-react';

const FamilyIcon = ({ iconName, className = 'w-4 h-4' }) => {
  const IconComponent = getIconComponent(iconName);
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
};

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nom A→Z' },
  { value: 'name-desc', label: 'Nom Z→A' },
  { value: 'price-asc', label: 'Prix ↑' },
  { value: 'price-desc', label: 'Prix ↓' },
  { value: 'stock-asc', label: 'Stock ↑' },
  { value: 'stock-desc', label: 'Stock ↓' },
  { value: 'newest', label: 'Récents' },
  { value: 'margin', label: 'Marge ↓' }
];

const DEMO_PRODUCTS = [
  { id: 1, name: 'Café Expresso', family: 'Boissons', price: 2.50, cost_price: 0.80, barcode: '1234567890123', image: null, stock: 120, min_stock: 20, unit: 'unit', supplier: 'Torréfaction locale', description: 'Café italien corsé', price_type: 'ttc' },
  { id: 2, name: 'Croissant Nature', family: 'Viennoiseries', price: 1.80, cost_price: 0.60, barcode: '1234567891234', image: null, stock: 45, min_stock: 10, unit: 'unit', supplier: 'Boulangerie Martin', description: 'Croissant au beurre', price_type: 'ttc' },
  { id: 3, name: 'Sandwich Jambon', family: 'Sandwichs', price: 4.50, cost_price: 2.10, barcode: '1234567892345', image: null, stock: 8, min_stock: 5, unit: 'unit', supplier: '', description: 'Pain frais, jambon', price_type: 'ttc' },
  { id: 4, name: 'Eau Minérale 50cl', family: 'Boissons', price: 1.20, cost_price: 0.30, barcode: '1234567893456', image: null, stock: 200, min_stock: 30, unit: 'bouteille', supplier: 'Source Verte', description: 'Eau minérale naturelle', price_type: 'ttc' },
  { id: 5, name: 'Salade César', family: 'Salades', price: 7.90, cost_price: 3.50, barcode: '', image: null, stock: 0, min_stock: 5, unit: 'unit', supplier: '', description: 'Salade verte, croûtons, parmesan', price_type: 'ttc' },
  { id: 6, name: 'Muffin Chocolat', family: 'Pâtisseries', price: 2.80, cost_price: 0.90, barcode: '1234567895678', image: null, stock: 3, min_stock: 10, unit: 'unit', supplier: '', description: 'Muffin moelleux aux pépites', price_type: 'ttc' }
];

export default function Products() {
  const { config: electronConfig } = useAppConfig();
  const { user } = useAuth();

  const getConfig = useCallback(() => {
    if (electronConfig?.theme) return POSConfiguration.createConfig(electronConfig.theme);
    if (typeof window !== 'undefined' && window.themeConfig) return POSConfiguration.createConfig(window.themeConfig);
    return POSConfiguration.createConfig({});
  }, [electronConfig]);

  const config = getConfig();

  const formatPrice = useCallback((price) => {
    const val = parseFloat(price) || 0;
    return config.currencyPosition === 'before'
      ? `${config.currency}${val.toFixed(2)}`
      : `${val.toFixed(2)} ${config.currency}`;
  }, [config]);

  const isBarcodeEnabled = electronConfig?.modules
    ? electronConfig.modules.some(m => (m.name || m) === 'barcode' && m.isEnabled !== false)
    : true;

  const isSupplierEnabled = electronConfig?.modules
    ? electronConfig.modules.some(m => (m.name || m) === 'suppliers' && m.isEnabled !== false)
    : false;

  const isKitchenEnabled = electronConfig?.modules
    ? electronConfig.modules.some(m => (m.name || m) === 'kitchen' && m.isEnabled !== false)
    : false;

  const { canCreate, canUpdate, canDelete, canManage } = usePermissions('products');
  const canEdit = canUpdate; // legacy alias used across this page
  const permsRef = useRef({ canCreate, canUpdate, canDelete });
  permsRef.current = { canCreate, canUpdate, canDelete };
  const permGuard = useCallback((action) => {
    const p = permsRef.current;
    const ok = action === 'create' ? p.canCreate : action === 'delete' ? p.canDelete : p.canUpdate;
    if (!ok) alert("Action non autorisée : vous avez un accès en lecture seule sur les produits.");
    return ok;
  }, []);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [viewMode, setViewMode] = useState('cards');
  const [families, setFamilies] = useState([]);
  const [vatRates, setVatRates] = useState([]);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [kitchenDepartments, setKitchenDepartments] = useState([]);
  const [kitchenFilter, setKitchenFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const [newFamily, setNewFamily] = useState('');
  const [newFamilyIcon, setNewFamilyIcon] = useState('');
  const [familyError, setFamilyError] = useState('');
  const [confirmDeleteFamily, setConfirmDeleteFamily] = useState(null);
  const [familyToDeleteInfo, setFamilyToDeleteInfo] = useState(null);
  const [moveToFamily, setMoveToFamily] = useState('__none__');
  const [editingFamilyName, setEditingFamilyName] = useState(null);
  const [editingFamilyNewName, setEditingFamilyNewName] = useState('');

  const [bulkFamilyOpen, setBulkFamilyOpen] = useState(false);
  const [bulkFamilyValue, setBulkFamilyValue] = useState('');
  const [bulkSupplierOpen, setBulkSupplierOpen] = useState(false);
  const [bulkSupplierValue, setBulkSupplierValue] = useState('');
  const [bulkVatOpen, setBulkVatOpen] = useState(false);
  const [bulkVatValue, setBulkVatValue] = useState('none');

  const familyInputRef = useRef(null);
  const familyErrorTimerRef = useRef(null);

  useEffect(() => {
    if (familyDialogOpen) requestAnimationFrame(() => familyInputRef.current?.focus());
  }, [familyDialogOpen]);

  const generateLocalBarcode = () => {
    const randomDigits = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += (i % 2 === 0 ? 1 : 3) * parseInt(randomDigits[i]);
    }
    return randomDigits + ((10 - (sum % 10)) % 10);
  };

  const loadData = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      setLoading(true);
      const [productsData, familiesData, vatData, kitchenDeptData] = await Promise.all([
        isPreviewMode() ? null : window.electronAPI.getProducts(),
        window.electronAPI.getFamilies?.() || [],
        window.electronAPI.getVatRates?.() || [],
        isKitchenEnabled ? (window.electronAPI.getKitchenDepartments?.() || []) : []
      ]);

      const prods = isPreviewMode() ? DEMO_PRODUCTS : (productsData || []);
      const fams = (familiesData || []).map(f => ({ name: f.name, icon: f.icon || '', product_count: f.product_count || 0 })).filter(f => f.name);

      // Compute product counts per family from products if not provided by DB
      const familyCounts = {};
      prods.forEach(p => {
        if (p.family) familyCounts[p.family] = (familyCounts[p.family] || 0) + 1;
      });
      fams.forEach(f => {
        if (!f.product_count) f.product_count = familyCounts[f.name] || 0;
      });

      setProducts(prods);
      setFamilies(fams);
      setVatRates(vatData || []);
      setKitchenDepartments(kitchenDeptData || []);

      if (window.electronAPI.getAllSettings) {
        try {
          const settings = await window.electronAPI.getAllSettings();
          if (settings?.taxEnabled !== undefined) setTaxEnabled(settings.taxEnabled);
        } catch { /* ignore */ }
      }
    } catch (error) {
      console.error('[Products] Load error:', error);
    } finally {
      setLoading(false);
    }
  }, [isKitchenEnabled]);

  useEffect(() => {
    loadData();
    const handleSale = () => loadData();
    window.addEventListener('sale-completed', handleSale);
    return () => window.removeEventListener('sale-completed', handleSale);
  }, [loadData]);

  const handleAddFamily = useCallback(async () => {
    const trimmed = newFamily.trim();
    if (familyErrorTimerRef.current) clearTimeout(familyErrorTimerRef.current);
    if (!trimmed) {
      setFamilyError('Veuillez entrer un nom');
      familyErrorTimerRef.current = setTimeout(() => setFamilyError(''), 3000);
      return;
    }
    if (families.some(f => f.name === trimmed)) {
      setFamilyError('Cette famille existe déjà');
      familyErrorTimerRef.current = setTimeout(() => setFamilyError(''), 3000);
      return;
    }
    try {
      if (window.electronAPI?.addFamily) {
        await window.electronAPI.addFamily(trimmed, null, newFamilyIcon || '');
      }
      // Append directly to state — no full reload
      setFamilies(prev => [...prev, { name: trimmed, icon: newFamilyIcon || '', product_count: 0 }]);
      setNewFamily('');
      setNewFamilyIcon('');
      familyInputRef.current?.focus();
    } catch (error) {
      setFamilyError('Erreur lors de l\'ajout');
      familyErrorTimerRef.current = setTimeout(() => setFamilyError(''), 3000);
    }
  }, [newFamily, newFamilyIcon, families]);

  const initiateDeleteFamily = useCallback(async (familyName) => {
    if (!window.electronAPI) return;
    try {
      const count = await window.electronAPI.query?.(
        'SELECT COUNT(*) as count FROM products WHERE family = ?', [familyName]
      );
      setFamilyToDeleteInfo({ name: familyName, count: count?.[0]?.count || 0 });
      setConfirmDeleteFamily(true);
    } catch {
      setFamilyToDeleteInfo({ name: familyName, count: 0 });
      setConfirmDeleteFamily(true);
    }
  }, []);

  const confirmDeleteFamilyAction = useCallback(async () => {
    if (!familyToDeleteInfo) return;
    try {
      if (moveToFamily !== '__none__' && window.electronAPI?.moveFamilyProducts) {
        await window.electronAPI.moveFamilyProducts(familyToDeleteInfo.name, moveToFamily);
      }
      if (window.electronAPI?.deleteFamily) {
        await window.electronAPI.deleteFamily(familyToDeleteInfo.name);
      }
      setFamilies(prev => prev.filter(f => f.name !== familyToDeleteInfo.name));
    } catch (error) {
      setFamilyError('Erreur lors de la suppression');
    }
    setConfirmDeleteFamily(false);
    setFamilyToDeleteInfo(null);
    setMoveToFamily('__none__');
  }, [familyToDeleteInfo, moveToFamily]);

  const handleRenameFamily = useCallback(async (oldName) => {
    const trimmed = editingFamilyNewName.trim();
    if (!trimmed) { setEditingFamilyName(null); return; }
    if (trimmed === oldName) { setEditingFamilyName(null); return; }
    if (families.some(f => f.name === trimmed)) {
      setFamilyError('Cette famille existe déjà');
      familyErrorTimerRef.current = setTimeout(() => setFamilyError(''), 3000);
      return;
    }
    try {
      if (window.electronAPI?.moveFamilyProducts) {
        await window.electronAPI.moveFamilyProducts(oldName, trimmed);
      }
      if (window.electronAPI?.deleteFamily) {
        await window.electronAPI.deleteFamily(oldName);
      }
      if (window.electronAPI?.addFamily) {
        await window.electronAPI.addFamily(trimmed, null, families.find(f => f.name === oldName)?.icon || '');
      }
      setFamilies(prev => prev.map(f => f.name === oldName ? { ...f, name: trimmed } : f));
      if (selectedFamily === oldName) setSelectedFamily(trimmed);
    } catch {
      setFamilyError('Erreur lors du renommage');
    }
    setEditingFamilyName(null);
    setEditingFamilyNewName('');
  }, [editingFamilyNewName, families, selectedFamily]);

  const handleBulkAssignFamily = useCallback(async () => {
    if (!permGuard('update')) return;
    if (!bulkFamilyValue) return;
    const ids = [...selectedIds];
    setProducts(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, family: bulkFamilyValue } : p));
    try {
      for (const id of ids) {
        if (window.electronAPI?.updateProduct) {
          const prod = products.find(p => p.id === id);
          if (prod) await window.electronAPI.updateProduct(id, { ...prod, family: bulkFamilyValue }, permsRef.current);
        }
      }
    } catch { await loadData(); }
    setBulkFamilyOpen(false);
    setBulkFamilyValue('');
  }, [selectedIds, products, user, loadData, bulkFamilyValue]);

  const handleBulkAssignSupplier = useCallback(async () => {
    if (!permGuard('update')) return;
    const ids = [...selectedIds];
    setProducts(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, supplier: bulkSupplierValue } : p));
    try {
      for (const id of ids) {
        if (window.electronAPI?.updateProduct) {
          const prod = products.find(p => p.id === id);
          if (prod) await window.electronAPI.updateProduct(id, { ...prod, supplier: bulkSupplierValue }, permsRef.current);
        }
      }
    } catch { await loadData(); }
    setBulkSupplierOpen(false);
    setBulkSupplierValue('');
  }, [selectedIds, products, user, loadData, bulkSupplierValue]);

  const handleBulkAssignVat = useCallback(async () => {
    if (!permGuard('update')) return;
    const vatId = bulkVatValue === 'none' ? null : parseInt(bulkVatValue) || null;
    const ids = [...selectedIds];
    setProducts(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, vat_rate_id: vatId } : p));
    try {
      for (const id of ids) {
        if (window.electronAPI?.updateProduct) {
          const prod = products.find(p => p.id === id);
          if (prod) await window.electronAPI.updateProduct(id, { ...prod, vat_rate_id: vatId }, permsRef.current);
        }
      }
    } catch { await loadData(); }
    setBulkVatOpen(false);
    setBulkVatValue('none');
  }, [selectedIds, products, user, loadData, bulkVatValue]);

  const handleBulkDuplicate = useCallback(async () => {
    if (!permGuard('create')) return;
    const toDuplicate = products.filter(p => selectedIds.has(p.id));
    const newProducts = [];
    for (const p of toDuplicate) {
      const dup = { ...p, id: undefined, name: `${p.name} (copie)`, barcode: '' };
      newProducts.push(dup);
    }
    setProducts(prev => [...prev, ...newProducts.map((p, i) => ({ ...p, id: `temp_dup_${Date.now()}_${i}` }))]);
    try {
      const saved = [];
      for (const p of newProducts) {
        if (window.electronAPI?.addProduct) {
          const s = await window.electronAPI.addProduct(p, permsRef.current);
          saved.push(s);
        }
      }
      setProducts(prev => {
        let result = [...prev];
        newProducts.forEach((p, i) => {
          const tempId = `temp_dup_${Date.now()}_${i}`;
          const idx = result.findIndex(r => r.id === tempId);
          if (idx >= 0 && saved[i]) result[idx] = { ...result[idx], id: saved[i].id };
        });
        return result;
      });
    } catch { await loadData(); }
    setSelectedIds(new Set());
  }, [selectedIds, products, user, loadData]);

  const sortedAndFiltered = useMemo(() => {
    let result = [...products];

    result = result.filter(p => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        p.name?.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search) ||
        p.supplier?.toLowerCase().includes(search) ||
        p.family?.toLowerCase().includes(search) ||
        p.category?.toLowerCase().includes(search) ||
        p.unit?.toLowerCase().includes(search) ||
        (isBarcodeEnabled && p.barcode?.includes(searchTerm));
      const matchesFamily = selectedFamily === 'all' || p.family === selectedFamily || p.category === selectedFamily;
      const isKitchen = p.requires_kitchen === 1 || p.requires_kitchen === true;
      const matchesKitchen = kitchenFilter === 'all' || (kitchenFilter === 'kitchen' && isKitchen) || (kitchenFilter === 'non-kitchen' && !isKitchen);
      return matchesSearch && matchesFamily && matchesKitchen;
    });

    const [key, dir] = sortBy.split('-');
    result.sort((a, b) => {
      let cmp = 0;
      switch (key) {
        case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break;
        case 'price': cmp = (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0); break;
        case 'stock': cmp = (a.stock || 0) - (b.stock || 0); break;
        case 'newest': cmp = new Date(a.created_at || 0) - new Date(b.created_at || 0); break;
        case 'margin': {
          const ma = a.cost_price > 0 ? (a.price - a.cost_price) / a.cost_price : -1;
          const mb = b.cost_price > 0 ? (b.price - b.cost_price) / b.cost_price : -1;
          cmp = ma - mb;
          break;
        }
        default: cmp = 0;
      }
      return dir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [products, searchTerm, selectedFamily, kitchenFilter, sortBy, isBarcodeEnabled]);

  const stats = useMemo(() => {
    const total = products.length;
    const familiesCount = families.length;
    const isManaged = p => !(p.manage_stock === 0 || p.manage_stock === false);
    const managedProducts = products.filter(isManaged);
    const outOfStock = managedProducts.filter(p => (p.stock || 0) === 0).length;
    const lowStock = managedProducts.filter(p => p.min_stock > 0 && (p.stock || 0) > 0 && (p.stock || 0) <= p.min_stock).length;
    const withMargin = products.filter(p => p.cost_price > 0);
    const avgMargin = withMargin.length > 0
      ? withMargin.reduce((sum, p) => sum + ((p.price - p.cost_price) / p.cost_price * 100), 0) / withMargin.length
      : 0;
    const inventoryValue = managedProducts.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);
    const avgPrice = total > 0 ? products.reduce((sum, p) => sum + (p.price || 0), 0) / total : 0;
    return { total, families: familiesCount, outOfStock, lowStock, avgMargin, inventoryValue, avgPrice };
  }, [products, families]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((checked) => {
    setSelectedIds(checked ? new Set(sortedAndFiltered.map(p => p.id)) : new Set());
  }, [sortedAndFiltered]);

  const handleFormSubmit = useCallback(async (productData) => {
    if (!permGuard(editingProduct ? 'update' : 'create')) return;
    try {
      if (editingProduct) {
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p));
        if (window.electronAPI) {
          try {
            await window.electronAPI.updateProduct(editingProduct.id, productData, permsRef.current);
            activityLog.log({ userId: user?.id || 0, userName: user?.fullName || user?.username || 'Inconnu', actionType: 'produit_modifie', entityType: 'produit', entityId: editingProduct.id, oldValue: { name: editingProduct.name, price: editingProduct.price }, newValue: productData, notes: `Produit "${productData.name}" modifié` });
          } catch (error) {
            await loadData();
            throw error;
          }
        }
        setEditingProduct(null);
      } else {
        const tempId = `temp_${Date.now()}`;
        const newProduct = { id: tempId, ...productData, created_at: new Date().toISOString() };
        setProducts(prev => [...prev, newProduct]);
        if (window.electronAPI) {
          try {
            const saved = await window.electronAPI.addProduct(productData, permsRef.current);
            activityLog.log({ userId: user?.id || 0, userName: user?.fullName || user?.username || 'Inconnu', actionType: 'produit_ajoute', entityType: 'produit', entityId: saved?.id || null, newValue: productData, notes: `Produit "${productData.name}" ajouté` });
            if (saved && String(saved.id) !== String(tempId)) {
              setProducts(prev => prev.map(p => p.id === tempId ? { ...p, id: saved.id } : p));
            }
          } catch (error) {
            setProducts(prev => prev.filter(p => p.id !== tempId));
            throw error;
          }
        }
      }
      await loadData();
    } catch (error) {
      throw error;
    }
  }, [editingProduct, user, loadData]);

  const handleDelete = useCallback(async (product) => {
    if (!permGuard('delete')) return;
    if (!confirm(`Supprimer "${product.name}" ?`)) return;
    setProducts(prev => prev.filter(p => p.id !== product.id));
    try {
      if (window.electronAPI) {
        await window.electronAPI.deleteProduct(product.id, permsRef.current);
        activityLog.log({ userId: user?.id || 0, userName: user?.fullName || user?.username || 'Inconnu', actionType: 'produit_supprime', entityType: 'produit', entityId: product.id, oldValue: { name: product.name, price: product.price }, notes: `Produit "${product.name}" supprimé` });
      }
    } catch (error) {
      setProducts(prev => [...prev, product]);
    }
  }, [user]);

  const handleDuplicate = useCallback((product) => {
    if (!permGuard('create')) return;
    setEditingProduct(null);
    setDialogOpen(true);
  }, [permGuard]);

  const handleBulkDelete = useCallback(async () => {
    if (!permGuard('delete')) return;
    if (!confirm(`Supprimer ${selectedIds.size} produit(s) ?`)) return;
    const toDelete = products.filter(p => selectedIds.has(p.id));
    setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
    try {
      for (const p of toDelete) {
        if (window.electronAPI) await window.electronAPI.deleteProduct(p.id, permsRef.current);
      }
      setSelectedIds(new Set());
    } catch { await loadData(); }
  }, [selectedIds, products, loadData]);

  const handleBulkGenerateBarcodes = useCallback(async () => {
    if (!permGuard('update')) return;
    const toUpdate = products.filter(p => selectedIds.has(p.id) && !p.barcode);
    if (toUpdate.length === 0) return;
    for (const p of toUpdate) {
      const barcode = generateLocalBarcode();
      setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, barcode } : pr));
      if (window.electronAPI) {
        try { await window.electronAPI.updateProduct(p.id, { ...p, barcode }, permsRef.current); } catch { /* skip */ }
      }
    }
  }, [selectedIds, products]);

  const generateBarcodeForProduct = useCallback(async (product) => {
    if (!permGuard('update')) return;
    const barcode = generateLocalBarcode();
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, barcode } : p));
    if (window.electronAPI) {
      try { await window.electronAPI.updateProduct(product.id, { ...product, barcode }, permsRef.current); } catch { /* skip */ }
    }
  }, [permGuard, user]);

  const generateBulkBarcodes = useCallback(async () => {
    if (!permGuard('update')) return;
    const withoutBarcode = products.filter(p => !p.barcode);
    if (withoutBarcode.length === 0) return;
    if (!confirm(`Générer des codes-barres pour ${withoutBarcode.length} produit(s) ?`)) return;
    for (const p of withoutBarcode) {
      const barcode = generateLocalBarcode();
      setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, barcode } : pr));
      if (window.electronAPI) {
        try { await window.electronAPI.updateProduct(p.id, { ...p, barcode }, permsRef.current); } catch { /* skip */ }
      }
    }
  }, [products]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Nom', 'Famille', 'Prix', 'Coût', 'Stock', 'Stock Min', 'Unité', 'Fournisseur', 'Code-barres', 'Description'];
    const rows = sortedAndFiltered.map(p => [
      p.name, p.family || '', p.price, p.cost_price || 0, p.stock || 0, p.min_stock || 0, p.unit || '', p.supplier || '', p.barcode || '', p.description || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `produits_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [sortedAndFiltered]);

  const handleImportCSV = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        const productData = {
          name: row['Nom'] || '', family: row['Famille'] || '', price: parseFloat(row['Prix']) || 0,
          cost_price: parseFloat(row['Coût'] || row['Cout'] || '0') || 0, stock: parseInt(row['Stock']) || 0,
          min_stock: parseInt(row['Stock Min'] || '0'), unit: row['Unité'] || row['Unite'] || 'unit',
          supplier: row['Fournisseur'] || '', barcode: row['Code-barres'] || row['Code-barres'] || '',
          description: row['Description'] || '', price_type: 'ttc'
        };
        if (!productData.name || !productData.price) continue;
        try {
          if (window.electronAPI) await window.electronAPI.addProduct(productData, permsRef.current);
          count++;
        } catch { /* skip */ }
      }
      if (count > 0) {
        await loadData();
        alert(`${count} produit(s) importé(s)`);
      }
    };
    input.click();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Produits</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border p-4 animate-pulse">
              <div className="h-32 bg-muted rounded-lg mb-3" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* TOOLBAR */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Produits</h1>
            <p className="text-sm text-muted-foreground">
              {stats.total} produit{stats.total > 1 ? 's' : ''} • {stats.families} famille{stats.families > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isBarcodeEnabled && stats.total > 0 && products.some(p => !p.barcode) && (
              <Button variant="outline" size="sm" onClick={generateBulkBarcodes} disabled={!canManage}>
                <Barcode className="h-4 w-4 mr-1" /> Barcodes ({products.filter(p => !p.barcode).length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleImportCSV} disabled={!canManage}>
              <Upload className="h-4 w-4 mr-1" /> Importer
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!canManage}>
              <Download className="h-4 w-4 mr-1" /> Exporter
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFamilyDialogOpen(true)} disabled={!canManage}>
              <Settings className="h-4 w-4 mr-1" /> Familles
            </Button>
            <Button size="sm" onClick={() => { setEditingProduct(null); setDialogOpen(true); }} disabled={!canCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nouveau produit
            </Button>
          </div>
        </div>

        {/* Search / Filter / Sort / View */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isSupplierEnabled ? "Rechercher par nom, famille, fournisseur, code-barres..." : "Rechercher par nom, famille, code-barres..."}
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
              {families.map(f => (<SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>))}
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
              {SORT_OPTIONS.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
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
          { label: 'Prix moyen', value: formatPrice(stats.avgPrice), icon: DollarSign, color: '#22c55e' }
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

      {/* CONTENT */}
      {sortedAndFiltered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {searchTerm || selectedFamily !== 'all' || kitchenFilter !== 'all' ? 'Aucun produit trouvé' : 'Aucun produit'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchTerm || selectedFamily !== 'all' || kitchenFilter !== 'all'
              ? 'Essayez de modifier vos critères de recherche'
              : 'Commencez par créer votre premier produit'}
          </p>
          {!searchTerm && selectedFamily === 'all' && kitchenFilter === 'all' && canCreate && (
            <Button onClick={() => { setEditingProduct(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Créer un produit
            </Button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedAndFiltered.map((product) => {
            const isNonManaged = product.manage_stock === 0 || product.manage_stock === false;
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
                onClick={() => { setQuickViewProduct(product); setQuickViewOpen(true); }}
              >
                {/* Selection checkbox */}
                <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(product.id)}
                    className="bg-white/80 backdrop-blur"
                  />
                </div>

                {/* Image */}
                <div className="relative h-36 bg-muted">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full" style={getImageStyle(product.image_settings)} loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                  )}
                  {/* Stock badge */}
                  <div className="absolute top-2 right-2">
                    {!isNonManaged && (outOfStock ? (
                      <Badge variant="destructive" className="text-[10px] shadow-sm">Rupture</Badge>
                    ) : lowStock ? (
                      <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-600 border-orange-200 shadow-sm">Stock faible</Badge>
                    ) : null)}
                  </div>

                </div>

                <CardContent className="p-4">
                  {/* Name + Family */}
                  <div className="mb-3">
                    <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-1">{product.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {product.family && (
                        <Badge variant="secondary" className="text-[10px]">{product.family}</Badge>
                      )}
                      {isKitchenEnabled && (product.requires_kitchen === 1 || product.requires_kitchen === true) && (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">
                          <ChefHat className="h-2.5 w-2.5 mr-0.5" />
                          {product.preparation_department || 'Cuisine'}
                        </Badge>
                      )}
                      {product.unit && product.unit !== 'unit' && (
                        <Badge variant="outline" className="text-[10px]">{product.unit}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Supplier */}
                  {isSupplierEnabled && product.supplier && (
                    <p className="text-xs text-muted-foreground mb-2 truncate">📦 {product.supplier}</p>
                  )}

                  {/* Prices */}
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-lg font-bold tabular-nums">{formatPrice(product.price)}</p>
                      {product.cost_price > 0 && (
                        <p className="text-xs text-muted-foreground">Coût: {formatPrice(product.cost_price)}</p>
                      )}
                    </div>
                    {margin !== null && (
                      <Badge variant="outline" className={`text-[10px] ${parseFloat(margin) > 0 ? 'text-emerald-600 border-emerald-200' : 'text-red-600 border-red-200'}`}>
                        +{margin}%
                      </Badge>
                    )}
                  </div>

                  {/* Stock bar */}
                  {isNonManaged ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Stock non géré</span>
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">—</span>
                    </div>
                  ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: negativeStock ? '100%' : `${Math.min(100, minStock > 0 ? (stock / minStock) * 100 : stock > 0 ? 100 : 0)}%`,
                          backgroundColor: negativeStock ? '#dc2626' : outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#22c55e'
                        }}
                      />
                    </div>
                    <span className={`text-xs font-medium tabular-nums ${negativeStock ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>{stock}</span>
                  </div>
                  )}

                  {/* Quick actions - visible on hover */}
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs flex-1" onClick={() => { setEditingProduct(product); setDialogOpen(true); }} disabled={!canEdit}>
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
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(product)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <ProductTableView
          products={sortedAndFiltered}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={toggleSelectAll}
          onEdit={(p) => { setEditingProduct(p); setDialogOpen(true); }}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onView={(p) => { setQuickViewProduct(p); setQuickViewOpen(true); }}
          onGenerateBarcode={generateBarcodeForProduct}
          formatPrice={formatPrice}
          config={config}
          showBarcode={isBarcodeEnabled}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      )}

      {/* PRODUCT FORM DIALOG */}
      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingProduct={editingProduct}
        families={families.map(f => f.name)}
        onSubmit={handleFormSubmit}
        showBarcode={isBarcodeEnabled}
        showSupplier={isSupplierEnabled}
        isKitchenEnabled={isKitchenEnabled}
        vatRates={vatRates}
        taxEnabled={taxEnabled}
        kitchenDepartments={kitchenDepartments}
      />

      {/* QUICK VIEW */}
      <ProductQuickView
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        product={quickViewProduct}
        onEdit={(p) => { setEditingProduct(p); setDialogOpen(true); }}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onPrintBarcode={() => {}}
        formatPrice={formatPrice}
        config={config}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />

      {/* BULK TOOLBAR */}
      <ProductBulkToolbar
        selectedCount={selectedIds.size}
        onDeleteSelected={handleBulkDelete}
        onAssignFamily={() => { setBulkFamilyValue(''); setBulkFamilyOpen(true); }}
        onAssignSupplier={() => { setBulkSupplierValue(''); setBulkSupplierOpen(true); }}
        onAssignVat={() => { setBulkVatValue('none'); setBulkVatOpen(true); }}
        onGenerateBarcodes={handleBulkGenerateBarcodes}
        onDuplicateSelected={handleBulkDuplicate}
        onExportSelected={handleExportCSV}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onClearSelection={() => setSelectedIds(new Set())}
        showSupplier={isSupplierEnabled}
      />

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
                  ref={familyInputRef}
                  placeholder="Nouvelle famille"
                  value={newFamily}
                  onChange={(e) => { setNewFamily(e.target.value); if (familyError) setFamilyError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFamily())}
                />
                {familyError && <p className="text-xs text-destructive">{familyError}</p>}
                <div>
                  <Label className="text-xs text-muted-foreground">Icône (optionnelle)</Label>
                  <CategoryIconPicker selectedIcon={newFamilyIcon} onSelect={setNewFamilyIcon} />
                </div>
              </div>
              <Button onClick={handleAddFamily} className="self-start mt-0" disabled={!canManage}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
            </div>

            <div className="flex flex-col flex-1 min-h-0">
              <Label className="text-xs text-muted-foreground mb-2 flex-shrink-0">Familles ({families.length})</Label>
              {families.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune famille</p>
                </div>
              ) : (
                <ScrollArea className="flex-1 min-h-0 border rounded-lg">
                  <div className="space-y-1 p-2">
                    {families.map((family) => {
                      const count = family.product_count || 0;
                      const isEditing = editingFamilyName === family.name;
                      return (
                        <div key={family.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group">
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <FamilyIcon iconName={family.icon} />
                              <Input
                                autoFocus
                                value={editingFamilyNewName}
                                onChange={(e) => setEditingFamilyNewName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameFamily(family.name);
                                  if (e.key === 'Escape') { setEditingFamilyName(null); setEditingFamilyNewName(''); }
                                }}
                                className="h-7 text-sm flex-1"
                              />
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleRenameFamily(family.name)}>OK</Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setEditingFamilyName(null); setEditingFamilyNewName(''); }}>✕</Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <FamilyIcon iconName={family.icon} />
                                <span className="text-sm font-medium">{family.name}</span>
                                {count > 0 && <Badge variant="secondary" className="text-[10px]">{count}</Badge>}
                              </div>
                              {confirmDeleteFamily && familyToDeleteInfo?.name === family.name ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-destructive">
                                    {familyToDeleteInfo.count > 0 ? `${familyToDeleteInfo.count} produit(s)` : ''}
                                  </span>
                                  <Select value={moveToFamily} onValueChange={setMoveToFamily}>
                                    <SelectTrigger className="h-6 text-[10px] w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">Sans famille</SelectItem>
                                      {families.filter(f => f.name !== family.name).map(f => (
                                        <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive" onClick={confirmDeleteFamilyAction}>
                                    Confirmer
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => { setConfirmDeleteFamily(false); setFamilyToDeleteInfo(null); }}>
                                    Annuler
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => { setEditingFamilyName(family.name); setEditingFamilyNewName(family.name); }}
                                    disabled={!canUpdate}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => initiateDeleteFamily(family.name)}
                                    disabled={!canDelete}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => { setFamilyDialogOpen(false); setConfirmDeleteFamily(false); setFamilyToDeleteInfo(null); }}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK ASSIGN FAMILY DIALOG */}
      <Dialog open={bulkFamilyOpen} onOpenChange={setBulkFamilyOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Attribuer une famille</DialogTitle>
            <DialogDescription>Sélectionnez une famille à appliquer aux {selectedIds.size} produit(s) sélectionné(s)</DialogDescription>
          </DialogHeader>
          <Select value={bulkFamilyValue} onValueChange={setBulkFamilyValue}>
            <SelectTrigger><SelectValue placeholder="Choisir une famille" /></SelectTrigger>
            <SelectContent>
              {families.map(f => (<SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkFamilyOpen(false)}>Annuler</Button>
            <Button onClick={handleBulkAssignFamily} disabled={!bulkFamilyValue}>Appliquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK ASSIGN SUPPLIER DIALOG */}
      {isSupplierEnabled && (
        <Dialog open={bulkSupplierOpen} onOpenChange={setBulkSupplierOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Attribuer un fournisseur</DialogTitle>
              <DialogDescription>Entrez le nom du fournisseur pour les {selectedIds.size} produit(s) sélectionné(s)</DialogDescription>
            </DialogHeader>
            <Input placeholder="Nom du fournisseur" value={bulkSupplierValue} onChange={(e) => setBulkSupplierValue(e.target.value)} autoFocus />
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkSupplierOpen(false)}>Annuler</Button>
              <Button onClick={handleBulkAssignSupplier}>Appliquer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* BULK ASSIGN VAT DIALOG */}
      <Dialog open={bulkVatOpen} onOpenChange={setBulkVatOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Attribuer un taux de TVA</DialogTitle>
            <DialogDescription>Sélectionnez un taux de TVA pour les {selectedIds.size} produit(s) sélectionné(s)</DialogDescription>
          </DialogHeader>
          <Select value={bulkVatValue} onValueChange={setBulkVatValue}>
            <SelectTrigger><SelectValue placeholder="Aucune TVA" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune TVA</SelectItem>
              {vatRates.filter(v => v.is_active).map(vr => (
                <SelectItem key={vr.id} value={vr.id.toString()}>{vr.name} ({vr.rate}%)</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkVatOpen(false)}>Annuler</Button>
            <Button onClick={handleBulkAssignVat}>Appliquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
