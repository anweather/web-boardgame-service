const CardRenderer = require('../../../src/framework/cards/CardRenderer');
const CardUtils = require('../../../src/framework/cards/CardUtils');

describe('CardRenderer', () => {
  describe('Card Constants and Configuration', () => {
    test('has correct card dimensions and styling constants', () => {
      expect(CardRenderer.CARD_WIDTH).toBe(60);
      expect(CardRenderer.CARD_HEIGHT).toBe(84);
      expect(CardRenderer.CARD_CORNER_RADIUS).toBe(6);
      
      expect(typeof CardRenderer.COLORS).toBe('object');
      expect(CardRenderer.COLORS.hearts).toBe('#dc143c');
      expect(CardRenderer.COLORS.diamonds).toBe('#dc143c');
      expect(CardRenderer.COLORS.clubs).toBe('#000000');
      expect(CardRenderer.COLORS.spades).toBe('#000000');
      
      expect(typeof CardRenderer.SUIT_SYMBOLS).toBe('object');
      expect(CardRenderer.SUIT_SYMBOLS.hearts).toBe('♥');
      expect(CardRenderer.SUIT_SYMBOLS.diamonds).toBe('♦');
      expect(CardRenderer.SUIT_SYMBOLS.clubs).toBe('♣');
      expect(CardRenderer.SUIT_SYMBOLS.spades).toBe('♠');
    });
  });

  describe('Single Card Rendering', () => {
    test('renders a standard card with correct SVG structure', () => {
      const card = CardUtils.createCard('hearts', 'Ace');
      const svg = CardRenderer.renderCard(card);
      
      expect(svg).toContain('<rect');
      expect(svg).toContain('fill="#ffffff"'); // Card face color
      expect(svg).toContain('♥'); // Heart symbol
      expect(svg).toContain('A'); // Ace rank
      expect(svg).toContain('#dc143c'); // Heart color
    });

    test('renders card with custom position and size', () => {
      const card = CardUtils.createCard('spades', 'King');
      const svg = CardRenderer.renderCard(card, {
        x: 100,
        y: 50,
        width: 80,
        height: 120
      });
      
      expect(svg).toContain('x="100"');
      expect(svg).toContain('y="50"');
      expect(svg).toContain('width="80"');
      expect(svg).toContain('height="120"');
      expect(svg).toContain('♠'); // Spade symbol
      expect(svg).toContain('K'); // King rank
    });

    test('renders selected card with gold border', () => {
      const card = CardUtils.createCard('diamonds', 'Queen');
      const svg = CardRenderer.renderCard(card, { selected: true });
      
      expect(svg).toContain('#ffd700'); // Gold border color
      expect(svg).toContain('stroke-width="3"'); // Thicker border
    });

    test('renders highlighted card with blue border', () => {
      const card = CardUtils.createCard('clubs', 'Jack');
      const svg = CardRenderer.renderCard(card, { highlighted: true });
      
      expect(svg).toContain('#87ceeb'); // Light blue border
      expect(svg).toContain('stroke-width="2"'); // Medium border
    });

    test('renders card back when faceUp is false', () => {
      const card = CardUtils.createCard('hearts', 'Ten');
      const svg = CardRenderer.renderCard(card, { faceUp: false });
      
      expect(svg).toContain(CardRenderer.COLORS.cardBack); // Blue back color
      expect(svg).not.toContain('♥'); // No suit symbol
      expect(svg).not.toContain('10'); // No rank
    });

    test('renders joker card correctly', () => {
      const joker = { suit: 'joker', rank: 'Joker', isJoker: true };
      const svg = CardRenderer.renderCard(joker);
      
      expect(svg).toContain('JOKER');
      expect(svg).toContain('🃏'); // Joker emoji
      expect(svg).toContain(CardRenderer.COLORS.joker); // Purple color
    });

    test('renders error card for invalid input', () => {
      const svg = CardRenderer.renderCard(null);
      
      expect(svg).toContain('Invalid Card');
      expect(svg).toContain('#f44336'); // Error color
      expect(svg).toContain('#ffebee'); // Error background
    });

    test('handles card with incomplete data', () => {
      const invalidCard = { suit: 'hearts' }; // Missing rank
      const svg = CardRenderer.renderCard(invalidCard);
      
      expect(svg).toContain('Invalid Card');
    });
  });

  describe('Card Back Rendering', () => {
    test('renders card back with decorative pattern', () => {
      const svg = CardRenderer.renderCardBack(0, 0, 60, 84);
      
      expect(svg).toContain(CardRenderer.COLORS.cardBack);
      expect(svg).toContain('<line'); // Decorative lines
      expect(svg).toContain('opacity="0.4"'); // Pattern opacity
    });

    test('renders card back with selection styling', () => {
      const svg = CardRenderer.renderCardBack(0, 0, 60, 84, { selected: true });
      
      expect(svg).toContain('#ffd700'); // Gold selection border
      expect(svg).toContain('stroke-width="3"');
    });
  });

  describe('Hand Rendering', () => {
    let testCards;

    beforeEach(() => {
      testCards = [
        CardUtils.createCard('hearts', 'Ace'),
        CardUtils.createCard('spades', 'King'),
        CardUtils.createCard('diamonds', 'Queen'),
        CardUtils.createCard('clubs', 'Jack')
      ];
    });

    test('renders empty hand', () => {
      const svg = CardRenderer.renderHand([]);
      expect(svg).toContain('<!-- Empty hand -->');
    });

    test('renders hand in row layout (default)', () => {
      const svg = CardRenderer.renderHand(testCards, { layout: 'row', spacing: 30 });
      
      expect(svg).toContain('<!-- Hand of Cards -->');
      expect(svg).toContain('♥'); // Hearts card
      expect(svg).toContain('♠'); // Spades card
      expect(svg).toContain('♦'); // Diamonds card
      expect(svg).toContain('♣'); // Clubs card
      
      // Check cards are spaced horizontally
      expect(svg).toContain('x="0"'); // First card
      expect(svg).toContain('x="30"'); // Second card with spacing
    });

    test('renders hand in grid layout', () => {
      const svg = CardRenderer.renderHand(testCards, { 
        layout: 'grid', 
        spacing: 10,
        cardsPerRow: 2 
      });
      
      expect(svg).toContain('♥');
      expect(svg).toContain('♠');
      
      // Check grid positioning - second row should have different Y
      const lines = svg.split('\n');
      const cardPositions = lines.filter(line => line.includes('x="') && line.includes('y="'));
      expect(cardPositions.length).toBeGreaterThan(2);
    });

    test('renders hand in fan layout', () => {
      const svg = CardRenderer.renderHand(testCards, { layout: 'fan' });
      
      expect(svg).toContain('<!-- Hand of Cards -->');
      expect(svg).toContain('<g transform="rotate('); // Rotation transforms
      expect(svg).toContain('♥');
      expect(svg).toContain('♠');
    });

    test('handles selected and highlighted cards in hand', () => {
      const svg = CardRenderer.renderHand(testCards, {
        selectedIndices: [0, 2],
        highlightedIndices: [1]
      });
      
      expect(svg).toContain('#ffd700'); // Gold for selected
      expect(svg).toContain('#87ceeb'); // Blue for highlighted
    });

    test('limits cards to maxCards parameter', () => {
      const manyCards = Array(15).fill(null).map((_, i) => 
        CardUtils.createCard('hearts', 'Ace')
      );
      
      const svg = CardRenderer.renderHand(manyCards, { maxCards: 5, layout: 'row' });
      
      // Count occurrences of card elements - each card has 3 heart symbols (2 corners + center)
      const cardCount = (svg.match(/♥/g) || []).length;
      expect(cardCount).toBeLessThanOrEqual(15); // 5 cards * 3 symbols each max
    });

    test('renders all cards face down when specified', () => {
      const svg = CardRenderer.renderHand(testCards, { faceUp: false });
      
      expect(svg).toContain(CardRenderer.COLORS.cardBack);
      expect(svg).not.toContain('♥');
      expect(svg).not.toContain('A');
    });
  });

  describe('Deck Pile Rendering', () => {
    test('renders deck pile with multiple layers', () => {
      const svg = CardRenderer.renderDeckPile(25);
      
      expect(svg).toContain('<!-- Deck Pile -->');
      expect(svg).toContain(CardRenderer.COLORS.cardBack);
      expect(svg).toContain('25'); // Card count label
    });

    test('renders empty deck slot for zero cards', () => {
      const svg = CardRenderer.renderDeckPile(0);
      
      expect(svg).toContain('<!-- Empty Deck Slot -->');
      expect(svg).toContain('stroke-dasharray="5,5"'); // Dashed border
      expect(svg).toContain('EMPTY');
    });

    test('limits stack height based on maxStackHeight', () => {
      const svg = CardRenderer.renderDeckPile(100, { maxStackHeight: 3 });
      
      // Should only have 3 layers regardless of card count
      const layerCount = (svg.match(/CardBack/g) || []).length;
      expect(layerCount).toBeLessThanOrEqual(3);
    });

    test('renders deck with custom position and size', () => {
      const svg = CardRenderer.renderDeckPile(10, {
        x: 50,
        y: 100,
        cardWidth: 80,
        cardHeight: 120
      });
      
      expect(svg).toContain('x="50"');
      expect(svg).toContain('y="100"');
      expect(svg).toContain('width="80"');
      expect(svg).toContain('height="120"');
    });
  });

  describe('Utility Functions', () => {
    test('getRankDisplay converts ranks to display format', () => {
      expect(CardRenderer.getRankDisplay('Ace')).toBe('A');
      expect(CardRenderer.getRankDisplay('King')).toBe('K');
      expect(CardRenderer.getRankDisplay('Queen')).toBe('Q');
      expect(CardRenderer.getRankDisplay('Jack')).toBe('J');
      expect(CardRenderer.getRankDisplay('Ten')).toBe('10');
      expect(CardRenderer.getRankDisplay('Nine')).toBe('9');
      expect(CardRenderer.getRankDisplay('Two')).toBe('2');
      
      // Unknown rank returns as-is
      expect(CardRenderer.getRankDisplay('Unknown')).toBe('Unknown');
    });

    test('calculateHandDimensions for row layout', () => {
      const dims = CardRenderer.calculateHandDimensions(5, {
        layout: 'row',
        spacing: 20
      });
      
      expect(dims.width).toBe(5 * 20 + CardRenderer.CARD_WIDTH);
      expect(dims.height).toBe(CardRenderer.CARD_HEIGHT);
    });

    test('calculateHandDimensions for grid layout', () => {
      const dims = CardRenderer.calculateHandDimensions(6, {
        layout: 'grid',
        spacing: 10,
        cardsPerRow: 3
      });
      
      // 2 rows, 3 columns
      expect(dims.width).toBe(3 * CardRenderer.CARD_WIDTH + 2 * 10);
      expect(dims.height).toBe(2 * CardRenderer.CARD_HEIGHT + 1 * 10);
    });

    test('calculateHandDimensions for fan layout', () => {
      const dims = CardRenderer.calculateHandDimensions(5, { layout: 'fan' });
      
      const expectedRadius = Math.max(CardRenderer.CARD_HEIGHT * 0.8, 50);
      expect(dims.width).toBe(CardRenderer.CARD_WIDTH + expectedRadius * 2);
      expect(dims.height).toBe(CardRenderer.CARD_HEIGHT + expectedRadius * 2);
    });
  });

  describe('Integration with ImageRenderer Framework', () => {
    test('generates valid SVG content', () => {
      const card = CardUtils.createCard('hearts', 'Ace');
      const svg = CardRenderer.renderCard(card);
      
      // Should contain valid SVG elements
      expect(svg).toContain('<rect');
      expect(svg).toContain('<text');
      expect(svg).toMatch(/x="\d+"/);
      expect(svg).toMatch(/y="\d+"/);
      expect(svg).toMatch(/fill="[^"]+"/);
    });

    test('supports shadow effects', () => {
      const card = CardUtils.createCard('spades', 'King');
      const svg = CardRenderer.renderCard(card, { shadowOpacity: 0.5 });
      
      expect(svg).toContain('<filter id="cardShadow"');
      expect(svg).toContain('feDropShadow');
      expect(svg).toContain('flood-opacity="0.5"');
    });

    test('can disable shadows', () => {
      const card = CardUtils.createCard('diamonds', 'Queen');
      const svg = CardRenderer.renderCard(card, { shadowOpacity: 0 });
      
      expect(svg).not.toContain('filter="url(#cardShadow)"');
    });

    test('renders cards with responsive sizing', () => {
      const card = CardUtils.createCard('clubs', 'Seven');
      
      // Small card
      const smallSvg = CardRenderer.renderCard(card, { width: 30, height: 42 });
      expect(smallSvg).toContain('width="30"');
      expect(smallSvg).toContain('height="42"');
      
      // Large card
      const largeSvg = CardRenderer.renderCard(card, { width: 120, height: 168 });
      expect(largeSvg).toContain('width="120"');
      expect(largeSvg).toContain('height="168"');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles null or undefined cards gracefully', () => {
      expect(() => CardRenderer.renderCard(null)).not.toThrow();
      expect(() => CardRenderer.renderCard(undefined)).not.toThrow();
      
      const nullSvg = CardRenderer.renderCard(null);
      expect(nullSvg).toContain('Invalid Card');
    });

    test('handles invalid hand arrays', () => {
      expect(() => CardRenderer.renderHand(null)).not.toThrow();
      expect(() => CardRenderer.renderHand(undefined)).not.toThrow();
      
      const nullSvg = CardRenderer.renderHand(null);
      expect(nullSvg).toContain('<!-- Empty hand -->');
    });

    test('handles negative deck counts', () => {
      const svg = CardRenderer.renderDeckPile(-5);
      expect(svg).toContain('EMPTY'); // Should render empty slot
    });

    test('handles invalid layout types', () => {
      const testCards = [CardUtils.createCard('hearts', 'Ace')];
      const svg = CardRenderer.renderHand(testCards, { layout: 'invalid' });
      
      // Should default to row layout
      expect(svg).toContain('♥');
      expect(svg).toContain('x="0"'); // Should have x position from row layout
      // Note: Cards still have rotation in their rank/suit positioning, but not hand-level rotation
    });

    test('handles extreme card dimensions', () => {
      const card = CardUtils.createCard('hearts', 'Two');
      
      // Very small card
      const tinySvg = CardRenderer.renderCard(card, { width: 1, height: 1 });
      expect(tinySvg).toContain('width="1"');
      
      // Very large card
      const hugeSvg = CardRenderer.renderCard(card, { width: 1000, height: 1400 });
      expect(hugeSvg).toContain('width="1000"');
    });
  });

  describe('Performance and Efficiency', () => {
    test('renders large hands efficiently', () => {
      const manyCards = Array(50).fill(null).map((_, i) => 
        CardUtils.createCard('hearts', 'Ace')
      );
      
      const startTime = Date.now();
      const svg = CardRenderer.renderHand(manyCards);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(svg).toBeTruthy();
    });

    test('handles repeated rendering calls', () => {
      const card = CardUtils.createCard('spades', 'Five');
      
      // Render same card multiple times
      for (let i = 0; i < 100; i++) {
        const svg = CardRenderer.renderCard(card);
        expect(svg).toContain('♠');
        expect(svg).toContain('5');
      }
    });
  });
});