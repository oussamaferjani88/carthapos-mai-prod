import { useState, useCallback, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, FileCheck, Eye, Settings, GitCompare,
  Network, Database, CheckCircle2, Loader2, Lock,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import Step2Validation from '../../pages/wizard/Step2Validation';
import Step3RawPreview from '../../pages/wizard/Step3RawPreview';
import Step4Preparation from '../../pages/wizard/Step4Preparation';
import Step5TransformationPreview from '../../pages/wizard/Step5TransformationPreview';
import Step6DimensionalModel from '../../pages/wizard/Step6DimensionalModel';
import Step7LoadConfirm from '../../pages/wizard/Step7LoadConfirm';

const ETL_STEPS = [
  { id: 2, label: 'Validation', icon: FileCheck },
  { id: 3, label: 'Aperçu brut', icon: Eye },
  { id: 4, label: 'Préparation', icon: Settings },
  { id: 5, label: 'Avant / Après', icon: GitCompare },
  { id: 6, label: 'Modèle dimensionnel', icon: Network },
  { id: 7, label: 'Chargement', icon: Database },
];

export default function EtlStepsWorkflow({ upload, enabled, onRefresh }) {
  const uploadId = upload?.id;
  const [currentStep, setCurrentStep] = useState(2);
  const [wizardData, setWizardData] = useState({});
  const [finished, setFinished] = useState(false);

  const status = upload?.status;
  const job = upload?.processingJob;
  const jobStatus = job?.status;
  const running =
    ['VALIDATING', 'PROCESSING'].includes(status) ||
    ['QUEUED', 'RUNNING', 'PROCESSING'].includes(jobStatus);

  useEffect(() => {
    if (!uploadId) return;
    if (status === 'COMPLETED') {
      setFinished(true);
      return;
    }
    const stepByStatus = { UPLOADED: 2, VALIDATING: 2, QUEUED: 2, VALIDATED: 3, PREPARED: 5, FAILED: 2 };
    setCurrentStep(stepByStatus[status] || 2);
  }, [uploadId, status]);

  const goToStep = useCallback((step) => setCurrentStep(step), []);
  const handleBack = useCallback(() => {
    if (currentStep > 2) setCurrentStep((s) => s - 1);
  }, [currentStep]);
  const handleNext = useCallback(() => {
    if (currentStep < 7) setCurrentStep((s) => s + 1);
  }, [currentStep]);
  const updateWizardData = useCallback((data) => setWizardData((prev) => ({ ...prev, ...data })), []);

  const handleEtlFinished = useCallback(() => {
    setFinished(true);
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  if (!uploadId) return null;

  if (finished || status === 'COMPLETED') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-green-700 font-medium">
          <CheckCircle2 className="h-5 w-5" /> ETL terminé
        </div>
        <p className="text-sm text-green-700">
          Les données ont été chargées dans l'entrepôt. Vous pouvez maintenant préparer le dashboard.
        </p>
      </div>
    );
  }

  if (running) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-blue-700 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">Traitement ETL en cours</p>
          <p className="text-xs text-blue-700 mt-1">Le pipeline traite les données en arrière-plan. Cette page se rafraîchit automatiquement.</p>
        </div>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">Traitement des données non disponible</p>
          <p className="text-xs text-amber-700 mt-1">
            Approuvez la demande pour activer le traitement ETL étape par étape.
          </p>
        </div>
      </div>
    );
  }

  const stepProps = { uploadId, wizardData, updateWizardData, onNext: handleNext, onBack: handleBack, goToStep };

  return (
    <div className="space-y-4">
      <div className="flex items-center overflow-x-auto pb-1">
        {ETL_STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap',
                currentStep === step.id
                  ? 'bg-primary text-primary-foreground'
                  : currentStep > step.id
                    ? 'bg-green-100 text-green-700'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              <step.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {idx < ETL_STEPS.length - 1 && (
              <div className={cn('h-0.5 w-6 mx-1 shrink-0', currentStep > step.id ? 'bg-green-400' : 'bg-muted')} />
            )}
          </div>
        ))}
      </div>

      <div className="min-h-[300px]">
        {currentStep === 2 && <Step2Validation {...stepProps} />}
        {currentStep === 3 && <Step3RawPreview {...stepProps} />}
        {currentStep === 4 && <Step4Preparation {...stepProps} />}
        {currentStep === 5 && <Step5TransformationPreview {...stepProps} />}
        {currentStep === 6 && <Step6DimensionalModel {...stepProps} />}
        {currentStep === 7 && <Step7LoadConfirm {...stepProps} nextLabel="ETL terminé" onNext={handleEtlFinished} />}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={handleBack} disabled={currentStep === 2}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
        </Button>
        {currentStep === 6 && (
          <Button size="sm" onClick={handleNext}>
            Continuer <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
