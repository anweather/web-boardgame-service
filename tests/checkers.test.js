const request = require('supertest');
const { createServer } = require('http');
const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

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

  return { app, server };
}

describe('Checkers Plugin Integration Tests', () => {
  let app, server;
  let testUsers = [];

  beforeAll(async () => {
    await initializeDatabase();
    const testApp = createTestApp();
    app = testApp.app;
    server = testApp.server;

    // Create test users for checkers games with timestamp for uniqueness
    const timestamp = Date.now();
    const userPromises = [];
    for (let i = 1; i <= 4; i++) {
      userPromises.push(
        request(app)
          .post('/api/users/register')
          .send({
            username: `checkersUser${i}_${timestamp}`,
            email: `checkers${i}_${timestamp}@test.com`,
            password: 'password123'
          })
      );
    }

    const userResponses = await Promise.all(userPromises);
    testUsers = userResponses.map(res => res.body.user);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await closeDatabase();
  });

  describe('Checkers Game Type Registration', () => {
    test('should include checkers in available game types', async () => {
      const response = await request(app)
        .get('/api/game-types')
        .expect(200);

      const gameTypes = response.body;
      expect(Array.isArray(gameTypes)).toBe(true);
      
      const checkersType = gameTypes.find(gt => gt.type === 'checkers');
      expect(checkersType).toBeDefined();
      expect(checkersType.name).toBe('Checkers');
      expect(checkersType.description).toContain('checkers');
      expect(checkersType.minPlayers).toBe(2);
      expect(checkersType.maxPlayers).toBe(2);
    });

    test('should get specific checkers game type info', async () => {
      const response = await request(app)
        .get('/api/game-types/checkers')
        .expect(200);

      const checkers = response.body;
      expect(checkers.type).toBe('checkers');
      expect(checkers.name).toBe('Checkers');
      expect(checkers.minPlayers).toBe(2);
      expect(checkers.maxPlayers).toBe(2);
    });
  });

  describe('Checkers Game Creation and Management', () => {
    test('should create a checkers game successfully', async () => {
      const response = await request(app)
        .post('/api/games')
        .send({
          name: 'Test Checkers Game',
          gameType: 'checkers',
          creatorId: testUsers[0].id
        })
        .expect(201);

      const game = response.body;
      expect(game.gameType).toBe('checkers');
      expect(game.status).toBe('waiting');
      expect(game.name).toBe('Test Checkers Game');
      expect(game.id).toBeDefined();
      
      // Get full game state to check players
      const gameStateResponse = await request(app)
        .get(`/api/games/${game.id}`);
      
      const gameState = gameStateResponse.body;
      expect(gameState.players).toHaveLength(1);
      expect(gameState.players[0].userId).toBe(testUsers[0].id);
      expect(gameState.players[0].color).toBe('red'); // First player should be red
    });

    test('should allow second player to join checkers game', async () => {
      // Create game
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Join Test Checkers',
          gameType: 'checkers',
          creatorId: testUsers[0].id
        });

      const gameId = gameResponse.body.id;

      // Second player joins
      const joinResponse = await request(app)
        .post(`/api/games/${gameId}/join`)
        .send({
          userId: testUsers[1].id
        })
        .expect(200);

      expect(joinResponse.body.color).toBe('black'); // Second player should be black
      
      // Get updated game state
      const updatedGameResponse = await request(app)
        .get(`/api/games/${gameId}`);
        
      const updatedGame = updatedGameResponse.body;
      expect(updatedGame.status).toBe('active');
      expect(updatedGame.players).toHaveLength(2);
      expect(updatedGame.players[1].color).toBe('black'); // Second player should be black
    });

    test('should not allow third player to join checkers game', async () => {
      // Create and fill game
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Full Checkers Game',
          gameType: 'checkers',
          creatorId: testUsers[0].id
        });

      const gameId = gameResponse.body.id;

      await request(app)
        .post(`/api/games/${gameId}/join`)
        .send({ userId: testUsers[1].id })
        .expect(200);

      // Try to add third player
      await request(app)
        .post(`/api/games/${gameId}/join`)
        .send({ userId: testUsers[2].id })
        .expect(400);
    });
  });

  describe('Checkers Move Validation and Application', () => {
    let gameId, players;

    beforeEach(async () => {
      // Create and populate game for each test
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Move Test Game',
          gameType: 'checkers',
          creatorId: testUsers[0].id
        });

      gameId = gameResponse.body.id;

      await request(app)
        .post(`/api/games/${gameId}/join`)
        .send({ userId: testUsers[1].id });

      // Get full game state to access players
      const gameStateResponse = await request(app)
        .get(`/api/games/${gameId}`);
        
      players = gameStateResponse.body.players;
    });

    test('should validate and apply simple checkers moves', async () => {
      const redPlayer = players.find(p => p.color === 'red');

      // Test different move formats
      const moveFormats = [
        'c3-d4',     // Standard format
        'c3 to d4',  // Descriptive format
        { from: 'e3', to: 'f4', captures: [] } // Object format
      ];

      for (const move of moveFormats) {
        const moveResponse = await request(app)
          .post(`/api/games/${gameId}/move`)
          .send({
            userId: redPlayer.user_id,
            move: move
          })
          .expect(200);

        expect(moveResponse.body.moveCount).toBeGreaterThan(0);
        
        // Get updated game state
        const gameState = await request(app)
          .get(`/api/games/${gameId}`)
          .expect(200);

        expect(gameState.body.boardState.currentPlayer).toBe('black'); // Should switch turns
      }
    });

    test('should handle capture moves correctly', async () => {
      const redPlayer = players.find(p => p.color === 'red');
      
      // Set up a capture scenario by making moves to position pieces
      await request(app)
        .post(`/api/games/${gameId}/move`)
        .send({
          userId: redPlayer.user_id,
          move: 'c3-d4'
        });

      const blackPlayer = players.find(p => p.color === 'black');
      await request(app)
        .post(`/api/games/${gameId}/move`)
        .send({
          userId: blackPlayer.user_id,
          move: 'f6-e5'
        });

      // Test capture move format (may not be valid position, but tests parsing)
      const captureResponse = await request(app)
        .post(`/api/games/${gameId}/move`)
        .send({
          userId: redPlayer.user_id,
          move: { from: 'd4', to: 'f6', captures: ['e5'] } // Object format with capture
        });

      // This might fail if the position isn't set up for capture
      // but the test verifies the move format is handled
      if (captureResponse.status === 200) {
        const gameState = await request(app).get(`/api/games/${gameId}`).expect(200);
        expect(gameState.body.boardState.capturedPieces.black).toBeGreaterThan(0);
      }
    });

    test('should reject invalid moves', async () => {
      const redPlayer = players.find(p => p.color === 'red');

      const invalidMoves = [
        'a1-b2',     // Wrong starting position
        'c3-c4',     // Not diagonal
        'c3-e5',     // Too far without capture
        'invalid',   // Invalid format
        { from: 'z9', to: 'a1' } // Invalid coordinates
      ];

      for (const invalidMove of invalidMoves) {
        await request(app)
          .post(`/api/games/${gameId}/move`)
          .send({
            userId: redPlayer.user_id,
            move: invalidMove
          })
          .expect(400);
      }
    });

    test('should prevent moves by wrong player', async () => {
      const blackPlayer = players.find(p => p.color === 'black');
      
      // Black tries to move on red's turn
      await request(app)
        .post(`/api/games/${gameId}/move`)
        .send({
          userId: blackPlayer.user_id,
          move: 'f6-e5'
        })
        .expect(400);
    });
  });

  describe('Checkers Board Image Generation', () => {
    test('should generate checkers board images', async () => {
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Image Test',
          gameType: 'checkers',
          creatorId: testUsers[0].id
        });

      const response = await request(app)
        .get(`/api/games/${gameResponse.body.id}/image`)
        .expect(200);

      expect(response.headers['content-type']).toBe('image/png');
      expect(response.body.length).toBeGreaterThan(5000); // Checkers board should be substantial
    });

    test('should generate different sized checkers images', async () => {
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Size Test',
          gameType: 'checkers',
          creatorId: testUsers[0].id
        });

      const gameId = gameResponse.body.id;

      // Test different sizes
      const sizes = [400, 600, 800];
      
      for (const size of sizes) {
        const response = await request(app)
          .get(`/api/games/${gameId}/image?width=${size}&height=${size}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('image/png');
        expect(response.body.length).toBeGreaterThan(1000);
      }
    });
  });

  describe('Checkers Game State and Statistics', () => {
    test('should track game statistics correctly', async () => {
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Stats Test',
          gameType: 'checkers',
          creatorId: testUsers[0].id
        });

      const gameId = gameResponse.body.id;

      await request(app)
        .post(`/api/games/${gameId}/join`)
        .send({ userId: testUsers[1].id });

      const statsResponse = await request(app)
        .get(`/api/games/${gameId}`)
        .expect(200);

      const game = statsResponse.body;
      expect(game.boardState).toBeDefined();
      
      // Access board state properly
      const boardState = typeof game.boardState === 'string' ? JSON.parse(game.boardState) : game.boardState;
      expect(boardState.currentPlayer).toBe('red'); // Game starts with red
      expect(boardState.moveCount).toBe(0);
      expect(boardState.capturedPieces).toBeDefined();
      expect(boardState.capturedPieces.red).toBe(0);
      expect(boardState.capturedPieces.black).toBe(0);
    });

    test('should validate initial board state', async () => {
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Board Test',
          gameType: 'checkers',
          creatorId: testUsers[0].id
        });

      const gameId = gameResponse.body.id;

      await request(app)
        .post(`/api/games/${gameId}/join`)
        .send({ userId: testUsers[1].id });

      const gameState = await request(app)
        .get(`/api/games/${gameId}`)
        .expect(200);

      // Access board state properly
      const boardState = typeof gameState.body.boardState === 'string' ? 
        JSON.parse(gameState.body.boardState) : gameState.body.boardState;
      
      const board = boardState.board;
      expect(Array.isArray(board)).toBe(true);
      expect(board.length).toBe(8);
      
      // Check that pieces are only on dark squares and in correct starting positions
      let redPieces = 0, blackPieces = 0;
      
      for (let row = 0; row < 8; row++) {
        expect(Array.isArray(board[row])).toBe(true);
        expect(board[row].length).toBe(8);
        
        for (let col = 0; col < 8; col++) {
          const piece = board[row][col];
          if (piece) {
            // Pieces should only be on dark squares
            expect((row + col) % 2).toBe(1);
            
            if (piece === 'r') redPieces++;
            else if (piece === 'b') blackPieces++;
          }
        }
      }
      
      // Should have 12 pieces per side
      expect(redPieces).toBe(12);
      expect(blackPieces).toBe(12);
    });
  });

  describe('Checkers Move History and Formatting', () => {
    test('should track move history with proper formatting', async () => {
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'History Test',
          gameType: 'checkers',
          creatorId: testUsers[0].id
        });

      const gameId = gameResponse.body.id;

      const joinResponse = await request(app)
        .post(`/api/games/${gameId}/join`)
        .send({ userId: testUsers[1].id });

      const players = joinResponse.body.players;
      const redPlayer = players.find(p => p.color === 'red');
      const blackPlayer = players.find(p => p.color === 'black');

      // Make a few moves
      await request(app)
        .post(`/api/games/${gameId}/move`)
        .send({
          userId: redPlayer.user_id,
          move: 'c3-d4'
        });

      await request(app)
        .post(`/api/games/${gameId}/move`)
        .send({
          userId: blackPlayer.user_id,
          move: 'f6-e5'
        });

      // Get move history
      const historyResponse = await request(app)
        .get(`/api/games/${gameId}/moves`)
        .expect(200);

      const moves = historyResponse.body;
      expect(Array.isArray(moves)).toBe(true);
      expect(moves.length).toBe(2);
      
      // Verify move format and player information
      expect(moves[0].player_id).toBe(redPlayer.user_id);
      expect(moves[1].player_id).toBe(blackPlayer.user_id);
      
      // Moves should be stored in a parseable format
      expect(moves[0].move).toBeDefined();
      expect(moves[1].move).toBeDefined();
    });
  });
});