import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Euro, ShoppingCart, Package, Calendar, Download, Search, ArrowUpDown, ChevronLeft, ChevronRight, Receipt, Eye, X } from 'lucide-react';
import BiExportModal from '../components/BiExportModal';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { isPreviewMode, getPreviewData, logEnvironment } from '../utils/environment';

const DEMO_HOURLY_DATA = [
  { hour: '08h', sales: 5, revenue: 23.50 },
  { hour: '09h', sales: 12, revenue: 67.80 },
  { hour: '10h', sales: 18, revenue: 89.20 },
  { hour: '11h', sales: 25, revenue: 134.70 },
  { hour: '12h', sales: 45, revenue: 267.90 },
  { hour: '13h', sales: 38, revenue: 198.40 },
  { hour: '14h', sales: 22, revenue: 123.60 },
  { hour: '15h', sales: 15, revenue: 78.30 },
  { hour: '16h', sales: 19, revenue: 95.80 },
  { hour: '17h', sales: 28, revenue: 156.20 },
  { hour: '18h', sales: 12, revenue: 67.40 }
];

const DEMO_CATEGORY_DATA = [
  { name: 'Boissons', value: 45, color: '#3B82F6' },
  { name: 'Viennoiseries', value: 28, color: '#10B981' },
  { name: 'Sandwichs', value: 18, color: '#F59E0B' },
  { name: 'Salades', value: 12, color: '#EF4444' },
  { name: 'Pâtisseries', value: 15, color: '#8B5CF6' },
  { name: 'Autres', value: 8, color: '#6B7280' }
];

const DEMO_TRANSACTIONS = [
  { id: 1, receiptNumber: 'RCP-2026-0001', date: '2026-07-13', time: '08:23', cashier: 'Sophie Martin', customer: 'Jean Dupont', table: 5, orderType: 'Dine-in', paymentMethod: 'Espèces', items: 3, discount: 0, tax: 4.75, total: 29.75, status: 'Complété' },
  { id: 2, receiptNumber: 'RCP-2026-0002', date: '2026-07-13', time: '08:45', cashier: 'Marc Laurent', customer: 'Marie Lambert', table: null, orderType: 'À emporter', paymentMethod: 'Carte', items: 2, discount: 0, tax: 2.85, total: 17.85, status: 'Complété' },
  { id: 3, receiptNumber: 'RCP-2026-0003', date: '2026-07-13', time: '09:12', cashier: 'Sophie Martin', customer: 'Pierre Moreau', table: 3, orderType: 'Dine-in', paymentMethod: 'Carte', items: 4, discount: 3.50, tax: 5.70, total: 35.20, status: 'Complété' },
  { id: 4, receiptNumber: 'RCP-2026-0004', date: '2026-07-13', time: '09:30', cashier: 'Lucas Petit', customer: 'Client sans ticket', table: null, orderType: 'À emporter', paymentMethod: 'Mobile', items: 1, discount: 0, tax: 1.90, total: 11.90, status: 'Complété' },
  { id: 5, receiptNumber: 'RCP-2026-0005', date: '2026-07-13', time: '10:05', cashier: 'Marc Laurent', customer: 'Anne Leroy', table: 2, orderType: 'Dine-in', paymentMethod: 'Espèces', items: 5, discount: 5.00, tax: 6.65, total: 41.65, status: 'En cours' },
  { id: 6, receiptNumber: 'RCP-2026-0006', date: '2026-07-13', time: '10:30', cashier: 'Sophie Martin', customer: 'Thomas Dubois', table: 7, orderType: 'Dine-in', paymentMethod: 'Carte', items: 2, discount: 0, tax: 3.80, total: 23.80, status: 'Complété' },
  { id: 7, receiptNumber: 'RCP-2026-0007', date: '2026-07-13', time: '11:15', cashier: 'Lucas Petit', customer: 'Claire Fontaine', table: 1, orderType: 'Dine-in', paymentMethod: 'Mobile', items: 3, discount: 2.00, tax: 4.37, total: 27.37, status: 'Complété' },
  { id: 8, receiptNumber: 'RCP-2026-0008', date: '2026-07-13', time: '11:45', cashier: 'Marc Laurent', customer: 'Client sans ticket', table: null, orderType: 'Livraison', paymentMethod: 'Carte', items: 4, discount: 0, tax: 5.70, total: 35.70, status: 'Annulé' },
  { id: 9, receiptNumber: 'RCP-2026-0009', date: '2026-07-13', time: '12:20', cashier: 'Sophie Martin', customer: 'Nicolas Girard', table: 4, orderType: 'Dine-in', paymentMethod: 'Espèces', items: 6, discount: 8.00, tax: 7.60, total: 47.60, status: 'Complété' },
  { id: 10, receiptNumber: 'RCP-2026-0010', date: '2026-07-13', time: '12:50', cashier: 'Lucas Petit', customer: 'Julie Mercier', table: 6, orderType: 'Dine-in', paymentMethod: 'Carte', items: 2, discount: 0, tax: 3.23, total: 20.23, status: 'Complété' },
  { id: 11, receiptNumber: 'RCP-2026-0011', date: '2026-07-13', time: '13:30', cashier: 'Marc Laurent', customer: 'Antoine Roux', table: 8, orderType: 'Dine-in', paymentMethod: 'Mobile', items: 3, discount: 0, tax: 4.75, total: 29.75, status: 'Complété' },
  { id: 12, receiptNumber: 'RCP-2026-0012', date: '2026-07-13', time: '14:00', cashier: 'Sophie Martin', customer: 'Client sans ticket', table: null, orderType: 'À emporter', paymentMethod: 'Carte', items: 1, discount: 0, tax: 1.52, total: 9.52, status: 'Remboursé' },
  { id: 13, receiptNumber: 'RCP-2026-0013', date: '2026-07-13', time: '14:45', cashier: 'Lucas Petit', customer: 'Sarah Bernard', table: null, orderType: 'Livraison', paymentMethod: 'Carte', items: 3, discount: 2.50, tax: 4.27, total: 26.77, status: 'Complété' },
  { id: 14, receiptNumber: 'RCP-2026-0014', date: '2026-07-13', time: '15:20', cashier: 'Marc Laurent', customer: 'David Muller', table: 2, orderType: 'Dine-in', paymentMethod: 'Espèces', items: 2, discount: 0, tax: 2.85, total: 17.85, status: 'En cours' },
  { id: 15, receiptNumber: 'RCP-2026-0015', date: '2026-07-13', time: '16:00', cashier: 'Sophie Martin', customer: 'Emma Colin', table: 5, orderType: 'Dine-in', paymentMethod: 'Carte', items: 4, discount: 0, tax: 6.65, total: 41.65, status: 'Complété' },
  { id: 16, receiptNumber: 'RCP-2026-0016', date: '2026-07-12', time: '08:30', cashier: 'Sophie Martin', customer: 'Jean Dupont', table: 3, orderType: 'Dine-in', paymentMethod: 'Espèces', items: 2, discount: 0, tax: 2.85, total: 17.85, status: 'Complété' },
  { id: 17, receiptNumber: 'RCP-2026-0017', date: '2026-07-12', time: '09:15', cashier: 'Marc Laurent', customer: 'Marie Lambert', table: null, orderType: 'À emporter', paymentMethod: 'Carte', items: 3, discount: 1.50, tax: 4.27, total: 26.77, status: 'Complété' },
  { id: 18, receiptNumber: 'RCP-2026-0018', date: '2026-07-12', time: '10:00', cashier: 'Lucas Petit', customer: 'Pierre Moreau', table: 7, orderType: 'Dine-in', paymentMethod: 'Mobile', items: 5, discount: 0, tax: 7.60, total: 47.60, status: 'Complété' },
  { id: 19, receiptNumber: 'RCP-2026-0019', date: '2026-07-12', time: '11:30', cashier: 'Sophie Martin', customer: 'Client sans ticket', table: null, orderType: 'Livraison', paymentMethod: 'Carte', items: 2, discount: 0, tax: 3.80, total: 23.80, status: 'Annulé' },
  { id: 20, receiptNumber: 'RCP-2026-0020', date: '2026-07-12', time: '12:15', cashier: 'Marc Laurent', customer: 'Anne Leroy', table: 1, orderType: 'Dine-in', paymentMethod: 'Espèces', items: 4, discount: 5.00, tax: 5.70, total: 35.20, status: 'Complété' },
  { id: 21, receiptNumber: 'RCP-2026-0021', date: '2026-07-11', time: '09:00', cashier: 'Lucas Petit', customer: 'Thomas Dubois', table: 4, orderType: 'Dine-in', paymentMethod: 'Carte', items: 3, discount: 0, tax: 4.75, total: 29.75, status: 'Complété' },
  { id: 22, receiptNumber: 'RCP-2026-0022', date: '2026-07-11', time: '10:30', cashier: 'Sophie Martin', customer: 'Nicolas Girard', table: null, orderType: 'À emporter', paymentMethod: 'Mobile', items: 1, discount: 0, tax: 1.90, total: 11.90, status: 'Complété' },
  { id: 23, receiptNumber: 'RCP-2026-0023', date: '2026-07-11', time: '13:00', cashier: 'Marc Laurent', customer: 'Julie Mercier', table: 6, orderType: 'Dine-in', paymentMethod: 'Carte', items: 4, discount: 3.00, tax: 5.89, total: 36.89, status: 'Complété' },
  { id: 24, receiptNumber: 'RCP-2026-0024', date: '2026-07-10', time: '08:45', cashier: 'Lucas Petit', customer: 'Client sans ticket', table: null, orderType: 'À emporter', paymentMethod: 'Espèces', items: 2, discount: 0, tax: 1.90, total: 11.90, status: 'Complété' },
  { id: 25, receiptNumber: 'RCP-2026-0025', date: '2026-07-10', time: '11:00', cashier: 'Sophie Martin', customer: 'Claire Fontaine', table: 2, orderType: 'Dine-in', paymentMethod: 'Carte', items: 3, discount: 0, tax: 4.75, total: 29.75, status: 'Complété' }
];

export default function Reports() {
  const [showBiExport, setShowBiExport] = useState(false);

  // Log environment on component mount
  useEffect(() => {
    logEnvironment();
  }, []);

  // Theme configuration integration
  const { config: electronConfig } = useAppConfig();
  const getConfig = () => {
    if (electronConfig && electronConfig.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      currency: 'DT',
      currencyPosition: 'after',
      taxRate: 19
    });
  };
  const config = getConfig();
  const styles = POSConfiguration.getStyles(config);

  const formatPrice = (price) => {
    if (config.currencyPosition === 'before') {
      return `${config.currency}${price.toFixed(2)}`;
    }
    return `${price.toFixed(2)} ${config.currency}`;
  };

  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  // Transaction table state
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterCashier, setFilterCashier] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOrderType, setFilterOrderType] = useState('all');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const rowsPerPage = 10;

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(tx =>
        tx.receiptNumber.toLowerCase().includes(term) ||
        tx.customer.toLowerCase().includes(term) ||
        tx.cashier.toLowerCase().includes(term)
      );
    }

    // Period filter
    if (filterPeriod !== 'all') {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      result = result.filter(tx => {
        const txDate = tx.date;
        switch (filterPeriod) {
          case 'today': return txDate === today;
          case 'yesterday': return txDate === yesterdayStr;
          case 'week': return new Date(txDate) >= weekAgo;
          case 'month': return new Date(txDate) >= monthAgo;
          default: return true;
        }
      });
    }

    // Cashier filter
    if (filterCashier !== 'all') {
      result = result.filter(tx => tx.cashier === filterCashier);
    }

    // Payment method filter
    if (filterPayment !== 'all') {
      result = result.filter(tx => tx.paymentMethod === filterPayment);
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(tx => tx.status === filterStatus);
    }

    // Order type filter
    if (filterOrderType !== 'all') {
      result = result.filter(tx => tx.orderType === filterOrderType);
    }

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'receiptNumber': cmp = a.receiptNumber.localeCompare(b.receiptNumber); break;
        case 'date': cmp = a.date.localeCompare(b.date) || a.time.localeCompare(b.time); break;
        case 'cashier': cmp = a.cashier.localeCompare(b.cashier); break;
        case 'customer': cmp = a.customer.localeCompare(b.customer); break;
        case 'table': cmp = (a.table || 0) - (b.table || 0); break;
        case 'orderType': cmp = a.orderType.localeCompare(b.orderType); break;
        case 'paymentMethod': cmp = a.paymentMethod.localeCompare(b.paymentMethod); break;
        case 'items': cmp = a.items - b.items; break;
        case 'total': cmp = a.total - b.total; break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        default: cmp = 0;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [transactions, searchTerm, filterPeriod, filterCashier, filterPayment, filterStatus, filterOrderType, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const openTransactionDetail = (tx) => {
    setSelectedTransaction(tx);
    setShowDetailModal(true);
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Complété': return 'default';
      case 'En cours': return 'secondary';
      case 'Annulé': return 'destructive';
      case 'Remboursé': return 'outline';
      default: return 'outline';
    }
  };

  const uniqueCashiers = [...new Set(transactions.map(tx => tx.cashier))];
  const uniquePayments = [...new Set(transactions.map(tx => tx.paymentMethod))];
  const uniqueStatuses = [...new Set(transactions.map(tx => tx.status))];
  const uniqueOrderTypes = [...new Set(transactions.map(tx => tx.orderType))];

  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    averageTicket: 0,
    topProduct: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportsData();
  }, [selectedPeriod]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      
      // Preview mode: use demo data
      if (isPreviewMode()) {
        setSalesData(DEMO_HOURLY_DATA);
        setCategoryData(DEMO_CATEGORY_DATA);
        
        const totalSales = DEMO_HOURLY_DATA.reduce((sum, item) => sum + item.sales, 0);
        const totalRevenue = DEMO_HOURLY_DATA.reduce((sum, item) => sum + item.revenue, 0);
        
        setStats({
          totalSales,
          totalRevenue,
          averageTicket: totalRevenue / totalSales,
          topProduct: 'Café Expresso'
        });

        setTransactions(DEMO_TRANSACTIONS);
        
        setLoading(false);
        return;
      }

      // Production mode: load from database
      if (!window.electronAPI) {
        console.warn('⚠️ Electron API not available');
        setSalesData([]);
        setCategoryData([]);
        setStats({
          totalSales: 0,
          totalRevenue: 0,
          averageTicket: 0,
          topProduct: null
        });
        setLoading(false);
        return;
      }

      // Get date range based on selected period
      const dateRange = getDateRangeForPeriod(selectedPeriod);
      
      // Load sales data grouped by hour (for today) or by day (for other periods)
      const groupBy = selectedPeriod === 'today' ? 'hour' : 'day';
      const salesQuery = selectedPeriod === 'today' 
        ? `SELECT 
             strftime('%H', created_at) as hour,
             COUNT(*) as sales,
             COALESCE(SUM(total), 0) as revenue
           FROM sales 
           WHERE DATE(created_at) = DATE('now', 'localtime')
           GROUP BY hour
           ORDER BY hour`
        : `SELECT 
             DATE(created_at) as date,
             COUNT(*) as sales,
             COALESCE(SUM(total), 0) as revenue
           FROM sales 
           WHERE created_at >= ? AND created_at < ?
           GROUP BY DATE(created_at)
           ORDER BY date`;

      const salesResult = selectedPeriod === 'today'
        ? await window.electronAPI.query(salesQuery)
        : await window.electronAPI.query(salesQuery, [dateRange.start, dateRange.end]);

      // Format hourly data
      const formattedSalesData = selectedPeriod === 'today'
        ? salesResult.map(item => ({
            hour: `${item.hour}h`,
            sales: item.sales,
            revenue: parseFloat(item.revenue)
          }))
        : salesResult.map(item => ({
            hour: new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
            sales: item.sales,
            revenue: parseFloat(item.revenue)
          }));

      setSalesData(formattedSalesData);

      // Load category data
      const categoryQuery = `
        SELECT 
          p.category,
          COUNT(si.id) as count
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.created_at >= ? AND s.created_at < ?
        GROUP BY p.category
        ORDER BY count DESC
      `;

      const categoryResult = await window.electronAPI.query(categoryQuery, [dateRange.start, dateRange.end]);
      
      const totalItems = categoryResult.reduce((sum, cat) => sum + cat.count, 0);
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];
      
      const formattedCategoryData = categoryResult.map((cat, index) => ({
        name: cat.category || 'Sans catégorie',
        value: totalItems > 0 ? Math.round((cat.count / totalItems) * 100) : 0,
        color: colors[index % colors.length]
      }));

      setCategoryData(formattedCategoryData);

      // Calculate stats
      const totalSales = formattedSalesData.reduce((sum, item) => sum + item.sales, 0);
      const totalRevenue = formattedSalesData.reduce((sum, item) => sum + item.revenue, 0);

      // Get top product
      const topProductQuery = `
        SELECT p.name, COUNT(si.id) as count
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.created_at >= ? AND s.created_at < ?
        GROUP BY p.id
        ORDER BY count DESC
        LIMIT 1
      `;
      
      const topProductResult = await window.electronAPI.query(topProductQuery, [dateRange.start, dateRange.end]);
      
      setStats({
        totalSales,
        totalRevenue,
        averageTicket: totalSales > 0 ? totalRevenue / totalSales : 0,
        topProduct: topProductResult[0]?.name || null
      });

      // Load transactions from DB
      await loadTransactions(dateRange);

    } catch (error) {
      console.error('❌ Error loading reports data:', error);
      setSalesData([]);
      setCategoryData([]);
      setStats({
        totalSales: 0,
        totalRevenue: 0,
        averageTicket: 0,
        topProduct: null
      });
    } finally {
      setLoading(false);
    }
  };

  // Load transactions from database
  const loadTransactions = async (dateRange) => {
    if (!window.electronAPI) {
      setTransactions(DEMO_TRANSACTIONS);
      return;
    }
    try {
      const txQuery = `
        SELECT 
          s.id, s.total, s.tax, s.discount, s.discount_percentage, s.subtotal,
          s.payment_method, s.table_id, s.created_at, s.notes,
          u.full_name as cashier_name,
          c.name as customer_name,
          (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count
        FROM sales s
        LEFT JOIN users u ON u.id = s.user_id
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE s.created_at >= ? AND s.created_at < ?
        ORDER BY s.created_at DESC
        LIMIT 500
      `;
      const txData = await window.electronAPI.query(txQuery, [dateRange.start, dateRange.end]);
      setTransactions((txData || []).map(row => {
        const d = new Date(row.created_at);
        return {
          id: row.id,
          receiptNumber: `RCP-${String(row.id).padStart(6, '0')}`,
          date: d.toLocaleDateString('fr-CA'),
          time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          cashier: row.cashier_name || 'Inconnu',
          customer: row.customer_name || 'Client sans ticket',
          table: row.table_id,
          orderType: row.table_id ? 'Dine-in' : 'À emporter',
          paymentMethod: row.payment_method === 'cash' || row.payment_method === 'espèces' ? 'Espèces' :
                         row.payment_method === 'card' || row.payment_method === 'carte' ? 'Carte' :
                         row.payment_method === 'mobile' ? 'Mobile' : row.payment_method || 'Carte',
          items: row.item_count || 0,
          discount: row.discount || 0,
          tax: row.tax || 0,
          total: row.total || 0,
          status: 'Complété'
        };
      }));
    } catch (e) {
      console.error('Error loading transactions:', e);
      setTransactions(DEMO_TRANSACTIONS);
    }
  };

  // Helper function to get date range based on period
  const getDateRangeForPeriod = (period) => {
    const now = new Date();
    let start, end;

    switch (period) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        start = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
        end = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        start = new Date(weekStart.setHours(0, 0, 0, 0)).toISOString();
        end = new Date().toISOString();
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        end = new Date().toISOString();
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1).toISOString();
        end = new Date().toISOString();
        break;
      default:
        start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
    }

    return { start, end };
  };

  const periods = [
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'yesterday', label: 'Hier' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'year', label: 'Cette année' }
  ];

  const statCards = [
    {
      title: 'Ventes totales',
      value: stats.totalSales,
      description: 'Transactions effectuées',
      icon: ShoppingCart,
      color: 'text-blue-600'
    },
    {
      title: 'Chiffre d\'affaires',
      value: formatPrice(stats.totalRevenue),
      description: 'Revenus générés',
      icon: Euro,
      color: 'text-green-600'
    },
    {
      title: 'Ticket moyen',
      value: formatPrice(stats.averageTicket),
      description: 'Montant moyen par vente',
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      title: 'Produit vedette',
      value: stats.topProduct || 'N/A',
      description: 'Produit le plus vendu',
      icon: Package,
      color: 'text-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Rapports</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hasData = salesData.length > 0 || stats.totalSales > 0;

  return (
    <>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rapports</h1>
          <p className="text-muted-foreground">
            Analysez les performances de votre activité
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowBiExport(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export BI
          </Button>
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique des ventes */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution des ventes</CardTitle>
            <CardDescription>
              Ventes par heure pour la période sélectionnée
            </CardDescription>
          </CardHeader>
          <CardContent>
            {salesData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucune vente pour cette période</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Les données apparaîtront une fois les ventes effectuées
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'sales' ? `${value} ventes` : formatPrice(value),
                      name === 'sales' ? 'Ventes' : 'Revenus'
                    ]}
                  />
                  <Bar dataKey="sales" fill="#3B82F6" name="sales" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Répartition par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle>Ventes par catégorie</CardTitle>
            <CardDescription>
              Répartition des ventes par type de produit
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucune donnée de catégorie</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Les catégories apparaîtront une fois les ventes effectuées
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Part']} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="grid grid-cols-2 gap-2">
                  {categoryData.map((category) => (
                    <div key={category.name} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-sm">{category.name}</span>
                      <Badge variant="outline" className="ml-auto">
                        {category.value}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tableau des performances */}
      <Card>
        <CardHeader>
          <CardTitle>Performances détaillées</CardTitle>
          <CardDescription>
            Analyse détaillée par tranche horaire
          </CardDescription>
        </CardHeader>
        <CardContent>
          {salesData.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucune donnée de performance</p>
              <p className="text-sm text-muted-foreground mt-1">
                Les performances apparaîtront une fois les ventes effectuées
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Heure</th>
                    <th className="text-right p-2">Ventes</th>
                    <th className="text-right p-2">Revenus</th>
                    <th className="text-right p-2">Ticket moyen</th>
                    <th className="text-right p-2">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.map((item, index) => {
                    const avgTicket = item.sales > 0 ? item.revenue / item.sales : 0;
                    const performance = item.sales > 20 ? 'Excellente' : 
                                      item.sales > 15 ? 'Bonne' : 
                                      item.sales > 10 ? 'Moyenne' : 'Faible';
                    const performanceColor = item.sales > 20 ? 'text-green-600' : 
                                           item.sales > 15 ? 'text-blue-600' : 
                                           item.sales > 10 ? 'text-orange-600' : 'text-red-600';
                    
                    return (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{item.hour}</td>
                        <td className="text-right p-2">{item.sales}</td>
                        <td className="text-right p-2">{formatPrice(item.revenue)}</td>
                        <td className="text-right p-2">{formatPrice(avgTicket)}</td>
                        <td className={`text-right p-2 font-medium ${performanceColor}`}>
                          {performance}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <BiExportModal open={showBiExport} onOpenChange={setShowBiExport} />

      {/* Sales Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                {filteredTransactions.length} transaction(s) trouvée(s)
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher reçu, client..."
                  className="pl-8 w-56"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={filterPeriod} onValueChange={(v) => { setFilterPeriod(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Période" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les périodes</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="yesterday">Hier</SelectItem>
                <SelectItem value="week">7 derniers jours</SelectItem>
                <SelectItem value="month">30 derniers jours</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCashier} onValueChange={(v) => { setFilterCashier(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Caissier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les caissiers</SelectItem>
                {uniqueCashiers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPayment} onValueChange={(v) => { setFilterPayment(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Paiement" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les moyens</SelectItem>
                {uniquePayments.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterOrderType} onValueChange={(v) => { setFilterOrderType(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {uniqueOrderTypes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {uniqueStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('receiptNumber')}>
                    <div className="flex items-center gap-1">Reçu {sortField === 'receiptNumber' && <ArrowUpDown className="h-3 w-3" />}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1">Date {sortField === 'date' && <ArrowUpDown className="h-3 w-3" />}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('cashier')}>
                    <div className="flex items-center gap-1">Caissier {sortField === 'cashier' && <ArrowUpDown className="h-3 w-3" />}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('customer')}>
                    <div className="flex items-center gap-1">Client {sortField === 'customer' && <ArrowUpDown className="h-3 w-3" />}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('table')}>
                    <div className="flex items-center gap-1">Table {sortField === 'table' && <ArrowUpDown className="h-3 w-3" />}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('orderType')}>
                    <div className="flex items-center gap-1">Type {sortField === 'orderType' && <ArrowUpDown className="h-3 w-3" />}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('paymentMethod')}>
                    <div className="flex items-center gap-1">Paiement {sortField === 'paymentMethod' && <ArrowUpDown className="h-3 w-3" />}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('items')}>
                    <div className="flex items-center justify-end gap-1">Qté {sortField === 'items' && <ArrowUpDown className="h-3 w-3" />}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('total')}>
                    <div className="flex items-center justify-end gap-1">Total {sortField === 'total' && <ArrowUpDown className="h-3 w-3" />}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1">Statut {sortField === 'status' && <ArrowUpDown className="h-3 w-3" />}</div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                      Aucune transaction trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.receiptNumber}</TableCell>
                      <TableCell>{tx.date} <span className="text-muted-foreground">{tx.time}</span></TableCell>
                      <TableCell>{tx.cashier}</TableCell>
                      <TableCell className="max-w-[140px] truncate">{tx.customer}</TableCell>
                      <TableCell>{tx.table ? `Table ${tx.table}` : '-'}</TableCell>
                      <TableCell>{tx.orderType}</TableCell>
                      <TableCell>{tx.paymentMethod}</TableCell>
                      <TableCell className="text-right">{tx.items}</TableCell>
                      <TableCell className="text-right font-medium">{formatPrice(tx.total)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(tx.status)}>{tx.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openTransactionDetail(tx)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? 'default' : 'outline'}
                    size="sm"
                    className="w-9"
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

      {/* Transaction Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-5 border-b flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-500" />
                  {selectedTransaction.receiptNumber}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedTransaction.date} à {selectedTransaction.time}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* General Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Informations générales</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Reçu</span>
                    <p className="font-medium">{selectedTransaction.receiptNumber}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Date</span>
                    <p className="font-medium">{selectedTransaction.date}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Heure</span>
                    <p className="font-medium">{selectedTransaction.time}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Caissier</span>
                    <p className="font-medium">{selectedTransaction.cashier}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Client</span>
                    <p className="font-medium">{selectedTransaction.customer}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Table</span>
                    <p className="font-medium">{selectedTransaction.table ? `Table ${selectedTransaction.table}` : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Type de commande</span>
                    <p className="font-medium">{selectedTransaction.orderType}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Statut</span>
                    <p className="font-medium">
                      <Badge variant={getStatusBadgeVariant(selectedTransaction.status)}>{selectedTransaction.status}</Badge>
                    </p>
                  </div>
                </div>
              </div>

              {/* Ordered Products */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Produits commandés</h3>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Produit</th>
                        <th className="text-center p-3 font-medium">Qté</th>
                        <th className="text-right p-3 font-medium">Prix unitaire</th>
                        <th className="text-right p-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(selectedTransaction.items)].map((_, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-3">Produit #{i + 1}</td>
                          <td className="text-center p-3">1</td>
                          <td className="text-right p-3">{formatPrice(selectedTransaction.total / selectedTransaction.items)}</td>
                          <td className="text-right p-3 font-medium">{formatPrice(selectedTransaction.total / selectedTransaction.items)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Récapitulatif</h3>
                <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sous-total</span>
                    <span className="font-medium">{formatPrice(selectedTransaction.total - selectedTransaction.tax + selectedTransaction.discount)}</span>
                  </div>
                  {selectedTransaction.discount > 0 && (
                    <div className="flex justify-between text-sm text-amber-600">
                      <span>Réduction</span>
                      <span className="font-medium">-{formatPrice(selectedTransaction.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">TVA</span>
                    <span className="font-medium text-emerald-600">{formatPrice(selectedTransaction.tax)}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-blue-200 pt-2">
                    <span className="font-bold">Total TTC</span>
                    <span className="font-bold text-lg text-blue-600">{formatPrice(selectedTransaction.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-1">
                    <span className="text-gray-600">Paiement</span>
                    <span className="font-medium">{selectedTransaction.paymentMethod}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

