import { MenuSquare, Plus, Edit3 } from 'lucide-react';

export const POSMenuManagement = ({ config }: { config: any }) => {
  const menus = [
    { name: 'Menu Déjeuner', items: 5, price: 12.90, active: true },
    { name: 'Menu Enfant', items: 3, price: 7.90, active: true },
    { name: 'Menu Dîner', items: 6, price: 18.90, active: false },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: config.textColor }}>Gestion des menus</h1>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white" style={{ backgroundColor: config.primaryColor }}>
          <Plus className="w-4 h-4" />Nouveau menu
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {menus.map((m) => (
          <div key={m.name} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold" style={{ color: config.textColor }}>{m.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs ${m.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {m.active ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-2">{m.items} articles</p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold" style={{ color: config.primaryColor }}>{m.price.toFixed(2)}€</span>
              <button className="p-2 text-gray-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSMenuManagement;
