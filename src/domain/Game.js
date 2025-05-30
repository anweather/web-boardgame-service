const { v4: uuidv4 } = require('uuid');

/**
 * Game domain entity
 * Pure business logic without external dependencies
 */
class Game {
  constructor({
    id = uuidv4(),
    name,
    gameType,
    status = 'waiting',
    currentPlayerId = null,
    boardState,
    moveCount = 0,
    minPlayers,
    maxPlayers,
    settings = {},
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this.id = id;
    this.name = name;
    this.gameType = gameType;
    this.status = status;
    this.currentPlayerId = currentPlayerId;
    this.boardState = boardState;
    this.moveCount = moveCount;
    this.minPlayers = minPlayers;
    this.maxPlayers = maxPlayers;
    this.settings = settings;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this._validateInvariants();
  }

  /**
   * Validate domain invariants
   * @private
   */
  _validateInvariants() {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Game name cannot be empty');
    }

    if (!this.gameType || this.gameType.trim().length === 0) {
      throw new Error('Game type cannot be empty');
    }

    if (!['waiting', 'active', 'completed', 'cancelled'].includes(this.status)) {
      throw new Error('Invalid game status');
    }

    if (this.minPlayers && this.maxPlayers && this.minPlayers > this.maxPlayers) {
      throw new Error('Minimum players cannot exceed maximum players');
    }

    if (this.minPlayers && this.minPlayers < 1) {
      throw new Error('Minimum players must be at least 1');
    }

    if (this.maxPlayers && this.maxPlayers > 10) {
      throw new Error('Maximum players cannot exceed 10');
    }

    if (this.moveCount < 0) {
      throw new Error('Move count cannot be negative');
    }
  }

  /**
   * Check if the game can accept new players
   * @param {number} currentPlayerCount - Current number of players
   * @returns {boolean}
   */
  canAcceptPlayers(currentPlayerCount) {
    return this.status === 'waiting' && currentPlayerCount < this.maxPlayers;
  }

  /**
   * Check if the game can be started
   * @param {number} currentPlayerCount - Current number of players
   * @returns {boolean}
   */
  canStart(currentPlayerCount) {
    return this.status === 'waiting' && 
           currentPlayerCount >= this.minPlayers && 
           currentPlayerCount <= this.maxPlayers;
  }

  /**
   * Start the game
   * @param {string} firstPlayerId - ID of the player who goes first
   * @returns {Game} New game instance
   */
  start(firstPlayerId) {
    if (this.status !== 'waiting') {
      throw new Error('Game can only be started from waiting status');
    }

    return new Game({
      ...this,
      status: 'active',
      currentPlayerId: firstPlayerId,
      updatedAt: new Date()
    });
  }

  /**
   * Make a move in the game
   * @param {string} nextPlayerId - ID of the next player
   * @param {Object} newBoardState - New board state after move
   * @returns {Game} New game instance
   */
  makeMove(nextPlayerId, newBoardState) {
    if (this.status !== 'active') {
      throw new Error('Can only make moves in active games');
    }

    return new Game({
      ...this,
      currentPlayerId: nextPlayerId,
      boardState: newBoardState,
      moveCount: this.moveCount + 1,
      updatedAt: new Date()
    });
  }

  /**
   * Complete the game
   * @param {string|null} winnerId - ID of the winning player, null for draw
   * @returns {Game} New game instance
   */
  complete(winnerId = null) {
    if (this.status !== 'active') {
      throw new Error('Can only complete active games');
    }

    return new Game({
      ...this,
      status: 'completed',
      currentPlayerId: null,
      updatedAt: new Date(),
      settings: {
        ...this.settings,
        winnerId
      }
    });
  }

  /**
   * Cancel the game
   * @returns {Game} New game instance
   */
  cancel() {
    if (this.status === 'completed') {
      throw new Error('Cannot cancel completed games');
    }

    return new Game({
      ...this,
      status: 'cancelled',
      currentPlayerId: null,
      updatedAt: new Date()
    });
  }

  /**
   * Update game settings
   * @param {Object} newSettings - New settings to merge
   * @returns {Game} New game instance
   */
  updateSettings(newSettings) {
    return new Game({
      ...this,
      settings: {
        ...this.settings,
        ...newSettings
      },
      updatedAt: new Date()
    });
  }

  /**
   * Check if a player is the current player
   * @param {string} playerId - Player ID to check
   * @returns {boolean}
   */
  isCurrentPlayer(playerId) {
    return this.currentPlayerId === playerId;
  }

  /**
   * Check if the game is in a specific status
   * @param {string} status - Status to check
   * @returns {boolean}
   */
  hasStatus(status) {
    return this.status === status;
  }

  /**
   * Get game age in milliseconds
   * @returns {number}
   */
  getAge() {
    return Date.now() - this.createdAt.getTime();
  }

  /**
   * Get time since last update in milliseconds
   * @returns {number}
   */
  getTimeSinceLastUpdate() {
    return Date.now() - this.updatedAt.getTime();
  }

  /**
   * Get a plain object representation
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      gameType: this.gameType,
      status: this.status,
      currentPlayerId: this.currentPlayerId,
      boardState: this.boardState,
      moveCount: this.moveCount,
      minPlayers: this.minPlayers,
      maxPlayers: this.maxPlayers,
      settings: this.settings,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create a Game from a plain object
   * @param {Object} data - Plain object data
   * @returns {Game}
   */
  static fromObject(data) {
    return new Game({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    });
  }
}

module.exports = Game;