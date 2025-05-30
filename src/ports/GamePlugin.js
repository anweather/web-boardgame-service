/**
 * Port interface for game plugins
 * This defines the contract that any game implementation must follow
 */
class GamePlugin {
  /**
   * Get game metadata
   * @returns {Object} Game metadata
   */
  static getMetadata() {
    throw new Error('getMetadata method must be implemented');
  }

  /**
   * Get the game type identifier
   * @returns {string} Game type (e.g., 'chess', 'checkers')
   */
  getGameType() {
    throw new Error('getGameType method must be implemented');
  }

  /**
   * Get the display name of the game
   * @returns {string} Display name
   */
  getDisplayName() {
    throw new Error('getDisplayName method must be implemented');
  }

  /**
   * Get game description
   * @returns {string} Game description
   */
  getDescription() {
    throw new Error('getDescription method must be implemented');
  }

  /**
   * Get minimum number of players
   * @returns {number} Minimum players
   */
  getMinPlayers() {
    throw new Error('getMinPlayers method must be implemented');
  }

  /**
   * Get maximum number of players
   * @returns {number} Maximum players
   */
  getMaxPlayers() {
    throw new Error('getMaxPlayers method must be implemented');
  }

  /**
   * Get initial board state for a new game
   * @param {Object} gameSettings - Game-specific settings
   * @returns {Object} Initial board state
   */
  getInitialBoardState(gameSettings = {}) {
    throw new Error('getInitialBoardState method must be implemented');
  }

  /**
   * Validate a move
   * @param {Object} move - Move to validate
   * @param {Object} boardState - Current board state
   * @param {string} playerId - Player making the move
   * @param {Object[]} players - Array of players in the game
   * @returns {Object} Validation result { valid: boolean, error?: string }
   */
  validateMove(move, boardState, playerId, players) {
    throw new Error('validateMove method must be implemented');
  }

  /**
   * Apply a move to the board state
   * @param {Object} move - Move to apply
   * @param {Object} boardState - Current board state
   * @param {string} playerId - Player making the move
   * @param {Object[]} players - Array of players in the game
   * @returns {Object} New board state
   */
  applyMove(move, boardState, playerId, players) {
    throw new Error('applyMove method must be implemented');
  }

  /**
   * Check if the game is complete
   * @param {Object} boardState - Current board state
   * @param {Object[]} players - Array of players in the game
   * @returns {boolean} Whether the game is complete
   */
  isGameComplete(boardState, players) {
    throw new Error('isGameComplete method must be implemented');
  }

  /**
   * Get the winner(s) of the game
   * @param {Object} boardState - Current board state
   * @param {Object[]} players - Array of players in the game
   * @returns {string|string[]|null} Winner player ID(s) or null if no winner/draw
   */
  getWinner(boardState, players) {
    throw new Error('getWinner method must be implemented');
  }

  /**
   * Get the next player in turn order
   * @param {string} currentPlayerId - Current player ID
   * @param {Object[]} players - Array of players in the game
   * @param {Object} boardState - Current board state
   * @returns {string} Next player ID
   */
  getNextPlayer(currentPlayerId, players, boardState) {
    throw new Error('getNextPlayer method must be implemented');
  }

  /**
   * Get available colors/roles for players
   * @param {number} playerCount - Number of players
   * @returns {string[]} Array of available colors/roles
   */
  getAvailableColors(playerCount) {
    throw new Error('getAvailableColors method must be implemented');
  }

  /**
   * Assign color/role to a player
   * @param {number} playerOrder - Player order (1-based)
   * @param {number} totalPlayers - Total number of players
   * @returns {string} Assigned color/role
   */
  assignPlayerColor(playerOrder, totalPlayers) {
    throw new Error('assignPlayerColor method must be implemented');
  }

  /**
   * Validate game state integrity
   * @param {Object} boardState - Board state to validate
   * @returns {boolean} Whether the board state is valid
   */
  validateBoardState(boardState) {
    throw new Error('validateBoardState method must be implemented');
  }

  /**
   * Get data needed for board rendering
   * @param {Object} boardState - Current board state
   * @param {Object[]} players - Array of players in the game
   * @param {Object} options - Rendering options
   * @returns {Object} Render data
   */
  getRenderData(boardState, players, options = {}) {
    throw new Error('getRenderData method must be implemented');
  }

  /**
   * Get game statistics
   * @param {Object} boardState - Current board state
   * @param {Object[]} players - Array of players in the game
   * @returns {Object} Game statistics
   */
  getGameStats(boardState, players) {
    throw new Error('getGameStats method must be implemented');
  }

  /**
   * Serialize board state for storage
   * @param {Object} boardState - Board state to serialize
   * @returns {string} Serialized board state
   */
  serializeBoardState(boardState) {
    return JSON.stringify(boardState);
  }

  /**
   * Deserialize board state from storage
   * @param {string} serializedState - Serialized board state
   * @returns {Object} Deserialized board state
   */
  deserializeBoardState(serializedState) {
    try {
      return JSON.parse(serializedState);
    } catch (error) {
      throw new Error('Invalid board state format');
    }
  }
}

module.exports = GamePlugin;