import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { 
  Warehouse, 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  Plus,
  Search,
  Filter
} from 'lucide-react';

export default function Inventory() {
  // Integration: Electron config + POSConfiguration styling
  const { config: electronConfig, loading: configLoading } = useAppConfig();

  const getConfig = () => {
    if (electronConfig && electronConfig.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    if (typeof window !== 'undefined' && window.themeConfig) {
      return POSConfiguration.createConfig(window.themeConfig);
    }
    return POSConfiguration.createConfig({});
  };

  const config = getConfig();
  const styles = POSConfiguration.getStyles(config);
  const cardClasses = POSConfiguration.getCardClasses(config);
  const buttonClasses = POSConfiguration.getButtonClasses(config);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState('');
  const [stockSetValue, setStockSetValue] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [stockMode, setStockMode] = useState('adjust'); // 'adjust' or 'set'

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const productData = await window.electronAPI.getProducts();
      setProducts(productData);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterLowStock || product.stock <= 10;
    return matchesSearch && matchesFilter;
  });

  const lowStockCount = products.filter(p => p.stock <= 10).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

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
      
      await window.electronAPI.updateProduct(selectedProduct.id, {
        ...selectedProduct,
        stock: newStock
      });

      await loadProducts();
      closeStockDialog();
    } catch (error) {
      console.error('Error adjusting stock:', error);
    }
  };

  const closeStockDialog = () => {
    setSelectedProduct(null);
    setStockAdjustment('');
    setStockSetValue('');
    setAdjustmentReason('');
    setStockMode('adjust');
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { text: 'Rupture', variant: 'destructive' };
    if (stock <= 10) return { text: 'Stock faible', variant: 'outline' };
    return { text: 'En stock', variant: 'default' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestion des stocks</h1>
        <p className="text-muted-foreground">
          Suivez et gérez l'inventaire de vos produits
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock faible</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ruptures</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toFixed(2)}€</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>Inventaire</CardTitle>
              <CardDescription>Liste de tous les produits et leur stock</CardDescription>
            </div>
            <div className="flex space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button
                variant={filterLowStock ? "default" : "outline"}
                onClick={() => setFilterLowStock(!filterLowStock)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Stock faible
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
                <TableHead>Prix</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const status = getStockStatus(product.stock);
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="font-mono">{product.stock}</TableCell>
                    <TableCell>{product.price}€</TableCell>
                    <TableCell>{(product.price * product.stock).toFixed(2)}€</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.text}</Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProduct(product)}
                          >
                            Ajuster
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Gestion du stock</DialogTitle>
                            <DialogDescription>
                              Modifier le stock pour {selectedProduct?.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Stock actuel</Label>
                              <Input value={selectedProduct?.stock || 0} disabled />
                            </div>
                            <div className="flex gap-1 bg-muted p-1 rounded-lg">
                              <button
                                type="button"
                                onClick={() => setStockMode('adjust')}
                                className={`flex-1 py-1 px-3 text-sm rounded-md transition-all ${
                                  stockMode === 'adjust'
                                    ? 'bg-white shadow font-medium'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                Ajuster (+/-)
                              </button>
                              <button
                                type="button"
                                onClick={() => setStockMode('set')}
                                className={`flex-1 py-1 px-3 text-sm rounded-md transition-all ${
                                  stockMode === 'set'
                                    ? 'bg-white shadow font-medium'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                Définir
                              </button>
                            </div>
                            {stockMode === 'adjust' ? (
                              <div>
                                <Label>Ajustement (+/-)</Label>
                                <Input
                                  type="number"
                                  placeholder="Ex: +10 ou -5"
                                  value={stockAdjustment}
                                  onChange={(e) => setStockAdjustment(e.target.value)}
                                />
                              </div>
                            ) : (
                              <div>
                                <Label>Nouveau stock</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="Ex: 50"
                                  value={stockSetValue}
                                  onChange={(e) => setStockSetValue(e.target.value)}
                                />
                              </div>
                            )}
                            <div>
                              <Label>Raison</Label>
                              <Input
                                placeholder="Raison du changement..."
                                value={adjustmentReason}
                                onChange={(e) => setAdjustmentReason(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={closeStockDialog}>
                              Annuler
                            </Button>
                            <Button onClick={handleStockAdjustment}>
                              Confirmer
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
