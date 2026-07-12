import { Clock, CalendarDays, DollarSign } from 'lucide-react';

export const POSLayaway = ({ config }: { config: any }) => {
  const reservations = [
    { client: 'Marie Martin', product: 'Sac à main', total: 89.00, paid: 30.00, date: '2025-02-20' },
    { client: 'Pierre Durand', product: 'Montre', total: 150.00, paid: 50.00, date: '2025-02-18' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: config.textColor }}>Réservations / Acomptes</h1>
      <div className="space-y-3">
        {reservations.map((r, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium">{r.client}</p>
              <span className="text-xs text-gray-400">{r.date}</span>
            </div>
            <p className="text-sm text-gray-500 mb-2">{r.product}</p>
            <div className="flex items-center justify-between text-sm">
              <span>Total: <strong>{r.total.toFixed(2)}€</strong></span>
              <span>Payé: <strong className="text-green-600">{r.paid.toFixed(2)}€</strong></span>
              <span>Reste: <strong className="text-orange-600">{(r.total - r.paid).toFixed(2)}€</strong></span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full mt-2">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${(r.paid / r.total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSLayaway;
