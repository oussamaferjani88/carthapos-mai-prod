import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import {
  Printer, Save, Eye, Upload, AlignLeft, AlignCenter, AlignRight,
  Type, Image as ImageIcon, Plus, Trash2, MoveUp, MoveDown,
  Receipt, Copy, RotateCcw, FileDown, Layers, Palette, QrCode
} from 'lucide-react';

const TEMPLATES = {
  restaurant: {
    name: 'Restaurant',
    paperWidth: 80,
    header: {
      showLogo: true, logoUrl: '', logoWidth: 180, logoAlign: 'center',
      showBusinessName: true, businessName: '', businessNameSize: 'xlarge',
      showAddress: true, address: '', showPhone: true, phone: '',
      showEmail: false, email: '', showWebsite: false, website: '',
      showTaxId: true, taxId: ''
    },
    content: {
      showDate: true, dateFormat: 'DD/MM/YYYY HH:mm',
      showReceiptNumber: true, showCashier: true, showTable: true, showCustomer: false,
      columns: { showQuantity: true, showProductName: true, showUnitPrice: true, showTotal: true },
      fontFamily: 'monospace', fontSize: 'normal', lineSpacing: 'normal'
    },
    footer: {
      showSubtotal: true, showTax: true, showDiscount: true, showTotal: true,
      showPaymentMethod: true, showChange: true,
      customMessages: [
        { enabled: true, text: 'Merci pour votre visite !', align: 'center' },
        { enabled: true, text: 'À bientôt !', align: 'center' }
      ],
      showBarcode: false, barcodeType: 'qr',
      showWebsite: false, showSocialMedia: false, facebook: '', instagram: '',
      showReturnPolicy: false, returnPolicyText: ''
    },
    advanced: { printCopies: 1, autoPrint: false, cutPaper: true, openDrawer: true, printDensity: 'normal', charset: 'utf8' },
    layout: { sections: ['header', 'transaction', 'items', 'totals', 'footer'], marginTop: 2, marginBottom: 2, marginLeft: 1, marginRight: 1, separatorStyle: 'dashed' }
  },
  coffeeshop: {
    name: 'Coffee Shop',
    paperWidth: 58,
    header: {
      showLogo: true, logoUrl: '', logoWidth: 120, logoAlign: 'center',
      showBusinessName: true, businessName: '', businessNameSize: 'large',
      showAddress: false, address: '', showPhone: true, phone: '',
      showEmail: false, email: '', showWebsite: true, website: '',
      showTaxId: false, taxId: ''
    },
    content: {
      showDate: true, dateFormat: 'DD/MM/YYYY HH:mm',
      showReceiptNumber: true, showCashier: true, showTable: false, showCustomer: false,
      columns: { showQuantity: true, showProductName: true, showUnitPrice: false, showTotal: true },
      fontFamily: 'monospace', fontSize: 'small', lineSpacing: 'compact'
    },
    footer: {
      showSubtotal: false, showTax: false, showDiscount: false, showTotal: true,
      showPaymentMethod: true, showChange: true,
      customMessages: [
        { enabled: true, text: 'Coffee & more, enjoy!', align: 'center' }
      ],
      showBarcode: false, barcodeType: 'qr',
      showWebsite: true, showSocialMedia: true, facebook: '', instagram: '',
      showReturnPolicy: false, returnPolicyText: ''
    },
    advanced: { printCopies: 1, autoPrint: false, cutPaper: true, openDrawer: false, printDensity: 'normal', charset: 'utf8' },
    layout: { sections: ['header', 'transaction', 'items', 'totals', 'footer'], marginTop: 1, marginBottom: 1, marginLeft: 1, marginRight: 1, separatorStyle: 'dashed' }
  },
  bakery: {
    name: 'Boulangerie',
    paperWidth: 80,
    header: {
      showLogo: true, logoUrl: '', logoWidth: 150, logoAlign: 'center',
      showBusinessName: true, businessName: '', businessNameSize: 'large',
      showAddress: true, address: '', showPhone: true, phone: '',
      showEmail: false, email: '', showWebsite: false, website: '',
      showTaxId: true, taxId: ''
    },
    content: {
      showDate: true, dateFormat: 'DD/MM/YYYY HH:mm',
      showReceiptNumber: true, showCashier: true, showTable: false, showCustomer: false,
      columns: { showQuantity: true, showProductName: true, showUnitPrice: true, showTotal: true },
      fontFamily: 'monospace', fontSize: 'normal', lineSpacing: 'normal'
    },
    footer: {
      showSubtotal: true, showTax: true, showDiscount: true, showTotal: true,
      showPaymentMethod: true, showChange: true,
      customMessages: [
        { enabled: true, text: 'Merci et à bientôt !', align: 'center' },
        { enabled: true, text: 'Pain frais chaque matin !', align: 'center' }
      ],
      showBarcode: false, barcodeType: 'qr',
      showWebsite: false, showSocialMedia: false, facebook: '', instagram: '',
      showReturnPolicy: false, returnPolicyText: ''
    },
    advanced: { printCopies: 1, autoPrint: false, cutPaper: true, openDrawer: true, printDensity: 'normal', charset: 'utf8' },
    layout: { sections: ['header', 'transaction', 'items', 'totals', 'footer'], marginTop: 2, marginBottom: 2, marginLeft: 1, marginRight: 1, separatorStyle: 'dashed' }
  },
  retail: {
    name: 'Commerce général',
    paperWidth: 80,
    header: {
      showLogo: true, logoUrl: '', logoWidth: 150, logoAlign: 'center',
      showBusinessName: true, businessName: '', businessNameSize: 'large',
      showAddress: true, address: '', showPhone: true, phone: '',
      showEmail: true, email: '', showWebsite: true, website: '',
      showTaxId: true, taxId: ''
    },
    content: {
      showDate: true, dateFormat: 'DD/MM/YYYY HH:mm',
      showReceiptNumber: true, showCashier: true, showTable: false, showCustomer: false,
      columns: { showQuantity: true, showProductName: true, showUnitPrice: true, showTotal: true },
      fontFamily: 'monospace', fontSize: 'normal', lineSpacing: 'normal'
    },
    footer: {
      showSubtotal: true, showTax: true, showDiscount: true, showTotal: true,
      showPaymentMethod: true, showChange: true,
      customMessages: [
        { enabled: true, text: 'Merci pour votre achat !', align: 'center' }
      ],
      showBarcode: true, barcodeType: 'barcode',
      showWebsite: true, showSocialMedia: true, facebook: '', instagram: '',
      showReturnPolicy: true, returnPolicyText: 'Retour possible sous 30 jours avec ticket'
    },
    advanced: { printCopies: 1, autoPrint: false, cutPaper: true, openDrawer: true, printDensity: 'normal', charset: 'utf8' },
    layout: { sections: ['header', 'transaction', 'items', 'totals', 'footer'], marginTop: 2, marginBottom: 2, marginLeft: 1, marginRight: 1, separatorStyle: 'dashed' }
  },
  pharmacy: {
    name: 'Pharmacie',
    paperWidth: 80,
    header: {
      showLogo: true, logoUrl: '', logoWidth: 150, logoAlign: 'center',
      showBusinessName: true, businessName: '', businessNameSize: 'large',
      showAddress: true, address: '', showPhone: true, phone: '',
      showEmail: false, email: '', showWebsite: false, website: '',
      showTaxId: true, taxId: ''
    },
    content: {
      showDate: true, dateFormat: 'DD/MM/YYYY HH:mm',
      showReceiptNumber: true, showCashier: true, showTable: false, showCustomer: true,
      columns: { showQuantity: true, showProductName: true, showUnitPrice: true, showTotal: true },
      fontFamily: 'monospace', fontSize: 'normal', lineSpacing: 'normal'
    },
    footer: {
      showSubtotal: true, showTax: true, showDiscount: false, showTotal: true,
      showPaymentMethod: true, showChange: true,
      customMessages: [
        { enabled: true, text: 'Conservez ce ticket avec la Notice', align: 'center' },
        { enabled: true, text: 'Pharmacie de garde : 71 000 000', align: 'center' }
      ],
      showBarcode: false, barcodeType: 'qr',
      showWebsite: false, showSocialMedia: false, facebook: '', instagram: '',
      showReturnPolicy: true, returnPolicyText: 'Produits non retournables'
    },
    advanced: { printCopies: 1, autoPrint: false, cutPaper: true, openDrawer: false, printDensity: 'normal', charset: 'utf8' },
    layout: { sections: ['header', 'transaction', 'items', 'totals', 'footer'], marginTop: 2, marginBottom: 2, marginLeft: 1, marginRight: 1, separatorStyle: 'dashed' }
  },
  fastfood: {
    name: 'Fast Food',
    paperWidth: 58,
    header: {
      showLogo: true, logoUrl: '', logoWidth: 100, logoAlign: 'center',
      showBusinessName: true, businessName: '', businessNameSize: 'xlarge',
      showAddress: false, address: '', showPhone: false, phone: '',
      showEmail: false, email: '', showWebsite: false, website: '',
      showTaxId: false, taxId: ''
    },
    content: {
      showDate: true, dateFormat: 'HH:mm',
      showReceiptNumber: true, showCashier: false, showTable: true, showCustomer: false,
      columns: { showQuantity: true, showProductName: true, showUnitPrice: false, showTotal: true },
      fontFamily: 'monospace', fontSize: 'normal', lineSpacing: 'compact'
    },
    footer: {
      showSubtotal: false, showTax: false, showDiscount: false, showTotal: true,
      showPaymentMethod: true, showChange: true,
      customMessages: [
        { enabled: true, text: 'Commande prête rapidement !', align: 'center' }
      ],
      showBarcode: false, barcodeType: 'qr',
      showWebsite: false, showSocialMedia: false, facebook: '', instagram: '',
      showReturnPolicy: false, returnPolicyText: ''
    },
    advanced: { printCopies: 1, autoPrint: true, cutPaper: true, openDrawer: true, printDensity: 'normal', charset: 'utf8' },
    layout: { sections: ['header', 'transaction', 'items', 'totals', 'footer'], marginTop: 1, marginBottom: 1, marginLeft: 1, marginRight: 1, separatorStyle: 'dashed' }
  },
  minimarket: {
    name: 'Mini Market',
    paperWidth: 80,
    header: {
      showLogo: true, logoUrl: '', logoWidth: 150, logoAlign: 'center',
      showBusinessName: true, businessName: '', businessNameSize: 'large',
      showAddress: true, address: '', showPhone: true, phone: '',
      showEmail: false, email: '', showWebsite: false, website: '',
      showTaxId: true, taxId: ''
    },
    content: {
      showDate: true, dateFormat: 'DD/MM/YYYY HH:mm',
      showReceiptNumber: true, showCashier: true, showTable: false, showCustomer: false,
      columns: { showQuantity: true, showProductName: true, showUnitPrice: true, showTotal: true },
      fontFamily: 'monospace', fontSize: 'small', lineSpacing: 'compact'
    },
    footer: {
      showSubtotal: true, showTax: true, showDiscount: true, showTotal: true,
      showPaymentMethod: true, showChange: true,
      customMessages: [
        { enabled: true, text: 'Merci et à bientôt !', align: 'center' }
      ],
      showBarcode: true, barcodeType: 'barcode',
      showWebsite: false, showSocialMedia: false, facebook: '', instagram: '',
      showReturnPolicy: true, returnPolicyText: 'Retour sous 14 jours avec ticket'
    },
    advanced: { printCopies: 1, autoPrint: false, cutPaper: true, openDrawer: true, printDensity: 'normal', charset: 'utf8' },
    layout: { sections: ['header', 'transaction', 'items', 'totals', 'footer'], marginTop: 2, marginBottom: 2, marginLeft: 1, marginRight: 1, separatorStyle: 'dashed' }
  },
  clothing: {
    name: 'Vêtement',
    paperWidth: 80,
    header: {
      showLogo: true, logoUrl: '', logoWidth: 160, logoAlign: 'center',
      showBusinessName: true, businessName: '', businessNameSize: 'xlarge',
      showAddress: true, address: '', showPhone: true, phone: '',
      showEmail: true, email: '', showWebsite: true, website: '',
      showTaxId: true, taxId: ''
    },
    content: {
      showDate: true, dateFormat: 'DD/MM/YYYY HH:mm',
      showReceiptNumber: true, showCashier: true, showTable: false, showCustomer: true,
      columns: { showQuantity: true, showProductName: true, showUnitPrice: true, showTotal: true },
      fontFamily: 'monospace', fontSize: 'normal', lineSpacing: 'normal'
    },
    footer: {
      showSubtotal: true, showTax: true, showDiscount: true, showTotal: true,
      showPaymentMethod: true, showChange: true,
      customMessages: [
        { enabled: true, text: 'Merci pour votre confiance !', align: 'center' },
        { enabled: true, text: 'Conservez votre ticket pour échange', align: 'center' }
      ],
      showBarcode: true, barcodeType: 'barcode',
      showWebsite: true, showSocialMedia: true, facebook: '', instagram: '',
      showReturnPolicy: true, returnPolicyText: 'Échange sous 30 jours avec ticket et étiquette'
    },
    advanced: { printCopies: 1, autoPrint: false, cutPaper: true, openDrawer: true, printDensity: 'normal', charset: 'utf8' },
    layout: { sections: ['header', 'transaction', 'items', 'totals', 'footer'], marginTop: 2, marginBottom: 2, marginLeft: 1, marginRight: 1, separatorStyle: 'dashed' }
  }
};

function makeDefaultConfig() {
  return JSON.parse(JSON.stringify(TEMPLATES.restaurant));
}

const SAMPLE_DATA = {
  receiptNumber: 'R-2025-001234',
  date: new Date().toLocaleString('fr-FR'),
  cashier: 'Admin',
  table: 'Table 5',
  customer: 'Client',
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
  currency: 'DT'
};

const SECTION_LABELS = {
  header: 'En-tête', transaction: 'Transaction', items: 'Articles',
  totals: 'Totaux', footer: 'Pied de page'
};

export default function ReceiptDesigner() {
  const { toast } = useToast();
  const [config, setConfig] = useState(makeDefaultConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const autoSaveTimer = useRef(null);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      if (window.electronAPI?.getReceiptConfig) {
        const raw = await window.electronAPI.getReceiptConfig();
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed && parsed.header) setConfig(parsed);
        }
      }
      if (window.electronAPI) {
        const appConfig = await window.electronAPI.getAppConfig();
        if (appConfig?.theme?.businessName) {
          setConfig(prev => ({
            ...prev,
            header: { ...prev.header, businessName: prev.header.businessName || appConfig.theme.businessName }
          }));
        }
      }
    } catch (e) { console.error('Error loading receipt config:', e); }
    finally { setLoading(false); }
  };

  const persistConfig = useCallback(async (cfg) => {
    setSaving(true);
    try {
      if (window.electronAPI?.saveReceiptConfig) {
        await window.electronAPI.saveReceiptConfig(JSON.stringify(cfg));
      }
    } catch (e) { console.error('Auto-save error:', e); }
    finally { setSaving(false); }
  }, []);

  const updateConfig = useCallback((section, field, value) => {
    setConfig(prev => {
      const next = { ...prev, [section]: { ...prev[section], [field]: value } };
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => persistConfig(next), 800);
      return next;
    });
  }, [persistConfig]);

  const updateNested = useCallback((section, nestedKey, field, value) => {
    setConfig(prev => {
      const next = {
        ...prev,
        [section]: {
          ...prev[section],
          [nestedKey]: { ...prev[section][nestedKey], [field]: value }
        }
      };
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => persistConfig(next), 800);
      return next;
    });
  }, [persistConfig]);

  const updateLayout = useCallback((field, value) => {
    setConfig(prev => {
      const next = { ...prev, layout: { ...prev.layout, [field]: value } };
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => persistConfig(next), 800);
      return next;
    });
  }, [persistConfig]);

  const moveSection = useCallback((index, direction) => {
    setConfig(prev => {
      const sections = [...prev.layout.sections];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= sections.length) return prev;
      [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
      const next = { ...prev, layout: { ...prev.layout, sections } };
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => persistConfig(next), 800);
      return next;
    });
  }, [persistConfig]);

  const addCustomMessage = () => {
    updateConfig('footer', 'customMessages', [
      ...config.footer.customMessages,
      { enabled: true, text: '', align: 'center' }
    ]);
  };

  const removeCustomMessage = (index) => {
    updateConfig('footer', 'customMessages', config.footer.customMessages.filter((_, i) => i !== index));
  };

  const updateCustomMessage = (index, field, value) => {
    updateConfig('footer', 'customMessages', config.footer.customMessages.map((msg, i) => i === index ? { ...msg, [field]: value } : msg));
  };

  const applyTemplate = (templateKey) => {
    const t = JSON.parse(JSON.stringify(TEMPLATES[templateKey]));
    if (config.header.businessName) t.header.businessName = config.header.businessName;
    if (config.header.logoUrl) t.header.logoUrl = config.header.logoUrl;
    setConfig(t);
    persistConfig(t);
    setShowTemplateDialog(false);
    toast({ title: 'Template appliqué', description: `Modèle "${TEMPLATES[templateKey].name}" chargé.` });
  };

  const resetConfig = () => {
    const def = makeDefaultConfig();
    setConfig(def);
    persistConfig(def);
    setShowResetDialog(false);
    toast({ title: 'Configuration réinitialisée' });
  };

  const handleManualSave = async () => {
    await persistConfig(config);
    toast({ title: 'Configuration sauvegardée' });
  };

  const testPrint = async () => {
    try {
      if (window.thermalPrinter) {
        await window.thermalPrinter.initialize({});
        const result = await window.thermalPrinter.testPrint();
        toast({ title: result.success ? 'Impression réussie' : 'Échec', description: result.message || '' });
      } else {
        toast({ title: 'Mode simulation', description: 'Imprimante non disponible' });
      }
    } catch (e) {
      toast({ title: 'Erreur d\'impression', description: e.message, variant: 'destructive' });
    }
  };

  const uploadLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateConfig('header', 'logoUrl', ev.target.result);
    reader.readAsDataURL(file);
  };

  const c = config;

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-8 w-8" /> Conception du Ticket
          </h1>
          <p className="text-muted-foreground mt-1">Personnalisez le design de vos tickets de caisse</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowTemplateDialog(true)}>
            <Layers className="h-4 w-4 mr-1" /> Templates
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="h-4 w-4 mr-1" /> Réinitialiser
          </Button>
          <Button variant="outline" size="sm" onClick={testPrint}>
            <Printer className="h-4 w-4 mr-1" /> Test
          </Button>
          <Button size="sm" onClick={handleManualSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Configuration du Ticket</CardTitle>
              <CardDescription>Configurez les éléments à afficher sur le ticket</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="header" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="header">En-tête</TabsTrigger>
                  <TabsTrigger value="content">Contenu</TabsTrigger>
                  <TabsTrigger value="footer">Pied de page</TabsTrigger>
                  <TabsTrigger value="layout">Mise en page</TabsTrigger>
                  <TabsTrigger value="advanced">Avancé</TabsTrigger>
                </TabsList>

                <TabsContent value="header" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Largeur du papier</Label>
                    <Select value={c.paperWidth.toString()} onValueChange={(v) => { setConfig(prev => ({ ...prev, paperWidth: parseInt(v) })); persistConfig({ ...c, paperWidth: parseInt(v) }); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="58">58mm (Petit)</SelectItem>
                        <SelectItem value="80">80mm (Standard)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5"><Label>Afficher le logo</Label></div>
                    <Switch checked={c.header.showLogo} onCheckedChange={(v) => updateConfig('header', 'showLogo', v)} />
                  </div>
                  {c.header.showLogo && (
                    <div className="space-y-2 pl-4">
                      <div className="flex gap-2">
                        <Input type="file" accept="image/*" onChange={uploadLogo} className="flex-1" />
                        {c.header.logoUrl && <img src={c.header.logoUrl} alt="Logo" className="h-10 w-10 object-contain border rounded" />}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><Label>Largeur (px)</Label><Input type="number" value={c.header.logoWidth} onChange={(e) => updateConfig('header', 'logoWidth', parseInt(e.target.value) || 100)} /></div>
                        <div className="space-y-1">
                          <Label>Alignement</Label>
                          <Select value={c.header.logoAlign} onValueChange={(v) => updateConfig('header', 'logoAlign', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <div className="flex items-center justify-between">
                    <Label>Nom de l'établissement</Label>
                    <Switch checked={c.header.showBusinessName} onCheckedChange={(v) => updateConfig('header', 'showBusinessName', v)} />
                  </div>
                  {c.header.showBusinessName && (
                    <div className="space-y-2 pl-4">
                      <Input placeholder="Nom" value={c.header.businessName} onChange={(e) => updateConfig('header', 'businessName', e.target.value)} />
                      <Select value={c.header.businessNameSize} onValueChange={(v) => updateConfig('header', 'businessNameSize', v)}>
                        <SelectTrigger><SelectValue placeholder="Taille" /></SelectTrigger>
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
                  {[
                    { key: 'showAddress', label: 'Adresse', field: 'address', type: 'textarea', ph: 'Adresse complète' },
                    { key: 'showPhone', label: 'Téléphone', field: 'phone', type: 'input', ph: '+216 71 000 000' },
                    { key: 'showEmail', label: 'Email', field: 'email', type: 'input', ph: 'contact@business.com', inputType: 'email' },
                    { key: 'showWebsite', label: 'Site web', field: 'website', type: 'input', ph: 'https://example.com' },
                    { key: 'showTaxId', label: 'N° TVA / SIRET', field: 'taxId', type: 'input', ph: 'FR 12 345 678 901' }
                  ].map(item => (
                    <div key={item.key}>
                      <div className="flex items-center justify-between">
                        <Label>{item.label}</Label>
                        <Switch checked={c.header[item.key]} onCheckedChange={(v) => updateConfig('header', item.key, v)} />
                      </div>
                      {c.header[item.key] && (
                        item.type === 'textarea'
                          ? <Textarea placeholder={item.ph} value={c.header[item.field]} onChange={(e) => updateConfig('header', item.field, e.target.value)} className="pl-4 mt-1" rows={2} />
                          : <Input type={item.inputType || 'text'} placeholder={item.ph} value={c.header[item.field]} onChange={(e) => updateConfig('header', item.field, e.target.value)} className="pl-4 mt-1" />
                      )}
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="content" className="space-y-4">
                  <h3 className="font-semibold">Informations de transaction</h3>
                  {[
                    { key: 'showDate', label: 'Date et heure' },
                    { key: 'showReceiptNumber', label: 'Numéro de ticket' },
                    { key: 'showCashier', label: 'Nom du caissier' },
                    { key: 'showTable', label: 'Numéro de table' },
                    { key: 'showCustomer', label: 'Nom du client' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <Label>{item.label}</Label>
                      <Switch checked={c.content[item.key]} onCheckedChange={(v) => updateConfig('content', item.key, v)} />
                    </div>
                  ))}
                  <Separator />
                  <h3 className="font-semibold">Colonnes des produits</h3>
                  {[
                    { key: 'showQuantity', label: 'Quantité' },
                    { key: 'showProductName', label: 'Nom du produit' },
                    { key: 'showUnitPrice', label: 'Prix unitaire' },
                    { key: 'showTotal', label: 'Total ligne' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <Label>{item.label}</Label>
                      <Switch checked={c.content.columns[item.key]} onCheckedChange={(v) => updateNested('content', 'columns', item.key, v)} />
                    </div>
                  ))}
                  <Separator />
                  <h3 className="font-semibold">Mise en forme</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label>Taille de police</Label>
                      <Select value={c.content.fontSize} onValueChange={(v) => updateConfig('content', 'fontSize', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Petit</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="large">Grand</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Espacement</Label>
                      <Select value={c.content.lineSpacing} onValueChange={(v) => updateConfig('content', 'lineSpacing', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Compact</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="relaxed">Espacé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="footer" className="space-y-4">
                  <h3 className="font-semibold">Totaux et paiement</h3>
                  {[
                    { key: 'showSubtotal', label: 'Sous-total' },
                    { key: 'showTax', label: 'TVA' },
                    { key: 'showDiscount', label: 'Réduction' },
                    { key: 'showTotal', label: 'Total' },
                    { key: 'showPaymentMethod', label: 'Méthode de paiement' },
                    { key: 'showChange', label: 'Monnaie rendue' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <Label>{item.label}</Label>
                      <Switch checked={c.footer[item.key]} onCheckedChange={(v) => updateConfig('footer', item.key, v)} />
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Messages personnalisés</h3>
                    <Button size="sm" variant="outline" onClick={addCustomMessage}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
                  </div>
                  {c.footer.customMessages.map((msg, i) => (
                    <Card key={i} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Switch checked={msg.enabled} onCheckedChange={(v) => updateCustomMessage(i, 'enabled', v)} />
                          <Button size="sm" variant="ghost" onClick={() => removeCustomMessage(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                        <Input placeholder="Texte du message" value={msg.text} onChange={(e) => updateCustomMessage(i, 'text', e.target.value)} disabled={!msg.enabled} />
                        <Select value={msg.align} onValueChange={(v) => updateCustomMessage(i, 'align', v)} disabled={!msg.enabled}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Gauche</SelectItem><SelectItem value="center">Centre</SelectItem><SelectItem value="right">Droite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5"><Label>Code-barres / QR Code</Label><p className="text-sm text-muted-foreground">Pour suivre le ticket</p></div>
                    <Switch checked={c.footer.showBarcode} onCheckedChange={(v) => updateConfig('footer', 'showBarcode', v)} />
                  </div>
                  {c.footer.showBarcode && (
                    <Select value={c.footer.barcodeType} onValueChange={(v) => updateConfig('footer', 'barcodeType', v)} className="pl-4">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="barcode">Code-barres</SelectItem><SelectItem value="qr">QR Code</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5"><Label>Réseaux sociaux</Label><p className="text-sm text-muted-foreground">Afficher les liens sociaux</p></div>
                    <Switch checked={c.footer.showSocialMedia} onCheckedChange={(v) => updateConfig('footer', 'showSocialMedia', v)} />
                  </div>
                  {c.footer.showSocialMedia && (
                    <div className="grid grid-cols-2 gap-2 pl-4">
                      <Input placeholder="Facebook" value={c.footer.facebook} onChange={(e) => updateConfig('footer', 'facebook', e.target.value)} />
                      <Input placeholder="Instagram" value={c.footer.instagram} onChange={(e) => updateConfig('footer', 'instagram', e.target.value)} />
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <Label>Politique de retour</Label>
                    <Switch checked={c.footer.showReturnPolicy} onCheckedChange={(v) => updateConfig('footer', 'showReturnPolicy', v)} />
                  </div>
                  {c.footer.showReturnPolicy && (
                    <Textarea placeholder="Politique de retour..." value={c.footer.returnPolicyText} onChange={(e) => updateConfig('footer', 'returnPolicyText', e.target.value)} className="pl-4" rows={2} />
                  )}
                </TabsContent>

                <TabsContent value="layout" className="space-y-4">
                  <h3 className="font-semibold">Ordre des sections</h3>
                  <p className="text-sm text-muted-foreground">Glissez pour réordonner les sections du ticket.</p>
                  <div className="space-y-2">
                    {c.layout.sections.map((section, i) => (
                      <div key={section} className="flex items-center gap-2 p-2 border rounded">
                        <span className="w-6 text-center text-sm text-muted-foreground">{i + 1}</span>
                        <span className="flex-1 text-sm font-medium">{SECTION_LABELS[section] || section}</span>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveSection(i, -1)} disabled={i === 0}>
                          <MoveUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveSection(i, 1)} disabled={i === c.layout.sections.length - 1}>
                          <MoveDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <h3 className="font-semibold">Espacement et marges</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label>Marge haut</Label><Input type="number" min="0" max="10" value={c.layout.marginTop} onChange={(e) => updateLayout('marginTop', parseInt(e.target.value) || 0)} /></div>
                    <div className="space-y-1"><Label>Marge bas</Label><Input type="number" min="0" max="10" value={c.layout.marginBottom} onChange={(e) => updateLayout('marginBottom', parseInt(e.target.value) || 0)} /></div>
                    <div className="space-y-1"><Label>Marge gauche</Label><Input type="number" min="0" max="5" value={c.layout.marginLeft} onChange={(e) => updateLayout('marginLeft', parseInt(e.target.value) || 0)} /></div>
                    <div className="space-y-1"><Label>Marge droite</Label><Input type="number" min="0" max="5" value={c.layout.marginRight} onChange={(e) => updateLayout('marginRight', parseInt(e.target.value) || 0)} /></div>
                  </div>
                  <div className="space-y-1"><Label>Style de séparateur</Label>
                    <Select value={c.layout.separatorStyle} onValueChange={(v) => updateLayout('separatorStyle', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dashed">-----</SelectItem><SelectItem value="solid">______</SelectItem><SelectItem value="dots">......</SelectItem><SelectItem value="none">Aucun</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <h3 className="font-semibold">Paramètres d'impression</h3>
                  <div className="space-y-2"><Label>Nombre de copies</Label><Input type="number" min="1" max="5" value={c.advanced.printCopies} onChange={(e) => updateConfig('advanced', 'printCopies', parseInt(e.target.value) || 1)} /></div>
                  {[
                    { key: 'autoPrint', label: 'Impression automatique', desc: 'Imprimer après chaque vente' },
                    { key: 'cutPaper', label: 'Couper le papier', desc: 'Coupe automatique' },
                    { key: 'openDrawer', label: 'Ouvrir le tiroir-caisse', desc: 'Après impression' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div className="space-y-0.5"><Label>{item.label}</Label><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                      <Switch checked={c.advanced[item.key]} onCheckedChange={(v) => updateConfig('advanced', item.key, v)} />
                    </div>
                  ))}
                  <div className="space-y-1"><Label>Densité d'impression</Label>
                    <Select value={c.advanced.printDensity} onValueChange={(v) => updateConfig('advanced', 'printDensity', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Léger</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="dark">Foncé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                Aperçu en temps réel
                {saving && <span className="text-xs text-muted-foreground animate-pulse">Sauvegarde...</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReceiptPreview config={c} data={SAMPLE_DATA} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Choisir un template</DialogTitle><DialogDescription>Les paramètres seront remplacés. Le nom et logo actuels seront conservés.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {Object.entries(TEMPLATES).map(([key, tmpl]) => (
              <Button key={key} variant="outline" className="h-16 text-left justify-start" onClick={() => applyTemplate(key)}>
                <div><div className="font-medium">{tmpl.name}</div><div className="text-xs text-muted-foreground">{tmpl.paperWidth}mm</div></div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Réinitialiser la configuration</DialogTitle><DialogDescription>Retour aux paramètres par défaut du template Restaurant.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={resetConfig}>Réinitialiser</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getSeparatorChar(style) {
  switch (style) {
    case 'solid': return '_';
    case 'dots': return '.';
    case 'none': return '';
    default: return '-';
  }
}

function ReceiptPreview({ config, data }) {
  const c = config;
  const sep = getSeparatorChar(c.layout.separatorStyle || 'dashed');
  const paperPx = c.paperWidth === 58 ? 220 : 302;
  const charCount = c.paperWidth === 58 ? 32 : 48;
  const sepLine = sep.repeat(charCount);

  const alignStyle = (a) => ({ textAlign: a || 'center' });
  const fontSizePx = (s) => {
    switch (s) {
      case 'small': return 10;
      case 'large': return 14;
      case 'xlarge': return 16;
      default: return 11;
    }
  };
  const baseFontSize = fontSizePx(c.content.fontSize || 'small');
  const lineSpacing = c.content.lineSpacing === 'compact' ? '1.3' : c.content.lineSpacing === 'relaxed' ? '1.8' : '1.5';

  const sections = (c.layout.sections || ['header', 'transaction', 'items', 'totals', 'footer']);
  const marginTop = (c.layout.marginTop || 2) * 3;
  const marginBottom = (c.layout.marginBottom || 2) * 3;
  const marginLeft = (c.layout.marginLeft || 2) * 3;
  const marginRight = (c.layout.marginRight || 2) * 3;

  const receiptStyle = {
    width: paperPx + 'px',
    margin: '0 auto',
    padding: `${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px`,
    fontSize: baseFontSize + 'px',
    lineHeight: lineSpacing,
    fontFamily: "'Courier New', 'Consolas', 'Monaco', monospace",
    color: '#000',
    background: '#fff',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
  };

  const SepLine = () => sep ? (
    <div style={{ textAlign: 'center', margin: '6px 0', fontSize: baseFontSize + 'px', letterSpacing: '0.5px' }}>{sepLine}</div>
  ) : null;

  const SectionDivider = () => (
    <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
  );

  return (
    <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ ...receiptStyle, border: '1px solid #d1d5db', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', position: 'relative' }}>
        {sections.map((section) => {
          if (section === 'header') return (
            <div key="header">
              {c.header.showLogo && c.header.logoUrl && (
                <div style={{ textAlign: c.header.logoAlign || 'center', marginBottom: '6px' }}>
                  <img
                    src={c.header.logoUrl}
                    alt="Logo"
                    style={{
                      width: Math.min(c.header.logoWidth || 120, paperPx - marginLeft - marginRight - 10) + 'px',
                      maxWidth: '100%',
                      display: 'block',
                      margin: c.header.logoAlign === 'center' ? '0 auto' : c.header.logoAlign === 'right' ? '0 0 0 auto' : '0',
                    }}
                  />
                </div>
              )}
              {c.header.showBusinessName && (
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: fontSizePx(c.header.businessNameSize || 'large') + 'px', marginBottom: '2px' }}>
                  {c.header.businessName || 'NOM ENTREPRISE'}
                </div>
              )}
              {c.header.showAddress && c.header.address && <div style={{ textAlign: 'center', fontSize: '10px', color: '#333' }}>{c.header.address}</div>}
              {c.header.showPhone && c.header.phone && <div style={{ textAlign: 'center', fontSize: '10px', color: '#333' }}>Tel: {c.header.phone}</div>}
              {c.header.showEmail && c.header.email && <div style={{ textAlign: 'center', fontSize: '10px', color: '#333' }}>{c.header.email}</div>}
              {c.header.showWebsite && c.header.website && <div style={{ textAlign: 'center', fontSize: '10px', color: '#333' }}>{c.header.website}</div>}
              {c.header.showTaxId && c.header.taxId && <div style={{ textAlign: 'center', fontSize: '10px', color: '#333' }}>MF: {c.header.taxId}</div>}
              <SepLine />
            </div>
          );

          if (section === 'transaction') return (
            <div key="transaction">
              {c.content.showDate && <div>{data.date}</div>}
              {c.content.showReceiptNumber && <div>N: {data.receiptNumber}</div>}
              {c.content.showCashier && <div>Caissier: {data.cashier}</div>}
              {c.content.showTable && data.table && <div>Table: {data.table}</div>}
              {c.content.showCustomer && data.customer && <div>Client: {data.customer}</div>}
              <SepLine />
            </div>
          );

          if (section === 'items') return (
            <div key="items">
              {data.items.map((item, i) => {
                const showQty = c.content.columns.showQuantity;
                const showName = c.content.columns.showProductName;
                const showPrice = c.content.columns.showUnitPrice;
                const showTotal = c.content.columns.showTotal;
                const qtyWidth = '24px';
                const priceWidth = c.paperWidth === 58 ? '52px' : '68px';
                const nameWidth = `calc(100% - ${showQty ? qtyWidth : '0px'} - ${(showPrice ? priceWidth : '0px') + (showTotal ? priceWidth : '0px')})`;
                return (
                  <div key={i} style={{ marginBottom: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2px' }}>
                      {showQty && <span style={{ width: qtyWidth, flexShrink: 0 }}>{item.quantity}x</span>}
                      {showName && <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>}
                      {showPrice && <span style={{ width: priceWidth, textAlign: 'right', flexShrink: 0 }}>{item.unitPrice.toFixed(2)}</span>}
                      {showTotal && <span style={{ width: priceWidth, textAlign: 'right', flexShrink: 0, fontWeight: 'bold' }}>{item.total.toFixed(2)}</span>}
                    </div>
                  </div>
                );
              })}
              <SepLine />
            </div>
          );

          if (section === 'totals') return (
            <div key="totals">
              {c.footer.showSubtotal && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sous-total:</span>
                  <span>{data.subtotal.toFixed(2)}{data.currency}</span>
                </div>
              )}
              {c.footer.showTax && data.tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>TVA:</span>
                  <span>{data.tax.toFixed(2)}{data.currency}</span>
                </div>
              )}
              {c.footer.showDiscount && data.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Remise:</span>
                  <span>-{data.discount.toFixed(2)}{data.currency}</span>
                </div>
              )}
              {c.footer.showTotal && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: (baseFontSize + 2) + 'px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #000' }}>
                  <span>TOTAL:</span>
                  <span>{data.total.toFixed(2)}{data.currency}</span>
                </div>
              )}
              {c.footer.showPaymentMethod && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span>Paiement:</span>
                  <span>{data.paymentMethod}</span>
                </div>
              )}
              {c.footer.showChange && data.change > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Recu:</span>
                    <span>{data.amountPaid.toFixed(2)}{data.currency}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Monnaie:</span>
                    <span>{data.change.toFixed(2)}{data.currency}</span>
                  </div>
                </>
              )}
              <SepLine />
            </div>
          );

          if (section === 'footer') return (
            <div key="footer">
              {c.footer.customMessages && c.footer.customMessages.filter(m => m.enabled && m.text).map((msg, i) => (
                <div key={i} style={{ textAlign: msg.align || 'center', margin: '3px 0' }}>{msg.text}</div>
              ))}
              {c.footer.showSocialMedia && (c.footer.facebook || c.footer.instagram) && (
                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  {c.footer.facebook && <div style={{ fontSize: '10px' }}>FB: {c.footer.facebook}</div>}
                  {c.footer.instagram && <div style={{ fontSize: '10px' }}>IG: {c.footer.instagram}</div>}
                </div>
              )}
              {c.footer.showBarcode && (
                <div style={{ textAlign: 'center', margin: '8px 0' }}>
                  {c.footer.barcodeType === 'qr' ? (
                    <div style={{ display: 'inline-block', background: '#fff', padding: '4px', border: '1px solid #ddd' }}>
                      <svg width="80" height="80" viewBox="0 0 21 21">
                        <rect width="21" height="21" fill="white" />
                        <rect x="1" y="1" width="7" height="7" fill="black" />
                        <rect x="2" y="2" width="5" height="5" fill="white" />
                        <rect x="3" y="3" width="3" height="3" fill="black" />
                        <rect x="13" y="1" width="7" height="7" fill="black" />
                        <rect x="14" y="2" width="5" height="5" fill="white" />
                        <rect x="15" y="3" width="3" height="3" fill="black" />
                        <rect x="1" y="13" width="7" height="7" fill="black" />
                        <rect x="2" y="14" width="5" height="5" fill="white" />
                        <rect x="3" y="15" width="3" height="3" fill="black" />
                        <rect x="9" y="1" width="1" height="1" fill="black" />
                        <rect x="11" y="1" width="1" height="1" fill="black" />
                        <rect x="9" y="3" width="2" height="1" fill="black" />
                        <rect x="9" y="5" width="1" height="1" fill="black" />
                        <rect x="11" y="5" width="1" height="1" fill="black" />
                        <rect x="9" y="9" width="1" height="1" fill="black" />
                        <rect x="11" y="9" width="1" height="1" fill="black" />
                        <rect x="13" y="9" width="1" height="2" fill="black" />
                        <rect x="15" y="9" width="1" height="1" fill="black" />
                        <rect x="17" y="9" width="2" height="1" fill="black" />
                        <rect x="19" y="9" width="1" height="2" fill="black" />
                        <rect x="9" y="11" width="2" height="1" fill="black" />
                        <rect x="13" y="11" width="3" height="1" fill="black" />
                        <rect x="17" y="11" width="1" height="1" fill="black" />
                        <rect x="9" y="13" width="1" height="2" fill="black" />
                        <rect x="11" y="14" width="2" height="1" fill="black" />
                        <rect x="9" y="17" width="3" height="1" fill="black" />
                        <rect x="13" y="13" width="1" height="1" fill="black" />
                        <rect x="15" y="15" width="1" height="1" fill="black" />
                        <rect x="17" y="13" width="3" height="3" fill="black" />
                        <rect x="18" y="14" width="1" height="1" fill="white" />
                        <rect x="13" y="17" width="1" height="3" fill="black" />
                        <rect x="15" y="17" width="3" height="1" fill="black" />
                        <rect x="19" y="17" width="1" height="3" fill="black" />
                      </svg>
                    </div>
                  ) : (
                    <div style={{ display: 'inline-block', background: '#fff', padding: '2px', border: '1px solid #ddd' }}>
                      <div style={{ width: '120px', height: '32px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, #000 0px, #000 1.5px, transparent 1.5px, transparent 3px, #000 3px, #000 4px, transparent 4px, transparent 7px, #000 7px, #000 8.5px, transparent 8.5px, transparent 10px)' }} />
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: '9px', marginTop: '2px', fontFamily: 'monospace' }}>{data.receiptNumber}</div>
                </div>
              )}
              {c.footer.showReturnPolicy && c.footer.returnPolicyText && (
                <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '6px', fontStyle: 'italic', color: '#555' }}>{c.footer.returnPolicyText}</div>
              )}
            </div>
          );

          return null;
        })}
      </div>
    </div>
  );
}
