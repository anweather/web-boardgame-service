/**
 * CardUtils - Utility functions for card operations and validation
 * Provides core card functionality for the card framework
 */

class CardUtils {
  static SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  
  static RANKS = [
    { name: 'Ace', value: 1 },
    { name: 'Two', value: 2 },
    { name: 'Three', value: 3 },
    { name: 'Four', value: 4 },
    { name: 'Five', value: 5 },
    { name: 'Six', value: 6 },
    { name: 'Seven', value: 7 },
    { name: 'Eight', value: 8 },
    { name: 'Nine', value: 9 },
    { name: 'Ten', value: 10 },
    { name: 'Jack', value: 11 },
    { name: 'Queen', value: 12 },
    { name: 'King', value: 13 }
  ];

  static SUIT_COLORS = {
    'hearts': 'red',
    'diamonds': 'red',
    'clubs': 'black',
    'spades': 'black'
  };

  static FACE_CARDS = ['Jack', 'Queen', 'King'];

  /**
   * Create a card with the specified properties
   * @param {string} suit - Card suit (hearts, diamonds, clubs, spades)
   * @param {string} rank - Card rank (Ace, Two, ..., King)
   * @param {number} value - Card value (1-13)
   * @returns {Object} Card object
   */
  static createCard(suit, rank, value) {
    if (!this.SUITS.includes(suit)) {
      throw new Error(`Invalid suit: ${suit}`);
    }

    const rankObj = this.RANKS.find(r => r.name === rank);
    if (!rankObj) {
      throw new Error(`Invalid rank: ${rank}`);
    }

    return {
      suit,
      rank,
      value: value || rankObj.value,
      color: this.SUIT_COLORS[suit],
      isJoker: false
    };
  }

  /**
   * Check if a card is red
   * @param {Object} card - Card object
   * @returns {boolean} True if card is red
   */
  static isRed(card) {
    // Use color property if available, otherwise derive from suit
    return card.color === 'red' || (card.color === undefined && this.SUIT_COLORS[card.suit] === 'red');
  }

  /**
   * Check if a card is black
   * @param {Object} card - Card object
   * @returns {boolean} True if card is black
   */
  static isBlack(card) {
    // Use color property if available, otherwise derive from suit
    return card.color === 'black' || (card.color === undefined && this.SUIT_COLORS[card.suit] === 'black');
  }

  /**
   * Check if a card is a face card (Jack, Queen, King)
   * @param {Object} card - Card object
   * @returns {boolean} True if card is a face card
   */
  static isFaceCard(card) {
    return this.FACE_CARDS.includes(card.rank);
  }

  /**
   * Check if a card is an Ace
   * @param {Object} card - Card object
   * @returns {boolean} True if card is an Ace
   */
  static isAce(card) {
    return card.rank === 'Ace';
  }

  /**
   * Compare two cards by rank
   * @param {Object} card1 - First card
   * @param {Object} card2 - Second card
   * @returns {number} -1 if card1 < card2, 1 if card1 > card2, 0 if equal
   */
  static compareRank(card1, card2) {
    return card1.value - card2.value;
  }

  /**
   * Convert card to string representation
   * @param {Object} card - Card object
   * @returns {string} String representation of card
   */
  static toString(card) {
    const suitName = card.suit.charAt(0).toUpperCase() + card.suit.slice(1);
    return `${card.rank} of ${suitName}`;
  }

  /**
   * Parse card from string representation
   * @param {string} cardString - String representation (e.g., "Ace of Hearts")
   * @returns {Object} Card object
   */
  static fromString(cardString) {
    const match = cardString.match(/^(\w+) of (\w+)$/);
    if (!match) {
      throw new Error('Invalid card string format');
    }

    const [, rank, suitCapitalized] = match;
    const suit = suitCapitalized.toLowerCase();

    const rankObj = this.RANKS.find(r => r.name === rank);
    if (!rankObj || !this.SUITS.includes(suit)) {
      throw new Error('Invalid card string format');
    }

    return this.createCard(suit, rank, rankObj.value);
  }

  /**
   * Check if one card can be stacked on another according to rules
   * @param {Object} bottomCard - Card on bottom
   * @param {Object} topCard - Card to place on top
   * @param {Object} rules - Stacking rules
   * @returns {boolean} True if stacking is allowed
   */
  static canStack(bottomCard, topCard, rules = {}) {
    const {
      requireAlternatingColors = false,
      requireDescending = false,
      requireAscending = false,
      requireSameSuit = false,
      requireDifferentSuit = false
    } = rules;

    // Check color requirements
    if (requireAlternatingColors && bottomCard.color === topCard.color) {
      return false;
    }

    // Check rank requirements
    if (requireDescending && topCard.value !== bottomCard.value - 1) {
      return false;
    }

    if (requireAscending && topCard.value !== bottomCard.value + 1) {
      return false;
    }

    // Check suit requirements
    if (requireSameSuit && bottomCard.suit !== topCard.suit) {
      return false;
    }

    if (requireDifferentSuit && bottomCard.suit === topCard.suit) {
      return false;
    }

    return true;
  }

  /**
   * Get array of all valid suits
   * @returns {string[]} Array of suit names
   */
  static getSuits() {
    return [...this.SUITS];
  }

  /**
   * Get array of all valid ranks
   * @returns {Object[]} Array of rank objects with name and value
   */
  static getRanks() {
    return [...this.RANKS];
  }

  /**
   * Get color for a suit
   * @param {string} suit - Suit name
   * @returns {string} Color (red or black)
   */
  static getSuitColor(suit) {
    return this.SUIT_COLORS[suit];
  }

  /**
   * Create a joker card
   * @param {string} color - Joker color (red or black)
   * @returns {Object} Joker card object
   */
  static createJoker(color = 'red') {
    return {
      suit: 'joker',
      rank: 'Joker',
      value: 0,
      color,
      isJoker: true
    };
  }

  /**
   * Validate a card object structure
   * @param {Object} card - Card to validate
   * @returns {boolean} True if card is valid
   */
  static isValidCard(card) {
    if (!card || typeof card !== 'object') {
      return false;
    }

    const requiredProps = ['suit', 'rank', 'value', 'color'];
    if (!requiredProps.every(prop => prop in card)) {
      return false;
    }

    if (card.isJoker) {
      return card.suit === 'joker' && card.rank === 'Joker';
    }

    return this.SUITS.includes(card.suit) &&
           this.RANKS.some(r => r.name === card.rank) &&
           typeof card.value === 'number' &&
           card.value >= 1 && card.value <= 13;
  }
}

module.exports = CardUtils;