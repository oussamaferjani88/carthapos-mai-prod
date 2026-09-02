import React from 'react';
import POSCustomizer from '../../components/pos/customizer/POSCustomizer';
import { usePOSConfiguration } from '../../hooks/usePOSConfiguration';

// Harnais temporaire (non lié à l'auth admin) pour vérifier le vrai flux
// LayoutEditor -> POSCustomizer -> POSRealtimePreview -> POSPreviewPage ->
// POSWithAuth -> POSPreview -> POSContent -> POSSales, exactement comme un
// utilisateur réel du générateur POS. Supprimé après vérification.
export default function DevPreviewCheck() {
  const { configuration, setConfiguration } = usePOSConfiguration({ businessName: 'Café Test' });
  const [selectedModules, setSelectedModules] = React.useState(['sales', 'dashboard', 'products']);

  return (
    <div style={{ height: '100vh' }}>
      <POSCustomizer
        formData={{ configuration, selectedModules }}
        setFormData={(data) => {
          setConfiguration(data.configuration);
          setSelectedModules(data.selectedModules);
        }}
        onSave={() => {}}
        onCancel={() => {}}
        onBack={() => {}}
        mode="full"
        modulesByCategory={{}}
      />
    </div>
  );
}
