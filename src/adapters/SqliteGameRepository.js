const GameRepository = require('../ports/GameRepository');
const Game = require('../domain/Game');
const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');

/**
 * SQLite implementation of GameRepository port
 * Handles persistence of game entities to SQLite database
 */
class SqliteGameRepository extends GameRepository {
  async save(game) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO games (
          id, name, game_type, status, current_player_id, 
          board_state, move_count, min_players, max_players, 
          settings, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      // Handle both domain Game objects and plain objects
      const gameData = game.toObject ? game.toObject() : game;
      
      const boardStateJson = typeof gameData.boardState === 'string' 
        ? gameData.boardState 
        : JSON.stringify(gameData.boardState);

      db.run(query, [
        gameData.id,
        gameData.name,
        gameData.gameType,
        gameData.status,
        gameData.currentPlayerId,
        boardStateJson,
        gameData.moveCount,
        gameData.minPlayers,
        gameData.maxPlayers,
        JSON.stringify(gameData.settings || {}),
        gameData.createdAt
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(game);
        }
      });
    });
  }

  async findById(gameId) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM games WHERE id = ?';
      
      db.get(query, [gameId], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(this._mapRowToGame(row));
        } else {
          resolve(null);
        }
      });
    });
  }

  async findByCriteria(criteria = {}) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM games';
      const params = [];
      const conditions = [];

      if (criteria.status) {
        conditions.push('status = ?');
        params.push(criteria.status);
      }

      if (criteria.gameType) {
        conditions.push('game_type = ?');
        params.push(criteria.gameType);
      }

      if (criteria.playerId) {
        query = `
          SELECT g.* FROM games g
          JOIN game_players gp ON g.id = gp.game_id
        `;
        conditions.push('gp.user_id = ?');
        params.push(criteria.playerId);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      if (criteria.limit) {
        query += ' LIMIT ?';
        params.push(criteria.limit);
      }

      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => this._mapRowToGame(row)));
        }
      });
    });
  }

  async update(gameId, updates) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const fields = [];
      const params = [];

      Object.keys(updates).forEach(key => {
        if (key === 'settings') {
          fields.push('settings = ?');
          params.push(JSON.stringify(updates[key]));
        } else if (key === 'boardState') {
          fields.push('board_state = ?');
          params.push(typeof updates[key] === 'string' ? updates[key] : JSON.stringify(updates[key]));
        } else if (key === 'currentPlayerId') {
          fields.push('current_player_id = ?');
          params.push(updates[key]);
        } else if (key === 'moveCount') {
          fields.push('move_count = ?');
          params.push(updates[key]);
        } else if (key === 'gameType') {
          fields.push('game_type = ?');
          params.push(updates[key]);
        } else if (key === 'minPlayers') {
          fields.push('min_players = ?');
          params.push(updates[key]);
        } else if (key === 'maxPlayers') {
          fields.push('max_players = ?');
          params.push(updates[key]);
        } else if (key === 'createdAt') {
          fields.push('created_at = ?');
          params.push(updates[key]);
        } else if (key === 'updatedAt') {
          fields.push('updated_at = ?');
          params.push(updates[key]);
        } else {
          fields.push(`${key} = ?`);
          params.push(updates[key]);
        }
      });

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(gameId);

      const query = `UPDATE games SET ${fields.join(', ')} WHERE id = ?`;

      db.run(query, params, (err) => {
        if (err) {
          reject(err);
        } else {
          // Return updated game
          this.findById(gameId).then(resolve).catch(reject);
        }
      });
    });
  }

  async delete(gameId) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Delete related records first
        db.run('DELETE FROM game_players WHERE game_id = ?', [gameId]);
        db.run('DELETE FROM moves WHERE game_id = ?', [gameId]);
        db.run('DELETE FROM notifications WHERE game_id = ?', [gameId]);
        
        // Delete the game
        db.run('DELETE FROM games WHERE id = ?', [gameId], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes > 0);
          }
        });
      });
    });
  }

  async addPlayer(gameId, playerId, playerData) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const playerRecordId = uuidv4();
      
      const query = `
        INSERT INTO game_players (id, game_id, user_id, player_order, color, player_data)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.run(query, [
        playerRecordId,
        gameId,
        playerId,
        playerData.playerOrder || 1,
        playerData.color || null,
        JSON.stringify(playerData.data || {})
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: playerRecordId,
            gameId,
            playerId,
            playerOrder: playerData.playerOrder || 1,
            color: playerData.color || null,
            data: playerData.data || {}
          });
        }
      });
    });
  }

  async getPlayers(gameId) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT gp.*, u.username 
        FROM game_players gp 
        JOIN users u ON gp.user_id = u.id 
        WHERE gp.game_id = ? 
        ORDER BY gp.player_order
      `;

      db.all(query, [gameId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const players = rows.map(row => ({
            id: row.id,
            user_id: row.user_id,
            username: row.username,
            player_order: row.player_order,
            color: row.color,
            player_data: row.player_data ? JSON.parse(row.player_data) : {}
          }));
          resolve(players);
        }
      });
    });
  }

  async saveMove(gameId, playerId, move, boardStateAfter, moveNumber) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const moveId = uuidv4();
      const boardStateJson = typeof boardStateAfter === 'string' 
        ? boardStateAfter 
        : JSON.stringify(boardStateAfter);
      
      const query = `
        INSERT INTO moves (id, game_id, user_id, move_notation, board_state_after, move_number)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.run(query, [
        moveId,
        gameId,
        playerId,
        JSON.stringify(move),
        boardStateJson,
        moveNumber
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: moveId,
            gameId,
            playerId,
            move,
            boardStateAfter: boardStateJson,
            moveNumber,
            timestamp: new Date().toISOString()
          });
        }
      });
    });
  }

  async getMoveHistory(gameId) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT m.*, u.username 
        FROM moves m 
        JOIN users u ON m.user_id = u.id 
        WHERE m.game_id = ? 
        ORDER BY m.move_number
      `;

      db.all(query, [gameId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const moves = rows.map(row => ({
            id: row.id,
            gameId: row.game_id,
            playerId: row.user_id,
            username: row.username,
            move: typeof row.move_notation === 'string' && (row.move_notation.startsWith('{') || row.move_notation.startsWith('"'))
              ? JSON.parse(row.move_notation) 
              : row.move_notation,
            boardStateAfter: row.board_state_after,
            moveNumber: row.move_number,
            timestamp: row.timestamp
          }));
          resolve(moves);
        }
      });
    });
  }

  /**
   * Maps database row to domain Game entity
   * @param {Object} row - Database row
   * @returns {Game} Domain game entity
   * @private
   */
  _mapRowToGame(row) {
    return new Game({
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
      updatedAt: row.updated_at
    });
  }
}

module.exports = SqliteGameRepository;