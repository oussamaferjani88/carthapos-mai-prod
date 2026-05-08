import { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { useDebouncedFormInput } from '../hooks/usePerformance'; // ⚡ Import optimized hook
import { isPreviewMode, getPreviewData, logEnvironment } from '../utils/environment';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Search, 
  Barcode, 
  Sparkles, 
  AlertTriangle, 
  Camera,
  Upload,
  Scan,
  Image as ImageIcon,
  X,
  Settings
} from 'lucide-react';

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

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('all');
  const [families, setFamilies] = useState([]);
  const [newFamily, setNewFamily] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    family: '', // Famille du produit
    price: '',
    barcode: '',
    image: null, // Image du produit (optionnelle)
    description: ''
  });

  // ⚡ PERFORMANCE FIX: Use debounced form input to prevent lag when typing
  const formInput = useDebouncedFormInput(formData, setFormData, 150);
  
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Generate a unique barcode using the backend API
  const generateBarcode = async () => {
    try {
      // Call the backend API to generate a unique barcode
      const response = await fetch('/api/barcode/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: formData.name || 'New Product',
          category: formData.category || 'General'
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update form data with generated barcode
        setFormData({ ...formData, barcode: data.barcode });
        
        // Show success message
        if (window.electronAPI && window.electronAPI.showNotification) {
          window.electronAPI.showNotification('Code-barres généré avec succès!', `Nouveau code: ${data.barcode}`);
        } else {
          alert(`Code-barres généré: ${data.barcode}`);
        }
      } else {
        throw new Error('Failed to generate barcode');
      }
    } catch (error) {
      console.error('Error generating barcode:', error);
      
      // Fallback to local generation if API fails
      const randomDigits = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
      
      // Calculate check digit using EAN-13 algorithm
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(randomDigits[i]);
        sum += (i % 2 === 0) ? digit : digit * 3;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      
      const fullBarcode = randomDigits + checkDigit;
      
      // Update form data with generated barcode
      setFormData({ ...formData, barcode: fullBarcode });
      
      if (window.electronAPI && window.electronAPI.showNotification) {
        window.electronAPI.showNotification('Code-barres généré (mode hors ligne)', `Nouveau code: ${fullBarcode}`);
      } else {
        alert(`Code-barres généré (mode hors ligne): ${fullBarcode}`);
      }
    }
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
           const familyList = (rows || []).map(row => row.name).filter(Boolean);
           console.log(`📊 [FAMILIES-MAPPED] ${familyList.length} families:`, familyList);
           setFamilies(familyList);
         } else if (window.electronAPI.query) {
           // Fallback: derive from products table
           console.log(`📡 [FALLBACK-QUERY] Getting families from products table...`);
           const data = await window.electronAPI.query(
             'SELECT DISTINCT family FROM products WHERE family IS NOT NULL AND family != ""'
           );
           console.log(`✅ [FALLBACK-RETURN] Got ${data?.length || 0} families from products`);
           const familyList = data.map(row => row.family).filter(Boolean);
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
     
     if (!trimmed) {
       alert('Veuillez entrer un nom de famille');
       return;
     }
     
     if (families.includes(trimmed)) {
       alert('Cette famille existe déjà');
       return;
     }
     
     try {
       if (window.electronAPI && window.electronAPI.addFamily) {
         const addStart = performance.now();
         console.log(`⏱️ [IPC-CALL] Sending addFamily to Electron...`);
         
         await window.electronAPI.addFamily(trimmed, null);
         const addDuration = performance.now() - addStart;
         console.log(`✅ [IPC-RETURN] addFamily returned - ${addDuration.toFixed(2)}ms`);
         
         const reloadStart = performance.now();
         await loadFamilies();
         const reloadDuration = performance.now() - reloadStart;
         console.log(`✅ [FAMILIES-RELOADED] - ${reloadDuration.toFixed(2)}ms`);
       } else {
         // Fallback: update local state only
         setFamilies([...families, trimmed]);
       }
       setNewFamily('');
       setFamilyDialogOpen(false);
       alert('Famille ajoutée avec succès');
       const totalDuration = performance.now() - startTime;
       console.log(`✅ [FAMILY-ADD OK] Total: ${totalDuration.toFixed(2)}ms`);
     } catch (error) {
       console.error('❌ [FAMILY-ADD ERROR]', error);
       alert('Erreur lors de l\'ajout de la famille');
     }
   };

  // Supprimer une famille
  const handleDeleteFamily = async (familyToDelete) => {
    if (confirm(`Voulez-vous vraiment supprimer la famille "${familyToDelete}" ?`)) {
      try {
        if (window.electronAPI && window.electronAPI.deleteFamily) {
          await window.electronAPI.deleteFamily(familyToDelete);
          await loadFamilies();
        } else {
          // Fallback: update local state only
          setFamilies(families.filter(f => f !== familyToDelete));
        }
      } catch (error) {
        console.error('Erreur lors de la suppression de la famille:', error);
        alert('Erreur lors de la suppression de la famille');
      }
    }
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode.includes(searchTerm);
    const matchesFamily = selectedFamily === 'all' || product.family === selectedFamily || product.category === selectedFamily;
    return matchesSearch && matchesFamily;
  });

   const handleSubmit = async (e) => {
     e.preventDefault();
     
     const startTime = performance.now();
     console.log(`⏱️ [PRODUCT-SUBMIT START] Adding/Editing product`);
     
     if (!formData.name || !formData.price || !formData.family) {
       console.warn('❌ Form validation failed - missing required fields');
       alert('Le nom, prix et famille sont obligatoires');
       return;
     }

     try {
       const imageConvertStart = performance.now();
       console.log(`⏱️ [IMAGE-CONVERT START]`);
       
       const productData = {
         name: formData.name,
         family: formData.family,
         price: parseFloat(formData.price),
         barcode: formData.barcode,
         image: formData.image ? await convertImageToBase64(formData.image) : null,
         description: formData.description || ''
       };
       
       const imageConvertDuration = performance.now() - imageConvertStart;
       console.log(`✅ [IMAGE-CONVERT OK] ${imageConvertDuration.toFixed(2)}ms`);

       if (editingProduct) {
         console.log(`⏱️ [PRODUCT-UPDATE] ID: ${editingProduct.id}`);
         // ⚡ OPTIMISTIC UPDATE: Update UI immediately without waiting for DB
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
             // On error, reload products to ensure consistency
             await loadProducts();
             alert('Erreur lors de la sauvegarde: ' + error.message);
             return;
           }
         }
         alert('Produit mis à jour avec succès');
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
               setProducts(products.map(p => 
                 p.id === newProduct.id ? { ...p, id: savedProduct.id } : p
               ));
             }
           } catch (error) {
             console.error('❌ [DB-ERROR] Database save error:', error);
             // On error, remove from UI and reload
             setProducts(products.filter(p => p.id !== newProduct.id));
             alert('Erreur lors de la sauvegarde: ' + error.message);
             return;
           }
         } else {
           // Fallback for web mode
           alert('Produit créé avec succès');
         }
         alert('Produit créé avec succès');
       }
       
       setDialogOpen(false);
       setEditingProduct(null);
       resetForm();
       
       const totalDuration = performance.now() - startTime;
       console.log(`✅ [PRODUCT-SUBMIT OK] Total: ${totalDuration.toFixed(2)}ms`);
     } catch (error) {
       console.error('❌ [PRODUCT-SUBMIT ERROR]', error);
       alert('Erreur lors de la sauvegarde');
     }
    };
  
  // Fonction pour convertir l'image en base64
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  // Fonction pour réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      name: '',
      family: '',
      price: '',
      barcode: '',
      image: null,
      description: ''
    });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      family: product.family || product.category || '',
      price: product.price.toString(),
      barcode: product.barcode || '',
      image: null, // L'image sera chargée séparément
      description: product.description || ''
    });
    // Si le produit a une image, la charger pour l'aperçu
    if (product.image) {
      setImagePreview(product.image);
    }
    setDialogOpen(true);
  };

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

  const openCreateDialog = () => {
    setEditingProduct(null);
    resetForm();
    setDialogOpen(true);
  };

  // Generate barcode for existing product
  const generateBarcodeForProduct = async (product) => {
    try {
      const response = await fetch('/api/barcode/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: product.name,
          category: product.category
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the product with the new barcode
        const updatedProduct = { ...product, barcode: data.barcode };
        
        if (window.electronAPI) {
          await window.electronAPI.updateProduct(product.id, updatedProduct);
          await loadProducts();
        } else {
          // Fallback for web development
          setProducts(products.map(p => 
            p.id === product.id ? updatedProduct : p
          ));
        }
        
        if (window.electronAPI && window.electronAPI.showNotification) {
          window.electronAPI.showNotification('Code-barres généré!', `${product.name}: ${data.barcode}`);
        } else {
          alert(`Code-barres généré pour ${product.name}: ${data.barcode}`);
        }
      }
    } catch (error) {
      console.error('Error generating barcode for product:', error);
      alert('Erreur lors de la génération du code-barres');
    }
  };

  // Generate barcodes for all products without one
  const generateBulkBarcodes = async () => {
    const productsWithoutBarcodes = products.filter(p => !p.barcode);
    
    if (productsWithoutBarcodes.length === 0) {
      alert('Tous les produits ont déjà un code-barres');
      return;
    }

    const confirmed = confirm(`Générer des codes-barres pour ${productsWithoutBarcodes.length} produit(s) ?`);
    if (!confirmed) return;

    try {
      let successCount = 0;
      let failCount = 0;

      for (const product of productsWithoutBarcodes) {
        try {
          const response = await fetch('/api/barcode/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              productName: product.name,
              category: product.category
            })
          });

          if (response.ok) {
            const data = await response.json();
            const updatedProduct = { ...product, barcode: data.barcode };
            
            if (window.electronAPI) {
              await window.electronAPI.updateProduct(product.id, updatedProduct);
            } else {
              // Update local state for web development
              setProducts(prev => prev.map(p => 
                p.id === product.id ? updatedProduct : p
              ));
            }
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Error generating barcode for ${product.name}:`, error);
          failCount++;
        }
      }

      // Reload products if using Electron API
      if (window.electronAPI) {
        await loadProducts();
      }

      if (window.electronAPI && window.electronAPI.showNotification) {
        window.electronAPI.showNotification(
          'Génération terminée!', 
          `${successCount} codes-barres générés avec succès${failCount > 0 ? `, ${failCount} échecs` : ''}`
        );
      } else {
        alert(`Génération terminée: ${successCount} succès${failCount > 0 ? `, ${failCount} échecs` : ''}`);
      }
    } catch (error) {
      console.error('Error in bulk barcode generation:', error);
      alert('Erreur lors de la génération en masse');
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
          {products.filter(p => !p.barcode).length > 0 && (
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
                    <SelectItem key={family} value={family}>
                      {family}
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
                    <span className="text-2xl font-bold">{product.price.toFixed(2)} DT</span>
                    {getStockBadge(product.stock)}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Stock: {product.stock} unités</p>
                    {product.barcode ? (
                      <div className="flex items-center">
                        <Barcode className="h-3 w-3 mr-1 text-green-600" />
                        <p>Code-barres: {product.barcode}</p>
                      </div>
                    ) : (
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
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog pour créer/modifier un produit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct 
                ? 'Modifiez les informations du produit'
                : 'Ajoutez un nouveau produit à votre catalogue'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 max-h-[400px] overflow-y-auto">
               {/* Nom du produit */}
               <div className="grid gap-2">
                 <Label htmlFor="name">Nom du produit *</Label>
                 <Input
                   id="name"
                   value={formData.name}
                   {...formInput.bind('name')}
                   placeholder="Ex: Café Expresso, Croissant..."
                   required
                 />
               </div>
              
              {/* Famille du produit */}
              <div className="grid gap-2">
                <Label htmlFor="family">Famille du produit *</Label>
                <Select 
                  value={formData.family} 
                  onValueChange={(value) => setFormData({ ...formData, family: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une famille" />
                  </SelectTrigger>
                  <SelectContent>
                    {families.map((family) => (
                      <SelectItem key={family} value={family}>
                        {family}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
               {/* Prix de vente */}
               <div className="grid gap-2">
                 <Label htmlFor="price">Prix de vente *</Label>
                 <div className="relative">
                   <Input
                     id="price"
                     type="number"
                     step="0.01"
                     min="0"
                     value={formData.price}
                     {...formInput.bind('price')}
                     placeholder="0.00"
                     className="pr-8"
                     required
                   />
                   <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                     DT
                   </span>
                 </div>
               </div>
              
               {/* Code-barres */}
               <div className="grid gap-2">
                 <Label htmlFor="barcode">Code-barres</Label>
                 <div className="flex gap-2">
                   <Input
                     id="barcode"
                     value={formData.barcode}
                     {...formInput.bind('barcode')}
                     placeholder="Code-barres du produit"
                     className="flex-1"
                   />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startBarcodeScanner}
                    className="px-3 shrink-0"
                    title="Scanner un code-barres"
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                    ) : (
                      <Scan className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateBarcode}
                    className="px-3 shrink-0"
                    title="Générer un code-barres automatiquement"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
                {formData.barcode && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Barcode className="h-3 w-3 mr-1" />
                    Code-barres: {formData.barcode}
                  </div>
                )}
              </div>
              
              {/* Image du produit (optionnelle) */}
              <div className="grid gap-2">
                <Label htmlFor="image">Image du produit (optionnelle)</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choisir une image
                    </Button>
                    {imagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeImage}
                        className="px-3"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {imagePreview && (
                    <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Aperçu du produit"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {!imagePreview && (
                    <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Aucune image sélectionnée</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
               {/* Description (optionnelle) */}
               <div className="grid gap-2">
                 <Label htmlFor="description">Description (optionnelle)</Label>
                 <Textarea
                   id="description"
                   value={formData.description}
                   {...formInput.bind('description')}
                   placeholder="Description du produit, ingrédients, allergènes..."
                   rows={3}
                 />
               </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                {editingProduct ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              <Input
                placeholder="Nom de la nouvelle famille"
                value={newFamily}
                onChange={(e) => setNewFamily(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddFamily()}
              />
              <Button onClick={handleAddFamily}>
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
                      <span className="font-medium">{family}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFamily(family)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

