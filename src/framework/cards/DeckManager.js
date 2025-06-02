/**
 * DeckManager - Core deck operations and management
 * Integrates with the cards npm library for deck creation and manipulation
 */

const { decks, shuffle } = require('cards');
const CardUtils = require('./CardUtils');

class DeckManager {
  /**
   * Create a standard 52-card deck
   * @param {Object} config - Deck configuration options
   * @param {number} config.includeJokers - Number of jokers to include (default: 0)
   * @param {string[]} config.excludeCards - Card identifiers to exclude
   * @returns {Object} Deck object
   */
  static createStandardDeck(config = {}) {
    const { includeJokers = 0, excludeCards = [] } = config;
    
    if (includeJokers < 0) {
      throw new Error('Invalid joker count');
    }

    // Create standard deck using cards library
    const cardsLibDeck = new decks.StandardDeck({ jokers: includeJokers });
    
    // Convert cards library format to our format
    const cards = [];
    
    // Convert all cards from the library
    cardsLibDeck.deckPile.forEach(libCard => {
      // Check if it's a joker by class name or suit name
      const isJoker = libCard.constructor.name === 'JokerCard' || libCard.suit.name === 'none';
      
      if (isJoker) {
        // Create joker using the color from the library card
        const jokerColor = libCard.color || 'red';
        cards.push(CardUtils.createJoker(jokerColor));
      } else {
        // Create regular card
        const card = CardUtils.createCard(
          libCard.suit.name,
          libCard.rank.name,
          libCard.rank.value
        );
        const cardId = CardUtils.toString(card);
        if (!excludeCards.includes(cardId)) {
          cards.push(card);
        }
      }
    });

    return {
      cards,
      discardPile: [],
      shuffled: false,
      deckType: 'standard'
    };
  }

  /**
   * Create a custom deck with specified cards
   * @param {Object[]} cards - Array of card objects
   * @returns {Object} Deck object
   */
  static createCustomDeck(cards) {
    if (!Array.isArray(cards) || cards.length === 0) {
      throw new Error('Custom deck must have at least one card');
    }

    // Validate all cards
    cards.forEach((card, index) => {
      if (!CardUtils.isValidCard(card)) {
        throw new Error(`Invalid card at index ${index}`);
      }
    });

    return {
      cards: [...cards], // Create copy to avoid mutations
      discardPile: [],
      shuffled: false,
      deckType: 'custom'
    };
  }

  /**
   * Shuffle the deck using Fisher-Yates algorithm
   * @param {Object} deck - Deck to shuffle
   * @param {Object} options - Shuffle options (seed for testing)
   */
  static shuffle(deck, options = {}) {
    if (!this.isValidDeck(deck)) {
      throw new Error('Invalid deck');
    }

    // Use Fisher-Yates shuffle algorithm
    const cards = [...deck.cards];
    
    // Simple seeded random number generator for testing
    let seed = options.seed || Date.now();
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    const rng = options.seed ? random : Math.random;
    
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    
    deck.cards = cards;
    deck.shuffled = true;
  }

  /**
   * Draw cards from the top of the deck
   * @param {Object} deck - Deck to draw from
   * @param {number} count - Number of cards to draw
   * @returns {Object[]} Array of drawn cards
   */
  static draw(deck, count) {
    if (!this.isValidDeck(deck)) {
      throw new Error('Invalid deck');
    }
    
    if (count > deck.cards.length) {
      throw new Error('Not enough cards in deck');
    }
    
    const drawnCards = deck.cards.splice(0, count);
    return drawnCards;
  }

  /**
   * Peek at cards from the top without removing them
   * @param {Object} deck - Deck to peek at
   * @param {number} count - Number of cards to peek at
   * @returns {Object[]} Array of peeked cards
   */
  static peek(deck, count) {
    if (!this.isValidDeck(deck)) {
      throw new Error('Invalid deck');
    }
    
    if (count > deck.cards.length) {
      throw new Error('Not enough cards in deck');
    }
    
    return deck.cards.slice(0, count);
  }

  /**
   * Add cards to the top of the deck
   * @param {Object} deck - Deck to add to
   * @param {Object[]} cards - Cards to add
   */
  static addToTop(deck, cards) {
    if (!this.isValidDeck(deck)) {
      throw new Error('Invalid deck');
    }
    
    if (!Array.isArray(cards)) {
      throw new Error('Cards must be an array');
    }
    
    deck.cards.unshift(...cards);
  }

  /**
   * Add cards to the bottom of the deck
   * @param {Object} deck - Deck to add to
   * @param {Object[]} cards - Cards to add
   */
  static addToBottom(deck, cards) {
    if (!this.isValidDeck(deck)) {
      throw new Error('Invalid deck');
    }
    
    if (!Array.isArray(cards)) {
      throw new Error('Cards must be an array');
    }
    
    deck.cards.push(...cards);
  }

  /**
   * Deal cards to multiple hands in round-robin fashion
   * @param {Object} deck - Deck to deal from
   * @param {number} hands - Number of hands to deal to
   * @param {number} cardsPerHand - Cards per hand
   * @returns {Object[][]} Array of hands (each hand is an array of cards)
   */
  static deal(deck, hands, cardsPerHand) {
    if (!this.isValidDeck(deck)) {
      throw new Error('Invalid deck');
    }
    
    const totalCardsNeeded = hands * cardsPerHand;
    if (totalCardsNeeded > deck.cards.length) {
      throw new Error('Not enough cards to deal');
    }
    
    const dealtHands = Array(hands).fill(null).map(() => []);
    
    // Deal in round-robin fashion
    for (let cardNum = 0; cardNum < cardsPerHand; cardNum++) {
      for (let handNum = 0; handNum < hands; handNum++) {
        const card = this.draw(deck, 1)[0];
        dealtHands[handNum].push(card);
      }
    }
    
    return dealtHands;
  }

  /**
   * Reset deck to its original state
   * @param {Object} deck - Deck to reset
   */
  static reset(deck) {
    if (!this.isValidDeck(deck)) {
      throw new Error('Invalid deck');
    }
    
    // Restore all cards from discard pile
    deck.cards.push(...deck.discardPile);
    deck.discardPile = [];
    deck.shuffled = false;
    
    // If it's a standard deck, recreate in proper order
    if (deck.deckType === 'standard') {
      const standardDeck = this.createStandardDeck();
      deck.cards = standardDeck.cards;
    }
  }

  /**
   * Get number of remaining cards in deck
   * @param {Object} deck - Deck to check
   * @returns {number} Number of remaining cards
   */
  static remaining(deck) {
    if (!this.isValidDeck(deck)) {
      return 0;
    }
    return deck.cards.length;
  }

  /**
   * Check if deck is empty
   * @param {Object} deck - Deck to check
   * @returns {boolean} True if deck is empty
   */
  static isEmpty(deck) {
    return this.remaining(deck) === 0;
  }

  /**
   * Serialize deck to JSON string
   * @param {Object} deck - Deck to serialize
   * @returns {string} Serialized deck data
   */
  static serialize(deck) {
    if (!this.isValidDeck(deck)) {
      throw new Error('Invalid deck');
    }
    
    try {
      return JSON.stringify({
        cards: deck.cards,
        discardPile: deck.discardPile,
        shuffled: deck.shuffled,
        deckType: deck.deckType
      });
    } catch (error) {
      throw new Error('Failed to serialize deck');
    }
  }

  /**
   * Deserialize deck from JSON string
   * @param {string} data - Serialized deck data
   * @returns {Object} Deck object
   */
  static deserialize(data) {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (error) {
      throw new Error('Invalid deck data');
    }
    
    if (!parsed.cards || !Array.isArray(parsed.cards)) {
      throw new Error('Invalid deck structure');
    }
    
    // Validate required properties
    const requiredProps = ['cards', 'discardPile', 'shuffled', 'deckType'];
    if (!requiredProps.every(prop => prop in parsed)) {
      throw new Error('Invalid deck structure');
    }
    
    // Validate cards
    parsed.cards.forEach((card, index) => {
      if (!CardUtils.isValidCard(card)) {
        throw new Error(`Invalid card at index ${index}`);
      }
    });
    
    return {
      cards: parsed.cards,
      discardPile: parsed.discardPile || [],
      shuffled: parsed.shuffled || false,
      deckType: parsed.deckType || 'custom'
    };
  }

  /**
   * Validate deck structure
   * @param {Object} deck - Deck to validate
   * @returns {boolean} True if deck is valid
   */
  static isValidDeck(deck) {
    if (!deck || typeof deck !== 'object') {
      return false;
    }
    
    const requiredProps = ['cards', 'discardPile', 'shuffled', 'deckType'];
    if (!requiredProps.every(prop => prop in deck)) {
      return false;
    }
    
    if (!Array.isArray(deck.cards) || !Array.isArray(deck.discardPile)) {
      return false;
    }
    
    if (typeof deck.shuffled !== 'boolean' || typeof deck.deckType !== 'string') {
      return false;
    }
    
    // Validate all cards in deck
    const allCards = [...deck.cards, ...deck.discardPile];
    return allCards.every(card => CardUtils.isValidCard(card));
  }

  /**
   * Move cards from deck to discard pile
   * @param {Object} deck - Deck object
   * @param {Object[]} cards - Cards to discard
   */
  static discard(deck, cards) {
    if (!this.isValidDeck(deck)) {
      throw new Error('Invalid deck');
    }
    
    if (!Array.isArray(cards)) {
      cards = [cards];
    }
    
    deck.discardPile.push(...cards);
  }

  /**
   * Create a deck configuration for specific game types
   * @param {string} gameType - Type of game (solitaire, poker, etc.)
   * @returns {Object} Deck configuration
   */
  static getGameDeckConfig(gameType) {
    const configs = {
      solitaire: { includeJokers: 0 },
      poker: { includeJokers: 0 },
      blackjack: { includeJokers: 0 },
      crazy_eights: { includeJokers: 2 },
      war: { includeJokers: 0 }
    };
    
    return configs[gameType] || { includeJokers: 0 };
  }
}

module.exports = DeckManager;