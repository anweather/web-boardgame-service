const GamePlugin = require('../ports/GamePlugin');
const ChessFrontend = require('./chess/ChessFrontend');
const ChessRenderer = require('./chess/ChessRenderer');

/**
 * Chess game plugin
 * Implements the GamePlugin interface for chess games
 */
class ChessPlugin extends GamePlugin {
  /**
   * Get plugin metadata
   * @returns {Object} Plugin metadata
   */
  static getMetadata() {
    return {
      name: 'Chess',
      description: 'Classic two-player chess game',
      minPlayers: 2,
      maxPlayers: 2,
      estimatedDuration: '30-60 minutes',
      complexity: 'High',
      categories: ['Strategy', 'Board Game', 'Classic'],
      version: '1.0.0'
    };
  }

  getGameType() {
    return 'chess';
  }

  getDisplayName() {
    return 'Chess';
  }

  getDescription() {
    return 'Classic two-player chess game with full rule validation';
  }

  getMinPlayers() {
    return 2;
  }

  getMaxPlayers() {
    return 2;
  }

  getInitialBoardState(gameSettings = {}) {
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

  validateMove(move, boardState, playerId, players) {
    try {
      // Basic move format validation
      if (!move || typeof move !== 'string') {
        return { valid: false, error: 'Invalid move format' };
      }

      // Parse move notation
      const standardMovePattern = /^([a-h][1-8])-([a-h][1-8])$/;
      const algebraicMovePattern = /^([NBRQK]?)([a-h]?[1-8]?)(x?)([a-h][1-8])(=[NBRQ])?(\+|#)?$/;
      
      const standardMatch = move.match(standardMovePattern);
      const algebraicMatch = move.match(algebraicMovePattern);
      
      if (!standardMatch && !algebraicMatch) {
        return { valid: false, error: 'Invalid move notation. Use format like e2-e4 or Nf3' };
      }

      // Extract destination square
      let to;
      if (standardMatch) {
        to = standardMatch[2];
      } else if (algebraicMatch) {
        to = algebraicMatch[4];
      }
      
      // Validate destination square
      const file = to.charCodeAt(0) - 97;
      const rank = parseInt(to[1]) - 1;
      
      if (file < 0 || file > 7 || rank < 0 || rank > 7) {
        return { valid: false, error: 'Invalid destination square' };
      }

      // Get player color
      const player = players.find(p => p.user_id === playerId);
      if (!player) {
        return { valid: false, error: 'Player not in game' };
      }

      return { valid: true };
      
    } catch (error) {
      return { valid: false, error: 'Move validation failed' };
    }
  }

  applyMove(move, boardState, playerId, players) {
    const newBoardState = JSON.parse(JSON.stringify(boardState));
    
    // Parse the move notation and apply it to the board
    const standardMovePattern = /^([a-h][1-8])-([a-h][1-8])$/;
    const algebraicMovePattern = /^([NBRQK]?)([a-h]?[1-8]?)(x?)([a-h][1-8])(=[NBRQ])?(\+|#)?$/;
    
    const standardMatch = move.match(standardMovePattern);
    const algebraicMatch = move.match(algebraicMovePattern);
    
    if (standardMatch) {
      // Handle standard notation like e2-e4
      const fromSquare = standardMatch[1];
      const toSquare = standardMatch[2];
      
      const fromPos = this.algebraicToPosition(fromSquare);
      const toPos = this.algebraicToPosition(toSquare);
      
      // Move the piece
      const piece = newBoardState.board[fromPos.row][fromPos.col];
      newBoardState.board[toPos.row][toPos.col] = piece;
      newBoardState.board[fromPos.row][fromPos.col] = null;
      
    } else if (algebraicMatch) {
      // Handle algebraic notation like Nf3, Bxd7, etc.
      const [, pieceType, fromHint, capture, toSquare] = algebraicMatch;
      const toPos = this.algebraicToPosition(toSquare);
      
      // Determine whose turn it is based on move count
      const isWhiteMove = (newBoardState.fullmoveNumber || 1) % 2 === 1;
      
      // Find the piece that can make this move
      const piece = this.findPieceForAlgebraicMove(newBoardState, pieceType || 'P', toPos, fromHint, isWhiteMove);
      
      if (piece) {
        // Move the piece
        newBoardState.board[toPos.row][toPos.col] = piece.symbol;
        newBoardState.board[piece.row][piece.col] = null;
      } else {
        throw new Error(`No valid ${pieceType || 'pawn'} can move to ${toSquare}`);
      }
    }
    
    // Increment move counters
    if (newBoardState.fullmoveNumber) {
      newBoardState.fullmoveNumber += 1;
    }
    
    // Reset en passant target
    newBoardState.enPassantTarget = null;
    
    return newBoardState;
  }

  isGameComplete(boardState, players) {
    // For now, return false (game continues)
    // In a full implementation, check for checkmate, stalemate, etc.
    return false;
  }

  getWinner(boardState, players) {
    // Return null if game not complete
    if (!this.isGameComplete(boardState, players)) {
      return null;
    }
    
    // In full implementation, determine winner from checkmate position
    return null;
  }

  getNextPlayer(currentPlayerId, players, boardState) {
    const turnOrder = players
      .sort((a, b) => a.player_order - b.player_order)
      .map(p => p.user_id);
    
    const currentIndex = turnOrder.indexOf(currentPlayerId);
    const nextIndex = (currentIndex + 1) % turnOrder.length;
    return turnOrder[nextIndex];
  }

  getAvailableColors(playerCount) {
    return ['white', 'black'];
  }

  assignPlayerColor(playerOrder, totalPlayers) {
    const colors = this.getAvailableColors();
    return colors[playerOrder - 1] || `player${playerOrder}`;
  }

  validateBoardState(boardState) {
    if (!boardState || !boardState.board || !Array.isArray(boardState.board)) {
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

  getRenderData(boardState, players, options = {}) {
    return {
      board: boardState.board,
      orientation: options.orientation || 'white',
      highlights: options.highlights || [],
      annotations: options.annotations || []
    };
  }

  getGameStats(boardState, players) {
    return {
      gameType: this.getGameType(),
      playerCount: players.length,
      moveCount: boardState.fullmoveNumber || 1,
      minPlayers: this.getMinPlayers(),
      maxPlayers: this.getMaxPlayers(),
      pieceCount: this.countPieces(boardState)
    };
  }

  // Helper methods (same as original Chess class)
  algebraicToPosition(algebraic) {
    const file = algebraic.charCodeAt(0) - 97;
    const rank = 8 - parseInt(algebraic[1]);
    return { row: rank, col: file };
  }

  positionToAlgebraic(row, col) {
    const file = String.fromCharCode(97 + col);
    const rank = (8 - row).toString();
    return file + rank;
  }

  findPieceForAlgebraicMove(boardState, pieceType, toPos, fromHint, isWhiteMove = true) {
    const pieceSymbol = isWhiteMove ? pieceType.toUpperCase() : pieceType.toLowerCase();
    
    if (pieceType === 'P' || pieceType === '') {
      // Find pawn that can move to this square
      const direction = isWhiteMove ? -1 : 1;
      
      // Check one square back
      const oneSquareBack = toPos.row - direction;
      if (oneSquareBack >= 0 && oneSquareBack < 8) {
        const piece = boardState.board[oneSquareBack][toPos.col];
        if (piece === (isWhiteMove ? 'P' : 'p')) {
          return { symbol: piece, row: oneSquareBack, col: toPos.col };
        }
      }
      
      // Check two squares back (initial pawn move)
      if (toPos.row === (isWhiteMove ? 4 : 3)) {
        const twoSquaresBack = toPos.row - (2 * direction);
        if (twoSquaresBack >= 0 && twoSquaresBack < 8) {
          const piece = boardState.board[twoSquaresBack][toPos.col];
          if (piece === (isWhiteMove ? 'P' : 'p')) {
            return { symbol: piece, row: twoSquaresBack, col: toPos.col };
          }
        }
      }
    } else {
      // Find the specified piece type that can move to this square
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = boardState.board[row][col];
          if (piece === pieceSymbol) {
            // Check if this piece can actually move to the target square
            if (this.canPieceMoveTo(piece, row, col, toPos.row, toPos.col)) {
              return { symbol: piece, row, col };
            }
          }
        }
      }
    }
    
    return null;
  }

  canPieceMoveTo(piece, fromRow, fromCol, toRow, toCol) {
    const pieceType = piece.toLowerCase();
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);

    switch (pieceType) {
      case 'n': // Knight
        return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
      case 'b': // Bishop
        return absRowDiff === absColDiff && absRowDiff > 0;
      case 'r': // Rook
        return (rowDiff === 0 && colDiff !== 0) || (rowDiff !== 0 && colDiff === 0);
      case 'q': // Queen
        return (absRowDiff === absColDiff && absRowDiff > 0) || 
               ((rowDiff === 0 && colDiff !== 0) || (rowDiff !== 0 && colDiff === 0));
      case 'k': // King
        return absRowDiff <= 1 && absColDiff <= 1 && (absRowDiff + absColDiff) > 0;
      case 'p': // Pawn
        return true; // Simplified for now
      default:
        return false;
    }
  }

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

  countPieces(boardState) {
    let whitePieces = 0;
    let blackPieces = 0;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState.board[row][col];
        if (piece) {
          if (piece === piece.toUpperCase()) {
            whitePieces++;
          } else {
            blackPieces++;
          }
        }
      }
    }
    
    return { white: whitePieces, black: blackPieces, total: whitePieces + blackPieces };
  }

  // ============================================================================
  // FRONTEND INTERFACE IMPLEMENTATION
  // ============================================================================

  /**
   * Parse move from user input (delegated to frontend module)
   */
  static parseMove(moveText) {
    return ChessFrontend.parseMove(moveText);
  }

  /**
   * Format move data for display (delegated to frontend module)
   */
  static formatMove(moveData) {
    return ChessFrontend.formatMove(moveData);
  }

  /**
   * Get placeholder text for move input field
   */
  static getMoveInputPlaceholder() {
    return ChessFrontend.getMoveInputPlaceholder();
  }

  /**
   * Get help text for move input
   */
  static getMoveInputHelp() {
    return ChessFrontend.getMoveInputHelp();
  }

  /**
   * Validate move format before sending to backend
   */
  static validateMoveFormat(moveText) {
    return ChessFrontend.validateMoveFormat(moveText);
  }

  // ============================================================================
  // RENDERING INTERFACE IMPLEMENTATION
  // ============================================================================

  /**
   * Generate board image as PNG buffer (delegated to renderer)
   */
  static async generateBoardImage(boardState, options = {}) {
    return await ChessRenderer.generateBoardImage(boardState, options);
  }

  /**
   * Create board SVG content (delegated to renderer)
   */
  static createBoardSVG(boardState, options = {}) {
    return ChessRenderer.createChessBoardSVG(boardState, options);
  }

  /**
   * Get rendering options schema for chess
   */
  static getRenderingOptionsSchema() {
    return {
      type: 'object',
      properties: {
        width: { type: 'number', default: 800, minimum: 200, maximum: 2000 },
        height: { type: 'number', default: 800, minimum: 200, maximum: 2000 },
        density: { type: 'number', default: 200, minimum: 72, maximum: 300 },
        showCoordinates: { type: 'boolean', default: true },
        title: { type: 'string', default: 'Chess Board' },
        highlightSquares: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of square names to highlight (e.g., ["e4", "d5"])'
        },
        lastMove: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' }
          },
          description: 'Last move to highlight on the board'
        }
      }
    };
  }
}

module.exports = ChessPlugin;