import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Package,
  TableProperties,
  Receipt,
  CreditCard,
  Calculator,
  User,
  X,
  Check,
  Utensils,
  Grid3x3
} from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { getIconComponent } from '../components/CategoryIconPicker';

const FamilyIcon = ({ iconName, className = 'w-5 h-5' }) => {
  const IconComponent = getIconComponent(iconName);
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
};

const Sales = () => {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [selectedTableForOrder, setSelectedTableForOrder] = useState(null);
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [animatingCard, setAnimatingCard] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [keypadValue, setKeypadValue] = useState("");
  const [drawerStatus, setDrawerStatus] = useState('closed');
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [localNotification, setLocalNotification] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorPosition, setCalculatorPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [families, setFamilies] = useState([]);

  const { config: electronConfig, loading: configLoading } = useAppConfig();

  const getConfig = () => {
    if (electronConfig && electronConfig.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    if (typeof window !== 'undefined' && window.themeConfig) {
      return POSConfiguration.createConfig(window.themeConfig);
    }
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      textMutedColor: '#6b7280',
      cardBorderColor: '#e5e7eb',
      currency: 'DT',
      currencyPosition: 'after',
      taxRate: 19
    });
  };

  const config = getConfig();
  const cardClasses = POSConfiguration.getCardClasses(config);
  const gridClasses = POSConfiguration.getGridClasses(config);

  const isBarcodeEnabled = electronConfig?.modules
    ? electronConfig.modules.some(m => (m.name || m) === 'barcode' && m.isEnabled !== false)
    : true;

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

  const [products, setProducts] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);

  useEffect(() => {
    loadProductsFromDB();
    loadTablesFromDB();
    loadFamiliesFromDB();
  }, []);

  const loadProductsFromDB = async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getProducts();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    }
  };

  const loadTablesFromDB = async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getTables();
        setAvailableTables(data);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
      setAvailableTables([]);
    }
  };

  const loadFamiliesFromDB = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getFamilies) {
        const rows = await window.electronAPI.getFamilies();
        const familiesList = (rows || []).map(row => ({
          name: row.name,
          icon: row.icon || ''
        })).filter(f => f.name);
        setFamilies(familiesList);
      }
    } catch (error) {
      console.error('Failed to load families:', error);
    }
  };

  const getCategoryIcon = (categoryName) => {
    const family = families.find(f => f.name === categoryName);
    return family ? family.icon : '';
  };

  const categories = ['Tout', ...new Set(products.map(p => p.category))];

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
    setLocalNotification(`${product.name} ajouté`);
    setTimeout(() => setLocalNotification(null), 2000);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setLocalNotification("Panier vidé");
    setTimeout(() => setLocalNotification(null), 2000);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (isBarcodeEnabled && product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'Tout' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const subtotal = getTotalAmount();
  const calculatedDiscount = discountPercentage > 0
    ? Math.round(subtotal * (discountPercentage / 100) * 100) / 100
    : discountAmount;
  const discountedSubtotal = Math.round((subtotal - calculatedDiscount) * 100) / 100;
  const tax = Math.round(discountedSubtotal * (config.taxRate || 0.19) * 100) / 100;
  const finalTotal = Math.round((discountedSubtotal + tax) * 100) / 100;

  const formatPrice = (price) => {
    if (config.currencyPosition === 'before') {
      return `${config.currency}${price.toFixed(2)}`;
    }
    return `${price.toFixed(2)} ${config.currency}`;
  };

  const handlePayment = () => {
    if (cart.length === 0) return;
    setShowPaymentMethods(true);
  };

  const confirmPayment = async (method) => {
    try {
      if (window.electronAPI && window.electronAPI.addSale) {
        const saleData = {
          items: cart,
          subtotal: subtotal,
          discount: calculatedDiscount,
          tax: tax,
          total: finalTotal,
          payment_method: method,
          customer_id: selectedCustomer?.id || null,
          notes: ''
        };
        try {
          await window.electronAPI.addSale(saleData);
        } catch (saleError) {
          setLocalNotification(`Erreur paiement: ${saleError.message}`);
          setTimeout(() => setLocalNotification(null), 3000);
          return;
        }
      }
      window.dispatchEvent(new CustomEvent('sale-completed'));
      setLocalNotification(`Paiement ${method}: ${formatPrice(finalTotal)}`);
      setCart([]);
      setSelectedTableForOrder(null);
      setShowPaymentMethods(false);
      setTimeout(() => setLocalNotification(null), 3000);
    } catch (error) {
      console.error('Payment error:', error);
      setLocalNotification('Erreur lors du paiement');
      setTimeout(() => setLocalNotification(null), 3000);
    }
  };

  const handleKeypadClick = (value) => {
    if (value === 'C') {
      setKeypadValue("");
    } else if (value === '=') {
      try {
        const result = new Function('return ' + (keypadValue || "0"))();
        setKeypadValue(result.toString());
      } catch {
        setLocalNotification("Erreur de calcul");
        setTimeout(() => setLocalNotification(null), 2000);
      }
    } else {
      setKeypadValue(prev => prev + value);
    }
  };

  const selectTable = (table) => {
    setSelectedTableForOrder(table);
    setShowTableSelector(false);
    setLocalNotification(`Table ${table.number} sélectionnée`);
    setTimeout(() => setLocalNotification(null), 2000);
  };

  const getTableStatusColor = (status) => {
    switch(status) {
      case 'free': return 'bg-emerald-500';
      case 'occupied': return 'bg-red-500';
      case 'reserved': return 'bg-amber-500';
      case 'cleaning': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getTableStatusLabel = (status) => {
    switch(status) {
      case 'free': return 'Libre';
      case 'occupied': return 'Occupée';
      case 'reserved': return 'Réservée';
      case 'cleaning': return 'Nettoyage';
      default: return 'Inconnue';
    }
  };

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex">
      {/* Notification */}
      {localNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 backdrop-blur-sm bg-emerald-500/95">
            <span className="font-medium text-sm">{localNotification}</span>
          </div>
        </div>
      )}

      {/* Table Selector Modal */}
      {showTableSelector && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-auto relative rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100">
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
                <button
                  onClick={() => setShowTableSelector(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {availableTables.map((table) => (
                  <button
                    key={table.id || table.number}
                    onClick={() => selectTable(table)}
                    disabled={table.status === 'occupied'}
                    className={`relative p-4 rounded-xl border-2 transition-all hover:scale-[1.03] active:scale-[0.98] ${
                      table.status === 'free'
                        ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 cursor-pointer shadow-sm hover:shadow-md'
                        : table.status === 'reserved'
                        ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 cursor-pointer shadow-sm hover:shadow-md'
                        : 'border-red-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm ${getTableStatusColor(table.status)}`}>
                        {table.number}
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-sm text-gray-800">Table {table.number}</div>
                        <div className="text-[11px] text-gray-400">{table.capacity} places</div>
                        <div className={`text-[11px] font-semibold mt-0.5 ${
                          table.status === 'free' ? 'text-emerald-600' :
                          table.status === 'reserved' ? 'text-amber-600' :
                          'text-red-500'
                        }`}>
                          {getTableStatusLabel(table.status)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="h-full w-full flex gap-2 p-2">
        {/* Cart Panel - Left */}
        <div className="w-[320px] min-w-[280px] flex flex-col h-full">
          <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100">
            {/* Cart Header */}
            <div className="px-4 py-3 flex-shrink-0 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-gray-800">
                  <ShoppingCart className="w-4 h-4 text-gray-400" />
                  Commande
                  {selectedTableForOrder && (
                    <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg ml-1">
                      Table {selectedTableForOrder.number}
                    </span>
                  )}
                </span>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  {getTotalItems()} art.
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
                        {formatPrice(item.price)}
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
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals & Actions */}
            <div className="border-t border-gray-100 px-3 py-3 space-y-2.5">
              {/* Discount */}
              {(calculatedDiscount > 0 || discountPercentage > 0) && (
                <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-200">
                  <div className="flex items-center gap-2 justify-between text-xs">
                    <span className="font-medium text-amber-700">Réduction</span>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="number"
                        value={discountPercentage > 0 ? discountPercentage : discountAmount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (e.target.value.includes('%') || val > 100) {
                            setDiscountPercentage(Math.min(val, 100));
                            setDiscountAmount(0);
                          } else {
                            setDiscountAmount(val);
                            setDiscountPercentage(0);
                          }
                        }}
                        placeholder="0"
                        className="w-14 px-2 py-1 border border-amber-300 rounded-lg text-xs text-center bg-white"
                      />
                      <span className="text-amber-700 font-semibold">
                        {discountPercentage > 0 ? `${discountPercentage}%` : formatPrice(calculatedDiscount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtotal / Tax */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Sous-total</span>
                  <span className="font-medium text-gray-700">{formatPrice(subtotal)}</span>
                </div>
                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Réduction</span>
                    <span className="font-medium">-{formatPrice(calculatedDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>TVA ({(config.taxRate * 100).toFixed(0)}%)</span>
                  <span className="font-medium text-emerald-600">{formatPrice(tax)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-white font-semibold text-sm">TOTAL</span>
                <span className="text-white font-bold text-lg">{formatPrice(finalTotal)}</span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePayment}
                  disabled={cart.length === 0}
                  className="py-2.5 px-3 rounded-xl text-white font-semibold text-sm transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:shadow-none disabled:hover:scale-100"
                  style={{ backgroundColor: config.primaryColor }}
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
                {selectedTableForOrder && (
                  <button
                    onClick={() => {
                      setShowTableSelector(true);
                      setSelectedTableForOrder(null);
                      setCart([]);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    Changer Table
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
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  onClick={() => setShowTableSelector(true)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-medium text-[10px] h-10 flex flex-col items-center justify-center gap-0.5 transition-all"
                  title="Sélectionner Table"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Table</span>
                </button>
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
                    setDrawerStatus('open');
                    setLocalNotification("Tiroir ouvert");
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

        {/* Products Panel - Right */}
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

              {/* Category Filter with Icons */}
              <div className="flex gap-1.5 overflow-x-auto cat-scroll pb-0.5">
                {categories.map((category) => {
                  const iconName = getCategoryIcon(category);
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
                      style={isActive ? { backgroundColor: config.primaryColor } : {}}
                    >
                      {iconName ? (
                        <FamilyIcon iconName={iconName} className="w-5 h-5" />
                      ) : (
                        <Grid3x3 className="w-5 h-5 opacity-60" />
                      )}
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
                  <button
                    onClick={() => window.location.hash = '#/products'}
                    className="px-6 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-sm hover:shadow-md text-sm font-medium"
                  >
                    Aller aux produits
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-5 xl:grid-cols-6 gap-2 auto-rows-[minmax(90px,1fr)]">
                  {filteredProducts.map((product) => {
                    const iconName = getCategoryIcon(product.category);
                    return (
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
                        <div className="space-y-1">
                          {product.image && (
                            <div className="-mx-3 -mt-3 mb-2 overflow-hidden bg-gray-50 h-[72px]">
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-semibold text-sm text-gray-800 leading-tight line-clamp-2">
                              {product.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {iconName && <FamilyIcon iconName={iconName} className="w-3.5 h-3.5 text-gray-400" />}
                            <span className="text-[10px] text-gray-400 truncate">
                              {product.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-bold text-sm text-blue-600">
                            {formatPrice(product.price)}
                          </span>
                          {product.stock !== undefined && product.stock <= 5 && product.stock > 0 && (
                            <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg font-medium">
                              +{product.stock}
                            </span>
                          )}
                          {product.stock === 0 && (
                            <span className="text-[9px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded-lg font-medium">
                              Rupture
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                      <div className="text-xs text-gray-400">{item.quantity}x {formatPrice(item.price)}</div>
                    </div>
                    <div className="text-right font-semibold text-gray-800 whitespace-nowrap ml-3">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Sous-total</span>
                  <span className="font-medium text-gray-700">{formatPrice(subtotal)}</span>
                </div>
                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Réduction</span>
                    <span className="font-medium">-{formatPrice(calculatedDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-blue-100 pt-1.5">
                  <span className="text-gray-500">TVA ({(config.taxRate * 100).toFixed(0)}%)</span>
                  <span className="font-medium text-emerald-600">{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-blue-200 pt-1.5">
                  <span className="font-bold text-gray-800">TOTAL</span>
                  <span className="font-bold text-lg text-blue-600">{formatPrice(finalTotal)}</span>
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
                      onClick={() => confirmPayment(method.label)}
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

      {/* Draggable Calculator */}
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
                  className={`calculator-button h-11 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                    btn === 'C'
                      ? 'bg-red-100 hover:bg-red-200 text-red-600'
                      : btn === '='
                        ? 'bg-blue-500 hover:bg-blue-600 text-white col-span-1'
                        : ['÷', '×', '-', '+', '%', '←'].includes(btn)
                          ? 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                          : btn === '0'
                            ? 'bg-gray-100 hover:bg-gray-200 col-span-2 text-gray-700'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  } ${index === 19 ? 'hidden' : ''}`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
