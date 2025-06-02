/**
 * Chess Board Renderer
 * Handles chess-specific board rendering using the common framework
 */
const ImageRenderer = require('../../framework/ImageRenderer');

class ChessRenderer {
  /**
   * Generate chess board image as PNG buffer
   * @param {Object} boardState - Chess board state
   * @param {Object} options - Rendering options
   * @returns {Promise<Buffer>} - PNG image buffer
   */
  static async generateBoardImage(boardState, options = {}) {
    try {
      // Default to larger size for better quality and responsiveness
      const defaultOptions = {
        width: 800,
        height: 800,
        density: 200,
        ...options
      };
      
      const svgContent = this.createChessBoardSVG(boardState, defaultOptions);
      return await ImageRenderer.svgToPng(svgContent, defaultOptions);
    } catch (error) {
      console.error('Chess board rendering error:', error);
      return await ImageRenderer.createErrorImage('Chess Board Error', options);
    }
  }

  /**
   * Create chess board SVG content
   * @param {Object} boardState - Chess board state
   * @param {Object} options - Rendering options
   * @returns {string} - Complete SVG content
   */
  static createChessBoardSVG(boardState, options = {}) {
    const {
      width = 800,
      height = 800,
      title = 'Chess Board',
      showCoordinates = true,
      highlightSquares = [],
      lastMove = null
    } = options;

    // Ensure we have a valid board state
    const board = this.validateBoardState(boardState);
    
    // Calculate board size and margins based on image size
    const margin = Math.max(15, width * 0.03); // Reduced margin to 3%, minimum 15px
    const titleSpace = 25; // Reduced title space
    const coordinateSpace = showCoordinates ? 25 : 0; // Reduced coordinate space
    const infoSpace = 0; // No info space needed since we removed game info
    
    const availableSpace = Math.min(
      width - (2 * margin),
      height - (2 * margin) - titleSpace - coordinateSpace - infoSpace
    );
    const boardSize = Math.max(200, availableSpace * 0.95); // Increased to 95% of available space
    
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
    
    // Add title with size-appropriate font (more compact)
    const titleFontSize = Math.max(12, width * 0.025); // Smaller title font
    const titleElement = `<text x="${width / 2}" y="${margin + titleFontSize}" class="board-title" font-size="${titleFontSize}">Chess Game</text>`;
    
    // Create chess board content
    const boardContent = this.drawChessBoard(board, {
      size: boardSize,
      startX,
      startY,
      highlightSquares,
      lastMove
    });
    
    // Add coordinate labels if requested
    const coordinates = showCoordinates ? 
      ImageRenderer.createCoordinateLabels({
        files: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], // Chess-specific files
        ranks: ['8', '7', '6', '5', '4', '3', '2', '1'], // Chess-specific ranks
        boardSize,
        startX,
        startY,
        fontSize: Math.max(16, width * 0.035) // Medium-large coordinate font - good balance for mobile
      }) : '';
    
    // Skip game info to save space
    const infoElements = '';
    
    // Close SVG frame
    const closing = ImageRenderer.closeSVGFrame({ 
      showTimestamp: true, 
      width, 
      height 
    });
    
    return frame + titleElement + boardContent + coordinates + infoElements + closing;
  }

  /**
   * Draw the chess board squares and pieces
   * @param {Array} board - 8x8 board array
   * @param {Object} options - Drawing options
   * @returns {string} - SVG elements for board
   */
  static drawChessBoard(board, options = {}) {
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
        const isLight = (row + col) % 2 === 0;
        const squareColor = isLight ? '#F0D9B5' : '#B58863';
        
        // Check for highlights
        const squareName = this.getSquareName(row, col);
        const isHighlighted = highlightSquares.includes(squareName);
        const isLastMove = lastMove && (lastMove.from === squareName || lastMove.to === squareName);
        
        let fillColor = squareColor;
        if (isLastMove) {
          fillColor = isLight ? '#F7EC74' : '#DAC34A'; // Yellow highlight for last move
        } else if (isHighlighted) {
          fillColor = isLight ? '#F76C6C' : '#E55A5A'; // Red highlight for other highlights
        }

        const strokeWidth = Math.max(0.5, squareSize * 0.015); // Scale stroke with square size
        svg += `<rect x="${x}" y="${y}" width="${squareSize}" height="${squareSize}" fill="${fillColor}" stroke="#8B4513" stroke-width="${strokeWidth}"/>\n  `;
        
        // Draw piece if present
        const piece = board[row][col];
        if (piece) {
          svg += this.drawPiece(piece, x + squareSize/2, y + squareSize/2, squareSize);
        }
      }
    }

    return svg;
  }

  /**
   * Draw a chess piece at specified position
   * @param {string} piece - Piece character (K, Q, R, B, N, P for white, lowercase for black)
   * @param {number} x - Center X position
   * @param {number} y - Center Y position
   * @param {number} size - Square size
   * @returns {string} - SVG element for piece
   */
  static drawPiece(piece, x, y, size) {
    const isWhite = piece === piece.toUpperCase();
    const pieceColor = isWhite ? '#FFFFFF' : '#000000';
    const strokeColor = isWhite ? '#000000' : '#FFFFFF';
    const pieceSize = size * 0.7; // Slightly larger pieces for better visibility
    const strokeWidth = Math.max(0.5, size * 0.015); // Scale stroke with piece size
    
    // Unicode chess symbols
    const pieceSymbols = {
      'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
      'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };
    
    const symbol = pieceSymbols[piece] || piece;
    
    // Adjust Y position slightly to better center the piece visually
    const adjustedY = y + (size * 0.05); // Move down by 5% of square size for better visual centering
    
    return `<text x="${x}" y="${adjustedY}" text-anchor="middle" dominant-baseline="middle" 
              font-family="serif" font-size="${pieceSize}" 
              fill="${pieceColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}">${symbol}</text>\n  `;
  }

  /**
   * Convert row/col to chess square name (e.g., 0,0 -> a8)
   * @param {number} row - Board row (0-7)
   * @param {number} col - Board column (0-7)
   * @returns {string} - Square name (e.g., 'e4')
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
   * Get initial chess board position
   * @returns {Array} - 8x8 array representing initial position
   */
  static getInitialBoard() {
    return [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
  }

  /**
   * Extract game information for display
   * @param {Object} boardState - Board state object
   * @returns {Array<string>} - Array of info lines
   */
  static getGameInfo(boardState) {
    // Return empty array to save space on the board image
    return [];
  }
}

module.exports = ChessRenderer;