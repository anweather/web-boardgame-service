# Card Framework API Documentation

The Card Framework provides a comprehensive foundation for implementing card-based games in the board game service. This document covers all public APIs and integration patterns.

## Table of Contents

- [Core Classes](#core-classes)
- [Card Utilities](#card-utilities)
- [Deck Management](#deck-management)
- [Hand Management](#hand-management)
- [Card Rendering](#card-rendering)
- [Single Player Games](#single-player-games)
- [Integration Examples](#integration-examples)

## Core Classes

### Card Object

Cards are represented as plain JavaScript objects with the following structure:

```javascript
{
  rank: string,    // 'Ace', 'Two', 'Three', ..., 'King'
  suit: string,    // 'hearts', 'diamonds', 'clubs', 'spades'
  faceUp: boolean, // true if face-up, false if face-down
  value: number    // Numeric value (1-13, Ace=1, Jack=11, Queen=12, King=13)
}
```

### CardUtils

Static utility methods for card operations.

#### `CardUtils.getRankValue(rank: string): number`
Returns the numeric value of a card rank.

```javascript
CardUtils.getRankValue('Ace')   // 1
CardUtils.getRankValue('King')  // 13
CardUtils.getRankValue('Ten')   // 10
```

#### `CardUtils.isRed(card: object): boolean`
Determines if a card is red (hearts or diamonds).

```javascript
CardUtils.isRed({ suit: 'hearts' })   // true
CardUtils.isRed({ suit: 'clubs' })    // false
```

#### `CardUtils.isBlack(card: object): boolean`
Determines if a card is black (clubs or spades).

#### `CardUtils.getColor(card: object): string`
Returns 'red' or 'black' for the card's color.

#### `CardUtils.createCard(rank: string, suit: string, faceUp?: boolean): object`
Creates a new card object.

```javascript
const ace = CardUtils.createCard('Ace', 'hearts', true);
// { rank: 'Ace', suit: 'hearts', faceUp: true, value: 1 }
```

#### `CardUtils.compareRank(card1: object, card2: object): number`
Compares two cards by rank (-1, 0, 1).

#### `CardUtils.compareSuit(card1: object, card2: object): number`
Compares two cards by suit.

#### `CardUtils.formatCard(card: object): string`
Returns a human-readable string representation.

```javascript
CardUtils.formatCard({ rank: 'Ace', suit: 'hearts' });
// "Ace of Hearts"
```

### DeckManager

Handles deck creation, shuffling, and dealing operations.

#### `DeckManager.createStandardDeck(options?: object): object`
Creates a standard 52-card deck.

```javascript
const deck = DeckManager.createStandardDeck({
  shuffled: true,  // Auto-shuffle the deck
  jokers: false    // Include jokers (default: false)
});
```

Returns:
```javascript
{
  cards: Card[],           // Array of 52 cards
  metadata: {
    totalCards: 52,
    shuffled: boolean,
    created: Date
  }
}
```

#### `DeckManager.shuffle(deck: object): object`
Shuffles a deck using Fisher-Yates algorithm.

```javascript
const shuffledDeck = DeckManager.shuffle(deck);
```

#### `DeckManager.deal(deck: object, count: number): object[]`
Deals cards from the top of the deck.

```javascript
const hand = DeckManager.deal(deck, 5); // Deal 5 cards
```

#### `DeckManager.peek(deck: object, count?: number): object[]`
Looks at top cards without removing them.

#### `DeckManager.isEmpty(deck: object): boolean`
Checks if deck is empty.

#### `DeckManager.getSize(deck: object): number`
Returns number of cards remaining.

### HandManager

Manages collections of cards (hands, piles, etc.).

#### `HandManager.createHand(cards?: object[]): object`
Creates a new hand.

```javascript
const hand = HandManager.createHand([ace, king, queen]);
```

#### `HandManager.addCard(hand: object, card: object): object`
Adds a card to a hand.

#### `HandManager.removeCard(hand: object, index: number): object`
Removes a card by index.

#### `HandManager.findCard(hand: object, predicate: function): object | null`
Finds a card matching criteria.

```javascript
const ace = HandManager.findCard(hand, card => card.rank === 'Ace');
```

#### `HandManager.sortHand(hand: object, compareFn?: function): object`
Sorts cards in hand.

```javascript
// Sort by rank, then suit
const sorted = HandManager.sortHand(hand, (a, b) => {
  const rankDiff = CardUtils.compareRank(a, b);
  return rankDiff !== 0 ? rankDiff : CardUtils.compareSuit(a, b);
});
```

#### `HandManager.filterCards(hand: object, predicate: function): object[]`
Returns cards matching criteria.

#### `HandManager.getSize(hand: object): number`
Returns number of cards in hand.

#### `HandManager.isEmpty(hand: object): boolean`
Checks if hand is empty.

#### `HandManager.validateHand(hand: object): boolean`
Validates hand structure.

## Card Rendering

### CardRenderer

Handles visual representation of cards and card collections.

#### `CardRenderer.renderCard(card: object, options?: object): string`
Renders a single card as SVG.

```javascript
const svg = CardRenderer.renderCard(ace, {
  width: 100,
  height: 140,
  style: 'classic',  // 'classic', 'modern', 'minimal'
  showBack: false    // Show card back instead of face
});
```

#### `CardRenderer.renderHand(hand: object, options?: object): string`
Renders multiple cards with overlap.

```javascript
const svg = CardRenderer.renderHand(hand, {
  overlap: 20,       // Pixels of overlap
  maxCards: 10,      // Max cards to show
  fanAngle: 15       // Degrees of fan spread
});
```

#### `CardRenderer.renderPile(cards: object[], options?: object): string`
Renders a pile of cards (stack).

#### `CardRenderer.renderTableau(columns: object[][], options?: object): string`
Renders a tableau layout (multiple columns).

#### `CardRenderer.createCardBack(options?: object): string`
Creates a card back design.

## Single Player Games

### SinglePlayerGamePlugin

Base class for single-player card games.

#### Core Methods

```javascript
class MySolitaireGame extends SinglePlayerGamePlugin {
  getGameType() {
    return 'my-solitaire';
  }

  getInitialBoardState() {
    // Return initial game state
  }

  validateMove(move, boardState, playerId, players) {
    // Validate player move
    return { valid: boolean, error?: string };
  }

  applyMove(move, boardState, playerId, players) {
    // Apply move to board state
    return newBoardState;
  }

  isGameComplete(boardState, players) {
    return boolean;
  }

  getWinner(boardState, players) {
    return playerId || null;
  }
}
```

#### Scoring System

```javascript
// Initialize score
initializeScore() {
  return {
    points: 0,
    moves: 0,
    timeStarted: Date.now(),
    bonuses: [],
    penalties: []
  };
}

// Update score
updateScore(currentScore, scoreEvent) {
  // scoreEvent: { type: 'move'|'bonus'|'penalty', points: number, ... }
  return updatedScore;
}
```

#### Built-in Helpers

```javascript
// Card location helpers
getCardsFromLocation(location, boardState)
removeCardsFromLocation(location, boardState, count)
addCardsToLocation(location, boardState, cards)

// Move validation helpers
validateCardSequence(cards, rules)
validateSuitMatch(cards)
validateColorAlternation(cards)

// Game state helpers
serializeBoardState(boardState)
deserializeBoardState(serialized)
validateBoardState(boardState)
```

## Integration Examples

### Basic Card Game Implementation

```javascript
const { CardUtils, DeckManager, HandManager } = require('../framework/cards');

class SimpleCardGame extends GamePlugin {
  getInitialBoardState() {
    const deck = DeckManager.createStandardDeck({ shuffled: true });
    const playerHand = HandManager.createHand(DeckManager.deal(deck, 7));
    
    return {
      deck,
      playerHand,
      discardPile: HandManager.createHand(),
      score: 0
    };
  }

  validateMove(move, boardState) {
    const { action, cardIndex } = move;
    
    if (action === 'play_card') {
      const card = boardState.playerHand.cards[cardIndex];
      if (!card) {
        return { valid: false, error: 'Invalid card index' };
      }
      // Additional validation...
    }
    
    return { valid: true };
  }
}
```

### Custom Card Validation

```javascript
class PokerGame extends GamePlugin {
  validatePokerHand(hand) {
    const cards = hand.cards;
    
    // Check for flush
    const isFlush = cards.every(card => 
      card.suit === cards[0].suit
    );
    
    // Check for straight
    const ranks = cards.map(card => CardUtils.getRankValue(card.rank))
                      .sort((a, b) => a - b);
    const isStraight = ranks.every((rank, i) => 
      i === 0 || rank === ranks[i-1] + 1
    );
    
    return { isFlush, isStraight };
  }
}
```

### Advanced Rendering

```javascript
class TableauGame extends SinglePlayerGamePlugin {
  async generateBoardImage(boardState, options = {}) {
    const { CardRenderer } = require('../framework/cards');
    
    // Render foundation piles
    const foundations = await Promise.all(
      Object.entries(boardState.foundation).map(([suit, cards]) =>
        CardRenderer.renderPile(cards, { 
          label: suit,
          width: 80,
          height: 112
        })
      )
    );
    
    // Render tableau columns
    const tableau = await CardRenderer.renderTableau(
      boardState.tableau,
      { 
        columnSpacing: 90,
        cardOverlap: 20,
        showFaceDown: true
      }
    );
    
    // Combine into final layout
    return this.combineCardElements(foundations, tableau, options);
  }
}
```

## Error Handling

### Validation Patterns

```javascript
// Consistent error response format
function validateMove(move, boardState) {
  if (!move || typeof move !== 'object') {
    return { 
      valid: false, 
      error: 'Invalid move object',
      code: 'INVALID_FORMAT'
    };
  }
  
  // Detailed validation with context
  if (move.fromLocation && !this.isValidLocation(move.fromLocation)) {
    return {
      valid: false,
      error: `Invalid source location: ${this.formatLocation(move.fromLocation)}`,
      code: 'INVALID_SOURCE',
      suggestion: 'Use format: {type: "tableau", column: 0}'
    };
  }
  
  return { valid: true };
}
```

### Debugging Helpers

```javascript
// Built-in debugging support
class MyGame extends SinglePlayerGamePlugin {
  constructor() {
    super();
    this.debug = process.env.NODE_ENV === 'development';
  }
  
  logGameState(boardState, context = '') {
    if (this.debug) {
      console.log(`[${this.getGameType()}] ${context}:`, {
        cards: this.summarizeGameState(boardState),
        timestamp: new Date().toISOString()
      });
    }
  }
}
```

## Best Practices

### Performance Considerations

1. **Card Objects**: Use immutable patterns for card objects
2. **Deck Operations**: Minimize shuffling operations
3. **Rendering**: Cache SVG components when possible
4. **Validation**: Implement early returns for invalid moves

### Memory Management

1. **Deep Cloning**: Use structured cloning for board state copies
2. **Hand Cleanup**: Clear temporary hands after operations
3. **Event Cleanup**: Remove card event listeners properly

### Testing Patterns

```javascript
// Unit test example
describe('CardUtils', () => {
  it('should correctly identify red cards', () => {
    const redCard = { suit: 'hearts' };
    const blackCard = { suit: 'clubs' };
    
    expect(CardUtils.isRed(redCard)).toBe(true);
    expect(CardUtils.isRed(blackCard)).toBe(false);
  });
});

// Integration test example  
describe('Solitaire Game', () => {
  it('should complete a full game', async () => {
    const game = new SolitairePlugin();
    let boardState = game.getInitialBoardState();
    
    // Simulate game moves
    const moves = generateWinningMoves(boardState);
    for (const move of moves) {
      const validation = game.validateMove(move, boardState);
      expect(validation.valid).toBe(true);
      boardState = game.applyMove(move, boardState);
    }
    
    expect(game.isGameComplete(boardState)).toBe(true);
  });
});
```

## Framework Extension Points

### Custom Card Types

```javascript
// Extend for specialized games
class TarotCard extends CardUtils {
  static createTarotDeck() {
    const suits = ['cups', 'swords', 'wands', 'pentacles'];
    const majorArcana = ['fool', 'magician', /* ... */];
    
    return DeckManager.createCustomDeck({
      suits,
      ranks: ['ace', '2', '3', /* ... */, 'king'],
      special: majorArcana
    });
  }
}
```

### Custom Rendering Styles

```javascript
class VintageCardRenderer extends CardRenderer {
  static renderCard(card, options = {}) {
    return super.renderCard(card, {
      ...options,
      style: 'vintage',
      border: 'ornate',
      background: 'parchment'
    });
  }
}
```

This API documentation provides a complete reference for using the Card Framework to implement any card-based game. For implementation examples, see the Solitaire plugin in `src/plugins/solitaire/`.