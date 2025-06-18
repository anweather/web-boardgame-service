const Game = require('./Game');

/**
 * Game domain service
 * Contains core business logic for game operations
 */
class GameService {
  constructor(gameRepository, userRepository, notificationService, gamePluginRegistry) {
    this.gameRepository = gameRepository;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
    this.gamePluginRegistry = gamePluginRegistry;
  }

  /**
   * Create a new game
   * @param {Object} gameData - Game creation data
   * @param {string} gameData.name - Game name
   * @param {string} gameData.gameType - Game type
   * @param {string} gameData.creatorId - Creator user ID
   * @param {Object} gameData.settings - Game settings
   * @returns {Promise<Game>} Created game
   */
  async createGame({ name, gameType, creatorId, settings = {} }) {
    // Validate creator exists
    const creator = await this.userRepository.findById(creatorId);
    if (!creator) {
      throw new Error('Creator not found');
    }

    // Validate game type
    const gamePlugin = this.gamePluginRegistry.getPlugin(gameType);
    if (!gamePlugin) {
      throw new Error(`Unsupported game type: ${gameType}`);
    }

    // Get initial board state from plugin
    const initialBoardState = gamePlugin.getInitialBoardState(settings);

    // Create game entity
    const game = new Game({
      name,
      gameType,
      boardState: gamePlugin.serializeBoardState(initialBoardState),
      minPlayers: gamePlugin.getMinPlayers(),
      maxPlayers: gamePlugin.getMaxPlayers(),
      settings
    });

    // Save game
    const savedGame = await this.gameRepository.save(game);

    // Add creator as first player
    await this.addPlayerToGame(savedGame.id, creatorId);

    // Return the updated game state (which may have been started)
    return await this.gameRepository.findById(savedGame.id);
  }

  /**
   * Add a player to a game
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player ID
   * @returns {Promise<Object>} Player assignment data
   */
  async addPlayerToGame(gameId, playerId) {
    // Validate game and player
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const player = await this.userRepository.findById(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Check if game can accept players
    const currentPlayers = await this.gameRepository.getPlayers(gameId);
    if (!game.canAcceptPlayers(currentPlayers.length)) {
      throw new Error('Game cannot accept new players');
    }

    // Check if player is already in game
    if (currentPlayers.some(p => p.user_id === playerId)) {
      throw new Error('Player already in this game');
    }

    // Get game plugin for color assignment
    const gamePlugin = this.gamePluginRegistry.getPlugin(game.gameType);
    const playerOrder = currentPlayers.length + 1;
    const color = gamePlugin.assignPlayerColor(playerOrder, game.maxPlayers);

    // Add player
    const playerAssignment = await this.gameRepository.addPlayer(gameId, playerId, {
      playerOrder,
      color
    });

    // Check if game can start
    const updatedPlayers = await this.gameRepository.getPlayers(gameId);
    if (game.canStart(updatedPlayers.length)) {
      // Start the game
      const firstPlayer = updatedPlayers.find(p => p.player_order === 1);
      const startedGame = game.start(firstPlayer.user_id);
      await this.gameRepository.update(gameId, startedGame.toObject());

      // Notify all players
      await this.notificationService.broadcastToGame(gameId, 'game-started', {
        gameId,
        currentPlayerId: firstPlayer.user_id
      });

      // Notify current player
      await this.notificationService.sendNotification(
        firstPlayer.user_id,
        'turn',
        "It's your turn!",
        { gameId }
      );
    }

    return playerAssignment;
  }

  /**
   * Make a move in a game
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player ID
   * @param {Object} move - Move data
   * @returns {Promise<Object>} Move result
   */
  async makeMove(gameId, playerId, move) {
    // Validate game and player
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const player = await this.userRepository.findById(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Validate game state
    if (!game.hasStatus('active')) {
      throw new Error('Game is not active');
    }

    if (!game.isCurrentPlayer(playerId)) {
      throw new Error('Not your turn');
    }

    // Get game plugin and players
    const gamePlugin = this.gamePluginRegistry.getPlugin(game.gameType);
    const players = await this.gameRepository.getPlayers(gameId);
    const currentBoardState = gamePlugin.deserializeBoardState(game.boardState);

    // Parse move if it's a string (for games that support text input like Solitaire)
    let parsedMove = move;
    if (typeof move === 'string' && typeof gamePlugin.constructor.parseMove === 'function') {
      try {
        parsedMove = gamePlugin.constructor.parseMove(move);
      } catch (parseError) {
        throw new Error(`Invalid move format: ${parseError.message}`);
      }
    }

    // Validate move
    const validation = gamePlugin.validateMove(parsedMove, currentBoardState, playerId, players);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Apply move
    const newBoardState = gamePlugin.applyMove(parsedMove, currentBoardState, playerId, players);
    let serializedNewBoardState = gamePlugin.serializeBoardState(newBoardState);

    // Check if game is complete
    const isGameComplete = gamePlugin.isGameComplete(newBoardState, players);
    let winner = null;
    let updatedGame;

    if (isGameComplete) {
      winner = gamePlugin.getWinner(newBoardState, players);
      
      // Allow plugin to perform custom completion logic
      if (typeof gamePlugin.onGameComplete === 'function') {
        try {
          await gamePlugin.onGameComplete(newBoardState, players, winner);
          // Re-serialize board state after plugin modifications
          serializedNewBoardState = gamePlugin.serializeBoardState(newBoardState);
        } catch (error) {
          console.warn('Plugin onGameComplete failed:', error.message);
        }
      }
      
      updatedGame = game.complete(winner);
      // Ensure the final board state includes any plugin modifications
      updatedGame = new Game({
        ...updatedGame,
        boardState: serializedNewBoardState
      });
    } else {
      const nextPlayerId = gamePlugin.getNextPlayer(playerId, players, newBoardState);
      updatedGame = game.makeMove(nextPlayerId, serializedNewBoardState);
    }

    try {
      // Always use separate operations for now to debug the completion issue
      await this.gameRepository.saveMove(
        gameId,
        playerId,
        move,
        serializedNewBoardState,
        game.moveCount + 1
      );

      await this.gameRepository.update(gameId, updatedGame.toObject());
    } catch (error) {
      console.error('Error saving move and updating game:', error);
      throw new Error(`Failed to save move: ${error.message}`);
    }

    // Send notifications
    if (isGameComplete) {
      await this._notifyGameComplete(gameId, players, winner);
    } else {
      await this._notifyMoveMade(gameId, players, updatedGame.currentPlayerId, move, newBoardState);
    }

    return {
      success: true,
      gameComplete: isGameComplete,
      winner,
      nextPlayerId: updatedGame.currentPlayerId,
      moveCount: updatedGame.moveCount
    };
  }

  /**
   * Get game state
   * @param {string} gameId - Game ID
   * @returns {Promise<Object>} Game state with players and render data
   */
  async getGameState(gameId) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const players = await this.gameRepository.getPlayers(gameId);
    const gamePlugin = this.gamePluginRegistry.getPlugin(game.gameType);
    const boardState = gamePlugin.deserializeBoardState(game.boardState);

    return {
      ...game.toObject(),
      players: players.map(p => ({
        id: p.id,
        userId: p.user_id,
        username: p.username,
        playerOrder: p.player_order,
        color: p.color,
        playerData: p.player_data || {}
      })),
      boardState,
      renderData: gamePlugin.getRenderData(boardState, players),
      gameStats: gamePlugin.getGameStats(boardState, players)
    };
  }

  /**
   * Get available game types
   * @returns {Array} Array of game type information
   */
  getAvailableGameTypes() {
    return this.gamePluginRegistry.getAvailableGameTypes();
  }

  /**
   * Find games by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Array of games
   */
  async findGames(criteria = {}) {
    return await this.gameRepository.findByCriteria(criteria);
  }

  /**
   * Get game by ID
   * @param {string} gameId - Game ID
   * @returns {Promise<Object|null>} Game or null if not found
   */
  async getGameById(gameId) {
    return await this.gameRepository.findById(gameId);
  }

  /**
   * Join a game
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player ID
   * @returns {Promise<Object>} Join result
   */
  async joinGame(gameId, playerId) {
    return await this.addPlayerToGame(gameId, playerId);
  }

  /**
   * Get move history for a game
   * @param {string} gameId - Game ID
   * @returns {Promise<Array>} Array of moves
   */
  async getMoveHistory(gameId) {
    return await this.gameRepository.getMoveHistory(gameId);
  }

  /**
   * Get players for a game
   * @param {string} gameId - Game ID
   * @returns {Promise<Array>} Array of players
   */
  async getGamePlayers(gameId) {
    return await this.gameRepository.getPlayers(gameId);
  }

  /**
   * Validate game configuration
   * @param {string} gameType - Game type
   * @param {Object} settings - Game settings
   * @returns {Object} Validation result
   */
  validateGameConfiguration(gameType, settings) {
    const gamePlugin = this.gamePluginRegistry.getPlugin(gameType);
    if (!gamePlugin) {
      return { valid: false, error: `Unsupported game type: ${gameType}` };
    }

    // Basic validation
    const minPlayers = settings.minPlayers || gamePlugin.getMinPlayers();
    const maxPlayers = settings.maxPlayers || gamePlugin.getMaxPlayers();

    if (minPlayers < 1 || maxPlayers > 10) {
      return { valid: false, error: 'Player count must be between 1 and 10' };
    }

    if (minPlayers < gamePlugin.getMinPlayers() || maxPlayers > gamePlugin.getMaxPlayers()) {
      return {
        valid: false,
        error: `${gamePlugin.getDisplayName()} supports ${gamePlugin.getMinPlayers()}-${gamePlugin.getMaxPlayers()} players`
      };
    }

    if (minPlayers > maxPlayers) {
      return { valid: false, error: 'Minimum players cannot exceed maximum players' };
    }

    return { valid: true };
  }

  /**
   * Notify players when a move is made
   * @param {string} gameId - Game ID
   * @param {Array} players - Game players
   * @param {string} nextPlayerId - Next player ID
   * @param {Object} move - Move data
   * @param {Object} boardState - New board state
   * @private
   */
  async _notifyMoveMade(gameId, players, nextPlayerId, move, boardState) {
    // Broadcast move to all players
    await this.notificationService.broadcastToGame(gameId, 'move-made', {
      gameId,
      move,
      boardState,
      currentPlayerId: nextPlayerId,
      moveCount: players.length // This should be the actual move count
    });

    // Notify next player
    if (nextPlayerId) {
      await this.notificationService.sendNotification(
        nextPlayerId,
        'turn',
        "It's your turn!",
        { gameId }
      );
    }
  }

  /**
   * Notify players when game is complete
   * @param {string} gameId - Game ID
   * @param {Array} players - Game players
   * @param {string|null} winner - Winner ID or null for draw
   * @private
   */
  async _notifyGameComplete(gameId, players, winner) {
    // Broadcast game completion
    await this.notificationService.broadcastToGame(gameId, 'game-complete', {
      gameId,
      winner
    });

    // Send individual notifications
    if (winner) {
      await this.notificationService.sendNotification(
        winner,
        'game_won',
        'Congratulations! You won the game!',
        { gameId }
      );

      // Notify other players
      for (const player of players) {
        if (player.user_id !== winner) {
          await this.notificationService.sendNotification(
            player.user_id,
            'game_lost',
            'Game completed - better luck next time!',
            { gameId }
          );
        }
      }
    } else {
      // Draw game
      for (const player of players) {
        await this.notificationService.sendNotification(
          player.user_id,
          'game_draw',
          'Game ended in a draw!',
          { gameId }
        );
      }
    }
  }

  /**
   * Force start a game (admin feature)
   * @param {string} gameId - Game ID
   * @returns {Promise<Object>} Result with first player ID
   */
  async forceStartGame(gameId) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status === 'active') {
      throw new Error('Game is already active');
    }

    const players = await this.gameRepository.getPlayers(gameId);
    if (players.length < 2) {
      throw new Error('Game needs at least 2 players to start');
    }

    // Set first player as current player
    const firstPlayerId = players[0].user_id;
    
    // Update game status to active
    const updatedGame = await this.gameRepository.update(gameId, {
      status: 'active',
      currentPlayerId: firstPlayerId
    });

    return {
      success: true,
      firstPlayerId,
      playerCount: players.length,
      game: updatedGame
    };
  }
}

module.exports = GameService;