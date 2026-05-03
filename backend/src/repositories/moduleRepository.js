const prisma = require('../config/database');
const BaseRepository = require('./BaseRepository');

class ModuleRepository extends BaseRepository {
  constructor() {
    super(prisma.module);
  }

  async findByName(name) {
    return await this.model.findUnique({
      where: { name }
    });
  }

  async findByCategory(category) {
    return await this.model.findMany({
      where: { category },
      orderBy: { displayName: 'asc' }
    });
  }

  async findCoreModules() {
    return await this.model.findMany({
      where: { isCore: true }
    });
  }

  async attachToLicense(licenseId, moduleIds) {
    const licenseModules = moduleIds.map(moduleId => ({
      licenseId,
      moduleId,
      isEnabled: true
    }));

    return await prisma.licenseModule.createMany({
      data: licenseModules,
      skipDuplicates: true
    });
  }

  async detachFromLicense(licenseId, moduleId) {
    return await prisma.licenseModule.deleteMany({
      where: {
        licenseId,
        moduleId
      }
    });
  }

  async toggleModule(licenseId, moduleId, isEnabled) {
    return await prisma.licenseModule.updateMany({
      where: {
        licenseId,
        moduleId
      },
      data: { isEnabled }
    });
  }
}

module.exports = new ModuleRepository();
