import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Printer, 
  Save, 
  Eye, 
  Upload, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Type,
  Image as ImageIcon,
  Maximize2,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Receipt
} from 'lucide-react';

const ReceiptDesigner = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Receipt configuration state
  const [receiptConfig, setReceiptConfig] = useState({
    // Paper settings
    paperWidth: 80, // mm (58mm or 80mm thermal paper)
    paperType: 'thermal',
    
    // Header section
    header: {
      showLogo: true,
      logoUrl: '',
      logoWidth: 150,
      logoAlign: 'center',
      showBusinessName: true,
      businessName: '',
      businessNameSize: 'large',
      showAddress: true,
      address: '',
      showPhone: true,
      phone: '',
      showEmail: false,
      email: '',
      showWebsite: false,
      website: '',
      showTaxId: true,
      taxId: '',
    },

    // Content settings
    content: {
      showDate: true,
      dateFormat: 'DD/MM/YYYY HH:mm',
      showReceiptNumber: true,
      showCashier: true,
      showTable: false,
      showCustomer: false,
      
      // Product columns
      columns: {
        showQuantity: true,
        showProductName: true,
        showUnitPrice: true,
        showTotal: true,
      },

      // Formatting
      fontFamily: 'monospace',
      fontSize: 'normal',
      lineSpacing: 'normal',
    },

    // Footer section
    footer: {
      showSubtotal: true,
      showTax: true,
      showDiscount: true,
      showTotal: true,
      showPaymentMethod: true,
      showChange: true,
      
      // Custom messages
      customMessages: [
        { enabled: true, text: 'Merci pour votre visite!', align: 'center' },
        { enabled: true, text: 'À bientôt!', align: 'center' },
      ],
      
      showBarcode: false,
      barcodeType: 'qr', // 'qr' or 'barcode'
      
      showWebsite: false,
      showSocialMedia: false,
      facebook: '',
      instagram: '',
      
      showReturnPolicy: false,
      returnPolicyText: 'Retour possible sous 7 jours avec ticket',
    },

    // Advanced settings
    advanced: {
      printCopies: 1,
      autoPrint: false,
      cutPaper: true,
      openDrawer: true,
      printDensity: 'normal', // light, normal, dark
      charset: 'utf8',
    }
  });

  // Sample receipt data for preview
  const sampleReceiptData = {
    receiptNumber: 'R-2025-001234',
    date: new Date().toLocaleString('fr-FR'),
    cashier: 'Admin',
    table: 'Table 5',
    customer: 'John Doe',
    items: [
      { name: 'Café Espresso', quantity: 2, unitPrice: 2.50, total: 5.00 },
      { name: 'Croissant', quantity: 3, unitPrice: 1.80, total: 5.40 },
      { name: 'Sandwich Jambon', quantity: 1, unitPrice: 4.50, total: 4.50 },
    ],
    subtotal: 14.90,
    tax: 2.98,
    discount: 1.00,
    total: 16.88,
    paymentMethod: 'Espèces',
    amountPaid: 20.00,
    change: 3.12,
  };

  // Load saved configuration
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      
      // Load from database first, fall back to localStorage
      let configStr = null;
      if (window.electronAPI?.getReceiptConfig) {
        configStr = await window.electronAPI.getReceiptConfig();
      }
      if (!configStr) {
        configStr = localStorage.getItem('receiptConfig');
      }
      if (configStr) {
        setReceiptConfig(JSON.parse(configStr));
      }

      // Load business info from app config
      if (window.electronAPI) {
        const appConfig = await window.electronAPI.getAppConfig();
        if (appConfig) {
          setReceiptConfig(prev => ({
            ...prev,
            header: {
              ...prev.header,
              businessName: appConfig.theme?.businessName || prev.header.businessName,
              logoUrl: appConfig.theme?.logoUrl || prev.header.logoUrl,
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error loading receipt config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      if (window.electronAPI?.saveReceiptConfig) {
        await window.electronAPI.saveReceiptConfig(receiptConfig);
      }
      localStorage.setItem('receiptConfig', JSON.stringify(receiptConfig));
      
      toast({
        title: "✅ Configuration sauvegardée",
        description: "Le design du ticket a été enregistré avec succès.",
      });
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de sauvegarder la configuration.",
        variant: "destructive"
      });
    }
  };

  const updateConfig = (section, field, value) => {
    setReceiptConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const addCustomMessage = () => {
    setReceiptConfig(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        customMessages: [
          ...prev.footer.customMessages,
          { enabled: true, text: '', align: 'center' }
        ]
      }
    }));
  };

  const removeCustomMessage = (index) => {
    setReceiptConfig(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        customMessages: prev.footer.customMessages.filter((_, i) => i !== index)
      }
    }));
  };

  const updateCustomMessage = (index, field, value) => {
    setReceiptConfig(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        customMessages: prev.footer.customMessages.map((msg, i) => 
          i === index ? { ...msg, [field]: value } : msg
        )
      }
    }));
  };

  const testPrint = async () => {
    try {
      toast({
        title: "🖨️ Test d'impression",
        description: "Envoi d'un ticket de test à l'imprimante...",
      });
      if (window.thermalPrinter) {
        await window.thermalPrinter.initialize({});
        const result = await window.thermalPrinter.testPrint();
        toast({
          title: result.success ? "✅ Impression réussie" : "❌ Échec",
          description: result.message || "",
        });
      } else {
        toast({
          title: "ℹ️ Mode simulation",
          description: "Imprimante non disponible — impression simulée.",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erreur d'impression",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateConfig('header', 'logoUrl', e.target.result);
        toast({
          title: "✅ Logo chargé",
          description: "Le logo a été ajouté avec succès.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            Conception du Ticket
          </h1>
          <p className="text-muted-foreground mt-1">
            Personnalisez le design et le contenu de vos tickets de caisse
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Éditer' : 'Aperçu'}
          </Button>
          <Button variant="outline" onClick={testPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Test d'impression
          </Button>
          <Button onClick={saveConfiguration}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Configuration du Ticket</CardTitle>
              <CardDescription>
                Configurez les éléments à afficher sur le ticket
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="header" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="header">En-tête</TabsTrigger>
                  <TabsTrigger value="content">Contenu</TabsTrigger>
                  <TabsTrigger value="footer">Pied de page</TabsTrigger>
                  <TabsTrigger value="advanced">Avancé</TabsTrigger>
                </TabsList>

                {/* HEADER TAB */}
                <TabsContent value="header" className="space-y-4">
                  <div className="space-y-4">
                    {/* Paper Width */}
                    <div className="space-y-2">
                      <Label>Largeur du papier</Label>
                      <Select 
                        value={receiptConfig.paperWidth.toString()}
                        onValueChange={(v) => setReceiptConfig(prev => ({ ...prev, paperWidth: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="58">58mm (Petit)</SelectItem>
                          <SelectItem value="80">80mm (Standard)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {/* Logo */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Afficher le logo</Label>
                        <p className="text-sm text-muted-foreground">Logo en haut du ticket</p>
                      </div>
                      <Switch 
                        checked={receiptConfig.header.showLogo}
                        onCheckedChange={(v) => updateConfig('header', 'showLogo', v)}
                      />
                    </div>

                    {receiptConfig.header.showLogo && (
                      <div className="space-y-2 pl-4">
                        <Label>Logo</Label>
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={uploadLogo}
                            className="flex-1"
                          />
                          {receiptConfig.header.logoUrl && (
                            <img 
                              src={receiptConfig.header.logoUrl} 
                              alt="Logo" 
                              className="h-10 w-10 object-contain border rounded"
                            />
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label>Largeur (px)</Label>
                            <Input 
                              type="number"
                              value={receiptConfig.header.logoWidth}
                              onChange={(e) => updateConfig('header', 'logoWidth', parseInt(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Alignement</Label>
                            <Select 
                              value={receiptConfig.header.logoAlign}
                              onValueChange={(v) => updateConfig('header', 'logoAlign', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Gauche</SelectItem>
                                <SelectItem value="center">Centre</SelectItem>
                                <SelectItem value="right">Droite</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Business Name */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Nom de l'établissement</Label>
                        <p className="text-sm text-muted-foreground">Nom commercial</p>
                      </div>
                      <Switch 
                        checked={receiptConfig.header.showBusinessName}
                        onCheckedChange={(v) => updateConfig('header', 'showBusinessName', v)}
                      />
                    </div>

                    {receiptConfig.header.showBusinessName && (
                      <div className="space-y-2 pl-4">
                        <Input 
                          placeholder="Nom de l'établissement"
                          value={receiptConfig.header.businessName}
                          onChange={(e) => updateConfig('header', 'businessName', e.target.value)}
                        />
                        <Select 
                          value={receiptConfig.header.businessNameSize}
                          onValueChange={(v) => updateConfig('header', 'businessNameSize', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Taille" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Petit</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="large">Grand</SelectItem>
                            <SelectItem value="xlarge">Très grand</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Separator />

                    {/* Address */}
                    <div className="flex items-center justify-between">
                      <Label>Adresse</Label>
                      <Switch 
                        checked={receiptConfig.header.showAddress}
                        onCheckedChange={(v) => updateConfig('header', 'showAddress', v)}
                      />
                    </div>
                    {receiptConfig.header.showAddress && (
                      <Textarea 
                        placeholder="Adresse complète"
                        value={receiptConfig.header.address}
                        onChange={(e) => updateConfig('header', 'address', e.target.value)}
                        className="pl-4"
                        rows={2}
                      />
                    )}

                    {/* Phone */}
                    <div className="flex items-center justify-between">
                      <Label>Téléphone</Label>
                      <Switch 
                        checked={receiptConfig.header.showPhone}
                        onCheckedChange={(v) => updateConfig('header', 'showPhone', v)}
                      />
                    </div>
                    {receiptConfig.header.showPhone && (
                      <Input 
                        placeholder="+33 1 23 45 67 89"
                        value={receiptConfig.header.phone}
                        onChange={(e) => updateConfig('header', 'phone', e.target.value)}
                        className="pl-4"
                      />
                    )}

                    {/* Email */}
                    <div className="flex items-center justify-between">
                      <Label>Email</Label>
                      <Switch 
                        checked={receiptConfig.header.showEmail}
                        onCheckedChange={(v) => updateConfig('header', 'showEmail', v)}
                      />
                    </div>
                    {receiptConfig.header.showEmail && (
                      <Input 
                        type="email"
                        placeholder="contact@business.com"
                        value={receiptConfig.header.email}
                        onChange={(e) => updateConfig('header', 'email', e.target.value)}
                        className="pl-4"
                      />
                    )}

                    {/* Tax ID */}
                    <div className="flex items-center justify-between">
                      <Label>Numéro TVA / SIRET</Label>
                      <Switch 
                        checked={receiptConfig.header.showTaxId}
                        onCheckedChange={(v) => updateConfig('header', 'showTaxId', v)}
                      />
                    </div>
                    {receiptConfig.header.showTaxId && (
                      <Input 
                        placeholder="FR 12 345 678 901"
                        value={receiptConfig.header.taxId}
                        onChange={(e) => updateConfig('header', 'taxId', e.target.value)}
                        className="pl-4"
                      />
                    )}
                  </div>
                </TabsContent>

                {/* CONTENT TAB */}
                <TabsContent value="content" className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Informations de transaction</h3>
                    
                    <div className="flex items-center justify-between">
                      <Label>Date et heure</Label>
                      <Switch 
                        checked={receiptConfig.content.showDate}
                        onCheckedChange={(v) => updateConfig('content', 'showDate', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Numéro de ticket</Label>
                      <Switch 
                        checked={receiptConfig.content.showReceiptNumber}
                        onCheckedChange={(v) => updateConfig('content', 'showReceiptNumber', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Nom du caissier</Label>
                      <Switch 
                        checked={receiptConfig.content.showCashier}
                        onCheckedChange={(v) => updateConfig('content', 'showCashier', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Numéro de table</Label>
                      <Switch 
                        checked={receiptConfig.content.showTable}
                        onCheckedChange={(v) => updateConfig('content', 'showTable', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Nom du client</Label>
                      <Switch 
                        checked={receiptConfig.content.showCustomer}
                        onCheckedChange={(v) => updateConfig('content', 'showCustomer', v)}
                      />
                    </div>

                    <Separator />

                    <h3 className="font-semibold">Colonnes des produits</h3>

                    <div className="flex items-center justify-between">
                      <Label>Quantité</Label>
                      <Switch 
                        checked={receiptConfig.content.columns.showQuantity}
                        onCheckedChange={(v) => setReceiptConfig(prev => ({
                          ...prev,
                          content: {
                            ...prev.content,
                            columns: { ...prev.content.columns, showQuantity: v }
                          }
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Nom du produit</Label>
                      <Switch 
                        checked={receiptConfig.content.columns.showProductName}
                        onCheckedChange={(v) => setReceiptConfig(prev => ({
                          ...prev,
                          content: {
                            ...prev.content,
                            columns: { ...prev.content.columns, showProductName: v }
                          }
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Prix unitaire</Label>
                      <Switch 
                        checked={receiptConfig.content.columns.showUnitPrice}
                        onCheckedChange={(v) => setReceiptConfig(prev => ({
                          ...prev,
                          content: {
                            ...prev.content,
                            columns: { ...prev.content.columns, showUnitPrice: v }
                          }
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Total ligne</Label>
                      <Switch 
                        checked={receiptConfig.content.columns.showTotal}
                        onCheckedChange={(v) => setReceiptConfig(prev => ({
                          ...prev,
                          content: {
                            ...prev.content,
                            columns: { ...prev.content.columns, showTotal: v }
                          }
                        }))}
                      />
                    </div>

                    <Separator />

                    <h3 className="font-semibold">Mise en forme</h3>

                    <div className="space-y-2">
                      <Label>Taille de police</Label>
                      <Select 
                        value={receiptConfig.content.fontSize}
                        onValueChange={(v) => updateConfig('content', 'fontSize', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Petit</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="large">Grand</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Espacement des lignes</Label>
                      <Select 
                        value={receiptConfig.content.lineSpacing}
                        onValueChange={(v) => updateConfig('content', 'lineSpacing', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Compact</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="relaxed">Espacé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* FOOTER TAB */}
                <TabsContent value="footer" className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Totaux et paiement</h3>

                    <div className="flex items-center justify-between">
                      <Label>Sous-total</Label>
                      <Switch 
                        checked={receiptConfig.footer.showSubtotal}
                        onCheckedChange={(v) => updateConfig('footer', 'showSubtotal', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>TVA</Label>
                      <Switch 
                        checked={receiptConfig.footer.showTax}
                        onCheckedChange={(v) => updateConfig('footer', 'showTax', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Réduction</Label>
                      <Switch 
                        checked={receiptConfig.footer.showDiscount}
                        onCheckedChange={(v) => updateConfig('footer', 'showDiscount', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Total</Label>
                      <Switch 
                        checked={receiptConfig.footer.showTotal}
                        onCheckedChange={(v) => updateConfig('footer', 'showTotal', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Méthode de paiement</Label>
                      <Switch 
                        checked={receiptConfig.footer.showPaymentMethod}
                        onCheckedChange={(v) => updateConfig('footer', 'showPaymentMethod', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Monnaie rendue</Label>
                      <Switch 
                        checked={receiptConfig.footer.showChange}
                        onCheckedChange={(v) => updateConfig('footer', 'showChange', v)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Messages personnalisés</h3>
                      <Button size="sm" variant="outline" onClick={addCustomMessage}>
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter
                      </Button>
                    </div>

                    {receiptConfig.footer.customMessages.map((msg, index) => (
                      <Card key={index} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Switch 
                              checked={msg.enabled}
                              onCheckedChange={(v) => updateCustomMessage(index, 'enabled', v)}
                            />
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => removeCustomMessage(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <Input 
                            placeholder="Texte du message"
                            value={msg.text}
                            onChange={(e) => updateCustomMessage(index, 'text', e.target.value)}
                            disabled={!msg.enabled}
                          />
                          <Select 
                            value={msg.align}
                            onValueChange={(v) => updateCustomMessage(index, 'align', v)}
                            disabled={!msg.enabled}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Gauche</SelectItem>
                              <SelectItem value="center">Centre</SelectItem>
                              <SelectItem value="right">Droite</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </Card>
                    ))}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Code-barres / QR Code</Label>
                        <p className="text-sm text-muted-foreground">Pour suivre le ticket</p>
                      </div>
                      <Switch 
                        checked={receiptConfig.footer.showBarcode}
                        onCheckedChange={(v) => updateConfig('footer', 'showBarcode', v)}
                      />
                    </div>

                    {receiptConfig.footer.showBarcode && (
                      <Select 
                        value={receiptConfig.footer.barcodeType}
                        onValueChange={(v) => updateConfig('footer', 'barcodeType', v)}
                        className="pl-4"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="barcode">Code-barres</SelectItem>
                          <SelectItem value="qr">QR Code</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <Label>Politique de retour</Label>
                      <Switch 
                        checked={receiptConfig.footer.showReturnPolicy}
                        onCheckedChange={(v) => updateConfig('footer', 'showReturnPolicy', v)}
                      />
                    </div>

                    {receiptConfig.footer.showReturnPolicy && (
                      <Textarea 
                        placeholder="Politique de retour..."
                        value={receiptConfig.footer.returnPolicyText}
                        onChange={(e) => updateConfig('footer', 'returnPolicyText', e.target.value)}
                        className="pl-4"
                        rows={2}
                      />
                    )}
                  </div>
                </TabsContent>

                {/* ADVANCED TAB */}
                <TabsContent value="advanced" className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Paramètres d'impression</h3>

                    <div className="space-y-2">
                      <Label>Nombre de copies</Label>
                      <Input 
                        type="number"
                        min="1"
                        max="5"
                        value={receiptConfig.advanced.printCopies}
                        onChange={(e) => updateConfig('advanced', 'printCopies', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Impression automatique</Label>
                        <p className="text-sm text-muted-foreground">Imprimer après chaque vente</p>
                      </div>
                      <Switch 
                        checked={receiptConfig.advanced.autoPrint}
                        onCheckedChange={(v) => updateConfig('advanced', 'autoPrint', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Couper le papier</Label>
                        <p className="text-sm text-muted-foreground">Coupe automatique après impression</p>
                      </div>
                      <Switch 
                        checked={receiptConfig.advanced.cutPaper}
                        onCheckedChange={(v) => updateConfig('advanced', 'cutPaper', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Ouvrir le tiroir-caisse</Label>
                        <p className="text-sm text-muted-foreground">Après impression du ticket</p>
                      </div>
                      <Switch 
                        checked={receiptConfig.advanced.openDrawer}
                        onCheckedChange={(v) => updateConfig('advanced', 'openDrawer', v)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Densité d'impression</Label>
                      <Select 
                        value={receiptConfig.advanced.printDensity}
                        onValueChange={(v) => updateConfig('advanced', 'printDensity', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Léger</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="dark">Foncé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-sm">Aperçu en temps réel</CardTitle>
            </CardHeader>
            <CardContent>
              <ReceiptPreview config={receiptConfig} data={sampleReceiptData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Receipt Preview Component
const ReceiptPreview = ({ config, data }) => {
  const getAlignment = (align) => {
    switch(align) {
      case 'left': return 'text-left';
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-center';
    }
  };

  const getFontSize = (size) => {
    switch(size) {
      case 'small': return 'text-xs';
      case 'normal': return 'text-sm';
      case 'large': return 'text-lg';
      case 'xlarge': return 'text-xl';
      default: return 'text-sm';
    }
  };

  return (
    <div 
      className="bg-white text-black p-4 font-mono text-xs overflow-auto max-h-[800px] border-2 border-dashed"
      style={{ 
        width: config.paperWidth === 58 ? '58mm' : '80mm',
        margin: '0 auto'
      }}
    >
      {/* HEADER */}
      {config.header.showLogo && config.header.logoUrl && (
        <div className={getAlignment(config.header.logoAlign)}>
          <img 
            src={config.header.logoUrl} 
            alt="Logo" 
            style={{ width: config.header.logoWidth + 'px', margin: config.header.logoAlign === 'center' ? '0 auto' : '0' }}
          />
        </div>
      )}

      {config.header.showBusinessName && (
        <div className={`${getAlignment('center')} ${getFontSize(config.header.businessNameSize)} font-bold mt-2`}>
          {config.header.businessName || 'NOM ETABLISSEMENT'}
        </div>
      )}

      {config.header.showAddress && config.header.address && (
        <div className="text-center text-xs mt-1">{config.header.address}</div>
      )}

      {config.header.showPhone && config.header.phone && (
        <div className="text-center text-xs">Tél: {config.header.phone}</div>
      )}

      {config.header.showEmail && config.header.email && (
        <div className="text-center text-xs">{config.header.email}</div>
      )}

      {config.header.showTaxId && config.header.taxId && (
        <div className="text-center text-xs">TVA: {config.header.taxId}</div>
      )}

      <div className="border-t-2 border-dashed border-black my-3"></div>

      {/* CONTENT */}
      {config.content.showDate && (
        <div className="text-xs">{data.date}</div>
      )}

      {config.content.showReceiptNumber && (
        <div className="text-xs">Ticket: {data.receiptNumber}</div>
      )}

      {config.content.showCashier && (
        <div className="text-xs">Caissier: {data.cashier}</div>
      )}

      {config.content.showTable && (
        <div className="text-xs">Table: {data.table}</div>
      )}

      {config.content.showCustomer && (
        <div className="text-xs">Client: {data.customer}</div>
      )}

      <div className="border-t-2 border-dashed border-black my-3"></div>

      {/* ITEMS */}
      {data.items.map((item, index) => (
        <div key={index} className="mb-1">
          <div className="flex justify-between text-xs">
            {config.content.columns.showQuantity && (
              <span className="w-8">{item.quantity}x</span>
            )}
            {config.content.columns.showProductName && (
              <span className="flex-1">{item.name}</span>
            )}
            {config.content.columns.showUnitPrice && (
              <span className="w-16 text-right">{item.unitPrice.toFixed(2)}DT</span>
            )}
            {config.content.columns.showTotal && (
              <span className="w-16 text-right font-semibold">{item.total.toFixed(2)}DT</span>
            )}
          </div>
        </div>
      ))}

      <div className="border-t-2 border-dashed border-black my-3"></div>

      {/* FOOTER TOTALS */}
      {config.footer.showSubtotal && (
        <div className="flex justify-between text-xs">
          <span>Sous-total:</span>
          <span>{data.subtotal.toFixed(2)}DT</span>
        </div>
      )}

      {config.footer.showTax && (
        <div className="flex justify-between text-xs">
          <span>TVA:</span>
          <span>{data.tax.toFixed(2)}DT</span>
        </div>
      )}

      {config.footer.showDiscount && data.discount > 0 && (
        <div className="flex justify-between text-xs">
          <span>Réduction:</span>
          <span>-{data.discount.toFixed(2)}DT</span>
        </div>
      )}

      {config.footer.showTotal && (
        <div className="flex justify-between text-sm font-bold mt-2">
          <span>TOTAL:</span>
          <span>{data.total.toFixed(2)}DT</span>
        </div>
      )}

      {config.footer.showPaymentMethod && (
        <div className="flex justify-between text-xs mt-2">
          <span>Paiement:</span>
          <span>{data.paymentMethod}</span>
        </div>
      )}

      {config.footer.showChange && data.change > 0 && (
        <>
          <div className="flex justify-between text-xs">
            <span>Reçu:</span>
            <span>{data.amountPaid.toFixed(2)}DT</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Rendu:</span>
            <span>{data.change.toFixed(2)}DT</span>
          </div>
        </>
      )}

      <div className="border-t-2 border-dashed border-black my-3"></div>

      {/* CUSTOM MESSAGES */}
      {config.footer.customMessages.filter(m => m.enabled && m.text).map((msg, index) => (
        <div key={index} className={`${getAlignment(msg.align)} text-xs my-1`}>
          {msg.text}
        </div>
      ))}

      {/* BARCODE */}
      {config.footer.showBarcode && (
        <div className="text-center my-2">
          {config.footer.barcodeType === 'qr' ? (
            <svg width="64" height="64" viewBox="0 0 21 21" className="inline-block">
              <rect width="21" height="21" fill="white"/>
              <rect x="1" y="1" width="7" height="7" fill="black"/>
              <rect x="10" y="1" width="3" height="7" fill="black"/>
              <rect x="15" y="1" width="5" height="3" fill="black"/>
              <rect x="15" y="6" width="5" height="2" fill="black"/>
              <rect x="1" y="10" width="3" height="3" fill="black"/>
              <rect x="6" y="10" width="4" height="2" fill="black"/>
              <rect x="12" y="10" width="3" height="4" fill="black"/>
              <rect x="17" y="10" width="3" height="2" fill="black"/>
              <rect x="1" y="15" width="5" height="5" fill="black"/>
              <rect x="8" y="14" width="2" height="2" fill="black"/>
              <rect x="12" y="16" width="3" height="2" fill="black"/>
              <rect x="17" y="14" width="3" height="5" fill="black"/>
              <rect x="8" y="18" width="2" height="2" fill="black"/>
              <rect x="3" y="3" width="3" height="3" fill="white"/>
              <rect x="16" y="2" width="3" height="2" fill="white"/>
              <rect x="2" y="16" width="2" height="3" fill="white"/>
              <rect x="18" y="15" width="1" height="3" fill="white"/>
            </svg>
          ) : (
            <div className="inline-block w-32 h-8 relative bg-white border">
              <div className="absolute inset-0" style={{
                background: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, transparent 2px, transparent 6px)'
              }}></div>
            </div>
          )}
          <div className="text-xs mt-1">{data.receiptNumber}</div>
        </div>
      )}

      {/* RETURN POLICY */}
      {config.footer.showReturnPolicy && config.footer.returnPolicyText && (
        <div className="text-center text-xs mt-2 italic">
          {config.footer.returnPolicyText}
        </div>
      )}
    </div>
  );
};

export default ReceiptDesigner;
