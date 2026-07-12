import { Tag, Plus, Percent } from 'lucide-react';

export const POSPromotions = ({ config }: { config: any }) => {
  const promos = [
    { name: '-20% Café', discount: 20, type: 'percent', valid: true },
    { name: '1 Acheté = 1 Gratuit', discount: 100, type: 'bogo', valid: true },
    { name: '-5€ sur 20€', discount: 5, type: 'fixed', valid: false },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: config.textColor }}>Promotions</h1>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white" style={{ backgroundColor: config.primaryColor }}>
          <Plus className="w-4 h-4" />Nouvelle promotion
        </button>
      </div>
      <div className="space-y-3">
        {promos.map((p) => (
          <div key={p.name} className="bg-white rounded-xl border p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                <Percent className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <p className="font-medium" style={{ color: config.textColor }}>{p.name}</p>
                <p className="text-sm text-gray-500">{p.type === 'percent' ? `${p.discount}% de réduction` : p.type === 'bogo' ? 'Acheté = Gratuit' : `${p.discount}€ de réduction`}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs ${p.valid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {p.valid ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSPromotions;
