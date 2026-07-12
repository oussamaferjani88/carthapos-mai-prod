import { CalendarDays, Clock } from 'lucide-react';

export const POSRental = ({ config }: { config: any }) => {
  const rentals = [
    { item: 'Vélo', client: 'Jean Dupont', from: '2025-02-01', to: '2025-02-05', total: 40.00, status: 'active' },
    { item: 'Perceuse', client: 'Alice Martin', from: '2025-02-10', to: '2025-02-12', total: 25.00, status: 'active' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: config.textColor }}>Location</h1>
      <div className="space-y-3">
        {rentals.map((r, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{r.item}</h3>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{r.status === 'active' ? 'En cours' : 'Terminée'}</span>
            </div>
            <p className="text-sm text-gray-500">Client: {r.client}</p>
            <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
              <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />Du {r.from}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Au {r.to}</span>
            </div>
            <p className="text-sm font-semibold mt-2" style={{ color: config.primaryColor }}>{r.total.toFixed(2)}€</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSRental;
