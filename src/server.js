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

// Serve static files from public directory (original vanilla JS app)
app.use('/vanilla', express.static('public'));

// Serve React app static files
const path = require('path');
const fs = require('fs');
const reactBuildPath = path.join(__dirname, '..', 'frontend', 'build');

// Check if React build exists
if (fs.existsSync(reactBuildPath)) {
  console.log('React build found, serving React app');
  app.use(express.static(reactBuildPath));
} else {
  console.log('React build not found, serving vanilla app only');
  app.use(express.static('public'));
}

// Rate limiting - more lenient for development
const isDevelopment = process.env.NODE_ENV !== 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Much higher limit for development
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((15 * 60 * 1000) / 1000) // seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks and static files
    return req.path === '/health' || req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/images');
  },
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP ${req.ip} on ${req.method} ${req.path}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((15 * 60 * 1000) / 1000)
    });
  }
});

console.log(`Rate limiting configured: ${isDevelopment ? '1000' : '100'} requests per 15 minutes (${isDevelopment ? 'development' : 'production'} mode)`);
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

// Serve React app for all non-API routes (SPA routing)
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  
  // Check if React build exists
  const reactIndexPath = path.join(reactBuildPath, 'index.html');
  if (fs.existsSync(reactIndexPath)) {
    res.sendFile(reactIndexPath);
  } else {
    // Fallback to vanilla app
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
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