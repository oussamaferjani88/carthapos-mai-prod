import { CreditCard, DollarSign, Smartphone, Wallet } from 'lucide-react';

export const POSSplitPayments = ({ config }: { config: any }) => {
  const methods = [
    { icon: DollarSign, name: 'Espèces', amount: 8.44 },
    { icon: CreditCard, name: 'Carte bancaire', amount: 8.44 },
    { icon: Smartphone, name: 'Mobile', amount: 0 },
    { icon: Wallet, name: 'Ticket restaurant', amount: 0 },
  ];

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: config.textColor }}>Paiement fractionné</h1>
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="text-center mb-4">
          <p className="text-sm text-gray-500">Montant total</p>
          <p className="text-3xl font-bold" style={{ color: config.primaryColor }}>16.88€</p>
        </div>
        <div className="space-y-2">
          {methods.map((m) => (
            <div key={m.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer">
              <div className="flex items-center gap-2">
                <m.icon className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium">{m.name}</span>
              </div>
              <span className="text-sm font-semibold">{m.amount > 0 ? `${m.amount.toFixed(2)}€` : '—'}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-green-50 rounded-lg text-center">
          <p className="text-sm text-green-700">Reste à payer: 0.00€ ✓</p>
        </div>
      </div>
    </div>
  );
};

export default POSSplitPayments;
