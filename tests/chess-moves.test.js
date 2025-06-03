const request = require('supertest');
const { createServer } = require('http');
const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { initializeDatabase, closeDatabase } = require('../src/database/init');
const dependencies = require('../src/config/dependencies');

// Create test app
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
        "font-src": ["'self'", "ws:", "wss:"],
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

  return { app, server, io };
}

describe('Chess Move Validation Tests', () => {
  let app, server, io;

  beforeAll(async () => {
    await initializeDatabase();
    const testApp = createTestApp();
    app = testApp.app;
    server = testApp.server;
    io = testApp.io;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    await closeDatabase();
  });

  test('Chess pieces should move to correct squares', async () => {
    const timestamp = Date.now();
    
    // Create users
    const user1Response = await request(app)
      .post('/api/users/register')
      .send({
        username: `chess_test1_${timestamp}`,
        email: `chess_test1_${timestamp}@test.com`,
        password: 'password123'
      })
      .expect(201);

    const user2Response = await request(app)
      .post('/api/users/register')
      .send({
        username: `chess_test2_${timestamp}`,
        email: `chess_test2_${timestamp}@test.com`,
        password: 'password123'
      })
      .expect(201);

    const users = [user1Response.body.user, user2Response.body.user];

    // Create chess game
    const gameResponse = await request(app)
      .post('/api/games')
      .send({
        name: 'Chess Move Test',
        gameType: 'chess',
        creatorId: users[0].id
      })
      .expect(201);

    const game = gameResponse.body;

    // Join second player
    await request(app)
      .post(`/api/games/${game.id}/join`)
      .send({ userId: users[1].id })
      .expect(200);

    // Get initial board state
    const initialState = await request(app)
      .get(`/api/games/${game.id}`)
      .expect(200);

    const initialBoard = initialState.body.boardState.board;

    // Verify initial positions
    expect(initialBoard[6][4]).toBe('P'); // White pawn at e2
    expect(initialBoard[1][4]).toBe('p'); // Black pawn at e7
    expect(initialBoard[7][6]).toBe('N'); // White knight at g1
    expect(initialBoard[4][4]).toBe(null); // e4 empty
    expect(initialBoard[3][4]).toBe(null); // e5 empty
    expect(initialBoard[5][5]).toBe(null); // f3 empty

    console.log('✓ Initial board state verified');

    // Move 1: e2-e4
    await request(app)
      .post(`/api/games/${game.id}/move`)
      .send({
        userId: users[0].id,
        move: 'e2-e4'
      })
      .expect(200);

    // Check board state after move 1
    const state1 = await request(app)
      .get(`/api/games/${game.id}`)
      .expect(200);

    const board1 = state1.body.boardState.board;
    expect(board1[6][4]).toBe(null); // e2 now empty
    expect(board1[4][4]).toBe('P');  // e4 now has white pawn

    console.log('✓ Move 1 (e2-e4) verified: pawn moved from e2 to e4');

    // Move 2: e7-e5
    await request(app)
      .post(`/api/games/${game.id}/move`)
      .send({
        userId: users[1].id,
        move: 'e7-e5'
      })
      .expect(200);

    // Check board state after move 2
    const state2 = await request(app)
      .get(`/api/games/${game.id}`)
      .expect(200);

    const board2 = state2.body.boardState.board;
    expect(board2[1][4]).toBe(null); // e7 now empty
    expect(board2[3][4]).toBe('p');  // e5 now has black pawn
    expect(board2[4][4]).toBe('P');  // e4 still has white pawn

    console.log('✓ Move 2 (e7-e5) verified: pawn moved from e7 to e5');

    // Move 3: Nf3
    await request(app)
      .post(`/api/games/${game.id}/move`)
      .send({
        userId: users[0].id,
        move: 'Nf3'
      })
      .expect(200);

    // Check board state after move 3
    const state3 = await request(app)
      .get(`/api/games/${game.id}`)
      .expect(200);

    const board3 = state3.body.boardState.board;
    expect(board3[7][6]).toBe(null); // g1 now empty
    expect(board3[5][5]).toBe('N');  // f3 now has white knight
    expect(board3[7][1]).toBe('N');  // b1 still has white knight (shouldn't move)

    console.log('✓ Move 3 (Nf3) verified: knight moved from g1 to f3, b1 knight unchanged');

    // Verify all pieces are in correct final positions
    expect(board3[4][4]).toBe('P');  // e4 has white pawn
    expect(board3[3][4]).toBe('p');  // e5 has black pawn  
    expect(board3[5][5]).toBe('N');  // f3 has white knight
    expect(board3[6][4]).toBe(null); // e2 empty
    expect(board3[1][4]).toBe(null); // e7 empty
    expect(board3[7][6]).toBe(null); // g1 empty

    console.log('✓ All final positions verified correctly');
  });

  test('Invalid knight moves should be rejected', async () => {
    const timestamp = Date.now();
    
    // Create users and game
    const user1Response = await request(app)
      .post('/api/users/register')
      .send({
        username: `invalid_test1_${timestamp}`,
        email: `invalid_test1_${timestamp}@test.com`,
        password: 'password123'
      })
      .expect(201);

    const user2Response = await request(app)
      .post('/api/users/register')
      .send({
        username: `invalid_test2_${timestamp}`,
        email: `invalid_test2_${timestamp}@test.com`,
        password: 'password123'
      })
      .expect(201);

    const users = [user1Response.body.user, user2Response.body.user];

    const gameResponse = await request(app)
      .post('/api/games')
      .send({
        name: 'Invalid Move Test',
        gameType: 'chess',
        creatorId: users[0].id
      })
      .expect(201);

    const game = gameResponse.body;

    await request(app)
      .post(`/api/games/${game.id}/join`)
      .send({ userId: users[1].id })
      .expect(200);

    // Try invalid knight move (knight can't move to e4 from starting position)
    await request(app)
      .post(`/api/games/${game.id}/move`)
      .send({
        userId: users[0].id,
        move: 'Ne4'
      })
      .expect(500); // Should fail because no knight can reach e4

    console.log('✓ Invalid knight move (Ne4) properly rejected');

    // Try valid knight move
    await request(app)
      .post(`/api/games/${game.id}/move`)
      .send({
        userId: users[0].id,
        move: 'Nf3'
      })
      .expect(200);

    console.log('✓ Valid knight move (Nf3) accepted');
  });

  test('Piece movement should respect turn order', async () => {
    const timestamp = Date.now();
    
    // Create users and game
    const user1Response = await request(app)
      .post('/api/users/register')
      .send({
        username: `turn_test1_${timestamp}`,
        email: `turn_test1_${timestamp}@test.com`,
        password: 'password123'
      })
      .expect(201);

    const user2Response = await request(app)
      .post('/api/users/register')
      .send({
        username: `turn_test2_${timestamp}`,
        email: `turn_test2_${timestamp}@test.com`,
        password: 'password123'
      })
      .expect(201);

    const users = [user1Response.body.user, user2Response.body.user];

    const gameResponse = await request(app)
      .post('/api/games')
      .send({
        name: 'Turn Order Test',
        gameType: 'chess',
        creatorId: users[0].id
      })
      .expect(201);

    const game = gameResponse.body;

    await request(app)
      .post(`/api/games/${game.id}/join`)
      .send({ userId: users[1].id })
      .expect(200);

    // White moves first
    await request(app)
      .post(`/api/games/${game.id}/move`)
      .send({
        userId: users[0].id,
        move: 'e2-e4'
      })
      .expect(200);

    // Black should move a black piece (not white)
    await request(app)
      .post(`/api/games/${game.id}/move`)
      .send({
        userId: users[1].id,
        move: 'e7-e5'
      })
      .expect(200);

    // Verify the moves affected the correct colored pieces
    const finalState = await request(app)
      .get(`/api/games/${game.id}`)
      .expect(200);

    const finalBoard = finalState.body.boardState.board;
    expect(finalBoard[4][4]).toBe('P'); // White pawn at e4
    expect(finalBoard[3][4]).toBe('p'); // Black pawn at e5

    console.log('✓ Turn order and piece colors respected');
  });
});