import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';

interface VisualEffectsEditorProps {
  formData: any;
  setFormData: (data: any) => void;
}

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

// Ported from admin/src/components/customizer/VisualEffectsEditor.jsx (flat
// layout; also drops a leftover debug status block and a duplicate
// animations/cardAnimations toggle the previous client version had - each
// animation group's own enable switch already controls those same keys, so
// admin never repeats them in the effects list below it).
const VisualEffectsEditor = ({ formData, setFormData }: VisualEffectsEditorProps) => {
  const handleChange = (key: string, value: string) => {
    setFormData({ ...formData, configuration: { ...formData.configuration, [key]: value } });
  };

  const handleToggle = (key: string, checked: boolean) => {
    setFormData({ ...formData, configuration: { ...formData.configuration, [key]: checked } });
  };

  const renderAnimationGroup = ({
    title, enabledKey, typeKey, speedKey,
  }: { title: string; enabledKey: string; typeKey: string; speedKey: string }) => {
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
