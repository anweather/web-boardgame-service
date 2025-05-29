const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');

async function createNotification(userId, gameId, type, message) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const notificationId = uuidv4();
    
    const query = `
      INSERT INTO notifications (id, user_id, game_id, type, message)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.run(query, [notificationId, userId, gameId, type, message], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({
          id: notificationId,
          userId,
          gameId,
          type,
          message,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    });
  });
}

async function getUserNotifications(userId, limit = 50) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = `
      SELECT n.*, g.name as game_name
      FROM notifications n
      LEFT JOIN games g ON n.game_id = g.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ?
    `;

    db.all(query, [userId, limit], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => ({
          id: row.id,
          type: row.type,
          message: row.message,
          read: Boolean(row.read),
          gameId: row.game_id,
          gameName: row.game_name,
          createdAt: row.created_at
        })));
      }
    });
  });
}

async function markNotificationAsRead(notificationId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
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

async function markAllNotificationsAsRead(userId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = 'UPDATE notifications SET read = TRUE WHERE user_id = ?';

    db.run(query, [userId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function getUnreadNotificationCount(userId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = FALSE';

    db.get(query, [userId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.count);
      }
    });
  });
}

// Helper function to send real-time notifications via Socket.IO
function sendRealtimeNotification(io, userId, notification) {
  // Send to specific user if they're connected
  io.emit('notification', {
    userId,
    notification
  });
}

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  sendRealtimeNotification
};