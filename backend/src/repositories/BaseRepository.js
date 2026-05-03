const prisma = require('../config/database');

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findAll(options = {}) {
    return await this.model.findMany(options);
  }

  async findById(id, options = {}) {
    return await this.model.findUnique({
      where: { id },
      ...options
    });
  }

  async create(data) {
    return await this.model.create({ data });
  }

  async update(id, data) {
    return await this.model.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return await this.model.delete({
      where: { id }
    });
  }

  async count(where = {}) {
    return await this.model.count({ where });
  }

  async exists(where) {
    const count = await this.count(where);
    return count > 0;
  }
}

module.exports = BaseRepository;
