const express = require('express');
const GameFactory = require('../games/GameFactory');

const router = express.Router();

// Get all supported game types
router.get('/', (req, res) => {
  try {
    const gameTypes = GameFactory.getSupportedGameTypes();
    res.json(gameTypes);
  } catch (error) {
    console.error('Error fetching game types:', error);
    res.status(500).json({ error: 'Failed to fetch game types' });
  }
});

// Get specific game type info
router.get('/:gameType', (req, res) => {
  try {
    const gameTypeInfo = GameFactory.getGameTypeInfo(req.params.gameType);
    
    if (!gameTypeInfo) {
      return res.status(404).json({ error: 'Game type not found' });
    }

    res.json(gameTypeInfo);
  } catch (error) {
    console.error('Error fetching game type info:', error);
    res.status(500).json({ error: 'Failed to fetch game type info' });
  }
});

// Validate game configuration
router.post('/:gameType/validate', (req, res) => {
  try {
    const { gameType } = req.params;
    const { settings } = req.body;

    const validation = GameFactory.validateGameConfiguration(gameType, settings);
    
    res.json(validation);
  } catch (error) {
    console.error('Error validating game configuration:', error);
    res.status(500).json({ error: 'Failed to validate game configuration' });
  }
});

module.exports = router;