import { Wrench, Settings, Database, RefreshCw } from 'lucide-react';

export const POSTools = ({ config }: { config: any }) => {
  const tools = [
    { icon: Database, title: 'Base de données', desc: 'Sauvegarde et maintenance' },
    { icon: RefreshCw, title: 'Synchronisation', desc: 'Forcer la synchro des données' },
    { icon: Settings, title: 'Diagnostic', desc: 'Tester les connexions' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: config.textColor }}>
        <Wrench className="w-6 h-6" />Outils système
      </h1>
      <div className="grid grid-cols-2 gap-4">
        {tools.map((t) => (
          <div key={t.title} className="bg-white rounded-xl border p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <t.icon className="w-6 h-6" style={{ color: config.primaryColor }} />
              </div>
              <div>
                <p className="font-medium" style={{ color: config.textColor }}>{t.title}</p>
                <p className="text-sm text-gray-500">{t.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSTools;
