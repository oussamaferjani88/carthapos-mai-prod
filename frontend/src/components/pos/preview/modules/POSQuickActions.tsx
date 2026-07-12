import { Zap, DollarSign, Printer, RotateCcw, Search } from 'lucide-react';

export const POSQuickActions = ({ config }: { config: any }) => {
  const actions = [
    { icon: DollarSign, label: 'Vente rapide', color: 'bg-blue-500' },
    { icon: Printer, label: 'Ticket', color: 'bg-green-500' },
    { icon: RotateCcw, label: 'Retour', color: 'bg-orange-500' },
    { icon: Search, label: 'Recherche', color: 'bg-purple-500' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: config.textColor }}>
        <Zap className="w-6 h-6" />Actions rapides
      </h1>
      <div className="grid grid-cols-4 gap-4">
        {actions.map((a) => (
          <button key={a.label} className={`${a.color} text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105`}>
            <a.icon className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm font-medium">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default POSQuickActions;
