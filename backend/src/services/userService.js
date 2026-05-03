const userRepository = require('../repositories/userRepository');
const bcrypt = require('bcrypt');
const { generateToken } = require('../../middleware/auth');
const { NotFoundError, ConflictError, UnauthorizedError, ValidationError } = require('../utils/errors');

class UserService {
  /**
   * Get all users
   */
  async getAllUsers() {
    return await userRepository.findAllWithoutPassword();
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    const user = await userRepository.findById(id);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Create a new user
   */
  async createUser(userData) {
    const { username, email, password, role = 'CASHIER' } = userData;

    // Check if user already exists
    const existingUser = await userRepository.findByUsernameOrEmail(username, email);
    
    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictError('Username already exists');
      }
      if (existingUser.email === email) {
        throw new ConflictError('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await userRepository.createUser({
      username,
      email,
      password: hashedPassword,
      role,
      isActive: true
    });

    return user;
  }

  /**
   * Update user
   */
  async updateUser(id, updateData) {
    const { username, email, role, isActive, password } = updateData;

    // Check if user exists
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Prepare update data
    const dataToUpdate = {};
    
    if (username) dataToUpdate.username = username;
    if (email) dataToUpdate.email = email;
    if (role) dataToUpdate.role = role;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;
    
    // Hash password if provided
    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await userRepository.updateUser(id, dataToUpdate);
    
    return updatedUser;
  }

  /**
   * Delete user
   */
  async deleteUser(id) {
    // Check if user exists
    const existingUser = await userRepository.findById(id);
    
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Prevent deletion of last admin
    if (existingUser.role === 'ADMIN') {
      const adminCount = await userRepository.countByRole('ADMIN');
      
      if (adminCount <= 1) {
        throw new ValidationError('Cannot delete the last admin user');
      }
    }

    await userRepository.delete(id);
    
    return { message: 'User deleted successfully' };
  }

  /**
   * User login
   */
  async login(credentials) {
    const { username, password } = credentials;

    // Find user by username or email
    const user = await userRepository.findByUsername(username);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials or inactive account');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Generate JWT token
    const token = generateToken(user);

    // Return token + user info (without password)
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    };
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    return await userRepository.getUserStats();
  }
}

module.exports = new UserService();
