# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Node.js/Express webserver for asynchronous correspondence board games. Supports creating games, making moves, real-time notifications via Socket.IO, and board image generation. Currently implements chess but designed to support multiple board game types.

## Development Setup

### Local Development
1. Install dependencies: `npm install`
2. Copy environment file: `cp .env.example .env`
3. Update JWT_SECRET in .env for production
4. Start development server: `npm run dev`
5. For production: `npm start`

### Docker Development
1. Build and run with Docker Compose: `docker-compose up --build`
2. Access application at `http://localhost:3000`
3. Database persists in `./data` directory
4. Stop with: `docker-compose down`

### Docker Production
1. Build image: `docker build -t correspondence-board-game .`
2. Run container: `docker run -p 3000:3000 -v $(pwd)/data:/app/data correspondence-board-game`
3. Or use docker-compose for production: `docker-compose -f docker-compose.yml up -d`

## Commands

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests (Jest)
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## API Endpoints

### Game Types
- `GET /api/game-types` - List supported game types
- `GET /api/game-types/:type` - Get game type info
- `POST /api/game-types/:type/validate` - Validate game configuration

### Games
- `POST /api/games` - Create new game (specify gameType: chess/checkers/hearts)
- `GET /api/games` - List all games (filter by status)
- `GET /api/games/:id` - Get game state
- `POST /api/games/:id/join` - Join a game (supports 2-10 players based on game type)
- `POST /api/games/:id/move` - Make a move (game-specific validation)
- `GET /api/games/:id/image` - Get board as PNG image
- `GET /api/games/:id/moves` - Get move history

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/:id` - Get user profile
- `GET /api/users/:id/games` - Get user's games
- `GET /api/users/:id/notifications` - Get notifications

## Architecture

**Ports and Adapters (Hexagonal) Architecture:**

- **Domain Layer**: Core business logic
  - `GameService.js` - Game business operations
  - `UserService.js` - User management operations
  - `Game.js` - Game domain entity
  - `User.js` - User domain entity
  - `GamePluginRegistry.js` - Plugin system for game types
  
- **Adapters Layer**: External interfaces
  - `HttpGameController.js` - HTTP API for games
  - `HttpUserController.js` - HTTP API for users  
  - `SqliteGameRepository.js` - Game data persistence
  - `SqliteUserRepository.js` - User data persistence
  - `SqliteNotificationService.js` - Real-time notifications
  
- **Infrastructure**:
  - `server.js` - Express server setup with dependency injection
  - `dependencies.js` - Dependency injection container
  - `svgBoardRenderer.js` - Board image generation
  - SQLite database with clean schema
  - Socket.IO for real-time updates

- **Game Types**: Plugin-based system supporting Chess, Checkers, Hearts
- **Real-time**: Socket.IO for game events and notifications
- **Auth**: Simple user authentication system

## Game Types

Currently supports:
- **Chess** (2 players) - Classic chess with move validation
- **Checkers** (2 players) - Standard checkers/draughts  
- **Hearts** (4 players) - Trick-taking card game with passing phases

Each game type implements validation, move application, win conditions, and board rendering. Easy to add new game types by extending BoardGame class.

Game state stored as JSON in database. Board rendering uses SVG converted to PNG via Sharp (no native dependencies). Supports Discord bot integration and web SPA frontends.

## Development Guidelines

### Commit Frequency
- **Commit after completing each task** when tests pass
- **Commit before major refactoring** to create safe restore points
- **Use descriptive commit messages** that explain both what and why
- **Include test status** in commit messages when relevant
- **Reference issues/features** being implemented

### Testing Before Commits
- Verify server starts without errors: `npm start` 
- Run test suite if available: `npm test`
- Check basic functionality works
- Ensure no import/syntax errors