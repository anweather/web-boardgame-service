const CardFramework = require('../../../src/framework/cards');
const GamePlugin = require('../../../src/ports/GamePlugin');

describe('Card Framework Integration', () => {
  describe('Framework Exports', () => {
    test('exports all required modules and functions', () => {
      // Core modules
      expect(CardFramework.CardUtils).toBeDefined();
      expect(CardFramework.DeckManager).toBeDefined();
      expect(CardFramework.HandManager).toBeDefined();
      
      // Convenience methods
      expect(typeof CardFramework.createCard).toBe('function');
      expect(typeof CardFramework.createStandardDeck).toBe('function');
      expect(typeof CardFramework.createCustomDeck).toBe('function');
      expect(typeof CardFramework.createHand).toBe('function');
      
      // Common operations
      expect(typeof CardFramework.shuffle).toBe('function');
      expect(typeof CardFramework.deal).toBe('function');
      expect(typeof CardFramework.draw).toBe('function');
      
      // Validation functions
      expect(typeof CardFramework.isValidCard).toBe('function');
      expect(typeof CardFramework.isValidDeck).toBe('function');
      expect(typeof CardFramework.isValidHand).toBe('function');
      
      // Card properties
      expect(typeof CardFramework.isRed).toBe('function');
      expect(typeof CardFramework.isBlack).toBe('function');
      expect(typeof CardFramework.isFaceCard).toBe('function');
      expect(typeof CardFramework.isAce).toBe('function');
      
      // Serialization
      expect(typeof CardFramework.serializeDeck).toBe('function');
      expect(typeof CardFramework.deserializeDeck).toBe('function');
      
      // Constants
      expect(Array.isArray(CardFramework.SUITS)).toBe(true);
      expect(Array.isArray(CardFramework.RANKS)).toBe(true);
      expect(CardFramework.SUITS).toHaveLength(4);
      expect(CardFramework.RANKS).toHaveLength(13);
      
      // Version
      expect(typeof CardFramework.VERSION).toBe('string');
    });
  });

  describe('Complete Card Game Workflow', () => {
    test('simulates a complete card game workflow', () => {
      // Create a deck and shuffle it
      const deck = CardFramework.createStandardDeck();
      expect(CardFramework.remaining(deck)).toBe(52);
      
      CardFramework.shuffle(deck);
      expect(deck.shuffled).toBe(true);
      
      // Create hands for players
      const player1Hand = CardFramework.createHand('player1', 7);
      const player2Hand = CardFramework.createHand('player2', 7);
      
      // Deal cards to players
      const dealtCards = CardFramework.deal(deck, 2, 7);
      CardFramework.HandManager.addCards(player1Hand, dealtCards[0]);
      CardFramework.HandManager.addCards(player2Hand, dealtCards[1]);
      
      // Verify hands
      expect(CardFramework.HandManager.getHandSize(player1Hand)).toBe(7);
      expect(CardFramework.HandManager.getHandSize(player2Hand)).toBe(7);
      expect(CardFramework.DeckManager.remaining(deck)).toBe(38); // 52 - 14 = 38
      
      // Test hand operations
      CardFramework.HandManager.sortBy(player1Hand, 'rank');
      const handStats = CardFramework.HandManager.getHandStats(player1Hand);
      expect(handStats.totalCards).toBe(7);
      expect(handStats.totalValue).toBeGreaterThan(0);
      
      // Test card playing
      const firstCard = player1Hand.cards[0];
      const canPlay = CardFramework.HandManager.canPlay(player1Hand, firstCard, { canPlayAny: true });
      expect(canPlay).toBe(true);
      
      // Serialize and deserialize deck state
      const serializedDeck = CardFramework.serializeDeck(deck);
      expect(typeof serializedDeck).toBe('string');
      
      const deserializedDeck = CardFramework.deserializeDeck(serializedDeck);
      expect(deserializedDeck.cards).toEqual(deck.cards);
      expect(deserializedDeck.shuffled).toBe(deck.shuffled);
    });
  });

  describe('Plugin System Integration', () => {
    test('integrates with GamePlugin interface', () => {
      // Create a mock card game plugin that extends GamePlugin
      class MockSolitairePlugin extends GamePlugin {
        getGameType() { return 'mock-solitaire'; }
        getDisplayName() { return 'Mock Solitaire'; }
        getDescription() { return 'Test solitaire game'; }
        getMinPlayers() { return 1; }
        getMaxPlayers() { return 1; }
        
        getInitialBoardState(gameSettings = {}) {
          // Use card framework to create initial state
          const deck = CardFramework.createStandardDeck();
          CardFramework.shuffle(deck);
          
          // Deal tableau for solitaire (7 columns)
          const tableau = [];
          for (let col = 0; col < 7; col++) {
            const columnCards = CardFramework.draw(deck, col + 1);
            tableau.push(columnCards);
          }
          
          const playerHand = CardFramework.createHand('player1');
          
          return {
            deck: CardFramework.serializeDeck(deck),
            tableau,
            foundation: [[], [], [], []],
            waste: [],
            playerHand: playerHand,
            currentPlayer: 'player1',
            moveCount: 0
          };
        }
        
        validateMove(move, boardState, playerId, players) {
          // Mock validation - always valid for test
          return { valid: true };
        }
        
        applyMove(move, boardState, playerId, players) {
          // Mock move application
          return {
            ...boardState,
            moveCount: boardState.moveCount + 1
          };
        }
        
        isGameComplete(boardState, players) {
          return false; // Mock - game never complete
        }
        
        getWinner(boardState, players) {
          return null; // Mock - no winner
        }
        
        getNextPlayer(currentPlayerId, players, boardState) {
          return currentPlayerId; // Single player game
        }
        
        getAvailableColors(playerCount) {
          return ['player'];
        }
        
        assignPlayerColor(playerOrder, totalPlayers) {
          return 'player';
        }
        
        validateBoardState(boardState) {
          return true; // Mock validation
        }
        
        getRenderData(boardState, players, options = {}) {
          return {
            tableau: boardState.tableau,
            foundation: boardState.foundation,
            waste: boardState.waste
          };
        }
        
        getGameStats(boardState, players) {
          return {
            gameType: this.getGameType(),
            moveCount: boardState.moveCount,
            cardsRemaining: CardFramework.deserializeDeck(boardState.deck).cards.length
          };
        }
      }
      
      // Test plugin creation and usage
      const plugin = new MockSolitairePlugin();
      expect(plugin.getGameType()).toBe('mock-solitaire');
      expect(plugin.getMinPlayers()).toBe(1);
      expect(plugin.getMaxPlayers()).toBe(1);
      
      // Test initial board state creation
      const initialState = plugin.getInitialBoardState();
      expect(initialState.tableau).toHaveLength(7);
      expect(initialState.foundation).toHaveLength(4);
      expect(typeof initialState.deck).toBe('string'); // Serialized deck
      
      // Verify tableau has correct card distribution (1, 2, 3, 4, 5, 6, 7 cards)
      const expectedCardCounts = [1, 2, 3, 4, 5, 6, 7];
      initialState.tableau.forEach((column, index) => {
        expect(column).toHaveLength(expectedCardCounts[index]);
      });
      
      // Verify deck state
      const deck = CardFramework.deserializeDeck(initialState.deck);
      const totalDealtCards = expectedCardCounts.reduce((sum, count) => sum + count, 0);
      expect(CardFramework.remaining(deck)).toBe(52 - totalDealtCards);
      
      // Test move validation and application
      const mockMove = { from: 'tableau-0', to: 'foundation-0' };
      const validation = plugin.validateMove(mockMove, initialState, 'player1', []);
      expect(validation.valid).toBe(true);
      
      const newState = plugin.applyMove(mockMove, initialState, 'player1', []);
      expect(newState.moveCount).toBe(1);
      
      // Test game stats
      const stats = plugin.getGameStats(newState, []);
      expect(stats.gameType).toBe('mock-solitaire');
      expect(stats.moveCount).toBe(1);
      expect(typeof stats.cardsRemaining).toBe('number');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles invalid operations gracefully', () => {
      // Test invalid deck operations
      const invalidDeck = { cards: 'not an array' };
      expect(() => {
        CardFramework.shuffle(invalidDeck);
      }).toThrow('Invalid deck');
      
      // Test invalid hand operations
      const invalidHand = { cards: 'not an array' };
      const validCard = CardFramework.CardUtils.createCard('hearts', 'Ace', 1);
      expect(() => {
        CardFramework.HandManager.addCard(invalidHand, validCard);
      }).toThrow('Invalid hand');
      
      // Test serialization with invalid data
      expect(() => {
        CardFramework.deserializeDeck('invalid json');
      }).toThrow('Invalid deck data');
    });
    
    test('maintains state consistency through operations', () => {
      const deck = CardFramework.createStandardDeck();
      const originalCardCount = CardFramework.remaining(deck);
      
      // Shuffle shouldn't change card count
      CardFramework.shuffle(deck);
      expect(CardFramework.remaining(deck)).toBe(originalCardCount);
      
      // Draw cards and verify count
      const drawnCards = CardFramework.draw(deck, 10);
      expect(drawnCards).toHaveLength(10);
      expect(CardFramework.remaining(deck)).toBe(originalCardCount - 10);
      
      // Add cards back and verify count
      CardFramework.DeckManager.addToTop(deck, drawnCards);
      expect(CardFramework.remaining(deck)).toBe(originalCardCount);
    });
  });
});