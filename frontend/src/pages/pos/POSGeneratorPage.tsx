import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import POSCustomizer from '@/components/pos/customizer/POSCustomizer';
import POSRealtimePreview from '@/components/pos/preview/POSRealtimePreview';
import POSGenerationProgress from '@/components/pos/generation/POSGenerationProgress';
import Step1BasicConfig from '@/components/pos/generator/Step1BasicConfig';
import Step2ModuleSelection from '@/components/pos/generator/Step2ModuleSelection';
import Step4License from '@/components/pos/generator/Step4License';
import Step5Results from '@/components/pos/generator/Step5Results';
import { Zap, Palette, Plus, Minus, Monitor, Smartphone, Tablet } from 'lucide-react';

import { useClients, useSectors, usePOSModules, usePOSConfiguration, usePOSGenerator, useUSBDrives } from '@/hooks';
import toast from 'react-hot-toast';
import { useAccessMode } from '@/contexts/AccessModeContext';

export default function POSGeneratorPage() {
  const clientsHook = useClients();
  const sectorsHook = useSectors();
  const modulesHook = usePOSModules();
  const configHook = usePOSConfiguration();
  const generatorHook = usePOSGenerator();
  const usbHook = useUSBDrives();
  const { isUserMode, currentUserId, currentUserProfile } = useAccessMode();

  const [formData, setFormData] = useState({
    clientId: '',
    sector: '',
    licenseType: 'LIFETIME',
    bindingType: 'MACHINE',
    expirationDate: '',
    selectedUSB: '',
    forcePortableMode: false,
  });

  const [searchParams] = useSearchParams();
  const licenseIdParam = searchParams.get('licenseId');
  const projectRestoredRef = useRef(false);

  // Restore a saved POS project into the wizard (?licenseId=<id>).
  // Seeded after the module registry + sectors are available so prefill
  // values are not overwritten by default-loading effects.
  useEffect(() => {
    const licenseId = searchParams.get('licenseId');
    if (!licenseId || projectRestoredRef.current) return;
    projectRestoredRef.current = true;

    (async () => {
      try {
        const project = await generatorHook.loadProject(licenseId);
        if (!project) return;

        setFormData(prev => ({
          ...prev,
          clientId: project.clientId || prev.clientId,
          sector: project.sector || prev.sector,
          licenseType: project.licenseType || prev.licenseType,
          bindingType: project.bindingType || prev.bindingType,
          expirationDate: project.expirationDate || prev.expirationDate,
        }));

        if (project.configuration && Object.keys(project.configuration).length > 0) {
          configHook.setConfiguration(project.configuration);
        }
        if (project.modules && project.modules.length > 0) {
          modulesHook.setSelectedModules(project.modules);
        }
        toast.success('Configuration du projet restaurée');
      } catch (err: any) {
        toast.error(err?.message || 'Impossible de restaurer la configuration du projet');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseIdParam]);

  useEffect(() => {
    if (clientsHook.clients.length > 0 && !formData.clientId) {
      setFormData(prev => ({ ...prev, clientId: clientsHook.clients[0].id }));
    }
  }, [clientsHook.clients, formData.clientId]);

  useEffect(() => {
    if (sectorsHook.sectors.length > 0 && !formData.sector) {
      setFormData(prev => ({ ...prev, sector: sectorsHook.sectors[0].id }));
    }
  }, [sectorsHook.sectors, formData.sector]);

  useEffect(() => {
    if (isUserMode && currentUserId && formData.clientId !== currentUserId) {
      setFormData(prev => ({ ...prev, clientId: currentUserId }));
    }
  }, [isUserMode, currentUserId, formData.clientId]);

  const handleClientChange = (clientId: string) => {
    setFormData(prev => ({ ...prev, clientId }));
  };

  const handleSectorChange = (sectorId: string) => {
    const sector = sectorsHook.getSectorById(sectorId);
    if (sector) {
      setFormData(prev => ({ ...prev, sector: sectorId }));
      modulesHook.setModulesForSector(sector);
    }
  };

  const handleGenerate = async () => {
    await generatorHook.generatePOS({
      clientId: formData.clientId,
      sector: formData.sector,
      licenseType: formData.licenseType,
      bindingType: formData.bindingType,
      expirationDate: formData.expirationDate,
      selectedModules: modulesHook.selectedModules,
      configuration: { ...configHook.configuration, forcePortableMode: formData.forcePortableMode },
      selectedUSB: formData.selectedUSB,
    });
  };

  const handleDirectConvert = async () => {
    await generatorHook.directConvert({
      selectedModules: modulesHook.selectedModules,
      configuration: configHook.configuration,
    });
  };

  const handleQuickTest = async () => {
    await generatorHook.quickTest(configHook.configuration);
  };

  const canProceed = () => {
    switch (generatorHook.step) {
      case 1:
        return formData.clientId && formData.sector;
      case 2:
        return modulesHook.selectedModules.length > 0;
      case 3:
        return typeof configHook.configuration.businessName === 'string' && configHook.configuration.businessName.trim().length > 0;
      case 4:
        return (
          typeof configHook.configuration.businessName === 'string' &&
          configHook.configuration.businessName.trim().length > 0 &&
          formData.licenseType &&
          (formData.licenseType === 'LIFETIME' || formData.expirationDate)
        );
      default:
        return false;
    }
  };

  if (generatorHook.showCustomizer) {
    return (
      <div className="pb-24">
        <POSCustomizer
          formData={{ configuration: configHook.configuration, selectedModules: modulesHook.selectedModules }}
          setFormData={(data) => {
            configHook.setConfiguration(data.configuration);
            modulesHook.setSelectedModules(data.selectedModules);
          }}
          modulesByCategory={modulesHook.modulesByCategory}
          onSave={() => {
            if (typeof configHook.configuration.businessName !== 'string' || configHook.configuration.businessName.trim().length === 0) {
              toast.error('Nom du commerce obligatoire');
              return;
            }
            generatorHook.exitCustomizer();
            if (generatorHook.step <= 2) {
              generatorHook.goToStep(3);
            } else {
              generatorHook.goToStep(4);
            }
          }}
          onCancel={() => generatorHook.exitCustomizer()}
          onBack={() => generatorHook.exitCustomizer()}
          mode="full"
        />
      </div>
    );
  }

  if (generatorHook.step === 2.5) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <Button variant="outline" onClick={() => generatorHook.goToStep(2)} className="mb-4">
              ← Retour aux modules
            </Button>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Créez votre POS personnalisé
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Choisissez entre un template prêt à l'emploi ou une personnalisation complète
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-500">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Templates prêts</CardTitle>
                <CardDescription className="text-base">
                  Démarrez rapidement avec des designs professionnels pré-configurés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => generatorHook.startWithTemplate()} className="w-full" size="lg">
                  Choisir un template
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-purple-500">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Palette className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle className="text-2xl">Personnalisation complète</CardTitle>
                <CardDescription className="text-base">
                  Créez un POS unique avec un contrôle total sur le design
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => generatorHook.startCustomization()} className="w-full" variant="outline" size="lg">
                  Personnaliser entièrement
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (generatorHook.step === 2.7) {
    const templates = [
      {
        id: 'cafe',
        name: 'Café Central',
        sector: 'Café',
        description: 'Template optimisé pour cafés et coffee shops',
        color: '#8B4513',
        features: ['Caisse rapide', 'Rapports'],
        preview: '☕',
      },
      {
        id: 'restaurant',
        name: 'Restaurant Le Gourmet',
        sector: 'Restaurant',
        description: 'Template complet pour restaurants',
        color: '#DC2626',
        features: ['Tables', 'Cuisine', 'Réservations', 'Rapports avancés'],
        preview: '🍽️',
      },
      {
        id: 'retail',
        name: 'Boutique Moderne',
        sector: 'Commerce',
        description: 'Template pour boutiques et magasins',
        color: '#3B82F6',
        features: ['Ventes rapides', 'Fidélité', 'Promotions'],
        preview: '🛍️',
      },
      {
        id: 'pharmacy',
        name: 'Pharmacie',
        sector: 'Santé',
        description: 'Template spécialisé pour pharmacies',
        color: '#059669',
        features: ['Ordonnances', 'Contrôle qualité'],
        preview: '💊',
      },
    ];

    return (
      <div className="space-y-6 pb-24">
        <div>
          <Button variant="outline" onClick={() => generatorHook.goToStep(2.5)} className="mb-4">
            ← Retour au choix
          </Button>
          <h1 className="text-3xl font-bold">Choisissez un template</h1>
          <p className="text-muted-foreground">
            Sélectionnez un template pré-configuré adapté à votre secteur
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-500"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                      style={{ backgroundColor: template.color + '20' }}
                    >
                      {template.preview}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{template.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">{template.sector}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-lg border-2 border-white shadow-md"
                      style={{ backgroundColor: template.color }}
                      title={`Couleur: ${template.color}`}
                    />
                  </div>
                </div>
                <CardDescription className="mt-3 text-base">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Fonctionnalités incluses:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {template.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          ✓ {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        configHook.updateConfig('businessName', template.name);
                        configHook.updateConfig('primaryColor', template.color);
                        configHook.updateConfig('sector', template.sector);
                        generatorHook.goToStep(4);
                      }}
                      className="flex-1"
                    >
                      Utiliser ce template
                    </Button>
                    <Button
                      onClick={() => {
                        configHook.updateConfig('businessName', template.name);
                        configHook.updateConfig('primaryColor', template.color);
                        configHook.updateConfig('sector', template.sector);
                        generatorHook.enterCustomizer();
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Personnaliser
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (generatorHook.step === 3) {
    return (
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-bold mb-2">Personnalisation Avancée</h1>
          <p className="text-muted-foreground">
            Personnalisez entièrement l'apparence et le comportement de votre POS
          </p>
        </div>

        <div className="flex h-[calc(100vh-16rem)] gap-4 border rounded-lg bg-background">
          {generatorHook.isFormVisible && (
            <div className="w-[28%] border-r border-border flex flex-col overflow-hidden">
              <div className="border-b border-border p-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">🎨 Design Studio</h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => generatorHook.setIsFormVisible(false)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/20 h-7 w-7 p-0"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <POSCustomizer
                  formData={{ configuration: configHook.configuration, selectedModules: modulesHook.selectedModules }}
                  setFormData={(data) => {
                    configHook.setConfiguration(data.configuration);
                    modulesHook.setSelectedModules(data.selectedModules);
                  }}
                  modulesByCategory={modulesHook.modulesByCategory}
                  onSave={() => toast.success('Personnalisation sauvegardée')}
                  onCancel={() => toast.info('Personnalisation annulée')}
                  onBack={() => {}}
                  isVisible={true}
                  mode="inline"
                />
              </div>
            </div>
          )}

          {!generatorHook.isFormVisible && (
            <div className="absolute left-4 top-4 z-10">
              <Button onClick={() => generatorHook.setIsFormVisible(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                Ouvrir le Design Studio
              </Button>
            </div>
          )}

          <div className={`${generatorHook.isFormVisible ? 'flex-1' : 'w-full'} bg-muted/20 flex flex-col overflow-hidden relative`}>
            <div className="border-b border-border p-4 bg-background/95 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  Aperçu en temps réel de votre POS
                </h3>
                <div className="flex items-center bg-muted rounded-lg p-1">
                  <Button
                    variant={configHook.configuration.previewDevice === 'mobile' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => configHook.updateConfig('previewDevice', 'mobile')}
                    className="px-2"
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={configHook.configuration.previewDevice === 'tablet' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => configHook.updateConfig('previewDevice', 'tablet')}
                    className="px-2"
                  >
                    <Tablet className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={configHook.configuration.previewDevice === 'desktop' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => configHook.updateConfig('previewDevice', 'desktop')}
                    className="px-2"
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-0 p-6">
                <div className="w-full h-full bg-background rounded-xl border shadow-xl overflow-hidden">
                  <POSRealtimePreview
                    config={configHook.configuration}
                    modules={modulesHook.getSelectedModuleNames()}
                    navbarPosition={configHook.configuration.navbarPosition || 'left'}
                    previewDevice={configHook.configuration.previewDevice || 'desktop'}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between">
            <Button variant="outline" onClick={() => generatorHook.previousStep()}>
              Précédent
            </Button>
            <Button onClick={() => generatorHook.nextStep()} disabled={!canProceed()}>
              Suivant
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold">Générateur POS Personnalisé</h1>
        <p className="text-muted-foreground">
          Créez un système de caisse entièrement personnalisé
        </p>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        {[1, 2, 3, 4, 5].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${generatorHook.step >= stepNumber
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
              }
            `}>
              {stepNumber}
            </div>
            {stepNumber < 5 && (
              <div className={`
                w-12 h-0.5 mx-2
                ${generatorHook.step > stepNumber ? 'bg-primary' : 'bg-muted'}
              `} />
            )}
          </div>
        ))}
      </div>

      <div className="max-w-none">
        {generatorHook.step === 1 && (
          <Step1BasicConfig
            clients={clientsHook.clients}
            sectors={sectorsHook.sectors}
            clientId={formData.clientId}
            sectorId={formData.sector}
            onClientChange={handleClientChange}
            onSectorChange={handleSectorChange}
            loading={clientsHook.loading || sectorsHook.loading}
            isUserMode={isUserMode}
            currentUser={currentUserProfile}
          />
        )}

        {generatorHook.step === 2 && (
          <Step2ModuleSelection
            modulesByCategory={modulesHook.modulesByCategory}
            selectedModules={modulesHook.selectedModules}
            onModuleToggle={modulesHook.toggleModule}
            isModuleRequired={modulesHook.isModuleRequired}
          />
        )}

        {generatorHook.step === 4 && (
          <Step4License
            licenseType={formData.licenseType}
            expirationDate={formData.expirationDate}
            onLicenseTypeChange={(value) => setFormData(prev => ({ ...prev, licenseType: value }))}
            onExpirationDateChange={(value) => setFormData(prev => ({ ...prev, expirationDate: value }))}
            bindingType={formData.bindingType}
            onBindingTypeChange={(value) => setFormData(prev => ({ ...prev, bindingType: value }))}
            usbDrives={usbHook.usbDrives}
            selectedUSB={formData.selectedUSB}
            onUSBChange={(value) => setFormData(prev => ({ ...prev, selectedUSB: value }))}
            onDetectUSB={usbHook.loadUSBDrives}
            forcePortableMode={formData.forcePortableMode}
            onForcePortableModeChange={(checked) => setFormData(prev => ({ ...prev, forcePortableMode: checked }))}
            loading={usbHook.loading}
          />
        )}

        {generatorHook.step === 5 && (
          <Step5Results
            generationResult={generatorHook.generationResult}
            selectedUSB={formData.selectedUSB}
            onNewPOS={generatorHook.resetGenerator}
          />
        )}
      </div>

      {generatorHook.step < 5 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() => generatorHook.previousStep()}
              disabled={generatorHook.step === 1}
            >
              Précédent
            </Button>

            {generatorHook.step < 4 ? (
              <Button
                onClick={() => {
                  if (generatorHook.step === 2) {
                    generatorHook.goToStep(2.5);
                  } else {
                    generatorHook.nextStep();
                  }
                }}
                disabled={!canProceed()}
              >
                Suivant
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button
                    onClick={handleGenerate}
                    disabled={!canProceed() || generatorHook.loading}
                    variant="default"
                    className="flex-1"
                  >
                    {generatorHook.loading ? 'Génération...' : 'Générer le POS (Complet)'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <POSGenerationProgress
        isVisible={generatorHook.showProgress}
        currentStep={generatorHook.progressStep}
        progress={generatorHook.progressPercentage}
        currentAction={generatorHook.currentAction}
        error={generatorHook.progressError}
        variant="modern"
        onComplete={() => {}}
      />
    </div>
  );
}
