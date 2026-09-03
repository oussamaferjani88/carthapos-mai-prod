import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Monitor,
  HardDrive,
  Cpu,
  Server,
  Wifi,
  Usb,
  AlertTriangle,
  CheckCircle,
  Activity,
  RefreshCw
} from 'lucide-react';

export default function SystemDiagnostics() {
  const [diagnostics, setDiagnostics] = React.useState({
    cpu: { usage: 45, status: 'normal' },
    memory: { usage: 68, available: '3.2 GB', status: 'normal' },
    disk: { usage: 82, available: '125 GB', status: 'warning' },
    network: { status: 'connected', speed: '1 Gbps' },
    hardware: {
      cashDrawer: 'connected',
      printer: 'connected',
      scanner: 'disconnected'
    }
  });

  const runDiagnostics = async () => {
    // Simulation d'un diagnostic système
    setDiagnostics(prev => ({
      ...prev,
      lastCheck: new Date().toLocaleTimeString()
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal':
      case 'connected':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'error':
      case 'disconnected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'normal':
      case 'connected':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'error':
      case 'disconnected':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Diagnostics Système</h1>
          <p className="text-muted-foreground">
            Surveillance en temps réel des performances et de l'état du système
          </p>
        </div>
        <Button onClick={runDiagnostics} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Performance du système */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Performance du Système
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center">
                  <Cpu className="mr-2 h-4 w-4" />
                  Processeur
                </span>
                <Badge variant="outline" className={getStatusColor(diagnostics.cpu.status)}>
                  {diagnostics.cpu.usage}%
                </Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${diagnostics.cpu.usage}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center">
                  <Server className="mr-2 h-4 w-4" />
                  Mémoire
                </span>
                <Badge variant="outline" className={getStatusColor(diagnostics.memory.status)}>
                  {diagnostics.memory.usage}%
                </Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${diagnostics.memory.usage}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground">
                {diagnostics.memory.available} disponible
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center">
                  <HardDrive className="mr-2 h-4 w-4" />
                  Stockage
                </span>
                <Badge variant="outline" className={getStatusColor(diagnostics.disk.status)}>
                  {diagnostics.disk.usage}%
                </Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${diagnostics.disk.usage}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground">
                {diagnostics.disk.available} libre
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* État du réseau */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wifi className="mr-2 h-5 w-5" />
            Connectivité Réseau
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={getStatusColor(diagnostics.network.status)}>
                {getStatusIcon(diagnostics.network.status)}
              </div>
              <span className="font-medium">
                {diagnostics.network.status === 'connected' ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>
            <Badge variant="outline">
              {diagnostics.network.speed}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* État du matériel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Usb className="mr-2 h-5 w-5" />
            Matériel Connecté
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Tiroir-caisse</span>
              <div className="flex items-center space-x-2">
                <div className={getStatusColor(diagnostics.hardware.cashDrawer)}>
                  {getStatusIcon(diagnostics.hardware.cashDrawer)}
                </div>
                <Badge variant={diagnostics.hardware.cashDrawer === 'connected' ? 'default' : 'destructive'}>
                  {diagnostics.hardware.cashDrawer === 'connected' ? 'Connecté' : 'Déconnecté'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Imprimante thermique</span>
              <div className="flex items-center space-x-2">
                <div className={getStatusColor(diagnostics.hardware.printer)}>
                  {getStatusIcon(diagnostics.hardware.printer)}
                </div>
                <Badge variant={diagnostics.hardware.printer === 'connected' ? 'default' : 'destructive'}>
                  {diagnostics.hardware.printer === 'connected' ? 'Connecté' : 'Déconnecté'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Scanner code-barres</span>
              <div className="flex items-center space-x-2">
                <div className={getStatusColor(diagnostics.hardware.scanner)}>
                  {getStatusIcon(diagnostics.hardware.scanner)}
                </div>
                <Badge variant={diagnostics.hardware.scanner === 'connected' ? 'default' : 'destructive'}>
                  {diagnostics.hardware.scanner === 'connected' ? 'Connecté' : 'Déconnecté'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations système */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="mr-2 h-5 w-5" />
            Informations Système
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Système d'exploitation:</strong> Windows 11 Pro
            </div>
            <div>
              <strong>Version POS:</strong> 1.0.0
            </div>
            <div>
              <strong>Dernière vérification:</strong> {diagnostics.lastCheck || 'Jamais'}
            </div>
            <div>
              <strong>Temps de fonctionnement:</strong> 2h 34m
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
