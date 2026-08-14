import React from 'react';
import { Button } from '../ui/button';
import { MousePointer, Move } from 'lucide-react';

const DragDropManager = ({ isDragMode, setIsDragMode }) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-3 px-4 py-6 border border-dashed border-muted-foreground/30 rounded-lg text-center bg-white">
        <Move className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="text-[13px] font-medium">Mode Drag & Drop</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Activez le mode pour réorganiser les composants de votre POS dans l'aperçu.
          </p>
        </div>
        <Button
          size="sm"
          variant={isDragMode ? 'default' : 'outline'}
          onClick={() => setIsDragMode(!isDragMode)}
        >
          <MousePointer className="w-3.5 h-3.5" />
          {isDragMode ? 'Désactiver' : 'Activer'} Drag & Drop
        </Button>
      </div>

      {isDragMode && (
        <div className="px-3 py-2.5 rounded-md border border-border bg-accent/30">
          <p className="text-[11px] font-medium mb-1">Instructions</p>
          <ul className="text-[11px] text-muted-foreground space-y-1">
            <li>• Cliquez et glissez les éléments dans le preview</li>
            <li>• Les zones de dépôt sont surlignées en bleu</li>
            <li>• Relâchez pour confirmer le nouvel emplacement</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default DragDropManager;
