# Game Plugin Development Guide

This guide explains how to create new game types for the Correspondence Board Game Service using the plugin architecture.

## Overview

The Correspondence Board Game Service uses a modular plugin architecture that allows developers to add new game types without modifying the core application. Each game plugin provides:

- **Backend Logic**: Game rules, move validation, state management
- **Frontend Logic**: Move parsing, formatting, user interface helpers  
- **Rendering**: Board/game visualization as SVG and PNG images
- **Extension Points**: Hooks for custom game completion logic and events

## Architecture Models

The framework supports different game types through specialized base classes:

### Single-Player Games
- **Base Class**: `SinglePlayerGamePlugin`
- **Examples**: Solitaire, Puzzle games
- **Features**: Built-in scoring system, time tracking, completion bonuses

### Multi-Player Games  
- **Base Class**: `GamePlugin` 
- **Examples**: Chess, Checkers, Hearts
- **Features**: Turn management, player coordination, multiplayer notifications

### Card Games
- **Framework**: `CardFramework`
- **Components**: `DeckManager`, `CardUtils`, `CardRenderer`
- **Features**: Standard card handling, shuffling, validation

## Plugin Architecture

### Directory Structure

```
src/plugins/
├── your-game/
│   ├── YourGamePlugin.js     # Main plugin class (backend)
│   ├── YourGameFrontend.js   # Frontend utilities
│   └── YourGameRenderer.js   # Board rendering
└── chess/                    # Example: Chess plugin
    ├── ChessPlugin.js
    ├── ChessFrontend.js
    └── ChessRenderer.js
```

### Plugin Components

1. **Main Plugin Class**: Extends `GamePlugin` and implements core game logic
2. **Frontend Module**: Handles user input parsing and formatting
3. **Renderer Module**: Generates board images and SVG content
4. **Framework Integration**: Uses common utilities for consistency

## Creating a New Game Plugin

### Step 1: Choose Base Class

Select the appropriate base class for your game type:

#### For Single-Player Games (like Solitaire):

```javascript
const SinglePlayerGamePlugin = require('../../framework/cards/SinglePlayerGamePlugin');

class YourSolitairePlugin extends SinglePlayerGamePlugin {
  static getMetadata() {
    return {
      name: 'Your Solitaire Game',
      description: 'Description of your solitaire variant',
      minPlayers: 1,
      maxPlayers: 1,
      estimatedDuration: '5-15 minutes',
      complexity: 'Medium',
      categories: ['Solitaire', 'Card Game', 'Single Player'],
      version: '1.0.0'
    };
  }

  getGameType() { return 'your-solitaire'; }
  getDisplayName() { return 'Your Solitaire Game'; }
  
  getInitialBoardState(gameSettings = {}) {
    // Use card framework utilities
    const deck = DeckManager.createStandardDeck({ shuffled: true });
    
    return {
      // Your specific solitaire layout
      tableau: this.dealTableau(deck),
      foundation: this.initFoundation(),
      stock: deck.remaining,
      waste: [],
      score: this.initializeScore(), // Inherited scoring system
      moves: []
    };
  }

  // Extension point for game completion bonuses
  async onGameComplete(boardState, players, winner) {
    if (boardState.score && winner) {
      const completionBonus = this.getCompletionBonus(boardState, boardState.score);
      boardState.score = this.updateScore(boardState.score, {
        type: 'completion',
        pointsAwarded: completionBonus,
        description: 'Game completion bonus'
      });
    }
  }
}
```

#### For Multi-Player Games (like Chess):

```javascript
const GamePlugin = require('../../ports/GamePlugin');

class YourBoardGamePlugin extends GamePlugin {
  static getMetadata() {
    return {
      name: 'Your Board Game',
      description: 'Description of your board game',
      minPlayers: 2,
      maxPlayers: 4,
      estimatedDuration: '30-60 minutes',
      complexity: 'Medium',
      categories: ['Strategy', 'Board Game'],
      version: '1.0.0'
    };
  }

  getInitialBoardState(gameSettings = {}) {
    return {
      board: this.createInitialBoard(),
      currentPlayer: 0,
      round: 1,
      gamePhase: 'setup' // setup, playing, endgame
    };
  }

  getNextPlayer(currentPlayerId, players, boardState) {
    // Implement turn order logic
    const currentIndex = players.findIndex(p => p.user_id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % players.length;
    return players[nextIndex].user_id;
  }
}
```

### Step 2: Frontend Module

Create `src/plugins/your-game/YourGameFrontend.js`:

```javascript
class YourGameFrontend {
  static parseMove(moveText) {
    // Parse user input into move object
    // Example: "A1-B2" -> { from: 'A1', to: 'B2' }
    if (!moveText || typeof moveText !== 'string') {
      throw new Error('Invalid move input');
    }
    
    const trimmed = moveText.trim();
    // Add your parsing logic here
    
    return trimmed;
  }

  static formatMove(moveData) {
    // Format move for display in history
    if (typeof moveData === 'string') {
      return moveData;
    }
    
    if (moveData && moveData.from && moveData.to) {
      return `${moveData.from} → ${moveData.to}`;
    }
    
    return JSON.stringify(moveData);
  }

  static getMoveInputPlaceholder() {
    return 'Enter move (e.g., A1-B2)';
  }

  static getMoveInputHelp() {
    return 'Enter your move in the format: source-destination';
  }

  static validateMoveFormat(moveText) {
    if (!moveText || typeof moveText !== 'string') {
      return { valid: false, error: 'Move cannot be empty' };
    }

    const trimmed = moveText.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Move cannot be empty' };
    }

    // Add your format validation here
    return { valid: true };
  }

  static getDisplayName() {
    return 'Your Game';
  }

  static getDescription() {
    return 'Description of your game';
  }
}

module.exports = YourGameFrontend;
```

### Step 3: Renderer Module

Create `src/plugins/your-game/YourGameRenderer.js`:

```javascript
const ImageRenderer = require('../../framework/ImageRenderer');

class YourGameRenderer {
  static async generateBoardImage(boardState, options = {}) {
    try {
      const svgContent = this.createBoardSVG(boardState, options);
      return await ImageRenderer.svgToPng(svgContent, {
        width: 400,
        height: 400,
        density: 150,
        ...options
      });
    } catch (error) {
      console.error('Board rendering error:', error);
      return await ImageRenderer.createErrorImage('Rendering Error', options);
    }
  }

  static createBoardSVG(boardState, options = {}) {
    const {
      width = 400,
      height = 400,
      title = 'Your Game Board'
    } = options;

    // Use common framework for consistent styling
    const frameOptions = {
      width,
      height,
      title,
      backgroundColor: '#f9f9f9',
      borderColor: '#333',
      borderWidth: 2,
      margin: 15
    };

    // Create SVG frame
    const frame = ImageRenderer.createSVGFrame(width, height, frameOptions);
    
    // Add title
    const titleElement = ImageRenderer.addTitle(title, width / 2, 15);
    
    // Add your game-specific rendering here
    const gameContent = this.drawGameBoard(boardState, {
      size: 320,
      startX: 25,
      startY: 25
    });
    
    // Add any coordinate labels or info
    const gameInfo = this.getGameInfo(boardState);
    const infoElements = ImageRenderer.addGameInfo(gameInfo);
    
    // Close SVG
    const closing = ImageRenderer.closeSVGFrame({ showTimestamp: true });
    
    return frame + titleElement + gameContent + infoElements + closing;
  }

  static drawGameBoard(boardState, options = {}) {
    // Implement your game-specific board rendering
    // Return SVG elements as string
    return `<!-- Your game board SVG here -->`;
  }

  static getGameInfo(boardState) {
    // Return array of info lines to display
    return [
      `Round: ${boardState.round || 1}`,
      `Current Player: ${boardState.currentPlayer || 1}`
    ];
  }
}

module.exports = YourGameRenderer;
```

### Step 4: Register Your Plugin

Update `src/domain/GamePluginRegistry.js` to register your plugin:

```javascript
static createWithDefaults() {
  const registry = new GamePluginRegistry();
  
  // Existing plugins
  try {
    const ChessPlugin = require('../plugins/ChessPlugin');
    registry.register('chess', ChessPlugin);
  } catch (error) {
    console.warn('Could not load ChessPlugin:', error.message);
  }

  // Add your plugin
  try {
    const YourGamePlugin = require('../plugins/your-game/YourGamePlugin');
    registry.register('your-game', YourGamePlugin);
  } catch (error) {
    console.warn('Could not load YourGamePlugin:', error.message);
  }

  return registry;
}
```

## Plugin Interface Reference

### Required Methods (Backend)

```javascript
// Game metadata and info
static getMetadata()              // Plugin metadata object
getGameType()                     // Game type identifier string
getDisplayName()                  // Human-readable name
getDescription()                  // Game description
getMinPlayers()                   // Minimum player count
getMaxPlayers()                   // Maximum player count

// Game state management
getInitialBoardState(settings)    // Initial game state
validateMove(move, state, ...)    // Validate player moves
applyMove(move, state, ...)       // Apply move to state
isGameComplete(state, players)    // Check if game finished
getWinner(state, players)         // Get winner(s)
getNextPlayer(playerId, ...)      // Get next player in turn

// Player management
getAvailableColors(count)         // Available player colors/roles
assignPlayerColor(order, total)   // Assign color to player
validateBoardState(state)         // Validate state integrity

// Data and statistics
getRenderData(state, players)     // Data for rendering
getGameStats(state, players)      // Game statistics
serializeBoardState(state)        // Serialize state for storage
deserializeBoardState(data)       // Deserialize state from storage
```

### Extension Points

The framework provides hooks for custom game logic:

#### Game Completion Hook

```javascript
// Optional: Called when game completes
async onGameComplete(boardState, players, winner) {
  // Custom completion logic
  // - Calculate final scores/bonuses
  // - Update achievements 
  // - Log game statistics
  // - Trigger external events
  
  // Example: Add completion bonus for single-player games
  if (boardState.score && winner) {
    const bonus = this.calculateCompletionBonus(boardState);
    boardState.score = this.updateScore(boardState.score, {
      type: 'completion',
      pointsAwarded: bonus,
      description: 'Game completion bonus'
    });
  }
}
```

#### Move Validation Hooks

```javascript
// Optional: Custom validation before standard checks
preValidateMove(move, boardState, playerId, players) {
  // Return { valid: true } or { valid: false, error: 'message' }
  // Called before main validateMove()
}

// Optional: Custom validation after standard checks  
postValidateMove(move, boardState, playerId, players, result) {
  // Modify or enhance validation result
  // Return modified result object
}
```

#### Scoring System (Single-Player Games)

```javascript
// Built-in score event types:
// - 'move': Points for making moves
// - 'penalty': Point deductions  
// - 'completion': Game completion bonus
// - 'time_update': Update elapsed time

// Custom scoring example:
getMoveScoreEvent(move, oldState, newState) {
  switch (move.action) {
    case 'special_move':
      return { type: 'move', pointsAwarded: 50 };
    case 'bonus_action':
      return { type: 'move', pointsAwarded: 100, description: 'Bonus!' };
    default:
      return { type: 'move', pointsAwarded: 0 };
  }
}
```

### Card Game Framework

For card-based games, use the specialized framework:

```javascript
const { DeckManager, CardUtils } = require('../../framework/cards');

// Deck creation and management
const deck = DeckManager.createStandardDeck({ shuffled: true });
const customDeck = DeckManager.createCustomDeck(cardDefinitions);

// Card utilities
const isRed = CardUtils.isRed(card);        // Check if card is red
const isBlack = CardUtils.isBlack(card);    // Check if card is black  
const getSuit = CardUtils.getSuit(card);    // Get card suit
const getRank = CardUtils.getRank(card);    // Get card rank
const getValue = CardUtils.getValue(card);  // Get numeric value

// Deck operations
deck.shuffle();                    // Shuffle deck
const card = deck.draw();         // Draw single card
const cards = deck.draw(5);       // Draw multiple cards
deck.addCard(card);               // Add card back to deck
```

### Required Static Methods (Frontend)

```javascript
static parseMove(moveText)           // Parse user input
static formatMove(moveData)          // Format move for display
static getMoveInputPlaceholder()     // Input placeholder text
static getMoveInputHelp()            // Help text for users
static validateMoveFormat(moveText)  // Client-side validation
```

### Required Static Methods (Rendering)

```javascript
static generateBoardImage(state, options)  // Generate PNG buffer
static createBoardSVG(state, options)      // Generate SVG content
static getRenderingOptionsSchema()         // Schema for options
```

## Common Framework Utilities

The framework provides shared utilities in `src/framework/ImageRenderer.js`:

```javascript
// SVG frame creation
ImageRenderer.createSVGFrame(width, height, options)
ImageRenderer.closeSVGFrame(options)
ImageRenderer.wrapSVGContent(content, options)

// Text and labels
ImageRenderer.addTitle(title, x, y)
ImageRenderer.addGameInfo(lines, startX, startY)
ImageRenderer.createCoordinateLabels(options)

// Image conversion
ImageRenderer.svgToPng(svgContent, options)
ImageRenderer.createErrorImage(message, options)
```

## Testing Your Plugin

1. **Unit Tests**: Create tests for move validation and game logic
2. **Integration Tests**: Test with the full application
3. **Frontend Testing**: Test move parsing and formatting
4. **Rendering Tests**: Verify image generation works

## Recent Framework Enhancements

### Game Completion Improvements

The framework now provides robust game completion handling:

1. **Atomic Transactions**: Move saving and game updates happen atomically to prevent data corruption
2. **Extension Points**: Plugins can implement `onGameComplete()` for custom completion logic  
3. **Enhanced Error Handling**: Better error messages and transaction rollback on failures
4. **Completion Bonuses**: Built-in support for completion scoring in single-player games

### Solitaire Enhancements

Recent improvements to solitaire games include:

1. **Auto-Move Commands**: 
   - Column numbers (`"1"`, `"2"`, etc.) auto-move cards to foundation
   - `"w"` command auto-moves waste card to appropriate foundation
   
2. **Auto-Reshuffle**: 
   - `"d"` command automatically reshuffles deck when stock is empty
   
3. **Improved Move Parsing**:
   - Smart detection of optimal card counts for tableau moves
   - Better error messages for invalid moves
   
4. **Enhanced Scoring**:
   - Completion bonuses based on time and move efficiency
   - Detailed score event tracking

### Database Reliability

Enhanced database operations for better reliability:

```javascript
// Atomic move + game update (in SqliteGameRepository)
await gameRepository.saveMoveAndUpdateGame(
  gameId, playerId, move, newBoardState, moveCount, gameUpdates
);

// Automatic transaction handling with rollback on errors
```

## Best Practices

1. **Error Handling**: Always validate inputs and handle errors gracefully
2. **Performance**: Keep move validation fast for real-time gameplay  
3. **Consistency**: Use the common framework utilities for styling
4. **Documentation**: Document your game rules and move formats
5. **Validation**: Implement thorough move and state validation
6. **Fallbacks**: Provide sensible defaults and error recovery
7. **Extension Points**: Use `onGameComplete()` for custom completion logic
8. **Atomic Operations**: Use atomic database operations when available

## Example: Adding Tic-Tac-Toe

See the chess plugin implementation as a complete example. A simpler game like Tic-Tac-Toe would have:

- 3x3 grid board state
- Simple move format (row,col or A1-C3)
- Basic win condition checking (3 in a row)
- Minimal rendering (grid with X/O symbols)

## Plugin Distribution (Future)

Future enhancements will support:

- NPM package distribution
- Dynamic plugin loading
- Plugin versioning and dependencies
- Sandboxed plugin execution
- Plugin marketplace

## Support

For questions or help developing plugins:

1. Check the existing chess plugin implementation
2. Review the GamePlugin interface documentation
3. Test with the development server
4. Create issues for framework improvements