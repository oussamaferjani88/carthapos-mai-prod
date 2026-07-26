import React, { useState, useRef } from 'react';
import { DragDropProvider } from '../../../contexts/DragDropContext';

import CustomizerHeader from '../../customizer/CustomizerHeader';
import CustomizerNavigation from '../../customizer/CustomizerNavigation';
import BrandPanel from '../../customizer/BrandPanel';
import ThemeSelector from '../../customizer/ThemeSelector';
import ColorPaletteEditor from '../../customizer/ColorPaletteEditor';
import TypographyEditor from '../../customizer/TypographyEditor';
import VisualEffectsEditor from '../../customizer/VisualEffectsEditor';
import LayoutEditor from '../../customizer/LayoutEditor';
import DragDropManager from '../../customizer/DragDropManager';
import AdvancedSettings from '../../customizer/AdvancedSettings';
import POSRealtimePreview from '../preview/POSRealtimePreview';
import { getSelectedModuleDisplayNames } from '../../../utils/posPreviewUtils';

import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Monitor, Smartphone, Tablet, MousePointer, Layers } from 'lucide-react';

const POSCustomizer = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  onBack,
  mode = 'inline',
  modulesByCategory = {}
}) => {
  const [selectedTab, setSelectedTab] = useState('design');
  const [selectedSubTab, setSelectedSubTab] = useState('themes');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const fileInputRef = useRef(null);

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
          // silent
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

  const renderContent = () => {
    if (selectedTab === 'design') {
      if (selectedSubTab === 'brand') {
        return <BrandPanel formData={formData} setFormData={setFormData} />;
      }
      if (selectedSubTab === 'themes') {
        return <ThemeSelector formData={formData} setFormData={setFormData} />;
      }
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

    return (
      <div className="text-center py-8">
        <div className="bg-card border border-border rounded-lg p-6 text-muted-foreground">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-medium mb-2 text-foreground">Commencez la personnalisation</h3>
          <p className="text-sm">
            Utilisez les onglets ci-dessus pour personnaliser votre POS.
          </p>
        </div>
      </div>
    );
  };

  return (
    <DragDropProvider>
      <div className={mode === 'full' ? "fixed inset-0 bg-background z-50 flex overflow-hidden" : "h-full flex overflow-hidden"}>
        {sidebarVisible && (
          <div className={`${mode === 'full' ? 'w-[26%]' : 'w-full'} bg-gray-50 flex flex-col overflow-hidden ${mode === 'full' ? 'border-r border-gray-200 shadow-lg' : ''}`}>
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
              onToggleSidebar={() => setSidebarVisible(false)}
            />

            <div className="flex-1 flex overflow-hidden">
              <CustomizerNavigation
                selectedTab={selectedTab}
                setSelectedTab={setSelectedTab}
                selectedSubTab={selectedSubTab}
                setSelectedSubTab={setSelectedSubTab}
                mode={mode}
              />

              <div className={`flex-1 overflow-y-auto ${mode === 'full' ? 'px-3' : 'px-2'} ${mode === 'full' ? 'pb-3' : 'pb-2'} bg-transparent`}>
                <div className={mode === 'full' ? 'py-1.5' : 'py-1'}>
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'full' && (
          <div className="flex-1 bg-muted/20 flex flex-col overflow-hidden">
            {!sidebarVisible && (
              <div className="absolute top-4 left-4 z-50">
                <Button
                  onClick={() => setSidebarVisible(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                  size="sm"
                >
                  <Layers className="w-4 h-4 mr-1" />
                  Afficher les options
                </Button>
              </div>
            )}

            <div className="border-b border-border p-2.5 bg-background/95 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-lg font-semibold flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  Aperçu en temps réel
                  {selectedComponent && (
                    <Badge variant="default" className="ml-3 text-xs">
                      <Layers className="w-3 h-3 mr-1" />
                      {selectedComponent}
                    </Badge>
                  )}
                </h2>

                <div className="flex items-center space-x-2">
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
              </p>
            </div>

            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-0 p-3">
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
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DragDropProvider>
  );
};

export default POSCustomizer;
