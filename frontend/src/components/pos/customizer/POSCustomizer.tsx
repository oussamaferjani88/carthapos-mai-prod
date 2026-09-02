import { useState, useRef } from 'react';
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
import { Monitor, Smartphone, Tablet, Layers, RotateCw } from 'lucide-react';

// Matches admin/src/components/pos/customizer/POSCustomizer.jsx's SECTION_META
// (shown above the panel content, see the sidebar header block below)
const SECTION_META: Record<string, { title: string; description: string }> = {
  brand: { title: 'Marque', description: 'Logo, nom et identité du commerce' },
  themes: { title: 'Thème', description: 'Choisissez un thème prédéfini' },
  colors: { title: 'Couleurs', description: 'Personnalisez la palette' },
  typography: { title: 'Typographie', description: 'Police, taille et graisse du texte' },
  effects: { title: 'Effets visuels', description: 'Animations, ombres et transparence' },
  layout: { title: 'Mise en page', description: 'Navigation, espacement et composants' },
  drag: { title: 'Drag & Drop', description: 'Réorganisation des composants' },
  advanced: { title: 'Avancé', description: 'Performance et CSS personnalisé' },
};

interface POSCustomizerProps {
  formData: { configuration: Record<string, any>; selectedModules: string[] };
  setFormData: (data: { configuration: Record<string, any>; selectedModules: string[] }) => void;
  modulesByCategory?: Record<string, any[]>;
  onSave: () => void;
  onCancel: () => void;
  onBack: () => void;
  isVisible?: boolean;
  mode?: string;
}

const POSCustomizer = ({
  formData, setFormData, onSave, onCancel, onBack, mode = 'inline', modulesByCategory = {},
}: POSCustomizerProps) => {
  const [selectedTab, setSelectedTab] = useState('design');
  const [selectedSubTab, setSelectedSubTab] = useState('brand');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetToDefaults = () => {
    setFormData({
      ...formData,
      configuration: {
        primaryColor: '#3B82F6', secondaryColor: '#64748B', backgroundColor: '#FFFFFF',
        fontFamily: 'Inter', fontSize: '14px',
      },
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

  const importConfiguration = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string);
          setFormData({ ...formData, configuration: { ...formData.configuration, ...config } });
        } catch (error) {
          console.error('Error parsing configuration file:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const duplicateConfiguration = () => {
    const duplicatedConfig = JSON.parse(JSON.stringify(formData.configuration));
    setFormData({ ...formData, configuration: duplicatedConfig });
  };

  const selectComponent = (componentName: string) => {
    setSelectedComponent(componentName);
  };

  const refreshPreview = () => {
    setPreviewKey((k) => k + 1);
  };

  const renderContent = () => {
    if (selectedTab === 'design') {
      if (selectedSubTab === 'brand') return <BrandPanel formData={formData} setFormData={setFormData} />;
      if (selectedSubTab === 'themes') return <ThemeSelector formData={formData} setFormData={setFormData} />;
      if (selectedSubTab === 'colors') return <ColorPaletteEditor formData={formData} setFormData={setFormData} />;
      if (selectedSubTab === 'typography') return <TypographyEditor formData={formData} setFormData={setFormData} />;
      if (selectedSubTab === 'effects') return <VisualEffectsEditor formData={formData} setFormData={setFormData} />;
    }
    if (selectedTab === 'layout') {
      if (selectedSubTab === 'components') return <LayoutEditor formData={formData} setFormData={setFormData} />;
      if (selectedSubTab === 'drag') return <DragDropManager isDragMode={isDragMode} setIsDragMode={setIsDragMode} />;
    }
    if (selectedTab === 'advanced') return <AdvancedSettings formData={formData} setFormData={setFormData} />;
    return (
      <div className="text-center py-8">
        <div className="bg-card border border-border rounded-lg p-6 text-muted-foreground">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-medium mb-2 text-foreground">Commencez la personnalisation</h3>
          <p className="text-sm">
            Utilisez les onglets ci-dessus pour personnaliser votre POS.<br />
            Commencez par le <strong>Design</strong> pour choisir votre thème.
          </p>
        </div>
      </div>
    );
  };

  // Nav rail + section content, shared between full and inline modes (matches
  // admin/src/components/pos/customizer/POSCustomizer.jsx's renderSidebar()).
  const renderSidebarContent = () => (
    <div className="flex flex-1 min-h-0">
      <CustomizerNavigation
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        selectedSubTab={selectedSubTab}
        setSelectedSubTab={setSelectedSubTab}
        mode={mode}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-card">
        <div className="px-3 py-2.5 border-b border-border shrink-0">
          <h2 className="text-[13px] font-semibold leading-tight">
            {SECTION_META[selectedSubTab]?.title || SECTION_META[selectedTab]?.title || 'Personnalisation'}
          </h2>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
            {SECTION_META[selectedSubTab]?.description || SECTION_META[selectedTab]?.description || ''}
          </p>
        </div>
        <div className={`flex-1 overflow-y-auto ${mode === 'full' ? 'px-3' : 'px-2'} ${mode === 'full' ? 'pb-3' : 'pb-2'}`}>
          <div className={mode === 'full' ? 'py-1.5' : 'py-1'}>
            {renderContent() || (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className={`text-center bg-white dark:bg-gray-800 ${mode === 'full' ? 'p-6' : 'p-3'} rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm`}>
                  <Layers className={`${mode === 'full' ? 'w-8 h-8' : 'w-6 h-6'} mx-auto mb-2 opacity-50`} />
                  <p className={mode === 'full' ? 'text-sm' : 'text-xs'}>Sélectionnez une option pour commencer</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DragDropProvider>
      {mode === 'full' ? (
        // The black CustomizerHeader is a top-level sibling of the sidebar+preview
        // row (matches admin's POSCustomizer.jsx) so it spans the full screen width
        // instead of being scoped to the sidebar's column.
        <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden">
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
            onToggleSidebar={() => setSidebarVisible((v) => !v)}
          />

          <div className="relative flex flex-1 min-h-0 overflow-hidden">
            {sidebarVisible && (
              <div className="w-[32%] bg-background border-r border-border flex flex-col overflow-hidden shadow-lg">
                {renderSidebarContent()}
              </div>
            )}

            <div className="flex-1 bg-[#f4f5f6] flex flex-col overflow-hidden relative">
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

              <div className="flex-1 relative overflow-hidden">
                <div className="absolute inset-0 p-4 lg:p-6">
                  <div
                    className={`
                      w-full h-full bg-white rounded-xl border border-border shadow-sm overflow-hidden
                      ${previewDevice === 'mobile' ? 'max-w-sm mx-auto' : ''}
                      ${previewDevice === 'tablet' ? 'max-w-4xl mx-auto' : ''}
                      ${isDragMode ? 'ring-2 ring-blue-500/30 ring-offset-4 ring-offset-muted/20' : ''}
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
                        dashboard: formData?.configuration?.dashboard || { cards: [{ title: 'Demo Card', value: '42' }] },
                      }}
                      modules={getSelectedModuleDisplayNames(formData?.selectedModules || [], modulesByCategory)}
                      navbarPosition={formData?.configuration?.navbarPosition || 'left'}
                      onComponentSelect={selectComponent}
                      isDragMode={isDragMode}
                      previewDevice={previewDevice}
                    />
                  </div>
                </div>

                {/* Floating preview toolbar (device size + refresh) replaces the old
                    full-width "Aperçu en temps réel" bar, matching admin's small
                    floating refresh button — the black CustomizerHeader above stays
                    the only header, spanning the full screen. The drag-mode toggle
                    lives in the sidebar's Drag & Drop panel (DragDropManager), so
                    it isn't duplicated here. */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
                  <div className="flex items-center bg-white/95 backdrop-blur rounded-lg p-1 border border-border shadow-sm">
                    <Button
                      variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreviewDevice('mobile')}
                      className="px-2"
                      title="Mobile"
                    >
                      <Smartphone className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreviewDevice('tablet')}
                      className="px-2"
                      title="Tablette"
                    >
                      <Tablet className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreviewDevice('desktop')}
                      className="px-2"
                      title="Bureau"
                    >
                      <Monitor className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={refreshPreview}
                    title="Actualiser l'aperçu"
                    className="h-7 w-7 bg-white/95 backdrop-blur border border-border shadow-sm"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {selectedComponent && (
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2">
                    <Badge variant="default" className="text-xs shadow-sm">
                      <Layers className="w-3 h-3 mr-1" />
                      {selectedComponent}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col overflow-hidden">
          <CustomizerHeader
            mode={mode}
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
          <div className="flex flex-1 min-h-0">{renderSidebarContent()}</div>
        </div>
      )}
    </DragDropProvider>
  );
};

export default POSCustomizer;
