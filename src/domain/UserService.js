const User = require('./User');
const jwt = require('jsonwebtoken');

/**
 * User domain service
 * Contains core business logic for user operations
 */
class UserService {
  constructor(userRepository, jwtSecret = process.env.JWT_SECRET || 'default-secret') {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
  }

  /**
   * Create a new user (alias for registerUser)
   * @param {Object} userData - User registration data
   * @param {string} userData.username - Username
   * @param {string} userData.email - Email
   * @param {string} userData.password - Password
   * @returns {Promise<User>} User entity
   */
  async createUser({ username, email, password }) {
    // Check if username already exists
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Check if email already exists
    const existingEmail = await this.userRepository.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    // Create user with hashed password
    const user = await User.createWithPassword({ username, email, password });
    
    // Save user
    const savedUser = await this.userRepository.create(user.toObject());
    
    return savedUser;
  }

  /**
   * Authenticate a user
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} Authentication result with user and success flag
   */
  async authenticateUser(username, password) {
    // Find user by username
    const userData = await this.userRepository.findByUsername(username);
    if (!userData) {
      return { success: false, user: null };
    }

    const user = User.fromObject(userData);

    // Verify password
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      return { success: false, user: null };
    }

    // Update last active
    const updatedUser = user.updateLastActive();
    await this.userRepository.updateLastActive(user.id);

    return {
      success: true,
      user: updatedUser
    };
  }

  /**
   * Get all users (for admin functionality)
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of users to return
   * @param {number} options.offset - Number of users to skip
   * @returns {Promise<Array<User>>} Array of user entities
   */
  async getAllUsers(options = {}) {
    const usersData = await this.userRepository.findAll(options);
    return usersData.map(userData => User.fromObject(userData));
  }

  /**
   * Find user by ID (alias for getUserById)
   * @param {string} userId - User ID
   * @returns {Promise<User|null>} User entity or null
   */
  async findUserById(userId) {
    const userData = await this.userRepository.findById(userId);
    if (!userData) {
      return null;
    }

    return User.fromObject(userData);
  }

  /**
   * Get user's games
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User's games
   */
  async getUserGames(userId) {
    const userData = await this.userRepository.findById(userId);
    if (!userData) {
      throw new Error('User not found');
    }

    return this.userRepository.getUserGames(userId);
  }

  /**
   * Update user email
   * @param {string} userId - User ID
   * @param {string} newEmail - New email
   * @returns {Promise<Object>} Updated user
   */
  async updateUserEmail(userId, newEmail) {
    const userData = await this.userRepository.findById(userId);
    if (!userData) {
      throw new Error('User not found');
    }

    // Check if email already exists
    const existingEmail = await this.userRepository.findByEmail(newEmail);
    if (existingEmail && existingEmail.id !== userId) {
      throw new Error('Email already exists');
    }

    const user = User.fromObject(userData);
    const updatedUser = user.updateEmail(newEmail);

    // Update in repository (this would need to be implemented in the repository)
    // For now, just return the updated user
    return updatedUser.toSafeObject();
  }

  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Updated user
   */
  async updateUserPassword(userId, currentPassword, newPassword) {
    const userData = await this.userRepository.findById(userId);
    if (!userData) {
      throw new Error('User not found');
    }

    const user = User.fromObject(userData);

    // Verify current password
    const isValidPassword = await user.verifyPassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('Invalid current password');
    }

    // Update password
    const updatedUser = await user.updatePassword(newPassword);

    // Update in repository (this would need to be implemented in the repository)
    // For now, just return the updated user
    return updatedUser.toSafeObject();
  }

  /**
   * Verify a JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Get user from token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} User data
   */
  async getUserFromToken(token) {
    const decoded = this.verifyToken(token);
    return this.getUserById(decoded.userId);
  }

  /**
   * Generate JWT token
   * @param {string} userId - User ID
   * @returns {string} JWT token
   * @private
   */
  _generateToken(userId) {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: '7d' });
  }

  /**
   * Check if user is recently active
   * @param {string} userId - User ID
   * @param {number} thresholdMs - Threshold in milliseconds
   * @returns {Promise<boolean>} Whether user is recently active
   */
  async isUserRecentlyActive(userId, thresholdMs = 24 * 60 * 60 * 1000) {
    const userData = await this.userRepository.findById(userId);
    if (!userData) {
      return false;
    }

    const user = User.fromObject(userData);
    return user.isRecentlyActive(thresholdMs);
  }

  /**
   * Update user's last active timestamp
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async updateUserLastActive(userId) {
    const userData = await this.userRepository.findById(userId);
    if (!userData) {
      throw new Error('User not found');
    }

    await this.userRepository.updateLastActive(userId);
  }
}

module.exports = UserService;