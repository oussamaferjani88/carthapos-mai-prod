import { Calculator } from 'lucide-react';

export const POSCalculator = ({ config }: { config: any }) => {
  const buttons = [
    ['C', '±', '%', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '00', '.', '='],
  ];

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: config.textColor }}>
        <Calculator className="w-6 h-6" />Calculatrice
      </h1>
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-right">
          <div className="text-2xl font-mono font-bold" style={{ color: config.textColor }}>0</div>
        </div>
        {buttons.map((row, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-2">
            {row.map((btn) => (
              <button key={btn}
                className={`p-3 rounded-lg text-sm font-semibold transition-all hover:scale-105
                  ${['/', '*', '-', '+', '='].includes(btn) ? 'bg-orange-500 text-white' :
                    btn === 'C' ? 'bg-red-500 text-white' :
                    'bg-gray-100 hover:bg-gray-200'}`}>
                {btn}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSCalculator;
