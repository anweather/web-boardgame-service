const GamePlugin = require('../../ports/GamePlugin');
const CheckersFrontend = require('./CheckersFrontend');
const CheckersRenderer = require('./CheckersRenderer');

/**
 * Checkers game plugin
 * Implements the GamePlugin interface for checkers/draughts games
 */
class CheckersPlugin extends GamePlugin {
  /**
   * Get plugin metadata
   * @returns {Object} Plugin metadata
   */
  static getMetadata() {
    return {
      name: 'Checkers',
      description: 'Classic two-player checkers/draughts game',
      minPlayers: 2,
      maxPlayers: 2,
      estimatedDuration: '15-30 minutes',
      complexity: 'Medium',
      categories: ['Strategy', 'Board Game', 'Classic'],
      version: '1.0.0'
    };
  }

  getGameType() {
    return 'checkers';
  }

  getDisplayName() {
    return 'Checkers';
  }

  getDescription() {
    return 'Classic two-player checkers game with jumping and king promotion';
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
        [null, 'b', null, 'b', null, 'b', null, 'b'],  // Row 0 (8th rank)
        ['b', null, 'b', null, 'b', null, 'b', null],  // Row 1 (7th rank)
        [null, 'b', null, 'b', null, 'b', null, 'b'],  // Row 2 (6th rank)
        [null, null, null, null, null, null, null, null],  // Row 3 (5th rank)
        [null, null, null, null, null, null, null, null],  // Row 4 (4th rank)
        ['r', null, 'r', null, 'r', null, 'r', null],  // Row 5 (3rd rank)
        [null, 'r', null, 'r', null, 'r', null, 'r'],  // Row 6 (2nd rank)
        ['r', null, 'r', null, 'r', null, 'r', null]   // Row 7 (1st rank)
      ],
      currentPlayer: 'red',
      moveCount: 0,
      capturedPieces: { red: 0, black: 0 }
    };
  }

  validateMove(move, boardState, playerId, players) {
    try {
      // Basic move format validation
      if (!move || typeof move !== 'object') {
        return { valid: false, error: 'Invalid move format. Expected object with from/to properties.' };
      }

      const { from, to, captures } = move;
      
      if (!from || !to) {
        return { valid: false, error: 'Move must specify from and to positions (e.g., {from: "a3", to: "b4"})' };
      }

      // Validate square notation
      if (!this.isValidSquare(from) || !this.isValidSquare(to)) {
        return { valid: false, error: 'Invalid square notation. Use format like a1, b2, etc.' };
      }

      // Get player color
      const player = players.find(p => p.user_id === playerId);
      if (!player) {
        return { valid: false, error: 'Player not in game' };
      }

      const playerColor = player.color;
      
      // Convert algebraic to board positions
      const fromPos = this.algebraicToPosition(from);
      const toPos = this.algebraicToPosition(to);
      
      // Check if from square has player's piece
      const piece = boardState.board[fromPos.row][fromPos.col];
      if (!piece) {
        return { valid: false, error: 'No piece at source position' };
      }
      
      const pieceColor = this.getPieceColor(piece);
      if (pieceColor !== playerColor) {
        return { valid: false, error: 'Cannot move opponent\'s piece' };
      }

      // Check if destination is empty
      if (boardState.board[toPos.row][toPos.col] !== null) {
        return { valid: false, error: 'Destination square is occupied' };
      }

      // Validate move legality
      const moveValidation = this.validateCheckerMove(piece, fromPos, toPos, boardState, captures);
      if (!moveValidation.valid) {
        return moveValidation;
      }

      return { valid: true };
      
    } catch (error) {
      return { valid: false, error: 'Move validation failed: ' + error.message };
    }
  }

  applyMove(move, boardState, playerId, players) {
    const newBoardState = JSON.parse(JSON.stringify(boardState));
    const { from, to, captures } = move;
    
    const fromPos = this.algebraicToPosition(from);
    const toPos = this.algebraicToPosition(to);
    
    // Move the piece
    const piece = newBoardState.board[fromPos.row][fromPos.col];
    newBoardState.board[toPos.row][toPos.col] = piece;
    newBoardState.board[fromPos.row][fromPos.col] = null;
    
    // Handle captures
    if (captures && captures.length > 0) {
      for (const captureSquare of captures) {
        const capturePos = this.algebraicToPosition(captureSquare);
        const capturedPiece = newBoardState.board[capturePos.row][capturePos.col];
        
        if (capturedPiece) {
          const capturedColor = this.getPieceColor(capturedPiece);
          newBoardState.capturedPieces[capturedColor]++;
          newBoardState.board[capturePos.row][capturePos.col] = null;
        }
      }
    }
    
    // Check for king promotion
    const movedPiece = newBoardState.board[toPos.row][toPos.col];
    if (this.shouldPromoteToKing(movedPiece, toPos.row)) {
      newBoardState.board[toPos.row][toPos.col] = this.promoteToKing(movedPiece);
    }
    
    // Update game state
    newBoardState.moveCount += 1;
    newBoardState.currentPlayer = newBoardState.currentPlayer === 'red' ? 'black' : 'red';
    
    return newBoardState;
  }

  isGameComplete(boardState, players) {
    const redPieces = this.countPieces(boardState, 'red');
    const blackPieces = this.countPieces(boardState, 'black');
    
    // Game ends if one player has no pieces
    if (redPieces === 0 || blackPieces === 0) {
      return true;
    }
    
    // Game ends if current player has no valid moves
    const currentPlayerColor = boardState.currentPlayer;
    const validMoves = this.getValidMoves(boardState, currentPlayerColor);
    
    return validMoves.length === 0;
  }

  getWinner(boardState, players) {
    if (!this.isGameComplete(boardState, players)) {
      return null;
    }
    
    const redPieces = this.countPieces(boardState, 'red');
    const blackPieces = this.countPieces(boardState, 'black');
    
    // Winner is player with remaining pieces
    if (redPieces > blackPieces) {
      return players.find(p => p.color === 'red')?.user_id || null;
    } else if (blackPieces > redPieces) {
      return players.find(p => p.color === 'black')?.user_id || null;
    }
    
    // If equal pieces, winner is the player who can still move
    const currentPlayerColor = boardState.currentPlayer;
    const validMoves = this.getValidMoves(boardState, currentPlayerColor);
    
    if (validMoves.length === 0) {
      // Current player can't move, so opponent wins
      const opponentColor = currentPlayerColor === 'red' ? 'black' : 'red';
      return players.find(p => p.color === opponentColor)?.user_id || null;
    }
    
    return null; // Shouldn't reach here if game is complete
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
    return ['red', 'black'];
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

    // Check for valid piece placement (only on dark squares)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState.board[row][col];
        if (piece !== null) {
          // Pieces should only be on dark squares
          if ((row + col) % 2 === 0) {
            return false; // Light square with piece
          }
          // Valid piece types: r, R, b, B
          if (!['r', 'R', 'b', 'B'].includes(piece)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  getRenderData(boardState, players, options = {}) {
    return {
      board: boardState.board,
      currentPlayer: boardState.currentPlayer,
      moveCount: boardState.moveCount,
      capturedPieces: boardState.capturedPieces,
      highlights: options.highlights || [],
      lastMove: options.lastMove || null
    };
  }

  getGameStats(boardState, players) {
    const redPieces = this.countPieces(boardState, 'red');
    const blackPieces = this.countPieces(boardState, 'black');
    
    return {
      gameType: this.getGameType(),
      playerCount: players.length,
      moveCount: boardState.moveCount || 0,
      minPlayers: this.getMinPlayers(),
      maxPlayers: this.getMaxPlayers(),
      piecesRemaining: { red: redPieces, black: blackPieces },
      capturedPieces: boardState.capturedPieces || { red: 0, black: 0 },
      currentPlayer: boardState.currentPlayer
    };
  }

  // Helper methods for checkers-specific logic
  algebraicToPosition(algebraic) {
    const file = algebraic.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = parseInt(algebraic[1]) - 1;   // 1=0, 2=1, etc.
    return { row: 7 - rank, col: file }; // Convert to 0-based array coordinates
  }

  positionToAlgebraic(row, col) {
    const file = String.fromCharCode(97 + col);
    const rank = (8 - row).toString();
    return file + rank;
  }

  isValidSquare(square) {
    if (!square || square.length !== 2) return false;
    const file = square.charCodeAt(0);
    const rank = parseInt(square[1]);
    return file >= 97 && file <= 104 && rank >= 1 && rank <= 8; // a-h, 1-8
  }

  getPieceColor(piece) {
    if (piece === 'r' || piece === 'R') return 'red';
    if (piece === 'b' || piece === 'B') return 'black';
    return null;
  }

  isKing(piece) {
    return piece === 'R' || piece === 'B';
  }

  shouldPromoteToKing(piece, row) {
    if (piece === 'r' && row === 0) return true; // Red reaches top
    if (piece === 'b' && row === 7) return true; // Black reaches bottom
    return false;
  }

  promoteToKing(piece) {
    if (piece === 'r') return 'R';
    if (piece === 'b') return 'B';
    return piece;
  }

  countPieces(boardState, color) {
    let count = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState.board[row][col];
        if (piece && this.getPieceColor(piece) === color) {
          count++;
        }
      }
    }
    return count;
  }

  validateCheckerMove(piece, fromPos, toPos, boardState, captures = []) {
    const rowDiff = toPos.row - fromPos.row;
    const colDiff = Math.abs(toPos.col - fromPos.col);
    const isKing = this.isKing(piece);
    const pieceColor = this.getPieceColor(piece);
    
    // Must move diagonally
    if (Math.abs(rowDiff) !== colDiff) {
      return { valid: false, error: 'Pieces must move diagonally' };
    }
    
    // Direction restrictions for regular pieces
    if (!isKing) {
      if (pieceColor === 'red' && rowDiff > 0) {
        return { valid: false, error: 'Red pieces can only move toward row 0 (unless capturing)' };
      }
      if (pieceColor === 'black' && rowDiff < 0) {
        return { valid: false, error: 'Black pieces can only move toward row 7 (unless capturing)' };
      }
    }
    
    // Single step move (non-capturing)
    if (Math.abs(rowDiff) === 1) {
      if (captures && captures.length > 0) {
        return { valid: false, error: 'Single step moves cannot have captures' };
      }
      return { valid: true };
    }
    
    // Multi-step move (capturing)
    if (Math.abs(rowDiff) > 1) {
      // Must be capturing
      if (!captures || captures.length === 0) {
        return { valid: false, error: 'Multi-step moves must capture pieces' };
      }
      
      // Validate capture path
      return this.validateCapturePath(fromPos, toPos, boardState, captures, pieceColor);
    }
    
    return { valid: false, error: 'Invalid move distance' };
  }

  validateCapturePath(fromPos, toPos, boardState, captures, pieceColor) {
    // For now, simplified validation - should implement full jump validation
    const rowStep = toPos.row > fromPos.row ? 1 : -1;
    const colStep = toPos.col > fromPos.col ? 1 : -1;
    
    let currentRow = fromPos.row + rowStep;
    let currentCol = fromPos.col + colStep;
    let captureCount = 0;
    
    while (currentRow !== toPos.row && currentCol !== toPos.col) {
      const piece = boardState.board[currentRow][currentCol];
      if (piece) {
        const capturedColor = this.getPieceColor(piece);
        if (capturedColor === pieceColor) {
          return { valid: false, error: 'Cannot capture your own pieces' };
        }
        captureCount++;
      }
      currentRow += rowStep;
      currentCol += colStep;
    }
    
    if (captureCount !== captures.length) {
      return { valid: false, error: 'Capture count mismatch' };
    }
    
    return { valid: true };
  }

  getValidMoves(boardState, playerColor) {
    const moves = [];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState.board[row][col];
        if (piece && this.getPieceColor(piece) === playerColor) {
          // Find valid moves for this piece
          const pieceMoves = this.getValidMovesForPiece(row, col, boardState);
          moves.push(...pieceMoves);
        }
      }
    }
    
    return moves;
  }

  getValidMovesForPiece(row, col, boardState) {
    // Simplified - should implement full move generation
    const moves = [];
    const piece = boardState.board[row][col];
    const isKing = this.isKing(piece);
    const pieceColor = this.getPieceColor(piece);
    
    // Check all four diagonal directions
    const directions = [
      { row: -1, col: -1 }, { row: -1, col: 1 },
      { row: 1, col: -1 }, { row: 1, col: 1 }
    ];
    
    for (const dir of directions) {
      // Skip backward moves for regular pieces
      if (!isKing) {
        if (pieceColor === 'red' && dir.row > 0) continue;
        if (pieceColor === 'black' && dir.row < 0) continue;
      }
      
      const newRow = row + dir.row;
      const newCol = col + dir.col;
      
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        if (boardState.board[newRow][newCol] === null) {
          moves.push({
            from: this.positionToAlgebraic(row, col),
            to: this.positionToAlgebraic(newRow, newCol),
            captures: []
          });
        }
      }
    }
    
    return moves;
  }

  // Static methods for frontend and rendering
  static parseMove(moveText) {
    return CheckersFrontend.parseMove(moveText);
  }
  
  static formatMove(moveData) {
    return CheckersFrontend.formatMove(moveData);
  }
  
  static generateBoardImage(boardState, options = {}) {
    return CheckersRenderer.generateBoardImage(boardState, options);
  }
}

module.exports = CheckersPlugin;