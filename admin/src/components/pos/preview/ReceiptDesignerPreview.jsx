import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Printer, 
  Save, 
  Eye, 
  Upload,
  Plus,
  Trash2,
  Receipt
} from 'lucide-react';

const ReceiptDesignerPreview = () => {
  const [previewMode, setPreviewMode] = useState(false);

  // Receipt configuration state (STATIC DEMO DATA)
  const [receiptConfig, setReceiptConfig] = useState({
    paperWidth: 80,
    
    header: {
      showLogo: true,
      logoUrl: 'https://via.placeholder.com/150x50?text=LOGO',
      logoWidth: 150,
      logoAlign: 'center',
      showBusinessName: true,
      businessName: 'Restaurant Demo',
      businessNameSize: 'large',
      showAddress: true,
      address: '123 Rue de la Paix, 75001 Paris',
      showPhone: true,
      phone: '+33 1 23 45 67 89',
      showEmail: false,
      email: 'contact@demo.fr',
      showTaxId: true,
      taxId: 'FR 12 345 678 901',
    },

    content: {
      showDate: true,
      showReceiptNumber: true,
      showCashier: true,
      showTable: false,
      showCustomer: false,
      
      columns: {
        showQuantity: true,
        showProductName: true,
        showUnitPrice: true,
        showTotal: true,
      },

      fontSize: 'normal',
      lineSpacing: 'normal',
    },

    footer: {
      showSubtotal: true,
      showTax: true,
      showDiscount: true,
      showTotal: true,
      showPaymentMethod: true,
      showChange: true,
      
      customMessages: [
        { enabled: true, text: 'Merci pour votre visite!', align: 'center' },
        { enabled: true, text: 'À bientôt!', align: 'center' },
      ],
      
      showBarcode: false,
      barcodeType: 'qr',
      
      showReturnPolicy: false,
      returnPolicyText: 'Retour possible sous 7 jours avec ticket',
    },

    advanced: {
      printCopies: 1,
      autoPrint: false,
      cutPaper: true,
      openDrawer: true,
      printDensity: 'normal',
    }
  });

  // Sample receipt data for preview (STATIC)
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

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            Conception du Ticket (Démo)
          </h1>
          <p className="text-muted-foreground mt-1">
            Prévisualisation du designer de tickets - Données statiques
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Éditer' : 'Aperçu'}
          </Button>
          <Button disabled>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer (Démo)
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
                      <Label>Total</Label>
                      <Switch 
                        checked={receiptConfig.footer.showTotal}
                        onCheckedChange={(v) => updateConfig('footer', 'showTotal', v)}
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
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* ADVANCED TAB */}
                <TabsContent value="advanced" className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Paramètres d'impression</h3>

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
        <div className="text-center text-lg font-bold mt-2">
          {config.header.businessName || 'NOM ETABLISSEMENT'}
        </div>
      )}

      {config.header.showAddress && config.header.address && (
        <div className="text-center text-xs mt-1">{config.header.address}</div>
      )}

      {config.header.showPhone && config.header.phone && (
        <div className="text-center text-xs">Tél: {config.header.phone}</div>
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

      <div className="border-t-2 border-dashed border-black my-3"></div>

      {/* ITEMS */}
      {data.items.map((item, index) => (
        <div key={index} className="mb-1">
          <div className="flex justify-between text-xs">
            {config.content.columns.showQuantity && (
              <span className="w-8">{item.quantity}x</span>
            )}
            <span className="flex-1">{item.name}</span>
            {config.content.columns.showUnitPrice && (
              <span className="w-16 text-right">{item.unitPrice.toFixed(2)}€</span>
            )}
            {config.content.columns.showTotal && (
              <span className="w-16 text-right font-semibold">{item.total.toFixed(2)}€</span>
            )}
          </div>
        </div>
      ))}

      <div className="border-t-2 border-dashed border-black my-3"></div>

      {/* FOOTER TOTALS */}
      {config.footer.showSubtotal && (
        <div className="flex justify-between text-xs">
          <span>Sous-total:</span>
          <span>{data.subtotal.toFixed(2)}€</span>
        </div>
      )}

      {config.footer.showTax && (
        <div className="flex justify-between text-xs">
          <span>TVA:</span>
          <span>{data.tax.toFixed(2)}€</span>
        </div>
      )}

      {config.footer.showTotal && (
        <div className="flex justify-between text-sm font-bold mt-2">
          <span>TOTAL:</span>
          <span>{data.total.toFixed(2)}€</span>
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
            <span>{data.amountPaid.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Rendu:</span>
            <span>{data.change.toFixed(2)}€</span>
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
    </div>
  );
};

export default ReceiptDesignerPreview;
