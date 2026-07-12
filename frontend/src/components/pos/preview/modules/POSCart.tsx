import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';

export const POSCart = ({ config }: { config: any }) => {
  const items = [
    { name: 'Café Espresso', qty: 2, price: 2.50 },
    { name: 'Croissant', qty: 1, price: 1.80 },
    { name: 'Jus d\'orange', qty: 1, price: 3.50 },
  ];
  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: config.textColor }}>
        <ShoppingCart className="w-6 h-6" />Panier
      </h1>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Article</span>
            <span>Qté</span>
            <span>Total</span>
          </div>
        </div>
        {items.map((item, i) => (
          <div key={i} className="p-4 border-b flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: config.textColor }}>{item.name}</p>
              <p className="text-xs text-gray-400">{item.price.toFixed(2)}€ l'unité</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
              <span className="w-6 text-center text-sm">{item.qty}</span>
              <button className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
            </div>
            <span className="w-16 text-right text-sm font-semibold">{(item.qty * item.price).toFixed(2)}€</span>
          </div>
        ))}
        <div className="p-4 bg-blue-50">
          <div className="flex justify-between text-lg font-bold" style={{ color: config.primaryColor }}>
            <span>Total</span>
            <span>{total.toFixed(2)}€</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSCart;
