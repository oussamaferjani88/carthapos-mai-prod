import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Hash, Package, Calendar, AlertTriangle } from 'lucide-react';

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  vendu: { bg: 'bg-green-100', text: 'text-green-700', label: 'Vendu' },
  stock: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En Stock' },
  retour: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Retour' },
};

const BATCH_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  ok: { bg: 'bg-green-100', text: 'text-green-700', label: 'OK' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Attention' },
  urgent: { bg: 'bg-red-100', text: 'text-red-700', label: 'Urgent' },
};

// Ported from admin/src/components/pos/preview/modules/POSSerialBatch.jsx
// — adds a stat-card row and a second panel (batch/lot tracking with
// expiry-urgency coloring) alongside the serial-number list, replacing
// the previous single flat table.
export const POSSerialBatch = ({ config }: { config: any }) => {
  const serialNumbers = [
    { serial: 'SN-2024-001234', product: 'iPhone 15 Pro', status: 'vendu', date: '15/01/2024', customer: 'Client A' },
    { serial: 'SN-2024-001235', product: 'iPhone 15 Pro', status: 'stock', date: '10/01/2024', customer: '-' },
    { serial: 'SN-2024-001236', product: 'MacBook Pro 16"', status: 'vendu', date: '12/01/2024', customer: 'Client B' },
  ];

  const batches = [
    { lot: 'LOT-2024-A123', product: 'Yaourt Nature Bio', quantity: 48, expiry: '25/01/2024', status: 'ok' },
    { lot: 'LOT-2024-A124', product: 'Lait Frais', quantity: 24, expiry: '18/01/2024', status: 'warning' },
    { lot: 'LOT-2024-A125', product: 'Fromage Blanc', quantity: 12, expiry: '16/01/2024', status: 'urgent' },
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

  const getBatchStatus = (status: string) => {
    const s = BATCH_BADGES[status];
    return <span className={`px-3 py-1 rounded-full text-xs ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  return (
    <div className="h-full flex flex-col space-y-4 py-6 bg-gray-50" style={{ fontFamily: config.fontFamily }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: config.textColor }}>
            <Hash className="h-8 w-8" />
            Numéros de Série & Lots
          </h1>
          <p className="text-gray-500">Traçabilité et gestion des stocks</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Séries Actives</p><p className="text-2xl font-bold" style={{ color: config.primaryColor }}>45</p></div>
              <Hash className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Lots en Stock</p><p className="text-2xl font-bold text-blue-600">12</p></div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">À Expirer</p><p className="text-2xl font-bold text-orange-600">3</p></div>
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card style={styles.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Alertes</p><p className="text-2xl font-bold text-red-600">1</p></div>
              <AlertTriangle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Serial Numbers */}
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Numéros de Série
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {serialNumbers.map((item, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-mono text-sm font-semibold" style={{ color: config.primaryColor }}>{item.serial}</div>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="text-sm text-gray-600">{item.product}</div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>{item.date}</span>
                    <span>{item.customer}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Batch/Lot Tracking */}
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Numéros de Lot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {batches.map((batch, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-mono text-sm font-semibold" style={{ color: config.primaryColor }}>{batch.lot}</div>
                    {getBatchStatus(batch.status)}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{batch.product}</div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Qté: {batch.quantity}</span>
                    <span className={`font-semibold ${batch.status === 'urgent' ? 'text-red-600' : batch.status === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                      Exp: {batch.expiry}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POSSerialBatch;
