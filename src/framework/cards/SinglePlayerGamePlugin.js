/**
 * SinglePlayerGamePlugin - Base class for single-player card games
 * Extends GamePlugin to provide single-player specific functionality
 */

const GamePlugin = require('../../ports/GamePlugin');

class SinglePlayerGamePlugin extends GamePlugin {
  /**
   * Single-player games always have exactly 1 player
   */
  getMinPlayers() {
    return 1;
  }

  getMaxPlayers() {
    return 1;
  }

  /**
   * Single-player games use a single player color/role
   */
  getAvailableColors(playerCount) {
    if (playerCount !== 1) {
      throw new Error('Single-player games must have exactly 1 player');
    }
    return ['player'];
  }

  assignPlayerColor(playerOrder, totalPlayers) {
    if (totalPlayers !== 1 || playerOrder !== 1) {
      throw new Error('Single-player games must have exactly 1 player');
    }
    return 'player';
  }

  /**
   * In single-player games, the next player is always the same player
   */
  getNextPlayer(currentPlayerId, players, boardState) {
    if (players.length !== 1) {
      throw new Error('Single-player games must have exactly 1 player');
    }
    return players[0].user_id || players[0].userId;
  }

  /**
   * Validate that this is indeed a single-player game setup
   */
  validateGameConfiguration(players, settings = {}) {
    if (players.length !== 1) {
      return {
        valid: false,
        error: `Single-player games require exactly 1 player, got ${players.length}`
      };
    }
    return { valid: true };
  }

  /**
   * Check if the single-player game can start (always true if 1 player)
   */
  canStartGame(players) {
    return players.length === 1;
  }

  /**
   * Initialize score tracking for single-player games
   */
  initializeScore() {
    return {
      points: 0,
      moves: 0,
      timeStarted: Date.now(),
      timeElapsed: 0,
      bonuses: [],
      penalties: []
    };
  }

  /**
   * Update score based on game events
   * @param {Object} currentScore - Current score object
   * @param {Object} scoreEvent - Score event data
   * @returns {Object} Updated score
   */
  updateScore(currentScore, scoreEvent) {
    if (!currentScore || typeof currentScore !== 'object') {
      throw new Error('Invalid score object');
    }
    
    const newScore = { ...currentScore };
    
    switch (scoreEvent.type) {
      case 'move':
        newScore.moves += 1;
        if (scoreEvent.pointsAwarded) {
          newScore.points += scoreEvent.pointsAwarded;
        }
        break;
        
      case 'bonus':
        newScore.bonuses.push({
          type: scoreEvent.bonusType,
          points: scoreEvent.points,
          description: scoreEvent.description,
          timestamp: Date.now()
        });
        newScore.points += scoreEvent.points;
        break;
        
      case 'penalty':
        newScore.penalties.push({
          type: scoreEvent.penaltyType,
          points: scoreEvent.points,
          description: scoreEvent.description,
          timestamp: Date.now()
        });
        newScore.points -= scoreEvent.points;
        break;
        
      case 'time_update':
        newScore.timeElapsed = Date.now() - newScore.timeStarted;
        break;
        
      default:
        throw new Error(`Unknown score event type: ${scoreEvent.type}`);
    }
    
    // Ensure points don't go below 0
    newScore.points = Math.max(0, newScore.points);
    
    return newScore;
  }

  /**
   * Calculate final score based on game completion
   * @param {Object} boardState - Final board state
   * @param {Object} currentScore - Current score
   * @returns {Object} Final score with completion bonuses/penalties
   */
  calculateFinalScore(boardState, currentScore) {
    const finalScore = { ...currentScore };
    finalScore.timeElapsed = Date.now() - finalScore.timeStarted;
    
    if (this.isGameComplete(boardState, [])) {
      // Add completion bonus
      const completionBonus = this.getCompletionBonus(boardState, finalScore);
      if (completionBonus > 0) {
        finalScore.bonuses.push({
          type: 'completion',
          points: completionBonus,
          description: 'Game completion bonus',
          timestamp: Date.now()
        });
        finalScore.points += completionBonus;
      }
      
      // Add time bonus if applicable
      const timeBonus = this.getTimeBonus(finalScore.timeElapsed);
      if (timeBonus > 0) {
        finalScore.bonuses.push({
          type: 'time',
          points: timeBonus,
          description: 'Time completion bonus',
          timestamp: Date.now()
        });
        finalScore.points += timeBonus;
      }
    }
    
    finalScore.final = true;
    return finalScore;
  }

  /**
   * Get completion bonus points (override in specific games)
   * @param {Object} boardState - Final board state
   * @param {Object} score - Current score
   * @returns {number} Bonus points
   */
  getCompletionBonus(boardState, score) {
    return 0; // Default: no completion bonus
  }

  /**
   * Get time-based bonus points (override in specific games)
   * @param {number} timeElapsed - Time in milliseconds
   * @returns {number} Bonus points
   */
  getTimeBonus(timeElapsed) {
    return 0; // Default: no time bonus
  }

  /**
   * Check if a move is valid in the context of single-player rules
   * @param {Object} move - Move to validate
   * @param {Object} boardState - Current board state
   * @param {string} playerId - Player making the move
   * @param {Object[]} players - Array of players (should be length 1)
   * @returns {Object} Validation result
   */
  validateSinglePlayerMove(move, boardState, playerId, players) {
    // Validate it's actually a single-player game
    const configValidation = this.validateGameConfiguration(players);
    if (!configValidation.valid) {
      return configValidation;
    }
    
    // Validate the player making the move is the only player
    const player = players[0];
    if ((player.user_id || player.userId) !== playerId) {
      return {
        valid: false,
        error: 'Move must be made by the game\'s player'
      };
    }
    
    // Delegate to game-specific move validation
    return this.validateMove(move, boardState, playerId, players);
  }

  /**
   * Apply a move and update score in single-player context
   * @param {Object} move - Move to apply
   * @param {Object} boardState - Current board state
   * @param {string} playerId - Player making the move
   * @param {Object[]} players - Array of players
   * @returns {Object} New board state with updated score
   */
  applySinglePlayerMove(move, boardState, playerId, players) {
    // Apply the move to get new board state
    const newBoardState = this.applyMove(move, boardState, playerId, players);
    
    // Update score based on the move
    const scoreEvent = this.getMoveScoreEvent(move, boardState, newBoardState);
    if (scoreEvent && newBoardState.score) {
      newBoardState.score = this.updateScore(newBoardState.score, scoreEvent);
    }
    
    return newBoardState;
  }

  /**
   * Get score event data for a move (override in specific games)
   * @param {Object} move - Move that was made
   * @param {Object} oldBoardState - Board state before move
   * @param {Object} newBoardState - Board state after move
   * @returns {Object|null} Score event data or null if no scoring
   */
  getMoveScoreEvent(move, oldBoardState, newBoardState) {
    return {
      type: 'move',
      pointsAwarded: 0 // Default: no points for moves
    };
  }

  /**
   * Get game statistics including single-player specific metrics
   * @param {Object} boardState - Current board state
   * @param {Object[]} players - Array of players
   * @returns {Object} Game statistics
   */
  getGameStats(boardState, players) {
    const baseStats = {
      gameType: this.getGameType(),
      playerCount: players.length,
      minPlayers: this.getMinPlayers(),
      maxPlayers: this.getMaxPlayers(),
      isSinglePlayer: true
    };
    
    if (boardState.score) {
      baseStats.score = boardState.score;
      baseStats.totalMoves = boardState.score.moves;
      baseStats.currentPoints = boardState.score.points;
      
      if (boardState.score.timeStarted) {
        baseStats.timeElapsed = Date.now() - boardState.score.timeStarted;
        baseStats.timeElapsedFormatted = this.formatTime(baseStats.timeElapsed);
      }
    }
    
    return baseStats;
  }

  /**
   * Format time in milliseconds to readable format
   * @param {number} timeMs - Time in milliseconds
   * @returns {string} Formatted time string
   */
  formatTime(timeMs) {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if a single-player game should auto-progress
   * Some single-player games have automated elements
   * @param {Object} boardState - Current board state
   * @returns {boolean} True if game should auto-progress
   */
  shouldAutoProgress(boardState) {
    return false; // Default: no auto-progression
  }

  /**
   * Perform auto-progression if needed
   * @param {Object} boardState - Current board state
   * @returns {Object} Updated board state after auto-progression
   */
  autoProgress(boardState) {
    return boardState; // Default: no changes
  }
}

module.exports = SinglePlayerGamePlugin;