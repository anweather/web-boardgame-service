const BoardGame = require('../BoardGame');

class Checkers extends BoardGame {
  static GAME_TYPE_NAME = 'checkers';
  static GAME_DESCRIPTION = 'Classic two-player checkers/draughts game';
  static MIN_PLAYERS = 2;
  static MAX_PLAYERS = 2;

  getInitialBoardState() {
    // 8x8 board with pieces on dark squares
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Place black pieces (top of board)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) { // Dark squares only
          board[row][col] = 'b'; // black piece
        }
      }
    }
    
    // Place white pieces (bottom of board)
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) { // Dark squares only
          board[row][col] = 'w'; // white piece
        }
      }
    }

    return {
      board,
      mustCapture: false, // If player must make a capture move
      chainCapture: null  // If in middle of multi-capture sequence
    };
  }

  validateMove(move, playerId, currentBoardState) {
    try {
      // Move format: "a3-b4" or "a3xc5" for captures
      const movePattern = /^([a-h][1-8])([-x])([a-h][1-8])$/;
      const match = move.match(movePattern);
      
      if (!match) {
        return { valid: false, error: 'Invalid move notation. Use format: a3-b4 or a3xc5' };
      }

      const [, from, separator, to] = match;
      const isCapture = separator === 'x';
      
      const fromPos = this.algebraicToPosition(from);
      const toPos = this.algebraicToPosition(to);
      
      // Validate positions are on board
      if (!this.isValidPosition(fromPos) || !this.isValidPosition(toPos)) {
        return { valid: false, error: 'Invalid board position' };
      }

      // Check if destination is on a dark square
      if ((toPos.row + toPos.col) % 2 === 0) {
        return { valid: false, error: 'Can only move to dark squares' };
      }

      // Get player color and check piece ownership
      const playerColor = this.getPlayerColor(playerId);
      const piece = currentBoardState.board[fromPos.row][fromPos.col];
      
      if (!piece) {
        return { valid: false, error: 'No piece at source position' };
      }

      if (!this.isPieceOwnedByPlayer(piece, playerColor)) {
        return { valid: false, error: 'Not your piece' };
      }

      // Check if destination is empty
      if (currentBoardState.board[toPos.row][toPos.col] !== null) {
        return { valid: false, error: 'Destination square is occupied' };
      }

      // Validate move direction and distance
      const rowDiff = toPos.row - fromPos.row;
      const colDiff = toPos.col - fromPos.col;
      const absRowDiff = Math.abs(rowDiff);
      const absColDiff = Math.abs(colDiff);

      // Must move diagonally
      if (absRowDiff !== absColDiff) {
        return { valid: false, error: 'Must move diagonally' };
      }

      const isKing = this.isPieceKing(piece);
      
      if (!isCapture) {
        // Normal move - one square diagonally
        if (absRowDiff !== 1) {
          return { valid: false, error: 'Normal moves must be one square' };
        }

        // Regular pieces can only move forward
        if (!isKing) {
          const correctDirection = playerColor === 'white' ? rowDiff < 0 : rowDiff > 0;
          if (!correctDirection) {
            return { valid: false, error: 'Regular pieces can only move forward' };
          }
        }
      } else {
        // Capture move - two squares with enemy piece in between
        if (absRowDiff !== 2) {
          return { valid: false, error: 'Capture moves must jump exactly two squares' };
        }

        const middleRow = fromPos.row + rowDiff / 2;
        const middleCol = fromPos.col + colDiff / 2;
        const middlePiece = currentBoardState.board[middleRow][middleCol];

        if (!middlePiece) {
          return { valid: false, error: 'No piece to capture' };
        }

        if (this.isPieceOwnedByPlayer(middlePiece, playerColor)) {
          return { valid: false, error: 'Cannot capture your own piece' };
        }
      }

      return { valid: true };
      
    } catch (error) {
      return { valid: false, error: 'Move validation failed' };
    }
  }

  applyMove(move, currentBoardState) {
    const newBoardState = JSON.parse(JSON.stringify(currentBoardState));
    const movePattern = /^([a-h][1-8])([-x])([a-h][1-8])$/;
    const match = move.match(movePattern);
    
    if (!match) {
      throw new Error('Invalid move format');
    }

    const [, from, separator, to] = match;
    const isCapture = separator === 'x';
    
    const fromPos = this.algebraicToPosition(from);
    const toPos = this.algebraicToPosition(to);
    
    const piece = newBoardState.board[fromPos.row][fromPos.col];
    
    // Move the piece
    newBoardState.board[toPos.row][toPos.col] = piece;
    newBoardState.board[fromPos.row][fromPos.col] = null;
    
    // Handle capture
    if (isCapture) {
      const rowDiff = toPos.row - fromPos.row;
      const colDiff = toPos.col - fromPos.col;
      const middleRow = fromPos.row + rowDiff / 2;
      const middleCol = fromPos.col + colDiff / 2;
      
      // Remove captured piece
      newBoardState.board[middleRow][middleCol] = null;
    }
    
    // Check for king promotion
    const finalPiece = newBoardState.board[toPos.row][toPos.col];
    if (!this.isPieceKing(finalPiece)) {
      if ((finalPiece === 'w' && toPos.row === 0) || 
          (finalPiece === 'b' && toPos.row === 7)) {
        // Promote to king
        newBoardState.board[toPos.row][toPos.col] = finalPiece.toUpperCase();
      }
    }
    
    // Reset capture state
    newBoardState.mustCapture = false;
    newBoardState.chainCapture = null;
    
    return newBoardState;
  }

  isGameComplete(boardState) {
    // Game is complete if one side has no pieces or no legal moves
    const whitePieces = this.getPiecesByColor(boardState, 'white');
    const blackPieces = this.getPiecesByColor(boardState, 'black');
    
    return whitePieces.length === 0 || blackPieces.length === 0;
  }

  getWinner(boardState) {
    if (!this.isGameComplete(boardState)) {
      return null;
    }
    
    const whitePieces = this.getPiecesByColor(boardState, 'white');
    const blackPieces = this.getPiecesByColor(boardState, 'black');
    
    if (whitePieces.length === 0) {
      // Black wins - find black player
      const blackPlayer = this.players.find(p => p.color === 'black');
      return blackPlayer ? blackPlayer.userId : null;
    }
    
    if (blackPieces.length === 0) {
      // White wins - find white player
      const whitePlayer = this.players.find(p => p.color === 'white');
      return whitePlayer ? whitePlayer.userId : null;
    }
    
    return null;
  }

  renderBoard(boardState) {
    return {
      board: boardState.board,
      orientation: 'white',
      highlights: [],
      annotations: [],
      gameSpecific: {
        mustCapture: boardState.mustCapture,
        chainCapture: boardState.chainCapture
      }
    };
  }

  getAvailableColors() {
    return ['white', 'black'];
  }

  // Checkers-specific helper methods
  isPieceOwnedByPlayer(piece, playerColor) {
    if (!piece) return false;
    
    const isWhitePiece = piece.toLowerCase() === 'w';
    return (playerColor === 'white' && isWhitePiece) || 
           (playerColor === 'black' && !isWhitePiece);
  }

  isPieceKing(piece) {
    return piece && piece === piece.toUpperCase() && piece !== 'W' && piece !== 'B';
  }

  isValidPosition(pos) {
    return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
  }

  algebraicToPosition(algebraic) {
    const file = algebraic.charCodeAt(0) - 97; // 'a' = 0
    const rank = 8 - parseInt(algebraic[1]); // '8' = 0
    return { row: rank, col: file };
  }

  positionToAlgebraic(row, col) {
    const file = String.fromCharCode(97 + col);
    const rank = (8 - row).toString();
    return file + rank;
  }

  getPiecesByColor(boardState, color) {
    const pieces = [];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState.board[row][col];
        if (piece && this.isPieceOwnedByPlayer(piece, color)) {
          pieces.push({
            piece,
            position: this.positionToAlgebraic(row, col),
            row,
            col,
            isKing: this.isPieceKing(piece)
          });
        }
      }
    }
    
    return pieces;
  }

  validateGameState(boardState) {
    if (!super.validateGameState(boardState)) {
      return false;
    }

    // Checkers-specific validation
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

    return true;
  }
}

module.exports = Checkers;