const clientService = require('../services/clientService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

class ClientController {
  // GET /api/v1/clients
  getAllClients = asyncHandler(async (req, res) => {
    const clients = await clientService.getAllClients();
    return ApiResponse.success(res, clients, 'Clients retrieved successfully');
  });

  // GET /api/v1/clients/:id
  getClientById = asyncHandler(async (req, res) => {
    const client = await clientService.getClientById(req.params.id);
    return ApiResponse.success(res, client, 'Client retrieved successfully');
  });

  // GET /api/v1/clients/:id/licenses
  getClientWithLicenses = asyncHandler(async (req, res) => {
    const client = await clientService.getClientWithLicenses(req.params.id);
    return ApiResponse.success(res, client, 'Client with licenses retrieved successfully');
  });

  // POST /api/v1/clients
  createClient = asyncHandler(async (req, res) => {
    const client = await clientService.createClient(req.body);
    return ApiResponse.created(res, client, 'Client created successfully');
  });

  // PUT /api/v1/clients/:id
  updateClient = asyncHandler(async (req, res) => {
    const client = await clientService.updateClient(req.params.id, req.body);
    return ApiResponse.success(res, client, 'Client updated successfully');
  });

  // DELETE /api/v1/clients/:id
  deleteClient = asyncHandler(async (req, res) => {
    await clientService.deleteClient(req.params.id);
    return ApiResponse.success(res, null, 'Client deleted successfully');
  });

  // GET /api/v1/clients/search?q=query
  searchClients = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const clients = await clientService.searchClients(q || '');
    return ApiResponse.success(res, clients, 'Search completed successfully');
  });
}

module.exports = new ClientController();
