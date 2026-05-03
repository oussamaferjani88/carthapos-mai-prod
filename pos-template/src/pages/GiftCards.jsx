import React, { useState, useEffect } from 'react';
import { Gift, CreditCard, Plus, Check, X, DollarSign, Users, Calendar, BarChart3 } from 'lucide-react';
import { useThemeApplier } from '../hooks/useThemeApplier';

const GiftCards = () => {
  useThemeApplier();
  
  const [giftCards, setGiftCards] = useState([
    {
      id: 1,
      code: 'GIFT-2024-001',
      initialValue: 50.00,
      currentValue: 32.50,
      status: 'active',
      purchaseDate: '2024-08-01',
      expiryDate: '2025-08-01',
      purchaser: 'Marie Dubois',
      purchaserEmail: 'marie.dubois@email.com',
      recipient: 'Sophie Martin',
      recipientEmail: 'sophie.martin@email.com',
      message: 'Joyeux anniversaire !',
      lastUsed: '2024-08-15'
    },
    {
      id: 2,
      code: 'GIFT-2024-002',
      initialValue: 25.00,
      currentValue: 25.00,
      status: 'active',
      purchaseDate: '2024-08-10',
      expiryDate: '2025-08-10',
      purchaser: 'Jean Dupont',
      purchaserEmail: 'jean.dupont@email.com',
      recipient: 'Lisa Dupont',
      recipientEmail: 'lisa.dupont@email.com',
      message: 'Pour te faire plaisir',
      lastUsed: null
    },
    {
      id: 3,
      code: 'GIFT-2024-003',
      initialValue: 100.00,
      currentValue: 0.00,
      status: 'used',
      purchaseDate: '2024-07-20',
      expiryDate: '2025-07-20',
      purchaser: 'Pierre Lambert',
      purchaserEmail: 'pierre.lambert@email.com',
      recipient: 'Anna Lambert',
      recipientEmail: 'anna.lambert@email.com',
      message: 'Bon shopping !',
      lastUsed: '2024-08-12'
    }
  ]);

  const [transactions, setTransactions] = useState([
    {
      id: 1,
      giftCardId: 1,
      type: 'purchase',
      amount: 50.00,
      date: '2024-08-01',
      description: 'Achat carte cadeau'
    },
    {
      id: 2,
      giftCardId: 1,
      type: 'redeem',
      amount: -17.50,
      date: '2024-08-15',
      description: 'Utilisation - Commande #123'
    },
    {
      id: 3,
      giftCardId: 2,
      type: 'purchase',
      amount: 25.00,
      date: '2024-08-10',
      description: 'Achat carte cadeau'
    },
    {
      id: 4,
      giftCardId: 3,
      type: 'purchase',
      amount: 100.00,
      date: '2024-07-20',
      description: 'Achat carte cadeau'
    },
    {
      id: 5,
      giftCardId: 3,
      type: 'redeem',
      amount: -100.00,
      date: '2024-08-12',
      description: 'Utilisation complète'
    }
  ]);

  const [activeTab, setActiveTab] = useState('cards');
  const [newCard, setNewCard] = useState({
    value: '',
    purchaser: '',
    purchaserEmail: '',
    recipient: '',
    recipientEmail: '',
    message: '',
    expiryMonths: 12
  });
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [searchCode, setSearchCode] = useState('');

  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    used: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  const statusLabels = {
    active: 'Active',
    used: 'Utilisée',
    expired: 'Expirée'
  };

  const generateGiftCardCode = () => {
    const prefix = 'GIFT';
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${year}-${random}`;
  };

  const handleCreateGiftCard = () => {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + parseInt(newCard.expiryMonths));
    
    const card = {
      id: Date.now(),
      code: generateGiftCardCode(),
      initialValue: parseFloat(newCard.value),
      currentValue: parseFloat(newCard.value),
      status: 'active',
      purchaseDate: new Date().toISOString().split('T')[0],
      expiryDate: expiryDate.toISOString().split('T')[0],
      purchaser: newCard.purchaser,
      purchaserEmail: newCard.purchaserEmail,
      recipient: newCard.recipient,
      recipientEmail: newCard.recipientEmail,
      message: newCard.message,
      lastUsed: null
    };

    const transaction = {
      id: Date.now() + 1,
      giftCardId: card.id,
      type: 'purchase',
      amount: parseFloat(newCard.value),
      date: new Date().toISOString().split('T')[0],
      description: 'Achat carte cadeau'
    };

    setGiftCards([...giftCards, card]);
    setTransactions([...transactions, transaction]);
    setNewCard({
      value: '',
      purchaser: '',
      purchaserEmail: '',
      recipient: '',
      recipientEmail: '',
      message: '',
      expiryMonths: 12
    });
    setShowNewCardForm(false);
  };

  const handleRedeemCard = (cardId, amount) => {
    const card = giftCards.find(c => c.id === cardId);
    if (!card || card.currentValue < amount) return;

    setGiftCards(cards =>
      cards.map(c =>
        c.id === cardId
          ? {
              ...c,
              currentValue: c.currentValue - amount,
              status: c.currentValue - amount <= 0 ? 'used' : 'active',
              lastUsed: new Date().toISOString().split('T')[0]
            }
          : c
      )
    );

    const transaction = {
      id: Date.now(),
      giftCardId: cardId,
      type: 'redeem',
      amount: -amount,
      date: new Date().toISOString().split('T')[0],
      description: `Utilisation - ${amount.toFixed(2)} €`
    };

    setTransactions([...transactions, transaction]);
  };

  const getStats = () => {
    const totalValue = giftCards.reduce((sum, card) => sum + card.initialValue, 0);
    const remainingValue = giftCards.reduce((sum, card) => sum + card.currentValue, 0);
    const activeCards = giftCards.filter(card => card.status === 'active').length;
    const usedCards = giftCards.filter(card => card.status === 'used').length;

    return {
      totalCards: giftCards.length,
      activeCards,
      usedCards,
      totalValue,
      remainingValue,
      redemptionRate: totalValue ? (((totalValue - remainingValue) / totalValue) * 100).toFixed(1) : 0
    };
  };

  const filteredCards = giftCards.filter(card =>
    card.code.toLowerCase().includes(searchCode.toLowerCase()) ||
    card.purchaser.toLowerCase().includes(searchCode.toLowerCase()) ||
    card.recipient.toLowerCase().includes(searchCode.toLowerCase())
  );

  const stats = getStats();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cartes Cadeaux</h1>
          <p className="text-muted-foreground mt-2">
            Gérez l'émission et l'utilisation des cartes cadeaux
          </p>
        </div>
        <button
          onClick={() => setShowNewCardForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Carte Cadeau
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Cartes</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalCards}</p>
            </div>
            <Gift className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cartes Actives</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeCards}</p>
            </div>
            <Check className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valeur Restante</p>
              <p className="text-2xl font-bold text-foreground">{stats.remainingValue.toFixed(2)} €</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Taux Utilisation</p>
              <p className="text-2xl font-bold text-foreground">{stats.redemptionRate}%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('cards')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cards'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <Gift className="w-4 h-4 inline mr-2" />
            Cartes Cadeaux
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <CreditCard className="w-4 h-4 inline mr-2" />
            Transactions
          </button>
        </nav>
      </div>

      {/* New Gift Card Form Modal */}
      {showNewCardForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Nouvelle Carte Cadeau</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Valeur (€)"
                  value={newCard.value}
                  onChange={(e) => setNewCard({...newCard, value: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                <select
                  value={newCard.expiryMonths}
                  onChange={(e) => setNewCard({...newCard, expiryMonths: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                >
                  <option value={6}>6 mois</option>
                  <option value={12}>12 mois</option>
                  <option value={24}>24 mois</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nom acheteur"
                  value={newCard.purchaser}
                  onChange={(e) => setNewCard({...newCard, purchaser: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                <input
                  type="email"
                  placeholder="Email acheteur"
                  value={newCard.purchaserEmail}
                  onChange={(e) => setNewCard({...newCard, purchaserEmail: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nom bénéficiaire"
                  value={newCard.recipient}
                  onChange={(e) => setNewCard({...newCard, recipient: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                <input
                  type="email"
                  placeholder="Email bénéficiaire"
                  value={newCard.recipientEmail}
                  onChange={(e) => setNewCard({...newCard, recipientEmail: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              </div>
              <textarea
                placeholder="Message personnalisé"
                value={newCard.message}
                onChange={(e) => setNewCard({...newCard, message: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                rows="3"
              />
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateGiftCard}
                  disabled={!newCard.value || !newCard.purchaser || !newCard.recipient}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  Créer la Carte
                </button>
                <button
                  onClick={() => setShowNewCardForm(false)}
                  className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gift Cards Tab */}
      {activeTab === 'cards' && (
        <div className="space-y-6">
          {/* Search */}
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Rechercher par code, acheteur ou bénéficiaire..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredCards.map((card) => (
              <div key={card.id} className="bg-card border border-border rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-foreground font-mono">{card.code}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[card.status]}`}>
                      {statusLabels[card.status]}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">{card.currentValue.toFixed(2)} €</p>
                    <p className="text-sm text-muted-foreground">sur {card.initialValue.toFixed(2)} €</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">De:</span>
                    <span className="text-foreground">{card.purchaser}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pour:</span>
                    <span className="text-foreground">{card.recipient}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expire le:</span>
                    <span className="text-foreground">{new Date(card.expiryDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {card.lastUsed && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dernière utilisation:</span>
                      <span className="text-foreground">{new Date(card.lastUsed).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                </div>

                {card.message && (
                  <div className="bg-muted/50 rounded p-3 mb-4">
                    <p className="text-sm italic text-muted-foreground">"{card.message}"</p>
                  </div>
                )}

                {card.status === 'active' && card.currentValue > 0 && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      max={card.currentValue}
                      placeholder="Montant à débiter"
                      className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const amount = parseFloat(e.target.value);
                          if (amount > 0 && amount <= card.currentValue) {
                            handleRedeemCard(card.id, amount);
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.target.parentElement.querySelector('input');
                        const amount = parseFloat(input.value);
                        if (amount > 0 && amount <= card.currentValue) {
                          handleRedeemCard(card.id, amount);
                          input.value = '';
                        }
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
                    >
                      Utiliser
                    </button>
                  </div>
                )}
              </div>
            ))}
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
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Code Carte
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((transaction) => {
                    const card = giftCards.find(c => c.id === transaction.giftCardId);
                    return (
                      <tr key={transaction.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 text-sm text-foreground">
                          {new Date(transaction.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-foreground">
                          {card?.code || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            transaction.type === 'purchase' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          }`}>
                            {transaction.type === 'purchase' ? 'Achat' : 'Utilisation'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {transaction.amount >= 0 ? '+' : ''}{transaction.amount.toFixed(2)} €
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {transaction.description}
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

export default GiftCards;
