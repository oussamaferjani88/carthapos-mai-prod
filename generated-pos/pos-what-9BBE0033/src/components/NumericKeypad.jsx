import React from 'react';

const DIGITS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
];

const OPS = ['×', '+', '-', '÷'];

const BTN = 'rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center';

const btnH = { height: '44px' };

const displayBarH = { height: '32px' };

export default function NumericKeypad({
  onKey,
  onConfirm,
  onClear,
  onOperator,
  highlight = false,
  displayValue,
}) {
  return (
    <div className="select-none touch-manipulation" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}>
      {displayValue != null && (
        <div
          className={`${BTN} mb-1.5 px-3 text-right font-mono text-sm tracking-wide text-gray-700 bg-gray-50 border border-gray-200 overflow-hidden`}
          style={{ ...displayBarH, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {displayValue || '\u00A0'}
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        {OPS.map((op) => (
          <button
            key={op}
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onOperator?.(op);
            }}
            className={`${BTN} text-lg bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white border border-blue-600`}
            style={btnH}
          >
            {op}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5 mt-1.5">
        {DIGITS.flat().map((key) => (
          <button
            key={key}
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onKey?.(key);
            }}
            className={`${BTN} text-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200`}
            style={btnH}
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onKey?.('0');
          }}
          className={`${BTN} text-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200`}
          style={btnH}
        >
          0
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onKey?.('.');
          }}
          className={`${BTN} text-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200`}
          style={btnH}
        >
          .
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onKey?.('⌫');
          }}
          className={`${BTN} text-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200`}
          style={btnH}
        >
          ⌫
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mt-1.5">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onClear?.();
          }}
          className={`${BTN} text-sm bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border border-red-600`}
          style={btnH}
        >
          C
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onKey?.('DEL');
          }}
          className={`${BTN} text-sm bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white border border-amber-600`}
          style={btnH}
        >
          DEL
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onConfirm?.();
          }}
          className={`${BTN} text-lg text-white border transition-all shadow-sm hover:shadow-md`}
          style={{ ...btnH, backgroundColor: highlight ? '#2563eb' : '#10b981' }}
        >
          ✓
        </button>
      </div>
    </div>
  );
}
