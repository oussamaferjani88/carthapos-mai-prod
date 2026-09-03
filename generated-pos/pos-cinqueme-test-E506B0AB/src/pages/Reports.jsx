import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
  ComposedChart
} from 'recharts';
import {
  TrendingUp, Euro, ShoppingCart, Users, Package,
  Download, Search, ArrowUpDown, ChevronLeft, ChevronRight, ChevronFirst,
  ChevronLast, Receipt, Eye, X, Printer, Clock, CreditCard,
  Banknote, BarChart3, PieChart as PieChartIcon, Activity,
  UserCheck, RefreshCw, AlertCircle, Inbox, ArrowUpRight, ArrowDownRight,
  FileSpreadsheet
} from 'lucide-react';
import BiExportModal from '../components/BiExportModal';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { formatCurrency } from '../utils/currency';

const PERIOD_PRESETS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'yesterday', label: 'Hier' },
  { value: 'this_week', label: 'Cette Semaine' },
  { value: 'last_week', label: 'Semaine Dernière' },
  { value: 'this_month', label: 'Ce Mois' },
  { value: 'last_month', label: 'Mois Dernier' },
  { value: 'this_year', label: 'Cette Année' },
  { value: 'last_year', label: 'Année Dernière' },
  { value: 'custom', label: 'Personnalisé' },
];

const PAYMENT_METHODS_FILTER = [
  { value: 'all', label: 'Tous les moyens' },
  { value: 'cash', label: 'Espèces' },
  { value: 'card', label: 'Carte' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'credit', label: 'Crédit' },
];

const SHIFT_STATUS_FILTER = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'open', label: 'Ouvert' },
  { value: 'closed', label: 'Fermé' },
];

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.96)',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  padding: '12px 16px',
  fontSize: '13px',
};

function formatNumber(v) {
  return new Intl.NumberFormat('fr-FR').format(v || 0);
}

function formatPercent(v) {
  if (v == null || isNaN(v)) return '0%';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function getDateRange(period, customStart, customEnd) {
  if (period === 'custom' && customStart && customEnd) {
    return { period: 'custom', start: customStart, end: customEnd };
  }
  return { period, start: undefined, end: undefined };
}

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ───────── ErrorBoundary ───────── */
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
            <p className="text-sm font-medium text-destructive">Erreur de graphique</p>
            <p className="text-xs text-muted-foreground mt-1">Impossible d'afficher ce graphique</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ───────── Empty state ───────── */
function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <div className="text-center">
        <Icon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
  );
}

/* ───────── Skeleton loaders ───────── */
function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-3 w-36" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = 300 }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full`} style={{ height }} />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ───────── Main Component ───────── */
export default function Reports() {
  const { config: electronConfig } = useAppConfig();
  const [showBiExport, setShowBiExport] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const getConfig = useCallback(() => {
    if (electronConfig && electronConfig.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      currency: 'TND',
      currencyPosition: 'after',
      taxRate: 20,
    });
  }, [electronConfig]);

  const config = useMemo(() => getConfig(), [getConfig]);

  const formatPrice = useCallback((v) => {
    return formatCurrency(v || 0, config?.currency || 'TND', config?.currencyPosition || 'after');
  }, [config?.currency, config?.currencyPosition]);

  const themeColors = useMemo(() => [
    config.primaryColor,
    config.accentColor || '#10B981',
    '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
    '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  ], [config.primaryColor, config.accentColor]);

  /* ─── Period State ─── */
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const periodOpts = useMemo(
    () => getDateRange(selectedPeriod, customStart, customEnd),
    [selectedPeriod, customStart, customEnd]
  );

  /* ─── Dashboard State ─── */
  const [dashboard, setDashboard] = useState(null);
  const [salesByPeriod, setSalesByPeriod] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  /* ─── Analytics State ─── */
  const [cashiers, setCashiers] = useState(null);
  const [revenueTrends, setRevenueTrends] = useState([]);
  const [hourlyHeatmap, setHourlyHeatmap] = useState([]);
  const [customerStats, setCustomerStats] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  /* ─── Transactions State ─── */
  const [txData, setTxData] = useState({ data: [], total: 0, totalPages: 0, page: 1, perPage: 15 });
  const [txSearch, setTxSearch] = useState('');
  const [txPaymentFilter, setTxPaymentFilter] = useState('all');
  const [txSortBy, setTxSortBy] = useState('date');
  const [txSortDir, setTxSortDir] = useState('desc');
  const [txPage, setTxPage] = useState(1);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const [txDetailOpen, setTxDetailOpen] = useState(false);
  const debouncedTxSearch = useDebounce(txSearch, 400);

  /* ─── Cash Shifts State ─── */
  const [shiftData, setShiftData] = useState({ data: [], total: 0, totalPages: 0, page: 1, perPage: 15 });
  const [shiftSearch, setShiftSearch] = useState('');
  const [shiftStatusFilter, setShiftStatusFilter] = useState('all');
  const [shiftSortBy, setShiftSortBy] = useState('opened_at');
  const [shiftSortDir, setShiftSortDir] = useState('desc');
  const [shiftPage, setShiftPage] = useState(1);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftError, setShiftError] = useState(null);
  const [expandedShift, setExpandedShift] = useState(null);
  const debouncedShiftSearch = useDebounce(shiftSearch, 400);

  /* ─── X/Z Reports State ─── */
  const [zReportHistory, setZReportHistory] = useState([]);
  const [zReportLoading, setZReportLoading] = useState(false);
  const [xReportData, setXReportData] = useState(null);
  const [xReportLoading, setXReportLoading] = useState(false);
  const [zCloseDialogOpen, setZCloseDialogOpen] = useState(false);
  const [zCloseSummary, setZCloseSummary] = useState(null);
  const [zCloseClosingAmount, setZCloseClosingAmount] = useState('');
  const [selectedZReport, setSelectedZReport] = useState(null);
  const [zDetailOpen, setZDetailOpen] = useState(false);

  /* ═══════════════════ DATA LOADING ═══════════════════ */

  const loadDashboard = useCallback(async () => {
    if (!window.electronAPI) return;
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const [dashRes, salesRes, catRes, topRes, payRes] = await Promise.all([
        window.electronAPI.reportDashboard(periodOpts),
        window.electronAPI.reportSalesByPeriod(periodOpts),
        window.electronAPI.reportCategories(periodOpts),
        window.electronAPI.reportTopProducts({ ...periodOpts, limit: 5 }),
        window.electronAPI.reportPaymentMethods(periodOpts),
      ]);
      setDashboard(dashRes);
      setSalesByPeriod(salesRes?.data || []);
      setCategories(catRes?.data || []);
      setTopProducts(topRes?.data || []);
      setPaymentMethods(payRes?.data || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setDashboardError(err.message || 'Erreur lors du chargement du tableau de bord');
    } finally {
      setDashboardLoading(false);
    }
  }, [periodOpts]);

  const loadAnalytics = useCallback(async () => {
    if (!window.electronAPI) return;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const [cashiersRes, revenueRes, heatmapRes, custRes] = await Promise.all([
        window.electronAPI.reportCashiers(periodOpts),
        window.electronAPI.reportRevenueTrends(periodOpts),
        window.electronAPI.reportHourlyHeatmap(periodOpts),
        window.electronAPI.reportCustomers(periodOpts),
      ]);
      setCashiers(cashiersRes);
      setRevenueTrends(revenueRes?.data || []);
      setHourlyHeatmap(heatmapRes?.data || []);
      setCustomerStats(custRes);
    } catch (err) {
      console.error('Analytics load error:', err);
      setAnalyticsError(err.message || 'Erreur lors du chargement des analyses');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [periodOpts]);

  const loadTransactions = useCallback(async () => {
    if (!window.electronAPI) return;
    setTxLoading(true);
    setTxError(null);
    try {
      const res = await window.electronAPI.reportTransactions({
        ...periodOpts,
        page: txPage,
        perPage: 15,
        search: debouncedTxSearch || undefined,
        paymentMethod: txPaymentFilter !== 'all' ? txPaymentFilter : undefined,
        sortBy: txSortBy,
        sortDir: txSortDir,
      });
      setTxData(res || { data: [], total: 0, totalPages: 0, page: 1, perPage: 15 });
    } catch (err) {
      console.error('Transactions load error:', err);
      setTxError(err.message || 'Erreur lors du chargement des transactions');
    } finally {
      setTxLoading(false);
    }
  }, [periodOpts, txPage, debouncedTxSearch, txPaymentFilter, txSortBy, txSortDir]);

  const loadCashShifts = useCallback(async () => {
    if (!window.electronAPI) return;
    setShiftLoading(true);
    setShiftError(null);
    try {
      const res = await window.electronAPI.reportCashShifts({
        start: periodOpts.start,
        end: periodOpts.end,
        page: shiftPage,
        perPage: 15,
        search: debouncedShiftSearch || undefined,
        status: shiftStatusFilter !== 'all' ? shiftStatusFilter : undefined,
        sortBy: shiftSortBy,
        sortDir: shiftSortDir,
      });
      setShiftData(res || { data: [], total: 0, totalPages: 0, page: 1, perPage: 15 });
    } catch (err) {
      console.error('Cash shifts load error:', err);
      setShiftError(err.message || 'Erreur lors du chargement des caisses');
    } finally {
      setShiftLoading(false);
    }
  }, [periodOpts, shiftPage, debouncedShiftSearch, shiftStatusFilter, shiftSortBy, shiftSortDir]);

  const loadXReport = useCallback(async () => {
    if (!window.electronAPI) return;
    setXReportLoading(true);
    try {
      const res = await window.electronAPI.generateXReport({ period: selectedPeriod, start: periodOpts.start, end: periodOpts.end });
      if (res?.error) {
        setXReportData({ error: res.error });
      } else {
        setXReportData(res?.data || null);
      }
    } catch (err) {
      console.error('X Report load error:', err);
      setXReportData({ error: err.message || 'Erreur lors du chargement du rapport X' });
    } finally {
      setXReportLoading(false);
    }
  }, [selectedPeriod, periodOpts]);

  const loadZReportHistory = useCallback(async () => {
    if (!window.electronAPI) return;
    setZReportLoading(true);
    try {
      const res = await window.electronAPI.getZReportHistory({ page: 1, perPage: 50 });
      setZReportHistory(res?.data || []);
    } catch (err) {
      console.error('Z Report history load error:', err);
    } finally {
      setZReportLoading(false);
    }
  }, []);

  const handleZClose = async () => {
    try {
      const res = await window.electronAPI.generateZReport({
        closing_amount: parseFloat(zCloseClosingAmount) || 0
      });
      setZCloseSummary(res);
      setZCloseDialogOpen(false);
      setZCloseClosingAmount('');
      loadZReportHistory();
      if (activeTab === 'cash_shifts') loadCashShifts();
    } catch (err) {
      console.error('Z Report close error:', err);
    }
  };

  /* ─── Auto-refresh on new sale ─── */
  useEffect(() => {
    const handleSaleCompleted = () => {
      if (activeTab === 'dashboard') loadDashboard();
      if (activeTab === 'analytics') loadAnalytics();
    };
    window.addEventListener('sale-completed', handleSaleCompleted);
    return () => window.removeEventListener('sale-completed', handleSaleCompleted);
  }, [activeTab, loadDashboard, loadAnalytics]);

  /* ─── Period change triggers ─── */
  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
    if (activeTab === 'analytics') loadAnalytics();
    if (activeTab === 'transactions') { setTxPage(1); loadTransactions(); }
    if (activeTab === 'cash_shifts') { setShiftPage(1); loadCashShifts(); }
    if (activeTab === 'xz_reports') { loadXReport(); loadZReportHistory(); }
  }, [activeTab, selectedPeriod, customStart, customEnd]);

  useEffect(() => { if (activeTab === 'transactions') loadTransactions(); }, [activeTab, debouncedTxSearch, txPaymentFilter, txSortBy, txSortDir, txPage]);
  useEffect(() => { if (activeTab === 'cash_shifts') loadCashShifts(); }, [activeTab, debouncedShiftSearch, shiftStatusFilter, shiftSortBy, shiftSortDir, shiftPage]);

  /* ═══════════════════ DERIVED DATA ═══════════════════ */

  const kpis = useMemo(() => {
    if (!dashboard) return null;
    const c = dashboard.current || {};
    const p = dashboard.previous || {};
    const pctChange = (curr, prev) => {
      if (!prev || prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / Math.abs(prev)) * 100;
    };
    return [
      {
        key: 'totalSales',
        title: 'Total Ventes',
        value: formatNumber(c.totalSales),
        previous: formatNumber(p.totalSales),
        change: pctChange(c.totalSales, p.totalSales),
        icon: ShoppingCart,
        colorClass: 'text-blue-600',
        bgClass: 'bg-blue-50',
      },
      {
        key: 'revenue',
        title: "Chiffre d'Affaires",
        value: formatPrice(c.totalRevenue),
        previous: formatPrice(p.totalRevenue),
        change: pctChange(c.totalRevenue, p.totalRevenue),
        icon: Euro,
        colorClass: 'text-green-600',
        bgClass: 'bg-green-50',
      },
      {
        key: 'avgSale',
        title: 'Panier Moyen',
        value: formatPrice(c.avgSale),
        previous: formatPrice(p.avgSale),
        change: pctChange(c.avgSale, p.avgSale),
        icon: TrendingUp,
        colorClass: 'text-purple-600',
        bgClass: 'bg-purple-50',
      },
      {
        key: 'uniqueCustomers',
        title: 'Clients Uniques',
        value: formatNumber(c.uniqueCustomers),
        previous: formatNumber(p.uniqueCustomers),
        change: pctChange(c.uniqueCustomers, p.uniqueCustomers),
        icon: Users,
        colorClass: 'text-orange-600',
        bgClass: 'bg-orange-50',
      },
    ];
  }, [dashboard]);

  const categoryChartData = useMemo(() => {
    return categories.map((c, i) => ({
      name: c.name || 'Sans catégorie',
      value: c.count || c.value || 0,
      color: themeColors[i % themeColors.length],
    }));
  }, [categories, themeColors]);

  const paymentChartData = useMemo(() => {
    const labels = { cash: 'Espèces', card: 'Carte', mobile: 'Mobile', credit: 'Crédit' };
    return paymentMethods.map((p, i) => ({
      name: labels[p.method] || p.method || 'Autre',
      value: p.count || p.total || 0,
      color: themeColors[i % themeColors.length],
    }));
  }, [paymentMethods, themeColors]);

  /* ═══════════════════ EXPORT ═══════════════════ */

  const exportCSV = useCallback(() => {
    let rows = [];
    let headers = [];

    if (activeTab === 'dashboard' && topProducts.length > 0) {
      headers = ['Produit', 'Catégorie', 'Ventes', 'Quantité', 'Revenu'];
      rows = topProducts.map(p => [p.name, p.category, p.salesCount, p.totalQuantity, p.totalRevenue]);
    } else if (activeTab === 'analytics' && cashiers?.data?.length > 0) {
      headers = ['Caissier', 'Ventes', 'Revenu Total', 'Panier Moyen'];
      rows = cashiers.data.map(c => [c.full_name, c.salesCount, c.totalRevenue, c.avgSale]);
    } else if (activeTab === 'transactions' && txData.data.length > 0) {
      headers = ['ID', 'Date', 'Caissier', 'Client', 'Montant', 'Paiement'];
      rows = txData.data.map(t => [
        t.receiptNumber || `RCP-${String(t.id).padStart(6, '0')}`,
        t.date, t.cashier, t.customer, t.total, t.paymentMethod,
      ]);
    } else if (activeTab === 'cash_shifts' && shiftData.data.length > 0) {
      headers = ['ID', 'Caissier', 'Ouverture', 'Fermeture', 'Ventes', 'Statut'];
      rows = shiftData.data.map(s => [
        `#${s.id}`, s.cashier_name || s.user_name, s.opened_at, s.closed_at || 'En cours',
        s.total_sales || 0, s.status,
      ]);
    } else {
      return;
    }

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeTab, topProducts, cashiers, txData, shiftData]);

  const printView = useCallback(() => {
    window.print();
  }, []);

  /* ═══════════════════ HANDLERS ═══════════════════ */

  const handleTxSort = useCallback((field) => {
    setTxSortDir(d => (txSortBy === field ? (d === 'asc' ? 'desc' : 'asc') : 'desc'));
    setTxSortBy(field);
    setTxPage(1);
  }, [txSortBy]);

  const handleShiftSort = useCallback((field) => {
    setShiftSortDir(d => (shiftSortBy === field ? (d === 'asc' ? 'desc' : 'asc') : 'desc'));
    setShiftSortBy(field);
    setShiftPage(1);
  }, [shiftSortBy]);

  const openTxDetail = useCallback((tx) => {
    setSelectedTx(tx);
    setTxDetailOpen(true);
  }, []);

  const refreshCurrent = useCallback(() => {
    if (activeTab === 'dashboard') loadDashboard();
    else if (activeTab === 'analytics') loadAnalytics();
    else if (activeTab === 'transactions') loadTransactions();
    else if (activeTab === 'cash_shifts') loadCashShifts();
    else if (activeTab === 'xz_reports') { loadXReport(); loadZReportHistory(); }
  }, [activeTab, loadDashboard, loadAnalytics, loadTransactions, loadCashShifts, loadXReport, loadZReportHistory]);

  /* ═══════════════════ KPI CARD ═══════════════════ */

  function KpiCard({ kpi }) {
    const isPositive = kpi.change >= 0;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
          <div className={`p-2 rounded-lg ${kpi.bgClass}`}>
            <kpi.icon className={`h-4 w-4 ${kpi.colorClass}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpi.value}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`flex items-center text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {formatPercent(kpi.change)}
            </span>
            <span className="text-xs text-muted-foreground">vs période précédente</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Période précédente : {kpi.previous}
          </p>
        </CardContent>
      </Card>
    );
  }

  /* ═══════════════════ CUSTOM TOOLTIP ═══════════════════ */

  function SalesTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
      <div style={CHART_TOOLTIP_STYLE}>
        <p className="font-semibold text-sm mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="text-xs">
            {p.name === 'revenue' ? `Revenu : ${formatPrice(p.value)}` : `Ventes : ${formatNumber(p.value)}`}
          </p>
        ))}
      </div>
    );
  }

  function PieTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    return (
      <div style={CHART_TOOLTIP_STYLE}>
        <p className="font-semibold text-sm">{payload[0].name}</p>
        <p className="text-xs text-muted-foreground">{formatNumber(payload[0].value)}</p>
      </div>
    );
  }

  /* ═══════════════════ PAGINATION ═══════════════════ */

  function Pagination({ page, totalPages, onPageChange, total }) {
    if (totalPages <= 1) return null;

    const getPages = () => {
      const pages = [];
      const maxVisible = 7;
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        if (page > 3) pages.push('...');
        const start = Math.max(2, page - 1);
        const end = Math.min(totalPages - 1, page + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (page < totalPages - 2) pages.push('...');
        pages.push(totalPages);
      }
      return pages;
    };

    return (
      <div className="flex items-center justify-between pt-4">
        <span className="text-sm text-muted-foreground">
          {formatNumber(total)} résultat(s) — Page {page} sur {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(1)}>
            <ChevronFirst className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {getPages().map((p, i) =>
            p === '...' ? (
              <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
            ) : (
              <Button
                key={p}
                variant={page === p ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8 text-xs"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            )
          )}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  /* ═══════════════════ STATUS BADGE ═══════════════════ */

  function StatusBadge({ status }) {
    const map = {
      completed: { label: 'Complété', variant: 'default' },
      Complété: { label: 'Complété', variant: 'default' },
      open: { label: 'Ouvert', variant: 'secondary' },
      Ouvert: { label: 'Ouvert', variant: 'secondary' },
      closed: { label: 'Fermé', variant: 'outline' },
      Fermé: { label: 'Fermé', variant: 'outline' },
      cancelled: { label: 'Annulé', variant: 'destructive' },
      Annulé: { label: 'Annulé', variant: 'destructive' },
      refunded: { label: 'Remboursé', variant: 'outline' },
      Remboursé: { label: 'Remboursé', variant: 'outline' },
    };
    const info = map[status] || { label: status, variant: 'outline' };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  }

  /* ═══════════════════ SORT HEADER ═══════════════════ */

  function SortHead({ label, field, sortBy, sortDir, onSort }) {
    const active = sortBy === field;
    return (
      <TableHead
        className="cursor-pointer select-none whitespace-nowrap"
        onClick={() => onSort(field)}
      >
        <div className="flex items-center gap-1">
          {label}
          {active && <ArrowUpDown className="h-3 w-3 opacity-60" />}
          {active && <span className="text-[10px] opacity-40">{sortDir === 'asc' ? '↑' : '↓'}</span>}
        </div>
      </TableHead>
    );
  }

  /* ═══════════════════ PERIOD SELECTOR ═══════════════════ */

  function PeriodSelector() {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {PERIOD_PRESETS.map(p => (
            <Button
              key={p.value}
              variant={selectedPeriod === p.value ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setSelectedPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        {selectedPeriod === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <Input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="h-7 w-36 text-xs"
            />
            <span className="text-xs text-muted-foreground">à</span>
            <Input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="h-7 w-36 text-xs"
            />
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════ DASHBOARD TAB ═══════════════════ */

  function DashboardTab() {
    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboardLoading
            ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
            : kpis?.map(k => <KpiCard key={k.key} kpi={k} />)
          }
        </div>

        {dashboardError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{dashboardError}</p>
              <Button variant="outline" size="sm" className="ml-auto" onClick={loadDashboard}>
                <RefreshCw className="h-3 w-3 mr-1" /> Réessayer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales by period chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                Évolution des Ventes
              </CardTitle>
              <CardDescription>Revenus et nombre de ventes par période</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : salesByPeriod.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="Aucune vente" description="Les données apparaîtront après les premières ventes" />
              ) : (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={salesByPeriod}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip content={<SalesTooltip />} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" name="revenue" fill={config.primaryColor} radius={[4, 4, 0, 0]} opacity={0.85} />
                      <Line yAxisId="right" type="monotone" dataKey="count" name="count" stroke={config.accentColor || '#10B981'} strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              )}
            </CardContent>
          </Card>

          {/* Category pie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                Catégories
              </CardTitle>
              <CardDescription>Performance par catégorie</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : categoryChartData.length === 0 ? (
                <EmptyState icon={Package} title="Aucune catégorie" />
              ) : (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-1.5 mt-4">
                    {categoryChartData.map((c) => (
                      <div key={c.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.name}</span>
                        <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">{formatNumber(c.value)}</Badge>
                      </div>
                    ))}
                  </div>
                </ChartErrorBoundary>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment methods + Top products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                Modes de Paiement
              </CardTitle>
              <CardDescription>Répartition par moyen de paiement</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : paymentChartData.length === 0 ? (
                <EmptyState icon={CreditCard} title="Aucune donnée de paiement" />
              ) : (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={paymentChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {paymentChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              )}
            </CardContent>
          </Card>

          {/* Top 5 products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                Top 5 Produits
              </CardTitle>
              <CardDescription>Produits les plus vendus</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <TableSkeleton rows={5} cols={4} />
              ) : topProducts.length === 0 ? (
                <EmptyState icon={Inbox} title="Aucun produit vendu" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-right">Ventes</TableHead>
                        <TableHead className="text-right">Revenu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((p, i) => (
                        <TableRow key={p.id || i}>
                          <TableCell>
                            <Badge variant="outline" className="w-6 h-6 flex items-center justify-center text-[10px] p-0">
                              {i + 1}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.category || p.family}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatNumber(p.salesCount || p.totalQuantity)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatPrice(p.totalRevenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ═══════════════════ ANALYTICS TAB ═══════════════════ */

  function AnalyticsTab() {
    const cashierData = useMemo(() => {
      if (!cashiers?.data) return [];
      return cashiers.data.map(c => ({
        name: c.full_name || c.username,
        sales: c.salesCount || 0,
        revenue: c.totalRevenue || 0,
        avg: c.avgSale || 0,
      }));
    }, [cashiers]);

    const heatmapData = useMemo(() => {
      return hourlyHeatmap.map(h => ({
        hour: `${String(h.hour).padStart(2, '0')}h`,
        count: h.count || h.sales || 0,
        revenue: h.revenue || 0,
      }));
    }, [hourlyHeatmap]);

    return (
      <div className="space-y-6">
        {analyticsError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{analyticsError}</p>
              <Button variant="outline" size="sm" className="ml-auto" onClick={loadAnalytics}>
                <RefreshCw className="h-3 w-3 mr-1" /> Réessayer
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cashier performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Ventes par Caissier
              </CardTitle>
              <CardDescription>Performance de chaque caissier</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : cashierData.length === 0 ? (
                <EmptyState icon={Users} title="Aucune donnée caissier" />
              ) : (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={Math.max(200, cashierData.length * 50)}>
                    <BarChart data={cashierData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value, name) => [name === 'revenue' ? formatPrice(value) : formatNumber(value), name === 'revenue' ? 'Revenu' : 'Ventes']}
                      />
                      <Bar dataKey="revenue" fill={config.primaryColor} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              )}
            </CardContent>
          </Card>

          {/* Revenue trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                Tendances Revenus
              </CardTitle>
              <CardDescription>Évolution du chiffre d'affaires</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : revenueTrends.length === 0 ? (
                <EmptyState icon={Activity} title="Aucune tendance disponible" />
              ) : (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueTrends}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={config.primaryColor} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={config.primaryColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value) => [formatPrice(value), 'Revenu']}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke={config.primaryColor}
                        strokeWidth={2}
                        fill="url(#revenueGradient)"
                        dot={{ r: 3, fill: config.primaryColor }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Heures de Pointe
              </CardTitle>
              <CardDescription>Nombre de ventes par heure</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : heatmapData.length === 0 ? (
                <EmptyState icon={Clock} title="Aucune donnée horaire" />
              ) : (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={heatmapData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value, name) => [formatNumber(value), name === 'count' ? 'Ventes' : 'Revenu']}
                      />
                      <Bar dataKey="count" fill={config.accentColor || '#8B5CF6'} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              )}
            </CardContent>
          </Card>

          {/* Customer stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-muted-foreground" />
                Statistiques Clients
              </CardTitle>
              <CardDescription>Aperçu de la clientèle</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : !customerStats ? (
                <EmptyState icon={Users} title="Aucune donnée client" />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{formatNumber(customerStats.totalCustomers || 0)}</p>
                      <p className="text-xs text-muted-foreground">Total clients</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{formatNumber(customerStats.newCustomers || 0)}</p>
                      <p className="text-xs text-muted-foreground">Nouveaux</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{customerStats.repeatRate || 0}%</p>
                      <p className="text-xs text-muted-foreground">Fidélité</p>
                    </div>
                  </div>
                  {customerStats.topSpenders?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Top clients</p>
                      <div className="space-y-1.5">
                        {customerStats.topSpenders.slice(0, 5).map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                            <span className="font-medium">{c.name || c.customer_name}</span>
                            <span className="text-muted-foreground">{formatPrice(c.totalSpent || c.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ═══════════════════ TRANSACTIONS TAB ═══════════════════ */

  function TransactionsTab() {
    const transactions = txData.data || [];
    const [expandedTx, setExpandedTx] = useState(null);

    const toggleTxExpand = useCallback((id) => {
      setExpandedTx(prev => (prev === id ? null : id));
    }, []);

    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher reçu, client, produit..."
              className="pl-8"
              value={txSearch}
              onChange={e => { setTxSearch(e.target.value); setTxPage(1); }}
            />
          </div>
          <Select value={txPaymentFilter} onValueChange={v => { setTxPaymentFilter(v); setTxPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS_FILTER.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {txError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{txError}</p>
              <Button variant="outline" size="sm" className="ml-auto" onClick={loadTransactions}>
                <RefreshCw className="h-3 w-3 mr-1" /> Réessayer
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {txLoading ? (
              <div className="p-4">
                <TableSkeleton rows={8} cols={7} />
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-16">
                <EmptyState icon={Receipt} title="Aucune transaction" description="Les transactions apparaîtront après les ventes" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHead label="Reçu" field="id" sortBy={txSortBy} sortDir={txSortDir} onSort={handleTxSort} />
                      <SortHead label="Date" field="date" sortBy={txSortBy} sortDir={txSortDir} onSort={handleTxSort} />
                      <SortHead label="Client" field="customer" sortBy={txSortBy} sortDir={txSortDir} onSort={handleTxSort} />
                      <SortHead label="Caissier" field="cashier" sortBy={txSortBy} sortDir={txSortDir} onSort={handleTxSort} />
                      <SortHead label="Montant" field="total" sortBy={txSortBy} sortDir={txSortDir} onSort={handleTxSort} />
                      <SortHead label="Paiement" field="paymentMethod" sortBy={txSortBy} sortDir={txSortDir} onSort={handleTxSort} />
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(tx => {
                      const receiptNo = tx.receiptNumber || `RCP-${String(tx.id).padStart(6, '0')}`;
                      const isExpanded = expandedTx === tx.id;
                      return (
                        <>
                          <TableRow className="cursor-pointer" onClick={() => toggleTxExpand(tx.id)}>
                            <TableCell className="font-medium text-xs">{receiptNo}</TableCell>
                            <TableCell className="text-xs">
                              {tx.date}
                              {tx.time && <span className="text-muted-foreground ml-1">{tx.time}</span>}
                            </TableCell>
                            <TableCell className="text-xs max-w-[140px] truncate">{tx.customer || '—'}</TableCell>
                            <TableCell className="text-xs">{tx.cashier || '—'}</TableCell>
                            <TableCell className="text-xs font-medium text-right">{formatPrice(tx.total)}</TableCell>
                            <TableCell className="text-xs">{tx.paymentMethod || '—'}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); openTxDetail(tx); }}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-muted/30 p-3">
                                <div className="text-xs space-y-1">
                                  {tx.items && tx.items.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {tx.items.map((item, j) => (
                                        <div key={j} className="flex justify-between bg-background rounded px-2 py-1">
                                          <span>{item.product_name || 'Produit'} × {item.quantity}</span>
                                          <span className="font-medium">{formatPrice((item.price || 0) * (item.quantity || 0))}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">Détails non disponibles</p>
                                  )}
                                  <div className="flex justify-between pt-2 border-t mt-2">
                                    <span className="text-muted-foreground">Paiement : {tx.paymentMethod}</span>
                                    {tx.tableNumber && <span className="text-muted-foreground">Table #{tx.tableNumber}</span>}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Pagination page={txData.page} totalPages={txData.totalPages} total={txData.total} onPageChange={setTxPage} />
      </div>
    );
  }

  /* ═══════════════════ CASH SHIFTS TAB ═══════════════════ */

  function CashShiftsTab() {
    const shifts = shiftData.data || [];

    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par caissier..."
              className="pl-8"
              value={shiftSearch}
              onChange={e => { setShiftSearch(e.target.value); setShiftPage(1); }}
            />
          </div>
          <Select value={shiftStatusFilter} onValueChange={v => { setShiftStatusFilter(v); setShiftPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHIFT_STATUS_FILTER.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {shiftError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{shiftError}</p>
              <Button variant="outline" size="sm" className="ml-auto" onClick={loadCashShifts}>
                <RefreshCw className="h-3 w-3 mr-1" /> Réessayer
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {shiftLoading ? (
              <div className="p-4">
                <TableSkeleton rows={8} cols={7} />
              </div>
            ) : shifts.length === 0 ? (
              <div className="py-16">
                <EmptyState icon={Receipt} title="Aucun shift de caisse" description="Les shifts apparaîtront une fois la caisse ouverte" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHead label="ID" field="id" sortBy={shiftSortBy} sortDir={shiftSortDir} onSort={handleShiftSort} />
                      <SortHead label="Caissier" field="cashier_name" sortBy={shiftSortBy} sortDir={shiftSortDir} onSort={handleShiftSort} />
                      <SortHead label="Ouverture" field="opened_at" sortBy={shiftSortBy} sortDir={shiftSortDir} onSort={handleShiftSort} />
                      <SortHead label="Fermeture" field="closed_at" sortBy={shiftSortBy} sortDir={shiftSortDir} onSort={handleShiftSort} />
                      <SortHead label="Ventes" field="total_sales" sortBy={shiftSortBy} sortDir={shiftSortDir} onSort={handleShiftSort} />
                      <SortHead label="Statut" field="status" sortBy={shiftSortBy} sortDir={shiftSortDir} onSort={handleShiftSort} />
                      <SortHead label="Différence" field="difference" sortBy={shiftSortBy} sortDir={shiftSortDir} onSort={handleShiftSort} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map(shift => {
                      const opening = shift.opening_amount || shift.opening_float || 0;
                      const closing = shift.closing_amount || shift.closing_actual;
                      const sales = shift.total_sales || 0;
                      const expected = opening + sales;
                      const diff = closing != null ? closing - expected : null;
                      const isOpen = shift.status === 'open' || shift.status === 'Ouvert';

                      return (
                        <>
                          <TableRow
                            className="cursor-pointer"
                            onClick={() => setExpandedShift(prev => prev === shift.id ? null : shift.id)}
                          >
                            <TableCell className="font-medium text-xs">#{shift.id}</TableCell>
                            <TableCell className="text-xs">{shift.cashier_name || shift.user_name || '—'}</TableCell>
                            <TableCell className="text-xs">
                              {shift.opened_at ? new Date(shift.opened_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {shift.closed_at
                                ? new Date(shift.closed_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                                : <span className="text-amber-600">En cours</span>}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-right">{formatPrice(sales)}</TableCell>
                            <TableCell><StatusBadge status={shift.status} /></TableCell>
                            <TableCell className={`text-xs font-medium text-right ${diff === null ? 'text-muted-foreground' : diff === 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {diff !== null ? formatPrice(diff) : '—'}
                            </TableCell>
                          </TableRow>
                          {expandedShift === shift.id && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-muted/30 p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <p className="text-muted-foreground">Fond de caisse</p>
                                    <p className="font-medium">{formatPrice(opening)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Total ventes</p>
                                    <p className="font-medium text-blue-600">{formatPrice(sales)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Attendu</p>
                                    <p className="font-medium">{formatPrice(expected)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Fermeture réelle</p>
                                    <p className="font-medium">{closing != null ? formatPrice(closing) : '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Nombre de ventes</p>
                                    <p className="font-medium">{shift.sales_count || 0}</p>
                                  </div>
                                  {diff !== null && (
                                    <div>
                                      <p className="text-muted-foreground">Écart</p>
                                      <p className={`font-bold ${diff === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {diff > 0 ? '+' : ''}{formatPrice(diff)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Pagination page={shiftData.page} totalPages={shiftData.totalPages} total={shiftData.total} onPageChange={setShiftPage} />
      </div>
    );
  }

  /* ═══════════════════ X/Z REPORTS TAB ═══════════════════ */

  function XZReportsTab() {
    return (
      <div className="space-y-6">
        {/* X Report Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Rapport X — Synthèse en cours de journée
            </CardTitle>
            <CardDescription>Résumé en lecture seule des ventes en cours (ne ferme rien)</CardDescription>
          </CardHeader>
          <CardContent>
            {xReportLoading ? (
              <div className="space-y-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-64" /><Skeleton className="h-4 w-40" /></div>
            ) : !xReportData ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Appuyez sur Actualiser pour charger le rapport X</p>
              </div>
            ) : xReportData.error ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-red-500">{xReportData.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>Shift #{xReportData.shiftId}</span>
                  {xReportData.shiftUser && <span>— {xReportData.shiftUser}</span>}
                  <span>— {xReportData.shiftOpen ? 'En cours' : 'Fermé'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <p className="text-xs text-muted-foreground">Ventes</p>
                    <p className="text-xl font-bold">{xReportData.totalSales || 0}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <p className="text-xs text-muted-foreground">Chiffre d'affaires</p>
                    <p className="text-xl font-bold text-green-600">{formatPrice(xReportData.totalRevenue || 0)}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <p className="text-xs text-muted-foreground">Espèces</p>
                    <p className="text-xl font-bold">{formatPrice(xReportData.cashTotal || 0)}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <p className="text-xs text-muted-foreground">Carte</p>
                    <p className="text-xl font-bold">{formatPrice(xReportData.cardTotal || 0)}</p>
                  </div>
                </div>
                {xReportData.byPaymentMethod && xReportData.byPaymentMethod.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Par mode de paiement</p>
                    <div className="space-y-1.5">
                      {xReportData.byPaymentMethod.map((pm, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                          <span>{pm.method || pm.payment_method || 'Autre'}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{pm.count || 0} vente(s)</span>
                            <span className="font-medium">{formatPrice(pm.total || pm.amount || 0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {xReportData.byCashier && xReportData.byCashier.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Par caissier</p>
                    <div className="space-y-1.5">
                      {xReportData.byCashier.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                          <span>{c.name || c.cashier_name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{c.salesCount || c.count || 0} vente(s)</span>
                            <span className="font-medium">{formatPrice(c.totalRevenue || c.total || 0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={loadXReport} disabled={xReportLoading}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${xReportLoading ? 'animate-spin' : ''}`} /> Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Z Report Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-amber-600" />
                Rapport Z — Fermeture de journée
              </CardTitle>
              <CardDescription>Clôture la journée, archive le rapport et ferme la caisse</CardDescription>
            </div>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => setZCloseDialogOpen(true)}>
              <Banknote className="h-4 w-4 mr-1.5" /> Clôturer la journée
            </Button>
          </CardHeader>
          <CardContent>
            {zReportLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : zReportHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Banknote className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Aucun rapport Z archivé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Ventes</TableHead>
                      <TableHead className="text-xs">CA Total</TableHead>
                      <TableHead className="text-xs">Espèces</TableHead>
                      <TableHead className="text-xs">Carte</TableHead>
                      <TableHead className="text-xs">Écart</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zReportHistory.map((zr) => (
                      <TableRow key={zr.id} className="cursor-pointer" onClick={() => { setSelectedZReport(zr); setZDetailOpen(true); }}>
                        <TableCell className="text-xs font-medium">#{zr.id}</TableCell>
                        <TableCell className="text-xs">{zr.period_end ? new Date(zr.period_end).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</TableCell>
                        <TableCell className="text-xs">{zr.total_sales || 0}</TableCell>
                        <TableCell className="text-xs font-medium">{formatPrice(zr.total_revenue || 0)}</TableCell>
                        <TableCell className="text-xs">{formatPrice(zr.cash_total || 0)}</TableCell>
                        <TableCell className="text-xs">{formatPrice(zr.card_total || 0)}</TableCell>
                        <TableCell className={`text-xs font-medium ${(zr.cash_difference || 0) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(zr.cash_difference || 0) === 0 ? '—' : formatPrice(zr.cash_difference)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setSelectedZReport(zr); setZDetailOpen(true); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Z Close Dialog */}
        <Dialog open={zCloseDialogOpen} onOpenChange={setZCloseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-amber-600" /> Clôturer la journée
              </DialogTitle>
              <DialogDescription>
                Cette action génère le rapport Z, archive les données et ferme la caisse. Êtes-vous sûr ?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                Le rapport Z récapitule toutes les ventes de la journée et ferme le shift en cours.
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Montant de fermeture (espèces réelles)</Label>
                <Input type="number" step="0.01" value={zCloseClosingAmount} onChange={(e) => setZCloseClosingAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setZCloseDialogOpen(false)}>Annuler</Button>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleZClose}>
                <Banknote className="h-4 w-4 mr-1.5" /> Confirmer la clôture
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Z Report Detail Dialog */}
        <Dialog open={zDetailOpen} onOpenChange={setZDetailOpen}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            {selectedZReport && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary" /> Rapport Z #{selectedZReport.id}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedZReport.period_end ? new Date(selectedZReport.period_end).toLocaleString('fr-FR') : ''}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Ventes totales', selectedZReport.total_sales || 0],
                      ['Chiffre d\'affaires', formatPrice(selectedZReport.total_revenue || 0)],
                      ['Sous-total HT', formatPrice(selectedZReport.subtotal || 0)],
                      ['TVA totale', formatPrice(selectedZReport.tax_total || 0)],
                      ['Réductions', formatPrice(selectedZReport.discount_total || 0)],
                      ['Espèces', formatPrice(selectedZReport.cash_total || 0)],
                      ['Carte', formatPrice(selectedZReport.card_total || 0)],
                      ['Mobile', formatPrice(selectedZReport.mobile_total || 0)],
                      ['Crédit', formatPrice(selectedZReport.credit_total || 0)],
                      ['Écart caisse', formatPrice(selectedZReport.cash_difference || 0)],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between text-sm py-1 border-b last:border-0">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setZDetailOpen(false)}>Fermer</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ═══════════════════ TRANSACTION DETAIL DIALOG ═══════════════════ */

  function TransactionDetailDialog() {
    if (!selectedTx) return null;
    const receiptNo = selectedTx.receiptNumber || `RCP-${String(selectedTx.id).padStart(6, '0')}`;

    return (
      <Dialog open={txDetailOpen} onOpenChange={setTxDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              {receiptNo}
            </DialogTitle>
            <DialogDescription>
              {selectedTx.date} {selectedTx.time && `à ${selectedTx.time}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* General info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Reçu', receiptNo],
                ['Date', selectedTx.date],
                selectedTx.time && ['Heure', selectedTx.time],
                ['Caissier', selectedTx.cashier || '—'],
                ['Client', selectedTx.customer || '—'],
                ['Paiement', selectedTx.paymentMethod || '—'],
                selectedTx.tableNumber && ['Table', `#${selectedTx.tableNumber}`],
              ].filter(Boolean).map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{val}</p>
                </div>
              ))}
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Produits commandés</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Produit</th>
                      <th className="text-center px-3 py-2 font-medium">Qté</th>
                      <th className="text-right px-3 py-2 font-medium">Prix</th>
                      <th className="text-right px-3 py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTx.items && selectedTx.items.length > 0 ? (
                      selectedTx.items.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 font-medium">{item.product_name || 'Produit'}</td>
                          <td className="text-center px-3 py-2">{item.quantity}</td>
                          <td className="text-right px-3 py-2">{formatPrice(item.price)}</td>
                          <td className="text-right px-3 py-2 font-medium">{formatPrice((item.price || 0) * (item.quantity || 0))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground text-xs">Détails non disponibles</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              {selectedTx.subtotal != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatPrice(selectedTx.subtotal)}</span>
                </div>
              )}
              {selectedTx.discount > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Réduction</span>
                  <span>-{formatPrice(selectedTx.discount)}</span>
                </div>
              )}
              {selectedTx.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TVA</span>
                  <span className="text-green-600">{formatPrice(selectedTx.tax)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold">Total TTC</span>
                <span className="font-bold text-lg" style={{ color: config.primaryColor }}>{formatPrice(selectedTx.total)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDetailOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  /* ═══════════════════ MAIN RENDER ═══════════════════ */

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold print:text-2xl">Rapports</h1>
          <p className="text-muted-foreground text-sm">
            Analysez les performances de votre activité
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={printView}>
            <Printer className="mr-1.5 h-4 w-4" />
            Imprimer
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBiExport(true)}>
            <Download className="mr-1.5 h-4 w-4" />
            Export BI
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refreshCurrent} title="Rafraîchir">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="print:hidden">
        <PeriodSelector />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="print:hidden">
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Tableau de Bord
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <Activity className="h-4 w-4 mr-1.5" />
            Analyses
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <Receipt className="h-4 w-4 mr-1.5" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="cash_shifts">
            <Banknote className="h-4 w-4 mr-1.5" />
            Caisses
          </TabsTrigger>
          <TabsTrigger value="xz_reports">
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            Rapports X/Z
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsTab />
        </TabsContent>

        <TabsContent value="cash_shifts">
          <CashShiftsTab />
        </TabsContent>

        <TabsContent value="xz_reports">
          <XZReportsTab />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <TransactionDetailDialog />
      <BiExportModal open={showBiExport} onOpenChange={setShowBiExport} />
    </div>
  );
}
