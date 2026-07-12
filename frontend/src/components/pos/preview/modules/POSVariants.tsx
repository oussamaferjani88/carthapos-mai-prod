import { Palette, Plus } from 'lucide-react';

export const POSVariants = ({ config }: { config: any }) => {
  const variants = [
    { product: 'T-shirt', variants: ['S', 'M', 'L', 'XL'], count: 4 },
    { product: 'Café', variants: ['Petit', 'Moyen', 'Grand'], count: 3 },
    { product: 'Chaussures', variants: ['38', '39', '40', '41', '42'], count: 5 },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: config.textColor }}>Variantes de produits</h1>
      <div className="space-y-3">
        {variants.map((v) => (
          <div key={v.product} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium" style={{ color: config.textColor }}>{v.product}</p>
              <span className="text-sm text-gray-500">{v.count} variantes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {v.variants.map((varName) => (
                <span key={varName} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">{varName}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSVariants;
