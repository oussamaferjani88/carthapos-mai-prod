const licenseRepository = require('../repositories/licenseRepository');
const clientRepository = require('../repositories/clientRepository');
const moduleRepository = require('../repositories/moduleRepository');
const { NotFoundError, ValidationError } = require('../utils/errors');
const crypto = require('crypto');

class LicenseService {
  async getAllLicenses() {
    return await licenseRepository.findAll({
      include: {
        client: true,
        configuration: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getLicenseById(id) {
    const license = await licenseRepository.findById(id, {
      include: {
        client: true,
        modules: {
          include: {
            module: true
          }
        },
        configuration: true
      }
    });

    if (!license) {
      throw new NotFoundError('License');
    }

    return license;
  }

  async getLicenseByKey(licenseKey) {
    const license = await licenseRepository.findByKey(licenseKey);
    if (!license) {
      throw new NotFoundError('License');
    }
    return license;
  }

  async getClientLicenses(clientId) {
    // Verify client exists
    const client = await clientRepository.findById(clientId);
    if (!client) {
      throw new NotFoundError('Client');
    }

    return await licenseRepository.findByClientId(clientId);
  }

  async createLicense(data) {
    const { clientId, sector, licenseType, expirationDate, moduleIds } = data;

    // Verify client exists
    const client = await clientRepository.findById(clientId);
    if (!client) {
      throw new NotFoundError('Client');
    }

    // Validate license type
    if (licenseType === 'SUBSCRIPTION' && !expirationDate) {
      throw new ValidationError('Expiration date is required for subscription licenses');
    }

    // Generate unique license key
    const licenseKey = this.generateLicenseKey();

    // Create license
    const license = await licenseRepository.create({
      clientId,
      licenseKey,
      sector,
      licenseType,
      expirationDate: licenseType === 'SUBSCRIPTION' ? new Date(expirationDate) : null,
      isActive: true
    });

    // Attach modules if provided
    if (moduleIds && moduleIds.length > 0) {
      await moduleRepository.attachToLicense(license.id, moduleIds);
    } else {
      // Attach core modules by default
      const coreModules = await moduleRepository.findCoreModules();
      const coreModuleIds = coreModules.map(m => m.id);
      await moduleRepository.attachToLicense(license.id, coreModuleIds);
    }

    return await this.getLicenseById(license.id);
  }

  async updateLicense(id, data) {
    await this.getLicenseById(id);

    const { expirationDate, isActive, ...otherData } = data;

    const updateData = {
      ...otherData
    };

    if (expirationDate !== undefined) {
      updateData.expirationDate = expirationDate ? new Date(expirationDate) : null;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    return await licenseRepository.update(id, updateData);
  }

  async updateConfiguration(licenseId, configData) {
    await this.getLicenseById(licenseId);
    return await licenseRepository.updateConfiguration(licenseId, configData);
  }

  async toggleLicenseStatus(id) {
    const license = await this.getLicenseById(id);
    return await licenseRepository.update(id, {
      isActive: !license.isActive
    });
  }

  async deleteLicense(id) {
    await this.getLicenseById(id);
    return await licenseRepository.delete(id);
  }

  async getActiveLicenses() {
    return await licenseRepository.findActiveLicenses();
  }

  async getExpiringSoon(days = 30) {
    return await licenseRepository.findExpiringSoon(days);
  }

  generateLicenseKey() {
    const segments = [];
    for (let i = 0; i < 4; i++) {
      segments.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return segments.join('-');
  }

  async generateLicenseFile(id) {
    const license = await this.getLicenseById(id);

    // Create license file content
    const fileContent = {
      version: "1.0",
      licenseKey: license.licenseKey,
      client: {
        id: license.client.id,
        name: license.client.name,
        email: license.client.email
      },
      configuration: {
        sector: license.sector,
        type: license.licenseType,
        expiry: license.expirationDate ? license.expirationDate.toISOString() : null,
        modules: license.modules.map(lm => lm.module.name)
      },
      security: {
        issuedAt: new Date().toISOString(),
        signature: crypto.createHmac('sha256', process.env.LICENSE_SECRET || 'default-secret')
          .update(license.licenseKey + license.client.id)
          .digest('hex')
      }
    };

    // Convert to base64 for secure transport/storage (simulated encryption)
    const encryptedContent = Buffer.from(JSON.stringify(fileContent)).toString('base64');

    return {
      filename: `license-${license.licenseKey}.key`,
      content: encryptedContent,
      licenseKey: license.licenseKey
    };
  }

  async attachModule(licenseId, moduleId) {
    await this.getLicenseById(licenseId);

    const module = await moduleRepository.findById(moduleId);
    if (!module) {
      throw new NotFoundError('Module');
    }

    await moduleRepository.attachToLicense(licenseId, [moduleId]);
    return await this.getLicenseById(licenseId);
  }

  async detachModule(licenseId, moduleId) {
    await this.getLicenseById(licenseId);
    await moduleRepository.detachFromLicense(licenseId, moduleId);
    return await this.getLicenseById(licenseId);
  }

  async toggleModule(licenseId, moduleId, isEnabled) {
    await this.getLicenseById(licenseId);
    await moduleRepository.toggleModule(licenseId, moduleId, isEnabled);
    return await this.getLicenseById(licenseId);
  }
}

module.exports = new LicenseService();
