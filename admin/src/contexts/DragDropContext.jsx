import React, { createContext, useContext, useState, useCallback } from 'react';

// Contexte pour le drag & drop
const DragDropContext = createContext();

// Configuration par défaut des composants
const defaultComponentLayout = {
  navbar: {
    id: 'navbar',
    name: 'Navigation',
    order: 1,
    visible: true,
    position: 'top'
  },
  header: {
    id: 'header',
    name: 'En-tête',
    order: 2,
    visible: true,
    position: 'top'
  },
  main: {
    id: 'main',
    name: 'Contenu Principal',
    order: 3,
    visible: true,
    position: 'center'
  },
  sidebar: {
    id: 'sidebar',
    name: 'Sidebar',
    order: 4,
    visible: true,
    position: 'right'
  },
  footer: {
    id: 'footer',
    name: 'Pied de page',
    order: 5,
    visible: true,
    position: 'bottom'
  }
};

// Provider du contexte
export const DragDropProvider = ({ children }) => {
  const [isDragMode, setIsDragMode] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [componentLayout, setComponentLayout] = useState(defaultComponentLayout);

  // Basculer le mode drag & drop
  const toggleDragMode = useCallback(() => {
    setIsDragMode(prev => !prev);
  }, []);

  // Sélectionner un composant
  const selectComponent = useCallback((componentId) => {
    setSelectedComponent(componentId);
  }, []);

  // Basculer la visibilité d'un composant
  const toggleComponentVisibility = useCallback((componentId) => {
    setComponentLayout(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        visible: !prev[componentId]?.visible
      }
    }));
  }, []);

  // Réorganiser les composants
  const reorderComponent = useCallback((componentId, newOrder) => {
    setComponentLayout(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        order: newOrder
      }
    }));
  }, []);

  // Sauvegarder le layout
  const saveLayout = useCallback(() => {
    localStorage.setItem('posLayout', JSON.stringify(componentLayout));
    console.log('Layout sauvegardé:', componentLayout);
  }, [componentLayout]);

  // Réinitialiser le layout
  const resetLayout = useCallback(() => {
    setComponentLayout(defaultComponentLayout);
    setSelectedComponent(null);
    localStorage.removeItem('posLayout');
  }, []);

  // Déplacer un composant (drag & drop)
  const moveComponent = useCallback((dragId, hoverId) => {
    setComponentLayout(prev => {
      const dragItem = prev[dragId];
      const hoverItem = prev[hoverId];
      
      if (!dragItem || !hoverItem) return prev;

      return {
        ...prev,
        [dragId]: { ...dragItem, order: hoverItem.order },
        [hoverId]: { ...hoverItem, order: dragItem.order }
      };
    });
  }, []);

  const value = {
    // État
    isDragMode,
    selectedComponent,
    componentLayout,
    
    // Actions
    toggleDragMode,
    selectComponent,
    toggleComponentVisibility,
    reorderComponent,
    saveLayout,
    resetLayout,
    moveComponent
  };

  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  );
};

// Hook pour utiliser le contexte
export const useDragDrop = () => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
};

export default DragDropContext;
