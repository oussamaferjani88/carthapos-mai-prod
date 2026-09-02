/**
 * usePOSGenerator Hook
 * Main orchestration hook for POS generation workflow
 * Manages the entire generation process including progress tracking
 */

import { useState } from 'react';
import { licenseService, posService, usbService } from '../services';
import { useAccessMode } from '../contexts/AccessModeContext';
import toast from 'react-hot-toast';

export const usePOSGenerator = () => {
  const [step, setStep] = useState(1);
  const [customizationMode, setCustomizationMode] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const { isUserMode, currentUserId, currentUserProfile } = useAccessMode();

  // Progress tracking state
  const [showProgress, setShowProgress] = useState(false);
  const [progressSteps, setProgressSteps] = useState([]);
  const [progressStepId, setProgressStepId] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [currentAction, setCurrentAction] = useState('');
  const [progressError, setProgressError] = useState(null);

  // UI state
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
    branding: false
  });
  const progressDelayMs = Number(import.meta.env.VITE_POS_PROGRESS_DELAY_MS || 0);
  const waitForProgress = async () => {
    if (progressDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, progressDelayMs));
    }
  };

  /**
   * Build the ordered list of steps actually performed for this run.
   * The USB step only exists when a USB target was selected (machine-bound
   * licenses without a USB target skip it entirely).
   */
  const buildGenerationSteps = (usesUSB) => [
    { id: 'validate', label: 'Validation de la configuration', description: 'Vérification des paramètres et création de la licence' },
    { id: 'license', label: 'Génération de la licence', description: 'Création du fichier de licence sécurisé' },
    ...(usesUSB
      ? [{ id: 'usb', label: 'Écriture sur la clé USB', description: 'Copie de la licence sur le support amovible' }]
      : []),
    { id: 'build', label: 'Construction de l\'application', description: 'Assemblage du POS personnalisé' },
    { id: 'finalize', label: 'Finalisation', description: 'Optimisation et préparation du téléchargement' },
  ];

  /**
   * Navigate to next step
   */
  const nextStep = () => {
    if (step === 2) {
      setStep(2.5); // Go to template/custom choice
    } else if (step < 5) {
      setStep(step + 1);
    }
  };

  /**
   * Navigate to previous step
   */
  const previousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  /**
   * Go to specific step
   */
  const goToStep = (stepNumber) => {
    setStep(stepNumber);
  };

  /**
   * Toggle section expansion
   */
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  /**
   * Expand all sections
   */
  const expandAll = () => {
    const allExpanded = {};
    Object.keys(expandedSections).forEach(key => {
      allExpanded[key] = true;
    });
    setExpandedSections(allExpanded);
  };

  /**
   * Collapse all sections
   */
  const collapseAll = () => {
    const allCollapsed = {};
    Object.keys(expandedSections).forEach(key => {
      allCollapsed[key] = false;
    });
    setExpandedSections(allCollapsed);
  };

  /**
   * Generate POS Application (Complete Workflow)
   */
  const generatePOS = async (formData) => {
    console.log('Starting generatePOS with formData:', formData);

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

      // Step: Validation + license creation
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
        // Add userId if in user mode
        ...(isUserMode && currentUserId && {
          userId: currentUserId,
          createdBy: currentUserId,
          userName: currentUserProfile?.name || '',
          userEmail: currentUserProfile?.email || ''
        })
      };

      console.log('Creating license with data:', licenseData);
      const license = await licenseService.createLicense(licenseData);
      setProgressPercentage(22);

      // Step: Secure license file
      setProgressStepId('license');
      setCurrentAction('Génération du fichier de licence sécurisé...');
      await waitForProgress();

      const licenseFile = await licenseService.generateLicenseFile(license.id);
      console.log('License file generated:', licenseFile);
      setProgressPercentage(usesUSB ? 38 : 45);

      // Step: Write licence to USB (only when a USB target was selected)
      if (usesUSB) {
        setProgressStepId('usb');
        setCurrentAction('Copie de la licence sur la clé USB...');
        await waitForProgress();

        await usbService.writeLicenseToUSB({
          drivePath: formData.selectedUSB,
          licenseContent: licenseFile.content,
          licenseKey: license.licenseKey
        });
        setProgressPercentage(55);
      }

      // Step: Build the POS application
      setProgressStepId('build');
      setCurrentAction('Construction de votre application POS personnalisée...');
      setProgressPercentage(65);
      await waitForProgress();

      const posApplication = await posService.generatePOS({
        licenseId: license.id,
        fastMode: import.meta.env.VITE_FAST_LOCAL_GENERATION === 'true'
      });
      console.log('POS application generated:', posApplication);
      setProgressPercentage(92);

      // Step: Finalization
      setProgressStepId('finalize');
      setCurrentAction('Optimisation et finalisation...');
      await waitForProgress();

      setGenerationResult({
        license,
        licenseFile,
        posApplication
      });

      setProgressPercentage(100);
      setCurrentAction('Génération terminée avec succès !');

      // Show 100% before closing
      setTimeout(() => {
        setShowProgress(false);
        toast.success('POS généré avec succès !');
        setStep(5);
      }, 1000);

    } catch (error) {
      console.error('Error generating POS:', error);
      setProgressError(error.message || 'Erreur lors de la génération');
      setCurrentAction('Une erreur est survenue lors de la génération');
      toast.error(error.message || 'Erreur lors de la génération');

      // Keep progress bar open with error for 3 seconds
      setTimeout(() => {
        setShowProgress(false);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Direct Conversion from Preview to POS
   */
  const directConvert = async (formData) => {
    console.log('Starting direct conversion');

    try {
      setLoading(true);
      setShowProgress(true);
      setProgressError(null);
      setProgressSteps([
        { id: 'validate', label: 'Validation du preview', description: 'Vérification de la configuration' },
        { id: 'build', label: 'Création de l\'application', description: 'Assemblage du POS depuis le preview' },
      ]);
      setProgressStepId('validate');
      setProgressPercentage(0);
      setCurrentAction('Conversion directe du preview...');

      // Step: Validation
      setProgressStepId('validate');
      setCurrentAction('Validation de la configuration du preview...');
      setProgressPercentage(10);

      const businessName = formData?.configuration?.businessName;
      if (typeof businessName !== 'string' || businessName.trim().length === 0) {
        throw new Error('Nom du commerce requis pour la conversion');
      }

      setProgressPercentage(20);

      // Step: Direct conversion
      setProgressStepId('build');
      setCurrentAction('Création de l\'application Electron depuis le preview...');
      setProgressPercentage(30);

      const directConvertData = {
        previewConfig: formData.configuration,
        modules: formData.selectedModules,
        businessName
      };

      const posApplication = await posService.directConvert(directConvertData);
      setProgressPercentage(100);
      setCurrentAction('Conversion directe terminée avec succès !');

      setGenerationResult({
        directConversion: true,
        posApplication,
        previewMatching: true
      });

      // Show 100% before closing
      setTimeout(() => {
        setShowProgress(false);
        toast.success('POS converti avec succès depuis le preview !');
        setStep(5);
      }, 1000);

    } catch (error) {
      console.error('Error in direct conversion:', error);
      setProgressError(error.message || 'Erreur lors de la conversion directe');
      setCurrentAction('Une erreur est survenue lors de la conversion');
      toast.error(error.message || 'Erreur lors de la conversion directe');

      // Keep progress bar open with error for 3 seconds
      setTimeout(() => {
        setShowProgress(false);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Quick Test - Create and Open POS
   */
  const quickTest = async (themeConfig) => {
    try {
      setLoading(true);
      const result = await posService.quickTest({ themeConfig });

      if (result.success) {
        toast.success('Test de configuration réussi !');
        console.log('Quick test result:', result.preview);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error in quick test:', error);
      toast.error('Erreur lors du test: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load a saved POS project so the wizard can be restored from its
   * configuration snapshot (rawConfig). Returns normalized project data for the
   * page to seed formData / usePOSConfiguration / usePOSModules.
   * Legacy projects without rawConfig fall back to the licence's typed columns.
   */
  const loadProject = async (licenseId) => {
    setLoadingProject(true);
    try {
      const license = await licenseService.getLicenseById(licenseId);
      const raw = license?.configuration?.rawConfig || {};
      const snapshotConfig =
        raw?.configuration && typeof raw.configuration === 'object'
          ? raw.configuration
          : license?.configuration || {};

      // Module selection is keyed by module ID everywhere in the UI. rawConfig
      // may store names or ids, so resolve every identifier to its module ID
      // using the licence's own module relation.
      const licenseModules = Array.isArray(license?.modules) ? license.modules : [];
      const resolveModuleId = (identifier) => {
        const match = licenseModules.find(
          (m) =>
            m?.module?.id === identifier ||
            m?.module?.name === identifier ||
            (identifier && m?.module?.code === identifier)
        );
        return match?.module?.id || identifier;
      };
      const rawModules = Array.isArray(raw?.modules) ? raw.modules : [];
      const modules = rawModules.length
        ? rawModules.map(resolveModuleId).filter(Boolean)
        : licenseModules
            .filter((m) => m && m.isEnabled !== false)
            .map((m) => m?.module?.id)
            .filter(Boolean);

      return {
        licenseId,
        clientId: license?.clientId || '',
        sector: raw?.sector || license?.sector || '',
        licenseType: raw?.licenseType || license?.licenseType || 'LIFETIME',
        bindingType: raw?.bindingType || license?.bindingType || 'MACHINE',
        expirationDate: raw?.expirationDate || '',
        modules,
        configuration: snapshotConfig,
        posConfigVersion:
          raw?.posConfigVersion ?? license?.configuration?.posConfigVersion ?? 1,
      };
    } finally {
      setLoadingProject(false);
    }
  };

  /**
   * Reset generator to initial state
   */
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
  };

  /**
   * Start with template
   */
  const startWithTemplate = () => {
    setCustomizationMode('template');
    setStep(2.7);
  };

  /**
   * Start with customization
   */
  const startCustomization = () => {
    setCustomizationMode('custom');
    setShowCustomizer(true);
  };

  /**
   * Select template
   */
  const selectTemplate = (template) => {
    setSelectedTemplate(template);
  };

  /**
   * Enter customizer
   */
  const enterCustomizer = () => {
    setShowCustomizer(true);
  };

  /**
   * Exit customizer
   */
  const exitCustomizer = () => {
    setShowCustomizer(false);
  };

  return {
    // State
    step,
    customizationMode,
    selectedTemplate,
    loading,
    loadingProject,
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

    // Navigation
    nextStep,
    previousStep,
    goToStep,

    // UI Controls
    setIsFormVisible,
    toggleSection,
    expandAll,
    collapseAll,

    // Main Actions
    generatePOS,
    directConvert,
    quickTest,
    loadProject,
    resetGenerator,

    // Template/Customization
    startWithTemplate,
    startCustomization,
    selectTemplate,
    enterCustomizer,
    exitCustomizer
  };
};
