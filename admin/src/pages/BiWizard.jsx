import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Upload, FileCheck, Eye, Settings, GitCompare, Network, Database, LayoutDashboard, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import api from '../lib/api';
import Step1Upload from './wizard/Step1Upload';
import Step2Validation from './wizard/Step2Validation';
import Step3RawPreview from './wizard/Step3RawPreview';
import Step4Preparation from './wizard/Step4Preparation';
import Step5TransformationPreview from './wizard/Step5TransformationPreview';
import Step6DimensionalModel from './wizard/Step6DimensionalModel';
import Step7LoadConfirm from './wizard/Step7LoadConfirm';
import Step8Dashboard from './wizard/Step8Dashboard';
import Step9Success from './wizard/Step9Success';

const STEPS = [
  { id: 1, label: 'Téléversement', icon: Upload },
  { id: 2, label: 'Validation', icon: FileCheck },
  { id: 3, label: 'Aperçu brut', icon: Eye },
  { id: 4, label: 'Préparation', icon: Settings },
  { id: 5, label: 'Avant / Après', icon: GitCompare },
  { id: 6, label: 'Modèle dimensionnel', icon: Network },
  { id: 7, label: 'Chargement', icon: Database },
  { id: 8, label: 'Choisir le dashboard', icon: LayoutDashboard },
  { id: 9, label: 'Rapport', icon: Flag },
];

export default function BiWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadId, setUploadId] = useState(null);
  const [wizardData, setWizardData] = useState({});
  const [resuming, setResuming] = useState(false);

  const goToStep = useCallback((step) => {
    setCurrentStep(step);
    window.scrollTo(0, 0);
  }, []);

  // Resume from /bi-wizard?uploadId=<id> → jump to the first incomplete step
  // based on the upload status (plan §5 "BiWizard resume").
  useEffect(() => {
    const paramId = searchParams.get('uploadId');
    if (!paramId) return;
    let cancelled = false;
    setResuming(true);
    setUploadId(paramId);
    api.get(`/bi-uploads/${paramId}`)
      .then((res) => {
        if (cancelled) return;
        const status = res.data?.status || res.data?.data?.status;
        const stepByStatus = {
          UPLOADED: 2,
          VALIDATING: 2,
          QUEUED: 2,
          VALIDATED: 3,
          PREPARED: 5,
          COMPLETED: 8,
          FAILED: 2,
        };
        const step = stepByStatus[status] || 2;
        goToStep(step);
      })
      .catch((error) => {
        console.error('Failed to resume BI wizard:', error);
        goToStep(2);
      })
      .finally(() => {
        if (!cancelled) setResuming(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, goToStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const handleNext = useCallback(() => {
    if (currentStep < 9) goToStep(currentStep + 1);
  }, [currentStep, goToStep]);

  const handleUploadComplete = useCallback((id) => {
    setUploadId(id);
    goToStep(2);
  }, [goToStep]);

  const handleFinish = useCallback(() => {
    navigate('/bi-upload-portal');
  }, [navigate]);

  const updateWizardData = useCallback((data) => {
    setWizardData(prev => ({ ...prev, ...data }));
  }, []);

  const stepProps = { uploadId, wizardData, updateWizardData, onNext: handleNext, onBack: handleBack, goToStep };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Assistant d'import BI</CardTitle>
        </CardHeader>
        <CardContent>
          {resuming && (
            <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Reprise de l'import {uploadId} — positionnement sur la première étape incomplète...
            </div>
          )}
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                  currentStep === step.id
                    ? 'bg-primary text-primary-foreground'
                    : currentStep > step.id
                    ? 'bg-green-100 text-green-700'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <step.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 w-6 mx-1 ${
                    currentStep > step.id ? 'bg-green-400' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="min-h-[400px]">
        {currentStep === 1 && <Step1Upload onComplete={handleUploadComplete} />}
        {currentStep === 2 && <Step2Validation {...stepProps} />}
        {currentStep === 3 && <Step3RawPreview {...stepProps} />}
        {currentStep === 4 && <Step4Preparation {...stepProps} />}
        {currentStep === 5 && <Step5TransformationPreview {...stepProps} />}
        {currentStep === 6 && <Step6DimensionalModel {...stepProps} />}
        {currentStep === 7 && <Step7LoadConfirm {...stepProps} />}
        {currentStep === 8 && <Step8Dashboard {...stepProps} />}
        {currentStep === 9 && <Step9Success {...stepProps} onFinish={handleFinish} />}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        {currentStep < 9 && (
          <Button onClick={handleNext} disabled={!uploadId && currentStep === 1}>
            Suivant <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
