import { UserCheck, Phone, Mail, Clock } from 'lucide-react';

export const POSEmployeeManagement = ({ config }: { config: any }) => {
  const employees = [
    { name: 'Alice Martin', role: 'Caissier', phone: '06 11 22 33 44', email: 'alice@email.com', active: true },
    { name: 'Bob Durand', role: 'Serveur', phone: '06 55 66 77 88', email: 'bob@email.com', active: true },
    { name: 'Carlos Ruiz', role: 'Manager', phone: '06 99 88 77 66', email: 'carlos@email.com', active: true },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: config.textColor }}>Gestion du personnel</h1>
      <div className="space-y-3">
        {employees.map((e) => (
          <div key={e.name} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">{e.name.charAt(0)}</div>
                <div>
                  <p className="font-medium" style={{ color: config.textColor }}>{e.name}</p>
                  <p className="text-xs text-gray-500">{e.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${e.active ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-400">{e.active ? 'En ligne' : 'Hors ligne'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSEmployeeManagement;
