# Ports and Adapters Architecture

This document describes the ports and adapters (hexagonal) architecture implemented in this correspondence board game system.

## Overview

The application follows a ports and adapters pattern that separates the core business logic from external concerns like databases, HTTP frameworks, and external services.

## Architecture Layers

### Domain Layer (`src/domain/`)
Contains pure business logic without external dependencies:

- **Entities**: `Game.js`, `User.js` - Core business objects with invariants
- **Services**: `GameService.js`, `UserService.js` - Business logic orchestration
- **Value Objects**: Plugin registry and game rules

### Ports (`src/ports/`)
Define contracts that adapters must implement:

- `GameRepository.js` - Game persistence interface
- `UserRepository.js` - User persistence interface  
- `NotificationService.js` - Notification delivery interface
- `GamePlugin.js` - Game type plugin interface

### Adapters (`src/adapters/`)
Implement port interfaces for specific technologies:

**Secondary Adapters (driven):**
- `SqliteGameRepository.js` - SQLite game persistence
- `SqliteUserRepository.js` - SQLite user persistence
- `SqliteNotificationService.js` - Database + Socket.IO notifications

**Primary Adapters (driving):**
- `HttpGameController.js` - REST API for games
- `HttpUserController.js` - REST API for users

### Plugins (`src/plugins/`)
Game-specific implementations:
- `ChessPlugin.js` - Chess game rules and validation

### Configuration (`src/config/`)
- `dependencies.js` - Dependency injection container

## Benefits

1. **Testability**: Domain logic can be tested without external dependencies
2. **Flexibility**: Easy to swap implementations (e.g., MongoDB instead of SQLite)
3. **Maintainability**: Clear separation of concerns
4. **Extensibility**: New game types via plugins
5. **Framework Independence**: Business logic not tied to Express/HTTP

## Usage Examples

### Direct Domain Usage
```javascript
const dependencies = require('./src/config/dependencies');

// Get services
const userService = dependencies.getUserService();
const gameService = dependencies.getGameService();

// Use domain services directly
const user = await userService.createUser({
  username: 'player1',
  email: 'player1@example.com', 
  password: 'password123'
});

const game = await gameService.createGame({
  name: 'My Chess Game',
  gameType: 'chess',
  creatorId: user.id
});
```

### HTTP API Usage
```javascript
const app = express();
const dependencies = require('./src/config/dependencies');

// Get HTTP adapters
const routers = dependencies.getRouters();

// Mount routes
app.use('/api/games', routers.games);
app.use('/api/users', routers.users);
```

### Adding New Game Types
```javascript
const GamePlugin = require('./src/ports/GamePlugin');

class CheckersPlugin extends GamePlugin {
  static getMetadata() {
    return {
      name: 'Checkers',
      minPlayers: 2,
      maxPlayers: 2
    };
  }
  
  // Implement required methods...
}

// Register plugin
const registry = dependencies.getGamePluginRegistry();
registry.register('checkers', CheckersPlugin);
```

## Testing

The architecture enables multiple testing strategies:

### Unit Tests (Domain)
```javascript
const GameService = require('./src/domain/GameService');
const mockRepository = { /* mock implementation */ };

const gameService = new GameService(mockRepository);
// Test business logic without database
```

### Integration Tests (Adapters)
```javascript
const SqliteGameRepository = require('./src/adapters/SqliteGameRepository');
// Test with real database
```

### End-to-End Tests
```javascript
// Test through HTTP adapters (existing blackbox tests)
```

## Migration Notes

The new architecture maintains **backward compatibility**:
- All existing APIs work unchanged
- Original routes in `src/routes/` still function
- Tests continue to pass

To switch to the new architecture:
1. Use `src/server-new.js` instead of `src/server.js`
2. Routes automatically use domain services via adapters

## File Structure

```
src/
├── domain/           # Business logic
│   ├── Game.js
│   ├── User.js
│   ├── GameService.js
│   └── UserService.js
├── ports/            # Interfaces
│   ├── GameRepository.js
│   ├── UserRepository.js
│   └── NotificationService.js
├── adapters/         # Implementations
│   ├── SqliteGameRepository.js
│   ├── HttpGameController.js
│   └── ...
├── plugins/          # Game types
│   └── ChessPlugin.js
├── config/
│   └── dependencies.js
└── routes/           # Legacy (still works)
    └── ...
```

This architecture provides a solid foundation for future enhancements while maintaining the existing functionality.