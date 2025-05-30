const express = require('express');

/**
 * HTTP adapter for game operations
 * Primary port that handles HTTP requests and delegates to domain services
 */
class HttpGameController {
  constructor(gameService, userService, notificationService, imageService) {
    this.gameService = gameService;
    this.userService = userService;
    this.notificationService = notificationService;
    this.imageService = imageService;
    this.router = express.Router();
    this._setupRoutes();
  }

  /**
   * Get the Express router with all routes configured
   * @returns {express.Router}
   */
  getRouter() {
    return this.router;
  }

  /**
   * Setup all HTTP routes
   * @private
   */
  _setupRoutes() {
    // Create a new game
    this.router.post('/', this._createGame.bind(this));
    
    // Get all games
    this.router.get('/', this._getAllGames.bind(this));
    
    // Get specific game state
    this.router.get('/:id', this._getGame.bind(this));
    
    // Join a game
    this.router.post('/:id/join', this._joinGame.bind(this));
    
    // Make a move
    this.router.post('/:id/move', this._makeMove.bind(this));
    
    // Get game board as image
    this.router.get('/:id/image', this._getBoardImage.bind(this));
    
    // Get game move history
    this.router.get('/:id/moves', this._getMoveHistory.bind(this));
  }

  /**
   * Create a new game
   */
  async _createGame(req, res) {
    try {
      const { name, gameType = 'chess', creatorId, settings = {} } = req.body;

      if (!name || !creatorId) {
        return res.status(400).json({ error: 'Name and creatorId are required' });
      }

      // Verify creator exists
      const creator = await this.userService.findUserById(creatorId);
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Create game using domain service
      const game = await this.gameService.createGame({
        name,
        gameType,
        creatorId,
        settings
      });

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
      res.status(500).json({ error: error.message || 'Failed to create game' });
    }
  }

  /**
   * Get all games
   */
  async _getAllGames(req, res) {
    try {
      const { status, gameType, playerId, limit } = req.query;
      const criteria = {};
      
      if (status) criteria.status = status;
      if (gameType) criteria.gameType = gameType;
      if (playerId) criteria.playerId = playerId;
      if (limit) criteria.limit = parseInt(limit);
      
      const games = await this.gameService.findGames(criteria);
      
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
  }

  /**
   * Get specific game state
   */
  async _getGame(req, res) {
    try {
      const game = await this.gameService.getGameById(req.params.id);
      
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const players = await this.gameService.getGamePlayers(game.id);
      
      res.json({
        id: game.id,
        name: game.name,
        gameType: game.gameType,
        status: game.status,
        currentPlayerId: game.currentPlayerId,
        boardState: game.boardState,
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
  }

  /**
   * Join a game
   */
  async _joinGame(req, res) {
    try {
      const { userId } = req.body;
      const gameId = req.params.id;
      
      if (!userId) {
        return res.status(400).json({ error: 'UserId is required' });
      }

      // Verify user exists
      const user = await this.userService.findUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Join game using domain service
      const result = await this.gameService.joinGame(gameId, userId);

      // Send real-time notifications if game started
      if (result.gameStarted) {
        await this.notificationService.broadcastToGame(gameId, 'game-started', {
          gameId,
          currentPlayerId: result.firstPlayerId
        });

        await this.notificationService.sendNotification(
          result.firstPlayerId,
          'turn',
          'It\'s your turn!',
          { gameId }
        );
      }

      res.json({ 
        message: 'Successfully joined game', 
        playerOrder: result.playerOrder, 
        color: result.color,
        gameStatus: result.gameStarted ? 'active' : 'waiting'
      });
    } catch (error) {
      console.error('Error joining game:', error);
      res.status(500).json({ error: error.message || 'Failed to join game' });
    }
  }

  /**
   * Make a move
   */
  async _makeMove(req, res) {
    try {
      const { userId, move } = req.body;
      const gameId = req.params.id;
      
      if (!userId || !move) {
        return res.status(400).json({ error: 'UserId and move are required' });
      }

      // Make move using domain service
      const result = await this.gameService.makeMove(gameId, userId, move);

      // Send real-time notifications
      await this.notificationService.broadcastToGame(gameId, 'move-made', {
        gameId,
        move,
        newBoardState: result.newBoardState,
        currentPlayerId: result.nextPlayerId,
        moveCount: result.moveCount,
        isGameComplete: result.isGameComplete,
        winner: result.winner
      });

      // Handle game completion or next turn notifications
      if (result.isGameComplete) {
        if (result.winner) {
          await this.notificationService.sendNotification(
            result.winner,
            'game_won',
            'Congratulations! You won the game!',
            { gameId }
          );
          
          // Notify other players
          const players = await this.gameService.getGamePlayers(gameId);
          for (const player of players) {
            if (player.user_id !== result.winner) {
              await this.notificationService.sendNotification(
                player.user_id,
                'game_lost',
                'Game completed - better luck next time!',
                { gameId }
              );
            }
          }
        } else {
          // Draw/tie game
          const players = await this.gameService.getGamePlayers(gameId);
          for (const player of players) {
            await this.notificationService.sendNotification(
              player.user_id,
              'game_draw',
              'Game ended in a draw!',
              { gameId }
            );
          }
        }
      } else {
        // Notify next player it's their turn
        await this.notificationService.sendNotification(
          result.nextPlayerId,
          'turn',
          'It\'s your turn!',
          { gameId }
        );
      }

      res.json({ 
        message: 'Move recorded successfully',
        nextPlayerId: result.nextPlayerId,
        moveCount: result.moveCount,
        isGameComplete: result.isGameComplete,
        winner: result.winner
      });
    } catch (error) {
      console.error('Error making move:', error);
      res.status(500).json({ error: error.message || 'Failed to record move' });
    }
  }

  /**
   * Get game board as image
   */
  async _getBoardImage(req, res) {
    try {
      const game = await this.gameService.getGameById(req.params.id);
      
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const players = await this.gameService.getGamePlayers(game.id);
      const imageBuffer = await this.imageService.generateGameImage(game, players);
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length
      });
      
      res.send(imageBuffer);
    } catch (error) {
      console.error('Error generating board image:', error);
      res.status(500).json({ error: 'Failed to generate board image' });
    }
  }

  /**
   * Get game move history
   */
  async _getMoveHistory(req, res) {
    try {
      const game = await this.gameService.getGameById(req.params.id);
      
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const moves = await this.gameService.getMoveHistory(req.params.id);

      res.json(moves.map(move => ({
        id: move.id,
        moveNumber: move.moveNumber,
        move: move.move,
        player: {
          id: move.playerId,
          username: move.username
        },
        timestamp: move.timestamp
      })));
    } catch (error) {
      console.error('Error fetching moves:', error);
      res.status(500).json({ error: 'Failed to fetch moves' });
    }
  }
}

module.exports = HttpGameController;