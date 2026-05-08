import React, { useState, useEffect } from 'react';
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
  Utensils
} from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';

const Sales = () => {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Integration: Electron config + POSConfiguration styling
  const { config: electronConfig, loading: configLoading } = useAppConfig();

  // Get unified theme configuration
  const getConfig = () => {
    if (electronConfig && electronConfig.theme) {
      console.log('[POS DEBUG] [Sales] Using Electron config:', electronConfig);
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    
    if (typeof window !== 'undefined' && window.themeConfig) {
      console.log('[POS DEBUG] [Sales] Using window.themeConfig');
      return POSConfiguration.createConfig(window.themeConfig);
    }
    
    console.log('[POS DEBUG] [Sales] Using fallback configuration');
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

  // Load data from database
  const [products, setProducts] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);

  useEffect(() => {
    loadProductsFromDB();
    loadTablesFromDB();
  }, []);

  const loadProductsFromDB = async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getProducts();
        console.log('✅ Loaded products from database:', data.length);
        setProducts(data);
      }
    } catch (error) {
      console.error('❌ Failed to load products:', error);
      setProducts([]);
    }
  };

  const loadTablesFromDB = async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getTables();
        console.log('✅ Loaded tables from database:', data.length);
        setAvailableTables(data);
      }
    } catch (error) {
      console.error('❌ Failed to load tables:', error);
      setAvailableTables([]);
    }
  };

  // Categories
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

    setLocalNotification(`➕ ${product.name} ajouté !`);
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
    setLocalNotification("🗑️ Panier vidé");
    setTimeout(() => setLocalNotification(null), 2000);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tout' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
     const startTime = performance.now();
     console.log(`⏱️ [PAYMENT-SAVE START] Method: ${method} - Items: ${cart.length}`);
     
     try {
       // Calculate totals
       const totalAmount = getTotalAmount();
       const discount = 0; // Could be added from UI
       const tax = Math.round(totalAmount * (config.taxRate || 0.19) * 100) / 100;
       const finalTotal = Math.round((totalAmount + tax) * 100) / 100;
       
       // Save sale to database if Electron API is available
       if (window.electronAPI && window.electronAPI.addSale) {
         console.log(`💾 [SAVING-SALE] Total: ${finalTotal}€ - Tax: ${tax}€`);
         
         const saleData = {
           total: finalTotal,
           tax: tax,
           discount: discount,
           payment_method: method
         };
         
         try {
           const savedSale = await window.electronAPI.addSale(saleData);
           const dbDuration = performance.now() - startTime;
           console.log(`✅ [SALE-CREATED] ID: ${savedSale?.id} - ${dbDuration.toFixed(2)}ms`);
           
           // Save individual cart items if sale was created
           if (savedSale && savedSale.id) {
             console.log(`💾 [SAVING-ITEMS] Creating ${cart.length} items...`);
             
             for (const item of cart) {
               try {
                 await window.electronAPI.addSaleItem({
                   sale_id: savedSale.id,
                   product_id: item.id,
                   quantity: item.quantity,
                   unit_price: item.price,
                   total: item.price * item.quantity
                 });
               } catch (itemError) {
                 console.error(`❌ [ITEM-SAVE-ERROR]`, itemError);
               }
             }
             console.log(`✅ [ITEMS-SAVED]`);
           }
         } catch (saleError) {
           console.error(`❌ [SALE-SAVE-ERROR]`, saleError);
           setLocalNotification(`❌ Erreur lors de la sauvegarde: ${saleError.message}`);
           setTimeout(() => setLocalNotification(null), 3000);
           return;
         }
       }
       
       // Show confirmation
       setLocalNotification(`✅ Paiement ${method}: ${formatPrice(finalTotal)}`);
       setCart([]);
       setSelectedTableForOrder(null);
       setShowPaymentMethods(false);
       
       const totalDuration = performance.now() - startTime;
       console.log(`✅ [PAYMENT-COMPLETED] Total: ${totalDuration.toFixed(2)}ms`);
       
       setTimeout(() => setLocalNotification(null), 3000);
     } catch (error) {
       console.error('❌ [PAYMENT-ERROR]', error);
       setLocalNotification(`❌ Erreur lors du paiement`);
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

  const selectTable = (table) => {
    setSelectedTableForOrder(table);
    setShowTableSelector(false);
    setLocalNotification(`📍 Table ${table.number} sélectionnée`);
    setTimeout(() => setLocalNotification(null), 2000);
  };

  const getTableStatusColor = (status) => {
    switch(status) {
      case 'free': return 'bg-green-500';
      case 'occupied': return 'bg-red-500';
      case 'reserved': return 'bg-yellow-500';
      case 'cleaning': return 'bg-gray-500';
      default: return 'bg-gray-500';
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
    <div 
      className="h-screen bg-gray-100 overflow-hidden flex"
      style={{ 
        backgroundColor: config.backgroundColor,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize
      }}
    >
      {/* Notification */}
      {localNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-medium text-sm">{localNotification}</span>
          </div>
        </div>
      )}

      {/* Table Selector Overlay */}
      {showTableSelector && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-auto relative rounded-lg shadow-2xl">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-2xl font-bold" style={{ color: config.textColor }}>
                    <Utensils className="w-6 h-6" />
                    Sélection de Table
                  </h2>
                  <p className="text-sm" style={{ color: config.textMutedColor }}>
                    Choisissez une table pour commencer la commande
                  </p>
                </div>
                <button
                  onClick={() => setShowTableSelector(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title="Fermer"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {availableTables.map((table) => (
                  <button
                    key={table.id || table.number}
                    onClick={() => selectTable(table)}
                    disabled={table.status === 'occupied'}
                    className={`relative p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                      table.status === 'free' 
                        ? 'border-green-500 bg-green-50 hover:bg-green-100 cursor-pointer' 
                        : table.status === 'reserved'
                        ? 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100 cursor-pointer'
                        : 'border-red-300 bg-gray-100 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${getTableStatusColor(table.status)}`}>
                        {table.number}
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-sm">Table {table.number}</div>
                        <div className="text-[10px] text-gray-500">{table.capacity} places</div>
                        <div className={`text-[10px] font-semibold mt-0.5 ${
                          table.status === 'free' ? 'text-green-600' :
                          table.status === 'reserved' ? 'text-yellow-600' :
                          'text-red-600'
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

      {/* Main Content */}
      <div className="h-full w-full flex gap-0.5 p-0.5">
        {/* LEFT SIDE - Cart */}
        <div className="w-[25%] flex flex-col h-full">
          <div 
            className="flex flex-col h-full min-h-0 bg-white rounded-lg shadow-sm"
            style={{ 
              backgroundColor: config.cardBackgroundColor,
              borderColor: config.cardBorderColor
            }}
          >
            {/* Cart Header */}
            <div className="py-1 px-2 flex-shrink-0 border-b" style={{ borderColor: config.cardBorderColor }}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-sm font-bold" style={{ color: config.textColor }}>
                  <ShoppingCart className="w-4 h-4" />
                  {selectedTableForOrder && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded ml-1">
                      Table {selectedTableForOrder.number}
                    </span>
                  )}
                  {!selectedTableForOrder ? 'Commande' : ''}
                </span>
                <span className="text-[11px] bg-blue-100 px-2 py-0.5 rounded" style={{ color: config.primaryColor }}>
                  {getTotalItems()} articles
                </span>
              </div>
            </div>

            {/* Cart Content */}
            <div className="flex flex-col p-1 min-h-0 flex-1">
              {/* Cart Items */}
              <div className="flex-1 space-y-0.5 min-h-0 overflow-y-auto overflow-x-hidden max-h-[400px] pr-1 cart-scroll">
                {cart.length === 0 ? (
                  <div className="text-center py-1" style={{ color: config.textMutedColor }}>
                    <ShoppingCart className="w-4 h-4 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">Panier vide</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-0.5 bg-gray-50 rounded border text-[11px]"
                        style={{ gap: 4, borderColor: config.cardBorderColor }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[13px] truncate" style={{ color: config.textColor }}>
                            {item.name}
                          </div>
                          <div className="text-[11px]" style={{ color: config.textMutedColor }}>
                            {formatPrice(item.price)} × {item.quantity}
                          </div>
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
                        <div className="font-bold text-right ml-2 text-[13px]" style={{ color: config.primaryColor }}>
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total & Payment */}
              <div className="border-t pt-1 space-y-1 flex-shrink-0 px-1" style={{ borderColor: config.cardBorderColor }}>
                <div className="flex justify-between items-center font-bold text-sm bg-blue-50 p-1 rounded">
                  <span className="text-[13px]" style={{ color: config.textColor }}>TOTAL:</span>
                  <span className="text-lg" style={{ color: config.primaryColor }}>
                    {formatPrice(getTotalAmount())}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={handlePayment}
                    disabled={cart.length === 0}
                    className="py-1 px-2 rounded text-white font-bold text-xs transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: config.primaryColor }}
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
                {selectedTableForOrder && (
                  <button
                    onClick={() => {
                      setShowTableSelector(true);
                      setSelectedTableForOrder(null);
                      setCart([]);
                    }}
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
                
                {/* Quick Actions */}
                <div className="grid grid-cols-5 gap-1 mt-1">
                  <button
                    onClick={() => setShowTableSelector(true)}
                    className="bg-green-500 hover:bg-green-600 text-white rounded font-bold text-[9px] flex items-center justify-center h-8"
                    title="Sélectionner Table"
                  >
                    <Utensils className="w-3 h-3" />
                  </button>
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
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Products */}
        <div className="w-[75%] h-full">
          <div 
            className="h-full bg-white rounded-lg shadow-sm flex flex-col"
            style={{ 
              backgroundColor: config.cardBackgroundColor,
              borderColor: config.cardBorderColor
            }}
          >
            {/* Products Header */}
            <div className="py-1 px-2 flex-shrink-0 border-b" style={{ borderColor: config.cardBorderColor }}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-sm font-bold flex items-center gap-1" style={{ color: config.textColor }}>
                  🛍️ Produits
                </span>
                <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded" style={{ color: config.primaryColor }}>
                  {filteredProducts.length} articles
                </span>
              </div>
              {/* Categories */}
              <div className="flex gap-0.5 mt-0.5 overflow-x-auto">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all whitespace-nowrap ${
                      selectedCategory === category
                        ? "text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={{
                      backgroundColor: selectedCategory === category ? config.primaryColor : undefined
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 p-1 overflow-auto">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <Package className="w-20 h-20 text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Aucun produit disponible
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md">
                    Ajoutez des produits dans la section 'Produits' pour commencer les ventes
                  </p>
                  <button
                    onClick={() => window.location.hash = '#/products'}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Aller aux produits
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-1 auto-rows-[minmax(60px,1fr)]">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`flex flex-col justify-between p-1 border rounded cursor-pointer transition-all active:scale-95 min-h-[60px] ${
                        selectedCard === product.id && "ring-2 ring-blue-500"
                      } ${
                        animatingCard === product.id && "animate-pulse"
                      }`}
                      style={{
                        borderColor: config.cardBorderColor,
                        backgroundColor: config.backgroundColor
                      }}
                      onClick={() => addToCart(product)}
                    >
                      <div className="flex-1">
                        <div className="font-bold text-[12px] mb-1 truncate" style={{ color: config.textColor }}>
                          {product.name}
                        </div>
                        <div className="text-[10px] mb-1 truncate" style={{ color: config.textMutedColor }}>
                          {product.category}
                        </div>
                      </div>
                      <div className="font-bold text-sm" style={{ color: config.primaryColor }}>
                        {formatPrice(product.price)}
                      </div>
                    </div>
                  ))}

                  {/* Empty slots */}
                  {[...Array(Math.max(0, 24 - filteredProducts.length))].map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="flex items-center justify-center border-2 border-dashed rounded opacity-20 min-h-[60px]"
                      style={{
                        borderColor: config.cardBorderColor
                      }}
                    >
                      <Plus className="w-4 h-4" style={{ color: config.textMutedColor }} />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-96 rounded-lg shadow-2xl">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold" style={{ color: config.textColor }}>💳 Mode de paiement</h2>
            </div>
            <div className="p-6">
              <div className="text-center text-xl font-bold mb-4 p-3 bg-blue-100 rounded">
                Total: {formatPrice(getTotalAmount())}
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
                    onClick={() => confirmPayment(method.label)}
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
            </div>
          </div>
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
    </div>
  );
};

export default Sales;