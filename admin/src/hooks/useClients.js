/**
 * useClients Hook
 * Manages client data and operations
 */

import { useState, useEffect } from 'react';
import { clientService } from '../services';
import { useAccessMode } from '../contexts/AccessModeContext';
import toast from 'react-hot-toast';

export const useClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isUserMode, currentUserId } = useAccessMode();

  /**
   * Load all clients (filtered by userId in user mode)
   */
  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientService.getAllClients();
      
      // Ensure clients is always an array
      let clientsArray = Array.isArray(data) ? data : [];
      
      // Filter by userId if in user mode
      if (isUserMode && currentUserId) {
        clientsArray = clientsArray.filter(client => 
          client.userId === currentUserId || client.createdBy === currentUserId
        );
      }
      
      setClients(clientsArray);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      console.error('Error loading clients:', err);
      // Set empty array on error
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get client by ID
   */
  const getClientById = (clientId) => {
    return clients.find(c => c.id === clientId);
  };

  /**
   * Create new client (add userId in user mode)
   */
  const createClient = async (clientData) => {
    try {
      setLoading(true);
      
      // Add userId if in user mode
      const dataToSend = isUserMode && currentUserId 
        ? { ...clientData, userId: currentUserId, createdBy: currentUserId }
        : clientData;
      
      const newClient = await clientService.createClient(dataToSend);
      setClients(prev => [...prev, newClient]);
      toast.success('Client créé avec succès');
      return newClient;
    } catch (err) {
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update existing client
   */
  const updateClient = async (clientId, clientData) => {
    try {
      setLoading(true);
      const updatedClient = await clientService.updateClient(clientId, clientData);
      setClients(prev => prev.map(c => c.id === clientId ? updatedClient : c));
      toast.success('Client mis à jour avec succès');
      return updatedClient;
    } catch (err) {
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete client
   */
  const deleteClient = async (clientId) => {
    try {
      setLoading(true);
      await clientService.deleteClient(clientId);
      setClients(prev => prev.filter(c => c.id !== clientId));
      toast.success('Client supprimé avec succès');
    } catch (err) {
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load clients on mount and when access mode changes
  useEffect(() => {
    loadClients();
  }, [isUserMode, currentUserId]);

  return {
    clients,
    loading,
    error,
    loadClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient
  };
};
