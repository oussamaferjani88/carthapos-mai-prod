import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Package, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En Cours' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'En Retard' },
  returned: { bg: 'bg-green-100', text: 'text-green-700', label: 'Retourné' },
};

// Ported from admin/src/components/pos/preview/modules/POSRental.jsx —
// a stat-card row, a second inventory-availability panel, and a
// "Marquer Retourné" action, replacing the previous flat 2-item list.
export const POSRental = ({ config }: { config: any }) => {
  const rentals = [
    { id: 'LOC-001', customer: 'Société XYZ', item: 'Échafaudage 10m', startDate: '10/01/2024', endDate: '17/01/2024', dailyRate: 45.00, days: 7, status: 'active', condition: 'good' },
    { id: 'LOC-002', customer: 'Jean Dupont', item: 'Ponceuse Électrique', startDate: '14/01/2024', endDate: '16/01/2024', dailyRate: 15.00, days: 2, status: 'active', condition: 'good' },
    { id: 'LOC-003', customer: 'Marie Bernard', item: 'Nettoyeur Haute Pression', startDate: '08/01/2024', endDate: '15/01/2024', dailyRate: 25.00, days: 7, status: 'overdue', condition: 'good' },
    { id: 'LOC-004', customer: 'Pierre Martin', item: 'Tente 6 Personnes', startDate: '05/01/2024', endDate: '12/01/2024', dailyRate: 30.00, days: 7, status: 'returned', condition: 'damaged' },
  ];

  const inventory = [
    { name: 'Échafaudage 10m', available: 2, total: 5, rate: 45.00 },
    { name: 'Ponceuse Électrique', available: 5, total: 8, rate: 15.00 },
    { name: 'Nettoyeur HP', available: 0, total: 3, rate: 25.00 },
    { name: 'Tente 6P', available: 8, total: 10, rate: 30.00 },
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
            <Package className="h-8 w-8" />
            Gestion de Location
          </h1>
          <p className="text-gray-500">Articles loués et disponibilité</p>
        </div>
        <Button style={{ backgroundColor: config.primaryColor }}>+ Nouvelle Location</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Locations Actives</p><p className="text-2xl font-bold" style={{ color: config.primaryColor }}>2</p></div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">CA Location</p><p className="text-2xl font-bold text-green-600">1,045€</p></div>
              <CheckCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">En Retard</p><p className="text-2xl font-bold text-red-600">1</p></div>
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Articles Disponibles</p><p className="text-2xl font-bold text-blue-600">15/26</p></div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Rentals */}
        <Card style={styles.card} className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Locations en Cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rentals.map((rental) => (
                <div key={rental.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold" style={{ color: config.primaryColor }}>{rental.id}</span>
                        {getStatusBadge(rental.status)}
                        {rental.condition === 'damaged' && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Endommagé</span>
                        )}
                      </div>
                      <div className="font-semibold text-lg">{rental.customer}</div>
                      <div className="text-sm text-gray-500">{rental.item}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold" style={{ color: config.primaryColor }}>{(rental.dailyRate * rental.days).toFixed(2)}€</div>
                      <div className="text-xs text-gray-500">{rental.dailyRate}€/jour</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1"><Calendar className="h-4 w-4" />{rental.startDate}</div>
                    <span>→</span>
                    <div className="flex items-center gap-1"><Calendar className="h-4 w-4" />{rental.endDate}</div>
                    <span className="ml-auto font-semibold">{rental.days} jours</span>
                  </div>

                  {rental.status === 'active' && (
                    <Button size="sm" className="mt-3" style={{ backgroundColor: config.primaryColor }}>Marquer Retourné</Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Inventaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inventory.map((item, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="font-semibold mb-2">{item.name}</div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Disponible</span>
                    <span className={`font-bold ${item.available === 0 ? 'text-red-600' : 'text-green-600'}`}>{item.available}/{item.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="h-2 rounded-full bg-green-500" style={{ width: `${(item.available / item.total) * 100}%` }} />
                  </div>
                  <div className="text-sm font-semibold" style={{ color: config.primaryColor }}>{item.rate.toFixed(2)}€/jour</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POSRental;
