import React from 'react';
import { Button } from '../ui/button';
import { ArrowLeft, RotateCcw, Save, X, PanelLeftOpen } from 'lucide-react';

const CustomizerHeader = ({
  mode,
  onBack,
  onCancel,
  onSave,
  resetToDefaults,
  importConfiguration,
  fileInputRef,
  lastSaved,
  onToggleSidebar,
  isDirty = false,
}) => {
  const renderActions = (compact = false) => (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={resetToDefaults}
        className={`text-white/70 hover:text-white hover:bg-white/10 ${compact ? 'flex-1' : 'hidden sm:inline-flex'}`}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Réinitialiser
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
        className={`text-white/70 hover:text-white hover:bg-white/10 ${compact ? 'flex-1' : ''}`}
      >
        <X className="w-3.5 h-3.5" />
        Annuler
      </Button>
      <Button
        size="sm"
        onClick={onSave}
        className={`bg-blue-600 hover:bg-blue-700 text-white ${compact ? 'flex-1' : ''}`}
      >
        <Save className="w-3.5 h-3.5" />
        Enregistrer
      </Button>
    </>
  );

  return (
    <>
      <div className="bg-[#0b0b0b] text-white flex-shrink-0">
        <div className={`flex items-center gap-2 px-3 ${mode === 'full' ? 'h-[52px] min-h-[52px]' : 'h-11 min-h-11'}`}>
          {mode === 'full' && onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-white/70 hover:text-white hover:bg-white/10 -ml-1.5 shrink-0"
              title="Quitter la personnalisation"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="text-white/70 hover:text-white hover:bg-white/10 shrink-0 xl:hidden"
              title="Afficher / masquer les options"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </Button>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-[13px] font-semibold truncate">
                {mode === 'full' ? 'Personnalisation POS' : 'Design Studio'}
              </h1>
              {isDirty && (
                <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] text-amber-400/90 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Modifications non enregistrées
                </span>
              )}
              {!isDirty && lastSaved && mode === 'full' && (
                <span className="hidden md:inline-flex items-center text-[10px] text-white/40 whitespace-nowrap">
                  Enregistré
                </span>
              )}
            </div>
            {mode === 'full' && (
              <p className="text-[11px] text-white/50 truncate">
                Configuration de l'interface du POS
              </p>
            )}
          </div>

          {mode === 'full' && (
            <div className="flex items-center gap-1.5 shrink-0">{renderActions()}</div>
          )}
        </div>

        {mode !== 'full' && (
          <div className="px-2 pb-2">
            <div className="flex gap-1.5">{renderActions(true)}</div>
          </div>
        )}
      </div>

      <input type="file" ref={fileInputRef} onChange={importConfiguration} accept=".json" className="hidden" />
    </>
  );
};

export default CustomizerHeader;
