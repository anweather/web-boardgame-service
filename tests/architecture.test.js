const request = require('supertest');
const { initializeDatabase, closeDatabase } = require('../src/database/init');
const dependencies = require('../src/config/dependencies');

describe('Ports and Adapters Architecture Tests', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(() => {
    // Clear dependencies between tests to ensure clean state
    dependencies.clear();
  });

  test('Domain services should work directly', async () => {
    const userService = dependencies.getUserService();
    const gameService = dependencies.getGameService();

    // Test user creation through domain service
    const timestamp = Date.now();
    const user = await userService.createUser({
      username: `testuser_arch_${timestamp}`,
      email: `test_${timestamp}@arch.com`,
      password: 'password123'
    });

    expect(user).toBeDefined();
    expect(user.username).toBe(`testuser_arch_${timestamp}`);
    expect(user.email).toBe(`test_${timestamp}@arch.com`);

    // Test authentication through domain service
    const authResult = await userService.authenticateUser(`testuser_arch_${timestamp}`, 'password123');
    expect(authResult.success).toBe(true);
    expect(authResult.user.username).toBe(`testuser_arch_${timestamp}`);

    // Test game creation through domain service
    const game = await gameService.createGame({
      name: 'Arch Test Game',
      gameType: 'chess',
      creatorId: user.id
    });

    expect(game).toBeDefined();
    expect(game.name).toBe('Arch Test Game');
    expect(game.gameType).toBe('chess');
    expect(game.status).toBe('waiting');

    console.log('✓ Domain services working correctly');
  });

  test('Repository adapters should persist data correctly', async () => {
    const gameRepository = dependencies.getGameRepository();
    const userRepository = dependencies.getUserRepository();

    // Test user repository with unique identifiers
    const timestamp = Date.now();
    const userData = {
      username: `repo_test_user_${timestamp}`,
      email: `repo_${timestamp}@test.com`,
      password: 'password123'
    };

    const savedUser = await userRepository.create(userData);
    expect(savedUser).toBeDefined();
    expect(savedUser.username).toBe(`repo_test_user_${timestamp}`);

    const retrievedUser = await userRepository.findById(savedUser.id);
    expect(retrievedUser).toBeDefined();
    expect(retrievedUser.username).toBe(`repo_test_user_${timestamp}`);

    // Test game repository
    const Game = require('../src/domain/Game');
    const gameData = new Game({
      id: 'test-game-123',
      name: 'Repository Test Game',
      gameType: 'chess',
      status: 'waiting',
      boardState: { test: 'data' },
      minPlayers: 2,
      maxPlayers: 2,
      settings: { timeLimit: 30 }
    });

    const savedGame = await gameRepository.save(gameData);
    expect(savedGame).toBeDefined();
    expect(savedGame.name).toBe('Repository Test Game');

    const retrievedGame = await gameRepository.findById('test-game-123');
    expect(retrievedGame).toBeDefined();
    expect(retrievedGame.name).toBe('Repository Test Game');
    expect(retrievedGame.gameType).toBe('chess');

    console.log('✓ Repository adapters working correctly');
  });

  test('Plugin registry should manage game types', async () => {
    const pluginRegistry = dependencies.getGamePluginRegistry();

    // Test available game types
    const gameTypes = pluginRegistry.getAvailableGameTypes();
    expect(gameTypes).toBeDefined();
    expect(gameTypes.length).toBeGreaterThan(0);

    const chessType = gameTypes.find(gt => gt.type === 'chess');
    expect(chessType).toBeDefined();
    expect(chessType.name).toBe('Chess');
    expect(chessType.minPlayers).toBe(2);
    expect(chessType.maxPlayers).toBe(2);

    // Test getting specific plugin
    const chessPlugin = pluginRegistry.getPlugin('chess');
    expect(chessPlugin).toBeDefined();
    expect(chessPlugin.getGameType()).toBe('chess');

    const initialBoard = chessPlugin.getInitialBoardState();
    expect(initialBoard).toBeDefined();
    expect(initialBoard.board).toBeDefined();
    expect(initialBoard.board.length).toBe(8);

    console.log('✓ Plugin registry working correctly');
  });

  test('Notification service should handle notifications', async () => {
    const notificationService = dependencies.getNotificationService();
    const userService = dependencies.getUserService();

    // Create a user for notifications
    const timestamp = Date.now();
    const user = await userService.createUser({
      username: `notification_user_${timestamp}`,
      email: `notifications_${timestamp}@test.com`,
      password: 'password123'
    });

    // Send a notification
    const notification = await notificationService.sendNotification(
      user.id,
      'test',
      'Test notification message',
      { gameId: 'test-game' }
    );

    expect(notification).toBeDefined();
    expect(notification.type).toBe('test');
    expect(notification.message).toBe('Test notification message');
    expect(notification.gameId).toBe('test-game');

    // Get user notifications
    const notifications = await notificationService.getUserNotifications(user.id);
    expect(notifications).toBeDefined();
    expect(notifications.length).toBe(1);
    expect(notifications[0].message).toBe('Test notification message');

    console.log('✓ Notification service working correctly');
  });

  test('Dependency injection should provide singletons', async () => {
    // Get instances multiple times
    const gameService1 = dependencies.getGameService();
    const gameService2 = dependencies.getGameService();
    const userService1 = dependencies.getUserService();
    const userService2 = dependencies.getUserService();

    // Should be the same instances (singletons)
    expect(gameService1).toBe(gameService2);
    expect(userService1).toBe(userService2);

    // HTTP controllers should also be singletons
    const gameController1 = dependencies.getHttpGameController();
    const gameController2 = dependencies.getHttpGameController();
    expect(gameController1).toBe(gameController2);

    console.log('✓ Dependency injection providing singletons correctly');
  });
});