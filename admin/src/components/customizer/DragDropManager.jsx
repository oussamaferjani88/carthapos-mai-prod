import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { MousePointer, Move } from 'lucide-react';

const DragDropManager = ({ isDragMode, setIsDragMode }) => {
  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center text-foreground">
          <MousePointer className="w-4 h-4 mr-2" />
          Réorganisation drag & drop
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <Move className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-medium mb-2">Mode Drag & Drop</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Activez le mode pour réorganiser les composants de votre POS
          </p>
          <Button
            variant={isDragMode ? 'default' : 'outline'}
            onClick={() => setIsDragMode(!isDragMode)}
          >
            <MousePointer className="w-4 h-4 mr-2" />
            {isDragMode ? 'Désactiver' : 'Activer'} Drag & Drop
          </Button>
        </div>
        
        {isDragMode && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Instructions :</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Cliquez et glissez les éléments dans le preview</li>
              <li>• Les zones de dépôt sont surlignées en bleu</li>
              <li>• Relâchez pour confirmer le nouvel emplacement</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DragDropManager;
