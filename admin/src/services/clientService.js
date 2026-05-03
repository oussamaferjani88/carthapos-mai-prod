/**
 * Client Service
 * Handles all client-related API calls
 */

import { clientsApi } from '../lib/api';

class ClientService {
  /**
   * Get all clients
   * @returns {Promise<Array>} List of clients
   */
  async getAllClients() {
    try {
      const response = await clientsApi.getAll();
      return response.data;
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch clients');
    }
  }

  /**
   * Get client by ID
   * @param {string} clientId - Client ID
   * @returns {Promise<Object>} Client data
   */
  async getClientById(clientId) {
    try {
      const response = await clientsApi.getById(clientId);
      return response.data;
    } catch (error) {
      console.error('Error fetching client:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch client');
    }
  }

  /**
   * Create a new client
   * @param {Object} clientData - Client data
   * @returns {Promise<Object>} Created client
   */
  async createClient(clientData) {
    try {
      const response = await clientsApi.create(clientData);
      return response.data;
    } catch (error) {
      console.error('Error creating client:', error);
      throw new Error(error.response?.data?.error || 'Failed to create client');
    }
  }

  /**
   * Update client
   * @param {string} clientId - Client ID
   * @param {Object} clientData - Updated client data
   * @returns {Promise<Object>} Updated client
   */
  async updateClient(clientId, clientData) {
    try {
      const response = await clientsApi.update(clientId, clientData);
      return response.data;
    } catch (error) {
      console.error('Error updating client:', error);
      throw new Error(error.response?.data?.error || 'Failed to update client');
    }
  }

  /**
   * Delete client
   * @param {string} clientId - Client ID
   * @returns {Promise<void>}
   */
  async deleteClient(clientId) {
    try {
      await clientsApi.delete(clientId);
    } catch (error) {
      console.error('Error deleting client:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete client');
    }
  }
}

export default new ClientService();
