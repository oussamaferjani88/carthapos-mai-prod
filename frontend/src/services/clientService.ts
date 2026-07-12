import { clientsApi } from '../lib/api';

class ClientService {
  async getAllClients() {
    try {
      const response = await clientsApi.getAll();
      return response.data;
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch clients');
    }
  }

  async getClientById(id: string) {
    try {
      const response = await clientsApi.getById(id);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching client:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch client');
    }
  }

  async createClient(data: any) {
    try {
      const response = await clientsApi.create(data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating client:', error);
      throw new Error(error.response?.data?.error || 'Failed to create client');
    }
  }

  async updateClient(id: string, data: any) {
    try {
      const response = await clientsApi.update(id, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating client:', error);
      throw new Error(error.response?.data?.error || 'Failed to update client');
    }
  }

  async deleteClient(id: string) {
    try {
      const response = await clientsApi.delete(id);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting client:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete client');
    }
  }
}

export default new ClientService();
