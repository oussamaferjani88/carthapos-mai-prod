import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Sparkles } from 'lucide-react';

interface VisualEffectsEditorProps {
  formData: any;
  setFormData: (data: any) => void;
}

const animationTypes = [
  { value: 'slide', label: 'Glissement', description: 'Mouvement vers le haut (Recommandé POS)' },
  { value: 'glow', label: 'Lueur', description: "Effet de lueur colorée (Excellent POS)" },
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

const effects = [
  { key: 'animations', label: 'Animations de navigation', description: 'Transitions et animations pour la navigation' },
  { key: 'cardAnimations', label: 'Animations des cartes', description: 'Animations pour cartes de produits et éléments interactifs' },
  { key: 'shadows', label: 'Ombres', description: 'Ombres portées sur les éléments' },
  { key: 'gradientBackgrounds', label: 'Arrière-plans dégradés', description: 'Dégradés colorés' },
  { key: 'glassEffect', label: 'Effet de verre', description: 'Effet de transparence moderne' },
];

const VisualEffectsEditor = ({ formData, setFormData }: VisualEffectsEditorProps) => {
  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center text-gray-900 dark:text-gray-100">
          <Sparkles className="w-4 h-4 mr-2" />
          Effets visuels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs space-y-1">
          <div><strong className="text-green-800 dark:text-green-200">✅ Animations Status:</strong></div>
          <div>• Ombres: {formData?.configuration?.shadowIntensity || 'medium'}</div>
          <div>• 🧭 Navigation: {formData?.configuration?.animations ? '✓' : '✗'}
            {formData?.configuration?.animations && ` (${formData?.configuration?.animationType || 'slide'} - ${formData?.configuration?.animationSpeed || 'normal'})`}
          </div>
          <div>• 🛍️ Cartes: <span className="font-bold text-purple-600">{formData?.configuration?.cardAnimations ? '✓' : '✗'}</span>
            {formData?.configuration?.cardAnimations && ` (${formData?.configuration?.cardAnimationType || 'slide'} - ${formData?.configuration?.cardAnimationSpeed || 'normal'})`}
          </div>
          <div className="text-green-700 dark:text-green-300 font-medium">🎬 Contrôles séparés pour navigation et cartes !</div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Intensité des ombres</Label>
          <Select
            value={formData.configuration.shadowIntensity || 'medium'}
            onValueChange={(value) => setFormData({ ...formData, configuration: { ...formData.configuration, shadowIntensity: value } })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune</SelectItem>
              <SelectItem value="light">Légère</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="heavy">Forte</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.configuration.animations !== false && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">🧭 Animations de Navigation</h4>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type d'animation navigation</Label>
              <Select
                value={formData.configuration.animationType || 'slide'}
                onValueChange={(value) => setFormData({ ...formData, configuration: { ...formData.configuration, animationType: value } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {animationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div><div className="font-medium">{type.label}</div><div className="text-xs text-muted-foreground">{type.description}</div></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 mt-3">
              <Label className="text-sm font-medium">Vitesse navigation</Label>
              <Select
                value={formData.configuration.animationSpeed || 'normal'}
                onValueChange={(value) => setFormData({ ...formData, configuration: { ...formData.configuration, animationSpeed: value } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {animationSpeeds.map((speed) => (
                    <SelectItem key={speed.value} value={speed.value}>{speed.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {formData.configuration.cardAnimations !== false && (
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded">
            <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">🛍️ Animations des Cartes</h4>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type d'animation cartes</Label>
              <Select
                value={formData.configuration.cardAnimationType || 'slide'}
                onValueChange={(value) => setFormData({ ...formData, configuration: { ...formData.configuration, cardAnimationType: value } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {animationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div><div className="font-medium">{type.label}</div><div className="text-xs text-muted-foreground">{type.description}</div></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 mt-3">
              <Label className="text-sm font-medium">Vitesse cartes</Label>
              <Select
                value={formData.configuration.cardAnimationSpeed || 'normal'}
                onValueChange={(value) => setFormData({ ...formData, configuration: { ...formData.configuration, cardAnimationSpeed: value } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {animationSpeeds.map((speed) => (
                    <SelectItem key={speed.value} value={speed.value}>{speed.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {effects.map((effect) => (
            <div key={effect.key} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">{effect.label}</Label>
                <p className="text-xs text-muted-foreground">{effect.description}</p>
              </div>
              <Switch
                checked={formData.configuration[effect.key] !== false}
                onCheckedChange={(checked) => setFormData({ ...formData, configuration: { ...formData.configuration, [effect.key]: checked } })}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default VisualEffectsEditor;
