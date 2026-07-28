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
    <div className="space-y-5">
      {/* Logo */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Image className="w-4 h-4" />
          Logo du commerce
        </Label>
        {formData.configuration.logo ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-accent/5">
            <img
              src={formData.configuration.logo}
              alt="Logo"
              className="w-10 h-10 rounded-lg object-cover border border-border shadow-sm"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Logo téléchargé</p>
              <p className="text-xs text-muted-foreground">Apparaîtra dans l'en-tête du POS</p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('logo', '')}
              className="text-sm text-red-600 hover:text-red-800 hover:underline"
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
              className="h-10 text-transparent file:hidden"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-accent/30 rounded-md border-2 border-dashed border-border pointer-events-none">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Glissez ou cliquez pour un logo</span>
              </div>
            </div>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">PNG ou JPG. Max 2MB. 128x128px idéal.</p>
      </div>

      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="businessName" className="text-sm font-medium">Nom du commerce *</Label>
        <Input
          id="businessName"
          value={formData.configuration.businessName || ''}
          onChange={(e) => handleChange('businessName', e.target.value)}
          placeholder="Ex: Restaurant Le Gourmet"
          className="h-10"
          required
        />
      </div>

      {/* App Title */}
      <div className="space-y-2">
        <Label htmlFor="appTitle" className="text-sm font-medium">Titre de l'application</Label>
        <Input
          id="appTitle"
          value={formData.configuration.appTitle || ''}
          onChange={(e) => handleChange('appTitle', e.target.value)}
          placeholder="Titre affiché dans l'onglet du navigateur"
          className="h-10"
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
