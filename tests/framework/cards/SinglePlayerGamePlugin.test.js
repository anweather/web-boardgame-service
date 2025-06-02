const SinglePlayerGamePlugin = require('../../../src/framework/cards/SinglePlayerGamePlugin');

describe('SinglePlayerGamePlugin', () => {
  // Mock implementation for testing
  class MockSinglePlayerGame extends SinglePlayerGamePlugin {
    getGameType() { return 'mock-single-player'; }
    getDisplayName() { return 'Mock Single Player Game'; }
    getDescription() { return 'Test single player game'; }
    
    getInitialBoardState() {
      return {
        score: this.initializeScore(),
        gameState: 'active',
        moves: []
      };
    }
    
    validateMove(move, boardState, playerId, players) {
      if (!move.type) {
        return { valid: false, error: 'Move must have a type' };
      }
      return { valid: true };
    }
    
    applyMove(move, boardState, playerId, players) {
      const newBoardState = { ...boardState };
      newBoardState.moves = [...boardState.moves, move];
      return newBoardState;
    }
    
    isGameComplete(boardState, players) {
      return boardState.moves.length >= 10; // Game ends after 10 moves
    }
    
    getWinner(boardState, players) {
      if (this.isGameComplete(boardState, players)) {
        return players[0].user_id || players[0].userId;
      }
      return null;
    }
    
    validateBoardState(boardState) {
      return boardState && typeof boardState === 'object';
    }
    
    getRenderData(boardState, players, options = {}) {
      return { moves: boardState.moves, score: boardState.score };
    }
  }

  let plugin;
  let mockPlayers;

  beforeEach(() => {
    plugin = new MockSinglePlayerGame();
    mockPlayers = [{ user_id: 'player1', userId: 'player1' }];
  });

  describe('Single-Player Validation', () => {
    test('enforces exactly 1 player minimum and maximum', () => {
      expect(plugin.getMinPlayers()).toBe(1);
      expect(plugin.getMaxPlayers()).toBe(1);
    });

    test('validates single-player game configuration', () => {
      // Valid single-player setup
      const validResult = plugin.validateGameConfiguration(mockPlayers);
      expect(validResult.valid).toBe(true);
      
      // Invalid multi-player setup
      const multiPlayers = [
        { user_id: 'player1' },
        { user_id: 'player2' }
      ];
      const invalidResult = plugin.validateGameConfiguration(multiPlayers);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('exactly 1 player');
    });

    test('validates available colors for single player', () => {
      const colors = plugin.getAvailableColors(1);
      expect(colors).toEqual(['player']);
      
      expect(() => {
        plugin.getAvailableColors(2);
      }).toThrow('exactly 1 player');
    });

    test('assigns player color correctly', () => {
      const color = plugin.assignPlayerColor(1, 1);
      expect(color).toBe('player');
      
      expect(() => {
        plugin.assignPlayerColor(2, 2);
      }).toThrow('exactly 1 player');
    });

    test('validates game can start with 1 player', () => {
      expect(plugin.canStartGame(mockPlayers)).toBe(true);
      expect(plugin.canStartGame([])).toBe(false);
      expect(plugin.canStartGame([...mockPlayers, { user_id: 'player2' }])).toBe(false);
    });
  });

  describe('Turn Management for Solo Play', () => {
    test('next player is always the same player', () => {
      const nextPlayer = plugin.getNextPlayer('player1', mockPlayers, {});
      expect(nextPlayer).toBe('player1');
    });

    test('throws error for invalid player count in turn management', () => {
      const multiPlayers = [{ user_id: 'player1' }, { user_id: 'player2' }];
      expect(() => {
        plugin.getNextPlayer('player1', multiPlayers, {});
      }).toThrow('exactly 1 player');
    });

    test('validates single-player moves correctly', () => {
      const validMove = { type: 'test-move' };
      const result = plugin.validateSinglePlayerMove(validMove, {}, 'player1', mockPlayers);
      expect(result.valid).toBe(true);
      
      // Test with wrong player
      const wrongPlayerResult = plugin.validateSinglePlayerMove(validMove, {}, 'player2', mockPlayers);
      expect(wrongPlayerResult.valid).toBe(false);
      expect(wrongPlayerResult.error).toContain('game\'s player');
    });
  });

  describe('Score Tracking System', () => {
    test('initializes score correctly', () => {
      const score = plugin.initializeScore();
      
      expect(score.points).toBe(0);
      expect(score.moves).toBe(0);
      expect(typeof score.timeStarted).toBe('number');
      expect(score.timeElapsed).toBe(0);
      expect(Array.isArray(score.bonuses)).toBe(true);
      expect(Array.isArray(score.penalties)).toBe(true);
    });

    test('updates score for move events', () => {
      const initialScore = plugin.initializeScore();
      const moveEvent = { type: 'move', pointsAwarded: 10 };
      
      const updatedScore = plugin.updateScore(initialScore, moveEvent);
      
      expect(updatedScore.moves).toBe(1);
      expect(updatedScore.points).toBe(10);
    });

    test('updates score for bonus events', () => {
      const initialScore = plugin.initializeScore();
      const bonusEvent = {
        type: 'bonus',
        bonusType: 'combo',
        points: 50,
        description: 'Combo bonus'
      };
      
      const updatedScore = plugin.updateScore(initialScore, bonusEvent);
      
      expect(updatedScore.points).toBe(50);
      expect(updatedScore.bonuses).toHaveLength(1);
      expect(updatedScore.bonuses[0].type).toBe('combo');
      expect(updatedScore.bonuses[0].points).toBe(50);
    });

    test('updates score for penalty events', () => {
      const initialScore = { ...plugin.initializeScore(), points: 100 };
      const penaltyEvent = {
        type: 'penalty',
        penaltyType: 'time',
        points: 25,
        description: 'Time penalty'
      };
      
      const updatedScore = plugin.updateScore(initialScore, penaltyEvent);
      
      expect(updatedScore.points).toBe(75);
      expect(updatedScore.penalties).toHaveLength(1);
      expect(updatedScore.penalties[0].type).toBe('time');
      expect(updatedScore.penalties[0].points).toBe(25);
    });

    test('updates score for time events', () => {
      const initialScore = plugin.initializeScore();
      const timeEvent = { type: 'time_update' };
      
      // Simulate some time passing
      jest.spyOn(Date, 'now').mockReturnValue(initialScore.timeStarted + 5000);
      
      const updatedScore = plugin.updateScore(initialScore, timeEvent);
      
      expect(updatedScore.timeElapsed).toBe(5000);
      
      Date.now.mockRestore();
    });

    test('prevents negative points', () => {
      const initialScore = { ...plugin.initializeScore(), points: 10 };
      const penaltyEvent = {
        type: 'penalty',
        penaltyType: 'mistake',
        points: 20,
        description: 'Big mistake'
      };
      
      const updatedScore = plugin.updateScore(initialScore, penaltyEvent);
      
      expect(updatedScore.points).toBe(0); // Should not go below 0
    });

    test('throws error for unknown score event types', () => {
      const initialScore = plugin.initializeScore();
      const unknownEvent = { type: 'unknown-event' };
      
      expect(() => {
        plugin.updateScore(initialScore, unknownEvent);
      }).toThrow('Unknown score event type');
    });
  });

  describe('Final Score Calculation', () => {
    test('calculates final score with completion', () => {
      const boardState = { moves: Array(10).fill({ type: 'move' }) }; // Complete game
      const currentScore = {
        ...plugin.initializeScore(),
        points: 100,
        moves: 10
      };
      
      const finalScore = plugin.calculateFinalScore(boardState, currentScore);
      
      expect(finalScore.final).toBe(true);
      expect(typeof finalScore.timeElapsed).toBe('number');
    });

    test('includes completion and time bonuses when overridden', () => {
      // Create plugin with bonuses
      class BonusPlugin extends MockSinglePlayerGame {
        getCompletionBonus() { return 500; }
        getTimeBonus() { return 100; }
      }
      
      const bonusPlugin = new BonusPlugin();
      const boardState = { moves: Array(10).fill({ type: 'move' }) };
      const currentScore = {
        ...bonusPlugin.initializeScore(),
        points: 200,
        moves: 10
      };
      
      const finalScore = bonusPlugin.calculateFinalScore(boardState, currentScore);
      
      expect(finalScore.points).toBe(800); // 200 + 500 + 100
      expect(finalScore.bonuses).toHaveLength(2);
      expect(finalScore.bonuses.some(b => b.type === 'completion')).toBe(true);
      expect(finalScore.bonuses.some(b => b.type === 'time')).toBe(true);
    });
  });

  describe('Player vs. Game Mechanics', () => {
    test('applies single-player move with score update', () => {
      const boardState = {
        ...plugin.getInitialBoardState(),
        moves: []
      };
      const move = { type: 'test-move' };
      
      const newBoardState = plugin.applySinglePlayerMove(move, boardState, 'player1', mockPlayers);
      
      expect(newBoardState.moves).toHaveLength(1);
      expect(newBoardState.moves[0]).toEqual(move);
      expect(newBoardState.score.moves).toBe(1); // Score should be updated
    });

    test('default move score event awards no points', () => {
      const moveEvent = plugin.getMoveScoreEvent({ type: 'move' }, {}, {});
      expect(moveEvent.type).toBe('move');
      expect(moveEvent.pointsAwarded).toBe(0);
    });

    test('default auto-progression behavior', () => {
      const boardState = { test: 'state' };
      
      expect(plugin.shouldAutoProgress(boardState)).toBe(false);
      expect(plugin.autoProgress(boardState)).toBe(boardState);
    });
  });

  describe('Game Statistics', () => {
    test('includes single-player specific statistics', () => {
      const boardState = {
        score: {
          ...plugin.initializeScore(),
          points: 150,
          moves: 5
        }
      };
      
      const stats = plugin.getGameStats(boardState, mockPlayers);
      
      expect(stats.isSinglePlayer).toBe(true);
      expect(stats.playerCount).toBe(1);
      expect(stats.score).toEqual(boardState.score);
      expect(stats.totalMoves).toBe(5);
      expect(stats.currentPoints).toBe(150);
      expect(typeof stats.timeElapsed).toBe('number');
      expect(typeof stats.timeElapsedFormatted).toBe('string');
    });

    test('handles missing score in statistics', () => {
      const boardState = {};
      const stats = plugin.getGameStats(boardState, mockPlayers);
      
      expect(stats.isSinglePlayer).toBe(true);
      expect(stats.playerCount).toBe(1);
      expect(stats.score).toBeUndefined();
    });

    test('formats time correctly', () => {
      expect(plugin.formatTime(0)).toBe('0:00');
      expect(plugin.formatTime(30000)).toBe('0:30');
      expect(plugin.formatTime(90000)).toBe('1:30');
      expect(plugin.formatTime(3661000)).toBe('61:01');
    });
  });

  describe('Integration with Base GamePlugin', () => {
    test('inherits all required GamePlugin methods', () => {
      // Test that all abstract methods are properly implemented or delegated
      expect(typeof plugin.getGameType).toBe('function');
      expect(typeof plugin.getDisplayName).toBe('function');
      expect(typeof plugin.getDescription).toBe('function');
      expect(typeof plugin.getInitialBoardState).toBe('function');
      expect(typeof plugin.validateMove).toBe('function');
      expect(typeof plugin.applyMove).toBe('function');
      expect(typeof plugin.isGameComplete).toBe('function');
      expect(typeof plugin.getWinner).toBe('function');
      expect(typeof plugin.validateBoardState).toBe('function');
      expect(typeof plugin.getRenderData).toBe('function');
    });

    test('maintains compatibility with GamePlugin interface', () => {
      const boardState = plugin.getInitialBoardState();
      expect(boardState).toBeDefined();
      expect(boardState.score).toBeDefined();
      
      const renderData = plugin.getRenderData(boardState, mockPlayers);
      expect(renderData).toBeDefined();
      
      const stats = plugin.getGameStats(boardState, mockPlayers);
      expect(stats.gameType).toBe('mock-single-player');
    });
  });

  describe('Error Handling', () => {
    test('handles invalid player configurations gracefully', () => {
      const emptyPlayers = [];
      const validation = plugin.validateGameConfiguration(emptyPlayers);
      expect(validation.valid).toBe(false);
      
      const tooManyPlayers = [
        { user_id: 'player1' },
        { user_id: 'player2' },
        { user_id: 'player3' }
      ];
      const validation2 = plugin.validateGameConfiguration(tooManyPlayers);
      expect(validation2.valid).toBe(false);
    });

    test('handles edge cases in score calculation', () => {
      // Test with invalid score object
      const invalidScore = null;
      expect(() => {
        plugin.updateScore(invalidScore, { type: 'move' });
      }).toThrow();
      
      // Test with invalid event type
      const validScore = plugin.initializeScore();
      expect(() => {
        plugin.updateScore(validScore, { type: 'invalid-type' });
      }).toThrow('Unknown score event type');
    });
  });
});