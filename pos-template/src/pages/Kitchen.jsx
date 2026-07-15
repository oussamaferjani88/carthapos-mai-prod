import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChefHat, 
  Clock, 
  Play, 
  Check, 
  AlertTriangle,
  Printer,
  Eye,
  Filter,
  Bell,
  X,
  SkipBack
} from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const PRIORITY_MAP = {
  low:     { value: 1, label: 'Faible',     color: 'text-gray-600' },
  normal:  { value: 2, label: 'Normale',    color: 'text-orange-600' },
  high:    { value: 3, label: 'Haute',      color: 'text-red-600 font-bold' },
  urgent:  { value: 4, label: 'Urgente',    color: 'text-red-700 font-bold animate-pulse' },
};

const STATUS_CONFIG = {
  pending:    { label: 'En attente',  color: 'bg-red-500 text-white',    next: 'preparing', nextLabel: 'Commencer',    nextIcon: Play },
  preparing:  { label: 'En cours',    color: 'bg-yellow-500 text-white',  next: 'ready',     nextLabel: 'Prêt',         nextIcon: Check },
  ready:      { label: 'Prêt',        color: 'bg-blue-500 text-white',    next: 'served',    nextLabel: 'Servi',        nextIcon: Check },
  served:     { label: 'Servi',       color: 'bg-green-500 text-white',   next: null,        nextLabel: null,           nextIcon: null },
  completed:  { label: 'Terminé',     color: 'bg-gray-400 text-white',    next: null,        nextLabel: null,           nextIcon: null },
  cancelled:  { label: 'Annulé',      color: 'bg-gray-600 text-white',    next: null,        nextLabel: null,           nextIcon: null },
};

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');
  const prevOrderCount = useRef(0);
  const audioCtx = useRef(null);

  const { config: electronConfig } = useAppConfig();
  const getConfig = () => {
    if (electronConfig?.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937'
    });
  };
  const config = getConfig();

  const playNewOrderSound = useCallback(() => {
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      /* audio not available */
    }
  }, []);

  const loadKitchenOrders = useCallback(async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const useActive = statusFilter === 'active' || statusFilter === 'all';
        const data = useActive
          ? await window.electronAPI.getActiveKitchenOrders()
          : await window.electronAPI.getKitchenOrders();

        if (statusFilter !== 'all' && statusFilter !== 'active') {
          setOrders((data || []).filter(o => o.status === statusFilter));
        } else {
          setOrders(data || []);
        }

        // Play sound if new orders arrived
        if (prevOrderCount.current > 0 && data && data.length > prevOrderCount.current) {
          playNewOrderSound();
        }
        prevOrderCount.current = data ? data.length : 0;
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading kitchen orders:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, playNewOrderSound]);

  useEffect(() => {
    loadKitchenOrders();
    const interval = setInterval(loadKitchenOrders, 15000);
    const onKitchenEvent = () => { loadKitchenOrders(); playNewOrderSound(); };
    window.addEventListener('kitchen-order-created', onKitchenEvent);
    return () => {
      clearInterval(interval);
      window.removeEventListener('kitchen-order-created', onKitchenEvent);
    };
  }, [loadKitchenOrders, playNewOrderSound]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.updateKitchenOrderStatus(orderId, newStatus);
      }
      loadKitchenOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const printKitchenOrder = (order) => {
    try {
      const items = order.items || [];
      const lines = [];
      const p = (text, align = 'center') => lines.push({ text, align });
      const sep = () => p('─'.repeat(32));

      p('COMMANDE CUISINE'.toUpperCase());
      sep();
      p(`Table: ${order.table_number || '—'}`);
      p(`#${order.sale_id || order.id}`);
      p(new Date(order.created_at).toLocaleString('fr-FR'));
      sep();
      items.forEach(item => {
        p(`${item.quantity}x  ${item.name || item.product_name}`, 'left');
      });
      if (order.notes) {
        sep();
        p(`Note: ${order.notes}`, 'left');
      }

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page { margin: 0; width: 80mm; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
        .c { text-align: center; } .l { text-align: left; } .r { text-align: right; }
        .line { white-space: pre-wrap; margin: 2px 0; }
      </style></head><body>
        ${lines.map(l => `<div class="line ${l.align === 'l' ? 'l' : l.align || 'c'}">${l.text}</div>`).join('')}
      </body></html>`;

      const printWin = window.open('', '_blank', 'width=400,height=600');
      if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => { try { printWin.print(); } catch (e) {} }, 300);
      }
    } catch (e) {
      console.error('Print error:', e);
    }
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const getElapsedTime = (fromDate, startDate = null) => {
    if (!fromDate) return '—';
    const now = new Date();
    const from = new Date(fromDate);
    const ref = startDate ? new Date(startDate) : from;
    const elapsed = Math.floor((now - ref) / 1000 / 60);
    if (elapsed < 60) return `${elapsed}min`;
    const h = Math.floor(elapsed / 60);
    const m = elapsed % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  const getFilteredOrders = () => {
    let filtered = [...orders];
    if (statusFilter === 'active') {
      filtered = filtered.filter(o => !['completed', 'cancelled', 'served'].includes(o.status));
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }
    return filtered.sort((a, b) => {
      const pa = PRIORITY_MAP[a.priority]?.value || 2;
      const pb = PRIORITY_MAP[b.priority]?.value || 2;
      if (pa !== pb) return pb - pa;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
  };

  const statusStats = {
    pending:    orders.filter(o => o.status === 'pending').length,
    preparing:  orders.filter(o => o.status === 'preparing' || o.status === 'in_progress').length,
    ready:      orders.filter(o => o.status === 'ready').length,
    served:     orders.filter(o => o.status === 'served').length,
    completed:  orders.filter(o => o.status === 'completed').length,
    cancelled:  orders.filter(o => o.status === 'cancelled').length,
    total:      orders.length,
  };

  const filteredOrders = getFilteredOrders();

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ChefHat className="h-8 w-8" />
            Cuisine
            {statusStats.pending > 0 && (
              <Badge className="bg-red-500 text-white text-sm animate-pulse">
                {statusStats.pending} en attente
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Gestion des commandes de cuisine en temps réel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Actives</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="preparing">En cours</SelectItem>
              <SelectItem value="ready">Prêtes</SelectItem>
              <SelectItem value="served">Servies</SelectItem>
              <SelectItem value="completed">Terminées</SelectItem>
              <SelectItem value="all">Toutes</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadKitchenOrders} variant="outline">
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={AlertTriangle} label="En attente" value={statusStats.pending} color="text-red-500" />
        <StatCard icon={Play} label="En cours" value={statusStats.preparing} color="text-yellow-500" />
        <StatCard icon={Check} label="Prêtes" value={statusStats.ready} color="text-blue-500" />
        <StatCard icon={Check} label="Servies" value={statusStats.served} color="text-green-500" />
        <StatCard icon={Clock} label="Terminées" value={statusStats.completed} color="text-gray-400" />
        <StatCard icon={X} label="Annulées" value={statusStats.cancelled} color="text-gray-500" />
        <StatCard icon={ChefHat} label="Total" value={statusStats.total} color="text-primary" />
      </div>

      {/* Kitchen Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrders.map((order) => {
          const priority = PRIORITY_MAP[order.priority] || PRIORITY_MAP.normal;
          const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
          const NextIcon = statusCfg.nextIcon;

          return (
            <Card key={order.id} className={`border-l-4 ${
              order.priority === 'urgent' ? 'border-l-red-600' :
              order.priority === 'high' ? 'border-l-red-400' :
              order.priority === 'normal' ? 'border-l-orange-400' :
              'border-l-gray-300'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Commande
                      {order.sale_id ? `#${order.sale_id}` : `#${order.id}`}
                      {order.priority === 'urgent' && (
                        <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      {order.table_number && `Table ${order.table_number} • `}
                      {order.total ? `${Number(order.total).toFixed(2)} €` : ''}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={statusCfg.color}>
                      {statusCfg.label}
                    </Badge>
                    <span className={`text-xs ${priority.color}`}>
                      {priority.label}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Timer */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {order.status === 'pending' ? 'Attente:' :
                     order.status === 'preparing' || order.status === 'in_progress' ? 'En cours:' :
                     order.status === 'ready' ? 'Prêt depuis:' :
                     order.status === 'served' ? 'Servi depuis:' : ''}
                  </span>
                  <span className={`font-medium ${
                    order.status === 'pending' && parseInt(getElapsedTime(order.created_at)) > 15
                      ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {getElapsedTime(order.created_at, order.started_at)}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-1.5">
                  {(order.items || []).slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm">
                      <div className="flex-1">
                        <span className="font-medium">{item.quantity}x {item.name || item.product_name}</span>
                        {item.special_instructions && (
                          <div className="text-xs text-orange-600 italic">{item.special_instructions}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {order.items && order.items.length > 4 && (
                    <div className="text-xs text-muted-foreground">
                      ... et {order.items.length - 4} autre(s)
                    </div>
                  )}
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <strong>Note:</strong> {order.notes}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {statusCfg.next && (
                    <Button
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, statusCfg.next)}
                      className={statusCfg.next === 'ready' ? 'flex-1 bg-blue-600 hover:bg-blue-700' :
                                statusCfg.next === 'served' ? 'flex-1 bg-green-600 hover:bg-green-700' :
                                'flex-1'}
                    >
                      {NextIcon && <NextIcon className="h-4 w-4 mr-1" />}
                      {statusCfg.nextLabel}
                    </Button>
                  )}
                  {order.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewOrderDetails(order)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => printKitchenOrder(order)}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <ChefHat className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune commande</h3>
            <p className="text-muted-foreground">
              {statusFilter === 'active'
                ? 'Aucune commande active en cuisine'
                : 'Aucune commande avec ce filtre'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Order Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Détails de la commande {selectedOrder?.sale_id ? `#${selectedOrder.sale_id}` : ''}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Informations</h4>
                  <div className="text-sm space-y-1 mt-2">
                    <div>Table: {selectedOrder.table_number || '—'}</div>
                    <div>Total: {selectedOrder.total ? `${Number(selectedOrder.total).toFixed(2)} €` : '—'}</div>
                    <div>Priorité: {PRIORITY_MAP[selectedOrder.priority]?.label || 'Normale'}</div>
                    <div>Statut: {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Timing</h4>
                  <div className="text-sm space-y-1 mt-2">
                    <div>Reçu: {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString('fr-FR') : '—'}</div>
                    {selectedOrder.started_at && <div>Début: {new Date(selectedOrder.started_at).toLocaleString('fr-FR')}</div>}
                    {selectedOrder.completed_at && <div>Fin: {new Date(selectedOrder.completed_at).toLocaleString('fr-FR')}</div>}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Articles</h4>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start p-2 border rounded">
                      <div>
                        <span className="font-medium">{item.quantity}x {item.name || item.product_name}</span>
                        {item.special_instructions && (
                          <div className="text-sm text-orange-600 italic">
                            Instructions: {item.special_instructions}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {selectedOrder.status === 'pending' && (
                  <Button onClick={() => { updateOrderStatus(selectedOrder.id, 'preparing'); setDialogOpen(false); }}>
                    <Play className="h-4 w-4 mr-1" /> Commencer
                  </Button>
                )}
                {selectedOrder.status === 'preparing' && (
                  <Button onClick={() => { updateOrderStatus(selectedOrder.id, 'ready'); setDialogOpen(false); }} className="bg-blue-600">
                    <Check className="h-4 w-4 mr-1" /> Prêt
                  </Button>
                )}
                {selectedOrder.status === 'ready' && (
                  <Button onClick={() => { updateOrderStatus(selectedOrder.id, 'served'); setDialogOpen(false); }} className="bg-green-600">
                    <Check className="h-4 w-4 mr-1" /> Servi
                  </Button>
                )}
                <Button variant="outline" onClick={() => printKitchenOrder(selectedOrder)}>
                  <Printer className="h-4 w-4 mr-1" /> Imprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
