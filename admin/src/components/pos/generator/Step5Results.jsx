/**
 * Step 5: Generation Results
 * Display generation results with download links
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { CheckCircle, Download, Loader2, Clock, Trash2 } from 'lucide-react';
import { posService } from '../../../services';
import toast from 'react-hot-toast';

// Utility to extract project directory from executable path
// e.g., "D:\...\pos-restaurant\dist\carthapos-restaurant.exe" -> "D:\...\pos-restaurant"
const getProjectDirectoryFromExecutablePath = (execPath) => {
  if (!execPath) return null;
  
  // Check if path contains 'dist' directory (Windows or Unix paths)
  const parts = execPath.split(/[\\\/]/);
  const distIndex = parts.findIndex(p => p === 'dist');
  
  if (distIndex > 0) {
    // Found dist/ - project dir is the parent
    // Detect path separator from original path
    const separator = execPath.includes('\\') ? '\\' : '/';
    return parts.slice(0, distIndex).join(separator);
  }
  
  // Fallback: return parent directory
  const separator = execPath.includes('\\') ? '\\' : '/';
  const lastSepIndex = Math.max(execPath.lastIndexOf('\\'), execPath.lastIndexOf('/'));
  return execPath.substring(0, lastSepIndex);
};

export default function Step5Results({ generationResult, selectedUSB, onNewPOS }) {
  const [buildStatus, setBuildStatus] = useState(generationResult?.posApplication?.buildStatus || 'completed');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  // Ref to track if unmount cleanup should happen (only if we did a build)
  const shouldCleanupRef = useRef(false);
  const licenseIdRef = useRef(generationResult?.licenseId || generationResult?.license?.id);

  // Initialize download URL if executable path exists and build is completed
  useEffect(() => {
    // If explicitly building, don't auto-complete
    if (generationResult?.posApplication?.buildStatus === 'building') {
      shouldCleanupRef.current = true; // Mark for cleanup
      return;
    }

    if (generationResult?.posApplication?.executablePath) {
      // Extract directory from executable path for download endpoint
      const projectDir = getProjectDirectoryFromExecutablePath(generationResult.posApplication.executablePath);
      setDownloadUrl(posService.getDownloadUrl(projectDir));
      setBuildStatus('completed');
      setProgress(100);
      shouldCleanupRef.current = true;
    } else if (generationResult?.posApplication?.path && generationResult?.posApplication?.buildStatus === 'completed') {
      setDownloadUrl(posService.getDownloadUrl(generationResult.posApplication.path));
      setBuildStatus('completed');
      setProgress(100);
      shouldCleanupRef.current = true;
    }
  }, [generationResult]);
  
  // Timer for elapsed time and progress simulation
  useEffect(() => {
    if (buildStatus === 'building') {
      const ESTIMATED_TIME = 480; // 8 minutes in seconds
      
      const timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        setProgress(prev => {
          // Cap at 95% until actually done
          if (prev >= 95) return 95;
          return prev + (100 / ESTIMATED_TIME);
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [buildStatus]);
  
  // Cleanup on unmount (delete .exe/folder)
  useEffect(() => {
    return () => {
      if (shouldCleanupRef.current && licenseIdRef.current) {
        console.log('🧹 Navigating away - cleaning up build artifacts...');
        posService.cleanupBuild(licenseIdRef.current).catch(err => console.error('Cleanup failed:', err));
      }
    };
  }, []);
  
  // Format elapsed time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-poll status
  useEffect(() => {
    if (buildStatus === 'building') {
      const interval = setInterval(async () => {
        try {
          const licenseId = generationResult.licenseId || generationResult.license?.id;
          if (!licenseId) return;

          const status = await posService.getBuildStatus(licenseId);
          console.log('Poll status:', status);
          
          if (status.status === 'completed') {
            setBuildStatus('completed');
            setProgress(100);
            if (status.downloadPath) {
              setDownloadUrl(posService.getDownloadUrl(status.downloadPath));
            }
            toast.success('Le build est terminé avec succès !');
          } else if (status.status === 'failed') {
            setBuildStatus('failed');
            toast.error('La construction a échoué.');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 15000); // Poll every 15 seconds

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
        <CardDescription>
          Votre système POS a été généré avec succès
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {/* License Info */}
          {generationResult.license && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Licence créée</h3>
              <p className="text-sm text-green-700 mb-3">
                Clé de licence: <code className="bg-green-100 px-2 py-1 rounded font-bold">
                  {generationResult.license.licenseKey}
                </code>
              </p>

              {/* License File Download */}
              {generationResult.licenseFile && (
                <div className="mt-2">
                  <a
                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(generationResult.licenseFile.content)}`}
                    download="license.key"
                  >
                    <Button size="sm" variant="outline" className="bg-white border-green-300 text-green-700 hover:bg-green-50">
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger le fichier license.key
                    </Button>
                  </a>
                  <p className="text-xs text-green-600 mt-2">
                    ⚠️ Copiez ce fichier sur votre clé USB pour activer le POS.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* POS Application Info */}
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
                    <p className="text-sm text-blue-800 font-medium mb-1">
                       Le bouton de téléchargement apparaîtra automatiquement ici une fois la construction terminée.
                    </p>
                    <p className="text-xs text-blue-600">
                      Vous pouvez quitter cette page, la construction continuera. Le fichier sera supprimé automatiquement après que vous ayez quitté la page une fois le téléchargement terminé.
                    </p>
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
                   <p className="text-sm text-blue-700 mb-3">
                     ✅ Build terminé! Vous pouvez télécharger l'application maintenant.
                   </p>
                   
                   <Progress value={100} className="w-full h-2 mb-3" />
                  
                  <a href={downloadUrl} download>
                    <Button variant="outline" size="sm" className="bg-white hover:bg-green-50 text-green-700 border-green-200">
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger l'application
                    </Button>
                  </a>
                  <p className="text-xs text-blue-600 mt-2">
                    ⚠️ Important : Le fichier d'installation sera supprimé de nos serveurs dès que vous quitterez cette page pour économiser de l'espace. Assurez-vous de le télécharger maintenant.
                  </p>
                </>
              )}
            </div>
          )}

          {/* USB Info */}
          {selectedUSB && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-medium text-purple-800 mb-2">Clé USB</h3>
              <p className="text-sm text-purple-700">
                Le fichier de licence a été écrit sur la clé USB sélectionnée
              </p>
            </div>
          )}


        </div>

        {/* New POS Button */}
        <div className="flex space-x-2">
          <Button onClick={onNewPOS}>
            Nouveau POS
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
