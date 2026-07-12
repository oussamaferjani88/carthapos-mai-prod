import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Delete, Check, Plus, Minus, X, Divide } from 'lucide-react';

interface NumericKeypadProps {
  onNumberClick?: (num: string) => void;
  onOperationClick?: (op: string) => void;
  onClear?: () => void;
  onEnter?: () => void;
  currentValue?: string;
}

export const NumericKeypad = ({ onNumberClick, onOperationClick, onClear, onEnter, currentValue = '' }: NumericKeypadProps) => {
  const numbers = [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], ['0', '.', 'C']];
  const operations = [
    { icon: Plus, label: '+', value: '+' },
    { icon: Minus, label: '-', value: '-' },
    { icon: X, label: '×', value: '*' },
    { icon: Divide, label: '÷', value: '/' },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          🔢 Clavier Numérique
          <div className="text-right bg-gray-100 px-3 py-1 rounded text-xl font-mono min-w-[120px]">{currentValue || '0'}</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {numbers.flat().map((num) => (
            <button key={num}
              onClick={() => { if (num === 'C') onClear?.(); else onNumberClick?.(num); }}
              className={`h-12 rounded-lg font-bold text-lg transition-all ${num === 'C' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105'}`}>
              {num === 'C' ? <Delete className="w-5 h-5 mx-auto" /> : num}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {operations.map((op) => (
            <button key={op.value} onClick={() => onOperationClick?.(op.value)}
              className="h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-all hover:scale-105" title={op.label}>
              <op.icon className="w-4 h-4 mx-auto" />
            </button>
          ))}
        </div>
        <button onClick={() => onEnter?.()}
          className="w-full h-12 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-lg transition-all hover:scale-105 flex items-center justify-center gap-2">
          <Check className="w-5 h-5" />Valider
        </button>
      </CardContent>
    </Card>
  );
};

export default NumericKeypad;
