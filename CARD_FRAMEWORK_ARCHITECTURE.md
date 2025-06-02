# Card Framework Architecture Design

## Overview

This document defines the architecture for a generic card system that integrates with our existing ports and adapters (hexagonal) architecture to support various card games while maintaining plugin compatibility.

## Architecture Principles

1. **Framework Agnostic**: Separate card logic from game-specific rules
2. **Plugin Compatible**: Seamless integration with existing GamePlugin interface
3. **State Serializable**: Full JSON serialization for database storage
4. **Type Safe**: TypeScript support with strong typing
5. **Extensible**: Support for custom card types and deck configurations

## 1. Card Representation

### Core Card Structure

```typescript
interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
  color: CardColor;
  isJoker?: boolean;
}

interface Suit {
  name: string;          // 'hearts', 'diamonds', 'clubs', 'spades'
  symbol: string;        // '♥', '♦', '♣', '♠'
  color: CardColor;      // 'red' | 'black'
}

interface Rank {
  name: string;          // 'Ace', 'Two', 'King', etc.
  abbreviation: string;  // 'A', '2', 'K', etc.
  value: number;         // 1, 2, 13, etc.
}

type CardColor = 'red' | 'black';
```

### Serializable Card Format

For JSON storage and network transmission:

```json
{
  "suit": "hearts",
  "rank": "Ace", 
  "value": 1,
  "color": "red",
  "isJoker": false
}
```

### Card Utility Functions

```typescript
class CardUtils {
  static isRed(card: Card): boolean;
  static isBlack(card: Card): boolean;
  static isFaceCard(card: Card): boolean;
  static isAce(card: Card): boolean;
  static canStack(card1: Card, card2: Card, rules: StackingRules): boolean;
  static compareRank(card1: Card, card2: Card): number;
  static toString(card: Card): string;
  static fromString(cardString: string): Card;
}
```

## 2. Deck Operations

### Deck Structure

```typescript
interface Deck {
  cards: Card[];
  discardPile: Card[];
  shuffled: boolean;
  deckType: DeckType;
}

type DeckType = 'standard' | 'pinochle' | 'tarot' | 'euchre' | 'custom';

interface DeckConfiguration {
  includeJokers: number;
  customCards?: Card[];
  excludeCards?: string[]; // card identifiers to exclude
}
```

### Core Deck Operations

```typescript
class DeckManager {
  // Creation
  static createStandardDeck(config?: DeckConfiguration): Deck;
  static createCustomDeck(cards: Card[]): Deck;
  
  // Operations
  static shuffle(deck: Deck, rng?: RandomGenerator): void;
  static deal(deck: Deck, hands: number, cardsPerHand: number): Card[][];
  static draw(deck: Deck, count: number): Card[];
  static peek(deck: Deck, count: number): Card[];
  static addToTop(deck: Deck, cards: Card[]): void;
  static addToBottom(deck: Deck, cards: Card[]): void;
  
  // State
  static remaining(deck: Deck): number;
  static isEmpty(deck: Deck): boolean;
  static reset(deck: Deck): void;
  static serialize(deck: Deck): string;
  static deserialize(data: string): Deck;
}
```

### Hand Management

```typescript
interface Hand {
  cards: Card[];
  playerId: string;
  maxSize?: number;
}

class HandManager {
  static createHand(playerId: string, maxSize?: number): Hand;
  static addCard(hand: Hand, card: Card): boolean;
  static removeCard(hand: Hand, cardIndex: number): Card | null;
  static findCard(hand: Hand, predicate: (card: Card) => boolean): number;
  static sortBy(hand: Hand, criterion: SortCriterion): void;
  static canPlay(hand: Hand, card: Card, rules: GameRules): boolean;
}

type SortCriterion = 'suit' | 'rank' | 'color' | 'value';
```

## 3. Card Validation and State Management

### Validation Framework

```typescript
interface CardGameRules {
  // Move validation
  isValidMove(from: CardLocation, to: CardLocation, card: Card): ValidationResult;
  canStack(bottomCard: Card, topCard: Card): boolean;
  isLegalPlay(card: Card, gameState: GameState): boolean;
  
  // Game-specific rules
  getValidMoves(gameState: GameState, playerId: string): Move[];
  checkWinCondition(gameState: GameState): WinResult;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

type CardLocation = 
  | { type: 'deck' }
  | { type: 'hand', playerId: string, index?: number }
  | { type: 'tableau', column: number, row?: number }
  | { type: 'foundation', pile: number }
  | { type: 'waste' }
  | { type: 'custom', location: string };
```

### State Management

```typescript
interface CardGameState {
  deck: Deck;
  hands: Record<string, Hand>;
  tableau?: Card[][];
  foundation?: Card[][];
  waste?: Card[];
  customAreas?: Record<string, Card[]>;
  
  // Game metadata
  currentPlayer: string;
  turnCount: number;
  lastMove?: Move;
  gamePhase?: string;
}

class CardStateManager {
  static serialize(state: CardGameState): string;
  static deserialize(data: string): CardGameState;
  static validateState(state: CardGameState): ValidationResult;
  static cloneState(state: CardGameState): CardGameState;
  static applyMove(state: CardGameState, move: Move): CardGameState;
  static undoMove(state: CardGameState): CardGameState | null;
}
```

## 4. Plugin Integration Patterns

### Base Card Game Plugin

```typescript
abstract class CardGamePlugin extends GamePlugin {
  protected deck: Deck;
  protected rules: CardGameRules;
  
  // Override from GamePlugin
  getInitialBoardState(gameSettings: GameSettings): CardGameState {
    this.deck = this.createDeck(gameSettings);
    return this.setupInitialState();
  }
  
  validateMove(move: Move, boardState: CardGameState, playerId: string): ValidationResult {
    return this.rules.isValidMove(move.from, move.to, move.card);
  }
  
  applyMove(move: Move, boardState: CardGameState): CardGameState {
    return CardStateManager.applyMove(boardState, move);
  }
  
  // Card-specific abstract methods
  abstract createDeck(settings: GameSettings): Deck;
  abstract setupInitialState(): CardGameState;
  abstract createRules(): CardGameRules;
}
```

### Solitaire Plugin Example

```typescript
class SolitairePlugin extends CardGamePlugin {
  getGameType(): string { return 'solitaire'; }
  getMinPlayers(): number { return 1; }
  getMaxPlayers(): number { return 1; }
  
  createDeck(settings: GameSettings): Deck {
    return DeckManager.createStandardDeck({ includeJokers: 0 });
  }
  
  setupInitialState(): CardGameState {
    DeckManager.shuffle(this.deck);
    
    // Deal tableau (7 columns, increasing cards)
    const tableau: Card[][] = [];
    for (let col = 0; col < 7; col++) {
      tableau[col] = DeckManager.draw(this.deck, col + 1);
      // Only top card face up (handled in rendering)
    }
    
    return {
      deck: this.deck,
      hands: {},
      tableau,
      foundation: [[], [], [], []], // 4 foundation piles
      waste: [],
      currentPlayer: 'player1',
      turnCount: 0
    };
  }
  
  createRules(): CardGameRules {
    return new SolitaireRules();
  }
}
```

## 5. Framework API Specification

### Core API Modules

```typescript
// Main entry point
export class CardFramework {
  static createPlugin(gameType: string): CardGamePlugin;
  static registerDeckType(name: string, factory: DeckFactory): void;
  static registerRules(gameType: string, rules: CardGameRules): void;
}

// Deck management
export { DeckManager, DeckConfiguration, Deck };

// Card utilities
export { CardUtils, Card, Suit, Rank, CardColor };

// Hand management  
export { HandManager, Hand, SortCriterion };

// State management
export { CardStateManager, CardGameState, ValidationResult };

// Game rules
export { CardGameRules, Move, CardLocation };

// Base classes
export { CardGamePlugin };
```

### Integration with Existing Framework

```typescript
// In src/framework/cards/
export * from './CardFramework';
export * from './DeckManager';
export * from './CardUtils';
export * from './HandManager';
export * from './CardStateManager';
export * from './CardGamePlugin';

// In src/plugins/solitaire/
import { CardGamePlugin, DeckManager } from '../../framework/cards';

export class SolitairePlugin extends CardGamePlugin {
  // Implementation
}
```

## 6. File Structure

```
src/
├── framework/
│   └── cards/
│       ├── index.js              # Main exports
│       ├── CardFramework.js      # Core framework class
│       ├── DeckManager.js        # Deck operations
│       ├── CardUtils.js          # Card utilities
│       ├── HandManager.js        # Hand management
│       ├── CardStateManager.js   # State management
│       ├── CardGamePlugin.js     # Base plugin class
│       └── types/
│           ├── Card.js           # Card interfaces
│           ├── Deck.js           # Deck interfaces
│           ├── GameState.js      # State interfaces
│           └── Rules.js          # Rules interfaces
├── plugins/
│   └── solitaire/
│       ├── SolitairePlugin.js    # Main plugin
│       ├── SolitaireRules.js     # Game rules
│       ├── SolitaireFrontend.js  # Frontend helpers
│       └── SolitaireRenderer.js  # Board rendering
└── tests/
    └── framework/
        └── cards/
            ├── DeckManager.test.js
            ├── CardUtils.test.js
            ├── HandManager.test.js
            └── CardStateManager.test.js
```

## 7. Testing Strategy

### Unit Tests (80%+ Coverage Required)

```typescript
describe('DeckManager', () => {
  test('creates standard 52-card deck', () => {
    const deck = DeckManager.createStandardDeck();
    expect(DeckManager.remaining(deck)).toBe(52);
  });
  
  test('shuffles deck maintaining card count', () => {
    const deck = DeckManager.createStandardDeck();
    const originalCards = [...deck.cards];
    DeckManager.shuffle(deck);
    expect(deck.cards).not.toEqual(originalCards);
    expect(DeckManager.remaining(deck)).toBe(52);
  });
  
  test('serializes and deserializes deck state', () => {
    const deck = DeckManager.createStandardDeck();
    DeckManager.shuffle(deck);
    const serialized = DeckManager.serialize(deck);
    const deserialized = DeckManager.deserialize(serialized);
    expect(deserialized.cards).toEqual(deck.cards);
  });
});
```

### Integration Tests

```typescript
describe('Solitaire Plugin Integration', () => {
  test('creates valid initial game state', () => {
    const plugin = new SolitairePlugin();
    const state = plugin.getInitialBoardState({});
    expect(state.tableau).toHaveLength(7);
    expect(state.foundation).toHaveLength(4);
    expect(DeckManager.remaining(state.deck)).toBe(24); // 52 - 28 dealt
  });
});
```

## 8. Performance Considerations

### Optimization Strategies

1. **Immutable State**: Use structural sharing for state updates
2. **Lazy Evaluation**: Defer expensive operations until needed
3. **Caching**: Cache frequently computed values (valid moves, etc.)
4. **Memory Management**: Proper cleanup of large game states

### Benchmarks

Target performance metrics:
- Deck shuffle: < 1ms for 52 cards
- State serialization: < 5ms for typical game state
- Move validation: < 0.1ms per move
- Memory usage: < 10MB for complex game state

## 9. Migration Strategy

### Phase 1: Core Framework
1. Implement DeckManager with `cards` library integration
2. Create CardUtils and basic card operations
3. Add comprehensive unit tests

### Phase 2: State Management  
1. Implement CardStateManager with JSON serialization
2. Create CardGamePlugin base class
3. Add state validation and error handling

### Phase 3: Game Integration
1. Build SolitairePlugin as proof of concept
2. Integrate with existing rendering system
3. Add end-to-end tests

### Phase 4: Advanced Features
1. Add hand management and sorting
2. Implement advanced game rules framework
3. Optimize performance and memory usage

This architecture provides a solid foundation for implementing card games while maintaining compatibility with our existing plugin system and architectural patterns.