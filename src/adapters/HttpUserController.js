const express = require('express');
const jwt = require('jsonwebtoken');

/**
 * HTTP adapter for user operations
 * Primary port that handles HTTP requests and delegates to domain services
 */
class HttpUserController {
  constructor(userService, notificationService) {
    this.userService = userService;
    this.notificationService = notificationService;
    this.router = express.Router();
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this._setupRoutes();
  }

  /**
   * Get the Express router with all routes configured
   * @returns {express.Router}
   */
  getRouter() {
    return this.router;
  }

  /**
   * Setup all HTTP routes
   * @private
   */
  _setupRoutes() {
    // Register a new user
    this.router.post('/register', this._registerUser.bind(this));
    
    // Login user
    this.router.post('/login', this._loginUser.bind(this));
    
    // Get user profile
    this.router.get('/:id', this._getUserProfile.bind(this));
    
    // Get user's games
    this.router.get('/:id/games', this._getUserGames.bind(this));
    
    // Get user's notifications
    this.router.get('/:id/notifications', this._getUserNotifications.bind(this));
    
    // Mark notification as read
    this.router.put('/notifications/:notificationId/read', this._markNotificationAsRead.bind(this));
  }

  /**
   * Register a new user
   */
  async _registerUser(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }

      // Use domain service to create user
      const user = await this.userService.createUser({ username, email, password });
      
      const token = jwt.sign({ userId: user.id }, this.jwtSecret, { expiresIn: '7d' });

      res.status(201).json({
        user: user.toSafeObject(),
        token
      });
    } catch (error) {
      console.error('Error registering user:', error);
      
      // Handle specific domain errors
      if (error.message.includes('already exists') || error.message.includes('Username') || error.message.includes('Email')) {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ error: error.message || 'Failed to register user' });
    }
  }

  /**
   * Login user
   */
  async _loginUser(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      // Use domain service to authenticate user
      const authResult = await this.userService.authenticateUser(username, password);
      
      if (!authResult.success) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: authResult.user.id }, this.jwtSecret, { expiresIn: '7d' });

      res.json({
        user: authResult.user.toSafeObject(),
        token
      });
    } catch (error) {
      console.error('Error logging in user:', error);
      res.status(500).json({ error: error.message || 'Failed to login' });
    }
  }

  /**
   * Get user profile
   */
  async _getUserProfile(req, res) {
    try {
      const user = await this.userService.findUserById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user.toSafeObject());
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  /**
   * Get user's games
   */
  async _getUserGames(req, res) {
    try {
      const user = await this.userService.findUserById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const games = await this.userService.getUserGames(req.params.id);
      
      res.json(games.map(game => ({
        id: game.id,
        name: game.name,
        gameType: game.gameType,
        status: game.status,
        currentPlayerId: game.currentPlayerId,
        moveCount: game.moveCount,
        playerOrder: game.playerOrder,
        color: game.color,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt
      })));
    } catch (error) {
      console.error('Error fetching user games:', error);
      res.status(500).json({ error: 'Failed to fetch user games' });
    }
  }

  /**
   * Get user's notifications
   */
  async _getUserNotifications(req, res) {
    try {
      const user = await this.userService.findUserById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const options = {
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      const notifications = await this.notificationService.getUserNotifications(req.params.id, options);

      res.json(notifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        message: notification.message,
        read: Boolean(notification.read),
        gameId: notification.gameId,
        gameName: notification.gameName,
        createdAt: notification.createdAt
      })));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  /**
   * Mark notification as read
   */
  async _markNotificationAsRead(req, res) {
    try {
      await this.notificationService.markAsRead(req.params.notificationId);
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }
}

module.exports = HttpUserController;