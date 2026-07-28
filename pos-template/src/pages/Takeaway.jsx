import React, { useState, useEffect } from 'react';
import { Plus, Package, Clock, Car, CheckCircle, XCircle, Phone, MapPin, User } from 'lucide-react';
import { useThemeApplier } from '../hooks/useThemeApplier';
import { getCurrencySymbol } from '../utils/currency';

const Takeaway = () => {
  useThemeApplier();
  
  const [orders, setOrders] = useState([
    {
      id: 1,
      customerName: 'Marie Dubois',
      customerPhone: '06 12 34 56 78',
      customerAddress: '123 Rue de la Paix, Paris',
      orderType: 'takeaway',
      status: 'preparing',
      items: [
        { name: 'Pizza Margherita', quantity: 2, price: 24.00 },
        { name: 'Coca Cola', quantity: 2, price: 6.00 }
      ],
      total: 30.00,
      orderTime: '14:30',
      estimatedTime: '15:00',
      notes: 'Sans oignons'
    },
    {
      id: 2,
      customerName: 'Jean Martin',
      customerPhone: '06 98 76 54 32',
      customerAddress: '456 Avenue des Champs, Paris',
      orderType: 'delivery',
      status: 'ready',
      items: [
        { name: 'Burger Royal', quantity: 1, price: 15.50 },
        { name: 'Frites', quantity: 1, price: 4.50 }
      ],
      total: 20.00,
      orderTime: '14:15',
      estimatedTime: '14:45',
      notes: ''
    },
    {
      id: 3,
      customerName: 'Sophie Laurent',
      customerPhone: '06 11 22 33 44',
      customerAddress: '789 Boulevard Saint-Michel, Paris',
      orderType: 'takeaway',
      status: 'completed',
      items: [
        { name: 'Salade César', quantity: 1, price: 12.50 }
      ],
      total: 12.50,
      orderTime: '13:45',
      estimatedTime: '14:15',
      notes: 'Sauce à part'
    }
  ]);

  const [activeTab, setActiveTab] = useState('all');
  const [newOrder, setNewOrder] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    orderType: 'takeaway',
    notes: ''
  });
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    preparing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    ready: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  const statusLabels = {
    pending: 'En attente',
    preparing: 'En préparation',
    ready: 'Prêt',
    completed: 'Terminé',
    cancelled: 'Annulé'
  };

  const orderTypeLabels = {
    takeaway: 'À emporter',
    delivery: 'Livraison'
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    if (activeTab === 'takeaway') return order.orderType === 'takeaway';
    if (activeTab === 'delivery') return order.orderType === 'delivery';
    return order.status === activeTab;
  });

  const handleStatusChange = (orderId, newStatus) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const handleCreateOrder = () => {
    const order = {
      id: Date.now(),
      ...newOrder,
      status: 'pending',
      items: [],
      total: 0,
      orderTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      estimatedTime: new Date(Date.now() + 30 * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    setOrders([...orders, order]);
    setNewOrder({
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      orderType: 'takeaway',
      notes: ''
    });
    setShowNewOrderForm(false);
  };

  const getOrderCounts = () => {
    return {
      all: orders.length,
      takeaway: orders.filter(o => o.orderType === 'takeaway').length,
      delivery: orders.filter(o => o.orderType === 'delivery').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length
    };
  };

  const counts = getOrderCounts();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vente à Emporter & Livraison</h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos commandes à emporter et livraisons
          </p>
        </div>
        <button
          onClick={() => setShowNewOrderForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Commande
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Commandes</p>
              <p className="text-2xl font-bold text-foreground">{counts.all}</p>
            </div>
            <Package className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">À Emporter</p>
              <p className="text-2xl font-bold text-foreground">{counts.takeaway}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Livraisons</p>
              <p className="text-2xl font-bold text-foreground">{counts.delivery}</p>
            </div>
            <Car className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">En Préparation</p>
              <p className="text-2xl font-bold text-foreground">{counts.preparing}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Prêtes</p>
              <p className="text-2xl font-bold text-foreground">{counts.ready}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {[
            { key: 'all', label: 'Toutes', count: counts.all },
            { key: 'takeaway', label: 'À Emporter', count: counts.takeaway },
            { key: 'delivery', label: 'Livraisons', count: counts.delivery },
            { key: 'preparing', label: 'En Préparation', count: counts.preparing },
            { key: 'ready', label: 'Prêtes', count: counts.ready }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* New Order Form Modal */}
      {showNewOrderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Nouvelle Commande</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nom du client"
                value={newOrder.customerName}
                onChange={(e) => setNewOrder({...newOrder, customerName: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <input
                type="tel"
                placeholder="Téléphone"
                value={newOrder.customerPhone}
                onChange={(e) => setNewOrder({...newOrder, customerPhone: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <textarea
                placeholder="Adresse (si livraison)"
                value={newOrder.customerAddress}
                onChange={(e) => setNewOrder({...newOrder, customerAddress: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                rows="2"
              />
              <select
                value={newOrder.orderType}
                onChange={(e) => setNewOrder({...newOrder, orderType: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                <option value="takeaway">À emporter</option>
                <option value="delivery">Livraison</option>
              </select>
              <textarea
                placeholder="Notes spéciales"
                value={newOrder.notes}
                onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                rows="2"
              />
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateOrder}
                  disabled={!newOrder.customerName || !newOrder.customerPhone}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  Créer la Commande
                </button>
                <button
                  onClick={() => setShowNewOrderForm(false)}
                  className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrders.map((order) => (
          <div key={order.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  {order.orderType === 'delivery' ? <Car className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  Commande #{order.id}
                </h4>
                <p className="text-sm text-muted-foreground">{orderTypeLabels[order.orderType]}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{order.customerName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{order.customerPhone}</span>
              </div>
              {order.customerAddress && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{order.customerAddress}</span>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-3 mb-3">
              <div className="space-y-1">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-medium">{item.price.toFixed(2)} {getCurrencySymbol('TND')}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-semibold text-sm pt-2 border-t border-border mt-2">
                <span>Total:</span>
                <span>{order.total.toFixed(2)} {getCurrencySymbol('TND')}</span>
              </div>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground mb-3">
              <span>Commande: {order.orderTime}</span>
              <span>Prêt: {order.estimatedTime}</span>
            </div>

            {order.notes && (
              <div className="bg-muted/50 rounded p-2 mb-3">
                <p className="text-xs text-muted-foreground">Notes: {order.notes}</p>
              </div>
            )}

            <div className="flex gap-2">
              {order.status === 'pending' && (
                <button
                  onClick={() => handleStatusChange(order.id, 'preparing')}
                  className="flex-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Démarrer
                </button>
              )}
              {order.status === 'preparing' && (
                <button
                  onClick={() => handleStatusChange(order.id, 'ready')}
                  className="flex-1 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                >
                  Prêt
                </button>
              )}
              {order.status === 'ready' && (
                <button
                  onClick={() => handleStatusChange(order.id, 'completed')}
                  className="flex-1 px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  Livré
                </button>
              )}
              <button
                onClick={() => handleStatusChange(order.id, 'cancelled')}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                disabled={order.status === 'completed' || order.status === 'cancelled'}
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune commande trouvée</p>
        </div>
      )}
    </div>
  );
};

export default Takeaway;
