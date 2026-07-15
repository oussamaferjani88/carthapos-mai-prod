import { useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../../../ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '../../../ui/dialog';
import {
  Package, AlertTriangle, TrendingDown, TrendingUp,
  Search, Filter, History
} from 'lucide-react';

interface Product { id: number; name: string; category: string; stock: number; price: number; }
interface Movement { id: number; product_name: string; movement_type: string; quantity: number; stock_before: number; stock_after: number; reason: string; reference: string; user_name: string; created_at: string; }

const DEMO_PRODUCTS: Product[] = [
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

const DEMO_MOVEMENTS: Movement[] = [
  { id: 1, product_name: 'Café Espresso', movement_type: 'in', quantity: 50, stock_before: 10, stock_after: 60, reason: 'Réapprovisionnement fournisseur', reference: 'CMD-2025-001', user_name: 'Admin', created_at: '2025-06-13T08:30:00' },
  { id: 2, product_name: 'Café Latte', movement_type: 'out', quantity: 12, stock_before: 47, stock_after: 35, reason: 'Vente journée', reference: '', user_name: 'Sophie', created_at: '2025-06-13T15:00:00' },
  { id: 3, product_name: 'Croissant', movement_type: 'in', quantity: 100, stock_before: 20, stock_after: 120, reason: 'Livraison boulangerie', reference: 'BL-2025-042', user_name: 'Admin', created_at: '2025-06-13T06:00:00' },
  { id: 4, product_name: 'Thé Noir', movement_type: 'adjustment', quantity: -2, stock_before: 10, stock_after: 8, reason: 'Inventaire - écart constaté', reference: 'INV-2025-06', user_name: 'Marc', created_at: '2025-06-12T10:00:00' },
  { id: 5, product_name: 'Salade César', movement_type: 'in', quantity: 20, stock_before: 5, stock_after: 25, reason: 'Réapprovisionnement', reference: 'CMD-2025-002', user_name: 'Admin', created_at: '2025-06-11T09:00:00' },
];

export const POSInventory = ({ config }: { config: any }) => {
  const [products] = useState<Product[]>(DEMO_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockMode, setStockMode] = useState<'adjust' | 'set'>('adjust');
  const [stockAdjustment, setStockAdjustment] = useState('');
  const [stockSetValue, setStockSetValue] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');
  const [movementFilter, setMovementFilter] = useState('');

  const filteredMovements = DEMO_MOVEMENTS.filter(m =>
    (!movementFilter || m.movement_type === movementFilter) &&
    m.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = !filterLowStock || p.stock <= 10;
    return matchSearch && matchFilter;
  });

  const lowStockCount = products.filter(p => p.stock <= 10).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  const getStockStatus = (stock: number): { text: string; variant: 'default' | 'destructive' | 'outline' } => {
    if (stock === 0) return { text: 'Rupture', variant: 'destructive' };
    if (stock <= 10) return { text: 'Stock faible', variant: 'outline' };
    return { text: 'En stock', variant: 'default' };
  };

  const getMovTypeBadge = (type: string): { text: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' } => {
    switch (type) {
      case 'in': return { text: 'Entrée', variant: 'default' };
      case 'out': return { text: 'Sortie', variant: 'destructive' };
      case 'adjustment': return { text: 'Ajustement', variant: 'outline' };
      case 'initial': return { text: 'Initial', variant: 'secondary' };
      case 'correction': return { text: 'Correction', variant: 'outline' };
      default: return { text: type, variant: 'outline' };
    }
  };

  const resetDialog = () => {
    setSelectedProduct(null);
    setStockAdjustment('');
    setStockSetValue('');
    setStockMode('adjust');
  };

  const textColor = config.textColor || '#1f2937';
  const mutedColor = config.textMutedColor || '#6b7280';

  return (
    <div className="space-y-6" style={{ fontFamily: config.fontFamily, fontSize: config.fontSize }}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: textColor }}>Gestion des stocks</h1>
        <p style={{ color: mutedColor }}>Suivez et gérez l'inventaire de vos produits</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Produits', value: products.length, icon: Package, color: '' },
          { label: 'Stock faible', value: lowStockCount, icon: TrendingDown, color: 'text-yellow-600' },
          { label: 'Ruptures', value: outOfStockCount, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Valeur Stock', value: totalValue.toFixed(2) + '\u20AC', icon: TrendingUp, color: 'text-green-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 text-muted-foreground ${s.color}`} />
            </CardHeader>
            <CardContent><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="border-b">
        <nav className="flex space-x-8">
          <button onClick={() => setActiveTab('inventory')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'inventory' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <Package className="w-4 h-4 inline mr-2" />Inventaire
          </button>
          <button onClick={() => setActiveTab('movements')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'movements' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <History className="w-4 h-4 inline mr-2" />Mouvements
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
                  <Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-64" />
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
                      <TableCell>{product.price.toFixed(2)}\u20AC</TableCell>
                      <TableCell>{(product.price * product.stock).toFixed(2)}\u20AC</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.text}</Badge></TableCell>
                      <TableCell>
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
                                  className={`flex-1 py-1 px-3 text-sm rounded-md transition-all ${stockMode === 'adjust' ? 'bg-white shadow font-medium' : 'text-muted-foreground'}`}>Ajuster (+/-)</button>
                                <button type="button" onClick={() => setStockMode('set')}
                                  className={`flex-1 py-1 px-3 text-sm rounded-md transition-all ${stockMode === 'set' ? 'bg-white shadow font-medium' : 'text-muted-foreground'}`}>Définir</button>
                              </div>
                              {stockMode === 'adjust' ? (
                                <div><Label>Ajustement (+/-)</Label><Input type="number" placeholder="Ex: +10 ou -5" value={stockAdjustment} onChange={(e) => setStockAdjustment(e.target.value)} /></div>
                              ) : (
                                <div><Label>Nouveau stock</Label><Input type="number" min="0" placeholder="Ex: 50" value={stockSetValue} onChange={(e) => setStockSetValue(e.target.value)} /></div>
                              )}
                              <div><Label>Raison</Label><Input placeholder="Raison du changement..." /></div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={resetDialog}>Annuler</Button>
                              <Button onClick={resetDialog}>Confirmer</Button>
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
      )}

      {activeTab === 'movements' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle>Mouvements de stock</CardTitle><CardDescription>Entrées, sorties et ajustements</CardDescription></div>
              <div className="flex items-center gap-2">
                <Select value={movementFilter} onValueChange={setMovementFilter}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous</SelectItem>
                    <SelectItem value="in">Entrées</SelectItem>
                    <SelectItem value="out">Sorties</SelectItem>
                    <SelectItem value="adjustment">Ajustements</SelectItem>
                    <SelectItem value="correction">Corrections</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    {['Date/Heure', 'Produit', 'Type', 'Qté', 'Avant', 'Après', 'Raison', 'Référence', 'Utilisateur'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredMovements.map(m => {
                    const tb = getMovTypeBadge(m.movement_type);
                    return (
                      <tr key={m.id}>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(m.created_at + 'Z').toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm font-medium">{m.product_name}</td>
                        <td className="px-4 py-3"><Badge variant={tb.variant}>{tb.text}</Badge></td>
                        <td className={`px-4 py-3 font-mono font-bold ${m.movement_type === 'in' ? 'text-green-600' : m.movement_type === 'out' ? 'text-red-600' : ''}`}>
                          {m.movement_type === 'in' ? '+' : m.movement_type === 'out' ? '-' : ''}{m.quantity}
                        </td>
                        <td className="px-4 py-3 font-mono">{m.stock_before}</td>
                        <td className="px-4 py-3 font-mono">{m.stock_after}</td>
                        <td className="px-4 py-3 text-sm max-w-[200px] truncate">{m.reason}</td>
                        <td className="px-4 py-3 text-sm">{m.reference || '-'}</td>
                        <td className="px-4 py-3 text-sm">{m.user_name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default POSInventory;
