import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Switch } from '../../../ui/switch';
import { Separator } from '../../../ui/separator';
import { Badge } from '../../../ui/badge';
import { Settings as SettingsIcon, Shield, Palette, Database, Printer, Info } from 'lucide-react';

// Ported from admin/src/components/pos/preview/modules/POSSettings.jsx —
// a real two-column settings reference page (general info, system
// preferences, receipt designer launcher, license/modules/system-info
// sidebar), replacing the previous 4 decorative link-style cards.
export const POSSettings = ({ config, modules }: { config: any; modules?: any[] }) => {
  const styles = {
    card: {
      backgroundColor: config.backgroundColor,
      borderColor: config.cardBorderColor,
      color: config.textColor,
    },
  };

  const safeModules = Array.isArray(modules) ? modules : [];

  const handleOpenReceiptDesigner = () => {
    if (config.onOpenReceiptDesigner) {
      config.onOpenReceiptDesigner();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: config.textColor }}>
          Paramètres
        </h1>
        <p style={{ color: config.textMutedColor }}>
          Configurez votre système POS selon vos besoins
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Paramètres principaux */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations générales */}
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
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
                <Input id="businessName" value={config.businessName || 'Mon établissement'} readOnly className="opacity-70" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select value={config.currency || 'TND'} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TND">Dinar Tunisien (DT)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                      <SelectItem value="USD">Dollar ($)</SelectItem>
                      <SelectItem value="GBP">Livre (£)</SelectItem>
                      <SelectItem value="CHF">Franc suisse (CHF)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="taxRate">Taux de TVA (%)</Label>
                  <Input id="taxRate" type="number" value={config.taxRate || 19} readOnly className="opacity-70" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="language">Langue</Label>
                  <Select value={config.language || 'fr'} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Select value={config.timezone || 'Africa/Tunis'} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Tunis">Africa/Tunis (CET)</SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Préférences système */}
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
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
                  <p className="text-sm opacity-60" style={{ color: config.textMutedColor }}>
                    Sauvegarder automatiquement les données
                  </p>
                </div>
                <Switch checked={true} disabled />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Impression automatique</Label>
                  <p className="text-sm opacity-60" style={{ color: config.textMutedColor }}>
                    Imprimer automatiquement les tickets
                  </p>
                </div>
                <Switch checked={true} disabled />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sons système</Label>
                  <p className="text-sm opacity-60" style={{ color: config.textMutedColor }}>
                    Activer les notifications sonores
                  </p>
                </div>
                <Switch checked={true} disabled />
              </div>
            </CardContent>
          </Card>

          {/* Conception du ticket */}
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Printer className="mr-2 h-5 w-5" />
                Conception du ticket
              </CardTitle>
              <CardDescription>
                Personnalisez le design de vos tickets de caisse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4" style={{ color: config.textMutedColor }}>
                Configurez tous les éléments qui apparaissent sur vos tickets: logo,
                informations commerciales, colonnes de produits, messages personnalisés, etc.
              </p>
              <Button variant="outline" className="w-full" onClick={handleOpenReceiptDesigner}>
                <Printer className="mr-2 h-4 w-4" />
                Ouvrir le concepteur de tickets
              </Button>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card style={styles.card}>
            <CardContent className="pt-6">
              <div className="flex space-x-2">
                <Button disabled>Sauvegarder</Button>
                <Button variant="outline" disabled>Réinitialiser</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Licence */}
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Shield className="mr-2 h-5 w-5" />
                Licence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Clé de licence</Label>
                <p className="text-sm font-mono" style={{ color: config.textMutedColor }}>DEMO-XXXX-XXXX-XXXX</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Client</Label>
                <p className="text-sm" style={{ color: config.textMutedColor }}>Client Demo</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Secteur</Label>
                <p className="text-sm capitalize" style={{ color: config.textMutedColor }}>Restauration</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Type</Label>
                <Badge variant="default">À vie</Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Expiration</Label>
                <p className="text-sm" style={{ color: config.textMutedColor }}>Illimitée</p>
              </div>
            </CardContent>
          </Card>

          {/* Modules activés */}
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Palette className="mr-2 h-5 w-5" />
                Modules activés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {safeModules.map((module: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">
                      {typeof module === 'string' ? module : module.name || module.slug || 'Module'}
                    </span>
                    <Badge variant="outline">Activé</Badge>
                  </div>
                ))}
                {safeModules.length === 0 && (
                  <p className="text-sm" style={{ color: config.textMutedColor }}>Aucun module sélectionné</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Système */}
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Info className="mr-2 h-5 w-5" />
                Système
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Version</Label>
                <p className="text-sm" style={{ color: config.textMutedColor }}>1.0.0</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Base de données</Label>
                <p className="text-sm" style={{ color: config.textMutedColor }}>SQLite</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Emplacement du fichier DB</Label>
                <p className="text-xs break-all font-mono" style={{ color: config.textMutedColor }}>C:\ProgramData\POS\database.db</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Dernière sauvegarde</Label>
                <p className="text-sm" style={{ color: config.textMutedColor }}>
                  {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default POSSettings;
