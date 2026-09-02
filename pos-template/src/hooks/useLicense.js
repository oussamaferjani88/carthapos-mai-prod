import { useState, useEffect } from 'react';

export function useLicense() {
  const [license, setLicense] = useState(null);
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    validateLicense();
  }, []);

  const normalize = (result) => ({
    isValid: result?.isValid === true,
    status: result?.status || null,
    reason: result?.reason || null,
    license: result?.license || null
  });

  const validateLicense = async () => {
    try {
      setLoading(true);
      setError(null);

      if (window.electronAPI) {
        let result = normalize(await window.electronAPI.validateLicense());

        // License present but not yet bound to this machine/USB -> activate.
        if (!result.isValid && result.reason === 'ACTIVATION_REQUIRED') {
          console.log('validateLicense: Activation required, attempting activation...');
          result = normalize(await window.electronAPI.activateLicense());
        }

        if (result.isValid) {
          setLicense(result.license);
          setIsValid(true);
          setError(null);
        } else {
          setError(
            result.reason || result.status || 'License is not valid'
          );
          setIsValid(false);
          setLicense(result.license || null);
        }
      } else {
        // Web mode: honor an embedded license block (if the generated
        // app-config provides one). No synthetic DEV-LICENSE is granted.
        let embeddedLicense = null;
        try {
          if (window.__POS_CONFIG__ && window.__POS_CONFIG__.license) {
            embeddedLicense = window.__POS_CONFIG__.license;
          }
        } catch (e) {
          console.error('Failed to read embedded license', e);
        }

        if (embeddedLicense) {
          setLicense(embeddedLicense);
          setIsValid(true);
          setError(null);
        } else {
          setLicense(null);
          setIsValid(false);
          setError('No license configured');
        }
      }
    } catch (err) {
      console.error('validateLicense: Error validating license:', err);
      setError(err.message || 'License validation failed');
      setIsValid(false);
    } finally {
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
