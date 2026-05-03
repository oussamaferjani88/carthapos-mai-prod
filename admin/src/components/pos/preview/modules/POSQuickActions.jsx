import React from 'react';
import { Card, CardContent } from '../../../ui/card';
import { User } from 'lucide-react';

export const POSQuickActions = ({ 
  drawerStatus, 
  setDrawerStatus, 
  setNotification 
}) => {
  const handleAction = (actionType) => {
    switch (actionType) {
      case 'client':
        setNotification("👤 Gestion client");
        break;
      case 'stats':
        setNotification("📊 Rapports");
        break;
      case 'ticket':
        setNotification("🎫 Ticket");
        break;
      case 'drawer':
        setNotification("💰 Tiroir ouvert !");
        setDrawerStatus('open');
        setTimeout(() => {
          setDrawerStatus('closed');
          setNotification(null);
        }, 3000);
        return;
    }
    setTimeout(() => setNotification(null), 2000);
  };

  return (
    <Card className="bg-blue-50 border-2 border-blue-500 h-full">
      <CardContent className="p-2">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => handleAction('client')}
            className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded font-bold text-xs transition-all flex items-center justify-center gap-1"
          >
            <User className="w-3 h-3" />
            Client
          </button>
          <button
            onClick={() => handleAction('stats')}
            className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded font-bold text-xs transition-all"
          >
            📊 Stats
          </button>
          <button
            onClick={() => handleAction('ticket')}
            className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-bold text-xs transition-all"
          >
            🎫 Ticket
          </button>
          <button
            onClick={() => handleAction('drawer')}
            className={`p-2 rounded font-bold text-xs transition-all ${
              drawerStatus === 'open' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            💰 Tiroir
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default POSQuickActions;
