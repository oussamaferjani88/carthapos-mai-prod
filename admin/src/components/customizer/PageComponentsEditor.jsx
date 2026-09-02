import React from 'react';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { ShoppingCart } from 'lucide-react';

/**
 * Per-page component layout (visibility / position / size / density).
 * Previously the 5th tab inside LayoutEditor — split out into its own
 * customizer section so the "Mise en page" tab bar matches the client's
 * exactly (4 tabs). Reads/writes `configuration.pageLayout`, consumed by
 * the Sales preview module (POSSales.jsx).
 */
const PageComponentsEditor = ({ formData, setFormData }) => {
  const handlePageComponentChange = (pageId, componentId, property, value) => {
    setFormData({
      ...formData,
      configuration: {
        ...formData.configuration,
        pageLayout: {
          ...formData.configuration.pageLayout,
          [pageId]: {
            ...formData.configuration.pageLayout?.[pageId],
            [componentId]: {
              ...formData.configuration.pageLayout?.[pageId]?.[componentId],
              [property]: value,
            },
          },
        },
      },
    });
  };

  const renderSelect = ({ value, onValueChange, options }) => (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 w-full text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderToggle = ({ label, description, checked, onCheckedChange }) => (
    <div className="flex items-center justify-between px-2.5 py-2 rounded-md border border-border">
      <div className="min-w-0">
        <Label className="text-xs font-medium">{label}</Label>
        <p className="text-[11px] text-muted-foreground leading-tight">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );

  const renderGroup = ({ title, icon, children }) => (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="flex items-center gap-1.5 px-2.5 py-2 bg-accent/40">
        {icon}
        <span className="text-xs font-medium">{title}</span>
      </div>
      <div className="p-2.5 space-y-2.5">{children}</div>
    </div>
  );

  const cart = formData.configuration.pageLayout?.sales?.cart || {};

  return (
    <div className="space-y-4">
      {renderGroup({
        title: 'Ventes — Panier',
        icon: <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />,
        children: (
          <>
            {renderToggle({
              label: 'Afficher le panier',
              description: 'Masquer complètement le panier sur la page Ventes',
              checked: cart.visible !== false,
              onCheckedChange: (checked) => handlePageComponentChange('sales', 'cart', 'visible', checked),
            })}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Position</Label>
              {renderSelect({
                value: cart.position || 'left',
                onValueChange: (value) => handlePageComponentChange('sales', 'cart', 'position', value),
                options: [
                  { value: 'left', label: 'Gauche' },
                  { value: 'right', label: 'Droite' },
                  { value: 'top', label: 'Haut' },
                  { value: 'bottom', label: 'Bas' },
                ],
              })}
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Taille</Label>
              {renderSelect({
                value: cart.size || 'medium',
                onValueChange: (value) => handlePageComponentChange('sales', 'cart', 'size', value),
                options: [
                  { value: 'small', label: 'Petit' },
                  { value: 'medium', label: 'Moyen' },
                  { value: 'large', label: 'Grand' },
                ],
              })}
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Densité</Label>
              {renderSelect({
                value: cart.density || 'normal',
                onValueChange: (value) => handlePageComponentChange('sales', 'cart', 'density', value),
                options: [
                  { value: 'compact', label: 'Compacte' },
                  { value: 'normal', label: 'Normale' },
                  { value: 'spacious', label: 'Spacieuse' },
                ],
              })}
            </div>
          </>
        ),
      })}
      <p className="text-[11px] text-muted-foreground px-1">
        D&apos;autres pages (Tableau de bord, Produits, Clients…) seront ajoutées ici dans une prochaine itération.
      </p>
    </div>
  );
};

export default PageComponentsEditor;
