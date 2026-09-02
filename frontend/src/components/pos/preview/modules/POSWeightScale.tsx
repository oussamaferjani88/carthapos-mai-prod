import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Scale, Check, X, TrendingUp } from 'lucide-react';

// Ported from admin/src/components/pos/preview/modules/POSWeightScale.jsx
// — real interactive state: clicking a product actually changes
// selectedProduct and the live-computed total, replacing the previous
// static "0.000 kg" display.
export const POSWeightScale = ({ config }: { config: any }) => {
  const [weight] = useState(0.525);
  const [isConnected] = useState(true);

  const products = [
    { name: 'Pommes Royal Gala', price: 2.50, unit: 'kg', category: 'Fruits' },
    { name: 'Tomates Grappe', price: 3.20, unit: 'kg', category: 'Légumes' },
    { name: 'Fromage Comté', price: 18.50, unit: 'kg', category: 'Fromage' },
    { name: 'Jambon Blanc', price: 12.00, unit: 'kg', category: 'Charcuterie' },
  ];

  const [selectedProduct, setSelectedProduct] = useState(products[0]);

  const styles = {
    card: {
      backgroundColor: config.cardColor || '#ffffff',
      borderRadius: config.borderRadius || '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
  };

  return (
    <div className="h-full flex flex-col space-y-4 py-6 bg-gray-50" style={{ fontFamily: config.fontFamily }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: config.textColor }}>
            <Scale className="h-8 w-8" />
            Balance Connectée
          </h1>
          <p className="text-gray-500">Pesée et prix au poids</p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold flex items-center gap-2">
              <Check className="h-4 w-4" />
              Balance Connectée
            </span>
          ) : (
            <span className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold flex items-center gap-2">
              <X className="h-4 w-4" />
              Balance Déconnectée
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Weight Display */}
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Affichage Poids
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-7xl font-bold mb-2" style={{ color: config.primaryColor }}>{weight.toFixed(3)}</div>
              <div className="text-2xl text-gray-500">kilogrammes</div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Prix unitaire:</span>
                <span className="text-xl font-bold" style={{ color: config.primaryColor }}>{selectedProduct.price.toFixed(2)}€/{selectedProduct.unit}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                <span className="text-gray-600 font-semibold">Prix Total:</span>
                <span className="text-3xl font-bold text-green-600">{(weight * selectedProduct.price).toFixed(2)}€</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" style={{ backgroundColor: config.primaryColor }}>
                <Check className="h-4 w-4 mr-2" />
                Valider
              </Button>
              <Button variant="outline" className="flex-1">Tare (0g)</Button>
            </div>
          </CardContent>
        </Card>

        {/* Product Selection */}
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Produits au Poids</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {products.map((product, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedProduct(product)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition ${selectedProduct.name === product.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-lg">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold" style={{ color: config.primaryColor }}>{product.price.toFixed(2)}€</div>
                      <div className="text-sm text-gray-500">par {product.unit}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <div className="font-semibold text-blue-900">Ventes Aujourd'hui</div>
                  <div className="text-sm text-blue-700 mt-1">12.5 kg vendus • 157.30€ de CA</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POSWeightScale;
