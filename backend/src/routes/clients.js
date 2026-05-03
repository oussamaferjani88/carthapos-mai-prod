const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { validate, validateQuery } = require('../middleware/validator');
const { createClientSchema, updateClientSchema, searchClientSchema } = require('../validators/clientValidator');

// Search clients
router.get('/search', validateQuery(searchClientSchema), clientController.searchClients);

// CRUD operations
router.get('/', clientController.getAllClients);
router.get('/:id', clientController.getClientById);
router.get('/:id/licenses', clientController.getClientWithLicenses);
router.post('/', validate(createClientSchema), clientController.createClient);
router.put('/:id', validate(updateClientSchema), clientController.updateClient);
router.delete('/:id', clientController.deleteClient);

module.exports = router;
