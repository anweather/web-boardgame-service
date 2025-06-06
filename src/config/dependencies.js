const GameService = require('../domain/GameService');
const UserService = require('../domain/UserService');
const GamePluginRegistry = require('../domain/GamePluginRegistry');

const SqliteGameRepository = require('../adapters/SqliteGameRepository');
const SqliteUserRepository = require('../adapters/SqliteUserRepository');
const SqliteNotificationService = require('../adapters/SqliteNotificationService');

const HttpGameController = require('../adapters/HttpGameController');
const HttpUserController = require('../adapters/HttpUserController');

/**
 * Dependency injection container for the application
 * Wires together all the ports and adapters
 */
class DependencyContainer {
  constructor() {
    this._instances = new Map();
    this._socketIo = null;
  }

  /**
   * Set the Socket.IO instance
   * @param {Object} socketIo - Socket.IO instance
   */
  setSocketIo(socketIo) {
    this._socketIo = socketIo;
    
    // Update notification service if it exists
    if (this._instances.has('notificationService')) {
      this._instances.get('notificationService').setSocketIo(socketIo);
    }
  }

  /**
   * Get game plugin registry (singleton)
   * @returns {GamePluginRegistry}
   */
  getGamePluginRegistry() {
    if (!this._instances.has('gamePluginRegistry')) {
      this._instances.set('gamePluginRegistry', GamePluginRegistry.createWithDefaults());
    }
    return this._instances.get('gamePluginRegistry');
  }

  /**
   * Get game repository (singleton)
   * @returns {SqliteGameRepository}
   */
  getGameRepository() {
    if (!this._instances.has('gameRepository')) {
      this._instances.set('gameRepository', new SqliteGameRepository());
    }
    return this._instances.get('gameRepository');
  }

  /**
   * Get user repository (singleton)
   * @returns {SqliteUserRepository}
   */
  getUserRepository() {
    if (!this._instances.has('userRepository')) {
      this._instances.set('userRepository', new SqliteUserRepository());
    }
    return this._instances.get('userRepository');
  }

  /**
   * Get notification service (singleton)
   * @returns {SqliteNotificationService}
   */
  getNotificationService() {
    if (!this._instances.has('notificationService')) {
      const service = new SqliteNotificationService(this._socketIo);
      this._instances.set('notificationService', service);
    }
    return this._instances.get('notificationService');
  }

  /**
   * Get game service (singleton)
   * @returns {GameService}
   */
  getGameService() {
    if (!this._instances.has('gameService')) {
      const gameService = new GameService(
        this.getGameRepository(),
        this.getUserRepository(),
        this.getNotificationService(),
        this.getGamePluginRegistry()
      );
      this._instances.set('gameService', gameService);
    }
    return this._instances.get('gameService');
  }

  /**
   * Get user service (singleton)
   * @returns {UserService}
   */
  getUserService() {
    if (!this._instances.has('userService')) {
      const userService = new UserService(this.getUserRepository());
      this._instances.set('userService', userService);
    }
    return this._instances.get('userService');
  }

  /**
   * Get image service using plugin system
   * @returns {Object}
   */
  getImageService() {
    if (!this._instances.has('imageService')) {
      // Capture the dependency container context
      const self = this;
      
      const imageService = {
        async generateGameImage(game, players, options = {}) {
          const boardState = typeof game.boardState === 'string' 
            ? JSON.parse(game.boardState) 
            : game.boardState;
          
          // Get plugin for this game type using captured context
          const plugin = self.getGamePluginRegistry().getPlugin(game.gameType);
          
          if (plugin && typeof plugin.constructor.generateBoardImage === 'function') {
            // Use plugin's rendering method with passed options
            try {
              return await plugin.constructor.generateBoardImage(boardState, {
                title: `${game.name || 'Game'} - ${plugin.getDisplayName()}`,
                players: players,
                ...options
              });
            } catch (error) {
              console.error(`Error rendering ${game.gameType} board with plugin:`, error);
            }
          }
          
          // No fallback - throw error for unsupported games
          throw new Error(`No plugin renderer found for game type: ${game.gameType}. Please install the appropriate game plugin.`);
        }
      };
      
      this._instances.set('imageService', imageService);
    }
    return this._instances.get('imageService');
  }

  /**
   * Get HTTP game controller (singleton)
   * @returns {HttpGameController}
   */
  getHttpGameController() {
    if (!this._instances.has('httpGameController')) {
      const controller = new HttpGameController(
        this.getGameService(),
        this.getUserService(),
        this.getNotificationService(),
        this.getImageService()
      );
      this._instances.set('httpGameController', controller);
    }
    return this._instances.get('httpGameController');
  }

  /**
   * Get HTTP user controller (singleton)
   * @returns {HttpUserController}
   */
  getHttpUserController() {
    if (!this._instances.has('httpUserController')) {
      const controller = new HttpUserController(
        this.getUserService(),
        this.getNotificationService()
      );
      this._instances.set('httpUserController', controller);
    }
    return this._instances.get('httpUserController');
  }

  /**
   * Clear all instances (useful for testing)
   */
  clear() {
    this._instances.clear();
  }

  /**
   * Get all router instances for mounting
   * @returns {Object} Object with router instances
   */
  getRouters() {
    return {
      games: this.getHttpGameController().getRouter(),
      users: this.getHttpUserController().getRouter()
    };
  }
}

// Export singleton instance
module.exports = new DependencyContainer();