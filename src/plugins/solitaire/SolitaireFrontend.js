/**
 * Solitaire Frontend Plugin Module
 * Handles solitaire-specific frontend logic: move parsing, formatting, and UI helpers
 */
class SolitaireFrontend {
  /**
   * Parse solitaire move from user input
   * Supports various solitaire move formats and drag-and-drop interactions
   * @param {string|Object} moveInput - Raw user input or drag-drop data
   * @returns {Object} - Normalized move object for backend processing
   */
  static parseMove(moveInput) {
    if (!moveInput) {
      throw new Error('Invalid move input');
    }

    // Handle drag-and-drop object format
    if (typeof moveInput === 'object' && !Array.isArray(moveInput)) {
      return this.parseDragDropMove(moveInput);
    }

    // Handle text input format
    if (typeof moveInput === 'string') {
      return this.parseTextMove(moveInput);
    }

    throw new Error('Unsupported move input format');
  }

  /**
   * Parse text-based move input
   * Supports formats like:
   * - "draw" or "draw stock" - Draw from stock pile
   * - "reset" or "reset stock" - Reset stock from waste
   * - "waste to foundation hearts" - Move from waste to foundation
   * - "tableau1 to tableau2" - Move between tableau columns
   * - "flip tableau3" - Flip card in tableau column
   * - "waste to tableau4 x3" - Move multiple cards
   * @param {string} moveText - Text move input
   * @returns {Object} - Parsed move object
   */
  static parseTextMove(moveText) {
    const cleanMove = moveText.trim().toLowerCase();

    // Stock operations
    if (cleanMove === 'draw' || cleanMove === 'draw stock') {
      return { action: 'draw_stock' };
    }

    if (cleanMove === 'reset' || cleanMove === 'reset stock') {
      return { action: 'reset_stock' };
    }

    // Flip card operations
    let match = cleanMove.match(/^flip\s+tableau\s*(\d+)$/);
    if (match) {
      const column = parseInt(match[1]) - 1; // Convert to 0-based index
      if (column < 0 || column > 6) {
        throw new Error('Invalid tableau column (must be 1-7)');
      }
      return {
        action: 'flip_card',
        from: { type: 'tableau', column }
      };
    }

    // Card move operations
    // Format: "waste to foundation hearts"
    match = cleanMove.match(/^waste\s+to\s+foundation\s+(hearts?|diamonds?|clubs?|spades?)$/);
    if (match) {
      const suit = this.normalizeSuit(match[1]);
      return {
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'foundation', suit },
        cardCount: 1
      };
    }

    // Format: "foundation hearts to tableau3"
    match = cleanMove.match(/^foundation\s+(hearts?|diamonds?|clubs?|spades?)\s+to\s+tableau\s*(\d+)$/);
    if (match) {
      const suit = this.normalizeSuit(match[1]);
      const column = parseInt(match[2]) - 1;
      if (column < 0 || column > 6) {
        throw new Error('Invalid tableau column (must be 1-7)');
      }
      return {
        action: 'move_card',
        from: { type: 'foundation', suit },
        to: { type: 'tableau', column },
        cardCount: 1
      };
    }

    // Format: "tableau1 to tableau2" or "tableau1 to tableau2 x3"
    match = cleanMove.match(/^tableau\s*(\d+)\s+to\s+tableau\s*(\d+)(?:\s+x(\d+))?$/);
    if (match) {
      const fromColumn = parseInt(match[1]) - 1;
      const toColumn = parseInt(match[2]) - 1;
      const cardCount = match[3] ? parseInt(match[3]) : 1;

      if (fromColumn < 0 || fromColumn > 6 || toColumn < 0 || toColumn > 6) {
        throw new Error('Invalid tableau column (must be 1-7)');
      }

      return {
        action: 'move_card',
        from: { type: 'tableau', column: fromColumn },
        to: { type: 'tableau', column: toColumn },
        cardCount
      };
    }

    // Format: "tableau3 to foundation spades"
    match = cleanMove.match(/^tableau\s*(\d+)\s+to\s+foundation\s+(hearts?|diamonds?|clubs?|spades?)$/);
    if (match) {
      const column = parseInt(match[1]) - 1;
      const suit = this.normalizeSuit(match[2]);
      
      if (column < 0 || column > 6) {
        throw new Error('Invalid tableau column (must be 1-7)');
      }

      return {
        action: 'move_card',
        from: { type: 'tableau', column },
        to: { type: 'foundation', suit },
        cardCount: 1
      };
    }

    // Format: "waste to tableau5"
    match = cleanMove.match(/^waste\s+to\s+tableau\s*(\d+)$/);
    if (match) {
      const column = parseInt(match[1]) - 1;
      if (column < 0 || column > 6) {
        throw new Error('Invalid tableau column (must be 1-7)');
      }
      return {
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'tableau', column },
        cardCount: 1
      };
    }

    throw new Error(`Unrecognized move format: "${moveText}"`);
  }

  /**
   * Parse drag-and-drop move input
   * @param {Object} dragDropData - Drag and drop event data
   * @returns {Object} - Parsed move object
   */
  static parseDragDropMove(dragDropData) {
    const { source, target, cardCount = 1 } = dragDropData;

    if (!source) {
      throw new Error('Drag-and-drop requires both source and target');
    }

    // Special handling for stock pile interactions (no target needed)
    if (source.type === 'stock' && !target) {
      return { action: 'draw_stock' };
    }

    // Card flipping (double-click or special gesture, no target needed)
    if (source.type === 'tableau' && !target && dragDropData.action === 'flip') {
      return {
        action: 'flip_card',
        from: source
      };
    }

    // For all other operations, we need a target
    if (!target) {
      throw new Error('Invalid drag-and-drop operation');
    }

    if (source.type === 'waste' && target.type === 'stock') {
      return { action: 'reset_stock' };
    }

    // Card movement
    if (source.type && target.type) {
      return {
        action: 'move_card',
        from: source,
        to: target,
        cardCount
      };
    }

    throw new Error('Invalid drag-and-drop operation');
  }

  /**
   * Format move data for display in move history
   * @param {Object} moveData - Move data from backend
   * @returns {string} - Formatted move text for display
   */
  static formatMove(moveData) {
    if (!moveData || typeof moveData !== 'object') {
      return 'Unknown move';
    }

    const { action, from, to, cardCount = 1 } = moveData;

    switch (action) {
      case 'draw_stock':
        return 'Draw from stock';

      case 'reset_stock':
        return 'Reset stock pile';

      case 'flip_card':
        return `Flip card in tableau ${(from.column || 0) + 1}`;

      case 'move_card': {
        const fromText = this.formatLocation(from);
        const toText = this.formatLocation(to);
        const countText = cardCount > 1 ? ` (${cardCount} cards)` : '';
        return `${fromText} → ${toText}${countText}`;
      }

      default:
        return `${action}${from ? ` from ${this.formatLocation(from)}` : ''}${to ? ` to ${this.formatLocation(to)}` : ''}`;
    }
  }

  /**
   * Format location for display
   * @param {Object} location - Location object
   * @returns {string} - Formatted location text
   */
  static formatLocation(location) {
    if (!location || !location.type) {
      return 'unknown';
    }

    switch (location.type) {
      case 'waste':
        return 'Waste pile';

      case 'stock':
        return 'Stock pile';

      case 'foundation':
        return `${this.capitalizeSuit(location.suit)} foundation`;

      case 'tableau':
        return `Tableau ${(location.column || 0) + 1}`;

      default:
        return location.type;
    }
  }

  /**
   * Create game state visualization helpers
   * @param {Object} gameState - Current game state from backend
   * @returns {Object} - UI helper data
   */
  static createVisualizationHelpers(gameState) {
    if (!gameState) {
      return { error: 'Invalid game state' };
    }

    const { tableau, foundation, stock, waste, score, moves } = gameState;

    return {
      // Card counts for display
      cardCounts: {
        stock: stock ? stock.length : 0,
        waste: waste ? waste.length : 0,
        foundation: {
          hearts: foundation?.hearts?.length || 0,
          diamonds: foundation?.diamonds?.length || 0,
          clubs: foundation?.clubs?.length || 0,
          spades: foundation?.spades?.length || 0
        },
        tableau: tableau ? tableau.map(column => column.length) : [0, 0, 0, 0, 0, 0, 0]
      },

      // Top cards for display
      topCards: {
        waste: waste && waste.length > 0 ? waste[waste.length - 1] : null,
        foundation: {
          hearts: foundation?.hearts?.length > 0 ? foundation.hearts[foundation.hearts.length - 1] : null,
          diamonds: foundation?.diamonds?.length > 0 ? foundation.diamonds[foundation.diamonds.length - 1] : null,
          clubs: foundation?.clubs?.length > 0 ? foundation.clubs[foundation.clubs.length - 1] : null,
          spades: foundation?.spades?.length > 0 ? foundation.spades[foundation.spades.length - 1] : null
        },
        tableau: tableau ? tableau.map(column => 
          column.length > 0 ? column[column.length - 1] : null
        ) : new Array(7).fill(null)
      },

      // Available moves hints
      availableMoves: this.generateMoveHints(gameState),

      // Game progress
      progress: {
        score: score?.points || 0,
        moves: moves?.length || 0,
        timeElapsed: score?.timeElapsed || 0,
        foundationProgress: {
          hearts: (foundation?.hearts?.length || 0) / 13,
          diamonds: (foundation?.diamonds?.length || 0) / 13,
          clubs: (foundation?.clubs?.length || 0) / 13,
          spades: (foundation?.spades?.length || 0) / 13
        },
        totalProgress: (
          (foundation?.hearts?.length || 0) +
          (foundation?.diamonds?.length || 0) +
          (foundation?.clubs?.length || 0) +
          (foundation?.spades?.length || 0)
        ) / 52
      },

      // UI state helpers
      canDrawStock: stock ? stock.length > 0 : false,
      canResetStock: (stock ? stock.length === 0 : true) && (waste ? waste.length > 0 : false),
      gameComplete: this.checkGameComplete(foundation),
      
      // Drag and drop helpers
      dragDropZones: this.createDragDropZones(gameState)
    };
  }

  /**
   * Generate move hints for the current game state
   * @param {Object} gameState - Current game state
   * @returns {Array} - Array of possible move hints
   */
  static generateMoveHints(gameState) {
    const hints = [];
    const { tableau, foundation, stock, waste } = gameState;

    // Stock operations
    if (stock && stock.length > 0) {
      hints.push({ action: 'draw_stock', description: 'Draw from stock pile' });
    }

    if (stock && stock.length === 0 && waste && waste.length > 0) {
      hints.push({ action: 'reset_stock', description: 'Reset stock pile' });
    }

    // Waste to foundation moves
    if (waste && waste.length > 0) {
      const topWasteCard = waste[waste.length - 1];
      if (topWasteCard && this.canMoveToFoundation(topWasteCard, foundation)) {
        hints.push({
          action: 'move_card',
          from: { type: 'waste' },
          to: { type: 'foundation', suit: topWasteCard.suit },
          description: `Move ${this.formatCard(topWasteCard)} to foundation`
        });
      }
    }

    // Add more hint generation logic as needed
    return hints.slice(0, 5); // Limit to top 5 hints
  }

  /**
   * Create drag and drop zone configurations
   * @param {Object} gameState - Current game state
   * @returns {Object} - Drag drop zone configurations
   */
  static createDragDropZones(gameState) {
    return {
      sources: [
        { type: 'waste', enabled: gameState.waste && gameState.waste.length > 0 },
        { type: 'stock', enabled: gameState.stock && gameState.stock.length > 0 },
        ...Array.from({ length: 7 }, (_, i) => ({
          type: 'tableau',
          column: i,
          enabled: gameState.tableau && gameState.tableau[i] && gameState.tableau[i].length > 0
        })),
        ...['hearts', 'diamonds', 'clubs', 'spades'].map(suit => ({
          type: 'foundation',
          suit,
          enabled: gameState.foundation && gameState.foundation[suit] && gameState.foundation[suit].length > 0
        }))
      ],
      targets: [
        ...Array.from({ length: 7 }, (_, i) => ({
          type: 'tableau',
          column: i,
          accepts: ['waste', 'tableau', 'foundation']
        })),
        ...['hearts', 'diamonds', 'clubs', 'spades'].map(suit => ({
          type: 'foundation',
          suit,
          accepts: ['waste', 'tableau']
        }))
      ]
    };
  }

  /**
   * Format move history for display
   * @param {Array} moves - Array of move objects
   * @returns {Array} - Formatted move history
   */
  static formatMoveHistory(moves) {
    if (!Array.isArray(moves)) {
      return [];
    }

    return moves.map((move, index) => ({
      moveNumber: index + 1,
      timestamp: move.timestamp ? new Date(move.timestamp).toLocaleTimeString() : '',
      description: this.formatMove(move),
      score: move.scoreChange || 0,
      rawMove: move
    }));
  }

  // Helper methods

  /**
   * Normalize suit name
   * @param {string} suit - Suit name (may include 's' suffix)
   * @returns {string} - Normalized suit name
   */
  static normalizeSuit(suit) {
    const normalized = suit.toLowerCase().replace(/s$/, ''); // Remove trailing 's'
    const suitMap = {
      'heart': 'hearts',
      'diamond': 'diamonds', 
      'club': 'clubs',
      'spade': 'spades'
    };
    return suitMap[normalized] || normalized;
  }

  /**
   * Capitalize suit name
   * @param {string} suit - Suit name
   * @returns {string} - Capitalized suit name
   */
  static capitalizeSuit(suit) {
    return suit ? suit.charAt(0).toUpperCase() + suit.slice(1) : '';
  }

  /**
   * Format card for display
   * @param {Object} card - Card object
   * @returns {string} - Formatted card string
   */
  static formatCard(card) {
    if (!card || !card.rank || !card.suit) {
      return 'Unknown card';
    }
    return `${card.rank} of ${this.capitalizeSuit(card.suit)}`;
  }

  /**
   * Check if a card can move to foundation
   * @param {Object} card - Card to check
   * @param {Object} foundation - Foundation piles
   * @returns {boolean} - Whether move is valid
   */
  static canMoveToFoundation(card, foundation) {
    if (!card || !foundation) return false;
    
    const pile = foundation[card.suit];
    if (!pile) return false;
    
    if (pile.length === 0) {
      return card.rank === 'Ace';
    }
    
    const topCard = pile[pile.length - 1];
    const ranks = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 
                   'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King'];
    const currentIndex = ranks.indexOf(topCard.rank);
    const cardIndex = ranks.indexOf(card.rank);
    
    return cardIndex === currentIndex + 1;
  }

  /**
   * Check if game is complete
   * @param {Object} foundation - Foundation piles
   * @returns {boolean} - Whether game is complete
   */
  static checkGameComplete(foundation) {
    if (!foundation) return false;
    
    return ['hearts', 'diamonds', 'clubs', 'spades'].every(suit => 
      foundation[suit] && foundation[suit].length === 13
    );
  }

  /**
   * Create drag and drop event handlers
   * @returns {Object} - Event handler functions
   */
  static createDragDropHandlers() {
    return {
      onDragStart: (element, sourceData) => {
        element.classList.add('dragging');
        element.setAttribute('data-source', JSON.stringify(sourceData));
      },

      onDragEnd: (element) => {
        element.classList.remove('dragging');
        element.removeAttribute('data-source');
      },

      onDragOver: (event, targetData) => {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
      },

      onDragLeave: (event) => {
        event.currentTarget.classList.remove('drag-over');
      },

      onDrop: (event, targetData, onMove) => {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        const sourceData = JSON.parse(event.dataTransfer.getData('text/plain') || '{}');
        
        try {
          const move = this.parseDragDropMove({
            source: sourceData,
            target: targetData,
            cardCount: sourceData.cardCount || 1
          });
          
          if (onMove && typeof onMove === 'function') {
            onMove(move);
          }
        } catch (error) {
          console.warn('Invalid drag-and-drop move:', error.message);
        }
      }
    };
  }
}

module.exports = SolitaireFrontend;