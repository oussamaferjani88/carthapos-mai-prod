import React from 'react';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';

const TypographyEditor = ({ formData, setFormData }) => {
  const getFontWeightDisplay = (weight) => {
    const displayMap = {
      '300': 'light', '400': 'normal', '500': 'medium', '600': 'semibold', '700': 'bold',
    };
    return displayMap[weight] || weight;
  };

  const handleFontFamilyChange = (value) => {
    setFormData({ ...formData, configuration: { ...formData.configuration, fontFamily: value } });
  };

  const handleFontSizeChange = (value) => {
    setFormData({ ...formData, configuration: { ...formData.configuration, fontSize: `${value[0]}px` } });
  };

  const handleFontWeightChange = (value) => {
    const weightMap = { light: '300', normal: '400', medium: '500', semibold: '600', bold: '700' };
    setFormData({ ...formData, configuration: { ...formData.configuration, fontWeight: weightMap[value] || value } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Police principale</Label>
        <Select
          value={formData.configuration.fontFamily || 'Inter'}
          onValueChange={handleFontFamilyChange}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Inter">Inter - Moderne</SelectItem>
            <SelectItem value="Roboto">Roboto - Google</SelectItem>
            <SelectItem value="Poppins">Poppins - Arrondie</SelectItem>
            <SelectItem value="Open Sans">Open Sans - Lisible</SelectItem>
            <SelectItem value="Montserrat">Montserrat - Élégante</SelectItem>
            <SelectItem value="Lato">Lato - Humaniste</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Taille de texte de base</Label>
        <div className="flex items-center gap-2">
          <Slider
            value={[parseInt(formData.configuration.fontSize?.replace('px', '') || '14', 10)]}
            onValueChange={handleFontSizeChange}
            max={20}
            min={10}
            step={1}
            className="flex-1"
          />
          <Badge variant="outline" className="text-xs px-1.5 py-0.5">{formData.configuration.fontSize || '14px'}</Badge>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Poids du texte</Label>
        <Select
          value={getFontWeightDisplay(formData.configuration.fontWeight || '400')}
          onValueChange={handleFontWeightChange}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Léger (300)</SelectItem>
            <SelectItem value="normal">Normal (400)</SelectItem>
            <SelectItem value="medium">Moyen (500)</SelectItem>
            <SelectItem value="semibold">Semi-gras (600)</SelectItem>
            <SelectItem value="bold">Gras (700)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TypographyEditor;
