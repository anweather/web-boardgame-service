/**
 * Frontend Game Plugin Manager
 * Manages game-specific frontend logic and provides a unified interface
 */
class GamePluginManager {
  constructor() {
    this.plugins = new Map();
    this.loadDefaultPlugins();
  }

  /**
   * Load default game plugins
   * @private
   */
  loadDefaultPlugins() {
    // For now, we'll hardcode the chess plugin
    // Later this could be dynamic or loaded from the server
    this.registerPlugin('chess', {
      parseMove: (moveText) => {
        if (!moveText || typeof moveText !== 'string') {
          throw new Error('Invalid move input');
        }
        // Normalize to lowercase for chess.js library compatibility
        return moveText.trim().toLowerCase();
      },

      formatMove: (moveData) => {
        if (typeof moveData === 'string') {
          return moveData;
        }
        if (moveData && typeof moveData === 'object') {
          if (moveData.from && moveData.to) {
            return `${moveData.from}-${moveData.to}`;
          }
          if (moveData.san) return moveData.san;
          if (moveData.lan) return moveData.lan;
        }
        return JSON.stringify(moveData);
      },

      getMoveInputPlaceholder: () => {
        return 'Enter move (e.g., e2-e4, Nf3, O-O)';
      },

      getMoveInputHelp: () => {
        return 'Use standard chess notation: coordinate (e2-e4) or algebraic (Nf3, Qh5, O-O)';
      },

      validateMoveFormat: (moveText) => {
        if (!moveText || typeof moveText !== 'string') {
          return { valid: false, error: 'Move cannot be empty' };
        }

        const trimmed = moveText.trim();
        if (trimmed.length === 0) {
          return { valid: false, error: 'Move cannot be empty' };
        }

        if (trimmed.length > 10) {
          return { valid: false, error: 'Move seems too long' };
        }

        if (!/^[a-zA-Z0-9\-=+#x]*$/.test(trimmed)) {
          return { valid: false, error: 'Move contains invalid characters' };
        }

        return { valid: true };
      },

      getDisplayName: () => 'Chess',
      getDescription: () => 'Classic two-player chess game with standard rules'
    });

    // Fallback plugin for unknown game types
    this.registerPlugin('default', {
      parseMove: (moveText) => moveText.trim(),
      formatMove: (moveData) => typeof moveData === 'string' ? moveData : JSON.stringify(moveData),
      getMoveInputPlaceholder: () => 'Enter move',
      getMoveInputHelp: () => 'Enter your move in the game format',
      validateMoveFormat: (moveText) => {
        return moveText && moveText.trim().length > 0 
          ? { valid: true } 
          : { valid: false, error: 'Move cannot be empty' };
      },
      getDisplayName: () => 'Game',
      getDescription: () => 'Generic game'
    });
  }

  /**
   * Register a game plugin
   * @param {string} gameType - Game type identifier
   * @param {Object} plugin - Plugin object with required methods
   */
  registerPlugin(gameType, plugin) {
    // Validate plugin has required methods
    const requiredMethods = [
      'parseMove', 'formatMove', 'getMoveInputPlaceholder', 
      'getMoveInputHelp', 'validateMoveFormat', 'getDisplayName'
    ];

    for (const method of requiredMethods) {
      if (typeof plugin[method] !== 'function') {
        throw new Error(`Plugin for ${gameType} must implement ${method}() method`);
      }
    }

    this.plugins.set(gameType, plugin);
  }

  /**
   * Get plugin for a game type
   * @param {string} gameType - Game type identifier
   * @returns {Object} Plugin object or default plugin
   */
  getPlugin(gameType) {
    return this.plugins.get(gameType) || this.plugins.get('default');
  }

  /**
   * Check if a game type is supported
   * @param {string} gameType - Game type identifier
   * @returns {boolean} Whether the game type has a plugin
   */
  isSupported(gameType) {
    return this.plugins.has(gameType);
  }

  /**
   * Parse move using appropriate plugin
   * @param {string} moveText - Raw user input
   * @param {string} gameType - Game type
   * @returns {string|Object} Parsed move
   */
  parseMove(moveText, gameType) {
    const plugin = this.getPlugin(gameType);
    try {
      return plugin.parseMove(moveText);
    } catch (error) {
      throw new Error(`${plugin.getDisplayName()} move parsing error: ${error.message}`);
    }
  }

  /**
   * Format move using appropriate plugin
   * @param {string|Object} moveData - Move data from backend
   * @param {string} gameType - Game type
   * @returns {string} Formatted move text
   */
  formatMove(moveData, gameType) {
    const plugin = this.getPlugin(gameType);
    try {
      return plugin.formatMove(moveData);
    } catch (error) {
      console.warn(`Move formatting error for ${gameType}:`, error);
      return typeof moveData === 'string' ? moveData : JSON.stringify(moveData);
    }
  }

  /**
   * Get move input placeholder for a game type
   * @param {string} gameType - Game type
   * @returns {string} Placeholder text
   */
  getMoveInputPlaceholder(gameType) {
    const plugin = this.getPlugin(gameType);
    return plugin.getMoveInputPlaceholder();
  }

  /**
   * Get move input help for a game type
   * @param {string} gameType - Game type
   * @returns {string} Help text
   */
  getMoveInputHelp(gameType) {
    const plugin = this.getPlugin(gameType);
    return plugin.getMoveInputHelp();
  }

  /**
   * Validate move format for a game type
   * @param {string} moveText - Raw user input
   * @param {string} gameType - Game type
   * @returns {Object} Validation result {valid: boolean, error?: string}
   */
  validateMoveFormat(moveText, gameType) {
    const plugin = this.getPlugin(gameType);
    try {
      return plugin.validateMoveFormat(moveText);
    } catch (error) {
      return { valid: false, error: `Validation error: ${error.message}` };
    }
  }

  /**
   * Get display name for a game type
   * @param {string} gameType - Game type
   * @returns {string} Display name
   */
  getDisplayName(gameType) {
    const plugin = this.getPlugin(gameType);
    return plugin.getDisplayName();
  }

  /**
   * Get description for a game type
   * @param {string} gameType - Game type
   * @returns {string} Description
   */
  getDescription(gameType) {
    const plugin = this.getPlugin(gameType);
    return plugin.getDescription ? plugin.getDescription() : 'Game description not available';
  }

  /**
   * Get list of supported game types
   * @returns {Array<string>} Array of game type identifiers
   */
  getSupportedGameTypes() {
    return Array.from(this.plugins.keys()).filter(type => type !== 'default');
  }

  /**
   * Load plugin from server (future feature)
   * @param {string} gameType - Game type
   * @returns {Promise<void>}
   */
  async loadPluginFromServer(gameType) {
    try {
      // This would fetch plugin code from server in the future
      const response = await fetch(`/api/plugins/${gameType}/frontend`);
      if (response.ok) {
        const pluginCode = await response.text();
        // Evaluate and register plugin (would need sandboxing in production)
        console.log(`Plugin for ${gameType} would be loaded from server`);
      }
    } catch (error) {
      console.warn(`Failed to load plugin for ${gameType} from server:`, error);
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GamePluginManager;
} else {
  // Browser environment
  window.GamePluginManager = GamePluginManager;
}