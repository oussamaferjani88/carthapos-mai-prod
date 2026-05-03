/**
 * USB Service
 * Handles all USB-related API calls
 */

import { usbApi } from '../lib/api';

class USBService {
  /**
   * Get all connected USB drives
   * @returns {Promise<Array>} List of USB drives
   */
  async getUSBDrives() {
    try {
      const response = await usbApi.getDrives();
      return response.data.drives;
    } catch (error) {
      console.error('Error fetching USB drives:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch USB drives');
    }
  }

  /**
   * Write license to USB drive
   * @param {Object} data - USB write data
   * @param {string} data.drivePath - USB drive path
   * @param {string} data.licenseContent - License file content
   * @param {string} data.licenseKey - License key
   * @returns {Promise<Object>} Write result
   */
  async writeLicenseToUSB(data) {
    try {
      const response = await usbApi.writeLicense(data);
      return response.data;
    } catch (error) {
      console.error('Error writing license to USB:', error);
      throw new Error(error.response?.data?.error || 'Failed to write license to USB');
    }
  }

  /**
   * Verify license on USB drive
   * @param {string} drivePath - USB drive path
   * @returns {Promise<Object>} Verification result
   */
  async verifyUSBLicense(drivePath) {
    try {
      const response = await usbApi.verifyLicense(drivePath);
      return response.data;
    } catch (error) {
      console.error('Error verifying USB license:', error);
      throw new Error(error.response?.data?.error || 'Failed to verify USB license');
    }
  }

  /**
   * Format USB drive size for display
   * @param {number} sizeInBytes - Size in bytes
   * @returns {string} Formatted size (e.g., "8.0 GB")
   */
  formatDriveSize(sizeInBytes) {
    const sizeInGB = sizeInBytes / (1024 * 1024 * 1024);
    return `${sizeInGB.toFixed(1)} GB`;
  }

  /**
   * Get USB drive display label
   * @param {Object} drive - Drive object
   * @returns {string} Display label
   */
  getDriveDisplayLabel(drive) {
    return `${drive.label} (${this.formatDriveSize(drive.size)})`;
  }

  /**
   * Validate USB drive for license writing
   * @param {Object} drive - Drive object
   * @returns {Object} Validation result { valid: boolean, error: string }
   */
  validateDrive(drive) {
    if (!drive) {
      return { valid: false, error: 'No drive selected' };
    }

    // Check minimum size (e.g., 100MB)
    const minSizeBytes = 100 * 1024 * 1024;
    if (drive.size < minSizeBytes) {
      return { valid: false, error: 'USB drive is too small (minimum 100MB required)' };
    }

    return { valid: true, error: null };
  }
}

export default new USBService();
