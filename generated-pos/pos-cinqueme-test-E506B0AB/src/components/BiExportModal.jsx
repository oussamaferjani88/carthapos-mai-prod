import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Download, FileArchive, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';
import { Card, CardContent } from './ui/card';

const EXPORT_STEPS = {
  IDLE: 'idle',
  CONFIRMING: 'confirming',
  EXPORTING: 'exporting',
  DONE: 'done',
  ERROR: 'error'
};

export default function BiExportModal({ open, onOpenChange }) {
  const [step, setStep] = useState(EXPORT_STEPS.IDLE);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setStep(EXPORT_STEPS.IDLE);
      setProgress(0);
      setResult(null);
      setError(null);
    }
  }, [open]);

  const handleExport = async () => {
    setStep(EXPORT_STEPS.EXPORTING);
    setProgress(10);

    if (!window.electronAPI || !window.electronAPI.exportBiData) {
      setStep(EXPORT_STEPS.ERROR);
      setError('API d\'export non disponible. Utilisez l\'application Electron.');
      return;
    }

    try {
      setProgress(30);
      const res = await window.electronAPI.exportBiData();

      setProgress(100);
      setResult(res);
      setStep(EXPORT_STEPS.DONE);
    } catch (err) {
      console.error('BI Export error:', err);
      setStep(EXPORT_STEPS.ERROR);
      setError(err.message || 'Erreur lors de l\'export BI');
    }
  };

  const openFileLocation = () => {
    if (result && result.filePath) {
      if (window.electronAPI && window.electronAPI.invoke) {
        window.electronAPI.invoke('shell:showItemInFolder', result.filePath).catch(console.error);
      }
    }
  };

  const reset = () => {
    setStep(EXPORT_STEPS.IDLE);
    setProgress(0);
    setResult(null);
    setError(null);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === EXPORT_STEPS.IDLE || step === EXPORT_STEPS.CONFIRMING ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileArchive className="h-5 w-5 text-primary" />
                Export BI — Données pour analyse
              </DialogTitle>
              <DialogDescription>
                Génère un fichier ZIP contenant les données structurées de votre POS,
                prêt pour ingestion dans un système BI (ETL).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <p className="text-sm font-medium">Fichiers inclus dans l'export :</p>
              <div className="grid grid-cols-2 gap-2">
                {['sales.csv', 'products.csv', 'customers.csv', 'inventory.csv', 'tables.csv (si activé)', 'kitchen_orders.csv (si activé)', 'suppliers.csv (si activé)', 'metadata.json'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{f}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground"> Confidentialité</p>
                <p>Toutes les données restent sur votre machine. Aucun transfert externe.</p>
                <p>Filtrage automatique selon les modules activés dans votre licence.</p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Générer l'export
              </Button>
            </DialogFooter>
          </>
        ) : step === EXPORT_STEPS.EXPORTING ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Export en cours...
              </DialogTitle>
              <DialogDescription>
                Collecte des données et génération du fichier ZIP.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-4">
              <Progress value={progress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                {progress < 50 ? 'Extraction des données...' : 'Génération du fichier ZIP...'}
              </p>
            </div>
          </>
        ) : step === EXPORT_STEPS.DONE ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Export terminé
              </DialogTitle>
              <DialogDescription>
                Le fichier BI est prêt pour l'ingestion.
              </DialogDescription>
            </DialogHeader>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fichier</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {result?.fileName || 'bi_export.zip'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taille</span>
                  <span className="text-sm">{formatSize(result?.fileSize)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Lignes exportées</span>
                  <span className="text-sm">{result?.stats?.total_rows ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fichiers</span>
                  <span className="text-sm">{result?.stats?.files?.length ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Emplacement</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {result?.filePath || ''}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 space-y-1">
              <p className="font-medium"> Prochaine étape</p>
              <p>Importez ce fichier ZIP dans votre portail BI pour générer des tableaux de bord.</p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={reset}>
                Nouvel export
              </Button>
              <Button onClick={openFileLocation}>
                <FileText className="mr-2 h-4 w-4" />
                Voir le fichier
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Erreur d'export
              </DialogTitle>
              <DialogDescription>
                L'export BI n'a pas pu être généré.
              </DialogDescription>
            </DialogHeader>

            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <p className="text-sm text-red-700">{error || 'Erreur inconnue'}</p>
              </CardContent>
            </Card>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              <Button onClick={handleExport}>
                <Loader2 className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
