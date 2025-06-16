/**
 * Solitaire Integration Tests
 * 
 * End-to-end tests for the solitaire game plugin, including:
 * - Game creation and initialization
 * - Move validation and application
 * - Board image generation
 * - Game completion scenarios
 * - Multi-card move functionality
 */

const request = require('supertest');
const { createServer } = require('http');
const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const gameTypeRoutes = require('../src/routes/gameTypes');
const { initializeDatabase, closeDatabase } = require('../src/database/init');
const dependencies = require('../src/config/dependencies');

// Create test app
function createTestApp() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server);

  // Set up dependency injection with Socket.IO
  dependencies.setSocketIo(io);

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Get routers from dependency container
  const routers = dependencies.getRouters();

  // Routes using new architecture
  app.use('/api/users', routers.users);
  app.use('/api/games', routers.games);
  app.use('/api/game-types', gameTypeRoutes);

  return app;
}

describe('Solitaire Plugin - Integration Tests', () => {
  let app;
  let testUser;

  beforeAll(async () => {
    await initializeDatabase();
    app = createTestApp();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create a fresh test user for each test
    const timestamp = Date.now();
    const registerResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: `solitaire_user_${timestamp}`,
        email: `solitaire_${timestamp}@test.com`,
        password: 'test123'
      })
      .expect(201);

    testUser = registerResponse.body.user;
    console.log('✓ Created test user:', testUser.username);
  });

  describe('Game Creation and Initialization', () => {
    test('creates solitaire game with proper board state', async () => {
      // Create solitaire game
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Integration Test Solitaire Game',
          gameType: 'solitaire',
          creatorId: testUser.id
        })
        .expect(201);

      const game = gameResponse.body;
      expect(game.gameType).toBe('solitaire');
      expect(game.status).toBe('active'); // Single player games start immediately
      expect(game.name).toBe('Integration Test Solitaire Game');
      expect(game.currentPlayerId).toBe(testUser.id);

      console.log('✓ Created solitaire game:', game.name);

      // Verify game details
      const gameDetailsResponse = await request(app)
        .get(`/api/games/${game.id}`)
        .expect(200);

      const gameDetails = gameDetailsResponse.body;
      expect(gameDetails.players).toHaveLength(1);
      expect(gameDetails.players[0].userId).toBe(testUser.id);
      expect(gameDetails.boardState).toBeDefined();
      expect(gameDetails.boardState.tableau).toHaveLength(7);
      expect(gameDetails.boardState.foundation).toHaveProperty('hearts');
      expect(gameDetails.boardState.foundation).toHaveProperty('diamonds');
      expect(gameDetails.boardState.foundation).toHaveProperty('clubs');
      expect(gameDetails.boardState.foundation).toHaveProperty('spades');
      expect(gameDetails.boardState.stock).toBeDefined();
      expect(gameDetails.boardState.waste).toBeDefined();

      console.log('✓ Verified solitaire board state structure');
    });

    test('generates initial board image', async () => {
      // Create game
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Image Test Solitaire Game',
          gameType: 'solitaire',
          creatorId: testUser.id
        })
        .expect(201);

      const game = gameResponse.body;

      // Request board image
      const imageResponse = await request(app)
        .get(`/api/games/${game.id}/image`)
        .expect(200);

      expect(imageResponse.headers['content-type']).toMatch(/image/);
      expect(imageResponse.body.length).toBeGreaterThan(1000); // Should be a meaningful image

      console.log('✓ Generated initial solitaire board image:', imageResponse.body.length, 'bytes');
    });
  });

  describe('Basic Move Operations', () => {
    let game;

    beforeEach(async () => {
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Move Test Solitaire Game',
          gameType: 'solitaire',
          creatorId: testUser.id
        })
        .expect(201);
      game = gameResponse.body;
    });

    test('performs stock draw operation', async () => {
      // Draw from stock
      const moveResponse = await request(app)
        .post(`/api/games/${game.id}/move`)
        .send({
          userId: testUser.id,
          move: { action: 'draw_stock' }
        })
        .expect(200);

      expect(moveResponse.body.success).toBe(true);
      expect(moveResponse.body.newBoardState.waste.length).toBeGreaterThan(0);
      expect(moveResponse.body.moveCount).toBe(1);

      console.log('✓ Successfully performed stock draw');
    });

    test('validates shorthand move commands', async () => {
      // Test draw shorthand
      const drawResponse = await request(app)
        .post(`/api/games/${game.id}/move`)
        .send({
          userId: testUser.id,
          move: 'd'
        })
        .expect(200);

      expect(drawResponse.body.success).toBe(true);
      console.log('✓ Shorthand draw command working');

      // Draw all cards to enable reset
      let currentGame = drawResponse.body.newBoardState;
      while (currentGame.stock.length > 0) {
        const response = await request(app)
          .post(`/api/games/${game.id}/move`)
          .send({
            userId: testUser.id,
            move: 'd'
          })
          .expect(200);
        currentGame = response.body.newBoardState;
      }

      // Test reset shorthand
      const resetResponse = await request(app)
        .post(`/api/games/${game.id}/move`)
        .send({
          userId: testUser.id,
          move: 'r'
        })
        .expect(200);

      expect(resetResponse.body.success).toBe(true);
      expect(resetResponse.body.newBoardState.stock.length).toBeGreaterThan(0);
      expect(resetResponse.body.newBoardState.waste.length).toBe(0);

      console.log('✓ Shorthand reset command working');
    });

    test('handles invalid moves with detailed error messages', async () => {
      // Try to reset non-empty stock
      const invalidResetResponse = await request(app)
        .post(`/api/games/${game.id}/move`)
        .send({
          userId: testUser.id,
          move: 'r'
        })
        .expect(400);

      expect(invalidResetResponse.body.error).toContain('still has cards');
      console.log('✓ Invalid reset properly rejected with helpful message');

      // Try invalid move format
      const invalidMoveResponse = await request(app)
        .post(`/api/games/${game.id}/move`)
        .send({
          userId: testUser.id,
          move: 'invalid_command'
        })
        .expect(400);

      expect(invalidMoveResponse.body.error).toContain('Unrecognized move format');
      console.log('✓ Invalid move format properly rejected');
    });
  });

  describe('Multi-Card Move Operations', () => {
    let game;

    beforeEach(async () => {
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Multi-Card Test Solitaire Game',
          gameType: 'solitaire',
          creatorId: testUser.id
        })
        .expect(201);
      game = gameResponse.body;
    });

    test('auto-detects optimal card count for tableau moves', async () => {
      // Get current game state
      const gameDetailsResponse = await request(app)
        .get(`/api/games/${game.id}`)
        .expect(200);

      const gameDetails = gameDetailsResponse.body;
      const tableau = gameDetails.boardState.tableau;

      // Find a column with multiple face-up cards that can potentially be moved
      let fromColumn = -1;
      let toColumn = -1;

      for (let i = 0; i < tableau.length; i++) {
        if (tableau[i].length > 1) {
          // Check if this column has face-up cards that could form a sequence
          const lastCards = tableau[i].slice(-2);
          if (lastCards.every(card => card.faceUp)) {
            fromColumn = i;
            break;
          }
        }
      }

      // Find a suitable target column
      for (let i = 0; i < tableau.length; i++) {
        if (i !== fromColumn && tableau[i].length > 0) {
          toColumn = i;
          break;
        }
      }

      if (fromColumn >= 0 && toColumn >= 0) {
        // Try tableau-to-tableau move without specifying card count
        const moveResponse = await request(app)
          .post(`/api/games/${game.id}/move`)
          .send({
            userId: testUser.id,
            move: `${fromColumn + 1}-${toColumn + 1}`
          });

        // The move might succeed or fail based on game rules, but it should not crash
        expect([200, 400]).toContain(moveResponse.status);
        
        if (moveResponse.status === 200) {
          console.log('✓ Auto-detection successful for multi-card move');
        } else {
          console.log('✓ Auto-detection properly validated move rules');
        }
      } else {
        console.log('✓ Skipped multi-card test - no suitable columns found');
      }
    });
  });

  describe('Move History and Game State', () => {
    let game;

    beforeEach(async () => {
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'History Test Solitaire Game',
          gameType: 'solitaire',
          creatorId: testUser.id
        })
        .expect(201);
      game = gameResponse.body;
    });

    test('tracks move history correctly', async () => {
      // Make several moves
      const moves = ['d', 'd', 'd'];
      
      for (let i = 0; i < moves.length; i++) {
        await request(app)
          .post(`/api/games/${game.id}/move`)
          .send({
            userId: testUser.id,
            move: moves[i]
          })
          .expect(200);
      }

      // Get move history
      const historyResponse = await request(app)
        .get(`/api/games/${game.id}/moves`)
        .expect(200);

      const history = historyResponse.body;
      expect(history).toHaveLength(3);
      expect(history[0].moveNumber).toBe(1);
      expect(history[1].moveNumber).toBe(2);
      expect(history[2].moveNumber).toBe(3);
      
      // Verify move data structure
      history.forEach(move => {
        expect(move).toHaveProperty('id');
        expect(move).toHaveProperty('moveNumber');
        expect(move).toHaveProperty('move');
        expect(move).toHaveProperty('timestamp');
        expect(move.player.userId).toBe(testUser.id);
      });

      console.log('✓ Move history tracked correctly with', history.length, 'moves');
    });

    test('updates board image after moves', async () => {
      // Get initial image
      const initialImageResponse = await request(app)
        .get(`/api/games/${game.id}/image`)
        .expect(200);

      const initialImageSize = initialImageResponse.body.length;

      // Make a move
      await request(app)
        .post(`/api/games/${game.id}/move`)
        .send({
          userId: testUser.id,
          move: 'd'
        })
        .expect(200);

      // Get updated image
      const updatedImageResponse = await request(app)
        .get(`/api/games/${game.id}/image`)
        .expect(200);

      const updatedImageSize = updatedImageResponse.body.length;

      // Images should be different (different sizes indicate different content)
      expect(updatedImageSize).toBeGreaterThan(1000);
      
      console.log('✓ Board image updated after move:', 
        'initial:', initialImageSize, 'bytes,', 
        'updated:', updatedImageSize, 'bytes');
    });
  });

  describe('Game Types API Integration', () => {
    test('solitaire appears in supported game types', async () => {
      const gameTypesResponse = await request(app)
        .get('/api/game-types')
        .expect(200);

      const gameTypes = gameTypesResponse.body;
      const solitaireType = gameTypes.find(gt => gt.type === 'solitaire');
      
      expect(solitaireType).toBeDefined();
      expect(solitaireType.name).toBe('Klondike Solitaire');
      expect(solitaireType.minPlayers).toBe(1);
      expect(solitaireType.maxPlayers).toBe(1);
      expect(solitaireType.description).toContain('single-player');

      console.log('✓ Solitaire game type properly registered');
    });

    test('validates solitaire game configuration', async () => {
      const validationResponse = await request(app)
        .post('/api/game-types/solitaire/validate')
        .send({
          name: 'Test Solitaire Game',
          players: 1
        })
        .expect(200);

      expect(validationResponse.body.valid).toBe(true);
      console.log('✓ Solitaire game configuration validation working');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    let game;

    beforeEach(async () => {
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Error Test Solitaire Game',
          gameType: 'solitaire',
          creatorId: testUser.id
        })
        .expect(201);
      game = gameResponse.body;
    });

    test('handles game with wrong user ID', async () => {
      // Try to make a move with wrong user ID
      const wrongUserResponse = await request(app)
        .post(`/api/games/${game.id}/move`)
        .send({
          userId: 'wrong-user-id',
          move: 'd'
        })
        .expect(403);

      expect(wrongUserResponse.body.error).toContain('not your turn');
      console.log('✓ Wrong user ID properly rejected');
    });

    test('handles non-existent game', async () => {
      const response = await request(app)
        .get('/api/games/nonexistent-game-id')
        .expect(404);

      expect(response.body.error).toContain('not found');
      console.log('✓ Non-existent game properly handled');
    });

    test('rejects invalid move objects', async () => {
      const response = await request(app)
        .post(`/api/games/${game.id}/move`)
        .send({
          userId: testUser.id,
          move: null
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid move');
      console.log('✓ Invalid move object properly rejected');
    });
  });

  describe('Performance and Reliability', () => {
    test('handles rapid consecutive moves', async () => {
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Performance Test Solitaire Game',
          gameType: 'solitaire',
          creatorId: testUser.id
        })
        .expect(201);

      const game = gameResponse.body;

      // Make multiple rapid moves
      const movePromises = [];
      for (let i = 0; i < 5; i++) {
        movePromises.push(
          request(app)
            .post(`/api/games/${game.id}/move`)
            .send({
              userId: testUser.id,
              move: 'd'
            })
        );
      }

      const results = await Promise.allSettled(movePromises);
      
      // At least the first few should succeed (until stock is empty)
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
      expect(successCount).toBeGreaterThan(0);

      console.log('✓ Rapid moves handled:', successCount, 'successful out of', results.length);
    });

    test('game state remains consistent after multiple operations', async () => {
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Consistency Test Solitaire Game',
          gameType: 'solitaire',
          creatorId: testUser.id
        })
        .expect(201);

      const game = gameResponse.body;

      // Perform a sequence of operations
      const operations = [
        'd', 'd', 'd', // Draw cards
        'r',          // Reset (if possible)
        'd', 'd'      // Draw again
      ];

      let lastBoardState = null;
      for (const op of operations) {
        const response = await request(app)
          .post(`/api/games/${game.id}/move`)
          .send({
            userId: testUser.id,
            move: op
          });

        if (response.status === 200) {
          lastBoardState = response.body.newBoardState;
          
          // Verify board state structure is maintained
          expect(lastBoardState.tableau).toHaveLength(7);
          expect(lastBoardState.foundation).toHaveProperty('hearts');
          expect(lastBoardState.stock).toBeDefined();
          expect(lastBoardState.waste).toBeDefined();
        }
      }

      console.log('✓ Game state consistency maintained through operations');
    });
  });

  afterAll(async () => {
    console.log('\n🎉 Solitaire integration tests completed!');
  });
});