import React, { useState, useEffect } from 'react';
import { POSConfiguration } from '../../../../config/POSConfiguration';
import {
  ShoppingCart, Plus, Minus, X, User, Calculator, Utensils, Search, Package,
  Trash2, Receipt, CreditCard, History, Wallet, ListOrdered, MenuSquare,
  PauseCircle, ChevronRight, Lock, Grid3x3, Printer
} from 'lucide-react';
import { cn } from '../../../../lib/utils';

// Miroir de pos-template/pages/Sales.jsx : 3 panneaux (panier gauche, pavé
// numérique + actions rapides au centre, produits à droite), caisse "ouverte",
// notifications et modales (table, paiement, calculatrice). Données démo.
export const POSSales = ({ config, modules = [] }) => {
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

  const hasTablesModule = modules.some(m => {
    const moduleName = typeof m === 'string' ? m : (m.name || m.displayName || '');
    return moduleName.toLowerCase().includes('table') || moduleName.toLowerCase().includes('gestion des tables');
  });

  const defaultConfig = {
    primaryColor: '#3b82f6', backgroundColor: '#ffffff', textColor: '#1f2937',
    textMutedColor: '#6b7280', fontSize: '13px', fontFamily: 'Inter', fontWeight: '400',
    currency: '€', currencyPosition: 'after'
  };
  const currentConfig = config || defaultConfig;
  const posConfig = POSConfiguration.createConfig(currentConfig);

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
  const [selectedTable, setSelectedTable] = useState(null);
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [navHidden, setNavHidden] = useState(false);

  const tables = [
    { id: 1, table_number: 1, status: 'available', capacity: 4 },
    { id: 2, table_number: 2, status: 'occupied', capacity: 2 },
    { id: 3, table_number: 3, status: 'available', capacity: 6 },
    { id: 4, table_number: 4, status: 'occupied', capacity: 4 },
    { id: 5, table_number: 5, status: 'reserved', capacity: 8 },
    { id: 6, table_number: 6, status: 'available', capacity: 2 },
    { id: 7, table_number: 7, status: 'available', capacity: 4 },
    { id: 8, table_number: 8, status: 'occupied', capacity: 6 },
  ];

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setCalculatorPosition({
          x: Math.max(0, Math.min(window.innerWidth - 280, e.clientX - dragOffset.x)),
          y: Math.max(0, Math.min(window.innerHeight - 400, e.clientY - dragOffset.y))
        });
      }
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const products = [
    { id: 1, name: 'Café Expresso', price: 2.50, category: 'Boissons', image: '☕', stock: 42 },
    { id: 2, name: 'Croissant', price: 1.80, category: 'Pâtisserie', image: '🥐', stock: 3 },
    { id: 3, name: 'Sandwich Jambon', price: 4.50, category: 'Snacks', image: '🥪', stock: 18 },
    { id: 4, name: 'Jus d\'Orange', price: 3.20, category: 'Boissons', image: '🍊', stock: 0 },
    { id: 5, name: 'Salade César', price: 7.90, category: 'Plats', image: '🥗', stock: 9 },
    { id: 6, name: 'Eau Minérale', price: 1.50, category: 'Boissons', image: '💧', stock: 60 },
    { id: 7, name: 'Muffin Chocolat', price: 2.80, category: 'Pâtisserie', image: '🧁', stock: 4 },
    { id: 8, name: 'Wrap Poulet', price: 5.50, category: 'Snacks', image: '🌯', stock: 15 },
    { id: 9, name: 'Cappuccino', price: 3.00, category: 'Boissons', image: '☕', stock: 35 },
    { id: 10, name: 'Quiche Lorraine', price: 4.20, category: 'Plats', image: '🥧', stock: 7 },
    { id: 11, name: 'Thé Vert', price: 2.20, category: 'Boissons', image: '🍵', stock: 28 },
    { id: 12, name: 'Pain au Chocolat', price: 2.00, category: 'Pâtisserie', image: '🥐', stock: 0 },
    { id: 13, name: 'Soupe du Jour', price: 3.80, category: 'Plats', image: '🍲', stock: 12 },
    { id: 14, name: 'Café Latte', price: 3.40, category: 'Boissons', image: '☕', stock: 25 },
    { id: 15, name: 'Cookie', price: 1.60, category: 'Pâtisserie', image: '🍪', stock: 44 },
    { id: 16, name: 'Nuggets Poulet', price: 4.90, category: 'Snacks', image: '🍗', stock: 2 },
  ];

  const categories = ['Tout', ...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tout' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatPrice = (price) => {
    const p = typeof price === 'number' && !isNaN(price) ? price : 0;
    return posConfig.currencyPosition === 'before'
      ? `${posConfig.currency}${p.toFixed(2)}`
      : `${p.toFixed(2)} ${posConfig.currency}`;
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addToCart = (product) => {
    setAnimatingCard(product.id);
    setSelectedCard(product.id);
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    setTimeout(() => { setAnimatingCard(null); setSelectedCard(null); }, 300);
    setLocalNotification(`${product.name} ajouté`);
    setTimeout(() => setLocalNotification(null), 2000);
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) { removeFromCart(id); return; }
    setCart(prevCart => prevCart.map(item => item.id === id ? { ...item, quantity: newQuantity } : item));
  };

  const removeFromCart = (id) => setCart(prevCart => prevCart.filter(item => item.id !== id));

  const clearCart = () => {
    setCart([]);
    setLocalNotification('Panier vidé');
    setTimeout(() => setLocalNotification(null), 2000);
  };

  const holdOrder = () => {
    if (cart.length === 0) return;
    setCart([]);
    setSelectedTable(null);
    setLocalNotification('Commande mise en attente');
    setTimeout(() => setLocalNotification(null), 2000);
  };

  const selectTable = (table) => {
    setSelectedTable(table);
    setShowTableSelector(false);
    setLocalNotification(`Table ${table.table_number} sélectionnée`);
    setTimeout(() => setLocalNotification(null), 2000);
  };

  const processPayment = () => {
    if (cart.length === 0) return;
    setShowPaymentMethods(true);
  };

  const handleKeypadClick = (value) => {
    if (value === 'C') setKeypadValue("");
    else if (value === '=') {
      try {
        const result = new Function('return ' + (keypadValue || "0"))();
        setKeypadValue(result.toString());
      } catch { setKeypadValue(""); }
    } else setKeypadValue(prev => prev + value);
  };

  const getTableStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-emerald-500';
      case 'occupied': return 'bg-red-500';
      case 'reserved': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getTableStatusLabel = (status) => {
    switch (status) {
      case 'available': return 'Libre';
      case 'occupied': return 'Fermée';
      case 'reserved': return 'Réservée';
      default: return 'Inconnue';
    }
  };

  return (
    <div className="h-full bg-gray-50 overflow-hidden flex">
      {/* Caisse ouverte badge */}
      <div className="absolute top-3 right-3 z-40">
        <div className="bg-white/90 backdrop-blur-sm border border-emerald-200 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-emerald-700">Caisse ouverte</span>
        </div>
      </div>

      {/* Notification */}
      {localNotification && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 backdrop-blur-sm bg-emerald-500/95">
            <span className="font-medium text-sm">{localNotification}</span>
          </div>
        </div>
      )}

      {/* Table Selector Modal */}
      {hasTablesModule && showTableSelector && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-auto relative rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 px-6 py-5 border-b border-gray-100 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2.5 text-xl font-bold text-gray-900">
                    <Utensils className="w-5 h-5 text-emerald-500" />
                    Sélection de Table
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">Choisissez une table pour commencer la commande</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Libre</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Réservée</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Fermée</span>
                  </div>
                  <button onClick={() => setShowTableSelector(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {tables.map((table) => {
                  const isOccupied = table.status === 'occupied';
                  const isReserved = table.status === 'reserved';
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
                          : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:shadow-md hover:scale-[1.02] cursor-pointer active:scale-[0.98]'
                      }`}
                    >
                      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm ${
                        isAvailable ? 'bg-emerald-500 text-white' :
                        isReserved ? 'bg-blue-500 text-white' :
                        'bg-red-500 text-white'
                      }`}>
                        {getTableStatusLabel(table.status)}
                      </div>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm mb-3 transition-transform group-hover:scale-110 ${
                        isAvailable ? 'bg-emerald-500' :
                        isReserved ? 'bg-blue-500' : 'bg-red-500'
                      }`}>
                        {table.table_number}
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-sm text-gray-800">Table {table.table_number}</div>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full inline-block ${getTableStatusColor(table.status)}`} />
                          {table.capacity} places
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout - 3 panneaux comme le POS réel */}
      <div className="h-full w-full flex gap-2 p-2">
        {/* Cart Panel - Left */}
        <div className="w-[300px] min-w-[260px] flex flex-col h-full">
          <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100">
            {/* Cart Header */}
            <div className="px-4 py-3 flex-shrink-0 border-b border-gray-100">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold text-gray-800">
                  <ShoppingCart className="w-4 h-4 text-gray-400" />
                  Commande
                  {hasTablesModule && selectedTable ? (
                    <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg ml-1">
                      Table {selectedTable.table_number}
                    </span>
                  ) : hasTablesModule ? (
                    <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg ml-1">
                      Sans table
                    </span>
                  ) : null}
                </span>
                <button
                  onClick={holdOrder}
                  disabled={cart.length === 0}
                  className="flex-1 max-w-[88px] py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  Attente
                </button>
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
                  <div key={item.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-medium text-sm text-gray-800 truncate flex-1 mr-2">{item.name}</div>
                      <div className="text-sm font-semibold text-blue-600 whitespace-nowrap">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">{formatPrice(item.price)} x {item.quantity}</div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-500 flex items-center justify-center text-gray-500 transition-all">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-9 h-7 rounded-lg font-semibold text-sm bg-white border border-gray-200 text-gray-800 text-center flex items-center justify-center">
                          {item.quantity}
                        </span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 bg-white border border-gray-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-500 flex items-center justify-center text-gray-500 transition-all">
                          <Plus className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-500 flex items-center justify-center text-gray-400 transition-all ml-0.5">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals & Actions */}
            <div className="border-t border-gray-100 px-3 py-3 space-y-2.5">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Sous-total</span>
                  <span className="font-medium text-gray-700">{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>TVA</span>
                  <span className="font-medium text-emerald-600">{formatPrice(0)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-white font-semibold text-sm">TOTAL</span>
                <span className="text-white font-bold text-lg">{formatPrice(cartTotal)}</span>
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center bg-blue-100">
                    <Printer className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-blue-700">Impression auto</span>
                </div>
                <span className="w-8 h-4.5 rounded-full bg-blue-600 relative" style={{ height: '18px' }}>
                  <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow" />
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={processPayment}
                  disabled={cart.length === 0}
                  className="py-2.5 px-3 rounded-xl font-semibold text-sm transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:shadow-none disabled:hover:scale-100 text-white"
                  style={{ backgroundColor: posConfig.primaryColor }}
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
            </div>
          </div>
        </div>

        {/* Numeric Keypad - Middle */}
        <div className="w-[220px] min-w-[200px] flex flex-col h-full">
          <div className="h-full bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <span className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
                <Calculator className="w-4 h-4 text-gray-400" />
                Pavé numérique
              </span>
            </div>
            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2 px-2.5 pt-2.5">
              {hasTablesModule && (
                <button
                  onClick={() => setShowTableSelector(true)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-medium text-xs h-11 flex flex-col items-center justify-center gap-0.5 transition-all"
                  title="Sélectionner Table"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Table</span>
                </button>
              )}
              <button
                onClick={() => { setLocalNotification('Sélection de client'); setTimeout(() => setLocalNotification(null), 2000); }}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-medium text-xs h-11 flex flex-col items-center justify-center gap-0.5 transition-all"
                title="Sélectionner Client"
              >
                <User className="w-4 h-4" />
                <span>Client</span>
              </button>
              <button
                onClick={() => { setLocalNotification('Historique des ventes'); setTimeout(() => setLocalNotification(null), 2000); }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-medium text-xs h-11 flex flex-col items-center justify-center gap-0.5 transition-all"
                title="Historique des ventes"
              >
                <History className="w-4 h-4" />
                <span>Historique</span>
              </button>
              <button
                onClick={() => setShowCalculator(true)}
                className="bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl font-medium text-xs h-11 flex flex-col items-center justify-center gap-0.5 transition-all"
                title="Calculatrice"
              >
                <Calculator className="w-4 h-4" />
                <span>Calc</span>
              </button>
              <button
                onClick={() => {
                  setLocalNotification('Tiroir ouvert');
                  setDrawerStatus('open');
                  setTimeout(() => { setDrawerStatus('closed'); setLocalNotification(null); }, 3000);
                }}
                className={`rounded-xl font-medium text-xs h-11 flex flex-col items-center justify-center gap-0.5 transition-all ${
                  drawerStatus === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
                title="Ouvrir le tiroir-caisse"
              >
                <Wallet className="w-4 h-4" />
                <span>Caisse</span>
              </button>
              <button
                onClick={() => { setLocalNotification('Commandes de la session'); setTimeout(() => setLocalNotification(null), 2000); }}
                className="relative bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl font-medium text-xs h-11 flex flex-col items-center justify-center gap-0.5 transition-all"
                title="Commandes"
              >
                <ListOrdered className="w-4 h-4" />
                <span>Commande</span>
              </button>
              <button
                onClick={() => setNavHidden(prev => !prev)}
                className={`rounded-xl font-medium text-xs h-11 flex flex-col items-center justify-center gap-0.5 transition-all ${
                  navHidden ? 'bg-violet-100 hover:bg-violet-200 text-violet-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
                title="Masquer la navigation"
              >
                {navHidden ? <ChevronRight className="w-4 h-4" /> : <MenuSquare className="w-4 h-4" />}
                <span>{navHidden ? 'Menu' : 'Masquer'}</span>
              </button>
              <button
                onClick={() => { setLocalNotification('Caisse ouverte'); setTimeout(() => setLocalNotification(null), 2000); }}
                className="bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium text-xs h-11 flex flex-col items-center justify-center gap-0.5 transition-all"
                title="Fermer la caisse"
              >
                <Lock className="w-4 h-4" />
                <span>Fermer</span>
              </button>
            </div>

            {/* Numeric Keypad (miroir de pos-template/components/NumericKeypad.jsx) */}
            <div className="flex-1 p-3 flex flex-col justify-end select-none touch-manipulation">
              <div className="mb-1.5 px-3 text-right font-mono text-sm tracking-wide text-gray-700 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden h-8 flex items-center justify-end" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {keypadValue || '\u00A0'}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {['×', '+', '-', '÷'].map((op) => (
                  <button key={op} onClick={() => handleKeypadClick(op === '×' ? '*' : op === '÷' ? '/' : op)}
                    className="rounded-xl font-bold text-lg bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white border border-blue-600 flex items-center justify-center transition-all active:scale-95"
                    style={{ height: '44px' }}>
                    {op}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((key) => (
                  <button key={key} onClick={() => handleKeypadClick(key)}
                    className="rounded-xl font-bold text-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 flex items-center justify-center transition-all active:scale-95"
                    style={{ height: '44px' }}>
                    {key}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                <button onClick={() => handleKeypadClick('0')}
                  className="rounded-xl font-bold text-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 flex items-center justify-center transition-all active:scale-95"
                  style={{ height: '44px' }}>0</button>
                <button onClick={() => handleKeypadClick('.')}
                  className="rounded-xl font-bold text-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 flex items-center justify-center transition-all active:scale-95"
                  style={{ height: '44px' }}>.</button>
                <button onClick={() => handleKeypadClick('C')}
                  className="rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border border-red-600 flex items-center justify-center transition-all active:scale-95"
                  style={{ height: '44px' }}>C</button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Panel - Right */}
        <div className="flex-1 h-full min-w-0">
          <div className="h-full bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            {/* Search & Categories */}
            <div className="px-4 py-3 flex-shrink-0 border-b border-gray-100 space-y-3">
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

              <div className="flex gap-1.5 overflow-x-auto cat-scroll pb-0.5">
                {categories.map((category) => {
                  const isActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        'flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap min-w-[60px]',
                        isActive ? 'text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-gray-100'
                      )}
                      style={isActive ? { backgroundColor: posConfig.primaryColor } : {}}
                    >
                      <Grid3x3 className="w-5 h-5 opacity-60" />
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
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">Aucun produit disponible</h3>
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
                      className={cn(
                        'flex flex-col justify-between p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:border-blue-200 active:scale-[0.97] min-h-[90px]',
                        selectedCard === product.id
                          ? 'ring-2 ring-blue-500 border-blue-300 shadow-md bg-blue-50/30'
                          : 'border-gray-100 bg-white hover:bg-gray-50',
                        animatingCard === product.id && 'animate-pulse'
                      )}
                    >
                      <div className="space-y-1">
                        {product.image && (
                          <div className="-mx-3 -mt-3 mb-2 overflow-hidden bg-gray-50 h-[72px] flex items-center justify-center rounded-t-xl text-2xl">
                            {product.image}
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-semibold text-sm text-gray-800 leading-tight line-clamp-2">{product.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 truncate bg-gray-50 px-1.5 py-0.5 rounded">
                            {product.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-sm text-blue-600">{formatPrice(product.price)}</span>
                        {product.stock > 0 && product.stock <= 5 && (
                          <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg font-medium">+{product.stock}</span>
                        )}
                        {product.stock === 0 && (
                          <span className="text-[9px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded-lg font-medium">Rupture</span>
                        )}
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
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Confirmation Paiement</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 max-h-44 overflow-y-auto space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Articles</p>
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.quantity}x {formatPrice(item.price)}</div>
                    </div>
                    <div className="text-right font-semibold text-gray-800 whitespace-nowrap ml-3">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Sous-total</span>
                  <span className="font-medium text-gray-700">{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-blue-200 pt-1.5">
                  <span className="font-bold text-gray-800">TOTAL</span>
                  <span className="font-bold text-lg text-blue-600">{formatPrice(cartTotal)}</span>
                </div>
              </div>
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
                        setLocalNotification(`Paiement ${method.label}: ${formatPrice(cartTotal)}`);
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
              <button onClick={() => setShowPaymentMethods(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-all">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draggable Calculator Popup */}
      {showCalculator && (
        <div
          className="absolute bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 select-none overflow-hidden"
          style={{ left: `${calculatorPosition.x}px`, top: `${calculatorPosition.y}px`, width: '260px', cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={(e) => {
            if (e.target.closest('.calculator-button')) return;
            setIsDragging(true);
            setDragOffset({ x: e.clientX - calculatorPosition.x, y: e.clientY - calculatorPosition.y });
          }}
        >
          <div className="bg-blue-500 text-white px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <span className="font-semibold text-sm">Calculatrice</span>
            </div>
            <button onClick={() => { setShowCalculator(false); setKeypadValue(""); }}
              className="calculator-button w-6 h-6 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3 bg-gray-50">
            <div className="bg-gray-900 text-emerald-400 px-3 py-2.5 rounded-xl font-mono text-right text-lg min-h-[42px] flex items-center justify-end">
              {keypadValue || "0"}
            </div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-4 gap-1.5">
              {['C', '←', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '=', ''].map((btn, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (btn === '←') setKeypadValue(prev => prev.slice(0, -1));
                    else if (btn === '÷') handleKeypadClick('/');
                    else if (btn === '×') handleKeypadClick('*');
                    else if (btn === '%') handleKeypadClick('/100*');
                    else if (btn === '=') handleKeypadClick('=');
                    else if (btn) handleKeypadClick(btn);
                  }}
                  className={cn(
                    'calculator-button h-11 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95',
                    btn === 'C' ? 'bg-red-500 hover:bg-red-600 text-white'
                      : btn === '=' ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : ['÷', '×', '-', '+', '%', '←'].includes(btn) ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                      : btn === '0' ? 'bg-gray-100 hover:bg-gray-200 col-span-2'
                      : 'bg-gray-100 hover:bg-gray-200',
                    btn === '' && 'invisible'
                  )}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
          <div className="text-center py-1 bg-gray-50 rounded-b-lg">
            <div className="inline-flex w-8 h-1 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSales;
