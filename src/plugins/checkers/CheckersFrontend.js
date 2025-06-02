/**
 * Checkers Frontend Plugin Module
 * Handles checkers-specific frontend logic: move parsing, formatting, and UI helpers
 */
class CheckersFrontend {
  /**
   * Parse checkers move from user input
   * Supports multiple formats: "a3-b4", "a3 to b4", "a3xc5" (capture), etc.
   * @param {string} moveText - Raw user input
   * @returns {Object} - Normalized move object with from/to/captures
   */
  static parseMove(moveText) {
    if (!moveText || typeof moveText !== 'string') {
      throw new Error('Invalid move input');
    }

    const cleanMove = moveText.trim().toLowerCase();
    
    // Handle different move formats
    let match;
    
    // Format: "a3-b4" or "a3xb4" (simple move)
    match = cleanMove.match(/^([a-h][1-8])[-x]([a-h][1-8])$/);
    if (match) {
      return {
        from: match[1],
        to: match[2],
        captures: cleanMove.includes('x') ? [this.calculateCaptureSquare(match[1], match[2])] : []
      };
    }
    
    // Format: "a3 to b4" or "a3 takes b4"
    match = cleanMove.match(/^([a-h][1-8])\s+(to|takes?)\s+([a-h][1-8])$/);
    if (match) {
      return {
        from: match[1],
        to: match[3],
        captures: match[2].startsWith('take') ? [this.calculateCaptureSquare(match[1], match[3])] : []
      };
    }
    
    // Format: "a3xc5xe7" (multiple captures)
    match = cleanMove.match(/^([a-h][1-8])x(.+)$/);
    if (match) {
      const squares = match[2].split('x');
      const finalSquare = squares[squares.length - 1];
      const captureSquares = [];
      
      let currentSquare = match[1];
      for (const nextSquare of squares) {
        const captureSquare = this.calculateCaptureSquare(currentSquare, nextSquare);
        if (captureSquare) {
          captureSquares.push(captureSquare);
        }
        currentSquare = nextSquare;
      }
      
      return {
        from: match[1],
        to: finalSquare,
        captures: captureSquares
      };
    }
    
    // Format: JSON-like object string
    if (cleanMove.startsWith('{')) {
      try {
        return JSON.parse(cleanMove);
      } catch (error) {
        throw new Error('Invalid JSON move format');
      }
    }
    
    // If no format matches, throw error with helpful message
    throw new Error('Invalid move format. Use formats like: a3-b4, a3xb4, a3 to b4, or {from: "a3", to: "b4"}');
  }

  /**
   * Format a move object for display
   * @param {Object} moveData - Move object with from/to/captures
   * @returns {string} - Human-readable move string
   */
  static formatMove(moveData) {
    if (typeof moveData === 'string') {
      return moveData; // Already formatted
    }
    
    if (!moveData || typeof moveData !== 'object') {
      return 'Invalid move';
    }
    
    const { from, to, captures } = moveData;
    
    if (!from || !to) {
      return JSON.stringify(moveData); // Fallback to JSON
    }
    
    // Format based on whether it's a capture or regular move
    if (captures && captures.length > 0) {
      if (captures.length === 1) {
        return `${from}x${to}`;
      } else {
        // Multiple captures
        return `${from}x${captures.join('x')}x${to}`;
      }
    } else {
      return `${from}-${to}`;
    }
  }

  /**
   * Get move input placeholder text for checkers
   * @returns {string} - Placeholder text
   */
  static getMoveInputPlaceholder() {
    return 'e.g., a3-b4 or a3xc5';
  }

  /**
   * Get move input help text for checkers
   * @returns {string} - Help text
   */
  static getMoveInputHelp() {
    return 'Enter moves like: a3-b4 (move), a3xb4 (capture), or a3 to b4';
  }

  /**
   * Get display name for checkers game type
   * @returns {string} - Display name
   */
  static getDisplayName() {
    return 'Checkers';
  }

  /**
   * Calculate the square being captured in a jump move
   * @param {string} from - Starting square (e.g., "a3")
   * @param {string} to - Ending square (e.g., "c5")
   * @returns {string|null} - Captured square (e.g., "b4") or null if not a capture
   */
  static calculateCaptureSquare(from, to) {
    if (!from || !to) return null;
    
    const fromFile = from.charCodeAt(0) - 97; // a=0, b=1, etc.
    const fromRank = parseInt(from[1]) - 1;   // 1=0, 2=1, etc.
    const toFile = to.charCodeAt(0) - 97;
    const toRank = parseInt(to[1]) - 1;
    
    const fileDiff = toFile - fromFile;
    const rankDiff = toRank - fromRank;
    
    // Only captures if moving 2+ squares diagonally
    if (Math.abs(fileDiff) >= 2 && Math.abs(fileDiff) === Math.abs(rankDiff)) {
      const captureFile = fromFile + Math.sign(fileDiff);
      const captureRank = fromRank + Math.sign(rankDiff);
      
      const captureSquare = String.fromCharCode(97 + captureFile) + (captureRank + 1);
      return captureSquare;
    }
    
    return null;
  }

  /**
   * Validate that a square notation is valid
   * @param {string} square - Square notation (e.g., "a1")
   * @returns {boolean} - True if valid
   */
  static isValidSquare(square) {
    if (!square || square.length !== 2) return false;
    const file = square.charCodeAt(0);
    const rank = parseInt(square[1]);
    return file >= 97 && file <= 104 && rank >= 1 && rank <= 8; // a-h, 1-8
  }

  /**
   * Check if a square is a dark square (where pieces can be placed)
   * @param {string} square - Square notation (e.g., "a1")
   * @returns {boolean} - True if dark square
   */
  static isDarkSquare(square) {
    if (!this.isValidSquare(square)) return false;
    
    const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = parseInt(square[1]) - 1;   // 1=0, 2=1, etc.
    
    // Dark squares have odd sum of coordinates
    return (file + rank) % 2 === 1;
  }

  /**
   * Get available piece types for checkers
   * @returns {Array} - Array of piece type objects
   */
  static getPieceTypes() {
    return [
      { symbol: 'r', name: 'Red Man', color: 'red', isKing: false },
      { symbol: 'R', name: 'Red King', color: 'red', isKing: true },
      { symbol: 'b', name: 'Black Man', color: 'black', isKing: false },
      { symbol: 'B', name: 'Black King', color: 'black', isKing: true }
    ];
  }

  /**
   * Get piece information from symbol
   * @param {string} piece - Piece symbol (r, R, b, B)
   * @returns {Object|null} - Piece information object
   */
  static getPieceInfo(piece) {
    const pieces = this.getPieceTypes();
    return pieces.find(p => p.symbol === piece) || null;
  }

  /**
   * Get moves that resulted in captures
   * @param {Object} moveData - Move object
   * @returns {Array} - Array of captured square names
   */
  static getCapturedSquares(moveData) {
    if (!moveData || !moveData.captures) return [];
    return Array.isArray(moveData.captures) ? moveData.captures : [];
  }

  /**
   * Check if a move is a capture move
   * @param {Object} moveData - Move object
   * @returns {boolean} - True if move captures pieces
   */
  static isCapture(moveData) {
    return this.getCapturedSquares(moveData).length > 0;
  }

  /**
   * Check if a move is a king promotion move
   * @param {Object} moveData - Move object
   * @param {Object} boardState - Current board state
   * @returns {boolean} - True if move results in king promotion
   */
  static isPromotion(moveData, boardState) {
    if (!moveData || !moveData.from || !moveData.to || !boardState) return false;
    
    const fromPos = this.algebraicToPosition(moveData.from);
    const toPos = this.algebraicToPosition(moveData.to);
    const piece = boardState.board[fromPos.row][fromPos.col];
    
    if (!piece) return false;
    
    // Red pieces promote when reaching row 0 (rank 8)
    if (piece === 'r' && toPos.row === 0) return true;
    
    // Black pieces promote when reaching row 7 (rank 1)
    if (piece === 'b' && toPos.row === 7) return true;
    
    return false;
  }

  /**
   * Convert algebraic notation to array position
   * @param {string} algebraic - Square notation (e.g., "a1")
   * @returns {Object} - Position object with row/col
   */
  static algebraicToPosition(algebraic) {
    const file = algebraic.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = parseInt(algebraic[1]) - 1;   // 1=0, 2=1, etc.
    return { row: 7 - rank, col: file }; // Convert to 0-based array coordinates
  }

  /**
   * Convert array position to algebraic notation
   * @param {number} row - Array row (0-7)
   * @param {number} col - Array column (0-7)
   * @returns {string} - Square notation (e.g., "a1")
   */
  static positionToAlgebraic(row, col) {
    const file = String.fromCharCode(97 + col);
    const rank = (8 - row).toString();
    return file + rank;
  }
}

module.exports = CheckersFrontend;