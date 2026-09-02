import React, { useState, useRef } from 'react';

import CustomizerHeader from '../../customizer/CustomizerHeader';
import CustomizerNavigation from '../../customizer/CustomizerNavigation';
import BrandPanel from '../../customizer/BrandPanel';
import ThemeSelector from '../../customizer/ThemeSelector';
import ColorPaletteEditor from '../../customizer/ColorPaletteEditor';
import TypographyEditor from '../../customizer/TypographyEditor';
import VisualEffectsEditor from '../../customizer/VisualEffectsEditor';
import LayoutEditor from '../../customizer/LayoutEditor';
import PageComponentsEditor from '../../customizer/PageComponentsEditor';
import AdvancedSettings from '../../customizer/AdvancedSettings';
import POSRealtimePreview from '../preview/POSRealtimePreview';
import { getSelectedModuleDisplayNames } from '../../../utils/posPreviewUtils';

import { Button } from '../../ui/button';
import { RotateCw } from 'lucide-react';

const SECTION_META = {
  brand: { title: 'Marque', description: 'Logo, nom et identité du commerce' },
  themes: { title: 'Thème', description: 'Choisissez un thème prédéfini' },
  colors: { title: 'Couleurs', description: 'Personnalisez la palette' },
  typography: { title: 'Typographie', description: 'Police, taille et graisse du texte' },
  effects: { title: 'Effets visuels', description: 'Animations, ombres et transparence' },
  layout: { title: 'Mise en page', description: 'Navigation, espacement et composants' },
  pages: { title: 'Pages', description: 'Disposition des composants par page' },
  advanced: { title: 'Avancé', description: 'Performance et CSS personnalisé' },
};

const POSCustomizer = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  onBack,
  mode = 'inline',
  modulesByCategory = {},
  onToggleSidebar,
}) => {
  const [selectedTab, setSelectedTab] = useState('design');
  const [selectedSubTab, setSelectedSubTab] = useState('brand');
  const [previewKey, setPreviewKey] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const fileInputRef = useRef(null);
  const initialSnapshotRef = useRef(null);
  if (initialSnapshotRef.current === null) {
    initialSnapshotRef.current = JSON.stringify(formData?.configuration || {});
  }
  const isDirty = JSON.stringify(formData?.configuration || {}) !== initialSnapshotRef.current;

  const activeSection = selectedTab === 'advanced'
    ? 'advanced'
    : selectedTab === 'pages'
      ? 'pages'
      : selectedTab === 'layout'
        ? 'layout'
        : selectedSubTab;

  const resetToDefaults = () => {
    setFormData({
      ...formData,
      configuration: {
        primaryColor: '#3B82F6',
        secondaryColor: '#64748B',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Inter',
        fontSize: '14px',
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

  const importConfiguration = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          setFormData({
            ...formData,
            configuration: { ...formData.configuration, ...config },
          });
        } catch {
          // silent
        }
      };
      reader.readAsText(file);
    }
  };

  const duplicateConfiguration = () => {
    const duplicatedConfig = JSON.parse(JSON.stringify(formData.configuration));
    setFormData({ ...formData, configuration: duplicatedConfig });
  };

  const handleSave = () => {
    onSave?.();
    setLastSaved(new Date().toLocaleTimeString());
  };

  const refreshPreview = () => {
    setPreviewKey((k) => k + 1);
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
    }

    if (selectedTab === 'pages') {
      return <PageComponentsEditor formData={formData} setFormData={setFormData} />;
    }

    if (selectedTab === 'advanced') {
      return <AdvancedSettings formData={formData} setFormData={setFormData} />;
    }

    return null;
  };

  const renderSidebar = () => (
    <div className="flex h-full min-h-0">
      <CustomizerNavigation
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        selectedSubTab={selectedSubTab}
        setSelectedSubTab={setSelectedSubTab}
        mode={mode}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-card">
        <div className="px-2 py-2 border-b border-border shrink-0">
          <h2 className="text-xs font-semibold leading-tight">
            {SECTION_META[activeSection]?.title || 'Personnalisation'}
          </h2>
          <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
            {SECTION_META[activeSection]?.description || ''}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <div className="py-1">{renderContent()}</div>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="flex-1 relative overflow-hidden bg-[#f4f5f6]">
      <div className="absolute inset-0 p-4 lg:p-6">
        <div className="w-full h-full bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <POSRealtimePreview
            key={previewKey}
            config={{
              ...formData?.configuration,
              businessName: formData?.configuration?.businessName || 'Demo POS',
              primaryColor: formData?.configuration?.primaryColor || '#3B82F6',
              backgroundColor: formData?.configuration?.backgroundColor || '#FFFFFF',
              dashboard: formData?.configuration?.dashboard || { cards: [{ title: 'Demo Card', value: '42' }] },
            }}
            modules={getSelectedModuleDisplayNames(formData?.selectedModules || [], modulesByCategory)}
            navbarPosition={formData?.configuration?.navbarPosition || 'left'}
          />
        </div>
      </div>

      <Button
        size="icon"
        variant="ghost"
        onClick={refreshPreview}
        title="Actualiser l'aperçu"
        className="absolute top-2.5 right-2.5 h-7 w-7 bg-white/95 backdrop-blur border border-border shadow-sm"
      >
        <RotateCw className="w-3.5 h-3.5" />
      </Button>
    </div>
  );

  return mode === 'full' ? (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
          <CustomizerHeader
            mode={mode}
            onBack={onBack}
            onCancel={onCancel}
            onSave={handleSave}
            resetToDefaults={resetToDefaults}
            exportConfiguration={exportConfiguration}
            importConfiguration={importConfiguration}
            duplicateConfiguration={duplicateConfiguration}
            fileInputRef={fileInputRef}
            showAdvanced={false}
            setShowAdvanced={() => {}}
            lastSaved={lastSaved}
            isDirty={isDirty}
            onToggleSidebar={() => setMobileSidebarOpen((v) => !v)}
          />

          <div className="relative flex flex-1 min-h-0">
            {mobileSidebarOpen && (
              <div
                className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[1px] xl:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
            )}

            <aside
              className={`
                absolute inset-y-0 left-0 z-40 w-[32%] bg-background border-r border-border shadow-2xl
                transition-transform duration-200 ease-out
                xl:static xl:translate-x-0 xl:shadow-none xl:z-auto
                ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              `}
            >
              {renderSidebar()}
            </aside>

            <div className="flex-1 min-w-0 flex flex-col">
              {renderPreview()}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col overflow-hidden">
          <CustomizerHeader
            mode={mode}
            onCancel={onCancel}
            onSave={handleSave}
            resetToDefaults={resetToDefaults}
            exportConfiguration={exportConfiguration}
            importConfiguration={importConfiguration}
            duplicateConfiguration={duplicateConfiguration}
            fileInputRef={fileInputRef}
            showAdvanced={false}
            setShowAdvanced={() => {}}
            lastSaved={lastSaved}
            isDirty={isDirty}
            onToggleSidebar={onToggleSidebar}
          />
          <div className="flex flex-1 min-h-0">{renderSidebar()}</div>
        </div>
      );
};

export default POSCustomizer;
