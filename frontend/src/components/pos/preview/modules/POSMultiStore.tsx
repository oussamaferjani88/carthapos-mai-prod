import { Store, MapPin } from 'lucide-react';

export const POSMultiStore = ({ config }: { config: any }) => {
  const stores = [
    { name: 'Magasin Central', address: '123 Rue de Paris', stock: 4500, active: true },
    { name: 'Succursale Nord', address: '456 Avenue des Lilas', stock: 2100, active: true },
    { name: 'Succursale Sud', address: '789 Boulevard Maritime', stock: 1800, active: false },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: config.textColor }}>Multi-magasins</h1>
      <div className="grid grid-cols-2 gap-4">
        {stores.map((s) => (
          <div key={s.name} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold" style={{ color: config.textColor }}>{s.name}</h3>
              <span className={`w-2 h-2 rounded-full ${s.active ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{s.address}</p>
            <p className="text-sm text-gray-500 mt-1">{s.stock.toLocaleString()} articles en stock</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSMultiStore;
