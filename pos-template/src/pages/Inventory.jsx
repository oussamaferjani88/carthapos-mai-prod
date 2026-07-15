import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Warehouse, Package, AlertTriangle, TrendingDown, TrendingUp,
  Plus, Search, Filter, History, ArrowDown, ArrowUp, RefreshCw,
  Calendar, FileText
} from 'lucide-react';

export default function Inventory() {
  const { config: electronConfig, loading: configLoading } = useAppConfig();
  const getConfig = () => {
    if (electronConfig && electronConfig.theme) return POSConfiguration.createConfig(electronConfig.theme);
    if (typeof window !== 'undefined' && window.themeConfig) return POSConfiguration.createConfig(window.themeConfig);
    return POSConfiguration.createConfig({});
  };
  const config = getConfig();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState('');
  const [stockSetValue, setStockSetValue] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [stockMode, setStockMode] = useState('adjust');
  const [activeTab, setActiveTab] = useState('inventory');

  const [movements, setMovements] = useState([]);
  const [movementFilter, setMovementFilter] = useState('');
  const [movementSearch, setMovementSearch] = useState('');
  const [movementSummary, setMovementSummary] = useState(null);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [mostConsumed, setMostConsumed] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [productMovements, setProductMovements] = useState([]);
  const [productMovementsOpen, setProductMovementsOpen] = useState(false);
  const [productMovementsProduct, setProductMovementsProduct] = useState(null);

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    if (activeTab === 'movements') loadMovements();
    if (activeTab === 'reports') loadMostConsumed();
  }, [activeTab]);

  const loadProducts = async () => {
    try {
      const productData = await window.electronAPI.getProducts();
      setProducts(productData);
    } catch (error) { console.error('Error loading products:', error); }
    finally { setLoading(false); }
  };

  const loadMovements = async () => {
    setLoadingMovements(true);
    try {
      if (window.electronAPI?.getStockMovements) {
        const data = await window.electronAPI.getStockMovements({ movement_type: movementFilter, search: movementSearch });
        setMovements(data);
        const summary = await window.electronAPI.getStockSummary();
        setMovementSummary(summary);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingMovements(false); }
  };

  const loadProductMovements = async (productId) => {
    try {
      if (window.electronAPI?.getProductMovements) {
        const data = await window.electronAPI.getProductMovements(productId, {});
        setProductMovements(data);
      }
    } catch (e) { console.error(e); }
  };

  const openProductMovements = (product) => {
    setProductMovementsProduct(product);
    setProductMovementsOpen(true);
    loadProductMovements(product.id);
  };

  const loadMostConsumed = async () => {
    setLoadingReports(true);
    try {
      if (window.electronAPI?.getMostConsumedProducts) {
        const data = await window.electronAPI.getMostConsumedProducts();
        setMostConsumed(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingReports(false); }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterLowStock || (product.min_stock > 0 && product.stock <= product.min_stock);
    return matchesSearch && matchesFilter;
  });

  const lowStockCount = products.filter(p => p.min_stock > 0 && p.stock <= p.min_stock).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const totalValue = products.reduce((sum, p) => sum + ((p.cost_price || p.price) * p.stock), 0);

  const handleStockAdjustment = async () => {
    if (!selectedProduct) return;
    try {
      let newStock;
      if (stockMode === 'adjust') {
        if (!stockAdjustment) return;
        newStock = selectedProduct.stock + parseInt(stockAdjustment);
      } else {
        if (stockSetValue === '') return;
        newStock = parseInt(stockSetValue);
      }
      newStock = Math.max(0, isNaN(newStock) ? selectedProduct.stock : newStock);
      const diff = newStock - selectedProduct.stock;
      const movementType = diff > 0 ? 'in' : diff < 0 ? 'out' : 'adjustment';

      await window.electronAPI.updateProduct(selectedProduct.id, { ...selectedProduct, stock: newStock });
      if (window.electronAPI?.addStockMovement && diff !== 0) {
        await window.electronAPI.addStockMovement({
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          movement_type: movementType,
          quantity: Math.abs(diff),
          stock_before: selectedProduct.stock,
          stock_after: newStock,
          reason: adjustmentReason || (stockMode === 'set' ? 'Mise à jour manuelle' : 'Ajustement manuel'),
          reference: '',
          user_name: JSON.parse(localStorage.getItem('pos_user') || '{}').username || 'Utilisateur'
        });
      }
      await loadProducts();
      closeStockDialog();
    } catch (error) { console.error('Error adjusting stock:', error); }
  };

  const closeStockDialog = () => {
    setSelectedProduct(null);
    setStockAdjustment('');
    setStockSetValue('');
    setAdjustmentReason('');
    setStockMode('adjust');
  };

  const getStockStatus = (stock, minStock = 10) => {
    if (stock === 0) return { text: 'Rupture', variant: 'destructive' };
    if (minStock > 0 && stock <= minStock) return { text: 'Stock faible', variant: 'outline' };
    return { text: 'En stock', variant: 'default' };
  };

  const getMovTypeBadge = (type) => {
    switch (type) {
      case 'in': return { text: 'Entrée', variant: 'default' };
      case 'out': return { text: 'Sortie', variant: 'destructive' };
      case 'adjustment': return { text: 'Ajustement', variant: 'outline' };
      case 'initial': return { text: 'Initial', variant: 'secondary' };
      case 'correction': return { text: 'Correction', variant: 'outline' };
      case 'purchase': return { text: 'Achat', variant: 'default' };
      case 'sale': return { text: 'Vente', variant: 'destructive' };
      case 'waste': return { text: 'Déchet/Perte', variant: 'outline' };
      case 'return': return { text: 'Retour', variant: 'secondary' };
      default: return { text: type, variant: 'outline' };
    }
  };

  const formatDateTime = (d) => d ? new Date(d + 'Z').toLocaleString() : '-';
  const formatCurrency = (v) => (parseFloat(v) || 0).toFixed(2) + '\u20AC';

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestion des stocks</h1>
        <p className="text-muted-foreground">Suivez et gérez l'inventaire de vos produits</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{products.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock faible</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ruptures</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{outOfStockCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalValue)}</div></CardContent>
        </Card>
      </div>

      <div className="border-b">
        <nav className="flex space-x-8">
          <button onClick={() => setActiveTab('inventory')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'inventory' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <Package className="w-4 h-4 inline mr-2" />Inventaire
          </button>
          <button onClick={() => setActiveTab('movements')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'movements' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <History className="w-4 h-4 inline mr-2" />Mouvements de stock
          </button>
          <button onClick={() => setActiveTab('reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'reports' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <FileText className="w-4 h-4 inline mr-2" />Rapports
          </button>
        </nav>
      </div>

      {activeTab === 'inventory' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div><CardTitle>Inventaire</CardTitle><CardDescription>Liste de tous les produits et leur stock</CardDescription></div>
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input placeholder="Rechercher un produit..." value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-64" />
                </div>
                <Button variant={filterLowStock ? 'default' : 'outline'} onClick={() => setFilterLowStock(!filterLowStock)}>
                  <Filter className="h-4 w-4 mr-2" />Stock faible
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Prix vente</TableHead>
                  <TableHead>Prix achat</TableHead>
                  <TableHead>Valeur stock</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product.stock, product.min_stock);
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell className="font-mono">{product.stock}</TableCell>
                      <TableCell className="text-sm">{product.unit || '-'}</TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>{formatCurrency(product.cost_price || 0)}</TableCell>
                      <TableCell>{(product.cost_price || product.price) * product.stock > 0 ? formatCurrency((product.cost_price || product.price) * product.stock) : '-'}</TableCell>
                      <TableCell className="max-w-[120px] truncate text-sm">{product.supplier || '-'}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.text}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openProductMovements(product)} title="Historique des mouvements">
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedProduct(product)}>Ajuster</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Gestion du stock</DialogTitle>
                              <DialogDescription>Modifier le stock pour {selectedProduct?.name}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div><Label>Stock actuel</Label><Input value={selectedProduct?.stock || 0} disabled /></div>
                              <div className="flex gap-1 bg-muted p-1 rounded-lg">
                                <button type="button" onClick={() => setStockMode('adjust')}
                                  className={`flex-1 py-1 px-3 text-sm rounded-md transition-all ${stockMode === 'adjust' ? 'bg-white shadow font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Ajuster (+/-)</button>
                                <button type="button" onClick={() => setStockMode('set')}
                                  className={`flex-1 py-1 px-3 text-sm rounded-md transition-all ${stockMode === 'set' ? 'bg-white shadow font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Définir</button>
                              </div>
                              {stockMode === 'adjust' ? (
                                <div><Label>Ajustement (+/-)</Label><Input type="number" placeholder="Ex: +10 ou -5" value={stockAdjustment} onChange={(e) => setStockAdjustment(e.target.value)} /></div>
                              ) : (
                                <div><Label>Nouveau stock</Label><Input type="number" min="0" placeholder="Ex: 50" value={stockSetValue} onChange={(e) => setStockSetValue(e.target.value)} /></div>
                              )}
                              <div><Label>Raison</Label><Input placeholder="Raison du changement..." value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} /></div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={closeStockDialog}>Annuler</Button>
                              <Button onClick={handleStockAdjustment}>Confirmer</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Per-product movement history dialog */}
      <Dialog open={productMovementsOpen} onOpenChange={setProductMovementsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historique — {productMovementsProduct?.name || ''}</DialogTitle>
            <DialogDescription>Mouvements de stock pour ce produit</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {productMovements.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucun mouvement enregistré</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qté</TableHead>
                    <TableHead>Avant</TableHead>
                    <TableHead>Après</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead>Utilisateur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productMovements.map(m => {
                    const tb = getMovTypeBadge(m.movement_type);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatDateTime(m.created_at)}</TableCell>
                        <TableCell><Badge variant={tb.variant}>{tb.text}</Badge></TableCell>
                        <TableCell className={`font-mono font-bold ${m.movement_type === 'in' || m.movement_type === 'purchase' || m.movement_type === 'return' ? 'text-green-600' : 'text-red-600'}`}>
                          {m.movement_type === 'in' || m.movement_type === 'purchase' || m.movement_type === 'return' ? '+' : '-'}{m.quantity}
                        </TableCell>
                        <TableCell className="font-mono">{m.stock_before}</TableCell>
                        <TableCell className="font-mono">{m.stock_after}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{m.reason || '-'}</TableCell>
                        <TableCell className="text-sm">{m.user_name || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductMovementsOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeTab === 'movements' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>Mouvements de stock</CardTitle>
                <CardDescription>Historique des entrées, sorties et ajustements</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {movementSummary && (
                  <div className="flex gap-3 text-xs text-muted-foreground mr-4">
                    <span>Entrées: <span className="font-medium text-green-600">{movementSummary.total_in || 0}</span></span>
                    <span>Sorties: <span className="font-medium text-red-600">{movementSummary.total_out || 0}</span></span>
                    <span>Total: <span className="font-medium">{movementSummary.total_movements || 0}</span></span>
                  </div>
                )}
                <Select value={movementFilter} onValueChange={v => { setMovementFilter(v); setTimeout(loadMovements, 0); }}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous</SelectItem>
                    <SelectItem value="in">Entrées</SelectItem>
                    <SelectItem value="out">Sorties</SelectItem>
                    <SelectItem value="purchase">Achats</SelectItem>
                    <SelectItem value="sale">Ventes</SelectItem>
                    <SelectItem value="adjustment">Ajustements</SelectItem>
                    <SelectItem value="waste">Déchets/Perte</SelectItem>
                    <SelectItem value="return">Retours</SelectItem>
                    <SelectItem value="initial">Initial</SelectItem>
                    <SelectItem value="correction">Corrections</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher..." className="pl-9" value={movementSearch}
                    onChange={e => setMovementSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadMovements()} />
                </div>
                <Button variant="outline" size="sm" onClick={loadMovements}><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingMovements ? (
              <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
            ) : movements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun mouvement enregistré</p>
                <p className="text-xs">Les mouvements sont créés automatiquement lors des ajustements de stock</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Heure</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qté</TableHead>
                    <TableHead>Avant</TableHead>
                    <TableHead>Après</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Utilisateur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map(m => {
                    const typeBadge = getMovTypeBadge(m.movement_type);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatDateTime(m.created_at)}</TableCell>
                        <TableCell className="font-medium">{m.product_name || '-'}</TableCell>
                        <TableCell><Badge variant={typeBadge.variant}>{typeBadge.text}</Badge></TableCell>
                        <TableCell className={`font-mono font-bold ${m.movement_type === 'in' ? 'text-green-600' : m.movement_type === 'out' ? 'text-red-600' : ''}`}>
                          {m.movement_type === 'in' ? '+' : m.movement_type === 'out' ? '-' : ''}{m.quantity}
                        </TableCell>
                        <TableCell className="font-mono">{m.stock_before}</TableCell>
                        <TableCell className="font-mono">{m.stock_after}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{m.reason || '-'}</TableCell>
                        <TableCell className="text-sm">{m.reference || '-'}</TableCell>
                        <TableCell className="text-sm">{m.user_name || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'reports' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Produits les plus consommés</CardTitle>
                <CardDescription>Classement des sorties de stock (90 derniers jours)</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadMostConsumed}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingReports ? (
              <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
            ) : mostConsumed.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée de consommation</p>
                <p className="text-xs">Les données apparaîtront après des sorties de stock (ventes ou ajustements)</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead>Total sorti</TableHead>
                    <TableHead>Stock actuel</TableHead>
                    <TableHead>Seuil min</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mostConsumed.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground font-mono text-sm">{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.category}</TableCell>
                      <TableCell className="text-sm">{p.unit || '-'}</TableCell>
                      <TableCell className="font-mono font-bold">{p.total_consumed}</TableCell>
                      <TableCell className="font-mono">{p.stock}</TableCell>
                      <TableCell className="font-mono">{p.min_stock || '-'}</TableCell>
                      <TableCell><Badge variant={p.stock === 0 ? 'destructive' : (p.min_stock > 0 && p.stock <= p.min_stock) ? 'outline' : 'default'}>
                        {p.stock === 0 ? 'Rupture' : (p.min_stock > 0 && p.stock <= p.min_stock) ? 'Stock faible' : 'En stock'}
                      </Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
