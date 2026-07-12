import { Hash, Package } from 'lucide-react';

export const POSSerialBatch = ({ config }: { config: any }) => {
  const items = [
    { product: 'Lait Lot A23', batch: 'A23-001', qty: 50, exp: '2025-06-15' },
    { product: 'Fromage Lot B45', batch: 'B45-002', qty: 30, exp: '2025-07-20' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: config.textColor }}>Séries et lots</h1>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-3 text-sm font-medium text-gray-600">Produit</th>
              <th className="text-left p-3 text-sm font-medium text-gray-600">Lot</th>
              <th className="text-right p-3 text-sm font-medium text-gray-600">Quantité</th>
              <th className="text-right p-3 text-sm font-medium text-gray-600">Expiration</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-medium">{item.product}</td>
                <td className="p-3 text-sm text-gray-500 font-mono">{item.batch}</td>
                <td className="p-3 text-sm text-right">{item.qty}</td>
                <td className="p-3 text-sm text-right text-gray-500">{item.exp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default POSSerialBatch;
