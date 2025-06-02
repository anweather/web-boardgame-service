module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/server-new.js',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Framework modules should have higher coverage
    'src/framework/**/*.js': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Game plugins should have high coverage
    'src/plugins/**/*Plugin.js': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Core domain logic should have high coverage
    'src/domain/**/*.js': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};