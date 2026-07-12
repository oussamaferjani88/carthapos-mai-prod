import { useState } from 'react';
import {
  Package, Search, Plus, Edit3, Trash2, AlertTriangle, Barcode, MoreVertical, Filter, X
} from 'lucide-react';

const DEMO_PRODUCTS = [
  { id: 1, name: 'Café Espresso', ref: 'REF-001', price: 2.50, stock: 150, category: 'Boissons', minStock: 10, image: '☕' },
  { id: 2, name: 'Café Long', ref: 'REF-002', price: 3.00, stock: 100, category: 'Boissons', minStock: 10, image: '☕' },
  { id: 3, name: 'Café Latte', ref: 'REF-003', price: 3.50, stock: 80, category: 'Boissons', minStock: 10, image: '☕' },
  { id: 4, name: 'Cappuccino', ref: 'REF-004', price: 3.50, stock: 60, category: 'Boissons', minStock: 10, image: '☕' },
  { id: 5, name: 'Thé Vert', ref: 'REF-005', price: 2.80, stock: 90, category: 'Boissons', minStock: 10, image: '🍵' },
  { id: 6, name: 'Thé Noir', ref: 'REF-006', price: 2.80, stock: 200, category: 'Boissons', minStock: 10, image: '🍵' },
  { id: 7, name: 'Chocolat Chaud', ref: 'REF-007', price: 3.50, stock: 50, category: 'Boissons', minStock: 5, image: '☕' },
  { id: 8, name: 'Croissant', ref: 'REF-008', price: 1.80, stock: 80, category: 'Pâtisseries', minStock: 20, image: '🥐' },
  { id: 9, name: 'Pain au Chocolat', ref: 'REF-009', price: 2.00, stock: 60, category: 'Pâtisseries', minStock: 15, image: '🥐' },
  { id: 10, name: 'Muffin Myrtille', ref: 'REF-010', price: 2.50, stock: 40, category: 'Pâtisseries', minStock: 10, image: '🧁' },
  { id: 11, name: 'Sandwich Jambon', ref: 'REF-011', price: 5.50, stock: 30, category: 'Sandwichs', minStock: 10, image: '🥪' },
  { id: 12, name: 'Sandwich Poulet', ref: 'REF-012', price: 6.00, stock: 25, category: 'Sandwichs', minStock: 5, image: '🥪' },
  { id: 13, name: 'Salade César', ref: 'REF-013', price: 8.50, stock: 15, category: 'Salades', minStock: 5, image: '🥗' },
  { id: 14, name: 'Eau Minérale', ref: 'REF-014', price: 1.50, stock: 300, category: 'Boissons', minStock: 50, image: '💧' },
  { id: 15, name: 'Soda', ref: 'REF-015', price: 2.00, stock: 200, category: 'Boissons', minStock: 30, image: '🥤' },
];

const DEMO_CATEGORIES = ['Toutes', 'Boissons', 'Pâtisseries', 'Sandwichs', 'Salades'];

export const POSProducts = ({ config }: { config: any }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Toutes');

  const formatCurrency = (amount: number) => {
    const currency = config.currency || '€';
    const position = config.currencyPosition || 'after';
    if (position === 'before') return `${currency}${amount.toFixed(2)}`;
    return `${amount.toFixed(2)} ${currency}`;
  };

  const filteredProducts = DEMO_PRODUCTS.filter(p => {
    const matchCategory = categoryFilter === 'Toutes' || p.category === categoryFilter;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.ref.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const lowStockCount = DEMO_PRODUCTS.filter(p => p.stock <= p.minStock).length;

  const handleEdit = (id: number) => {
    window.alert(`Modification du produit #${id}`);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      window.alert(`Produit #${id} supprimé`);
    }
  };

  const handleGenerateBarcode = (id: number) => {
    window.alert(`Code-barres généré pour le produit #${id}`);
  };

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: config.textColor || '#1f2937' }}>Produits</h1>
          <p className="text-sm mt-1" style={{ color: config.textMutedColor || '#6b7280' }}>
            Gérez votre catalogue de produits
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lowStockCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-200">
              <AlertTriangle className="w-4 h-4" />
              {lowStockCount} stock faible
            </span>
          )}
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90 active:scale-[0.98] text-sm"
            style={{ backgroundColor: config.primaryColor || '#3b82f6' }}>
            <Plus className="w-4 h-4" />
            Nouveau produit
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4" style={{ borderColor: config.cardBorderColor || '#e5e7eb' }}>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: config.textMutedColor || '#9ca3af' }} />
            <input type="text" placeholder="Rechercher par nom ou référence..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              style={{ borderColor: config.cardBorderColor || '#e5e7eb', color: config.textColor || '#1f2937' }} />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: config.textMutedColor || '#9ca3af' }} />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
              style={{ borderColor: config.cardBorderColor || '#e5e7eb', color: config.textColor || '#1f2937' }}>
              {DEMO_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat === 'Toutes' ? 'Toutes catégories' : cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="w-16 h-16 mb-4" style={{ color: config.textMutedColor || '#d1d5db' }} />
          <p className="text-lg font-medium" style={{ color: config.textColor || '#6b7280' }}>Aucun produit trouvé</p>
          <p className="text-sm mt-1" style={{ color: config.textMutedColor || '#9ca3af' }}>Essayez de modifier vos filtres de recherche</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const isLowStock = product.stock <= product.minStock;
            return (
              <div key={product.id}
                className="bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all group overflow-hidden"
                style={{ borderColor: config.cardBorderColor || '#e5e7eb' }}>
                {/* Product Image */}
                <div className="relative h-40 flex items-center justify-center text-5xl"
                  style={{ backgroundColor: (config.primaryColor || '#3b82f6') + '10' }}>
                  {product.image}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={() => handleEdit(product.id)}
                      className="p-1.5 bg-white rounded-lg shadow-sm border hover:bg-blue-50 transition-colors"
                      style={{ borderColor: config.cardBorderColor || '#e5e7eb' }}>
                      <Edit3 className="w-4 h-4 text-blue-600" />
                    </button>
                    <button onClick={() => handleDelete(product.id)}
                      className="p-1.5 bg-white rounded-lg shadow-sm border hover:bg-red-50 transition-colors"
                      style={{ borderColor: config.cardBorderColor || '#e5e7eb' }}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate" style={{ color: config.textColor || '#1f2937' }}>
                          {product.name}
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: config.textMutedColor || '#6b7280' }}>
                          {product.ref}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100" style={{ color: config.textMutedColor || '#6b7280' }}>
                        {product.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: config.cardBorderColor || '#e5e7eb' }}>
                    <div>
                      <span className="text-lg font-bold" style={{ color: config.primaryColor || '#3b82f6' }}>
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                        isLowStock ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`} />
                        {product.stock} en stock
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleGenerateBarcode(product.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border hover:bg-gray-50 transition-colors"
                      style={{ borderColor: config.cardBorderColor || '#e5e7eb', color: config.textColor || '#374151' }}>
                      <Barcode className="w-3.5 h-3.5" />
                      Code-barres
                    </button>
                    <button onClick={() => handleEdit(product.id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      style={{ borderColor: config.cardBorderColor || '#e5e7eb', color: config.textColor || '#374151' }}>
                      <Edit3 className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      <div className="text-sm" style={{ color: config.textMutedColor || '#6b7280' }}>
        {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} sur {DEMO_PRODUCTS.length}
      </div>
    </div>
  );
};

export default POSProducts;