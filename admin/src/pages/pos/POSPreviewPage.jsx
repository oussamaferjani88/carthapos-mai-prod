import React from 'react';
import { POSPreview } from '../../components/pos/preview';
import POSWithAuth from '../../components/common/POSWithAuth';

// Composant POSPreviewPage qui intègre l'authentification
const POSPreviewPage = ({ 
  configuration = {}, 
  modules = [], 
  isDragMode = false, 
  onComponentSelect 
}) => {
  return (
    <div style={{ 
      height: '100%', 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box'
    }}>
      <POSWithAuth 
        posComponent={POSPreview}
        configuration={configuration}
        modules={modules}
        isDragMode={isDragMode}
        onComponentSelect={onComponentSelect}
        isPreviewMode={true}
      />
    </div>
  );
};

export default POSPreviewPage;
