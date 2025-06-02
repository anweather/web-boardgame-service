/**
 * Card Framework - Main Entry Point
 * Provides comprehensive card game functionality for the board game framework
 */

const CardUtils = require('./CardUtils');
const DeckManager = require('./DeckManager');
const HandManager = require('./HandManager');
const SinglePlayerGamePlugin = require('./SinglePlayerGamePlugin');

// Re-export all functionality
module.exports = {
  // Core utilities
  CardUtils,
  DeckManager,
  HandManager,
  SinglePlayerGamePlugin,
  
  // Convenience methods for quick access
  createCard: CardUtils.createCard,
  createStandardDeck: DeckManager.createStandardDeck,
  createCustomDeck: DeckManager.createCustomDeck,
  createHand: HandManager.createHand,
  
  // Common card operations
  shuffle: DeckManager.shuffle,
  deal: DeckManager.deal,
  draw: DeckManager.draw,
  remaining: DeckManager.remaining,
  
  // Card validation
  isValidCard: CardUtils.isValidCard,
  isValidDeck: DeckManager.isValidDeck,
  isValidHand: HandManager.isValidHand,
  
  // Card properties
  isRed: CardUtils.isRed,
  isBlack: CardUtils.isBlack,
  isFaceCard: CardUtils.isFaceCard,
  isAce: CardUtils.isAce,
  
  // Serialization
  serializeDeck: DeckManager.serialize,
  deserializeDeck: DeckManager.deserialize,
  
  // Constants
  SUITS: CardUtils.getSuits(),
  RANKS: CardUtils.getRanks(),
  
  // Version info
  VERSION: '1.0.0'
};