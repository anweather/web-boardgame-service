/**
 * Port interface for board image rendering
 * This defines the contract for any image rendering adapter
 */
class ImageRenderer {
  /**
   * Render a game board as an image
   * @param {string} gameType - Type of game (chess, checkers, etc.)
   * @param {Object} boardState - Current board state
   * @param {Object} options - Rendering options (size, style, etc.)
   * @returns {Promise<Buffer>} - Image buffer (PNG format)
   */
  async renderBoard(gameType, boardState, options = {}) {
    throw new Error('renderBoard method must be implemented');
  }

  /**
   * Get supported game types for rendering
   * @returns {string[]} - Array of supported game types
   */
  getSupportedGameTypes() {
    throw new Error('getSupportedGameTypes method must be implemented');
  }

  /**
   * Validate if a game type is supported
   * @param {string} gameType - Game type to check
   * @returns {boolean} - Whether the game type is supported
   */
  supportsGameType(gameType) {
    return this.getSupportedGameTypes().includes(gameType);
  }
}

module.exports = ImageRenderer;