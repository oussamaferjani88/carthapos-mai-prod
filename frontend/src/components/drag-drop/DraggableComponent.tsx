import { CSSProperties, ReactNode } from 'react';

interface DraggableComponentProps {
  id: string;
  componentName?: string;
  className?: string;
  style?: CSSProperties;
  isVisible?: boolean;
  isDragMode?: boolean;
  onComponentSelect?: (id: string) => void;
  children: ReactNode;
}

// Ported from admin/src/components/drag-drop/DraggableComponent.jsx — a thin
// wrapper: renders nothing when the component is hidden and drag mode is
// off, otherwise renders its children tagged with data-component-id/name
// so the drag-drop panel can target them.
const DraggableComponent = ({
  id,
  componentName,
  className = '',
  style = {},
  isVisible = true,
  isDragMode = false,
  children,
}: DraggableComponentProps) => {
  if (!isVisible && !isDragMode) {
    return null;
  }

  return (
    <div className={className} style={style} data-component-id={id} data-component-name={componentName}>
      {children}
    </div>
  );
};

export default DraggableComponent;
