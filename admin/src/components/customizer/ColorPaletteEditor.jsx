import React from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

const colorFields = [
  { key: 'primaryColor', label: 'Couleur principale', desc: 'Boutons et éléments principaux' },
  { key: 'secondaryColor', label: 'Couleur secondaire', desc: 'Éléments de support' },
  { key: 'accentColor', label: "Couleur d'accent", desc: 'Notifications et alertes' },
  { key: 'backgroundColor', label: 'Arrière-plan principal', desc: "Fond de l'application" },
  { key: 'cardBackgroundColor', label: 'Arrière-plan cartes', desc: 'Fond des cartes et panneaux' },
  { key: 'textColor', label: 'Texte principal', desc: 'Couleur du texte principal' },
];

const ColorPaletteEditor = ({ formData, setFormData }) => {
  const handleColorChange = (key, value) => {
    setFormData({ ...formData, configuration: { ...formData.configuration, [key]: value } });
  };

  return (
    <div className="space-y-1.5">
      {colorFields.map((colorField) => (
        <div
          key={colorField.key}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md border border-border bg-white hover:bg-accent/40 transition-colors"
        >
          <input
            type="color"
            value={formData.configuration[colorField.key] || '#3B82F6'}
            onChange={(e) => handleColorChange(colorField.key, e.target.value)}
            className="w-7 h-7 rounded border border-border shadow-sm cursor-pointer shrink-0 bg-transparent"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-medium truncate">{colorField.label}</Label>
              <Input
                value={formData.configuration[colorField.key] || '#3B82F6'}
                onChange={(e) => handleColorChange(colorField.key, e.target.value)}
                className="h-6 w-[76px] text-[11px] font-mono px-1.5"
                placeholder="#000000"
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{colorField.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ColorPaletteEditor;
