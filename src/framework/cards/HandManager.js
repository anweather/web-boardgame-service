/**
 * HandManager - Hand management utilities for card games
 * Provides comprehensive hand operations including creation, sorting, validation, and statistics
 */

const CardUtils = require('./CardUtils');

class HandManager {
  /**
   * Create a new hand for a player
   * @param {string} playerId - Player identifier
   * @param {number} maxSize - Maximum number of cards (optional)
   * @returns {Object} Hand object
   */
  static createHand(playerId, maxSize) {
    if (!playerId || typeof playerId !== 'string') {
      throw new Error('Player ID is required');
    }

    return {
      cards: [],
      playerId,
      maxSize
    };
  }

  /**
   * Add a single card to a hand
   * @param {Object} hand - Hand object
   * @param {Object} card - Card to add
   * @returns {boolean} True if card was added successfully
   */
  static addCard(hand, card) {
    if (!this.isValidHand(hand)) {
      throw new Error('Invalid hand');
    }

    if (!CardUtils.isValidCard(card)) {
      throw new Error('Invalid card');
    }

    if (hand.maxSize && hand.cards.length >= hand.maxSize) {
      return false; // Hand is full
    }

    hand.cards.push(card);
    return true;
  }

  /**
   * Add multiple cards to a hand
   * @param {Object} hand - Hand object
   * @param {Object[]} cards - Cards to add
   * @returns {number} Number of cards successfully added
   */
  static addCards(hand, cards) {
    if (!Array.isArray(cards)) {
      throw new Error('Cards must be an array');
    }

    let addedCount = 0;
    for (const card of cards) {
      if (this.addCard(hand, card)) {
        addedCount++;
      } else {
        break; // Stop if hand is full
      }
    }

    return addedCount;
  }

  /**
   * Remove a card by index
   * @param {Object} hand - Hand object
   * @param {number} cardIndex - Index of card to remove
   * @returns {Object|null} Removed card or null if invalid index
   */
  static removeCard(hand, cardIndex) {
    if (!this.isValidHand(hand)) {
      throw new Error('Invalid hand');
    }

    if (cardIndex < 0 || cardIndex >= hand.cards.length) {
      return null;
    }

    return hand.cards.splice(cardIndex, 1)[0];
  }

  /**
   * Remove a card by card object (first match)
   * @param {Object} hand - Hand object
   * @param {Object} card - Card to remove
   * @returns {boolean} True if card was found and removed
   */
  static removeCardByValue(hand, card) {
    if (!this.isValidHand(hand)) {
      throw new Error('Invalid hand');
    }

    const index = this.findCard(hand, c => 
      c.suit === card.suit && 
      c.rank === card.rank && 
      c.value === card.value
    );

    if (index === -1) {
      return false;
    }

    this.removeCard(hand, index);
    return true;
  }

  /**
   * Find the index of the first card matching a predicate
   * @param {Object} hand - Hand object
   * @param {Function} predicate - Function to test each card
   * @returns {number} Index of first matching card, or -1 if not found
   */
  static findCard(hand, predicate) {
    if (!this.isValidHand(hand)) {
      throw new Error('Invalid hand');
    }

    return hand.cards.findIndex(predicate);
  }

  /**
   * Find all cards matching a predicate
   * @param {Object} hand - Hand object
   * @param {Function} predicate - Function to test each card
   * @returns {Object[]} Array of matching cards
   */
  static findAllCards(hand, predicate) {
    if (!this.isValidHand(hand)) {
      throw new Error('Invalid hand');
    }

    return hand.cards.filter(predicate);
  }

  /**
   * Check if hand contains a card matching predicate
   * @param {Object} hand - Hand object
   * @param {Function} predicate - Function to test each card
   * @returns {boolean} True if hand contains matching card
   */
  static hasCard(hand, predicate) {
    return this.findCard(hand, predicate) !== -1;
  }

  /**
   * Count cards matching a predicate
   * @param {Object} hand - Hand object
   * @param {Function} predicate - Function to test each card
   * @returns {number} Number of matching cards
   */
  static countCards(hand, predicate) {
    if (!this.isValidHand(hand)) {
      throw new Error('Invalid hand');
    }

    return hand.cards.filter(predicate).length;
  }

  /**
   * Sort hand by specified criterion
   * @param {Object} hand - Hand object
   * @param {string} criterion - Sort criterion ('suit', 'rank', 'color', 'value')
   */
  static sortBy(hand, criterion) {
    if (!this.isValidHand(hand)) {
      throw new Error('Invalid hand');
    }

    const comparators = {
      suit: (a, b) => a.suit.localeCompare(b.suit),
      rank: (a, b) => a.value - b.value,
      value: (a, b) => a.value - b.value,
      color: (a, b) => a.color.localeCompare(b.color)
    };

    const comparator = comparators[criterion];
    if (!comparator) {
      throw new Error(`Invalid sort criterion: ${criterion}`);
    }

    hand.cards.sort(comparator);
  }

  /**
   * Sort hand using custom comparator
   * @param {Object} hand - Hand object
   * @param {Function} comparator - Custom comparison function
   */
  static sortByCustom(hand, comparator) {
    if (!this.isValidHand(hand)) {
      throw new Error('Invalid hand');
    }

    if (typeof comparator !== 'function') {
      throw new Error('Comparator must be a function');
    }

    hand.cards.sort(comparator);
  }

  /**
   * Check if a card can be played according to game rules
   * @param {Object} hand - Hand object
   * @param {Object} card - Card to check
   * @param {Object} rules - Game rules
   * @returns {boolean} True if card can be played
   */
  static canPlay(hand, card, rules = {}) {
    if (!this.isValidHand(hand)) {
      throw new Error('Invalid hand');
    }

    if (!CardUtils.isValidCard(card)) {
      throw new Error('Invalid card');
    }

    // Check if card is in hand
    const cardIndex = this.findCard(hand, c => 
      c.suit === card.suit && 
      c.rank === card.rank && 
      c.value === card.value
    );

    if (cardIndex === -1) {
      return false; // Card not in hand
    }

    // Apply game-specific rules
    if (rules.canPlayAny === false) {
      if (rules.allowedSuits && !rules.allowedSuits.includes(card.suit)) {
        return false;
      }

      if (rules.allowedRanks && !rules.allowedRanks.includes(card.rank)) {
        return false;
      }

      if (rules.allowedColors && !rules.allowedColors.includes(card.color)) {
        return false;
      }

      if (rules.minValue && card.value < rules.minValue) {
        return false;
      }

      if (rules.maxValue && card.value > rules.maxValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a card can be added to the hand (considering size limits)
   * @param {Object} hand - Hand object
   * @returns {boolean} True if a card can be added
   */
  static canAddCard(hand) {
    if (!this.isValidHand(hand)) {
      return false;
    }

    return !hand.maxSize || hand.cards.length < hand.maxSize;
  }

  /**
   * Validate hand structure
   * @param {Object} hand - Hand object to validate
   * @returns {boolean} True if hand is valid
   */
  static isValidHand(hand) {
    if (!hand || typeof hand !== 'object') {
      return false;
    }

    const requiredProps = ['cards', 'playerId'];
    if (!requiredProps.every(prop => prop in hand)) {
      return false;
    }

    if (!Array.isArray(hand.cards)) {
      return false;
    }

    if (typeof hand.playerId !== 'string') {
      return false;
    }

    // Validate all cards in hand
    return hand.cards.every(card => CardUtils.isValidCard(card));
  }

  /**
   * Get comprehensive hand statistics
   * @param {Object} hand - Hand object
   * @returns {Object} Hand statistics
   */
  static getHandStats(hand) {
    if (!this.isValidHand(hand)) {
      throw new Error('Invalid hand');
    }

    const stats = {
      totalCards: hand.cards.length,
      totalValue: 0,
      averageValue: 0,
      suitCounts: {},
      colorCounts: { red: 0, black: 0 },
      faceCardCount: 0,
      aceCount: 0
    };

    // Initialize suit counts
    CardUtils.getSuits().forEach(suit => {
      stats.suitCounts[suit] = 0;
    });

    // Calculate statistics
    hand.cards.forEach(card => {
      stats.totalValue += card.value;
      stats.suitCounts[card.suit] = (stats.suitCounts[card.suit] || 0) + 1;
      stats.colorCounts[card.color]++;

      if (CardUtils.isFaceCard(card)) {
        stats.faceCardCount++;
      }

      if (CardUtils.isAce(card)) {
        stats.aceCount++;
      }
    });

    stats.averageValue = stats.totalCards > 0 ? stats.totalValue / stats.totalCards : 0;

    return stats;
  }

  /**
   * Calculate hand value based on game-specific rules
   * @param {Object} hand - Hand object
   * @param {Object} rules - Value calculation rules
   * @returns {number} Hand value
   */
  static getHandValue(hand, rules = {}) {
    if (!this.isValidHand(hand)) {
      throw new Error('Invalid hand');
    }

    const {
      aceValue = 1,
      faceValue = null,
      useRankValue = false
    } = rules;

    let totalValue = 0;

    hand.cards.forEach(card => {
      if (CardUtils.isAce(card)) {
        totalValue += aceValue;
      } else if (CardUtils.isFaceCard(card) && faceValue !== null) {
        totalValue += faceValue;
      } else if (useRankValue) {
        // Use custom rank values (e.g., Ace high = 14)
        if (CardUtils.isAce(card)) {
          totalValue += aceValue;
        } else {
          totalValue += card.value;
        }
      } else {
        totalValue += card.value;
      }
    });

    return totalValue;
  }

  /**
   * Get a copy of the hand (defensive copy)
   * @param {Object} hand - Hand to copy
   * @returns {Object} Copy of the hand
   */
  static copyHand(hand) {
    if (!this.isValidHand(hand)) {
      throw new Error('Invalid hand');
    }

    return {
      cards: [...hand.cards], // Shallow copy of cards array
      playerId: hand.playerId,
      maxSize: hand.maxSize
    };
  }

  /**
   * Clear all cards from hand
   * @param {Object} hand - Hand to clear
   */
  static clearHand(hand) {
    if (!this.isValidHand(hand)) {
      throw new Error('Invalid hand');
    }

    hand.cards.length = 0;
  }

  /**
   * Get the number of cards in hand
   * @param {Object} hand - Hand object
   * @returns {number} Number of cards
   */
  static getHandSize(hand) {
    if (!this.isValidHand(hand)) {
      return 0;
    }

    return hand.cards.length;
  }

  /**
   * Check if hand is empty
   * @param {Object} hand - Hand object
   * @returns {boolean} True if hand is empty
   */
  static isEmpty(hand) {
    return this.getHandSize(hand) === 0;
  }

  /**
   * Check if hand is full (at max capacity)
   * @param {Object} hand - Hand object
   * @returns {boolean} True if hand is full
   */
  static isFull(hand) {
    if (!this.isValidHand(hand) || !hand.maxSize) {
      return false;
    }

    return hand.cards.length >= hand.maxSize;
  }
}

module.exports = HandManager;