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

    // Solitaire plugin
    const solitairePlugin = {
      parseMove: (moveText) => {
        if (!moveText || typeof moveText !== 'string') {
          throw new Error('Invalid move input');
        }

        const cleanMove = moveText.trim().toLowerCase();

        // Stock operations (with shorthand)
        if (cleanMove === 'draw' || cleanMove === 'draw stock' || cleanMove === 'd') {
          return { action: 'draw_stock' };
        }
        if (cleanMove === 'reset' || cleanMove === 'reset stock' || cleanMove === 'r') {
          return { action: 'reset_stock' };
        }

        // Flip card operations (with shorthand: f1, f2, etc.)
        let match = cleanMove.match(/^(?:flip\s+tableau\s*(\d+)|f(\d+))$/);
        if (match) {
          const column = parseInt(match[1] || match[2]) - 1;
          if (column < 0 || column > 6) {
            throw new Error('Invalid tableau column (must be 1-7)');
          }
          return { action: 'flip_card', from: { type: 'tableau', column } };
        }

        // Waste to foundation (shorthand: wh, wd, wc, ws)
        match = cleanMove.match(/^(?:waste\s+to\s+foundation\s+(hearts?|diamonds?|clubs?|spades?)|w([hdcs]))$/);
        if (match) {
          let suit;
          if (match[1]) {
            suit = solitairePlugin.normalizeSuit(match[1]);
          } else {
            const suitMap = { 'h': 'hearts', 'd': 'diamonds', 'c': 'clubs', 's': 'spades' };
            suit = suitMap[match[2]];
          }
          return {
            action: 'move_card',
            from: { type: 'waste' },
            to: { type: 'foundation', suit },
            cardCount: 1
          };
        }

        // Tableau to foundation (shorthand: 1h, 2d, 3c, etc.)
        match = cleanMove.match(/^(?:tableau\s*(\d+)\s+to\s+foundation\s+(hearts?|diamonds?|clubs?|spades?)|(\d+)([hdcs]))$/);
        if (match) {
          const column = parseInt(match[1] || match[3]) - 1;
          if (column < 0 || column > 6) {
            throw new Error('Invalid tableau column (must be 1-7)');
          }
          let suit;
          if (match[2]) {
            suit = solitairePlugin.normalizeSuit(match[2]);
          } else {
            const suitMap = { 'h': 'hearts', 'd': 'diamonds', 'c': 'clubs', 's': 'spades' };
            suit = suitMap[match[4]];
          }
          return {
            action: 'move_card',
            from: { type: 'tableau', column },
            to: { type: 'foundation', suit },
            cardCount: 1
          };
        }

        // Tableau to tableau (shorthand: 1-7, 2-3, etc.)
        match = cleanMove.match(/^(?:tableau\s*(\d+)\s+to\s+tableau\s*(\d+)(?:\s+x(\d+))?|(\d+)-(\d+)(?:\s*x(\d+))?)$/);
        if (match) {
          const fromColumn = parseInt(match[1] || match[4]) - 1;
          const toColumn = parseInt(match[2] || match[5]) - 1;
          const cardCount = parseInt(match[3] || match[6] || '1');
          
          if (fromColumn < 0 || fromColumn > 6 || toColumn < 0 || toColumn > 6) {
            throw new Error('Invalid tableau column (must be 1-7)');
          }
          
          return {
            action: 'move_card',
            from: { type: 'tableau', column: fromColumn },
            to: { type: 'tableau', column: toColumn },
            cardCount
          };
        }

        // Waste to tableau (shorthand: w1, w2, etc.)
        match = cleanMove.match(/^(?:waste\s+to\s+tableau\s*(\d+)|w(\d+))$/);
        if (match) {
          const column = parseInt(match[1] || match[2]) - 1;
          if (column < 0 || column > 6) {
            throw new Error('Invalid tableau column (must be 1-7)');
          }
          return {
            action: 'move_card',
            from: { type: 'waste' },
            to: { type: 'tableau', column },
            cardCount: 1
          };
        }

        // Foundation to tableau (shorthand: h7, d3, etc.)
        match = cleanMove.match(/^(?:foundation\s+(hearts?|diamonds?|clubs?|spades?)\s+to\s+tableau\s*(\d+)|([hdcs])(\d+))$/);
        if (match) {
          let suit;
          let column;
          if (match[1]) {
            suit = solitairePlugin.normalizeSuit(match[1]);
            column = parseInt(match[2]) - 1;
          } else {
            const suitMap = { 'h': 'hearts', 'd': 'diamonds', 'c': 'clubs', 's': 'spades' };
            suit = suitMap[match[3]];
            column = parseInt(match[4]) - 1;
          }
          
          if (column < 0 || column > 6) {
            throw new Error('Invalid tableau column (must be 1-7)');
          }
          
          return {
            action: 'move_card',
            from: { type: 'foundation', suit },
            to: { type: 'tableau', column },
            cardCount: 1
          };
        }

        throw new Error(`Unrecognized move format: "${moveText}". Try 'd' for draw, 'wh' for waste to hearts, '1-7' for tableau moves, or 'f1' to flip.`);
      },

      formatMove: (moveData) => {
        if (typeof moveData === 'string') return moveData;
        if (!moveData || typeof moveData !== 'object') return 'Unknown move';

        const { action, from, to, cardCount = 1 } = moveData;

        switch (action) {
          case 'draw_stock': return 'Draw from stock';
          case 'reset_stock': return 'Reset stock pile';
          case 'flip_card': return `Flip card in tableau ${(from.column || 0) + 1}`;
          case 'move_card':
            const fromText = solitairePlugin.formatLocation(from);
            const toText = solitairePlugin.formatLocation(to);
            const countText = cardCount > 1 ? ` (${cardCount} cards)` : '';
            return `${fromText} → ${toText}${countText}`;
          default: return action;
        }
      },

      formatLocation: (location) => {
        if (!location || !location.type) return 'unknown';
        switch (location.type) {
          case 'waste': return 'Waste pile';
          case 'stock': return 'Stock pile';
          case 'foundation': return `${solitairePlugin.capitalizeSuit(location.suit)} foundation`;
          case 'tableau': return `Tableau ${(location.column || 0) + 1}`;
          default: return location.type;
        }
      },

      normalizeSuit: (suit) => {
        const normalized = suit.toLowerCase().replace(/s$/, '');
        const suitMap = { 'heart': 'hearts', 'diamond': 'diamonds', 'club': 'clubs', 'spade': 'spades' };
        return suitMap[normalized] || normalized;
      },

      capitalizeSuit: (suit) => suit ? suit.charAt(0).toUpperCase() + suit.slice(1) : '',

      getMoveInputPlaceholder: () => {
        return 'd (draw), wh (waste→hearts), 1-7 (move), f1 (flip)';
      },

      getMoveInputHelp: () => {
        return 'Quick commands: d=draw, r=reset, wh/wd/wc/ws=waste to foundation, 1-7=tableau moves, f1-f7=flip, 1h/2d=tableau to foundation';
      },

      validateMoveFormat: (moveText) => {
        if (!moveText || typeof moveText !== 'string') {
          return { valid: false, error: 'Move cannot be empty' };
        }
        const trimmed = moveText.trim();
        if (trimmed.length === 0) {
          return { valid: false, error: 'Move cannot be empty' };
        }
        return { valid: true };
      },

      getDisplayName: () => 'Solitaire',
      getDescription: () => 'Single-player Klondike Solitaire',

      // Game-specific UI customization
      getUIConfig: () => ({
        showSwitchUserButton: false,
        showTestMoveButton: true,
        showMoveHistory: true,
        showMoveHelp: true,
        singlePlayer: true
      }),

      // Comprehensive move help for legend
      getMoveCommands: () => ([
        { category: 'Stock Operations', commands: [
          { shorthand: 'd', full: 'draw', description: 'Draw from stock pile' },
          { shorthand: 'r', full: 'reset', description: 'Reset stock pile' }
        ]},
        { category: 'Waste Moves', commands: [
          { shorthand: 'wh', full: 'waste to foundation hearts', description: 'Waste → Hearts foundation' },
          { shorthand: 'wd', full: 'waste to foundation diamonds', description: 'Waste → Diamonds foundation' },
          { shorthand: 'wc', full: 'waste to foundation clubs', description: 'Waste → Clubs foundation' },
          { shorthand: 'ws', full: 'waste to foundation spades', description: 'Waste → Spades foundation' },
          { shorthand: 'w1-w7', full: 'waste to tableau [1-7]', description: 'Waste → Tableau column' }
        ]},
        { category: 'Tableau Moves', commands: [
          { shorthand: '1-7', full: 'tableau 1 to tableau 7', description: 'Move between tableau columns' },
          { shorthand: '1h', full: 'tableau 1 to foundation hearts', description: 'Tableau → Foundation' },
          { shorthand: 'f1-f7', full: 'flip tableau [1-7]', description: 'Flip face-down card' }
        ]},
        { category: 'Foundation Moves', commands: [
          { shorthand: 'h7', full: 'foundation hearts to tableau 7', description: 'Foundation → Tableau' }
        ]}
      ]),

      // Quick reference for common moves
      getQuickReference: () => ({
        'Most Common': ['d', 'wh', 'wd', 'wc', 'ws', '1-7'],
        'Stock': ['d', 'r'],
        'Flip': ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'],
        'Foundation': ['wh', 'wd', 'wc', 'ws', '1h', '2d', '3c', '4s']
      })
    };

    this.registerPlugin('solitaire', solitairePlugin);

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
   * Get UI configuration for a game type
   * @param {string} gameType - Game type
   * @returns {Object} UI configuration object
   */
  getUIConfig(gameType) {
    const plugin = this.getPlugin(gameType);
    return plugin.getUIConfig ? plugin.getUIConfig() : {
      showSwitchUserButton: true,
      showTestMoveButton: true,
      showMoveHistory: true,
      showMoveHelp: false,
      singlePlayer: false
    };
  }

  /**
   * Get move commands for a game type (for help/legend)
   * @param {string} gameType - Game type
   * @returns {Array} Array of command categories
   */
  getMoveCommands(gameType) {
    const plugin = this.getPlugin(gameType);
    return plugin.getMoveCommands ? plugin.getMoveCommands() : [];
  }

  /**
   * Get quick reference for a game type
   * @param {string} gameType - Game type
   * @returns {Object} Quick reference object
   */
  getQuickReference(gameType) {
    const plugin = this.getPlugin(gameType);
    return plugin.getQuickReference ? plugin.getQuickReference() : {};
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