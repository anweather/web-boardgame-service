module.exports = {
  // ESLint config specifically for plugin directories
  rules: {
    // Restrict what plugins can import
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../domain/*', '../adapters/*', '../config/*'],
            message: 'Plugins cannot import core framework modules directly. Use the plugin interface instead.'
          },
          {
            group: ['../database/*', '../services/*'],
            message: 'Plugins cannot access database or core services directly.'
          },
          {
            group: ['../routes/*', '../server*'],
            message: 'Plugins cannot import server or routing logic.'
          }
        ],
        paths: [
          {
            name: 'express',
            message: 'Plugins should not import Express directly. Use plugin interface.'
          },
          {
            name: 'sqlite3',
            message: 'Plugins cannot access database directly.'
          }
        ]
      }
    ],
    
    // Ensure plugins only export what they should
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Program > VariableDeclaration[declarations.0.id.name!=/^(.*Plugin|.*Frontend|.*Renderer)$/]',
        message: 'Plugin files should only export Plugin, Frontend, or Renderer classes.'
      }
    ]
  }
};