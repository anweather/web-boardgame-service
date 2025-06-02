module.exports = {
  extends: ['../../.eslintrc-plugins.js'],
  
  // Override rules for plugin directories
  rules: {
    // Restrict imports - plugins can only import from specific locations
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../domain/*', '../adapters/*', '../config/*', '../database/*', '../services/*', '../routes/*'],
            message: 'Plugins cannot import core framework modules. Use plugin interfaces only.'
          }
        ],
        paths: [
          {
            name: 'express',
            message: 'Plugins cannot import Express directly. Use plugin interface.'
          },
          {
            name: 'sqlite3', 
            message: 'Plugins cannot access database directly. Use plugin interface.'
          },
          {
            name: 'fs',
            message: 'Plugins cannot access filesystem directly. Use plugin interface.'
          }
        ]
      }
    ],

    // Plugin files must follow naming conventions
    'filename-rules/match': [
      'error',
      {
        '.js': '^[A-Z][a-zA-Z]*(Plugin|Frontend|Renderer|Utils|Constants)$'
      }
    ]
  },

  // Plugin-specific environment
  env: {
    node: true,
    es2020: true
  },

  // Only allow specific globals
  globals: {
    console: 'readonly',
    Buffer: 'readonly',
    process: false, // Prevent process access
    require: 'readonly',
    module: 'readonly',
    exports: 'readonly'
  }
};