import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { isPreviewMode, getPreviewData, logEnvironment } from '../utils/environment';
import { AppConfig } from '../config/AppConfig';
import ProductFormDialog from '../components/ProductFormDialog'; // ⚡ Memoized form component
import CategoryIconPicker, { getIconComponent } from '../components/CategoryIconPicker';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Search, 
  Barcode, 
  AlertTriangle, 
  Settings,
  ImageIcon
} from 'lucide-react';

const FamilyIcon = ({ iconName, className = 'w-4 h-4' }) => {
  const IconComponent = getIconComponent(iconName);
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
};

export default function Products() {
  // Log environment on component mount
  useEffect(() => {
    logEnvironment();
  }, []);
  // Integration: Electron config + POSConfiguration styling
  const { config: electronConfig, loading: configLoading } = useAppConfig();

  // Get unified theme configuration
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
  const gridClasses = POSConfiguration.getGridClasses(config);

  const formatPrice = (price) => {
    if (config.currencyPosition === 'before') {
      return `${config.currency}${price.toFixed(2)}`;
    }
    return `${price.toFixed(2)} ${config.currency}`;
  };

  const isBarcodeEnabled = electronConfig?.modules
    ? electronConfig.modules.some(m => (m.name || m) === 'barcode' && m.isEnabled !== false)
    : AppConfig.isModuleEnabled('barcode');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('all');
  const [families, setFamilies] = useState([]);
  const [newFamily, setNewFamily] = useState('');
  const [newFamilyIcon, setNewFamilyIcon] = useState('');
  const [familyError, setFamilyError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const familyInputRef = useRef(null);
  const familyErrorTimerRef = useRef(null);

  // ⚡ Focus family input when dialog opens and after successful add
  useEffect(() => {
    if (familyDialogOpen) {
      requestAnimationFrame(() => familyInputRef.current?.focus());
    }
  }, [familyDialogOpen]);

  // Generate a valid EAN-13 barcode locally (no HTTP server needed)
const generateLocalBarcode = () => {
  const randomDigits = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(randomDigits[i]);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return randomDigits + checkDigit;
};

   // Charger les familles depuis la base de données
   const loadFamilies = async () => {
     try {
       console.log(`⏱️ [LOAD-FAMILIES START]`);
       if (window.electronAPI) {
         // Prefer dedicated families table when available
         if (window.electronAPI.getFamilies) {
           console.log(`📡 [IPC-CALL] getFamilies...`);
           const rows = await window.electronAPI.getFamilies();
           console.log(`✅ [IPC-RETURN] Got ${rows?.length || 0} families:`, rows);
            const familyList = (rows || []).map(row => ({ name: row.name, icon: row.icon || '' })).filter(f => f.name);
            console.log(`📊 [FAMILIES-MAPPED] ${familyList.length} families:`, familyList);
            setFamilies(familyList);
          } else if (window.electronAPI.query) {
            // Fallback: derive from products table
            console.log(`📡 [FALLBACK-QUERY] Getting families from products table...`);
            const data = await window.electronAPI.query(
              'SELECT DISTINCT family FROM products WHERE family IS NOT NULL AND family != ""'
            );
            console.log(`✅ [FALLBACK-RETURN] Got ${data?.length || 0} families from products`);
            const familyList = data.map(row => ({ name: row.family, icon: '' })).filter(f => f.name);
            console.log(`📊 [FAMILIES-MAPPED] ${familyList.length} families:`, familyList);
            setFamilies(familyList);
         }
       } else {
         console.warn('⚠️ [LOAD-FAMILIES] ElectronAPI not available');
       }
       console.log(`✅ [LOAD-FAMILIES OK]`);
     } catch (error) {
       console.error('❌ [LOAD-FAMILIES ERROR] Erreur lors du chargement des familles:', error);
     }
   };

   // Ajouter une nouvelle famille
   const handleAddFamily = async () => {
     const startTime = performance.now();
     const trimmed = newFamily.trim();
     
     console.log(`⏱️ [FAMILY-ADD START] Name: "${trimmed}"`);
     
     if (familyErrorTimerRef.current) clearTimeout(familyErrorTimerRef.current);
     
     if (!trimmed) {
       setFamilyError('Veuillez entrer un nom de famille');
       familyErrorTimerRef.current = setTimeout(() => setFamilyError(''), 3000);
       familyInputRef.current?.focus();
       return;
     }
     
      if (families.some(f => f.name === trimmed)) {
        setFamilyError('Cette famille existe déjà');
        familyErrorTimerRef.current = setTimeout(() => setFamilyError(''), 3000);
        familyInputRef.current?.focus();
        return;
      }
     
     try {
       if (window.electronAPI && window.electronAPI.addFamily) {
         const addStart = performance.now();
         console.log(`⏱️ [IPC-CALL] Sending addFamily to Electron...`);
         
          await window.electronAPI.addFamily(trimmed, null, newFamilyIcon || '');
         const addDuration = performance.now() - addStart;
         console.log(`✅ [IPC-RETURN] addFamily returned - ${addDuration.toFixed(2)}ms`);
         
         const reloadStart = performance.now();
         await loadFamilies();
         const reloadDuration = performance.now() - reloadStart;
         console.log(`✅ [FAMILIES-RELOADED] - ${reloadDuration.toFixed(2)}ms`);
       } else {
          // Fallback: update local state only
          setFamilies([...families, { name: trimmed, icon: newFamilyIcon || '' }]);
        }
        setNewFamily('');
        setNewFamilyIcon('');
        familyInputRef.current?.focus();
        const totalDuration = performance.now() - startTime;
        console.log(`✅ [FAMILY-ADD OK] Total: ${totalDuration.toFixed(2)}ms`);
      } catch (error) {
        console.error('❌ [FAMILY-ADD ERROR]', error);
        setFamilyError('Erreur lors de l\'ajout de la famille');
        familyErrorTimerRef.current = setTimeout(() => setFamilyError(''), 3000);
      }
    };

  // Supprimer une famille
  const handleDeleteFamily = async (familyToDelete) => {
    setConfirmDelete(familyToDelete);
  };

  const confirmDeleteFamily = async () => {
    if (!confirmDelete) return;
    const familyToDelete = confirmDelete;
    setConfirmDelete(null);
    try {
      if (window.electronAPI && window.electronAPI.deleteFamily) {
        await window.electronAPI.deleteFamily(familyToDelete);
        await loadFamilies();
      } else {
        // Fallback: update local state only
        setFamilies(families.filter(f => f.name !== familyToDelete));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la famille:', error);
      setFamilyError('Erreur lors de la suppression');
      familyErrorTimerRef.current = setTimeout(() => setFamilyError(''), 3000);
    }
  };

  const cancelDeleteFamily = () => {
    setConfirmDelete(null);
  };
  
  // Fonction pour gérer l'upload d'image
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner un fichier image valide');
        return;
      }
      
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('L\'image ne doit pas dépasser 5MB');
        return;
      }
      
      setFormData({ ...formData, image: file });
      
      // Créer un aperçu de l'image
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Fonction pour supprimer l'image
  const removeImage = () => {
    setFormData({ ...formData, image: null });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Fonction pour scanner un code-barres
  const startBarcodeScanner = () => {
    setIsScanning(true);
    // Simulation du scan (en production, utiliser une vraie librairie de scan)
    setTimeout(() => {
      const scannedCode = '1234567890123'; // Code simulé
      setFormData({ ...formData, barcode: scannedCode });
      setIsScanning(false);
      alert(`Code-barres scanné: ${scannedCode}`);
    }, 2000);
  };

  // Demo products for preview mode
  const DEMO_PRODUCTS = [
    { 
      id: 1, 
      name: 'Café Expresso', 
      family: 'Boissons', 
      price: 2.50, 
      barcode: '1234567890123', 
      image: null,
      description: 'Café italien corsé, servie en tasse espresso'
    },
    { 
      id: 2, 
      name: 'Croissant Nature', 
      family: 'Viennoiseries', 
      price: 1.80, 
      barcode: '1234567891234', 
      image: null,
      description: 'Croissant au beurre, pâte feuilletée artisanale'
    },
    { 
      id: 3, 
      name: 'Sandwich Jambon Beurre', 
      family: 'Sandwichs', 
      price: 4.50, 
      barcode: '1234567892345', 
      image: null,
      description: 'Pain frais, jambon de qualité, beurre AOC'
    },
    { 
      id: 4, 
      name: 'Eau Minérale 50cl', 
      family: 'Boissons', 
      price: 1.20, 
      barcode: '1234567893456', 
      image: null,
      description: 'Eau minérale naturelle, bouteille plastique'
    },
    { 
      id: 5, 
      name: 'Salade César', 
      family: 'Salades', 
      price: 7.90, 
      barcode: '', 
      image: null,
      description: 'Salade verte, croûtons, parmesan, sauce César'
    },
    { 
      id: 6, 
      name: 'Muffin Chocolat', 
      family: 'Pâtisseries', 
      price: 2.80, 
            barcode: '1234567895678', 
            image: null,
            description: 'Muffin moelleux aux pépites de chocolat'
    }
  ];

  useEffect(() => {
    loadProducts();
    loadFamilies();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      // Load products from database in production mode
      if (window.electronAPI && !isPreviewMode()) {
        const data = await window.electronAPI.getProducts();
        console.log('✅ Loaded products from database:', data.length);
        setProducts(data);
      } else if (isPreviewMode()) {
        // Use demo data in preview mode
        console.log('🌐 Preview mode: Using demo products');
        setProducts(DEMO_PRODUCTS);
      } else {
        // Production mode but no Electron API
        console.warn('⚠️ Production mode but ElectronAPI not available. Products will be empty.');
        setProducts([]);
      }
    } catch (error) {
      console.error('❌ Error loading products:', error);
      setProducts(isPreviewMode() ? DEMO_PRODUCTS : []);
    } finally {
      setLoading(false);
    }
  };

  // ⚡ PERFORMANCE FIX: Memoize filtered products to avoid O(n) filter on every render
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (isBarcodeEnabled && product.barcode && product.barcode.includes(searchTerm));
      const matchesFamily = selectedFamily === 'all' || product.family === selectedFamily || product.category === selectedFamily;
      return matchesSearch && matchesFamily;
    });
  }, [products, searchTerm, selectedFamily]);

  // ⚡ PERFORMANCE: Handle form submission from ProductFormDialog
  const handleFormSubmit = useCallback(async (productData) => {
    const startTime = performance.now();
    console.log(`⏱️ [PRODUCT-SUBMIT START] Adding/Editing product`);
    
    try {
      if (editingProduct) {
        console.log(`⏱️ [PRODUCT-UPDATE] ID: ${editingProduct.id}`);
        // ⚡ OPTIMISTIC UPDATE: Update UI immediately
        const updatedProducts = products.map(p => 
          p.id === editingProduct.id 
            ? { ...p, ...productData }
            : p
        );
        setProducts(updatedProducts);
        console.log(`✅ [UI-UPDATE] Product updated in UI immediately`);
        
        // Save to database in background
        if (window.electronAPI) {
          const dbStart = performance.now();
          try {
            console.log(`⏱️ [IPC-CALL] Sending updateProduct to Electron...`);
            await window.electronAPI.updateProduct(editingProduct.id, productData);
            const dbDuration = performance.now() - dbStart;
            console.log(`✅ [DB-SAVED] Update persisted - ${dbDuration.toFixed(2)}ms`);
          } catch (error) {
            console.error('❌ [DB-ERROR] Database save error:', error);
            await loadProducts();
            throw error;
          }
        }
        setEditingProduct(null);
      } else {
        console.log(`⏱️ [PRODUCT-ADD] Creating new product`);
        // ⚡ OPTIMISTIC UPDATE: Add product to UI immediately
        const newProduct = {
          id: Date.now(),
          ...productData,
          created_at: new Date().toISOString()
        };
        setProducts([...products, newProduct]);
        console.log(`✅ [UI-UPDATE] New product added to UI immediately`);
        
        // Save to database in background
        if (window.electronAPI) {
          const dbStart = performance.now();
          try {
            console.log(`⏱️ [IPC-CALL] Sending addProduct to Electron...`);
            const savedProduct = await window.electronAPI.addProduct(productData);
            const dbDuration = performance.now() - dbStart;
            console.log(`✅ [DB-SAVED] Product persisted - ${dbDuration.toFixed(2)}ms`);
            
            // Update with server-assigned ID if different
            if (savedProduct && savedProduct.id !== newProduct.id) {
              setProducts(prev => prev.map(p => 
                p.id === newProduct.id ? { ...p, id: savedProduct.id } : p
              ));
            }
          } catch (error) {
            console.error('❌ [DB-ERROR] Database save error:', error);
            setProducts(prev => prev.filter(p => p.id !== newProduct.id));
            throw error;
          }
        }
      }
      
      // Reload products to ensure list is fresh
      await loadProducts();
      
      const totalDuration = performance.now() - startTime;
      console.log(`✅ [PRODUCT-SUBMIT OK] Total: ${totalDuration.toFixed(2)}ms`);
     } catch (error) {
       console.error('❌ [PRODUCT-SUBMIT ERROR]', error);
       throw error;
     }
   }, [editingProduct, products, loadProducts]);

  const handleDelete = async (product) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${product.name}" ?`)) {
      return;
    }

    try {
      // ⚡ OPTIMISTIC UPDATE: Remove from UI immediately
      setProducts(products.filter(p => p.id !== product.id));
      
      if (window.electronAPI) {
        try {
          await window.electronAPI.deleteProduct(product.id);
        } catch (error) {
          console.error('Database delete error:', error);
          // On error, restore the product to the list
          setProducts([...products, product]);
          alert('Erreur lors de la suppression: ' + error.message);
          return;
        }
      }
      alert('Produit supprimé avec succès');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const openCreateDialog = useCallback(() => {
    setEditingProduct(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  }, []);

  // Generate barcode for existing product
  const generateBarcodeForProduct = async (product) => {
    const fullBarcode = generateLocalBarcode();
    const updatedProduct = { ...product, barcode: fullBarcode };
    
    try {
      if (window.electronAPI) {
        await window.electronAPI.updateProduct(product.id, updatedProduct);
        await loadProducts();
      } else {
        setProducts(products.map(p => 
          p.id === product.id ? updatedProduct : p
        ));
      }
    } catch (error) {
      console.error('Error saving barcode for product:', error);
    }
  };

  // Generate barcodes for all products without one
  const generateBulkBarcodes = async () => {
    const productsWithoutBarcodes = products.filter(p => !p.barcode);
    
    if (productsWithoutBarcodes.length === 0) {
      return;
    }

    try {
      let successCount = 0;

      for (const product of productsWithoutBarcodes) {
        try {
          const fullBarcode = generateLocalBarcode();
          const updatedProduct = { ...product, barcode: fullBarcode };

          if (window.electronAPI) {
            await window.electronAPI.updateProduct(product.id, updatedProduct);
          } else {
            setProducts(prev => prev.map(p => p.id === product.id ? updatedProduct : p));
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to generate barcode for ${product.name}:`, err);
        }
      }

      await loadProducts();
    } catch (error) {
      console.error('Error generating bulk barcodes:', error);
    }
  };

  const getStockBadge = (stock) => {
    if (stock === 0) {
      return <Badge variant="destructive">Rupture</Badge>;
    } else if (stock <= 10) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Stock faible</Badge>;
    } else {
      return <Badge variant="default">En stock</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Produits</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Produits</h1>
          <p className="text-muted-foreground">
            Gérez votre catalogue de produits
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFamilyDialogOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Gérer les familles
          </Button>
          {isBarcodeEnabled && products.filter(p => !p.barcode).length > 0 && (
            <Button variant="outline" onClick={generateBulkBarcodes}>
              <Barcode className="mr-2 h-4 w-4" />
              Générer codes-barres ({products.filter(p => !p.barcode).length})
            </Button>
          )}
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau produit
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nom du produit ou code-barres..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="family">Famille</Label>
              <Select value={selectedFamily} onValueChange={setSelectedFamily}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les familles</SelectItem>
                  {families.map((family) => (
                    <SelectItem key={family.name} value={family.name}>
                      {family.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des produits */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm || selectedFamily !== 'all' ? 'Aucun produit trouvé' : 'Aucun produit'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedFamily !== 'all' 
                ? 'Essayez de modifier vos critères de recherche'
                : 'Commencez par créer votre premier produit'
              }
            </p>
            {!searchTerm && selectedFamily === 'all' && (
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Créer un produit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription>{product.family || product.category}</CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Image du produit */}
                {product.image && (
                  <div className="mb-3 rounded-md overflow-hidden bg-gray-50">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold">{formatPrice(product.price)}</span>
                    {getStockBadge(product.stock)}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Stock: {product.stock} unités</p>
                    {isBarcodeEnabled && product.barcode ? (
                      <div className="flex items-center">
                        <Barcode className="h-3 w-3 mr-1 text-green-600" />
                        <p>Code-barres: {product.barcode}</p>
                      </div>
                    ) : isBarcodeEnabled ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-orange-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          <p>Aucun code-barres</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateBarcodeForProduct(product)}
                          className="h-6 px-2 text-xs"
                        >
                          Générer
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ⚡ Memoized Product Form Dialog - Isolated from parent re-renders */}
      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingProduct={editingProduct}
        families={families.map(f => f.name)}
        onSubmit={handleFormSubmit}
        showBarcode={isBarcodeEnabled}
      />

      {/* Dialogue de gestion des familles */}
      <Dialog open={familyDialogOpen} onOpenChange={setFamilyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Gérer les familles de produits</DialogTitle>
            <DialogDescription>
              Ajoutez ou supprimez des familles pour organiser vos produits
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Ajouter une nouvelle famille */}
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  ref={familyInputRef}
                  placeholder="Nom de la nouvelle famille"
                  value={newFamily}
                  onChange={(e) => {
                    setNewFamily(e.target.value);
                    if (familyError) setFamilyError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFamily())}
                />
                {familyError && (
                  <p className="text-xs text-red-500">{familyError}</p>
                )}
                {/* Icône optionnelle */}
                <div>
                  <Label className="text-xs text-muted-foreground">Icône (optionnelle)</Label>
                  <CategoryIconPicker
                    selectedIcon={newFamilyIcon}
                    onSelect={setNewFamilyIcon}
                  />
                </div>
              </div>
              <Button onClick={handleAddFamily} className="self-start mt-0">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>

            {/* Liste des familles existantes */}
            <div className="space-y-2">
              <Label>Familles existantes ({families.length})</Label>
              {families.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune famille de produits</p>
                  <p className="text-sm">Ajoutez votre première famille ci-dessus</p>
                </div>
              ) : (
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {families.map((family, index) => (
                    <div key={index} className="flex items-center justify-between p-3 hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <FamilyIcon iconName={family.icon} />
                        <span className="font-medium">{family.name}</span>
                      </div>
                      {confirmDelete === family.name ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-600">Supprimer ?</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={confirmDeleteFamily}
                            className="text-destructive hover:text-destructive h-7 px-1"
                          >
                            Oui
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelDeleteFamily}
                            className="h-7 px-1"
                          >
                            Non
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFamily(family.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFamilyDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

