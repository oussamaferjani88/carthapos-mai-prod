import { licensesApi } from '../lib/api';

class LicenseService {
  async createLicense(licenseData: any) {
    try {
      const response = await licensesApi.create(licenseData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating license:', error);
      throw new Error(error.response?.data?.error || 'Failed to create license');
    }
  }

  async adminCreateLicense(licenseData: any) {
    try {
      const response = await licensesApi.adminCreate(licenseData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating admin license:', error);
      throw new Error(error.response?.data?.error || 'Failed to create admin license');
    }
  }

  async generateLicenseFile(licenseId: string) {
    try {
      const response = await licensesApi.generateFile(licenseId);
      return response.data;
    } catch (error: any) {
      console.error('Error generating license file:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate license file');
    }
  }

  async getAllLicenses() {
    try {
      const response = await licensesApi.getAll();
      return response.data;
    } catch (error: any) {
      console.error('Error fetching licenses:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch licenses');
    }
  }

  async getLicenseById(id: string) {
    try {
      const response = await licensesApi.getById(id);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching license:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch license');
    }
  }

  async updateLicense(id: string, licenseData: any) {
    try {
      const response = await licensesApi.update(id, licenseData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating license:', error);
      throw new Error(error.response?.data?.error || 'Failed to update license');
    }
  }

  async deleteLicense(id: string) {
    try {
      await licensesApi.delete(id);
    } catch (error: any) {
      console.error('Error deleting license:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete license');
    }
  }

  validateLicenseData(licenseData: any) {
    const errors: string[] = [];
    if (!licenseData.clientId) errors.push('Client is required');
    if (!licenseData.sector) errors.push('Sector is required');
    if (!licenseData.licenseType) errors.push('License type is required');
    if (licenseData.licenseType === 'SUBSCRIPTION' && !licenseData.expirationDate)
      errors.push('Expiration date is required for subscription licenses');
    if (!licenseData.modules || licenseData.modules.length === 0)
      errors.push('At least one module must be selected');
    if (!licenseData.configuration?.businessName)
      errors.push('Business name is required');
    return { valid: errors.length === 0, errors };
  }
}

export default new LicenseService();
