const express = require('express');
const router = express.Router();
const usbController = require('../controllers/usbController');
const { validate, validateParams } = require('../middleware/validator');
const { usbLimiter } = require('../middleware/rateLimiter');
const { 
  writeLicenseSchema,
  verifyLicenseParamsSchema 
} = require('../validators/usbValidator');

/**
 * @swagger
 * /api/v1/usb/drives:
 *   get:
 *     summary: Detect USB drives
 *     description: Detect all available USB drives on the system
 *     tags: [USB]
 *     responses:
 *       200:
 *         description: USB drives detected successfully
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
 *                     drives:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           path:
 *                             type: string
 *                             example: E:
 *                           label:
 *                             type: string
 *                             example: USB Drive (E:)
 *                           size:
 *                             type: integer
 *                             description: Total size in bytes
 *                           freeSpace:
 *                             type: integer
 *                             description: Free space in bytes
 *                           type:
 *                             type: string
 *                             example: removable
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/drives', usbController.detectDrives);

/**
 * @swagger
 * /api/v1/usb/write-license:
 *   post:
 *     summary: Write license to USB
 *     description: Write a license file to a USB drive (rate limited to 30 per 15 minutes)
 *     tags: [USB]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - drivePath
 *               - licenseContent
 *               - licenseKey
 *             properties:
 *               drivePath:
 *                 type: string
 *                 description: Path to the USB drive
 *                 example: E:
 *               licenseContent:
 *                 type: string
 *                 description: Encrypted license content
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               licenseKey:
 *                 type: string
 *                 description: License key
 *                 example: CARTHA-XXXX-XXXX-XXXX
 *     responses:
 *       200:
 *         description: License written successfully
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
 *                       example: License file written successfully
 *                     path:
 *                       type: string
 *                       example: E:/license.key
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/write-license', usbLimiter, validate(writeLicenseSchema), usbController.writeLicense);

/**
 * @swagger
 * /api/v1/usb/verify-license/{drivePath}:
 *   get:
 *     summary: Verify license on USB
 *     description: Verify and read the license file from a USB drive
 *     tags: [USB]
 *     parameters:
 *       - in: path
 *         name: drivePath
 *         required: true
 *         schema:
 *           type: string
 *         description: Path to the USB drive (supports path separators)
 *         example: E:
 *     responses:
 *       200:
 *         description: License found and verified
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
 *                       example: License file found
 *                     content:
 *                       type: string
 *                       description: License content
 *                     path:
 *                       type: string
 *                       example: E:/license.key
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/verify-license/:drivePath(*)',
  validateParams(verifyLicenseParamsSchema),
  usbController.verifyLicense
);

module.exports = router;
