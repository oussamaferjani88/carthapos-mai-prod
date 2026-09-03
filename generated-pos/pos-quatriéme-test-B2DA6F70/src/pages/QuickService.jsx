import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
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
} from '../components/ui/dialog';
import { 
  Zap, 
  ShoppingCart, 
  Plus, 
  Minus,
  CreditCard,
  Euro,
  Clock,
  TrendingUp,
  Package,
  Search
} from 'lucide-react';
import { getImageStyle } from '../utils/imageSettings';

export default function QuickService() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // POSConfiguration integration
  const { config: electronConfig } = useAppConfig();
  const getConfig = () => {
    if (electronConfig?.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      currency: 'DT',
      currencyPosition: 'after',
      taxRate: 19
    });
  };
  const config = getConfig();

  const formatPrice = (price) => {
    if (config.currencyPosition === 'before') {
      return `${config.currency}${price.toFixed(2)}`;
    }
    return `${price.toFixed(2)} ${config.currency}`;
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [quickCategories, setQuickCategories] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const productData = await window.electronAPI.getProducts();
      setProducts(productData);
      
      // Extract unique categories for quick access
      const categories = [...new Set(productData.map(p => p.category))];
      setQuickCategories(categories);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem && existingItem.quantity > 1) {
      setCart(cart.map(item =>
        item.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setCart(cart.filter(item => item.id !== productId));
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = (total) => {
    return total * ((config.taxRate || 19) / 100);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      const total = calculateTotal();
      const tax = calculateTax(total);
      
      const sale = {
        total: total + tax,
        tax: tax,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        }))
      };

      await window.electronAPI.addSale(sale);
      
      // Update stock for each item (non-stock-managed products are excluded:
      // sales are counted via addSale, no on-hand quantity to decrement)
      for (const item of cart) {
        if (item.manage_stock === 0 || item.manage_stock === false) continue;
        const updatedProduct = {
          ...item,
          stock: Math.max(0, item.stock - item.quantity)
        };
        await window.electronAPI.updateProduct(item.id, updatedProduct);
      }
      
      clearCart();
      setShowCheckout(false);
      await loadProducts(); // Reload to get updated stock
      
    } catch (error) {
      console.error('Error processing sale:', error);
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group products by category for quick access
  const productsByCategory = quickCategories.reduce((acc, category) => {
    acc[category] = products.filter(p => p.category === category);
    return acc;
  }, {});

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = calculateTotal();
  const tax = calculateTax(total);

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
        <h1 className="text-3xl font-bold tracking-tight">Service rapide</h1>
        <p className="text-muted-foreground">
          Interface de vente rapide pour un service efficace
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Catégories rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {quickCategories.map(category => (
                  <Button
                    key={category}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => setSearchTerm(category)}
                  >
                    <Package className="h-6 w-6 mb-1" />
                    <span className="text-sm">{category}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Produits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {product.image && (
                          <div className="mb-2 rounded-md overflow-hidden bg-gray-50">
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="w-full h-20"
                              style={getImageStyle(product.image_settings)}
                            />
                          </div>
                        )}
                        <h3 className="font-medium text-sm truncate">{product.name}</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold">{formatPrice(product.price)}</span>
                          {product.manage_stock === 0 || product.manage_stock === false ? (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Stock non géré</Badge>
                          ) : (
                            <Badge 
                              variant={product.stock > (product.min_stock || 10) ? "default" : product.stock > 0 ? "outline" : "destructive"}
                              className="text-xs"
                            >
                              {product.stock}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                        <Button 
                          size="sm" 
                          className="w-full"
                          disabled={!(product.manage_stock === 0 || product.manage_stock === false) && product.stock === 0}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Ajouter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          {/* Cart Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Panier</CardTitle>
                <Badge variant="secondary">{totalItems} articles</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4" />
                  <p>Panier vide</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(item.price)} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToCart(item)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sous-total:</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>TVA ({(config.taxRate || 19)}%):</span>
                      <span>{formatPrice(tax)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{formatPrice(total + tax)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={() => setShowCheckout(true)}
                      disabled={cart.length === 0}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Encaisser
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={clearCart}
                    >
                      Vider le panier
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistiques rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Heure</span>
                </div>
                <span className="font-medium">{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Produits</span>
                </div>
                <span className="font-medium">{products.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finaliser la vente</DialogTitle>
            <DialogDescription>
              Total à encaisser: {formatPrice(total + tax)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Mode de paiement</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Euro className="h-4 w-4 mr-2" />
                  Espèces
                </Button>
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Carte
                </Button>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-medium">Récapitulatif</h4>
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Sous-total:</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>TVA:</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{formatPrice(total + tax)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Annuler
            </Button>
            <Button onClick={handleCheckout}>
              <Zap className="h-4 w-4 mr-2" />
              Encaisser {formatPrice(total + tax)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
