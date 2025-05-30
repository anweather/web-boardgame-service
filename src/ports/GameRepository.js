/**
 * Port interface for game persistence
 * This defines the contract that any game repository adapter must implement
 */
class GameRepository {
  /**
   * Save a game to persistence
   * @param {Game} game - Domain game entity
   * @returns {Promise<Game>} - Saved game with any generated IDs
   */
  async save(game) {
    throw new Error('save method must be implemented');
  }

  /**
   * Find a game by ID
   * @param {string} gameId - Game identifier
   * @returns {Promise<Game|null>} - Game entity or null if not found
   */
  async findById(gameId) {
    throw new Error('findById method must be implemented');
  }

  /**
   * Find games by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Game[]>} - Array of matching games
   */
  async findByCriteria(criteria) {
    throw new Error('findByCriteria method must be implemented');
  }

  /**
   * Update an existing game
   * @param {string} gameId - Game identifier
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Game>} - Updated game
   */
  async update(gameId, updates) {
    throw new Error('update method must be implemented');
  }

  /**
   * Delete a game
   * @param {string} gameId - Game identifier
   * @returns {Promise<boolean>} - Success status
   */
  async delete(gameId) {
    throw new Error('delete method must be implemented');
  }

  /**
   * Add a player to a game
   * @param {string} gameId - Game identifier
   * @param {string} playerId - Player identifier
   * @param {Object} playerData - Player-specific data
   * @returns {Promise<Object>} - Player assignment data
   */
  async addPlayer(gameId, playerId, playerData) {
    throw new Error('addPlayer method must be implemented');
  }

  /**
   * Get players for a game
   * @param {string} gameId - Game identifier
   * @returns {Promise<Object[]>} - Array of player data
   */
  async getPlayers(gameId) {
    throw new Error('getPlayers method must be implemented');
  }

  /**
   * Save a move
   * @param {string} gameId - Game identifier
   * @param {string} playerId - Player identifier
   * @param {Object} move - Move data
   * @param {Object} boardStateAfter - Board state after move
   * @param {number} moveNumber - Move sequence number
   * @returns {Promise<Object>} - Saved move data
   */
  async saveMove(gameId, playerId, move, boardStateAfter, moveNumber) {
    throw new Error('saveMove method must be implemented');
  }

  /**
   * Get move history for a game
   * @param {string} gameId - Game identifier
   * @returns {Promise<Object[]>} - Array of moves
   */
  async getMoveHistory(gameId) {
    throw new Error('getMoveHistory method must be implemented');
  }
}

module.exports = GameRepository;