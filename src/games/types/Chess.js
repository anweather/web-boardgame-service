const BoardGame = require('../BoardGame');

class Chess extends BoardGame {
  static GAME_TYPE_NAME = 'Chess';
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
    const newBoardState = JSON.parse(JSON.stringify(currentBoardState));
    
    // Parse the move notation and apply it to the board
    const standardMovePattern = /^([a-h][1-8])-([a-h][1-8])$/; // e2-e4 format
    const algebraicMovePattern = /^([NBRQK]?)([a-h]?[1-8]?)(x?)([a-h][1-8])(=[NBRQ])?(\+|#)?$/; // Nf3 format
    
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
      
      // Determine whose turn it is based on move count (odd = white, even = black)
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
    
    // Reset en passant target (would be set if pawn moved two squares)
    newBoardState.enPassantTarget = null;
    
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

  findPieceForAlgebraicMove(boardState, pieceType, toPos, fromHint, isWhiteMove = true) {
    // Convert piece type to actual piece symbols
    const pieceSymbol = isWhiteMove ? pieceType.toUpperCase() : pieceType.toLowerCase();
    
    // If it's a pawn move (no piece type specified)
    if (pieceType === 'P' || pieceType === '') {
      // Find pawn that can move to this square
      const direction = isWhiteMove ? -1 : 1; // White moves up (-1), black moves down (+1)
      const startRank = isWhiteMove ? 6 : 1; // Starting rank for pawns
      
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
        // Knights move in L-shape: 2 squares in one direction, 1 in perpendicular
        return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
      
      case 'b': // Bishop
        // Bishops move diagonally
        return absRowDiff === absColDiff && absRowDiff > 0;
      
      case 'r': // Rook
        // Rooks move horizontally or vertically
        return (rowDiff === 0 && colDiff !== 0) || (rowDiff !== 0 && colDiff === 0);
      
      case 'q': // Queen
        // Queens move like both bishop and rook
        return (absRowDiff === absColDiff && absRowDiff > 0) || 
               ((rowDiff === 0 && colDiff !== 0) || (rowDiff !== 0 && colDiff === 0));
      
      case 'k': // King
        // Kings move one square in any direction
        return absRowDiff <= 1 && absColDiff <= 1 && (absRowDiff + absColDiff) > 0;
      
      case 'p': // Pawn
        // Pawns have complex movement rules, for now just return true
        return true;
      
      default:
        return false;
    }
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