import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  MousePointer, 
  Move, 
  Grid3X3, 
  Layers, 
  RotateCcw,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Plus
} from 'lucide-react';

const DragDropControls = ({ onLayoutChange }) => {
  const [isDragEnabled, setIsDragEnabled] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState(null);

  // Composants disponibles pour le drag & drop
  const availableComponents = [
    { id: 'header', name: 'En-tête', icon: Layers, locked: false },
    { id: 'navigation', name: 'Navigation', icon: Grid3X3, locked: false },
    { id: 'product-grid', name: 'Grille produits', icon: Grid3X3, locked: false },
    { id: 'cart', name: 'Panier', icon: Layers, locked: false },
    { id: 'payment', name: 'Paiement', icon: Layers, locked: false },
    { id: 'footer', name: 'Pied de page', icon: Layers, locked: false }
  ];

  const [components, setComponents] = useState(availableComponents);

  // Activer/désactiver le mode drag
  const toggleDragMode = () => {
    setIsDragEnabled(!isDragEnabled);
    if (onLayoutChange) {
      onLayoutChange({ dragEnabled: !isDragEnabled });
    }
  };

  // Verrouiller/déverrouiller un composant
  const toggleComponentLock = (componentId) => {
    setComponents(prev => prev.map(comp => 
      comp.id === componentId 
        ? { ...comp, locked: !comp.locked }
        : comp
    ));
  };

  // Déplacer un composant vers le haut
  const moveComponentUp = (componentId) => {
    setComponents(prev => {
      const index = prev.findIndex(comp => comp.id === componentId);
      if (index > 0) {
        const newComponents = [...prev];
        [newComponents[index - 1], newComponents[index]] = [newComponents[index], newComponents[index - 1]];
        if (onLayoutChange) {
          onLayoutChange({ components: newComponents });
        }
        return newComponents;
      }
      return prev;
    });
  };

  // Déplacer un composant vers le bas
  const moveComponentDown = (componentId) => {
    setComponents(prev => {
      const index = prev.findIndex(comp => comp.id === componentId);
      if (index < prev.length - 1) {
        const newComponents = [...prev];
        [newComponents[index], newComponents[index + 1]] = [newComponents[index + 1], newComponents[index]];
        if (onLayoutChange) {
          onLayoutChange({ components: newComponents });
        }
        return newComponents;
      }
      return prev;
    });
  };

  // Dupliquer un composant
  const duplicateComponent = (componentId) => {
    const component = components.find(comp => comp.id === componentId);
    if (component) {
      const newComponent = {
        ...component,
        id: `${component.id}-copy-${Date.now()}`,
        name: `${component.name} (Copie)`
      };
      setComponents(prev => [...prev, newComponent]);
      if (onLayoutChange) {
        onLayoutChange({ components: [...components, newComponent] });
      }
    }
  };

  // Supprimer un composant
  const removeComponent = (componentId) => {
    setComponents(prev => prev.filter(comp => comp.id !== componentId));
    if (onLayoutChange) {
      onLayoutChange({ components: components.filter(comp => comp.id !== componentId) });
    }
  };

  return (
    <div className="space-y-4">
      {/* Contrôles principaux du drag & drop */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <MousePointer className="w-4 h-4 mr-2" />
            Mode Drag & Drop
          </CardTitle>
          <CardDescription className="text-xs">
            Activez le mode drag & drop pour réorganiser les composants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Activation du mode drag */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Mode interactif</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={isDragEnabled}
                onCheckedChange={toggleDragMode}
              />
              {isDragEnabled && (
                <Badge variant="default" className="text-xs">
                  <Move className="w-3 h-3 mr-1" />
                  Actif
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Options d'assistance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Afficher la grille</Label>
              <Switch
                checked={showGrid}
                onCheckedChange={(checked) => {
                  setShowGrid(checked);
                  if (onLayoutChange) {
                    onLayoutChange({ showGrid: checked });
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Alignement sur la grille</Label>
              <Switch
                checked={snapToGrid}
                onCheckedChange={(checked) => {
                  setSnapToGrid(checked);
                  if (onLayoutChange) {
                    onLayoutChange({ snapToGrid: checked });
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des composants */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Layers className="w-4 h-4 mr-2" />
            Composants POS
          </CardTitle>
          <CardDescription className="text-xs">
            Gérez l'ordre et la visibilité des composants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {components.map((component, index) => (
              <div 
                key={component.id}
                className={`
                  flex items-center justify-between p-2 rounded border transition-colors
                  ${selectedComponent === component.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-accent'}
                  ${component.locked ? 'opacity-60' : ''}
                `}
                onClick={() => setSelectedComponent(selectedComponent === component.id ? null : component.id)}
              >
                <div className="flex items-center space-x-2">
                  <component.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium">{component.name}</span>
                  {component.locked && (
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  {/* Boutons de contrôle */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleComponentLock(component.id);
                    }}
                    title={component.locked ? "Déverrouiller" : "Verrouiller"}
                  >
                    {component.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveComponentUp(component.id);
                    }}
                    disabled={index === 0 || component.locked}
                    title="Déplacer vers le haut"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveComponentDown(component.id);
                    }}
                    disabled={index === components.length - 1 || component.locked}
                    title="Déplacer vers le bas"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateComponent(component.id);
                    }}
                    title="Dupliquer"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeComponent(component.id);
                    }}
                    disabled={component.locked}
                    title="Supprimer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Bouton d'ajout de composant */}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 text-xs"
            onClick={() => {
              const newComponent = {
                id: `custom-${Date.now()}`,
                name: 'Nouveau composant',
                icon: Plus,
                locked: false
              };
              setComponents(prev => [...prev, newComponent]);
            }}
          >
            <Plus className="w-3 h-3 mr-1" />
            Ajouter un composant
          </Button>
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <RotateCcw className="w-4 h-4 mr-2" />
            Actions rapides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                setComponents(availableComponents);
                if (onLayoutChange) {
                  onLayoutChange({ components: availableComponents });
                }
              }}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Réinitialiser
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                setSelectedComponent(null);
                setIsDragEnabled(false);
                if (onLayoutChange) {
                  onLayoutChange({ dragEnabled: false });
                }
              }}
            >
              <EyeOff className="w-3 h-3 mr-1" />
              Aperçu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DragDropControls;
