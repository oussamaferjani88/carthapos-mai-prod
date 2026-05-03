import React from 'react';

// Composant wrapper simple qui affiche le contenu
const DraggableComponent = ({ 
  id, 
  componentName, 
  className = '', 
  style = {}, 
  isVisible = true, 
  isDragMode = false, 
  onComponentSelect,
  children 
}) => {
  if (!isVisible && !isDragMode) {
    return null;
  }

  return (
    <div 
      className={className}
      style={style}
      data-component-id={id}
      data-component-name={componentName}
    >
      {children}
    </div>
  );
};

export default DraggableComponent;
