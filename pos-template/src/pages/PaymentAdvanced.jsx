import React, { useState, useEffect } from 'react';
import { getCurrencySymbol } from '../utils/currency';
import { CreditCard, Plus, Smartphone, Wifi, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import { useThemeApplier } from '../hooks/useThemeApplier';

const PaymentAdvanced = () => {
  useThemeApplier();
  const formatCurrency = (v) => `${(parseFloat(v) || 0).toFixed(2)} ${getCurrencySymbol('TND')}`;
  
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: 1,
      name: 'Terminal CB',
      type: 'card',
      provider: 'Ingenico',
      status: 'connected',
      lastTransaction: '2024-08-17 14:30',
      dailyTotal: 1250.50,
      enabled: true
    },
    {
      id: 2,
      name: 'PayPal',
      type: 'digital',
      provider: 'PayPal',
      status: 'connected',
      lastTransaction: '2024-08-17 13:45',
      dailyTotal: 340.00,
      enabled: true
    },
    {
      id: 3,
      name: 'Apple Pay',
      type: 'contactless',
      provider: 'Apple',
      status: 'connected',
      lastTransaction: '2024-08-17 14:15',
      dailyTotal: 89.50,
      enabled: true
    },
    {
      id: 4,
      name: 'Google Pay',
      type: 'contactless',
      provider: 'Google',
      status: 'disconnected',
      lastTransaction: null,
      dailyTotal: 0,
      enabled: false
    }
  ]);

  const [transactions, setTransactions] = useState([
    {
      id: 1,
      amount: 25.50,
      method: 'Terminal CB',
      type: 'card',
      status: 'completed',
      timestamp: '2024-08-17 14:30:15',
      reference: 'TXN-001-2024',
      customer: 'Marie D.'
    },
    {
      id: 2,
      amount: 18.90,
      method: 'Apple Pay',
      type: 'contactless',
      status: 'completed',
      timestamp: '2024-08-17 14:15:32',
      reference: 'TXN-002-2024',
      customer: 'Jean M.'
    },
    {
      id: 3,
      amount: 45.00,
      method: 'PayPal',
      type: 'digital',
      status: 'pending',
      timestamp: '2024-08-17 13:45:28',
      reference: 'TXN-003-2024',
      customer: 'Sophie L.'
    },
    {
      id: 4,
      amount: 12.30,
      method: 'Terminal CB',
      type: 'card',
      status: 'failed',
      timestamp: '2024-08-17 13:20:11',
      reference: 'TXN-004-2024',
      customer: 'Pierre B.'
    }
  ]);

  const [activeTab, setActiveTab] = useState('overview');

  const statusColors = {
    connected: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    disconnected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  };

  const transactionStatusColors = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  const typeIcons = {
    card: CreditCard,
    contactless: Wifi,
    digital: Smartphone
  };

  const getTotalStats = () => {
    const total = paymentMethods.reduce((sum, method) => sum + method.dailyTotal, 0);
    const completed = transactions.filter(t => t.status === 'completed').length;
    const pending = transactions.filter(t => t.status === 'pending').length;
    const failed = transactions.filter(t => t.status === 'failed').length;
    
    return {
      dailyTotal: total,
      totalTransactions: transactions.length,
      completedTransactions: completed,
      pendingTransactions: pending,
      failedTransactions: failed,
      successRate: transactions.length ? ((completed / transactions.length) * 100).toFixed(1) : 0
    };
  };

  const handleToggleMethod = (methodId) => {
    setPaymentMethods(methods => 
      methods.map(method => 
        method.id === methodId 
          ? { ...method, enabled: !method.enabled }
          : method
      )
    );
  };

  const handleRefreshConnection = (methodId) => {
    setPaymentMethods(methods => 
      methods.map(method => 
        method.id === methodId 
          ? { ...method, status: 'connected' }
          : method
      )
    );
  };

  const stats = getTotalStats();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Paiements Avancés</h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos méthodes de paiement et transactions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Journalier</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.dailyTotal)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalTransactions}</p>
            </div>
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Taux Succès</p>
              <p className="text-2xl font-bold text-foreground">{stats.successRate}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">En Attente</p>
              <p className="text-2xl font-bold text-foreground">{stats.pendingTransactions}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <CreditCard className="w-4 h-4 inline mr-2" />
            Méthodes de Paiement
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Transactions
          </button>
        </nav>
      </div>

      {/* Payment Methods Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentMethods.map((method) => {
              const IconComponent = typeIcons[method.type] || CreditCard;
              return (
                <div key={method.id} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{method.name}</h4>
                        <p className="text-sm text-muted-foreground">{method.provider}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[method.status]}`}>
                      {method.status === 'connected' ? 'Connecté' : 'Déconnecté'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total journalier:</span>
                      <span className="font-medium text-foreground">{formatCurrency(method.dailyTotal)}</span>
                    </div>
                    {method.lastTransaction && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dernière transaction:</span>
                        <span className="text-foreground">{new Date(method.lastTransaction).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleMethod(method.id)}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                        method.enabled
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {method.enabled ? 'Désactiver' : 'Activer'}
                    </button>
                    {method.status === 'disconnected' && (
                      <button
                        onClick={() => handleRefreshConnection(method.id)}
                        className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                      >
                        Reconnecter
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Payment Method */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Ajouter une Méthode de Paiement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="p-4 border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Terminal CB</p>
              </button>
              <button className="p-4 border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                <Wifi className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sans Contact</p>
              </button>
              <button className="p-4 border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                <Smartphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Paiement Mobile</p>
              </button>
              <button className="p-4 border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                <Plus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Autre</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Méthode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Heure
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((transaction) => {
                    const IconComponent = typeIcons[transaction.type] || CreditCard;
                    return (
                      <tr key={transaction.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {transaction.reference}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {transaction.customer}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-foreground">{transaction.method}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${transactionStatusColors[transaction.status]}`}>
                              {transaction.status === 'completed' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                              {transaction.status === 'pending' && <Clock className="w-3 h-3 inline mr-1" />}
                              {transaction.status === 'failed' && <XCircle className="w-3 h-3 inline mr-1" />}
                              {transaction.status === 'completed' ? 'Terminé' : 
                               transaction.status === 'pending' ? 'En attente' : 'Échoué'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(transaction.timestamp).toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentAdvanced;
