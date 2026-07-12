import { useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../../../ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '../../../ui/dialog';
import {
  Package, AlertTriangle, TrendingDown, TrendingUp,
  Search, Filter
} from 'lucide-react';

const DEMO_PRODUCTS = [
  { id: 1, name: 'Café Espresso', category: 'Boissons', stock: 25, price: 2.50 },
  { id: 2, name: 'Café Long', category: 'Boissons', stock: 40, price: 3.00 },
  { id: 3, name: 'Café Latte', category: 'Boissons', stock: 35, price: 3.50 },
  { id: 4, name: 'Cappuccino', category: 'Boissons', stock: 0, price: 3.50 },
  { id: 5, name: 'Thé Vert', category: 'Boissons', stock: 12, price: 2.80 },
  { id: 6, name: 'Thé Noir', category: 'Boissons', stock: 8, price: 2.80 },
  { id: 7, name: 'Chocolat Chaud', category: 'Boissons', stock: 5, price: 3.50 },
  { id: 8, name: 'Croissant', category: 'Pâtisseries', stock: 30, price: 1.80 },
  { id: 9, name: 'Pain au Chocolat', category: 'Pâtisseries', stock: 0, price: 2.00 },
  { id: 10, name: 'Muffin Myrtille', category: 'Pâtisseries', stock: 20, price: 2.50 },
  { id: 11, name: 'Tarte aux Pommes', category: 'Pâtisseries', stock: 3, price: 3.00 },
  { id: 12, name: 'Sandwich Jambon', category: 'Sandwichs', stock: 15, price: 5.50 },
  { id: 13, name: 'Sandwich Poulet', category: 'Sandwichs', stock: 10, price: 6.00 },
  { id: 14, name: 'Salade César', category: 'Salades', stock: 7, price: 8.50 },
  { id: 15, name: 'Eau Minérale', category: 'Boissons', stock: 100, price: 1.50 },
];

export const POSInventory = ({ config }) => {
  const [products] = useState(DEMO_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockMode, setStockMode] = useState('adjust');
  const [stockAdjustment, setStockAdjustment] = useState('');
  const [stockSetValue, setStockSetValue] = useState('');

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = !filterLowStock || p.stock <= 10;
    return matchSearch && matchFilter;
  });

  const lowStockCount = products.filter(p => p.stock <= 10).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  const getStockStatus = (stock) => {
    if (stock === 0) return { text: 'Rupture', variant: 'destructive' };
    if (stock <= 10) return { text: 'Stock faible', variant: 'outline' };
    return { text: 'En stock', variant: 'default' };
  };

  const resetDialog = () => {
    setSelectedProduct(null);
    setStockAdjustment('');
    setStockSetValue('');
    setStockMode('adjust');
  };

  return (
    <div className="space-y-6" style={{
      fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif',
      fontSize: config.fontSize || '14px',
      fontWeight: config.fontWeight || '400'
    }}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: config.textColor }}>
          Gestion des stocks
        </h1>
        <p className="text-muted-foreground" style={{ color: config.textMutedColor }}>
          Suivez et gérez l'inventaire de vos produits
        </p>
      </div>

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
                    <TableCell>{product.price.toFixed(2)}€</TableCell>
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
                              <Input placeholder="Raison du changement..." />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={resetDialog}>
                              Annuler
                            </Button>
                            <Button onClick={resetDialog}>
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
};

export default POSInventory;
