import { Utensils } from 'lucide-react';

export const POSTables = ({ config }: { config: any }) => {
  const tables = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1, seats: Math.floor(Math.random() * 6) + 2,
    status: ['free', 'occupied', 'reserved'][Math.floor(Math.random() * 3)],
    server: ['Alice', 'Bob', 'Carlos'][Math.floor(Math.random() * 3)],
    total: Math.floor(Math.random() * 120) + 20,
  }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: config.textColor }}>Gestion des tables</h1>
      <div className="grid grid-cols-4 gap-4">
        {tables.map((t) => (
          <div key={t.id} className={`rounded-xl border p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${t.status === 'occupied' ? 'border-l-4 border-l-green-500' : t.status === 'reserved' ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-gray-300'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold" style={{ color: config.textColor }}>Table {t.id}</span>
              <Utensils className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">{t.seats} places</p>
            {t.status === 'occupied' && <p className="text-sm font-medium text-green-600 mt-1">Occupée - {t.total}€</p>}
            {t.status === 'reserved' && <p className="text-sm font-medium text-orange-600 mt-1">Réservée</p>}
            {t.status === 'free' && <p className="text-sm font-medium text-gray-400 mt-1">Libre</p>}
            {t.status !== 'free' && <p className="text-xs text-gray-400 mt-1">Service: {t.server}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSTables;
