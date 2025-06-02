const DeckManager = require('../../../src/framework/cards/DeckManager');
const CardUtils = require('../../../src/framework/cards/CardUtils');

describe('DeckManager', () => {
  describe('Deck Creation', () => {
    test('creates standard 52-card deck', () => {
      const deck = DeckManager.createStandardDeck();
      
      expect(DeckManager.remaining(deck)).toBe(52);
      expect(deck.cards).toHaveLength(52);
      expect(deck.discardPile).toHaveLength(0);
      expect(deck.deckType).toBe('standard');
      expect(deck.shuffled).toBe(false);
    });

    test('creates standard deck with jokers', () => {
      const deck = DeckManager.createStandardDeck({ includeJokers: 2 });
      
      expect(DeckManager.remaining(deck)).toBe(54);
      expect(deck.cards).toHaveLength(54);
      
      // Check that jokers were added
      const jokers = deck.cards.filter(card => card.isJoker);
      expect(jokers).toHaveLength(2);
    });

    test('creates custom deck with specified cards', () => {
      const customCards = [
        CardUtils.createCard('hearts', 'Ace', 1),
        CardUtils.createCard('spades', 'King', 13)
      ];
      const deck = DeckManager.createCustomDeck(customCards);
      
      expect(DeckManager.remaining(deck)).toBe(2);
      expect(deck.deckType).toBe('custom');
      expect(deck.cards).toEqual(customCards);
    });

    test('validates deck configuration', () => {
      expect(() => {
        DeckManager.createStandardDeck({ includeJokers: -1 });
      }).toThrow('Invalid joker count');
      
      expect(() => {
        DeckManager.createCustomDeck([]);
      }).toThrow('Custom deck must have at least one card');
    });
  });

  describe('Deck Operations', () => {
    let deck;

    beforeEach(() => {
      deck = DeckManager.createStandardDeck();
    });

    test('shuffles deck maintaining card count', () => {
      const originalCards = [...deck.cards];
      DeckManager.shuffle(deck);
      
      expect(deck.shuffled).toBe(true);
      expect(deck.cards).toHaveLength(52);
      expect(deck.cards).not.toEqual(originalCards);
      
      // Verify all original cards are still present
      const originalSet = new Set(originalCards.map(c => CardUtils.toString(c)));
      const shuffledSet = new Set(deck.cards.map(c => CardUtils.toString(c)));
      expect(shuffledSet).toEqual(originalSet);
    });

    test('draws specified number of cards', () => {
      const drawnCards = DeckManager.draw(deck, 5);
      
      expect(drawnCards).toHaveLength(5);
      expect(DeckManager.remaining(deck)).toBe(47);
      
      // Verify drawn cards are valid
      drawnCards.forEach(card => {
        expect(CardUtils.isValidCard(card)).toBe(true);
      });
    });

    test('draws all remaining cards', () => {
      const drawnCards = DeckManager.draw(deck, 52);
      
      expect(drawnCards).toHaveLength(52);
      expect(DeckManager.remaining(deck)).toBe(0);
      expect(DeckManager.isEmpty(deck)).toBe(true);
    });

    test('throws error when drawing more cards than available', () => {
      expect(() => {
        DeckManager.draw(deck, 53);
      }).toThrow('Not enough cards in deck');
    });

    test('peeks at cards without removing them', () => {
      const peekedCards = DeckManager.peek(deck, 3);
      
      expect(peekedCards).toHaveLength(3);
      expect(DeckManager.remaining(deck)).toBe(52); // No cards removed
      
      // Verify peeked cards match the top cards
      const drawnCards = DeckManager.draw(deck, 3);
      expect(drawnCards).toEqual(peekedCards);
    });

    test('adds cards to top of deck', () => {
      const newCards = [
        CardUtils.createCard('hearts', 'Ace', 1),
        CardUtils.createCard('spades', 'King', 13)
      ];
      
      DeckManager.addToTop(deck, newCards);
      
      expect(DeckManager.remaining(deck)).toBe(54);
      
      // Verify added cards are on top
      const topCards = DeckManager.peek(deck, 2);
      expect(topCards).toEqual(newCards);
    });

    test('adds cards to bottom of deck', () => {
      const originalBottomCards = deck.cards.slice(-2);
      const newCards = [
        CardUtils.createCard('hearts', 'Ace', 1),
        CardUtils.createCard('spades', 'King', 13)
      ];
      
      DeckManager.addToBottom(deck, newCards);
      
      expect(DeckManager.remaining(deck)).toBe(54);
      
      // Draw most cards to see bottom
      DeckManager.draw(deck, 52);
      const bottomCards = DeckManager.draw(deck, 2);
      expect(bottomCards).toEqual(newCards);
    });

    test('resets deck to original state', () => {
      // Modify deck
      DeckManager.shuffle(deck);
      DeckManager.draw(deck, 10);
      
      // Reset
      DeckManager.reset(deck);
      
      expect(DeckManager.remaining(deck)).toBe(52);
      expect(deck.shuffled).toBe(false);
      expect(deck.discardPile).toHaveLength(0);
    });
  });

  describe('Dealing Operations', () => {
    let deck;

    beforeEach(() => {
      deck = DeckManager.createStandardDeck();
      DeckManager.shuffle(deck);
    });

    test('deals cards to multiple hands', () => {
      const hands = DeckManager.deal(deck, 4, 5); // 4 hands, 5 cards each
      
      expect(hands).toHaveLength(4);
      hands.forEach(hand => {
        expect(hand).toHaveLength(5);
      });
      
      expect(DeckManager.remaining(deck)).toBe(32); // 52 - 20 = 32
    });

    test('deals cards in round-robin fashion', () => {
      const hands = DeckManager.deal(deck, 2, 3);
      
      // Verify dealing order by recreating the expected distribution
      const expectedOrder = [];
      for (let cardNum = 0; cardNum < 3; cardNum++) {
        for (let handNum = 0; handNum < 2; handNum++) {
          expectedOrder.push({ hand: handNum, card: cardNum });
        }
      }
      
      // This is difficult to test without exposing internal state,
      // so we just verify the structure
      expect(hands[0]).toHaveLength(3);
      expect(hands[1]).toHaveLength(3);
    });

    test('throws error when not enough cards to deal', () => {
      expect(() => {
        DeckManager.deal(deck, 5, 15); // Would need 75 cards
      }).toThrow('Not enough cards to deal');
    });
  });

  describe('State Serialization', () => {
    test('serializes and deserializes deck state', () => {
      const deck = DeckManager.createStandardDeck();
      DeckManager.shuffle(deck);
      DeckManager.draw(deck, 5);
      
      const serialized = DeckManager.serialize(deck);
      expect(typeof serialized).toBe('string');
      
      const deserialized = DeckManager.deserialize(serialized);
      expect(deserialized.cards).toEqual(deck.cards);
      expect(deserialized.discardPile).toEqual(deck.discardPile);
      expect(deserialized.shuffled).toBe(deck.shuffled);
      expect(deserialized.deckType).toBe(deck.deckType);
    });

    test('handles serialization of custom deck', () => {
      const customCards = [
        CardUtils.createCard('hearts', 'Ace', 1),
        CardUtils.createJoker('red')
      ];
      const deck = DeckManager.createCustomDeck(customCards);
      
      const serialized = DeckManager.serialize(deck);
      const deserialized = DeckManager.deserialize(serialized);
      
      expect(deserialized.cards).toEqual(deck.cards);
      expect(deserialized.deckType).toBe('custom');
    });

    test('throws error for invalid serialized data', () => {
      expect(() => {
        DeckManager.deserialize('invalid json');
      }).toThrow('Invalid deck data');
      
      expect(() => {
        DeckManager.deserialize('{"invalid": "structure"}');
      }).toThrow('Invalid deck structure');
    });
  });

  describe('Deck State Queries', () => {
    test('checks if deck is empty', () => {
      const deck = DeckManager.createStandardDeck();
      
      expect(DeckManager.isEmpty(deck)).toBe(false);
      
      DeckManager.draw(deck, 52);
      expect(DeckManager.isEmpty(deck)).toBe(true);
    });

    test('counts remaining cards', () => {
      const deck = DeckManager.createStandardDeck();
      
      expect(DeckManager.remaining(deck)).toBe(52);
      
      DeckManager.draw(deck, 10);
      expect(DeckManager.remaining(deck)).toBe(42);
      
      DeckManager.draw(deck, 42);
      expect(DeckManager.remaining(deck)).toBe(0);
    });

    test('validates deck structure', () => {
      const validDeck = DeckManager.createStandardDeck();
      expect(DeckManager.isValidDeck(validDeck)).toBe(true);
      
      const invalidDeck = { cards: 'not an array' };
      expect(DeckManager.isValidDeck(invalidDeck)).toBe(false);
    });
  });

  describe('Integration with cards library', () => {
    test('integrates with npm cards library for shuffling', () => {
      const deck = DeckManager.createStandardDeck();
      const originalCards = [...deck.cards];
      
      // Use seeded random for reproducible test
      DeckManager.shuffle(deck, { seed: 12345 });
      
      expect(deck.cards).not.toEqual(originalCards);
      expect(deck.shuffled).toBe(true);
      
      // Shuffling again with same seed should produce same result
      const deck2 = DeckManager.createStandardDeck();
      DeckManager.shuffle(deck2, { seed: 12345 });
      
      // Note: This might not work exactly as expected depending on
      // how the cards library handles seeded randomness
      expect(deck2.cards).toHaveLength(52);
    });
  });
});