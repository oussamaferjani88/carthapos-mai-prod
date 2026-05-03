import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Settings,
  Printer,
  Wallet,
  Keyboard,
  Bell,
  Monitor,
  Shield,
  Database,
  TestTube,
  Download,
  Upload,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function HardwareSettings() {
  const [cashDrawerSettings, setCashDrawerSettings] = useState({
    enabled: true,
    port: 'USB',
    autoOpen: true,
    testResult: null
  });

  const [printerSettings, setPrinterSettings] = useState({
    enabled: true,
    type: 'EPSON',
    interface: 'USB',
    autoprint: true,
    testResult: null
  });

  const [keyboardSettings, setKeyboardSettings] = useState({
    enabled: true,
    soundEnabled: true,
    customShortcuts: {}
  });

  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    soundEnabled: true,
    persistentAlerts: true,
    lowStockAlerts: true
  });

  const [kioskSettings, setKioskSettings] = useState({
    enabled: false,
    fullscreen: false,
    emergencyExit: true,
    hideCursor: true
  });

  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    interval: 300000, // 5 minutes
    maxBackups: 50,
    includeImages: false
  });

  const [systemStatus, setSystemStatus] = useState({
    cashDrawer: 'ready',
    printer: 'ready',
    keyboard: 'ready',
    notifications: 'ready',
    backup: 'ready'
  });

  const saveSettings = (type, settings) => {
    try {
      localStorage.setItem(`${type}Settings`, JSON.stringify(settings));
      // Simulate notification
      console.log('Paramètres sauvegardés');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const testCashDrawer = async () => {
    setCashDrawerSettings(prev => ({ ...prev, testResult: 'testing' }));
    
    // Simulate test
    setTimeout(() => {
      setCashDrawerSettings(prev => ({ 
        ...prev, 
        testResult: 'success' 
      }));
    }, 2000);
  };

  const testPrinter = async () => {
    setPrinterSettings(prev => ({ ...prev, testResult: 'testing' }));
    
    // Simulate test
    setTimeout(() => {
      setPrinterSettings(prev => ({ 
        ...prev, 
        testResult: 'success' 
      }));
    }, 2000);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'testing':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      ready: 'default',
      error: 'destructive',
      warning: 'outline',
      testing: 'secondary',
      unknown: 'secondary'
    };

    const labels = {
      ready: 'Prêt',
      error: 'Erreur',
      warning: 'Attention',
      testing: 'Test...',
      unknown: 'Inconnu'
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {getStatusIcon(status)}
        <span className="ml-1">{labels[status] || status}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres Matériel</h1>
        <p className="text-muted-foreground">
          Configuration du matériel et des fonctionnalités système
        </p>
      </div>

      {/* État du système */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="mr-2 h-5 w-5" />
            État du Système
          </CardTitle>
          <CardDescription>
            Statut en temps réel des composants matériels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="flex flex-col items-center space-y-2">
              <Wallet className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">Tiroir-Caisse</div>
              {getStatusBadge(systemStatus.cashDrawer)}
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Printer className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">Imprimante</div>
              {getStatusBadge(systemStatus.printer)}
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Keyboard className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">Raccourcis</div>
              {getStatusBadge(systemStatus.keyboard)}
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Bell className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">Notifications</div>
              {getStatusBadge(systemStatus.notifications)}
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Database className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">Sauvegarde</div>
              {getStatusBadge(systemStatus.backup)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tiroir-Caisse */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5" />
            Tiroir-Caisse
          </CardTitle>
          <CardDescription>
            Configuration du tiroir-caisse automatique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="drawer-enabled">Activer le tiroir-caisse</Label>
            <Switch
              id="drawer-enabled"
              checked={cashDrawerSettings.enabled}
              onCheckedChange={(checked) => {
                const newSettings = { ...cashDrawerSettings, enabled: checked };
                setCashDrawerSettings(newSettings);
                saveSettings('cashDrawer', newSettings);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drawer-port">Port de connexion</Label>
              <Select
                value={cashDrawerSettings.port}
                onValueChange={(value) => {
                  const newSettings = { ...cashDrawerSettings, port: value };
                  setCashDrawerSettings(newSettings);
                  saveSettings('cashDrawer', newSettings);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un port" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USB">USB</SelectItem>
                  <SelectItem value="COM1">COM1</SelectItem>
                  <SelectItem value="COM2">COM2</SelectItem>
                  <SelectItem value="COM3">COM3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto-open"
                checked={cashDrawerSettings.autoOpen}
                onCheckedChange={(checked) => {
                  const newSettings = { ...cashDrawerSettings, autoOpen: checked };
                  setCashDrawerSettings(newSettings);
                  saveSettings('cashDrawer', newSettings);
                }}
              />
              <Label htmlFor="auto-open">Ouverture automatique</Label>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={testCashDrawer} variant="outline">
              <TestTube className="mr-2 h-4 w-4" />
              Tester
            </Button>
            <Button>
              <Wallet className="mr-2 h-4 w-4" />
              Ouvrir maintenant
            </Button>
          </div>

          {cashDrawerSettings.testResult && (
            <div className="mt-2">
              {getStatusBadge(cashDrawerSettings.testResult)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Imprimante */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Printer className="mr-2 h-5 w-5" />
            Imprimante Thermique
          </CardTitle>
          <CardDescription>
            Configuration de l'impression automatique des tickets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="printer-enabled">Activer l'impression automatique</Label>
            <Switch
              id="printer-enabled"
              checked={printerSettings.enabled}
              onCheckedChange={(checked) => {
                const newSettings = { ...printerSettings, enabled: checked };
                setPrinterSettings(newSettings);
                saveSettings('printer', newSettings);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="printer-type">Type d'imprimante</Label>
              <Select
                value={printerSettings.type}
                onValueChange={(value) => {
                  const newSettings = { ...printerSettings, type: value };
                  setPrinterSettings(newSettings);
                  saveSettings('printer', newSettings);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type d'imprimante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EPSON">Epson ESC/POS</SelectItem>
                  <SelectItem value="STAR">Star TSP</SelectItem>
                  <SelectItem value="GENERIC">Générique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="printer-interface">Interface</Label>
              <Select
                value={printerSettings.interface}
                onValueChange={(value) => {
                  const newSettings = { ...printerSettings, interface: value };
                  setPrinterSettings(newSettings);
                  saveSettings('printer', newSettings);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Interface" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USB">USB</SelectItem>
                  <SelectItem value="SERIAL">Série</SelectItem>
                  <SelectItem value="NETWORK">Réseau</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={testPrinter} variant="outline">
              <TestTube className="mr-2 h-4 w-4" />
              Test d'impression
            </Button>
          </div>

          {printerSettings.testResult && (
            <div className="mt-2">
              {getStatusBadge(printerSettings.testResult)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Raccourcis Clavier */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Keyboard className="mr-2 h-5 w-5" />
            Raccourcis Clavier
          </CardTitle>
          <CardDescription>
            Configuration des raccourcis clavier globaux
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="keyboard-enabled">Activer les raccourcis</Label>
            <Switch
              id="keyboard-enabled"
              checked={keyboardSettings.enabled}
              onCheckedChange={(checked) => {
                const newSettings = { ...keyboardSettings, enabled: checked };
                setKeyboardSettings(newSettings);
                saveSettings('keyboard', newSettings);
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="keyboard-sound">Sons des raccourcis</Label>
            <Switch
              id="keyboard-sound"
              checked={keyboardSettings.soundEnabled}
              onCheckedChange={(checked) => {
                const newSettings = { ...keyboardSettings, soundEnabled: checked };
                setKeyboardSettings(newSettings);
                saveSettings('keyboard', newSettings);
              }}
            />
          </div>

          <Button variant="outline">
            <Info className="mr-2 h-4 w-4" />
            Afficher l'aide des raccourcis
          </Button>
        </CardContent>
      </Card>

      {/* Configuration Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configuration du système de notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-enabled">Notifications activées</Label>
              <Switch
                id="notif-enabled"
                checked={notificationSettings.enabled}
                onCheckedChange={(checked) => {
                  const newSettings = { ...notificationSettings, enabled: checked };
                  setNotificationSettings(newSettings);
                  saveSettings('notification', newSettings);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notif-sound">Sons des notifications</Label>
              <Switch
                id="notif-sound"
                checked={notificationSettings.soundEnabled}
                onCheckedChange={(checked) => {
                  const newSettings = { ...notificationSettings, soundEnabled: checked };
                  setNotificationSettings(newSettings);
                  saveSettings('notification', newSettings);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="persistent-alerts">Alertes persistantes</Label>
              <Switch
                id="persistent-alerts"
                checked={notificationSettings.persistentAlerts}
                onCheckedChange={(checked) => {
                  const newSettings = { ...notificationSettings, persistentAlerts: checked };
                  setNotificationSettings(newSettings);
                  saveSettings('notification', newSettings);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="stock-alerts">Alertes stock faible</Label>
              <Switch
                id="stock-alerts"
                checked={notificationSettings.lowStockAlerts}
                onCheckedChange={(checked) => {
                  const newSettings = { ...notificationSettings, lowStockAlerts: checked };
                  setNotificationSettings(newSettings);
                  saveSettings('notification', newSettings);
                }}
              />
            </div>
          </div>

          <Button variant="outline">
            <TestTube className="mr-2 h-4 w-4" />
            Tester les notifications
          </Button>
        </CardContent>
      </Card>

      {/* Configuration Mode Kiosque */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Mode Kiosque
          </CardTitle>
          <CardDescription>
            Configuration du mode sécurisé pour l'utilisation publique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="kiosk-enabled">Mode kiosque</Label>
              <Switch
                id="kiosk-enabled"
                checked={kioskSettings.enabled}
                onCheckedChange={(checked) => {
                  const newSettings = { ...kioskSettings, enabled: checked };
                  setKioskSettings(newSettings);
                  saveSettings('kiosk', newSettings);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="kiosk-fullscreen">Plein écran automatique</Label>
              <Switch
                id="kiosk-fullscreen"
                checked={kioskSettings.fullscreen}
                onCheckedChange={(checked) => {
                  const newSettings = { ...kioskSettings, fullscreen: checked };
                  setKioskSettings(newSettings);
                  saveSettings('kiosk', newSettings);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="emergency-exit">Sortie d'urgence</Label>
              <Switch
                id="emergency-exit"
                checked={kioskSettings.emergencyExit}
                onCheckedChange={(checked) => {
                  const newSettings = { ...kioskSettings, emergencyExit: checked };
                  setKioskSettings(newSettings);
                  saveSettings('kiosk', newSettings);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="hide-cursor">Masquer le curseur</Label>
              <Switch
                id="hide-cursor"
                checked={kioskSettings.hideCursor}
                onCheckedChange={(checked) => {
                  const newSettings = { ...kioskSettings, hideCursor: checked };
                  setKioskSettings(newSettings);
                  saveSettings('kiosk', newSettings);
                }}
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline">
              <Shield className="mr-2 h-4 w-4" />
              Basculer le mode kiosque
            </Button>
            <Button variant="outline">
              <Monitor className="mr-2 h-4 w-4" />
              Plein écran
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Sauvegarde */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Sauvegarde Automatique
          </CardTitle>
          <CardDescription>
            Configuration des sauvegardes automatiques des données
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="backup-enabled">Sauvegarde automatique</Label>
            <Switch
              id="backup-enabled"
              checked={backupSettings.autoBackup}
              onCheckedChange={(checked) => {
                const newSettings = { ...backupSettings, autoBackup: checked };
                setBackupSettings(newSettings);
                saveSettings('backup', newSettings);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="backup-interval">Intervalle (minutes)</Label>
              <Select
                value={backupSettings.interval.toString()}
                onValueChange={(value) => {
                  const newSettings = { ...backupSettings, interval: parseInt(value) };
                  setBackupSettings(newSettings);
                  saveSettings('backup', newSettings);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60000">1 minute</SelectItem>
                  <SelectItem value="300000">5 minutes</SelectItem>
                  <SelectItem value="600000">10 minutes</SelectItem>
                  <SelectItem value="1800000">30 minutes</SelectItem>
                  <SelectItem value="3600000">1 heure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-backups">Nombre max de sauvegardes</Label>
              <Input
                id="max-backups"
                type="number"
                value={backupSettings.maxBackups}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 50;
                  const newSettings = { ...backupSettings, maxBackups: value };
                  setBackupSettings(newSettings);
                  saveSettings('backup', newSettings);
                }}
                min="1"
                max="200"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Créer une sauvegarde
            </Button>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Restaurer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
