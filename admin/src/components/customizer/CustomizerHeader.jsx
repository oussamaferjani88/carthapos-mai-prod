import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { ArrowLeft, X, RotateCcw, Save, Download, Upload, Copy, Settings } from 'lucide-react';

const CustomizerHeader = ({ 
  mode, 
  onBack, 
  onCancel, 
  onSave, 
  resetToDefaults, 
  exportConfiguration, 
  importConfiguration, 
  duplicateConfiguration,
  fileInputRef,
  showAdvanced, 
  setShowAdvanced, 
  lastSaved,
  onToggleSidebar
}) => {
  return (
    <>
      {/* Header du customizer */}
      <div className={`border-b border-border ${mode === 'full' ? 'p-3' : 'p-2'} bg-gradient-to-r from-blue-600 to-purple-600 text-white`}>
        <div className={`flex items-center justify-between ${mode === 'full' ? 'mb-1.5' : 'mb-1'}`}>
          <h1 className={`${mode === 'full' ? 'text-lg' : 'text-sm'} font-bold`}>
            {mode === 'full' ? 'Personnalisation POS' : '🎨 Design Studio'}
          </h1>
          <div className="flex items-center space-x-2">
            {mode === 'full' && onBack && (
              <Button variant="secondary" size="sm" onClick={onBack} className="bg-white/20 hover:bg-white/30 text-white border-white/20">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Workflow Normal
              </Button>
            )}
            {mode === 'full' && onToggleSidebar && (
              <Button variant="secondary" size="sm" onClick={onToggleSidebar} className="bg-white/20 hover:bg-white/30 text-white border-white/20">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {mode === 'full' && (
          <p className="text-blue-100 text-sm">
            🎨 Interface immersive de personnalisation - Style WordPress
          </p>
        )}
      </div>

      {/* Actions rapides */}
      <div className={`border-b border-border ${mode === 'full' ? 'p-2.5' : 'p-2'} bg-muted/30`}>
        {/* Actions principales */}
        <div className="flex space-x-1.5">
          <Button size="sm" variant="outline" onClick={resetToDefaults} className="flex-1 text-xs h-7">
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} className="flex-1 text-xs h-7">
            <X className="w-3 h-3 mr-1" />
            Annuler
          </Button>
          <Button size="sm" onClick={onSave} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-7 text-xs">
            <Save className="w-3 h-3 mr-1" />
            Enregistrer
          </Button>
        </div>
      </div>
    </>
  );
};

export default CustomizerHeader;
