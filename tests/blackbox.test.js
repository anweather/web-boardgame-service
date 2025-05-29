const request = require('supertest');
const { createServer } = require('http');
const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

const gameRoutes = require('../src/routes/games');
const userRoutes = require('../src/routes/users');
const gameTypeRoutes = require('../src/routes/gameTypes');
const { initializeDatabase, closeDatabase } = require('../src/database/init');

// Create test app
function createTestApp() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server);

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use('/api/games', gameRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/game-types', gameTypeRoutes);

  app.set('socketio', io);

  return { app, server, io };
}

describe('Blackbox Integration Tests', () => {
  let app, server, io;
  let testUsers = [];
  let testGame;

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
    await closeDatabase();
    if (server) {
      server.close();
    }
  });

  describe('Full Game Flow - Chess', () => {
    test('should complete a full chess game workflow', async () => {
      // Step 1: Register two users with unique names
      const timestamp = Date.now();
      const user1Response = await request(app)
        .post('/api/users/register')
        .send({
          username: `testplayer1_${timestamp}`,
          email: `player1_${timestamp}@test.com`,
          password: 'password123'
        })
        .expect(201);

      const user2Response = await request(app)
        .post('/api/users/register')
        .send({
          username: `testplayer2_${timestamp}`,
          email: `player2_${timestamp}@test.com`,
          password: 'password123'
        })
        .expect(201);

      testUsers = [user1Response.body.user, user2Response.body.user];
      console.log('✓ Created test users:', testUsers.map(u => u.username).join(', '));

      // Step 2: Create a chess game
      const gameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Test Chess Game',
          gameType: 'chess',
          creatorId: testUsers[0].id
        })
        .expect(201);

      testGame = gameResponse.body;
      console.log('✓ Created chess game:', testGame.name);

      // Step 3: Get game state (should show waiting status)
      const initialStateResponse = await request(app)
        .get(`/api/games/${testGame.id}`)
        .expect(200);

      expect(initialStateResponse.body.status).toBe('waiting');
      expect(initialStateResponse.body.players).toHaveLength(1);
      console.log('✓ Initial game state verified');

      // Step 4: Second player joins
      await request(app)
        .post(`/api/games/${testGame.id}/join`)
        .send({
          userId: testUsers[1].id
        })
        .expect(200);

      // Step 5: Verify game is now active
      const activeStateResponse = await request(app)
        .get(`/api/games/${testGame.id}`)
        .expect(200);

      expect(activeStateResponse.body.status).toBe('active');
      expect(activeStateResponse.body.players).toHaveLength(2);
      expect(activeStateResponse.body.currentPlayerId).toBe(testUsers[0].id);
      console.log('✓ Game started with both players');

      // Step 6: Download initial board image
      const initialImageResponse = await request(app)
        .get(`/api/games/${testGame.id}/image`)
        .expect(200);

      expect(initialImageResponse.headers['content-type']).toBe('image/png');
      expect(initialImageResponse.body.length).toBeGreaterThan(1000); // Should be a substantial PNG
      console.log('✓ Downloaded initial board image:', initialImageResponse.body.length, 'bytes');

      // Step 7: Make first move (white pawn e2-e4)
      const move1Response = await request(app)
        .post(`/api/games/${testGame.id}/move`)
        .send({
          userId: testUsers[0].id,
          move: 'e2-e4'
        })
        .expect(200);

      expect(move1Response.body.nextPlayerId).toBe(testUsers[1].id);
      expect(move1Response.body.moveCount).toBe(1);
      console.log('✓ Made first move: e2-e4');

      // Step 8: Download board image after first move
      const move1ImageResponse = await request(app)
        .get(`/api/games/${testGame.id}/image`)
        .expect(200);

      expect(move1ImageResponse.headers['content-type']).toBe('image/png');
      expect(move1ImageResponse.body.length).toBeGreaterThan(1000);
      console.log('✓ Downloaded board image after move 1:', move1ImageResponse.body.length, 'bytes');

      // Step 9: Make second move (black pawn e7-e5)
      const move2Response = await request(app)
        .post(`/api/games/${testGame.id}/move`)
        .send({
          userId: testUsers[1].id,
          move: 'e7-e5'
        })
        .expect(200);

      expect(move2Response.body.nextPlayerId).toBe(testUsers[0].id);
      expect(move2Response.body.moveCount).toBe(2);
      console.log('✓ Made second move: e7-e5');

      // Step 10: Make third move (white knight Ng1-f3)
      const move3Response = await request(app)
        .post(`/api/games/${testGame.id}/move`)
        .send({
          userId: testUsers[0].id,
          move: 'Nf3'
        })
        .expect(200);

      expect(move3Response.body.moveCount).toBe(3);
      console.log('✓ Made third move: Nf3');

      // Step 11: Download final board image
      const finalImageResponse = await request(app)
        .get(`/api/games/${testGame.id}/image`)
        .expect(200);

      expect(finalImageResponse.headers['content-type']).toBe('image/png');
      expect(finalImageResponse.body.length).toBeGreaterThan(1000);
      console.log('✓ Downloaded final board image:', finalImageResponse.body.length, 'bytes');

      // Step 12: Get move history
      const movesResponse = await request(app)
        .get(`/api/games/${testGame.id}/moves`)
        .expect(200);

      expect(movesResponse.body).toHaveLength(3);
      expect(movesResponse.body[0].move).toBe('"e2-e4"'); // JSON stringified
      expect(movesResponse.body[1].move).toBe('"e7-e5"');
      expect(movesResponse.body[2].move).toBe('"Nf3"');
      console.log('✓ Verified move history');

      // Step 13: Verify user's games
      const user1GamesResponse = await request(app)
        .get(`/api/users/${testUsers[0].id}/games`)
        .expect(200);

      expect(user1GamesResponse.body).toHaveLength(1);
      expect(user1GamesResponse.body[0].id).toBe(testGame.id);
      console.log('✓ Verified user game list');

      // Step 14: Test invalid move
      await request(app)
        .post(`/api/games/${testGame.id}/move`)
        .send({
          userId: testUsers[1].id, // Wrong player (not their turn)
          move: 'Nc6'
        })
        .expect(400);

      console.log('✓ Invalid move properly rejected');

      console.log('\n🎉 Full chess game workflow completed successfully!');
    }, 30000);
  });

  describe('Game Types and Multi-Player Games', () => {
    test('should list available game types', async () => {
      const gameTypesResponse = await request(app)
        .get('/api/game-types')
        .expect(200);

      expect(gameTypesResponse.body).toBeInstanceOf(Array);
      expect(gameTypesResponse.body.length).toBeGreaterThan(0);
      
      const chessType = gameTypesResponse.body.find(gt => gt.type === 'chess');
      expect(chessType).toBeDefined();
      expect(chessType.minPlayers).toBe(2);
      expect(chessType.maxPlayers).toBe(2);

      const heartsType = gameTypesResponse.body.find(gt => gt.type === 'hearts');
      expect(heartsType).toBeDefined();
      expect(heartsType.minPlayers).toBe(4);
      expect(heartsType.maxPlayers).toBe(4);

      console.log('✓ Game types verified:', gameTypesResponse.body.map(gt => gt.type).join(', '));
    });

    test('should create and test a checkers game with images', async () => {
      // Create unique users for this test
      const timestamp = Date.now();
      const user1Response = await request(app)
        .post('/api/users/register')
        .send({
          username: `checkers1_${timestamp}`,
          email: `checkers1_${timestamp}@test.com`,
          password: 'password123'
        })
        .expect(201);

      const user2Response = await request(app)
        .post('/api/users/register')
        .send({
          username: `checkers2_${timestamp}`,
          email: `checkers2_${timestamp}@test.com`,
          password: 'password123'
        })
        .expect(201);

      const checkersUsers = [user1Response.body.user, user2Response.body.user];

      // Create a checkers game
      const checkersGameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Test Checkers Game',
          gameType: 'checkers',
          creatorId: checkersUsers[0].id
        })
        .expect(201);

      const checkersGame = checkersGameResponse.body;
      console.log('✓ Created checkers game');

      // Second player joins
      await request(app)
        .post(`/api/games/${checkersGame.id}/join`)
        .send({
          userId: checkersUsers[1].id
        })
        .expect(200);

      // Download checkers board image
      const checkersImageResponse = await request(app)
        .get(`/api/games/${checkersGame.id}/image`)
        .expect(200);

      expect(checkersImageResponse.headers['content-type']).toBe('image/png');
      expect(checkersImageResponse.body.length).toBeGreaterThan(1000);
      console.log('✓ Downloaded checkers board image:', checkersImageResponse.body.length, 'bytes');

      // Make a checkers move
      const checkersMove = await request(app)
        .post(`/api/games/${checkersGame.id}/move`)
        .send({
          userId: checkersUsers[0].id,
          move: 'c3-d4'
        })
        .expect(200);

      console.log('✓ Made checkers move');

      // Download image after checkers move
      const checkersMove1ImageResponse = await request(app)
        .get(`/api/games/${checkersGame.id}/image`)
        .expect(200);

      expect(checkersMove1ImageResponse.headers['content-type']).toBe('image/png');
      console.log('✓ Downloaded checkers image after move');
    });

    test('should handle Hearts game creation (4 players required)', async () => {
      // Try to create Hearts game
      const heartsGameResponse = await request(app)
        .post('/api/games')
        .send({
          name: 'Test Hearts Game',
          gameType: 'hearts',
          creatorId: testUsers[0].id
        })
        .expect(201);

      const heartsGame = heartsGameResponse.body;
      expect(heartsGame.gameType).toBe('hearts');
      console.log('✓ Created Hearts game (waiting for 4 players)');

      // Download hearts game image (should show cards/table)
      const heartsImageResponse = await request(app)
        .get(`/api/games/${heartsGame.id}/image`)
        .expect(200);

      expect(heartsImageResponse.headers['content-type']).toBe('image/png');
      expect(heartsImageResponse.body.length).toBeGreaterThan(1000);
      console.log('✓ Downloaded Hearts game image:', heartsImageResponse.body.length, 'bytes');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid game types', async () => {
      await request(app)
        .post('/api/games')
        .send({
          name: 'Invalid Game',
          gameType: 'nonexistent',
          creatorId: testUsers[0].id
        })
        .expect(500);

      console.log('✓ Invalid game type properly rejected');
    });

    test('should handle game not found for image', async () => {
      await request(app)
        .get('/api/games/nonexistent-id/image')
        .expect(404);

      console.log('✓ Non-existent game image request properly handled');
    });

    test('should validate move format', async () => {
      // Use the existing chess game
      await request(app)
        .post(`/api/games/${testGame.id}/move`)
        .send({
          userId: testUsers[1].id,
          move: '' // Empty move
        })
        .expect(400);

      console.log('✓ Empty move properly rejected');
    });
  });
});

describe('Image Generation Tests', () => {
  test('should save test images to disk for visual verification', async () => {
    const { app } = createTestApp();
    await initializeDatabase();

    // Create a test user and game
    const userResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: 'imagetest',
        email: 'imagetest@test.com',
        password: 'password123'
      });

    const gameResponse = await request(app)
      .post('/api/games')
      .send({
        name: 'Image Test Game',
        gameType: 'chess',
        creatorId: userResponse.body.user.id
      });

    // Download and save initial chess board image
    const imageResponse = await request(app)
      .get(`/api/games/${gameResponse.body.id}/image`)
      .expect(200);

    // Save image for manual verification (optional - only in development)
    if (process.env.SAVE_TEST_IMAGES) {
      const testImagesDir = path.join(__dirname, 'test-images');
      if (!fs.existsSync(testImagesDir)) {
        fs.mkdirSync(testImagesDir);
      }
      
      fs.writeFileSync(
        path.join(testImagesDir, 'chess-initial-board.png'),
        imageResponse.body
      );
      console.log('✓ Saved test image to tests/test-images/chess-initial-board.png');
    }

    expect(imageResponse.headers['content-type']).toBe('image/png');
    expect(imageResponse.body.length).toBeGreaterThan(5000); // Should be a decent-sized PNG
    console.log('✓ Chess board image generation verified');
  });
});