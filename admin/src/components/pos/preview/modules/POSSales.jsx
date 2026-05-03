import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { POSConfiguration } from '../../../../config/POSConfiguration';
import { ShoppingCart, Plus, Minus, X, User, Calculator, Utensils, Check } from 'lucide-react';
import { cn } from '../../../../lib/utils';

export const POSSales = ({ config, setNotification, modules = [] }) => {
  // Add custom scrollbar styles for cart
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .cart-scroll::-webkit-scrollbar {
        width: 6px;
      }
      .cart-scroll::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
      }
      .cart-scroll::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }
      .cart-scroll::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
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
    { id: 1, number: 1, status: 'available', seats: 4, currentTotal: 0 },
    { id: 2, number: 2, status: 'occupied', seats: 2, currentTotal: 23.50 },
    { id: 3, number: 3, status: 'available', seats: 6, currentTotal: 0 },
    { id: 4, number: 4, status: 'occupied', seats: 4, currentTotal: 45.80 },
    { id: 5, number: 5, status: 'reserved', seats: 8, currentTotal: 0 },
    { id: 6, number: 6, status: 'available', seats: 2, currentTotal: 0 },
    { id: 7, number: 7, status: 'available', seats: 4, currentTotal: 0 },
    { id: 8, number: 8, status: 'occupied', seats: 6, currentTotal: 67.20 },
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

  // Produits
  const products = [
    { id: 1, name: 'Café Expresso', price: 2.50, category: 'Boissons' },
    { id: 2, name: 'Croissant', price: 1.80, category: 'Pâtisserie' },
    { id: 3, name: 'Sandwich Jambon', price: 4.50, category: 'Snacks' },
    { id: 4, name: 'Jus d\'Orange', price: 3.20, category: 'Boissons' },
    { id: 5, name: 'Salade César', price: 7.90, category: 'Plats' },
    { id: 6, name: 'Eau Minérale', price: 1.50, category: 'Boissons' },
    { id: 7, name: 'Muffin Chocolat', price: 2.80, category: 'Pâtisserie' },
    { id: 8, name: 'Wrap Poulet', price: 5.50, category: 'Snacks' },
    { id: 9, name: 'Cappuccino', price: 3.00, category: 'Boissons' },
    { id: 10, name: 'Quiche Lorraine', price: 4.20, category: 'Plats' },
    { id: 11, name: 'Thé Vert', price: 2.20, category: 'Boissons' },
    { id: 12, name: 'Pain au Chocolat', price: 2.00, category: 'Pâtisserie' },
  ];

  const categories = ['Tout', 'Boissons', 'Pâtisserie', 'Snacks', 'Plats'];

  const filteredProducts = selectedCategory === 'Tout'
    ? products
    : products.filter(product => product.category === selectedCategory);

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
    setLocalNotification(`📍 Table ${table.number} sélectionnée`);
    setTimeout(() => setLocalNotification(null), 2000);
  };
  
  const changeTable = () => {
    setShowTableSelector(true);
    setSelectedTable(null);
    setCart([]);
  };
  
  const getTableStatusColor = (status) => {
    switch(status) {
      case 'available': return 'bg-green-500';
      case 'occupied': return 'bg-red-500';
      case 'reserved': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getTableStatusLabel = (status) => {
    switch(status) {
      case 'available': return 'Libre';
      case 'occupied': return 'Occupée';
      case 'reserved': return 'Réservée';
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
    <div className="h-screen bg-gray-100 overflow-hidden flex">
      {/* Table Selector Overlay */}
      {hasTablesModule && showTableSelector && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Utensils className="w-6 h-6" />
                    Sélection de Table
                  </CardTitle>
                  <p className="text-sm text-gray-500">Choisissez une table pour commencer la commande</p>
                </div>
                <button
                  onClick={() => setShowTableSelector(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title="Fermer"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => selectTable(table)}
                    disabled={table.status === 'occupied'}
                    className={cn(
                      "relative p-3 rounded-lg border-2 transition-all hover:scale-105",
                      table.status === 'available' 
                        ? 'border-green-500 bg-green-50 hover:bg-green-100 cursor-pointer' 
                        : table.status === 'reserved'
                        ? 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100 cursor-pointer'
                        : 'border-red-300 bg-gray-100 cursor-not-allowed opacity-60'
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg",
                        getTableStatusColor(table.status)
                      )}>
                        {table.number}
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-sm">Table {table.number}</div>
                        <div className="text-[10px] text-gray-500">{table.seats} places</div>
                        <div className={cn(
                          "text-[10px] font-semibold mt-0.5",
                          table.status === 'available' ? 'text-green-600' :
                          table.status === 'reserved' ? 'text-yellow-600' :
                          'text-red-600'
                        )}>
                          {getTableStatusLabel(table.status)}
                        </div>
                        {table.currentTotal > 0 && (
                          <div className="text-[10px] text-gray-600 mt-0.5">
                            {table.currentTotal.toFixed(2)}€
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {!hasTablesModule && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowTableSelector(false)}
                    className="w-full py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Mode Sans Table
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Main Content - Full height (no scroll) */}
      <div className="h-full w-full flex gap-0.5 p-0.5">
        {/* LEFT SIDE - Cart & Calculator (compact width) */}
        <div className="w-[25%] flex flex-col h-full">
          {/* Cart - full height */}
          <Card className="flex flex-col h-full min-h-0">
            <CardHeader className="py-1 px-2 flex-shrink-0">
              <CardTitle className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-sm">
                  <ShoppingCart className="w-4 h-4" />
                  {hasTablesModule && selectedTable && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded ml-1">
                      Table {selectedTable.number}
                    </span>
                  )}
                  {!selectedTable && hasTablesModule ? 'Sans table' : 'Commande'}
                </span>
                <span className="text-[11px] bg-blue-100 px-2 py-0.5 rounded">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} articles
                </span>
              </CardTitle>
            </CardHeader>

            {/* Cart content sized to fit: header + list + footer */}
            <CardContent className="flex flex-col p-1 min-h-0">
              {/* Cart Items - scrollable area with max height */}
              <div 
                className="flex-1 space-y-0.5 min-h-0 overflow-y-auto overflow-x-hidden max-h-[400px] pr-1 cart-scroll" 
                style={{ 
                  scrollbarWidth: 'thin', 
                  scrollbarColor: '#cbd5e1 #f1f5f9',
                  '--scrollbar-width': '6px'
                }}
              >
                {cart.length === 0 ? (
                  <div className="text-center py-1 text-gray-500">
                    <ShoppingCart className="w-4 h-4 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">Panier vide</p>
                  </div>
                ) : (
                  // compact items (reduced paddings & font sizes)
                  <div className="space-y-0.5">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-0.5 bg-gray-50 rounded border text-[11px]"
                        style={{ gap: 4 }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[13px] truncate">{item.name}</div>
                          <div className="text-gray-500 text-[11px]">{item.price.toFixed(2)}€ × {item.quantity}</div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold text-[12px]">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-6 h-6 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center ml-1 text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="font-bold text-right ml-2 text-[13px]" style={{ color: currentConfig.primaryColor }}>
                          {(item.price * item.quantity).toFixed(2)}€
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total & Payment - small footer to save vertical space */}
              <div className="border-t pt-1 space-y-1 flex-shrink-0 px-1">
                <div className="flex justify-between items-center font-bold text-sm bg-blue-50 p-1 rounded">
                  <span className="text-[13px]">TOTAL:</span>
                  <span className="text-lg" style={{ color: currentConfig.primaryColor }}>
                    {cartTotal.toFixed(2)}€
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={processPayment}
                    className="py-1 px-2 rounded text-white font-bold text-xs transition-all hover:opacity-90"
                    style={{ backgroundColor: currentConfig.primaryColor }}
                  >
                    💳 ENCAISSER
                  </button>
                  <button
                    onClick={clearCart}
                    className="py-1 px-2 rounded bg-red-500 hover:bg-red-600 text-white text-xs"
                  >
                    🗑️ VIDER
                  </button>
                </div>
                {hasTablesModule && selectedTable && (
                  <button
                    onClick={changeTable}
                    className="w-full py-1 px-2 rounded bg-purple-500 hover:bg-purple-600 text-white text-xs flex items-center justify-center gap-1"
                  >
                    <Utensils className="w-3 h-3" />
                    Changer Table
                  </button>
                )}
                <button
                  onClick={() => setShowCalculator(true)}
                  className="w-full py-1 px-2 rounded bg-blue-500 hover:bg-blue-600 text-white text-xs flex items-center justify-center gap-1"
                >
                  <Calculator className="w-3 h-3" />
                  CALCULATRICE
                </button>
                
                {/* Quick Actions - directly under calculator */}
                <div className={`grid ${hasTablesModule ? 'grid-cols-5' : 'grid-cols-4'} gap-1 mt-1`}>
                  {hasTablesModule && (
                    <button
                      onClick={() => setShowTableSelector(true)}
                      className="bg-green-500 hover:bg-green-600 text-white rounded font-bold text-[9px] flex items-center justify-center h-8"
                      title="Sélectionner Table"
                    >
                      <Utensils className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setLocalNotification("👤 Gestion client");
                      setTimeout(() => setLocalNotification(null), 2000);
                    }}
                    className="bg-purple-500 hover:bg-purple-600 text-white rounded font-bold text-[9px] flex items-center justify-center h-8"
                    title="Client"
                  >
                    <User className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      setLocalNotification("📈 Rapports");
                      setTimeout(() => setLocalNotification(null), 2000);
                    }}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white rounded font-bold text-[9px] flex items-center justify-center h-8"
                    title="Rapports"
                  >
                    📈
                  </button>
                  <button
                    onClick={() => {
                      setLocalNotification("🎫 Impression ticket");
                      setTimeout(() => setLocalNotification(null), 2000);
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded font-bold text-[9px] flex items-center justify-center h-8"
                    title="Ticket"
                  >
                    🎫
                  </button>
                  <button
                    onClick={() => {
                      setLocalNotification("💰 Tiroir ouvert !");
                      setDrawerStatus('open');
                      setTimeout(() => {
                        setDrawerStatus('closed');
                        setLocalNotification(null);
                      }, 3000);
                    }}
                    className={`rounded font-bold text-[9px] h-8 flex items-center justify-center ${
                      drawerStatus === 'open'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-500 hover:bg-gray-600 text-white'
                    }`}
                    title="Tiroir caisse"
                  >
                    💰
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>




        </div>

        {/* RIGHT SIDE - Products (expanded width) */}
        <div className="w-[75%] h-full">
          {/* Products take up full right side height */}
          <div className="h-full">
            {/* Products Section - full height utilization */}
            <Card className="flex flex-col h-full">
              <CardHeader className="py-1 px-2 flex-shrink-0">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="text-sm">🛍️ Produits</span>
                  <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded">
                    {filteredProducts.length} articles
                  </span>
                </CardTitle>
                {/* Categories (very compact) */}
                <div className="flex gap-0.5 mt-0.5">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                        selectedCategory === category
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </CardHeader>

              {/* Product grid: scrollable when content overflows */}
              <CardContent className="flex-1 p-1 overflow-auto">
                <div className="grid grid-cols-6 gap-1 auto-rows-[minmax(60px,1fr)]">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={cn(
                        "flex flex-col justify-between p-1 border rounded cursor-pointer transition-all active:scale-95 min-h-[60px]",
                        selectedCard === product.id && "ring-2 ring-blue-500",
                        animatingCard === product.id && "animate-pulse"
                      )}
                      style={{
                        borderColor: currentConfig.cardBorderColor,
                        backgroundColor: currentConfig.backgroundColor
                      }}
                      onClick={() => addToCart(product)}
                    >
                      <div className="flex-1">
                        <div className="font-bold text-[12px] mb-1 truncate" style={{ color: currentConfig.textColor }}>
                          {product.name}
                        </div>
                        <div className="text-[10px] mb-1 truncate" style={{ color: currentConfig.textMutedColor }}>
                          {product.category}
                        </div>
                      </div>
                      <div className="font-bold text-sm" style={{ color: currentConfig.primaryColor }}>
                        {product.price.toFixed(2)}€
                      </div>
                    </div>
                  ))}

                  {/* Empty slots: show fewer for better sizing */}
                  {[...Array(Math.max(0, 24 - filteredProducts.length))].map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="flex items-center justify-center border-2 border-dashed rounded opacity-20 min-h-[60px]"
                      style={{
                        borderColor: currentConfig.cardBorderColor
                      }}
                    >
                      <Plus className="w-4 h-4" style={{ color: currentConfig.textMutedColor }} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Modal (unchanged) */}
      {showPaymentMethods && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>💳 Mode de paiement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-xl font-bold mb-4 p-3 bg-blue-100 rounded">
                Total: {cartTotal.toFixed(2)}€
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: '💵 Espèces', color: 'bg-green-500 hover:bg-green-600' },
                  { label: '💳 Carte', color: 'bg-blue-500 hover:bg-blue-600' },
                  { label: '📝 Chèque', color: 'bg-purple-500 hover:bg-purple-600' },
                  { label: '📱 Mobile', color: 'bg-orange-500 hover:bg-orange-600' }
                ].map(method => (
                  <button
                    key={method.label}
                    onClick={() => {
                      setLocalNotification(`✅ Paiement ${method.label}: ${cartTotal.toFixed(2)}€`);
                      setCart([]);
                      setShowPaymentMethods(false);
                      setTimeout(() => setLocalNotification(null), 3000);
                    }}
                    className={`p-3 ${method.color} text-white rounded-lg font-bold transition-all`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowPaymentMethods(false)}
                className="w-full p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
              >
                Annuler
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Draggable Calculator Popup */}
      {showCalculator && (
        <div
          className="fixed bg-white border-2 border-blue-300 rounded-lg shadow-2xl z-50 select-none"
          style={{
            left: `${calculatorPosition.x}px`,
            top: `${calculatorPosition.y}px`,
            width: '280px',
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
          {/* Calculator Header */}
          <div className="bg-blue-500 text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <span className="font-bold text-sm">Calculatrice</span>
            </div>
            <button
              onClick={() => {
                setShowCalculator(false);
                setKeypadValue("");
              }}
              className="calculator-button w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Calculator Display */}
          <div className="p-3 bg-gray-50">
            <div className="bg-black text-green-400 px-3 py-2 rounded font-mono text-right text-lg min-h-[40px] flex items-center justify-end">
              {keypadValue || "0"}
            </div>
          </div>

          {/* Calculator Buttons */}
          <div className="p-3">
            <div className="grid grid-cols-4 gap-2">
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
                    calculator-button h-12 rounded font-bold text-sm transition-all hover:scale-105 active:scale-95
                    ${btn === 'C'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : btn === '='
                        ? 'bg-green-500 hover:bg-green-600 text-white col-span-1'
                        : ['÷', '×', '-', '+', '%', '←'].includes(btn)
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : btn === '0'
                            ? 'bg-gray-200 hover:bg-gray-300 col-span-2'
                            : 'bg-gray-200 hover:bg-gray-300'
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
          <div className="text-center py-1 bg-gray-100 rounded-b-lg">
            <div className="inline-flex w-8 h-1 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      )}

      {/* Local Notification Overlay - slides in from top */}
      {localNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-medium text-sm">{localNotification}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSales;
