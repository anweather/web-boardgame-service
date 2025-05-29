class BoardGame {
  constructor(gameData) {
    this.id = gameData.id;
    this.name = gameData.name;
    this.gameType = gameData.gameType;
    this.status = gameData.status || 'waiting';
    this.currentPlayerId = gameData.currentPlayerId;
    this.boardState = gameData.boardState;
    this.moveCount = gameData.moveCount || 0;
    this.settings = gameData.settings || {};
    this.players = gameData.players || [];
  }

  // Abstract methods that must be implemented by game types
  getInitialBoardState() {
    throw new Error('getInitialBoardState must be implemented by game type');
  }

  validateMove(move, playerId, currentBoardState) {
    throw new Error('validateMove must be implemented by game type');
  }

  applyMove(move, currentBoardState) {
    throw new Error('applyMove must be implemented by game type');
  }

  isGameComplete(boardState) {
    throw new Error('isGameComplete must be implemented by game type');
  }

  getWinner(boardState) {
    throw new Error('getWinner must be implemented by game type');
  }

  renderBoard(boardState) {
    throw new Error('renderBoard must be implemented by game type');
  }

  // Common methods
  getMinPlayers() {
    return this.constructor.MIN_PLAYERS || 2;
  }

  getMaxPlayers() {
    return this.constructor.MAX_PLAYERS || 2;
  }

  getGameTypeName() {
    return this.constructor.GAME_TYPE_NAME || 'unknown';
  }

  getGameDescription() {
    return this.constructor.GAME_DESCRIPTION || '';
  }

  getTurnOrder() {
    return this.players
      .sort((a, b) => a.playerOrder - b.playerOrder)
      .map(p => p.userId);
  }

  getNextPlayer(currentPlayerId) {
    const turnOrder = this.getTurnOrder();
    const currentIndex = turnOrder.indexOf(currentPlayerId);
    const nextIndex = (currentIndex + 1) % turnOrder.length;
    return turnOrder[nextIndex];
  }

  canPlayerJoin() {
    return this.status === 'waiting' && this.players.length < this.getMaxPlayers();
  }

  isPlayerInGame(userId) {
    return this.players.some(p => p.userId === userId);
  }

  canStartGame() {
    return this.players.length >= this.getMinPlayers() && 
           this.players.length <= this.getMaxPlayers();
  }

  getPlayerOrder(userId) {
    const player = this.players.find(p => p.userId === userId);
    return player ? player.playerOrder : null;
  }

  getPlayerColor(userId) {
    const player = this.players.find(p => p.userId === userId);
    return player ? player.color : null;
  }

  // Validate that a move is from the current player
  validatePlayerTurn(playerId) {
    if (this.status !== 'active') {
      throw new Error('Game is not active');
    }
    if (this.currentPlayerId !== playerId) {
      throw new Error('Not your turn');
    }
  }

  // Get available colors for this game type
  getAvailableColors() {
    return ['white', 'black']; // Default for 2-player games, override in subclasses
  }

  // Assign color to a new player
  assignPlayerColor(playerOrder) {
    const colors = this.getAvailableColors();
    if (playerOrder <= colors.length) {
      return colors[playerOrder - 1];
    }
    return `player${playerOrder}`;
  }

  // Game state validation
  validateGameState(boardState) {
    // Basic validation - override in subclasses for game-specific rules
    return boardState !== null && boardState !== undefined;
  }

  // Serialize game state for storage
  serializeBoardState(boardState) {
    return JSON.stringify(boardState);
  }

  // Deserialize game state from storage
  deserializeBoardState(serializedState) {
    try {
      return JSON.parse(serializedState);
    } catch (error) {
      throw new Error('Invalid board state format');
    }
  }

  // Get game statistics
  getGameStats() {
    return {
      gameType: this.getGameTypeName(),
      playerCount: this.players.length,
      moveCount: this.moveCount,
      status: this.status,
      minPlayers: this.getMinPlayers(),
      maxPlayers: this.getMaxPlayers()
    };
  }
}

module.exports = BoardGame;