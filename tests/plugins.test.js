/**
 * Plugin Module Unit Tests
 * Tests for game plugin modules to achieve >80% coverage
 */

const ChessPlugin = require('../src/plugins/chess/ChessPlugin');
const ChessFrontend = require('../src/plugins/chess/ChessFrontend');
const ChessRenderer = require('../src/plugins/chess/ChessRenderer');
const CheckersPlugin = require('../src/plugins/checkers/CheckersPlugin');
const CheckersFrontend = require('../src/plugins/checkers/CheckersFrontend');
const CheckersRenderer = require('../src/plugins/checkers/CheckersRenderer');

describe('Plugin Unit Tests', () => {
  describe('ChessPlugin', () => {
    let chessPlugin;

    beforeEach(() => {
      chessPlugin = new ChessPlugin();
    });

    describe('Metadata and Basic Info', () => {
      test('should return correct metadata', () => {
        const metadata = ChessPlugin.getMetadata();
        
        expect(metadata.name).toBe('Chess');
        expect(metadata.minPlayers).toBe(2);
        expect(metadata.maxPlayers).toBe(2);
        expect(metadata.description).toContain('chess');
      });

      test('should return correct game type', () => {
        expect(chessPlugin.getGameType()).toBe('chess');
      });

      test('should return correct display name', () => {
        expect(chessPlugin.getDisplayName()).toBe('Chess');
      });

      test('should return correct player counts', () => {
        expect(chessPlugin.getMinPlayers()).toBe(2);
        expect(chessPlugin.getMaxPlayers()).toBe(2);
      });

      test('should return available colors', () => {
        const colors = chessPlugin.getAvailableColors(2);
        expect(colors).toEqual(['white', 'black']);
      });

      test('should assign player colors correctly', () => {
        expect(chessPlugin.assignPlayerColor(1, 2)).toBe('white');
        expect(chessPlugin.assignPlayerColor(2, 2)).toBe('black');
      });
    });

    describe('Board State Management', () => {
      test('should return valid initial board state', () => {
        const initialState = chessPlugin.getInitialBoardState();
        
        expect(initialState).toHaveProperty('board');
        expect(initialState).toHaveProperty('castlingRights');
        expect(initialState).toHaveProperty('fullmoveNumber');
        expect(initialState.castlingRights.whiteKingside).toBe(true);
        expect(initialState.fullmoveNumber).toBe(1);
      });

      test('should validate correct board state', () => {
        const validState = chessPlugin.getInitialBoardState();
        
        expect(chessPlugin.validateBoardState(validState)).toBe(true);
      });

      test('should reject invalid board state', () => {
        const invalidState = { invalid: 'state' };
        
        expect(chessPlugin.validateBoardState(invalidState)).toBe(false);
      });

      test('should handle null board state', () => {
        expect(chessPlugin.validateBoardState(null)).toBe(false);
      });
    });

    describe('Move Validation', () => {
      test('should validate legal chess moves', () => {
        const boardState = chessPlugin.getInitialBoardState();
        const players = [
          { user_id: 'user1', color: 'white' },
          { user_id: 'user2', color: 'black' }
        ];

        // Test pawn move
        const result = chessPlugin.validateMove('e2-e4', boardState, 'user1', players);
        expect(result.valid).toBe(true);
      });

      test('should reject invalid move format', () => {
        const boardState = chessPlugin.getInitialBoardState();
        const players = [
          { user_id: 'user1', color: 'white' },
          { user_id: 'user2', color: 'black' }
        ];

        // Test invalid move format (chess plugin currently only validates format)
        const result = chessPlugin.validateMove('invalid-format', boardState, 'user1', players);
        expect(result.valid).toBe(false);
      });

      test('should reject moves by non-existent player', () => {
        const boardState = chessPlugin.getInitialBoardState();
        const players = [
          { user_id: 'user1', color: 'white' },
          { user_id: 'user2', color: 'black' }
        ];

        // Non-existent player tries to move
        const result = chessPlugin.validateMove('e7-e5', boardState, 'non-existent', players);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Player not in game');
      });

      test('should handle invalid move format', () => {
        const boardState = chessPlugin.getInitialBoardState();
        const players = [
          { user_id: 'user1', color: 'white' }
        ];

        const result = chessPlugin.validateMove('invalid', boardState, 'user1', players);
        expect(result.valid).toBe(false);
      });
    });

    describe('Move Application', () => {
      test('should apply valid moves correctly', () => {
        const boardState = chessPlugin.getInitialBoardState();
        const players = [
          { user_id: 'user1', color: 'white' },
          { user_id: 'user2', color: 'black' }
        ];

        const newState = chessPlugin.applyMove('e2-e4', boardState, 'user1', players);
        
        // Chess plugin should return modified board state
        expect(newState).toHaveProperty('board');
        expect(newState.board).not.toEqual(boardState.board); // Board should be different
        expect(newState.enPassantTarget).toBe(null); // Should reset en passant
      });
    });

    describe('Game Completion', () => {
      test('should detect game not complete in initial state', () => {
        const boardState = chessPlugin.getInitialBoardState();
        const players = [
          { user_id: 'user1', color: 'white' },
          { user_id: 'user2', color: 'black' }
        ];

        expect(chessPlugin.isGameComplete(boardState, players)).toBe(false);
      });

      test('should return null winner for incomplete game', () => {
        const boardState = chessPlugin.getInitialBoardState();
        const players = [
          { user_id: 'user1', color: 'white' },
          { user_id: 'user2', color: 'black' }
        ];

        expect(chessPlugin.getWinner(boardState, players)).toBeNull();
      });
    });

    describe('Next Player Logic', () => {
      test('should return correct next player', () => {
        const players = [
          { user_id: 'user1', player_order: 1 },
          { user_id: 'user2', player_order: 2 }
        ];
        const boardState = chessPlugin.getInitialBoardState();

        const nextPlayer = chessPlugin.getNextPlayer('user1', players, boardState);
        expect(nextPlayer).toBe('user2');
      });
    });

    describe('Render Data', () => {
      test('should return correct render data', () => {
        const boardState = chessPlugin.getInitialBoardState();
        const players = [];
        
        const renderData = chessPlugin.getRenderData(boardState, players);
        
        expect(renderData).toHaveProperty('board');
        expect(renderData).toHaveProperty('orientation');
        expect(renderData).toHaveProperty('highlights');
        expect(renderData.orientation).toBe('white');
      });
    });

    describe('Game Statistics', () => {
      test('should return correct game stats', () => {
        const boardState = chessPlugin.getInitialBoardState();
        const players = [
          { user_id: 'user1' },
          { user_id: 'user2' }
        ];
        
        const stats = chessPlugin.getGameStats(boardState, players);
        
        expect(stats.gameType).toBe('chess');
        expect(stats.playerCount).toBe(2);
        expect(stats.moveCount).toBe(1); // fullmoveNumber starts at 1
      });
    });
  });

  describe('ChessFrontend', () => {
    describe('Move Parsing', () => {
      test('should parse standard algebraic notation', () => {
        const move = ChessFrontend.parseMove('e4');
        expect(move).toBe('e4');
      });

      test('should handle coordinate notation', () => {
        const move = ChessFrontend.parseMove('e2-e4');
        expect(move).toBe('e2-e4');
      });

      test('should handle invalid input types', () => {
        expect(() => {
          ChessFrontend.parseMove(null);
        }).toThrow('Invalid move input');
        
        expect(() => {
          ChessFrontend.parseMove(123);
        }).toThrow('Invalid move input');
      });
    });

    describe('Move Formatting', () => {
      test('should format moves correctly', () => {
        const formatted = ChessFrontend.formatMove('e4');
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
      });

      test('should handle object moves', () => {
        const moveObj = { from: 'e2', to: 'e4' };
        const formatted = ChessFrontend.formatMove(moveObj);
        expect(typeof formatted).toBe('string');
      });
    });

    describe('UI Helpers', () => {
      test('should return move input placeholder', () => {
        const placeholder = ChessFrontend.getMoveInputPlaceholder();
        expect(typeof placeholder).toBe('string');
        expect(placeholder.length).toBeGreaterThan(0);
      });

      test('should return move input help', () => {
        const help = ChessFrontend.getMoveInputHelp();
        expect(typeof help).toBe('string');
        expect(help.length).toBeGreaterThan(0);
      });

      test('should return display name', () => {
        const name = ChessFrontend.getDisplayName();
        expect(name).toBe('Chess');
      });
    });
  });

  describe('ChessRenderer', () => {
    describe('Board Image Generation', () => {
      test('should generate board image', async () => {
        const boardState = { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' };
        
        const imageBuffer = await ChessRenderer.generateBoardImage(boardState);
        
        expect(Buffer.isBuffer(imageBuffer)).toBe(true);
        expect(imageBuffer.length).toBeGreaterThan(1000);
      });

      test('should handle custom options', async () => {
        const boardState = { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' };
        const options = { width: 600, height: 600 };
        
        const imageBuffer = await ChessRenderer.generateBoardImage(boardState, options);
        
        expect(Buffer.isBuffer(imageBuffer)).toBe(true);
      });

      test('should handle invalid board state', async () => {
        const invalidState = { invalid: 'state' };
        
        const imageBuffer = await ChessRenderer.generateBoardImage(invalidState);
        
        expect(Buffer.isBuffer(imageBuffer)).toBe(true); // Should return error image
      });
    });

    describe('Board State Validation', () => {
      test('should validate correct FEN string', () => {
        const validState = { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' };
        
        const board = ChessRenderer.validateBoardState(validState);
        
        expect(Array.isArray(board)).toBe(true);
        expect(board.length).toBe(8);
      });

      test('should handle null board state', () => {
        const board = ChessRenderer.validateBoardState(null);
        
        expect(Array.isArray(board)).toBe(true);
        expect(board.length).toBe(8);
      });

      test('should handle invalid board state', () => {
        const invalidState = { invalid: 'state' };
        
        const board = ChessRenderer.validateBoardState(invalidState);
        
        expect(Array.isArray(board)).toBe(true);
      });
    });
  });

  describe('CheckersPlugin', () => {
    let checkersPlugin;

    beforeEach(() => {
      checkersPlugin = new CheckersPlugin();
    });

    describe('Metadata and Basic Info', () => {
      test('should return correct metadata', () => {
        const metadata = CheckersPlugin.getMetadata();
        
        expect(metadata.name).toBe('Checkers');
        expect(metadata.minPlayers).toBe(2);
        expect(metadata.maxPlayers).toBe(2);
        expect(metadata.description).toContain('checkers');
      });

      test('should return correct game type', () => {
        expect(checkersPlugin.getGameType()).toBe('checkers');
      });

      test('should return available colors', () => {
        const colors = checkersPlugin.getAvailableColors(2);
        expect(colors).toEqual(['red', 'black']);
      });
    });

    describe('Board State Management', () => {
      test('should return valid initial board state', () => {
        const initialState = checkersPlugin.getInitialBoardState();
        
        expect(initialState).toHaveProperty('board');
        expect(initialState).toHaveProperty('currentPlayer');
        expect(initialState).toHaveProperty('moveCount');
        expect(initialState.currentPlayer).toBe('red');
        expect(initialState.moveCount).toBe(0);
      });

      test('should validate correct board state', () => {
        const validState = checkersPlugin.getInitialBoardState();
        
        expect(checkersPlugin.validateBoardState(validState)).toBe(true);
      });

      test('should reject invalid board state', () => {
        const invalidState = { invalid: 'state' };
        
        expect(checkersPlugin.validateBoardState(invalidState)).toBe(false);
      });
    });

    describe('Helper Methods', () => {
      test('should convert algebraic to position correctly', () => {
        const pos = checkersPlugin.algebraicToPosition('a1');
        expect(pos).toEqual({ row: 7, col: 0 });
      });

      test('should convert position to algebraic correctly', () => {
        const algebraic = checkersPlugin.positionToAlgebraic(7, 0);
        expect(algebraic).toBe('a1');
      });

      test('should validate square notation', () => {
        expect(checkersPlugin.isValidSquare('a1')).toBe(true);
        expect(checkersPlugin.isValidSquare('h8')).toBe(true);
        expect(checkersPlugin.isValidSquare('z9')).toBe(false);
        expect(checkersPlugin.isValidSquare('invalid')).toBe(false);
      });

      test('should identify piece colors correctly', () => {
        expect(checkersPlugin.getPieceColor('r')).toBe('red');
        expect(checkersPlugin.getPieceColor('R')).toBe('red');
        expect(checkersPlugin.getPieceColor('b')).toBe('black');
        expect(checkersPlugin.getPieceColor('B')).toBe('black');
        expect(checkersPlugin.getPieceColor('x')).toBeNull();
      });

      test('should identify kings correctly', () => {
        expect(checkersPlugin.isKing('R')).toBe(true);
        expect(checkersPlugin.isKing('B')).toBe(true);
        expect(checkersPlugin.isKing('r')).toBe(false);
        expect(checkersPlugin.isKing('b')).toBe(false);
      });

      test('should determine king promotion correctly', () => {
        expect(checkersPlugin.shouldPromoteToKing('r', 0)).toBe(true);
        expect(checkersPlugin.shouldPromoteToKing('b', 7)).toBe(true);
        expect(checkersPlugin.shouldPromoteToKing('r', 5)).toBe(false);
        expect(checkersPlugin.shouldPromoteToKing('b', 2)).toBe(false);
      });

      test('should promote pieces correctly', () => {
        expect(checkersPlugin.promoteToKing('r')).toBe('R');
        expect(checkersPlugin.promoteToKing('b')).toBe('B');
        expect(checkersPlugin.promoteToKing('R')).toBe('R');
      });

      test('should count pieces correctly', () => {
        const boardState = checkersPlugin.getInitialBoardState();
        
        expect(checkersPlugin.countPieces(boardState, 'red')).toBe(12);
        expect(checkersPlugin.countPieces(boardState, 'black')).toBe(12);
      });
    });
  });

  describe('CheckersFrontend', () => {
    describe('Move Parsing', () => {
      test('should parse standard notation', () => {
        const move = CheckersFrontend.parseMove('a3-b4');
        
        expect(move.from).toBe('a3');
        expect(move.to).toBe('b4');
        expect(move.captures).toEqual([]);
      });

      test('should parse capture notation', () => {
        const move = CheckersFrontend.parseMove('a3xc5');
        
        expect(move.from).toBe('a3');
        expect(move.to).toBe('c5');
        expect(move.captures.length).toBeGreaterThan(0);
      });

      test('should parse descriptive notation', () => {
        const move = CheckersFrontend.parseMove('a3 to b4');
        
        expect(move.from).toBe('a3');
        expect(move.to).toBe('b4');
      });

      test('should parse JSON notation', () => {
        const jsonMove = '{"from": "a3", "to": "b4", "captures": []}';
        const move = CheckersFrontend.parseMove(jsonMove);
        
        expect(move.from).toBe('a3');
        expect(move.to).toBe('b4');
      });

      test('should handle invalid moves', () => {
        expect(() => {
          CheckersFrontend.parseMove('invalid');
        }).toThrow();
      });
    });

    describe('Move Formatting', () => {
      test('should format simple moves', () => {
        const move = { from: 'a3', to: 'b4', captures: [] };
        const formatted = CheckersFrontend.formatMove(move);
        
        expect(formatted).toBe('a3-b4');
      });

      test('should format capture moves', () => {
        const move = { from: 'a3', to: 'c5', captures: ['b4'] };
        const formatted = CheckersFrontend.formatMove(move);
        
        expect(formatted).toBe('a3xc5');
      });

      test('should handle string moves', () => {
        const formatted = CheckersFrontend.formatMove('a3-b4');
        expect(formatted).toBe('a3-b4');
      });
    });

    describe('Helper Methods', () => {
      test('should validate square notation', () => {
        expect(CheckersFrontend.isValidSquare('a1')).toBe(true);
        expect(CheckersFrontend.isValidSquare('h8')).toBe(true);
        expect(CheckersFrontend.isValidSquare('z9')).toBe(false);
      });

      test('should identify dark squares', () => {
        // In checkers, dark squares have odd sum of coordinates
        expect(CheckersFrontend.isDarkSquare('a1')).toBe(false); // 0+0 = 0 (even)
        expect(CheckersFrontend.isDarkSquare('b1')).toBe(true);  // 1+0 = 1 (odd)
        expect(CheckersFrontend.isDarkSquare('a2')).toBe(true);  // 0+1 = 1 (odd)
        expect(CheckersFrontend.isDarkSquare('b2')).toBe(false); // 1+1 = 2 (even)
      });

      test('should calculate capture squares', () => {
        const capture = CheckersFrontend.calculateCaptureSquare('a3', 'c5');
        expect(capture).toBe('b4');
      });

      test('should return UI strings', () => {
        expect(typeof CheckersFrontend.getMoveInputPlaceholder()).toBe('string');
        expect(typeof CheckersFrontend.getMoveInputHelp()).toBe('string');
        expect(CheckersFrontend.getDisplayName()).toBe('Checkers');
      });
    });
  });

  describe('CheckersRenderer', () => {
    describe('Board Image Generation', () => {
      test('should generate board image', async () => {
        const boardState = {
          board: [
            [null, 'b', null, 'b', null, 'b', null, 'b'],
            ['b', null, 'b', null, 'b', null, 'b', null],
            [null, 'b', null, 'b', null, 'b', null, 'b'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['r', null, 'r', null, 'r', null, 'r', null],
            [null, 'r', null, 'r', null, 'r', null, 'r'],
            ['r', null, 'r', null, 'r', null, 'r', null]
          ]
        };
        
        const imageBuffer = await CheckersRenderer.generateBoardImage(boardState);
        
        expect(Buffer.isBuffer(imageBuffer)).toBe(true);
        expect(imageBuffer.length).toBeGreaterThan(1000);
      });

      test('should handle custom options', async () => {
        const boardState = { board: CheckersRenderer.getInitialBoard() };
        const options = { width: 600, height: 600 };
        
        const imageBuffer = await CheckersRenderer.generateBoardImage(boardState, options);
        
        expect(Buffer.isBuffer(imageBuffer)).toBe(true);
      });
    });

    describe('Helper Methods', () => {
      test('should get initial board correctly', () => {
        const board = CheckersRenderer.getInitialBoard();
        
        expect(Array.isArray(board)).toBe(true);
        expect(board.length).toBe(8);
        expect(board[0].length).toBe(8);
      });

      test('should convert square names correctly', () => {
        const square = CheckersRenderer.getSquareName(0, 0);
        expect(square).toBe('a8');
      });

      test('should count pieces correctly', () => {
        const board = CheckersRenderer.getInitialBoard();
        const counts = CheckersRenderer.countPieces(board);
        
        expect(counts.red.total).toBe(12);
        expect(counts.black.total).toBe(12);
        expect(counts.total).toBe(24);
      });
    });
  });
});