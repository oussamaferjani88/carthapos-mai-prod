import { useState, useEffect, useCallback } from 'react';

const BOOLEAN_KEYS = new Set([
  'taxEnabled', 'autoBackup', 'printReceipts', 'printKitchen', 'soundEnabled',
  'cashDrawerEnabled', 'cashDrawerAutoOpen', 'printerEnabled',
  'keyboardEnabled', 'keyboardSoundEnabled',
  'notificationEnabled', 'notificationSoundEnabled', 'notificationPersistentAlerts', 'notificationLowStockAlerts',
  'kioskEnabled', 'kioskFullscreen', 'kioskEmergencyExit', 'kioskHideCursor',
  'backupIncludeImages'
]);

const NUMBER_KEYS = new Set([
  'backupInterval', 'backupMaxBackups'
]);

export function deserializeSettingValue(key, rawValue) {
  if (rawValue === null || rawValue === undefined) return rawValue;
  if (BOOLEAN_KEYS.has(key)) {
    return rawValue === 'true' || rawValue === true || rawValue === '1';
  }
  if (NUMBER_KEYS.has(key)) {
    const n = Number(rawValue);
    return isNaN(n) ? rawValue : n;
  }
  return rawValue;
}

export function serializeSettingValue(key, value) {
  if (BOOLEAN_KEYS.has(key)) {
    return value ? 'true' : 'false';
  }
  if (NUMBER_KEYS.has(key)) {
    return String(value);
  }
  return String(value);
}

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
        if (result) {
          const deserialized = {};
          for (const [key, value] of Object.entries(result)) {
            deserialized[key] = deserializeSettingValue(key, value);
          }
          setSettings(deserialized);
        } else {
          setSettings({});
        }
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
      const raw = await window.electronAPI.getSetting(key);
      return deserializeSettingValue(key, raw);
    }
    return settings[key] ?? null;
  }, [settings]);

  const setSetting = useCallback(async (key, value) => {
    try {
      if (window.electronAPI?.setSetting) {
        const serialized = serializeSettingValue(key, value);
        const result = await window.electronAPI.setSetting(key, serialized);
        if (result.success) {
          setSettings(prev => ({ ...prev, [key]: value }));
        }
        return result;
      }
      setSettings(prev => ({ ...prev, [key]: value }));
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
          const serialized = serializeSettingValue(key, value);
          await window.electronAPI.setSetting(key, serialized);
        }
      }
      setSettings(prev => ({ ...prev, ...settingsObj }));
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
