import React from 'react';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { AlertCircle, Zap, Code } from 'lucide-react';

const AdvancedSettings = ({ formData, setFormData }) => {
  const handleChange = (field, value) => {
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
    <div className="space-y-6">
      {/* Performance */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center">
          <Zap className="w-4 h-4 mr-2 text-yellow-600" />
          Performance
        </h4>

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

      <Separator />

      {/* CSS personnalisé */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center">
          <Code className="w-4 h-4 mr-2 text-purple-600" />
          CSS personnalisé
        </h4>

        <div className="space-y-2">
          <Textarea
            id="customCSS"
            value={formData.configuration.customCSS || ''}
            onChange={(e) => handleChange('customCSS', e.target.value)}
            placeholder="/* Vos styles CSS */
.btn-primary {
  background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
}"
            className="h-40 text-sm font-mono resize-none"
          />
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Les modifications sont appliquées en temps réel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSettings;
