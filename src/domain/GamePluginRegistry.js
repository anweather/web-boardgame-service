/**
 * Registry for game plugins
 * Manages game type plugins and provides a unified interface
 */
class GamePluginRegistry {
  constructor() {
    this.plugins = new Map();
  }

  /**
   * Register a game plugin
   * @param {string} gameType - Game type identifier
   * @param {class} PluginClass - Plugin class that implements GamePlugin interface
   */
  register(gameType, PluginClass) {
    // Validate plugin implements required interface
    this._validatePlugin(PluginClass);
    
    // Store plugin class (not instance) for lazy instantiation
    this.plugins.set(gameType, PluginClass);
  }

  /**
   * Get a game plugin instance
   * @param {string} gameType - Game type identifier
   * @returns {GamePlugin|null} Plugin instance or null if not found
   */
  getPlugin(gameType) {
    const PluginClass = this.plugins.get(gameType);
    if (!PluginClass) {
      return null;
    }

    // Create new instance each time to avoid state issues
    return new PluginClass();
  }

  /**
   * Check if a game type is supported
   * @param {string} gameType - Game type identifier
   * @returns {boolean} Whether the game type is supported
   */
  isSupported(gameType) {
    return this.plugins.has(gameType);
  }

  /**
   * Get all available game types
   * @returns {Array} Array of game type information
   */
  getAvailableGameTypes() {
    const gameTypes = [];
    
    for (const [gameType, PluginClass] of this.plugins.entries()) {
      const metadata = PluginClass.getMetadata();
      gameTypes.push({
        type: gameType,
        ...metadata
      });
    }

    return gameTypes;
  }

  /**
   * Get game type metadata
   * @param {string} gameType - Game type identifier
   * @returns {Object|null} Game type metadata or null if not found
   */
  getGameTypeMetadata(gameType) {
    const PluginClass = this.plugins.get(gameType);
    if (!PluginClass) {
      return null;
    }

    return {
      type: gameType,
      ...PluginClass.getMetadata()
    };
  }

  /**
   * Unregister a game plugin
   * @param {string} gameType - Game type identifier
   * @returns {boolean} Whether the plugin was removed
   */
  unregister(gameType) {
    return this.plugins.delete(gameType);
  }

  /**
   * Clear all registered plugins
   */
  clear() {
    this.plugins.clear();
  }

  /**
   * Get count of registered plugins
   * @returns {number} Number of registered plugins
   */
  getPluginCount() {
    return this.plugins.size;
  }

  /**
   * Get list of registered game types
   * @returns {string[]} Array of game type identifiers
   */
  getRegisteredGameTypes() {
    return Array.from(this.plugins.keys());
  }

  /**
   * Validate that a plugin class implements the required interface
   * @param {class} PluginClass - Plugin class to validate
   * @private
   */
  _validatePlugin(PluginClass) {
    // Check if it's a class/function
    if (typeof PluginClass !== 'function') {
      throw new Error('Plugin must be a class or constructor function');
    }

    // Check for required static method
    if (typeof PluginClass.getMetadata !== 'function') {
      throw new Error('Plugin must implement static getMetadata() method');
    }

    // Create a temporary instance to check instance methods
    let instance;
    try {
      instance = new PluginClass();
    } catch (error) {
      throw new Error('Plugin class must be instantiable with no arguments');
    }

    // Required methods that must be implemented
    const requiredMethods = [
      'getGameType',
      'getDisplayName',
      'getDescription',
      'getMinPlayers',
      'getMaxPlayers',
      'getInitialBoardState',
      'validateMove',
      'applyMove',
      'isGameComplete',
      'getWinner',
      'getNextPlayer',
      'getAvailableColors',
      'assignPlayerColor',
      'validateBoardState',
      'getRenderData',
      'getGameStats'
    ];

    for (const method of requiredMethods) {
      if (typeof instance[method] !== 'function') {
        throw new Error(`Plugin must implement ${method}() method`);
      }
    }

    // Validate metadata structure
    const metadata = PluginClass.getMetadata();
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Plugin getMetadata() must return an object');
    }

    const requiredMetadataFields = ['name', 'description', 'minPlayers', 'maxPlayers'];
    for (const field of requiredMetadataFields) {
      if (!(field in metadata)) {
        throw new Error(`Plugin metadata must include ${field} field`);
      }
    }

    // Validate player count constraints
    if (metadata.minPlayers < 1 || metadata.maxPlayers > 10) {
      throw new Error('Plugin player count must be between 1 and 10');
    }

    if (metadata.minPlayers > metadata.maxPlayers) {
      throw new Error('Plugin minPlayers cannot exceed maxPlayers');
    }
  }

  /**
   * Create a registry with dynamically loaded plugins
   * @returns {GamePluginRegistry} Registry with auto-discovered plugins loaded
   */
  static createWithDefaults() {
    const registry = new GamePluginRegistry();
    
    // Dynamically discover and register plugins
    registry.autoDiscoverPlugins();
    
    return registry;
  }

  /**
   * Automatically discover and register game plugins
   */
  autoDiscoverPlugins() {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const pluginsDir = path.join(__dirname, '../plugins');
      
      // Check if plugins directory exists
      if (!fs.existsSync(pluginsDir)) {
        console.warn('Plugins directory not found, no game plugins loaded');
        return;
      }
      
      // Scan for plugin directories
      const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const gameType = entry.name.toLowerCase();
          const pluginClassName = entry.name.charAt(0).toUpperCase() + entry.name.slice(1) + 'Plugin';
          const pluginPath = path.join(pluginsDir, entry.name, `${pluginClassName}.js`);
          
          // Try to load and validate the plugin
          try {
            if (fs.existsSync(pluginPath)) {
              // Validate plugin structure before loading
              const PluginValidator = require('../framework/PluginValidator');
              const pluginDir = path.join(pluginsDir, entry.name);
              
              // Validate plugin directory and file structure
              PluginValidator.validatePluginDirectory(pluginDir, gameType);
              PluginValidator.validatePluginFile(pluginPath, gameType);
              
              // Load and validate the plugin class
              const PluginClass = require(pluginPath);
              PluginValidator.validatePlugin(PluginClass, gameType);
              
              this.register(gameType, PluginClass);
              console.log(`✓ Loaded ${gameType} plugin`);
            } else {
              console.warn(`Plugin file not found: ${pluginPath}`);
            }
          } catch (error) {
            console.warn(`Failed to load ${gameType} plugin:`, error.message);
          }
        }
      }
      
      // Fallback: try to load known plugins directly if directory scan fails
      if (this.getAvailableGameTypes().length === 0) {
        console.log('Directory scan found no plugins, trying direct plugin loading...');
        this.loadKnownPlugins();
      }
      
    } catch (error) {
      console.warn('Plugin auto-discovery failed, falling back to known plugins:', error.message);
      this.loadKnownPlugins();
    }
  }

  /**
   * Load known plugins as fallback
   */
  loadKnownPlugins() {
    const knownPlugins = [
      { name: 'chess', path: '../plugins/ChessPlugin' }
    ];
    
    for (const plugin of knownPlugins) {
      try {
        const PluginClass = require(plugin.path);
        this.register(plugin.name, PluginClass);
        console.log(`✓ Loaded ${plugin.name} plugin (fallback)`);
      } catch (error) {
        console.warn(`Failed to load ${plugin.name} plugin:`, error.message);
      }
    }
  }
}

module.exports = GamePluginRegistry;