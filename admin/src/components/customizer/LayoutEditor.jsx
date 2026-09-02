import React, { useState } from 'react';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Layout, Square, MousePointer, Grid, FormInput, ArrowLeft, ArrowUp, ArrowRight } from 'lucide-react';

const LayoutEditor = ({ formData, setFormData }) => {
  const [activeTab, setActiveTab] = useState('general');

  const handleNavbarPositionChange = (position) => {
    setFormData({ ...formData, configuration: { ...formData.configuration, navbarPosition: position } });
  };

  const handleSpacingChange = (value) => {
    setFormData({ ...formData, configuration: { ...formData.configuration, spacingScale: value[0] } });
  };

  const handleMaxWidthChange = (value) => {
    setFormData({ ...formData, configuration: { ...formData.configuration, maxWidth: value } });
  };

  const handleToggleChange = (field, checked) => {
    setFormData({ ...formData, configuration: { ...formData.configuration, [field]: checked } });
  };

  const handleComponentChange = (componentType, property, value) => {
    setFormData({
      ...formData,
      configuration: {
        ...formData.configuration,
        components: {
          ...formData.configuration.components,
          [componentType]: {
            ...formData.configuration.components?.[componentType],
            [property]: value,
          },
        },
      },
    });
  };

  const renderSelect = ({ value, onValueChange, options }) => (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-7 w-full text-[11px] px-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderToggle = ({ label, description, checked, onCheckedChange }) => (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-md border border-border">
      <div className="min-w-0">
        <Label className="text-[11px] font-medium">{label}</Label>
        <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );

  const renderGroup = ({ title, icon, children }) => (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-accent/40">
        {icon}
        <span className="text-[11px] font-medium">{title}</span>
      </div>
      <div className="p-2 space-y-2">{children}</div>
    </div>
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      {/* Exact match of the client customizer's tab bar
          (frontend/src/components/customizer/LayoutEditor.tsx): the extra
          per-page "Pages" controls now live in their own left-rail section. */}
      <TabsList className="grid w-full grid-cols-4 h-8 rounded-md p-0.5 mb-2">
        <TabsTrigger
          value="general"
          className="gap-0 rounded-sm border-0 px-2 py-1 text-[11px] text-muted-foreground data-[state=active]:text-foreground"
        >
          <Layout className="size-3 mr-1" />Général
        </TabsTrigger>
        <TabsTrigger
          value="components"
          className="gap-0 rounded-sm border-0 px-2 py-1 text-[11px] text-muted-foreground data-[state=active]:text-foreground"
        >
          <Square className="size-3 mr-1" />Composants
        </TabsTrigger>
        <TabsTrigger
          value="grid"
          className="gap-0 rounded-sm border-0 px-2 py-1 text-[11px] text-muted-foreground data-[state=active]:text-foreground"
        >
          <Grid className="size-3 mr-1" />Grille
        </TabsTrigger>
        <TabsTrigger
          value="forms"
          className="gap-0 rounded-sm border-0 px-2 py-1 text-[11px] text-muted-foreground data-[state=active]:text-foreground"
        >
          <FormInput className="size-3 mr-1" />Formulaires
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-2.5">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium">Position de la navigation</Label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { value: 'left', label: 'Gauche', icon: ArrowLeft },
              { value: 'top', label: 'Haut', icon: ArrowUp },
              { value: 'right', label: 'Droite', icon: ArrowRight },
            ].map((pos) => {
              const PosIcon = pos.icon;
              return (
                <Button
                  key={pos.value}
                  variant={formData.configuration.navbarPosition === pos.value ? 'default' : 'outline'}
                  size="sm"
                  className="justify-center text-[11px] px-2 h-7"
                  onClick={() => handleNavbarPositionChange(pos.value)}
                >
                  <PosIcon className="w-3 h-3" />
                  {pos.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium">Espacement global</Label>
          <div className="flex items-center gap-2">
            <Slider
              value={[formData.configuration.spacingScale || 1]}
              onValueChange={handleSpacingChange}
              max={2}
              min={0.5}
              step={0.1}
              className="flex-1"
            />
            <Badge variant="outline" className="text-[10px] px-1.5">{formData.configuration.spacingScale || 1}x</Badge>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium">Largeur maximale du contenu</Label>
          {renderSelect({
            value: formData.configuration.maxWidth || '1200px',
            onValueChange: handleMaxWidthChange,
            options: [
              { value: '1024px', label: 'Petite (1024px)' },
              { value: '1200px', label: 'Moyenne (1200px)' },
              { value: '1400px', label: 'Grande (1400px)' },
              { value: '1600px', label: 'Très grande (1600px)' },
              { value: '100%', label: 'Pleine largeur' },
            ],
          })}
        </div>

        <div className="space-y-1">
          {renderToggle({
            label: 'Mode compact',
            description: 'Réduire l\'espacement pour plus de densité',
            checked: formData.configuration.compactMode || false,
            onCheckedChange: (checked) => handleToggleChange('compactMode', checked),
          })}
          {renderToggle({
            label: 'Navigation rétractable',
            description: 'Permettre de masquer/afficher la navigation',
            checked: formData.configuration.navbarCollapsible || false,
            onCheckedChange: (checked) => handleToggleChange('navbarCollapsible', checked),
          })}
        </div>
      </TabsContent>

      <TabsContent value="components" className="space-y-2">
        {renderGroup({
          title: 'Cartes et Conteneurs',
          icon: <Square className="w-3 h-3 text-muted-foreground" />,
          children: (
            <>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Arrondi des bordures</Label>
                {renderSelect({
                  value: formData.configuration.components?.cards?.borderRadius || 'medium',
                  onValueChange: (value) => handleComponentChange('cards', 'borderRadius', value),
                  options: [
                    { value: 'none', label: 'Aucun (0px)' },
                    { value: 'small', label: 'Petit (4px)' },
                    { value: 'medium', label: 'Moyen (8px)' },
                    { value: 'large', label: 'Grand (12px)' },
                    { value: 'xl', label: 'Très grand (16px)' },
                    { value: 'full', label: 'Rond complet' },
                  ],
                })}
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Espacement interne des cartes</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[formData.configuration.components?.cards?.padding || 1]}
                    onValueChange={(value) => handleComponentChange('cards', 'padding', value[0])}
                    max={2}
                    min={0.5}
                    step={0.25}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="text-[10px] px-1.5">{formData.configuration.components?.cards?.padding || 1}x</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Style d'ombre des cartes</Label>
                {renderSelect({
                  value: formData.configuration.components?.cards?.shadowStyle || 'default',
                  onValueChange: (value) => handleComponentChange('cards', 'shadowStyle', value),
                  options: [
                    { value: 'none', label: 'Aucune ombre' },
                    { value: 'soft', label: 'Douce' },
                    { value: 'default', label: 'Normale' },
                    { value: 'hard', label: 'Prononcée' },
                    { value: 'colored', label: 'Colorée' },
                  ],
                })}
              </div>
            </>
          ),
        })}

        {renderGroup({
          title: 'Boutons et Interactions',
          icon: <MousePointer className="w-3 h-3 text-muted-foreground" />,
          children: (
            <>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Style des boutons</Label>
                {renderSelect({
                  value: formData.configuration.components?.buttons?.style || 'default',
                  onValueChange: (value) => handleComponentChange('buttons', 'style', value),
                  options: [
                    { value: 'default', label: 'Standard' },
                    { value: 'rounded', label: 'Arrondis' },
                    { value: 'pill', label: 'Pilule' },
                    { value: 'square', label: 'Carrés' },
                    { value: 'outline', label: 'Contour uniquement' },
                    { value: 'ghost', label: 'Fantôme' },
                  ],
                })}
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Taille des boutons</Label>
                {renderSelect({
                  value: formData.configuration.components?.buttons?.size || 'medium',
                  onValueChange: (value) => handleComponentChange('buttons', 'size', value),
                  options: [
                    { value: 'small', label: 'Petits' },
                    { value: 'medium', label: 'Moyens' },
                    { value: 'large', label: 'Grands' },
                    { value: 'xl', label: 'Très grands' },
                  ],
                })}
              </div>
              {renderToggle({
                label: 'Effets au survol',
                description: 'Animations spéciales pour les boutons',
                checked: formData.configuration.components?.buttons?.hoverEffects !== false,
                onCheckedChange: (checked) => handleComponentChange('buttons', 'hoverEffects', checked),
              })}
            </>
          ),
        })}
      </TabsContent>

      <TabsContent value="grid" className="space-y-2">
        {renderGroup({
          title: 'Système de Grille',
          icon: <Grid className="w-3 h-3 text-muted-foreground" />,
          children: (
            <>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Colonnes par défaut</Label>
                {renderSelect({
                  value: formData.configuration.components?.grid?.columns?.toString() || '3',
                  onValueChange: (value) => handleComponentChange('grid', 'columns', parseInt(value, 10)),
                  options: [2, 3, 4, 5, 6].map((n) => ({ value: n.toString(), label: `${n} colonnes` })),
                })}
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Espacement entre éléments</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[formData.configuration.components?.grid?.gap || 4]}
                    onValueChange={(value) => handleComponentChange('grid', 'gap', value[0])}
                    max={8}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="text-[10px] px-1.5">{formData.configuration.components?.grid?.gap || 4}px</Badge>
                </div>
              </div>
            </>
          ),
        })}
      </TabsContent>

      <TabsContent value="forms" className="space-y-2">
        {renderGroup({
          title: 'Formulaires et Inputs',
          icon: <FormInput className="w-3 h-3 text-muted-foreground" />,
          children: (
            <>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Style des champs de saisie</Label>
                {renderSelect({
                  value: formData.configuration.components?.forms?.inputStyle || 'default',
                  onValueChange: (value) => handleComponentChange('forms', 'inputStyle', value),
                  options: [
                    { value: 'default', label: 'Standard' },
                    { value: 'rounded', label: 'Arrondis' },
                    { value: 'underlined', label: 'Soulignés' },
                    { value: 'filled', label: 'Remplis' },
                    { value: 'outlined', label: 'Bordure épaisse' },
                  ],
                })}
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Taille des champs</Label>
                {renderSelect({
                  value: formData.configuration.components?.forms?.inputSize || 'medium',
                  onValueChange: (value) => handleComponentChange('forms', 'inputSize', value),
                  options: [
                    { value: 'small', label: 'Compacts' },
                    { value: 'medium', label: 'Standards' },
                    { value: 'large', label: 'Larges' },
                  ],
                })}
              </div>
              {renderToggle({
                label: 'Surbrillance au focus',
                description: 'Effet visuel lors de la sélection',
                checked: formData.configuration.components?.forms?.focusRing !== false,
                onCheckedChange: (checked) => handleComponentChange('forms', 'focusRing', checked),
              })}
            </>
          ),
        })}
      </TabsContent>
    </Tabs>
  );
};

export default LayoutEditor;
