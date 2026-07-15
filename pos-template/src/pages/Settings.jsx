import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Palette, 
  Database,
  Printer,
  Info
} from 'lucide-react';
import { useAppConfig } from '../hooks/useAppConfig';
import { useLicense } from '../hooks/useLicense';
import { useSettings } from '../hooks/useSettings';
import { POSConfiguration } from '../lib/POSConfiguration';

export default function Settings() {
  const { config } = useAppConfig();
  const { license } = useLicense();
  const { setMultipleSettings } = useSettings();
  const [dbPath, setDbPath] = useState('');

  // Integration: POSConfiguration styling
  const getThemeConfig = () => {
    if (config && config.theme) {
      return POSConfiguration.createConfig(config.theme);
    }
    if (typeof window !== 'undefined' && window.themeConfig) {
      return POSConfiguration.createConfig(window.themeConfig);
    }
    return POSConfiguration.createConfig({});
  };

  const themeConfig = getThemeConfig();
  const styles = POSConfiguration.getStyles(themeConfig);
  const cardClasses = POSConfiguration.getCardClasses(themeConfig);
  const buttonClasses = POSConfiguration.getButtonClasses(themeConfig);

  const defaultSettings = {
    businessName: '',
    businessLogo: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    businessWebsite: '',
    businessTaxId: '',
    currency: 'TND',
    taxEnabled: true,
    taxRate: 19,
    numberFormat: 'fr-FR',
    language: 'fr',
    timezone: 'Africa/Tunis',
    autoBackup: true,
    backupFolder: '',
    backupFrequency: 'daily',
    printReceipts: true,
    printKitchen: true,
    receiptPrinter: '',
    kitchenPrinter: '',
    paperWidth: '80',
    soundEnabled: true,
    theme: 'default'
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [loadedFromDb, setLoadedFromDb] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.getDatabasePath) {
      window.electronAPI.getDatabasePath().then(setDbPath).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const loadFromDb = async () => {
      if (window.electronAPI?.getAllSettings) {
        try {
          const dbSettings = await window.electronAPI.getAllSettings();
          if (dbSettings && Object.keys(dbSettings).length > 0) {
            setSettings(prev => ({
              ...prev,
              businessName: dbSettings.businessName || prev.businessName,
              businessLogo: dbSettings.businessLogo || prev.businessLogo,
              businessAddress: dbSettings.businessAddress || prev.businessAddress,
              businessPhone: dbSettings.businessPhone || prev.businessPhone,
              businessEmail: dbSettings.businessEmail || prev.businessEmail,
              businessWebsite: dbSettings.businessWebsite || prev.businessWebsite,
              businessTaxId: dbSettings.businessTaxId || prev.businessTaxId,
              currency: dbSettings.currency || prev.currency,
              taxEnabled: dbSettings.taxEnabled === 'true' || dbSettings.taxEnabled === true,
              taxRate: dbSettings.taxRate ? parseFloat(dbSettings.taxRate) : prev.taxRate,
              numberFormat: dbSettings.numberFormat || prev.numberFormat,
              language: dbSettings.language || prev.language,
              timezone: dbSettings.timezone || prev.timezone,
              autoBackup: dbSettings.autoBackup === 'true',
              backupFolder: dbSettings.backupFolder || prev.backupFolder,
              backupFrequency: dbSettings.backupFrequency || prev.backupFrequency,
              printReceipts: dbSettings.printReceipts === 'true',
              printKitchen: dbSettings.printKitchen === 'true',
              receiptPrinter: dbSettings.receiptPrinter || prev.receiptPrinter,
              kitchenPrinter: dbSettings.kitchenPrinter || prev.kitchenPrinter,
              paperWidth: dbSettings.paperWidth || prev.paperWidth,
              soundEnabled: dbSettings.soundEnabled === 'true',
              theme: dbSettings.theme || prev.theme
            }));
            setLoadedFromDb(true);
          }
        } catch (err) {
          console.warn('Could not load settings from DB, using defaults:', err);
        }
      }
    };
    loadFromDb();
  }, []);

  useEffect(() => {
    if (config && !loadedFromDb) {
      setSettings({
        ...defaultSettings,
        businessName: config.theme?.businessName || '',
        currency: config.theme?.currency || 'TND',
        taxRate: config.theme?.taxRate || 19,
        language: config.theme?.language || 'fr',
        timezone: config.theme?.timezone || 'Africa/Tunis',
      });
    }
  }, [config, loadedFromDb]);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      if (window.electronAPI?.setSetting) {
        const result = await setMultipleSettings(settings);
        if (!result.success) {
          throw new Error(result.error || 'Save failed');
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      alert('Paramètres sauvegardés avec succès');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      setSettings({ ...defaultSettings, businessName: config.theme?.businessName || '' });
    }
  };

  const currencies = [
    { value: 'TND', label: 'Dinar Tunisien (DT)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'USD', label: 'Dollar ($)' },
    { value: 'GBP', label: 'Livre (£)' },
    { value: 'CHF', label: 'Franc suisse (CHF)' }
  ];

  const languages = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'de', label: 'Deutsch' }
  ];

  const timezones = [
    { value: 'Africa/Tunis', label: 'Africa/Tunis (CET)' },
    { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
    { value: 'Europe/London', label: 'Europe/London (GMT)' },
    { value: 'America/New_York', label: 'America/New_York (EST)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Configurez votre système POS selon vos besoins
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Paramètres principaux */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="mr-2 h-5 w-5" />
                Informations générales
              </CardTitle>
              <CardDescription>
                Configuration de base de votre établissement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="businessName">Nom de l'établissement</Label>
                <Input
                  id="businessName"
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  placeholder="Nom affiché sur les tickets"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="businessLogo">Logo (URL)</Label>
                <Input
                  id="businessLogo"
                  value={settings.businessLogo}
                  onChange={(e) => setSettings({ ...settings, businessLogo: e.target.value })}
                  placeholder="URL du logo ou chemin local"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="businessAddress">Adresse</Label>
                <Input
                  id="businessAddress"
                  value={settings.businessAddress}
                  onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                  placeholder="Adresse complète"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="businessPhone">Téléphone</Label>
                  <Input
                    id="businessPhone"
                    value={settings.businessPhone}
                    onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })}
                    placeholder="01 23 45 67 89"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="businessEmail">Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={settings.businessEmail}
                    onChange={(e) => setSettings({ ...settings, businessEmail: e.target.value })}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="businessWebsite">Site web</Label>
                  <Input
                    id="businessWebsite"
                    value={settings.businessWebsite}
                    onChange={(e) => setSettings({ ...settings, businessWebsite: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="businessTaxId">N° fiscal / SIRET</Label>
                  <Input
                    id="businessTaxId"
                    value={settings.businessTaxId}
                    onChange={(e) => setSettings({ ...settings, businessTaxId: e.target.value })}
                    placeholder="12345678900000"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select 
                    value={settings.currency} 
                    onValueChange={(value) => setSettings({ ...settings, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="language">Langue</Label>
                  <Select 
                    value={settings.language} 
                    onValueChange={(value) => setSettings({ ...settings, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((language) => (
                        <SelectItem key={language.value} value={language.value}>
                          {language.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Select 
                    value={settings.timezone} 
                    onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((timezone) => (
                        <SelectItem key={timezone.value} value={timezone.value}>
                          {timezone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="numberFormat">Format des nombres</Label>
                  <Select 
                    value={settings.numberFormat} 
                    onValueChange={(value) => setSettings({ ...settings, numberFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr-FR">1 234,56 (FR)</SelectItem>
                      <SelectItem value="en-US">1,234.56 (US)</SelectItem>
                      <SelectItem value="de-DE">1.234,56 (DE)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paramètres financiers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="mr-2 h-5 w-5" />
                Paramètres financiers
              </CardTitle>
              <CardDescription>Taux de TVA et formatage monétaire</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>TVA activée</Label>
                  <p className="text-sm text-muted-foreground">Appliquer la TVA sur les ventes</p>
                </div>
                <Switch
                  checked={settings.taxEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, taxEnabled: checked })}
                />
              </div>
              {settings.taxEnabled && (
                <div className="grid gap-2">
                  <Label htmlFor="taxRate">Taux de TVA (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.1"
                    value={settings.taxRate}
                    onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paramètres d'impression */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Printer className="mr-2 h-5 w-5" />
                Paramètres d'impression
              </CardTitle>
              <CardDescription>Configuration des imprimantes et tickets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="receiptPrinter">Imprimante tickets</Label>
                  <Input
                    id="receiptPrinter"
                    value={settings.receiptPrinter}
                    onChange={(e) => setSettings({ ...settings, receiptPrinter: e.target.value })}
                    placeholder="USB001 ou IP:192.168.1.100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="kitchenPrinter">Imprimante cuisine</Label>
                  <Input
                    id="kitchenPrinter"
                    value={settings.kitchenPrinter}
                    onChange={(e) => setSettings({ ...settings, kitchenPrinter: e.target.value })}
                    placeholder="USB002 ou IP:192.168.1.101"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="paperWidth">Largeur papier (mm)</Label>
                <Select 
                  value={settings.paperWidth} 
                  onValueChange={(value) => setSettings({ ...settings, paperWidth: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58">58 mm</SelectItem>
                    <SelectItem value="80">80 mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-impression ticket</Label>
                  <p className="text-sm text-muted-foreground">Imprimer automatiquement après chaque vente</p>
                </div>
                <Switch
                  checked={settings.printReceipts}
                  onCheckedChange={(checked) => setSettings({ ...settings, printReceipts: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-impression cuisine</Label>
                  <p className="text-sm text-muted-foreground">Imprimer automatiquement les commandes en cuisine</p>
                </div>
                <Switch
                  checked={settings.printKitchen}
                  onCheckedChange={(checked) => setSettings({ ...settings, printKitchen: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sauvegarde */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Sauvegarde
              </CardTitle>
              <CardDescription>Configuration des sauvegardes automatiques</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sauvegarde automatique</Label>
                  <p className="text-sm text-muted-foreground">Sauvegarder automatiquement les données</p>
                </div>
                <Switch
                  checked={settings.autoBackup}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoBackup: checked })}
                />
              </div>

              {settings.autoBackup && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <Label htmlFor="backupFolder">Dossier de sauvegarde</Label>
                    <Input
                      id="backupFolder"
                      value={settings.backupFolder}
                      onChange={(e) => setSettings({ ...settings, backupFolder: e.target.value })}
                      placeholder="C:\backups\ ou ./backups/"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="backupFrequency">Fréquence</Label>
                    <Select 
                      value={settings.backupFrequency} 
                      onValueChange={(value) => setSettings({ ...settings, backupFrequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Toutes les heures</SelectItem>
                        <SelectItem value="daily">Quotidienne</SelectItem>
                        <SelectItem value="weekly">Hebdomadaire</SelectItem>
                        <SelectItem value="monthly">Mensuelle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Apparence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="mr-2 h-5 w-5" />
                Apparence
              </CardTitle>
              <CardDescription>Personnalisation de l'interface</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="theme">Thème</Label>
                <Select 
                  value={settings.theme} 
                  onValueChange={(value) => setSettings({ ...settings, theme: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Défaut</SelectItem>
                    <SelectItem value="dark">Sombre</SelectItem>
                    <SelectItem value="light">Clair</SelectItem>
                    <SelectItem value="blue">Bleu</SelectItem>
                    <SelectItem value="green">Vert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sons système</Label>
                  <p className="text-sm text-muted-foreground">Activer les notifications sonores</p>
                </div>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, soundEnabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Receipt Designer Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Printer className="mr-2 h-5 w-5" />
                Conception du ticket
              </CardTitle>
              <CardDescription>
                Personnalisez le design de vos tickets de caisse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configurez tous les éléments qui apparaissent sur vos tickets: logo, 
                informations commerciales, colonnes de produits, messages personnalisés, etc.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '#/receipt-designer'}
              >
                <Printer className="mr-2 h-4 w-4" />
                Ouvrir le concepteur de tickets
              </Button>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex space-x-2">
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Réinitialiser
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informations système */}
        <div className="space-y-6">
          {/* Informations de licence */}
          {license && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Licence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Clé de licence</Label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {license.licenseKey}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Client</Label>
                  <p className="text-sm text-muted-foreground">
                    {license.clientName}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Secteur</Label>
                  <p className="text-sm text-muted-foreground capitalize">
                    {license.sector}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <Badge variant={license.licenseType === 'LIFETIME' ? 'default' : 'secondary'}>
                    {license.licenseType === 'LIFETIME' ? 'À vie' : 'Abonnement'}
                  </Badge>
                </div>

                {license.expirationDate && (
                  <div>
                    <Label className="text-sm font-medium">Expiration</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(license.expirationDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Modules activés */}
          {license?.modules && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="mr-2 h-5 w-5" />
                  Modules activés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {license.modules
                    .filter(module => module.isEnabled)
                    .map((module) => (
                      <div key={module.name} className="flex items-center justify-between">
                        <span className="text-sm">{module.displayName}</span>
                        <Badge variant="outline">Activé</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informations système */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="mr-2 h-5 w-5" />
                Système
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Version</Label>
                <p className="text-sm text-muted-foreground">1.0.0</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Base de données</Label>
                <p className="text-sm text-muted-foreground">SQLite</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Emplacement du fichier DB</Label>
                <p className="text-xs text-muted-foreground break-all font-mono" title={dbPath}>
                  {dbPath || 'Indisponible'}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Dernière sauvegarde</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

