import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Zap, Code } from 'lucide-react';

interface AdvancedSettingsProps {
  formData: { configuration: Record<string, any>; selectedModules: string[] };
  setFormData: (data: { configuration: Record<string, any>; selectedModules: string[] }) => void;
}

// Business/brand fields (name, logo, app title, currency, language) moved to
// BrandPanel.tsx to match the admin panel's split (admin/src/components/customizer/
// AdvancedSettings.jsx) - this panel now only covers Performance + custom CSS,
// same functionality as before, just reorganized to match admin's sections.
const AdvancedSettings = ({ formData, setFormData }: AdvancedSettingsProps) => {
  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, configuration: { ...formData.configuration, [field]: value } });
  };

  const handleToggleChange = (field: string, checked: boolean) => {
    setFormData({ ...formData, configuration: { ...formData.configuration, [field]: checked } });
  };

  const renderToggle = ({
    label, description, checked, onCheckedChange,
  }: { label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) => (
    <div className="flex items-center justify-between px-2.5 py-2 rounded-md border border-border bg-white">
      <div className="min-w-0">
        <Label className="text-xs font-medium">{label}</Label>
        <p className="text-[11px] text-muted-foreground leading-tight">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          Performance
        </h4>
        <div className="space-y-1.5">
          {renderToggle({
            label: 'Animations fluides',
            description: 'Transitions et micro-interactions',
            checked: formData.configuration.animations !== false,
            onCheckedChange: (checked) => handleToggleChange('animations', checked),
          })}
          {renderToggle({
            label: 'Mode sombre automatique',
            description: "Basculer selon l'heure du jour",
            checked: formData.configuration.autoModeSwitch || false,
            onCheckedChange: (checked) => handleToggleChange('autoModeSwitch', checked),
          })}
          {renderToggle({
            label: 'Sauvegarde automatique',
            description: 'Sauvegarder les modifications en temps réel',
            checked: formData.configuration.autoSave !== false,
            onCheckedChange: (checked) => handleToggleChange('autoSave', checked),
          })}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Code className="w-3.5 h-3.5 text-muted-foreground" />
          CSS personnalisé
        </h4>
        <Textarea
          id="customCSS"
          value={formData.configuration.customCSS || ''}
          onChange={(e) => handleChange('customCSS', e.target.value)}
          placeholder="/* Vos styles CSS */"
          className="h-40 text-sm font-mono resize-none"
        />
        <p className="text-[11px] text-muted-foreground">
          Les modifications CSS sont appliquées en temps réel dans l'aperçu.
        </p>
      </div>
    </div>
  );
};

export default AdvancedSettings;
