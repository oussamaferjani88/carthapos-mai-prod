import { Users, Search, Phone, Mail } from 'lucide-react';

export const POSCustomers = ({ config }: { config: any }) => {
  const customers = [
    { name: 'Jean Dupont', email: 'jean@email.com', phone: '06 12 34 56 78', total: 1250.00 },
    { name: 'Marie Martin', email: 'marie@email.com', phone: '06 98 76 54 32', total: 890.50 },
    { name: 'Pierre Durant', email: 'pierre@email.com', phone: '06 45 67 89 01', total: 2340.00 },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: config.textColor }}>Clients</h1>
          <p className="text-sm" style={{ color: config.textMutedColor }}>{customers.length} clients enregistrés</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Rechercher un client..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {customers.map((c) => (
          <div key={c.name} className="bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{c.name.charAt(0)}</div>
                <div>
                  <p className="font-medium" style={{ color: config.textColor }}>{c.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: config.primaryColor }}>{c.total.toFixed(2)}€</p>
                <p className="text-xs text-gray-500">Total achats</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSCustomers;
