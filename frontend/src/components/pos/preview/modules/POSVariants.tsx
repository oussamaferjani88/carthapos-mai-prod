import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Shirt, Palette, Ruler, Plus, Edit } from 'lucide-react';

const COLOR_DOTS: Record<string, string> = {
  Blanc: '#ffffff',
  Noir: '#000000',
  Bleu: '#3b82f6',
  Rouge: '#ef4444',
  Vert: '#10b981',
};

// Ported from admin/src/components/pos/preview/modules/POSVariants.jsx —
// a toggleable "Nouvelle Variante" form and a full size/color/stock/SKU
// matrix per product with per-product stats, replacing the previous flat
// chip-list stub.
export const POSVariants = ({ config }: { config: any }) => {
  const [showAddVariant, setShowAddVariant] = useState(false);

  const products = [
    {
      id: 1,
      name: 'T-Shirt Classique',
      basePrice: 29.99,
      variants: [
        { size: 'S', color: 'Blanc', stock: 15, sku: 'TSH-WHT-S' },
        { size: 'S', color: 'Noir', stock: 12, sku: 'TSH-BLK-S' },
        { size: 'M', color: 'Blanc', stock: 20, sku: 'TSH-WHT-M' },
        { size: 'M', color: 'Noir', stock: 18, sku: 'TSH-BLK-M' },
        { size: 'L', color: 'Blanc', stock: 10, sku: 'TSH-WHT-L' },
        { size: 'L', color: 'Noir', stock: 8, sku: 'TSH-BLK-L' },
      ],
    },
    {
      id: 2,
      name: 'Jean Slim',
      basePrice: 79.99,
      variants: [
        { size: '28', color: 'Bleu', stock: 5, sku: 'JEA-BLU-28' },
        { size: '30', color: 'Bleu', stock: 8, sku: 'JEA-BLU-30' },
        { size: '32', color: 'Bleu', stock: 12, sku: 'JEA-BLU-32' },
        { size: '28', color: 'Noir', stock: 6, sku: 'JEA-BLK-28' },
        { size: '30', color: 'Noir', stock: 10, sku: 'JEA-BLK-30' },
        { size: '32', color: 'Noir', stock: 15, sku: 'JEA-BLK-32' },
      ],
    },
  ];

  const styles = {
    card: {
      backgroundColor: config.cardColor || '#ffffff',
      borderRadius: config.borderRadius || '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
  };

  const getColorDot = (color: string) => COLOR_DOTS[color] || '#gray';

  return (
    <div className="h-full flex flex-col space-y-4 py-6 bg-gray-50" style={{ fontFamily: config.fontFamily }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: config.textColor }}>
            <Shirt className="h-8 w-8" />
            Gestion des Variantes
          </h1>
          <p className="text-gray-500">Tailles, couleurs et styles de vos produits</p>
        </div>
        <Button onClick={() => setShowAddVariant(!showAddVariant)} style={{ backgroundColor: config.primaryColor }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Variante
        </Button>
      </div>

      {/* Add Variant Form */}
      {showAddVariant && (
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Ajouter des Variantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Produit de Base</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="p1">T-Shirt Classique</SelectItem>
                    <SelectItem value="p2">Jean Slim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Taille</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xs">XS</SelectItem>
                    <SelectItem value="s">S</SelectItem>
                    <SelectItem value="m">M</SelectItem>
                    <SelectItem value="l">L</SelectItem>
                    <SelectItem value="xl">XL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Couleur</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">Blanc</SelectItem>
                    <SelectItem value="black">Noir</SelectItem>
                    <SelectItem value="blue">Bleu</SelectItem>
                    <SelectItem value="red">Rouge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Stock Initial</label>
                <Input type="number" placeholder="0" min="0" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Prix Ajustement</label>
                <Input type="number" placeholder="0.00" step="0.01" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">SKU</label>
                <Input placeholder="Auto-généré" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button style={{ backgroundColor: config.primaryColor }}>Ajouter la Variante</Button>
              <Button variant="outline" onClick={() => setShowAddVariant(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products with Variants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {products.map((product) => (
          <Card key={product.id} style={styles.card}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shirt className="h-5 w-5" />
                    {product.name}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Prix de base: {product.basePrice.toFixed(2)}€</p>
                </div>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Variant Matrix */}
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-500 pb-2 border-b">
                  <div className="flex items-center gap-1"><Ruler className="h-3 w-3" />Taille</div>
                  <div className="flex items-center gap-1"><Palette className="h-3 w-3" />Couleur</div>
                  <div>Stock</div>
                  <div>SKU</div>
                </div>
                {product.variants.map((variant, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 text-sm py-2 hover:bg-gray-50 rounded px-2 -mx-2">
                    <div className="font-medium">{variant.size}</div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: getColorDot(variant.color), borderColor: variant.color === 'Blanc' ? '#d1d5db' : 'transparent' }} />
                      {variant.color}
                    </div>
                    <div className={`font-semibold ${variant.stock < 10 ? 'text-orange-600' : 'text-green-600'}`}>{variant.stock}</div>
                    <div className="text-xs text-gray-500 font-mono">{variant.sku}</div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-2xl font-bold" style={{ color: config.primaryColor }}>{product.variants.length}</div>
                  <div className="text-xs text-gray-500">Variantes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{product.variants.reduce((sum, v) => sum + v.stock, 0)}</div>
                  <div className="text-xs text-gray-500">Stock Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{product.variants.filter((v) => v.stock < 10).length}</div>
                  <div className="text-xs text-gray-500">Stock Faible</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default POSVariants;
