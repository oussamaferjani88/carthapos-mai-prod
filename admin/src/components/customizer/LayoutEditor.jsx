import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Layout, Square, MousePointer, Grid, FormInput } from 'lucide-react';

const LayoutEditor = ({ formData, setFormData }) => {
  const [activeTab, setActiveTab] = useState('general');

  const handleNavbarPositionChange = (position) => {
    console.log('Navbar position changing to:', position);
    setFormData({
      ...formData,
      configuration: { 
        ...formData.configuration, 
        navbarPosition: position 
      }
    });
  };

  const handleSpacingChange = (value) => {
    console.log('Spacing changing to:', value[0]);
    setFormData({
      ...formData,
      configuration: { 
        ...formData.configuration, 
        spacingScale: value[0] 
      }
    });
  };

  const handleMaxWidthChange = (value) => {
    console.log('Max width changing to:', value);
    setFormData({
      ...formData,
      configuration: { 
        ...formData.configuration, 
        maxWidth: value 
      }
    });
  };

  const handleToggleChange = (field, checked) => {
    console.log('Toggle changing:', field, checked);
    setFormData({
      ...formData,
      configuration: { 
        ...formData.configuration, 
        [field]: checked 
      }
    });
  };

  // Nouvelles fonctions pour les composants
  const handleComponentChange = (componentType, property, value) => {
    console.log('Component changing:', componentType, property, value);
    setFormData({
      ...formData,
      configuration: { 
        ...formData.configuration, 
        components: {
          ...formData.configuration.components,
          [componentType]: {
            ...formData.configuration.components?.[componentType],
            [property]: value
          }
        }
      }
    });
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center text-gray-900 dark:text-gray-100">
          <Layout className="w-4 h-4 mr-2" />
          Disposition et mise en page
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Debug info */}
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
          <strong>Debug Layout:</strong> 
          Navbar: {formData?.configuration?.navbarPosition || 'non défini'}, 
          Espacement: {formData?.configuration?.spacingScale || 'non défini'},
          Largeur: {formData?.configuration?.maxWidth || 'non défini'}
          <br />
          <strong>Composants:</strong> {JSON.stringify(formData?.configuration?.components || {})}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="text-xs">
              <Layout className="w-3 h-3 mr-1" />
              Général
            </TabsTrigger>
            <TabsTrigger value="components" className="text-xs">
              <Square className="w-3 h-3 mr-1" />
              Composants
            </TabsTrigger>
            <TabsTrigger value="grid" className="text-xs">
              <Grid className="w-3 h-3 mr-1" />
              Grille
            </TabsTrigger>
            <TabsTrigger value="forms" className="text-xs">
              <FormInput className="w-3 h-3 mr-1" />
              Formulaires
            </TabsTrigger>
          </TabsList>

          {/* ONGLET GÉNÉRAL */}
          <TabsContent value="general" className="space-y-4 mt-4">
            {/* Position navbar */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Position de la navigation</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'left', label: 'Gauche', icon: '⬅️' },
                  { value: 'top', label: 'Haut', icon: '⬆️' },
                  { value: 'right', label: 'Droite', icon: '➡️' }
                ].map((pos) => (
                  <Button
                    key={pos.value}
                    variant={formData.configuration.navbarPosition === pos.value ? 'default' : 'outline'}
                    className="justify-start text-xs"
                    onClick={() => handleNavbarPositionChange(pos.value)}
                  >
                    <span className="mr-1">{pos.icon}</span>
                    {pos.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Espacement global */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Espacement global</Label>
              <div className="flex items-center space-x-3">
                <Slider
                  value={[formData.configuration.spacingScale || 1]}
                  onValueChange={handleSpacingChange}
                  max={2}
                  min={0.5}
                  step={0.1}
                  className="flex-1"
                />
                <Badge variant="outline">{formData.configuration.spacingScale || 1}x</Badge>
              </div>
            </div>

            {/* Largeur max du contenu */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Largeur maximale du contenu</Label>
              <Select 
                value={formData.configuration.maxWidth || '1200px'}
                onValueChange={handleMaxWidthChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024px">Petite (1024px)</SelectItem>
                  <SelectItem value="1200px">Moyenne (1200px)</SelectItem>
                  <SelectItem value="1400px">Grande (1400px)</SelectItem>
                  <SelectItem value="1600px">Très grande (1600px)</SelectItem>
                  <SelectItem value="100%">Pleine largeur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Switches généraux */}
            <div className="space-y-3">
              {/* Mode dense */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Mode compact</Label>
                  <p className="text-xs text-muted-foreground">Réduire l'espacement pour plus de densité</p>
                </div>
                <Switch
                  checked={formData.configuration.compactMode || false}
                  onCheckedChange={(checked) => handleToggleChange('compactMode', checked)}
                />
              </div>

              {/* Navigation collapsible */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Navigation rétractable</Label>
                  <p className="text-xs text-muted-foreground">Permettre de masquer/afficher la navigation</p>
                </div>
                <Switch
                  checked={formData.configuration.navbarCollapsible || false}
                  onCheckedChange={(checked) => handleToggleChange('navbarCollapsible', checked)}
                />
              </div>
            </div>
          </TabsContent>

          {/* ONGLET COMPOSANTS */}
          <TabsContent value="components" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* Section Cartes */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                  <Square className="w-4 h-4 mr-2" />
                  🃏 Cartes et Conteneurs
                </h4>
                
                {/* Border Radius pour cartes */}
                <div className="space-y-2 mb-3">
                  <Label className="text-sm font-medium">Arrondi des bordures</Label>
                  <Select 
                    value={formData.configuration.components?.cards?.borderRadius || 'medium'}
                    onValueChange={(value) => handleComponentChange('cards', 'borderRadius', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun (0px)</SelectItem>
                      <SelectItem value="small">Petit (4px)</SelectItem>
                      <SelectItem value="medium">Moyen (8px)</SelectItem>
                      <SelectItem value="large">Grand (12px)</SelectItem>
                      <SelectItem value="xl">Très grand (16px)</SelectItem>
                      <SelectItem value="full">Rond complet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Padding des cartes */}
                <div className="space-y-2 mb-3">
                  <Label className="text-sm font-medium">Espacement interne des cartes</Label>
                  <div className="flex items-center space-x-3">
                    <Slider
                      value={[formData.configuration.components?.cards?.padding || 1]}
                      onValueChange={(value) => handleComponentChange('cards', 'padding', value[0])}
                      max={2}
                      min={0.5}
                      step={0.25}
                      className="flex-1"
                    />
                    <Badge variant="outline">{formData.configuration.components?.cards?.padding || 1}x</Badge>
                  </div>
                </div>

                {/* Style d'ombre pour cartes */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Style d'ombre des cartes</Label>
                  <Select 
                    value={formData.configuration.components?.cards?.shadowStyle || 'default'}
                    onValueChange={(value) => handleComponentChange('cards', 'shadowStyle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune ombre</SelectItem>
                      <SelectItem value="soft">Douce</SelectItem>
                      <SelectItem value="default">Normale</SelectItem>
                      <SelectItem value="hard">Prononcée</SelectItem>
                      <SelectItem value="colored">Colorée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Section Boutons */}
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-3 flex items-center">
                  <MousePointer className="w-4 h-4 mr-2" />
                  🔘 Boutons et Interactions
                </h4>
                
                {/* Style des boutons */}
                <div className="space-y-2 mb-3">
                  <Label className="text-sm font-medium">Style des boutons</Label>
                  <Select 
                    value={formData.configuration.components?.buttons?.style || 'default'}
                    onValueChange={(value) => handleComponentChange('buttons', 'style', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Standard</SelectItem>
                      <SelectItem value="rounded">Arrondis</SelectItem>
                      <SelectItem value="pill">Pilule</SelectItem>
                      <SelectItem value="square">Carrés</SelectItem>
                      <SelectItem value="outline">Contour uniquement</SelectItem>
                      <SelectItem value="ghost">Fantôme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Taille des boutons */}
                <div className="space-y-2 mb-3">
                  <Label className="text-sm font-medium">Taille des boutons</Label>
                  <Select 
                    value={formData.configuration.components?.buttons?.size || 'medium'}
                    onValueChange={(value) => handleComponentChange('buttons', 'size', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Petits</SelectItem>
                      <SelectItem value="medium">Moyens</SelectItem>
                      <SelectItem value="large">Grands</SelectItem>
                      <SelectItem value="xl">Très grands</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Effet hover pour boutons */}
                <div className="flex items-center justify-between p-2 rounded border">
                  <div>
                    <Label className="text-sm font-medium">Effets au survol</Label>
                    <p className="text-xs text-muted-foreground">Animations spéciales pour les boutons</p>
                  </div>
                  <Switch
                    checked={formData.configuration.components?.buttons?.hoverEffects !== false}
                    onCheckedChange={(checked) => handleComponentChange('buttons', 'hoverEffects', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ONGLET GRILLE */}
          <TabsContent value="grid" className="space-y-4 mt-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded">
              <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-3 flex items-center">
                <Grid className="w-4 h-4 mr-2" />
                📐 Système de Grille
              </h4>
              
              {/* Nombre de colonnes */}
              <div className="space-y-2 mb-3">
                <Label className="text-sm font-medium">Colonnes par défaut</Label>
                <Select 
                  value={formData.configuration.components?.grid?.columns?.toString() || '3'}
                  onValueChange={(value) => handleComponentChange('grid', 'columns', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 colonnes</SelectItem>
                    <SelectItem value="3">3 colonnes</SelectItem>
                    <SelectItem value="4">4 colonnes</SelectItem>
                    <SelectItem value="5">5 colonnes</SelectItem>
                    <SelectItem value="6">6 colonnes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Espacement entre éléments */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Espacement entre éléments</Label>
                <div className="flex items-center space-x-3">
                  <Slider
                    value={[formData.configuration.components?.grid?.gap || 4]}
                    onValueChange={(value) => handleComponentChange('grid', 'gap', value[0])}
                    max={8}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="outline">{formData.configuration.components?.grid?.gap || 4}px</Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ONGLET FORMULAIRES */}
          <TabsContent value="forms" className="space-y-4 mt-4">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
              <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-3 flex items-center">
                <FormInput className="w-4 h-4 mr-2" />
                📝 Formulaires et Inputs
              </h4>
              
              {/* Style des inputs */}
              <div className="space-y-2 mb-3">
                <Label className="text-sm font-medium">Style des champs de saisie</Label>
                <Select 
                  value={formData.configuration.components?.forms?.inputStyle || 'default'}
                  onValueChange={(value) => handleComponentChange('forms', 'inputStyle', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Standard</SelectItem>
                    <SelectItem value="rounded">Arrondis</SelectItem>
                    <SelectItem value="underlined">Soulignés</SelectItem>
                    <SelectItem value="filled">Remplis</SelectItem>
                    <SelectItem value="outlined">Bordure épaisse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Taille des inputs */}
              <div className="space-y-2 mb-3">
                <Label className="text-sm font-medium">Taille des champs</Label>
                <Select 
                  value={formData.configuration.components?.forms?.inputSize || 'medium'}
                  onValueChange={(value) => handleComponentChange('forms', 'inputSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Compacts</SelectItem>
                    <SelectItem value="medium">Standards</SelectItem>
                    <SelectItem value="large">Larges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Focus style */}
              <div className="flex items-center justify-between p-2 rounded border">
                <div>
                  <Label className="text-sm font-medium">Surbrillance au focus</Label>
                  <p className="text-xs text-muted-foreground">Effet visuel lors de la sélection</p>
                </div>
                <Switch
                  checked={formData.configuration.components?.forms?.focusRing !== false}
                  onCheckedChange={(checked) => handleComponentChange('forms', 'focusRing', checked)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LayoutEditor;
