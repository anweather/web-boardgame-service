/**
 * Port interface for user persistence
 * This defines the contract that any user repository adapter must implement
 */
class UserRepository {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<User>} - Created user entity
   */
  async create(userData) {
    throw new Error('create method must be implemented');
  }

  /**
   * Find a user by ID
   * @param {string} userId - User identifier
   * @returns {Promise<User|null>} - User entity or null if not found
   */
  async findById(userId) {
    throw new Error('findById method must be implemented');
  }

  /**
   * Find a user by username
   * @param {string} username - Username
   * @returns {Promise<User|null>} - User entity or null if not found
   */
  async findByUsername(username) {
    throw new Error('findByUsername method must be implemented');
  }

  /**
   * Find a user by email
   * @param {string} email - Email address
   * @returns {Promise<User|null>} - User entity or null if not found
   */
  async findByEmail(email) {
    throw new Error('findByEmail method must be implemented');
  }

  /**
   * Update user's last active timestamp
   * @param {string} userId - User identifier
   * @returns {Promise<void>}
   */
  async updateLastActive(userId) {
    throw new Error('updateLastActive method must be implemented');
  }

  /**
   * Get games for a user
   * @param {string} userId - User identifier
   * @returns {Promise<Object[]>} - Array of user's games
   */
  async getUserGames(userId) {
    throw new Error('getUserGames method must be implemented');
  }
}

module.exports = UserRepository;