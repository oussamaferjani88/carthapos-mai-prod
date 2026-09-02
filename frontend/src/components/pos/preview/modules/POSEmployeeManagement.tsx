import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Users, Calendar, DollarSign, Clock, Award, UserCheck } from 'lucide-react';

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'En Service' },
  off: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Absent' },
  break: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pause' },
};

// Ported from admin/src/components/pos/preview/modules/POSEmployeeManagement.jsx
// — a stat-card row and per-employee sales/hours/commission breakdown with
// Horaires/Primes actions, replacing the previous flat online/offline list.
export const POSEmployeeManagement = ({ config }: { config: any }) => {
  const employees = [
    { id: 1, name: 'Marie Dupont', role: 'Caissière', status: 'active', schedule: 'Temps plein', sales: '4,234€', hours: 38, commission: 124.50 },
    { id: 2, name: 'Jean Martin', role: 'Vendeur', status: 'active', schedule: 'Temps plein', sales: '5,678€', hours: 40, commission: 187.20 },
    { id: 3, name: 'Sophie Bernard', role: 'Manager', status: 'off', schedule: 'Temps plein', sales: '3,456€', hours: 0, commission: 95.30 },
    { id: 4, name: 'Luc Petit', role: 'Caissier', status: 'break', schedule: 'Temps partiel', sales: '2,123€', hours: 24, commission: 58.40 },
  ];

  const styles = {
    card: {
      backgroundColor: config.cardColor || '#ffffff',
      borderRadius: config.borderRadius || '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
  };

  const getStatusBadge = (status: string) => {
    const s = STATUS_BADGES[status];
    return <span className={`px-3 py-1 rounded-full text-xs ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  return (
    <div className="h-full flex flex-col space-y-4 py-6 bg-gray-50" style={{ fontFamily: config.fontFamily }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: config.textColor }}>
            <Users className="h-8 w-8" />
            Gestion du Personnel
          </h1>
          <p className="text-gray-500">Équipe, horaires et commissions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Total Employés</p><p className="text-2xl font-bold" style={{ color: config.primaryColor }}>4</p></div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">En Service</p><p className="text-2xl font-bold text-green-600">2</p></div>
              <UserCheck className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Heures Totales</p><p className="text-2xl font-bold text-blue-600">102</p></div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Commissions</p><p className="text-2xl font-bold text-purple-600">465.40€</p></div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card style={styles.card} className="flex-1">
        <CardHeader>
          <CardTitle>Liste du Personnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {employees.map((employee) => (
              <div key={employee.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {employee.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{employee.name}</div>
                      <div className="text-sm text-gray-500">{employee.role} - {employee.schedule}</div>
                    </div>
                  </div>
                  {getStatusBadge(employee.status)}
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div><div className="text-gray-500 text-xs mb-1">Ventes</div><div className="font-semibold text-green-600">{employee.sales}</div></div>
                  <div><div className="text-gray-500 text-xs mb-1">Heures Semaine</div><div className="font-semibold text-blue-600">{employee.hours}h</div></div>
                  <div><div className="text-gray-500 text-xs mb-1">Commissions</div><div className="font-semibold text-purple-600">{employee.commission.toFixed(2)}€</div></div>
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="outline"><Calendar className="h-4 w-4 mr-1" />Horaires</Button>
                    <Button size="sm" variant="outline"><Award className="h-4 w-4 mr-1" />Primes</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default POSEmployeeManagement;
