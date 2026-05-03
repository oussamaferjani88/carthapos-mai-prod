/**
 * useSectors Hook
 * Manages sector data and operations
 */

import { useState, useEffect } from 'react';
import { posService } from '../services';
import toast from 'react-hot-toast';

export const useSectors = () => {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load all sectors
   */
  const loadSectors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await posService.getSectors();
      setSectors(data);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      console.error('Error loading sectors:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get sector by ID
   */
  const getSectorById = (sectorId) => {
    return sectors.find(s => s.id === sectorId);
  };

  /**
   * Get sector by name
   */
  const getSectorByName = (sectorName) => {
    return sectors.find(s => s.name.toLowerCase() === sectorName.toLowerCase());
  };

  // Load sectors on mount
  useEffect(() => {
    loadSectors();
  }, []);

  return {
    sectors,
    loading,
    error,
    loadSectors,
    getSectorById,
    getSectorByName
  };
};
