const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * User domain entity
 * Pure business logic without external dependencies
 */
class User {
  constructor({
    id = uuidv4(),
    username,
    email,
    passwordHash,
    createdAt = new Date(),
    lastActive = new Date()
  }) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.passwordHash = passwordHash;
    this.createdAt = createdAt;
    this.lastActive = lastActive;

    this._validateInvariants();
  }

  /**
   * Validate domain invariants
   * @private
   */
  _validateInvariants() {
    if (!this.username || this.username.trim().length === 0) {
      throw new Error('Username cannot be empty');
    }

    if (this.username.length < 3 || this.username.length > 50) {
      throw new Error('Username must be between 3 and 50 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(this.username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    if (!this.email || !this._isValidEmail(this.email)) {
      throw new Error('Invalid email address');
    }

    if (!this.passwordHash || this.passwordHash.length === 0) {
      throw new Error('Password hash cannot be empty');
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean}
   * @private
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Create a user with a plain text password
   * @param {Object} userData - User data
   * @param {string} userData.username - Username
   * @param {string} userData.email - Email
   * @param {string} userData.password - Plain text password
   * @returns {Promise<User>} User instance with hashed password
   */
  static async createWithPassword({ username, email, password, ...rest }) {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    return new User({
      username,
      email,
      passwordHash,
      ...rest
    });
  }

  /**
   * Verify a password against this user's hash
   * @param {string} password - Plain text password to verify
   * @returns {Promise<boolean>} Whether the password is correct
   */
  async verifyPassword(password) {
    return bcrypt.compare(password, this.passwordHash);
  }

  /**
   * Update the last active timestamp
   * @returns {User} New user instance with updated last active time
   */
  updateLastActive() {
    return new User({
      ...this,
      lastActive: new Date()
    });
  }

  /**
   * Update user email
   * @param {string} newEmail - New email address
   * @returns {User} New user instance with updated email
   */
  updateEmail(newEmail) {
    if (!newEmail || !this._isValidEmail(newEmail)) {
      throw new Error('Invalid email address');
    }

    return new User({
      ...this,
      email: newEmail
    });
  }

  /**
   * Update user password
   * @param {string} newPassword - New plain text password
   * @returns {Promise<User>} New user instance with updated password hash
   */
  async updatePassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    return new User({
      ...this,
      passwordHash
    });
  }

  /**
   * Check if the user has been active recently
   * @param {number} thresholdMs - Threshold in milliseconds (default: 24 hours)
   * @returns {boolean}
   */
  isRecentlyActive(thresholdMs = 24 * 60 * 60 * 1000) {
    return Date.now() - this.lastActive.getTime() < thresholdMs;
  }

  /**
   * Get user age in milliseconds
   * @returns {number}
   */
  getAge() {
    return Date.now() - this.createdAt.getTime();
  }

  /**
   * Get time since last active in milliseconds
   * @returns {number}
   */
  getTimeSinceLastActive() {
    return Date.now() - this.lastActive.getTime();
  }

  /**
   * Get a safe object representation (without password hash)
   * @returns {Object}
   */
  toSafeObject() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      createdAt: this.createdAt,
      lastActive: this.lastActive
    };
  }

  /**
   * Get a full object representation (including password hash)
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      passwordHash: this.passwordHash,
      createdAt: this.createdAt,
      lastActive: this.lastActive
    };
  }

  /**
   * Create a User from a plain object
   * @param {Object} data - Plain object data
   * @returns {User}
   */
  static fromObject(data) {
    return new User({
      ...data,
      createdAt: new Date(data.createdAt),
      lastActive: new Date(data.lastActive)
    });
  }

  /**
   * Check if two users are the same
   * @param {User} other - Other user to compare
   * @returns {boolean}
   */
  equals(other) {
    return other instanceof User && this.id === other.id;
  }
}

module.exports = User;