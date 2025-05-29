const BoardGame = require('../BoardGame');

class Hearts extends BoardGame {
  static GAME_TYPE_NAME = 'hearts';
  static GAME_DESCRIPTION = 'Classic four-player trick-taking card game';
  static MIN_PLAYERS = 4;
  static MAX_PLAYERS = 4;

  getInitialBoardState() {
    // Create and shuffle deck
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    const deck = [];
    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push({ suit, rank });
      });
    });

    // Shuffle deck (Fisher-Yates shuffle)
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Deal 13 cards to each player
    const playerHands = [[], [], [], []];
    for (let i = 0; i < 52; i++) {
      playerHands[i % 4].push(deck[i]);
    }

    return {
      phase: 'passing', // passing, playing, round_complete, game_complete
      round: 1,
      playerHands,
      passedCards: [[], [], [], []], // Cards passed by each player
      currentTrick: {
        cards: [], // {playerId, card}
        leader: null, // Player who leads the trick
        winner: null
      },
      tricksWon: [[], [], [], []], // Tricks won by each player
      scores: [0, 0, 0, 0], // Total scores for each player
      roundScores: [0, 0, 0, 0], // Scores for current round
      heartsBroken: false,
      passingDirection: 'left', // left, right, across, none
      gameSettings: {
        targetScore: 100,
        moonShotPenalty: 26
      }
    };
  }

  validateMove(move, playerId, currentBoardState) {
    try {
      const playerIndex = this.getPlayerOrder(playerId) - 1;
      
      if (currentBoardState.phase === 'passing') {
        return this.validatePassingMove(move, playerIndex, currentBoardState);
      } else if (currentBoardState.phase === 'playing') {
        return this.validatePlayingMove(move, playerIndex, currentBoardState);
      }
      
      return { valid: false, error: 'Invalid game phase for moves' };
      
    } catch (error) {
      return { valid: false, error: 'Move validation failed' };
    }
  }

  validatePassingMove(move, playerIndex, boardState) {
    // Move format: {"type": "pass", "cards": [{"suit": "hearts", "rank": "Q"}]}
    if (!move.type || move.type !== 'pass') {
      return { valid: false, error: 'Must specify pass move type' };
    }

    if (!move.cards || !Array.isArray(move.cards) || move.cards.length !== 3) {
      return { valid: false, error: 'Must pass exactly 3 cards' };
    }

    // Check if player has already passed
    if (boardState.passedCards[playerIndex].length > 0) {
      return { valid: false, error: 'Already passed cards this round' };
    }

    const playerHand = boardState.playerHands[playerIndex];
    
    // Validate each card is in player's hand
    for (const card of move.cards) {
      const hasCard = playerHand.some(handCard => 
        handCard.suit === card.suit && handCard.rank === card.rank
      );
      if (!hasCard) {
        return { valid: false, error: `Don't have card: ${card.rank} of ${card.suit}` };
      }
    }

    // Check for duplicate cards in pass
    const cardStrings = move.cards.map(c => `${c.rank}_${c.suit}`);
    if (new Set(cardStrings).size !== cardStrings.length) {
      return { valid: false, error: 'Cannot pass duplicate cards' };
    }

    return { valid: true };
  }

  validatePlayingMove(move, playerIndex, boardState) {
    // Move format: {"type": "play", "card": {"suit": "hearts", "rank": "Q"}}
    if (!move.type || move.type !== 'play') {
      return { valid: false, error: 'Must specify play move type' };
    }

    if (!move.card || !move.card.suit || !move.card.rank) {
      return { valid: false, error: 'Must specify card to play' };
    }

    const playerHand = boardState.playerHands[playerIndex];
    
    // Check if player has the card
    const hasCard = playerHand.some(handCard => 
      handCard.suit === move.card.suit && handCard.rank === move.card.rank
    );
    if (!hasCard) {
      return { valid: false, error: `Don't have card: ${move.card.rank} of ${move.card.suit}` };
    }

    // Check if it's player's turn
    const expectedPlayer = this.getExpectedPlayer(boardState);
    if (expectedPlayer !== playerIndex) {
      return { valid: false, error: 'Not your turn' };
    }

    // Validate play follows suit rules
    return this.validateSuitRules(move.card, playerIndex, boardState);
  }

  validateSuitRules(card, playerIndex, boardState) {
    const trick = boardState.currentTrick;
    const playerHand = boardState.playerHands[playerIndex];

    // First card of trick
    if (trick.cards.length === 0) {
      // First trick of round must start with 2 of clubs
      if (boardState.tricksWon.every(tricks => tricks.length === 0)) {
        if (card.suit !== 'clubs' || card.rank !== '2') {
          return { valid: false, error: 'First trick must start with 2 of clubs' };
        }
      }
      
      // Can't lead with hearts unless hearts broken or only hearts left
      if (card.suit === 'hearts' && !boardState.heartsBroken) {
        const hasNonHearts = playerHand.some(c => c.suit !== 'hearts');
        if (hasNonHearts) {
          return { valid: false, error: 'Cannot lead with hearts until hearts are broken' };
        }
      }
      
      return { valid: true };
    }

    // Following suit
    const ledSuit = trick.cards[0].card.suit;
    
    // Must follow suit if possible
    if (card.suit !== ledSuit) {
      const hasSuit = playerHand.some(c => c.suit === ledSuit);
      if (hasSuit) {
        return { valid: false, error: `Must follow suit (${ledSuit})` };
      }
    }

    // First trick - no hearts or queen of spades
    if (boardState.tricksWon.every(tricks => tricks.length === 0)) {
      if (card.suit === 'hearts' || (card.suit === 'spades' && card.rank === 'Q')) {
        return { valid: false, error: 'Cannot play hearts or queen of spades on first trick' };
      }
    }

    return { valid: true };
  }

  applyMove(move, currentBoardState) {
    const newBoardState = JSON.parse(JSON.stringify(currentBoardState));
    
    if (newBoardState.phase === 'passing') {
      return this.applyPassingMove(move, newBoardState);
    } else if (newBoardState.phase === 'playing') {
      return this.applyPlayingMove(move, newBoardState);
    }
    
    throw new Error('Invalid game phase');
  }

  applyPassingMove(move, boardState) {
    const playerId = this.currentPlayerId;
    const playerIndex = this.getPlayerOrder(playerId) - 1;
    
    // Store passed cards
    boardState.passedCards[playerIndex] = [...move.cards];
    
    // Remove cards from player's hand
    move.cards.forEach(passedCard => {
      const handIndex = boardState.playerHands[playerIndex].findIndex(
        handCard => handCard.suit === passedCard.suit && handCard.rank === passedCard.rank
      );
      if (handIndex !== -1) {
        boardState.playerHands[playerIndex].splice(handIndex, 1);
      }
    });

    // Check if all players have passed
    const allPassed = boardState.passedCards.every(passed => passed.length === 3);
    
    if (allPassed) {
      // Distribute passed cards
      this.distributePassedCards(boardState);
      
      // Move to playing phase
      boardState.phase = 'playing';
      
      // Find player with 2 of clubs to start
      for (let i = 0; i < 4; i++) {
        const hasTwoOfClubs = boardState.playerHands[i].some(
          card => card.suit === 'clubs' && card.rank === '2'
        );
        if (hasTwoOfClubs) {
          boardState.currentTrick.leader = i;
          break;
        }
      }
    }

    return boardState;
  }

  applyPlayingMove(move, boardState) {
    const playerId = this.currentPlayerId;
    const playerIndex = this.getPlayerOrder(playerId) - 1;
    
    // Remove card from player's hand
    const handIndex = boardState.playerHands[playerIndex].findIndex(
      handCard => handCard.suit === move.card.suit && handCard.rank === move.card.rank
    );
    boardState.playerHands[playerIndex].splice(handIndex, 1);
    
    // Add card to current trick
    boardState.currentTrick.cards.push({
      playerId: playerIndex,
      card: move.card
    });

    // Check if hearts were played
    if (move.card.suit === 'hearts') {
      boardState.heartsBroken = true;
    }

    // Check if trick is complete
    if (boardState.currentTrick.cards.length === 4) {
      this.completeTrick(boardState);
    }

    return boardState;
  }

  completeTrick(boardState) {
    const trick = boardState.currentTrick;
    const ledSuit = trick.cards[0].card.suit;
    
    // Find highest card of led suit
    let winner = trick.cards[0];
    for (let i = 1; i < 4; i++) {
      const card = trick.cards[i];
      if (card.card.suit === ledSuit && 
          this.compareCards(card.card, winner.card) > 0) {
        winner = card;
      }
    }

    // Award trick to winner
    boardState.tricksWon[winner.playerId].push(trick.cards);
    
    // Calculate points in trick
    let points = 0;
    trick.cards.forEach(cardPlay => {
      if (cardPlay.card.suit === 'hearts') {
        points += 1;
      } else if (cardPlay.card.suit === 'spades' && cardPlay.card.rank === 'Q') {
        points += 13;
      }
    });
    
    boardState.roundScores[winner.playerId] += points;

    // Reset trick
    boardState.currentTrick = {
      cards: [],
      leader: winner.playerId,
      winner: winner.playerId
    };

    // Check if round is complete
    const totalCardsPlayed = boardState.tricksWon.reduce(
      (sum, tricks) => sum + tricks.length, 0
    );
    
    if (totalCardsPlayed === 13) {
      this.completeRound(boardState);
    }
  }

  getExpectedPlayer(boardState) {
    if (boardState.phase === 'passing') {
      // Any player who hasn't passed yet can pass
      return boardState.passedCards.findIndex(passed => passed.length === 0);
    }
    
    const trick = boardState.currentTrick;
    if (trick.cards.length === 0) {
      return trick.leader;
    }
    
    // Next player in turn order
    const lastPlayer = trick.cards[trick.cards.length - 1].playerId;
    return (lastPlayer + 1) % 4;
  }

  isGameComplete(boardState) {
    return boardState.phase === 'game_complete' ||
           boardState.scores.some(score => score >= boardState.gameSettings.targetScore);
  }

  getWinner(boardState) {
    if (!this.isGameComplete(boardState)) {
      return null;
    }
    
    const minScore = Math.min(...boardState.scores);
    const winnerIndex = boardState.scores.indexOf(minScore);
    const winner = this.players.find(p => p.playerOrder === winnerIndex + 1);
    
    return winner ? winner.userId : null;
  }

  renderBoard(boardState) {
    return {
      phase: boardState.phase,
      round: boardState.round,
      scores: boardState.scores,
      roundScores: boardState.roundScores,
      currentTrick: boardState.currentTrick,
      heartsBroken: boardState.heartsBroken,
      passingDirection: boardState.passingDirection,
      gameSpecific: {
        handSize: boardState.playerHands.map(hand => hand.length),
        tricksWon: boardState.tricksWon.map(tricks => tricks.length)
      }
    };
  }

  getAvailableColors() {
    return ['red', 'blue', 'green', 'yellow'];
  }

  // Hearts-specific helper methods
  compareCards(card1, card2) {
    const rankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    return rankOrder.indexOf(card1.rank) - rankOrder.indexOf(card2.rank);
  }

  distributePassedCards(boardState) {
    const direction = boardState.passingDirection;
    const passedCards = boardState.passedCards;
    
    for (let i = 0; i < 4; i++) {
      let receiverIndex;
      switch (direction) {
        case 'left':
          receiverIndex = (i + 1) % 4;
          break;
        case 'right':
          receiverIndex = (i + 3) % 4;
          break;
        case 'across':
          receiverIndex = (i + 2) % 4;
          break;
        default:
          continue; // No passing round
      }
      
      // Add passed cards to receiver's hand
      boardState.playerHands[receiverIndex].push(...passedCards[i]);
    }

    // Clear passed cards
    boardState.passedCards = [[], [], [], []];
  }

  completeRound(boardState) {
    // Check for moon shot (one player took all hearts + queen of spades)
    const moonShooter = boardState.roundScores.findIndex(score => score === 26);
    
    if (moonShooter !== -1) {
      // Moon shot - give 26 points to other players
      for (let i = 0; i < 4; i++) {
        if (i !== moonShooter) {
          boardState.scores[i] += 26;
        }
      }
    } else {
      // Normal scoring
      for (let i = 0; i < 4; i++) {
        boardState.scores[i] += boardState.roundScores[i];
      }
    }

    // Reset for next round
    boardState.roundScores = [0, 0, 0, 0];
    boardState.tricksWon = [[], [], [], []];
    boardState.heartsBroken = false;
    boardState.round += 1;

    // Update passing direction
    const directions = ['left', 'right', 'across', 'none'];
    const currentIndex = directions.indexOf(boardState.passingDirection);
    boardState.passingDirection = directions[(currentIndex + 1) % 4];

    // Check if game is complete
    if (boardState.scores.some(score => score >= boardState.gameSettings.targetScore)) {
      boardState.phase = 'game_complete';
    } else {
      // Start new round
      const newInitialState = this.getInitialBoardState();
      boardState.playerHands = newInitialState.playerHands;
      boardState.phase = boardState.passingDirection === 'none' ? 'playing' : 'passing';
      
      if (boardState.phase === 'playing') {
        // Find 2 of clubs for first trick
        for (let i = 0; i < 4; i++) {
          const hasTwoOfClubs = boardState.playerHands[i].some(
            card => card.suit === 'clubs' && card.rank === '2'
          );
          if (hasTwoOfClubs) {
            boardState.currentTrick.leader = i;
            break;
          }
        }
      }
    }
  }

  validateGameState(boardState) {
    if (!super.validateGameState(boardState)) {
      return false;
    }

    // Hearts-specific validation
    if (!boardState.playerHands || boardState.playerHands.length !== 4) {
      return false;
    }

    if (!Array.isArray(boardState.scores) || boardState.scores.length !== 4) {
      return false;
    }

    if (!['passing', 'playing', 'round_complete', 'game_complete'].includes(boardState.phase)) {
      return false;
    }

    return true;
  }
}

module.exports = Hearts;