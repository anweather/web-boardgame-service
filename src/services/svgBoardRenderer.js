const sharp = require('sharp');

const BOARD_SIZE = 800;
const SQUARE_SIZE = BOARD_SIZE / 8;

const PIECE_SYMBOLS = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙', // White pieces
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'  // Black pieces
};

function generateBoardImage(boardState) {
  return new Promise((resolve, reject) => {
    try {
      // Create SVG for the board
      const svg = createChessBoardSVG(boardState);
      
      // Convert SVG to PNG using Sharp
      sharp(Buffer.from(svg))
        .png()
        .toBuffer()
        .then(buffer => resolve(buffer))
        .catch(error => reject(error));
    } catch (error) {
      reject(error);
    }
  });
}

function createChessBoardSVG(boardState) {
  const lightColor = '#f0d9b5';
  const darkColor = '#b58863';
  
  let svg = `<svg width="${BOARD_SIZE}" height="${BOARD_SIZE}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Draw the board squares
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const isLight = (row + col) % 2 === 0;
      const color = isLight ? lightColor : darkColor;
      
      const x = col * SQUARE_SIZE;
      const y = row * SQUARE_SIZE;
      
      svg += `<rect x="${x}" y="${y}" width="${SQUARE_SIZE}" height="${SQUARE_SIZE}" fill="${color}"/>`;
    }
  }
  
  // Add coordinate labels
  svg += `<style>
    .coord-label { 
      font-family: Arial, sans-serif; 
      font-size: 16px; 
      fill: #333; 
      text-anchor: middle; 
      dominant-baseline: central;
    }
    .coord-label-left { 
      font-family: Arial, sans-serif; 
      font-size: 16px; 
      fill: #333; 
      text-anchor: start; 
      dominant-baseline: central;
    }
  </style>`;
  
  // File labels (a-h)
  for (let col = 0; col < 8; col++) {
    const file = String.fromCharCode(97 + col); // 'a' + col
    const x = col * SQUARE_SIZE + SQUARE_SIZE / 2;
    svg += `<text x="${x}" y="${BOARD_SIZE - 10}" class="coord-label">${file}</text>`;
  }
  
  // Rank labels (1-8)
  for (let row = 0; row < 8; row++) {
    const rank = 8 - row;
    const y = row * SQUARE_SIZE + SQUARE_SIZE / 2;
    svg += `<text x="10" y="${y}" class="coord-label-left">${rank}</text>`;
  }
  
  // Draw pieces if board state provided
  if (boardState && boardState.board) {
    svg += drawPiecesSVG(boardState.board);
  }
  
  svg += '</svg>';
  return svg;
}

function drawPiecesSVG(board) {
  let svg = '';
  
  svg += `<style>
    .piece { 
      font-family: Arial, sans-serif; 
      font-size: ${SQUARE_SIZE * 0.7}px; 
      text-anchor: middle; 
      dominant-baseline: central;
      stroke-width: 2;
    }
    .white-piece { 
      fill: white; 
      stroke: black; 
    }
    .black-piece { 
      fill: black; 
      stroke: white; 
    }
  </style>`;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const symbol = PIECE_SYMBOLS[piece];
        if (symbol) {
          const isWhite = piece === piece.toUpperCase();
          const className = isWhite ? 'white-piece' : 'black-piece';
          
          const x = col * SQUARE_SIZE + SQUARE_SIZE / 2;
          const y = row * SQUARE_SIZE + SQUARE_SIZE / 2;
          
          svg += `<text x="${x}" y="${y}" class="piece ${className}">${symbol}</text>`;
        }
      }
    }
  }
  
  return svg;
}

// Alternative renderer for different game types
function generateCheckersBoard(boardState) {
  return new Promise((resolve, reject) => {
    try {
      const svg = createCheckersBoardSVG(boardState);
      
      sharp(Buffer.from(svg))
        .png()
        .toBuffer()
        .then(buffer => resolve(buffer))
        .catch(error => reject(error));
    } catch (error) {
      reject(error);
    }
  });
}

function createCheckersBoardSVG(boardState) {
  const lightColor = '#f0d9b5';
  const darkColor = '#b58863';
  
  let svg = `<svg width="${BOARD_SIZE}" height="${BOARD_SIZE}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Draw the board squares
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const isLight = (row + col) % 2 === 0;
      const color = isLight ? lightColor : darkColor;
      
      const x = col * SQUARE_SIZE;
      const y = row * SQUARE_SIZE;
      
      svg += `<rect x="${x}" y="${y}" width="${SQUARE_SIZE}" height="${SQUARE_SIZE}" fill="${color}"/>`;
    }
  }
  
  // Draw checkers pieces
  if (boardState && boardState.board) {
    svg += drawCheckersPiecesSVG(boardState.board);
  }
  
  svg += '</svg>';
  return svg;
}

function drawCheckersPiecesSVG(board) {
  let svg = '';
  
  const pieceRadius = SQUARE_SIZE * 0.35;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const centerX = col * SQUARE_SIZE + SQUARE_SIZE / 2;
        const centerY = row * SQUARE_SIZE + SQUARE_SIZE / 2;
        
        // Determine piece colors
        let fillColor, strokeColor;
        if (piece.toLowerCase() === 'w') {
          fillColor = '#fff';
          strokeColor = '#000';
        } else {
          fillColor = '#8B4513';
          strokeColor = '#fff';
        }
        
        // Draw piece circle
        svg += `<circle cx="${centerX}" cy="${centerY}" r="${pieceRadius}" ` +
               `fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
        
        // Draw crown for kings
        if (piece === piece.toUpperCase() && piece !== 'W' && piece !== 'B') {
          svg += `<text x="${centerX}" y="${centerY}" ` +
                 `style="font-family: Arial; font-size: ${pieceRadius}px; text-anchor: middle; ` +
                 `dominant-baseline: central; fill: gold;">♔</text>`;
        }
      }
    }
  }
  
  return svg;
}

// Simple card game visualization
function generateCardsImage(gameState) {
  return new Promise((resolve, reject) => {
    try {
      const svg = createCardGameSVG(gameState);
      
      sharp(Buffer.from(svg))
        .png()
        .toBuffer()
        .then(buffer => resolve(buffer))
        .catch(error => reject(error));
    } catch (error) {
      reject(error);
    }
  });
}

function createCardGameSVG(gameState) {
  const width = 800;
  const height = 600;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${width}" height="${height}" fill="#0f5132"/>`;
  
  // Game info
  svg += `<style>
    .game-text { 
      font-family: Arial, sans-serif; 
      font-size: 20px; 
      fill: white; 
      text-anchor: middle; 
    }
    .card-text { 
      font-family: Arial, sans-serif; 
      font-size: 14px; 
      fill: black; 
      text-anchor: middle; 
      dominant-baseline: central;
    }
  </style>`;
  
  svg += `<text x="${width/2}" y="30" class="game-text">Hearts Game</text>`;
  
  if (gameState.currentTrick && gameState.currentTrick.cards) {
    svg += `<text x="${width/2}" y="60" class="game-text">Current Trick</text>`;
    
    // Draw current trick cards
    gameState.currentTrick.cards.forEach((cardPlay, index) => {
      const x = 200 + index * 100;
      const y = 150;
      svg += drawCard(cardPlay.card, x, y);
    });
  }
  
  if (gameState.scores) {
    svg += `<text x="${width/2}" y="350" class="game-text">Scores</text>`;
    gameState.scores.forEach((score, index) => {
      const x = 150 + index * 150;
      const y = 400;
      svg += `<text x="${x}" y="${y}" class="game-text">Player ${index + 1}: ${score}</text>`;
    });
  }
  
  svg += '</svg>';
  return svg;
}

function drawCard(card, x, y) {
  const cardWidth = 60;
  const cardHeight = 80;
  
  let svg = `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" ` +
            `fill="white" stroke="black" stroke-width="1" rx="5"/>`;
  
  const suitSymbols = {
    'hearts': '♥',
    'diamonds': '♦', 
    'clubs': '♣',
    'spades': '♠'
  };
  
  const color = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
  
  svg += `<text x="${x + cardWidth/2}" y="${y + 20}" ` +
         `style="font-family: Arial; font-size: 12px; text-anchor: middle; fill: ${color};">${card.rank}</text>`;
  
  svg += `<text x="${x + cardWidth/2}" y="${y + cardHeight - 20}" ` +
         `style="font-family: Arial; font-size: 16px; text-anchor: middle; fill: ${color};">${suitSymbols[card.suit]}</text>`;
  
  return svg;
}

module.exports = {
  generateBoardImage,
  generateCheckersBoard,
  generateCardsImage
};