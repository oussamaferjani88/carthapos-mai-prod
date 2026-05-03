const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
  constructor() {
    super('user');
  }

  /**
   * Find user by username or email
   */
  async findByUsername(username) {
    return await this.prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username }
        ]
      }
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    return await this.prisma.user.findFirst({
      where: { email }
    });
  }

  /**
   * Check if username exists
   */
  async usernameExists(username) {
    const count = await this.prisma.user.count({
      where: { username }
    });
    return count > 0;
  }

  /**
   * Check if email exists
   */
  async emailExists(email) {
    const count = await this.prisma.user.count({
      where: { email }
    });
    return count > 0;
  }

  /**
   * Check if user exists by username or email
   */
  async findByUsernameOrEmail(username, email) {
    return await this.prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });
  }

  /**
   * Get all users without password field
   */
  async findAllWithoutPassword(options = {}) {
    const { orderBy = { createdAt: 'desc' } } = options;
    
    return await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true
      },
      orderBy
    });
  }

  /**
   * Create user without returning password
   */
  async createUser(data) {
    return await this.prisma.user.create({
      data,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
  }

  /**
   * Update user without returning password
   */
  async updateUser(id, data) {
    return await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true
      }
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id) {
    return await this.prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() }
    });
  }

  /**
   * Count users by role
   */
  async countByRole(role) {
    return await this.prisma.user.count({
      where: { role }
    });
  }

  /**
   * Count active users
   */
  async countActive() {
    return await this.prisma.user.count({
      where: { isActive: true }
    });
  }

  /**
   * Get user statistics grouped by role
   */
  async getUserStatsByRole() {
    return await this.prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    });
  }

  /**
   * Get comprehensive user statistics
   */
  async getUserStats() {
    const [totalUsers, activeUsers, usersByRole] = await Promise.all([
      this.count(),
      this.countActive(),
      this.getUserStatsByRole()
    ]);

    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {});

    return {
      totalUsers,
      activeUsers,
      roleStats
    };
  }
}

module.exports = new UserRepository();
