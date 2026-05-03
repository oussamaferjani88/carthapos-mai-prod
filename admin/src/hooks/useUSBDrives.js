/**
 * useUSBDrives Hook
 * Manages USB drive detection and operations
 */

import { useState } from 'react';
import { usbService } from '../services';
import toast from 'react-hot-toast';

export const useUSBDrives = () => {
  const [usbDrives, setUsbDrives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load/refresh USB drives
   */
  const loadUSBDrives = async () => {
    try {
      setLoading(true);
      setError(null);
      const drives = await usbService.getUSBDrives();
      setUsbDrives(drives);
      
      if (drives.length === 0) {
        toast.error('Vous devez insérer une clé USB');
      } else {
        toast.success(`${drives.length} clé(s) USB détectée(s)`);
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      console.error('Error loading USB drives:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Write license to USB
   */
  const writeLicenseToUSB = async (drivePath, licenseContent, licenseKey) => {
    try {
      setLoading(true);
      await usbService.writeLicenseToUSB({
        drivePath,
        licenseContent,
        licenseKey
      });
      toast.success('Licence écrite sur la clé USB avec succès');
    } catch (err) {
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify license on USB
   */
  const verifyUSBLicense = async (drivePath) => {
    try {
      setLoading(true);
      const result = await usbService.verifyUSBLicense(drivePath);
      toast.success('Licence vérifiée avec succès');
      return result;
    } catch (err) {
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get drive display label
   */
  const getDriveLabel = (drive) => {
    return usbService.getDriveDisplayLabel(drive);
  };

  /**
   * Validate drive for license writing
   */
  const validateDrive = (drive) => {
    return usbService.validateDrive(drive);
  };

  return {
    usbDrives,
    loading,
    error,
    loadUSBDrives,
    writeLicenseToUSB,
    verifyUSBLicense,
    getDriveLabel,
    validateDrive
  };
};
