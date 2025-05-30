/**
 * Port interface for notification services
 * This defines the contract for any notification adapter (email, push, websocket, etc.)
 */
class NotificationService {
  /**
   * Send a notification to a user
   * @param {string} userId - User identifier
   * @param {string} type - Notification type (turn, game_won, etc.)
   * @param {string} message - Notification message
   * @param {Object} metadata - Additional notification data
   * @returns {Promise<void>}
   */
  async sendNotification(userId, type, message, metadata = {}) {
    throw new Error('sendNotification method must be implemented');
  }

  /**
   * Send real-time notification (e.g., via WebSocket)
   * @param {string} userId - User identifier
   * @param {string} event - Event type
   * @param {Object} data - Event data
   * @returns {Promise<void>}
   */
  async sendRealTimeNotification(userId, event, data) {
    throw new Error('sendRealTimeNotification method must be implemented');
  }

  /**
   * Send notification to all players in a game
   * @param {string} gameId - Game identifier
   * @param {string} event - Event type
   * @param {Object} data - Event data
   * @returns {Promise<void>}
   */
  async broadcastToGame(gameId, event, data) {
    throw new Error('broadcastToGame method must be implemented');
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User identifier
   * @param {Object} options - Query options (limit, offset, etc.)
   * @returns {Promise<Object[]>} - Array of notifications
   */
  async getUserNotifications(userId, options = {}) {
    throw new Error('getUserNotifications method must be implemented');
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification identifier
   * @returns {Promise<void>}
   */
  async markAsRead(notificationId) {
    throw new Error('markAsRead method must be implemented');
  }
}

module.exports = NotificationService;