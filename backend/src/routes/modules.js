const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const { validate } = require('../middleware/validator');
const { createModuleSchema, updateModuleSchema } = require('../validators/moduleValidator');

// Special routes (before :id routes)
router.get('/by-category', moduleController.getModulesGroupedByCategory);
router.get('/core', moduleController.getCoreModules);
router.get('/categories', moduleController.getModuleCategories);
router.get('/category/:category', moduleController.getModulesByCategory);

// CRUD operations
router.get('/', moduleController.getAllModules);
router.get('/:id', moduleController.getModuleById);
router.post('/', validate(createModuleSchema), moduleController.createModule);
router.put('/:id', validate(updateModuleSchema), moduleController.updateModule);
router.delete('/:id', moduleController.deleteModule);

module.exports = router;
