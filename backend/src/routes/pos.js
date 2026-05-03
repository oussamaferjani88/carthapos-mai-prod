const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const { validate, validateQuery } = require('../middleware/validator');
const { posGenerationLimiter } = require('../middleware/rateLimiter');
const { 
  generatePOSSchema,
  buildPOSSchema,
  downloadInstallerQuerySchema 
} = require('../validators/posValidator');

/**
 * @swagger
 * /api/v1/pos/generate:
 *   post:
 *     summary: Generate POS application
 *     description: Generate a customized POS application based on license configuration (rate limited to 5 per hour)
 *     tags: [POS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - licenseId
 *             properties:
 *               licenseId:
 *                 type: string
 *                 description: License ID to generate POS for
 *                 example: clx1234567890
 *               outputPath:
 *                 type: string
 *                 description: Custom output path (optional)
 *                 example: D:/generated-pos
 *     responses:
 *       200:
 *         description: POS application generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: POS application generated and built successfully
 *                     licenseKey:
 *                       type: string
 *                       example: CARTHA-XXXX-XXXX-XXXX
 *                     outputPath:
 *                       type: string
 *                       example: D:/generated-pos/MyBusiness
 *                     executablePath:
 *                       type: string
 *                       example: D:/generated-pos/MyBusiness/dist/MyBusiness-Setup-1.0.0.exe
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Temporarily disable rate limiting for development
// router.post('/generate', posGenerationLimiter, validate(generatePOSSchema), posController.generatePOS);
router.post('/generate', validate(generatePOSSchema), posController.generatePOS);

/**
 * @swagger
 * /api/v1/pos/build:
 *   post:
 *     summary: Build POS application
 *     description: Build an existing POS project into an executable (rate limited to 5 per hour)
 *     tags: [POS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectPath
 *             properties:
 *               projectPath:
 *                 type: string
 *                 description: Path to the POS project
 *                 example: D:/generated-pos/MyBusiness
 *               platform:
 *                 type: string
 *                 enum: [win, mac, linux]
 *                 default: win
 *                 description: Target platform
 *     responses:
 *       200:
 *         description: POS application built successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: POS application built successfully
 *                     projectPath:
 *                       type: string
 *                     executablePath:
 *                       type: string
 *                     buildOutput:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/build', posGenerationLimiter, validate(buildPOSSchema), posController.buildPOS);

/**
 * @swagger
 * /api/v1/pos/templates:
 *   get:
 *     summary: Get POS templates
 *     description: Retrieve all available POS templates
 *     tags: [POS]
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     templates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           path:
 *                             type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/templates', posController.getTemplates);

/**
 * @swagger
 * /api/v1/pos/sectors:
 *   get:
 *     summary: Get business sectors
 *     description: Retrieve all available business sectors for POS configuration
 *     tags: [POS]
 *     responses:
 *       200:
 *         description: Sectors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     sectors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: restaurant
 *                           name:
 *                             type: string
 *                             example: Restaurant
 *                           description:
 *                             type: string
 *                           defaultModules:
 *                             type: array
 *                             items:
 *                               type: string
 *                           icon:
 *                             type: string
 *                             example: 🍽️
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/sectors', posController.getSectors);

/**
 * @swagger
 * /api/v1/pos/download:
 *   get:
 *     summary: Download POS installer
 *     description: Download the generated POS installer executable
 *     tags: [POS]
 *     parameters:
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Path to the installer or project folder
 *         example: D:/generated-pos/MyBusiness
 *     responses:
 *       200:
 *         description: Installer file download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/download', validateQuery(downloadInstallerQuerySchema), posController.downloadInstaller);

module.exports = router;
