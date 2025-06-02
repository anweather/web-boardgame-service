/**
 * CardRenderer - Card visualization and rendering system
 * Integrates with existing ImageRenderer framework for card-based games
 */

const ImageRenderer = require('../ImageRenderer');

class CardRenderer {
  /**
   * Standard card dimensions (poker card ratio: 2.5:3.5)
   */
  static CARD_WIDTH = 60;
  static CARD_HEIGHT = 84;
  static CARD_CORNER_RADIUS = 6;
  
  /**
   * Color schemes for card rendering
   */
  static COLORS = {
    hearts: '#dc143c',
    diamonds: '#dc143c', 
    clubs: '#000000',
    spades: '#000000',
    joker: '#8b008b',
    cardBack: '#1e3a8a',
    cardFace: '#ffffff',
    cardBorder: '#cccccc'
  };

  /**
   * Card suit symbols (Unicode)
   */
  static SUIT_SYMBOLS = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
    joker: '🃏'
  };

  /**
   * Render a single card as SVG
   * @param {Object} card - Card object from CardUtils
   * @param {Object} options - Rendering options
   * @returns {string} SVG content for the card
   */
  static renderCard(card, options = {}) {
    const {
      x = 0,
      y = 0,
      width = this.CARD_WIDTH,
      height = this.CARD_HEIGHT,
      faceUp = true,
      selected = false,
      highlighted = false,
      shadowOpacity = 0.3
    } = options;

    if (!faceUp) {
      return this.renderCardBack(x, y, width, height, { selected, highlighted, shadowOpacity });
    }

    if (!card || !card.suit || !card.rank) {
      return this.renderErrorCard(x, y, width, height, 'Invalid Card');
    }

    if (card.isJoker) {
      return this.renderJokerCard(card, x, y, width, height, { selected, highlighted, shadowOpacity });
    }

    return this.renderStandardCard(card, x, y, width, height, { selected, highlighted, shadowOpacity });
  }

  /**
   * Render a standard playing card (non-joker)
   * @param {Object} card - Card object
   * @param {number} x - X position
   * @param {number} y - Y position  
   * @param {number} width - Card width
   * @param {number} height - Card height
   * @param {Object} options - Style options
   * @returns {string} SVG content
   */
  static renderStandardCard(card, x, y, width, height, options = {}) {
    const {
      selected = false,
      highlighted = false,
      shadowOpacity = 0.3
    } = options;

    const suitColor = this.COLORS[card.suit];
    const suitSymbol = this.SUIT_SYMBOLS[card.suit];
    const rankDisplay = this.getRankDisplay(card.rank);
    
    // Calculate font sizes based on card size
    const largeFontSize = Math.max(12, width * 0.25);
    const smallFontSize = Math.max(8, width * 0.15);
    
    // Card styling
    const borderColor = selected ? '#ffd700' : (highlighted ? '#87ceeb' : this.COLORS.cardBorder);
    const borderWidth = selected ? 3 : (highlighted ? 2 : 1);
    const shadowFilter = shadowOpacity > 0 ? `filter="url(#cardShadow)"` : '';

    return `
  <!-- Card Shadow -->
  <defs>
    <filter id="cardShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="2" dy="2" stdDeviation="2" flood-opacity="${shadowOpacity}"/>
    </filter>
  </defs>
  
  <!-- Card Background -->
  <rect x="${x}" y="${y}" width="${width}" height="${height}" 
        rx="${this.CARD_CORNER_RADIUS}" ry="${this.CARD_CORNER_RADIUS}" 
        fill="${this.COLORS.cardFace}" 
        stroke="${borderColor}" 
        stroke-width="${borderWidth}"
        ${shadowFilter}/>
  
  <!-- Top-left rank and suit -->
  <text x="${x + width * 0.1}" y="${y + height * 0.2}" 
        font-family="Arial, sans-serif" 
        font-size="${smallFontSize}" 
        font-weight="bold" 
        fill="${suitColor}" 
        text-anchor="start">${rankDisplay}</text>
  <text x="${x + width * 0.1}" y="${y + height * 0.35}" 
        font-family="Arial, sans-serif" 
        font-size="${smallFontSize}" 
        fill="${suitColor}" 
        text-anchor="start">${suitSymbol}</text>
  
  <!-- Center suit symbol -->
  <text x="${x + width * 0.5}" y="${y + height * 0.6}" 
        font-family="Arial, sans-serif" 
        font-size="${largeFontSize}" 
        fill="${suitColor}" 
        text-anchor="middle" 
        dominant-baseline="middle">${suitSymbol}</text>
  
  <!-- Bottom-right rank and suit (rotated) -->
  <g transform="rotate(180, ${x + width * 0.9}, ${y + height * 0.8})">
    <text x="${x + width * 0.9}" y="${y + height * 0.8}" 
          font-family="Arial, sans-serif" 
          font-size="${smallFontSize}" 
          font-weight="bold" 
          fill="${suitColor}" 
          text-anchor="start">${rankDisplay}</text>
    <text x="${x + width * 0.9}" y="${y + height * 0.95}" 
          font-family="Arial, sans-serif" 
          font-size="${smallFontSize}" 
          fill="${suitColor}" 
          text-anchor="start">${suitSymbol}</text>
  </g>`;
  }

  /**
   * Render a joker card
   * @param {Object} card - Joker card object
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Card width
   * @param {number} height - Card height
   * @param {Object} options - Style options
   * @returns {string} SVG content
   */
  static renderJokerCard(card, x, y, width, height, options = {}) {
    const {
      selected = false,
      highlighted = false,
      shadowOpacity = 0.3
    } = options;

    const borderColor = selected ? '#ffd700' : (highlighted ? '#87ceeb' : this.COLORS.cardBorder);
    const borderWidth = selected ? 3 : (highlighted ? 2 : 1);
    const shadowFilter = shadowOpacity > 0 ? `filter="url(#cardShadow)"` : '';
    const fontSize = Math.max(10, width * 0.2);

    return `
  <!-- Card Shadow -->
  <defs>
    <filter id="cardShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="2" dy="2" stdDeviation="2" flood-opacity="${shadowOpacity}"/>
    </filter>
  </defs>
  
  <!-- Card Background -->
  <rect x="${x}" y="${y}" width="${width}" height="${height}" 
        rx="${this.CARD_CORNER_RADIUS}" ry="${this.CARD_CORNER_RADIUS}" 
        fill="${this.COLORS.cardFace}" 
        stroke="${borderColor}" 
        stroke-width="${borderWidth}"
        ${shadowFilter}/>
  
  <!-- Joker Text -->
  <text x="${x + width * 0.5}" y="${y + height * 0.3}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold" 
        fill="${this.COLORS.joker}" 
        text-anchor="middle">JOKER</text>
  
  <!-- Joker Symbol -->
  <text x="${x + width * 0.5}" y="${y + height * 0.7}" 
        font-family="Arial, sans-serif" 
        font-size="${Math.max(20, width * 0.4)}" 
        fill="${this.COLORS.joker}" 
        text-anchor="middle" 
        dominant-baseline="middle">${this.SUIT_SYMBOLS.joker}</text>`;
  }

  /**
   * Render the back of a card
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Card width
   * @param {number} height - Card height
   * @param {Object} options - Style options
   * @returns {string} SVG content
   */
  static renderCardBack(x, y, width, height, options = {}) {
    const {
      selected = false,
      highlighted = false,
      shadowOpacity = 0.3
    } = options;

    const borderColor = selected ? '#ffd700' : (highlighted ? '#87ceeb' : this.COLORS.cardBorder);
    const borderWidth = selected ? 3 : (highlighted ? 2 : 1);
    const shadowFilter = shadowOpacity > 0 ? `filter="url(#cardShadow)"` : '';

    return `
  <!-- Card Shadow -->
  <defs>
    <filter id="cardShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="2" dy="2" stdDeviation="2" flood-opacity="${shadowOpacity}"/>
    </filter>
  </defs>
  
  <!-- Card Background -->
  <rect x="${x}" y="${y}" width="${width}" height="${height}" 
        rx="${this.CARD_CORNER_RADIUS}" ry="${this.CARD_CORNER_RADIUS}" 
        fill="${this.COLORS.cardBack}" 
        stroke="${borderColor}" 
        stroke-width="${borderWidth}"
        ${shadowFilter}/>
  
  <!-- Card Back Pattern -->
  <rect x="${x + width * 0.1}" y="${y + height * 0.1}" 
        width="${width * 0.8}" height="${height * 0.8}" 
        rx="${this.CARD_CORNER_RADIUS * 0.5}" ry="${this.CARD_CORNER_RADIUS * 0.5}" 
        fill="none" 
        stroke="${this.COLORS.cardFace}" 
        stroke-width="1" 
        opacity="0.6"/>
  
  <!-- Decorative Lines -->
  <line x1="${x + width * 0.2}" y1="${y + height * 0.3}" 
        x2="${x + width * 0.8}" y2="${y + height * 0.3}" 
        stroke="${this.COLORS.cardFace}" 
        stroke-width="1" 
        opacity="0.4"/>
  <line x1="${x + width * 0.2}" y1="${y + height * 0.7}" 
        x2="${x + width * 0.8}" y2="${y + height * 0.7}" 
        stroke="${this.COLORS.cardFace}" 
        stroke-width="1" 
        opacity="0.4"/>`;
  }

  /**
   * Render an error card placeholder
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Card width
   * @param {number} height - Card height
   * @param {string} errorMessage - Error message to display
   * @returns {string} SVG content
   */
  static renderErrorCard(x, y, width, height, errorMessage = 'Error') {
    const fontSize = Math.max(8, width * 0.15);

    return `
  <!-- Error Card Background -->
  <rect x="${x}" y="${y}" width="${width}" height="${height}" 
        rx="${this.CARD_CORNER_RADIUS}" ry="${this.CARD_CORNER_RADIUS}" 
        fill="#ffebee" 
        stroke="#f44336" 
        stroke-width="2"/>
  
  <!-- Error Message -->
  <text x="${x + width * 0.5}" y="${y + height * 0.5}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        fill="#f44336" 
        text-anchor="middle" 
        dominant-baseline="middle">${errorMessage}</text>`;
  }

  /**
   * Render a hand of cards
   * @param {Object[]} cards - Array of card objects
   * @param {Object} options - Rendering options
   * @returns {string} SVG content for the hand
   */
  static renderHand(cards, options = {}) {
    const {
      x = 0,
      y = 0,
      layout = 'fan', // 'fan', 'grid', 'row'
      cardWidth = this.CARD_WIDTH,
      cardHeight = this.CARD_HEIGHT,
      spacing = 20,
      maxCards = 10,
      faceUp = true,
      selectedIndices = [],
      highlightedIndices = []
    } = options;

    if (!cards || cards.length === 0) {
      return '<!-- Empty hand -->';
    }

    const displayCards = cards.slice(0, maxCards);
    let handSvg = '<!-- Hand of Cards -->\n';

    switch (layout) {
      case 'fan':
        handSvg += this.renderHandFan(displayCards, x, y, cardWidth, cardHeight, {
          faceUp, selectedIndices, highlightedIndices
        });
        break;
      case 'grid':
        handSvg += this.renderHandGrid(displayCards, x, y, cardWidth, cardHeight, {
          spacing, faceUp, selectedIndices, highlightedIndices
        });
        break;
      case 'row':
      default:
        handSvg += this.renderHandRow(displayCards, x, y, cardWidth, cardHeight, {
          spacing, faceUp, selectedIndices, highlightedIndices
        });
        break;
    }

    return handSvg;
  }

  /**
   * Render cards in a row layout
   * @param {Object[]} cards - Cards to render
   * @param {number} x - Starting X position
   * @param {number} y - Y position
   * @param {number} cardWidth - Card width
   * @param {number} cardHeight - Card height
   * @param {Object} options - Layout options
   * @returns {string} SVG content
   */
  static renderHandRow(cards, x, y, cardWidth, cardHeight, options = {}) {
    const { spacing = 20, faceUp = true, selectedIndices = [], highlightedIndices = [] } = options;
    
    return cards.map((card, index) => {
      const cardX = x + (index * spacing);
      const isSelected = selectedIndices.includes(index);
      const isHighlighted = highlightedIndices.includes(index);
      
      return this.renderCard(card, {
        x: cardX,
        y,
        width: cardWidth,
        height: cardHeight,
        faceUp,
        selected: isSelected,
        highlighted: isHighlighted
      });
    }).join('\n');
  }

  /**
   * Render cards in a grid layout
   * @param {Object[]} cards - Cards to render
   * @param {number} x - Starting X position
   * @param {number} y - Starting Y position
   * @param {number} cardWidth - Card width
   * @param {number} cardHeight - Card height
   * @param {Object} options - Layout options
   * @returns {string} SVG content
   */
  static renderHandGrid(cards, x, y, cardWidth, cardHeight, options = {}) {
    const { 
      spacing = 10, 
      faceUp = true, 
      selectedIndices = [], 
      highlightedIndices = [],
      cardsPerRow = 5
    } = options;
    
    return cards.map((card, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const cardX = x + (col * (cardWidth + spacing));
      const cardY = y + (row * (cardHeight + spacing));
      const isSelected = selectedIndices.includes(index);
      const isHighlighted = highlightedIndices.includes(index);
      
      return this.renderCard(card, {
        x: cardX,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
        faceUp,
        selected: isSelected,
        highlighted: isHighlighted
      });
    }).join('\n');
  }

  /**
   * Render cards in a fan layout
   * @param {Object[]} cards - Cards to render
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   * @param {number} cardWidth - Card width
   * @param {number} cardHeight - Card height
   * @param {Object} options - Layout options
   * @returns {string} SVG content
   */
  static renderHandFan(cards, centerX, centerY, cardWidth, cardHeight, options = {}) {
    const { faceUp = true, selectedIndices = [], highlightedIndices = [] } = options;
    
    const maxAngle = Math.min(60, cards.length * 8); // Max 60 degrees spread
    const angleStep = cards.length > 1 ? maxAngle / (cards.length - 1) : 0;
    const startAngle = -maxAngle / 2;
    const radius = Math.max(cardHeight * 0.8, 50);
    
    return cards.map((card, index) => {
      const angle = startAngle + (index * angleStep);
      const angleRad = (angle * Math.PI) / 180;
      
      const cardX = centerX + Math.sin(angleRad) * radius - cardWidth / 2;
      const cardY = centerY - Math.cos(angleRad) * radius - cardHeight / 2;
      const isSelected = selectedIndices.includes(index);
      const isHighlighted = highlightedIndices.includes(index);
      
      return `
  <g transform="rotate(${angle}, ${cardX + cardWidth/2}, ${cardY + cardHeight/2})">
    ${this.renderCard(card, {
      x: cardX,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      faceUp,
      selected: isSelected,
      highlighted: isHighlighted
    })}
  </g>`;
    }).join('\n');
  }

  /**
   * Render a deck pile (stack of face-down cards)
   * @param {number} cardCount - Number of cards in deck
   * @param {Object} options - Rendering options
   * @returns {string} SVG content for deck pile
   */
  static renderDeckPile(cardCount, options = {}) {
    const {
      x = 0,
      y = 0,
      cardWidth = this.CARD_WIDTH,
      cardHeight = this.CARD_HEIGHT,
      maxStackHeight = 5,
      offsetStep = 2
    } = options;

    if (cardCount <= 0) {
      return this.renderEmptyDeckSlot(x, y, cardWidth, cardHeight);
    }

    const stackLayers = Math.min(maxStackHeight, Math.max(1, Math.floor(cardCount / 10) + 1));
    let deckSvg = '<!-- Deck Pile -->\n';

    for (let i = 0; i < stackLayers; i++) {
      const layerX = x + (i * offsetStep);
      const layerY = y - (i * offsetStep);
      
      deckSvg += this.renderCardBack(layerX, layerY, cardWidth, cardHeight, {
        shadowOpacity: i === 0 ? 0.3 : 0.1
      });
    }

    // Add card count label
    const labelX = x + cardWidth / 2;
    const labelY = y + cardHeight + 15;
    deckSvg += `
  <text x="${labelX}" y="${labelY}" 
        font-family="Arial, sans-serif" 
        font-size="10" 
        fill="#666" 
        text-anchor="middle">${cardCount}</text>`;

    return deckSvg;
  }

  /**
   * Render an empty deck slot
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Slot width
   * @param {number} height - Slot height
   * @returns {string} SVG content
   */
  static renderEmptyDeckSlot(x, y, width, height) {
    return `
  <!-- Empty Deck Slot -->
  <rect x="${x}" y="${y}" width="${width}" height="${height}" 
        rx="${this.CARD_CORNER_RADIUS}" ry="${this.CARD_CORNER_RADIUS}" 
        fill="none" 
        stroke="#cccccc" 
        stroke-width="2" 
        stroke-dasharray="5,5" 
        opacity="0.5"/>
  <text x="${x + width / 2}" y="${y + height / 2}" 
        font-family="Arial, sans-serif" 
        font-size="10" 
        fill="#999" 
        text-anchor="middle" 
        dominant-baseline="middle">EMPTY</text>`;
  }

  /**
   * Get display text for card rank
   * @param {string} rank - Card rank
   * @returns {string} Display text
   */
  static getRankDisplay(rank) {
    const rankMap = {
      'Ace': 'A',
      'Two': '2',
      'Three': '3',
      'Four': '4',
      'Five': '5',
      'Six': '6',
      'Seven': '7',
      'Eight': '8',
      'Nine': '9',
      'Ten': '10',
      'Jack': 'J',
      'Queen': 'Q',
      'King': 'K'
    };
    return rankMap[rank] || rank;
  }

  /**
   * Calculate total dimensions needed for a hand layout
   * @param {number} cardCount - Number of cards
   * @param {Object} options - Layout options
   * @returns {Object} Dimensions {width, height}
   */
  static calculateHandDimensions(cardCount, options = {}) {
    const {
      layout = 'row',
      cardWidth = this.CARD_WIDTH,
      cardHeight = this.CARD_HEIGHT,
      spacing = 20,
      cardsPerRow = 5
    } = options;

    switch (layout) {
      case 'grid':
        const rows = Math.ceil(cardCount / cardsPerRow);
        const cols = Math.min(cardCount, cardsPerRow);
        return {
          width: cols * cardWidth + (cols - 1) * spacing,
          height: rows * cardHeight + (rows - 1) * spacing
        };
      
      case 'fan':
        const fanRadius = Math.max(cardHeight * 0.8, 50);
        return {
          width: cardWidth + fanRadius * 2,
          height: cardHeight + fanRadius * 2
        };
      
      case 'row':
      default:
        return {
          width: cardCount * spacing + cardWidth,
          height: cardHeight
        };
    }
  }
}

module.exports = CardRenderer;