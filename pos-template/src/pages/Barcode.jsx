import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
  Scan, 
  Package, 
  Plus, 
  Search, 
  Camera,
  Barcode as BarcodeIcon,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function Barcode() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [foundProduct, setFoundProduct] = useState(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    price: '',
    category: '',
    stock: ''
  });

  const scannerRef = useRef(null);

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

  const handleBarcodeSearch = () => {
    if (!scannedCode.trim()) return;
    
    const product = products.find(p => p.barcode === scannedCode.trim());
    setFoundProduct(product);
    
    if (!product) {
      // If product not found, show dialog to create new product
      setNewProductData({
        ...newProductData,
        barcode: scannedCode.trim()
      });
      setShowProductDialog(true);
    }
  };

  const handleCreateProduct = async () => {
    try {
      const productToCreate = {
        ...newProductData,
        price: parseFloat(newProductData.price) || 0,
        stock: parseInt(newProductData.stock) || 0,
        barcode: scannedCode.trim()
      };

      await window.electronAPI.addProduct(productToCreate);
      await loadProducts();
      
      setShowProductDialog(false);
      setNewProductData({
        name: '',
        price: '',
        category: '',
        stock: ''
      });
      setScannedCode('');
      
      // Show the newly created product
      const newProduct = products.find(p => p.barcode === productToCreate.barcode);
      setFoundProduct(newProduct);
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const simulateBarcodeScan = () => {
    // Simulate scanning a random barcode from existing products
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    if (randomProduct && randomProduct.barcode) {
      setScannedCode(randomProduct.barcode);
      setFoundProduct(randomProduct);
    } else {
      // Generate a random barcode
      const randomBarcode = Math.floor(Math.random() * 9000000000000) + 1000000000000;
      setScannedCode(randomBarcode.toString());
      setFoundProduct(null);
    }
  };

  const generateBarcode = () => {
    // Generate a new random barcode
    const newBarcode = Math.floor(Math.random() * 9000000000000) + 1000000000000;
    setScannedCode(newBarcode.toString());
    setFoundProduct(null);
  };

  const filteredProducts = products.filter(product => 
    product.barcode && (
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const productsWithBarcodes = products.filter(p => p.barcode && p.barcode.trim() !== '');
  const productsWithoutBarcodes = products.filter(p => !p.barcode || p.barcode.trim() === '');

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
        <h1 className="text-3xl font-bold tracking-tight">Gestion des codes-barres</h1>
        <p className="text-muted-foreground">
          Scannez, recherchez et gérez les codes-barres de vos produits
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
            <CardTitle className="text-sm font-medium">Avec code-barres</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{productsWithBarcodes.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sans code-barres</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{productsWithoutBarcodes.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Couverture</CardTitle>
            <BarcodeIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {products.length > 0 ? Math.round((productsWithBarcodes.length / products.length) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barcode Scanner */}
      <Card>
        <CardHeader>
          <CardTitle>Scanner de codes-barres</CardTitle>
          <CardDescription>
            Scannez un code-barres pour rechercher ou créer un produit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="barcode">Code-barres</Label>
              <Input
                id="barcode"
                placeholder="Entrez ou scannez un code-barres..."
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSearch()}
              />
            </div>
            <div className="flex space-x-2 items-end">
              <Button onClick={handleBarcodeSearch}>
                <Search className="h-4 w-4 mr-2" />
                Rechercher
              </Button>
              <Button variant="outline" onClick={simulateBarcodeScan}>
                <Scan className="h-4 w-4 mr-2" />
                Simuler scan
              </Button>
              <Button variant="outline" onClick={generateBarcode}>
                <Plus className="h-4 w-4 mr-2" />
                Générer
              </Button>
            </div>
          </div>

          {/* Found Product Display */}
          {foundProduct && (
            <div className="p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Produit trouvé</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Nom:</span>
                  <p>{foundProduct.name}</p>
                </div>
                <div>
                  <span className="font-medium">Prix:</span>
                  <p>{foundProduct.price}€</p>
                </div>
                <div>
                  <span className="font-medium">Catégorie:</span>
                  <p>{foundProduct.category}</p>
                </div>
                <div>
                  <span className="font-medium">Stock:</span>
                  <p>{foundProduct.stock}</p>
                </div>
              </div>
            </div>
          )}

          {scannedCode && !foundProduct && (
            <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-800">Produit non trouvé</h3>
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                Aucun produit trouvé avec le code-barres: <strong>{scannedCode}</strong>
              </p>
              <Button onClick={() => setShowProductDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Créer un nouveau produit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products with Barcodes */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>Produits avec codes-barres</CardTitle>
              <CardDescription>Liste des produits ayant un code-barres</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code-barres</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono">{product.barcode}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.price}€</TableCell>
                  <TableCell>
                    <Badge variant={product.stock > 10 ? "default" : product.stock > 0 ? "outline" : "destructive"}>
                      {product.stock}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScannedCode(product.barcode);
                        setFoundProduct(product);
                      }}
                    >
                      <Scan className="h-4 w-4 mr-2" />
                      Sélectionner
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau produit</DialogTitle>
            <DialogDescription>
              Créer un produit avec le code-barres: {scannedCode}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="productName">Nom du produit</Label>
              <Input
                id="productName"
                value={newProductData.name}
                onChange={(e) => setNewProductData({...newProductData, name: e.target.value})}
                placeholder="Nom du produit..."
              />
            </div>
            <div>
              <Label htmlFor="productPrice">Prix</Label>
              <Input
                id="productPrice"
                type="number"
                step="0.01"
                value={newProductData.price}
                onChange={(e) => setNewProductData({...newProductData, price: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="productCategory">Catégorie</Label>
              <Input
                id="productCategory"
                value={newProductData.category}
                onChange={(e) => setNewProductData({...newProductData, category: e.target.value})}
                placeholder="Catégorie..."
              />
            </div>
            <div>
              <Label htmlFor="productStock">Stock initial</Label>
              <Input
                id="productStock"
                type="number"
                value={newProductData.stock}
                onChange={(e) => setNewProductData({...newProductData, stock: e.target.value})}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateProduct}>
              <Plus className="h-4 w-4 mr-2" />
              Créer le produit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
