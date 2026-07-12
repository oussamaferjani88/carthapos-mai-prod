import { useState, useEffect, useCallback } from 'react';
import { usbService } from '../services';
import toast from 'react-hot-toast';

export const useUSBDrives = () => {
  const [usbDrives, setUsbDrives] = useState<any[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  const loadUSBDrives = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usbService.listUSBDrives();
      setUsbDrives(data);
      if (data.length === 0) {
        toast.error('Aucun périphérique USB détecté');
      }
    } catch (err: any) {
      setError(err.message);
      setUsbDrives([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshDrives = () => {
    loadUSBDrives();
  };

  const installToUSB = useCallback(
    async (licenseId: string, drivePath?: string) => {
      const targetPath = drivePath || selectedDrive;
      if (!targetPath) {
        toast.error('Veuillez sélectionner un périphérique USB');
        return null;
      }
      try {
        setInstalling(true);
        const result = await usbService.installToUSB(licenseId, targetPath);
        toast.success('Installation sur USB réussie');
        return result;
      } catch (err: any) {
        toast.error(err.message);
        throw err;
      } finally {
        setInstalling(false);
      }
    },
    [selectedDrive]
  );

  useEffect(() => {
    loadUSBDrives();
  }, []);

  return {
    usbDrives,
    selectedDrive,
    setSelectedDrive,
    loading,
    error,
    installing,
    loadUSBDrives: refreshDrives,
    installToUSB,
  };
};
