/**
 * SolitairePlugin - Klondike Solitaire Implementation
 * Classic single-player card game with tableau, foundation, and stock piles
 */

const SinglePlayerGamePlugin = require('../../framework/cards/SinglePlayerGamePlugin');
const { CardUtils, DeckManager } = require('../../framework/cards');

class SolitairePlugin extends SinglePlayerGamePlugin {
  /**
   * Get plugin metadata
   * @returns {Object} Plugin metadata
   */
  static getMetadata() {
    return {
      name: 'Klondike Solitaire',
      description: 'Classic single-player solitaire card game',
      minPlayers: 1,
      maxPlayers: 1,
      estimatedDuration: '5-15 minutes',
      complexity: 'Medium',
      categories: ['Solitaire', 'Card Game', 'Single Player'],
      version: '1.0.0'
    };
  }

  getGameType() {
    return 'solitaire';
  }

  getDisplayName() {
    return 'Klondike Solitaire';
  }

  getDescription() {
    return 'Classic single-player solitaire game. Build foundation piles in suit from Ace to King.';
  }

  /**
   * Initialize Klondike Solitaire board state
   * @returns {Object} Initial board state with tableau, foundation, stock, and waste piles
   */
  getInitialBoardState() {
    const deck = DeckManager.createStandardDeck({ shuffled: true });
    
    // Deal cards to tableau (7 columns)
    const tableau = [];
    let deckIndex = 0;
    
    for (let col = 0; col < 7; col++) {
      const column = [];
      
      // Deal face-down cards
      for (let row = 0; row < col; row++) {
        const card = deck.cards[deckIndex++];
        column.push({ ...card, faceUp: false });
      }
      
      // Deal one face-up card on top
      const topCard = deck.cards[deckIndex++];
      column.push({ ...topCard, faceUp: true });
      
      tableau.push(column);
    }
    
    // Remaining cards form the stock pile
    const stock = deck.cards.slice(deckIndex).map(card => ({ ...card, faceUp: false }));
    
    // Initialize empty piles
    const foundation = {
      hearts: [],
      diamonds: [],
      clubs: [],
      spades: []
    };
    
    const waste = [];
    
    return {
      tableau,
      foundation,
      stock,
      waste,
      score: this.initializeScore(),
      moves: [],
      stockDrawCount: 3, // Standard Klondike draws 3 cards at a time
      gameStarted: Date.now()
    };
  }

  /**
   * Validate a move in Solitaire
   * @param {Object} move - Move object containing source and destination
   * @param {Object} boardState - Current board state
   * @param {string} playerId - Player making the move
   * @param {Object[]} players - Array of players (should be 1)
   * @returns {Object} Validation result
   */
  validateMove(move, boardState, playerId, players) {
    if (!move || typeof move !== 'object') {
      return { valid: false, error: 'Invalid move object' };
    }

    const { action, from, to, cardCount = 1 } = move;

    if (!action) {
      return { valid: false, error: 'Move must specify an action' };
    }

    switch (action) {
      case 'draw_stock':
        return this.validateDrawStock(boardState);
      
      case 'reset_stock':
        return this.validateResetStock(boardState);
      
      case 'move_card':
        return this.validateMoveCard(move, boardState);
      
      case 'flip_card':
        return this.validateFlipCard(move, boardState);
      
      default:
        return { valid: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * Validate drawing cards from stock
   */
  validateDrawStock(boardState) {
    if (boardState.stock.length === 0) {
      return { valid: false, error: 'Stock pile is empty - no more cards to draw. Try "r" to reset from waste pile' };
    }
    return { valid: true };
  }

  /**
   * Validate resetting stock pile from waste
   */
  validateResetStock(boardState) {
    if (boardState.stock.length > 0) {
      return { valid: false, error: 'Cannot reset - stock pile still has cards. Draw all cards first with "d"' };
    }
    if (boardState.waste.length === 0) {
      return { valid: false, error: 'Cannot reset - waste pile is empty. Draw some cards first with "d"' };
    }
    return { valid: true };
  }

  /**
   * Validate moving cards between piles
   */
  validateMoveCard(move, boardState) {
    let { from, to, cardCount } = move;

    if (!from || !to) {
      return { valid: false, error: 'Move must specify from and to locations' };
    }

    // For tableau-to-tableau moves, auto-detect optimal card count if not specified
    if (from.type === 'tableau' && to.type === 'tableau' && !cardCount) {
      cardCount = this.getMaxMovableCards(from.column, boardState);
      // Update the move object to include the calculated count
      move.cardCount = cardCount;
    }

    // Default to 1 card if still not specified
    if (!cardCount) {
      cardCount = 1;
      move.cardCount = cardCount;
    }

    // Get source cards
    const sourceCards = this.getCardsFromLocation(from, boardState);
    if (!sourceCards || sourceCards.length === 0) {
      const locationName = this.formatLocationName(from);
      return { valid: false, error: `No cards available at ${locationName}` };
    }

    if (cardCount > sourceCards.length) {
      const locationName = this.formatLocationName(from);
      return { valid: false, error: `Not enough cards at ${locationName} - only ${sourceCards.length} available, tried to move ${cardCount}` };
    }

    // Get the cards being moved
    const cardsToMove = sourceCards.slice(-cardCount);
    
    // Ensure all cards being moved are face-up (except single card moves)
    if (cardCount > 1) {
      for (const card of cardsToMove) {
        if (!card.faceUp) {
          return { valid: false, error: 'Cannot move face-down cards' };
        }
      }
    }

    // Validate the move based on destination type
    if (to.type === 'foundation') {
      return this.validateFoundationMove(cardsToMove, to, boardState);
    } else if (to.type === 'tableau') {
      return this.validateTableauMove(cardsToMove, to, boardState);
    }

    return { valid: false, error: 'Invalid destination type' };
  }

  /**
   * Validate flipping a face-down card
   */
  validateFlipCard(move, boardState) {
    const { from } = move;
    
    if (from.type !== 'tableau') {
      return { valid: false, error: 'Can only flip tableau cards' };
    }

    const column = boardState.tableau[from.column];
    if (!column || column.length === 0) {
      return { valid: false, error: `Tableau column ${from.column + 1} is empty - no cards to flip` };
    }

    const topCard = column[column.length - 1];
    if (topCard.faceUp) {
      return { valid: false, error: `Card in tableau ${from.column + 1} is already face-up - try moving it instead` };
    }

    return { valid: true };
  }

  /**
   * Validate move to foundation pile
   */
  validateFoundationMove(cardsToMove, to, boardState) {
    if (cardsToMove.length !== 1) {
      return { valid: false, error: 'Can only move one card to foundation' };
    }

    const card = cardsToMove[0];
    if (!card.faceUp) {
      return { valid: false, error: 'Cannot move face-down card to foundation' };
    }

    const foundationPile = boardState.foundation[to.suit];
    
    if (foundationPile.length === 0) {
      // Foundation must start with Ace
      if (card.rank !== 'Ace') {
        return { valid: false, error: `Foundation piles must start with Ace - cannot place ${card.rank} of ${card.suit} on empty ${to.suit} foundation` };
      }
      if (card.suit !== to.suit) {
        return { valid: false, error: `Wrong suit - ${card.suit} card cannot go on ${to.suit} foundation` };
      }
    } else {
      // Must be same suit and next rank
      const topCard = foundationPile[foundationPile.length - 1];
      if (card.suit !== topCard.suit) {
        return { valid: false, error: `Wrong suit - ${card.suit} card cannot go on ${topCard.suit} foundation (must match)` };
      }
      
      const expectedRank = this.getNextRank(topCard.rank);
      if (card.rank !== expectedRank) {
        return { valid: false, error: `Wrong rank - expected ${expectedRank} of ${to.suit}, got ${card.rank} (foundation sequence: A,2,3,4,5,6,7,8,9,10,J,Q,K)` };
      }
    }

    return { valid: true };
  }

  /**
   * Get the maximum number of cards that can be moved from a tableau column
   * Returns the count of face-up cards that form a valid descending sequence
   */
  getMaxMovableCards(fromColumn, boardState) {
    const column = boardState.tableau[fromColumn];
    if (!column || column.length === 0) {
      return 0;
    }

    let movableCount = 0;
    
    // Start from the bottom (last card) and work backwards
    for (let i = column.length - 1; i >= 0; i--) {
      const card = column[i];
      
      // Stop if we hit a face-down card
      if (!card.faceUp) {
        break;
      }
      
      // First card (bottom of sequence) is always movable if face-up
      if (i === column.length - 1) {
        movableCount = 1;
        continue;
      }
      
      // Check if this card continues the valid descending sequence
      const nextCard = column[i + 1];
      const expectedRank = this.getPreviousRank(card.rank);
      const validRank = nextCard.rank === expectedRank;
      const validColor = CardUtils.isRed(card) !== CardUtils.isRed(nextCard);
      
      if (validRank && validColor) {
        movableCount++;
      } else {
        // Sequence broken, stop here
        break;
      }
    }
    
    return movableCount;
  }

  /**
   * Validate move to tableau column
   */
  validateTableauMove(cardsToMove, to, boardState) {
    const targetColumn = boardState.tableau[to.column];
    
    if (targetColumn.length === 0) {
      // Empty column can only accept King
      const firstCard = cardsToMove[0];
      if (firstCard.rank !== 'King') {
        return { valid: false, error: `Empty tableau column ${to.column + 1} can only accept Kings - cannot place ${firstCard.rank} of ${firstCard.suit}` };
      }
    } else {
      // Must be descending rank and alternating color
      const topCard = targetColumn[targetColumn.length - 1];
      const firstCard = cardsToMove[0];
      
      if (!topCard.faceUp) {
        return { valid: false, error: `Cannot place cards on face-down card in tableau ${to.column + 1} - flip it first with "f${to.column + 1}"` };
      }
      
      const expectedRank = this.getPreviousRank(topCard.rank);
      if (firstCard.rank !== expectedRank) {
        const topCardColor = CardUtils.isRed(topCard) ? 'red' : 'black';
        return { 
          valid: false, 
          error: `Cannot place ${firstCard.rank} on ${topCard.rank} - expected ${expectedRank}. Tableau builds down in rank (K→Q→J→10→9→8→7→6→5→4→3→2→A). Check if you have a proper descending sequence to move.` 
        };
      }
      
      if (CardUtils.isRed(topCard) === CardUtils.isRed(firstCard)) {
        const topCardColor = CardUtils.isRed(topCard) ? 'red' : 'black';
        const firstCardColor = CardUtils.isRed(firstCard) ? 'red' : 'black';
        return { valid: false, error: `Wrong color - cannot place ${firstCardColor} ${firstCard.rank} on ${topCardColor} ${topCard.rank} (must alternate red/black)` };
      }
    }

    // Validate sequence if multiple cards
    if (cardsToMove.length > 1) {
      for (let i = 0; i < cardsToMove.length - 1; i++) {
        const currentCard = cardsToMove[i];
        const nextCard = cardsToMove[i + 1];
        
        const expectedRank = this.getPreviousRank(currentCard.rank);
        if (nextCard.rank !== expectedRank) {
          return { 
            valid: false, 
            error: `Invalid sequence - expected ${expectedRank} after ${currentCard.rank}, got ${nextCard.rank}. Only properly sequenced cards can be moved together.` 
          };
        }
        
        if (CardUtils.isRed(currentCard) === CardUtils.isRed(nextCard)) {
          const currentColor = CardUtils.isRed(currentCard) ? 'red' : 'black';
          const nextColor = CardUtils.isRed(nextCard) ? 'red' : 'black';
          return { 
            valid: false, 
            error: `Invalid sequence - ${currentColor} ${currentCard.rank} followed by ${nextColor} ${nextCard.rank}. Cards must alternate red/black.` 
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Apply a move to the board state
   * @param {Object} move - Move to apply
   * @param {Object} boardState - Current board state
   * @param {string} playerId - Player making the move
   * @param {Object[]} players - Array of players
   * @returns {Object} New board state
   */
  applyMove(move, boardState, playerId, players) {
    const newBoardState = JSON.parse(JSON.stringify(boardState));
    newBoardState.moves.push({
      ...move,
      timestamp: Date.now(),
      playerId
    });

    const { action } = move;

    switch (action) {
      case 'draw_stock':
        this.applyDrawStock(newBoardState);
        break;
      
      case 'reset_stock':
        this.applyResetStock(newBoardState);
        break;
      
      case 'move_card':
        this.applyMoveCard(move, newBoardState);
        break;
      
      case 'flip_card':
        this.applyFlipCard(move, newBoardState);
        break;
    }

    // Update score
    const scoreEvent = this.getMoveScoreEvent(move, boardState, newBoardState);
    if (scoreEvent) {
      newBoardState.score = this.updateScore(newBoardState.score, scoreEvent);
    }

    return newBoardState;
  }

  /**
   * Apply drawing cards from stock
   */
  applyDrawStock(boardState) {
    const drawCount = Math.min(boardState.stockDrawCount, boardState.stock.length);
    const drawnCards = boardState.stock.splice(-drawCount, drawCount);
    
    // Add to waste pile (face up)
    drawnCards.forEach(card => {
      card.faceUp = true;
      boardState.waste.push(card);
    });
  }

  /**
   * Apply resetting stock from waste
   */
  applyResetStock(boardState) {
    // Move all waste cards back to stock (face down)
    while (boardState.waste.length > 0) {
      const card = boardState.waste.pop();
      card.faceUp = false;
      boardState.stock.push(card);
    }
  }

  /**
   * Apply moving cards between piles
   */
  applyMoveCard(move, boardState) {
    const { from, to, cardCount = 1 } = move;
    
    // Remove cards from source
    const sourceCards = this.removeCardsFromLocation(from, boardState, cardCount);
    
    // Add cards to destination
    this.addCardsToLocation(to, boardState, sourceCards);
  }

  /**
   * Apply flipping a card
   */
  applyFlipCard(move, boardState) {
    const { from } = move;
    const column = boardState.tableau[from.column];
    const topCard = column[column.length - 1];
    topCard.faceUp = true;
  }

  /**
   * Check if the game is complete (all cards in foundation)
   */
  isGameComplete(boardState, players) {
    const { foundation } = boardState;
    
    // Each foundation pile should have 13 cards (Ace through King)
    for (const suit of ['hearts', 'diamonds', 'clubs', 'spades']) {
      if (foundation[suit].length !== 13) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get the winner (always the player in single-player game)
   */
  getWinner(boardState, players) {
    if (this.isGameComplete(boardState, players)) {
      return players[0].user_id || players[0].userId;
    }
    return null;
  }

  /**
   * Validate board state
   */
  validateBoardState(boardState) {
    if (!boardState || typeof boardState !== 'object') {
      return false;
    }

    const required = ['tableau', 'foundation', 'stock', 'waste', 'score', 'moves'];
    for (const field of required) {
      if (!(field in boardState)) {
        return false;
      }
    }

    // Validate tableau structure
    if (!Array.isArray(boardState.tableau) || boardState.tableau.length !== 7) {
      return false;
    }

    // Validate foundation structure
    const expectedSuits = ['hearts', 'diamonds', 'clubs', 'spades'];
    for (const suit of expectedSuits) {
      if (!Array.isArray(boardState.foundation[suit])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get render data for the game
   */
  getRenderData(boardState, players, options = {}) {
    return {
      tableau: boardState.tableau,
      foundation: boardState.foundation,
      stock: boardState.stock,
      waste: boardState.waste,
      score: boardState.score,
      moves: boardState.moves.length,
      gameComplete: this.isGameComplete(boardState, players),
      winner: this.getWinner(boardState, players)
    };
  }

  // Helper methods

  /**
   * Get cards from a location specification
   */
  getCardsFromLocation(location, boardState) {
    switch (location.type) {
      case 'tableau':
        return boardState.tableau[location.column] || [];
      
      case 'foundation':
        return boardState.foundation[location.suit] || [];
      
      case 'waste':
        return boardState.waste;
      
      case 'stock':
        return boardState.stock;
      
      default:
        return [];
    }
  }

  /**
   * Remove cards from a location
   */
  removeCardsFromLocation(location, boardState, count) {
    const sourceCards = this.getCardsFromLocation(location, boardState);
    return sourceCards.splice(-count, count);
  }

  /**
   * Add cards to a location
   */
  addCardsToLocation(location, boardState, cards) {
    switch (location.type) {
      case 'tableau':
        boardState.tableau[location.column].push(...cards);
        break;
      
      case 'foundation':
        boardState.foundation[location.suit].push(...cards);
        break;
      
      case 'waste':
        boardState.waste.push(...cards);
        break;
      
      case 'stock':
        boardState.stock.push(...cards);
        break;
    }
  }

  /**
   * Get the next rank in sequence (for foundation)
   */
  getNextRank(rank) {
    const ranks = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 
                   'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King'];
    const index = ranks.indexOf(rank);
    return index >= 0 && index < ranks.length - 1 ? ranks[index + 1] : null;
  }

  /**
   * Get the previous rank in sequence (for tableau)
   */
  getPreviousRank(rank) {
    const ranks = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 
                   'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King'];
    const index = ranks.indexOf(rank);
    return index > 0 ? ranks[index - 1] : null;
  }

  /**
   * Get score event for a move
   */
  getMoveScoreEvent(move, oldBoardState, newBoardState) {
    const { action } = move;
    
    switch (action) {
      case 'move_card':
        return this.getScoreForCardMove(move, oldBoardState, newBoardState);
      
      case 'flip_card':
        return { type: 'move', pointsAwarded: 5 }; // Points for revealing card
      
      case 'draw_stock':
        return { type: 'move', pointsAwarded: 0 }; // No points for drawing
      
      case 'reset_stock':
        return { type: 'penalty', points: 100, penaltyType: 'stock_reset', 
                description: 'Stock pile reset penalty' };
      
      default:
        return { type: 'move', pointsAwarded: 0 };
    }
  }

  /**
   * Calculate score for card moves
   */
  getScoreForCardMove(move, oldBoardState, newBoardState) {
    const { to, from } = move;
    
    if (to.type === 'foundation') {
      return { type: 'move', pointsAwarded: 10 }; // Points for foundation move
    }
    
    if (from.type === 'foundation' && to.type === 'tableau') {
      return { type: 'penalty', points: 15, penaltyType: 'foundation_to_tableau',
               description: 'Moving card from foundation to tableau' };
    }
    
    return { type: 'move', pointsAwarded: 0 };
  }

  /**
   * Get completion bonus
   */
  getCompletionBonus(boardState, score) {
    // Base completion bonus
    let bonus = 500;
    
    // Time bonus (less time = more bonus)
    const timeElapsed = Date.now() - boardState.gameStarted;
    const minutesElapsed = timeElapsed / (1000 * 60);
    
    if (minutesElapsed < 10) {
      bonus += 200; // Fast completion bonus
    } else if (minutesElapsed < 20) {
      bonus += 100; // Moderate completion bonus
    }
    
    // Move efficiency bonus (fewer moves = more bonus)
    const moveCount = boardState.moves.length;
    if (moveCount < 200) {
      bonus += 100; // Efficient completion bonus
    }
    
    return bonus;
  }

  /**
   * Get time bonus
   */
  getTimeBonus(timeElapsed) {
    const minutesElapsed = timeElapsed / (1000 * 60);
    
    if (minutesElapsed < 5) {
      return 300; // Excellent time bonus
    } else if (minutesElapsed < 10) {
      return 150; // Good time bonus
    } else if (minutesElapsed < 20) {
      return 50; // Decent time bonus
    }
    
    return 0; // No time bonus
  }

  /**
   * Format location name for error messages
   */
  formatLocationName(location) {
    if (!location || !location.type) return 'unknown location';
    
    switch (location.type) {
      case 'waste': return 'waste pile';
      case 'stock': return 'stock pile';
      case 'foundation': return `${location.suit} foundation`;
      case 'tableau': return `tableau column ${(location.column || 0) + 1}`;
      default: return location.type;
    }
  }

  /**
   * Generate board image for solitaire game
   * Uses plugin renderer if available, falls back to basic representation
   */
  static async generateBoardImage(boardState, options = {}) {
    try {
      // Try to use plugin renderer if available
      const renderer = require('./SolitaireRenderer');
      return await renderer.generateBoardImage(boardState, options);
    } catch (error) {
      // Fallback: Return a basic text representation  
      console.warn('SolitaireRenderer not available, using fallback:', error.message);
      
      // Create a basic text representation
      const foundation = boardState.foundation || { hearts: [], diamonds: [], clubs: [], spades: [] };
      const stock = boardState.stock || [];
      const waste = boardState.waste || [];
      const tableau = boardState.tableau || [];
      const score = boardState.score || { points: 0 };
      const moves = boardState.moves || [];
      
      return {
        type: 'text',
        content: `Solitaire Game
Foundation: H:${foundation.hearts.length} D:${foundation.diamonds.length} C:${foundation.clubs.length} S:${foundation.spades.length}
Stock: ${stock.length} cards | Waste: ${waste.length} cards
Tableau columns: ${tableau.map(col => col.length).join(', ')}
Score: ${score.points} | Moves: ${moves.length}
Status: In Progress`,
        width: 400,
        height: 200
      };
    }
  }
}

module.exports = SolitairePlugin;