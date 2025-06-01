/**
 * Plugin Validator
 * Enforces that plugin modules only contain plugin-specific logic
 */
class PluginValidator {
  /**
   * Validate a plugin class at runtime
   * @param {Function} PluginClass - The plugin class to validate
   * @param {string} pluginName - Name of the plugin for error messages
   * @throws {Error} If plugin violates constraints
   */
  static validatePlugin(PluginClass, pluginName) {
    if (!PluginClass || typeof PluginClass !== 'function') {
      throw new Error(`Invalid plugin: ${pluginName} must export a class`);
    }

    // Check if plugin extends GamePlugin
    const GamePlugin = require('../ports/GamePlugin');
    if (!(PluginClass.prototype instanceof GamePlugin)) {
      throw new Error(`Plugin violation: ${pluginName} must extend GamePlugin`);
    }

    // Validate plugin doesn't have forbidden properties
    this.validatePluginClass(PluginClass, pluginName);
    
    // Validate plugin metadata
    this.validatePluginMetadata(PluginClass, pluginName);
    
    console.log(`✓ Plugin validation passed: ${pluginName}`);
  }

  /**
   * Validate plugin class structure
   * @param {Function} PluginClass - Plugin class
   * @param {string} pluginName - Plugin name
   */
  static validatePluginClass(PluginClass, pluginName) {
    const forbiddenProperties = [
      'express', 'app', 'server', 'database', 'db', 'connection',
      'sqlite', 'repository', 'service', 'controller', 'router'
    ];

    // Check static properties
    for (const prop of forbiddenProperties) {
      if (PluginClass.hasOwnProperty(prop)) {
        throw new Error(`Plugin violation: ${pluginName} cannot have property '${prop}' - plugins must use the plugin interface`);
      }
    }

    // Check prototype properties
    for (const prop of forbiddenProperties) {
      if (PluginClass.prototype.hasOwnProperty(prop)) {
        throw new Error(`Plugin violation: ${pluginName} cannot have instance property '${prop}' - plugins must use the plugin interface`);
      }
    }
  }

  /**
   * Validate plugin metadata
   * @param {Function} PluginClass - Plugin class
   * @param {string} pluginName - Plugin name
   */
  static validatePluginMetadata(PluginClass, pluginName) {
    // Check required methods exist
    const requiredMethods = ['getGameType', 'getDisplayName', 'getDescription'];
    
    for (const method of requiredMethods) {
      if (typeof PluginClass.prototype[method] !== 'function') {
        throw new Error(`Plugin violation: ${pluginName} must implement ${method}() method`);
      }
    }

    // Check metadata format if getMetadata exists
    if (typeof PluginClass.getMetadata === 'function') {
      const metadata = PluginClass.getMetadata();
      
      if (!metadata || typeof metadata !== 'object') {
        throw new Error(`Plugin violation: ${pluginName}.getMetadata() must return an object`);
      }

      const requiredFields = ['name', 'description', 'minPlayers', 'maxPlayers'];
      for (const field of requiredFields) {
        if (!(field in metadata)) {
          throw new Error(`Plugin violation: ${pluginName}.getMetadata() missing required field: ${field}`);
        }
      }
    }
  }

  /**
   * Validate plugin file structure
   * @param {string} pluginPath - Path to plugin file
   * @param {string} pluginName - Plugin name
   */
  static validatePluginFile(pluginPath, pluginName) {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const content = fs.readFileSync(pluginPath, 'utf8');
      
      // Check for forbidden imports
      const forbiddenImports = [
        /require\(['"]\.\.\/domain\//,
        /require\(['"]\.\.\/adapters\//,
        /require\(['"]\.\.\/config\/dependencies['"]\)/,
        /require\(['"]\.\.\/database\//,
        /require\(['"]\.\.\/routes\//,
        /require\(['"]\.\.\/server/,
        /require\(['"]express['"]\)/,
        /require\(['"]sqlite3['"]\)/
      ];

      for (const pattern of forbiddenImports) {
        if (pattern.test(content)) {
          const match = content.match(pattern);
          throw new Error(`Plugin violation: ${pluginName} contains forbidden import: ${match[0]}`);
        }
      }

      // Check for forbidden patterns
      const forbiddenPatterns = [
        { pattern: /app\.get\(|app\.post\(|router\./g, message: 'direct route definition' },
        { pattern: /new\s+sqlite3\./g, message: 'direct database access' },
        { pattern: /require\(['"]fs['"]\)/g, message: 'direct filesystem access (use plugin interface)' },
        { pattern: /process\.env\./g, message: 'direct environment access (use plugin interface)' }
      ];

      for (const { pattern, message } of forbiddenPatterns) {
        if (pattern.test(content)) {
          throw new Error(`Plugin violation: ${pluginName} contains forbidden pattern: ${message}`);
        }
      }

    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Plugin file not found: ${pluginPath}`);
      }
      throw error;
    }
  }

  /**
   * Validate plugin directory structure
   * @param {string} pluginDir - Path to plugin directory
   * @param {string} pluginName - Plugin name
   */
  static validatePluginDirectory(pluginDir, pluginName) {
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(pluginDir)) {
      throw new Error(`Plugin directory not found: ${pluginDir}`);
    }

    // Check for forbidden files
    const forbiddenFiles = [
      'package.json', // Should not have separate package management
      'node_modules', // Should not bundle dependencies
      '.env',         // Should not have separate config
      'database.js',  // Should not have direct DB access
      'server.js',    // Should not define servers
      'routes.js'     // Should not define routes
    ];

    const files = fs.readdirSync(pluginDir);
    for (const file of files) {
      if (forbiddenFiles.includes(file)) {
        throw new Error(`Plugin violation: ${pluginName} cannot contain file: ${file}`);
      }
    }

    // Validate file naming convention
    for (const file of files) {
      if (file.endsWith('.js')) {
        const basename = path.basename(file, '.js');
        const validPatterns = [
          /^[A-Z][a-zA-Z]*Plugin$/,     // ChessPlugin
          /^[A-Z][a-zA-Z]*Frontend$/,   // ChessFrontend  
          /^[A-Z][a-zA-Z]*Renderer$/,   // ChessRenderer
          /^[A-Z][a-zA-Z]*Utils$/,      // ChessUtils
          /^[A-Z][a-zA-Z]*Constants$/   // ChessConstants
        ];

        const isValid = validPatterns.some(pattern => pattern.test(basename));
        if (!isValid) {
          console.warn(`Plugin warning: ${pluginName} file '${file}' doesn't follow naming conventions`);
        }
      }
    }
  }
}

module.exports = PluginValidator;