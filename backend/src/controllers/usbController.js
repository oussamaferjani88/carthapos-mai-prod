const usbService = require('../services/usbService');
const { asyncHandler } = require('../middleware/errorHandler');
const { success } = require('../utils/apiResponse');

class USBController {
  /**
   * Detect available USB drives
   * GET /api/v1/usb/drives
   */
  detectDrives = asyncHandler(async (req, res) => {
    const result = await usbService.detectDrives();
    success(res, result);
  });

  /**
   * Write license to USB drive
   * POST /api/v1/usb/write-license
   */
  writeLicense = asyncHandler(async (req, res) => {
    const result = await usbService.writeLicense(req.body);
    success(res, result);
  });

  /**
   * Verify license on USB drive
   * GET /api/v1/usb/verify-license/:drivePath(*)
   */
  verifyLicense = asyncHandler(async (req, res) => {
    const drivePath = req.params.drivePath;
    const result = await usbService.verifyLicense(drivePath);
    success(res, result);
  });
}

module.exports = new USBController();
