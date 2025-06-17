# API Quick Reference

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Authentication
Some endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Games API

### Get All Games
```http
GET /api/games
```
Query Parameters:
- `status` (optional): `waiting`, `active`, `completed`, `cancelled`
- `gameType` (optional): `chess`, `checkers`, `hearts`, `solitaire`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Games per page (default: 25, max: 100)

### Create Game
```http
POST /api/games
Content-Type: application/json

{
  "name": "Chess Match #1",
  "gameType": "chess",
  "creatorId": "user-123",
  "settings": {}
}
```

### Get Game Details
```http
GET /api/games/{gameId}
```

### Join Game
```http
POST /api/games/{gameId}/join
Content-Type: application/json

{
  "userId": "user-456"
}
```

### Make Move
```http
POST /api/games/{gameId}/move
Content-Type: application/json

{
  "userId": "user-123",
  "move": {"from": "e2", "to": "e4"}
}
```

### Get Board Image
```http
GET /api/games/{gameId}/image?width=800&height=800
```
Returns: PNG image

### Get Move History
```http
GET /api/games/{gameId}/moves
```

### Force Start Game (Admin)
```http
POST /api/games/{gameId}/force-start
```

## Users API

### Get All Users (Admin)
```http
GET /api/users
```

### Register User
```http
POST /api/users/register
Content-Type: application/json

{
  "username": "player123",
  "email": "player123@example.com",
  "password": "securepassword123"
}
```
Returns: User object + JWT token

### Login User
```http
POST /api/users/login
Content-Type: application/json

{
  "username": "player123",
  "password": "securepassword123"
}
```
Returns: User object + JWT token

### Get User Profile
```http
GET /api/users/{userId}
```

### Get User's Games
```http
GET /api/users/{userId}/games
```

### Get User's Notifications
```http
GET /api/users/{userId}/notifications?limit=50&offset=0
```

### Mark Notification as Read
```http
PUT /api/users/notifications/{notificationId}/read
```

## Game Types API

### Get All Game Types
```http
GET /api/game-types
```

### Get Game Type Details
```http
GET /api/game-types/{gameType}
```

### Validate Game Configuration
```http
POST /api/game-types/{gameType}/validate
Content-Type: application/json

{
  "settings": {
    "timeLimit": 300,
    "difficulty": "normal"
  }
}
```

## Admin API

### Purge Database
```http
POST /api/admin/purge
```
⚠️ **Warning**: Deletes all games, moves, and non-admin users!

## Data Models

### Game Object
```json
{
  "id": "game-123",
  "name": "Chess Match #1",
  "gameType": "chess",
  "status": "active",
  "createdAt": "2023-12-01T10:00:00Z",
  "updatedAt": "2023-12-01T11:30:00Z",
  "players": [
    {
      "userId": "user-123",
      "username": "player1",
      "color": "white",
      "joinedAt": "2023-12-01T10:05:00Z"
    }
  ],
  "maxPlayers": 2,
  "currentPlayerId": "user-123",
  "moveCount": 15,
  "boardState": {},
  "moves": []
}
```

### User Object
```json
{
  "id": "user-123",
  "username": "player1",
  "email": "player1@example.com",
  "createdAt": "2023-11-01T09:00:00Z"
}
```

### Game Move Object
```json
{
  "id": "move-123",
  "gameId": "game-123",
  "playerId": "user-123",
  "player": {
    "userId": "user-123",
    "username": "player1",
    "color": "white",
    "joinedAt": "2023-12-01T10:05:00Z"
  },
  "move": {"from": "e2", "to": "e4"},
  "moveNumber": 1,
  "timestamp": "2023-12-01T10:10:00Z"
}
```

### Game Type Object
```json
{
  "type": "chess",
  "name": "Chess",
  "description": "Classic chess game for two players",
  "minPlayers": 2,
  "maxPlayers": 2
}
```

## Game Types Available

1. **Chess** (`chess`)
   - 2 players
   - Classic chess rules
   - Move format: `{"from": "e2", "to": "e4"}`

2. **Checkers** (`checkers`)
   - 2 players
   - Standard checkers/draughts rules
   - Move format: Board position based

3. **Hearts** (`hearts`)
   - 4 players
   - Trick-taking card game
   - Includes passing phases

4. **Solitaire** (`solitaire`)
   - 1 player
   - Single-player card game
   - Various solitaire variants

## Error Responses

All endpoints return errors in this format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Socket.IO Events

The application also supports real-time updates via Socket.IO:

### Client Events
- `joinGameRoom` - Join a game room for updates
- `leaveGameRoom` - Leave a game room

### Server Events
- `game-started` - Game has started
- `move-made` - A move was made
- `game-update` - General game update
- `player-joined` - Player joined a game
- `player-left` - Player left a game

## Rate Limiting

API endpoints are rate limited:
- Development: 1000 requests per 15 minutes
- Production: 100 requests per 15 minutes

Rate limit headers are included in responses:
- `RateLimit-Limit`
- `RateLimit-Remaining`
- `RateLimit-Reset`