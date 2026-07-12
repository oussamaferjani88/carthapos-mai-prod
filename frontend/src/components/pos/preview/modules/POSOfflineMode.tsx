import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const POSOfflineMode = ({ config }: { config: any }) => (
  <div className="p-6 max-w-lg mx-auto">
    <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: config.textColor }}>
      <WifiOff className="w-6 h-6" />Mode hors ligne
    </h1>
    <div className="bg-white rounded-xl border shadow-sm p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
        <WifiOff className="w-8 h-8 text-orange-600" />
      </div>
      <h2 className="text-xl font-semibold mb-2" style={{ color: config.textColor }}>Sans connexion</h2>
      <p className="text-sm text-gray-500 mb-4">Les ventes seront stockées localement et synchronisées automatiquement</p>
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
        <Wifi className="w-4 h-4" />Dernière synchro: il y a 5 min
      </div>
      <button className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border mx-auto text-sm hover:bg-gray-50">
        <RefreshCw className="w-4 h-4" />Synchroniser
      </button>
    </div>
  </div>
);

export default POSOfflineMode;
