const UserRepository = require('../ports/UserRepository');
const User = require('../domain/User');
const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * SQLite implementation of UserRepository port
 * Handles persistence of user entities to SQLite database
 */
class SqliteUserRepository extends UserRepository {
  async create(userData) {
    const db = getDatabase();
    
    const user = new User({
      id: userData.id || uuidv4(),
      username: userData.username,
      email: userData.email,
      passwordHash: userData.passwordHash || (userData.password ? await bcrypt.hash(userData.password, 10) : 'placeholder')
    });
    
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO users (id, username, email, password_hash)
        VALUES (?, ?, ?, ?)
      `;

      db.run(query, [user.id, user.username, user.email, user.passwordHash], function(err) {
        if (err) {
          reject(err);
        } else {
          // Return user entity
          resolve(user);
        }
      });
    });
  }

  async findById(userId) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE id = ?';
      
      db.get(query, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(this._mapRowToUser(row, false)); // Don't include password hash
        } else {
          resolve(null);
        }
      });
    });
  }

  async findAll(options = {}) {
    const db = getDatabase();
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT u.*, 
               COUNT(DISTINCT gp.game_id) as games_played
        FROM users u
        LEFT JOIN game_players gp ON u.id = gp.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      db.all(query, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const users = rows.map(row => {
            const user = this._mapRowToUser(row, false);
            // Add games played count
            user.gamesPlayed = row.games_played || 0;
            return user;
          });
          resolve(users);
        }
      });
    });
  }

  async findByUsername(username) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE username = ?';
      
      db.get(query, [username], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(this._mapRowToUser(row, true)); // Include password hash for authentication
        } else {
          resolve(null);
        }
      });
    });
  }

  async findByEmail(email) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE email = ?';
      
      db.get(query, [email], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(this._mapRowToUser(row, true)); // Include password hash for authentication
        } else {
          resolve(null);
        }
      });
    });
  }

  async updateLastActive(userId) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?';
      
      db.run(query, [userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getUserGames(userId) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT g.*, gp.player_order, gp.color
        FROM games g
        JOIN game_players gp ON g.id = gp.game_id
        WHERE gp.user_id = ?
        ORDER BY g.updated_at DESC
      `;

      db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const games = rows.map(row => ({
            id: row.id,
            name: row.name,
            gameType: row.game_type,
            status: row.status,
            currentPlayerId: row.current_player_id,
            boardState: row.board_state,
            moveCount: row.move_count || 0,
            minPlayers: row.min_players,
            maxPlayers: row.max_players,
            settings: row.settings ? JSON.parse(row.settings) : {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            playerOrder: row.player_order,
            color: row.color
          }));
          resolve(games);
        }
      });
    });
  }

  /**
   * Maps database row to domain User entity
   * @param {Object} row - Database row
   * @param {boolean} includePassword - Whether to include password hash
   * @returns {User} Domain user entity
   * @private
   */
  _mapRowToUser(row, includePassword = false) {
    return new User({
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: includePassword ? row.password_hash : 'hidden',
      createdAt: new Date(row.created_at),
      lastActive: new Date(row.last_active || row.created_at)
    });
  }
}

module.exports = SqliteUserRepository;