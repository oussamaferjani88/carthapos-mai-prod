import { ArrowLeftRight, Package } from 'lucide-react';

export const POSTransfers = ({ config }: { config: any }) => {
  const transfers = [
    { from: 'Magasin Central', to: 'Succursale Nord', items: 24, status: 'completed' },
    { from: 'Magasin Central', to: 'Succursale Sud', items: 12, status: 'pending' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: config.textColor }}>Transferts de stock</h1>
      <div className="space-y-3">
        {transfers.map((t, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{t.from}</span>
                <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{t.to}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {t.status === 'completed' ? 'Terminé' : 'En cours'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{t.items} articles</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSTransfers;
