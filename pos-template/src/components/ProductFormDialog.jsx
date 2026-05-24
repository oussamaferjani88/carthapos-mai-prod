import { useState, useRef, useCallback, memo, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { 
  Upload,
  Scan,
  Sparkles,
  Barcode,
  Image as ImageIcon,
  X
} from 'lucide-react';

const RENDER_WARN_THRESHOLD = 10;

/**
 * ⚡ PERFORMANCE: Memoized product form dialog with fully uncontrolled inputs
 * Zero React re-renders on keystroke — browser manages input values natively
 */
const ProductFormDialog = memo(function ProductFormDialog({
  open,
  onOpenChange,
  editingProduct,
  families,
  onSubmit,
  showBarcode = true
}) {
  // ⚡ UNCONTROLLED INPUTS: Browser manages value, zero React re-render on keystroke
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageFileRef = useRef(null);

  // Family Select is a controlled dropdown (no keystroke lag concern)
  const [family, setFamily] = useState(editingProduct?.family || editingProduct?.category || '');
  const [barcodeDisplay, setBarcodeDisplay] = useState(editingProduct?.barcode || '');
  const [imagePreview, setImagePreview] = useState(editingProduct?.image || null);
  const [isScanning, setIsScanning] = useState(false);
  const [formError, setFormError] = useState('');

  // ⚡ Performance monitoring
  const renderCountRef = useRef(0);
  useEffect(() => {
    renderCountRef.current++;
    console.log(`⚡ [PRODUCT_FORM] Render #${renderCountRef.current} (open=${open}, edit=${!!editingProduct})`);
    if (renderCountRef.current > RENDER_WARN_THRESHOLD) {
      console.warn(`⚠️ [PRODUCT_FORM] High render count: ${renderCountRef.current} — investigate`);
    }
  });

  // Handle dialog open/close — initialize or reset the form
  const handleDialogChange = useCallback((newOpen) => {
    const startTime = Date.now();
    if (newOpen) {
      // Opening — set ref values from editingProduct
      if (formRef.current) {
        const form = formRef.current;
        form.querySelector('[name="name"]') && (form.querySelector('[name="name"]').value = editingProduct?.name || '');
        form.querySelector('[name="price"]') && (form.querySelector('[name="price"]').value = editingProduct?.price?.toString() || '');
        form.querySelector('[name="barcode"]') && (form.querySelector('[name="barcode"]').value = editingProduct?.barcode || '');
        form.querySelector('[name="description"]') && (form.querySelector('[name="description"]').value = editingProduct?.description || '');
        form.querySelector('[name="stock"]') && (form.querySelector('[name="stock"]').value = editingProduct?.stock?.toString() || '0');
      }
      setFamily(editingProduct?.family || editingProduct?.category || '');
      setBarcodeDisplay(editingProduct?.barcode || '');
      setFormError('');
      setImagePreview(editingProduct?.image || null);
      imageFileRef.current = null;
      console.log(`⏱️ [PRODUCT_FORM] Dialog opened in ${Date.now() - startTime}ms`);
    } else {
      // Closing — reset form
      if (formRef.current) formRef.current.reset();
      setFamily('');
      setBarcodeDisplay('');
      setFormError('');
      setImagePreview(null);
      imageFileRef.current = null;
      renderCountRef.current = 0;
    }
    onOpenChange(newOpen);
  }, [editingProduct, onOpenChange]);

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
      
      imageFileRef.current = file;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeImage = useCallback(() => {
    imageFileRef.current = null;
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const startBarcodeScanner = useCallback(() => {
    setIsScanning(true);
    setTimeout(() => {
      const scannedCode = '1234567890123';
      if (formRef.current) {
        const barcodeInput = formRef.current.querySelector('[name="barcode"]');
        if (barcodeInput) barcodeInput.value = scannedCode;
      }
      setBarcodeDisplay(scannedCode);
      setIsScanning(false);
      alert(`Code-barres scanné: ${scannedCode}`);
    }, 2000);
  }, []);

  const generateBarcode = useCallback(async () => {
    const form = formRef.current;

    const randomDigits = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(randomDigits[i]);
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const fullBarcode = randomDigits + checkDigit;

    const barcodeInput = form?.querySelector('[name="barcode"]');
    if (barcodeInput) barcodeInput.value = fullBarcode;
    setBarcodeDisplay(fullBarcode);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const startTime = Date.now();
    
    const form = formRef.current;
    if (!form) return;

    const fd = new FormData(form);
    const name = fd.get('name') || '';
    const price = fd.get('price') || '';
    const barcode = fd.get('barcode') || '';
    const description = fd.get('description') || '';
    const stock = parseInt(fd.get('stock')) || 0;

    console.log(`⏱️ [PRODUCT_FORM] Refs read in ${Date.now() - startTime}ms`);

    if (!name || !price || !family) {
      setFormError('Le nom, prix et famille sont obligatoires');
      return;
    }

    try {
      let imageData = imagePreview;
      if (imageFileRef.current) {
        imageData = await convertImageToBase64(imageFileRef.current);
      }

      const productData = {
        name,
        family,
        price: parseFloat(price),
        barcode,
        stock,
        image: imageData,
        description
      };

      const submitStart = Date.now();
      await onSubmit(productData);
      const submitElapsed = Date.now() - submitStart;
      console.log(`⏱️ [PRODUCT_FORM] onSubmit resolved in ${submitElapsed}ms — ${submitElapsed > 100 ? '⚠️ BACKEND LAG' : '✅ OK'}`);
      console.log(`⏱️ [PRODUCT_FORM] Total submit: ${Date.now() - startTime}ms`);
      
      // Reset on success
      form.reset();
      setFamily('');
      setImagePreview(null);
      imageFileRef.current = null;
      renderCountRef.current = 0;
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      setFormError('Erreur lors de la sauvegarde: ' + error.message);
    }
  }, [family, imagePreview, onSubmit, onOpenChange]);

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

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
        
        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[400px] overflow-y-auto">
            {/* Nom du produit */}
            <div className="grid gap-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingProduct?.name || ''}
                placeholder="Ex: Café Expresso, Croissant..."
                required
                autoFocus
              />
            </div>
          
            {/* Famille du produit */}
            <div className="grid gap-2">
              <Label htmlFor="family">Famille du produit *</Label>
              <Select 
                value={family} 
                onValueChange={(value) => setFamily(value)}
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
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingProduct?.price?.toString() || ''}
                  placeholder="0.00"
                  className="pr-8"
                  required
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  DT
                </span>
              </div>
            </div>
          
            {/* Stock */}
            <div className="grid gap-2">
              <Label htmlFor="stock">Stock initial</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min="0"
                step="1"
                defaultValue={editingProduct?.stock?.toString() || '0'}
                placeholder="0"
              />
            </div>

            {showBarcode && (
              <div className="grid gap-2">
                <Label htmlFor="barcode">Code-barres</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    name="barcode"
                    defaultValue={editingProduct?.barcode || ''}
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
                {barcodeDisplay && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Barcode className="h-3 w-3 mr-1" />
                    Code-barres: {barcodeDisplay}
                  </div>
                )}
              </div>
            )}
            
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
                name="description"
                defaultValue={editingProduct?.description || ''}
                placeholder="Description du produit, ingrédients, allergènes..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {formError && (
              <p className="text-sm text-red-500 text-center w-full">{formError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit">
                {editingProduct ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

ProductFormDialog.displayName = 'ProductFormDialog';

export default ProductFormDialog;
