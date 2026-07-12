import { useState } from 'react';
import { posService, licenseService, usbService } from '../services';
import { useAccessMode } from '../contexts/AccessModeContext';
import toast from 'react-hot-toast';

export const usePOSGenerator = () => {
  const [step, setStep] = useState<number>(1);
  const [customizationMode, setCustomizationMode] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generationResult, setGenerationResult] = useState<any>(null);
  const { isUserMode, currentUserId, currentUserProfile } = useAccessMode();

  const [showProgress, setShowProgress] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [currentAction, setCurrentAction] = useState('');
  const [progressError, setProgressError] = useState<string | null>(null);

  const [isFormVisible, setIsFormVisible] = useState(true);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    themes: false,
    business: false,
    colors: false,
    typography: false,
    layout: false,
    businessSettings: false,
    visualEffects: false,
    componentStyles: false,
    accessibility: false,
    dashboard: false,
    navigation: false,
    branding: false,
  });
  const progressDelayMs = Number(import.meta.env.VITE_POS_PROGRESS_DELAY_MS || 0);
  const waitForProgress = async () => {
    if (progressDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, progressDelayMs));
    }
  };

  const nextStep = () => {
    if (step === 2) {
      setStep(2.5);
    } else if (step < 5) {
      setStep(step + 1);
    }
  };

  const previousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const goToStep = (stepNumber: number) => {
    setStep(stepNumber);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof expandedSections],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    Object.keys(expandedSections).forEach(key => {
      allExpanded[key] = true;
    });
    setExpandedSections(allExpanded as typeof expandedSections);
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    Object.keys(expandedSections).forEach(key => {
      allCollapsed[key] = false;
    });
    setExpandedSections(allCollapsed as typeof expandedSections);
  };

  const generatePOS = async (formData: any) => {
    try {
      const businessName = formData?.configuration?.businessName;
      if (typeof businessName !== 'string' || businessName.trim().length === 0) {
        throw new Error('Nom du commerce requis');
      }

      setLoading(true);
      setShowProgress(true);
      setProgressError(null);
      setProgressStep(0);
      setProgressPercentage(0);
      setCurrentAction('Initialisation...');

      setProgressStep(0);
      setCurrentAction('Validation des paramètres et création de la licence...');
      setProgressPercentage(5);

      const licenseData = {
        clientId: formData.clientId,
        sector: formData.sector,
        licenseType: formData.licenseType,
        bindingType: formData.bindingType || 'MACHINE',
        expirationDate: formData.licenseType === 'SUBSCRIPTION' ? formData.expirationDate : null,
        modules: formData.selectedModules,
        configuration: formData.configuration,
        ...(isUserMode && currentUserId && {
          userId: currentUserId,
          createdBy: currentUserId,
          userName: currentUserProfile?.name || '',
          userEmail: currentUserProfile?.email || '',
        }),
      };

      const license = await licenseService.createLicense(licenseData);
      setProgressPercentage(20);

      setProgressStep(1);
      setCurrentAction('Génération du fichier de licence sécurisé...');
      await waitForProgress();

      const licenseFile = {
        filename: `license-${license.licenseKey}.key`,
        content: `LICENSE-KEY=${license.licenseKey}\nCLIENT=${license.clientId}\nSIG=BYPASSED-FOR-WEB-DEPLOYMENT`,
        licenseKey: license.licenseKey,
      };
      setProgressPercentage(40);

      if (formData.selectedUSB) {
        setProgressStep(2);
        setCurrentAction('Installation sur le support USB...');
        await waitForProgress();
        await usbService.writeLicenseToUSB({
          drivePath: formData.selectedUSB,
          licenseContent: licenseFile.content,
          licenseKey: license.licenseKey,
        });
        setProgressPercentage(60);
      } else {
        setProgressPercentage(60);
      }

      setProgressStep(3);
      setCurrentAction('Construction de votre application POS personnalisée...');
      await waitForProgress();

      const posApplication = await posService.generatePOS({
        licenseId: license.id,
        fastMode: import.meta.env.VITE_FAST_LOCAL_GENERATION === 'true',
      });
      setProgressPercentage(90);

      setProgressStep(4);
      setCurrentAction('Optimisation et finalisation...');
      await waitForProgress();

      setGenerationResult({ license, licenseFile, posApplication });
      setProgressPercentage(100);
      setCurrentAction('Génération terminée avec succès !');

      setTimeout(() => {
        setShowProgress(false);
        toast.success('POS généré avec succès !');
        setStep(5);
      }, 1000);
    } catch (error: any) {
      setProgressError(error.message || 'Erreur lors de la génération');
      setCurrentAction('Une erreur est survenue lors de la génération');
      toast.error(error.message || 'Erreur lors de la génération');
      setTimeout(() => setShowProgress(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const directConvert = async (formData: any) => {
    try {
      setLoading(true);
      setShowProgress(true);
      setProgressError(null);
      setProgressStep(0);
      setProgressPercentage(0);
      setCurrentAction('Conversion directe du preview...');

      setProgressStep(0);
      setCurrentAction('Validation de la configuration du preview...');
      setProgressPercentage(10);

      const businessName = formData?.configuration?.businessName;
      if (typeof businessName !== 'string' || businessName.trim().length === 0) {
        throw new Error('Nom du commerce requis pour la conversion');
      }
      setProgressPercentage(20);

      setProgressStep(1);
      setCurrentAction("Création de l'application Electron depuis le preview...");
      setProgressPercentage(30);

      const directConvertData = {
        previewConfig: formData.configuration,
        modules: formData.selectedModules,
        businessName,
      };

      const posApplication = await posService.directConvert(directConvertData);
      setProgressPercentage(100);
      setCurrentAction('Conversion directe terminée avec succès !');

      setGenerationResult({ directConversion: true, posApplication, previewMatching: true });
      setTimeout(() => {
        setShowProgress(false);
        toast.success('POS converti avec succès depuis le preview !');
        setStep(5);
      }, 1000);
    } catch (error: any) {
      setProgressError(error.message || 'Erreur lors de la conversion directe');
      setCurrentAction('Une erreur est survenue lors de la conversion');
      toast.error(error.message || 'Erreur lors de la conversion directe');
      setTimeout(() => setShowProgress(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const quickTest = async (themeConfig: any) => {
    try {
      setLoading(true);
      const result = await posService.quickTest({ themeConfig });
      if (result.success) {
        toast.success('Test de configuration réussi !');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error('Erreur lors du test: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetGenerator = () => {
    setStep(1);
    setGenerationResult(null);
    setCustomizationMode(null);
    setSelectedTemplate(null);
    setShowProgress(false);
    setProgressError(null);
    setIsFormVisible(true);
    setShowCustomizer(false);
  };

  const startWithTemplate = () => {
    setCustomizationMode('template');
    setStep(2.7);
  };

  const startCustomization = () => {
    setCustomizationMode('custom');
    setShowCustomizer(true);
  };

  const selectTemplate = (template: string) => {
    setSelectedTemplate(template);
  };

  const enterCustomizer = () => {
    setShowCustomizer(true);
  };

  const exitCustomizer = () => {
    setShowCustomizer(false);
  };

  return {
    step,
    customizationMode,
    selectedTemplate,
    loading,
    generationResult,
    showProgress,
    progressStep,
    progressPercentage,
    currentAction,
    progressError,
    isFormVisible,
    showCustomizer,
    expandedSections,

    nextStep,
    previousStep,
    goToStep,

    setIsFormVisible,
    toggleSection,
    expandAll,
    collapseAll,

    generatePOS,
    directConvert,
    quickTest,
    resetGenerator,

    startWithTemplate,
    startCustomization,
    selectTemplate,
    enterCustomizer,
    exitCustomizer,
  };
};
