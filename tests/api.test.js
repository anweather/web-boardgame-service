const request = require('supertest');
const { createServer } = require('http');
const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

const gameTypeRoutes = require('../src/routes/gameTypes');
const { initializeDatabase, closeDatabase } = require('../src/database/init');
const dependencies = require('../src/config/dependencies');

// Create test app using the new architecture
function createTestApp() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Set up dependency injection with Socket.IO
  dependencies.setSocketIo(io);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "https://cdn.jsdelivr.net"],
        "style-src": ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        "font-src": ["'self'", "https://cdn.jsdelivr.net"],
        "connect-src": ["'self'", "ws:", "wss:"],
        "upgrade-insecure-requests": null
      }
    }
  }));
  app.use(cors());
  app.use(express.json());

  // Get routers from dependency container
  const routers = dependencies.getRouters();

  // Routes using new architecture
  app.use('/api/games', routers.games);
  app.use('/api/users', routers.users);
  app.use('/api/game-types', gameTypeRoutes);

  // Make io available to routes
  app.set('socketio', io);

  return { app, server, io };
}

describe('Board Game API - Comprehensive Tests', () => {
  let app, server, io;

  beforeAll(async () => {
    // Initialize test database
    await initializeDatabase();
    
    // Create test app
    const testApp = createTestApp();
    app = testApp.app;
    server = testApp.server;
    io = testApp.io;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    // Clear dependency container
    dependencies.clear();
    // Small delay to let connections close
    await new Promise(resolve => setTimeout(resolve, 100));
    await closeDatabase();
  });

  describe('User Management', () => {
    test('User Registration', async () => {
      const timestamp = Date.now();
      
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: `testuser_${timestamp}`,
          email: `test_${timestamp}@example.com`,
          password: 'password123'
        })
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(`testuser_${timestamp}`);
      expect(response.body.user.email).toBe(`test_${timestamp}@example.com`);
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.passwordHash).toBeUndefined(); // Should not expose password hash
      console.log('✓ User registration successful');
    });

    test('User Login', async () => {
      const timestamp = Date.now();
      
      // Register user first
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send({
          username: `logintest_${timestamp}`,
          email: `logintest_${timestamp}@example.com`,
          password: 'password123'
        })
        .expect(201);

      // Login with the user
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          username: `logintest_${timestamp}`,
          password: 'password123'
        })
        .expect(200);

      expect(loginResponse.body.user).toBeDefined();
      expect(loginResponse.body.user.username).toBe(`logintest_${timestamp}`);
      expect(loginResponse.body.token).toBeDefined();
      console.log('✓ User login successful');
    });

    test('Duplicate Username Registration', async () => {
      const timestamp = Date.now();
      const username = `duplicate_${timestamp}`;
      
      // Register first user
      await request(app)
        .post('/api/users/register')
        .send({
          username,
          email: `first_${timestamp}@example.com`,
          password: 'password123'
        })
        .expect(201);

      // Try to register with same username
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username,
          email: `second_${timestamp}@example.com`,
          password: 'password123'
        })
        .expect(409);

      expect(response.body.error).toContain('Username already exists');
      console.log('✓ Duplicate username properly rejected');
    });

    test('Invalid Login Credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
      console.log('✓ Invalid login properly rejected');
    });
  });

  describe('Game Creation and Management', () => {
    let testUser;

    beforeAll(async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: `gametest_${timestamp}`,
          email: `gametest_${timestamp}@example.com`,
          password: 'password123'
        });
      testUser = response.body.user;
    });

    test('Create Chess Game', async () => {
      const response = await request(app)
        .post('/api/games')
        .send({
          name: 'Test Chess Game',
          gameType: 'chess',
          creatorId: testUser.id
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('Test Chess Game');
      expect(response.body.gameType).toBe('chess');
      expect(response.body.status).toBe('waiting');
      expect(response.body.moveCount).toBe(0);
      console.log('✓ Chess game creation successful');
    });

    test('Create Checkers Game', async () => {
      const response = await request(app)
        .post('/api/games')
        .send({
          name: 'Test Checkers Game',
          gameType: 'checkers',
          creatorId: testUser.id
        })
        .expect(201);

      expect(response.body.gameType).toBe('checkers');
      console.log('✓ Checkers game creation successful');
    });

    test('Create Hearts Game', async () => {
      const response = await request(app)
        .post('/api/games')
        .send({
          name: 'Test Hearts Game',
          gameType: 'hearts',
          creatorId: testUser.id
        })
        .expect(201);

      expect(response.body.gameType).toBe('hearts');
      console.log('✓ Hearts game creation successful');
    });

    test('Invalid Game Type', async () => {
      const response = await request(app)
        .post('/api/games')
        .send({
          name: 'Invalid Game',
          gameType: 'nonexistent',
          creatorId: testUser.id
        })
        .expect(500);

      expect(response.body.error).toBeDefined();
      console.log('✓ Invalid game type properly rejected');
    });

    test('Missing Creator ID', async () => {
      const response = await request(app)
        .post('/api/games')
        .send({
          name: 'No Creator Game',
          gameType: 'chess'
        })
        .expect(400);

      expect(response.body.error).toContain('creatorId');
      console.log('✓ Missing creator ID properly rejected');
    });

    test('Non-existent Creator', async () => {
      const response = await request(app)
        .post('/api/games')
        .send({
          name: 'Non-existent Creator Game',
          gameType: 'chess',
          creatorId: 'nonexistent-user-id'
        })
        .expect(404);

      expect(response.body.error).toContain('Creator not found');
      console.log('✓ Non-existent creator properly rejected');
    });

    test('Get All Games', async () => {
      const response = await request(app)
        .get('/api/games')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      console.log(`✓ Retrieved ${response.body.length} games`);
    });

    test('Get Game by ID', async () => {
      // Create a game first
      const createResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Get Test Game',
          gameType: 'chess',
          creatorId: testUser.id
        });

      const gameId = createResponse.body.id;

      const getResponse = await request(app)
        .get(`/api/games/${gameId}`)
        .expect(200);

      expect(getResponse.body.id).toBe(gameId);
      expect(getResponse.body.name).toBe('Get Test Game');
      expect(getResponse.body.players).toBeDefined();
      expect(getResponse.body.players.length).toBe(1); // Creator is automatically added
      console.log('✓ Game retrieval by ID successful');
    });

    test('Get Non-existent Game', async () => {
      const response = await request(app)
        .get('/api/games/nonexistent-id')
        .expect(404);

      expect(response.body.error).toContain('Game not found');
      console.log('✓ Non-existent game properly handled');
    });
  });

  describe('Game Joining and Gameplay', () => {
    let player1, player2, gameId;

    beforeAll(async () => {
      const timestamp = Date.now();
      
      // Create two test players
      const player1Response = await request(app)
        .post('/api/users/register')
        .send({
          username: `player1_${timestamp}`,
          email: `player1_${timestamp}@example.com`,
          password: 'password123'
        });
      player1 = player1Response.body.user;

      const player2Response = await request(app)
        .post('/api/users/register')
        .send({
          username: `player2_${timestamp}`,
          email: `player2_${timestamp}@example.com`,
          password: 'password123'
        });
      player2 = player2Response.body.user;

      // Create a chess game
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Multiplayer Test Game',
          gameType: 'chess',
          creatorId: player1.id
        });
      gameId = gameResponse.body.id;
    });

    test('Player Joins Game', async () => {
      const response = await request(app)
        .post(`/api/games/${gameId}/join`)
        .send({
          userId: player2.id
        })
        .expect(200);

      expect(response.body.message).toContain('Successfully joined');
      expect(response.body.gameStatus).toBe('active'); // Should be active with 2 players
      console.log('✓ Player successfully joined game');
    });

    test('Game is Active After Second Player Joins', async () => {
      const response = await request(app)
        .get(`/api/games/${gameId}`)
        .expect(200);

      expect(response.body.status).toBe('active');
      expect(response.body.players.length).toBe(2);
      expect(response.body.currentPlayerId).toBeDefined();
      console.log('✓ Game is active with 2 players');
    });

    test('Make Valid Chess Move', async () => {
      // Get game state to see who's turn it is
      const gameState = await request(app)
        .get(`/api/games/${gameId}`)
        .expect(200);

      const currentPlayerId = gameState.body.currentPlayerId;

      const response = await request(app)
        .post(`/api/games/${gameId}/move`)
        .send({
          userId: currentPlayerId,
          move: 'e2-e4'
        })
        .expect(200);

      expect(response.body.message).toContain('Move recorded');
      expect(response.body.moveCount).toBe(1);
      expect(response.body.nextPlayerId).toBeDefined();
      expect(response.body.nextPlayerId).not.toBe(currentPlayerId);
      console.log('✓ Valid chess move successful');
    });

    test('Invalid Move - Wrong Player Turn', async () => {
      // Get game state to see who's turn it is
      const gameState = await request(app)
        .get(`/api/games/${gameId}`)
        .expect(200);

      const currentPlayerId = gameState.body.currentPlayerId;
      const wrongPlayerId = currentPlayerId === player1.id ? player2.id : player1.id;

      const response = await request(app)
        .post(`/api/games/${gameId}/move`)
        .send({
          userId: wrongPlayerId,
          move: 'e7-e5'
        })
        .expect(500);

      expect(response.body.error).toContain('Not your turn');
      console.log('✓ Wrong player turn properly rejected');
    });

    test('Player Already in Game', async () => {
      const response = await request(app)
        .post(`/api/games/${gameId}/join`)
        .send({
          userId: player1.id
        })
        .expect(500);

      expect(response.body.error).toContain('already in this game');
      console.log('✓ Player already in game properly rejected');
    });

    test('Join Non-existent Game', async () => {
      const response = await request(app)
        .post('/api/games/nonexistent-id/join')
        .send({
          userId: player1.id
        })
        .expect(500);

      expect(response.body.error).toBeDefined();
      console.log('✓ Join non-existent game properly handled');
    });

    test('Get Move History', async () => {
      const response = await request(app)
        .get(`/api/games/${gameId}/moves`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1); // Should have one move from earlier test
      expect(response.body[0].move).toBeDefined();
      expect(response.body[0].player).toBeDefined();
      console.log('✓ Move history retrieval successful');
    });
  });

  describe('Game Images and Board Rendering', () => {
    let testUser, gameId;

    beforeAll(async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: `imagetest_${timestamp}`,
          email: `imagetest_${timestamp}@example.com`,
          password: 'password123'
        });
      testUser = response.body.user;

      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Image Test Game',
          gameType: 'chess',
          creatorId: testUser.id
        });
      gameId = gameResponse.body.id;
    });

    test('Generate Chess Board Image', async () => {
      const response = await request(app)
        .get(`/api/games/${gameId}/image`)
        .expect(200);

      expect(response.headers['content-type']).toBe('image/png');
      expect(response.body.length).toBeGreaterThan(5000);
      console.log(`✓ Chess board image generated: ${response.body.length} bytes`);
    });

    test('Generate Checkers Board Image', async () => {
      // Create checkers game
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Checkers Image Test',
          gameType: 'checkers',
          creatorId: testUser.id
        });

      const response = await request(app)
        .get(`/api/games/${gameResponse.body.id}/image`)
        .expect(200);

      expect(response.headers['content-type']).toBe('image/png');
      expect(response.body.length).toBeGreaterThan(1000);
      console.log(`✓ Checkers board image generated: ${response.body.length} bytes`);
    });

    test('Generate Hearts Board Image', async () => {
      // Create hearts game
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Hearts Image Test',
          gameType: 'hearts',
          creatorId: testUser.id
        });

      const response = await request(app)
        .get(`/api/games/${gameResponse.body.id}/image`)
        .expect(200);

      expect(response.headers['content-type']).toBe('image/png');
      expect(response.body.length).toBeGreaterThan(1000);
      console.log(`✓ Hearts board image generated: ${response.body.length} bytes`);
    });

    test('Image for Non-existent Game', async () => {
      const response = await request(app)
        .get('/api/games/nonexistent-id/image')
        .expect(404);

      expect(response.body.error).toContain('Game not found');
      console.log('✓ Non-existent game image request properly handled');
    });
  });

  describe('Game Types', () => {
    test('Get Available Game Types', async () => {
      const response = await request(app)
        .get('/api/game-types')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
      
      const gameTypes = response.body.map(gt => gt.type);
      expect(gameTypes).toContain('chess');
      expect(gameTypes).toContain('checkers');
      expect(gameTypes).toContain('hearts');
      
      console.log(`✓ Retrieved ${response.body.length} game types: ${gameTypes.join(', ')}`);
    });

    test('Get Specific Game Type Info', async () => {
      const response = await request(app)
        .get('/api/game-types/chess')
        .expect(200);

      expect(response.body.type).toBe('chess');
      expect(response.body.displayName).toBeDefined();
      expect(response.body.minPlayers).toBeDefined();
      expect(response.body.maxPlayers).toBeDefined();
      console.log('✓ Chess game type info retrieved');
    });

    test('Validate Game Configuration', async () => {
      const response = await request(app)
        .post('/api/game-types/chess/validate')
        .send({
          minPlayers: 2,
          maxPlayers: 2
        })
        .expect(200);

      expect(response.body.valid).toBe(true);
      console.log('✓ Game configuration validation successful');
    });
  });
});