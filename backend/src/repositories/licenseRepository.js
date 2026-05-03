const prisma = require('../config/database');
const BaseRepository = require('./BaseRepository');

class LicenseRepository extends BaseRepository {
  constructor() {
    super(prisma.license);
  }

  async findByKey(licenseKey) {
    return await this.model.findUnique({
      where: { licenseKey },
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
  }

  async findByClientId(clientId) {
    return await this.model.findMany({
      where: { clientId },
      include: {
        modules: {
          include: {
            module: true
          }
        },
        configuration: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findActiveLicenses() {
    return await this.model.findMany({
      where: { isActive: true },
      include: {
        client: true,
        configuration: true
      }
    });
  }

  async findExpiringSoon(days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.model.findMany({
      where: {
        licenseType: 'SUBSCRIPTION',
        isActive: true,
        expirationDate: {
          lte: futureDate,
          gte: new Date()
        }
      },
      include: {
        client: true
      }
    });
  }

  async updateConfiguration(licenseId, configData) {
    return await prisma.licenseConfiguration.upsert({
      where: { licenseId },
      update: configData,
      create: {
        licenseId,
        ...configData
      }
    });
  }
}

module.exports = new LicenseRepository();
