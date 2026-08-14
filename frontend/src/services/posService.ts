import { posApi } from '../lib/api';

class POSService {
  async getSectors() {
    try {
      const response = await posApi.getSectors();
      return response.data.sectors;
    } catch (error: any) {
      console.error('Error fetching sectors:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch sectors');
    }
  }

  async getTemplates() {
    try {
      const response = await posApi.getTemplates();
      return response.data.templates;
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch templates');
    }
  }

  async generatePOS(data: any) {
    try {
      const response = await posApi.generate(data);
      return response.data;
    } catch (error: any) {
      console.error('Error generating POS:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate POS');
    }
  }

  /** Regenerate an existing POS project from its saved configuration. */
  async generateAgain(licenseId: string) {
    return this.generatePOS({ licenseId });
  }

  async buildPOS(data: any) {
    try {
      const response = await posApi.build(data);
      return response.data;
    } catch (error: any) {
      console.error('Error building POS:', error);
      throw new Error(error.response?.data?.error || 'Failed to build POS');
    }
  }

  async getBuildStatus(licenseId: string) {
    try {
      const response = await posApi.getBuildStatus(licenseId);
      return response.data;
    } catch (error: any) {
      console.error('Error checking build status:', error);
      throw error;
    }
  }

  async cleanupBuild(licenseId: string) {
    try {
      await posApi.cleanupBuild(licenseId);
    } catch (error: any) {
      console.error('Error cleaning up build:', error);
    }
  }

  async directConvert(data: any) {
    try {
      const response = await fetch('/api/direct-convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to convert preview');
      }
      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('Error in direct conversion:', error);
      throw error;
    }
  }

  async quickTest(data: any) {
    try {
      const response = await fetch('/api/quick-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to quick test');
      }
      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('Error in quick test:', error);
      throw error;
    }
  }

  getDownloadUrl(executablePath: string, licenseId?: string) {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    let url = `${baseUrl}/pos/download?path=${encodeURIComponent(executablePath)}`;
    if (licenseId) url += `&licenseId=${encodeURIComponent(licenseId)}`;
    return url;
  }
}

export default new POSService();
