import { BarChart3, Download, Calendar } from 'lucide-react';

export const POSReports = ({ config }: { config: any }) => {
  const reports = [
    { title: 'Rapport de ventes', period: 'Aujourd\'hui', amount: '1,250€', growth: '+12%' },
    { title: 'Rapport de ventes', period: 'Cette semaine', amount: '8,450€', growth: '+8%' },
    { title: 'Rapport de ventes', period: 'Ce mois', amount: '32,150€', growth: '+15%' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: config.textColor }}>Rapports</h1>
          <p className="text-sm" style={{ color: config.textMutedColor }}>Analysez vos performances</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
          <Download className="w-4 h-4" />Exporter
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {reports.map((r, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">{r.period}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: config.textColor }}>{r.amount}</p>
            <p className="text-sm text-green-600">{r.growth}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <h3 className="font-semibold mb-4">Graphique des ventes</h3>
        <div className="flex items-end gap-2 h-40">
          {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-lg transition-all" style={{ height: `${h}%`, backgroundColor: config.primaryColor }} />
              <span className="text-xs text-gray-500">J{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default POSReports;
