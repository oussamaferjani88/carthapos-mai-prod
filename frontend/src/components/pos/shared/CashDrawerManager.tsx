import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Vault, Calculator, TrendingUp, TrendingDown, Printer, CheckCircle } from 'lucide-react';

interface CashDrawerManagerProps {
  onDrawerOpen?: () => void;
  onCashCount?: (total: number) => void;
  drawerStatus?: string;
}

export const CashDrawerManager = ({ onDrawerOpen, onCashCount, drawerStatus = 'closed' }: CashDrawerManagerProps) => {
  const [isCountMode, setIsCountMode] = useState(false);
  const [cashCount, setCashCount] = useState({
    bills: { 50: 0, 20: 0, 10: 0, 5: 0 },
    coins: { 2: 0, 1: 0, 0.5: 0, 0.2: 0, 0.1: 0, 0.05: 0, 0.02: 0, 0.01: 0 },
  });

  const calculateTotal = () => {
    const billsTotal = Object.entries(cashCount.bills).reduce((sum, [value, count]) => sum + (parseFloat(value) * count), 0);
    const coinsTotal = Object.entries(cashCount.coins).reduce((sum, [value, count]) => sum + (parseFloat(value) * count), 0);
    return billsTotal + coinsTotal;
  };

  const updateCount = (type: 'bills' | 'coins', denomination: string, increment: number) => {
    setCashCount(prev => ({
      ...prev,
      [type]: { ...prev[type], [denomination]: Math.max(0, prev[type][denomination as keyof typeof prev['bills']] + increment) },
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Vault className="w-5 h-5" />💰 Tiroir-Caisse
          <span className={`ml-auto px-2 py-1 rounded text-sm ${drawerStatus === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {drawerStatus === 'open' ? 'Ouvert' : 'Fermé'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onDrawerOpen?.()} className="flex items-center justify-center gap-2 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all">
            <Vault className="w-4 h-4" />Ouvrir Tiroir
          </button>
          <button onClick={() => setIsCountMode(!isCountMode)} className="flex items-center justify-center gap-2 p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all">
            <Calculator className="w-4 h-4" />Compter
          </button>
        </div>

        {isCountMode && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-bold mb-3 flex items-center gap-2"><Calculator className="w-4 h-4" />Comptage de Caisse</h4>
            <div className="mb-4">
              <h5 className="font-medium mb-2">💶 Billets</h5>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(cashCount.bills).map(([value, count]) => (
                  <div key={value} className="flex items-center gap-2 bg-white p-2 rounded">
                    <span className="w-8 text-sm">{value}€</span>
                    <button onClick={() => updateCount('bills', value, -1)} className="w-6 h-6 bg-red-500 text-white rounded text-xs hover:bg-red-600">-</button>
                    <span className="w-8 text-center font-mono">{count}</span>
                    <button onClick={() => updateCount('bills', value, 1)} className="w-6 h-6 bg-green-500 text-white rounded text-xs hover:bg-green-600">+</button>
                    <span className="text-sm text-right w-12">{(parseFloat(value) * count).toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <h5 className="font-medium mb-2">🪙 Pièces</h5>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(cashCount.coins).map(([value, count]) => (
                  <div key={value} className="flex items-center gap-1 bg-white p-1 rounded text-sm">
                    <span className="w-8 text-xs">{parseFloat(value).toFixed(2)}€</span>
                    <button onClick={() => updateCount('coins', value, -1)} className="w-5 h-5 bg-red-500 text-white rounded text-xs hover:bg-red-600">-</button>
                    <span className="w-6 text-center font-mono text-xs">{count}</span>
                    <button onClick={() => updateCount('coins', value, 1)} className="w-5 h-5 bg-green-500 text-white rounded text-xs hover:bg-green-600">+</button>
                    <span className="text-xs text-right w-10">{(parseFloat(value) * count).toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-bold">Total en Caisse:</span>
                <span className="font-bold text-xl text-blue-800">{calculateTotal().toFixed(2)}€</span>
              </div>
            </div>
            <button onClick={() => { onCashCount?.(calculateTotal()); setIsCountMode(false); }} className="w-full mt-3 p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />Valider Comptage
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button className="flex flex-col items-center gap-1 p-2 bg-gray-100 hover:bg-gray-200 rounded text-xs"><TrendingUp className="w-4 h-4 text-green-600" />Entrée</button>
          <button className="flex flex-col items-center gap-1 p-2 bg-gray-100 hover:bg-gray-200 rounded text-xs"><TrendingDown className="w-4 h-4 text-red-600" />Sortie</button>
          <button className="flex flex-col items-center gap-1 p-2 bg-gray-100 hover:bg-gray-200 rounded text-xs"><Printer className="w-4 h-4 text-blue-600" />Rapport</button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CashDrawerManager;
