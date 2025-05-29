const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');
const GameFactory = require('../games/GameFactory');

class Game {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.gameType = data.game_type || 'chess';
    this.status = data.status || 'waiting';
    this.currentPlayerId = data.current_player_id;
    this.boardState = data.board_state;
    this.moveCount = data.move_count || 0;
    this.minPlayers = data.min_players || 2;
    this.maxPlayers = data.max_players || 2;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.settings = data.settings ? JSON.parse(data.settings) : {};
  }

  static create(gameData) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      
      // Validate game type
      if (!GameFactory.validateGameType(gameData.game_type)) {
        reject(new Error(`Unsupported game type: ${gameData.game_type}`));
        return;
      }

      // Get game type info for player limits
      const gameTypeInfo = GameFactory.getGameTypeInfo(gameData.game_type);
      
      const game = new Game({
        ...gameData,
        min_players: gameTypeInfo.minPlayers,
        max_players: gameTypeInfo.maxPlayers
      });
      
      // Get initial board state from game type
      if (!game.boardState) {
        const gameInstance = GameFactory.createGameInstance(game.gameType, {});
        game.boardState = gameInstance.boardState;
      }

      const query = `
        INSERT INTO games (id, name, game_type, status, board_state, min_players, max_players, settings)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(query, [
        game.id,
        game.name,
        game.gameType,
        game.status,
        game.boardState,
        game.minPlayers,
        game.maxPlayers,
        JSON.stringify(game.settings)
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(game);
        }
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const query = 'SELECT * FROM games WHERE id = ?';
      
      db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(new Game(row));
        } else {
          resolve(null);
        }
      });
    });
  }

  static findAll(filters = {}) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      let query = 'SELECT * FROM games';
      const params = [];

      if (filters.status) {
        query += ' WHERE status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY created_at DESC';

      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => new Game(row)));
        }
      });
    });
  }

  update(updates) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const fields = [];
      const params = [];

      Object.keys(updates).forEach(key => {
        if (key === 'settings') {
          fields.push('settings = ?');
          params.push(JSON.stringify(updates[key]));
        } else {
          fields.push(`${key} = ?`);
          params.push(updates[key]);
        }
      });

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(this.id);

      const query = `UPDATE games SET ${fields.join(', ')} WHERE id = ?`;

      db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          Object.assign(this, updates);
          resolve(this);
        }
      });
    });
  }

  addPlayer(userId, playerOrder, color = null, playerData = {}) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const playerId = uuidv4();
      
      // Auto-assign color if not provided
      if (!color) {
        const gameInstance = GameFactory.createGameInstance(this.gameType, {});
        color = gameInstance.assignPlayerColor(playerOrder);
      }
      
      const query = `
        INSERT INTO game_players (id, game_id, user_id, player_order, color, player_data)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.run(query, [playerId, this.id, userId, playerOrder, color, JSON.stringify(playerData)], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ 
            id: playerId, 
            game_id: this.id, 
            user_id: userId, 
            player_order: playerOrder, 
            color,
            player_data: playerData
          });
        }
      });
    });
  }

  getPlayers() {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const query = `
        SELECT gp.*, u.username 
        FROM game_players gp 
        JOIN users u ON gp.user_id = u.id 
        WHERE gp.game_id = ? 
        ORDER BY gp.player_order
      `;

      db.all(query, [this.id], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const players = rows.map(row => ({
            ...row,
            player_data: row.player_data ? JSON.parse(row.player_data) : {}
          }));
          resolve(players);
        }
      });
    });
  }

  canAcceptPlayer() {
    return this.getPlayers().then(players => {
      return this.status === 'waiting' && players.length < this.maxPlayers;
    });
  }

  canStartGame() {
    return this.getPlayers().then(players => {
      return players.length >= this.minPlayers && players.length <= this.maxPlayers;
    });
  }

  validateMove(move, playerId) {
    return this.getPlayers().then(players => {
      const gameInstance = GameFactory.createGameInstance(this.gameType, {
        players: players.map(p => ({
          userId: p.user_id,
          playerOrder: p.player_order,
          color: p.color
        }))
      });
      
      const currentBoardState = gameInstance.deserializeBoardState(this.boardState);
      return gameInstance.validateMove(move, playerId, currentBoardState);
    });
  }

  applyMove(move, playerId) {
    return this.validateMove(move, playerId).then(validation => {
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      return this.getPlayers().then(players => {
        const gameInstance = GameFactory.createGameInstance(this.gameType, {
          players: players.map(p => ({
            userId: p.user_id,
            playerOrder: p.player_order,
            color: p.color
          }))
        });
        
        const currentBoardState = gameInstance.deserializeBoardState(this.boardState);
        const newBoardState = gameInstance.applyMove(move, currentBoardState);
        
        return {
          newBoardState: gameInstance.serializeBoardState(newBoardState),
          isGameComplete: gameInstance.isGameComplete(newBoardState),
          winner: gameInstance.getWinner(newBoardState)
        };
      });
    });
  }
}

module.exports = Game;