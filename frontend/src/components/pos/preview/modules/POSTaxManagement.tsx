import { Receipt, Percent, Plus } from 'lucide-react';

export const POSTaxManagement = ({ config }: { config: any }) => {
  const taxes = [
    { name: 'TVA Standard', rate: 20, type: 'TVA', apply: 'Tous les produits' },
    { name: 'TVA Réduite', rate: 10, type: 'TVA', apply: 'Alimentation' },
    { name: 'TVA Super Réduite', rate: 5.5, type: 'TVA', apply: 'Première nécessité' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: config.textColor }}>Gestion fiscale</h1>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white" style={{ backgroundColor: config.primaryColor }}>
          <Plus className="w-4 h-4" />Nouveau taux
        </button>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-3 text-sm font-medium text-gray-600">Taxe</th>
              <th className="text-left p-3 text-sm font-medium text-gray-600">Taux</th>
              <th className="text-left p-3 text-sm font-medium text-gray-600">Type</th>
              <th className="text-left p-3 text-sm font-medium text-gray-600">Application</th>
            </tr>
          </thead>
          <tbody>
            {taxes.map((t) => (
              <tr key={t.name} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-medium">{t.name}</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-mono">{t.rate}%</span></td>
                <td className="p-3 text-sm text-gray-500">{t.type}</td>
                <td className="p-3 text-sm text-gray-500">{t.apply}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default POSTaxManagement;
