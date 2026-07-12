import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { CheckCircle, Download, Loader2, Clock } from 'lucide-react';
import { posService } from '../../../services';
import toast from 'react-hot-toast';

const getProjectDirectoryFromExecutablePath = (execPath: string) => {
  if (!execPath) return null;
  const parts = execPath.split(/[\\\/]/);
  const distIndex = parts.findIndex(p => p === 'dist');
  if (distIndex > 0) {
    const separator = execPath.includes('\\') ? '\\' : '/';
    return parts.slice(0, distIndex).join(separator);
  }
  const separator = execPath.includes('\\') ? '\\' : '/';
  const lastSepIndex = Math.max(execPath.lastIndexOf('\\'), execPath.lastIndexOf('/'));
  return execPath.substring(0, lastSepIndex);
};

interface Step5ResultsProps {
  generationResult: any;
  selectedUSB: string;
  onNewPOS: () => void;
}

export default function Step5Results({ generationResult, selectedUSB, onNewPOS }: Step5ResultsProps) {
  const [buildStatus, setBuildStatus] = useState(generationResult?.posApplication?.buildStatus || 'completed');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const licenseIdRef = useRef(generationResult?.licenseId || generationResult?.license?.id);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (generationResult?.posApplication?.buildStatus === 'building') return;

    const licenseId = generationResult?.licenseId || generationResult?.license?.id;

    if (generationResult?.posApplication?.executablePath) {
      const projectDir = getProjectDirectoryFromExecutablePath(generationResult.posApplication.executablePath);
      setDownloadUrl(posService.getDownloadUrl(projectDir, licenseId));
      setBuildStatus('completed');
      setProgress(100);
    } else if (generationResult?.posApplication?.path && generationResult?.posApplication?.buildStatus === 'completed') {
      setDownloadUrl(posService.getDownloadUrl(generationResult.posApplication.path, licenseId));
      setBuildStatus('completed');
      setProgress(100);
    }
  }, [generationResult]);

  useEffect(() => {
    if (buildStatus === 'completed' && downloadUrl && !downloadStarted && downloadLinkRef.current) {
      setDownloadStarted(true);
      setTimeout(() => {
        downloadLinkRef.current?.click();
        toast.success('Téléchargement démarré!');
      }, 500);
    }
  }, [buildStatus, downloadUrl, downloadStarted]);

  useEffect(() => {
    if (buildStatus === 'building') {
      const ESTIMATED_TIME = 480;
      const timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        setProgress(prev => {
          if (prev >= 95) return 95;
          return prev + (100 / ESTIMATED_TIME);
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [buildStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (buildStatus === 'building') {
      const interval = setInterval(async () => {
        try {
          const licenseId = generationResult.licenseId || generationResult.license?.id;
          if (!licenseId) return;
          const status = await posService.getBuildStatus(licenseId);
          if (status.status === 'completed') {
            setBuildStatus('completed');
            setProgress(100);
            if (status.downloadPath) {
              setDownloadUrl(posService.getDownloadUrl(status.downloadPath, licenseId));
            }
            toast.success('Le build est terminé avec succès !');
          } else if (status.status === 'failed') {
            setBuildStatus('failed');
            toast.error('La construction a échoué.');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [buildStatus, generationResult]);

  if (!generationResult) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
          Génération terminée
        </CardTitle>
        <CardDescription>Votre système POS a été généré avec succès</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {generationResult.license && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Licence créée</h3>
              <p className="text-sm text-green-700 mb-3">
                Clé de licence: <code className="bg-green-100 px-2 py-1 rounded font-bold">{generationResult.license.licenseKey}</code>
              </p>
              {generationResult.licenseFile && (
                <div className="mt-2">
                  <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(generationResult.licenseFile.content)}`} download="license.key">
                    <Button size="sm" variant="outline" className="bg-white border-green-300 text-green-700 hover:bg-green-50">
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger le fichier license.key
                    </Button>
                  </a>
                  <p className="text-xs text-green-600 mt-2">⚠️ Copiez ce fichier sur votre clé USB pour activer le POS.</p>
                </div>
              )}
            </div>
          )}

          {generationResult.posApplication && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Application POS</h3>

              {buildStatus === 'building' && (
                <>
                  <div className="flex items-center space-x-2 text-sm text-blue-700 mb-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Construction en cours sur GitHub Actions ({Math.round(progress)}%)</span>
                  </div>
                  <Progress value={progress} className="w-full h-2 mb-3" />
                  <div className="flex items-center space-x-2 text-sm text-blue-600 mb-3">
                    <Clock className="h-4 w-4" />
                    <span>Temps écoulé: {formatTime(elapsedTime)} / 8 minutes estimées</span>
                  </div>
                  <div className="mt-4 p-3 bg-white bg-opacity-50 rounded border border-blue-100">
                    <p className="text-sm text-blue-800 font-medium mb-1">Le bouton de téléchargement apparaîtra automatiquement ici une fois la construction terminée.</p>
                    <p className="text-xs text-blue-600">Vous pouvez quitter cette page, la construction continuera en arrière-plan.</p>
                  </div>
                </>
              )}

              {buildStatus === 'failed' && (
                <div className="flex items-center space-x-2 text-sm text-red-700 mb-3">
                  <span>❌ La construction a échoué. Veuillez vérifier les logs ou contacter le support.</span>
                </div>
              )}

              {buildStatus === 'completed' && downloadUrl && (
                <>
                  <p className="text-sm text-blue-700 mb-3">✅ Build terminé! Le téléchargement devrait démarrer automatiquement.</p>
                  <Progress value={100} className="w-full h-2 mb-3" />
                  <a ref={downloadLinkRef} href={downloadUrl} download style={{ display: 'none' }} />
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800 font-medium mb-2">Si le téléchargement ne démarre pas automatiquement:</p>
                      <a href={downloadUrl} download>
                        <Button variant="outline" size="sm" className="bg-white hover:bg-green-50 text-green-700 border-green-200 w-full"
                          onClick={() => toast.success('Téléchargement manuel démarré!')}>
                          <Download className="mr-2 h-4 w-4" />Cliquez ici pour télécharger
                        </Button>
                      </a>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-3">💾 Le fichier reste stocké sur nos serveurs. Vous pouvez le télécharger à tout moment.</p>
                </>
              )}
            </div>
          )}

          {selectedUSB && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-medium text-purple-800 mb-2">Clé USB</h3>
              <p className="text-sm text-purple-700">Le fichier de licence a été écrit sur la clé USB sélectionnée</p>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Button onClick={onNewPOS}>Nouveau POS</Button>
        </div>
      </CardContent>
    </Card>
  );
}
