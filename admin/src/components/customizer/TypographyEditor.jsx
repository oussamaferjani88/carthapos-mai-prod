import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Type } from 'lucide-react';

const TypographyEditor = ({ formData, setFormData }) => {
  // Helper function to get display value for font weight
  const getFontWeightDisplay = (weight) => {
    const displayMap = {
      '300': 'light',
      '400': 'normal',
      '500': 'medium', 
      '600': 'semibold',
      '700': 'bold'
    };
    return displayMap[weight] || weight;
  };

  const handleFontFamilyChange = (value) => {
    console.log('Font family changing to:', value);
    setFormData({
      ...formData,
      configuration: { 
        ...formData.configuration, 
        fontFamily: value 
      }
    });
  };

  const handleFontSizeChange = (value) => {
    console.log('Font size changing to:', value[0]);
    setFormData({
      ...formData,
      configuration: { 
        ...formData.configuration, 
        fontSize: `${value[0]}px` 
      }
    });
  };

  const handleFontWeightChange = (value) => {
    console.log('Font weight changing to:', value);
    // Convert text values to CSS numeric values
    const weightMap = {
      'light': '300',
      'normal': '400', 
      'medium': '500',
      'semibold': '600',
      'bold': '700'
    };
    const cssWeight = weightMap[value] || value;
    setFormData({
      ...formData,
      configuration: { 
        ...formData.configuration, 
        fontWeight: cssWeight 
      }
    });
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center text-gray-900 dark:text-gray-100">
          <Type className="w-3.5 h-3.5 mr-1.5" />
          Typographie et textes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Debug info */}
        <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">
          <strong>Debug:</strong> Font: {formData?.configuration?.fontFamily || 'non défini'}, 
          Taille: {formData?.configuration?.fontSize || 'non défini'},
          Poids: {formData?.configuration?.fontWeight || 'non défini'} (CSS: {formData?.configuration?.fontWeight})
        </div>
        
        {/* Police principale */}
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

        {/* Taille de base */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Taille de texte de base</Label>
          <div className="flex items-center space-x-2">
            <Slider
              value={[parseInt(formData.configuration.fontSize?.replace('px', '') || '14')]}
              onValueChange={handleFontSizeChange}
              max={20}
              min={10}
              step={1}
              className="flex-1"
            />
            <Badge variant="outline" className="text-xs px-1.5 py-0.5">{formData.configuration.fontSize || '14px'}</Badge>
          </div>
        </div>

        {/* Poids de police */}
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
      </CardContent>
    </Card>
  );
};

export default TypographyEditor;
