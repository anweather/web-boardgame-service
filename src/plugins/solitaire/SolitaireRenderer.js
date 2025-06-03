/**
 * Solitaire Renderer Plugin Module
 * Handles board visualization for Solitaire games
 */
const ImageRenderer = require('../../framework/ImageRenderer');

class SolitaireRenderer {
  /**
   * Generate solitaire board image as PNG buffer
   * @param {Object} boardState - Solitaire board state
   * @param {Object} options - Rendering options
   * @returns {Promise<Buffer>} - PNG image buffer
   */
  static async generateBoardImage(boardState, options = {}) {
    try {
      // Default options for solitaire board
      const defaultOptions = {
        width: 800,
        height: 600,
        density: 200,
        ...options
      };
      
      const svgContent = this.createSolitaireBoardSVG(boardState, defaultOptions);
      return await ImageRenderer.svgToPng(svgContent, defaultOptions);
    } catch (error) {
      console.error('Solitaire board rendering error:', error);
      return await ImageRenderer.createErrorImage('Solitaire Board Error', options);
    }
  }

  /**
   * Render the solitaire board as an image (legacy method for compatibility)
   * @param {Object} boardState - Current board state
   * @param {Array} players - Array of players
   * @param {Object} options - Rendering options
   * @returns {Promise<Buffer>} - Rendered image buffer
   */
  static async renderBoard(boardState, players, options = {}) {
    return this.generateBoardImage(boardState, options);
  }

  /**
   * Create SVG representation of the solitaire board
   */
  static createSolitaireBoardSVG(boardState, options = {}) {
    const width = 800;
    const height = 600;
    const cardWidth = 60;
    const cardHeight = 80;
    
    const { tableau, foundation, stock, waste, score } = boardState;
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#1a5d1a"/>
      
      <!-- Title -->
      <text x="400" y="30" text-anchor="middle" fill="white" font-family="Arial" font-size="24" font-weight="bold">
        Solitaire Game
      </text>
      
      <!-- Score -->
      <text x="400" y="55" text-anchor="middle" fill="yellow" font-family="Arial" font-size="16">
        Score: ${score.points} | Moves: ${boardState.moves.length}
      </text>
    `;

    // Foundation piles (top right)
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const suitSymbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    const suitColors = { hearts: 'red', diamonds: 'red', clubs: 'black', spades: 'black' };
    
    suits.forEach((suit, index) => {
      const x = 450 + index * (cardWidth + 10);
      const y = 80;
      const pile = foundation[suit];
      
      // Foundation pile background
      svg += `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" 
              fill="none" stroke="white" stroke-width="2" stroke-dasharray="5,5" rx="8"/>`;
      
      // Top card or suit symbol
      if (pile.length > 0) {
        const topCard = pile[pile.length - 1];
        svg += `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" 
                fill="white" stroke="black" rx="8"/>`;
        svg += `<text x="${x + cardWidth/2}" y="${y + 25}" text-anchor="middle" 
                fill="${suitColors[suit]}" font-family="Arial" font-size="14" font-weight="bold">
                ${topCard.rank}</text>`;
        svg += `<text x="${x + cardWidth/2}" y="${y + 45}" text-anchor="middle" 
                fill="${suitColors[suit]}" font-family="Arial" font-size="20">
                ${suitSymbols[suit]}</text>`;
        svg += `<text x="${x + cardWidth/2}" y="${y + 70}" text-anchor="middle" 
                fill="gray" font-family="Arial" font-size="10">
                ${pile.length}</text>`;
      } else {
        svg += `<text x="${x + cardWidth/2}" y="${y + cardHeight/2 + 5}" text-anchor="middle" 
                fill="white" font-family="Arial" font-size="24">
                ${suitSymbols[suit]}</text>`;
      }
    });

    // Stock pile (top left)
    const stockX = 50;
    const stockY = 80;
    svg += `<rect x="${stockX}" y="${stockY}" width="${cardWidth}" height="${cardHeight}" 
            fill="${stock.length > 0 ? '#000080' : 'none'}" 
            stroke="white" stroke-width="2" ${stock.length === 0 ? 'stroke-dasharray="5,5"' : ''} rx="8"/>`;
    
    if (stock.length > 0) {
      svg += `<text x="${stockX + cardWidth/2}" y="${stockY + cardHeight/2}" text-anchor="middle" 
              fill="white" font-family="Arial" font-size="12">STOCK</text>`;
      svg += `<text x="${stockX + cardWidth/2}" y="${stockY + cardHeight/2 + 15}" text-anchor="middle" 
              fill="white" font-family="Arial" font-size="10">${stock.length}</text>`;
    }

    // Waste pile (next to stock)
    const wasteX = stockX + cardWidth + 20;
    const wasteY = stockY;
    svg += `<rect x="${wasteX}" y="${wasteY}" width="${cardWidth}" height="${cardHeight}" 
            fill="none" stroke="white" stroke-width="2" stroke-dasharray="5,5" rx="8"/>`;
    
    if (waste.length > 0) {
      const topCard = waste[waste.length - 1];
      const color = (topCard.suit === 'hearts' || topCard.suit === 'diamonds') ? 'red' : 'black';
      svg += `<rect x="${wasteX}" y="${wasteY}" width="${cardWidth}" height="${cardHeight}" 
              fill="white" stroke="black" rx="8"/>`;
      svg += `<text x="${wasteX + cardWidth/2}" y="${wasteY + 25}" text-anchor="middle" 
              fill="${color}" font-family="Arial" font-size="14" font-weight="bold">
              ${topCard.rank}</text>`;
      svg += `<text x="${wasteX + cardWidth/2}" y="${wasteY + 45}" text-anchor="middle" 
              fill="${color}" font-family="Arial" font-size="20">
              ${suitSymbols[topCard.suit]}</text>`;
    }

    // Tableau columns
    const tableauStartY = 200;
    tableau.forEach((column, colIndex) => {
      const x = 50 + colIndex * (cardWidth + 15);
      
      // Column background
      svg += `<rect x="${x}" y="${tableauStartY}" width="${cardWidth}" height="${cardHeight + 100}" 
              fill="none" stroke="white" stroke-width="1" stroke-dasharray="3,3" rx="8"/>`;
      
      // Cards in column
      column.forEach((card, cardIndex) => {
        const y = tableauStartY + cardIndex * 25;
        
        if (card.faceUp) {
          const color = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
          svg += `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" 
                  fill="white" stroke="black" rx="6"/>`;
          svg += `<text x="${x + cardWidth/2}" y="${y + 20}" text-anchor="middle" 
                  fill="${color}" font-family="Arial" font-size="11" font-weight="bold">
                  ${card.rank}</text>`;
          svg += `<text x="${x + cardWidth/2}" y="${y + 35}" text-anchor="middle" 
                  fill="${color}" font-family="Arial" font-size="16">
                  ${suitSymbols[card.suit]}</text>`;
        } else {
          // Face down card
          svg += `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" 
                  fill="#000080" stroke="black" rx="6"/>`;
          svg += `<rect x="${x + 5}" y="${y + 5}" width="${cardWidth - 10}" height="${cardHeight - 10}" 
                  fill="none" stroke="white" stroke-width="1" rx="4"/>`;
        }
      });
      
      // Column number
      svg += `<text x="${x + cardWidth/2}" y="${tableauStartY - 10}" text-anchor="middle" 
              fill="white" font-family="Arial" font-size="12">
              ${colIndex + 1}</text>`;
    });

    // Game status
    const gameComplete = this.isGameComplete(boardState);
    if (gameComplete) {
      svg += `<text x="400" y="550" text-anchor="middle" fill="gold" 
              font-family="Arial" font-size="20" font-weight="bold">
              🎉 GAME COMPLETE! 🎉</text>`;
    }

    svg += '</svg>';
    return svg;
  }

  /**
   * Check if game is complete
   */
  static isGameComplete(boardState) {
    const { foundation } = boardState;
    return ['hearts', 'diamonds', 'clubs', 'spades'].every(suit => 
      foundation[suit].length === 13
    );
  }

  /**
   * Get display name for this renderer
   */
  static getDisplayName() {
    return 'Solitaire Board Renderer';
  }

  /**
   * Get supported rendering formats
   */
  static getSupportedFormats() {
    return ['svg', 'png'];
  }
}

module.exports = SolitaireRenderer;