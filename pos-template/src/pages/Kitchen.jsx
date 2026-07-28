import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ChefHat, Clock, Play, Check, AlertTriangle, Printer, Eye, X, Maximize2, Minimize2,
  Search, Filter, Volume2, VolumeX, RotateCcw, ArrowRight, Users, Timer, TrendingUp,
  ChevronDown, Trash2, ArrowUpCircle, CheckCircle2, CircleDot, Ban, Loader2,
  MapPin, Hash, Utensils, History, BarChart3, Download, ChevronLeft, ChevronRight,
  Calendar, SlidersHorizontal, ClipboardCheck, GripVertical, Square, CheckSquare,
  User, Package, Zap, Activity, PackageCheck, Send, Plus, Settings
} from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { useToast } from '../hooks/use-toast';
import { getCurrencySymbol } from '../utils/currency';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../components/ui/sheet';

const VALID_STATUSES = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];

const STATUS_CONFIG = {
  pending:   { label: 'En attente', color: 'bg-amber-500', textColor: 'text-amber-600', border: 'border-amber-200', ring: 'ring-amber-400/30', next: 'preparing', nextLabel: 'Commencer', nextIcon: Play },
  preparing: { label: 'En cours',   color: 'bg-blue-500',  textColor: 'text-blue-600',  border: 'border-blue-200',  ring: 'ring-blue-400/30',  next: 'ready',     nextLabel: 'Prêt',      nextIcon: Check },
  ready:     { label: 'Prêt',       color: 'bg-emerald-500', textColor: 'text-emerald-600', border: 'border-emerald-200', ring: 'ring-emerald-400/30', next: 'served',    nextLabel: 'Servi',     nextIcon: Check },
  served:    { label: 'Servi',      color: 'bg-green-500',  textColor: 'text-green-600',  border: 'border-green-200',  ring: 'ring-green-400/30',  next: 'completed', nextLabel: 'Terminé',  nextIcon: Check },
  completed: { label: 'Terminé',    color: 'bg-gray-400',   textColor: 'text-gray-600',   border: 'border-gray-200',   ring: 'ring-gray-400/30',   next: null, nextLabel: null, nextIcon: null },
  cancelled: { label: 'Annulé',     color: 'bg-red-500',    textColor: 'text-red-600',    border: 'border-red-200',    ring: 'ring-red-400/30',    next: null, nextLabel: null, nextIcon: null },
};

const PRIORITY_MAP = {
  low:    { label: 'Faible',  icon: CircleDot, color: 'text-gray-500',    bg: 'bg-gray-100',  border: 'border-gray-300' },
  normal: { label: 'Normal',  icon: ArrowRight, color: 'text-blue-600',   bg: 'bg-blue-100',  border: 'border-blue-300' },
  high:   { label: 'Haute',   icon: ArrowUpCircle, color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-300' },
  urgent: { label: 'Urgente', icon: AlertTriangle, color: 'text-red-600',  bg: 'bg-red-100',   border: 'border-red-400' },
};

const DEPT_ICONS = {
  cuisine: '🍳', bar: '🍸', cafeteria: '☕', pâtisserie: '🍰',
  patisserie: '🍰', boulangerie: '🍞', grill: '🔥', pizza: '🍕', salades: '🥗',
};

const KITCHEN_STATUS_MAP = {
  order_received: { label: 'En attente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  preparing:      { label: 'En cours',   color: 'bg-blue-100 text-blue-700 border-blue-200',   icon: Play },
  ready:          { label: 'Prêt',       color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Check },
  served:         { label: 'Servi',      color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  completed:      { label: 'Terminé',    color: 'bg-gray-100 text-gray-600 border-gray-200',    icon: Check },
  cancelled:      { label: 'Annulé',     color: 'bg-red-100 text-red-600 border-red-200',       icon: Ban },
};

const HISTORY_LIMIT = 20;

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatElapsed(created_at, started_at) {
  if (!created_at) return { minutes: 0, seconds: 0, totalSeconds: 0, text: '—', color: 'text-muted-foreground', level: 0 };
  const ref = started_at ? new Date(started_at).getTime() : new Date(created_at).getTime();
  const totalSeconds = Math.max(0, Math.floor((Date.now() - ref) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  let color, level;
  if (minutes < 5) { color = 'text-emerald-600'; level = 0; }
  else if (minutes < 10) { color = 'text-amber-500'; level = 1; }
  else if (minutes < 15) { color = 'text-orange-500'; level = 2; }
  else if (minutes < 20) { color = 'text-red-500'; level = 3; }
  else { color = 'text-red-600 animate-pulse'; level = 4; }
  let text;
  if (minutes < 1) text = `${seconds}s`;
  else if (minutes < 60) text = seconds > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${minutes} min`;
  else { const h = Math.floor(minutes / 60); const m = minutes % 60; text = m > 0 ? `${h}h${m}min` : `${h}h`; }
  return { minutes, seconds, totalSeconds, text, color, level };
}

function getRemainingTime(elapsedMinutes, estimatedMinutes) {
  if (!estimatedMinutes || estimatedMinutes <= 0) return null;
  const remaining = estimatedMinutes - elapsedMinutes;
  if (remaining <= 0) return { text: `+${Math.abs(remaining)}min`, overdue: true, abs: Math.abs(remaining) };
  return { text: `${remaining}min`, overdue: false, abs: remaining };
}

function getDeptIcon(dept) {
  if (!dept) return '📋';
  const lower = dept.toLowerCase();
  return DEPT_ICONS[lower] || (lower.includes('bar') ? '🍸' : lower.includes('grill') ? '🔥' : '📋');
}

function exportToCsv(filename, headers, rows) {
  const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function SkeletonKitchen() {
  return (
    <div className="space-y-6 p-6">
      <div className="animate-pulse space-y-2"><div className="h-8 w-48 bg-muted rounded" /><div className="h-4 w-64 bg-muted rounded" /></div>
      <div className="grid grid-cols-5 gap-3">{[1,2,3,4,5].map(i => <div key={i} className="animate-pulse h-16 bg-muted rounded-xl" />)}</div>
      <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="animate-pulse h-64 bg-muted rounded-xl" />)}</div>
    </div>
  );
}

const OrderCard = React.memo(function OrderCard({ order, onStart, onReady, onServe, onComplete, onView, onPrint, onCancel, overdueThreshold, selected, onSelect, onDragStart }) {
  const [now, setNow] = useState(Date.now());
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const pri = PRIORITY_MAP[order.priority] || PRIORITY_MAP.normal;
  const PriIcon = pri.icon;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = useMemo(() => formatElapsed(order.created_at, order.started_at), [order.created_at, order.started_at, now]);
  const remaining = useMemo(() => getRemainingTime(elapsed.minutes, order.estimated_minutes), [elapsed.minutes, order.estimated_minutes]);
  const isOverdue = (order.status === 'pending' || order.status === 'preparing') && elapsed.minutes >= overdueThreshold;
  const items = Array.isArray(order.items) ? order.items : [];
  const showItems = items.slice(0, 6);
  const remainingItems = items.length - 6;
  const orderTime = order.created_at ? new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('application/kitchen-order', JSON.stringify({ id: order.id, status: order.status })); e.dataTransfer.effectAllowed = 'move'; onDragStart?.(order); }}
      className={`group relative p-3 rounded-xl border-l-4 ${pri.border} bg-card shadow-sm hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing ${
        isOverdue ? 'ring-2 ring-red-400/70 shadow-red-100' : 'hover:shadow-md'
      } ${cfg.border} ${selected ? 'ring-2 ring-primary/50 bg-primary/5' : ''} touch-manipulation select-none`}
      role="article"
      aria-label={`Commande ${order.sale_id ? `#${order.sale_id}` : `#${order.id}`}, Table ${order.table_number || '—'}, ${cfg.label}, ${pri.label}`}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView(order); }}}
    >
      {order.priority === 'urgent' && (
        <div className="absolute top-2 right-2">
          <span className="flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" /></span>
        </div>
      )}
      {isOverdue && <div className="absolute inset-0 rounded-xl border-2 border-red-400/40 animate-pulse pointer-events-none" />}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onSelect?.(order.id); }}
            className="w-5 h-5 rounded border flex items-center justify-center shrink-0 hover:bg-muted transition-colors"
            aria-label={selected ? 'Désélectionner' : 'Sélectionner'}>
            {selected ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5 text-muted-foreground/40" />}
          </button>
          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-lg">
            <Utensils className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-extrabold text-base">{order.table_number || '—'}</span>
          </div>
          <span className="text-muted-foreground/30">·</span>
          <div className="flex items-center gap-1">
            <Hash className="h-3 w-3 text-muted-foreground" />
            <span className="font-bold text-sm">{order.sale_id || `#${order.id}`}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge className={`${cfg.color} text-white text-[10px] px-1.5 py-0 shadow-sm`}>{cfg.label}</Badge>
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${pri.color}`}>
            <PriIcon className="h-2.5 w-2.5" /> {pri.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground flex-wrap">
        {order.server_name && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {order.server_name}</span>}
        {order.customer_name && <span className="flex items-center gap-1 font-medium text-foreground">{order.customer_name}</span>}
        {order.department && <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">{getDeptIcon(order.department)} {order.department}</Badge>}
      </div>

      <div className="space-y-0.5 mb-2">
        {showItems.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm">
            <span className="font-bold text-foreground shrink-0 w-7 text-right">{item.quantity}x</span>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-foreground text-[13px]">{item.name || item.product_name}</span>
              {item.special_instructions && <p className="text-[10px] text-orange-600 italic leading-tight mt-0.5">→ {item.special_instructions}</p>}
            </div>
          </div>
        ))}
        {remainingItems > 0 && <p className="text-xs text-muted-foreground pl-9">+ {remainingItems} autre{remainingItems > 1 ? 's' : ''}</p>}
      </div>

      {order.notes && (
        <div className="mb-2 px-2 py-1 bg-amber-50 border border-amber-200/80 rounded-lg text-[11px] text-amber-800 truncate">
          <span className="font-semibold">📝</span> {order.notes}
        </div>
      )}

      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">{orderTime}</span>
          </div>
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${elapsed.level >= 3 ? 'bg-red-50' : elapsed.level >= 2 ? 'bg-orange-50' : 'bg-muted/30'}`}>
            <Timer className={`h-3 w-3 ${elapsed.color}`} />
            <span className={`text-[11px] font-bold tabular-nums ${elapsed.color}`}>{elapsed.text}</span>
          </div>
          {isOverdue && <Badge variant="destructive" className="text-[9px] px-1 py-0 animate-pulse">Retard</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {order.estimated_minutes > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span>⏱ ~{order.estimated_minutes}min</span>
            </div>
          )}
          {remaining && (
            <div className={`text-[11px] font-bold ${remaining.overdue ? 'text-red-600' : 'text-emerald-600'}`}>
              {remaining.overdue ? `-retard ${remaining.text}` : remaining.text}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1.5">
        {cfg.next && (
          <Button size="sm" onClick={() => {
            if (cfg.next === 'ready') onReady(order.id);
            else if (cfg.next === 'served') onServe(order.id);
            else if (cfg.next === 'completed') onComplete(order.id);
            else onStart(order.id);
          }}
            className={`flex-1 h-8 text-xs font-semibold shadow-sm ${
              cfg.next === 'preparing' ? 'bg-amber-500 hover:bg-amber-600 text-white' :
              cfg.next === 'ready' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
              cfg.next === 'served' ? 'bg-green-600 hover:bg-green-700 text-white' :
              cfg.next === 'completed' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
            }`}
            aria-label={cfg.nextLabel}>
            <cfg.nextIcon className="h-3.5 w-3.5 mr-1" /> {cfg.nextLabel}
          </Button>
        )}
        {order.status !== 'completed' && order.status !== 'cancelled' && (
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => onCancel(order)} aria-label="Annuler">
            <Ban className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 hover:bg-muted" onClick={() => onView(order)} aria-label="Détails">
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 hover:bg-muted" onClick={() => onPrint(order)} aria-label="Imprimer">
          <Printer className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});

const StatsBar = React.memo(function StatsBar({ statsBar, stats, onNavigate }) {
  return (
    <div className="shrink-0 border-b bg-muted/20 px-6 py-2.5">
      <div className="flex items-center gap-3 overflow-x-auto">
        {[
          { key: 'pending', label: 'En attente', value: statsBar.pending, color: 'text-amber-600', icon: Clock, filter: 'pending', bg: 'bg-amber-50' },
          { key: 'preparing', label: 'En cours', value: statsBar.preparing, color: 'text-blue-600', icon: Play, filter: 'preparing', bg: 'bg-blue-50' },
          { key: 'ready', label: 'Prêtes', value: statsBar.ready, color: 'text-emerald-600', icon: Check, filter: 'ready', bg: 'bg-emerald-50' },
          { key: 'served', label: 'Servies', value: statsBar.served, color: 'text-green-600', icon: CheckCircle2, bg: 'bg-green-50' },
          { key: 'completed', label: 'Terminées', value: statsBar.completed, color: 'text-gray-500', icon: CheckCircle2, bg: 'bg-gray-50' },
          { key: 'cancelled', label: 'Annulées', value: statsBar.cancelled, color: 'text-red-500', icon: Ban, bg: 'bg-red-50' },
        ].map(s => (
          <button key={s.key} onClick={() => s.filter && onNavigate?.(s.filter)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all duration-200 hover:shadow-sm ${s.filter ? 'hover:border-primary/30 cursor-pointer' : 'cursor-default'} ${s.bg}`}>
            <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
          </button>
        ))}
        <Separator orientation="vertical" className="h-8 mx-1" />
        {stats.active_queue > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
            <span className="text-xs font-medium text-muted-foreground">File</span>
            <span className="text-sm font-bold text-primary">{stats.active_queue}</span>
          </div>
        )}
        {stats.avg_prep_time > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200">
            <Timer className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground">Moy.</span>
            <span className="text-sm font-bold text-blue-600">{stats.avg_prep_time}min</span>
          </div>
        )}
        {stats.overdue_count > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 animate-pulse" />
            <span className="text-xs font-semibold text-red-600">{stats.overdue_count} retard</span>
          </div>
        )}
        {stats.sla_compliance != null && (
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border ${stats.sla_compliance >= 80 ? 'bg-emerald-50 border-emerald-200' : stats.sla_compliance >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <TrendingUp className={`h-3.5 w-3.5 ${stats.sla_compliance >= 80 ? 'text-emerald-600' : stats.sla_compliance >= 50 ? 'text-amber-600' : 'text-red-600'}`} />
            <span className="text-xs font-medium text-muted-foreground">SLA</span>
            <span className={`text-sm font-bold ${stats.sla_compliance >= 80 ? 'text-emerald-600' : stats.sla_compliance >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{stats.sla_compliance}%</span>
          </div>
        )}
        {stats.performance_pct > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 border border-violet-200">
            <BarChart3 className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-xs font-medium text-muted-foreground">Perf.</span>
            <span className="text-sm font-bold text-violet-600">{stats.performance_pct}%</span>
          </div>
        )}
      </div>
    </div>
  );
});

const DepartmentTabs = React.memo(function DepartmentTabs({ departments, orders, departmentStats, slaSummary, activeDept, onSelect, onAddDept }) {
  const deptHeatMap = useMemo(() => {
    const map = {};
    for (const ds of (departmentStats || [])) map[(ds.department || '').toLowerCase()] = ds;
    return map;
  }, [departmentStats]);
  const slaMap = useMemo(() => {
    const m = {};
    for (const s of (slaSummary || [])) m[(s.department || '').toLowerCase()] = s;
    return m;
  }, [slaSummary]);

  return (
    <div className="shrink-0 border-b bg-muted/10 px-6 py-2">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <button onClick={() => onSelect('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shrink-0 ${activeDept === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
          Tous
        </button>
        {departments.filter(d => d.is_active).map(dept => {
          const deptOrderCount = orders.filter(o => (o.department || 'kitchen').toLowerCase() === dept.name.toLowerCase()).length;
          const heat = deptHeatMap[dept.name.toLowerCase()];
          const sla = slaMap[dept.name.toLowerCase()];
          const busyColor = heat?.busy_level === 'overloaded' ? 'bg-red-500' : heat?.busy_level === 'very_busy' ? 'bg-orange-400' : heat?.busy_level === 'busy' ? 'bg-amber-400' : 'bg-emerald-400';
          return (
            <button key={dept.id} onClick={() => onSelect(dept.name.toLowerCase())}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shrink-0 flex items-center gap-1.5 ${activeDept === dept.name.toLowerCase() ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              {dept.icon && <span>{dept.icon}</span>}
              {dept.name}
              {deptOrderCount > 0 && <span className={`text-[10px] px-1.5 rounded-full font-bold ${activeDept === dept.name.toLowerCase() ? 'bg-white/20' : 'bg-muted'}`}>{deptOrderCount}</span>}
              {heat && <span className={`w-2 h-2 rounded-full ${busyColor} shrink-0`} title={`${heat.busy_level} — ${heat.current_load} en cours`} />}
              {sla && sla.sla_pct < 100 && <span className={`text-[10px] font-bold ${sla.sla_pct >= 80 ? 'text-emerald-600' : sla.sla_pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{sla.sla_pct}%</span>}
            </button>
          );
        })}
        <button onClick={onAddDept}
          className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-dashed border-muted-foreground/30 hover:border-primary/50"
          title="Ajouter un département">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

function FilterPanel({ show, departments, filterPriority, setFilterPriority, filterServer, setFilterServer, filterOverdueOnly, setFilterOverdueOnly, onReset }) {
  if (!show) return null;
  return (
    <div className="shrink-0 border-b bg-muted/5 px-6 py-3 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Priorité</Label>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="low">Faible</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">Haute</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Serveur</Label>
          <Input className="h-8 w-36 text-xs" placeholder="Nom du serveur..." value={filterServer} onChange={e => setFilterServer(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={filterOverdueOnly} onCheckedChange={setFilterOverdueOnly} className="scale-75" />
          <Label className="text-xs text-muted-foreground cursor-pointer" onClick={() => setFilterOverdueOnly(p => !p)}>
            <AlertTriangle className="h-3 w-3 inline mr-1 text-red-500" /> En retard uniquement
          </Label>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={onReset}>
          <X className="h-3 w-3 mr-1" /> Réinitialiser
        </Button>
      </div>
    </div>
  );
}

const KanbanColumn = React.memo(function KanbanColumn({ colKey, orders, onStart, onReady, onServe, onComplete, onView, onPrint, onCancel, overdueThreshold, selectedIds, onSelect, onDrop, dragOverCol, setDragOverCol }) {
  const cfg = STATUS_CONFIG[colKey];
  const isDragOver = dragOverCol === colKey;
  return (
    <div className="flex flex-col min-h-0">
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${cfg.color} text-white transition-colors`}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{cfg.label}</span>
          <Badge className="bg-white/25 text-white text-xs font-bold">{orders.length}</Badge>
        </div>
      </div>
      <ScrollArea
        className={`flex-1 rounded-b-xl border border-t-0 transition-colors duration-200 ${isDragOver ? 'bg-primary/5 border-primary/30 ring-2 ring-primary/20' : 'bg-muted/10'}`}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(colKey); }}
        onDragLeave={() => setDragOverCol(null)}
        onDrop={(e) => { e.preventDefault(); setDragOverCol(null); try { const data = JSON.parse(e.dataTransfer.getData('application/kitchen-order')); if (data?.id) onDrop(data.id, colKey); } catch {} }}
      >
        <div className="p-2 space-y-2">
          {orders.length === 0 ? (
            <div className={`text-center py-10 text-xs text-muted-foreground/60 ${isDragOver ? 'text-primary font-medium' : ''}`}>
              {isDragOver ? 'Déposez ici' : 'Aucune commande'}
            </div>
          ) : (
            orders.map(order => (
              <OrderCard key={order.id} order={order} overdueThreshold={overdueThreshold}
                onStart={onStart} onReady={onReady} onServe={onServe} onComplete={onComplete}
                onView={onView} onPrint={onPrint} onCancel={onCancel}
                selected={selectedIds?.has(order.id)} onSelect={onSelect} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

function OrderDetailsSheet({ order, open, onClose, onStatusChange, onCancel, onPrint, config }) {
  if (!order) return null;
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const pri = PRIORITY_MAP[order.priority] || PRIORITY_MAP.normal;
  const elapsed = formatElapsed(order.created_at, order.started_at);
  const remaining = getRemainingTime(elapsed.minutes, order.estimated_minutes);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[420px] sm:w-[480px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Commande {order.sale_id ? `#${order.sale_id}` : `#${order.id}`}
          </SheetTitle>
          <SheetDescription>Table {order.table_number || '—'} · {cfg.label}</SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {[
            { label: 'Commande', value: `#${order.sale_id || order.id}` },
            { label: 'Table', value: order.table_number || '—' },
            { label: 'Priorité', value: pri.label, className: pri.color },
            { label: 'Département', value: `${getDeptIcon(order.department)} ${order.department || 'kitchen'}` },
            { label: 'Créée le', value: order.created_at ? new Date(order.created_at).toLocaleString('fr-FR') : '—' },
            { label: 'Temps écoulé', value: elapsed.text, className: elapsed.color },
            order.server_name && { label: 'Serveur', value: order.server_name },
            order.customer_name && { label: 'Client', value: order.customer_name },
            order.estimated_minutes && { label: 'Prépar. estimée', value: `~${order.estimated_minutes} min` },
            order.total > 0 && { label: 'Total', value: `${Number(order.total).toFixed(2)} ${getCurrencySymbol(config?.theme?.currency || 'TND')}` },
          ].filter(Boolean).map((item, i) => (
            <div key={i} className="p-3 rounded-xl border bg-card/50">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${item.className || ''}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div>
          <h4 className="font-medium mb-2 text-sm">Articles ({(order.items || []).length})</h4>
          <div className="space-y-1.5">
            {(order.items || []).map((item, idx) => (
              <div key={idx} className="flex items-start justify-between p-2.5 rounded-lg border bg-muted/30">
                <div>
                  <span className="font-medium text-sm">{item.quantity}x {item.name || item.product_name}</span>
                  {item.special_instructions && <p className="text-xs text-orange-600 italic mt-0.5">{item.special_instructions}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {order.notes && (
          <>
            <Separator className="my-4" />
            <div>
              <h4 className="font-medium mb-2 text-sm">Notes</h4>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">{order.notes}</div>
            </div>
          </>
        )}

        {order.cancel_reason && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <strong>Raison d'annulation:</strong> {order.cancel_reason}
          </div>
        )}

        <Separator className="my-4" />

        <div className="flex flex-wrap gap-2">
          {cfg.next && (
            <Button onClick={() => { onStatusChange(order.id, cfg.next); onClose(); }}
              className={`flex-1 ${cfg.next === 'ready' ? 'bg-blue-600 hover:bg-blue-700' : cfg.next === 'served' ? 'bg-green-600 hover:bg-green-700' : cfg.next === 'completed' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
              {cfg.nextIcon && <cfg.nextIcon className="h-4 w-4 mr-1" />} {cfg.nextLabel}
            </Button>
          )}
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <Button variant="outline" onClick={() => onCancel(order)} className="text-destructive border-destructive/30">
              <Ban className="h-4 w-4 mr-1" /> Annuler
            </Button>
          )}
          <Button variant="outline" onClick={() => onPrint(order)}>
            <Printer className="h-4 w-4 mr-1" /> Imprimer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AnalyticsPanel({ departmentStats, slaSummary, employeeStats, productAnalytics, stats }) {
  const [analyticsTab, setAnalyticsTab] = useState('departments');
  return (
    <div className="flex-1 overflow-auto px-6 py-4">
      <div className="flex items-center gap-3 mb-4">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Analytiques Cuisine</h2>
      </div>
      <Tabs value={analyticsTab} onValueChange={setAnalyticsTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="departments" className="text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Départements</TabsTrigger>
          <TabsTrigger value="employees" className="text-xs"><Users className="h-3.5 w-3.5 mr-1" /> Employés</TabsTrigger>
          <TabsTrigger value="products" className="text-xs"><Package className="h-3.5 w-3.5 mr-1" /> Produits</TabsTrigger>
          <TabsTrigger value="sla" className="text-xs"><Activity className="h-3.5 w-3.5 mr-1" /> SLA</TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(departmentStats || []).map(ds => {
              const loadColor = ds.busy_level === 'overloaded' ? 'bg-red-500' : ds.busy_level === 'very_busy' ? 'bg-orange-400' : ds.busy_level === 'busy' ? 'bg-amber-400' : 'bg-emerald-400';
              return (
                <div key={ds.department} className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{ds.dept_icon || '📋'}</span>
                    <div>
                      <h3 className="font-semibold text-sm">{ds.department}</h3>
                      <p className="text-[10px] text-muted-foreground">SLA: {ds.sla_target_minutes}min</p>
                    </div>
                    <Badge className={`ml-auto ${ds.busy_level === 'overloaded' ? 'bg-red-100 text-red-700' : ds.busy_level === 'very_busy' ? 'bg-orange-100 text-orange-700' : ds.busy_level === 'busy' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {ds.busy_level === 'overloaded' ? 'Surchargé' : ds.busy_level === 'very_busy' ? 'Très actif' : ds.busy_level === 'busy' ? 'Actif' : 'Normal'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Charge</span><span className="font-medium">{ds.current_load} en cours</span></div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${loadColor} transition-all`} style={{ width: `${ds.load_pct}%` }} /></div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-lg font-bold text-amber-600">{ds.pending}</p><p className="text-[10px] text-muted-foreground">Attente</p></div>
                      <div><p className="text-lg font-bold text-blue-600">{ds.preparing}</p><p className="text-[10px] text-muted-foreground">Cours</p></div>
                      <div><p className="text-lg font-bold text-emerald-600">{ds.ready}</p><p className="text-[10px] text-muted-foreground">Prêt</p></div>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t">
                      <span className="text-muted-foreground">Attente moy.</span><span className="font-medium">{ds.avg_wait_time}min</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Prépa. moy.</span><span className="font-medium">{ds.avg_prep_time}min</span>
                    </div>
                    {ds.overdue > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-red-500">En retard</span><span className="font-bold text-red-600">{ds.overdue}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {(!departmentStats || departmentStats.length === 0) && <p className="text-sm text-muted-foreground col-span-full text-center py-8">Aucune donnée de département disponible</p>}
          </div>
        </TabsContent>

        <TabsContent value="employees">
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Serveur</th>
                <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground">Total</th>
                <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground">Terminées</th>
                <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground">Actives</th>
                <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground">Annulées</th>
                <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground">Prépa. moy.</th>
                <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground">Taux</th>
              </tr></thead>
              <tbody>
                {(employeeStats || []).map(es => (
                  <tr key={es.server_name} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {es.server_name}</td>
                    <td className="text-center px-4 py-3 font-bold">{es.total_orders}</td>
                    <td className="text-center px-4 py-3 text-emerald-600 font-medium">{es.completed}</td>
                    <td className="text-center px-4 py-3 text-blue-600 font-medium">{es.active}</td>
                    <td className="text-center px-4 py-3 text-red-500 font-medium">{es.cancelled}</td>
                    <td className="text-center px-4 py-3">{es.avg_prep_time}min</td>
                    <td className="text-center px-4 py-3">
                      <span className={`font-bold ${es.completion_rate >= 80 ? 'text-emerald-600' : es.completion_rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{es.completion_rate}%</span>
                    </td>
                  </tr>
                ))}
                {(!employeeStats || employeeStats.length === 0) && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Aucune donnée employé</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Produit</th>
                <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground">Préparé</th>
                <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground">Terminé</th>
                <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground">Annulé</th>
              </tr></thead>
              <tbody>
                {(productAnalytics || []).map((pa, i) => (
                  <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{pa.product_name}</td>
                    <td className="text-center px-4 py-3 font-bold">{pa.times_prepared}</td>
                    <td className="text-center px-4 py-3 text-emerald-600">{pa.completed}</td>
                    <td className="text-center px-4 py-3 text-red-500">{pa.cancelled}</td>
                  </tr>
                ))}
                {(!productAnalytics || productAnalytics.length === 0) && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">Aucune donnée produit</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="sla">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(slaSummary || []).map(s => (
              <div key={s.department} className={`p-5 rounded-xl border shadow-sm ${s.sla_pct >= 80 ? 'bg-emerald-50/50 border-emerald-200' : s.sla_pct >= 50 ? 'bg-amber-50/50 border-amber-200' : 'bg-red-50/50 border-red-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{s.department}</h3>
                  <span className={`text-2xl font-extrabold ${s.sla_pct >= 80 ? 'text-emerald-600' : s.sla_pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.sla_pct}%</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Cible: {s.sla_target_minutes}min</p>
                <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
                  <div className={`h-full rounded-full transition-all duration-500 ${s.sla_pct >= 80 ? 'bg-emerald-500' : s.sla_pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.sla_pct}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">{s.within_sla}/{s.finished} commandes dans les temps</p>
              </div>
            ))}
            {(!slaSummary || slaSummary.length === 0) && <p className="text-sm text-muted-foreground col-span-full text-center py-8">Aucune donnée SLA</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HistoryView({ historyOrders, historyLoading, historyStatus, setHistoryStatus, historyPage, setHistoryPage, historyDateFrom, setHistoryDateFrom, historyDateTo, setHistoryDateTo, historyDept, setHistoryDept, historyPriority, setHistoryPriority, departments, onLoad, onExport }) {
  return (
    <div className="flex-1 overflow-auto px-6 py-4">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <History className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-bold">Historique</h2>
        <Select value={historyStatus} onValueChange={setHistoryStatus}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="completed">Terminées</SelectItem>
            <SelectItem value="cancelled">Annulées</SelectItem>
            <SelectItem value="served">Servies</SelectItem>
          </SelectContent>
        </Select>
        <Select value={historyDept} onValueChange={setHistoryDept}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous départs.</SelectItem>
            {(departments || []).filter(d => d.is_active).map(d => <SelectItem key={d.id} value={d.name.toLowerCase()}>{d.icon} {d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={historyPriority} onValueChange={setHistoryPriority}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes prios</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
            <SelectItem value="high">Haute</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Faible</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="h-8 w-36 text-xs" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)} />
        <Input type="date" className="h-8 w-36 text-xs" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)} />
        <Button size="sm" variant="outline" className="h-8" onClick={onLoad} disabled={historyLoading}>
          <RotateCcw className={`h-3.5 w-3.5 mr-1 ${historyLoading ? 'animate-spin' : ''}`} /> Charger
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={onExport} disabled={!historyOrders.length}>
          <Download className="h-3.5 w-3.5 mr-1" /> CSV
        </Button>
      </div>

      {historyOrders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Cliquez sur "Charger" pour afficher l'historique</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {historyOrders.map(order => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const pri = PRIORITY_MAP[order.priority] || PRIORITY_MAP.normal;
              const PriIcon = pri.icon;
              return (
                <div key={order.id} className={`p-3.5 rounded-xl border ${cfg.border} bg-card/60 hover:bg-card hover:shadow-md transition-all duration-200`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">#{order.sale_id || order.id}</span>
                      {order.table_number && <span className="text-xs font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">T{order.table_number}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className={`${cfg.color} text-white text-[10px] px-1.5 py-0`}>{cfg.label}</Badge>
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${pri.color}`}><PriIcon className="h-2.5 w-2.5" /> {pri.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>{order.created_at ? new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                    <span>·</span>
                    <span>{order.server_name || '—'}</span>
                    {order.department && <span>· {order.department}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(order.items || []).length} article(s)
                    {order._elapsed && order._elapsed.text !== '—' && <span> · {order._elapsed.text}</span>}
                    {order.total > 0 && <span> · {Number(order.total).toFixed(2)} {getCurrencySymbol('TND')}</span>}
                  </div>
                  {order.cancel_reason && <p className="text-[11px] text-red-600 mt-1.5 italic truncate">{order.cancel_reason}</p>}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button variant="outline" size="sm" disabled={historyPage <= 1} onClick={() => setHistoryPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
            <span className="text-sm font-medium text-muted-foreground">Page {historyPage}</span>
            <Button variant="outline" size="sm" disabled={historyOrders.length < HISTORY_LIMIT} onClick={() => setHistoryPage(p => p + 1)}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0, served: 0, completed: 0, cancelled: 0, total: 0, avg_prep_time: 0, overdue_count: 0, performance_pct: 0, sla_compliance: 100, active_queue: 0 });
  const [departments, setDepartments] = useState([]);
  const [activeDept, setActiveDept] = useState('all');
  const [view, setView] = useState('kanban');
  const [departmentStats, setDepartmentStats] = useState([]);
  const [slaSummary, setSlaSummary] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterServer, setFilterServer] = useState('');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStatus, setHistoryStatus] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historyDept, setHistoryDept] = useState('all');
  const [historyPriority, setHistoryPriority] = useState('all');
  const [employeeStats, setEmployeeStats] = useState([]);
  const [productAnalytics, setProductAnalytics] = useState([]);
  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptIcon, setNewDeptIcon] = useState('🍽️');
  const [newDeptColor, setNewDeptColor] = useState('#3B82F6');
  const [savingDept, setSavingDept] = useState(false);

  const { toast } = useToast();
  const { config: electronConfig } = useAppConfig();
  const audioCtx = useRef(null);
  const prevOrderCount = useRef(0);
  const mainRef = useRef(null);

  const config = useMemo(() => {
    if (electronConfig?.theme) return POSConfiguration.createConfig(electronConfig.theme);
    return POSConfiguration.createConfig({ primaryColor: '#3b82f6', backgroundColor: '#ffffff', textColor: '#1f2937' });
  }, [electronConfig]);

  const overdueThreshold = 15;

  const playSound = useCallback((type = 'new') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'new') { osc.frequency.value = 880; osc.type = 'sine'; }
      else if (type === 'ready') { osc.frequency.value = 1200; osc.type = 'sine'; gain.gain.setValueAtTime(0.25, ctx.currentTime); }
      else if (type === 'urgent') { osc.frequency.value = 1000; osc.type = 'square'; gain.gain.setValueAtTime(0.15, ctx.currentTime); }
      else if (type === 'cancelled') { osc.frequency.value = 440; osc.type = 'sawtooth'; }
      else { osc.frequency.value = 660; osc.type = 'triangle'; }
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, [soundEnabled]);

  const showDesktopNotification = useCallback((title, body) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: '/favicon.ico' }); } catch {}
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => { if (p === 'granted') try { new Notification(title, { body }); } catch {} });
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      if (!window.electronAPI) return;
      const [data, deptData, dashboard, deptStatsData, slaData] = await Promise.all([
        statusFilter === 'active' ? window.electronAPI.getActiveKitchenOrders() : window.electronAPI.getKitchenOrders(),
        window.electronAPI.getKitchenDepartments?.() || [],
        window.electronAPI.getKitchenDashboard?.() || null,
        window.electronAPI.getKitchenDepartmentStats?.() || [],
        window.electronAPI.getKitchenSlaSummary?.() || [],
      ]);
      setOrders(data || []);
      setDepartments(deptData || []);
      setDepartmentStats(deptStatsData || []);
      setSlaSummary(slaData || []);
      if (dashboard) setStats(dashboard);
      if (prevOrderCount.current > 0 && data && data.length > prevOrderCount.current) {
        playSound('new');
        const newCount = data.length - prevOrderCount.current;
        toast({ title: 'Nouvelle commande cuisine', description: `${newCount} nouvelle(s) commande(s)` });
        showDesktopNotification('Nouvelle commande cuisine', `${newCount} nouvelle(s) commande(s)`);
      }
      prevOrderCount.current = data ? data.length : 0;
    } catch (e) {
      console.error('[Kitchen] Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, playSound, toast, showDesktopNotification]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    if (!window.electronAPI?.autoPromoteKitchenPriorities) return;
    const promote = async () => { try { await window.electronAPI.autoPromoteKitchenPriorities(); } catch {} };
    promote();
    const interval = setInterval(promote, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    const onCreated = (order) => {
      setOrders(prev => { const exists = prev.some(o => o.id === order.id); if (exists) return prev; return [order, ...prev]; });
      playSound(order.priority === 'urgent' ? 'urgent' : 'new');
      toast({ title: 'Nouvelle commande', description: `Table ${order.table_number || '—'} — ${order.department || 'Cuisine'}` });
      showDesktopNotification('Nouvelle commande', `Table ${order.table_number || '—'} — ${order.department || 'Cuisine'}`);
    };
    const onUpdated = (order) => { setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...order } : o)); };
    const onCancelled = (order) => { setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...order } : o)); playSound('cancelled'); };
    const onDeleted = ({ id }) => { setOrders(prev => prev.filter(o => o.id !== id)); };
    const onBatch = () => { loadOrders(); };
    window.electronAPI.onKitchenOrderCreated(onCreated);
    window.electronAPI.onKitchenOrderUpdated(onUpdated);
    window.electronAPI.onKitchenOrderCancelled(onCancelled);
    window.electronAPI.onKitchenOrderDeleted(onDeleted);
    window.electronAPI.onKitchenBatchUpdated(onBatch);
    return () => { if (window.electronAPI.removeKitchenListeners) window.electronAPI.removeKitchenListeners(); };
  }, [loadOrders, playSound, toast, showDesktopNotification]);

  const updateStatus = useCallback(async (orderId, newStatus) => {
    setUpdatingIds(prev => new Set([...prev, orderId]));
    try {
      await window.electronAPI.updateKitchenOrderStatus(orderId, newStatus);
      if (newStatus === 'ready') playSound('ready');
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      await loadOrders();
    } finally {
      setUpdatingIds(prev => { const n = new Set(prev); n.delete(orderId); return n; });
    }
  }, [playSound, toast, loadOrders]);

  const handleDrop = useCallback((orderId, targetColKey) => {
    const targetStatus = targetColKey;
    if (!VALID_STATUSES.includes(targetStatus)) return;
    updateStatus(orderId, targetStatus);
  }, [updateStatus]);

  const batchUpdate = useCallback(async (ids, status) => {
    if (ids.length === 0) return;
    try {
      await window.electronAPI.batchUpdateKitchenStatus(ids, status);
      toast({ title: `${ids.length} commande(s) mise(s) à jour` });
      if (status === 'ready') playSound('ready');
    } catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
    setSelectedIds(new Set());
    await loadOrders();
  }, [toast, playSound, loadOrders]);

  const handleCancel = useCallback(async () => {
    if (!cancelTarget) return;
    try {
      await window.electronAPI.cancelKitchenOrder(cancelTarget.id, cancelReason);
      toast({ title: 'Commande annulée' });
      setCancelDialogOpen(false); setCancelTarget(null); setCancelReason(''); setDrawerOpen(false);
    } catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
  }, [cancelTarget, cancelReason, toast]);

  const toggleSelect = useCallback((orderId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  }, []);

  const handleSaveDept = useCallback(async () => {
    if (!newDeptName.trim()) { toast({ title: 'Nom requis', variant: 'destructive' }); return; }
    setSavingDept(true);
    try {
      await window.electronAPI.addKitchenDepartment({ name: newDeptName.trim(), icon: newDeptIcon, color: newDeptColor });
      toast({ title: `Département "${newDeptName.trim()}" créé` });
      setShowDeptDialog(false); setNewDeptName(''); setNewDeptIcon('🍽️'); setNewDeptColor('#3B82F6');
      const deptData = await window.electronAPI.getKitchenDepartments() || [];
      setDepartments(deptData);
    } catch (e) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
    setSavingDept(false);
  }, [newDeptName, newDeptIcon, newDeptColor, toast]);

  const printOrder = useCallback((order) => {
    try {
      const items = Array.isArray(order.items) ? order.items : [];
      const lines = [];
      const p = (text, align = 'center', bold = false) => lines.push({ text, align, bold });
      const sep = () => p('─'.repeat(36));
      const doubleSep = () => p('═'.repeat(36));

      doubleSep();
      p(`${getDeptIcon(order.department)}  COMMANDE CUISINE  ${getDeptIcon(order.department)}`, 'center', true);
      doubleSep();
      p(`Commande: #${order.sale_id || order.id}`, 'center', true);
      p(`Table: ${escapeHtml(order.table_number || '—')}`, 'center', true);
      sep();
      if (order.server_name) p(`Serveur:  ${escapeHtml(order.server_name)}`, 'left');
      if (order.customer_name) p(`Client:   ${escapeHtml(order.customer_name)}`, 'left');
      if (order.department) p(`Départ.:  ${escapeHtml(order.department)}`, 'left');
      p(`Heure:    ${new Date(order.created_at).toLocaleTimeString('fr-FR')}`, 'left');
      if (order.estimated_minutes) p(`Estimé:   ~${order.estimated_minutes} min`, 'left');
      const priLabel = PRIORITY_MAP[order.priority]?.label || 'Normal';
      p(`Priorité: ${priLabel}`, 'left');
      sep();
      p('ARTICLES:', 'left', true);
      sep();
      items.forEach(item => {
        p(`${item.quantity}x  ${escapeHtml(item.name || item.product_name || '')}`, 'left', true);
        if (item.special_instructions) p(`     → ${escapeHtml(item.special_instructions)}`, 'left');
      });
      if (order.notes) { sep(); p(`NOTE: ${escapeHtml(order.notes)}`, 'left'); }
      sep();
      p(`#${order.sale_id || order.id}`, 'center');
      doubleSep();

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page{margin:0;width:80mm}body{font-family:'Courier New',monospace;font-size:11px;width:80mm;margin:0 auto;padding:8px;line-height:1.4}
        .c{text-align:center}.l{text-align:left}.b{font-weight:bold}.line{white-space:pre-wrap;margin:1px 0}
      </style></head><body>
        ${lines.map(l => `<div class="line ${l.align === 'l' ? 'l' : 'c'} ${l.bold ? 'b' : ''}">${l.text}</div>`).join('')}
      </body></html>`;

      if (window.electronAPI?.sendToPrinter) {
        window.electronAPI.sendToPrinter({ html, directPrint: true }).catch(() => {});
      }
    } catch (e) { console.error('[Kitchen] Print error:', e); }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const offset = (historyPage - 1) * HISTORY_LIMIT;
      const data = await window.electronAPI.getKitchenHistory({
        status: historyStatus !== 'all' ? historyStatus : undefined,
        department: historyDept !== 'all' ? historyDept : undefined,
        priority: historyPriority !== 'all' ? historyPriority : undefined,
        date_from: historyDateFrom || undefined,
        date_to: historyDateTo || undefined,
        limit: HISTORY_LIMIT,
        offset,
      });
      setHistoryOrders(data || []);
    } catch (e) { console.error('[Kitchen] History load error:', e); }
    finally { setHistoryLoading(false); }
  }, [historyPage, historyStatus, historyDept, historyPriority, historyDateFrom, historyDateTo]);

  const loadAnalytics = useCallback(async () => {
    try {
      const [emp, prod] = await Promise.all([
        window.electronAPI.getKitchenEmployeeStats?.() || [],
        window.electronAPI.getKitchenProductAnalytics?.() || [],
      ]);
      setEmployeeStats(emp || []);
      setProductAnalytics(prod || []);
    } catch {}
  }, []);

  useEffect(() => { if (view === 'analytics') loadAnalytics(); }, [view, loadAnalytics]);

  const exportHistoryCsv = useCallback(() => {
    if (!historyOrders.length) return;
    const headers = ['#', 'Table', 'Statut', 'Priorité', 'Serveur', 'Client', 'Département', 'Articles', 'Total', 'Créé le', 'Temps total'];
    const rows = historyOrders.map(o => [
      o.sale_id || o.id, o.table_number || '', STATUS_CONFIG[o.status]?.label || o.status,
      PRIORITY_MAP[o.priority]?.label || o.priority, o.server_name || '', o.customer_name || '',
      o.department || '', (o.items || []).length, o.total || 0,
      o.created_at ? new Date(o.created_at).toLocaleString('fr-FR') : '', o._elapsed?.text || ''
    ]);
    exportToCsv(`kitchen-history-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    toast({ title: 'Export CSV généré' });
  }, [historyOrders, toast]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) { mainRef.current?.requestFullscreen?.(); setFullscreen(true); }
    else { document.exitFullscreen?.(); setFullscreen(false); }
  }, []);

  const resetFilters = useCallback(() => {
    setFilterPriority('all'); setFilterServer(''); setFilterOverdueOnly(false);
  }, []);

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];
    if (activeDept !== 'all') filtered = filtered.filter(o => (o.department || 'kitchen').toLowerCase() === activeDept.toLowerCase());
    if (filterPriority !== 'all') filtered = filtered.filter(o => o.priority === filterPriority);
    if (filterServer) { const s = filterServer.toLowerCase(); filtered = filtered.filter(o => (o.server_name || '').toLowerCase().includes(s)); }
    if (filterOverdueOnly) filtered = filtered.filter(o => (o.status === 'pending' || o.status === 'preparing') && o.elapsed >= overdueThreshold);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(o =>
        (o.table_number || '').toLowerCase().includes(s) ||
        String(o.sale_id || '').includes(s) ||
        (o.server_name || '').toLowerCase().includes(s) ||
        (o.customer_name || '').toLowerCase().includes(s) ||
        (o.notes || '').toLowerCase().includes(s) ||
        (o.department || '').toLowerCase().includes(s) ||
        (Array.isArray(o.items) ? o.items.some(i => (i.name || '').toLowerCase().includes(s)) : false)
      );
    }
    return filtered.sort((a, b) => {
      const pa = ['low', 'normal', 'high', 'urgent'].indexOf(a.priority);
      const pb = ['low', 'normal', 'high', 'urgent'].indexOf(b.priority);
      if (pa !== pb) return pb - pa;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
  }, [orders, search, activeDept, filterPriority, filterServer, filterOverdueOnly, overdueThreshold]);

  const kanbanColumns = useMemo(() => ({
    pending: filteredOrders.filter(o => o.status === 'pending'),
    preparing: filteredOrders.filter(o => o.status === 'preparing'),
    ready: filteredOrders.filter(o => o.status === 'ready'),
  }), [filteredOrders]);

  const statsBar = useMemo(() => ({
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    served: orders.filter(o => o.status === 'served').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    total: orders.length,
  }), [orders]);

  const pendingIds = useMemo(() => kanbanColumns.pending.map(o => o.id), [kanbanColumns.pending]);
  const preparingIds = useMemo(() => kanbanColumns.preparing.map(o => o.id), [kanbanColumns.preparing]);
  const readyIds = useMemo(() => kanbanColumns.ready.map(o => o.id), [kanbanColumns.ready]);
  const selectedCount = selectedIds.size;

  if (loading) return <SkeletonKitchen />;

  return (
    <div ref={mainRef} className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="shrink-0 border-b bg-card px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">Cuisine</h1>
              <p className="text-xs text-muted-foreground">{statsBar.total} commande(s) aujourd'hui</p>
            </div>
            {statsBar.pending > 0 && <Badge className="bg-amber-500 text-white animate-pulse ml-2 shadow-sm">{statsBar.pending} en attente</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={setView} className="mr-2">
              <TabsList className="h-9">
                <TabsTrigger value="kanban" className="h-7 text-xs px-3"><ChefHat className="h-3.5 w-3.5 mr-1" /> KDS</TabsTrigger>
                <TabsTrigger value="history" className="h-7 text-xs px-3"><History className="h-3.5 w-3.5 mr-1" /> Historique</TabsTrigger>
                <TabsTrigger value="analytics" className="h-7 text-xs px-3"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Stats</TabsTrigger>
              </TabsList>
            </Tabs>
            {view === 'kanban' && (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Table, serveur, article..." className="pl-9 h-9 w-52 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actives</SelectItem>
                    <SelectItem value="all">Toutes</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant={showFilters ? 'default' : 'outline'} size="sm" className="h-9" onClick={() => setShowFilters(p => !p)}>
                  <SlidersHorizontal className="h-4 w-4 mr-1" /> Filtres
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => setSoundEnabled(p => !p)} aria-label={soundEnabled ? 'Couper le son' : 'Activer le son'}>
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={toggleFullscreen} aria-label="Plein écran">
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={loadOrders}>
              <RotateCcw className="h-4 w-4 mr-1" /> Actualiser
            </Button>
          </div>
        </div>
      </div>

      <StatsBar statsBar={statsBar} stats={stats} onNavigate={(f) => { setStatusFilter('all'); setActiveDept('all'); setView('kanban'); }} />

      {view === 'kanban' && (
        <DepartmentTabs departments={departments} orders={orders} departmentStats={departmentStats} slaSummary={slaSummary} activeDept={activeDept} onSelect={setActiveDept} onAddDept={() => setShowDeptDialog(true)} />
      )}

      <FilterPanel show={showFilters && view === 'kanban'} departments={departments}
        filterPriority={filterPriority} setFilterPriority={setFilterPriority}
        filterServer={filterServer} setFilterServer={setFilterServer}
        filterOverdueOnly={filterOverdueOnly} setFilterOverdueOnly={setFilterOverdueOnly}
        onReset={resetFilters} />

      {view === 'kanban' && selectedCount > 0 && (
        <div className="shrink-0 border-b bg-primary/5 px-6 py-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-primary">{selectedCount} sélectionnée(s)</span>
            <Separator orientation="vertical" className="h-5" />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => batchUpdate([...selectedIds], 'preparing')}><Play className="h-3.5 w-3.5 mr-1" /> Commencer</Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => batchUpdate([...selectedIds], 'ready')}><Check className="h-3.5 w-3.5 mr-1" /> Prêt</Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => batchUpdate([...selectedIds], 'served')}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Servi</Button>
            <Button size="sm" variant="outline" className="h-8 text-xs text-destructive" onClick={() => { const first = orders.find(o => selectedIds.has(o.id)); if (first) { setCancelTarget(first); setCancelReason(''); setCancelDialogOpen(true); } }}><Ban className="h-3.5 w-3.5 mr-1" /> Annuler</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => { [...selectedIds].forEach(id => { const o = orders.find(x => x.id === id); if (o) printOrder(o); }); }}><Printer className="h-3.5 w-3.5 mr-1" /> Imprimer</Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={() => setSelectedIds(new Set())}><X className="h-3 w-3 mr-1" /> Tout désélectionner</Button>
          </div>
        </div>
      )}

      {view === 'kanban' && (pendingIds.length > 0 || preparingIds.length > 0 || readyIds.length > 0) && selectedCount === 0 && (
        <div className="shrink-0 border-b bg-muted/10 px-6 py-2">
          <div className="flex items-center gap-2">
            {pendingIds.length > 0 && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => batchUpdate(pendingIds, 'preparing')}>
                <Play className="h-3.5 w-3.5 mr-1" /> Tout commencer ({pendingIds.length})
              </Button>
            )}
            {preparingIds.length > 0 && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => batchUpdate(preparingIds, 'ready')}>
                <Check className="h-3.5 w-3.5 mr-1" /> Tout prêt ({preparingIds.length})
              </Button>
            )}
            {readyIds.length > 0 && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => batchUpdate(readyIds, 'served')}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Tout servi ({readyIds.length})
              </Button>
            )}
          </div>
        </div>
      )}

      {view === 'kanban' && (
        <div className="flex-1 overflow-auto px-4 py-4">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mb-4 shadow-inner">
                <ChefHat className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground mb-1">Aucune commande</h3>
              <p className="text-sm text-muted-foreground/70">{search ? 'Aucun résultat pour cette recherche' : 'Aucune commande active en cuisine'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full min-h-0">
              {['pending', 'preparing', 'ready'].map(col => (
                <KanbanColumn key={col} colKey={col} orders={kanbanColumns[col]}
                  onStart={(id) => updateStatus(id, 'preparing')} onReady={(id) => updateStatus(id, 'ready')}
                  onServe={(id) => updateStatus(id, 'served')} onComplete={(id) => updateStatus(id, 'completed')}
                  onView={(o) => { setSelectedOrder(o); setDrawerOpen(true); }}
                  onPrint={printOrder} onCancel={(o) => { setCancelTarget(o); setCancelReason(''); setCancelDialogOpen(true); }}
                  overdueThreshold={overdueThreshold} selectedIds={selectedIds} onSelect={toggleSelect}
                  onDrop={handleDrop} dragOverCol={dragOverCol} setDragOverCol={setDragOverCol} />
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'history' && (
        <HistoryView historyOrders={historyOrders} historyLoading={historyLoading}
          historyStatus={historyStatus} setHistoryStatus={setHistoryStatus}
          historyPage={historyPage} setHistoryPage={setHistoryPage}
          historyDateFrom={historyDateFrom} setHistoryDateFrom={setHistoryDateFrom}
          historyDateTo={historyDateTo} setHistoryDateTo={setHistoryDateTo}
          historyDept={historyDept} setHistoryDept={setHistoryDept}
          historyPriority={historyPriority} setHistoryPriority={setHistoryPriority}
          departments={departments} onLoad={loadHistory} onExport={exportHistoryCsv} />
      )}

      {view === 'analytics' && (
        <AnalyticsPanel departmentStats={departmentStats} slaSummary={slaSummary}
          employeeStats={employeeStats} productAnalytics={productAnalytics} stats={stats} />
      )}

      <OrderDetailsSheet order={selectedOrder} open={drawerOpen} onClose={setDrawerOpen}
        onStatusChange={updateStatus} onCancel={(o) => { setCancelTarget(o); setCancelReason(''); setCancelDialogOpen(true); }}
        onPrint={printOrder} config={config} />

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" /> Annuler la commande
            </DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment annuler la commande {cancelTarget?.sale_id ? `#${cancelTarget.sale_id}` : `#${cancelTarget?.id}`} ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">Raison de l'annulation (optionnel)</Label>
            <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ex: Client parti, erreur de commande..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Retour</Button>
            <Button variant="destructive" onClick={handleCancel}>
              <Ban className="h-4 w-4 mr-1" /> Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Ajouter un département
            </DialogTitle>
            <DialogDescription>Créez un nouveau département de préparation cuisine.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nom du département *</Label>
              <Input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="Ex: Cuisine, Bar, Pâtisserie..." autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && newDeptName.trim()) handleSaveDept(); }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Icône</Label>
                <div className="flex items-center gap-2">
                  <Input value={newDeptIcon} onChange={(e) => setNewDeptIcon(e.target.value)} className="w-16 text-center text-lg" />
                  <span className="text-2xl">{newDeptIcon || '🍽️'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Couleur</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={newDeptColor} onChange={(e) => setNewDeptColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer p-0.5" />
                  <Input value={newDeptColor} onChange={(e) => setNewDeptColor(e.target.value)} className="flex-1 font-mono text-xs" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeptDialog(false); setNewDeptName(''); setNewDeptIcon('🍽️'); setNewDeptColor('#3B82F6'); }}>Annuler</Button>
            <Button onClick={handleSaveDept} disabled={!newDeptName.trim() || savingDept}>
              {savingDept ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
