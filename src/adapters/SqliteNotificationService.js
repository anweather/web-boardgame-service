const NotificationService = require('../ports/NotificationService');
const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');

/**
 * SQLite implementation of NotificationService port
 * Handles both persistence and real-time notifications
 */
class SqliteNotificationService extends NotificationService {
  constructor(socketIo = null) {
    super();
    this.socketIo = socketIo;
  }

  /**
   * Set the Socket.IO instance for real-time notifications
   * @param {Object} socketIo - Socket.IO instance
   */
  setSocketIo(socketIo) {
    this.socketIo = socketIo;
  }

  async sendNotification(userId, type, message, metadata = {}) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const notificationId = uuidv4();
      const query = `
        INSERT INTO notifications (id, user_id, type, message, game_id, read)
        VALUES (?, ?, ?, ?, ?, FALSE)
      `;

      db.run(query, [
        notificationId,
        userId,
        type,
        message,
        metadata.gameId || null
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          // Send real-time notification if socket available
          if (this.socketIo) {
            this.socketIo.to(`user-${userId}`).emit('notification', {
              id: notificationId,
              type,
              message,
              gameId: metadata.gameId,
              timestamp: new Date().toISOString()
            });
          }
          
          resolve({
            id: notificationId,
            userId,
            type,
            message,
            gameId: metadata.gameId,
            read: false,
            timestamp: new Date().toISOString()
          });
        }
      });
    });
  }

  async sendRealTimeNotification(userId, event, data) {
    if (this.socketIo) {
      this.socketIo.to(`user-${userId}`).emit(event, data);
    }
  }

  async broadcastToGame(gameId, event, data) {
    if (this.socketIo) {
      this.socketIo.to(gameId).emit(event, data);
    }
  }

  async getUserNotifications(userId, options = {}) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      
      const query = `
        SELECT n.*, g.name as game_name
        FROM notifications n
        LEFT JOIN games g ON n.game_id = g.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT ? OFFSET ?
      `;

      db.all(query, [userId, limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const notifications = rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            type: row.type,
            message: row.message,
            read: Boolean(row.read),
            gameId: row.game_id,
            gameName: row.game_name,
            createdAt: row.created_at
          }));
          resolve(notifications);
        }
      });
    });
  }

  async markAsRead(notificationId) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const query = 'UPDATE notifications SET read = TRUE WHERE id = ?';
      
      db.run(query, [notificationId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User identifier
   * @returns {Promise<void>}
   */
  async markAllAsRead(userId) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const query = 'UPDATE notifications SET read = TRUE WHERE user_id = ? AND read = FALSE';
      
      db.run(query, [userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get notification count for a user
   * @param {string} userId - User identifier
   * @param {boolean} unreadOnly - Count only unread notifications
   * @returns {Promise<number>} Notification count
   */
  async getNotificationCount(userId, unreadOnly = false) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      let query = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?';
      const params = [userId];
      
      if (unreadOnly) {
        query += ' AND read = FALSE';
      }

      db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  /**
   * Delete old notifications
   * @param {number} daysOld - Delete notifications older than this many days
   * @returns {Promise<number>} Number of deleted notifications
   */
  async deleteOldNotifications(daysOld = 30) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const query = `
        DELETE FROM notifications 
        WHERE created_at < datetime('now', '-${daysOld} days')
      `;

      db.run(query, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }
}

module.exports = SqliteNotificationService;