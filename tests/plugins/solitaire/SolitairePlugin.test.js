const SolitairePlugin = require('../../../src/plugins/solitaire/SolitairePlugin');
const { CardUtils } = require('../../../src/framework/cards');

describe('SolitairePlugin', () => {
  let plugin;
  let mockPlayers;

  beforeEach(() => {
    plugin = new SolitairePlugin();
    mockPlayers = [{ user_id: 'player1', userId: 'player1' }];
  });

  // Helper function to create face-up card
  const createFaceUpCard = (suit, rank) => {
    const card = CardUtils.createCard(suit, rank);
    card.faceUp = true;
    return card;
  };

  // Helper function to create face-down card
  const createFaceDownCard = (suit, rank) => {
    const card = CardUtils.createCard(suit, rank);
    card.faceUp = false;
    return card;
  };

  describe('Game Information', () => {
    test('provides correct game metadata', () => {
      expect(plugin.getGameType()).toBe('solitaire');
      expect(plugin.getDisplayName()).toBe('Klondike Solitaire');
      expect(plugin.getDescription()).toContain('Classic single-player solitaire');
    });

    test('inherits single-player constraints', () => {
      expect(plugin.getMinPlayers()).toBe(1);
      expect(plugin.getMaxPlayers()).toBe(1);
    });
  });

  describe('Initial Board State', () => {
    test('creates valid initial board state', () => {
      const boardState = plugin.getInitialBoardState();
      
      expect(plugin.validateBoardState(boardState)).toBe(true);
      expect(boardState.tableau).toHaveLength(7);
      expect(boardState.foundation).toHaveProperty('hearts');
      expect(boardState.foundation).toHaveProperty('diamonds');
      expect(boardState.foundation).toHaveProperty('clubs');
      expect(boardState.foundation).toHaveProperty('spades');
      expect(Array.isArray(boardState.stock)).toBe(true);
      expect(Array.isArray(boardState.waste)).toBe(true);
      expect(boardState.score).toBeDefined();
    });

    test('deals tableau correctly', () => {
      const boardState = plugin.getInitialBoardState();
      
      // Check tableau column sizes (1, 2, 3, 4, 5, 6, 7 cards)
      for (let i = 0; i < 7; i++) {
        expect(boardState.tableau[i]).toHaveLength(i + 1);
        
        // Top card should be face up
        const topCard = boardState.tableau[i][boardState.tableau[i].length - 1];
        expect(topCard.faceUp).toBe(true);
        
        // Other cards should be face down
        for (let j = 0; j < boardState.tableau[i].length - 1; j++) {
          expect(boardState.tableau[i][j].faceUp).toBe(false);
        }
      }
    });

    test('initializes foundation piles as empty', () => {
      const boardState = plugin.getInitialBoardState();
      
      expect(boardState.foundation.hearts).toHaveLength(0);
      expect(boardState.foundation.diamonds).toHaveLength(0);
      expect(boardState.foundation.clubs).toHaveLength(0);
      expect(boardState.foundation.spades).toHaveLength(0);
    });

    test('creates stock pile with remaining cards', () => {
      const boardState = plugin.getInitialBoardState();
      
      // 52 cards total - 28 dealt to tableau = 24 in stock
      expect(boardState.stock).toHaveLength(24);
      
      // All stock cards should be face down
      boardState.stock.forEach(card => {
        expect(card.faceUp).toBe(false);
      });
    });

    test('initializes empty waste pile', () => {
      const boardState = plugin.getInitialBoardState();
      expect(boardState.waste).toHaveLength(0);
    });
  });

  describe('Board State Validation', () => {
    test('validates correct board state', () => {
      const boardState = plugin.getInitialBoardState();
      expect(plugin.validateBoardState(boardState)).toBe(true);
    });

    test('rejects invalid board states', () => {
      expect(plugin.validateBoardState(null)).toBe(false);
      expect(plugin.validateBoardState({})).toBe(false);
      expect(plugin.validateBoardState({ tableau: 'invalid' })).toBe(false);
      
      const invalidTableau = plugin.getInitialBoardState();
      invalidTableau.tableau = []; // Wrong length
      expect(plugin.validateBoardState(invalidTableau)).toBe(false);
      
      const invalidFoundation = plugin.getInitialBoardState();
      delete invalidFoundation.foundation.hearts;
      expect(plugin.validateBoardState(invalidFoundation)).toBe(false);
    });
  });

  describe('Move Validation - Stock Operations', () => {
    test('validates drawing from stock', () => {
      const boardState = plugin.getInitialBoardState();
      
      const drawMove = { action: 'draw_stock' };
      const result = plugin.validateMove(drawMove, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(true);
    });

    test('rejects drawing from empty stock', () => {
      const boardState = plugin.getInitialBoardState();
      boardState.stock = [];
      
      const drawMove = { action: 'draw_stock' };
      const result = plugin.validateMove(drawMove, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    test('validates resetting stock from waste', () => {
      const boardState = plugin.getInitialBoardState();
      boardState.stock = [];
      boardState.waste = [createFaceUpCard('hearts', 'Ace')];
      
      const resetMove = { action: 'reset_stock' };
      const result = plugin.validateMove(resetMove, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(true);
    });

    test('rejects resetting non-empty stock', () => {
      const boardState = plugin.getInitialBoardState();
      
      const resetMove = { action: 'reset_stock' };
      const result = plugin.validateMove(resetMove, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not empty');
    });
  });

  describe('Move Validation - Card Moves', () => {
    test('validates foundation moves', () => {
      const boardState = plugin.getInitialBoardState();
      
      // Place Ace in waste pile
      boardState.waste = [createFaceUpCard('hearts', 'Ace')];
      
      const move = {
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'foundation', suit: 'hearts' },
        cardCount: 1
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(true);
    });

    test('rejects non-Ace as foundation starter', () => {
      const boardState = plugin.getInitialBoardState();
      boardState.waste = [createFaceUpCard('hearts', 'Two')];
      
      const move = {
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'foundation', suit: 'hearts' },
        cardCount: 1
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Ace');
    });

    test('validates sequential foundation building', () => {
      const boardState = plugin.getInitialBoardState();
      boardState.foundation.hearts = [CardUtils.createCard('hearts', 'Ace')];
      boardState.waste = [createFaceUpCard('hearts', 'Two')];
      
      const move = {
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'foundation', suit: 'hearts' },
        cardCount: 1
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(true);
    });

    test('rejects wrong suit for foundation', () => {
      const boardState = plugin.getInitialBoardState();
      boardState.foundation.hearts = [CardUtils.createCard('hearts', 'Ace')];
      boardState.waste = [createFaceUpCard('spades', 'Two')];
      
      const move = {
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'foundation', suit: 'hearts' },
        cardCount: 1
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('suit');
    });

    test('validates tableau moves', () => {
      const boardState = plugin.getInitialBoardState();
      
      // Set up specific tableau configuration
      boardState.tableau[0] = [createFaceUpCard('hearts', 'Seven')];
      boardState.waste = [createFaceUpCard('spades', 'Six')];
      
      const move = {
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'tableau', column: 0 },
        cardCount: 1
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(true);
    });

    test('rejects same color tableau moves', () => {
      const boardState = plugin.getInitialBoardState();
      boardState.tableau[0] = [createFaceUpCard('hearts', 'Seven')];
      boardState.waste = [createFaceUpCard('diamonds', 'Six')];
      
      const move = {
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'tableau', column: 0 },
        cardCount: 1
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('alternate color');
    });

    test('validates King on empty tableau column', () => {
      const boardState = plugin.getInitialBoardState();
      boardState.tableau[0] = [];
      boardState.waste = [createFaceUpCard('spades', 'King')];
      
      const move = {
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'tableau', column: 0 },
        cardCount: 1
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(true);
    });

    test('rejects non-King on empty tableau column', () => {
      const boardState = plugin.getInitialBoardState();
      boardState.tableau[0] = [];
      boardState.waste = [createFaceUpCard('spades', 'Queen')];
      
      const move = {
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'tableau', column: 0 },
        cardCount: 1
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('King');
    });
  });

  describe('Move Validation - Card Flipping', () => {
    test('validates flipping face-down card', () => {
      const boardState = plugin.getInitialBoardState();
      
      // Add face-down card to top of column
      boardState.tableau[0].push(createFaceDownCard('hearts', 'Five'));
      
      const move = {
        action: 'flip_card',
        from: { type: 'tableau', column: 0 }
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(true);
    });

    test('rejects flipping face-up card', () => {
      const boardState = plugin.getInitialBoardState();
      
      const move = {
        action: 'flip_card',
        from: { type: 'tableau', column: 0 }
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already face-up');
    });

    test('rejects flipping non-tableau cards', () => {
      const boardState = plugin.getInitialBoardState();
      
      const move = {
        action: 'flip_card',
        from: { type: 'waste' }
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tableau cards');
    });
  });

  describe('Move Application', () => {
    test('applies stock draw correctly', () => {
      const boardState = plugin.getInitialBoardState();
      const initialStockCount = boardState.stock.length;
      
      const move = { action: 'draw_stock' };
      const newBoardState = plugin.applyMove(move, boardState, 'player1', mockPlayers);
      
      expect(newBoardState.stock.length).toBe(initialStockCount - 3);
      expect(newBoardState.waste.length).toBe(3);
      
      // Waste cards should be face up
      newBoardState.waste.forEach(card => {
        expect(card.faceUp).toBe(true);
      });
    });

    test('applies stock reset correctly', () => {
      const boardState = plugin.getInitialBoardState();
      boardState.stock = [];
      boardState.waste = [
        createFaceUpCard('hearts', 'Ace'),
        createFaceUpCard('spades', 'Two')
      ];
      
      const move = { action: 'reset_stock' };
      const newBoardState = plugin.applyMove(move, boardState, 'player1', mockPlayers);
      
      expect(newBoardState.waste.length).toBe(0);
      expect(newBoardState.stock.length).toBe(2);
      
      // Stock cards should be face down
      newBoardState.stock.forEach(card => {
        expect(card.faceUp).toBe(false);
      });
    });

    test('applies card moves correctly', () => {
      const boardState = plugin.getInitialBoardState();
      boardState.waste = [createFaceUpCard('hearts', 'Ace')];
      
      const move = {
        action: 'move_card',
        from: { type: 'waste' },
        to: { type: 'foundation', suit: 'hearts' },
        cardCount: 1
      };
      
      const newBoardState = plugin.applyMove(move, boardState, 'player1', mockPlayers);
      
      expect(newBoardState.waste.length).toBe(0);
      expect(newBoardState.foundation.hearts.length).toBe(1);
      expect(newBoardState.foundation.hearts[0].rank).toBe('Ace');
    });

    test('applies card flipping correctly', () => {
      const boardState = plugin.getInitialBoardState();
      
      // Replace top card with face-down card
      const lastIndex = boardState.tableau[0].length - 1;
      boardState.tableau[0][lastIndex] = createFaceDownCard('hearts', 'Five');
      
      const move = {
        action: 'flip_card',
        from: { type: 'tableau', column: 0 }
      };
      
      const newBoardState = plugin.applyMove(move, boardState, 'player1', mockPlayers);
      
      const topCard = newBoardState.tableau[0][newBoardState.tableau[0].length - 1];
      expect(topCard.faceUp).toBe(true);
    });

    test('updates move history', () => {
      const boardState = plugin.getInitialBoardState();
      const initialMoveCount = boardState.moves.length;
      
      const move = { action: 'draw_stock' };
      const newBoardState = plugin.applyMove(move, boardState, 'player1', mockPlayers);
      
      expect(newBoardState.moves.length).toBe(initialMoveCount + 1);
      expect(newBoardState.moves[newBoardState.moves.length - 1]).toMatchObject({
        action: 'draw_stock',
        playerId: 'player1'
      });
    });
  });

  describe('Game Completion', () => {
    test('detects incomplete game', () => {
      const boardState = plugin.getInitialBoardState();
      expect(plugin.isGameComplete(boardState, mockPlayers)).toBe(false);
    });

    test('detects complete game', () => {
      const boardState = plugin.getInitialBoardState();
      
      // Fill all foundation piles with complete sequences
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
      const ranks = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 
                     'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King'];
      
      suits.forEach(suit => {
        boardState.foundation[suit] = ranks.map(rank => 
          CardUtils.createCard(suit, rank)
        );
      });
      
      expect(plugin.isGameComplete(boardState, mockPlayers)).toBe(true);
    });

    test('identifies winner on completion', () => {
      const boardState = plugin.getInitialBoardState();
      
      // Complete the game
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
      const ranks = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 
                     'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King'];
      
      suits.forEach(suit => {
        boardState.foundation[suit] = ranks.map(rank => 
          CardUtils.createCard(suit, rank)
        );
      });
      
      expect(plugin.getWinner(boardState, mockPlayers)).toBe('player1');
    });

    test('returns null winner for incomplete game', () => {
      const boardState = plugin.getInitialBoardState();
      expect(plugin.getWinner(boardState, mockPlayers)).toBeNull();
    });
  });

  describe('Scoring System', () => {
    test('awards points for foundation moves', () => {
      const move = { action: 'move_card', to: { type: 'foundation' } };
      const scoreEvent = plugin.getMoveScoreEvent(move, {}, {});
      
      expect(scoreEvent.type).toBe('move');
      expect(scoreEvent.pointsAwarded).toBe(10);
    });

    test('awards points for card flipping', () => {
      const move = { action: 'flip_card' };
      const scoreEvent = plugin.getMoveScoreEvent(move, {}, {});
      
      expect(scoreEvent.type).toBe('move');
      expect(scoreEvent.pointsAwarded).toBe(5);
    });

    test('applies penalty for stock reset', () => {
      const move = { action: 'reset_stock' };
      const scoreEvent = plugin.getMoveScoreEvent(move, {}, {});
      
      expect(scoreEvent.type).toBe('penalty');
      expect(scoreEvent.points).toBe(100);
    });

    test('applies penalty for foundation to tableau move', () => {
      const move = {
        action: 'move_card',
        from: { type: 'foundation' },
        to: { type: 'tableau' }
      };
      const scoreEvent = plugin.getMoveScoreEvent(move, {}, {});
      
      expect(scoreEvent.type).toBe('penalty');
      expect(scoreEvent.points).toBe(15);
    });

    test('calculates completion bonus', () => {
      const boardState = { 
        gameStarted: Date.now() - 300000, // 5 minutes ago
        moves: Array(150).fill({}) // 150 moves
      };
      const score = {};
      
      const bonus = plugin.getCompletionBonus(boardState, score);
      expect(bonus).toBeGreaterThan(500); // Base bonus plus time bonus
    });

    test('calculates time bonus', () => {
      const fastTime = 300000; // 5 minutes
      const slowTime = 1800000; // 30 minutes
      
      expect(plugin.getTimeBonus(fastTime)).toBeGreaterThan(0);
      expect(plugin.getTimeBonus(slowTime)).toBe(0);
    });
  });

  describe('Helper Methods', () => {
    test('gets next rank correctly', () => {
      expect(plugin.getNextRank('Ace')).toBe('Two');
      expect(plugin.getNextRank('Nine')).toBe('Ten');
      expect(plugin.getNextRank('Queen')).toBe('King');
      expect(plugin.getNextRank('King')).toBeNull();
    });

    test('gets previous rank correctly', () => {
      expect(plugin.getPreviousRank('Two')).toBe('Ace');
      expect(plugin.getPreviousRank('Ten')).toBe('Nine');
      expect(plugin.getPreviousRank('King')).toBe('Queen');
      expect(plugin.getPreviousRank('Ace')).toBeNull();
    });

    test('gets cards from location', () => {
      const boardState = plugin.getInitialBoardState();
      
      const tableauCards = plugin.getCardsFromLocation(
        { type: 'tableau', column: 0 }, 
        boardState
      );
      expect(Array.isArray(tableauCards)).toBe(true);
      
      const foundationCards = plugin.getCardsFromLocation(
        { type: 'foundation', suit: 'hearts' }, 
        boardState
      );
      expect(Array.isArray(foundationCards)).toBe(true);
      
      const invalidCards = plugin.getCardsFromLocation(
        { type: 'invalid' }, 
        boardState
      );
      expect(invalidCards).toEqual([]);
    });
  });

  describe('Render Data', () => {
    test('provides complete render data', () => {
      const boardState = plugin.getInitialBoardState();
      const renderData = plugin.getRenderData(boardState, mockPlayers);
      
      expect(renderData).toHaveProperty('tableau');
      expect(renderData).toHaveProperty('foundation');
      expect(renderData).toHaveProperty('stock');
      expect(renderData).toHaveProperty('waste');
      expect(renderData).toHaveProperty('score');
      expect(renderData).toHaveProperty('moves');
      expect(renderData).toHaveProperty('gameComplete');
      expect(renderData).toHaveProperty('winner');
      
      expect(renderData.gameComplete).toBe(false);
      expect(renderData.winner).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('handles invalid move objects', () => {
      const boardState = plugin.getInitialBoardState();
      
      const result1 = plugin.validateMove(null, boardState, 'player1', mockPlayers);
      expect(result1.valid).toBe(false);
      
      const result2 = plugin.validateMove({}, boardState, 'player1', mockPlayers);
      expect(result2.valid).toBe(false);
      
      const result3 = plugin.validateMove({ action: 'unknown' }, boardState, 'player1', mockPlayers);
      expect(result3.valid).toBe(false);
    });

    test('handles missing move parameters', () => {
      const boardState = plugin.getInitialBoardState();
      
      const move = { action: 'move_card' }; // Missing from/to
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('from and to');
    });

    test('handles invalid source locations', () => {
      const boardState = plugin.getInitialBoardState();
      boardState.tableau[0] = []; // Empty column
      
      const move = {
        action: 'move_card',
        from: { type: 'tableau', column: 0 },
        to: { type: 'foundation', suit: 'hearts' }
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No cards');
    });
  });

  describe('Complex Game Scenarios', () => {
    test('handles multiple card sequence moves', () => {
      const boardState = plugin.getInitialBoardState();
      
      // Set up a sequence: King, Queen, Jack (alternating colors)
      boardState.tableau[0] = [
        createFaceUpCard('spades', 'King'),
        createFaceUpCard('hearts', 'Queen'),
        createFaceUpCard('spades', 'Jack')
      ];
      
      boardState.tableau[1] = []; // Empty target column
      
      const move = {
        action: 'move_card',
        from: { type: 'tableau', column: 0 },
        to: { type: 'tableau', column: 1 },
        cardCount: 3
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(true);
    });

    test('rejects invalid sequences', () => {
      const boardState = plugin.getInitialBoardState();
      
      // Set up invalid sequence: King, Jack (missing Queen)
      boardState.tableau[0] = [
        createFaceUpCard('spades', 'King'),
        createFaceUpCard('hearts', 'Jack')
      ];
      
      boardState.tableau[1] = []; // Empty target column
      
      const move = {
        action: 'move_card',
        from: { type: 'tableau', column: 0 },
        to: { type: 'tableau', column: 1 },
        cardCount: 2
      };
      
      const result = plugin.validateMove(move, boardState, 'player1', mockPlayers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('descending sequence');
    });

    test('handles partial stock draws', () => {
      const boardState = plugin.getInitialBoardState();
      
      // Reduce stock to 2 cards
      boardState.stock = boardState.stock.slice(0, 2);
      
      const move = { action: 'draw_stock' };
      const newBoardState = plugin.applyMove(move, boardState, 'player1', mockPlayers);
      
      expect(newBoardState.stock.length).toBe(0);
      expect(newBoardState.waste.length).toBe(2);
    });
  });
});