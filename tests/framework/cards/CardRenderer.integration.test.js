const CardRenderer = require('../../../src/framework/cards/CardRenderer');
const CardUtils = require('../../../src/framework/cards/CardUtils');
const ImageRenderer = require('../../../src/framework/ImageRenderer');

describe('CardRenderer Integration', () => {
  describe('Integration with ImageRenderer Framework', () => {
    test('generates SVG that can be wrapped by ImageRenderer', async () => {
      const card = CardUtils.createCard('hearts', 'Ace');
      const cardSvg = CardRenderer.renderCard(card);
      
      // Wrap the card SVG in ImageRenderer frame
      const completeSvg = ImageRenderer.wrapSVGContent(cardSvg, {
        width: 100,
        height: 140,
        title: 'Card Test'
      });
      
      expect(completeSvg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(completeSvg).toContain('<svg width="100" height="140"');
      expect(completeSvg).toContain('<title>Card Test</title>');
      expect(completeSvg).toContain('♥'); // Card content
      expect(completeSvg).toContain('A'); // Ace rank
      expect(completeSvg).toContain('</svg>');
    });

    test('generates SVG that can be converted to PNG', async () => {
      const cards = [
        CardUtils.createCard('hearts', 'King'),
        CardUtils.createCard('spades', 'Queen')
      ];
      
      const handSvg = CardRenderer.renderHand(cards, { 
        layout: 'row', 
        spacing: 10 
      });
      
      const completeSvg = ImageRenderer.wrapSVGContent(handSvg, {
        width: 150,
        height: 100,
        title: 'Hand Test'
      });
      
      // This should work with ImageRenderer.svgToPng()
      expect(typeof completeSvg).toBe('string');
      expect(completeSvg.length).toBeGreaterThan(0);
      
      // Test the PNG conversion would work (we don't actually call it to avoid Sharp dependency)
      expect(completeSvg).toContain('<svg');
      expect(completeSvg).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    test('integrates with ImageRenderer coordinate system', () => {
      const card = CardUtils.createCard('diamonds', 'Seven');
      
      // Render card at specific coordinates that would work with ImageRenderer content area
      const cardSvg = CardRenderer.renderCard(card, {
        x: 50, // Within ImageRenderer content area
        y: 30,
        width: 60,
        height: 84
      });
      
      expect(cardSvg).toContain('x="50"');
      expect(cardSvg).toContain('y="30"');
      expect(cardSvg).toContain('width="60"');
      expect(cardSvg).toContain('height="84"');
    });

    test('works with ImageRenderer styling system', () => {
      const card = CardUtils.createCard('clubs', 'Jack');
      const cardSvg = CardRenderer.renderCard(card, {
        selected: true,
        highlighted: false
      });
      
      // Should use compatible color scheme
      expect(cardSvg).toContain('#ffd700'); // Gold selection
      expect(cardSvg).toContain('Arial, sans-serif'); // Compatible font
      expect(cardSvg).toContain('#000000'); // Club color
    });
  });

  describe('Full Card Game Scene Rendering', () => {
    test('renders complete solitaire-style game layout', () => {
      const deck = [
        CardUtils.createCard('hearts', 'Ace'),
        CardUtils.createCard('spades', 'Two'),
        CardUtils.createCard('diamonds', 'Three')
      ];
      
      const hand = deck.slice(0, 2);
      const deckPile = deck.length - hand.length;
      
      // Create a complete game scene
      let gameScene = '';
      
      // Add deck pile
      gameScene += CardRenderer.renderDeckPile(deckPile, {
        x: 20,
        y: 20
      });
      
      // Add player hand
      gameScene += CardRenderer.renderHand(hand, {
        x: 20,
        y: 120,
        layout: 'row',
        spacing: 15
      });
      
      // Wrap in ImageRenderer frame
      const completeSvg = ImageRenderer.wrapSVGContent(gameScene, {
        width: 300,
        height: 250,
        title: 'Solitaire Game'
      });
      
      expect(completeSvg).toContain('Solitaire Game');
      expect(completeSvg).toContain('♥'); // Hearts card
      expect(completeSvg).toContain('♠'); // Spades card
      expect(completeSvg).toContain('1'); // Deck count
    });

    test('renders multiple hands for multi-player card games', () => {
      const player1Hand = [
        CardUtils.createCard('hearts', 'King'),
        CardUtils.createCard('clubs', 'Queen')
      ];
      
      const player2Hand = [
        CardUtils.createCard('spades', 'Jack'),
        CardUtils.createCard('diamonds', 'Ten')
      ];
      
      let gameScene = '';
      
      // Player 1 hand (bottom)
      gameScene += CardRenderer.renderHand(player1Hand, {
        x: 50,
        y: 200,
        layout: 'row',
        spacing: 20,
        faceUp: true
      });
      
      // Player 2 hand (top, face down)
      gameScene += CardRenderer.renderHand(player2Hand, {
        x: 50,
        y: 20,
        layout: 'row',
        spacing: 20,
        faceUp: false
      });
      
      const completeSvg = ImageRenderer.wrapSVGContent(gameScene, {
        width: 300,
        height: 350,
        title: 'Two Player Card Game'
      });
      
      expect(completeSvg).toContain('Two Player Card Game');
      expect(completeSvg).toContain(CardRenderer.COLORS.cardBack); // Face down cards
      expect(completeSvg).toContain('♥'); // Face up cards
    });
  });

  describe('Performance with ImageRenderer', () => {
    test('efficiently renders large card collections', () => {
      const manyCards = Array(20).fill(null).map((_, i) => {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['Ace', 'Two', 'Three', 'Four', 'Five'];
        return CardUtils.createCard(
          suits[i % suits.length], 
          ranks[i % ranks.length]
        );
      });
      
      const startTime = Date.now();
      
      const handSvg = CardRenderer.renderHand(manyCards, {
        layout: 'grid',
        cardsPerRow: 5
      });
      
      const completeSvg = ImageRenderer.wrapSVGContent(handSvg, {
        width: 400,
        height: 600,
        title: 'Large Hand'
      });
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(completeSvg.length).toBeGreaterThan(1000); // Substantial content
      expect(completeSvg).toContain('Large Hand');
    });
  });

  describe('Error Handling Integration', () => {
    test('handles rendering errors gracefully with ImageRenderer', () => {
      const invalidCards = [null, undefined, { invalid: 'card' }];
      
      const handSvg = CardRenderer.renderHand(invalidCards);
      const completeSvg = ImageRenderer.wrapSVGContent(handSvg, {
        width: 200,
        height: 150,
        title: 'Error Test'
      });
      
      expect(completeSvg).toContain('Error Test');
      expect(completeSvg).toContain('<svg'); // Still valid SVG
      expect(completeSvg).toContain('</svg>');
    });

    test('integrates with ImageRenderer error image creation', async () => {
      // Simulate a rendering error scenario
      const errorMessage = 'Card rendering failed';
      
      // This would be how a game plugin handles card rendering errors
      try {
        // Simulate some error in card processing
        throw new Error('Card data corrupted');
      } catch (error) {
        // Use ImageRenderer's error image as fallback
        const errorBuffer = await ImageRenderer.createErrorImage(
          `Card Error: ${error.message}`,
          { width: 200, height: 150 }
        );
        
        expect(Buffer.isBuffer(errorBuffer)).toBe(true);
        expect(errorBuffer.length).toBeGreaterThan(0);
      }
    });
  });
});