import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Scan, User } from 'lucide-react';

export const POSTools = ({ 
  drawerStatus, 
  setDrawerStatus, 
  setNotification,
  config 
}) => {
  const handleAction = (actionType) => {
    switch (actionType) {
      case 'scan':
        setNotification("📱 Scanner code-barres");
        break;
      case 'discount':
        setNotification("🎁 Remise appliquée");
        break;
      case 'suspend':
        setNotification("🔄 Transaction suspendue");
        break;
      case 'search':
        setNotification("🔍 Recherche produit");
        break;
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
    <Card className="bg-gray-50 border-2 border-gray-300 h-full">
      <CardHeader className="py-1">
        <CardTitle className="text-xs">📊 Système & Actions</CardTitle>
      </CardHeader>
      <CardContent className="py-1 px-2">
        <div className="space-y-2">
          {/* Actions rapides */}
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => handleAction('scan')}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-bold transition-all flex items-center justify-center p-1"
            >
              <Scan className="w-3 h-3 mr-1" />
              Scan
            </button>
            <button
              onClick={() => handleAction('discount')}
              className="bg-purple-500 hover:bg-purple-600 text-white rounded text-xs font-bold transition-all flex items-center justify-center p-1"
            >
              % Remise
            </button>
          </div>
          
          {/* Info système */}
          <div className="text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span>Tiroir:</span>
              <span className={`font-bold ${drawerStatus === 'open' ? 'text-green-600' : 'text-gray-600'}`}>
                {drawerStatus === 'open' ? '🟢 Ouvert' : '🔴 Fermé'}
              </span>
            </div>
            <button
              onClick={() => handleAction('drawer')}
              className={`w-full p-1 rounded text-xs font-bold transition-all ${
                drawerStatus === 'open' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
              }`}
            >
              💰 Ouvrir Tiroir
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default POSTools;