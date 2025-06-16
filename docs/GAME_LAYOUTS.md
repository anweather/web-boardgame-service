# Game-Specific Layouts System

This document describes the new game-specific layouts system that provides customized UX interfaces for different game types, starting with the enhanced Solitaire layout.

## Overview

The game layouts system allows each game plugin to have its own specialized user interface that's optimized for that particular game type. This provides:

- **Game-specific visual elements** optimized for each game's mechanics
- **Multi-card move support** for games that need it (like Solitaire)
- **Visual board representations** as an alternative to generated board images  
- **Contextual controls** that make sense for each game type
- **Enhanced user experience** tailored to each game's unique needs

## Architecture

### Layout Manager (`player.js`)

The main `BoardGamePlayer` class now includes layout management:

```javascript
class BoardGamePlayer {
  constructor() {
    // ...
    this.currentLayout = null; // Current game-specific layout
  }
  
  loadGameLayout() {
    // Automatically loads appropriate layout based on game type
  }
  
  loadSolitaireLayout() {
    // Loads the solitaire-specific layout
  }
  
  updateLayoutBoardState(boardState) {
    // Updates layout with new game state
  }
}
```

### Layout Classes (`public/js/layouts/`)

Each game type can have its own layout class:

- `SolitaireLayout.js` - Enhanced solitaire interface
- `ChessLayout.js` - Future chess-specific interface  
- `CheckersLayout.js` - Future checkers-specific interface

## Solitaire Layout Features

The new `SolitaireLayout` class provides:

### Visual Board Representation

- **Interactive pile visualization** - Click to select source and target piles
- **Real-time card counts** - Shows number of cards in each pile
- **Movable card indicators** - Shows how many cards can be moved together
- **Visual feedback** - Selected piles, valid targets, and invalid targets
- **Responsive design** - Works on desktop and mobile devices

### Multi-Card Move Support

- **Visual selection** - Click source tableau column, then target column
- **Multi-card controls** - Slider to choose how many cards to move
- **Move preview** - Shows what sequence will be moved
- **Auto-detection** - Automatically determines maximum movable cards
- **Validation feedback** - Clear error messages with suggestions

### Enhanced Controls

- **Quick actions** - One-click draw and reset stock
- **Auto-foundation moves** - Smart buttons to move available cards
- **Manual move fallback** - Text input for power users
- **Game statistics** - Real-time score, moves, and time tracking

### Layout Structure

```
Solitaire Board Layout:
┌─────────────────────────────────────────────┐
│  Foundation Piles: ♥ ♦ ♣ ♠                │
│  Stock & Waste: [Stock] [Waste]            │
│  Tableau: [C1] [C2] [C3] [C4] [C5] [C6] [C7]│
│                                             │
│  Multi-Card Controls (when needed):        │
│  ┌─────────────────────────────────────────┐│
│  │ Move 3 cards from Column 2 to Column 5 ││
│  │ Slider: [====●====] 3 cards           ││
│  │ [Cancel] [Move 3 cards]                ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

## Implementation Details

### File Structure

```
public/
├── js/
│   ├── layouts/
│   │   ├── SolitaireLayout.js     # Solitaire-specific layout
│   │   └── [GameType]Layout.js    # Future game layouts
│   ├── GamePluginManager.js       # Game logic plugins
│   └── player.js                  # Main game client
├── player.html                    # Main game interface
└── style.css                      # Global styles
```

### Integration Points

1. **Layout Loading** - Triggered in `loadCurrentGame()` when game state updates
2. **Move Submission** - Layouts use existing `performMove()` method
3. **State Updates** - Layouts receive `updateBoardState()` calls  
4. **Error Handling** - Uses existing error display system
5. **Plugin System** - Integrates with `GamePluginManager` for move parsing

### CSS Styling

Game layouts include embedded CSS for:
- Visual pile representations
- Hover and selection states
- Responsive design breakpoints
- Animation effects (pulsing, transitions)
- Color schemes optimized for each game

## Usage Examples

### Basic Solitaire Move

1. User clicks on a tableau column (source)
2. Column highlights with gold border
3. Valid target piles highlight with green border
4. User clicks target column
5. If single card move: executes immediately
6. If multi-card move: shows slider controls

### Multi-Card Solitaire Move

1. User selects source tableau with multiple movable cards  
2. User selects target tableau
3. Multi-card controls appear with:
   - Preview of movable sequence
   - Slider to choose card count (1 to max)
   - Confirm/Cancel buttons
4. User adjusts slider and confirms
5. Move executes with chosen card count

### Quick Actions

- **Draw button** - Equivalent to typing "d"
- **Reset button** - Equivalent to typing "r" (when available)
- **Foundation buttons** - Auto-move available cards to foundations
- **Manual input** - Fallback text field for power users

## Adding New Game Layouts

To add a layout for a new game type:

### 1. Create Layout Class

```javascript
// public/js/layouts/[GameType]Layout.js
class ChessLayout {
  constructor(gamePlayer) {
    this.gamePlayer = gamePlayer;
    this.initializeLayout();
  }
  
  initializeLayout() {
    // Replace board with game-specific interface
  }
  
  updateBoardState(boardState) {
    // Update interface with new game state
  }
  
  destroy() {
    // Cleanup when switching games
  }
}
```

### 2. Register in Layout Manager

```javascript
// player.js - in loadGameLayout()
switch (gameType) {
  case 'solitaire':
    this.loadSolitaireLayout();
    break;
  case 'chess':
    this.loadChessLayout();
    break;
  // Add new case here
}
```

### 3. Include Script

```html
<!-- player.html -->
<script src="js/layouts/ChessLayout.js"></script>
```

### 4. Implement Game-Specific Features

Each layout can provide:
- Visual board representation
- Game-specific controls  
- Move input methods
- Real-time state updates
- Custom styling and animations

## Benefits

### For Users

- **Intuitive interfaces** - Visual representations are easier to understand
- **Faster gameplay** - Click-to-move is faster than typing commands
- **Better mobile experience** - Touch-friendly interfaces
- **Reduced errors** - Visual validation prevents invalid moves
- **Multi-card support** - Complex moves made simple

### For Developers  

- **Modular design** - Each game can have its own interface
- **Reusable components** - Common patterns can be shared
- **Easy testing** - Visual interfaces are easier to test
- **Future-proof** - Easy to add new game types
- **Backward compatibility** - Falls back to default interface

## Future Enhancements

Planned improvements include:

1. **Drag-and-drop support** - Direct card manipulation
2. **Animation effects** - Smooth card movements  
3. **Layout themes** - Multiple visual styles per game
4. **Accessibility features** - Screen reader support, keyboard navigation
5. **Tutorial overlays** - Interactive game learning
6. **Statistics dashboards** - Advanced game analytics
7. **Multiplayer layouts** - Specialized interfaces for multiplayer games

## Testing

The layout system maintains full backward compatibility:

- **Fallback behavior** - Uses default interface if layout fails to load
- **Error handling** - Gracefully handles layout initialization errors  
- **Manual override** - Users can always use text commands as backup
- **Progressive enhancement** - Layouts enhance existing functionality

## Conclusion

The game-specific layouts system represents a major UX improvement, particularly for games like Solitaire that benefit from visual, interactive interfaces. The modular architecture makes it easy to add specialized layouts for each game type while maintaining the flexibility and robustness of the existing system.