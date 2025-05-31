# Web Board Game Service

A Node.js/Express webserver for asynchronous correspondence board games with real-time notifications and admin panel management.

## 🎮 Features

- **Multiple Game Types**: Chess, Checkers, and Hearts with extensible plugin architecture
- **Real-time Notifications**: Socket.IO integration for live game updates
- **Board Image Generation**: SVG-to-PNG rendering for visual game states
- **Admin Panel**: Web-based dashboard for game and user management
- **REST API**: Complete API for game creation, moves, and user management
- **User Authentication**: JWT-based authentication system
- **Database Purge**: Easy cleanup for testing and development

## 🏗️ Architecture

The project uses a **ports and adapters (hexagonal) architecture** with clean separation of concerns:

```
src/
├── domain/           # Core business logic
├── adapters/         # External interface implementations
├── ports/           # Interface definitions
├── games/           # Game type implementations
├── routes/          # Legacy routes (being migrated)
└── database/        # Database initialization and management
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Local Development

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd web-boardgame-service
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Update JWT_SECRET in .env for production
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - API: http://localhost:3000/api
   - Admin Panel: http://localhost:3000
   - Health Check: http://localhost:3000/health

### Docker Development

1. **Using Docker Compose**
   ```bash
   docker-compose up --build
   ```

2. **Database persistence**
   - Data persists in `./data` directory
   - Stop with: `docker-compose down`

### Production Deployment

1. **Docker Production**
   ```bash
   docker build -t correspondence-board-game .
   docker run -p 3000:3000 -v $(pwd)/data:/app/data correspondence-board-game
   ```

2. **Environment Variables**
   - `JWT_SECRET`: Secret key for JWT tokens
   - `PORT`: Server port (default: 3000)
   - `CLIENT_URL`: Frontend URL for CORS

## 📡 API Endpoints

### Game Management
```
POST   /api/games                    # Create new game
GET    /api/games                    # List all games
GET    /api/games/:id                # Get game details
POST   /api/games/:id/join           # Join a game
POST   /api/games/:id/move           # Make a move
GET    /api/games/:id/image          # Get board image
GET    /api/games/:id/moves          # Get move history
```

### User Management
```
POST   /api/users/register           # Register new user
POST   /api/users/login              # Login user
GET    /api/users                    # List users (admin)
GET    /api/users/:id                # Get user profile
GET    /api/users/:id/games          # Get user's games
GET    /api/users/:id/notifications  # Get notifications
```

### Game Types
```
GET    /api/game-types               # List supported games
GET    /api/game-types/:type         # Get game info
POST   /api/game-types/:type/validate # Validate config
```

### Admin
```
POST   /api/admin/purge              # Purge database (dev only)
```

## 🎯 Game Types

### Chess (2 players)
- Classic chess with full move validation
- Algebraic notation support (e.g., "e2-e4", "Nf3")
- Check and checkmate detection

### Checkers (2 players)
- Standard checkers/draughts rules
- Jump capturing and king promotion
- Multiple jump sequences

### Hearts (4 players)
- Classic trick-taking card game
- Card passing phases
- Point tracking and game end conditions

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm test             # Run test suite
npm run test:all     # Run all tests including architecture tests
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Testing

The project includes comprehensive test coverage:

- **Blackbox Tests**: End-to-end API testing
- **Architecture Tests**: Ports and adapters compliance
- **Chess Move Tests**: Game logic validation

```bash
# Run specific test suites
npm run test                    # Main integration tests
npm run test:architecture       # Architecture compliance
jest tests/chess-moves.test.js  # Chess-specific tests
```

### Adding New Game Types

1. **Create game implementation**
   ```javascript
   // src/games/types/YourGame.js
   class YourGame extends BoardGame {
     // Implement required methods
   }
   ```

2. **Register in GameFactory**
   ```javascript
   // src/games/GameFactory.js
   GameFactory.registerGame('yourgame', YourGame);
   ```

3. **Add validation and rendering logic**

## 🖥️ Admin Panel

The web-based admin panel provides:

- **Dashboard**: Overview of games, users, and system stats
- **Game Management**: View all games with pagination and sorting
- **User Management**: Browse and manage user accounts
- **Game Types**: View available game types and configurations
- **Database Tools**: Purge test data for development

### Admin Panel Features

- **Pagination**: Handle large datasets efficiently
- **Real-time Updates**: Live stats and notifications
- **Responsive Design**: Works on desktop and mobile
- **Database Purge**: One-click cleanup for testing

## 🗄️ Database Schema

SQLite database with the following key tables:

- `users`: User accounts and authentication
- `games`: Game instances and state
- `game_players`: Player participation in games
- `moves`: Complete move history
- `notifications`: Real-time user notifications

## 🔒 Security

- **Helmet.js**: Security headers and CSP
- **Rate Limiting**: API request throttling
- **JWT Authentication**: Secure user sessions
- **Input Validation**: Comprehensive request validation
- **CORS Configuration**: Controlled cross-origin access

## 🧪 Testing Strategy

### Integration Testing
- Full API workflow testing
- Game creation and gameplay scenarios
- Image generation validation
- Error handling verification

### Unit Testing
- Domain logic testing
- Game rule validation
- Move validation testing

### Architecture Testing
- Ports and adapters compliance
- Dependency injection validation
- Clean architecture principles

## 📋 Database Management

### Development Reset
Use the admin panel's "Purge Database" button to:
- Clear all games and moves
- Remove test users (preserves admin)
- Reset notifications
- Maintain clean state for testing

### Backup and Restore
```bash
# Backup
cp data/correspondence_games.db backup/games_$(date +%Y%m%d).db

# Restore
cp backup/games_20231201.db data/correspondence_games.db
```

## 🚧 Known Limitations

- **Game Types**: Hearts and Checkers plugins need completion in new architecture
- **Real-time**: Socket.IO integration could be enhanced
- **Scaling**: Current SQLite setup suitable for development/small deployments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following the existing patterns
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Commit with clear messages
7. Push and create a Pull Request

### Development Guidelines

- Follow the ports and adapters architecture
- Add comprehensive tests for new features
- Use meaningful commit messages
- Update documentation as needed
- Ensure backwards compatibility

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🏷️ Version History

- **v1.0.0**: Initial release with chess support
- **v1.1.0**: Added ports and adapters architecture
- **v1.2.0**: Enhanced admin panel with pagination and purge functionality

## 🆘 Support

For support and questions:

1. Check the [documentation](./ARCHITECTURE.md)
2. Review [existing issues](../../issues)
3. Create a [new issue](../../issues/new) if needed

---

Built with ❤️ using Node.js, Express, Socket.IO, and SQLite.