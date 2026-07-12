import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ComponentLayoutItem {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  position: string;
}

interface DragDropContextType {
  isDragMode: boolean;
  selectedComponent: string | null;
  componentLayout: Record<string, ComponentLayoutItem>;
  toggleDragMode: () => void;
  selectComponent: (componentId: string) => void;
  toggleComponentVisibility: (componentId: string) => void;
  reorderComponent: (componentId: string, newOrder: number) => void;
  saveLayout: () => void;
  resetLayout: () => void;
  moveComponent: (dragId: string, hoverId: string) => void;
}

const DragDropCtx = createContext<DragDropContextType | null>(null);

const defaultComponentLayout: Record<string, ComponentLayoutItem> = {
  navbar: { id: 'navbar', name: 'Navigation', order: 1, visible: true, position: 'top' },
  header: { id: 'header', name: 'En-tête', order: 2, visible: true, position: 'top' },
  main: { id: 'main', name: 'Contenu Principal', order: 3, visible: true, position: 'center' },
  sidebar: { id: 'sidebar', name: 'Sidebar', order: 4, visible: true, position: 'right' },
  footer: { id: 'footer', name: 'Pied de page', order: 5, visible: true, position: 'bottom' },
};

export const DragDropProvider = ({ children }: { children: ReactNode }) => {
  const [isDragMode, setIsDragMode] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [componentLayout, setComponentLayout] = useState<Record<string, ComponentLayoutItem>>(defaultComponentLayout);

  const toggleDragMode = useCallback(() => {
    setIsDragMode(prev => !prev);
  }, []);

  const selectComponent = useCallback((componentId: string) => {
    setSelectedComponent(componentId);
  }, []);

  const toggleComponentVisibility = useCallback((componentId: string) => {
    setComponentLayout(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        visible: !prev[componentId]?.visible,
      },
    }));
  }, []);

  const reorderComponent = useCallback((componentId: string, newOrder: number) => {
    setComponentLayout(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        order: newOrder,
      },
    }));
  }, []);

  const saveLayout = useCallback(() => {
    localStorage.setItem('posLayout', JSON.stringify(componentLayout));
  }, [componentLayout]);

  const resetLayout = useCallback(() => {
    setComponentLayout(defaultComponentLayout);
    setSelectedComponent(null);
    localStorage.removeItem('posLayout');
  }, []);

  const moveComponent = useCallback((dragId: string, hoverId: string) => {
    setComponentLayout(prev => {
      const dragItem = prev[dragId];
      const hoverItem = prev[hoverId];
      if (!dragItem || !hoverItem) return prev;
      return {
        ...prev,
        [dragId]: { ...dragItem, order: hoverItem.order },
        [hoverId]: { ...hoverItem, order: dragItem.order },
      };
    });
  }, []);

  const value: DragDropContextType = {
    isDragMode, selectedComponent, componentLayout,
    toggleDragMode, selectComponent, toggleComponentVisibility,
    reorderComponent, saveLayout, resetLayout, moveComponent,
  };

  return (
    <DragDropCtx.Provider value={value}>
      {children}
    </DragDropCtx.Provider>
  );
};

export const useDragDrop = () => {
  const context = useContext(DragDropCtx);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
};

export default DragDropCtx;
