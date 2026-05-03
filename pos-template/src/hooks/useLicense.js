import { useState, useEffect } from 'react';

export function useLicense() {
  const [license, setLicense] = useState(null);
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    validateLicense();
  }, []);

  const validateLicense = async () => {
    try {
      console.log('validateLicense: Starting license validation');
      setLoading(true);
      setError(null);
      
      // Vérifier si nous sommes dans Electron
      if (window.electronAPI) {
        console.log('validateLicense: Using Electron API');
        const validation = await window.electronAPI.validateLicense();
        console.log('validateLicense: Received validation result:', validation);
        
        if (validation.isValid) {
          console.log('validateLicense: License validation data:', validation.data);
          // Handle both cases: when license data is in validation.data or when it's a simple valid license
          const licenseData = validation.data || {
            licenseKey: 'VALID-LICENSE',
            clientName: 'Licensed User',
            sector: 'retail',
            licenseType: 'LIFETIME',
            modules: [
              { name: 'pos-core', displayName: 'Caisse de base', isEnabled: true },
              { name: 'inventory', displayName: 'Gestion des stocks', isEnabled: true },
              { name: 'reports', displayName: 'Rapports', isEnabled: true }
            ]
          };
          setLicense(licenseData);
          setIsValid(true);
          console.log('validateLicense: License is valid, set license data:', licenseData);
        } else {
          console.log('validateLicense: License is invalid:', validation.error || validation.message);
          setError(validation.error || validation.message);
          setIsValid(false);
        }
      } else {
        console.log('validateLicense: Using fallback (web mode)');
        // En mode développement web, simuler une licence valide
        setLicense({
          licenseKey: 'DEV-LICENSE',
          clientName: 'Development Mode',
          sector: 'development',
          licenseType: 'LIFETIME',
          modules: [
            { name: 'pos-core', displayName: 'Caisse de base', isEnabled: true },
            { name: 'inventory', displayName: 'Gestion des stocks', isEnabled: true },
            { name: 'reports', displayName: 'Rapports', isEnabled: true }
          ]
        });
        setIsValid(true);
        console.log('validateLicense: Set development license');
      }
      console.log('validateLicense: License validation completed successfully');
    } catch (err) {
      console.error('validateLicense: Error validating license:', err);
      setError(err.message);
      setIsValid(false);
    } finally {
      console.log('validateLicense: Setting loading to false');
      setLoading(false);
    }
  };

  const retryValidation = () => {
    validateLicense();
  };

  return {
    license,
    isValid,
    loading,
    error,
    retry: retryValidation
  };
}

