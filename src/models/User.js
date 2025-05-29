const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../database/init');

class User {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.username = data.username;
    this.email = data.email;
    this.passwordHash = data.password_hash;
    this.createdAt = data.created_at;
    this.lastActive = data.last_active;
  }

  static async create(userData) {
    const db = getDatabase();
    const user = new User(userData);
    
    if (userData.password) {
      user.passwordHash = await bcrypt.hash(userData.password, 10);
    }

    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO users (id, username, email, password_hash)
        VALUES (?, ?, ?, ?)
      `;

      db.run(query, [user.id, user.username, user.email, user.passwordHash], function(err) {
        if (err) {
          reject(err);
        } else {
          delete user.passwordHash;
          resolve(user);
        }
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const query = 'SELECT * FROM users WHERE id = ?';
      
      db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          const user = new User(row);
          delete user.passwordHash;
          resolve(user);
        } else {
          resolve(null);
        }
      });
    });
  }

  static findByUsername(username) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const query = 'SELECT * FROM users WHERE username = ?';
      
      db.get(query, [username], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(new User(row));
        } else {
          resolve(null);
        }
      });
    });
  }

  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const query = 'SELECT * FROM users WHERE email = ?';
      
      db.get(query, [email], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(new User(row));
        } else {
          resolve(null);
        }
      });
    });
  }

  async validatePassword(password) {
    return bcrypt.compare(password, this.passwordHash);
  }

  updateLastActive() {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const query = 'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?';
      
      db.run(query, [this.id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  getGames() {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const query = `
        SELECT g.*, gp.player_order, gp.color
        FROM games g
        JOIN game_players gp ON g.id = gp.game_id
        WHERE gp.user_id = ?
        ORDER BY g.updated_at DESC
      `;

      db.all(query, [this.id], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = User;