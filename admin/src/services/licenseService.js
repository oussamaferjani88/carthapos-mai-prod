/**
 * License Service
 * Handles all license-related API calls
 */

import { licensesApi } from '../lib/api';

class LicenseService {
  /**
   * Create a new license
   * @param {Object} licenseData - License data
   * @param {string} licenseData.clientId - Client ID
   * @param {string} licenseData.sector - Sector ID
   * @param {string} licenseData.licenseType - License type (LIFETIME, SUBSCRIPTION)
   * @param {string} licenseData.expirationDate - Expiration date (for SUBSCRIPTION)
   * @param {Array<string>} licenseData.modules - Selected module IDs
   * @param {Object} licenseData.configuration - POS configuration
   * @returns {Promise<Object>} Created license
   */
  async createLicense(licenseData) {
    try {
      const response = await licensesApi.create(licenseData);
      return response.data;
    } catch (error) {
      console.error('Error creating license:', error);
      throw new Error(this._apiError(error) || 'Failed to create license');
    }
  }

  async adminCreateLicense(licenseData) {
    try {
      const response = await licensesApi.adminCreate(licenseData);
      return response.data;
    } catch (error) {
      console.error('Error creating admin license:', error);
      throw new Error(this._apiError(error) || 'Failed to create admin license');
    }
  }

  _apiError(error) {
    const data = error?.response?.data;
    if (!data) return null;
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    }
    return data.message || data.error || null;
  }

  /**
   * Generate license file
   * @param {string} licenseId - License ID
   * @returns {Promise<Object>} License file data
   */
  async generateLicenseFile(licenseId) {
    try {
      const response = await licensesApi.generateFile(licenseId);
      return response.data;
    } catch (error) {
      console.error('Error generating license file:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate license file');
    }
  }

  /**
   * Get all licenses
   * @returns {Promise<Array>} List of licenses
   */
  async getAllLicenses() {
    try {
      const response = await licensesApi.getAll();
      return response.data;
    } catch (error) {
      console.error('Error fetching licenses:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch licenses');
    }
  }

  /**
   * Get license by ID
   * @param {string} licenseId - License ID
   * @returns {Promise<Object>} License data
   */
  async getLicenseById(licenseId) {
    try {
      const response = await licensesApi.getById(licenseId);
      return response.data;
    } catch (error) {
      console.error('Error fetching license:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch license');
    }
  }

  /**
   * Verify license
   * @param {string} licenseKey - License key
   * @returns {Promise<Object>} Verification result
   */
  async verifyLicense(licenseKey) {
    try {
      const response = await licensesApi.verify(licenseKey);
      return response.data;
    } catch (error) {
      console.error('Error verifying license:', error);
      throw new Error(error.response?.data?.error || 'Failed to verify license');
    }
  }

  /**
   * Update license
   * @param {string} licenseId - License ID
   * @param {Object} licenseData - Updated license data
   * @returns {Promise<Object>} Updated license
   */
  async updateLicense(licenseId, licenseData) {
    try {
      const response = await licensesApi.update(licenseId, licenseData);
      return response.data;
    } catch (error) {
      console.error('Error updating license:', error);
      throw new Error(error.response?.data?.error || 'Failed to update license');
    }
  }

  /**
   * Delete license
   * @param {string} licenseId - License ID
   * @returns {Promise<void>}
   */
  async deleteLicense(licenseId) {
    try {
      await licensesApi.delete(licenseId);
    } catch (error) {
      console.error('Error deleting license:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete license');
    }
  }

  /**
   * Validate license data before creation
   * @param {Object} licenseData - License data to validate
   * @returns {Object} Validation result { valid: boolean, errors: Array<string> }
   */
  validateLicenseData(licenseData) {
    const errors = [];

    if (!licenseData.clientId) {
      errors.push('Client is required');
    }

    if (!licenseData.sector) {
      errors.push('Sector is required');
    }

    if (!licenseData.licenseType) {
      errors.push('License type is required');
    }

    if (licenseData.licenseType === 'SUBSCRIPTION' && !licenseData.expirationDate) {
      errors.push('Expiration date is required for subscription licenses');
    }

    if (!licenseData.modules || licenseData.modules.length === 0) {
      errors.push('At least one module must be selected');
    }

    if (!licenseData.configuration?.businessName) {
      errors.push('Business name is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default new LicenseService();
