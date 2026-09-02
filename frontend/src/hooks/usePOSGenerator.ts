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
  const [progressSteps, setProgressSteps] = useState<Array<{ id: string; label: string; description: string }>>([]);
  const [progressStepId, setProgressStepId] = useState<string | null>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [currentAction, setCurrentAction] = useState('');
  const [progressError, setProgressError] = useState<string | null>(null);

  const [isFormVisible, setIsFormVisible] = useState(true);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [activeLicenseId, setActiveLicenseId] = useState<string | null>(null);
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

  /**
   * Ordered list of steps actually performed for this run. The USB step only
   * exists when a USB target was selected (machine-bound licences skip it).
   */
  const buildGenerationSteps = (usesUSB: boolean) => [
    { id: 'validate', label: 'Validation de la configuration', description: 'Vérification des paramètres et création de la licence' },
    { id: 'license', label: 'Génération de la licence', description: 'Création du fichier de licence sécurisé' },
    ...(usesUSB
      ? [{ id: 'usb', label: 'Écriture sur la clé USB', description: 'Copie de la licence sur le support amovible' }]
      : []),
    { id: 'build', label: "Construction de l'application", description: 'Assemblage du POS personnalisé' },
    { id: 'finalize', label: 'Finalisation', description: 'Optimisation et préparation du téléchargement' },
  ];

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
    const usesUSB = Boolean(formData?.selectedUSB);

    try {
      const businessName = formData?.configuration?.businessName;
      if (typeof businessName !== 'string' || businessName.trim().length === 0) {
        throw new Error('Nom du commerce requis');
      }

      setLoading(true);
      setShowProgress(true);
      setProgressError(null);
      setProgressSteps(buildGenerationSteps(usesUSB));
      setProgressStepId('validate');
      setProgressPercentage(0);
      setCurrentAction('Initialisation...');

      setProgressStepId('validate');
      setCurrentAction('Vérification des paramètres et création de la licence...');
      setProgressPercentage(8);

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
      setProgressPercentage(22);

      setProgressStepId('license');
      setCurrentAction('Génération du fichier de licence sécurisé...');
      await waitForProgress();

      const licenseFile = await licenseService.generateLicenseFile(license.id);
      setProgressPercentage(usesUSB ? 38 : 45);

      if (usesUSB) {
        setProgressStepId('usb');
        setCurrentAction('Copie de la licence sur la clé USB...');
        await waitForProgress();
        await usbService.writeLicenseToUSB({
          drivePath: formData.selectedUSB,
          licenseContent: licenseFile.content,
          licenseKey: license.licenseKey,
        });
        setProgressPercentage(55);
      }

      setProgressStepId('build');
      setCurrentAction('Construction de votre application POS personnalisée...');
      setProgressPercentage(65);
      await waitForProgress();

      const posApplication = await posService.generatePOS({
        licenseId: license.id,
        fastMode: import.meta.env.VITE_FAST_LOCAL_GENERATION === 'true',
      });

      // A remote GitHub Actions build was just launched: the backend only
      // generated source files and fired the workflow fire-and-forget. Nothing
      // is actually ready to download yet, so don't claim success here — hand
      // off to Step 5, which already polls the real build status.
      const isRemoteBuildPending =
        posApplication?.buildStatus === 'building' ||
        posApplication?.buildStatus === 'source_ready';

      if (isRemoteBuildPending) {
        setProgressStepId('build');
        setProgressPercentage(70);
        setCurrentAction(
          'Construction lancée sur GitHub Actions — suivi du progrès sur l\'écran suivant...'
        );

        setGenerationResult({ license, licenseFile, posApplication });

        setTimeout(() => {
          setShowProgress(false);
          setStep(5);
        }, 1000);
      } else {
        setProgressPercentage(92);
        setProgressStepId('finalize');
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
      }
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
      setProgressSteps([
        { id: 'validate', label: 'Validation du preview', description: 'Vérification de la configuration' },
        { id: 'build', label: "Création de l'application", description: 'Assemblage du POS depuis le preview' },
      ]);
      setProgressStepId('validate');
      setProgressPercentage(0);
      setCurrentAction('Conversion directe du preview...');

      setProgressStepId('validate');
      setCurrentAction('Validation de la configuration du preview...');
      setProgressPercentage(10);

      const businessName = formData?.configuration?.businessName;
      if (typeof businessName !== 'string' || businessName.trim().length === 0) {
        throw new Error('Nom du commerce requis pour la conversion');
      }
      setProgressPercentage(20);

      setProgressStepId('build');
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
    setProgressSteps([]);
    setProgressStepId(null);
    setProgressPercentage(0);
    setIsFormVisible(true);
    setShowCustomizer(false);
    setActiveLicenseId(null);
  };

  /**
   * Load a saved POS project so the wizard can be restored from its
   * configuration snapshot (rawConfig). Returns the normalized project data
   * for the page to seed usePOSConfiguration / usePOSModules / formData.
   * Legacy projects without rawConfig fall back to the typed columns.
   */
  const loadProject = async (licenseId: string) => {
    setLoadingProject(true);
    try {
      const license = await licenseService.getLicenseById(licenseId);
      const raw = license?.configuration?.rawConfig || {};
      const snapshotConfig =
        raw?.configuration && typeof raw.configuration === 'object'
          ? raw.configuration
          : license?.configuration || {};
      // Module selection is keyed by module ID (cuid) everywhere in the UI
      // (ModuleGrid matches selectedList.includes(module.id)). rawConfig.modules
      // may contain names or ids, so resolve every identifier to its module ID
      // using the license's own module relation.
      const licenseModules = Array.isArray(license?.modules) ? license.modules : [];
      const resolveModuleId = (identifier: string) => {
        const match = licenseModules.find(
          (m: any) =>
            m?.module?.id === identifier ||
            m?.module?.name === identifier ||
            (identifier && m?.module?.code === identifier)
        );
        return match?.module?.id || identifier;
      };
      const rawModules = Array.isArray(raw?.modules) ? raw.modules : [];
      const snapshotModules = rawModules.length
        ? rawModules.map(resolveModuleId).filter(Boolean)
        : licenseModules
            .filter((m: any) => m && m.isEnabled !== false)
            .map((m: any) => m?.module?.id)
            .filter(Boolean);
      setActiveLicenseId(licenseId);
      return {
        licenseId,
        clientId: license?.clientId || '',
        sector: raw?.sector || license?.sector || '',
        licenseType: raw?.licenseType || license?.licenseType || 'LIFETIME',
        bindingType: raw?.bindingType || license?.bindingType || 'MACHINE',
        expirationDate: raw?.expirationDate || '',
        modules: snapshotModules,
        configuration: snapshotConfig,
        posConfigVersion: raw?.posConfigVersion ?? license?.configuration?.posConfigVersion ?? 1,
      };
    } finally {
      setLoadingProject(false);
    }
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
    progressSteps,
    progressStepId,
    progressPercentage,
    currentAction,
    progressError,
    isFormVisible,
    showCustomizer,
    expandedSections,
    loadingProject,
    activeLicenseId,

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
    loadProject,

    startWithTemplate,
    startCustomization,
    selectTemplate,
    enterCustomizer,
    exitCustomizer,
  };
};
