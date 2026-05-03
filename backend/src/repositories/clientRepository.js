const prisma = require('../config/database');
const BaseRepository = require('./BaseRepository');

class ClientRepository extends BaseRepository {
  constructor() {
    super(prisma.client);
  }

  async findByEmail(email) {
    return await this.model.findUnique({
      where: { email }
    });
  }

  async findWithLicenses(id) {
    return await this.model.findUnique({
      where: { id },
      include: {
        licenses: {
          include: {
            modules: {
              include: {
                module: true
              }
            },
            configuration: true
          }
        }
      }
    });
  }

  async searchClients(query) {
    return await this.model.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new ClientRepository();
