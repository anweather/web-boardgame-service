/**
 * Domain Layer Unit Tests
 * Tests for src/domain/ modules to achieve >80% coverage
 */

const GameService = require('../src/domain/GameService');
const UserService = require('../src/domain/UserService');
const GamePluginRegistry = require('../src/domain/GamePluginRegistry');
const Game = require('../src/domain/Game');
const User = require('../src/domain/User');

// Mock repositories
const mockGameRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByUserId: jest.fn(),
  addPlayer: jest.fn(),
  updateBoardState: jest.fn(),
  addMove: jest.fn(),
  getMovesForGame: jest.fn()
};

const mockUserRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUsername: jest.fn(),
  findByEmail: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

const mockNotificationService = {
  sendNotification: jest.fn(),
  broadcastGameUpdate: jest.fn()
};

const mockGamePluginRegistry = {
  isSupported: jest.fn(),
  getPlugin: jest.fn(),
  getAvailableGameTypes: jest.fn()
};

// Mock plugin
const mockPlugin = {
  getInitialBoardState: jest.fn(),
  validateMove: jest.fn(),
  applyMove: jest.fn(),
  isGameComplete: jest.fn(),
  getWinner: jest.fn(),
  getNextPlayer: jest.fn(),
  getMinPlayers: jest.fn(),
  getMaxPlayers: jest.fn(),
  getAvailableColors: jest.fn(),
  assignPlayerColor: jest.fn(),
  validateBoardState: jest.fn(),
  getRenderData: jest.fn(),
  getGameStats: jest.fn()
};

describe('Domain Layer Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GameService', () => {
    let gameService;

    beforeEach(() => {
      gameService = new GameService(mockGameRepository, mockGamePluginRegistry, mockNotificationService);
    });

    describe('Game Creation', () => {
      test('should create game with valid parameters', async () => {
        mockGamePluginRegistry.isSupported.mockReturnValue(true);
        mockGamePluginRegistry.getPlugin.mockReturnValue(mockPlugin);
        mockPlugin.getInitialBoardState.mockReturnValue({ board: 'initial' });
        mockPlugin.getMinPlayers.mockReturnValue(2);
        mockPlugin.getMaxPlayers.mockReturnValue(4);
        mockPlugin.getAvailableColors.mockReturnValue(['red', 'blue']);
        mockPlugin.assignPlayerColor.mockReturnValue('red');
        mockGameRepository.create.mockResolvedValue({
          id: 'game-id',
          gameType: 'test',
          creatorId: 'user-id'
        });

        const result = await gameService.createGame({
          gameType: 'test',
          creatorId: 'user-id',
          name: 'Test Game'
        });

        expect(mockGameRepository.create).toHaveBeenCalled();
        expect(result.id).toBe('game-id');
      });

      test('should reject unsupported game type', async () => {
        mockGamePluginRegistry.isSupported.mockReturnValue(false);

        await expect(gameService.createGame({
          gameType: 'unsupported',
          creatorId: 'user-id'
        })).rejects.toThrow('Unsupported game type');
      });

      test('should handle missing creator ID', async () => {
        await expect(gameService.createGame({
          gameType: 'test'
        })).rejects.toThrow('Creator ID is required');
      });

      test('should handle missing game type', async () => {
        await expect(gameService.createGame({
          creatorId: 'user-id'
        })).rejects.toThrow('Game type is required');
      });
    });

    describe('Game Retrieval', () => {
      test('should get game by ID', async () => {
        const mockGame = { id: 'game-id', gameType: 'test' };
        mockGameRepository.findById.mockResolvedValue(mockGame);

        const result = await gameService.getGameById('game-id');

        expect(mockGameRepository.findById).toHaveBeenCalledWith('game-id');
        expect(result).toEqual(mockGame);
      });

      test('should handle non-existent game', async () => {
        mockGameRepository.findById.mockResolvedValue(null);

        await expect(gameService.getGameById('non-existent'))
          .rejects.toThrow('Game not found');
      });

      test('should get all games', async () => {
        const mockGames = [{ id: 'game1' }, { id: 'game2' }];
        mockGameRepository.findAll.mockResolvedValue(mockGames);

        const result = await gameService.getAllGames();

        expect(mockGameRepository.findAll).toHaveBeenCalled();
        expect(result).toEqual(mockGames);
      });

      test('should get games by user ID', async () => {
        const mockGames = [{ id: 'game1' }];
        mockGameRepository.findByUserId.mockResolvedValue(mockGames);

        const result = await gameService.getGamesByUserId('user-id');

        expect(mockGameRepository.findByUserId).toHaveBeenCalledWith('user-id');
        expect(result).toEqual(mockGames);
      });
    });

    describe('Player Management', () => {
      test('should add player to game', async () => {
        const mockGame = {
          id: 'game-id',
          gameType: 'test',
          status: 'waiting',
          players: [{ userId: 'user1', playerOrder: 1 }]
        };
        
        mockGameRepository.findById.mockResolvedValue(mockGame);
        mockGamePluginRegistry.getPlugin.mockReturnValue(mockPlugin);
        mockPlugin.getMaxPlayers.mockReturnValue(4);
        mockPlugin.assignPlayerColor.mockReturnValue('blue');
        mockGameRepository.addPlayer.mockResolvedValue(mockGame);
        mockGameRepository.update.mockResolvedValue(mockGame);

        const result = await gameService.addPlayerToGame('game-id', 'user2');

        expect(mockGameRepository.addPlayer).toHaveBeenCalled();
        expect(result).toEqual(mockGame);
      });

      test('should reject player when game is full', async () => {
        const mockGame = {
          id: 'game-id',
          gameType: 'test',
          status: 'waiting',
          players: [
            { userId: 'user1', playerOrder: 1 },
            { userId: 'user2', playerOrder: 2 }
          ]
        };
        
        mockGameRepository.findById.mockResolvedValue(mockGame);
        mockGamePluginRegistry.getPlugin.mockReturnValue(mockPlugin);
        mockPlugin.getMaxPlayers.mockReturnValue(2);

        await expect(gameService.addPlayerToGame('game-id', 'user3'))
          .rejects.toThrow('Game cannot accept new players');
      });

      test('should reject duplicate player', async () => {
        const mockGame = {
          id: 'game-id',
          gameType: 'test',
          status: 'waiting',
          players: [{ userId: 'user1', playerOrder: 1 }]
        };
        
        mockGameRepository.findById.mockResolvedValue(mockGame);

        await expect(gameService.addPlayerToGame('game-id', 'user1'))
          .rejects.toThrow('Player already in game');
      });
    });

    describe('Move Management', () => {
      test('should process valid move', async () => {
        const mockGame = {
          id: 'game-id',
          gameType: 'test',
          currentPlayerId: 'user1',
          boardState: '{"turn": "white"}',
          players: [{ userId: 'user1', color: 'white' }]
        };
        
        mockGameRepository.findById.mockResolvedValue(mockGame);
        mockGamePluginRegistry.getPlugin.mockReturnValue(mockPlugin);
        mockPlugin.validateMove.mockReturnValue({ valid: true });
        mockPlugin.applyMove.mockReturnValue({ turn: 'black' });
        mockPlugin.getNextPlayer.mockReturnValue('user2');
        mockPlugin.isGameComplete.mockReturnValue(false);
        mockGameRepository.updateBoardState.mockResolvedValue(mockGame);
        mockGameRepository.addMove.mockResolvedValue(true);

        const result = await gameService.makeMove('game-id', 'user1', 'e2-e4');

        expect(mockPlugin.validateMove).toHaveBeenCalled();
        expect(mockPlugin.applyMove).toHaveBeenCalled();
        expect(mockGameRepository.updateBoardState).toHaveBeenCalled();
        expect(mockGameRepository.addMove).toHaveBeenCalled();
      });

      test('should reject invalid move', async () => {
        const mockGame = {
          id: 'game-id',
          gameType: 'test',
          currentPlayerId: 'user1',
          boardState: '{"turn": "white"}',
          players: [{ userId: 'user1', color: 'white' }]
        };
        
        mockGameRepository.findById.mockResolvedValue(mockGame);
        mockGamePluginRegistry.getPlugin.mockReturnValue(mockPlugin);
        mockPlugin.validateMove.mockReturnValue({ valid: false, error: 'Invalid move' });

        await expect(gameService.makeMove('game-id', 'user1', 'invalid'))
          .rejects.toThrow('Invalid move');
      });

      test('should reject move by wrong player', async () => {
        const mockGame = {
          id: 'game-id',
          gameType: 'test',
          currentPlayerId: 'user1',
          boardState: '{"turn": "white"}',
          players: [{ userId: 'user1', color: 'white' }]
        };
        
        mockGameRepository.findById.mockResolvedValue(mockGame);

        await expect(gameService.makeMove('game-id', 'user2', 'e2-e4'))
          .rejects.toThrow('Not player\'s turn');
      });

      test('should get move history', async () => {
        const mockMoves = [
          { id: 1, move: 'e2-e4', playerId: 'user1' },
          { id: 2, move: 'e7-e5', playerId: 'user2' }
        ];
        
        mockGameRepository.getMovesForGame.mockResolvedValue(mockMoves);

        const result = await gameService.getGameMoves('game-id');

        expect(mockGameRepository.getMovesForGame).toHaveBeenCalledWith('game-id');
        expect(result).toEqual(mockMoves);
      });
    });
  });

  describe('UserService', () => {
    let userService;

    beforeEach(() => {
      userService = new UserService(mockUserRepository);
    });

    describe('User Creation', () => {
      test('should create user with valid data', async () => {
        mockUserRepository.findByUsername.mockResolvedValue(null);
        mockUserRepository.findByEmail.mockResolvedValue(null);
        mockUserRepository.create.mockResolvedValue({
          id: 'user-id',
          username: 'testuser',
          email: 'test@example.com'
        });

        const result = await userService.createUser({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

        expect(mockUserRepository.create).toHaveBeenCalled();
        expect(result.id).toBe('user-id');
      });

      test('should reject duplicate username', async () => {
        mockUserRepository.findByUsername.mockResolvedValue({ id: 'existing-user' });

        await expect(userService.createUser({
          username: 'existing',
          email: 'test@example.com',
          password: 'password123'
        })).rejects.toThrow('Username already exists');
      });

      test('should reject duplicate email', async () => {
        mockUserRepository.findByUsername.mockResolvedValue(null);
        mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing-user' });

        await expect(userService.createUser({
          username: 'testuser',
          email: 'existing@example.com',
          password: 'password123'
        })).rejects.toThrow('Email already exists');
      });

      test('should handle missing required fields', async () => {
        await expect(userService.createUser({}))
          .rejects.toThrow();
      });
    });

    describe('User Authentication', () => {
      test('should authenticate with valid credentials', async () => {
        const mockUser = {
          id: 'user-id',
          username: 'testuser',
          password: '$2a$10$hash' // Mocked bcrypt hash
        };
        
        mockUserRepository.findByUsername.mockResolvedValue(mockUser);
        
        // Mock bcrypt comparison
        const bcrypt = require('bcryptjs');
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

        const result = await userService.authenticateUser('testuser', 'password123');

        expect(result).toEqual(mockUser);
      });

      test('should reject invalid username', async () => {
        mockUserRepository.findByUsername.mockResolvedValue(null);

        await expect(userService.authenticateUser('nonexistent', 'password'))
          .rejects.toThrow('Invalid credentials');
      });

      test('should reject invalid password', async () => {
        const mockUser = {
          id: 'user-id',
          username: 'testuser',
          password: '$2a$10$hash'
        };
        
        mockUserRepository.findByUsername.mockResolvedValue(mockUser);
        
        const bcrypt = require('bcryptjs');
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

        await expect(userService.authenticateUser('testuser', 'wrongpassword'))
          .rejects.toThrow('Invalid credentials');
      });
    });

    describe('User Retrieval', () => {
      test('should get user by ID', async () => {
        const mockUser = { id: 'user-id', username: 'testuser' };
        mockUserRepository.findById.mockResolvedValue(mockUser);

        const result = await userService.getUserById('user-id');

        expect(mockUserRepository.findById).toHaveBeenCalledWith('user-id');
        expect(result).toEqual(mockUser);
      });

      test('should handle non-existent user', async () => {
        mockUserRepository.findById.mockResolvedValue(null);

        await expect(userService.getUserById('non-existent'))
          .rejects.toThrow('User not found');
      });

      test('should get all users', async () => {
        const mockUsers = [{ id: 'user1' }, { id: 'user2' }];
        mockUserRepository.findAll.mockResolvedValue(mockUsers);

        const result = await userService.getAllUsers();

        expect(mockUserRepository.findAll).toHaveBeenCalled();
        expect(result).toEqual(mockUsers);
      });
    });
  });

  describe('GamePluginRegistry', () => {
    let registry;

    beforeEach(() => {
      registry = new GamePluginRegistry();
    });

    describe('Plugin Registration', () => {
      test('should register valid plugin', () => {
        class TestPlugin {
          static getMetadata() {
            return { name: 'Test', description: 'Test game', minPlayers: 2, maxPlayers: 4 };
          }
        }

        // Mock the validation to avoid complex setup
        jest.spyOn(registry, '_validatePlugin').mockImplementation(() => {});

        registry.register('test', TestPlugin);

        expect(registry.isSupported('test')).toBe(true);
      });

      test('should get registered plugin instance', () => {
        class TestPlugin {
          constructor() {
            this.type = 'test';
          }
        }

        registry.plugins.set('test', TestPlugin);

        const instance = registry.getPlugin('test');

        expect(instance).toBeInstanceOf(TestPlugin);
        expect(instance.type).toBe('test');
      });

      test('should return null for non-existent plugin', () => {
        const instance = registry.getPlugin('nonexistent');

        expect(instance).toBeNull();
      });

      test('should unregister plugin', () => {
        class TestPlugin {}
        registry.plugins.set('test', TestPlugin);

        const removed = registry.unregister('test');

        expect(removed).toBe(true);
        expect(registry.isSupported('test')).toBe(false);
      });

      test('should clear all plugins', () => {
        class TestPlugin1 {}
        class TestPlugin2 {}
        registry.plugins.set('test1', TestPlugin1);
        registry.plugins.set('test2', TestPlugin2);

        registry.clear();

        expect(registry.getPluginCount()).toBe(0);
      });
    });

    describe('Plugin Metadata', () => {
      test('should get available game types', () => {
        class TestPlugin {
          static getMetadata() {
            return { name: 'Test', description: 'Test game', minPlayers: 2, maxPlayers: 4 };
          }
        }

        registry.plugins.set('test', TestPlugin);

        const gameTypes = registry.getAvailableGameTypes();

        expect(gameTypes).toHaveLength(1);
        expect(gameTypes[0].type).toBe('test');
        expect(gameTypes[0].name).toBe('Test');
      });

      test('should get specific game type metadata', () => {
        class TestPlugin {
          static getMetadata() {
            return { name: 'Test', description: 'Test game', minPlayers: 2, maxPlayers: 4 };
          }
        }

        registry.plugins.set('test', TestPlugin);

        const metadata = registry.getGameTypeMetadata('test');

        expect(metadata.type).toBe('test');
        expect(metadata.name).toBe('Test');
      });

      test('should return null for non-existent game type metadata', () => {
        const metadata = registry.getGameTypeMetadata('nonexistent');

        expect(metadata).toBeNull();
      });
    });

    describe('Registry Stats', () => {
      test('should return correct plugin count', () => {
        expect(registry.getPluginCount()).toBe(0);

        registry.plugins.set('test1', class {});
        registry.plugins.set('test2', class {});

        expect(registry.getPluginCount()).toBe(2);
      });

      test('should list registered game types', () => {
        registry.plugins.set('chess', class {});
        registry.plugins.set('checkers', class {});

        const gameTypes = registry.getRegisteredGameTypes();

        expect(gameTypes).toEqual(['chess', 'checkers']);
      });
    });
  });

  describe('Game Domain Model', () => {
    test('should create game with valid data', () => {
      const gameData = {
        id: 'game-id',
        name: 'Test Game',
        gameType: 'chess',
        creatorId: 'user-id'
      };

      const game = new Game(gameData);

      expect(game.id).toBe('game-id');
      expect(game.name).toBe('Test Game');
      expect(game.gameType).toBe('chess');
      expect(game.creatorId).toBe('user-id');
    });

    test('should handle missing optional fields', () => {
      const gameData = {
        id: 'game-id',
        gameType: 'chess',
        creatorId: 'user-id'
      };

      const game = new Game(gameData);

      expect(game.id).toBe('game-id');
      expect(game.name).toBeUndefined();
    });
  });

  describe('User Domain Model', () => {
    test('should create user with valid data', () => {
      const userData = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com'
      };

      const user = new User(userData);

      expect(user.id).toBe('user-id');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
    });

    test('should handle optional fields', () => {
      const userData = {
        id: 'user-id',
        username: 'testuser'
      };

      const user = new User(userData);

      expect(user.id).toBe('user-id');
      expect(user.username).toBe('testuser');
      expect(user.email).toBeUndefined();
    });
  });
});