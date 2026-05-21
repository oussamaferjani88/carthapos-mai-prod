import { useState, useEffect } from 'react';

export function useAppConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      console.log('[POS DEBUG] [React] loadConfig: Starting to load config');
      setLoading(true);
      
      // Vérifier si nous sommes dans Electron
      if (window.electronAPI) {
        console.log('[POS DEBUG] [React] loadConfig: Using Electron API');
        const appConfig = await window.electronAPI.getAppConfig();
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📋 [POS DEBUG] CONFIG LOADED FROM ELECTRON');
        console.log('Modules array:', appConfig?.modules);
        console.log('Enabled modules:', appConfig?.modules?.map(m => ({name: m.name, enabled: m.isEnabled})));
        console.log('Module count:', appConfig?.modules?.length);
        console.log('Full config:', JSON.stringify(appConfig, null, 2));
        console.log('═══════════════════════════════════════════════════════════');
        setConfig(appConfig);
        // Debug: Print the config after setting
        setTimeout(() => {
          console.log('🔍 [POS DEBUG] [React] appConfig after setConfig:', JSON.stringify(appConfig, null, 2));
        }, 0);
      } else {
        console.log('[POS DEBUG] [React] loadConfig: Using fallback fetch');
        // Fallback pour le développement web (Vite / Electron)
        // IMPORTANT: use a relative path so that in Electron (file:// protocol)
        // the request resolves next to dist/index.html instead of trying to hit
        // the root of the drive (e.g. C:/app-config.json).
        const response = await fetch('app-config.json');
        if (response.ok) {
          const appConfig = await response.json();
          console.log('═══════════════════════════════════════════════════════════');
          console.log('📋 [POS DEBUG] CONFIG LOADED FROM FETCH');
          console.log('Modules array:', appConfig?.modules);
          console.log('Enabled modules:', appConfig?.modules?.map(m => ({name: m.name, enabled: m.isEnabled})));
          console.log('Module count:', appConfig?.modules?.length);
          console.log('Full config:', JSON.stringify(appConfig, null, 2));
          console.log('═══════════════════════════════════════════════════════════');
          setConfig(appConfig);
          // Debug: Print the config after setting
          setTimeout(() => {
            console.log('🔍 [POS DEBUG] [React] appConfig after setConfig:', JSON.stringify(appConfig, null, 2));
          }, 0);
        } else {
          throw new Error('Failed to load configuration');
        }
      }
      console.log('[POS DEBUG] [React] loadConfig: Config loaded successfully');
    } catch (err) {
      console.error('[POS DEBUG] [React] loadConfig: Error loading app config:', err);
      setError(err.message);
      // Set a basic fallback config to prevent the app from being stuck
      console.log('[POS DEBUG] [React] loadConfig: Setting fallback config');
      setConfig({
        theme: {
          businessName: 'POS System',
          currency: 'TND',
          language: 'fr'
        },
        modules: [],
        security: {
          requireUSBLicense: false
        }
      });
    } finally {
      console.log('loadConfig: Setting loading to false');
      setLoading(false);
    }
  };

  return {
    config,
    loading,
    error,
    reload: loadConfig
  };
}

