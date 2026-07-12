import { useState, useEffect } from 'react';
import { posService } from '../services';
import toast from 'react-hot-toast';

export const useSectors = () => {
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSectors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await posService.getSectors();
      setSectors(data);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSectorById = (sectorId: string) => sectors.find((s) => s.id === sectorId);
  const getSectorByName = (sectorName: string) =>
    sectors.find((s) => s.name.toLowerCase() === sectorName.toLowerCase());

  useEffect(() => {
    loadSectors();
  }, []);

  return { sectors, loading, error, loadSectors, getSectorById, getSectorByName };
};
