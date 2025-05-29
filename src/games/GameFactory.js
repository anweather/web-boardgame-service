const Chess = require('./types/Chess');
const Checkers = require('./types/Checkers');
const Hearts = require('./types/Hearts');

class GameFactory {
  static gameTypes = new Map([
    ['chess', Chess],
    ['checkers', Checkers],
    ['hearts', Hearts]
  ]);

  static getSupportedGameTypes() {
    return Array.from(this.gameTypes.keys()).map(type => {
      const GameClass = this.gameTypes.get(type);
      return {
        type,
        name: GameClass.GAME_TYPE_NAME,
        description: GameClass.GAME_DESCRIPTION,
        minPlayers: GameClass.MIN_PLAYERS,
        maxPlayers: GameClass.MAX_PLAYERS
      };
    });
  }

  static createGame(gameType, gameData) {
    const GameClass = this.gameTypes.get(gameType);
    
    if (!GameClass) {
      throw new Error(`Unsupported game type: ${gameType}`);
    }

    // Create game instance with proper player limits
    const gameInstance = new GameClass(gameData);
    
    // Set min/max players from game type
    gameInstance.minPlayers = GameClass.MIN_PLAYERS;
    gameInstance.maxPlayers = GameClass.MAX_PLAYERS;
    
    return gameInstance;
  }

  static validateGameType(gameType) {
    return this.gameTypes.has(gameType);
  }

  static getGameTypeInfo(gameType) {
    const GameClass = this.gameTypes.get(gameType);
    
    if (!GameClass) {
      return null;
    }

    return {
      type: gameType,
      name: GameClass.GAME_TYPE_NAME,
      description: GameClass.GAME_DESCRIPTION,
      minPlayers: GameClass.MIN_PLAYERS,
      maxPlayers: GameClass.MAX_PLAYERS
    };
  }

  static registerGameType(gameType, GameClass) {
    // Validate the game class has required static properties
    if (!GameClass.GAME_TYPE_NAME || !GameClass.MIN_PLAYERS || !GameClass.MAX_PLAYERS) {
      throw new Error('Game class must define GAME_TYPE_NAME, MIN_PLAYERS, and MAX_PLAYERS');
    }

    // Validate the game class extends BoardGame
    const BoardGame = require('./BoardGame');
    if (!(GameClass.prototype instanceof BoardGame)) {
      throw new Error('Game class must extend BoardGame');
    }

    this.gameTypes.set(gameType, GameClass);
  }

  static unregisterGameType(gameType) {
    return this.gameTypes.delete(gameType);
  }

  static createGameInstance(gameType, gameData) {
    const gameInstance = this.createGame(gameType, gameData);
    
    // Initialize with default board state if not provided
    if (!gameData.boardState) {
      const initialState = gameInstance.getInitialBoardState();
      gameInstance.boardState = gameInstance.serializeBoardState(initialState);
    }

    return gameInstance;
  }

  static validateGameConfiguration(gameType, settings = {}) {
    const GameClass = this.gameTypes.get(gameType);
    
    if (!GameClass) {
      return { valid: false, error: `Unsupported game type: ${gameType}` };
    }

    // Validate player count requirements
    const minPlayers = settings.minPlayers || GameClass.MIN_PLAYERS;
    const maxPlayers = settings.maxPlayers || GameClass.MAX_PLAYERS;

    if (minPlayers < 1 || maxPlayers > 10) {
      return { valid: false, error: 'Player count must be between 1 and 10' };
    }

    if (minPlayers < GameClass.MIN_PLAYERS || maxPlayers > GameClass.MAX_PLAYERS) {
      return { 
        valid: false, 
        error: `${GameClass.GAME_TYPE_NAME} supports ${GameClass.MIN_PLAYERS}-${GameClass.MAX_PLAYERS} players` 
      };
    }

    if (minPlayers > maxPlayers) {
      return { valid: false, error: 'Minimum players cannot exceed maximum players' };
    }

    return { valid: true };
  }

  // Helper method to get game-specific renderers
  static createBoardRenderer(gameType) {
    const GameClass = this.gameTypes.get(gameType);
    
    if (!GameClass) {
      throw new Error(`Unsupported game type: ${gameType}`);
    }

    return {
      renderBoard: (boardState) => {
        const tempGame = new GameClass({ boardState });
        return tempGame.renderBoard(tempGame.deserializeBoardState(boardState));
      },
      generateImage: async (boardState) => {
        // Game-specific image generation
        const { generateBoardImage, generateCheckersBoard, generateCardsImage } = require('../services/svgBoardRenderer');
        const tempGame = new GameClass({ boardState });
        const renderData = tempGame.renderBoard(tempGame.deserializeBoardState(boardState));
        
        // Select appropriate renderer based on game type
        switch (gameType) {
          case 'chess':
            return generateBoardImage(renderData);
          case 'checkers':
            return generateCheckersBoard(renderData);
          case 'hearts':
            return generateCardsImage(renderData);
          default:
            return generateBoardImage(renderData);
        }
      }
    };
  }
}

module.exports = GameFactory;