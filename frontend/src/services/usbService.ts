import { usbApi } from '../lib/api';

class USBService {
  async getUSBDrives() {
    try {
      const response = await usbApi.getDrives();
      return response.data;
    } catch (error: any) {
      console.error('Error fetching USB drives:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch USB drives');
    }
  }

  async writeLicenseToUSB(data: any) {
    try {
      const response = await usbApi.writeLicense(data);
      return response.data;
    } catch (error: any) {
      console.error('Error writing license to USB:', error);
      throw new Error(error.response?.data?.error || 'Failed to write license to USB');
    }
  }

  async verifyUSBLicense(drivePath: string) {
    try {
      const response = await usbApi.verifyLicense(drivePath);
      return response.data;
    } catch (error: any) {
      console.error('Error verifying USB license:', error);
      throw new Error(error.response?.data?.error || 'Failed to verify USB license');
    }
  }

  formatDriveSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  getDriveDisplayLabel(drive: any): string {
    const size = drive.size ? ` (${this.formatDriveSize(drive.size)})` : '';
    return drive.label ? `${drive.label} [${drive.driveLetter}]${size}` : `Drive ${drive.driveLetter}${size}`;
  }

  validateDrive(drive: any): boolean {
    return drive.size ? drive.size >= 100 * 1024 * 1024 : false;
  }
}

export default new USBService();
