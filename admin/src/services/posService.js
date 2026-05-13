/**
 * POS Service
 * Handles all POS-related API calls (generation, building, templates, sectors)
 */

import { posApi } from '../lib/api';

class POSService {
  /**
   * Get all available sectors
   * @returns {Promise<Array>} List of sectors
   */
  async getSectors() {
    try {
      const response = await posApi.getSectors();
      return response.data.sectors;
    } catch (error) {
      console.error('Error fetching sectors:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch sectors');
    }
  }

  /**
   * Get available templates
   * @returns {Promise<Array>} List of templates
   */
  async getTemplates() {
    try {
      const response = await posApi.getTemplates();
      return response.data.templates;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch templates');
    }
  }

  /**
   * Generate POS application
   * @param {Object} data - Generation data
   * @param {string} data.licenseId - License ID
   * @returns {Promise<Object>} Generated POS data
   */
  async generatePOS(data) {
    try {
      const response = await posApi.generate(data);
      return response.data;
    } catch (error) {
      console.error('Error generating POS:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate POS');
    }
  }

  /**
   * Build POS application
   * @param {Object} data - Build data
   * @returns {Promise<Object>} Build result
   */
  async buildPOS(data) {
    try {
      const response = await posApi.build(data);
      return response.data;
    } catch (error) {
      console.error('Error building POS:', error);
      throw new Error(error.response?.data?.error || 'Failed to build POS');
    }
  }

  /**
   * Direct conversion from preview to POS
   * @param {Object} data - Conversion data
   * @param {Object} data.previewConfig - Preview configuration
   * @param {Array<string>} data.modules - Selected module IDs
   * @param {string} data.businessName - Business name
   * @returns {Promise<Object>} Conversion result
   */
  async directConvert(data) {
    try {
      const response = await fetch('/api/direct-convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to convert preview');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error in direct conversion:', error);
      throw error;
    }
  }

  /**
   * Quick test - create and open POS
   * @param {Object} data - Test data
   * @param {Object} data.themeConfig - Theme configuration
   * @returns {Promise<Object>} Test result
   */
  async quickTest(data) {
    try {
      const response = await fetch('/api/quick-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to quick test');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error in quick test:', error);
      throw error;
    }
  }

  /**
   * Check build status
   * @param {string} licenseId - License ID
   * @returns {Promise<Object>} Build status
   */
  async getBuildStatus(licenseId) {
    try {
      const response = await posApi.getBuildStatus(licenseId);
      return response.data;
    } catch (error) {
      console.error('Error checking build status:', error);
      throw error;
    }
  }

  /**
   * Cleanup build artifacts
   * @param {string} licenseId - License ID
   */
  async cleanupBuild(licenseId) {
    try {
      await posApi.cleanupBuild(licenseId);
    } catch (error) {
      console.error('Error cleaning up build:', error);
      // Suppress error as cleanup is secondary
    }
  }

  /**
   * Download POS executable
   * @param {string} executablePath - Path to executable
   * @param {string} licenseId - Optional: License ID for recovery if path is invalid
   * @returns {string} Download URL
   */
  getDownloadUrl(executablePath, licenseId) {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    let url = `${baseUrl}/pos/download?path=${encodeURIComponent(executablePath)}`;
    if (licenseId) {
      url += `&licenseId=${encodeURIComponent(licenseId)}`;
    }
    return url;
  }
}

export default new POSService();
