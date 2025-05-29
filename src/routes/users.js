const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const user = await User.create({ username, email, password });
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await user.updateLastActive();
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastActive: user.lastActive
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get user's games
router.get('/:id/games', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const games = await user.getGames();
    
    res.json(games.map(game => ({
      id: game.id,
      name: game.name,
      gameType: game.game_type,
      status: game.status,
      currentPlayerId: game.current_player_id,
      moveCount: game.move_count,
      playerOrder: game.player_order,
      color: game.color,
      createdAt: game.created_at,
      updatedAt: game.updated_at
    })));
  } catch (error) {
    console.error('Error fetching user games:', error);
    res.status(500).json({ error: 'Failed to fetch user games' });
  }
});

// Get user's notifications
router.get('/:id/notifications', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { getDatabase } = require('../database/init');
    const db = getDatabase();
    
    const notifications = await new Promise((resolve, reject) => {
      const query = `
        SELECT n.*, g.name as game_name
        FROM notifications n
        LEFT JOIN games g ON n.game_id = g.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 50
      `;
      
      db.all(query, [user.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(notifications.map(notification => ({
      id: notification.id,
      type: notification.type,
      message: notification.message,
      read: Boolean(notification.read),
      gameId: notification.game_id,
      gameName: notification.game_name,
      createdAt: notification.created_at
    })));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { getDatabase } = require('../database/init');
    const db = getDatabase();
    
    await new Promise((resolve, reject) => {
      const query = 'UPDATE notifications SET read = TRUE WHERE id = ?';
      
      db.run(query, [req.params.notificationId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

module.exports = router;