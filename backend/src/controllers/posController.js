const posService = require('../services/posService');
const { asyncHandler } = require('../middleware/errorHandler');
const { success } = require('../utils/apiResponse');
const fs = require('fs');
const path = require('path');

class POSController {
  /**
   * Generate POS application
   * POST /api/v1/pos/generate
   */
  generatePOS = asyncHandler(async (req, res) => {
    const result = await posService.generatePOSApplication(req.body);
    success(res, result);
  });

  /**
   * Build POS application
   * POST /api/v1/pos/build
   */
  buildPOS = asyncHandler(async (req, res) => {
    const result = await posService.buildPOSApplication(req.body);
    success(res, result);
  });

  /**
   * Get POS templates
   * GET /api/v1/pos/templates
   */
  getTemplates = asyncHandler(async (req, res) => {
    const result = await posService.getTemplates();
    success(res, result);
  });

  /**
   * Get business sectors
   * GET /api/v1/pos/sectors
   */
  getSectors = asyncHandler(async (req, res) => {
    const result = posService.getSectors();
    success(res, result);
  });

  /**
   * Download POS installer
   * GET /api/v1/pos/download?path=...
   */
  downloadInstaller = asyncHandler(async (req, res) => {
    const requestedPath = req.query.path;

    const installerPath = await posService.findInstallerForDownload(requestedPath);

    // Set download headers
    const fileName = path.basename(installerPath);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    console.log(`📦 Downloading installer: ${installerPath}`);
    console.log(`📁 File size: ${fs.statSync(installerPath).size} bytes`);

    // Download the file
    res.download(installerPath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error downloading installer' });
        }
      } else {
        console.log(`✅ Successfully downloaded: ${fileName}`);
      }
    });
  });
}

module.exports = new POSController();
