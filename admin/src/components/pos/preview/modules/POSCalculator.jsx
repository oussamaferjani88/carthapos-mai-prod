import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';

export const POSCalculator = ({ 
  keypadValue, 
  setKeypadValue, 
  setNotification,
  config 
}) => {
  const handleKeypadClick = (value) => {
    if (value === 'C') {
      setKeypadValue("");
    } else if (value === '=') {
      try {
        const result = eval(keypadValue);
        setKeypadValue(result.toString());
        setNotification(`🔢 Résultat: ${result}`);
        setTimeout(() => setNotification(null), 2000);
      } catch {
        setNotification("❌ Erreur de calcul");
        setTimeout(() => setNotification(null), 2000);
      }
    } else {
      setKeypadValue(prev => prev + value);
    }
  };

  return (
    <Card className="bg-blue-50 border-2 border-blue-500 h-full">
      <CardHeader className="py-1">
        <CardTitle className="text-xs flex items-center justify-between">
          🔢 Calculatrice
          <div className="bg-white px-2 py-1 rounded text-sm font-mono border min-w-[70px] text-center">
            {keypadValue || "0"}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-1">
        {/* Grille compacte 4x4 */}
        <div className="grid grid-cols-4 gap-1">
          {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', 'C', '0', '=', '+'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeypadClick(num)}
              className={`
                h-7 rounded text-xs font-bold transition-all
                ${num === 'C' 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : num === '='
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : ['+', '-', '*', '/'].includes(num)
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-white hover:bg-gray-100 border'
                }
              `}
            >
              {num}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default POSCalculator;
