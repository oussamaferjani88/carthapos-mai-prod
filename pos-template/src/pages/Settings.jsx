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
  Usb,
  Info
} from 'lucide-react';
import { useAppConfig } from '../hooks/useAppConfig';
import { useLicense } from '../hooks/useLicense';
import { POSConfiguration } from '../lib/POSConfiguration';

export default function Settings() {
  const { config } = useAppConfig();
  const { license } = useLicense();

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

  const [settings, setSettings] = useState({
    businessName: '',
    currency: 'TND',
    taxRate: 19,
    language: 'fr',
    timezone: 'Africa/Tunis',
    autoBackup: true,
    printReceipts: true,
    soundEnabled: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (config) {
      setSettings({
        businessName: config.theme?.businessName || '',
        currency: config.theme?.currency || 'TND',
        taxRate: config.theme?.taxRate || 19,
        language: config.theme?.language || 'fr',
        timezone: config.theme?.timezone || 'Africa/Tunis',
        autoBackup: true,
        printReceipts: true,
        soundEnabled: true
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Simuler la sauvegarde des paramètres
      // En production, cela sauvegarderait dans la base de données SQLite
      console.log('Saving settings:', settings);
      
      // Simuler un délai
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
      setSettings({
        businessName: config.theme?.businessName || '',
        currency: 'TND',
        taxRate: 19,
        language: 'fr',
        timezone: 'Africa/Tunis',
        autoBackup: true,
        printReceipts: true,
        soundEnabled: true
      });
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
                  <Label htmlFor="taxRate">Taux de TVA (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.1"
                    value={settings.taxRate}
                    onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>
            </CardContent>
          </Card>

          {/* Préférences système */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Préférences système
              </CardTitle>
              <CardDescription>
                Options de fonctionnement du système
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sauvegarde automatique</Label>
                  <p className="text-sm text-muted-foreground">
                    Sauvegarder automatiquement les données
                  </p>
                </div>
                <Switch
                  checked={settings.autoBackup}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoBackup: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Impression automatique</Label>
                  <p className="text-sm text-muted-foreground">
                    Imprimer automatiquement les tickets
                  </p>
                </div>
                <Switch
                  checked={settings.printReceipts}
                  onCheckedChange={(checked) => setSettings({ ...settings, printReceipts: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sons système</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer les notifications sonores
                  </p>
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

