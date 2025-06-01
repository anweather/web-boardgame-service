/**
 * Chess Frontend Plugin Module
 * Handles chess-specific frontend logic: move parsing, formatting, and UI helpers
 */
class ChessFrontend {
  /**
   * Parse chess move from user input
   * Handles various chess notation formats and normalizes for chess.js library
   * @param {string} moveText - Raw user input
   * @returns {string} - Normalized move for backend processing
   */
  static parseMove(moveText) {
    if (!moveText || typeof moveText !== 'string') {
      throw new Error('Invalid move input');
    }

    // Normalize to lowercase for chess.js library compatibility
    // The chess.js library is case sensitive and prefers lowercase
    const normalized = moveText.trim().toLowerCase();
    
    // Basic validation for chess move patterns
    // This is game-agnostic enough but chess-optimized
    if (!/^[a-h][1-8](-[a-h][1-8])?$|^[kqrbnp]?[a-h]?[1-8]?x?[a-h][1-8](=[qrbn])?[+#]?$|^o-o(-o)?[+#]?$/i.test(normalized)) {
      // Allow through - let backend do final validation
      // This allows for more flexible input
    }
    
    return normalized;
  }

  /**
   * Format move data for display in move history
   * @param {string|Object} moveData - Move data from backend
   * @returns {string} - Formatted move text for display
   */
  static formatMove(moveData) {
    // Handle different move formats
    if (typeof moveData === 'string') {
      return moveData;
    }
    
    if (moveData && typeof moveData === 'object') {
      // Handle object format (e.g., {from: 'e2', to: 'e4'})
      if (moveData.from && moveData.to) {
        return `${moveData.from}-${moveData.to}`;
      }
      
      // Handle other chess move object formats
      if (moveData.san) {
        return moveData.san; // Standard Algebraic Notation
      }
      
      if (moveData.lan) {
        return moveData.lan; // Long Algebraic Notation
      }
    }
    
    // Fallback to JSON string representation
    return JSON.stringify(moveData);
  }

  /**
   * Get placeholder text for move input field
   * @returns {string} - Placeholder text
   */
  static getMoveInputPlaceholder() {
    return 'Enter move (e.g., e2-e4, Nf3, O-O)';
  }

  /**
   * Get help text for move input
   * @returns {string} - Help text explaining move format
   */
  static getMoveInputHelp() {
    return 'Use standard chess notation: coordinate (e2-e4) or algebraic (Nf3, Qh5, O-O)';
  }

  /**
   * Validate move format before sending to backend
   * Basic client-side validation to provide immediate feedback
   * @param {string} moveText - Raw user input
   * @returns {Object} - {valid: boolean, error?: string}
   */
  static validateMoveFormat(moveText) {
    if (!moveText || typeof moveText !== 'string') {
      return { valid: false, error: 'Move cannot be empty' };
    }

    const trimmed = moveText.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Move cannot be empty' };
    }

    // Very basic format check - let backend do the real validation
    if (trimmed.length > 10) {
      return { valid: false, error: 'Move seems too long' };
    }

    // Check for obviously invalid characters (beyond chess notation)
    if (!/^[a-zA-Z0-9\-=+#x]*$/.test(trimmed)) {
      return { valid: false, error: 'Move contains invalid characters' };
    }

    return { valid: true };
  }

  /**
   * Get game type display name
   * @returns {string} - Display name for this game type
   */
  static getDisplayName() {
    return 'Chess';
  }

  /**
   * Get game type description
   * @returns {string} - Description of the game
   */
  static getDescription() {
    return 'Classic two-player chess game with standard rules';
  }

  /**
   * Get supported move input formats
   * @returns {Array<string>} - List of supported formats
   */
  static getSupportedMoveFormats() {
    return [
      'Coordinate notation (e2-e4, a7-a5)',
      'Standard Algebraic Notation (Nf3, Qh5, Bxc6)',
      'Castling (O-O, O-O-O)',
      'Promotion (e8=Q, a1=R)',
      'Check/Checkmate indicators (+, #)'
    ];
  }

  /**
   * Get example moves for help/tutorial
   * @returns {Array<Object>} - Array of {move, description} objects
   */
  static getExampleMoves() {
    return [
      { move: 'e2-e4', description: 'Move pawn from e2 to e4' },
      { move: 'Nf3', description: 'Move knight to f3' },
      { move: 'O-O', description: 'Castle kingside' },
      { move: 'Qh5+', description: 'Move queen to h5 with check' },
      { move: 'e8=Q', description: 'Promote pawn to queen' }
    ];
  }
}

module.exports = ChessFrontend;