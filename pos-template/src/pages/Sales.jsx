import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Grid3x3,
  PauseCircle,
  Clock,
  Play,
  ListOrdered,
  RotateCcw,
  Lock,
  Unlock,
  History,
  FileText,
  Printer,
  Wallet,
  CircleDollarSign,
  Eye,
  RefreshCw,
  MenuSquare,
  ChevronRight
} from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../contexts/AuthContext';
import { getIconComponent } from '../components/CategoryIconPicker';
import NumericKeypad from '../components/NumericKeypad';
import { activityLog } from '../utils/activityLog';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';

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
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showQuickCreateCustomer, setShowQuickCreateCustomer] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState({ name: '', phone: '', email: '' });
  const [families, setFamilies] = useState([]);
  const [heldOrders, setHeldOrders] = useState([]);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [editingQuantityId, setEditingQuantityId] = useState(null);
  const [quantityInput, setQuantityInput] = useState('');
  const [sessionOrders, setSessionOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_session_orders');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showSessionOrders, setShowSessionOrders] = useState(false);
  useEffect(() => {
    const capped = sessionOrders.slice(0, 20);
    localStorage.setItem('pos_session_orders', JSON.stringify(capped));
  }, [sessionOrders]);
  const [paymentAmountReceived, setPaymentAmountReceived] = useState('');
  const [activeShift, setActiveShift] = useState(null);
  const [showOpenShiftDialog, setShowOpenShiftDialog] = useState(false);
  const [showCloseShiftDialog, setShowCloseShiftDialog] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('');
  const [closingActual, setClosingActual] = useState('');
  const [shiftSummary, setShiftSummary] = useState(null);
  const [showShiftSummary, setShowShiftSummary] = useState(false);
  const [vatRates, setVatRates] = useState([]);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [autoPrint, setAutoPrint] = useState(true);
  const shiftCheckedRef = useRef(false);

  const [showTicketHistory, setShowTicketHistory] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]);
  const [salesHistoryTotal, setSalesHistoryTotal] = useState(0);
  const [salesHistoryPage, setSalesHistoryPage] = useState(0);
  const [salesHistorySearch, setSalesHistorySearch] = useState('');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
  const [showSaleDetail, setShowSaleDetail] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [pendingPrintSale, setPendingPrintSale] = useState(null);

  const [showPendingComplete, setShowPendingComplete] = useState(false);
  const [pendingSaleToComplete, setPendingSaleToComplete] = useState(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState('Espèces');

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isOpeningDrawer, setIsOpeningDrawer] = useState(false);
  const [navHidden, setNavHidden] = useState(false);

  const [keypadOperator, setKeypadOperator] = useState(null);

  const { config: electronConfig, loading: configLoading } = useAppConfig();
  const { user } = useAuth();

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

  const isTablesEnabled = electronConfig?.modules
    ? electronConfig.modules.some(m => (m.name || m) === 'tables' && m.isEnabled !== false)
    : false;

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
    window.dispatchEvent(new CustomEvent('pos-navbar-toggle', { detail: { hidden: navHidden } }));
    return () => window.dispatchEvent(new CustomEvent('pos-navbar-toggle', { detail: { hidden: false } }));
  }, [navHidden]);

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
    loadHeldOrdersFromDB();
    loadActiveShift();
    loadVatRatesFromDB();
    loadTaxSettings();
    loadCustomersList();
    loadAutoPrintSetting();
  }, []);

  useEffect(() => {
    if (activeShift) return;
    const blockKeys = (e) => {
      if (e.key === 'Escape') return;
      if (e.key === 'Tab') { e.preventDefault(); return; }
      e.stopImmediatePropagation();
      e.preventDefault();
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => window.removeEventListener('keydown', blockKeys, true);
  }, [activeShift]);

  const loadTaxSettings = async () => {
    try {
      if (window.electronAPI?.getAllSettings) {
        const dbSettings = await window.electronAPI.getAllSettings();
        if (dbSettings) {
          setTaxEnabled(dbSettings.taxEnabled === 'true' || dbSettings.taxEnabled === true);
        }
      }
    } catch (error) {
      console.warn('Could not load tax settings:', error);
    }
  };

  const loadAutoPrintSetting = async () => {
    try {
      if (window.electronAPI?.getAllSettings) {
        const dbSettings = await window.electronAPI.getAllSettings();
        if (dbSettings) {
          setAutoPrint(dbSettings.printReceipts === 'true' || dbSettings.printReceipts === true);
        }
      }
    } catch (error) {
      console.warn('Could not load auto-print setting:', error);
    }
  };

  const loadCustomersList = async () => {
    try {
      if (window.electronAPI?.getCustomers) {
        const data = await window.electronAPI.getCustomers();
        setCustomersList(data || []);
      }
    } catch (error) {
      console.warn('Could not load customers:', error);
    }
  };

  const filteredCustomersList = useMemo(() => {
    if (!customerSearch.trim()) return customersList.filter(c => c.is_active !== 0);
    const q = customerSearch.toLowerCase();
    return customersList.filter(c =>
      (c.is_active !== 0) && (
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      )
    );
  }, [customersList, customerSearch]);

  const handleQuickCreateCustomer = async () => {
    if (!quickCustomerForm.name.trim()) return;
    try {
      const result = await window.electronAPI.addCustomer({
        name: quickCustomerForm.name.trim(),
        phone: quickCustomerForm.phone.trim(),
        email: quickCustomerForm.email.trim()
      });
      if (result && result.id) {
        const newCustomer = { id: result.id, name: quickCustomerForm.name.trim(), phone: quickCustomerForm.phone.trim(), email: quickCustomerForm.email.trim(), loyalty_points: 0, is_active: 1 };
        setCustomersList(prev => [...prev, newCustomer]);
        setSelectedCustomer(newCustomer);
        setShowQuickCreateCustomer(false);
        setQuickCustomerForm({ name: '', phone: '', email: '' });
        setShowCustomerSelector(false);
      }
    } catch (error) {
      console.error('Quick create customer failed:', error);
    }
  };

  const loadActiveShift = async () => {
    try {
      if (window.electronAPI?.getActiveShift) {
        const shift = await window.electronAPI.getActiveShift();
        if (shift) {
          setActiveShift(shift);
          shiftCheckedRef.current = true;
        } else if (!shiftCheckedRef.current) {
          shiftCheckedRef.current = true;
          setShowOpenShiftDialog(true);
        }
      }
    } catch (error) {
      console.error('Failed to load active shift:', error);
    }
  };

  const handleOpenShift = async () => {
    try {
      if (window.electronAPI?.openShift) {
        const shift = await window.electronAPI.openShift({
          user_id: user?.id || null,
          user_name: user?.full_name || user?.name || 'Caissier',
          opening_float: parseFloat(openingFloat) || 0
        });
        if (shift) {
          const newShift = { id: shift.id, opening_float: parseFloat(openingFloat) || 0, opened_at: new Date().toISOString(), status: 'open', cash_sales: 0, card_sales: 0, other_sales: 0 };
          setActiveShift(newShift);
          setShowOpenShiftDialog(false);
          setOpeningFloat('100');
        }
      }
    } catch (error) {
      console.error('Failed to open shift:', error);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    try {
      if (window.electronAPI?.closeShift) {
        const closing = parseFloat(closingActual) || 0;
        const totalSales = (activeShift.cash_sales || 0) + (activeShift.card_sales || 0) + (activeShift.other_sales || 0);
        const expected = (activeShift.opening_float || 0) + totalSales;
        await window.electronAPI.closeShift({
          shift_id: activeShift.id,
          closing_actual: closing,
          closing_expected: expected,
          cash_sales: activeShift.cash_sales || 0,
          card_sales: activeShift.card_sales || 0,
          other_sales: activeShift.other_sales || 0
        });
        const summary = {
          opening_float: activeShift.opening_float || 0,
          total_sales: totalSales,
          sales_count: activeShift.sales_count || 0,
          closing_amount: closing,
          difference: closing - expected
        };
        setShiftSummary(summary);
        setActiveShift(null);
        shiftCheckedRef.current = false;
        setShowCloseShiftDialog(false);
        setShowShiftSummary(true);
        setClosingActual('');
      }
    } catch (error) {
      console.error('Failed to close shift:', error);
    }
  };

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

  const loadHeldOrdersFromDB = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getHeldOrders) {
        const orders = await window.electronAPI.getHeldOrders();
        setHeldOrders(orders || []);
      }
    } catch (error) {
      console.error('Failed to load held orders:', error);
    }
  };

  const loadVatRatesFromDB = async () => {
    try {
      if (window.electronAPI?.getVatRates) {
        const rates = await window.electronAPI.getVatRates();
        setVatRates(rates || []);
      }
    } catch (error) {
      console.error('Failed to load VAT rates:', error);
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
      const matchesCategory = selectedCategory === 'Tout' || (product.family || product.category) === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const subtotal = getTotalAmount();

  const getVatForItem = (item) => {
    if (!taxEnabled || !vatRates.length) return { vatRate: 0, vatAmount: 0, priceType: 'ttc' };
    const product = products.find(p => p.id === item.id);
    if (!product?.vat_rate_id) return { vatRate: 0, vatAmount: 0, priceType: product?.price_type || 'ttc' };
    const vr = vatRates.find(v => v.id === product.vat_rate_id && v.is_active);
    if (!vr) return { vatRate: 0, vatAmount: 0, priceType: product?.price_type || 'ttc' };
    const amount = item.price * item.quantity;
    const pt = product.price_type || 'ttc';
    let vatAmount;
    if (pt === 'ht') {
      // HT price: VAT is added on top
      vatAmount = Math.round(amount * (vr.rate / 100) * 100) / 100;
    } else {
      // TTC price: VAT is already included, extract it
      vatAmount = Math.round(amount * (vr.rate / (100 + vr.rate)) * 100) / 100;
    }
    return { vatRate: vr.rate, vatAmount, priceType: pt };
  };

  const cartVatBreakdown = useMemo(() => {
    if (!taxEnabled || !vatRates.length) return { totalVat: 0, breakdown: [] };
    let totalVat = 0;
    const breakdown = cart.map(item => {
      const { vatRate, vatAmount } = getVatForItem(item);
      totalVat += vatAmount;
      return { ...item, vatRate, vatAmount };
    });
    return { totalVat: Math.round(totalVat * 100) / 100, breakdown };
  }, [cart, vatRates, taxEnabled, products]);

  const calculatedDiscount = discountPercentage > 0
    ? Math.round(subtotal * (discountPercentage / 100) * 100) / 100
    : discountAmount;
  const discountedSubtotal = Math.round((subtotal - calculatedDiscount) * 100) / 100;
  const tax = cartVatBreakdown.totalVat > 0 ? cartVatBreakdown.totalVat :
    taxEnabled ? Math.round(discountedSubtotal * (config.taxRate || 0) * 100) / 100 : 0;
  const finalTotal = Math.round((discountedSubtotal + tax) * 100) / 100;

  const formatPrice = (price) => {
    const p = typeof price === 'number' && !isNaN(price) ? price : 0;
    if (config.currencyPosition === 'before') {
      return `${config.currency}${p.toFixed(2)}`;
    }
    return `${p.toFixed(2)} ${config.currency}`;
  };

  const printReceipt = async (saleId, method) => {
    try {
      let configStr = null;
      if (window.electronAPI?.getReceiptConfig) {
        configStr = await window.electronAPI.getReceiptConfig();
      }
      if (!configStr) {
        configStr = localStorage.getItem('receiptConfig');
      }
      const receiptConfig = JSON.parse(configStr || '{}');
      const cfg = receiptConfig.header || {};
      const contentCfg = receiptConfig.content || {};

      const lines = [];
      const p = (text, align = 'center') => lines.push({ text, align });
      const sep = () => p('─'.repeat(32));
      const priceCol = (label, val) => {
        const v = typeof val === 'number' ? formatPrice(val) : val;
        const pad = Math.max(1, 32 - label.length - v.length);
        p(label + ' '.repeat(pad) + v, 'right');
      };

      if (cfg.showBusinessName && cfg.businessName) p(cfg.businessName.toUpperCase());
      if (cfg.showAddress && cfg.address) p(cfg.address);
      if (cfg.showPhone && cfg.phone) p(`Tél: ${cfg.phone}`);
      if (cfg.showTaxId && cfg.taxId) p(`N°: ${cfg.taxId}`);
      sep();

      if (contentCfg.showDate !== false) {
        p(new Date().toLocaleString('fr-FR'));
      }
      if (contentCfg.showReceiptNumber !== false) p(`Reçu #${saleId}`);
      if (contentCfg.showCashier !== false && user) p(`Caissier: ${user.fullName || user.username}`);
      if (contentCfg.showTable !== false && selectedTableForOrder) {
        p(`Table: ${selectedTableForOrder.table_number}`);
      }
      sep();

      p('Qté  Article', 'left');
      p('', 'left');
      cart.forEach(item => {
        const { vatRate, vatAmount, priceType } = getVatForItem(item);
        const itemTotal = item.price * item.quantity;
        p(`${item.quantity}x  ${item.name}`, 'left');
        if (taxEnabled && vatRate > 0) {
          const pt = priceType || 'ttc';
          if (pt === 'ht') {
            priceCol(`  HT (${vatRate}%)`, itemTotal);
            priceCol('  TVA', vatAmount);
          } else {
            priceCol(`  TTC (${vatRate}%)`, itemTotal);
            priceCol('  dont TVA', vatAmount);
          }
        } else {
          priceCol('', itemTotal);
        }
      });
      sep();

      const footerCfg = receiptConfig.footer || {};
      if (footerCfg.showSubtotal !== false) priceCol('Sous-total', subtotal);
      if (calculatedDiscount > 0 && footerCfg.showDiscount !== false) priceCol('Réduction', -calculatedDiscount);
      if (footerCfg.showTax !== false && tax > 0) priceCol('TVA', tax);
      sep();
      if (footerCfg.showTotal !== false) {
        p('TOTAL', 'left');
        p(formatPrice(finalTotal), 'right');
        p('');
      }
      if (footerCfg.showPaymentMethod !== false) p(`Paiement: ${method}`);

      (receiptConfig.footer?.customMessages || []).filter(m => m.enabled).forEach(m => {
        if (m.text) p(m.text, m.align || 'center');
      });

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page { margin: 0; width: ${receiptConfig.paperWidth || 80}mm; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: ${receiptConfig.paperWidth || 80}mm; margin: 0 auto; padding: 10px; }
        .l { text-align: left; } .c { text-align: center; } .r { text-align: right; }
        .line { white-space: pre-wrap; margin: 2px 0; }
      </style></head><body>
        ${lines.map(l => `<div class="line ${l.align === 'left' ? 'l' : l.align === 'right' ? 'r' : 'c'}">${l.text}</div>`).join('')}
      </body></html>`;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) { console.warn('Print error:', e); }
        setTimeout(() => { try { document.body.removeChild(iframe); } catch (e) {} }, 1000);
      }, 200);
    } catch (e) {
      console.error('Receipt print error:', e);
    }
  };

  const handlePayment = () => {
    if (cart.length === 0) return;
    setShowPaymentMethods(true);
  };

  const confirmPayment = async (method) => {
    if (isProcessingPayment) return;
    const isPending = method === 'À payer';
    try {
      if (!activeShift && !isPending) {
        setLocalNotification('⚠️ Ouvrez la caisse d\'abord');
        setShowPaymentMethods(false);
        setShowOpenShiftDialog(true);
        return;
      }
      setIsProcessingPayment(true);
      let saleResult = null;
      if (window.electronAPI && window.electronAPI.addSale) {
        const itemsWithVat = cart.map(item => {
          const { vatRate, vatAmount } = getVatForItem(item);
          return { ...item, vat_rate: vatRate, vat_amount: vatAmount };
        });
        const saleData = {
          items: itemsWithVat,
          subtotal: subtotal,
          total: finalTotal,
          tax: tax,
          discount: calculatedDiscount,
          discount_percentage: discountPercentage,
          payment_method: isPending ? 'pending' : method,
          customer_id: selectedCustomer?.id || null,
          user_id: user?.id || null,
          table_id: selectedTableForOrder?.id || null,
          shift_id: activeShift?.id || null,
          notes: '',
          status: isPending ? 'pending' : 'paid'
        };
        try {
          saleResult = await window.electronAPI.addSale(saleData);
        } catch (saleError) {
          console.error('Sale creation failed:', saleError);
          setLocalNotification(`Erreur: ${saleError.message}`);
          setShowPaymentMethods(false);
          setIsProcessingPayment(false);
          setTimeout(() => setLocalNotification(null), 4000);
          return;
        }
      }
      window.dispatchEvent(new CustomEvent('sale-completed'));
      const completedOrder = {
        id: saleResult?.id || Date.now(),
        receipt_number: saleResult?.receipt_number || null,
        items: [...cart],
        total: finalTotal,
        subtotal: subtotal,
        tax: tax,
        discount: calculatedDiscount,
        discount_percentage: discountPercentage,
        payment_method: isPending ? 'pending' : method,
        status: isPending ? 'pending' : 'paid',
        table_id: selectedTableForOrder?.id || null,
        table_number: selectedTableForOrder?.table_number || null,
        customer_id: selectedCustomer?.id || null,
        created_at: new Date().toISOString(),
      };
      setSessionOrders(prev => [completedOrder, ...prev].slice(0, 20));
      activityLog.log({
        userId: user?.id || 0,
        userName: user?.fullName || user?.username || 'Inconnu',
        actionType: isPending ? 'vente_en_attente' : 'vente_effectuee',
        entityType: 'vente',
        entityId: saleResult?.id || null,
        newValue: completedOrder,
        notes: isPending ? `Paiement différé - ${formatPrice(finalTotal)}` : `Paiement ${method} - ${formatPrice(finalTotal)}`
      });

      if (isPending) {
        setLocalNotification(`Commande en attente: ${formatPrice(finalTotal)}`);
        setShowPaymentMethods(false);
        setPaymentAmountReceived('');
        setCart([]);
        setSelectedTableForOrder(null);
        setDiscountAmount(0);
        setDiscountPercentage(0);
        setTimeout(() => setLocalNotification(null), 3000);
        setIsProcessingPayment(false);
      } else if (autoPrint) {
        if (saleResult && saleResult.id) {
          await printReceipt(saleResult.id, method);
        }
        setLocalNotification(`Paiement ${method}: ${formatPrice(finalTotal)}`);
        setShowPaymentMethods(false);
        setPaymentAmountReceived('');
        setCart([]);
        setSelectedTableForOrder(null);
        setDiscountAmount(0);
        setDiscountPercentage(0);
        setTimeout(() => setLocalNotification(null), 3000);
        setIsProcessingPayment(false);
      } else {
        setPendingPrintSale(saleResult ? { ...completedOrder, id: saleResult.id } : completedOrder);
        setShowPrintDialog(true);
        setShowPaymentMethods(false);
        setPaymentAmountReceived('');
        setCart([]);
        setSelectedTableForOrder(null);
        setDiscountAmount(0);
        setDiscountPercentage(0);
        setIsProcessingPayment(false);
      }
      loadHeldOrdersFromDB();
    } catch (error) {
      console.error('Payment error:', error);
      setShowPaymentMethods(false);
      setIsProcessingPayment(false);
      setLocalNotification('Erreur lors du paiement');
      setTimeout(() => setLocalNotification(null), 3000);
    }
  };

  const handlePrintChoice = async (print) => {
    if (print && pendingPrintSale) {
      await printReceipt(pendingPrintSale.id, pendingPrintSale.payment_method);
    }
    setLocalNotification(pendingPrintSale?.status === 'pending' ? 'Commande en attente' : `Paiement: ${formatPrice(pendingPrintSale?.total || 0)}`);
    setPendingPrintSale(null);
    setShowPrintDialog(false);
    setCart([]);
    setSelectedTableForOrder(null);
    setDiscountAmount(0);
    setDiscountPercentage(0);
    setPaymentAmountReceived('');
    setTimeout(() => setLocalNotification(null), 3000);
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

  const selectTable = async (table) => {
    setSelectedTableForOrder(table);
    setShowTableSelector(false);
    if (window.electronAPI) {
      try {
        await window.electronAPI.updateTableStatus(table.id, 'occupied');
      } catch (e) {
        console.error('Error updating table status:', e);
      }
    }
    setLocalNotification(`Table ${table.table_number} sélectionnée`);
    setTimeout(() => setLocalNotification(null), 2000);
  };

  const holdOrder = async () => {
    if (cart.length === 0) return;
    try {
      if (window.electronAPI && window.electronAPI.holdOrder) {
        await window.electronAPI.holdOrder({
          items: [...cart],
          table_id: selectedTableForOrder?.id || null,
          table_number: selectedTableForOrder?.table_number || null,
          total: finalTotal,
          subtotal: subtotal,
          tax: tax,
          discount: calculatedDiscount,
          discount_percentage: discountPercentage,
          customer_id: selectedCustomer?.id || null,
          notes: ''
        });
      }
      setCart([]);
      setSelectedTableForOrder(null);
      setDiscountAmount(0);
      setDiscountPercentage(0);
      setLocalNotification('Commande mise en attente');
      setTimeout(() => setLocalNotification(null), 2000);
      loadHeldOrdersFromDB();
      activityLog.log({
        userId: user?.id || 0,
        userName: user?.fullName || user?.username || 'Inconnu',
        actionType: 'commande_mise_en_attente',
        entityType: 'commande',
        newValue: { items: cart, total: finalTotal, table: selectedTableForOrder?.table_number || null },
        notes: `${cart.length} article(s) - ${formatPrice(finalTotal)}`
      });
    } catch (error) {
      console.error('Error holding order:', error);
      setLocalNotification('Erreur lors de la mise en attente');
      setTimeout(() => setLocalNotification(null), 3000);
    }
  };

  const restoreOrder = async (order) => {
    try {
      if (window.electronAPI && window.electronAPI.restoreHeldOrder) {
        const full = await window.electronAPI.restoreHeldOrder(order.id);
        if (!full) return;
        setCart(full.items || []);
        setSelectedTableForOrder(full.table_id ? { id: full.table_id, table_number: full.table_number || '' } : null);
        const discPct = full.discount_percentage || 0;
        setDiscountPercentage(discPct);
        setDiscountAmount(discPct > 0 ? 0 : (full.discount || 0));
      }
      if (window.electronAPI && window.electronAPI.deleteHeldOrder) {
        await window.electronAPI.deleteHeldOrder(order.id);
      }
      setShowHeldOrders(false);
      setLocalNotification('Commande restaurée');
      setTimeout(() => setLocalNotification(null), 2000);
      loadHeldOrdersFromDB();
      activityLog.log({
        userId: user?.id || 0,
        userName: user?.fullName || user?.username || 'Inconnu',
        actionType: 'commande_restored',
        entityType: 'commande',
        entityId: order.id,
        notes: `Commande #${order.id} restaurée`
      });
    } catch (error) {
      console.error('Error restoring order:', error);
      setLocalNotification('Erreur lors de la restauration');
      setTimeout(() => setLocalNotification(null), 3000);
    }
  };

  const removeHeldOrder = async (orderId) => {
    try {
      if (window.electronAPI && window.electronAPI.deleteHeldOrder) {
        await window.electronAPI.deleteHeldOrder(orderId);
      }
      loadHeldOrdersFromDB();
      activityLog.log({
        userId: user?.id || 0,
        userName: user?.fullName || user?.username || 'Inconnu',
        actionType: 'commande_supprimee',
        entityType: 'commande',
        entityId: orderId,
        notes: `Commande en attente #${orderId} supprimée`
      });
    } catch (error) {
      console.error('Error removing held order:', error);
    }
  };

  // Numeric keypad handlers for quantity editing
  const startEditQuantity = (itemId) => {
    const item = cart.find(i => i.id === itemId);
    if (item) {
      setEditingQuantityId(itemId);
      setQuantityInput(String(item.quantity));
    }
  };

  const handleKeypadKey = (key) => {
    if (key === 'DEL') {
      if (editingQuantityId === null) return;
      setQuantityInput(prev => prev.length > 1 ? prev.slice(0, -1) : '');
    } else if (key === '⌫') {
      if (editingQuantityId === null) return;
      setQuantityInput(prev => prev.length > 1 ? prev.slice(0, -1) : '');
    } else {
      if (editingQuantityId === null && cart.length > 0) {
        const lastItem = cart[cart.length - 1];
        setEditingQuantityId(lastItem.id);
        setQuantityInput('');
        setKeypadOperator(null);
      }
      setQuantityInput(prev => {
        const next = prev + key;
        if (next.length > 6) return prev;
        if (/^\d*\.?\d*$/.test(next)) return next;
        return prev;
      });
    }
  };

  const handleKeypadOperator = (operator) => {
    if (editingQuantityId === null && cart.length > 0) {
      const lastItem = cart[cart.length - 1];
      setEditingQuantityId(lastItem.id);
      setQuantityInput(String(lastItem.quantity));
    }
    setKeypadOperator(operator);
    setQuantityInput('');
  };

  const confirmQuantity = () => {
    if (editingQuantityId === null) return;
    const inputVal = parseInt(quantityInput, 10);
    if (keypadOperator && inputVal > 0) {
      const currentItem = cart.find(i => i.id === editingQuantityId);
      if (currentItem) {
        let newQty;
        switch (keypadOperator) {
          case '×': newQty = inputVal; break;
          case '+': newQty = currentItem.quantity + inputVal; break;
          case '-': newQty = Math.max(1, currentItem.quantity - inputVal); break;
          default: newQty = inputVal;
        }
        updateQuantity(editingQuantityId, newQty);
      }
    } else if (inputVal > 0) {
      updateQuantity(editingQuantityId, inputVal);
    }
    setEditingQuantityId(null);
    setQuantityInput('');
    setKeypadOperator(null);
  };

  const clearQuantityInput = () => {
    setQuantityInput('');
    setKeypadOperator(null);
  };

  // ── Ticket History ──
  const loadSalesHistory = async (page = 0, search = salesHistorySearch) => {
    setLoadingHistory(true);
    try {
      if (window.electronAPI?.getSalesHistory) {
        const result = await window.electronAPI.getSalesHistory({ search, page, limit: 30 });
        setSalesHistory(result?.sales || []);
        setSalesHistoryTotal(result?.total || 0);
        setSalesHistoryPage(page);
      }
    } catch (error) {
      console.error('Failed to load sales history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const viewSaleDetail = async (sale) => {
    setSelectedSaleDetail(sale);
    try {
      if (window.electronAPI?.getSaleItems) {
        const items = await window.electronAPI.getSaleItems(sale.id);
        setSelectedSaleDetail({ ...sale, items: items || [] });
      }
    } catch (error) {
      console.error('Failed to load sale items:', error);
    }
    setShowSaleDetail(true);
  };

  const handleReprintReceipt = async (sale) => {
    try {
      if (window.electronAPI?.getSaleDetails) {
        const detail = await window.electronAPI.getSaleDetails(sale.id);
        if (detail) {
          printReceipt(detail.id, detail.payment_method);
        }
      }
    } catch (error) {
      console.error('Reprint error:', error);
      setLocalNotification('Erreur lors de la réimpression');
      setTimeout(() => setLocalNotification(null), 3000);
    }
  };

  // ── Pending Payment Completion ──
  const handleCompletePending = (sale) => {
    setPendingSaleToComplete(sale);
    setPendingPaymentMethod('Espèces');
    setShowPendingComplete(true);
  };

  const confirmCompletePending = async () => {
    if (!pendingSaleToComplete) return;
    try {
      if (window.electronAPI?.completePendingSale) {
        await window.electronAPI.completePendingSale({
          sale_id: pendingSaleToComplete.id,
          payment_method: pendingPaymentMethod
        });
        setLocalNotification(`Vente #${pendingSaleToComplete.receipt_number || pendingSaleToComplete.id} payée`);
        setTimeout(() => setLocalNotification(null), 3000);
        setShowPendingComplete(false);
        setPendingSaleToComplete(null);
        loadSalesHistory(salesHistoryPage);
      }
    } catch (error) {
      console.error('Complete pending sale error:', error);
      setLocalNotification('Erreur: ' + (error.message || 'Inconnue'));
      setTimeout(() => setLocalNotification(null), 4000);
    }
  };

  // ── Open Cash Drawer ──
  const handleOpenDrawer = async () => {
    if (isOpeningDrawer) return;
    setIsOpeningDrawer(true);
    try {
      if (window.electronAPI?.openCashDrawer) {
        const result = await window.electronAPI.openCashDrawer();
        if (result?.success) {
          setDrawerStatus('open');
          setLocalNotification('Tiroir ouvert');
          setTimeout(() => { setDrawerStatus('closed'); setLocalNotification(null); }, 3000);
        } else {
          setLocalNotification('Erreur: ' + (result?.error || 'Impossible d\'ouvrir le tiroir'));
          setTimeout(() => setLocalNotification(null), 4000);
        }
      } else {
        setLocalNotification('Tiroir-caisse non configuré');
        setTimeout(() => setLocalNotification(null), 3000);
      }
    } catch (error) {
      setLocalNotification('Erreur: ' + (error.message || 'Tiroir indisponible'));
      setTimeout(() => setLocalNotification(null), 4000);
    } finally {
      setIsOpeningDrawer(false);
    }
  };

  const modifySessionOrder = (order) => {
    setCart(order.items || []);
    setSelectedTableForOrder(
      order.table_id ? { id: order.table_id, table_number: order.table_number || '' } : null
    );
    const discPct = order.discount_percentage || 0;
    setDiscountPercentage(discPct);
    setDiscountAmount(discPct > 0 ? 0 : (order.discount || 0));
    setSessionOrders(prev => prev.filter(o => o.id !== order.id));
    setShowSessionOrders(false);
    setLocalNotification('Commande restaurée dans le panier');
    setTimeout(() => setLocalNotification(null), 2000);
    activityLog.log({
      userId: user?.id || 0,
      userName: user?.fullName || user?.username || 'Inconnu',
      actionType: 'commande_modifiee',
      entityType: 'commande',
      newValue: order,
      notes: `Commande session modifiée - ${(order.items || []).length} article(s)`
    });
  };

  const deleteSessionOrder = (orderId) => {
    const order = sessionOrders.find(o => o.id === orderId);
    setSessionOrders(prev => prev.filter(o => o.id !== orderId));
    activityLog.log({
      userId: user?.id || 0,
      userName: user?.fullName || user?.username || 'Inconnu',
      actionType: 'commande_session_supprimee',
      entityType: 'commande',
      entityId: orderId,
      oldValue: order || null,
      notes: `Commande session supprimée`
    });
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

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex pb-20">
      {/* Cash Register Lock Overlay */}
      {!activeShift && (
        <div
          className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center"
          onPointerDown={(e) => e.preventDefault()}
          onClick={(e) => e.preventDefault()}
          onKeyDown={(e) => e.preventDefault()}
          tabIndex={-1}
        >
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 fade-in duration-300">
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Caisse fermée</h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Veuillez ouvrir votre caisse avant de commencer les ventes.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOpenShiftDialog(true);
              }}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              Ouvrir la caisse
            </button>
          </div>
        </div>
      )}

      {/* Shift Status Badge */}
      {activeShift && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white/90 backdrop-blur-sm border border-emerald-200 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">
              Caisse ouverte — {formatPrice(activeShift.opening_float)}
            </span>
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-auto relative rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
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

            {/* Body */}
            <div className="p-6">
              {availableTables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Utensils className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium text-gray-500">Aucune table configurée</p>
                  <p className="text-sm mt-1">Ajoutez des tables dans la section Gestion</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {availableTables.map((table) => {
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
                        {/* Status Badge */}
                        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm ${
                          isAvailable ? 'bg-emerald-500 text-white' :
                          isReserved ? 'bg-blue-500 text-white' :
                          isOccupied ? 'bg-red-500 text-white' :
                          'bg-gray-400 text-white'
                        }`}>
                          {getTableStatusLabel(table.status)}
                        </div>

                        {/* Table Icon Area */}
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm mb-3 transition-transform group-hover:scale-110 ${
                          isAvailable ? 'bg-emerald-500' :
                          isReserved ? 'bg-blue-500' :
                          isOccupied ? 'bg-red-500' :
                          'bg-gray-400'
                        }`}>
                          {table.table_number}
                        </div>

                        {/* Info */}
                        <div className="text-center">
                          <div className="font-semibold text-sm text-gray-800">
                            Table {table.table_number}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                            {table.capacity} places
                          </div>
                        </div>

                        {/* Hover overlay for non-occupied */}
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

      {/* Customer Selector Modal */}
      {showCustomerSelector && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowCustomerSelector(false); setShowQuickCreateCustomer(false); }}>
          <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-hidden relative rounded-2xl shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2.5 text-xl font-bold text-gray-900">
                    <User className="w-5 h-5 text-purple-500" />
                    Sélection de Client
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {selectedCustomer ? `Client actuel : ${selectedCustomer.name}` : 'Associer un client à cette vente'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCustomer && (
                    <button
                      onClick={() => { setSelectedCustomer(null); setShowCustomerSelector(false); }}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Déselectionner
                    </button>
                  )}
                  <button onClick={() => { setShowCustomerSelector(false); setShowQuickCreateCustomer(false); }} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email ou téléphone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Create Form */}
            {showQuickCreateCustomer && (
              <div className="px-6 py-4 bg-purple-50 border-b border-purple-100 flex-shrink-0">
                <p className="text-xs font-semibold text-purple-700 mb-2">Création rapide</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Nom *"
                    value={quickCustomerForm.name}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, name: e.target.value })}
                    className="px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <input
                    type="text"
                    placeholder="Téléphone"
                    value={quickCustomerForm.phone}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })}
                    className="px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={quickCustomerForm.email}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, email: e.target.value })}
                    className="px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setShowQuickCreateCustomer(false)} className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700">Annuler</button>
                  <button
                    onClick={handleQuickCreateCustomer}
                    disabled={!quickCustomerForm.name.trim()}
                    className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Créer et sélectionner
                  </button>
                </div>
              </div>
            )}

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0">
              {filteredCustomersList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <User className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-medium text-gray-500">Aucun client trouvé</p>
                  <p className="text-sm mt-1">Créez un nouveau client ou modifiez votre recherche</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCustomersList.map((customer) => {
                    const isSelected = selectedCustomer?.id === customer.id;
                    const loyalty = customer.loyalty_points >= 500 ? 'VIP' : customer.loyalty_points >= 200 ? 'Gold' : customer.loyalty_points >= 50 ? 'Silver' : 'Bronze';
                    const loyaltyColor = loyalty === 'VIP' ? 'text-purple-600 bg-purple-100' : loyalty === 'Gold' ? 'text-amber-600 bg-amber-100' : loyalty === 'Silver' ? 'text-gray-600 bg-gray-100' : 'text-orange-600 bg-orange-100';
                    return (
                      <button
                        key={customer.id}
                        onClick={() => { setSelectedCustomer(customer); setShowCustomerSelector(false); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                          isSelected ? 'bg-purple-100 ring-2 ring-purple-400' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900 truncate">{customer.name}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${loyaltyColor}`}>{loyalty}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            {customer.phone && <span>{customer.phone}</span>}
                            {customer.email && <span className="truncate">{customer.email}</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-medium text-gray-600">{customer.loyalty_points || 0} pts</p>
                          <p className="text-[10px] text-gray-400">{(customer.total_spent || 0).toFixed(0)}€</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowQuickCreateCustomer(!showQuickCreateCustomer)}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-purple-200 rounded-xl text-sm font-medium text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-all"
              >
                <Plus className="w-4 h-4" />
                Nouveau client rapide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="h-full w-full flex gap-2 p-2">
        {/* Cart Panel - Left */}
        <div className="w-[300px] min-w-[260px] flex flex-col h-full">
          <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100">
            {/* Cart Header */}
            <div className="px-4 py-3 flex-shrink-0 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-gray-800">
                  <ShoppingCart className="w-4 h-4 text-gray-400" />
                  Commande
                  {selectedTableForOrder ? (
                    <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg ml-1">
                      Table {selectedTableForOrder.table_number}
                    </span>
                  ) : isTablesEnabled && (
                    <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg ml-1">
                      Sans table
                    </span>
                  )}
                  {heldOrders.length > 0 && (
                      <button
                        onClick={() => setShowHeldOrders(true)}
                        className="text-xs font-medium bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg ml-1 hover:bg-amber-100 transition-colors flex items-center gap-1"
                      >
                        <PauseCircle className="w-3 h-3" />
                        {heldOrders.length}
                      </button>
                    )}
                    {selectedCustomer && (
                      <span className="text-xs font-medium bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg ml-1 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {selectedCustomer.name}
                        <button onClick={() => setSelectedCustomer(null)} className="hover:text-purple-800 ml-0.5"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                </span>
                <button
                  onClick={holdOrder}
                  disabled={cart.length === 0}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  <div
                    key={item.id}
                    className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-medium text-sm text-gray-800 truncate flex-1 mr-2">
                        {item.name}
                      </div>
                      <div className="text-sm font-semibold text-blue-600 whitespace-nowrap">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        {formatPrice(item.price)} x {item.quantity}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-500 flex items-center justify-center text-gray-500 transition-all"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => startEditQuantity(item.id)}
                          className={`w-9 h-7 rounded-lg font-semibold text-sm text-center transition-all border ${
                            editingQuantityId === item.id
                              ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200'
                              : 'bg-white border-gray-200 text-gray-800 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          {editingQuantityId === item.id ? quantityInput || '0' : item.quantity}
                        </button>
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
                {taxEnabled && tax > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>TVA</span>
                    <span className="font-medium text-emerald-600">{formatPrice(tax)}</span>
            </div>
              )}
            </div>

      {/* ─── Ticket History Modal ─── */}
      {showTicketHistory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-hidden relative rounded-2xl shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2.5 text-xl font-bold text-gray-900">
                    <History className="w-5 h-5 text-indigo-500" />
                    Historique des ventes
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">{salesHistoryTotal} vente(s) trouvée(s)</p>
                </div>
                <button onClick={() => { setShowTicketHistory(false); setSelectedSaleDetail(null); setShowSaleDetail(false); }} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par n° reçu, client ou méthode..."
                  value={salesHistorySearch}
                  onChange={(e) => { setSalesHistorySearch(e.target.value); loadSalesHistory(0, e.target.value); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-16"><RefreshCw className="w-6 h-6 text-gray-300 animate-spin" /></div>
              ) : salesHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Receipt className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium text-gray-500">Aucune vente trouvée</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {salesHistory.map((sale) => (
                    <div key={sale.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900">{sale.receipt_number || `#${String(sale.id).padStart(6, '0')}`}</span>
                           <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sale.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                             {sale.status === 'pending' ? 'En attente' : 'Payé'}
                           </span>
                           {sale.kitchen_status && sale.kitchen_status !== 'completed' && sale.kitchen_status !== 'cancelled' && (
                             <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                               sale.kitchen_status === 'order_received' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                               sale.kitchen_status === 'preparing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                               sale.kitchen_status === 'ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                               sale.kitchen_status === 'served' ? 'bg-green-50 text-green-700 border-green-200' :
                               'bg-gray-50 text-gray-500 border-gray-200'
                             }`}>
                               {sale.kitchen_status === 'order_received' ? '🟡 En attente' :
                                sale.kitchen_status === 'preparing' ? '🔵 En cours' :
                                sale.kitchen_status === 'ready' ? '🟢 Prêt' :
                                sale.kitchen_status === 'served' ? '✅ Servi' : sale.kitchen_status}
                             </span>
                           )}
                          <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{sale.payment_method}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span>{new Date(sale.created_at).toLocaleString('fr-FR')}</span>
                          {sale.customer_name && <span className="text-purple-600">{sale.customer_name}</span>}
                          <span>{sale.user_name}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-sm text-gray-900">{formatPrice(sale.total)}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <button onClick={() => viewSaleDetail(sale)} className="p-1 rounded-lg hover:bg-indigo-100 text-indigo-600 transition-colors" title="Voir"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleReprintReceipt(sale)} className="p-1 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors" title="Réimprimer"><Printer className="w-3.5 h-3.5" /></button>
                          {sale.status === 'pending' && (
                            <button onClick={() => handleCompletePending(sale)} className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors" title="Encaisser"><CircleDollarSign className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {salesHistoryTotal > 30 && (
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                <button onClick={() => loadSalesHistory(Math.max(0, salesHistoryPage - 1))} disabled={salesHistoryPage === 0} className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors">← Précédent</button>
                <span className="text-xs text-gray-500">Page {salesHistoryPage + 1} / {Math.ceil(salesHistoryTotal / 30)}</span>
                <button onClick={() => loadSalesHistory(salesHistoryPage + 1)} disabled={(salesHistoryPage + 1) * 30 >= salesHistoryTotal} className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors">Suivant →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Sale Detail Modal ─── */}
      {showSaleDetail && selectedSaleDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md max-h-[85vh] overflow-auto relative rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">{selectedSaleDetail.receipt_number || `Vente #${selectedSaleDetail.id}`}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{new Date(selectedSaleDetail.created_at).toLocaleString('fr-FR')}</p>
              </div>
              <button onClick={() => { setShowSaleDetail(false); setSelectedSaleDetail(null); }} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Client</span><p className="font-medium">{selectedSaleDetail.customer_name || 'Client comptoir'}</p></div>
                <div><span className="text-gray-500">Caissier</span><p className="font-medium">{selectedSaleDetail.user_name}</p></div>
                <div><span className="text-gray-500">Paiement</span><p className="font-medium capitalize">{selectedSaleDetail.payment_method}</p></div>
                <div><span className="text-gray-500">Statut</span><p className={`font-medium ${selectedSaleDetail.status === 'pending' ? 'text-amber-600' : 'text-emerald-600'}`}>{selectedSaleDetail.status === 'pending' ? 'En attente' : 'Payé'}</p></div>
                {selectedSaleDetail.kitchen_status && (
                  <div><span className="text-gray-500">Cuisine</span><p className={`font-medium ${
                    selectedSaleDetail.kitchen_status === 'preparing' ? 'text-blue-600' :
                    selectedSaleDetail.kitchen_status === 'ready' ? 'text-emerald-600' :
                    selectedSaleDetail.kitchen_status === 'served' ? 'text-green-600' :
                    selectedSaleDetail.kitchen_status === 'order_received' ? 'text-amber-600' :
                    selectedSaleDetail.kitchen_status === 'cancelled' ? 'text-red-600' : 'text-gray-600'
                  }`}>{
                    selectedSaleDetail.kitchen_status === 'order_received' ? '🟡 En attente' :
                    selectedSaleDetail.kitchen_status === 'preparing' ? '🔵 En cours' :
                    selectedSaleDetail.kitchen_status === 'ready' ? '🟢 Prêt' :
                    selectedSaleDetail.kitchen_status === 'served' ? '✅ Servi' :
                    selectedSaleDetail.kitchen_status === 'completed' ? 'Terminé' :
                    selectedSaleDetail.kitchen_status === 'cancelled' ? '❌ Annulé' : selectedSaleDetail.kitchen_status
                  }</p></div>
                )}
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-2">Articles</p>
                <div className="space-y-1.5">
                  {(selectedSaleDetail.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-gray-700">{item.product_name || `Produit #${item.product_id}`} ×{item.quantity}</span>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-600"><span>Sous-total</span><span>{formatPrice(selectedSaleDetail.subtotal)}</span></div>
                {selectedSaleDetail.discount > 0 && <div className="flex justify-between text-sm text-amber-600"><span>Réduction</span><span>-{formatPrice(selectedSaleDetail.discount)}</span></div>}
                {selectedSaleDetail.tax > 0 && <div className="flex justify-between text-sm text-gray-600"><span>TVA</span><span>{formatPrice(selectedSaleDetail.tax)}</span></div>}
                <div className="flex justify-between text-lg font-bold pt-1"><span>Total</span><span>{formatPrice(selectedSaleDetail.total)}</span></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleReprintReceipt(selectedSaleDetail)} className="flex-1 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors">
                  <Printer className="w-4 h-4" /> Réimprimer
                </button>
                {selectedSaleDetail.status === 'pending' && (
                  <button onClick={() => { setShowSaleDetail(false); handleCompletePending(selectedSaleDetail); }} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 transition-colors">
                    <CircleDollarSign className="w-4 h-4" /> Encaisser
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Print Receipt Dialog ─── */}
      {showPrintDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Imprimer le reçu ?</h3>
              <p className="text-sm text-gray-500 mt-1">Voulez-vous imprimer le reçu de cette vente ?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handlePrintChoice(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-all">Passer</button>
              <button onClick={() => handlePrintChoice(true)} className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5">
                <Printer className="w-4 h-4" /> Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Complete Pending Payment Dialog ─── */}
      {showPendingComplete && pendingSaleToComplete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CircleDollarSign className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Encaisser la vente</h3>
              <p className="text-sm text-gray-500 mt-1">{pendingSaleToComplete.receipt_number || `Vente #${pendingSaleToComplete.id}`} — {formatPrice(pendingSaleToComplete.total)}</p>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Méthode de paiement</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['Espèces', 'Carte', 'Chèque', 'Mobile'].map(method => (
                    <button
                      key={method}
                      onClick={() => setPendingPaymentMethod(method)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                        pendingPaymentMethod === method
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowPendingComplete(false); setPendingSaleToComplete(null); }} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-all">Annuler</button>
                <button onClick={confirmCompletePending} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

              {/* Total */}
              <div className="flex justify-between items-center bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-white font-semibold text-sm">TOTAL</span>
                <span className="text-white font-bold text-lg">{formatPrice(finalTotal)}</span>
              </div>

              {/* Auto-Print Toggle */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 ${autoPrint ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-transparent'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${autoPrint ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Printer className={`w-3.5 h-3.5 ${autoPrint ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-xs font-medium transition-colors ${autoPrint ? 'text-blue-700' : 'text-gray-600'}`}>Impression auto</span>
                </div>
                <Switch
                  checked={autoPrint}
                  onCheckedChange={async (v) => {
                    setAutoPrint(v);
                    try {
                      if (window.electronAPI?.setSetting) {
                        await window.electronAPI.setSetting('printReceipts', v);
                      }
                    } catch (err) {
                      console.warn('Could not save auto-print setting:', err);
                    }
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (!activeShift) {
                      setShowOpenShiftDialog(true);
                      return;
                    }
                    handlePayment();
                  }}
                  disabled={cart.length === 0 || !activeShift}
                  className="py-2.5 px-3 rounded-xl font-semibold text-sm transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:shadow-none disabled:hover:scale-100 text-white"
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

              </div>
            </div>
          </div>

        {/* Numeric Keypad - Middle */}
        <div className="w-[220px] min-w-[200px] flex flex-col h-full">
          <div className="h-full bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <span className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
                <Calculator className="w-4 h-4 text-gray-400" />
                {editingQuantityId !== null ? 'Modifier quantité' : 'Pavé numérique'}
              </span>
              {editingQuantityId !== null && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {cart.find(i => i.id === editingQuantityId)?.name || ''}
                </p>
              )}
            </div>
            {/* Quick Actions Grid */}
            <div className={`grid grid-cols-2 gap-2 px-2.5 pt-2 pb-1`}>
              {isTablesEnabled && (
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
                onClick={() => { loadCustomersList(); setShowCustomerSelector(true); }}
                className={`rounded-xl font-medium text-xs h-11 flex flex-col items-center justify-center gap-0.5 transition-all ${
                  selectedCustomer
                    ? 'bg-purple-100 hover:bg-purple-200 text-purple-800 ring-2 ring-purple-300'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                }`}
                title="Sélectionner Client"
              >
                <User className="w-4 h-4" />
                <span>{selectedCustomer ? selectedCustomer.name.split(' ')[0] : 'Client'}</span>
              </button>
              <button
                onClick={() => { loadSalesHistory(0); setShowTicketHistory(true); }}
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
                onClick={handleOpenDrawer}
                disabled={isOpeningDrawer}
                className={`rounded-xl font-medium text-xs h-11 flex flex-col items-center justify-center gap-0.5 transition-all ${
                  isOpeningDrawer
                    ? 'bg-emerald-100 text-emerald-700 animate-pulse'
                    : drawerStatus === 'open'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
                title="Ouvrir le tiroir-caisse"
              >
                <Wallet className="w-4 h-4" />
                <span>{isOpeningDrawer ? 'Ouverture...' : 'Caisse'}</span>
              </button>
              <button
                onClick={() => setShowSessionOrders(true)}
                className="relative bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl font-medium text-xs h-11 flex flex-col items-center justify-center gap-0.5 transition-all"
                title="Commandes"
              >
                <ListOrdered className="w-4 h-4" />
                <span>Commande</span>
                {sessionOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-teal-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {sessionOrders.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setNavHidden(prev => !prev)}
                className={`rounded-xl font-medium text-xs h-11 flex flex-col items-center justify-center gap-0.5 transition-all ${
                  navHidden
                    ? 'bg-violet-100 hover:bg-violet-200 text-violet-600'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
                title={navHidden ? 'Afficher la navigation' : 'Masquer la navigation'}
              >
                {navHidden ? <ChevronRight className="w-4 h-4" /> : <MenuSquare className="w-4 h-4" />}
                <span>{navHidden ? 'Menu' : 'Masquer'}</span>
              </button>
              <button
                onClick={() => activeShift && setShowCloseShiftDialog(true)}
                disabled={!activeShift}
                className={`rounded-xl font-medium text-xs h-11 flex flex-col items-center justify-center gap-0.5 transition-all ${
                  activeShift
                    ? 'bg-red-50 hover:bg-red-100 text-red-600'
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                }`}
                title={activeShift ? 'Fermer la caisse' : 'Aucun shift actif'}
              >
                <Lock className="w-4 h-4" />
                <span>Fermer</span>
              </button>
            </div>
            <div className="flex-1 p-3 flex flex-col justify-end">
              <NumericKeypad
                onKey={handleKeypadKey}
                onOperator={handleKeypadOperator}
                onConfirm={confirmQuantity}
                onClear={editingQuantityId !== null ? clearQuantityInput : null}
                highlight={editingQuantityId !== null}
                displayValue={editingQuantityId !== null ? (keypadOperator ? `${cart.find(i => i.id === editingQuantityId)?.quantity || 0} ${keypadOperator} ${quantityInput}` : quantityInput || String(cart.find(i => i.id === editingQuantityId)?.quantity || '')) : null}
              />
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
                    const iconName = getCategoryIcon(product.family || product.category);
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
                              {product.family || product.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-bold text-sm text-blue-600">
                            {formatPrice(product.price)}
                          </span>
                          {product.stock !== undefined && product.stock > 0 && (product.min_stock > 0 ? product.stock <= product.min_stock : product.stock <= 5) && (
                            <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg font-medium">
                              +{product.stock}
                            </span>
                          )}
                          {product.stock === 0 && (
                            <span className="text-[9px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded-lg font-medium">
                              Rupture
                            </span>
                          )}
                          {product.stock < 0 && (
                            <span className="text-[9px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded-lg font-bold">
                              {product.stock}
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

      {/* Held Orders Modal */}
      {showHeldOrders && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-auto relative rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white z-10 px-6 py-5 border-b border-gray-100 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2.5 text-xl font-bold text-gray-900">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Commandes en attente
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {heldOrders.length} commande(s) en attente
                </p>
              </div>
              <button
                onClick={() => setShowHeldOrders(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              {heldOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Clock className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium text-gray-500">Aucune commande en attente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {heldOrders.map((order) => (
                    <div key={order.id} className="border rounded-xl p-4 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                Commande #{order.id.toString().slice(-6)}
                              </h3>
                              {order.table_number && (
                                <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg">
                                  Table {order.table_number}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleString('fr-FR')}</p>
                          </div>
                        <span className="text-lg font-bold text-blue-600">
                          {formatPrice(order.total)}
                        </span>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {item.name}
                              <span className="text-gray-400 ml-1">×{item.quantity}</span>
                            </span>
                            <span className="font-medium text-gray-700">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => restoreOrder(order)}
                          className="flex-1 py-2 px-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-4 h-4" />
                          Reprendre
                        </button>
                        <button
                          onClick={() => removeHeldOrder(order.id)}
                          className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session Orders Modal */}
      {showSessionOrders && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-auto relative rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white z-10 px-6 py-5 border-b border-gray-100 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2.5 text-xl font-bold text-gray-900">
                  <ListOrdered className="w-5 h-5 text-teal-500" />
                  Commandes
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {sessionOrders.length} commande(s) cette session
                </p>
              </div>
              <button
                onClick={() => setShowSessionOrders(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              {sessionOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <ListOrdered className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium text-gray-500">Aucune commande</p>
                  <p className="text-sm mt-1">Les commandes validées apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessionOrders.map((order) => (
                    <div key={order.id} className="border rounded-xl p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              Commande #{String(sessionOrders.indexOf(order) + 1).padStart(3, '0')}
                            </h3>
                            {order.table_number && (
                              <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg">
                                Table {order.table_number}
                              </span>
                            )}
                            <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">
                              {order.payment_method}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleString('fr-FR')}</p>
                        </div>
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(order.total)}
                        </span>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {item.name}
                              <span className="text-gray-400 ml-1">×{item.quantity}</span>
                            </span>
                            <span className="font-medium text-gray-700">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => modifySessionOrder(order)}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Modifier
                        </button>
                        <button
                          onClick={() => deleteSessionOrder(order.id)}
                          className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Picker */}
      {showPaymentMethods && (() => {
        const received = parseFloat(paymentAmountReceived) || 0;
        const change = received > 0 ? received - finalTotal : 0;
        const insufficient = paymentAmountReceived && received > 0 && received < finalTotal;
        return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-5">
              <p className="text-sm text-gray-500">Total à payer</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatPrice(finalTotal)}</p>
            </div>

            {/* Amount Received */}
            <div className="mb-5 space-y-3">
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Montant reçu</Label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmountReceived}
                    onChange={(e) => setPaymentAmountReceived(e.target.value)}
                    placeholder={`Ex: ${finalTotal.toFixed(2)}`}
                    className={`w-full px-4 py-3 text-lg font-mono text-right border-2 rounded-xl focus:outline-none focus:ring-0 transition-colors ${
                      insufficient
                        ? 'border-red-300 bg-red-50 focus:border-red-400'
                        : change > 0
                        ? 'border-emerald-300 bg-emerald-50 focus:border-emerald-400'
                        : 'border-gray-200 focus:border-blue-400'
                    }`}
                  />
                </div>
              </div>

              {paymentAmountReceived && (
                <div className={`text-center py-2 px-3 rounded-xl ${
                  insufficient ? 'bg-red-50' : 'bg-emerald-50'
                }`}>
                  {insufficient ? (
                    <div>
                      <p className="text-xs text-red-400 uppercase tracking-wide">Insuffisant</p>
                      <p className="text-lg font-bold text-red-600">{formatPrice(finalTotal - received)} restant</p>
                    </div>
                  ) : change > 0 ? (
                    <div>
                      <p className="text-xs text-emerald-400 uppercase tracking-wide">Monnaie à rendre</p>
                      <p className="text-lg font-bold text-emerald-600">{formatPrice(change)}</p>
                    </div>
                  ) : received === finalTotal ? (
                    <p className="text-sm font-medium text-emerald-600">Montant exact ✓</p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {[
                { label: 'Espèces', color: 'bg-emerald-500 hover:bg-emerald-600', icon: '💵' },
                { label: 'Carte', color: 'bg-blue-500 hover:bg-blue-600', icon: '💳' },
                { label: 'Chèque', color: 'bg-purple-500 hover:bg-purple-600', icon: '📝' },
                { label: 'Mobile', color: 'bg-orange-500 hover:bg-orange-600', icon: '📱' },
                { label: 'À payer', color: 'bg-gray-600 hover:bg-gray-700', icon: '🕐', small: true }
              ].map(method => (
                <button
                  key={method.label}
                  onClick={() => {
                    setPaymentAmountReceived('');
                    confirmPayment(method.label);
                  }}
                  disabled={isProcessingPayment}
                  className={`w-full p-3 ${method.color} text-white rounded-xl font-semibold text-sm transition-all hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${method.small ? 'py-2 text-xs' : ''}`}
                >
                  {isProcessingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>{method.icon}</span>}
                  {method.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setShowPaymentMethods(false); setPaymentAmountReceived(''); }}
              className="w-full py-2.5 mt-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-all"
            >
              Annuler
            </button>
          </div>
        </div>
        );
      })()}

      {/* Open Cash Register Dialog */}
      {showOpenShiftDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[210]">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Unlock className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Ouvrir la caisse</h3>
              <p className="text-sm text-gray-500 mt-1">Entrez le montant d'ouverture</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Montant d'ouverture (Fond)</Label>
                <div className="relative mt-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    className="w-full px-4 py-3 text-lg font-mono text-right border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleOpenShift()}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowOpenShiftDialog(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleOpenShift}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  Ouvrir la caisse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Cash Register Dialog */}
      {showCloseShiftDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Lock className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Fermer la caisse</h3>
              <p className="text-sm text-gray-500 mt-1">Comptez le montant réel en caisse</p>
            </div>
            <div className="space-y-4">
              {activeShift && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Fond d'ouverture</span>
                    <span className="font-mono font-medium">{formatPrice(activeShift.opening_float)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 mt-1">
                    <span>Shift ouvert depuis</span>
                    <span className="text-xs">{new Date(activeShift.opened_at).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Montant réel compté</Label>
                <div className="relative mt-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={closingActual}
                    onChange={(e) => setClosingActual(e.target.value)}
                    placeholder="Montant compté"
                    className="w-full px-4 py-3 text-lg font-mono text-right border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCloseShift()}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowCloseShiftDialog(false); setClosingActual(''); }}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCloseShift}
                  disabled={!closingActual}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  Fermer le shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Summary Dialog */}
      {showShiftSummary && shiftSummary && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Résumé du shift</h3>
            </div>
            <div className="space-y-2 bg-gray-50 rounded-xl p-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Fond d'ouverture</span>
                <span className="font-mono font-medium">{formatPrice(shiftSummary.opening_float)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Ventes totales</span>
                <span className="font-mono font-medium">{formatPrice(shiftSummary.total_sales || 0)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Nombre de ventes</span>
                <span className="font-mono font-medium">{shiftSummary.sales_count || 0}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-gray-600">
                <span>Montant attendu</span>
                <span className="font-mono font-medium">{formatPrice((shiftSummary.opening_float || 0) + (shiftSummary.total_sales || 0))}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Montant réel</span>
                <span className="font-mono font-medium">{formatPrice(shiftSummary.closing_amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Écart</span>
                <span className={`font-mono ${
                  (shiftSummary.closing_amount - (shiftSummary.opening_float || 0) - (shiftSummary.total_sales || 0)) === 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}>
                  {formatPrice(shiftSummary.closing_amount - (shiftSummary.opening_float || 0) - (shiftSummary.total_sales || 0))}
                </span>
              </div>
            </div>
            <button
              onClick={() => { setShowShiftSummary(false); setShiftSummary(null); }}
              className="w-full py-2.5 mt-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
            >
              Fermer
            </button>
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
