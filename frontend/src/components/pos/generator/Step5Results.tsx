/**
 * Step 5: Generation Results
 * Shows the created licence + generated POS build, with binding-aware
 * activation instructions and download links.
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Download,
  Copy,
  Check,
  Monitor,
  Usb,
  HardDrive,
  KeyRound,
  Package,
} from 'lucide-react';
import { posService } from '../../../services';
import toast from 'react-hot-toast';

// e.g. "D:\...\pos-restaurant\dist\carthapos-restaurant.exe" -> "D:\...\pos-restaurant"
const getProjectDirectoryFromExecutablePath = (execPath: string) => {
  if (!execPath) return null;

  const parts = execPath.split(/[\\/]/);
  const distIndex = parts.findIndex((p) => p === 'dist');

  if (distIndex > 0) {
    const separator = execPath.includes('\\') ? '\\' : '/';
    return parts.slice(0, distIndex).join(separator);
  }

  const lastSepIndex = Math.max(execPath.lastIndexOf('\\'), execPath.lastIndexOf('/'));
  return execPath.substring(0, lastSepIndex);
};

// Binding-aware activation guidance.
//  - MACHINE: the licence is baked into the build, nothing to hand off.
//  - USB / HYBRID: the operator must carry license.key onto the USB drive.
const BINDING_INFO = {
  MACHINE: {
    icon: Monitor,
    label: 'Machine fixe',
    needsKeyFile: false,
    instruction:
      "La licence est intégrée à l'application et liée à cette machine. Aucune action requise : l'activation est automatique au premier lancement.",
  },
  USB: {
    icon: Usb,
    label: 'Clé USB',
    needsKeyFile: true,
    instruction:
      "Copiez le fichier license.key à la racine de la clé USB. Le POS ne s'active que lorsque cette clé est branchée sur la machine.",
  },
  HYBRID: {
    icon: HardDrive,
    label: 'Hybride (machine + USB)',
    needsKeyFile: true,
    instruction:
      "Copiez le fichier license.key à la racine de la clé USB. L'application ne démarre que sur la machine autorisée, avec la clé branchée.",
  },
} as const;

interface Step5ResultsProps {
  generationResult: any;
  selectedUSB?: string;
  bindingType?: string;
  onNewPOS: () => void;
}

export default function Step5Results({ generationResult, selectedUSB, bindingType, onNewPOS }: Step5ResultsProps) {
  const [buildStatus, setBuildStatus] = useState(
    generationResult?.posApplication?.buildStatus === 'source_ready'
      ? 'building'
      : generationResult?.posApplication?.buildStatus || 'completed'
  );
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  // 'source_ready' means a GitHub Actions build was triggered but the backend
  // only persists the real 'building' status asynchronously after the response.
  // Treat it as in-progress so the UI isn't blank and polling kicks in.
  const isBuilding = buildStatus === 'building' || buildStatus === 'source_ready';

  const resolvedBinding = (bindingType ||
    generationResult?.licenseFile?.payload?.bindingType ||
    generationResult?.license?.bindingType ||
    'MACHINE') as keyof typeof BINDING_INFO;
  const binding = BINDING_INFO[resolvedBinding] || BINDING_INFO.MACHINE;
  const BindingIcon = binding.icon;
  const showKeyDownload = binding.needsKeyFile && Boolean(generationResult?.licenseFile?.content);

  // Initialize download URL if executable path exists and build is completed
  useEffect(() => {
    if (
      generationResult?.posApplication?.buildStatus === 'building' ||
      generationResult?.posApplication?.buildStatus === 'source_ready'
    ) {
      return;
    }

    const licenseId = generationResult?.licenseId || generationResult?.license?.id;

    if (generationResult?.posApplication?.executablePath) {
      const projectDir = getProjectDirectoryFromExecutablePath(generationResult.posApplication.executablePath);
      setDownloadUrl(posService.getDownloadUrl(projectDir as string, licenseId));
      setBuildStatus('completed');
      setProgress(100);
    } else if (
      generationResult?.posApplication?.path &&
      generationResult?.posApplication?.buildStatus === 'completed'
    ) {
      setDownloadUrl(posService.getDownloadUrl(generationResult.posApplication.path, licenseId));
      setBuildStatus('completed');
      setProgress(100);
    }
  }, [generationResult]);

  // Auto-trigger download when URL is ready and build is completed
  useEffect(() => {
    if (buildStatus === 'completed' && downloadUrl && !downloadStarted && downloadLinkRef.current) {
      setDownloadStarted(true);
      setTimeout(() => {
        downloadLinkRef.current?.click();
        toast.success('Téléchargement démarré');
      }, 500);
    }
  }, [buildStatus, downloadUrl, downloadStarted]);

  // Timer for elapsed time and progress simulation while building
  useEffect(() => {
    if (isBuilding) {
      const ESTIMATED_TIME = 480; // seconds

      const timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
        setProgress((prev) => (prev >= 95 ? 95 : prev + 100 / ESTIMATED_TIME));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isBuilding, buildStatus]);

  // Auto-poll build status
  useEffect(() => {
    if (isBuilding) {
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
            toast.success('La construction est terminée');
          } else if (status.status === 'failed') {
            setBuildStatus('failed');
            toast.error('La construction a échoué');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [isBuilding, generationResult]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(generationResult.license.licenseKey);
      setCopied(true);
      toast.success('Clé copiée');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier la clé');
    }
  };

  if (!generationResult) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
            <CheckCircle className="size-4" />
          </span>
          Génération terminée
        </CardTitle>
        <CardDescription>
          Le système POS et sa licence ont été générés avec succès.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Licence */}
        {generationResult.license && (
          <section className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <KeyRound className="size-4 text-muted-foreground" />
                Licence
              </div>
              <Badge variant="neutral" className="gap-1">
                <BindingIcon className="size-3" />
                {binding.label}
              </Badge>
            </div>

            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-muted-foreground">Clé de licence</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/50 px-2.5 py-1.5 font-mono text-xs text-foreground">
                  {generationResult.license.licenseKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={copyKey}
                  aria-label="Copier la clé de licence"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>

            {showKeyDownload ? (
              <div className="mt-3 space-y-2">
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(generationResult.licenseFile.content)}`}
                  download="license.key"
                  className="inline-block"
                >
                  <Button variant="outline" size="sm">
                    <Download className="size-4" />
                    Télécharger license.key
                  </Button>
                </a>
                <p className="flex gap-1.5 text-xs text-muted-foreground">
                  <BindingIcon className="mt-0.5 size-3.5 shrink-0" />
                  <span>{binding.instruction}</span>
                </p>
              </div>
            ) : (
              <p className="mt-3 flex gap-1.5 text-xs text-muted-foreground">
                <BindingIcon className="mt-0.5 size-3.5 shrink-0" />
                <span>{binding.instruction}</span>
              </p>
            )}
          </section>
        )}

        {/* POS application build */}
        {generationResult.posApplication && (
          <section className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Package className="size-4 text-muted-foreground" />
                Application POS
              </div>
              {isBuilding && <Badge variant="info">Construction…</Badge>}
              {buildStatus === 'failed' && <Badge variant="destructive">Échec</Badge>}
              {buildStatus === 'completed' && downloadUrl && <Badge variant="success">Prête</Badge>}
            </div>

            <div className="mt-3">
              {isBuilding && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    <span>Construction sur GitHub Actions — {Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    <span>Temps écoulé {formatTime(elapsedTime)} · ~8 min estimées</span>
                  </div>
                  <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    Le bouton de téléchargement apparaîtra ici automatiquement. Vous pouvez
                    quitter cette page, la construction continue en arrière-plan.
                  </p>
                </div>
              )}

              {buildStatus === 'failed' && (
                <div className="flex gap-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    La construction a échoué. Consultez les logs GitHub Actions ou contactez
                    le support.
                  </span>
                </div>
              )}

              {buildStatus === 'completed' && downloadUrl && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Build terminé. Le téléchargement démarre automatiquement.
                  </p>

                  {/* Hidden link used for the automatic download trigger */}
                  <a ref={downloadLinkRef} href={downloadUrl} download className="hidden" />

                  <a href={downloadUrl} download className="block">
                    <Button
                      className="w-full"
                      onClick={() => toast.success('Téléchargement démarré')}
                    >
                      <Download className="size-4" />
                      Télécharger l&apos;installateur
                    </Button>
                  </a>

                  <p className="text-xs text-muted-foreground">
                    Le fichier reste stocké sur nos serveurs et peut être retéléchargé à tout
                    moment depuis « Mes Projets ».
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* USB write confirmation (only when a USB target was used) */}
        {selectedUSB && (
          <section className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Usb className="size-4 text-muted-foreground" />
              Clé USB
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Le fichier de licence a été écrit sur la clé USB sélectionnée ({selectedUSB}).
            </p>
          </section>
        )}
      </CardContent>

      <CardFooter className="border-t">
        <Button onClick={onNewPOS}>Nouveau POS</Button>
      </CardFooter>
    </Card>
  );
}
