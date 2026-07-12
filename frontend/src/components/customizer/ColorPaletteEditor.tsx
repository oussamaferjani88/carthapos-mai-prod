import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Paintbrush } from 'lucide-react';

interface ColorPaletteEditorProps {
  formData: any;
  setFormData: (data: any) => void;
}

const colorFields = [
  { key: 'primaryColor', label: 'Couleur principale', desc: 'Boutons et éléments principaux' },
  { key: 'secondaryColor', label: 'Couleur secondaire', desc: 'Éléments de support' },
  { key: 'accentColor', label: "Couleur d'accent", desc: 'Notifications et alertes' },
  { key: 'backgroundColor', label: 'Arrière-plan principal', desc: "Fond de l'application" },
  { key: 'cardBackgroundColor', label: 'Arrière-plan cartes', desc: 'Fond des cartes et panneaux' },
  { key: 'textColor', label: 'Texte principal', desc: 'Couleur du texte principal' },
];

const ColorPaletteEditor = ({ formData, setFormData }: ColorPaletteEditorProps) => {
  const handleColorChange = (key: string, value: string) => {
    setFormData({
      ...formData,
      configuration: { ...formData.configuration, [key]: value },
    });
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader className="pb-1.5 pt-2.5 px-3">
        <CardTitle className="text-xs flex items-center text-gray-900 dark:text-gray-100">
          <Paintbrush className="w-3.5 h-3.5 mr-1.5" />
          Palette de couleurs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3">
        {colorFields.map((colorField) => (
          <div key={colorField.key} className="group">
            <div className="flex items-center space-x-2 p-1.5 rounded-lg border hover:bg-accent/50 transition-colors">
              <input
                type="color"
                value={formData.configuration[colorField.key] || '#3B82F6'}
                onChange={(e) => handleColorChange(colorField.key, e.target.value)}
                className="w-8 h-8 rounded-lg border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <Label className="text-xs font-medium">{colorField.label}</Label>
                <p className="text-[10px] text-muted-foreground leading-tight">{colorField.desc}</p>
                <Input
                  value={formData.configuration[colorField.key] || '#3B82F6'}
                  onChange={(e) => handleColorChange(colorField.key, e.target.value)}
                  className="h-6 text-xs mt-0.5 font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ColorPaletteEditor;
