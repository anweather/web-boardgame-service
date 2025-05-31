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
  app.use('/api/games', routers.games);
  app.use('/api/users', routers.users);
  app.use('/api/game-types', gameTypeRoutes);

  app.set('socketio', io);

  return { app, server, io };
}

describe('Correspondence Board Game - Blackbox Tests', () => {
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

  beforeEach(() => {
    // Clear dependency container to avoid test interference
    dependencies.clear();
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    // Small delay to let connections close
    await new Promise(resolve => setTimeout(resolve, 100));
    await closeDatabase();
  });

  test('Complete Chess Game Workflow with Image Generation', async () => {
    const timestamp = Date.now();
    
    // Step 1: Register two users
    const user1Response = await request(app)
      .post('/api/users/register')
      .send({
        username: `player1_${timestamp}`,
        email: `player1_${timestamp}@test.com`,
        password: 'password123'
      })
      .expect(201);

    const user2Response = await request(app)
      .post('/api/users/register')
      .send({
        username: `player2_${timestamp}`,
        email: `player2_${timestamp}@test.com`,
        password: 'password123'
      })
      .expect(201);

    const users = [user1Response.body.user, user2Response.body.user];
    console.log('✓ Created users:', users.map(u => u.username).join(', '));

    // Step 2: Create a chess game
    const gameResponse = await request(app)
      .post('/api/games')
      .send({
        name: 'Integration Test Chess Game',
        gameType: 'chess',
        creatorId: users[0].id
      })
      .expect(201);

    const game = gameResponse.body;
    console.log('✓ Created chess game:', game.name);

    // Step 3: Download initial board image
    const initialImageResponse = await request(app)
      .get(`/api/games/${game.id}/image`)
      .expect(200);

    expect(initialImageResponse.headers['content-type']).toBe('image/png');
    expect(initialImageResponse.body.length).toBeGreaterThan(5000);
    console.log('✓ Downloaded initial board image:', initialImageResponse.body.length, 'bytes');

    // Step 4: Second player joins
    await request(app)
      .post(`/api/games/${game.id}/join`)
      .send({
        userId: users[1].id
      })
      .expect(200);

    console.log('✓ Second player joined game');

    // Step 5: Verify game is active
    const activeGameResponse = await request(app)
      .get(`/api/games/${game.id}`)
      .expect(200);

    expect(activeGameResponse.body.status).toBe('active');
    expect(activeGameResponse.body.players).toHaveLength(2);
    console.log('✓ Game is now active with 2 players');

    // Step 6: Make first move (white pawn e2-e4)
    const move1Response = await request(app)
      .post(`/api/games/${game.id}/move`)
      .send({
        userId: users[0].id,
        move: 'e2-e4'
      })
      .expect(200);

    expect(move1Response.body.moveCount).toBe(1);
    console.log('✓ Made first move: e2-e4');

    // Step 7: Download board image after first move
    const move1ImageResponse = await request(app)
      .get(`/api/games/${game.id}/image`)
      .expect(200);

    expect(move1ImageResponse.headers['content-type']).toBe('image/png');
    expect(move1ImageResponse.body.length).toBeGreaterThan(5000);
    console.log('✓ Downloaded board image after move 1:', move1ImageResponse.body.length, 'bytes');

    // Step 8: Make second move (black pawn e7-e5)
    const move2Response = await request(app)
      .post(`/api/games/${game.id}/move`)
      .send({
        userId: users[1].id,
        move: 'e7-e5'
      })
      .expect(200);

    expect(move2Response.body.moveCount).toBe(2);
    console.log('✓ Made second move: e7-e5');

    // Step 9: Make third move (white knight)
    const move3Response = await request(app)
      .post(`/api/games/${game.id}/move`)
      .send({
        userId: users[0].id,
        move: 'Nf3'
      })
      .expect(200);

    expect(move3Response.body.moveCount).toBe(3);
    console.log('✓ Made third move: Nf3');

    // Step 10: Download final board image
    const finalImageResponse = await request(app)
      .get(`/api/games/${game.id}/image`)
      .expect(200);

    expect(finalImageResponse.headers['content-type']).toBe('image/png');
    expect(finalImageResponse.body.length).toBeGreaterThan(5000);
    console.log('✓ Downloaded final board image:', finalImageResponse.body.length, 'bytes');

    // Step 11: Get move history
    const movesResponse = await request(app)
      .get(`/api/games/${game.id}/moves`)
      .expect(200);

    expect(movesResponse.body).toHaveLength(3);
    console.log('✓ Verified move history with 3 moves');

    // Save test images if enabled
    if (process.env.SAVE_TEST_IMAGES) {
      const testImagesDir = path.join(__dirname, 'test-images');
      if (!fs.existsSync(testImagesDir)) {
        fs.mkdirSync(testImagesDir);
      }
      
      fs.writeFileSync(
        path.join(testImagesDir, 'chess-final-board.png'),
        finalImageResponse.body
      );
      console.log('✓ Saved test image to tests/test-images/chess-final-board.png');
    }

    console.log('\n🎉 Complete chess game workflow test passed!');
  }, 30000);

  test('Game Types and Multi-Game Support', async () => {
    // Test game types endpoint
    const gameTypesResponse = await request(app)
      .get('/api/game-types')
      .expect(200);

    expect(gameTypesResponse.body).toBeInstanceOf(Array);
    expect(gameTypesResponse.body.length).toBeGreaterThanOrEqual(1);
    
    const gameTypes = gameTypesResponse.body.map(gt => gt.type);
    expect(gameTypes).toContain('chess');
    
    console.log('✓ Verified game types:', gameTypes.join(', '));

    // Create a second chess game to test multi-game support
    const timestamp = Date.now();
    const userResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: `player_${timestamp}`,
        email: `player_${timestamp}@test.com`,
        password: 'password123'
      })
      .expect(201);

    const chessGame2Response = await request(app)
      .post('/api/games')
      .send({
        name: 'Test Chess Game #2',
        gameType: 'chess',
        creatorId: userResponse.body.user.id
      })
      .expect(201);

    // Download chess board image
    const chessImageResponse = await request(app)
      .get(`/api/games/${chessGame2Response.body.id}/image`)
      .expect(200);

    expect(chessImageResponse.headers['content-type']).toBe('image/png');
    expect(chessImageResponse.body.length).toBeGreaterThan(1000);
    console.log('✓ Created second chess game and downloaded image:', chessImageResponse.body.length, 'bytes');

    // Test listing multiple games
    const allGamesResponse = await request(app)
      .get('/api/games')
      .expect(200);

    expect(allGamesResponse.body.length).toBeGreaterThanOrEqual(2);
    console.log('✓ Verified multiple games in system:', allGamesResponse.body.length, 'games');

    console.log('\n🎉 Multi-game type test passed!');
  });

  test('Error Handling and Edge Cases', async () => {
    const timestamp = Date.now();
    const userResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: `error_test_${timestamp}`,
        email: `error_test_${timestamp}@test.com`,
        password: 'password123'
      })
      .expect(201);

    // Test invalid game type
    await request(app)
      .post('/api/games')
      .send({
        name: 'Invalid Game',
        gameType: 'nonexistent',
        creatorId: userResponse.body.user.id
      })
      .expect(500);

    console.log('✓ Invalid game type properly rejected');

    // Test non-existent game image
    await request(app)
      .get('/api/games/nonexistent-id/image')
      .expect(404);

    console.log('✓ Non-existent game image request handled');

    // Test duplicate user registration
    await request(app)
      .post('/api/users/register')
      .send({
        username: `error_test_${timestamp}`, // Same username
        email: `different_${timestamp}@test.com`,
        password: 'password123'
      })
      .expect(409);

    console.log('✓ Duplicate username registration rejected');

    console.log('\n🎉 Error handling test passed!');
  });
});