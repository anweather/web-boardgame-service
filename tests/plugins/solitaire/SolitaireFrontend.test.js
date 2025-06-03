const SolitaireFrontend = require('../../../src/plugins/solitaire/SolitaireFrontend');

describe('SolitaireFrontend', () => {
  describe('Move Parsing - Text Input', () => {
    test('parses stock operations correctly', () => {
      expect(SolitaireFrontend.parseMove('draw')).toEqual({ action: 'draw_stock' });
      expect(SolitaireFrontend.parseMove('draw stock')).toEqual({ action: 'draw_stock' });
      expect(SolitaireFrontend.parseMove('reset')).toEqual({ action: 'reset_stock' });
      expect(SolitaireFrontend.parseMove('reset stock')).toEqual({ action: 'reset_stock' });
    });

    test('parses flip operations correctly', () => {
      const result = SolitaireFrontend.parseMove('flip tableau 3');
      expect(result).toEqual({
        action: 'flip_card',
        from: { type: 'tableau', column: 2 } // 0-based index
      });
    });

    test('rejects invalid tableau columns for flip', () => {
      expect(() => SolitaireFrontend.parseMove('flip tableau 0')).toThrow('Invalid tableau column');
      expect(() => SolitaireFrontend.parseMove('flip tableau 8')).toThrow('Invalid tableau column');
    });

    test('parses waste to foundation moves', () => {
      const result = SolitaireFrontend.parseMove('waste to foundation hearts');
      expect(result).toEqual({
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'foundation', suit: 'hearts' },
        cardCount: 1
      });
    });

    test('normalizes suit names correctly', () => {
      const tests = [
        ['hearts', 'hearts'],
        ['heart', 'hearts'],
        ['diamonds', 'diamonds'],
        ['diamond', 'diamonds'],
        ['clubs', 'clubs'],
        ['club', 'clubs'],
        ['spades', 'spades'],
        ['spade', 'spades']
      ];

      tests.forEach(([input, expected]) => {
        const result = SolitaireFrontend.parseMove(`waste to foundation ${input}`);
        expect(result.to.suit).toBe(expected);
      });
    });

    test('parses foundation to tableau moves', () => {
      const result = SolitaireFrontend.parseMove('foundation spades to tableau 5');
      expect(result).toEqual({
        action: 'move_card',
        from: { type: 'foundation', suit: 'spades' },
        to: { type: 'tableau', column: 4 }, // 0-based index
        cardCount: 1
      });
    });

    test('parses tableau to tableau moves', () => {
      const result = SolitaireFrontend.parseMove('tableau 1 to tableau 7');
      expect(result).toEqual({
        action: 'move_card',
        from: { type: 'tableau', column: 0 },
        to: { type: 'tableau', column: 6 },
        cardCount: 1
      });
    });

    test('parses tableau to tableau moves with card count', () => {
      const result = SolitaireFrontend.parseMove('tableau 2 to tableau 3 x5');
      expect(result).toEqual({
        action: 'move_card',
        from: { type: 'tableau', column: 1 },
        to: { type: 'tableau', column: 2 },
        cardCount: 5
      });
    });

    test('parses tableau to foundation moves', () => {
      const result = SolitaireFrontend.parseMove('tableau 4 to foundation clubs');
      expect(result).toEqual({
        action: 'move_card',
        from: { type: 'tableau', column: 3 },
        to: { type: 'foundation', suit: 'clubs' },
        cardCount: 1
      });
    });

    test('parses waste to tableau moves', () => {
      const result = SolitaireFrontend.parseMove('waste to tableau 6');
      expect(result).toEqual({
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'tableau', column: 5 },
        cardCount: 1
      });
    });

    test('handles case insensitive input', () => {
      const result = SolitaireFrontend.parseMove('WASTE TO FOUNDATION HEARTS');
      expect(result.action).toBe('move_card');
      expect(result.to.suit).toBe('hearts');
    });

    test('handles extra whitespace', () => {
      const result = SolitaireFrontend.parseMove('  waste   to   foundation   diamonds  ');
      expect(result.to.suit).toBe('diamonds');
    });

    test('throws error for invalid move formats', () => {
      expect(() => SolitaireFrontend.parseMove('invalid move')).toThrow('Unrecognized move format');
      expect(() => SolitaireFrontend.parseMove('')).toThrow('Invalid move input');
      expect(() => SolitaireFrontend.parseMove(null)).toThrow('Invalid move input');
    });
  });

  describe('Move Parsing - Drag and Drop', () => {
    test('parses basic drag-drop moves', () => {
      const dragDropData = {
        source: { type: 'waste' },
        target: { type: 'foundation', suit: 'hearts' },
        cardCount: 1
      };

      const result = SolitaireFrontend.parseMove(dragDropData);
      expect(result).toEqual({
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'foundation', suit: 'hearts' },
        cardCount: 1
      });
    });

    test('parses stock draw from drag-drop', () => {
      const dragDropData = {
        source: { type: 'stock' }
        // No target means draw action
      };

      const result = SolitaireFrontend.parseMove(dragDropData);
      expect(result).toEqual({ action: 'draw_stock' });
    });

    test('parses stock reset from drag-drop', () => {
      const dragDropData = {
        source: { type: 'waste' },
        target: { type: 'stock' }
      };

      const result = SolitaireFrontend.parseMove(dragDropData);
      expect(result).toEqual({ action: 'reset_stock' });
    });

    test('parses flip card from drag-drop', () => {
      const dragDropData = {
        source: { type: 'tableau', column: 2 },
        action: 'flip'
        // No target for flip action
      };

      const result = SolitaireFrontend.parseMove(dragDropData);
      expect(result).toEqual({
        action: 'flip_card',
        from: { type: 'tableau', column: 2 }
      });
    });

    test('handles multi-card drag-drop', () => {
      const dragDropData = {
        source: { type: 'tableau', column: 1 },
        target: { type: 'tableau', column: 3 },
        cardCount: 3
      };

      const result = SolitaireFrontend.parseMove(dragDropData);
      expect(result.cardCount).toBe(3);
    });

    test('throws error for invalid drag-drop data', () => {
      expect(() => SolitaireFrontend.parseMove({ source: { type: 'waste' } }))
        .toThrow('Invalid drag-and-drop operation');
      
      expect(() => SolitaireFrontend.parseMove({ target: { type: 'foundation' } }))
        .toThrow('Drag-and-drop requires both source and target');
    });
  });

  describe('Move Formatting', () => {
    test('formats stock operations', () => {
      expect(SolitaireFrontend.formatMove({ action: 'draw_stock' })).toBe('Draw from stock');
      expect(SolitaireFrontend.formatMove({ action: 'reset_stock' })).toBe('Reset stock pile');
    });

    test('formats flip operations', () => {
      const move = {
        action: 'flip_card',
        from: { type: 'tableau', column: 2 }
      };
      expect(SolitaireFrontend.formatMove(move)).toBe('Flip card in tableau 3');
    });

    test('formats card moves', () => {
      const move = {
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'foundation', suit: 'hearts' },
        cardCount: 1
      };
      expect(SolitaireFrontend.formatMove(move)).toBe('Waste pile → Hearts foundation');
    });

    test('formats multi-card moves', () => {
      const move = {
        action: 'move_card',
        from: { type: 'tableau', column: 1 },
        to: { type: 'tableau', column: 5 },
        cardCount: 3
      };
      expect(SolitaireFrontend.formatMove(move)).toBe('Tableau 2 → Tableau 6 (3 cards)');
    });

    test('handles unknown moves gracefully', () => {
      expect(SolitaireFrontend.formatMove(null)).toBe('Unknown move');
      expect(SolitaireFrontend.formatMove({ action: 'unknown' })).toBe('unknown');
    });
  });

  describe('Location Formatting', () => {
    test('formats different location types', () => {
      expect(SolitaireFrontend.formatLocation({ type: 'waste' })).toBe('Waste pile');
      expect(SolitaireFrontend.formatLocation({ type: 'stock' })).toBe('Stock pile');
      expect(SolitaireFrontend.formatLocation({ type: 'foundation', suit: 'hearts' })).toBe('Hearts foundation');
      expect(SolitaireFrontend.formatLocation({ type: 'tableau', column: 3 })).toBe('Tableau 4');
    });

    test('handles invalid locations gracefully', () => {
      expect(SolitaireFrontend.formatLocation(null)).toBe('unknown');
      expect(SolitaireFrontend.formatLocation({ type: 'unknown' })).toBe('unknown');
    });
  });

  describe('Visualization Helpers', () => {
    let mockGameState;

    beforeEach(() => {
      mockGameState = {
        tableau: [
          [{ suit: 'hearts', rank: 'Ace', faceUp: true }],
          [{ suit: 'spades', rank: 'Two', faceUp: false }, { suit: 'diamonds', rank: 'King', faceUp: true }],
          [],
          [{ suit: 'clubs', rank: 'Queen', faceUp: true }],
          [],
          [],
          []
        ],
        foundation: {
          hearts: [{ suit: 'hearts', rank: 'Ace' }],
          diamonds: [],
          clubs: [],
          spades: []
        },
        stock: [
          { suit: 'clubs', rank: 'Two', faceUp: false },
          { suit: 'spades', rank: 'Three', faceUp: false }
        ],
        waste: [
          { suit: 'hearts', rank: 'Four', faceUp: true }
        ],
        score: {
          points: 150,
          timeElapsed: 300000
        },
        moves: [
          { action: 'draw_stock' },
          { action: 'move_card', from: { type: 'waste' }, to: { type: 'foundation', suit: 'hearts' } }
        ]
      };
    });

    test('creates card count helpers', () => {
      const helpers = SolitaireFrontend.createVisualizationHelpers(mockGameState);
      
      expect(helpers.cardCounts).toEqual({
        stock: 2,
        waste: 1,
        foundation: { hearts: 1, diamonds: 0, clubs: 0, spades: 0 },
        tableau: [1, 2, 0, 1, 0, 0, 0]
      });
    });

    test('creates top card helpers', () => {
      const helpers = SolitaireFrontend.createVisualizationHelpers(mockGameState);
      
      expect(helpers.topCards.waste).toEqual({ suit: 'hearts', rank: 'Four', faceUp: true });
      expect(helpers.topCards.foundation.hearts).toEqual({ suit: 'hearts', rank: 'Ace' });
      expect(helpers.topCards.tableau[0]).toEqual({ suit: 'hearts', rank: 'Ace', faceUp: true });
      expect(helpers.topCards.tableau[1]).toEqual({ suit: 'diamonds', rank: 'King', faceUp: true });
      expect(helpers.topCards.tableau[2]).toBeNull();
    });

    test('creates progress helpers', () => {
      const helpers = SolitaireFrontend.createVisualizationHelpers(mockGameState);
      
      expect(helpers.progress.score).toBe(150);
      expect(helpers.progress.moves).toBe(2);
      expect(helpers.progress.foundationProgress.hearts).toBeCloseTo(1/13);
      expect(helpers.progress.totalProgress).toBeCloseTo(1/52);
    });

    test('creates game state flags', () => {
      const helpers = SolitaireFrontend.createVisualizationHelpers(mockGameState);
      
      expect(helpers.canDrawStock).toBe(true);
      expect(helpers.canResetStock).toBe(false);
      expect(helpers.gameComplete).toBe(false);
    });

    test('detects completed game', () => {
      const completeGameState = {
        ...mockGameState,
        foundation: {
          hearts: new Array(13).fill({ suit: 'hearts' }),
          diamonds: new Array(13).fill({ suit: 'diamonds' }),
          clubs: new Array(13).fill({ suit: 'clubs' }),
          spades: new Array(13).fill({ suit: 'spades' })
        }
      };

      const helpers = SolitaireFrontend.createVisualizationHelpers(completeGameState);
      expect(helpers.gameComplete).toBe(true);
    });

    test('handles empty game state gracefully', () => {
      const helpers = SolitaireFrontend.createVisualizationHelpers({});
      
      expect(helpers.cardCounts.stock).toBe(0);
      expect(helpers.progress.totalProgress).toBe(0);
      expect(helpers.canDrawStock).toBe(false);
    });

    test('handles null game state', () => {
      const helpers = SolitaireFrontend.createVisualizationHelpers(null);
      expect(helpers.error).toBe('Invalid game state');
    });
  });

  describe('Move History Formatting', () => {
    test('formats move history correctly', () => {
      const moves = [
        { action: 'draw_stock', timestamp: Date.now() },
        { 
          action: 'move_card', 
          from: { type: 'waste' }, 
          to: { type: 'foundation', suit: 'hearts' },
          timestamp: Date.now(),
          scoreChange: 10
        }
      ];

      const formatted = SolitaireFrontend.formatMoveHistory(moves);
      
      expect(formatted).toHaveLength(2);
      expect(formatted[0].moveNumber).toBe(1);
      expect(formatted[0].description).toBe('Draw from stock');
      expect(formatted[1].moveNumber).toBe(2);
      expect(formatted[1].description).toBe('Waste pile → Hearts foundation');
      expect(formatted[1].score).toBe(10);
    });

    test('handles empty move history', () => {
      expect(SolitaireFrontend.formatMoveHistory([])).toEqual([]);
      expect(SolitaireFrontend.formatMoveHistory(null)).toEqual([]);
    });
  });

  describe('Helper Methods', () => {
    test('normalizes suit names correctly', () => {
      expect(SolitaireFrontend.normalizeSuit('hearts')).toBe('hearts');
      expect(SolitaireFrontend.normalizeSuit('heart')).toBe('hearts');
      expect(SolitaireFrontend.normalizeSuit('DIAMONDS')).toBe('diamonds');
      expect(SolitaireFrontend.normalizeSuit('club')).toBe('clubs');
    });

    test('capitalizes suit names', () => {
      expect(SolitaireFrontend.capitalizeSuit('hearts')).toBe('Hearts');
      expect(SolitaireFrontend.capitalizeSuit('diamonds')).toBe('Diamonds');
      expect(SolitaireFrontend.capitalizeSuit('')).toBe('');
      expect(SolitaireFrontend.capitalizeSuit(null)).toBe('');
    });

    test('formats cards correctly', () => {
      const card = { suit: 'hearts', rank: 'Ace' };
      expect(SolitaireFrontend.formatCard(card)).toBe('Ace of Hearts');
      
      expect(SolitaireFrontend.formatCard(null)).toBe('Unknown card');
      expect(SolitaireFrontend.formatCard({})).toBe('Unknown card');
    });

    test('checks foundation moves correctly', () => {
      const foundation = {
        hearts: [{ suit: 'hearts', rank: 'Ace' }],
        diamonds: []
      };

      // Valid moves
      expect(SolitaireFrontend.canMoveToFoundation(
        { suit: 'hearts', rank: 'Two' }, foundation
      )).toBe(true);

      expect(SolitaireFrontend.canMoveToFoundation(
        { suit: 'diamonds', rank: 'Ace' }, foundation
      )).toBe(true);

      // Invalid moves
      expect(SolitaireFrontend.canMoveToFoundation(
        { suit: 'hearts', rank: 'Three' }, foundation
      )).toBe(false);

      expect(SolitaireFrontend.canMoveToFoundation(
        { suit: 'diamonds', rank: 'Two' }, foundation
      )).toBe(false);
    });
  });

  describe('Drag and Drop Handlers', () => {
    test('creates drag and drop handlers', () => {
      const handlers = SolitaireFrontend.createDragDropHandlers();
      
      expect(typeof handlers.onDragStart).toBe('function');
      expect(typeof handlers.onDragEnd).toBe('function');
      expect(typeof handlers.onDragOver).toBe('function');
      expect(typeof handlers.onDragLeave).toBe('function');
      expect(typeof handlers.onDrop).toBe('function');
    });

    test('drag start handler adds classes and attributes', () => {
      const mockElement = {
        classList: { add: jest.fn() },
        setAttribute: jest.fn()
      };
      const sourceData = { type: 'waste' };

      const handlers = SolitaireFrontend.createDragDropHandlers();
      handlers.onDragStart(mockElement, sourceData);

      expect(mockElement.classList.add).toHaveBeenCalledWith('dragging');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('data-source', JSON.stringify(sourceData));
    });

    test('drag end handler removes classes and attributes', () => {
      const mockElement = {
        classList: { remove: jest.fn() },
        removeAttribute: jest.fn()
      };

      const handlers = SolitaireFrontend.createDragDropHandlers();
      handlers.onDragEnd(mockElement);

      expect(mockElement.classList.remove).toHaveBeenCalledWith('dragging');
      expect(mockElement.removeAttribute).toHaveBeenCalledWith('data-source');
    });
  });

  describe('Error Handling', () => {
    test('handles invalid input gracefully', () => {
      expect(() => SolitaireFrontend.parseMove(123)).toThrow('Unsupported move input format');
      expect(() => SolitaireFrontend.parseMove([])).toThrow('Unsupported move input format');
    });

    test('provides helpful error messages', () => {
      expect(() => SolitaireFrontend.parseMove('flip tableau 10'))
        .toThrow('Invalid tableau column (must be 1-7)');
      
      expect(() => SolitaireFrontend.parseMove('tableau 0 to tableau 5'))
        .toThrow('Invalid tableau column (must be 1-7)');
    });
  });

  describe('Move Hints Generation', () => {
    test('generates stock operation hints', () => {
      const gameState = {
        stock: [{ suit: 'hearts', rank: 'Ace' }],
        waste: [],
        tableau: Array(7).fill([]),
        foundation: { hearts: [], diamonds: [], clubs: [], spades: [] }
      };

      const helpers = SolitaireFrontend.createVisualizationHelpers(gameState);
      const hints = helpers.availableMoves;

      expect(hints.some(hint => hint.action === 'draw_stock')).toBe(true);
    });

    test('generates reset stock hints', () => {
      const gameState = {
        stock: [],
        waste: [{ suit: 'hearts', rank: 'Ace' }],
        tableau: Array(7).fill([]),
        foundation: { hearts: [], diamonds: [], clubs: [], spades: [] }
      };

      const helpers = SolitaireFrontend.createVisualizationHelpers(gameState);
      const hints = helpers.availableMoves;

      expect(hints.some(hint => hint.action === 'reset_stock')).toBe(true);
    });

    test('limits hints to reasonable number', () => {
      const gameState = {
        stock: [{ suit: 'hearts', rank: 'Ace' }],
        waste: [{ suit: 'diamonds', rank: 'Ace' }],
        tableau: Array(7).fill([{ suit: 'clubs', rank: 'King' }]),
        foundation: { hearts: [], diamonds: [], clubs: [], spades: [] }
      };

      const helpers = SolitaireFrontend.createVisualizationHelpers(gameState);
      const hints = helpers.availableMoves;

      expect(hints.length).toBeLessThanOrEqual(5);
    });
  });
});