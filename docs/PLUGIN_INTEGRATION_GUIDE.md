# Plugin Integration Guide for Card Games

This guide walks you through integrating card games into the board game service using the Card Framework. It covers the complete process from initial setup to deployment.

## Table of Contents

- [Quick Start](#quick-start)
- [Plugin Architecture](#plugin-architecture)
- [Step-by-Step Implementation](#step-by-step-implementation)
- [Frontend Integration](#frontend-integration)
- [Testing Strategy](#testing-strategy)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Quick Start

### 30-Second Setup

```bash
# 1. Create plugin directory
mkdir src/plugins/my-card-game

# 2. Create basic plugin files
touch src/plugins/my-card-game/MyCardGamePlugin.js
touch src/plugins/my-card-game/MyCardGameRenderer.js
touch src/plugins/my-card-game/MyCardGameFrontend.js

# 3. Copy template (recommended)
cp src/plugins/solitaire/SolitairePlugin.js src/plugins/my-card-game/MyCardGamePlugin.js
```

### Minimal Working Example

```javascript
// src/plugins/my-card-game/MyCardGamePlugin.js
const SinglePlayerGamePlugin = require('../../framework/cards/SinglePlayerGamePlugin');
const { DeckManager, CardUtils } = require('../../framework/cards');

class MyCardGamePlugin extends SinglePlayerGamePlugin {
  getGameType() {
    return 'my-card-game';
  }

  getDisplayName() {
    return 'My Card Game';
  }

  getInitialBoardState() {
    const deck = DeckManager.createStandardDeck({ shuffled: true });
    return {
      deck,
      playerHand: DeckManager.deal(deck, 7),
      score: this.initializeScore()
    };
  }

  validateMove(move, boardState, playerId, players) {
    // Basic validation
    if (!move || !move.action) {
      return { valid: false, error: 'Move must specify an action' };
    }
    return { valid: true };
  }

  applyMove(move, boardState, playerId, players) {
    // Apply the move
    const newBoardState = JSON.parse(JSON.stringify(boardState));
    // ... modify newBoardState based on move
    return newBoardState;
  }

  isGameComplete(boardState, players) {
    return boardState.playerHand.length === 0; // Example win condition
  }
}

module.exports = MyCardGamePlugin;
```

## Plugin Architecture

### Core Components

```
src/plugins/my-card-game/
├── MyCardGamePlugin.js     # Backend game logic
├── MyCardGameRenderer.js   # Board visualization
├── MyCardGameFrontend.js   # Move parsing & UI helpers
└── tests/
    ├── MyCardGamePlugin.test.js
    ├── MyCardGameRenderer.test.js
    └── MyCardGameFrontend.test.js
```

### Inheritance Hierarchy

```
GamePlugin (base)
├── SinglePlayerGamePlugin (for card games)
│   └── MyCardGamePlugin
├── MultiPlayerGamePlugin (for board games)
│   └── ChessPlugin, CheckersPlugin
```

### Integration Points

1. **Game Service**: Automatic plugin discovery
2. **API Routes**: RESTful game operations
3. **Frontend Manager**: Move parsing and UI
4. **Image Renderer**: Board visualization
5. **Test Suite**: Automated validation

## Step-by-Step Implementation

### Step 1: Define Game Rules

Document your game before coding:

```markdown
# My Card Game Rules

## Objective
- Get rid of all cards in hand

## Setup
- Standard 52-card deck
- Deal 7 cards to player
- Remaining cards form draw pile

## Gameplay
1. Player draws a card
2. Player plays cards in sequences
3. First to empty hand wins

## Winning
- All cards played successfully
```

### Step 2: Implement Core Plugin

```javascript
// src/plugins/my-card-game/MyCardGamePlugin.js
const SinglePlayerGamePlugin = require('../../framework/cards/SinglePlayerGamePlugin');
const { DeckManager, HandManager, CardUtils } = require('../../framework/cards');

class MyCardGamePlugin extends SinglePlayerGamePlugin {
  /**
   * Plugin metadata
   */
  static getMetadata() {
    return {
      name: 'My Card Game',
      description: 'A simple card game example',
      minPlayers: 1,
      maxPlayers: 1,
      estimatedDuration: '10-15 minutes',
      complexity: 'Easy',
      categories: ['Card Game', 'Single Player'],
      version: '1.0.0'
    };
  }

  getGameType() {
    return 'my-card-game';
  }

  getDisplayName() {
    return 'My Card Game';
  }

  getDescription() {
    return 'Play cards in sequence to empty your hand.';
  }

  /**
   * Initialize game state
   */
  getInitialBoardState() {
    const deck = DeckManager.createStandardDeck({ shuffled: true });
    const playerHand = HandManager.createHand(DeckManager.deal(deck, 7));
    const discardPile = HandManager.createHand();
    
    return {
      deck,
      playerHand,
      discardPile,
      currentCard: null,
      score: this.initializeScore(),
      moves: [],
      gameStarted: Date.now()
    };
  }

  /**
   * Validate player moves
   */
  validateMove(move, boardState, playerId, players) {
    if (!move || typeof move !== 'object') {
      return { valid: false, error: 'Invalid move object' };
    }

    const { action, cardIndex, sequence } = move;

    switch (action) {
      case 'draw_card':
        return this.validateDrawCard(boardState);
      
      case 'play_card':
        return this.validatePlayCard(move, boardState);
      
      case 'play_sequence':
        return this.validatePlaySequence(move, boardState);
      
      default:
        return { valid: false, error: `Unknown action: ${action}` };
    }
  }

  validateDrawCard(boardState) {
    if (DeckManager.isEmpty(boardState.deck)) {
      return { 
        valid: false, 
        error: 'Cannot draw - deck is empty' 
      };
    }
    return { valid: true };
  }

  validatePlayCard(move, boardState) {
    const { cardIndex } = move;
    const card = boardState.playerHand.cards[cardIndex];
    
    if (!card) {
      return { 
        valid: false, 
        error: `No card at index ${cardIndex}` 
      };
    }

    // Check if card can be played
    if (boardState.currentCard) {
      if (!this.canPlayOn(card, boardState.currentCard)) {
        return {
          valid: false,
          error: `Cannot play ${CardUtils.formatCard(card)} on ${CardUtils.formatCard(boardState.currentCard)}`
        };
      }
    }

    return { valid: true };
  }

  canPlayOn(newCard, currentCard) {
    // Example rule: same suit or same rank
    return newCard.suit === currentCard.suit || 
           newCard.rank === currentCard.rank;
  }

  /**
   * Apply validated moves
   */
  applyMove(move, boardState, playerId, players) {
    const newBoardState = JSON.parse(JSON.stringify(boardState));
    
    newBoardState.moves.push({
      ...move,
      timestamp: Date.now(),
      playerId
    });

    switch (move.action) {
      case 'draw_card':
        this.applyDrawCard(newBoardState);
        break;
      
      case 'play_card':
        this.applyPlayCard(move, newBoardState);
        break;
    }

    return newBoardState;
  }

  applyDrawCard(boardState) {
    const drawnCard = DeckManager.deal(boardState.deck, 1)[0];
    HandManager.addCard(boardState.playerHand, drawnCard);
  }

  applyPlayCard(move, boardState) {
    const { cardIndex } = move;
    const card = HandManager.removeCard(boardState.playerHand, cardIndex);
    HandManager.addCard(boardState.discardPile, card);
    boardState.currentCard = card;
  }

  /**
   * Game completion logic
   */
  isGameComplete(boardState, players) {
    return HandManager.isEmpty(boardState.playerHand);
  }

  getWinner(boardState, players) {
    if (this.isGameComplete(boardState, players)) {
      return players[0].user_id || players[0].userId;
    }
    return null;
  }

  /**
   * Score calculation
   */
  getMoveScoreEvent(move, oldBoardState, newBoardState) {
    switch (move.action) {
      case 'play_card':
        return { type: 'move', pointsAwarded: 10 };
      case 'draw_card':
        return { type: 'penalty', points: 5, penaltyType: 'draw_penalty' };
      default:
        return { type: 'move', pointsAwarded: 0 };
    }
  }

  /**
   * Board state validation
   */
  validateBoardState(boardState) {
    const required = ['deck', 'playerHand', 'discardPile', 'score', 'moves'];
    for (const field of required) {
      if (!(field in boardState)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Rendering data
   */
  getRenderData(boardState, players, options = {}) {
    return {
      playerHand: boardState.playerHand,
      discardPile: boardState.discardPile,
      deckSize: DeckManager.getSize(boardState.deck),
      currentCard: boardState.currentCard,
      score: boardState.score,
      moves: boardState.moves.length,
      gameComplete: this.isGameComplete(boardState, players)
    };
  }
}

module.exports = MyCardGamePlugin;
```

### Step 3: Implement Renderer

```javascript
// src/plugins/my-card-game/MyCardGameRenderer.js
const ImageRenderer = require('../../framework/ImageRenderer');
const { CardRenderer } = require('../../framework/cards');

class MyCardGameRenderer {
  static async generateBoardImage(boardState, options = {}) {
    try {
      const svgContent = this.createGameBoardSVG(boardState, options);
      return await ImageRenderer.svgToPng(svgContent, options);
    } catch (error) {
      console.error('Render error:', error);
      return await ImageRenderer.createErrorImage('Game Board Error', options);
    }
  }

  static createGameBoardSVG(boardState, options = {}) {
    const { width = 800, height = 600 } = options;
    
    // Render player hand
    const handSVG = CardRenderer.renderHand(boardState.playerHand, {
      x: 50,
      y: 400,
      overlap: 30,
      maxVisible: 10
    });

    // Render current card
    const currentCardSVG = boardState.currentCard 
      ? CardRenderer.renderCard(boardState.currentCard, {
          x: 350,
          y: 200,
          width: 100,
          height: 140
        })
      : '';

    // Render deck
    const deckSVG = CardRenderer.renderCardBack({
      x: 150,
      y: 200,
      width: 100,
      height: 140,
      label: `${boardState.deck.cards.length} cards`
    });

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#0f5132"/>
        
        <!-- Game Title -->
        <text x="400" y="40" text-anchor="middle" font-family="Arial" font-size="24" fill="white">
          My Card Game
        </text>
        
        <!-- Score -->
        <text x="400" y="70" text-anchor="middle" font-family="Arial" font-size="16" fill="#ccc">
          Score: ${boardState.score.points} | Moves: ${boardState.moves.length}
        </text>
        
        <!-- Deck -->
        <text x="200" y="190" text-anchor="middle" font-family="Arial" font-size="14" fill="white">
          Draw Pile
        </text>
        ${deckSVG}
        
        <!-- Current Card -->
        <text x="400" y="190" text-anchor="middle" font-family="Arial" font-size="14" fill="white">
          Current Card
        </text>
        ${currentCardSVG}
        
        <!-- Player Hand -->
        <text x="400" y="390" text-anchor="middle" font-family="Arial" font-size="14" fill="white">
          Your Hand (${boardState.playerHand.cards.length} cards)
        </text>
        ${handSVG}
      </svg>
    `;
  }
}

module.exports = MyCardGameRenderer;
```

### Step 4: Frontend Integration

```javascript
// Add to public/js/GamePluginManager.js in loadDefaultPlugins()

this.registerPlugin('my-card-game', {
  parseMove: (moveText) => {
    const cleanMove = moveText.trim().toLowerCase();
    
    // Draw card
    if (cleanMove === 'd' || cleanMove === 'draw') {
      return { action: 'draw_card' };
    }
    
    // Play card by index
    const playMatch = cleanMove.match(/^(?:play|p)\s*(\d+)$/);
    if (playMatch) {
      return { 
        action: 'play_card', 
        cardIndex: parseInt(playMatch[1]) - 1 
      };
    }
    
    throw new Error(`Unknown move: "${moveText}". Try "d" to draw or "p1" to play card 1.`);
  },

  formatMove: (moveData) => {
    if (typeof moveData === 'string') return moveData;
    
    const { action, cardIndex } = moveData;
    switch (action) {
      case 'draw_card': return 'Draw card';
      case 'play_card': return `Play card ${cardIndex + 1}`;
      default: return action;
    }
  },

  getMoveInputPlaceholder: () => 'd (draw), p1 (play card 1)',
  
  getMoveInputHelp: () => 'Commands: d=draw card, p1-p7=play card by position',
  
  validateMoveFormat: (moveText) => {
    if (!moveText || moveText.trim().length === 0) {
      return { valid: false, error: 'Move cannot be empty' };
    }
    return { valid: true };
  },

  getDisplayName: () => 'My Card Game',
  getDescription: () => 'Play cards in sequence to empty your hand',
  
  getUIConfig: () => ({
    showSwitchUserButton: false,
    showTestMoveButton: true,
    showMoveHistory: true,
    showMoveHelp: true,
    singlePlayer: true
  })
});
```

### Step 5: Testing

```javascript
// tests/plugins/my-card-game/MyCardGamePlugin.test.js
const MyCardGamePlugin = require('../../../src/plugins/my-card-game/MyCardGamePlugin');

describe('MyCardGamePlugin', () => {
  let plugin;
  let boardState;
  let players;

  beforeEach(() => {
    plugin = new MyCardGamePlugin();
    boardState = plugin.getInitialBoardState();
    players = [{ userId: 'player1' }];
  });

  describe('initialization', () => {
    it('should create initial board state', () => {
      expect(boardState).toHaveProperty('deck');
      expect(boardState).toHaveProperty('playerHand');
      expect(boardState).toHaveProperty('discardPile');
      expect(boardState.playerHand.cards).toHaveLength(7);
    });
  });

  describe('move validation', () => {
    it('should validate draw card move', () => {
      const move = { action: 'draw_card' };
      const result = plugin.validateMove(move, boardState, 'player1', players);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid moves', () => {
      const move = { action: 'invalid_action' };
      const result = plugin.validateMove(move, boardState, 'player1', players);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  describe('move application', () => {
    it('should apply draw card move', () => {
      const move = { action: 'draw_card' };
      const newState = plugin.applyMove(move, boardState, 'player1', players);
      
      expect(newState.playerHand.cards).toHaveLength(8);
      expect(newState.deck.cards.length).toBe(boardState.deck.cards.length - 1);
    });
  });

  describe('game completion', () => {
    it('should detect game completion', () => {
      const emptyHandState = { ...boardState, playerHand: { cards: [] } };
      expect(plugin.isGameComplete(emptyHandState, players)).toBe(true);
    });
  });
});
```

## Frontend Integration

### Move Input Parsing

Design intuitive move commands:

```javascript
// Good examples
"d" → { action: 'draw_card' }
"p3" → { action: 'play_card', cardIndex: 2 }
"sequence 1,2,3" → { action: 'play_sequence', cardIndices: [0,1,2] }

// User-friendly shortcuts
const shortcuts = {
  'd': 'draw',
  'p': 'play',
  's': 'sequence',
  'h': 'hint',
  'u': 'undo'
};
```

### UI Configuration

Customize the interface per game:

```javascript
getUIConfig: () => ({
  showSwitchUserButton: false,    // Hide for single-player
  showTestMoveButton: true,       // Show debug button
  showMoveHistory: true,          // Show move log
  showMoveHelp: true,            // Show command help
  singlePlayer: true,            // Single-player optimizations
  customButtons: [               // Add game-specific buttons
    {
      id: 'hint-btn',
      text: 'Hint',
      action: 'show-hint',
      icon: 'lightbulb'
    }
  ]
})
```

### Error Messages

Provide helpful error feedback:

```javascript
validateMove(move, boardState) {
  if (!move.cardIndex && move.action === 'play_card') {
    return {
      valid: false,
      error: 'Must specify which card to play',
      suggestion: 'Try "p1" to play the first card',
      helpUrl: '/help/my-card-game#playing-cards'
    };
  }
}
```

## Testing Strategy

### Test Levels

1. **Unit Tests**: Individual methods
2. **Integration Tests**: Plugin + Framework
3. **End-to-End Tests**: Full game flow
4. **Performance Tests**: Large game states

### Coverage Targets

- **Plugin Logic**: 90%+ coverage
- **Move Validation**: 100% coverage  
- **Rendering**: 80%+ coverage
- **Frontend**: 85%+ coverage

### Test Data Generation

```javascript
// Helper functions for test data
function createTestBoardState(overrides = {}) {
  const plugin = new MyCardGamePlugin();
  const baseState = plugin.getInitialBoardState();
  return { ...baseState, ...overrides };
}

function createWinningSequence(boardState) {
  // Generate moves that lead to victory
  const moves = [];
  // ... logic to create winning moves
  return moves;
}
```

## Deployment

### Plugin Registration

The game service automatically discovers plugins in `src/plugins/*/`:

```javascript
// Automatic registration in GamePluginRegistry
const plugin = new MyCardGamePlugin();
registry.registerPlugin(plugin.getGameType(), plugin);
```

### Database Schema

Your plugin inherits the standard game schema:

```sql
-- Games table (inherited)
games: id, name, game_type, status, board_state, current_player_id, created_at

-- Moves table (inherited)  
moves: id, game_id, player_id, move_number, move_data, created_at

-- Game-specific data stored in board_state JSON field
```

### Environment Configuration

```bash
# .env settings for card games
CARD_RENDER_CACHE=true
CARD_IMAGE_SIZE=512
CARD_STYLE=classic
DEBUG_CARD_GAMES=false
```

## Troubleshooting

### Common Issues

#### Plugin Not Loading
```bash
# Check plugin discovery
npm test -- --testNamePattern="plugin registration"

# Verify file structure
ls -la src/plugins/my-card-game/

# Check class exports
node -e "console.log(require('./src/plugins/my-card-game/MyCardGamePlugin'))"
```

#### Move Validation Errors
```javascript
// Add debug logging
validateMove(move, boardState, playerId, players) {
  console.log('Validating move:', { move, boardState: this.summarizeBoardState(boardState) });
  // ... validation logic
}
```

#### Rendering Issues
```javascript
// Test rendering independently
const renderer = require('./src/plugins/my-card-game/MyCardGameRenderer');
const svg = renderer.createGameBoardSVG(testBoardState);
console.log(svg); // Check SVG output
```

#### Frontend Parsing Problems
```javascript
// Test move parsing
const plugin = gamePluginManager.getPlugin('my-card-game');
try {
  const parsed = plugin.parseMove('d');
  console.log('Parsed successfully:', parsed);
} catch (error) {
  console.error('Parse error:', error.message);
}
```

### Debug Mode

Enable comprehensive debugging:

```javascript
// Set debug environment
process.env.DEBUG_CARD_GAMES = 'true';

// Add to plugin constructor
constructor() {
  super();
  this.debug = process.env.DEBUG_CARD_GAMES === 'true';
}

// Use throughout plugin
if (this.debug) {
  console.log('[MyCardGame] Move applied:', move, 'New state:', newBoardState);
}
```

### Performance Monitoring

```javascript
// Add timing to expensive operations
validateMove(move, boardState, playerId, players) {
  const start = Date.now();
  const result = this.actualValidateMove(move, boardState, playerId, players);
  const duration = Date.now() - start;
  
  if (duration > 100) { // Log slow validations
    console.warn(`Slow validation: ${duration}ms for move:`, move);
  }
  
  return result;
}
```

## Next Steps

1. **Implement your specific game rules**
2. **Add comprehensive tests**
3. **Design beautiful card rendering**
4. **Create intuitive move commands**
5. **Test with real players**
6. **Optimize performance**
7. **Document your game rules**

For more examples, see:
- `src/plugins/solitaire/` - Complete single-player implementation
- `src/plugins/chess/` - Multi-player game example
- `docs/CARD_FRAMEWORK_API.md` - Complete API reference

The Card Framework handles all the complex infrastructure, letting you focus on implementing your game's unique rules and experience.