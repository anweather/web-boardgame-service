const BoardGame = require('../BoardGame');
const { Chess: ChessGame } = require('chess.js');

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

      // Create chess game instance from current board state
      const chessGame = new ChessGame();
      
      // Convert our board state to FEN notation for the chess library
      const fen = this.boardStateToFen(currentBoardState);
      chessGame.load(fen);

      // Try to make the move using the chess library
      const moveResult = chessGame.move(move.trim());
      
      if (!moveResult) {
        return { valid: false, error: 'Invalid move for current position' };
      }

      // Move is valid according to chess rules
      return { valid: true };
      
    } catch (error) {
      console.error('Chess move validation error:', error);
      return { valid: false, error: 'Move validation failed: ' + error.message };
    }
  }

  applyMove(move, currentBoardState) {
    try {
      // Create chess game instance from current board state
      const chessGame = new ChessGame();
      
      // Convert our board state to FEN notation for the chess library
      const fen = this.boardStateToFen(currentBoardState);
      chessGame.load(fen);

      // Apply the move using the chess library
      const moveResult = chessGame.move(move.trim());
      
      if (!moveResult) {
        throw new Error('Invalid move');
      }

      // Get the new board state from the chess library
      const newFen = chessGame.fen();
      const newBoardState = this.fenToBoardState(newFen);
      
      return newBoardState;
      
    } catch (error) {
      console.error('Chess move application error:', error);
      throw new Error('Failed to apply move: ' + error.message);
    }
  }

  isGameComplete(boardState) {
    try {
      // Use chess library to check if game is complete
      const chessGame = new ChessGame();
      const fen = this.boardStateToFen(boardState);
      chessGame.load(fen);
      
      return chessGame.isCheckmate() || chessGame.isStalemate() || chessGame.isDraw();
    } catch (error) {
      console.error('Error checking if game complete:', error);
      return false;
    }
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

  // Helper methods for FEN conversion
  boardStateToFen(boardState) {
    try {
      // Convert board array to FEN board representation
      let fenBoard = '';
      for (let row = 0; row < 8; row++) {
        let emptyCount = 0;
        for (let col = 0; col < 8; col++) {
          const piece = boardState.board[row][col];
          if (piece === null) {
            emptyCount++;
          } else {
            if (emptyCount > 0) {
              fenBoard += emptyCount;
              emptyCount = 0;
            }
            fenBoard += piece;
          }
        }
        if (emptyCount > 0) {
          fenBoard += emptyCount;
        }
        if (row < 7) {
          fenBoard += '/';
        }
      }

      // Determine active color (assume white's turn by default, could be improved)
      const activeColor = 'w';
      
      // Castling rights from board state
      let castling = '';
      if (boardState.castlingRights) {
        if (boardState.castlingRights.whiteKingside) castling += 'K';
        if (boardState.castlingRights.whiteQueenside) castling += 'Q';
        if (boardState.castlingRights.blackKingside) castling += 'k';
        if (boardState.castlingRights.blackQueenside) castling += 'q';
      }
      if (castling === '') castling = '-';

      // En passant target
      const enPassant = boardState.enPassantTarget || '-';

      // Half-move clock and full-move number
      const halfMove = boardState.halfmoveClock || 0;
      const fullMove = boardState.fullmoveNumber || 1;

      return `${fenBoard} ${activeColor} ${castling} ${enPassant} ${halfMove} ${fullMove}`;
    } catch (error) {
      console.error('Error converting board state to FEN:', error);
      // Return starting position as fallback
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
  }

  fenToBoardState(fen) {
    try {
      const parts = fen.split(' ');
      const fenBoard = parts[0];
      const activeColor = parts[1];
      const castling = parts[2];
      const enPassant = parts[3];
      const halfMove = parseInt(parts[4]) || 0;
      const fullMove = parseInt(parts[5]) || 1;

      // Convert FEN board to array
      const board = [];
      const rows = fenBoard.split('/');
      
      for (const row of rows) {
        const boardRow = [];
        for (const char of row) {
          if (char >= '1' && char <= '8') {
            // Empty squares
            const emptyCount = parseInt(char);
            for (let i = 0; i < emptyCount; i++) {
              boardRow.push(null);
            }
          } else {
            // Piece
            boardRow.push(char);
          }
        }
        board.push(boardRow);
      }

      // Build castling rights
      const castlingRights = {
        whiteKingside: castling.includes('K'),
        whiteQueenside: castling.includes('Q'),
        blackKingside: castling.includes('k'),
        blackQueenside: castling.includes('q')
      };

      return {
        board,
        castlingRights,
        enPassantTarget: enPassant === '-' ? null : enPassant,
        halfmoveClock: halfMove,
        fullmoveNumber: fullMove
      };
    } catch (error) {
      console.error('Error converting FEN to board state:', error);
      // Return initial board state as fallback
      return this.getInitialBoardState();
    }
  }
}

module.exports = Chess;