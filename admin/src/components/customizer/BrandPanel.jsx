import React from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Upload, Image } from 'lucide-react';

const BrandPanel = ({ formData, setFormData }) => {
  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      configuration: { ...formData.configuration, [field]: value }
    });
  };

  return (
    <div className="space-y-4">
      {/* Logo */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Image className="w-3.5 h-3.5 text-muted-foreground" />
          Logo du commerce
        </Label>
        {formData.configuration.logo ? (
          <div className="flex items-center gap-2.5 p-2 rounded-md border border-border bg-white">
            <img
              src={formData.configuration.logo}
              alt="Logo"
              className="w-8 h-8 rounded-md object-cover border border-border shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Logo téléchargé</p>
              <p className="text-[11px] text-muted-foreground">Apparaîtra dans l'en-tête du POS</p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('logo', '')}
              className="text-[11px] text-red-600 hover:text-red-800 hover:underline shrink-0"
            >
              Supprimer
            </button>
          </div>
        ) : (
          <div className="relative">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 2 * 1024 * 1024) {
                    alert('Taille maximale: 2MB');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => handleChange('logo', ev.target.result);
                  reader.readAsDataURL(file);
                }
              }}
              className="h-9 text-transparent file:hidden"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-accent/30 rounded-md border-2 border-dashed border-border pointer-events-none">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Upload className="w-3.5 h-3.5" />
                <span className="text-xs">Cliquez pour choisir un logo</span>
              </div>
            </div>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">PNG ou JPG. Max 2MB. 128x128px idéal.</p>
      </div>

      {/* Business Name */}
      <div className="space-y-1.5">
        <Label htmlFor="businessName" className="text-xs font-medium">Nom du commerce *</Label>
        <Input
          id="businessName"
          value={formData.configuration.businessName || ''}
          onChange={(e) => handleChange('businessName', e.target.value)}
          placeholder="Ex: Restaurant Le Gourmet"
          className="h-9"
          required
        />
      </div>

      {/* App Title */}
      <div className="space-y-1.5">
        <Label htmlFor="appTitle" className="text-xs font-medium">Titre de l'application</Label>
        <Input
          id="appTitle"
          value={formData.configuration.appTitle || ''}
          onChange={(e) => handleChange('appTitle', e.target.value)}
          placeholder="Titre affiché dans l'onglet du navigateur"
          className="h-9"
        />
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Devise</Label>
        <Select
          value={formData.configuration.currency || 'TND'}
          onValueChange={(value) => handleChange('currency', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">Euro (€)</SelectItem>
            <SelectItem value="USD">Dollar ($)</SelectItem>
            <SelectItem value="GBP">Livre (£)</SelectItem>
            <SelectItem value="CAD">Dollar Canadien (C$)</SelectItem>
            <SelectItem value="CHF">Franc Suisse (CHF)</SelectItem>
            <SelectItem value="MAD">Dirham (DH)</SelectItem>
            <SelectItem value="TND">Dinar (TND)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Langue</Label>
        <Select
          value={formData.configuration.language || 'fr'}
          onValueChange={(value) => handleChange('language', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="de">Deutsch</SelectItem>
            <SelectItem value="ar">العربية</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default BrandPanel;
