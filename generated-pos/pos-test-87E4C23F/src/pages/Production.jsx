import React, { useState, useEffect } from 'react';
import { getCurrencySymbol } from '../utils/currency';
import { Factory, Plus, Package, Clock, CheckCircle, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { usePermissions } from '../contexts/PermissionsContext';

const Production = () => {
  const { canCreate, canUpdate } = usePermissions('production');
  const formatCurrency = (v) => `${(parseFloat(v) || 0).toFixed(2)} ${getCurrencySymbol('TND')}`;
  
  const [productionOrders, setProductionOrders] = useState([
    {
      id: 1,
      orderNumber: 'PROD-2024-001',
      productName: 'Pain de campagne',
      quantity: 50,
      unit: 'unités',
      status: 'in_progress',
      priority: 'high',
      startDate: '2024-08-17',
      endDate: '2024-08-17',
      estimatedTime: 240, // minutes
      actualTime: 180,
      ingredients: [
        { name: 'Farine T65', quantity: 5, unit: 'kg', cost: 8.50 },
        { name: 'Levure', quantity: 50, unit: 'g', cost: 2.30 },
        { name: 'Sel', quantity: 100, unit: 'g', cost: 0.20 }
      ],
      totalCost: 11.00,
      responsiblePerson: 'Jean Boulanger'
    },
    {
      id: 2,
      orderNumber: 'PROD-2024-002',
      productName: 'Croissants',
      quantity: 100,
      unit: 'unités',
      status: 'completed',
      priority: 'medium',
      startDate: '2024-08-16',
      endDate: '2024-08-16',
      estimatedTime: 360,
      actualTime: 340,
      ingredients: [
        { name: 'Farine T45', quantity: 3, unit: 'kg', cost: 6.90 },
        { name: 'Beurre', quantity: 1.5, unit: 'kg', cost: 12.00 },
        { name: 'Œufs', quantity: 20, unit: 'unités', cost: 4.80 }
      ],
      totalCost: 23.70,
      responsiblePerson: 'Marie Pâtissière'
    },
    {
      id: 3,
      orderNumber: 'PROD-2024-003',
      productName: 'Sauce tomate maison',
      quantity: 10,
      unit: 'litres',
      status: 'pending',
      priority: 'low',
      startDate: '2024-08-18',
      endDate: '2024-08-18',
      estimatedTime: 120,
      actualTime: null,
      ingredients: [
        { name: 'Tomates', quantity: 8, unit: 'kg', cost: 16.00 },
        { name: 'Oignons', quantity: 1, unit: 'kg', cost: 2.50 },
        { name: 'Herbes', quantity: 100, unit: 'g', cost: 3.20 }
      ],
      totalCost: 21.70,
      responsiblePerson: 'Pierre Cuisinier'
    }
  ]);

  const [recipes, setRecipes] = useState([
    {
      id: 1,
      name: 'Pain de campagne',
      category: 'Boulangerie',
      servings: 1,
      preparationTime: 240,
      ingredients: [
        { name: 'Farine T65', quantity: 0.1, unit: 'kg' },
        { name: 'Levure', quantity: 1, unit: 'g' },
        { name: 'Sel', quantity: 2, unit: 'g' }
      ],
      instructions: 'Mélanger, pétrir, lever, cuire...',
      costPerUnit: 0.22
    },
    {
      id: 2,
      name: 'Croissants',
      category: 'Viennoiserie',
      servings: 1,
      preparationTime: 360,
      ingredients: [
        { name: 'Farine T45', quantity: 0.03, unit: 'kg' },
        { name: 'Beurre', quantity: 0.015, unit: 'kg' },
        { name: 'Œufs', quantity: 0.2, unit: 'unités' }
      ],
      instructions: 'Préparer la pâte, incorporer le beurre...',
      costPerUnit: 0.24
    }
  ]);

  const [activeTab, setActiveTab] = useState('orders');
  const [newOrder, setNewOrder] = useState({
    productName: '',
    quantity: '',
    unit: 'unités',
    priority: 'medium',
    responsiblePerson: '',
    estimatedTime: ''
  });
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  const statusLabels = {
    pending: 'En attente',
    in_progress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé'
  };

  const priorityLabels = {
    low: 'Basse',
    medium: 'Moyenne',
    high: 'Haute'
  };

  const getStats = () => {
    const totalOrders = productionOrders.length;
    const pending = productionOrders.filter(o => o.status === 'pending').length;
    const inProgress = productionOrders.filter(o => o.status === 'in_progress').length;
    const completed = productionOrders.filter(o => o.status === 'completed').length;
    const totalCost = productionOrders.reduce((sum, order) => sum + order.totalCost, 0);

    return {
      totalOrders,
      pending,
      inProgress,
      completed,
      totalCost
    };
  };

  const handleStatusChange = (orderId, newStatus) => {
    if (!canUpdate) { alert("Action non autorisée : accès en lecture seule sur la production."); return; }
    setProductionOrders(orders =>
      orders.map(order =>
        order.id === orderId
          ? { 
              ...order, 
              status: newStatus,
              actualTime: newStatus === 'completed' && !order.actualTime ? order.estimatedTime : order.actualTime
            }
          : order
      )
    );
  };

  const handleCreateOrder = () => {
    if (!canCreate) { alert("Action non autorisée : accès en lecture seule sur la production."); return; }
    const order = {
      id: Date.now(),
      orderNumber: `PROD-2024-${String(productionOrders.length + 1).padStart(3, '0')}`,
      ...newOrder,
      quantity: parseInt(newOrder.quantity),
      estimatedTime: parseInt(newOrder.estimatedTime),
      status: 'pending',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      actualTime: null,
      ingredients: [],
      totalCost: 0
    };

    setProductionOrders([...productionOrders, order]);
    setNewOrder({
      productName: '',
      quantity: '',
      unit: 'unités',
      priority: 'medium',
      responsiblePerson: '',
      estimatedTime: ''
    });
    setShowNewOrderForm(false);
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const stats = getStats();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion de la Production</h1>
          <p className="text-muted-foreground mt-2">
            Suivez vos ordres de production, recettes et coûts
          </p>
        </div>
        {canCreate && (
        <button
          onClick={() => setShowNewOrderForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvel Ordre
        </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Ordres</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
            </div>
            <Factory className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">En Attente</p>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">En Cours</p>
              <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Terminés</p>
              <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Coût Total</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalCost)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <Factory className="w-4 h-4 inline mr-2" />
            Ordres de Production
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'recipes'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Recettes
          </button>
        </nav>
      </div>

      {/* New Order Form Modal */}
      {showNewOrderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Nouvel Ordre de Production</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nom du produit"
                value={newOrder.productName}
                onChange={(e) => setNewOrder({...newOrder, productName: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Quantité"
                  value={newOrder.quantity}
                  onChange={(e) => setNewOrder({...newOrder, quantity: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                <select
                  value={newOrder.unit}
                  onChange={(e) => setNewOrder({...newOrder, unit: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                >
                  <option value="unités">Unités</option>
                  <option value="kg">Kilogrammes</option>
                  <option value="litres">Litres</option>
                  <option value="portions">Portions</option>
                </select>
              </div>
              <select
                value={newOrder.priority}
                onChange={(e) => setNewOrder({...newOrder, priority: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                <option value="low">Priorité Basse</option>
                <option value="medium">Priorité Moyenne</option>
                <option value="high">Priorité Haute</option>
              </select>
              <input
                type="text"
                placeholder="Responsable"
                value={newOrder.responsiblePerson}
                onChange={(e) => setNewOrder({...newOrder, responsiblePerson: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <input
                type="number"
                placeholder="Temps estimé (minutes)"
                value={newOrder.estimatedTime}
                onChange={(e) => setNewOrder({...newOrder, estimatedTime: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateOrder}
                  disabled={!newOrder.productName || !newOrder.quantity}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  Créer l'Ordre
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

      {/* Production Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {productionOrders.map((order) => (
            <div key={order.id} className="bg-card border border-border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Factory className="w-5 h-5" />
                    {order.orderNumber}
                  </h4>
                  <p className="text-lg font-medium text-foreground">{order.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.quantity} {order.unit} • Responsable: {order.responsiblePerson}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${priorityColors[order.priority]}`}>
                    {priorityLabels[order.priority]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dates</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(order.startDate).toLocaleDateString('fr-FR')}
                    {order.startDate !== order.endDate && ` - ${new Date(order.endDate).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Temps</p>
                  <p className="text-sm font-medium text-foreground">
                    {order.actualTime ? (
                      <>
                        {formatTime(order.actualTime)} 
                        {order.actualTime !== order.estimatedTime && (
                          <span className="text-muted-foreground">
                            (prévu: {formatTime(order.estimatedTime)})
                          </span>
                        )}
                      </>
                    ) : (
                      `Prévu: ${formatTime(order.estimatedTime)}`
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coût</p>
                  <p className="text-sm font-medium text-foreground">{formatCurrency(order.totalCost)}</p>
                </div>
              </div>

              {order.ingredients.length > 0 && (
                <div className="border-t border-border pt-4 mb-4">
                  <h5 className="font-medium mb-2">Ingrédients:</h5>
                  <div className="space-y-1">
                    {order.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{ingredient.name}: {ingredient.quantity} {ingredient.unit}</span>
                        <span className="font-medium">{formatCurrency(ingredient.cost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange(order.id, 'in_progress')}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                  >
                    Démarrer
                  </button>
                )}
                {order.status === 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange(order.id, 'completed')}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                  >
                    Terminer
                  </button>
                )}
                {order.status !== 'completed' && order.status !== 'cancelled' && (
                  <button
                    onClick={() => handleStatusChange(order.id, 'cancelled')}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipes Tab */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="bg-card border border-border rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-foreground">{recipe.name}</h4>
                    <p className="text-sm text-muted-foreground">{recipe.category}</p>
                  </div>
                   <span className="text-lg font-bold text-foreground">{formatCurrency(recipe.costPerUnit)}</span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Portions:</span>
                    <span className="text-foreground">{recipe.servings}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Temps de préparation:</span>
                    <span className="text-foreground">{formatTime(recipe.preparationTime)}</span>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h5 className="font-medium mb-2">Ingrédients par unité:</h5>
                  <div className="space-y-1">
                    {recipe.ingredients.map((ingredient, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {ingredient.name}: {ingredient.quantity} {ingredient.unit}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Production;
