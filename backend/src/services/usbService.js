const usbRepository = require('../repositories/usbRepository');
const { NotFoundError, ValidationError } = require('../utils/errors');

class USBService {
  /**
   * Detect available USB drives
   */
  async detectDrives() {
    const drives = await usbRepository.detectDrives();
    return { drives };
  }

  /**
   * Write license to USB drive
   */
  async writeLicense(data) {
    const { drivePath, licenseContent, licenseKey } = data;

    // Validate input
    if (!drivePath || !licenseContent || !licenseKey) {
      throw new ValidationError('Drive path, license content, and license key are required');
    }

    // Check if drive exists
    if (!usbRepository.driveExists(drivePath)) {
      throw new NotFoundError('USB drive not found');
    }

    // Write license file
    try {
      const licenseFilePath = usbRepository.writeLicenseFile(drivePath, licenseContent);
      
      return {
        message: 'License file written successfully',
        path: licenseFilePath
      };
    } catch (error) {
      throw new Error(`Failed to write license to USB: ${error.message}`);
    }
  }

  /**
   * Verify license on USB drive
   */
  async verifyLicense(drivePath) {
    if (!drivePath) {
      throw new ValidationError('Drive path is required');
    }

    try {
      const { content, path } = usbRepository.readLicenseFile(drivePath);
      
      return {
        message: 'License file found',
        content,
        path
      };
    } catch (error) {
      throw new NotFoundError('License file not found on USB drive');
    }
  }
}

module.exports = new USBService();
