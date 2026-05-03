const clientRepository = require('../repositories/clientRepository');
const { NotFoundError, ConflictError } = require('../utils/errors');

class ClientService {
  async getAllClients() {
    return await clientRepository.findAll({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getClientById(id) {
    const client = await clientRepository.findById(id);
    if (!client) {
      throw new NotFoundError('Client');
    }
    return client;
  }

  async getClientWithLicenses(id) {
    const client = await clientRepository.findWithLicenses(id);
    if (!client) {
      throw new NotFoundError('Client');
    }
    return client;
  }

  async createClient(data) {
    // Check if email already exists
    const existingClient = await clientRepository.findByEmail(data.email);
    if (existingClient) {
      throw new ConflictError('Client with this email already exists');
    }

    return await clientRepository.create(data);
  }

  async updateClient(id, data) {
    // Check if client exists
    await this.getClientById(id);

    // If email is being updated, check for conflicts
    if (data.email) {
      const existingClient = await clientRepository.findByEmail(data.email);
      if (existingClient && existingClient.id !== id) {
        throw new ConflictError('Email already in use by another client');
      }
    }

    return await clientRepository.update(id, data);
  }

  async deleteClient(id) {
    await this.getClientById(id);
    return await clientRepository.delete(id);
  }

  async searchClients(query) {
    return await clientRepository.searchClients(query);
  }
}

module.exports = new ClientService();
