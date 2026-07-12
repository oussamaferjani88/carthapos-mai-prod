import React, { useState, useEffect } from 'react';
import { POSConfiguration } from '../../../../config/POSConfiguration';
import { ShoppingCart, Plus, Minus, X, User, Calculator, Utensils, Search, Package, Trash2, Receipt, CreditCard } from 'lucide-react';
import { cn } from '../../../../lib/utils';

export const POSSales = ({ config, setNotification, modules = [] }) => {
  // Add custom scrollbar styles for cart
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .cart-scroll::-webkit-scrollbar { width: 5px; }
      .cart-scroll::-webkit-scrollbar-track { background: transparent; }
      .cart-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
      .cart-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      .cat-scroll::-webkit-scrollbar { height: 4px; }
      .cat-scroll::-webkit-scrollbar-track { background: transparent; }
      .cat-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  
  // Check if tables module is enabled
  const hasTablesModule = modules.some(m => {
    const moduleName = typeof m === 'string' ? m : (m.name || m.displayName || '');
    return moduleName.toLowerCase().includes('table') || moduleName.toLowerCase().includes('gestion des tables');
  });
  
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [animatingCard, setAnimatingCard] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [keypadValue, setKeypadValue] = useState("");
  const [drawerStatus, setDrawerStatus] = useState('closed');
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [localNotification, setLocalNotification] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorPosition, setCalculatorPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Table management state
  const [selectedTable, setSelectedTable] = useState(null);
  const [showTableSelector, setShowTableSelector] = useState(hasTablesModule);
  const [tables] = useState([
    { id: 1, table_number: 1, status: 'available', capacity: 4, currentTotal: 0 },
    { id: 2, table_number: 2, status: 'occupied', capacity: 2, currentTotal: 23.50 },
    { id: 3, table_number: 3, status: 'available', capacity: 6, currentTotal: 0 },
    { id: 4, table_number: 4, status: 'occupied', capacity: 4, currentTotal: 45.80 },
    { id: 5, table_number: 5, status: 'reserved', capacity: 8, currentTotal: 0 },
    { id: 6, table_number: 6, status: 'available', capacity: 2, currentTotal: 0 },
    { id: 7, table_number: 7, status: 'available', capacity: 4, currentTotal: 0 },
    { id: 8, table_number: 8, status: 'occupied', capacity: 6, currentTotal: 67.20 },
  ]);

  // Global mouse events for calculator dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setCalculatorPosition({
          x: Math.max(0, Math.min(window.innerWidth - 280, e.clientX - dragOffset.x)),
          y: Math.max(0, Math.min(window.innerHeight - 400, e.clientY - dragOffset.y))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Configuration par défaut (kept small font sizes by default)
  const defaultConfig = {
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    textMutedColor: '#6b7280',
    fontSize: '13px',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: '400'
  };

  const currentConfig = config || defaultConfig;
  
  // Apply POSConfiguration styling for consistency with template
  const posConfig = POSConfiguration.createConfig(currentConfig);
  const styles = POSConfiguration.getStyles(posConfig);
  const cardClasses = POSConfiguration.getCardClasses(posConfig);
  const buttonClasses = POSConfiguration.getButtonClasses(posConfig);

  // Produits avec images/emojis comme dans Electron
  const products = [
    { id: 1, name: 'Café Expresso', price: 2.50, category: 'Boissons', image: '☕' },
    { id: 2, name: 'Croissant', price: 1.80, category: 'Pâtisserie', image: '🥐' },
    { id: 3, name: 'Sandwich Jambon', price: 4.50, category: 'Snacks', image: '🥪' },
    { id: 4, name: 'Jus d\'Orange', price: 3.20, category: 'Boissons', image: '🍊' },
    { id: 5, name: 'Salade César', price: 7.90, category: 'Plats', image: '🥗' },
    { id: 6, name: 'Eau Minérale', price: 1.50, category: 'Boissons', image: '💧' },
    { id: 7, name: 'Muffin Chocolat', price: 2.80, category: 'Pâtisserie', image: '🧁' },
    { id: 8, name: 'Wrap Poulet', price: 5.50, category: 'Snacks', image: '🌯' },
    { id: 9, name: 'Cappuccino', price: 3.00, category: 'Boissons', image: '☕' },
    { id: 10, name: 'Quiche Lorraine', price: 4.20, category: 'Plats', image: '🥧' },
    { id: 11, name: 'Thé Vert', price: 2.20, category: 'Boissons', image: '🍵' },
    { id: 12, name: 'Pain au Chocolat', price: 2.00, category: 'Pâtisserie', image: '🥐' },
  ];

  const categories = ['Tout', 'Boissons', 'Pâtisserie', 'Snacks', 'Plats'];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tout' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Fonctions (unchanged)
  const addToCart = (product) => {
    setAnimatingCard(product.id);
    setSelectedCard(product.id);

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });

    setTimeout(() => {
      setAnimatingCard(null);
      setSelectedCard(null);
    }, 300);

    // Use local notification that slides in as overlay
    setLocalNotification(`➕ ${product.name} ajouté !`);
    setTimeout(() => setLocalNotification(null), 2000);
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setLocalNotification("🗑️ Panier vidé");
    setTimeout(() => setLocalNotification(null), 2000);
  };
  
  // Table functions
  const selectTable = (table) => {
    setSelectedTable(table);
    setShowTableSelector(false);
    setLocalNotification(`📍 Table ${table.table_number} sélectionnée`);
    setTimeout(() => setLocalNotification(null), 2000);
  };
  
  const changeTable = () => {
    setShowTableSelector(true);
    setSelectedTable(null);
    setCart([]);
  };
  
  const getTableStatusColor = (status) => {
    switch(status) {
      case 'available': return 'bg-emerald-500';
      case 'occupied': return 'bg-red-500';
      case 'reserved': return 'bg-blue-500';
      case 'cleaning': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getTableStatusBg = (status) => {
    switch(status) {
      case 'available': return 'bg-emerald-50 border-emerald-200';
      case 'occupied': return 'bg-red-50 border-red-200';
      case 'reserved': return 'bg-blue-50 border-blue-200';
      case 'cleaning': return 'bg-gray-50 border-gray-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };
  
  const getTableStatusLabel = (status) => {
    switch(status) {
      case 'available': return 'Libre';
      case 'occupied': return 'Fermée';
      case 'reserved': return 'Réservée';
      case 'cleaning': return 'Nettoyage';
      default: return 'Inconnue';
    }
  };

  const processPayment = () => {
    if (cart.length === 0) return;
    setShowPaymentMethods(true);
  };

  const handleKeypadClick = (value) => {
    if (value === 'C') {
      setKeypadValue("");
    } else if (value === '=') {
      try {
        // Safe calculation using Function constructor instead of eval
        const result = new Function('return ' + (keypadValue || "0"))();
        setKeypadValue(result.toString());
        setLocalNotification(`🔢 Résultat: ${result}`);
        setTimeout(() => setLocalNotification(null), 2000);
      } catch {
        setLocalNotification("❌ Erreur de calcul");
        setTimeout(() => setLocalNotification(null), 2000);
      }
    } else {
      setKeypadValue(prev => prev + value);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  /**
   * Layout approach for "fit to one screen":
   * - Keep overall container h-screen and overflow-hidden (no page scroll)
   * - Use a 2-column layout: left cart (fixed width), right main (flex)
   * - Right main is split with CSS grid rows: top products (2fr) and bottom tools (1fr)
   * - Limit product grid to 2 visible rows and 6 columns; product cards are smaller
   * - Reduce paddings/gaps and font sizes slightly to fit more content
   */

  return (
    <div className="h-full bg-gray-50 overflow-hidden flex">
      {/* Table Selector Overlay */}
      {hasTablesModule && showTableSelector && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-auto relative rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 px-6 py-5 border-b border-gray-100 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2.5 text-xl font-bold text-gray-900">
                    <Utensils className="w-5 h-5 text-emerald-500" />
                    Sélection de Table
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Choisissez une table pour commencer la commande
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Libre</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Réservée</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Fermée</span>
                  </div>
                  <button
                    onClick={() => setShowTableSelector(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Utensils className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium text-gray-500">Aucune table configurée</p>
                  <p className="text-sm mt-1">Ajoutez des tables dans la section Gestion</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {tables.map((table) => {
                    const isOccupied = table.status === 'occupied';
                    const isReserved = table.status === 'reserved';
                    const isCleaning = table.status === 'cleaning';
                    const isAvailable = table.status === 'available';

                    return (
                      <button
                        key={table.id}
                        onClick={() => !isOccupied && selectTable(table)}
                        disabled={isOccupied}
                        className={`group relative flex flex-col items-center p-5 rounded-2xl border-2 transition-all duration-200 ${
                          isOccupied
                            ? 'border-red-200 bg-red-50/50 cursor-not-allowed opacity-60'
                            : isReserved
                            ? 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:shadow-md hover:scale-[1.02] cursor-pointer active:scale-[0.98]'
                            : isCleaning
                            ? 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:shadow-md hover:scale-[1.02] cursor-pointer active:scale-[0.98]'
                            : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:shadow-md hover:scale-[1.02] cursor-pointer active:scale-[0.98]'
                        }`}
                      >
                        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm ${
                          isAvailable ? 'bg-emerald-500 text-white' :
                          isReserved ? 'bg-blue-500 text-white' :
                          isOccupied ? 'bg-red-500 text-white' :
                          'bg-gray-400 text-white'
                        }`}>
                          {getTableStatusLabel(table.status)}
                        </div>

                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm mb-3 transition-transform group-hover:scale-110 ${
                          isAvailable ? 'bg-emerald-500' :
                          isReserved ? 'bg-blue-500' :
                          isOccupied ? 'bg-red-500' :
                          'bg-gray-400'
                        }`}>
                          {table.table_number}
                        </div>

                        <div className="text-center">
                          <div className="font-semibold text-sm text-gray-800">
                            Table {table.table_number}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {table.capacity} places
                          </div>
                        </div>

                        {!isOccupied && (
                          <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-blue-400/40 pointer-events-none transition-all" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content - Full height (no scroll) */}
      <div className="h-full w-full flex gap-0.5 p-0.5">
        {/* LEFT SIDE - Cart & Calculator */}
        <div className="w-[320px] min-w-[280px] flex flex-col h-full">
          {/* Cart - full height */}
          <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 min-h-0">
            <div className="px-4 py-3 flex-shrink-0 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-gray-800">
                  <ShoppingCart className="w-4 h-4 text-gray-400" />
                  {hasTablesModule && selectedTable ? (
                    <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg ml-1">
                      Table {selectedTable.table_number}
                    </span>
                  ) : hasTablesModule ? (
                    <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg ml-1">
                      Sans table
                    </span>
                  ) : 'Commande'}
                </span>
                <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 min-h-0 overflow-y-auto cart-scroll px-3 py-2 space-y-1.5">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm font-medium">Panier vide</p>
                  <p className="text-xs mt-0.5">Cliquez sur un produit</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-800 truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {(item.price).toFixed(2)}€
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-500 flex items-center justify-center text-gray-500 transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-semibold text-sm text-gray-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 bg-white border border-gray-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-500 flex items-center justify-center text-gray-500 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-7 h-7 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-500 flex items-center justify-center text-gray-400 transition-all ml-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-sm font-semibold text-blue-600 min-w-[70px] text-right">
                      {(item.price * item.quantity).toFixed(2)}€
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals & Actions */}
            <div className="border-t border-gray-100 px-3 py-3 space-y-2.5">
              <div className="flex justify-between items-center bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-white font-semibold text-sm">TOTAL</span>
                <span className="text-white font-bold text-lg">{cartTotal.toFixed(2)}€</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={processPayment}
                  disabled={cart.length === 0}
                  className="py-2.5 px-3 rounded-xl text-white font-semibold text-sm transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:shadow-none disabled:hover:scale-100"
                  style={{ backgroundColor: currentConfig.primaryColor }}
                >
                  ENCAISSER
                </button>
                <button
                  onClick={clearCart}
                  className="py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 font-semibold text-sm transition-all"
                >
                  VIDER
                </button>
              </div>

              {/* Secondary Actions */}
              <div className="flex gap-2">
                {hasTablesModule && selectedTable && (
                  <button
                    onClick={changeTable}
                    className="flex-1 py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    Changer Table
                  </button>
                )}
                {!selectedTable && hasTablesModule && (
                  <button
                    onClick={() => setShowTableSelector(true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    Assigner Table
                  </button>
                )}
                <button
                  onClick={() => setShowCalculator(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Calculatrice
                </button>
              </div>

              {/* Quick Actions Grid */}
              <div className={`grid ${hasTablesModule ? 'grid-cols-5' : 'grid-cols-4'} gap-1.5`}>
                {hasTablesModule && (
                  <button
                    onClick={() => setShowTableSelector(true)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-medium text-[10px] h-10 flex flex-col items-center justify-center gap-0.5 transition-all"
                    title="Sélectionner Table"
                  >
                    <Utensils className="w-4 h-4" />
                    <span>Table</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setLocalNotification("Gestion client");
                    setTimeout(() => setLocalNotification(null), 2000);
                  }}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-medium text-[10px] h-10 flex flex-col items-center justify-center gap-0.5 transition-all"
                  title="Client"
                >
                  <User className="w-4 h-4" />
                  <span>Client</span>
                </button>
                <button
                  onClick={() => {
                    setLocalNotification("Rapports");
                    setTimeout(() => setLocalNotification(null), 2000);
                  }}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-medium text-[10px] h-10 flex flex-col items-center justify-center gap-0.5 transition-all"
                  title="Rapports"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Rapports</span>
                </button>
                <button
                  onClick={() => {
                    setLocalNotification("Impression ticket");
                    setTimeout(() => setLocalNotification(null), 2000);
                  }}
                  className="bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl font-medium text-[10px] h-10 flex flex-col items-center justify-center gap-0.5 transition-all"
                  title="Ticket"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Ticket</span>
                </button>
                <button
                  onClick={() => {
                    setLocalNotification("Tiroir ouvert !");
                    setDrawerStatus('open');
                    setTimeout(() => {
                      setDrawerStatus('closed');
                      setLocalNotification(null);
                    }, 3000);
                  }}
                  className={`rounded-xl font-medium text-[10px] h-10 flex flex-col items-center justify-center gap-0.5 transition-all ${
                    drawerStatus === 'open'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Tiroir caisse"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Caisse</span>
                </button>
              </div>
            </div>
          </div>




        </div>

        {/* RIGHT SIDE - Products (expanded width) */}
        <div className="flex-1 h-full min-w-0">
          <div className="h-full bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            {/* Search & Categories */}
            <div className="px-4 py-3 flex-shrink-0 border-b border-gray-100 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                  {filteredProducts.length}
                </span>
              </div>

              {/* Category Filter */}
              <div className="flex gap-1.5 overflow-x-auto cat-scroll pb-0.5">
                {categories.map((category) => {
                  const isActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap min-w-[60px] ${
                        isActive
                          ? 'text-white shadow-sm'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-gray-100'
                      }`}
                      style={isActive ? { backgroundColor: currentConfig.primaryColor } : {}}
                    >
                      <span>{category === 'Tout' ? 'Tout' : category}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 p-3 overflow-auto">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <Package className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">
                    Aucun produit disponible
                  </h3>
                  <p className="text-sm text-gray-400 mb-6 max-w-md">
                    Ajoutez des produits dans la section Produits pour commencer les ventes
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-5 xl:grid-cols-6 gap-2 auto-rows-[minmax(90px,1fr)]">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={`flex flex-col justify-between p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:border-blue-200 active:scale-[0.97] min-h-[90px] ${
                        selectedCard === product.id
                          ? 'ring-2 ring-blue-500 border-blue-300 shadow-md bg-blue-50/30'
                          : 'border-gray-100 bg-white hover:bg-gray-50'
                      } ${
                        animatingCard === product.id && 'animate-pulse'
                      }`}
                    >
                      {product.image && (
                        <div className="flex items-center justify-center h-10 text-xl mb-1 bg-gray-50 -mx-3 -mt-3 rounded-t-xl">
                          {product.image}
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-semibold text-sm text-gray-800 leading-tight line-clamp-2">
                            {product.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 truncate bg-gray-50 px-1.5 py-0.5 rounded">
                            {product.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-sm text-blue-600">
                          {product.price.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentMethods && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Confirmation Paiement</h2>
            </div>

            <div className="p-5 space-y-4">
              {/* Receipt Items */}
              <div className="bg-gray-50 rounded-xl p-4 max-h-44 overflow-y-auto space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Articles</p>
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.quantity}x {item.price.toFixed(2)}€</div>
                    </div>
                    <div className="text-right font-semibold text-gray-800 whitespace-nowrap ml-3">
                      {(item.price * item.quantity).toFixed(2)}€
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Sous-total</span>
                  <span className="font-medium text-gray-700">{cartTotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between border-t-2 border-blue-200 pt-1.5">
                  <span className="font-bold text-gray-800">TOTAL</span>
                  <span className="font-bold text-lg text-blue-600">{cartTotal.toFixed(2)}€</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mode de paiement</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Espèces', color: 'bg-emerald-500 hover:bg-emerald-600', icon: '💵' },
                    { label: 'Carte', color: 'bg-blue-500 hover:bg-blue-600', icon: '💳' },
                    { label: 'Chèque', color: 'bg-purple-500 hover:bg-purple-600', icon: '📝' },
                    { label: 'Mobile', color: 'bg-orange-500 hover:bg-orange-600', icon: '📱' }
                  ].map(method => (
                    <button
                      key={method.label}
                      onClick={() => {
                        setLocalNotification(`✅ Paiement ${method.label}: ${cartTotal.toFixed(2)}€`);
                        setCart([]);
                        setShowPaymentMethods(false);
                        setTimeout(() => setLocalNotification(null), 3000);
                      }}
                      className={`p-3 ${method.color} text-white rounded-xl font-semibold text-sm transition-all hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2`}
                    >
                      <span>{method.icon}</span>
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowPaymentMethods(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draggable Calculator Popup */}
      {showCalculator && (
        <div
          className="fixed bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 select-none overflow-hidden"
          style={{
            left: `${calculatorPosition.x}px`,
            top: `${calculatorPosition.y}px`,
            width: '260px',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={(e) => {
            if (e.target.closest('.calculator-button')) return;
            setIsDragging(true);
            setDragOffset({
              x: e.clientX - calculatorPosition.x,
              y: e.clientY - calculatorPosition.y
            });
          }}
        >
          {/* Header */}
          <div className="bg-blue-500 text-white px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <span className="font-semibold text-sm">Calculatrice</span>
            </div>
            <button
              onClick={() => { setShowCalculator(false); setKeypadValue(""); }}
              className="calculator-button w-6 h-6 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Display */}
          <div className="p-3 bg-gray-50">
            <div className="bg-gray-900 text-emerald-400 px-3 py-2.5 rounded-xl font-mono text-right text-lg min-h-[42px] flex items-center justify-end">
              {keypadValue || "0"}
            </div>
          </div>

          {/* Buttons */}
          <div className="p-3">
            <div className="grid grid-cols-4 gap-1.5">
              {['C', '←', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '=', '='].map((btn, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (btn === '←') {
                      setKeypadValue(prev => prev.slice(0, -1));
                    } else if (btn === '÷') {
                      handleKeypadClick('/');
                    } else if (btn === '×') {
                      handleKeypadClick('*');
                    } else if (btn === '%') {
                      handleKeypadClick('/100*');
                    } else {
                      handleKeypadClick(btn);
                    }
                  }}
                  className={`
                    calculator-button h-11 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95
                    ${btn === 'C'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : btn === '='
                        ? 'bg-blue-500 hover:bg-blue-600 text-white col-span-1'
                        : ['÷', '×', '-', '+', '%', '←'].includes(btn)
                          ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                          : btn === '0'
                            ? 'bg-gray-100 hover:bg-gray-200 col-span-2'
                            : 'bg-gray-100 hover:bg-gray-200'
                    }
                    ${index === 19 ? 'hidden' : ''}
                  `}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>

          {/* Drag Handle */}
          <div className="text-center py-1 bg-gray-50 rounded-b-lg">
            <div className="inline-flex w-8 h-1 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      )}

      {/* Local Notification Overlay - slides in from top */}
      {localNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 backdrop-blur-sm bg-emerald-500/95">
            <span className="font-medium text-sm">{localNotification}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSales;
