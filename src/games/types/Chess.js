const BoardGame = require('../BoardGame');

class Chess extends BoardGame {
  static GAME_TYPE_NAME = 'chess';
  static GAME_DESCRIPTION = 'Classic two-player chess game';
  static MIN_PLAYERS = 2;
  static MAX_PLAYERS = 2;

  getInitialBoardState() {
    return {
      board: [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
      ],
      castlingRights: {
        whiteKingside: true,
        whiteQueenside: true,
        blackKingside: true,
        blackQueenside: true
      },
      enPassantTarget: null,
      halfmoveClock: 0,
      fullmoveNumber: 1
    };
  }

  validateMove(move, playerId, currentBoardState) {
    try {
      // Basic move format validation
      if (!move || typeof move !== 'string') {
        return { valid: false, error: 'Invalid move format' };
      }

      // Parse move notation (simplified - accepts basic formats like e2-e4, Nf3, etc.)
      const standardMovePattern = /^([a-h][1-8])-([a-h][1-8])$/; // e2-e4 format
      const algebraicMovePattern = /^([NBRQK]?)([a-h]?[1-8]?)(x?)([a-h][1-8])(=[NBRQ])?(\+|#)?$/; // Nf3 format
      
      const standardMatch = move.match(standardMovePattern);
      const algebraicMatch = move.match(algebraicMovePattern);
      
      if (!standardMatch && !algebraicMatch) {
        return { valid: false, error: 'Invalid move notation. Use format like e2-e4 or Nf3' };
      }

      // Extract destination square from either format
      let to;
      if (standardMatch) {
        to = standardMatch[2]; // e.g., "e4" from "e2-e4"
      } else if (algebraicMatch) {
        to = algebraicMatch[4]; // e.g., "f3" from "Nf3"
      }
      
      // Validate destination square
      const file = to.charCodeAt(0) - 97; // a-h to 0-7
      const rank = parseInt(to[1]) - 1;   // 1-8 to 0-7
      
      if (file < 0 || file > 7 || rank < 0 || rank > 7) {
        return { valid: false, error: 'Invalid destination square' };
      }

      // Get player color
      const playerColor = this.getPlayerColor(playerId);
      if (!playerColor) {
        return { valid: false, error: 'Player not in game' };
      }

      // Basic turn validation
      const currentPlayer = playerColor === 'white' ? 'white' : 'black';
      const expectedPieceCase = currentPlayer === 'white' ? 'uppercase' : 'lowercase';

      // More detailed validation would require implementing chess rules
      // For now, we'll accept the move if it follows basic format
      return { valid: true };
      
    } catch (error) {
      return { valid: false, error: 'Move validation failed' };
    }
  }

  applyMove(move, currentBoardState) {
    // For a full implementation, this would parse the move and update the board
    // For now, we'll return a modified board state
    const newBoardState = JSON.parse(JSON.stringify(currentBoardState));
    
    // Increment move counters
    if (newBoardState.fullmoveNumber) {
      newBoardState.fullmoveNumber += 1;
    }
    
    // Reset en passant target (would be set if pawn moved two squares)
    newBoardState.enPassantTarget = null;
    
    // In a real implementation, we would:
    // 1. Parse the move notation
    // 2. Find the piece to move
    // 3. Validate the move is legal
    // 4. Update the board array
    // 5. Handle special moves (castling, en passant, promotion)
    // 6. Update game state (castling rights, etc.)
    
    return newBoardState;
  }

  isGameComplete(boardState) {
    // In a full implementation, check for:
    // - Checkmate
    // - Stalemate  
    // - Insufficient material
    // - 50-move rule
    // - Threefold repetition
    
    // For now, return false (game continues)
    return false;
  }

  getWinner(boardState) {
    // Return null if game not complete, or player ID if someone won
    if (!this.isGameComplete(boardState)) {
      return null;
    }
    
    // In full implementation, determine winner from checkmate position
    return null;
  }

  renderBoard(boardState) {
    // Return data needed for board rendering
    return {
      board: boardState.board,
      orientation: 'white', // Could be configurable per player
      highlights: [], // Could highlight last move, check, etc.
      annotations: [] // Could show move numbers, arrows, etc.
    };
  }

  getAvailableColors() {
    return ['white', 'black'];
  }

  // Chess-specific helper methods
  isPieceWhite(piece) {
    return piece && piece === piece.toUpperCase();
  }

  isPieceBlack(piece) {
    return piece && piece === piece.toLowerCase();
  }

  getPieceType(piece) {
    return piece ? piece.toLowerCase() : null;
  }

  // Convert board position to algebraic notation
  positionToAlgebraic(row, col) {
    const file = String.fromCharCode(97 + col); // 97 = 'a'
    const rank = (8 - row).toString();
    return file + rank;
  }

  // Convert algebraic notation to board position
  algebraicToPosition(algebraic) {
    const file = algebraic.charCodeAt(0) - 97; // 'a' = 0
    const rank = 8 - parseInt(algebraic[1]); // '8' = 0
    return { row: rank, col: file };
  }

  // Get all pieces of a specific color
  getPiecesByColor(boardState, color) {
    const pieces = [];
    const isWhite = color === 'white';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState.board[row][col];
        if (piece && this.isPieceWhite(piece) === isWhite) {
          pieces.push({
            piece,
            position: this.positionToAlgebraic(row, col),
            row,
            col
          });
        }
      }
    }
    
    return pieces;
  }

  // Find the king of a specific color
  findKing(boardState, color) {
    const kingSymbol = color === 'white' ? 'K' : 'k';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (boardState.board[row][col] === kingSymbol) {
          return { row, col, position: this.positionToAlgebraic(row, col) };
        }
      }
    }
    
    return null;
  }

  validateGameState(boardState) {
    if (!super.validateGameState(boardState)) {
      return false;
    }

    // Chess-specific validation
    if (!boardState.board || !Array.isArray(boardState.board)) {
      return false;
    }

    if (boardState.board.length !== 8) {
      return false;
    }

    for (const row of boardState.board) {
      if (!Array.isArray(row) || row.length !== 8) {
        return false;
      }
    }

    // Ensure both kings are present
    const whiteKing = this.findKing(boardState, 'white');
    const blackKing = this.findKing(boardState, 'black');
    
    return whiteKing !== null && blackKing !== null;
  }
}

module.exports = Chess;