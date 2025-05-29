const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Game = require('../models/Game');
const User = require('../models/User');
const { generateBoardImage, generateCheckersBoard, generateCardsImage } = require('../services/svgBoardRenderer');
const { createNotification } = require('../services/notifications');

const router = express.Router();

// Create a new game
router.post('/', async (req, res) => {
  try {
    const { name, gameType = 'chess', creatorId } = req.body;

    if (!name || !creatorId) {
      return res.status(400).json({ error: 'Name and creatorId are required' });
    }

    const creator = await User.findById(creatorId);
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const game = await Game.create({
      name,
      game_type: gameType,
      status: 'waiting'
    });

    // Add creator as first player
    await game.addPlayer(creatorId, 1, 'white');

    res.status(201).json({
      id: game.id,
      name: game.name,
      gameType: game.gameType,
      status: game.status,
      moveCount: game.moveCount,
      createdAt: game.createdAt
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get all games
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filters = status ? { status } : {};
    
    const games = await Game.findAll(filters);
    
    res.json(games.map(game => ({
      id: game.id,
      name: game.name,
      gameType: game.gameType,
      status: game.status,
      moveCount: game.moveCount,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt
    })));
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Get specific game state
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const players = await game.getPlayers();
    
    res.json({
      id: game.id,
      name: game.name,
      gameType: game.gameType,
      status: game.status,
      currentPlayerId: game.currentPlayerId,
      boardState: JSON.parse(game.boardState),
      moveCount: game.moveCount,
      players: players.map(p => ({
        id: p.id,
        userId: p.user_id,
        username: p.username,
        playerOrder: p.player_order,
        color: p.color
      })),
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      settings: game.settings
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// Join a game
router.post('/:id/join', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'UserId is required' });
    }

    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ error: 'Game is not accepting new players' });
    }

    const players = await game.getPlayers();
    if (players.length >= game.maxPlayers) {
      return res.status(400).json({ error: 'Game is full' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already in the game
    if (players.some(p => p.user_id === userId)) {
      return res.status(400).json({ error: 'User already in this game' });
    }

    // Add player
    const playerOrder = players.length + 1;
    const newPlayer = await game.addPlayer(userId, playerOrder);

    // Check if game can start
    const canStart = await game.canStartGame();
    if (canStart) {
      // Game has enough players, start it
      const firstPlayerId = players[0].user_id; // First player goes first
      
      await game.update({
        status: 'active',
        current_player_id: firstPlayerId
      });

      // Notify players that game has started
      const io = req.app.get('socketio');
      io.to(game.id).emit('game-started', {
        gameId: game.id,
        currentPlayerId: firstPlayerId
      });

      await createNotification(firstPlayerId, game.id, 'turn', 'It\'s your turn!');
    }

    res.json({ 
      message: 'Successfully joined game', 
      playerOrder: newPlayer.player_order, 
      color: newPlayer.color,
      gameStatus: canStart ? 'active' : 'waiting'
    });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// Make a move
router.post('/:id/move', async (req, res) => {
  try {
    const { userId, move } = req.body;
    
    if (!userId || !move) {
      return res.status(400).json({ error: 'UserId and move are required' });
    }

    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }

    if (game.currentPlayerId !== userId) {
      return res.status(400).json({ error: 'Not your turn' });
    }

    // Validate and apply move using game-specific logic
    const moveResult = await game.applyMove(move, userId);
    
    const players = await game.getPlayers();
    const currentPlayerIndex = players.findIndex(p => p.user_id === userId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayerId = players[nextPlayerIndex].user_id;

    // Record the move
    const { getDatabase } = require('../database/init');
    const db = getDatabase();
    const moveId = uuidv4();
    
    await new Promise((resolve, reject) => {
      const query = `
        INSERT INTO moves (id, game_id, user_id, move_notation, board_state_after, move_number)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.run(query, [moveId, game.id, userId, JSON.stringify(move), moveResult.newBoardState, game.moveCount + 1], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Update game state
    const updateData = {
      board_state: moveResult.newBoardState,
      move_count: game.moveCount + 1
    };

    if (moveResult.isGameComplete) {
      updateData.status = 'completed';
      updateData.current_player_id = null;
    } else {
      updateData.current_player_id = nextPlayerId;
    }

    await game.update(updateData);

    // Notify all players of the move
    const io = req.app.get('socketio');
    io.to(game.id).emit('move-made', {
      gameId: game.id,
      move,
      newBoardState: JSON.parse(moveResult.newBoardState),
      currentPlayerId: moveResult.isGameComplete ? null : nextPlayerId,
      moveCount: game.moveCount + 1,
      isGameComplete: moveResult.isGameComplete,
      winner: moveResult.winner
    });

    // Handle game completion or next turn
    if (moveResult.isGameComplete) {
      if (moveResult.winner) {
        await createNotification(moveResult.winner, game.id, 'game_won', 'Congratulations! You won the game!');
        
        // Notify other players
        for (const player of players) {
          if (player.user_id !== moveResult.winner) {
            await createNotification(player.user_id, game.id, 'game_lost', 'Game completed - better luck next time!');
          }
        }
      } else {
        // Draw/tie game
        for (const player of players) {
          await createNotification(player.user_id, game.id, 'game_draw', 'Game ended in a draw!');
        }
      }
    } else {
      // Notify next player it's their turn
      await createNotification(nextPlayerId, game.id, 'turn', 'It\'s your turn!');
    }

    res.json({ 
      message: 'Move recorded successfully',
      nextPlayerId: moveResult.isGameComplete ? null : nextPlayerId,
      moveCount: game.moveCount + 1,
      isGameComplete: moveResult.isGameComplete,
      winner: moveResult.winner
    });
  } catch (error) {
    console.error('Error making move:', error);
    res.status(500).json({ error: error.message || 'Failed to record move' });
  }
});

// Get game board as image
router.get('/:id/image', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const boardState = JSON.parse(game.boardState);
    
    // Select appropriate renderer based on game type
    let imageBuffer;
    switch (game.gameType) {
      case 'chess':
        imageBuffer = await generateBoardImage(boardState);
        break;
      case 'checkers':
        imageBuffer = await generateCheckersBoard(boardState);
        break;
      case 'hearts':
        imageBuffer = await generateCardsImage(boardState);
        break;
      default:
        imageBuffer = await generateBoardImage(boardState);
    }
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length
    });
    
    res.send(imageBuffer);
  } catch (error) {
    console.error('Error generating board image:', error);
    res.status(500).json({ error: 'Failed to generate board image' });
  }
});

// Get game move history
router.get('/:id/moves', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const { getDatabase } = require('../database/init');
    const db = getDatabase();
    
    const moves = await new Promise((resolve, reject) => {
      const query = `
        SELECT m.*, u.username
        FROM moves m
        JOIN users u ON m.user_id = u.id
        WHERE m.game_id = ?
        ORDER BY m.move_number
      `;
      
      db.all(query, [game.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(moves.map(move => ({
      id: move.id,
      moveNumber: move.move_number,
      move: move.move_notation,
      player: {
        id: move.user_id,
        username: move.username
      },
      timestamp: move.timestamp
    })));
  } catch (error) {
    console.error('Error fetching moves:', error);
    res.status(500).json({ error: 'Failed to fetch moves' });
  }
});

module.exports = router;