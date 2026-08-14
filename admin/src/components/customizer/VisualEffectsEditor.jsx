import React from 'react';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';

const animationTypes = [
  { value: 'slide', label: 'Glissement', description: 'Mouvement vers le haut (Recommandé POS)' },
  { value: 'glow', label: 'Lueur', description: 'Effet de lueur colorée' },
  { value: 'fade', label: 'Fondu', description: "Changement d'opacité subtil" },
  { value: 'border-pulse', label: 'Bordure pulsante', description: 'Pulsation de bordure' },
  { value: 'elastic', label: 'Élastique', description: 'Effet élastique léger' },
  { value: 'rotate', label: 'Rotation', description: 'Rotation très légère' },
  { value: 'none', label: 'Aucune', description: "Pas d'animation de survol" },
];

const animationSpeeds = [
  { value: 'slow', label: 'Lente (300ms)' },
  { value: 'normal', label: 'Normale (200ms)' },
  { value: 'fast', label: 'Rapide (100ms)' },
];

const specialEffects = [
  { key: 'shadows', label: 'Ombres portées', description: 'Ombres portées sur les éléments' },
  { key: 'gradientBackgrounds', label: 'Arrière-plans dégradés', description: 'Dégradés colorés' },
  { key: 'glassEffect', label: 'Effet de verre', description: 'Effet de transparence moderne' },
];

const VisualEffectsEditor = ({ formData, setFormData }) => {
  const handleChange = (key, value) => {
    setFormData({ ...formData, configuration: { ...formData.configuration, [key]: value } });
  };

  const handleToggle = (key, checked) => {
    setFormData({ ...formData, configuration: { ...formData.configuration, [key]: checked } });
  };

  const renderAnimationGroup = ({ title, enabledKey, typeKey, speedKey }) => {
    const enabled = formData.configuration[enabledKey] !== false;
    return (
      <div className="border border-border rounded-md overflow-hidden">
        <div className="flex items-center justify-between px-2.5 py-2 bg-accent/40">
          <span className="text-xs font-medium">{title}</span>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => handleToggle(enabledKey, checked)}
          />
        </div>
        {enabled && (
          <div className="space-y-2.5 p-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Type d'animation</Label>
              <Select
                value={formData.configuration[typeKey] || 'slide'}
                onValueChange={(value) => handleChange(typeKey, value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {animationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Vitesse</Label>
              <Select
                value={formData.configuration[speedKey] || 'normal'}
                onValueChange={(value) => handleChange(speedKey, value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {animationSpeeds.map((speed) => (
                    <SelectItem key={speed.value} value={speed.value}>
                      {speed.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Intensité des ombres</Label>
        <Select
          value={formData.configuration.shadowIntensity || 'medium'}
          onValueChange={(value) => handleChange('shadowIntensity', value)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucune</SelectItem>
            <SelectItem value="light">Légère</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="heavy">Forte</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {renderAnimationGroup({
        title: 'Animations de navigation',
        enabledKey: 'animations',
        typeKey: 'animationType',
        speedKey: 'animationSpeed',
      })}

      {renderAnimationGroup({
        title: 'Animations des cartes',
        enabledKey: 'cardAnimations',
        typeKey: 'cardAnimationType',
        speedKey: 'cardAnimationSpeed',
      })}

      <div className="space-y-1.5">
        {specialEffects.map((effect) => (
          <div key={effect.key} className="flex items-center justify-between px-2.5 py-2 rounded-md border border-border">
            <div className="min-w-0">
              <Label className="text-xs font-medium">{effect.label}</Label>
              <p className="text-[11px] text-muted-foreground leading-tight">{effect.description}</p>
            </div>
            <Switch
              checked={formData.configuration[effect.key] !== false}
              onCheckedChange={(checked) => handleToggle(effect.key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default VisualEffectsEditor;
