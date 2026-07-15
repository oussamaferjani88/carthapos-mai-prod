import { useState, useEffect, useCallback } from 'react';

export function useSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (window.electronAPI?.getAllSettings) {
        const result = await window.electronAPI.getAllSettings();
        setSettings(result || {});
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const getSetting = useCallback(async (key) => {
    if (window.electronAPI?.getSetting) {
      return await window.electronAPI.getSetting(key);
    }
    return settings[key] || null;
  }, [settings]);

  const setSetting = useCallback(async (key, value) => {
    try {
      if (window.electronAPI?.setSetting) {
        const result = await window.electronAPI.setSetting(key, value);
        if (result.success) {
          setSettings(prev => ({ ...prev, [key]: String(value) }));
        }
        return result;
      }
      setSettings(prev => ({ ...prev, [key]: String(value) }));
      return { success: true };
    } catch (err) {
      console.error('Error setting setting:', err);
      return { success: false, error: err.message };
    }
  }, []);

  const setMultipleSettings = useCallback(async (settingsObj) => {
    try {
      if (window.electronAPI?.setSetting) {
        for (const [key, value] of Object.entries(settingsObj)) {
          await window.electronAPI.setSetting(key, value);
        }
      }
      setSettings(prev => {
        const updated = { ...prev };
        for (const [key, value] of Object.entries(settingsObj)) {
          updated[key] = String(value);
        }
        return updated;
      });
      return { success: true };
    } catch (err) {
      console.error('Error saving settings:', err);
      return { success: false, error: err.message };
    }
  }, []);

  return {
    settings,
    loading,
    error,
    getSetting,
    setSetting,
    setMultipleSettings,
    reload: loadSettings
  };
}
