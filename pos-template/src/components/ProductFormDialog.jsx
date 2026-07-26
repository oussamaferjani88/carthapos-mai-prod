import { useState, useRef, useCallback, memo, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Upload, Scan, Sparkles, Barcode, Image as ImageIcon, X, Package, DollarSign, Box, ChefHat, Clock } from 'lucide-react';
import { Switch } from './ui/switch';

const EMPTY_PRODUCT = {
  name: '', price: '', cost_price: '', barcode: '', description: '',
  stock: '0', min_stock: '0', supplier: '', family: '', unit: 'pièce',
  image: null, vat_rate_id: null, price_type: 'ttc',
  requires_kitchen: false, preparation_department: '', preparation_time: ''
};

const Section = ({ icon: Icon, title, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded flex items-center justify-center bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-semibold">{title}</h4>
    </div>
    <div className="space-y-3 pl-8">{children}</div>
  </div>
);

const ProductFormDialog = memo(function ProductFormDialog({
  open,
  onOpenChange,
  editingProduct,
  families,
  onSubmit,
  showBarcode = true,
  vatRates = [],
  taxEnabled = false,
  kitchenDepartments = []
}) {
  const fileInputRef = useRef(null);
  const imageFileRef = useRef(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('0');
  const [supplier, setSupplier] = useState('');
  const [family, setFamily] = useState('');
  const [unit, setUnit] = useState('pièce');
  const [imagePreview, setImagePreview] = useState(null);
  const [vatRateId, setVatRateId] = useState('none');
  const [priceType, setPriceType] = useState('ttc');
  const [requiresKitchen, setRequiresKitchen] = useState(false);
  const [preparationDepartment, setPreparationDepartment] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [formError, setFormError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const syncFromProduct = useCallback((product) => {
    setName(product?.name || '');
    setPrice(product?.price?.toString() || '');
    setCostPrice(product?.cost_price?.toString() || '');
    setBarcode(product?.barcode || '');
    setDescription(product?.description || '');
    setStock(product?.stock?.toString() || '0');
    setMinStock(product?.min_stock?.toString() || '0');
    setSupplier(product?.supplier || '');
    setFamily(product?.family || product?.category || '');
    setUnit(product?.unit || 'pièce');
    setImagePreview(product?.image || null);
    setVatRateId(product?.vat_rate_id?.toString() || 'none');
    setPriceType(product?.price_type || 'ttc');
    setRequiresKitchen(product?.requires_kitchen === 1 || product?.requires_kitchen === true);
    setPreparationDepartment(product?.preparation_department || '');
    setPreparationTime(product?.preparation_time?.toString() || '');
    setFormError('');
    imageFileRef.current = null;
  }, []);

  const resetAll = useCallback(() => {
    setName(''); setPrice(''); setCostPrice(''); setBarcode('');
    setDescription(''); setStock('0'); setMinStock('0'); setSupplier('');
    setFamily(''); setUnit('pièce'); setImagePreview(null);
    setVatRateId('none'); setPriceType('ttc');
    setRequiresKitchen(false); setPreparationDepartment('');
    setPreparationTime(''); setFormError(''); setIsScanning(false);
    setIsDragOver(false);
    imageFileRef.current = null;
  }, []);

  const handleDialogChange = useCallback((newOpen) => {
    if (newOpen) {
      syncFromProduct(editingProduct);
    } else {
      resetAll();
    }
    onOpenChange(newOpen);
  }, [editingProduct, onOpenChange, syncFromProduct, resetAll]);

  const processImageFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Veuillez sélectionner un fichier image valide');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('L\'image ne doit pas dépasser 5MB');
      return;
    }
    imageFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setFormError('');
  }, []);

  const handleImageUpload = useCallback((event) => {
    processImageFile(event.target.files[0]);
  }, [processImageFile]);

  const removeImage = useCallback(() => {
    imageFileRef.current = null;
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    processImageFile(e.dataTransfer.files[0]);
  }, [processImageFile]);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        processImageFile(item.getAsFile());
        break;
      }
    }
  }, [processImageFile]);

  useEffect(() => {
    if (open) {
      syncFromProduct(editingProduct);
    }
  }, [open, editingProduct, syncFromProduct]);

  useEffect(() => {
    if (open) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [open, handlePaste]);

  const startBarcodeScanner = useCallback(() => {
    setIsScanning(true);
    setTimeout(() => {
      const scannedCode = '1234567890123';
      setBarcode(scannedCode);
      setIsScanning(false);
    }, 2000);
  }, []);

  const generateBarcode = useCallback(() => {
    const randomDigits = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(randomDigits[i]);
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    setBarcode(randomDigits + checkDigit);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!name.trim() || !price || !family) {
      setFormError('Le nom, prix et famille sont obligatoires');
      return;
    }
    try {
      let imageData = imagePreview;
      if (imageFileRef.current) {
        imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(imageFileRef.current);
        });
      }
      const productData = {
        name: name.trim(), family,
        price: parseFloat(price),
        cost_price: parseFloat(costPrice) || 0,
        barcode: barcode.trim(),
        stock: parseInt(stock) || 0,
        min_stock: parseInt(minStock) || 0,
        unit, supplier: supplier.trim(),
        image: imageData, description: description.trim(),
        vat_rate_id: vatRateId === 'none' ? null : parseInt(vatRateId) || null,
        price_type: priceType,
        requires_kitchen: requiresKitchen,
        preparation_department: requiresKitchen ? (preparationDepartment || null) : null,
        preparation_time: requiresKitchen && preparationTime ? parseInt(preparationTime) : null
      };
      await onSubmit(productData);
      onOpenChange(false);
    } catch (error) {
      setFormError('Erreur lors de la sauvegarde: ' + error.message);
    }
  }, [name, price, costPrice, family, barcode, stock, minStock, unit, supplier, imagePreview, description, vatRateId, priceType, requiresKitchen, preparationDepartment, preparationTime, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent
        className="sm:max-w-[560px] p-0 gap-0"
        onInteractOutside={(e) => {
          if (e.target?.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
              </DialogTitle>
              <DialogDescription>
                {editingProduct ? 'Modifiez les informations du produit' : 'Ajoutez un nouveau produit à votre catalogue'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[calc(90vh-200px)] px-6">
            <div className="space-y-6 pb-6">
              {/* GENERAL */}
              <Section icon={Package} title="Général">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom du produit *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Café Expresso, Croissant..." required />
                </div>
                <div className="grid gap-2">
                  <Label>Famille *</Label>
                  <Select value={family} onValueChange={setFamily}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez une famille" /></SelectTrigger>
                    <SelectContent>
                      {families.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description, ingrédients, allergènes..." rows={2} />
                </div>
              </Section>

              <Separator />

              {/* PRICING */}
              <Section icon={DollarSign} title="Tarification">
                {taxEnabled && vatRates.length > 0 && (
                  <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="price_type" value="ht" checked={priceType === 'ht'} onChange={() => setPriceType('ht')} className="w-4 h-4" />
                      <span className="text-sm">HT</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="price_type" value="ttc" checked={priceType === 'ttc'} onChange={() => setPriceType('ttc')} className="w-4 h-4" />
                      <span className="text-sm">TTC</span>
                    </label>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="price">
                      {taxEnabled && priceType === 'ht' ? 'Prix HT *' : taxEnabled ? 'Prix TTC *' : 'Prix de vente *'}
                    </Label>
                    <div className="relative">
                      <Input id="price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="pr-8" required />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">DT</span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cost_price">Prix d'achat</Label>
                    <div className="relative">
                      <Input id="cost_price" type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0.00" className="pr-8" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">DT</span>
                    </div>
                  </div>
                </div>
                {taxEnabled && vatRates.length > 0 && (
                  <div className="grid gap-2">
                    <Label>Taux de TVA</Label>
                    <Select value={vatRateId} onValueChange={setVatRateId}>
                      <SelectTrigger><SelectValue placeholder="Aucune TVA" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune TVA</SelectItem>
                        {vatRates.filter(v => v.is_active).map((vr) => (
                          <SelectItem key={vr.id} value={vr.id.toString()}>{vr.name} ({vr.rate}%)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </Section>

              <Separator />

              {/* INVENTORY */}
              <Section icon={Box} title="Inventaire">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="stock">Stock initial</Label>
                    <Input id="stock" type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="min_stock">Stock minimum</Label>
                    <Input id="min_stock" type="number" min="0" step="1" value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Unité</Label>
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pièce">Pièce</SelectItem>
                        <SelectItem value="kg">Kilogramme (kg)</SelectItem>
                        <SelectItem value="g">Gramme (g)</SelectItem>
                        <SelectItem value="L">Litre (L)</SelectItem>
                        <SelectItem value="cl">Centilitre (cl)</SelectItem>
                        <SelectItem value="ml">Millilitre (ml)</SelectItem>
                        <SelectItem value="m">Mètre (m)</SelectItem>
                        <SelectItem value="pack">Pack</SelectItem>
                        <SelectItem value="unit">Unité</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="supplier">Fournisseur</Label>
                    <Input id="supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Nom du fournisseur" />
                  </div>
                </div>
              </Section>

              <Separator />

              {/* KITCHEN CONFIGURATION */}
              <div className={`rounded-xl border transition-all duration-300 ${requiresKitchen ? 'border-amber-300 bg-amber-50/50 shadow-sm shadow-amber-100' : 'border-muted-foreground/10 bg-muted/20'}`}>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${requiresKitchen ? 'bg-amber-100' : 'bg-muted'}`}>
                        <ChefHat className={`h-3.5 w-3.5 ${requiresKitchen ? 'text-amber-600' : 'text-muted-foreground'}`} />
                      </div>
                      <h4 className="text-sm font-semibold">Configuration Cuisine</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Préparation cuisine</Label>
                      <Switch checked={requiresKitchen} onCheckedChange={setRequiresKitchen} />
                    </div>
                  </div>
                  {requiresKitchen && (
                    <div className="space-y-3 pl-8 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="grid gap-2">
                        <Label className="text-xs">Département de préparation *</Label>
                        <Select value={preparationDepartment || 'none'} onValueChange={(v) => setPreparationDepartment(v === 'none' ? '' : v)}>
                          <SelectTrigger><SelectValue placeholder="Sélectionnez un département" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucun département</SelectItem>
                            {kitchenDepartments.filter(d => d.is_active).map((d) => (
                              <SelectItem key={d.id} value={d.name}>
                                <span className="flex items-center gap-2">
                                  {d.icon && <span>{d.icon}</span>}
                                  <span>{d.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs flex items-center gap-1.5">
                          <Clock className="h-3 w-3" /> Temps de préparation estimé (min)
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max="480"
                          value={preparationTime}
                          onChange={(e) => setPreparationTime(e.target.value)}
                          placeholder="Ex: 15"
                        />
                      </div>
                    </div>
                  )}
                  {!requiresKitchen && (
                    <p className="text-xs text-muted-foreground pl-8">Ce produit n'apparaîtra pas en cuisine.</p>
                  )}
                </div>
              </div>

              {/* BARCODE */}
              {showBarcode && (
                <>
                  <Separator />
                  <Section icon={Barcode} title="Code-barres">
                    <div className="flex gap-2">
                      <Input id="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Code-barres du produit" className="flex-1 font-mono" />
                      <Button type="button" variant="outline" size="icon" onClick={startBarcodeScanner} title="Scanner" disabled={isScanning}>
                        {isScanning ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" /> : <Scan className="h-4 w-4" />}
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={generateBarcode} title="Générer">
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </div>
                    {barcode && (
                      <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        <Barcode className="h-3 w-3" /> {barcode}
                      </p>
                    )}
                  </Section>
                </>
              )}

              <Separator />

              {/* IMAGE */}
              <Section icon={ImageIcon} title="Image">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative rounded-lg border-2 border-dashed transition-all duration-200 overflow-hidden ${isDragOver ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-muted-foreground/20 hover:border-muted-foreground/40'}`}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  {imagePreview ? (
                    <div className="relative group">
                      <img src={imagePreview} alt="Aperçu" className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>Remplacer</Button>
                        <Button type="button" variant="destructive" size="sm" onClick={removeImage}><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      <Upload className="h-8 w-8" />
                      <span className="text-sm font-medium">Glisser-déposer ou cliquer</span>
                      <span className="text-xs">JPG, PNG — Max 5MB</span>
                    </button>
                  )}
                </div>
              </Section>
            </div>
          </ScrollArea>

          <div className="px-6 py-4 border-t bg-muted/20">
            {formError && <p className="text-sm text-destructive text-center mb-3">{formError}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit">{editingProduct ? 'Mettre à jour' : 'Créer'}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

ProductFormDialog.displayName = 'ProductFormDialog';
export default ProductFormDialog;
