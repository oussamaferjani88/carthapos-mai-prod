import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { AlertCircle, Building, Globe, Zap, Code, Upload, Image } from 'lucide-react';

const AdvancedSettings = ({ formData, setFormData }) => {
  const handleBusinessInfoChange = (field, value) => {
    setFormData({
      ...formData,
      configuration: { ...formData.configuration, [field]: value }
    });
  };

  const handleToggleChange = (field, checked) => {
    setFormData({
      ...formData,
      configuration: { ...formData.configuration, [field]: checked }
    });
  };

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center text-foreground">
          <Code className="w-4 h-4 mr-2" />
          Paramètres avancés
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informations du commerce */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center">
            <Building className="w-4 h-4 mr-2 text-blue-600" />
            Informations du commerce
          </h4>
          
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="businessName" className="text-sm font-medium">Nom du commerce</Label>
              <Input
                id="businessName"
                value={formData.configuration.businessName || ''}
                onChange={(e) => handleBusinessInfoChange('businessName', e.target.value)}
                placeholder="Ex: Restaurant Le Gourmet"
                className="h-10"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logo" className="text-sm font-medium flex items-center gap-2">
                <Image className="w-4 h-4" />
                Logo du commerce
              </Label>
              
              {/* Logo upload section */}
              <div className="space-y-3">
                {formData.configuration.logo ? (
                  // Show preview when logo is uploaded
                  <div className="flex items-center gap-4 p-3 rounded-lg border bg-accent/5">
                    <img 
                      src={formData.configuration.logo} 
                      alt="Logo du commerce" 
                      className="w-10 h-10 rounded-lg object-cover border border-border shadow-sm"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Logo téléchargé</p>
                      <p className="text-xs text-muted-foreground">Ce logo apparaîtra dans l'en-tête du POS</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBusinessInfoChange('logo', '')}
                      className="text-sm text-red-600 hover:text-red-800 hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                ) : (
                  // Show upload button when no logo
                  <div className="relative">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Check file size (max 2MB)
                          if (file.size > 2 * 1024 * 1024) {
                            alert('Le fichier est trop volumineux. Taille maximale: 2MB');
                            return;
                          }
                          
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            handleBusinessInfoChange('logo', event.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="h-10"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-accent/30 rounded-md border-2 border-dashed border-border pointer-events-none">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Cliquez pour choisir un logo</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Upload helper text */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200">Conseils pour le logo</p>
                    <p className="text-blue-700 dark:text-blue-300">
                      Format recommandé: PNG ou JPG • Taille max: 2MB • Dimensions idéales: 128x128px
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="appTitle" className="text-sm font-medium">Titre de l'application</Label>
              <Input
                id="appTitle"
                value={formData.configuration.appTitle || ''}
                onChange={(e) => handleBusinessInfoChange('appTitle', e.target.value)}
                placeholder="Titre affiché dans l'onglet du navigateur"
                className="h-10"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Localisation */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center">
            <Globe className="w-4 h-4 mr-2 text-green-600" />
            Localisation & Langue
          </h4>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="currency" className="text-sm font-medium">Devise</Label>
              <Select 
                value={formData.configuration.currency || 'EUR'}
                onValueChange={(value) => handleBusinessInfoChange('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">🇪🇺 Euro (€)</SelectItem>
                  <SelectItem value="USD">🇺🇸 Dollar ($)</SelectItem>
                  <SelectItem value="GBP">🇬🇧 Livre (£)</SelectItem>
                  <SelectItem value="CAD">🇨🇦 Dollar Canadien (C$)</SelectItem>
                  <SelectItem value="CHF">🇨🇭 Franc Suisse (CHF)</SelectItem>
                  <SelectItem value="MAD">🇲🇦 Dirham (DH)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="language" className="text-sm font-medium">Langue</Label>
              <Select 
                value={formData.configuration.language || 'fr'}
                onValueChange={(value) => handleBusinessInfoChange('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                  <SelectItem value="ar">🇲🇦 العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Performance et expérience utilisateur */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center">
            <Zap className="w-4 h-4 mr-2 text-yellow-600" />
            Performance & Expérience
          </h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-accent/5">
              <div>
                <Label className="text-sm font-medium">Animations fluides</Label>
                <p className="text-xs text-muted-foreground">Transitions et micro-interactions</p>
              </div>
              <Switch
                checked={formData.configuration.animations !== false}
                onCheckedChange={(checked) => handleToggleChange('animations', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-accent/5">
              <div>
                <Label className="text-sm font-medium">Mode sombre automatique</Label>
                <p className="text-xs text-muted-foreground">Basculer selon l'heure du jour</p>
              </div>
              <Switch
                checked={formData.configuration.autoModeSwitch || false}
                onCheckedChange={(checked) => handleToggleChange('autoModeSwitch', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-accent/5">
              <div>
                <Label className="text-sm font-medium">Sauvegarde automatique</Label>
                <p className="text-xs text-muted-foreground">Sauvegarder les modifications en temps réel</p>
              </div>
              <Switch
                checked={formData.configuration.autoSave !== false}
                onCheckedChange={(checked) => handleToggleChange('autoSave', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* CSS personnalisé */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center">
            <Code className="w-4 h-4 mr-2 text-purple-600" />
            Personnalisation avancée
          </h4>
          
          <div className="grid gap-3">
            <Label htmlFor="customCSS" className="text-sm font-medium">CSS personnalisé</Label>
            <Textarea
              id="customCSS"
              value={formData.configuration.customCSS || ''}
              onChange={(e) => handleBusinessInfoChange('customCSS', e.target.value)}
              placeholder="/* Styles CSS personnalisés */
.pos-custom {
  /* Vos modifications */
}

/* Exemple: modifier les boutons */
.btn-primary {
  background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
}

/* Exemple: personnaliser la navigation */
.navbar {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
}"
              className="h-40 text-sm font-mono resize-none"
            />
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200">Conseils CSS</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Utilisez les classes CSS pour personnaliser l'apparence. Les modifications sont appliquées en temps réel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedSettings;
