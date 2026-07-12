import { useState, useEffect } from 'react';
import { clientService } from '../services';
import { useAccessMode } from '../contexts/AccessModeContext';
import toast from 'react-hot-toast';

export const useClients = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isUserMode, currentUserId } = useAccessMode();

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientService.getAllClients();
      let clientsArray = Array.isArray(data) ? data : [];
      if (isUserMode && currentUserId) {
        clientsArray = clientsArray.filter(
          (client: any) => client.userId === currentUserId || client.createdBy === currentUserId
        );
      }
      setClients(clientsArray);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const getClientById = (clientId: string) => clients.find((c: any) => c.id === clientId);

  const createClient = async (clientData: any) => {
    try {
      setLoading(true);
      const dataToSend =
        isUserMode && currentUserId
          ? { ...clientData, userId: currentUserId, createdBy: currentUserId }
          : clientData;
      const newClient = await clientService.createClient(dataToSend);
      setClients((prev) => [...prev, newClient]);
      toast.success('Client créé avec succès');
      return newClient;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (clientId: string, clientData: any) => {
    try {
      setLoading(true);
      const updatedClient = await clientService.updateClient(clientId, clientData);
      setClients((prev) => prev.map((c: any) => (c.id === clientId ? updatedClient : c)));
      toast.success('Client mis à jour avec succès');
      return updatedClient;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      setLoading(true);
      await clientService.deleteClient(clientId);
      setClients((prev) => prev.filter((c: any) => c.id !== clientId));
      toast.success('Client supprimé avec succès');
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [isUserMode, currentUserId]);

  return { clients, loading, error, loadClients, getClientById, createClient, updateClient, deleteClient };
};
