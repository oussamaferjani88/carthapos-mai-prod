import React, { useState, useRef } from 'react';
import { DragDropProvider } from '../../../hooks/useDragDrop';

// Import extracted components
import CustomizerHeader from './CustomizerHeader';
import CustomizerNavigation from './CustomizerNavigation';
import ColorPaletteEditor from './ColorPaletteEditor';
import TypographyEditor from './TypographyEditor';
import VisualEffectsEditor from './VisualEffectsEditor';
import LayoutEditor from './LayoutEditor';
import DragDropManager from './DragDropManager';
import AdvancedSettings from './AdvancedSettings';

// Import existing components that remain intact
import POSRealtimePreview from '../POSRealtimePreview';

// Import UI components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, Tablet, MousePointer, Layers } from 'lucide-react';

const POSCustomizerRefactored = ({ 
  formData, 
  setFormData, 
  onSave, 
  onCancel, 
  onBack, 
  mode = 'inline',
  modulesByCategory = {},
  getSelectedModuleDisplayNames = () => []
}) => {
  // State management
  const [selectedTab, setSelectedTab] = useState('themes');
  const [selectedSubTab, setSelectedSubTab] = useState('colors');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  
  const fileInputRef = useRef(null);

  // Handlers
  const resetToDefaults = () => {
    setFormData({
      ...formData,
      configuration: {
        primaryColor: '#3B82F6',
        secondaryColor: '#64748B',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Inter',
        fontSize: '14px'
      }
    });
  };

  const exportConfiguration = () => {
    const dataStr = JSON.stringify(formData.configuration, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pos-config.json';
    link.click();
  };

  const importConfiguration = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          setFormData({
            ...formData,
            configuration: { ...formData.configuration, ...config }
          });
        } catch (error) {
          console.error('Error parsing configuration file:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const duplicateConfiguration = () => {
    const duplicatedConfig = JSON.parse(JSON.stringify(formData.configuration));
    setFormData({
      ...formData,
      configuration: duplicatedConfig
    });
  };

  const selectComponent = (componentName) => {
    setSelectedComponent(componentName);
  };

  // Content renderer
  const renderContent = () => {
    if (selectedTab === 'themes') {
      // Theme selection logic would go here
      return <div className="p-4 text-center text-muted-foreground">Sélection de thèmes à implémenter</div>;
    }

    if (selectedTab === 'design') {
      if (selectedSubTab === 'colors') {
        return <ColorPaletteEditor formData={formData} setFormData={setFormData} />;
      }
      if (selectedSubTab === 'typography') {
        return <TypographyEditor formData={formData} setFormData={setFormData} />;
      }
      if (selectedSubTab === 'effects') {
        return <VisualEffectsEditor formData={formData} setFormData={setFormData} />;
      }
    }

    if (selectedTab === 'layout') {
      if (selectedSubTab === 'components') {
        return <LayoutEditor formData={formData} setFormData={setFormData} />;
      }
      if (selectedSubTab === 'drag') {
        return <DragDropManager isDragMode={isDragMode} setIsDragMode={setIsDragMode} />;
      }
    }

    if (selectedTab === 'advanced') {
      return <AdvancedSettings formData={formData} setFormData={setFormData} />;
    }

    return null;
  };

  return (
    <DragDropProvider>
      {/* Interface adaptée au mode (fullscreen ou inline) */}
      <div className={mode === 'full' ? "fixed inset-0 bg-background z-50 flex overflow-hidden" : "h-full flex overflow-hidden"}>
        {/* Sidebar de personnalisation */}
        <div className={`${mode === 'full' ? 'w-[30%]' : 'w-full'} bg-background ${mode === 'full' ? 'border-r border-border' : ''} flex flex-col overflow-hidden ${mode === 'full' ? 'shadow-lg' : ''}`}>
          <CustomizerHeader
            mode={mode}
            onBack={onBack}
            onCancel={onCancel}
            onSave={onSave}
            resetToDefaults={resetToDefaults}
            exportConfiguration={exportConfiguration}
            importConfiguration={importConfiguration}
            duplicateConfiguration={duplicateConfiguration}
            fileInputRef={fileInputRef}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            lastSaved={lastSaved}
          />

          <CustomizerNavigation
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
            selectedSubTab={selectedSubTab}
            setSelectedSubTab={setSelectedSubTab}
            mode={mode}
          />

          {/* Contenu principal */}
          <div className={`flex-1 overflow-y-auto ${mode === 'full' ? 'px-4' : 'px-3'} pb-4`}>
            {renderContent()}
          </div>
        </div>

        {/* POS Preview - Seulement en mode full */}
        {mode === 'full' && (
          <div className="flex-1 bg-muted/20 flex flex-col overflow-hidden">
            {/* Header du preview */}
            <div className="border-b border-border p-4 bg-background/95 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  Aperçu en temps réel de votre POS
                  {selectedComponent && (
                    <Badge variant="default" className="ml-3 text-xs">
                      <Layers className="w-3 h-3 mr-1" />
                      {selectedComponent}
                    </Badge>
                  )}
                </h2>
                
                {/* Contrôles de prévisualisation */}
                <div className="flex items-center space-x-2">
                  {/* Sélecteur de device */}
                  <div className="flex items-center bg-muted rounded-lg p-1">
                    <Button
                      variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreviewDevice('mobile')}
                      className="px-2"
                    >
                      <Smartphone className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreviewDevice('tablet')}
                      className="px-2"
                    >
                      <Tablet className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreviewDevice('desktop')}
                      className="px-2"
                    >
                      <Monitor className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Mode drag & drop */}
                  <Button
                    variant={isDragMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsDragMode(!isDragMode)}
                  >
                    <MousePointer className="w-4 h-4 mr-1" />
                    {isDragMode ? 'Quitter' : 'Drag & Drop'}
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Vos modifications sont appliquées instantanément
                {isDragMode && " • Cliquez et glissez pour réorganiser les éléments"}
              </p>
            </div>
            
            {/* Zone de preview avec padding adaptatif */}
            <div className="flex-1 relative overflow-hidden"> 
              <div className="absolute inset-0 p-6">
                <div 
                  className={`
                    w-full h-full bg-background rounded-xl border shadow-xl overflow-hidden transition-all duration-300
                    ${previewDevice === 'mobile' ? 'max-w-sm mx-auto' : ''}
                    ${previewDevice === 'tablet' ? 'max-w-4xl mx-auto' : ''}
                    ${isDragMode ? 'ring-2 ring-blue-500/30 ring-offset-4 ring-offset-muted/20' : ''}
                    hover:shadow-2xl
                  `}
                >
                  <POSRealtimePreview 
                    key={previewKey}
                    config={{
                      ...formData?.configuration,
                      dragMode: isDragMode,
                      selectedComponent: selectedComponent,
                      previewDevice: previewDevice,
                      // fallback config
                      businessName: formData?.configuration?.businessName || 'Demo POS',
                      primaryColor: formData?.configuration?.primaryColor || '#3B82F6',
                      backgroundColor: formData?.configuration?.backgroundColor || '#FFFFFF',
                      dashboard: formData?.configuration?.dashboard || { cards: [{ title: 'Demo Card', value: '42' }] }
                    }}
                    modules={getSelectedModuleDisplayNames(formData?.selectedModules || [], modulesByCategory)}
                    navbarPosition={formData?.configuration?.navbarPosition || 'left'}
                    onComponentSelect={selectComponent}
                    isDragMode={isDragMode}
                    previewDevice={previewDevice}
                  />
                 <div class="h-full flex items-center justify-center p-4" style="background: rgb(255, 255, 255);"><div class="w-full max-w-4xl"><div class="text-center mb-8"><div class="inline-flex items-center px-4 py-2 mb-4 bg-orange-100 border border-orange-300 text-orange-800 rounded-full text-sm font-medium" style="background-color: rgb(254, 215, 170); border-color: rgb(253, 186, 116); color: rgb(154, 52, 18);">🎭 MODE PRÉVISUALISATION - Authentification de démonstration</div><div class="flex items-center justify-center mb-4"><div class="w-16 h-16 rounded-full flex items-center justify-center" style="background-color: rgb(59, 130, 246);"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-store w-8 h-8 text-white" aria-hidden="true"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"></path><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"></path><path d="M2 7h20"></path><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"></path></svg></div></div><h1 class="text-3xl font-bold mb-2" style="color: rgb(31, 41, 55);">Mon POS</h1><p class="text-lg" style="color: rgb(107, 114, 128);">Sélectionnez un rôle pour tester l'interface (données de démonstration)</p></div><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div data-slot="card" class="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl hover:bg-red-600" style="background-color: rgb(255, 255, 255); border-color: rgb(229, 231, 235);"><div data-slot="card-content" class="p-8 text-center"><div class="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield w-10 h-10 text-white" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg></div><h3 class="text-2xl font-bold mb-2" style="color: rgb(31, 41, 55);">Administrateur</h3><p class="text-base mb-6" style="color: rgb(107, 114, 128);">Accès complet au système</p><div class="space-y-2"><p class="text-sm font-medium" style="color: rgb(31, 41, 55);">Privilèges inclus :</p><div class="flex flex-wrap gap-2 justify-center"><span class="px-3 py-1 text-xs rounded-full" style="background-color: rgba(59, 130, 246, 0.125); color: rgb(59, 130, 246);">Gestion complète</span><span class="px-3 py-1 text-xs rounded-full" style="background-color: rgba(59, 130, 246, 0.125); color: rgb(59, 130, 246);">Utilisateurs</span><span class="px-3 py-1 text-xs rounded-full" style="background-color: rgba(59, 130, 246, 0.125); color: rgb(59, 130, 246);">Stock</span><span class="px-3 py-1 text-xs rounded-full" style="background-color: rgba(59, 130, 246, 0.125); color: rgb(59, 130, 246);">Rapports</span><span class="px-3 py-1 text-xs rounded-full" style="background-color: rgba(59, 130, 246, 0.125); color: rgb(59, 130, 246);">Configuration</span></div></div><button class="w-full mt-6 py-3 px-6 rounded-lg font-medium transition-colors" style="background-color: rgb(59, 130, 246); color: rgb(255, 255, 255);">Accéder en tant que Administrateur</button></div></div><div data-slot="card" class="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl hover:bg-blue-600" style="background-color: rgb(255, 255, 255); border-color: rgb(229, 231, 235);"><div data-slot="card-content" class="p-8 text-center"><div class="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user w-10 h-10 text-white" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div><h3 class="text-2xl font-bold mb-2" style="color: rgb(31, 41, 55);">Caissier</h3><p class="text-base mb-6" style="color: rgb(107, 114, 128);">Interface de vente</p><div class="space-y-2"><p class="text-sm font-medium" style="color: rgb(31, 41, 55);">Privilèges inclus :</p><div class="flex flex-wrap gap-2 justify-center"><span class="px-3 py-1 text-xs rounded-full" style="background-color: rgba(59, 130, 246, 0.125); color: rgb(59, 130, 246);">Ventes</span><span class="px-3 py-1 text-xs rounded-full" style="background-color: rgba(59, 130, 246, 0.125); color: rgb(59, 130, 246);">Clients</span><span class="px-3 py-1 text-xs rounded-full" style="background-color: rgba(59, 130, 246, 0.125); color: rgb(59, 130, 246);">Rapports de base</span></div></div><button class="w-full mt-6 py-3 px-6 rounded-lg font-medium transition-colors" style="background-color: rgb(59, 130, 246); color: rgb(255, 255, 255);">Accéder en tant que Caissier</button></div></div></div><div class="text-center mt-8"><p class="text-sm" style="color: rgb(107, 114, 128);">© 2025 Mon POS. Tous droits réservés.</p></div></div></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DragDropProvider>
  );
};

export default POSCustomizerRefactored;
