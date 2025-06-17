/**
 * Solitaire Auto-Detection Tests
 * Tests the auto-detection algorithm for tableau-to-tableau moves
 */

const SolitairePlugin = require('../src/plugins/solitaire/SolitairePlugin');
const { CardUtils } = require('../src/framework/cards');

describe('Solitaire Auto-Detection', () => {
  let plugin;
  let mockBoardState;

  beforeEach(() => {
    plugin = new SolitairePlugin();
    
    // Create a mock board state with specific card arrangements for testing
    mockBoardState = {
      tableau: [
        [], // Column 0 - empty
        [
          { rank: 'Seven', suit: 'hearts', faceUp: true },
          { rank: 'Six', suit: 'spades', faceUp: true }
        ], // Column 1 - 7♥, 6♠
        [
          { rank: 'Nine', suit: 'clubs', faceUp: false },
          { rank: 'Eight', suit: 'hearts', faceUp: true },
          { rank: 'Seven', suit: 'spades', faceUp: true },
          { rank: 'Six', suit: 'hearts', faceUp: true }
        ], // Column 2 - [face-down], 8♥, 7♠, 6♥
        [
          { rank: 'Five', suit: 'spades', faceUp: true }
        ], // Column 3 - 5♠
        [], // Column 4 - empty
        [], // Column 5 - empty
        []  // Column 6 - empty
      ],
      foundation: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: []
      },
      stock: [],
      waste: [],
      score: { points: 0 },
      moves: []
    };
  });

  describe('getMaxMovableCards', () => {
    test('should return 0 for empty column', () => {
      const result = plugin.getMaxMovableCards(0, mockBoardState);
      expect(result).toBe(0);
    });

    test('should return 1 for single card', () => {
      const result = plugin.getMaxMovableCards(3, mockBoardState);
      expect(result).toBe(1);
    });

    test('should return 2 for valid sequence of 2 cards', () => {
      const result = plugin.getMaxMovableCards(1, mockBoardState);
      expect(result).toBe(2);
    });

    test('should return 3 for valid sequence of 3 face-up cards', () => {
      const result = plugin.getMaxMovableCards(2, mockBoardState);
      expect(result).toBe(3); // 8♥, 7♠, 6♥ form valid sequence
    });

    test('should stop at face-down cards', () => {
      // Add a face-down card in the middle
      mockBoardState.tableau[2][1].faceUp = false; // Make 8♥ face-down
      const result = plugin.getMaxMovableCards(2, mockBoardState);
      expect(result).toBe(2); // Only 7♠, 6♥ (8♥ is face-down)
    });
  });

  describe('isValidTableauPlacement', () => {
    test('should accept King on empty column', () => {
      const cardsToMove = [{ rank: 'King', suit: 'hearts', faceUp: true }];
      const result = plugin.isValidTableauPlacement(cardsToMove, []);
      expect(result).toBe(true);
    });

    test('should reject non-King on empty column', () => {
      const cardsToMove = [{ rank: 'Queen', suit: 'hearts', faceUp: true }];
      const result = plugin.isValidTableauPlacement(cardsToMove, []);
      expect(result).toBe(false);
    });

    test('should accept valid descending alternating sequence', () => {
      const targetColumn = [{ rank: 'Seven', suit: 'hearts', faceUp: true }];
      const cardsToMove = [{ rank: 'Six', suit: 'spades', faceUp: true }];
      const result = plugin.isValidTableauPlacement(cardsToMove, targetColumn);
      expect(result).toBe(true);
    });

    test('should reject same color placement', () => {
      const targetColumn = [{ rank: 'Seven', suit: 'hearts', faceUp: true }];
      const cardsToMove = [{ rank: 'Six', suit: 'diamonds', faceUp: true }];
      const result = plugin.isValidTableauPlacement(cardsToMove, targetColumn);
      expect(result).toBe(false);
    });

    test('should reject wrong rank', () => {
      const targetColumn = [{ rank: 'Seven', suit: 'hearts', faceUp: true }];
      const cardsToMove = [{ rank: 'Five', suit: 'spades', faceUp: true }];
      const result = plugin.isValidTableauPlacement(cardsToMove, targetColumn);
      expect(result).toBe(false);
    });

    test('should reject placement on face-down card', () => {
      const targetColumn = [{ rank: 'Seven', suit: 'hearts', faceUp: false }];
      const cardsToMove = [{ rank: 'Six', suit: 'spades', faceUp: true }];
      const result = plugin.isValidTableauPlacement(cardsToMove, targetColumn);
      expect(result).toBe(false);
    });
  });

  describe('getOptimalMoveCount', () => {
    test('should return 0 when no valid move exists', () => {
      // Try to move from column 1 (7♥, 6♠) to column 3 (5♠)
      // 7♥ cannot go on 5♠ (wrong rank)
      const result = plugin.getOptimalMoveCount(1, 3, mockBoardState);
      expect(result).toBe(0);
    });

    test('should return optimal count when partial sequence works', () => {
      // Move from column 2 (8♥, 7♠, 6♥) to column 1 (7♥, 6♠)
      // Only 6♥ can go on 6♠ (wrong), but let's test a valid scenario
      
      // Set up a scenario where only 1 card can move
      mockBoardState.tableau[1] = [{ rank: 'Seven', suit: 'spades', faceUp: true }]; // 7♠
      mockBoardState.tableau[2] = [
        { rank: 'Eight', suit: 'hearts', faceUp: true },
        { rank: 'Seven', suit: 'clubs', faceUp: true }, // Wrong sequence, only last card movable
        { rank: 'Six', suit: 'hearts', faceUp: true }
      ];
      
      const result = plugin.getOptimalMoveCount(2, 1, mockBoardState);
      expect(result).toBe(1); // Only 6♥ can move to 7♠
    });

    test('should return max count when full sequence works', () => {
      // Set up a scenario where all cards can move
      mockBoardState.tableau[0] = []; // Empty column
      mockBoardState.tableau[2] = [
        { rank: 'King', suit: 'hearts', faceUp: true },
        { rank: 'Queen', suit: 'spades', faceUp: true },
        { rank: 'Jack', suit: 'hearts', faceUp: true }
      ];
      
      const result = plugin.getOptimalMoveCount(2, 0, mockBoardState);
      expect(result).toBe(3); // All 3 cards can move to empty column (King sequence)
    });

    test('should return correct count for mixed validity', () => {
      // Set up scenario where only some cards can move
      mockBoardState.tableau[0] = [{ rank: 'Eight', suit: 'clubs', faceUp: true }]; // 8♣
      mockBoardState.tableau[2] = [
        { rank: 'Nine', suit: 'hearts', faceUp: true },    // Can't move (9♥ can't go on 8♣ - wrong rank)
        { rank: 'Seven', suit: 'hearts', faceUp: true },   // Can move (7♥ can go on 8♣)
        { rank: 'Six', suit: 'spades', faceUp: true }      // Can move with 7♥ (valid sequence)
      ];
      
      const result = plugin.getOptimalMoveCount(2, 0, mockBoardState);
      expect(result).toBe(2); // 7♥, 6♠ can move to 8♣
    });
  });

  describe('Auto-detection in validateMove', () => {
    test('should auto-detect optimal move count for tableau-to-tableau moves', () => {
      // Set up a scenario where auto-detection should work
      mockBoardState.tableau[0] = [{ rank: 'Seven', suit: 'clubs', faceUp: true }]; // 7♣
      mockBoardState.tableau[1] = [
        { rank: 'Six', suit: 'hearts', faceUp: true },
        { rank: 'Five', suit: 'spades', faceUp: true }
      ]; // 6♥, 5♠
      
      const move = {
        action: 'move_card',
        from: { type: 'tableau', column: 1 },
        to: { type: 'tableau', column: 0 }
        // No cardCount specified - should auto-detect
      };
      
      const validation = plugin.validateMove(move, mockBoardState, 'player1', []);
      
      expect(validation.valid).toBe(true);
      expect(move.cardCount).toBe(2); // Both 6♥ and 5♠ can go on 7♣ (6♥ red on 7♣ black, 5♠ makes valid sequence)
    });

    test('should validate explicit card count', () => {
      // Same scenario but with explicit count
      mockBoardState.tableau[0] = [{ rank: 'Seven', suit: 'clubs', faceUp: true }]; // 7♣
      mockBoardState.tableau[1] = [
        { rank: 'Six', suit: 'hearts', faceUp: true },
        { rank: 'Five', suit: 'spades', faceUp: true }
      ]; // 6♥, 5♠
      
      const move = {
        action: 'move_card',
        from: { type: 'tableau', column: 1 },
        to: { type: 'tableau', column: 0 },
        cardCount: 2
      };
      
      const validation = plugin.validateMove(move, mockBoardState, 'player1', []);
      expect(validation.valid).toBe(true);
    });

    test('should reject invalid explicit card count', () => {
      // Try to move 3 cards when only 2 are valid
      mockBoardState.tableau[0] = [{ rank: 'Seven', suit: 'clubs', faceUp: true }]; // 7♣
      mockBoardState.tableau[1] = [
        { rank: 'Eight', suit: 'hearts', faceUp: true },  // Can't move (8♥ can't go on 7♣ - wrong rank)
        { rank: 'Six', suit: 'hearts', faceUp: true },    // Can move
        { rank: 'Five', suit: 'spades', faceUp: true }    // Can move with 6♥
      ]; // 8♥, 6♥, 5♠
      
      const move = {
        action: 'move_card',
        from: { type: 'tableau', column: 1 },
        to: { type: 'tableau', column: 0 },
        cardCount: 3 // Invalid - 8♥ can't go on 7♣ (wrong rank)
      };
      
      const validation = plugin.validateMove(move, mockBoardState, 'player1', []);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('expected Six');
    });
  });

  describe('End-to-end move parsing and validation', () => {
    test('should handle "2-3" move with auto-detection', () => {
      // Set up columns 2 and 3 for a valid move scenario
      mockBoardState.tableau[1] = [
        { rank: 'Seven', suit: 'hearts', faceUp: true },
        { rank: 'Six', suit: 'spades', faceUp: true }
      ]; // Column 2: 7♥ (red), 6♠ (black)
      mockBoardState.tableau[2] = [
        { rank: 'Seven', suit: 'hearts', faceUp: true }
      ]; // Column 3: 7♥ (red) - 6♠ (black) can go on it
      
      // Parse the move
      const parsedMove = SolitairePlugin.parseMove('2-3');
      expect(parsedMove).toEqual({
        action: 'move_card',
        from: { type: 'tableau', column: 1 }, // 0-indexed (2-1=1)
        to: { type: 'tableau', column: 2 }    // 0-indexed (3-1=2)
        // No cardCount - should auto-detect
      });
      
      // Validate the move (should auto-detect optimal count)
      const validation = plugin.validateMove(parsedMove, mockBoardState, 'player1', []);
      expect(validation.valid).toBe(true);
      expect(parsedMove.cardCount).toBe(1); // Only 6♠ can go on 7♥ (6♠ black on 7♥ red)
    });

    test('should handle "2-3 x2" move with explicit count', () => {
      // Set up for a 2-card move scenario
      mockBoardState.tableau[2] = [
        { rank: 'Seven', suit: 'hearts', faceUp: true },
        { rank: 'Six', suit: 'spades', faceUp: true }
      ]; // 7♥, 6♠ - valid sequence
      mockBoardState.tableau[3] = [
        { rank: 'Seven', suit: 'clubs', faceUp: true }
      ]; // 7♣
      
      // Parse the move
      const parsedMove = SolitairePlugin.parseMove('2-3 x2');
      expect(parsedMove).toEqual({
        action: 'move_card',
        from: { type: 'tableau', column: 1 },
        to: { type: 'tableau', column: 2 },
        cardCount: 2
      });
      
      // Validate the move
      const validation = plugin.validateMove(parsedMove, mockBoardState, 'player1', []);
      expect(validation.valid).toBe(true); // 6♠ can go on 7♣, and takes 7♥ with it
    });

    test('should demonstrate the difference between auto vs explicit', () => {
      // Scenario where auto-detection gives different result than max possible
      mockBoardState.tableau[2] = [
        { rank: 'Eight', suit: 'hearts', faceUp: true },
        { rank: 'Seven', suit: 'spades', faceUp: true },
        { rank: 'Six', suit: 'hearts', faceUp: true }
      ]; // 8♥, 7♠, 6♥ - 3 card sequence
      mockBoardState.tableau[3] = [
        { rank: 'Nine', suit: 'clubs', faceUp: true }
      ]; // 9♣
      
      // Auto-detection move
      const autoMove = SolitairePlugin.parseMove('2-3');
      const autoValidation = plugin.validateMove(autoMove, mockBoardState, 'player1', []);
      
      // Explicit 3-card move
      const explicitMove = SolitairePlugin.parseMove('2-3 x3');
      const explicitValidation = plugin.validateMove(explicitMove, mockBoardState, 'player1', []);
      
      expect(autoValidation.valid).toBe(true);
      expect(explicitValidation.valid).toBe(true);
      expect(autoMove.cardCount).toBe(3); // Should auto-detect all 3 cards can move
      expect(explicitMove.cardCount).toBe(3);
    });
  });

  describe('Debug current issue', () => {
    test('should verify auto-detection works in a valid scenario', () => {
      console.log('=== WORKING SCENARIO TEST ===');
      
      // Create a WORKING scenario where auto-detection should work
      // Column 2 will have: 6♥, 5♠ (valid descending sequence)
      // Column 3 will have: 7♣ (so 6♥ can go on 7♣ - one rank lower, opposite color)
      mockBoardState.tableau[1] = [
        { rank: 'Six', suit: 'hearts', faceUp: true },
        { rank: 'Five', suit: 'spades', faceUp: true }
      ]; // Column 2: 6♥, 5♠ (valid sequence)
      
      mockBoardState.tableau[2] = [
        { rank: 'Seven', suit: 'clubs', faceUp: true }
      ]; // Column 3: 7♣ (6♥ can go on 7♣ - correct rank & color)
      
      console.log('Board state:');
      console.log('Column 2:', mockBoardState.tableau[1]);
      console.log('Column 3:', mockBoardState.tableau[2]);
      
      // Test max movable cards from column 2
      const maxMovable = plugin.getMaxMovableCards(1, mockBoardState);
      console.log('Max movable from column 2:', maxMovable);
      expect(maxMovable).toBe(2); // Both 6♥ and 5♠ form valid sequence
      
      // Test optimal move count - both 6♥ and 5♠ can go on 7♣
      const optimalCount = plugin.getOptimalMoveCount(1, 2, mockBoardState);
      console.log('Optimal move count 2->3:', optimalCount);
      expect(optimalCount).toBe(2); // Both 6♥ and 5♠ can move (valid sequence: 6♥ on 7♣, 5♠ follows)
      
      // Test auto move parsing (should have no cardCount)
      const autoMove = SolitairePlugin.parseMove('2-3');
      console.log('Parsed auto move:', autoMove);
      expect(autoMove.cardCount).toBeUndefined(); // Auto-detection enabled
      
      // Test auto move validation (should set cardCount to optimal)
      const autoValidation = plugin.validateMove(autoMove, mockBoardState, 'player1', []);
      console.log('Auto move validation:', autoValidation);
      console.log('Auto move final cardCount:', autoMove.cardCount);
      expect(autoValidation.valid).toBe(true);
      expect(autoMove.cardCount).toBe(2); // Auto-detected optimal count
      
      // Test explicit move with same count
      const explicitMove = SolitairePlugin.parseMove('2-3 x2');
      console.log('Parsed explicit move:', explicitMove);
      
      const explicitValidation = plugin.validateMove(explicitMove, mockBoardState, 'player1', []);
      console.log('Explicit move validation:', explicitValidation);
      expect(explicitValidation.valid).toBe(true);
      
      console.log('=== AUTO-DETECTION VERIFICATION COMPLETE ===');
    });
  });
});