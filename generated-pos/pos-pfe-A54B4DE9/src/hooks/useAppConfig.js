import { useState, useEffect, useCallback } from 'react';

export function useAppConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      
      if (window.electronAPI) {
        const appConfig = await window.electronAPI.getAppConfig();
        setConfig(appConfig);
      } else {
        const response = await fetch('app-config.json');
        if (response.ok) {
          const appConfig = await response.json();
          setConfig(appConfig);
        } else {
          throw new Error('Failed to load configuration');
        }
      }
    } catch (err) {
      console.error('Error loading app config:', err);
      setError(err.message);
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Listen for settings-changed events to reload config
  useEffect(() => {
    const handler = () => loadConfig();
    window.addEventListener('pos:settings-changed', handler);
    return () => window.removeEventListener('pos:settings-changed', handler);
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    reload: loadConfig
  };
}

