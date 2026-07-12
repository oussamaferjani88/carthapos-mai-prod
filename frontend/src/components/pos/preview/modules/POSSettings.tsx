import { Settings, Save, Bell, Shield, Printer } from 'lucide-react';

export const POSSettings = ({ config }: { config: any }) => {
  const sections = [
    { icon: Printer, title: 'Impression', desc: 'Configuration de l\'imprimante et des tickets' },
    { icon: Bell, title: 'Notifications', desc: 'Gérer les alertes et notifications' },
    { icon: Shield, title: 'Sécurité', desc: 'Paramètres de sécurité et permissions' },
    { icon: Save, title: 'Sauvegarde', desc: 'Sauvegarde et restauration des données' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: config.textColor }}>Paramètres</h1>
      <div className="grid grid-cols-2 gap-4">
        {sections.map((s) => (
          <div key={s.title} className="bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <s.icon className="w-6 h-6" style={{ color: config.primaryColor }} />
              </div>
              <div>
                <h3 className="font-medium" style={{ color: config.textColor }}>{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSSettings;
