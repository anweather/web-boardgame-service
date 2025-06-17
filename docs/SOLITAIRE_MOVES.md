# Solitaire Move Commands

## Multi-Card Move Support

The Solitaire API fully supports moving multiple cards between tableau columns. Here are all the supported formats:

## Basic Moves

### Stock Operations
- `d` or `draw` - Draw cards from stock pile
- `r` or `reset` - Reset stock pile from waste

### Single Card Moves
- `wh`, `wd`, `wc`, `ws` - Move top waste card to foundation (hearts, diamonds, clubs, spades)
- `1h`, `2d`, `3c`, `4s` - Move top tableau card to foundation
- `w1`, `w2`, etc. - Move top waste card to tableau column
- `h7`, `d3`, etc. - Move top foundation card to tableau column

### Card Flipping
- `f1`, `f2`, etc. - Flip face-down card in tableau column

## Multi-Card Tableau Moves

### Automatic Card Count Detection
- `1-7` - Move cards from tableau 1 to tableau 7 (automatically detects maximum valid sequence)
- `2-3` - Move cards from tableau 2 to tableau 3 (automatically detects maximum valid sequence)

### Manual Card Count Specification
- `1-7 x3` - Move exactly 3 cards from tableau 1 to tableau 7
- `2-3 x2` - Move exactly 2 cards from tableau 2 to tableau 3
- `1-7x5` - Move exactly 5 cards from tableau 1 to tableau 7 (spaces optional)

### Long Form (Legacy Support)
- `tableau1 to tableau2` - Move maximum valid sequence
- `tableau1 to tableau2 x3` - Move exactly 3 cards

## How Multi-Card Moves Work

### Automatic Detection Algorithm
When no card count is specified (e.g., `1-7`), the system:
1. Starts from the bottom card of the source column
2. Works backward to find the longest valid sequence of face-up cards
3. Validates that the sequence follows Solitaire rules:
   - Descending rank (King → Queen → Jack → 10 → ... → Ace)
   - Alternating colors (red/black/red/black)
4. Moves the entire valid sequence

### Manual Count Validation
When a specific count is specified (e.g., `1-7 x3`), the system:
1. Validates that enough cards exist in the source column
2. Validates that all cards to be moved are face-up
3. Validates that the cards form a proper descending, alternating sequence
4. Validates that the move is legal at the destination

### Move Validation Rules
For multi-card moves to be valid:
- All cards must be face-up
- Cards must form a descending rank sequence (K-Q-J-10-9-8-7-6-5-4-3-2-A)
- Cards must alternate colors (red-black-red-black)
- The top card of the sequence must be legally placeable on the destination

## Examples

### Scenario: Tableau 1 has [9♥, 8♠, 7♥] (all face-up)

#### Valid Multi-Card Moves:
- `1-5` - Moves all 3 cards if tableau 5 has 10♠ on top
- `1-5 x2` - Moves 8♠ and 7♥ if tableau 5 has 9♠ on top  
- `1-5 x1` - Moves only 7♥ if tableau 5 has 8♠ on top

#### Invalid Multi-Card Moves:
- `1-5 x3` to tableau 5 with J♥ on top (9♥ can't go on J♥)
- `1-5 x2` if 8♠ is face-down
- `1-5 x4` (only 3 cards exist in tableau 1)

## API Response

When moves are successful, the API returns:
- Updated board state with cards moved
- Move count increment
- Score updates (if applicable)
- Game completion status

## Error Messages

The system provides detailed error messages for invalid moves:
- "Not enough cards at tableau 1 - only 2 available, tried to move 3"
- "Invalid sequence - expected Queen after King, got Jack"
- "Cannot move face-down cards"
- "Empty tableau column 5 can only accept Kings"

## Frontend Integration

The React frontend supports all these move formats through the GameControls component. Users can type any of the above commands in the move input field.

### Updated Help Text:
**Placeholder**: `e.g., d, wh, 1-7, 1-7 x3, f1`
**Help**: `Commands: d=draw, r=reset, wh=waste to hearts, 1-7=move cards (auto-detects max), 1-7 x3=move 3 cards, f1=flip tableau 1`