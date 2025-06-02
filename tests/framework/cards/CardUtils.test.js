const CardUtils = require('../../../src/framework/cards/CardUtils');

describe('CardUtils', () => {
  describe('Card Creation and Validation', () => {
    test('creates card with valid suit, rank, and value', () => {
      const card = CardUtils.createCard('hearts', 'Ace', 1);
      
      expect(card.suit).toBe('hearts');
      expect(card.rank).toBe('Ace');
      expect(card.value).toBe(1);
      expect(card.color).toBe('red');
      expect(card.isJoker).toBe(false);
    });

    test('creates card with correct color for red suits', () => {
      const heartsCard = CardUtils.createCard('hearts', 'King', 13);
      const diamondsCard = CardUtils.createCard('diamonds', 'Queen', 12);
      
      expect(heartsCard.color).toBe('red');
      expect(diamondsCard.color).toBe('red');
    });

    test('creates card with correct color for black suits', () => {
      const spadesCard = CardUtils.createCard('spades', 'Jack', 11);
      const clubsCard = CardUtils.createCard('clubs', 'Ten', 10);
      
      expect(spadesCard.color).toBe('black');
      expect(clubsCard.color).toBe('black');
    });

    test('throws error for invalid suit', () => {
      expect(() => {
        CardUtils.createCard('invalid', 'Ace', 1);
      }).toThrow('Invalid suit: invalid');
    });

    test('throws error for invalid rank', () => {
      expect(() => {
        CardUtils.createCard('hearts', 'Invalid', 1);
      }).toThrow('Invalid rank: Invalid');
    });
  });

  describe('Card Color Detection', () => {
    test('identifies red cards correctly', () => {
      const redCard = CardUtils.createCard('hearts', 'Ace', 1);
      expect(CardUtils.isRed(redCard)).toBe(true);
      expect(CardUtils.isBlack(redCard)).toBe(false);
    });

    test('identifies black cards correctly', () => {
      const blackCard = CardUtils.createCard('spades', 'Ace', 1);
      expect(CardUtils.isBlack(blackCard)).toBe(true);
      expect(CardUtils.isRed(blackCard)).toBe(false);
    });
  });

  describe('Card Type Detection', () => {
    test('identifies face cards correctly', () => {
      const jack = CardUtils.createCard('hearts', 'Jack', 11);
      const queen = CardUtils.createCard('spades', 'Queen', 12);
      const king = CardUtils.createCard('diamonds', 'King', 13);
      const ace = CardUtils.createCard('clubs', 'Ace', 1);
      const number = CardUtils.createCard('hearts', 'Seven', 7);

      expect(CardUtils.isFaceCard(jack)).toBe(true);
      expect(CardUtils.isFaceCard(queen)).toBe(true);
      expect(CardUtils.isFaceCard(king)).toBe(true);
      expect(CardUtils.isFaceCard(ace)).toBe(false);
      expect(CardUtils.isFaceCard(number)).toBe(false);
    });

    test('identifies aces correctly', () => {
      const ace = CardUtils.createCard('hearts', 'Ace', 1);
      const king = CardUtils.createCard('spades', 'King', 13);

      expect(CardUtils.isAce(ace)).toBe(true);
      expect(CardUtils.isAce(king)).toBe(false);
    });
  });

  describe('Card Comparison', () => {
    test('compares card ranks correctly', () => {
      const ace = CardUtils.createCard('hearts', 'Ace', 1);
      const king = CardUtils.createCard('spades', 'King', 13);
      const seven = CardUtils.createCard('diamonds', 'Seven', 7);

      expect(CardUtils.compareRank(ace, king)).toBeLessThan(0);
      expect(CardUtils.compareRank(king, ace)).toBeGreaterThan(0);
      expect(CardUtils.compareRank(seven, seven)).toBe(0);
    });
  });

  describe('Card String Conversion', () => {
    test('converts card to string correctly', () => {
      const card = CardUtils.createCard('hearts', 'Ace', 1);
      expect(CardUtils.toString(card)).toBe('Ace of Hearts');
    });

    test('parses card from string correctly', () => {
      const cardString = 'King of Spades';
      const card = CardUtils.fromString(cardString);
      
      expect(card.suit).toBe('spades');
      expect(card.rank).toBe('King');
      expect(card.value).toBe(13);
      expect(card.color).toBe('black');
    });

    test('throws error for invalid card string', () => {
      expect(() => {
        CardUtils.fromString('Invalid Card String');
      }).toThrow('Invalid card string format');
    });
  });

  describe('Card Stacking Rules', () => {
    test('validates alternating color stacking', () => {
      const redCard = CardUtils.createCard('hearts', 'King', 13);
      const blackCard = CardUtils.createCard('spades', 'Queen', 12);
      const redCard2 = CardUtils.createCard('diamonds', 'Jack', 11);

      const alternatingRules = { requireAlternatingColors: true, requireDescending: true };
      
      expect(CardUtils.canStack(redCard, blackCard, alternatingRules)).toBe(true);
      expect(CardUtils.canStack(blackCard, redCard2, alternatingRules)).toBe(true);
      expect(CardUtils.canStack(redCard, redCard2, alternatingRules)).toBe(false);
    });

    test('validates descending rank stacking', () => {
      const king = CardUtils.createCard('hearts', 'King', 13);
      const queen = CardUtils.createCard('spades', 'Queen', 12);
      const jack = CardUtils.createCard('diamonds', 'Jack', 11);
      const ace = CardUtils.createCard('clubs', 'Ace', 1);

      const descendingRules = { requireDescending: true };
      
      expect(CardUtils.canStack(king, queen, descendingRules)).toBe(true);
      expect(CardUtils.canStack(queen, jack, descendingRules)).toBe(true);
      expect(CardUtils.canStack(jack, king, descendingRules)).toBe(false);
      expect(CardUtils.canStack(queen, ace, descendingRules)).toBe(false);
    });
  });

  describe('Standard Card Constants', () => {
    test('provides valid suits', () => {
      const suits = CardUtils.getSuits();
      expect(suits).toEqual(['hearts', 'diamonds', 'clubs', 'spades']);
    });

    test('provides valid ranks', () => {
      const ranks = CardUtils.getRanks();
      expect(ranks).toHaveLength(13);
      expect(ranks[0]).toEqual({ name: 'Ace', value: 1 });
      expect(ranks[12]).toEqual({ name: 'King', value: 13 });
    });
  });
});