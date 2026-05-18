import { useState, useRef, useCallback, memo } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useDebouncedFormInput } from '../hooks/usePerformance';
import { 
  Upload,
  Scan,
  Sparkles,
  Barcode,
  Image as ImageIcon,
  X
} from 'lucide-react';

/**
 * ⚡ PERFORMANCE: Memoized product form dialog
 * Isolated from parent component to prevent re-renders when typing
 * Only re-renders when dialog open/close state changes, not on parent updates
 */
const ProductFormDialog = memo(function ProductFormDialog({
  open,
  onOpenChange,
  editingProduct,
  families,
  onSubmit
}) {
  const [formData, setFormData] = useState({
    name: editingProduct?.name || '',
    family: editingProduct?.family || editingProduct?.category || '',
    price: editingProduct?.price?.toString() || '',
    barcode: editingProduct?.barcode || '',
    image: null,
    description: editingProduct?.description || ''
  });

  // ⚡ Debounced form input for responsive typing
  const formInput = useDebouncedFormInput(formData, setFormData, 150);
  
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(editingProduct?.image || null);
  const [isScanning, setIsScanning] = useState(false);

  const handleImageUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner un fichier image valide');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('L\'image ne doit pas dépasser 5MB');
        return;
      }
      
      setFormData(prev => ({ ...prev, image: file }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeImage = useCallback(() => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const startBarcodeScanner = useCallback(() => {
    setIsScanning(true);
    setTimeout(() => {
      const scannedCode = '1234567890123';
      setFormData(prev => ({ ...prev, barcode: scannedCode }));
      setIsScanning(false);
      alert(`Code-barres scanné: ${scannedCode}`);
    }, 2000);
  }, []);

  const generateBarcode = useCallback(async () => {
    try {
      const response = await fetch('/api/barcode/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: formData.name || 'New Product',
          category: formData.family || 'General'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, barcode: data.barcode }));
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
      const randomDigits = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(randomDigits[i]);
        sum += (i % 2 === 0) ? digit : digit * 3;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      const fullBarcode = randomDigits + checkDigit;
      setFormData(prev => ({ ...prev, barcode: fullBarcode }));
      if (window.electronAPI && window.electronAPI.showNotification) {
        window.electronAPI.showNotification('Code-barres généré (mode hors ligne)', `Nouveau code: ${fullBarcode}`);
      } else {
        alert(`Code-barres généré (mode hors ligne): ${fullBarcode}`);
      }
    }
  }, [formData.name, formData.family]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.family) {
      alert('Le nom, prix et famille sont obligatoires');
      return;
    }

    try {
      const productData = {
        name: formData.name,
        family: formData.family,
        price: parseFloat(formData.price),
        barcode: formData.barcode,
        image: formData.image ? await convertImageToBase64(formData.image) : null,
        description: formData.description || ''
      };

      await onSubmit(productData);
      
      // Reset form
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
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  }, [formData, onSubmit, onOpenChange]);

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDialogChange = useCallback((newOpen) => {
    if (!newOpen) {
      // Reset form when dialog closes
      setFormData({
        name: editingProduct?.name || '',
        family: editingProduct?.family || editingProduct?.category || '',
        price: editingProduct?.price?.toString() || '',
        barcode: editingProduct?.barcode || '',
        image: null,
        description: editingProduct?.description || ''
      });
      setImagePreview(editingProduct?.image || null);
    }
    onOpenChange(newOpen);
  }, [editingProduct, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
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
                {...formInput.bind('name')}
                placeholder="Ex: Café Expresso, Croissant..."
                required
                autoFocus
              />
            </div>
          
            {/* Famille du produit */}
            <div className="grid gap-2">
              <Label htmlFor="family">Famille du produit *</Label>
              <Select 
                value={formData.family} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, family: value }))}
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
                {...formInput.bind('description')}
                placeholder="Description du produit, ingrédients, allergènes..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {editingProduct ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

ProductFormDialog.displayName = 'ProductFormDialog';

export default ProductFormDialog;
