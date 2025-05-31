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

- **Models**: User.js, Game.js handle database operations
- **Routes**: games.js, users.js, gameTypes.js define API endpoints  
- **Services**: svgBoardRenderer.js (SVG to PNG generation), notifications.js (alerts)
- **Games**: Abstract BoardGame class with game-specific implementations (Chess, Checkers, Hearts)
- **Factory**: GameFactory manages game type registration and creation
- **Database**: SQLite with schema supporting 1-10 players per game
- **Real-time**: Socket.IO for game events and notifications
- **Auth**: JWT tokens for user authentication

## Game Types

Currently supports:
- **Chess** (2 players) - Classic chess with move validation
- **Checkers** (2 players) - Standard checkers/draughts  
- **Hearts** (4 players) - Trick-taking card game with passing phases

Each game type implements validation, move application, win conditions, and board rendering. Easy to add new game types by extending BoardGame class.

Game state stored as JSON in database. Board rendering uses SVG converted to PNG via Sharp (no native dependencies). Supports Discord bot integration and web SPA frontends.