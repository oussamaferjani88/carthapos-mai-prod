import { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  Play, 
  Check, 
  AlertTriangle,
  Printer,
  Eye,
  Filter
} from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';

// Components
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

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // POSConfiguration integration
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

  useEffect(() => {
    loadKitchenOrders();
    
    // Actualiser toutes les 30 secondes
    const interval = setInterval(loadKitchenOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadKitchenOrders = async () => {
    try {
      setLoading(true);
      
      if (window.electronAPI) {
        const orders = await window.electronAPI.getKitchenOrders();
        setOrders(orders);
      } else {
        // Fallback pour le développement web
        setOrders([
          {
            id: 1,
            sale_id: 123,
            table_number: 'T1',
            status: 'pending',
            priority: 2,
            notes: 'Sans oignons',
            sent_to_kitchen_at: new Date().toISOString(),
            sale_total: 45.50,
            items: [
              { id: 1, product_name: 'Burger Classic', quantity: 2, special_instructions: 'Bien cuit' },
              { id: 2, product_name: 'Frites', quantity: 2, special_instructions: '' }
            ]
          },
          {
            id: 2,
            sale_id: 124,
            table_number: 'T3',
            status: 'in_progress',
            priority: 3,
            notes: '',
            sent_to_kitchen_at: new Date(Date.now() - 10 * 60000).toISOString(),
            started_at: new Date(Date.now() - 5 * 60000).toISOString(),
            sale_total: 32.80,
            items: [
              { id: 3, product_name: 'Salade César', quantity: 1, special_instructions: 'Sauce à part' },
              { id: 4, product_name: 'Soupe du jour', quantity: 1, special_instructions: '' }
            ]
          },
          {
            id: 3,
            sale_id: 125,
            table_number: 'T5',
            status: 'pending',
            priority: 1,
            notes: 'Urgente - client pressé',
            sent_to_kitchen_at: new Date(Date.now() - 2 * 60000).toISOString(),
            sale_total: 78.90,
            items: [
              { id: 5, product_name: 'Steak Frites', quantity: 2, special_instructions: 'Saignant' },
              { id: 6, product_name: 'Vin rouge', quantity: 1, special_instructions: '' }
            ]
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading kitchen orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.updateKitchenOrderStatus(orderId, newStatus);
      }
      loadKitchenOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-red-500 text-white';
      case 'in_progress':
        return 'bg-yellow-500 text-white';
      case 'completed':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminé';
      default:
        return 'Inconnu';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 3:
        return 'text-red-600 font-bold';
      case 2:
        return 'text-orange-600 font-medium';
      case 1:
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 3:
        return 'Urgent';
      case 2:
        return 'Normal';
      case 1:
        return 'Faible';
      default:
        return 'Normal';
    }
  };

  const getElapsedTime = (sentTime, startTime = null) => {
    const now = new Date();
    const sent = new Date(sentTime);
    const start = startTime ? new Date(startTime) : null;
    
    const referenceTime = start || sent;
    const elapsed = Math.floor((now - referenceTime) / 1000 / 60); // en minutes
    
    if (elapsed < 60) {
      return `${elapsed}min`;
    } else {
      const hours = Math.floor(elapsed / 60);
      const minutes = elapsed % 60;
      return `${hours}h${minutes.toString().padStart(2, '0')}`;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  });

  const statusStats = {
    pending: orders.filter(o => o.status === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <ChefHat className="mr-3 h-8 w-8" />
            Cuisine
          </h1>
          <p className="text-muted-foreground">
            Gestion des commandes de cuisine en temps réel
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadKitchenOrders}>
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{statusStats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Play className="h-4 w-4 text-yellow-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">En cours</p>
                <p className="text-2xl font-bold">{statusStats.in_progress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Terminé</p>
                <p className="text-2xl font-bold">{statusStats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total commandes</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kitchen Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrders
          .sort((a, b) => {
            // Trier par priorité puis par temps d'attente
            if (a.priority !== b.priority) {
              return b.priority - a.priority;
            }
            return new Date(a.sent_to_kitchen_at) - new Date(b.sent_to_kitchen_at);
          })
          .map((order) => (
            <Card key={order.id} className={`border-l-4 ${
              order.priority === 3 ? 'border-l-red-500' : 
              order.priority === 2 ? 'border-l-orange-500' : 
              'border-l-gray-300'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Commande #{order.sale_id}
                    </CardTitle>
                    <CardDescription>
                      {order.table_number && `Table ${order.table_number} • `}
                      {order.sale_total?.toFixed(2)}€
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusLabel(order.status)}
                    </Badge>
                    <span className={`text-xs ${getPriorityColor(order.priority)}`}>
                      {getPriorityLabel(order.priority)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Temps écoulé */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {order.status === 'pending' ? 'En attente depuis:' : 
                     order.status === 'in_progress' ? 'En cours depuis:' : 
                     'Terminé'}
                  </span>
                  <span className={`font-medium ${
                    getElapsedTime(order.sent_to_kitchen_at, order.started_at).includes('h') || 
                    parseInt(getElapsedTime(order.sent_to_kitchen_at, order.started_at)) > 15 
                      ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {getElapsedTime(order.sent_to_kitchen_at, order.started_at)}
                  </span>
                </div>

                {/* Articles */}
                <div className="space-y-2">
                  {order.items?.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between items-start text-sm">
                      <div className="flex-1">
                        <span className="font-medium">{item.quantity}x {item.product_name}</span>
                        {item.special_instructions && (
                          <div className="text-xs text-orange-600 italic">
                            {item.special_instructions}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {order.items?.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      ... et {order.items.length - 3} autre(s) article(s)
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
                <div className="flex space-x-2">
                  {order.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, 'in_progress')}
                      className="flex-1"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Commencer
                    </Button>
                  )}
                  
                  {order.status === 'in_progress' && (
                    <Button
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Terminer
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
                    onClick={() => {
                      // Logique d'impression
                      console.log('Print order:', order.id);
                    }}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <ChefHat className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune commande</h3>
            <p className="text-muted-foreground">
              {statusFilter === 'all' 
                ? 'Aucune commande en cuisine actuellement'
                : `Aucune commande avec le statut "${getStatusLabel(statusFilter)}"`
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Order Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Détails de la commande #{selectedOrder?.sale_id}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Informations générales</h4>
                  <div className="text-sm space-y-1 mt-2">
                    <div>Table: {selectedOrder.table_number || 'Inconnue'}</div>
                    <div>Total: {selectedOrder.sale_total?.toFixed(2)}€</div>
                    <div>Priorité: {getPriorityLabel(selectedOrder.priority)}</div>
                    <div>Statut: {getStatusLabel(selectedOrder.status)}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Timing</h4>
                  <div className="text-sm space-y-1 mt-2">
                    <div>Envoyé: {new Date(selectedOrder.sent_to_kitchen_at).toLocaleTimeString()}</div>
                    {selectedOrder.started_at && (
                      <div>Commencé: {new Date(selectedOrder.started_at).toLocaleTimeString()}</div>
                    )}
                    {selectedOrder.completed_at && (
                      <div>Terminé: {new Date(selectedOrder.completed_at).toLocaleTimeString()}</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Articles de la commande</h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-start p-2 border rounded">
                      <div>
                        <div className="font-medium">{item.quantity}x {item.product_name}</div>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
