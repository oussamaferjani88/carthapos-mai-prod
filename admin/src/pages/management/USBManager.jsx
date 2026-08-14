import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { 
  Usb, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  HardDrive,
  FileText,
  Download
} from 'lucide-react';
import { usbApi, licensesApi } from '../../lib/api';
import toast from 'react-hot-toast';

export default function USBManager() {
  const [usbDrives, setUsbDrives] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verificationResults, setVerificationResults] = useState({});

  useEffect(() => {
    loadLicenses();
    detectUSBDrives();
  }, []);

  const loadLicenses = async () => {
    try {
      const response = await licensesApi.getAll();
      setLicenses(response.data);
    } catch (error) {
      console.error('Error loading licenses:', error);
      toast.error('Erreur lors du chargement des licences');
    }
  };

  const detectUSBDrives = async () => {
    try {
      setLoading(true);
      const response = await usbApi.getDrives();
      setUsbDrives(response.data.drives);
      
      if (response.data.drives.length === 0) {
        toast.error('Aucune clé USB détectée');
      } else {
        toast.success(`${response.data.drives.length} clé(s) USB détectée(s)`);
      }
    } catch (error) {
      console.error('Error detecting USB drives:', error);
      toast.error('Erreur lors de la détection des clés USB');
    } finally {
      setLoading(false);
    }
  };

  const verifyLicenseOnUSB = async (drivePath) => {
    try {
      const response = await usbApi.verifyLicense(drivePath);
      setVerificationResults(prev => ({
        ...prev,
        [drivePath]: {
          status: 'found',
          content: response.data.content,
          path: response.data.path
        }
      }));
      toast.success('Fichier de licence trouvé sur la clé USB');
    } catch (error) {
      setVerificationResults(prev => ({
        ...prev,
        [drivePath]: {
          status: 'not_found',
          error: error.response?.data?.error || 'Fichier de licence non trouvé'
        }
      }));
      toast.error('Aucun fichier de licence trouvé sur cette clé USB');
    }
  };

  const writeLicenseToUSB = async (drivePath, license) => {
    try {
      // Générer le fichier de licence
      const licenseFileResponse = await licensesApi.generateFile(license.id);
      console.log("License file response:", licenseFileResponse.data); // Debug log
      
      // Écrire sur la clé USB
      await usbApi.writeLicense({
        drivePath: drivePath,
        licenseContent: licenseFileResponse.data.content,
        licenseKey: license.licenseKey
      });
      
      toast.success(`Licence ${license.licenseKey} écrite sur la clé USB`);
      
      // Vérifier immédiatement après l'écriture
      await verifyLicenseOnUSB(drivePath);
    } catch (error) {
      console.error('Error writing license to USB:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de l\'écriture sur la clé USB');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getVerificationBadge = (drivePath) => {
    const result = verificationResults[drivePath];
    if (!result) return null;
    
    if (result.status === 'found') {
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Licence trouvée</Badge>;
    } else {
      return <Badge variant="secondary"><AlertCircle className="mr-1 h-3 w-3" />Aucune licence</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Gestion USB</h1>
          <p className="text-muted-foreground">
            Gérez les clés USB et les fichiers de licence
          </p>
        </div>
        <Button onClick={detectUSBDrives} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Détecter les clés USB
        </Button>
      </div>

      <Alert>
        <Usb className="h-4 w-4" />
        <AlertDescription>
          Branchez une clé USB et cliquez sur "Détecter les clés USB" pour commencer. 
          Vous pourrez ensuite écrire des fichiers de licence ou vérifier les licences existantes.
        </AlertDescription>
      </Alert>

      {/* Liste des clés USB */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HardDrive className="mr-2 h-5 w-5" />
            Clés USB détectées ({usbDrives.length})
          </CardTitle>
          <CardDescription>
            Clés USB disponibles sur le système
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usbDrives.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Usb className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune clé USB détectée</h3>
              <p className="mb-4">
                Branchez une clé USB et cliquez sur "Détecter les clés USB"
              </p>
              <Button variant="outline" onClick={detectUSBDrives} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Détecter maintenant
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {usbDrives.map((drive, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Usb className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium">{drive.label}</h3>
                        <p className="text-sm text-muted-foreground">{drive.path}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatBytes(drive.freeSpace)} / {formatBytes(drive.size)}
                      </p>
                      <p className="text-xs text-muted-foreground">libre / total</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getVerificationBadge(drive.path)}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verifyLicenseOnUSB(drive.path)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Vérifier licence
                      </Button>
                      
                      {licenses.length > 0 && (
                        <select
                          className="px-3 py-1 border rounded text-sm"
                          onChange={(e) => {
                            if (e.target.value) {
                              const license = licenses.find(l => l.id === e.target.value);
                              if (license) {
                                writeLicenseToUSB(drive.path, license);
                              }
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">Écrire une licence...</option>
                          {licenses.map((license) => (
                            <option key={license.id} value={license.id}>
                              {license.licenseKey} - {license.client.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  
                  {/* Résultat de vérification */}
                  {verificationResults[drive.path] && (
                    <div className="mt-3 p-3 bg-muted rounded">
                      {verificationResults[drive.path].status === 'found' ? (
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-1">
                            ✅ Fichier de licence trouvé
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Chemin: {verificationResults[drive.path].path}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-orange-700 mb-1">
                            ⚠️ {verificationResults[drive.path].error}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des licences disponibles */}
      {licenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Licences disponibles ({licenses.length})
            </CardTitle>
            <CardDescription>
              Licences pouvant être écrites sur une clé USB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {licenses.map((license) => (
                <div key={license.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm">{license.client.name}</h3>
                    <Badge variant={license.isActive ? "default" : "secondary"}>
                      {license.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {license.licenseKey}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {license.sector} • {license.licenseType === 'LIFETIME' ? 'À vie' : 'Abonnement'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

