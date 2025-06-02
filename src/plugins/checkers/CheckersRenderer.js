/**
 * Checkers Board Renderer
 * Handles checkers-specific board rendering using the common framework
 */
const ImageRenderer = require('../../framework/ImageRenderer');

class CheckersRenderer {
  /**
   * Generate checkers board image as PNG buffer
   * @param {Object} boardState - Checkers board state
   * @param {Object} options - Rendering options
   * @returns {Promise<Buffer>} - PNG image buffer
   */
  static async generateBoardImage(boardState, options = {}) {
    try {
      // Default to large size for better quality and responsiveness
      const defaultOptions = {
        width: 800,
        height: 800,
        density: 200,
        ...options
      };
      
      const svgContent = this.createCheckersBoardSVG(boardState, defaultOptions);
      return await ImageRenderer.svgToPng(svgContent, defaultOptions);
    } catch (error) {
      console.error('Checkers board rendering error:', error);
      return await ImageRenderer.createErrorImage('Checkers Board Error', options);
    }
  }

  /**
   * Create checkers board SVG content
   * @param {Object} boardState - Checkers board state
   * @param {Object} options - Rendering options
   * @returns {string} - Complete SVG content
   */
  static createCheckersBoardSVG(boardState, options = {}) {
    const {
      width = 800,
      height = 800,
      title = 'Checkers Board',
      showCoordinates = true,
      highlightSquares = [],
      lastMove = null
    } = options;

    // Ensure we have a valid board state
    const board = this.validateBoardState(boardState);
    
    // Calculate board size and margins based on image size
    const margin = Math.max(15, width * 0.03); // 3% margin, minimum 15px
    const titleSpace = 25; // Title space
    const coordinateSpace = showCoordinates ? 25 : 0; // Coordinate space
    const infoSpace = 30; // Space for game info
    
    const availableSpace = Math.min(
      width - (2 * margin),
      height - (2 * margin) - titleSpace - coordinateSpace - infoSpace
    );
    const boardSize = Math.max(200, availableSpace * 0.95); // 95% of available space
    
    const startX = (width - boardSize) / 2;
    const startY = margin + titleSpace;
    
    // Create SVG frame using common framework
    const frameOptions = {
      width,
      height,
      title,
      backgroundColor: '#f9f9f9',
      borderColor: '#8B4513',
      borderWidth: Math.max(2, width * 0.005), // Scale border with image size
      margin
    };

    const frame = ImageRenderer.createSVGFrame(width, height, frameOptions);
    
    // Add title with size-appropriate font
    const titleFontSize = Math.max(12, width * 0.025); // Smaller title font
    const titleElement = `<text x="${width / 2}" y="${margin + titleFontSize}" class="board-title" font-size="${titleFontSize}">Checkers Game</text>`;
    
    // Create checkers board content
    const boardContent = this.drawCheckersBoard(board, {
      size: boardSize,
      startX,
      startY,
      highlightSquares,
      lastMove
    });
    
    // Add coordinate labels if requested
    const coordinates = showCoordinates ? 
      ImageRenderer.createCoordinateLabels({
        files: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], // Checkers-specific files
        ranks: ['8', '7', '6', '5', '4', '3', '2', '1'], // Checkers-specific ranks
        boardSize,
        startX,
        startY,
        fontSize: Math.max(16, width * 0.035) // Medium-large coordinate font for mobile readability
      }) : '';
    
    // Add game info
    const gameInfo = this.getGameInfo(boardState);
    const infoY = startY + boardSize + coordinateSpace + 10;
    const infoElements = ImageRenderer.addGameInfo(gameInfo, margin, infoY);
    
    // Close SVG frame
    const closing = ImageRenderer.closeSVGFrame({ 
      showTimestamp: true, 
      width, 
      height 
    });
    
    return frame + titleElement + boardContent + coordinates + infoElements + closing;
  }

  /**
   * Draw the checkers board squares and pieces
   * @param {Array} board - 8x8 board array
   * @param {Object} options - Drawing options
   * @returns {string} - SVG elements for board
   */
  static drawCheckersBoard(board, options = {}) {
    const {
      size = 320,
      startX = 25,
      startY = 25,
      highlightSquares = [],
      lastMove = null
    } = options;

    const squareSize = size / 8;
    let svg = '';

    // Draw board squares
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const x = startX + col * squareSize;
        const y = startY + row * squareSize;
        const isDarkSquare = (row + col) % 2 === 1; // Checkers uses dark squares
        
        // Checkers colors - traditional brown/tan
        const squareColor = isDarkSquare ? '#8B4513' : '#F5DEB3'; // Dark brown / Wheat
        
        // Check for highlights
        const squareName = this.getSquareName(row, col);
        const isHighlighted = highlightSquares.includes(squareName);
        const isLastMove = lastMove && (lastMove.from === squareName || lastMove.to === squareName);
        
        let fillColor = squareColor;
        if (isLastMove) {
          fillColor = isDarkSquare ? '#FFD700' : '#FFF8DC'; // Gold highlight for last move
        } else if (isHighlighted) {
          fillColor = isDarkSquare ? '#FF6347' : '#FFB6C1'; // Red highlight for other highlights
        }

        const strokeWidth = Math.max(0.5, squareSize * 0.01); // Scale stroke with square size
        svg += `<rect x="${x}" y="${y}" width="${squareSize}" height="${squareSize}" fill="${fillColor}" stroke="#654321" stroke-width="${strokeWidth}"/>\n  `;
        
        // Draw piece if present (only on dark squares)
        if (isDarkSquare) {
          const piece = board[row][col];
          if (piece) {
            svg += this.drawPiece(piece, x + squareSize/2, y + squareSize/2, squareSize);
          }
        }
      }
    }

    return svg;
  }

  /**
   * Draw a checkers piece at specified position
   * @param {string} piece - Piece character (r, R for red, b, B for black)
   * @param {number} x - Center X position
   * @param {number} y - Center Y position
   * @param {number} size - Square size
   * @returns {string} - SVG element for piece
   */
  static drawPiece(piece, x, y, size) {
    const isRed = piece === 'r' || piece === 'R';
    const isKing = piece === 'R' || piece === 'B';
    
    const pieceRadius = size * 0.35; // Piece size relative to square
    const strokeWidth = Math.max(1, size * 0.02); // Scale stroke with piece size
    
    // Piece colors
    const pieceColor = isRed ? '#DC143C' : '#2F4F4F'; // Crimson / Dark Slate Gray
    const strokeColor = isRed ? '#8B0000' : '#000000'; // Dark Red / Black
    const shadowColor = 'rgba(0,0,0,0.3)';
    
    let svg = '';
    
    // Add shadow for depth
    svg += `<circle cx="${x + 2}" cy="${y + 2}" r="${pieceRadius}" fill="${shadowColor}"/>\n  `;
    
    // Draw main piece circle
    svg += `<circle cx="${x}" cy="${y}" r="${pieceRadius}" fill="${pieceColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>\n  `;
    
    // Add inner circle for visual detail
    const innerRadius = pieceRadius * 0.7;
    const innerColor = isRed ? '#FF6B6B' : '#708090'; // Lighter versions
    svg += `<circle cx="${x}" cy="${y}" r="${innerRadius}" fill="${innerColor}" stroke="${strokeColor}" stroke-width="${strokeWidth * 0.5}"/>\n  `;
    
    // Draw crown for kings
    if (isKing) {
      const crownSize = pieceRadius * 0.8;
      const crownColor = '#FFD700'; // Gold
      
      // Simple crown using text symbol
      svg += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" 
                font-family="serif" font-size="${crownSize}" 
                fill="${crownColor}" stroke="#B8860B" stroke-width="${strokeWidth * 0.5}">♔</text>\n  `;
    }
    
    return svg;
  }

  /**
   * Convert row/col to checkers square name (e.g., 0,0 -> a8)
   * @param {number} row - Board row (0-7)
   * @param {number} col - Board column (0-7)
   * @returns {string} - Square name (e.g., 'a8')
   */
  static getSquareName(row, col) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[col] + ranks[row];
  }

  /**
   * Validate and normalize board state
   * @param {Object} boardState - Raw board state
   * @returns {Array} - Normalized 8x8 board array
   */
  static validateBoardState(boardState) {
    // Handle different board state formats
    if (!boardState) {
      return this.getInitialBoard();
    }

    if (boardState.board && Array.isArray(boardState.board)) {
      return boardState.board;
    }

    if (Array.isArray(boardState) && boardState.length === 8) {
      return boardState;
    }

    // If board state is invalid, return initial position
    console.warn('Invalid board state provided, using initial position');
    return this.getInitialBoard();
  }

  /**
   * Get initial checkers board position
   * @returns {Array} - 8x8 array representing initial position
   */
  static getInitialBoard() {
    return [
      [null, 'b', null, 'b', null, 'b', null, 'b'],  // Row 0 (8th rank)
      ['b', null, 'b', null, 'b', null, 'b', null],  // Row 1 (7th rank)
      [null, 'b', null, 'b', null, 'b', null, 'b'],  // Row 2 (6th rank)
      [null, null, null, null, null, null, null, null],  // Row 3 (5th rank)
      [null, null, null, null, null, null, null, null],  // Row 4 (4th rank)
      ['r', null, 'r', null, 'r', null, 'r', null],  // Row 5 (3rd rank)
      [null, 'r', null, 'r', null, 'r', null, 'r'],  // Row 6 (2nd rank)
      ['r', null, 'r', null, 'r', null, 'r', null]   // Row 7 (1st rank)
    ];
  }

  /**
   * Extract game information for display
   * @param {Object} boardState - Board state object
   * @returns {Array<string>} - Array of info lines
   */
  static getGameInfo(boardState) {
    const info = [];
    
    if (boardState && boardState.moveCount !== undefined) {
      info.push(`Move: ${boardState.moveCount}`);
    }
    
    if (boardState && boardState.currentPlayer) {
      const currentPlayer = boardState.currentPlayer.charAt(0).toUpperCase() + boardState.currentPlayer.slice(1);
      info.push(`Turn: ${currentPlayer}`);
    }
    
    if (boardState && boardState.capturedPieces) {
      const { red = 0, black = 0 } = boardState.capturedPieces;
      if (red > 0 || black > 0) {
        info.push(`Captured: Red ${red}, Black ${black}`);
      }
    }
    
    return info;
  }

  /**
   * Count pieces of each color on the board
   * @param {Array} board - 8x8 board array
   * @returns {Object} - Piece counts by color
   */
  static countPieces(board) {
    let redPieces = 0;
    let blackPieces = 0;
    let redKings = 0;
    let blackKings = 0;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          switch (piece) {
            case 'r':
              redPieces++;
              break;
            case 'R':
              redPieces++;
              redKings++;
              break;
            case 'b':
              blackPieces++;
              break;
            case 'B':
              blackPieces++;
              blackKings++;
              break;
          }
        }
      }
    }
    
    return {
      red: { total: redPieces, kings: redKings, men: redPieces - redKings },
      black: { total: blackPieces, kings: blackKings, men: blackPieces - blackKings },
      total: redPieces + blackPieces
    };
  }

  /**
   * Get piece information for a specific square
   * @param {Array} board - 8x8 board array
   * @param {string} square - Square notation (e.g., "a1")
   * @returns {Object|null} - Piece information or null
   */
  static getPieceAt(board, square) {
    const pos = this.algebraicToPosition(square);
    if (pos.row < 0 || pos.row >= 8 || pos.col < 0 || pos.col >= 8) {
      return null;
    }
    
    const piece = board[pos.row][pos.col];
    if (!piece) return null;
    
    return {
      symbol: piece,
      color: (piece === 'r' || piece === 'R') ? 'red' : 'black',
      isKing: piece === 'R' || piece === 'B',
      square: square
    };
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

module.exports = CheckersRenderer;