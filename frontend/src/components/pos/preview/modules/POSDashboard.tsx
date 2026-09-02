import { useState, useEffect } from 'react';
import {
  ShoppingCart, Users, Euro, TrendingUp, AlertTriangle,
  LayoutDashboard, Target, RefreshCw, Receipt, Box,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DEMO_STATS = {
  todayRevenue: 1247.50,
  todayOrders: 23,
  averageTicket: 54.24,
  todayProfit: 312.80,
  todayCustomers: 19,
  lowStockCount: 8,
  totalProducts: 156,
  totalStockValue: 18420.00,
  outOfStock: 3,
};

const DEMO_CHART: Record<string, { period: string; revenue: number }[]> = {
  today: [
    { period: '09:00', revenue: 120 }, { period: '10:00', revenue: 240 },
    { period: '11:00', revenue: 310 }, { period: '12:00', revenue: 420 },
    { period: '13:00', revenue: 380 }, { period: '14:00', revenue: 290 },
    { period: '15:00', revenue: 350 }, { period: '16:00', revenue: 410 },
  ],
  week: [
    { period: 'Lun', revenue: 820 }, { period: 'Mar', revenue: 950 },
    { period: 'Mer', revenue: 780 }, { period: 'Jeu', revenue: 1120 },
    { period: 'Ven', revenue: 1380 }, { period: 'Sam', revenue: 1540 },
    { period: 'Dim', revenue: 640 },
  ],
  month: [
    { period: 'Jan', revenue: 1200 }, { period: 'Fév', revenue: 1800 },
    { period: 'Mar', revenue: 1400 }, { period: 'Avr', revenue: 2200 },
    { period: 'Mai', revenue: 1900 }, { period: 'Juin', revenue: 2600 },
  ],
  year: [
    { period: 'Jan', revenue: 8200 }, { period: 'Fév', revenue: 9100 },
    { period: 'Mar', revenue: 10400 }, { period: 'Avr', revenue: 11800 },
    { period: 'Mai', revenue: 12700 }, { period: 'Juin', revenue: 14200 },
  ],
};

const DEMO_TRANSACTIONS = [
  { id: 1, total: 45.80, items: 3, time: '14:32', payment: 'carte' },
  { id: 2, total: 23.50, items: 1, time: '14:15', payment: 'espèces' },
  { id: 3, total: 67.20, items: 5, time: '13:58', payment: 'carte' },
  { id: 4, total: 12.90, items: 2, time: '13:45', payment: 'espèces' },
  { id: 5, total: 89.30, items: 4, time: '13:22', payment: 'carte' },
];

const DEMO_BEST_SELLERS = [
  { name: 'Café Arabica 250g', total_sold: 42, total_revenue: 336.00 },
  { name: 'Baguette Tradition', total_sold: 38, total_revenue: 38.00 },
  { name: "Jus d'orange frais", total_sold: 31, total_revenue: 93.00 },
  { name: 'Croissant Beurre', total_sold: 27, total_revenue: 40.50 },
  { name: 'Eau minérale 1.5L', total_sold: 24, total_revenue: 24.00 },
];

// Ported from admin/src/components/pos/preview/modules/POSDashboard.jsx:
// compact dashboard filling the viewport — header, 6 KPIs, then a 2/3-1/3
// grid whose columns stretch to the available height (chart + business
// health absorb the space).
export const POSDashboard = ({ config, modules }: { config: any; modules?: any[] }) => {
  const [chartPeriod, setChartPeriod] = useState('month');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCurrency = (amount: number) => {
    const currency = config.currency || 'DT';
    const position = config.currencyPosition || 'after';
    const val = parseFloat(String(amount)) || 0;
    return position === 'before' ? `${currency}${val.toFixed(2)}` : `${val.toFixed(2)} ${currency}`;
  };

  const getPaymentLabel = (method: string) => {
    const m = method.toLowerCase();
    if (m === 'cash' || m === 'espèces' || m === 'especes') return 'Espèces';
    if (m === 'card' || m === 'carte') return 'Carte';
    return method;
  };

  const getPaymentColor = (method: string) => {
    const m = method.toLowerCase();
    if (m === 'cash' || m === 'espèces' || m === 'especes') return 'bg-green-100 text-green-700';
    if (m === 'card' || m === 'carte') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  const textColor = config.textColor || '#1f2937';
  const mutedColor = config.textMutedColor || '#6b7280';
  const borderColor = config.cardBorderColor || '#e5e7eb';
  const primaryColor = config.primaryColor || '#3b82f6';

  const KPIS = [
    { title: 'Revenus du jour', value: formatCurrency(DEMO_STATS.todayRevenue), icon: Euro, color: '#22c55e', bg: '#dcfce7' },
    { title: 'Commandes', value: DEMO_STATS.todayOrders.toString(), icon: ShoppingCart, color: '#3b82f6', bg: '#dbeafe' },
    { title: 'Ticket moyen', value: formatCurrency(DEMO_STATS.averageTicket), icon: Receipt, color: '#8b5cf6', bg: '#ede9fe' },
    { title: 'Profit du jour', value: formatCurrency(DEMO_STATS.todayProfit), icon: TrendingUp, color: '#14b8a6', bg: '#ccfbf1' },
    { title: 'Clients', value: DEMO_STATS.todayCustomers.toString(), icon: Users, color: '#f59e0b', bg: '#fef3c7' },
    { title: 'Stock faible', value: DEMO_STATS.lowStockCount.toString(), icon: AlertTriangle, color: DEMO_STATS.lowStockCount > 0 ? '#ef4444' : '#6b7280', bg: DEMO_STATS.lowStockCount > 0 ? '#fee2e2' : '#f3f4f6' },
  ];

  const HEALTH_ITEMS = [
    { label: 'Revenus du jour', value: formatCurrency(DEMO_STATS.todayRevenue), status: 'good', icon: Euro },
    { label: 'Stock faible', value: `${DEMO_STATS.lowStockCount} article(s)`, status: 'warn', icon: AlertTriangle },
    { label: 'Produits en rupture', value: `${DEMO_STATS.outOfStock} article(s)`, status: 'bad', icon: Box },
    { label: 'Ticket moyen', value: formatCurrency(DEMO_STATS.averageTicket), status: 'good', icon: Target },
  ];

  const PERIODS = [
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week', label: 'Semaine' },
    { key: 'month', label: 'Mois' },
    { key: 'year', label: 'Année' },
  ];

  return (
    <div className="h-full flex flex-col gap-3">
      {/* 1. HEADER — compact */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: primaryColor + '20' }}>
            <LayoutDashboard className="h-4 w-4" style={{ color: primaryColor }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate" style={{ color: textColor }}>
              Bonjour ! 👋
            </h1>
            <p className="text-xs truncate" style={{ color: mutedColor }}>
              {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-base font-bold tabular-nums leading-tight" style={{ color: textColor }}>
              {currentTime.toLocaleTimeString('fr-FR')}
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Caisse ouverte
            </span>
          </div>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor }}
            title="Rafraîchir"
          >
            <RefreshCw className="h-3.5 w-3.5" style={{ color: mutedColor }} />
          </button>
        </div>
      </div>

      {/* 2. KPI CARDS — 6 en une rangée */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 flex-shrink-0">
        {KPIS.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-xl border p-3 transition-shadow hover:shadow-md"
              style={{ borderColor, backgroundColor: 'white' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: kpi.bg }}>
                <Icon className="h-4 w-4" style={{ color: kpi.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium truncate" style={{ color: mutedColor }}>{kpi.title}</p>
                <p className="text-lg font-bold tabular-nums leading-tight truncate" style={{ color: textColor }}>{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. MAIN CONTENT — grille 2/3-1/3 qui remplit la hauteur */}
      <div className="grid grid-cols-1 lg:grid-cols-3 grid-rows-1 gap-3 flex-1 min-h-0">
        {/* LEFT COLUMN (~65%) */}
        <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">
          {/* REVENUE CHART — s'étire pour absorber l'espace vertical */}
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border bg-white p-4" style={{ borderColor }}>
            <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold" style={{ color: textColor }}>Revenus</h3>
                <p className="text-xs" style={{ color: mutedColor }}>Évolution du chiffre d'affaires</p>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
                {PERIODS.map((period) => (
                  <button
                    key={period.key}
                    onClick={() => setChartPeriod(period.key)}
                    className="px-2.5 py-0.5 text-[11px] font-medium rounded-md transition-all whitespace-nowrap"
                    style={{
                      backgroundColor: chartPeriod === period.key ? 'white' : 'transparent',
                      color: chartPeriod === period.key ? primaryColor : mutedColor,
                      boxShadow: chartPeriod === period.key ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DEMO_CHART[chartPeriod]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} width={36} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenus']} />
                  <Bar dataKey="revenue" fill={primaryColor} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* BEST SELLERS — compact */}
          <div className="flex-shrink-0 rounded-xl border bg-white p-4" style={{ borderColor }}>
            <h3 className="text-sm font-semibold mb-2.5" style={{ color: textColor }}>Meilleures ventes</h3>
            <div className="space-y-1.5">
              {DEMO_BEST_SELLERS.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 p-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: textColor }}>{item.name}</p>
                    <p className="text-[11px]" style={{ color: mutedColor }}>{item.total_sold} vendu(s)</p>
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums flex-shrink-0" style={{ color: textColor }}>
                    {formatCurrency(item.total_revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT TRANSACTIONS — compact */}
          <div className="flex-shrink-0 rounded-xl border bg-white p-4" style={{ borderColor }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: textColor }}>Transactions récentes</h3>
                <p className="text-xs" style={{ color: mutedColor }}>Les 5 dernières ventes</p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#f3f4f6', color: mutedColor }}>
                {DEMO_TRANSACTIONS.length} vente(s)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor }}>
                    <th className="text-left text-[11px] font-medium py-1.5 px-2" style={{ color: mutedColor }}>#</th>
                    <th className="text-left text-[11px] font-medium py-1.5 px-2" style={{ color: mutedColor }}>Heure</th>
                    <th className="text-left text-[11px] font-medium py-1.5 px-2" style={{ color: mutedColor }}>Articles</th>
                    <th className="text-left text-[11px] font-medium py-1.5 px-2" style={{ color: mutedColor }}>Paiement</th>
                    <th className="text-right text-[11px] font-medium py-1.5 px-2" style={{ color: mutedColor }}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_TRANSACTIONS.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors" style={{ borderColor }}>
                      <td className="py-1.5 px-2 text-xs font-medium" style={{ color: textColor }}>#{tx.id}</td>
                      <td className="py-1.5 px-2 text-xs" style={{ color: mutedColor }}>{tx.time}</td>
                      <td className="py-1.5 px-2 text-xs" style={{ color: textColor }}>{tx.items} article(s)</td>
                      <td className="py-1.5 px-2">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getPaymentColor(tx.payment)}`}>
                          {getPaymentLabel(tx.payment)}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-xs font-semibold text-right tabular-nums" style={{ color: textColor }}>
                        {formatCurrency(tx.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (~35%) */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* BUSINESS HEALTH — s'étire avec l'espace vertical */}
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border bg-white p-4" style={{ borderColor }}>
            <h3 className="text-sm font-semibold mb-3 flex-shrink-0" style={{ color: textColor }}>Santé du business</h3>
            <div className="space-y-2">
              {HEALTH_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                const statusColors: Record<string, string> = { good: '#22c55e', warn: '#f59e0b', bad: '#ef4444', neutral: '#6b7280' };
                return (
                  <div key={idx} className="flex items-center gap-2.5 p-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: statusColors[item.status] }} />
                    <span className="flex-1 text-xs truncate" style={{ color: textColor }}>{item.label}</span>
                    <span className="text-xs font-medium tabular-nums flex-shrink-0" style={{ color: textColor }}>{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* INVENTORY — compact */}
          <div className="flex-shrink-0 rounded-xl border bg-white p-4" style={{ borderColor }}>
            <h3 className="text-sm font-semibold mb-2.5" style={{ color: textColor }}>Inventaire</h3>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                <span className="text-xs" style={{ color: mutedColor }}>Total produits</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: textColor }}>{DEMO_STATS.totalProducts}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                <span className="text-xs" style={{ color: mutedColor }}>Valeur stock</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: textColor }}>{formatCurrency(DEMO_STATS.totalStockValue)}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                <span className="text-xs" style={{ color: mutedColor }}>Stock faible</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: DEMO_STATS.lowStockCount > 0 ? '#f59e0b' : textColor }}>
                  {DEMO_STATS.lowStockCount}
                </span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                <span className="text-xs" style={{ color: mutedColor }}>Rupture</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: DEMO_STATS.outOfStock > 0 ? '#ef4444' : textColor }}>
                  {DEMO_STATS.outOfStock}
                </span>
              </div>
            </div>
          </div>

          {/* CASH DRAWER — compact */}
          <div className="flex-shrink-0 rounded-xl border bg-white p-4" style={{ borderColor }}>
            <h3 className="text-sm font-semibold mb-2.5" style={{ color: textColor }}>Caisse</h3>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-green-50">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700">Caisse ouverte</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                <span className="text-xs" style={{ color: mutedColor }}>Départ</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: textColor }}>{formatCurrency(150)}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                <span className="text-xs" style={{ color: mutedColor }}>Ventes du jour</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: textColor }}>{formatCurrency(DEMO_STATS.todayRevenue)}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                <span className="text-xs" style={{ color: mutedColor }}>Nombre de ventes</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: textColor }}>{DEMO_STATS.todayOrders}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSDashboard;
