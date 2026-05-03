const userService = require('../services/userService');
const { asyncHandler } = require('../middleware/errorHandler');
const { success, created } = require('../utils/apiResponse');

class UserController {
  /**
   * Get all users
   * GET /api/v1/users
   */
  getAllUsers = asyncHandler(async (req, res) => {
    const users = await userService.getAllUsers();
    success(res, users);
  });

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  getUserById = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    success(res, user);
  });

  /**
   * Create new user
   * POST /api/v1/users
   */
  createUser = asyncHandler(async (req, res) => {
    const user = await userService.createUser(req.body);
    created(res, user, 'User created successfully');
  });

  /**
   * Update user
   * PUT /api/v1/users/:id
   */
  updateUser = asyncHandler(async (req, res) => {
    const user = await userService.updateUser(req.params.id, req.body);
    success(res, user, 'User updated successfully');
  });

  /**
   * Delete user
   * DELETE /api/v1/users/:id
   */
  deleteUser = asyncHandler(async (req, res) => {
    const result = await userService.deleteUser(req.params.id);
    success(res, result);
  });

  /**
   * User login
   * POST /api/v1/users/login
   */
  login = asyncHandler(async (req, res) => {
    const result = await userService.login(req.body);
    success(res, result, 'Login successful');
  });

  /**
   * Get user statistics
   * GET /api/v1/users/stats
   */
  getUserStats = asyncHandler(async (req, res) => {
    const stats = await userService.getUserStats();
    success(res, stats);
  });
}

module.exports = new UserController();
