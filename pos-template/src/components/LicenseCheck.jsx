import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Shield, Usb, RefreshCw, AlertTriangle } from 'lucide-react';
import { useLicense } from '../hooks/useLicense';

export default function LicenseCheck() {
  const { loading, error, retry } = useLicense(); // license, isValid unused for now
  const [usbDrives, setUsbDrives] = useState([]);
  const [detectingUSB, setDetectingUSB] = useState(false);
  const [requireUSB, setRequireUSB] = useState(null);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.getAppConfig()
      .then((config) => {
        setRequireUSB(config?.security?.requireUSBLicense === true);
      })
      .catch(() => {
        setRequireUSB(false);
      });
  }, []);

  const detectUSBDrives = async () => {
    if (!window.electronAPI) return;
    
    try {
      setDetectingUSB(true);
      const drives = await window.electronAPI.detectUSBDrives();
      setUsbDrives(drives);
    } catch (err) {
      console.error('Error detecting USB drives:', err);
    } finally {
      setDetectingUSB(false);
    }
  };

  const handleRetry = () => {
    retry();
  };

  const handleQuit = () => {
    if (window.electronAPI) {
      window.close();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-destructive/10 rounded-full w-fit">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Vérification de licence</CardTitle>
          <CardDescription>
            Une licence valide est requise pour utiliser ce système POS
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Vérification en cours...</p>
            </div>
          ) : (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error || 'Aucune licence valide trouvée'}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">Instructions :</h4>
                {requireUSB ? (
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Insérez la clé USB contenant votre licence</li>
                    <li>Cliquez sur "Détecter les clés USB" pour vérifier</li>
                    <li>Cliquez sur "Réessayer" pour valider la licence</li>
                  </ol>
                ) : (
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Cette licence est liée à cette machine</li>
                    <li>L'activation automatique est tentée au démarrage</li>
                    <li>Cliquez sur "Réessayer" pour relancer l'activation</li>
                  </ol>
                )}
              </div>

              {requireUSB && (
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={detectUSBDrives}
                    disabled={detectingUSB}
                  >
                    <Usb className={`mr-2 h-4 w-4 ${detectingUSB ? 'animate-spin' : ''}`} />
                    {detectingUSB ? 'Détection...' : 'Détecter les clés USB'}
                  </Button>

                  {usbDrives.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {usbDrives.length} clé(s) USB détectée(s)
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleQuit}
                >
                  Quitter
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleRetry}
                  disabled={loading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Réessayer
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

