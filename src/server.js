const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

const gameTypeRoutes = require('./routes/gameTypes');
const { initializeDatabase } = require('./database/init');
const dependencies = require('./config/dependencies');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Set up dependency injection with Socket.IO
dependencies.setSocketIo(io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://cdn.jsdelivr.net"],
      "style-src": ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      "font-src": ["'self'", "https://cdn.jsdelivr.net"],
      "connect-src": ["'self'", "ws:", "wss:"],
      "upgrade-insecure-requests": null
    }
  }
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Get routers from dependency container
const routers = dependencies.getRouters();

// Routes using new architecture
app.use('/api/games', routers.games);
app.use('/api/users', routers.users);
app.use('/api/game-types', gameTypeRoutes); // Keep existing for now

// Admin routes
app.post('/api/admin/purge', async (req, res) => {
  try {
    const { getDatabase } = require('./database/init');
    const db = getDatabase();
    
    // Delete all data except admin user
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        // Delete moves first (foreign key constraint)
        db.run('DELETE FROM moves', (err) => {
          if (err) return reject(err);
          
          // Delete game players
          db.run('DELETE FROM game_players', (err) => {
            if (err) return reject(err);
            
            // Delete games
            db.run('DELETE FROM games', (err) => {
              if (err) return reject(err);
              
              // Delete notifications
              db.run('DELETE FROM notifications', (err) => {
                if (err) return reject(err);
                
                // Delete all users except admin
                db.run('DELETE FROM users WHERE username != ?', ['admin'], (err) => {
                  if (err) return reject(err);
                  resolve();
                });
              });
            });
          });
        });
      });
    });
    
    console.log('Database purged successfully');
    res.json({ 
      success: true, 
      message: 'Database purged successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error purging database:', error);
    res.status(500).json({ error: 'Failed to purge database: ' + error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    architecture: 'ports-and-adapters'
  });
});

// Socket.IO for real-time notifications
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-game', (gameId) => {
    socket.join(gameId);
    console.log(`User ${socket.id} joined game ${gameId}`);
  });

  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${socket.id} joined user room ${userId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes (for backward compatibility)
app.set('socketio', io);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

// Initialize database and start server
initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} with ports and adapters architecture`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});