const HandManager = require('../../../src/framework/cards/HandManager');
const CardUtils = require('../../../src/framework/cards/CardUtils');
const DeckManager = require('../../../src/framework/cards/DeckManager');

describe('HandManager', () => {
  describe('Hand Creation', () => {
    test('creates empty hand for player', () => {
      const hand = HandManager.createHand('player1');
      
      expect(hand.cards).toHaveLength(0);
      expect(hand.playerId).toBe('player1');
      expect(hand.maxSize).toBeUndefined();
    });

    test('creates hand with max size limit', () => {
      const hand = HandManager.createHand('player1', 7);
      
      expect(hand.maxSize).toBe(7);
      expect(hand.playerId).toBe('player1');
    });

    test('validates player ID', () => {
      expect(() => {
        HandManager.createHand('');
      }).toThrow('Player ID is required');
      
      expect(() => {
        HandManager.createHand(null);
      }).toThrow('Player ID is required');
    });
  });

  describe('Card Management', () => {
    let hand;
    let testCards;

    beforeEach(() => {
      hand = HandManager.createHand('player1', 5);
      testCards = [
        CardUtils.createCard('hearts', 'Ace', 1),
        CardUtils.createCard('spades', 'King', 13),
        CardUtils.createCard('diamonds', 'Queen', 12),
        CardUtils.createCard('clubs', 'Jack', 11),
        CardUtils.createCard('hearts', 'Ten', 10)
      ];
    });

    test('adds cards to hand', () => {
      const success = HandManager.addCard(hand, testCards[0]);
      
      expect(success).toBe(true);
      expect(hand.cards).toHaveLength(1);
      expect(hand.cards[0]).toEqual(testCards[0]);
    });

    test('adds multiple cards to hand', () => {
      HandManager.addCards(hand, testCards.slice(0, 3));
      
      expect(hand.cards).toHaveLength(3);
      expect(hand.cards).toEqual(testCards.slice(0, 3));
    });

    test('enforces max size limit', () => {
      // Fill hand to max size
      HandManager.addCards(hand, testCards);
      expect(hand.cards).toHaveLength(5);
      
      // Try to add one more card
      const extraCard = CardUtils.createCard('hearts', 'Nine', 9);
      const success = HandManager.addCard(hand, extraCard);
      
      expect(success).toBe(false);
      expect(hand.cards).toHaveLength(5);
    });

    test('allows unlimited size when no max set', () => {
      const unlimitedHand = HandManager.createHand('player1');
      const manyCards = [];
      
      // Create 10 cards
      for (let i = 1; i <= 10; i++) {
        manyCards.push(CardUtils.createCard('hearts', 'Ace', 1));
      }
      
      HandManager.addCards(unlimitedHand, manyCards);
      expect(unlimitedHand.cards).toHaveLength(10);
    });

    test('removes card by index', () => {
      HandManager.addCards(hand, testCards.slice(0, 3));
      
      const removedCard = HandManager.removeCard(hand, 1);
      
      expect(removedCard).toEqual(testCards[1]);
      expect(hand.cards).toHaveLength(2);
      expect(hand.cards).toEqual([testCards[0], testCards[2]]);
    });

    test('removes card by card object', () => {
      HandManager.addCards(hand, testCards.slice(0, 3));
      
      const success = HandManager.removeCardByValue(hand, testCards[1]);
      
      expect(success).toBe(true);
      expect(hand.cards).toHaveLength(2);
      expect(hand.cards).toEqual([testCards[0], testCards[2]]);
    });

    test('handles invalid remove operations', () => {
      HandManager.addCards(hand, testCards.slice(0, 2));
      
      // Invalid index
      const removedCard = HandManager.removeCard(hand, 5);
      expect(removedCard).toBeNull();
      
      // Card not in hand
      const success = HandManager.removeCardByValue(hand, testCards[3]);
      expect(success).toBe(false);
    });
  });

  describe('Card Search and Queries', () => {
    let hand;
    let testCards;

    beforeEach(() => {
      hand = HandManager.createHand('player1');
      testCards = [
        CardUtils.createCard('hearts', 'Ace', 1),
        CardUtils.createCard('spades', 'King', 13),
        CardUtils.createCard('diamonds', 'Queen', 12),
        CardUtils.createCard('clubs', 'Jack', 11),
        CardUtils.createCard('hearts', 'Ten', 10)
      ];
      HandManager.addCards(hand, testCards);
    });

    test('finds card by predicate', () => {
      const aceIndex = HandManager.findCard(hand, card => card.rank === 'Ace');
      expect(aceIndex).toBe(0);
      
      const heartIndex = HandManager.findCard(hand, card => card.suit === 'hearts');
      expect(heartIndex).toBe(0); // First heart found
      
      const nonExistentIndex = HandManager.findCard(hand, card => card.rank === 'Two');
      expect(nonExistentIndex).toBe(-1);
    });

    test('finds all cards matching predicate', () => {
      const hearts = HandManager.findAllCards(hand, card => card.suit === 'hearts');
      expect(hearts).toHaveLength(2);
      expect(hearts[0].rank).toBe('Ace');
      expect(hearts[1].rank).toBe('Ten');
      
      const faceCards = HandManager.findAllCards(hand, card => CardUtils.isFaceCard(card));
      expect(faceCards).toHaveLength(3); // King, Queen, Jack
    });

    test('checks if hand contains card', () => {
      const hasAce = HandManager.hasCard(hand, card => card.rank === 'Ace');
      expect(hasAce).toBe(true);
      
      const hasTwo = HandManager.hasCard(hand, card => card.rank === 'Two');
      expect(hasTwo).toBe(false);
    });

    test('counts cards matching predicate', () => {
      const heartCount = HandManager.countCards(hand, card => card.suit === 'hearts');
      expect(heartCount).toBe(2);
      
      const redCount = HandManager.countCards(hand, card => CardUtils.isRed(card));
      expect(redCount).toBe(3); // hearts Ace, diamonds Queen, hearts Ten
    });
  });

  describe('Hand Sorting', () => {
    let hand;
    let testCards;

    beforeEach(() => {
      hand = HandManager.createHand('player1');
      testCards = [
        CardUtils.createCard('hearts', 'Ten', 10),
        CardUtils.createCard('spades', 'Ace', 1),
        CardUtils.createCard('diamonds', 'King', 13),
        CardUtils.createCard('clubs', 'Five', 5),
        CardUtils.createCard('hearts', 'Queen', 12)
      ];
      HandManager.addCards(hand, testCards);
    });

    test('sorts by rank/value', () => {
      HandManager.sortBy(hand, 'rank');
      
      const values = hand.cards.map(card => card.value);
      expect(values).toEqual([1, 5, 10, 12, 13]); // Ace, Five, Ten, Queen, King
    });

    test('sorts by suit', () => {
      HandManager.sortBy(hand, 'suit');
      
      const suits = hand.cards.map(card => card.suit);
      expect(suits).toEqual(['clubs', 'diamonds', 'hearts', 'hearts', 'spades']);
    });

    test('sorts by color', () => {
      HandManager.sortBy(hand, 'color');
      
      const colors = hand.cards.map(card => card.color);
      // Should group all black cards first, then red cards
      const blackCount = colors.filter(c => c === 'black').length;
      const redCount = colors.filter(c => c === 'red').length;
      
      expect(blackCount).toBe(2); // spades, clubs
      expect(redCount).toBe(3); // hearts, diamonds, hearts
      
      // First cards should all be black or all be red
      const firstHalfColor = colors[0];
      expect(colors.slice(0, blackCount).every(c => c === firstHalfColor)).toBe(true);
    });

    test('sorts with custom comparator', () => {
      // Sort by value descending
      HandManager.sortByCustom(hand, (a, b) => b.value - a.value);
      
      const values = hand.cards.map(card => card.value);
      expect(values).toEqual([13, 12, 10, 5, 1]); // King, Queen, Ten, Five, Ace
    });
  });

  describe('Hand Validation and Rules', () => {
    let hand;

    beforeEach(() => {
      hand = HandManager.createHand('player1');
    });

    test('validates hand structure', () => {
      expect(HandManager.isValidHand(hand)).toBe(true);
      
      const invalidHand = { cards: 'not an array' };
      expect(HandManager.isValidHand(invalidHand)).toBe(false);
      
      const missingProps = { cards: [] };
      expect(HandManager.isValidHand(missingProps)).toBe(false);
    });

    test('checks if card can be played based on rules', () => {
      const card = CardUtils.createCard('hearts', 'Ace', 1);
      HandManager.addCard(hand, card);
      
      const simpleRules = {
        canPlayAny: true
      };
      
      expect(HandManager.canPlay(hand, card, simpleRules)).toBe(true);
      
      const restrictiveRules = {
        canPlayAny: false,
        allowedSuits: ['spades']
      };
      
      expect(HandManager.canPlay(hand, card, restrictiveRules)).toBe(false);
    });

    test('validates hand size constraints', () => {
      const limitedHand = HandManager.createHand('player1', 3);
      
      expect(HandManager.canAddCard(limitedHand)).toBe(true);
      
      // Fill to capacity
      const cards = [
        CardUtils.createCard('hearts', 'Ace', 1),
        CardUtils.createCard('spades', 'King', 13),
        CardUtils.createCard('diamonds', 'Queen', 12)
      ];
      HandManager.addCards(limitedHand, cards);
      
      expect(HandManager.canAddCard(limitedHand)).toBe(false);
    });
  });

  describe('Hand Statistics', () => {
    let hand;

    beforeEach(() => {
      hand = HandManager.createHand('player1');
      const cards = [
        CardUtils.createCard('hearts', 'Ace', 1),
        CardUtils.createCard('hearts', 'King', 13),
        CardUtils.createCard('spades', 'Queen', 12),
        CardUtils.createCard('diamonds', 'Jack', 11),
        CardUtils.createCard('clubs', 'Ten', 10)
      ];
      HandManager.addCards(hand, cards);
    });

    test('calculates hand statistics', () => {
      const stats = HandManager.getHandStats(hand);
      
      expect(stats.totalCards).toBe(5);
      expect(stats.totalValue).toBe(47); // 1+13+12+11+10
      expect(stats.averageValue).toBe(9.4);
      expect(stats.suitCounts).toEqual({
        hearts: 2,
        spades: 1,
        diamonds: 1,
        clubs: 1
      });
      expect(stats.colorCounts).toEqual({
        red: 3, // hearts x2, diamonds x1
        black: 2 // spades x1, clubs x1
      });
      expect(stats.faceCardCount).toBe(3); // King, Queen, Jack
    });

    test('gets hand value for specific game rules', () => {
      // Blackjack-style counting where Ace = 1 or 11
      const blackjackValue = HandManager.getHandValue(hand, {
        aceValue: 11,
        faceValue: 10
      });
      
      // Ace=11, King=10, Queen=10, Jack=10, Ten=10 = 51
      expect(blackjackValue).toBe(51);
      
      // Poker-style where Ace is high
      const pokerValue = HandManager.getHandValue(hand, {
        aceValue: 14,
        useRankValue: true
      });
      
      // Ace=14, King=13, Queen=12, Jack=11, Ten=10 = 60
      expect(pokerValue).toBe(60);
    });
  });

  describe('Integration with DeckManager', () => {
    test('deals cards from deck to hands', () => {
      const deck = DeckManager.createStandardDeck();
      DeckManager.shuffle(deck);
      
      const hands = [
        HandManager.createHand('player1'),
        HandManager.createHand('player2'),
        HandManager.createHand('player3')
      ];
      
      // Deal 5 cards to each hand
      const dealtCards = DeckManager.deal(deck, 3, 5);
      dealtCards.forEach((cards, index) => {
        HandManager.addCards(hands[index], cards);
      });
      
      hands.forEach(hand => {
        expect(hand.cards).toHaveLength(5);
        hand.cards.forEach(card => {
          expect(CardUtils.isValidCard(card)).toBe(true);
        });
      });
      
      expect(DeckManager.remaining(deck)).toBe(37); // 52 - 15 = 37
    });
  });
});